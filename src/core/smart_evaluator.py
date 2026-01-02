#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SAFESCORING.IO - Smart Evaluator
Evaluates crypto products with AI using:
- The norm_applicability table to know which norms apply
- The product_types table for type descriptions
- Official website scraping for more context
- MULTI-TYPE SUPPORT: A product can have multiple types

WORKFLOW: Applicability (TRUE/FALSE) -> Smart Evaluator (YES/NO/N/A/TBD) -> Score Calculator
"""

import requests
import time
from datetime import datetime

# Import from common modules
from .config import SUPABASE_URL, get_supabase_headers
from .api_provider import AIProvider, parse_evaluation_response
from .scraper import WebScraper
from .ai_strategy import get_norm_strategy, TaskComplexity, AIModel


# =============================================================================
# PROMPTS SPECIALISES PAR PILIER - Optimises pour la securite cryptographique
# Systeme hybride: Flash (rapide) + Pro (revision critique)
# =============================================================================

SYSTEM_PROMPT_BASE = """You are an expert in crypto security and blockchain product evaluation.

RATING SYSTEM:
- YES = Concrete proof that the product implements this norm (explicit documentation/source)
- YESp = Imposed by product design/protocol (inherent to technology, e.g. EVM uses secp256k1)
- NO = The product does NOT implement this norm OR no verifiable proof exists
- TBD = Truly impossible to determine (use EXTREMELY RARELY, prefer NO when uncertain)

CRITICAL RULES:
1. CONSERVATIVE EVALUATION: When in doubt, answer NO
2. NO ASSUMPTIONS: "Security" without specifics = NO
3. TECHNICAL COHERENCE: A norm must make technical sense for the product type
4. EVIDENCE REQUIRED: Marketing claims are not proof

SCORE: (YES + YESp) / (YES + YESp + NO) x 100
"""

# PILIER S - SECURITY (Cryptographie) - PROMPT EXPERT
SYSTEM_PROMPT_S = SYSTEM_PROMPT_BASE + """
PILLAR S - SECURITY (Cryptographic Security) - EXPERT MODE

STRICT CRYPTO EVALUATION:
1. ALGORITHM VERIFICATION:
   - YES = Explicitly in docs, audit, or source code
   - YESp = Required by protocol (secp256k1 for Ethereum, Ed25519 for Solana)
   - NO = No verifiable proof

2. IMPLICIT STANDARDS (YESp for EVM products):
   secp256k1, ECDSA, Keccak-256, EIP-712, EIP-1559, TLS 1.3, HTTPS

3. HARDWARE SECURITY:
   - Secure Element/TEE/HSM = Require explicit docs
   - "Bank-grade security" marketing = NO
   - Chip model (CC EAL5+) = YES

4. KEY MANAGEMENT:
   - BIP-39/44/32 = YESp if wallet with seed
   - Multisig = Threshold required (2-of-3)
   - MPC = Technical protocol docs required

RULE: "Secure" without specifics = NO
"""

# PILIER A - ADVERSITY (Anti-coercition) - PROMPT EXPERT
SYSTEM_PROMPT_A = SYSTEM_PROMPT_BASE + """
PILLAR A - ADVERSITY (Attack Resistance) - EXPERT MODE

STRICT SECURITY EVALUATION:
1. ANTI-COERCION (require EXPLICIT docs):
   - Duress PIN = Documented feature only
   - Hidden wallets = Feature description required
   - Auto-wipe = Trigger conditions documented

2. PHYSICAL SECURITY:
   - Tamper-evident = Physical description/cert
   - Tamper-resistant = CC EAL, FIPS required
   - Water/dust = IP rating required

3. ATTACK RESISTANCE:
   - Side-channel = Audit/technical docs
   - Brute-force = Lockout policy specified

4. PRIVACY:
   - Tor/VPN = Built-in, not "compatible"
   - Mixing/CoinJoin = Protocol support
   - ZK proofs = Specific implementation

