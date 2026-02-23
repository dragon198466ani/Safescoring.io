#!/usr/bin/env python3
"""
SAFESCORING.IO - Narrative Generator
Generates strategic analysis narratives from evaluation results.

Fills 4 DB destinations with AI-generated strategic text:
1. product_pillar_narratives — per-pillar narrative (summary, strengths, risks, strategy)
2. product_pillar_analyses — strategic conclusion + arrays (strengths[], risks[], recommendations[])
3. product_risk_analysis — global risk synthesis (attack vectors, mitigations)
4. products.safe_global_summary — JSONB executive summary

PIPELINE: SmartEvaluator → ScoreCalculator → NarrativeGenerator
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


class NarrativeGenerator:
    """
    Generates strategic narrative text from SAFE evaluation results.

    For each product:
    - 4 pillar calls (S, A, F, E) → narrative + analysis per pillar
    - 1 risk synthesis call → global risk analysis + executive summary
    = 5 AI calls per product

    Follows the SmartEvaluator/ScoreCalculator pattern:
    - load_data() → fetch from Supabase
    - generate_for_product() → AI calls
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

    def __init__(self):
        """Initialize NarrativeGenerator with AI provider and HTTP session."""
        self.ai = AIProvider()
        self.products = []
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
        """Load all necessary data from Supabase (evaluations loaded per-product for performance)."""
        print("[NARRATIVE] Loading data...")

        # Load products
        self.products = fetch_all('products', select='id,name,slug,type_id,url,safe_score,score_s,score_a,score_f,score_e', order='id')
        print(f"   {len(self.products)} products")

        # Load norms
        self.norms = fetch_all('norms', select='id,code,title,pillar,description,is_essential', order='id')
        print(f"   {len(self.norms)} norms")

        # Load scores from safe_scoring_results (lightweight)
        self.scores_data = fetch_all('safe_scoring_results', select='product_id,note_finale,score_s,score_a,score_f,score_e', order='product_id')
        self.scores_by_product = {s['product_id']: s for s in self.scores_data}
        print(f"   {len(self.scores_data)} product scores loaded")

        # OPTIMIZATION: Do NOT load all evaluations at once (2.9M rows)
        # Instead, load per-product in _get_product_evaluations()
        self.evaluations = []  # Empty - loaded on demand
        self._evals_cache = {}  # Cache per product_id
        print(f"   Evaluations: on-demand loading (optimized)")

        # Load product types
        self.product_types = fetch_all('product_types', select='id,name,description', order='id')
        print(f"   {len(self.product_types)} product types")

        # Build lookup maps
        self.norms_by_id = {n['id']: n for n in self.norms}
        self.norms_by_code = {n['code']: n for n in self.norms}
        self.types_by_id = {t['id']: t for t in self.product_types}

    def _get_product_evaluations(self, product_id):
        """Get all evaluations for a product, enriched with norm data.
        Loads from Supabase on-demand if not cached (optimization for 2.9M+ rows)."""
        # Check cache first
        if product_id in self._evals_cache:
            return self._evals_cache[product_id]

        # Load from Supabase on demand (much faster than loading all 2.9M rows)
        evals = []
        if not self.evaluations:
            # On-demand mode: fetch from Supabase
            import requests
            offset = 0
            while True:
                r = self.session.get(
                    f"{SUPABASE_URL}/rest/v1/evaluations?select=norm_id,result,why_this_result&product_id=eq.{product_id}&limit=1000&offset={offset}",
                    headers=SUPABASE_HEADERS,
                    timeout=60
                )
                if r.status_code != 200 or not r.json():
                    break
                evals.extend(r.json())
                offset += 1000
                if len(r.json()) < 1000:
                    break
        else:
            # Legacy mode: filter from pre-loaded evaluations
            evals = [e for e in self.evaluations if e['product_id'] == product_id]

        enriched = []
        for e in evals:
            norm_id = e.get('norm_id')
            norm = self.norms_by_id.get(norm_id)
            if norm:
                enriched.append({
                    'result': e['result'],
                    'reason': e.get('why_this_result', ''),
                    'code': norm['code'],
                    'title': norm['title'],
                    'pillar': norm['pillar'],
                    'is_essential': norm.get('is_essential', False),
                    'description': norm.get('description', ''),
                })

        # Cache the result
        self._evals_cache[product_id] = enriched
        return enriched

    def _build_pillar_data(self, product_id, pillar):
        """Sort evaluations into passed/failed/uncertain for a pillar."""
        evals = self._get_product_evaluations(product_id)
        pillar_evals = [e for e in evals if e['pillar'] == pillar]

        passed = [e for e in pillar_evals if e['result'] in ('YES', 'YESp')]
        failed = [e for e in pillar_evals if e['result'] in ('NO', 'N')]
        uncertain = [e for e in pillar_evals if e['result'] in ('TBD', 'N/A')]

        # Sort: essential norms first, then by code
        for lst in [passed, failed, uncertain]:
            lst.sort(key=lambda x: (not x['is_essential'], x['code']))

        return {
            'passed': passed,
            'failed': failed,
            'uncertain': uncertain,
            'total': len(pillar_evals),
            'pass_count': len(passed),
            'fail_count': len(failed),
            'tbd_count': len(uncertain),
        }

    def _build_pillar_prompt(self, product, pillar, data, scores):
        """Build the AI prompt for a pillar narrative, using REAL evaluation data."""
        pillar_name = self.PILLAR_NAMES[pillar]
        pillar_desc = self.PILLAR_DESCRIPTIONS[pillar]
        product_type = self.types_by_id.get(product.get('type_id'), {})
        type_name = product_type.get('name', 'Unknown')

        # Get pillar score
        score_key = f"score_{pillar.lower()}"
        pillar_score = scores.get(score_key, 0) or 0
        overall_score = scores.get('safe_score', 0) or 0

        # Format failed norms (top 20, essentials first)
        failed_text = ""
        for e in data['failed'][:20]:
            essential_tag = " [ESSENTIAL]" if e['is_essential'] else ""
            reason = e['reason'][:300] if e['reason'] else 'No details'
            failed_text += f"  - {e['code']}: {e['title']}{essential_tag}\n    Reason: {reason}\n"

        # Format passed essential norms (top 10)
        passed_essential_text = ""
        passed_essentials = [e for e in data['passed'] if e['is_essential']]
        for e in passed_essentials[:10]:
            passed_essential_text += f"  - {e['code']}: {e['title']}\n"

        # Count essential failures
        essential_failures = [e for e in data['failed'] if e['is_essential']]

        prompt = f"""You are a cybersecurity and product safety analyst. Analyze the {pillar_name} ({pillar}) pillar for this product based on REAL evaluation data.

PRODUCT: {product['name']}
TYPE: {type_name}
URL: {product.get('url', 'N/A')}

PILLAR: {pillar} - {pillar_name}
DESCRIPTION: {pillar_desc}
SCORE: {pillar_score}/100 (overall SAFE score: {overall_score}/100)

EVALUATION RESULTS:
- Passed: {data['pass_count']} norms
- Failed: {data['fail_count']} norms
- Uncertain/TBD: {data['tbd_count']} norms
- Essential norms failed: {len(essential_failures)}

FAILED NORMS (most important first):
{failed_text if failed_text else '  None - all norms passed!'}

PASSED ESSENTIAL NORMS:
{passed_essential_text if passed_essential_text else '  None identified'}

Based on this REAL data, generate a strategic analysis. Respond with valid JSON only (no markdown, no code blocks):

{{
  "narrative_summary": "3-5 sentence analysis of this pillar based on the actual evaluation results. Reference specific norms that failed or passed. Be concrete and actionable.",
  "key_strengths": ["Specific strength 1 referencing passed norms", "Strength 2"],
  "key_weaknesses": ["Specific weakness 1 referencing failed norms", "Weakness 2"],
  "critical_risks": ["Critical risk if essential norm failed, or empty array if none"],
  "recommendations": ["Concrete action item 1 to improve the score", "Action 2", "Action 3"],
  "security_strategy": "How to use this product safely given its {pillar_name} profile. Practical advice for users.",
  "worst_case_scenario": "Realistic worst-case scenario based on the identified failures. What could happen if these weaknesses are exploited?",
  "risk_level": "low|medium|high|critical",
  "mitigation_advice": "Concrete measures to reduce the identified risks. Reference specific failed norms.",
  "how_to_protect": {{
    "title": "How to protect yourself with {product['name']}",
    "intro": "Based on our {pillar_name} analysis of {product['name']}...",
    "steps": ["Step 1: concrete protection measure", "Step 2: another measure", "Step 3: monitoring action"],
    "emergency": "If compromised, immediately...",
    "risk_level": "{('critical' if len(essential_failures) > 3 else 'high' if len(essential_failures) > 0 else 'medium' if data['fail_count'] > 5 else 'low')}"
  }}
}}

IMPORTANT:
- Base ALL analysis on the REAL evaluation data above, not generic advice
- Reference specific norm codes (like S01, A15) when relevant
- The narrative must be product-specific, not generic
- Risk level must reflect the actual failures: critical if essential norms failed, high if many failures, etc.
- Write in English
- Return ONLY valid JSON, no other text"""

        return prompt

    def _build_risk_prompt(self, product, all_pillar_results, scores):
        """Build the AI prompt for global risk synthesis across all 4 pillars."""
        product_type = self.types_by_id.get(product.get('type_id'), {})
        type_name = product_type.get('name', 'Unknown')

        overall_score = scores.get('safe_score', 0) or 0

        # Build per-pillar summary
        pillar_summaries = ""
        total_essential_failures = 0
        total_failures = 0

        for pillar in ['S', 'A', 'F', 'E']:
            data = all_pillar_results.get(pillar, {})
            score_key = f"score_{pillar.lower()}"
            score = scores.get(score_key, 0) or 0
            fail_count = data.get('fail_count', 0)
            essential_fails = len([e for e in data.get('failed', []) if e['is_essential']])
            total_essential_failures += essential_fails
            total_failures += fail_count

            # Top 3 failures for this pillar
            top_fails = ""
            for e in data.get('failed', [])[:3]:
                top_fails += f"    - {e['code']}: {e['title']}\n"

            pillar_summaries += f"""
  {pillar} ({self.PILLAR_NAMES[pillar]}): {score}/100
    Passed: {data.get('pass_count', 0)} | Failed: {fail_count} | Essential failures: {essential_fails}
    Top failures:
{top_fails if top_fails else '    None'}
"""

        # Determine rating
        if overall_score >= 90:
            rating = 'A+'
        elif overall_score >= 80:
            rating = 'A'
        elif overall_score >= 70:
            rating = 'B'
        elif overall_score >= 60:
            rating = 'C'
        elif overall_score >= 50:
            rating = 'D'
        else:
            rating = 'F'

        # Find strongest/weakest
        pillar_scores = {p: scores.get(f"score_{p.lower()}", 0) or 0 for p in ['S', 'A', 'F', 'E']}
        strongest = max(pillar_scores, key=pillar_scores.get) if pillar_scores else 'S'
        weakest = min(pillar_scores, key=pillar_scores.get) if pillar_scores else 'S'

        prompt = f"""You are a cybersecurity and product risk analyst. Synthesize a GLOBAL risk analysis for this product based on evaluation data across all 4 SAFE pillars.

PRODUCT: {product['name']}
TYPE: {type_name}
OVERALL SAFE SCORE: {overall_score}/100
TOTAL FAILURES: {total_failures} norms | ESSENTIAL FAILURES: {total_essential_failures}

PILLAR-BY-PILLAR RESULTS:
{pillar_summaries}

Based on this REAL cross-pillar data, generate a global risk synthesis. Respond with valid JSON only:

{{
  "overall_risk_narrative": "3-5 sentence synthesis crossing all 4 pillars. Identify the most dangerous combinations of failures across pillars. Be specific about which pillar interactions create compound risks.",
  "combined_worst_case": "Realistic multi-pillar worst-case scenario. What happens when failures in different pillars combine? For example, weak security + weak adversity = ?",
  "attack_vectors": ["Specific attack vector 1 based on combined failures", "Vector 2", "Vector 3"],
  "priority_mitigations": ["Highest priority mitigation 1 addressing cross-pillar risks", "Mitigation 2", "Mitigation 3"],
  "overall_risk_level": "low|medium|high|critical",
  "safe_global_summary": {{
    "overall_score": {overall_score},
    "rating": "{rating}",
    "pillar_scores": {json.dumps(pillar_scores)},
    "strongest_pillar": "{strongest}",
    "weakest_pillar": "{weakest}",
    "executive_summary": "2-3 sentence executive summary of the product's safety profile. Must be product-specific and reference actual strengths/weaknesses."
  }}
}}

IMPORTANT:
- Cross-reference pillar failures to identify compound risks
- Attack vectors must be based on REAL failures, not generic threats
- Priority mitigations should address the most dangerous failure combinations
- Risk level: critical if essential norms failed across multiple pillars, high if concentrated in one pillar
- Write in English
- Return ONLY valid JSON, no other text"""

        return prompt

    def _parse_json_response(self, text):
        """
        Parse JSON from AI response robustly.
        Handles: raw JSON, ```json blocks, markdown wrapping, partial responses.
        """
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

        # Try fixing common issues: trailing commas, single quotes
        cleaned = text.strip()
        if cleaned.startswith('{'):
            # Remove trailing commas before } or ]
            cleaned = re.sub(r',\s*([}\]])', r'\1', cleaned)
            try:
                return json.loads(cleaned)
            except json.JSONDecodeError:
                pass

        print(f"      [NARRATIVE] Failed to parse JSON response ({len(text)} chars)")
        return None

    def generate_for_product(self, product):
        """
        Generate narratives for a single product.
        Makes 4 pillar calls + 1 risk synthesis = 5 AI calls.

        Returns dict with all generated data or None on failure.
        """
        product_id = product['id']
        product_name = product['name']

        # Get scores (prefer safe_scoring_results over product fields)
        score_data = self.scores_by_product.get(product_id, {}) if hasattr(self, 'scores_by_product') else {}
        scores = {
            'safe_score': score_data.get('note_finale') or product.get('safe_score', 0) or 0,
            'score_s': score_data.get('score_s') or product.get('score_s', 0) or 0,
            'score_a': score_data.get('score_a') or product.get('score_a', 0) or 0,
            'score_f': score_data.get('score_f') or product.get('score_f', 0) or 0,
            'score_e': score_data.get('score_e') or product.get('score_e', 0) or 0,
        }

        print(f"\n   [PRODUCT] {product_name} (SAFE: {scores['safe_score']}%)")

        # Check if product has evaluations (use on-demand loading)
        product_evals = self._get_product_evaluations(product_id)
        if not product_evals:
            print(f"      No evaluations found - skipping")
            return None

        # Generate for each pillar
        all_pillar_results = {}
        pillar_narratives = {}
        pillar_analyses = {}

        for pillar in ['S', 'A', 'F', 'E']:
            print(f"      [{pillar}] {self.PILLAR_NAMES[pillar]}...", end=' ', flush=True)

            # Build data and prompt
            data = self._build_pillar_data(product_id, pillar)
            all_pillar_results[pillar] = data

            if data['total'] == 0:
                print(f"no norms evaluated - skipping")
                continue

            prompt = self._build_pillar_prompt(product, pillar, data, scores)

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
            pillar_analyses[pillar] = parsed
            print(f"OK ({len(parsed.get('key_weaknesses', []))} weaknesses, "
                  f"{len(parsed.get('recommendations', []))} recommendations)")

            # Brief delay between calls
            time.sleep(0.5)

        if not pillar_narratives:
            print(f"      No pillar narratives generated - skipping risk synthesis")
            return None

        # Risk synthesis (cross-pillar)
        print(f"      [RISK] Global risk synthesis...", end=' ', flush=True)
        risk_prompt = self._build_risk_prompt(product, all_pillar_results, scores)
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
            'product': product,
            'scores': scores,
            'pillar_narratives': pillar_narratives,
            'pillar_analyses': pillar_analyses,
            'pillar_data': all_pillar_results,
            'risk_data': risk_data,
        }

    def save_narratives(self, result):
        """
        Save generated narratives to Supabase (4 destinations).

        1. product_pillar_narratives — per-pillar narrative text
        2. product_pillar_analyses — strategic arrays + how_to_protect
        3. product_risk_analysis — global risk synthesis
        4. products.safe_global_summary — executive summary JSONB
        """
        product = result['product']
        product_id = product['id']
        scores = result['scores']
        pillar_data = result.get('pillar_data', {})
        now = datetime.utcnow().isoformat()

        saved_count = 0

        # === 1. product_pillar_narratives ===
        for pillar, narrative in result['pillar_narratives'].items():
            data = pillar_data.get(pillar, {})

            # key_strengths and key_weaknesses are TEXT in this table (not arrays)
            strengths_text = '\n'.join(narrative.get('key_strengths', [])) if isinstance(narrative.get('key_strengths'), list) else (narrative.get('key_strengths', '') or '')
            weaknesses_text = '\n'.join(narrative.get('key_weaknesses', [])) if isinstance(narrative.get('key_weaknesses'), list) else (narrative.get('key_weaknesses', '') or '')

            record = {
                'product_id': product_id,
                'pillar': pillar,
                'narrative_summary': narrative.get('narrative_summary', ''),
                'key_strengths': strengths_text,
                'key_weaknesses': weaknesses_text,
                'security_strategy': narrative.get('security_strategy', ''),
                'worst_case_scenario': narrative.get('worst_case_scenario', ''),
                'risk_level': narrative.get('risk_level', 'medium'),
                'mitigation_advice': narrative.get('mitigation_advice', ''),
                'pillar_score': scores.get(f"score_{pillar.lower()}", 0) or 0,
                'evaluated_norms_count': data.get('total', 0),
                'failed_norms_count': data.get('fail_count', 0),
                'ai_model': NARRATIVE_MODEL,
                'generated_at': now,
                'last_updated_at': now,
            }

            headers = get_supabase_headers('resolution=merge-duplicates', use_service_key=True)
            r = self.session.post(
                f"{SUPABASE_URL}/rest/v1/product_pillar_narratives",
                headers=headers,
                json=record
            )

            if r.status_code in [200, 201]:
                saved_count += 1
            else:
                print(f"      [SAVE] Error saving narrative {pillar}: {r.status_code} - {r.text[:200]}")

        # === 2. product_pillar_analyses ===
        for pillar, analysis in result['pillar_analyses'].items():
            data = pillar_data.get(pillar, {})

            # key_strengths, key_weaknesses, critical_risks, recommendations are TEXT[] arrays
            record = {
                'product_id': product_id,
                'pillar': pillar,
                'pillar_score': scores.get(f"score_{pillar.lower()}", 0) or 0,
                'confidence_score': 0.8,  # Default confidence
                'strategic_conclusion': analysis.get('narrative_summary', ''),
                'key_strengths': analysis.get('key_strengths', []),
                'key_weaknesses': analysis.get('key_weaknesses', []),
                'critical_risks': analysis.get('critical_risks', []),
                'recommendations': analysis.get('recommendations', []),
                'how_to_protect': analysis.get('how_to_protect', {}),
                'evaluated_norms_count': data.get('total', 0),
                'passed_norms_count': data.get('pass_count', 0),
                'failed_norms_count': data.get('fail_count', 0),
                'tbd_norms_count': data.get('tbd_count', 0),
                'generated_by': f'narrative_generator/{NARRATIVE_MODEL}',
                'generated_at': now,
                'updated_at': now,
            }

            headers = get_supabase_headers('resolution=merge-duplicates', use_service_key=True)
            r = self.session.post(
                f"{SUPABASE_URL}/rest/v1/product_pillar_analyses",
                headers=headers,
                json=record
            )

            if r.status_code in [200, 201]:
                saved_count += 1
            else:
                print(f"      [SAVE] Error saving analysis {pillar}: {r.status_code} - {r.text[:200]}")

        # === 3. product_risk_analysis ===
        risk_data = result.get('risk_data')
        if risk_data:
            record = {
                'product_id': product_id,
                'overall_risk_level': risk_data.get('overall_risk_level', 'medium'),
                'overall_risk_narrative': risk_data.get('overall_risk_narrative', ''),
                'combined_worst_case': risk_data.get('combined_worst_case', ''),
                'attack_vectors': risk_data.get('attack_vectors', []),
                'priority_mitigations': risk_data.get('priority_mitigations', []),
                'ai_model': NARRATIVE_EXPERT_MODEL,
                'generated_at': now,
                'last_updated_at': now,
            }

            headers = get_supabase_headers('resolution=merge-duplicates', use_service_key=True)
            r = self.session.post(
                f"{SUPABASE_URL}/rest/v1/product_risk_analysis",
                headers=headers,
                json=record
            )

            if r.status_code in [200, 201]:
                saved_count += 1
            else:
                print(f"      [SAVE] Error saving risk analysis: {r.status_code} - {r.text[:200]}")

        # === 4. products.safe_global_summary ===
        if risk_data and risk_data.get('safe_global_summary'):
            summary = risk_data['safe_global_summary']

            headers = get_supabase_headers('return=minimal', use_service_key=True)
            r = self.session.patch(
                f"{SUPABASE_URL}/rest/v1/products?id=eq.{product_id}",
                headers=headers,
                json={'safe_global_summary': summary}
            )

            if r.status_code in [200, 204]:
                saved_count += 1
            else:
                print(f"      [SAVE] Error saving global summary: {r.status_code} - {r.text[:200]}")

        print(f"      [SAVE] {saved_count} records saved to Supabase")
        return saved_count

    def run(self, product_name=None, limit=None):
        """
        Main orchestrator. Generate narratives for products.

        Args:
            product_name: Optional product name to filter (single product)
            limit: Max number of products to process
        """
        if not NARRATIVE_ENABLED:
            print("[NARRATIVE] Disabled (NARRATIVE_ENABLED=false)")
            return

        print("\n" + "=" * 60)
        print("[NARRATIVE] Strategic Narrative Generator")
        print(f"   Model: {NARRATIVE_MODEL} | Expert: {NARRATIVE_EXPERT_MODEL}")
        print(f"   Tokens: {NARRATIVE_MAX_TOKENS} | Risk tokens: {NARRATIVE_RISK_MAX_TOKENS}")
        print("=" * 60)

        # Load data
        self.load_data()

        # Filter products
        products = self.products

        if product_name:
            products = [p for p in products if product_name.lower() in p['name'].lower()]
            if not products:
                print(f"[NARRATIVE] Product '{product_name}' not found")
                return
            print(f"\n[NARRATIVE] Filtered to {len(products)} product(s) matching '{product_name}'")

        if limit:
            products = products[:limit]
            print(f"[NARRATIVE] Limited to {limit} product(s)")

        # Process each product
        total_saved = 0
        processed = 0
        errors = 0

        for product in products:
            try:
                result = self.generate_for_product(product)
                if result:
                    saved = self.save_narratives(result)
                    total_saved += saved
                    processed += 1
                else:
                    errors += 1
            except Exception as e:
                print(f"      [ERROR] {product['name']}: {e}")
                errors += 1

        # Summary
        print(f"\n{'=' * 60}")
        print(f"[NARRATIVE] Complete!")
        print(f"   Products processed: {processed}")
        print(f"   Records saved: {total_saved}")
        print(f"   Errors: {errors}")
        print(f"{'=' * 60}")
