#!/usr/bin/env python3
"""
SAFESCORING.IO - Setup Narrative Generator
Generates strategic analysis narratives for user setups (product combinations).

Fills 2 DB destinations with AI-generated strategic text:
1. setup_pillar_narratives — per-pillar narrative for the combined setup
2. setup_risk_analysis — global cross-product risk synthesis

PIPELINE: SmartEvaluator → ScoreCalculator → NarrativeGenerator → SetupNarrativeGenerator
"""

import json
import re
import time
import requests
from datetime import datetime
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from .config import (
    SUPABASE_URL, SUPABASE_KEY, SUPABASE_HEADERS,
    get_supabase_headers,
    NARRATIVE_MODEL, NARRATIVE_EXPERT_MODEL,
    NARRATIVE_MAX_TOKENS, NARRATIVE_TEMPERATURE,
    NARRATIVE_RISK_MAX_TOKENS, NARRATIVE_RISK_TEMPERATURE,
    NARRATIVE_ENABLED,
)
from .supabase_pagination import fetch_all
from .api_provider import AIProvider


class SetupNarrativeGenerator:
    """
    Generates strategic narrative text for user setups (product combinations).

    For each setup:
    - 4 pillar calls (S, A, F, E) → cross-product narrative per pillar
    - 1 risk synthesis call → global interaction risk analysis
    = 5 AI calls per setup

    Follows the NarrativeGenerator pattern:
    - load_data() → fetch from Supabase
    - generate_for_setup() → AI calls
    - save_narratives() → upsert to Supabase
    - run() → orchestrator
    """

    PILLAR_NAMES = {
        'S': 'Security',
        'A': 'Adversity',
        'F': 'Fidelity',
        'E': 'Efficiency',
    }

    PILLAR_DESCRIPTIONS = {
        'S': 'Protection of assets, private keys, authentication, and access control',
        'A': 'Resilience against attacks, hacks, exploits, and adversarial scenarios',
        'F': 'Transparency, accuracy, compliance with promises, and regulatory alignment',
        'E': 'Performance, usability, cost-effectiveness, and operational efficiency',
    }

    ROLE_WEIGHTS = {
        'wallet': 2,
        'exchange': 1,
        'defi': 1,
        'other': 1,
    }

    def __init__(self):
        """Initialize SetupNarrativeGenerator with AI provider and HTTP session."""
        self.ai = AIProvider()
        self.setups = []
        self.products = []
        self.products_by_id = {}
        self.norms = []
        self.evaluations = []
        self.scores = []
        self.product_types = []

        # Setup HTTP session with retry
        self.session = requests.Session()
        retry_strategy = Retry(
            total=5,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504],
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("https://", adapter)
        self.session.mount("http://", adapter)

    def load_data(self):
        """Load all necessary data from Supabase."""
        print("[SETUP-NARRATIVE] Loading data...")

        # Load user_setups
        self.setups = fetch_all(
            'user_setups',
            select='id,user_id,name,description,products,combined_score',
            order='id'
        )
        print(f"   {len(self.setups)} setups")

        # Load products with scores
        self.products = fetch_all(
            'products',
            select='id,name,slug,type_id,url,safe_score,score_s,score_a,score_f,score_e',
            order='id'
        )
        self.products_by_id = {p['id']: p for p in self.products}
        print(f"   {len(self.products)} products")

        # Load norms
        self.norms = fetch_all(
            'norms',
            select='id,code,title,pillar,description,is_essential',
            order='id'
        )
        self.norms_by_id = {n['id']: n for n in self.norms}
        print(f"   {len(self.norms)} norms")

        # Load evaluations (all)
        self.evaluations = fetch_all(
            'evaluations',
            select='id,product_id,norm_id,result,why_this_result',
            order='id'
        )
        print(f"   {len(self.evaluations)} evaluations")

        # Load product types
        self.product_types = fetch_all(
            'product_types',
            select='id,name,description',
            order='id'
        )
        self.types_by_id = {t['id']: t for t in self.product_types}
        print(f"   {len(self.product_types)} product types")

        # Load scores from safe_scoring_results (latest per product)
        self.scores = fetch_all(
            'safe_scoring_results',
            select='product_id,note_finale,score_s,score_a,score_f,score_e,calculated_at',
            order='calculated_at.desc'
        )
        # Keep only latest score per product
        self.scores_by_product = {}
        for s in self.scores:
            pid = s['product_id']
            if pid not in self.scores_by_product:
                self.scores_by_product[pid] = s
        print(f"   {len(self.scores_by_product)} product scores (latest)")

    def _get_setup_products(self, setup):
        """Extract and enrich product list from a setup."""
        products_json = setup.get('products', [])
        if isinstance(products_json, str):
            try:
                products_json = json.loads(products_json)
            except (json.JSONDecodeError, TypeError):
                return []

        enriched = []
        for entry in products_json:
            pid = entry.get('product_id')
            role = entry.get('role', 'other')
            product = self.products_by_id.get(pid)
            if product:
                scores = self.scores_by_product.get(pid, {})
                enriched.append({
                    'id': pid,
                    'name': product['name'],
                    'slug': product.get('slug', ''),
                    'type_id': product.get('type_id'),
                    'type_name': self.types_by_id.get(product.get('type_id'), {}).get('name', 'Unknown'),
                    'role': role,
                    'weight': self.ROLE_WEIGHTS.get(role, 1),
                    'scores': {
                        'total': scores.get('note_finale', 0) or 0,
                        's': scores.get('score_s', 0) or 0,
                        'a': scores.get('score_a', 0) or 0,
                        'f': scores.get('score_f', 0) or 0,
                        'e': scores.get('score_e', 0) or 0,
                    },
                })
        return enriched

    def _calculate_combined_scores(self, products):
        """Calculate weighted combined scores for the setup."""
        if not products:
            return {'total': 0, 's': 0, 'a': 0, 'f': 0, 'e': 0}

        total_weight = 0
        weighted = {'total': 0, 's': 0, 'a': 0, 'f': 0, 'e': 0}

        for p in products:
            w = p['weight']
            total_weight += w
            for key in ['total', 's', 'a', 'f', 'e']:
                weighted[key] += p['scores'].get(key, 0) * w

        if total_weight == 0:
            return weighted

        return {k: round(v / total_weight, 1) for k, v in weighted.items()}

    def _get_product_evaluations_for_pillar(self, product_id, pillar):
        """Get evaluations for a product in a specific pillar."""
        evals = [e for e in self.evaluations if e['product_id'] == product_id]
        result = {'passed': [], 'failed': [], 'uncertain': []}

        for e in evals:
            norm = self.norms_by_id.get(e['norm_id'])
            if not norm or norm['pillar'] != pillar:
                continue

            entry = {
                'code': norm['code'],
                'title': norm['title'],
                'is_essential': norm.get('is_essential', False),
                'reason': e.get('why_this_result', ''),
            }

            if e['result'] in ('YES', 'YESp'):
                result['passed'].append(entry)
            elif e['result'] in ('NO', 'N'):
                result['failed'].append(entry)
            else:
                result['uncertain'].append(entry)

        return result

    def _build_pillar_prompt(self, setup, products, pillar, combined_scores):
        """Build AI prompt for a setup pillar narrative."""
        pillar_name = self.PILLAR_NAMES[pillar]
        pillar_desc = self.PILLAR_DESCRIPTIONS[pillar]
        pillar_key = pillar.lower()
        pillar_score = combined_scores.get(pillar_key, 0)

        # Build per-product analysis for this pillar
        product_analyses = ""
        all_failed = []
        all_essential_failed = []
        weakest_product = None
        weakest_score = 999

        for p in products:
            p_score = p['scores'].get(pillar_key, 0)
            evals = self._get_product_evaluations_for_pillar(p['id'], pillar)
            role_label = f" [{p['role'].upper()}]" if p['role'] != 'other' else ""
            weight_label = f" (weight: {p['weight']}x)" if p['weight'] > 1 else ""

            # Track weakest
            if p_score < weakest_score:
                weakest_score = p_score
                weakest_product = p

            # Format failed norms for this product (top 5)
            failed_text = ""
            for e in evals['failed'][:5]:
                essential_tag = " [ESSENTIAL]" if e['is_essential'] else ""
                reason = (e['reason'] or 'No details')[:200]
                failed_text += f"      - {e['code']}: {e['title']}{essential_tag}\n        Reason: {reason}\n"
                all_failed.append(e)
                if e['is_essential']:
                    all_essential_failed.append({'product': p['name'], **e})

            product_analyses += f"""
  {p['name']}{role_label}{weight_label}: {p_score}/100
    Type: {p['type_name']}
    Passed: {len(evals['passed'])} | Failed: {len(evals['failed'])} | TBD: {len(evals['uncertain'])}
    Key failures:
{failed_text if failed_text else '      None - all norms passed!'}
"""

        prompt = f"""You are a cybersecurity analyst specializing in multi-product crypto security setups. Analyze the {pillar_name} ({pillar}) pillar for this PRODUCT COMBINATION based on REAL evaluation data across ALL products.

SETUP: "{setup.get('name', 'Unnamed Setup')}"
PRODUCTS IN SETUP: {len(products)}
COMBINED {pillar} SCORE: {pillar_score}/100 (weighted average)

PER-PRODUCT {pillar} ANALYSIS:
{product_analyses}

CROSS-PRODUCT STATISTICS:
- Total failed norms across all products: {len(all_failed)}
- Essential norms failed across products: {len(all_essential_failed)}
- Weakest product for {pillar_name}: {weakest_product['name'] if weakest_product else 'N/A'} ({weakest_score}/100)

Based on this REAL cross-product data, generate a SETUP-LEVEL strategic analysis. Focus on how the products INTERACT and COMPLEMENT each other. Respond with valid JSON only (no markdown, no code blocks):

{{
  "narrative_summary": "3-5 sentence analysis of how this product combination performs on {pillar_name}. Highlight complementary strengths and compounding weaknesses across products. Reference specific products by name.",
  "key_strengths": ["Cross-product strength 1", "Strength 2 explaining how products complement each other"],
  "key_weaknesses": ["Cross-product weakness 1", "Weakness 2 identifying gaps in the combination"],
  "security_strategy": "How to use this product combination safely given its combined {pillar_name} profile. Which product to use for what.",
  "worst_case_scenario": "Realistic worst-case scenario for this product combination. What happens if the weakest product ({weakest_product['name'] if weakest_product else 'N/A'}) is compromised?",
  "risk_level": "low|medium|high|critical",
  "mitigation_advice": "Concrete measures specific to this product combination. Which product should be upgraded or replaced?"
}}

IMPORTANT:
- This is about the COMBINATION, not individual products
- Analyze how products interact: do they cover each other's weaknesses?
- Reference product names when discussing strengths/weaknesses
- The weakest link matters: a weak wallet drags the whole setup down
- Risk level: critical if essential norms failed on wallet products, high if on other products
- Write in English
- Return ONLY valid JSON, no other text"""

        return prompt

    def _build_risk_prompt(self, setup, products, combined_scores, all_pillar_results):
        """Build AI prompt for global setup risk synthesis."""
        total_score = combined_scores.get('total', 0)

        # Build pillar summary
        pillar_summaries = ""
        for pillar in ['S', 'A', 'F', 'E']:
            p_key = pillar.lower()
            score = combined_scores.get(p_key, 0)
            data = all_pillar_results.get(pillar, {})
            pillar_summaries += f"  {pillar} ({self.PILLAR_NAMES[pillar]}): {score}/100\n"

        # Build product roles overview
        product_overview = ""
        for p in products:
            product_overview += f"  - {p['name']} ({p['type_name']}, role: {p['role']}, weight: {p['weight']}x, SAFE: {p['scores']['total']}/100)\n"

        # Find weakest/strongest
        pillar_scores = {p: combined_scores.get(p.lower(), 0) for p in ['S', 'A', 'F', 'E']}
        strongest = max(pillar_scores, key=pillar_scores.get) if pillar_scores else 'S'
        weakest = min(pillar_scores, key=pillar_scores.get) if pillar_scores else 'S'

        # Rating
        if total_score >= 90: rating = 'A+'
        elif total_score >= 80: rating = 'A'
        elif total_score >= 70: rating = 'B'
        elif total_score >= 60: rating = 'C'
        elif total_score >= 50: rating = 'D'
        else: rating = 'F'

        prompt = f"""You are a cybersecurity analyst. Synthesize a GLOBAL risk analysis for this multi-product crypto setup.

SETUP: "{setup.get('name', 'Unnamed Setup')}"
OVERALL SAFE SCORE: {total_score}/100 (Rating: {rating})
PRODUCTS: {len(products)}

PRODUCT OVERVIEW:
{product_overview}

PILLAR SCORES (combined, weighted):
{pillar_summaries}
STRONGEST PILLAR: {strongest} ({self.PILLAR_NAMES[strongest]})
WEAKEST PILLAR: {weakest} ({self.PILLAR_NAMES[weakest]})

Based on this data, generate a GLOBAL risk synthesis for the entire setup. Respond with valid JSON only:

{{
  "overall_risk_narrative": "3-5 sentence synthesis analyzing how the products in this setup interact security-wise. Identify compounding risks across products.",
  "combined_worst_case": "What happens if the weakest product is compromised? How does it affect the rest of the setup?",
  "attack_vectors": ["Attack vector 1 specific to this combination", "Vector 2", "Vector 3"],
  "priority_mitigations": ["Highest priority action 1", "Action 2", "Action 3"],
  "interaction_risks": ["Risk from product A + product B interaction", "Gap between products"],
  "gap_analysis": ["Security gap 1 not covered by any product", "Gap 2"],
  "overall_risk_level": "low|medium|high|critical",
  "harmony_assessment": "How well do these products work together? Do they complement or conflict?",
  "executive_summary": "2-3 sentence executive summary of the setup's overall safety profile."
}}

IMPORTANT:
- Focus on INTERACTIONS between products, not individual product analysis
- Identify what happens if ONE product in the chain is compromised
- Attack vectors should be specific to this combination (e.g., "weak exchange + strong wallet = funds at risk during transfer")
- Gap analysis: what security aspects are NOT covered by any product?
- Write in English
- Return ONLY valid JSON, no other text"""

        return prompt

    def _parse_json_response(self, text):
        """Parse JSON from AI response robustly."""
        if not text:
            return None

        # Try direct parse first
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

        # Try extracting from ```json ... ``` block
        json_block_match = re.search(r'```(?:json)?\s*\n?(.*?)\n?```', text, re.DOTALL)
        if json_block_match:
            try:
                return json.loads(json_block_match.group(1))
            except json.JSONDecodeError:
                pass

        # Try extracting first { ... } block
        brace_match = re.search(r'\{.*\}', text, re.DOTALL)
        if brace_match:
            try:
                return json.loads(brace_match.group(0))
            except json.JSONDecodeError:
                pass

        # Try fixing common issues: trailing commas
        cleaned = text.strip()
        if cleaned.startswith('{'):
            cleaned = re.sub(r',\s*([}\]])', r'\1', cleaned)
            try:
                return json.loads(cleaned)
            except json.JSONDecodeError:
                pass

        print(f"      [SETUP-NARRATIVE] Failed to parse JSON response ({len(text)} chars)")
        return None

    def generate_for_setup(self, setup):
        """
        Generate narratives for a single setup.
        Makes 4 pillar calls + 1 risk synthesis = 5 AI calls.
        """
        setup_id = setup['id']
        setup_name = setup.get('name', f'Setup #{setup_id}')

        # Get enriched products
        products = self._get_setup_products(setup)
        if len(products) < 2:
            print(f"      Less than 2 products - skipping")
            return None

        # Calculate combined scores
        combined_scores = self._calculate_combined_scores(products)
        total_score = combined_scores.get('total', 0)

        print(f"\n   [SETUP] {setup_name} ({len(products)} products, SAFE: {total_score})")
        for p in products:
            print(f"      - {p['name']} ({p['role']}, {p['scores']['total']})")

        # Generate for each pillar
        all_pillar_results = {}
        pillar_narratives = {}

        for pillar in ['S', 'A', 'F', 'E']:
            print(f"      [{pillar}] {self.PILLAR_NAMES[pillar]}...", end=' ', flush=True)

            prompt = self._build_pillar_prompt(setup, products, pillar, combined_scores)

            # Call AI
            response = self.ai.call_for_narrative(prompt)

            if not response:
                print(f"AI call failed")
                continue

            # Parse JSON response
            parsed = self._parse_json_response(response)
            if not parsed:
                print(f"JSON parse failed")
                continue

            pillar_narratives[pillar] = parsed
            all_pillar_results[pillar] = parsed
            print(f"OK ({parsed.get('risk_level', '?')})")

            time.sleep(0.5)

        if not pillar_narratives:
            print(f"      No pillar narratives generated - skipping risk synthesis")
            return None

        # Risk synthesis (cross-pillar, cross-product)
        print(f"      [RISK] Global setup risk synthesis...", end=' ', flush=True)
        risk_prompt = self._build_risk_prompt(setup, products, combined_scores, all_pillar_results)
        risk_response = self.ai.call_for_narrative(risk_prompt, expert=True)

        risk_data = None
        if risk_response:
            risk_data = self._parse_json_response(risk_response)
            if risk_data:
                print(f"OK (risk: {risk_data.get('overall_risk_level', '?')})")
            else:
                print(f"JSON parse failed")
        else:
            print(f"AI call failed")

        return {
            'setup': setup,
            'products': products,
            'combined_scores': combined_scores,
            'pillar_narratives': pillar_narratives,
            'risk_data': risk_data,
        }

    def save_narratives(self, result):
        """
        Save generated narratives to Supabase (2 destinations).

        1. setup_pillar_narratives — per-pillar narrative text
        2. setup_risk_analysis — global risk synthesis
        """
        setup = result['setup']
        setup_id = setup['id']
        products = result['products']
        combined_scores = result['combined_scores']
        now = datetime.utcnow().isoformat()

        saved_count = 0

        # Find weakest product
        weakest = min(products, key=lambda p: p['scores']['total']) if products else None

        # === 1. setup_pillar_narratives ===
        for pillar, narrative in result['pillar_narratives'].items():
            pillar_key = pillar.lower()

            # Find weakest product for this specific pillar
            pillar_weakest = min(products, key=lambda p: p['scores'].get(pillar_key, 0)) if products else None

            # key_strengths / key_weaknesses are TEXT in this table
            strengths_text = '\n'.join(narrative.get('key_strengths', [])) if isinstance(narrative.get('key_strengths'), list) else (narrative.get('key_strengths', '') or '')
            weaknesses_text = '\n'.join(narrative.get('key_weaknesses', [])) if isinstance(narrative.get('key_weaknesses'), list) else (narrative.get('key_weaknesses', '') or '')

            record = {
                'setup_id': setup_id,
                'pillar': pillar,
                'narrative_summary': narrative.get('narrative_summary', ''),
                'key_strengths': strengths_text,
                'key_weaknesses': weaknesses_text,
                'security_strategy': narrative.get('security_strategy', ''),
                'worst_case_scenario': narrative.get('worst_case_scenario', ''),
                'risk_level': narrative.get('risk_level', 'medium'),
                'mitigation_advice': narrative.get('mitigation_advice', ''),
                'pillar_score': combined_scores.get(pillar_key, 0),
                'products_count': len(products),
                'weakest_product_name': pillar_weakest['name'] if pillar_weakest else None,
                'weakest_product_score': pillar_weakest['scores'].get(pillar_key, 0) if pillar_weakest else None,
                'ai_model': NARRATIVE_MODEL,
                'generated_at': now,
                'last_updated_at': now,
            }

            headers = get_supabase_headers('resolution=merge-duplicates', use_service_key=True)
            r = self.session.post(
                f"{SUPABASE_URL}/rest/v1/setup_pillar_narratives",
                headers=headers,
                json=record
            )

            if r.status_code in [200, 201]:
                saved_count += 1
            else:
                print(f"      [SAVE] Error saving setup narrative {pillar}: {r.status_code} - {r.text[:200]}")

        # === 2. setup_risk_analysis ===
        risk_data = result.get('risk_data')
        if risk_data:
            # Find weakest/strongest pillar
            pillar_scores = {p: combined_scores.get(p.lower(), 0) for p in ['S', 'A', 'F', 'E']}
            strongest = max(pillar_scores, key=pillar_scores.get) if pillar_scores else 'S'
            weakest_pillar = min(pillar_scores, key=pillar_scores.get) if pillar_scores else 'S'

            record = {
                'setup_id': setup_id,
                'overall_risk_level': risk_data.get('overall_risk_level', 'medium'),
                'overall_risk_narrative': risk_data.get('overall_risk_narrative', ''),
                'combined_worst_case': risk_data.get('combined_worst_case', ''),
                'attack_vectors': risk_data.get('attack_vectors', []),
                'priority_mitigations': risk_data.get('priority_mitigations', []),
                'interaction_risks': risk_data.get('interaction_risks', []),
                'gap_analysis': risk_data.get('gap_analysis', []),
                'harmony_score': 0.7,  # Default, could be computed
                'products_count': len(products),
                'total_score': combined_scores.get('total', 0),
                'weakest_pillar': weakest_pillar,
                'strongest_pillar': strongest,
                'executive_summary': risk_data.get('executive_summary', ''),
                'ai_model': NARRATIVE_EXPERT_MODEL,
                'generated_at': now,
                'last_updated_at': now,
            }

            headers = get_supabase_headers('resolution=merge-duplicates', use_service_key=True)
            r = self.session.post(
                f"{SUPABASE_URL}/rest/v1/setup_risk_analysis",
                headers=headers,
                json=record
            )

            if r.status_code in [200, 201]:
                saved_count += 1
            else:
                print(f"      [SAVE] Error saving setup risk analysis: {r.status_code} - {r.text[:200]}")

        print(f"      [SAVE] {saved_count} records saved to Supabase")
        return saved_count

    def run(self, setup_id=None, limit=None):
        """
        Main orchestrator. Generate narratives for setups.

        Args:
            setup_id: Optional setup ID to process (single setup)
            limit: Max number of setups to process
        """
        if not NARRATIVE_ENABLED:
            print("[SETUP-NARRATIVE] Disabled (NARRATIVE_ENABLED=false)")
            return

        print("\n" + "=" * 60)
        print("[SETUP-NARRATIVE] Setup Narrative Generator")
        print(f"   Model: {NARRATIVE_MODEL} | Expert: {NARRATIVE_EXPERT_MODEL}")
        print("=" * 60)

        # Load data
        self.load_data()

        # Filter setups
        setups = self.setups

        if setup_id:
            setups = [s for s in setups if s['id'] == setup_id]
            if not setups:
                print(f"[SETUP-NARRATIVE] Setup ID {setup_id} not found")
                return
            print(f"\n[SETUP-NARRATIVE] Processing setup #{setup_id}")

        # Filter to setups with at least 2 products
        valid_setups = []
        for s in setups:
            products_json = s.get('products', [])
            if isinstance(products_json, str):
                try:
                    products_json = json.loads(products_json)
                except (json.JSONDecodeError, TypeError):
                    continue
            if len(products_json) >= 2:
                valid_setups.append(s)

        setups = valid_setups
        print(f"[SETUP-NARRATIVE] {len(setups)} setups with 2+ products")

        if limit:
            setups = setups[:limit]
            print(f"[SETUP-NARRATIVE] Limited to {limit} setup(s)")

        # Process each setup
        total_saved = 0
        processed = 0
        errors = 0

        for setup in setups:
            try:
                result = self.generate_for_setup(setup)
                if result:
                    saved = self.save_narratives(result)
                    total_saved += saved
                    processed += 1
                else:
                    errors += 1
            except Exception as e:
                print(f"      [ERROR] Setup #{setup['id']}: {e}")
                errors += 1

        # Summary
        print(f"\n{'=' * 60}")
        print(f"[SETUP-NARRATIVE] Complete!")
        print(f"   Setups processed: {processed}")
        print(f"   Records saved: {total_saved}")
        print(f"   Errors: {errors}")
        print(f"{'=' * 60}")