CONSERVATIVE: Not documented = NO
"""

# PILIER F - FIDELITY (Fiabilite) - PROMPT STANDARD
SYSTEM_PROMPT_F = SYSTEM_PROMPT_BASE + """
PILLAR F - FIDELITY (Reliability & Quality)

EVALUATION:
1. TRACK RECORD: Uptime stats, years active, incident history
2. AUDITS: Named firm + report, SOC 2, ISO 27001, bug bounty
3. SOFTWARE: Open source, update frequency, documentation
4. DURABILITY: Build quality, warranty, support duration
"""

# PILIER E - EFFICIENCY (Usabilite) - PROMPT STANDARD
SYSTEM_PROMPT_E = SYSTEM_PROMPT_BASE + """
PILLAR E - EFFICIENCY (Usability & Compatibility)

EVALUATION:
1. CHAINS: Check "supported networks" page, YESp for inherent chains
2. PLATFORMS: iOS/Android apps, Desktop, Browser extension
3. FEATURES: NFT, DeFi integration, Staking
4. ACCESSIBILITY: Languages, screen reader, onboarding

IMPLICIT EVM (YESp): ETH, ERC-20, ERC-721, EIP standards
"""

# Mapping pilier -> prompt
PILLAR_PROMPTS = {
    'S': SYSTEM_PROMPT_S,
    'A': SYSTEM_PROMPT_A,
    'F': SYSTEM_PROMPT_F,
    'E': SYSTEM_PROMPT_E,
}

# Piliers critiques (necessitent revision experte avec Gemini Pro)
# TOUS les piliers sont importants - chacun compte 25% du score final
CRITICAL_PILLARS = ['S', 'A', 'F', 'E']  # Tous les piliers meritent la revision Pro

# Legacy compatibility
SYSTEM_PROMPT = SYSTEM_PROMPT_BASE


class SmartEvaluator:
    """
    Intelligent evaluator with AI and scraping.
    Supports MULTIPLE TYPES per product.
    Uses Supabase tables for applicability and descriptions.
    """

    def __init__(self):
        self.headers = get_supabase_headers()
        self.products = []
        self.norms = []
        self.norms_by_id = {}
        self.product_types = {}
        self.norm_applicability = {}  # {type_id: {norm_id: is_applicable}}
        self.product_type_mapping = {}  # {product_id: [type_ids]}
        self.ai_provider = AIProvider()
        self.scraper = WebScraper()

    def load_data(self):
        """Loads data from Supabase (products, types, norms, applicability, type mapping)"""
        print("\n[LOAD] Loading Supabase data...")

        # Products
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/products?select=*&limit=500",
            headers=self.headers
        )
        self.products = r.json() if r.status_code == 200 else []
        print(f"   {len(self.products)} products")

        # Product types
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/product_types?select=id,code,name_fr,name,category,description",
            headers=self.headers
        )
        types = r.json() if r.status_code == 200 else []
        self.product_types = {t['id']: t for t in types}
        print(f"   {len(self.product_types)} product types")

        # Norms
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/norms?select=id,code,pillar,title,description,is_essential,consumer&order=pillar.asc,code.asc",
            headers=self.headers
        )
        self.norms = r.json() if r.status_code == 200 else []
        self.norms_by_id = {n['id']: n for n in self.norms}
        print(f"   {len(self.norms)} norms")

        # Norm applicability by type - load all at once with pagination
        print("   Loading applicability...")
        self.norm_applicability = {}

        # Paginated request to load all applicability rules (Supabase has 1000 row limit)
        offset = 0
        page_size = 1000
        total_loaded = 0

        while True:
            r = requests.get(
                f"{SUPABASE_URL}/rest/v1/norm_applicability?select=type_id,norm_id,is_applicable&limit={page_size}&offset={offset}",
                headers=self.headers,
                timeout=60
            )
            if r.status_code != 200:
                print(f"   Error loading applicability: {r.status_code}")
                break

            page_data = r.json()
            if not page_data:
                break  # No more data

            # Group by type_id
            for a in page_data:
                type_id = a['type_id']
                if type_id not in self.norm_applicability:
                    self.norm_applicability[type_id] = {}
                self.norm_applicability[type_id][a['norm_id']] = a['is_applicable']

            total_loaded += len(page_data)
            offset += page_size

            if len(page_data) < page_size:
                break  # Last page

        total_rules = sum(len(v) for v in self.norm_applicability.values())
        print(f"   {total_rules} applicability rules loaded")

        # Product type mapping (multi-type support)
        print("   Loading product type mappings...")
        self.product_type_mapping = {}

        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/product_type_mapping?select=product_id,type_id,is_primary&order=is_primary.desc",
            headers=self.headers
        )

        if r.status_code == 200:
            mappings = r.json()
            for m in mappings:
                pid = m['product_id']
                if pid not in self.product_type_mapping:
                    self.product_type_mapping[pid] = []
                self.product_type_mapping[pid].append(m['type_id'])

        # Fallback: use products.type_id for products without mapping
        for product in self.products:
            pid = product['id']
            if pid not in self.product_type_mapping and product.get('type_id'):
                self.product_type_mapping[pid] = [product['type_id']]

        multi_type_count = sum(1 for types in self.product_type_mapping.values() if len(types) > 1)
        print(f"   {len(self.product_type_mapping)} products with types ({multi_type_count} multi-type)")

    def get_product_type_ids(self, product):
        """Returns all type IDs for a product (supports multi-type)"""
        product_id = product['id']

        # First check mapping table
        if product_id in self.product_type_mapping:
            return self.product_type_mapping[product_id]

        # Fallback to single type_id
        if product.get('type_id'):
            return [product['type_id']]

        return []

    def get_applicable_norms(self, type_ids):
        """
        Returns applicable norms for a product with multiple types.
        Applicability = UNION of all types (norm is applicable if applicable to ANY type)
        """
        applicable_norm_ids = set()

        for type_id in type_ids:
            type_applicability = self.norm_applicability.get(type_id, {})
            for norm_id, is_applicable in type_applicability.items():
                if is_applicable:
                    applicable_norm_ids.add(norm_id)

        return [n for n in self.norms if n['id'] in applicable_norm_ids]

    def _get_type_context(self, product_info):
        """
        Returns type-specific context for evaluation prompts.
        Helps AI understand what kind of product it's evaluating.
        """
        type_code = product_info.get('type_code', '')
        category = product_info.get('category', '')

        # Detect product type characteristics
        is_hardware = 'HW' in type_code or category == 'Hardware'
        is_protocol = any(x in type_code for x in ['DEX', 'Lending', 'Bridges', 'Yield', 'Protocol'])
        is_defi = 'DeFi' in category or is_protocol
        is_wallet = 'Wallet' in type_code or 'SW' in type_code or 'HW' in type_code

        context_lines = ["PRODUCT TYPE CONTEXT:"]

        if is_protocol:
            context_lines.append("- This is a PROTOCOL (smart contracts on blockchain)")
            context_lines.append("- It has NO physical components, NO hardware, NO device")
            context_lines.append("- Norms about PIN, wipe, firmware, battery are TECHNICALLY IMPOSSIBLE")
            context_lines.append("- Relevant: smart contract security, audits, gas optimization")
        elif is_hardware:
            context_lines.append("- This is a HARDWARE DEVICE (physical)")
            context_lines.append("- Relevant: physical security, firmware, secure element, durability")
        elif is_wallet:
            context_lines.append("- This is a SOFTWARE WALLET")
            context_lines.append("- No physical components - norms about hardware are irrelevant")
            context_lines.append("- Relevant: key management, encryption, BIP standards")
        else:
            context_lines.append(f"- Product type: {type_code}")

        return "\n".join(context_lines)

    def get_product_info(self, product):
        """Gets product info for the prompt (supports multi-type)"""
        type_ids = self.get_product_type_ids(product)

        # Get all type infos
        type_infos = [self.product_types.get(tid, {}) for tid in type_ids]
        type_infos = [t for t in type_infos if t]  # Remove empty

        if type_infos:
            # Primary type is first
            primary_type = type_infos[0]
            type_names = [t.get('name_fr') or t.get('name', 'Unknown') for t in type_infos]
            type_codes = [t.get('code', '?') for t in type_infos]
            categories = list(set(t.get('category', 'Unknown') for t in type_infos))

            return {
                'name': product['name'],
                'url': product.get('url', 'N/A'),
                'type_ids': type_ids,
                'type': ' + '.join(type_names),  # "Hardware Wallet + Signing Device"
                'type_code': ' + '.join(type_codes),  # "HW_COLD + HW_SIGN"
                'type_description': primary_type.get('description', ''),
                'category': ' / '.join(categories),
                'is_multi_type': len(type_ids) > 1
            }
        else:
            return {
                'name': product['name'],
                'url': product.get('url', 'N/A'),
                'type_ids': [],
                'type': 'Unknown',
                'type_code': 'Unknown',
                'type_description': '',
                'category': 'Unknown',
                'is_multi_type': False
            }

    def evaluate_batch_with_ai(self, product_info, norms_batch, pillar, website_content=None, use_expert=False):
        """
        Evaluates a batch of APPLICABLE norms for a product.
        Uses STRATEGIC MODEL SELECTION based on norm complexity.

        Strategy:
        - CRITICAL norms (S01-S40, A01-A30): Gemini Pro with pass2 review
        - COMPLEX norms: Gemini Flash or DeepSeek
        - SIMPLE/TRIVIAL norms: Groq (FREE)

        Args:
            use_expert: If True, forces Gemini Pro for all norms (override)
        """
        # Group norms by model strategy to optimize API calls
        norms_by_model = {}
        for norm in norms_batch:
            strategy = get_norm_strategy(norm['code'])
            model_key = strategy['model'].value
            if model_key not in norms_by_model:
                norms_by_model[model_key] = []
            norms_by_model[model_key].append(norm)

        # Log model distribution
        model_summary = ", ".join([f"{k}:{len(v)}" for k, v in norms_by_model.items()])
        print(f"      Models: {model_summary}")

        all_evaluations = {}

        # Process each model group
        for model_key, norms_group in norms_by_model.items():
            # Build prompt for this group
            norms_text = "\n".join([
                f"- {n['code']}: {n['title']}" + (f" - {n.get('description', '')}" if n.get('description') else "")
                for n in norms_group
            ])

            website_section = ""
            if website_content:
                # More context for critical/complex norms
                complexity = get_norm_strategy(norms_group[0]['code'])['complexity']
                max_chars = 5000 if complexity in [TaskComplexity.CRITICAL, TaskComplexity.COMPLEX] else 3000
                website_section = f"\nPRODUCT DOCUMENTATION:\n{website_content[:max_chars]}\n"

            # Multi-type info
            type_info = f"- Type: {product_info['type']} ({product_info['type_code']})"
            if product_info.get('is_multi_type'):
                type_info += "\n- Note: This product has MULTIPLE types, norms from all types are applicable"

            # Select pillar-specific prompt
            system_prompt = PILLAR_PROMPTS.get(pillar, SYSTEM_PROMPT_BASE)

            # Get type characteristics for context
            type_context = self._get_type_context(product_info)

            prompt = f"""{system_prompt}

PRODUCT TO EVALUATE:
- Name: {product_info['name']}
{type_info}
- Website: {product_info['url']}
- Category: {product_info['category']}
{type_context}
{website_section}
PILLAR: {pillar}

NORMS TO EVALUATE (pre-filtered as applicable):
{norms_text}

STRICT EVALUATION RULES:
1. These norms are PRE-FILTERED as applicable to this product type(s)
2. You MUST answer YES, YESp, NO or TBD for EACH norm
3. N/A is FORBIDDEN (non-applicable norms already excluded)
4. When in doubt, ALWAYS prefer NO over TBD
5. Marketing claims without technical details = NO
6. "Secure" or "protected" without specifics = NO
7. Provide a BRIEF justification for each answer

COMMON MISTAKES TO AVOID:
- Saying YES for hardware features on software products
- Assuming compliance without explicit documentation
- Accepting vague security claims as proof

FORMAT (one line per norm):
CODE: RESULT | Brief reason

Evaluate:"""

            # Use strategic model selection OR expert override
            if use_expert:
                result = self.ai_provider.call_expert(prompt)
            else:
                # Use call_for_norm with the first norm to determine strategy
                # (all norms in this group have same model)
                first_norm_code = norms_group[0]['code']
                result = self.ai_provider.call_for_norm(first_norm_code, prompt)

            if result:
                group_evaluations = parse_evaluation_response(result)
                all_evaluations.update(group_evaluations)

        return all_evaluations

    def review_critical_evaluations(self, product_info, evaluations, applicable_norms, website_content=None):
        """
        Expert review of critical pillar (S/A) evaluations using strategic model selection.
        Reviews TBD results and validates YES/NO for security-critical norms.
        Uses pass2_override to force second-pass review with expert model.
        Returns corrected evaluations.
        """
        # Get norms that need review: TBD results + essential norms
        norms_to_review = []
        norm_by_code = {n['code']: n for n in applicable_norms}

        for code, eval_data in evaluations.items():
            result = eval_data[0] if isinstance(eval_data, tuple) else eval_data
            norm = norm_by_code.get(code)
            if norm:
                # Check if this norm needs review based on strategy
                strategy = get_norm_strategy(code)
                needs_review = (
                    result == 'TBD' or
                    norm.get('is_essential') or
                    strategy['complexity'] == TaskComplexity.CRITICAL
                )
                if needs_review:
                    norms_to_review.append(norm)

        if not norms_to_review:
            return evaluations

        # Group norms by model for efficient review
        norms_by_model = {}
        for norm in norms_to_review:
            strategy = get_norm_strategy(norm['code'])
            model_key = strategy['model'].value
            if model_key not in norms_by_model:
                norms_by_model[model_key] = []
            norms_by_model[model_key].append(norm)

        model_summary = ", ".join([f"{k}:{len(v)}" for k, v in norms_by_model.items()])
        print(f"   [EXPERT REVIEW] {len(norms_to_review)} norms ({model_summary})")

        # Process each model group
        for model_key, norms_group in norms_by_model.items():
            # Build review prompt
            norms_text = "\n".join([
                f"- {n['code']}: {n['title']} - {n.get('description', '')} | Current: {evaluations.get(n['code'], ('?', ''))[0]}"
                for n in norms_group
            ])

            review_prompt = f"""You are a SENIOR CRYPTO SECURITY AUDITOR performing expert review.

TASK: Review and validate/correct these security evaluations.

PRODUCT: {product_info['name']} ({product_info['type']})
WEBSITE: {product_info['url']}

{f"DOCUMENTATION:{chr(10)}{website_content[:5000]}" if website_content else ""}

EVALUATIONS TO REVIEW:
{norms_text}

INSTRUCTIONS:
1. For each norm, confirm or correct the evaluation
2. TBD is NOT acceptable for security norms - you MUST decide YES/YESp or NO
3. Be CONSERVATIVE: if evidence is weak, answer NO
4. Provide clear justification

FORMAT:
CODE: RESULT | Detailed justification

Review:"""

            # Use call_for_norm with pass2_override for expert review
            first_norm_code = norms_group[0]['code']
            result = self.ai_provider.call_for_norm(
                first_norm_code, review_prompt,
                max_tokens=2500, temperature=0.15,
                pass2_override=True  # Force expert review
            )

            if not result:
                continue

            # Parse and merge corrections
            corrections = parse_evaluation_response(result)

            corrected_count = 0
            for code, new_eval in corrections.items():
                if code in evaluations:
                    old_result = evaluations[code][0] if isinstance(evaluations[code], tuple) else evaluations[code]
                    new_result = new_eval[0] if isinstance(new_eval, tuple) else new_eval
                    if old_result != new_result:
                        corrected_count += 1
                    evaluations[code] = new_eval

            if corrected_count > 0:
                print(f"      [{model_key}] {corrected_count} corrections")

        return evaluations

    def evaluate_product(self, product, enable_expert_review=True):
        """
        Evaluates a product using norm_applicability and scraping (multi-type support).

        HYBRID SYSTEM:
        1. First pass: Gemini Flash (fast, all pillars)
        2. Expert review: Gemini Pro (critical pillars S/A, TBD results)

        Args:
            enable_expert_review: If True, uses Gemini Pro for critical pillar review
        """
        product_info = self.get_product_info(product)
        type_ids = product_info['type_ids']

        type_label = product_info['type']
        if product_info.get('is_multi_type'):
            type_label = f"{type_label} [MULTI-TYPE]"

        print(f"\n[EVAL] {product_info['name']} ({type_label})")

        if not type_ids:
            print(f"   No type assigned to this product!")
            return {}

        # Get applicable norms (UNION of all types)
        applicable_norms = self.get_applicable_norms(type_ids)
        print(f"   {len(applicable_norms)} applicable norms (from {len(type_ids)} type(s))")

        if not applicable_norms:
            print(f"   No applicable norm found!")
            return {}

        # Scrape product website
        website_content = None
        if product.get('url'):
            print(f"   Scraping {product['url'][:50]}...")
            website_content = self.scraper.scrape_product(product)

        all_evaluations = {}

        # === PASS 1: Fast evaluation with Gemini Flash ===
        print("   [PASS 1] Fast evaluation (Flash)...")

        for pillar in ['S', 'A', 'F', 'E']:
            pillar_norms = [n for n in applicable_norms if n['pillar'] == pillar]

            if not pillar_norms:
                continue

            batch_size = 50  # Optimized: more norms per request = fewer API calls
            pillar_results = {}

            for i in range(0, len(pillar_norms), batch_size):
                batch = pillar_norms[i:i+batch_size]
                pillar_label = f"{pillar}*" if pillar in CRITICAL_PILLARS else pillar
                print(f"   Pillar {pillar_label} batch {i//batch_size + 1} ({len(batch)} norms)...")

                batch_results = self.evaluate_batch_with_ai(product_info, batch, pillar, website_content)
                pillar_results.update(batch_results)
                time.sleep(0.5)

            # Count results
            yes_count = sum(1 for v in pillar_results.values() if v[0] == 'YES')
            yesp_count = sum(1 for v in pillar_results.values() if v[0] == 'YESp')
            no_count = sum(1 for v in pillar_results.values() if v[0] == 'NO')
            tbd_count = sum(1 for v in pillar_results.values() if v[0] == 'TBD')
            score_base = yes_count + yesp_count + no_count
            pct = (yes_count + yesp_count) * 100 // score_base if score_base > 0 else 0

            print(f"   {pillar}: {yes_count} YES, {yesp_count} YESp, {no_count} NO, {tbd_count} TBD ({pct}%)")

            all_evaluations.update(pillar_results)

        # === PASS 2: Expert review with Gemini Pro (critical pillars) ===
        if enable_expert_review:
            # Count TBD in critical pillars
            tbd_critical = sum(
                1 for code, v in all_evaluations.items()
                if v[0] == 'TBD' and any(
                    n['code'] == code and n['pillar'] in CRITICAL_PILLARS
                    for n in applicable_norms
                )
            )

            if tbd_critical > 0:
                print(f"   [PASS 2] Expert review (Pro) - {tbd_critical} TBD in critical pillars...")
                all_evaluations = self.review_critical_evaluations(
                    product_info, all_evaluations, applicable_norms, website_content
                )

        return all_evaluations, applicable_norms

    def save_evaluations(self, product_id, evaluations, applicable_norms):
        """Saves evaluations to Supabase with history preservation."""
        norm_id_by_code = {n['code']: n['id'] for n in self.norms}
        applicable_norm_ids = {n['id'] for n in applicable_norms}

        eval_records = []

        # Add AI evaluations for applicable norms
        for code, eval_data in evaluations.items():
            norm_id = norm_id_by_code.get(code)
            if norm_id:
                result, reason = eval_data if isinstance(eval_data, tuple) else (eval_data, '')
                eval_records.append({
                    'product_id': product_id,
                    'norm_id': norm_id,
                    'result': result,
                    'why_this_result': reason[:500] if reason else None,
                    'evaluated_by': 'smart_ai',
                    'evaluation_date': datetime.now().strftime('%Y-%m-%d')
                })

        # Add N/A for non-applicable norms
        for norm in self.norms:
            if norm['id'] not in applicable_norm_ids:
                eval_records.append({
                    'product_id': product_id,
                    'norm_id': norm['id'],
                    'result': 'N/A',
                    'why_this_result': 'Norm not applicable to this product type(s)',
                    'evaluated_by': 'norm_applicability',
                    'evaluation_date': datetime.now().strftime('%Y-%m-%d')
                })

        if not eval_records:
            return 0

        # Archive old evaluations to history table (if it exists)
        try:
            # Get old evaluations
            old_evals = requests.get(
                f"{SUPABASE_URL}/rest/v1/evaluations?product_id=eq.{product_id}&select=*",
                headers=self.headers
            )
            if old_evals.status_code == 200 and old_evals.json():
                # Try to insert into history table
                history_records = old_evals.json()
                for rec in history_records:
                    rec.pop('id', None)  # Remove original ID for new insert
                history_resp = requests.post(
                    f"{SUPABASE_URL}/rest/v1/evaluation_history",
                    headers=get_supabase_headers('return=minimal'),
                    json=history_records
                )
                if history_resp.status_code in [200, 201]:
                    print(f"      Archived {len(history_records)} old evaluations to history")
        except Exception:
            pass  # History table may not exist yet, continue without archiving

        # Delete old evaluations
        del_headers = get_supabase_headers('return=representation')
        requests.delete(
            f"{SUPABASE_URL}/rest/v1/evaluations?product_id=eq.{product_id}",
            headers=del_headers
        )

        # Deduplicate
        unique_records = {}
        for rec in eval_records:
            key = (rec['product_id'], rec['norm_id'])
            unique_records[key] = rec
        eval_records = list(unique_records.values())

        # Insert with upsert
        upsert_headers = get_supabase_headers('resolution=merge-duplicates')
        batch_size = 500
        inserted = 0

        for i in range(0, len(eval_records), batch_size):
            batch = eval_records[i:i+batch_size]
            r = requests.post(
                f"{SUPABASE_URL}/rest/v1/evaluations",
                headers=upsert_headers,
                json=batch
            )
            if r.status_code in [200, 201]:
                inserted += len(batch)

        return inserted

    def get_evaluated_product_ids(self):
        """Gets IDs of already evaluated products"""
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/evaluations?select=product_id",
            headers=self.headers
        )
        if r.status_code == 200:
            evals = r.json()
            return set(e['product_id'] for e in evals)
        return set()

    def run(self, product_name=None, type_id=None, limit=None, skip_evaluated=False, start_index=0, worker_id=0):
        """Runs automated evaluation."""
        worker_prefix = f"[W{worker_id}] " if worker_id > 0 else ""

        print(f"""
================================================================
     SAFE SCORING - SMART EVALUATOR {worker_prefix}
     Applicability -> Evaluation -> Score
     MULTI-TYPE SUPPORT ENABLED
================================================================
""")

        self.load_data()

        # Get already evaluated products
        evaluated_ids = set()
        if skip_evaluated:
            print(f"\n{worker_prefix}Checking evaluated products...")
            evaluated_ids = self.get_evaluated_product_ids()
            print(f"   {len(evaluated_ids)} already evaluated")

        # Filter products
        if product_name:
            products_to_eval = [p for p in self.products if product_name.lower() in p['name'].lower()]
        elif type_id:
            # Filter by type (check both old type_id and new mapping)
            products_to_eval = []
            for p in self.products:
                product_types = self.get_product_type_ids(p)
                if type_id in product_types:
                    products_to_eval.append(p)
        else:
            all_products = self.products[start_index:] if start_index > 0 else self.products
            products_to_eval = all_products[:limit] if limit else all_products

        if skip_evaluated:
            products_to_eval = [p for p in products_to_eval if p['id'] not in evaluated_ids]

        print(f"\n{len(products_to_eval)} product(s) to evaluate")

        results = []

        for i, product in enumerate(products_to_eval):
            print(f"\n[{i+1}/{len(products_to_eval)}]", end="")

            result = self.evaluate_product(product)

            if result and isinstance(result, tuple):
                evaluations, applicable_norms = result

                if evaluations:
                    saved = self.save_evaluations(product['id'], evaluations, applicable_norms)

                    def get_result(v):
                        return v[0] if isinstance(v, tuple) else v

                    yes = sum(1 for v in evaluations.values() if get_result(v) == 'YES')
                    yesp = sum(1 for v in evaluations.values() if get_result(v) == 'YESp')
                    no = sum(1 for v in evaluations.values() if get_result(v) == 'NO')
                    tbd = sum(1 for v in evaluations.values() if get_result(v) == 'TBD')
                    score_base = yes + yesp + no
                    score = (yes + yesp) * 100 // score_base if score_base > 0 else 0
                    na_count = len(self.norms) - len(applicable_norms)

                    print(f"   {saved} evaluations saved ({na_count} auto N/A)")
                    print(f"   Score: {yes + yesp}/{score_base} = {score}%")

                    results.append({
                        'name': product['name'],
                        'yes': yes,
                        'yesp': yesp,
                        'no': no,
                        'tbd': tbd,
                        'na': na_count,
                        'score': score
                    })

        # Summary
        if results:
            print(f"\n{'='*60}")
            print("SUMMARY")
            print(f"{'='*60}")
            for r in results:
                print(f"  {r['name'][:30]:<30} | {r['score']:>3}% ({r['yes']}+{r['yesp']}p YES)")

        return results


def main():
    import argparse

    parser = argparse.ArgumentParser(description='Smart Evaluator - AI crypto product evaluation')
    parser.add_argument('--product', type=str, help='Product name to evaluate')
    parser.add_argument('--type', type=int, help='Product type ID to evaluate')
    parser.add_argument('--limit', type=int, default=None, help='Number of products to evaluate')
    parser.add_argument('--resume', action='store_true', help='Skip already evaluated products')
    parser.add_argument('--start', type=int, default=0, help='Start index')
    parser.add_argument('--worker', type=int, default=0, help='Worker ID')

    args = parser.parse_args()

    evaluator = SmartEvaluator()
    evaluator.run(
        type_id=args.type,
        product_name=args.product,
        limit=args.limit,
        skip_evaluated=args.resume,
        start_index=args.start,
        worker_id=args.worker
    )


if __name__ == "__main__":
    main()
