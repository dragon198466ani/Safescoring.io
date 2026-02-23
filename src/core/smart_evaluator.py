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
from .config import (
    SUPABASE_URL, get_supabase_headers,
    EVAL_BATCH_SIZE, EVAL_BATCH_DELAY, EVAL_PASS2_MAX_TOKENS, EVAL_PASS2_TEMPERATURE,
)
from .api_provider import AIProvider, parse_evaluation_response
from .scraper import WebScraper
from .ai_strategy import get_norm_strategy, TaskComplexity, AIModel
from .supabase_pagination import fetch_all


# =============================================================================
# PROMPTS SPECIALISES PAR PILIER - Optimises pour la securite cryptographique
# Systeme hybride: Flash (rapide) + Pro (revision critique)
# =============================================================================

SYSTEM_PROMPT_BASE = """You are an expert in crypto security and blockchain product evaluation.

RATING SYSTEM:
- YES = The product implements this norm. Evidence includes: documentation, audit reports, source code, technical specs, regulatory filings, credible third-party reviews, or standard industry practices for this product category
- YESp = Inherent to the product's technology/protocol (e.g. EVM uses secp256k1, all HTTPS sites use TLS, all regulated exchanges must KYC)
- NO = The product clearly does NOT implement this norm, OR the norm is technically relevant but there is zero indication of implementation
- TBD = Cannot determine with available information (use sparingly)

EVALUATION GUIDELINES:
1. FAIR & BALANCED: Evaluate based on what a knowledgeable professional would reasonably conclude
2. INDUSTRY STANDARDS COUNT: If a product type universally implements something (e.g. all banks use encryption, all exchanges have order books), credit it as YES or YESp
3. TECHNICAL INFERENCE ALLOWED: If a product uses technology X which necessarily implies feature Y, mark Y as YESp (e.g. a Lightning Network wallet necessarily supports payment channels)
4. MARKETING vs EVIDENCE: Vague marketing ("bank-grade security") alone = NO, but specific claims ("AES-256 encryption", "SOC 2 certified") = YES unless contradicted
5. REGULATORY COMPLIANCE: Licensed/regulated products can be credited for norms required by their license (e.g. a licensed EU exchange necessarily has AML/KYC)
6. COMMON SENSE: Don't penalize a product for not documenting obvious things (e.g. a website using HTTPS doesn't need to document TLS)

SCORE: (YES + YESp) / (YES + YESp + NO) x 100
"""

# PILIER S - SECURITY (Cryptographie) - PROMPT EXPERT
SYSTEM_PROMPT_S = SYSTEM_PROMPT_BASE + """
PILLAR S - SECURITY (Cryptographic Security) - EXPERT MODE

CRYPTO SECURITY EVALUATION:
1. ALGORITHM VERIFICATION:
   - YES = Documented in specs, audit, source code, or credible technical review
   - YESp = Required by protocol/blockchain (secp256k1 for Ethereum, Ed25519 for Solana, SHA-256 for Bitcoin)
   - NO = No indication whatsoever

2. IMPLICIT STANDARDS (YESp):
   - EVM products: secp256k1, ECDSA, Keccak-256, EIP-712, EIP-1559, TLS, HTTPS
   - All web products: TLS 1.2+, HTTPS, certificate validation
   - Bitcoin products: SHA-256, secp256k1, ECDSA
   - Any wallet with seed phrase: BIP-39/44/32

3. HARDWARE SECURITY:
   - Named chip/cert (CC EAL5+, FIPS 140-2) = YES
   - "Secure Element" claim from reputable manufacturer = YES
   - Vague "bank-grade security" with no details = NO

4. KEY MANAGEMENT:
   - Wallets with seed phrases = YESp for BIP-39/44/32
   - Multisig = YES if documented (threshold details nice but not required)
   - MPC = YES if claimed by reputable product with technical context

NOTE: "Secure" alone = NO, but specific security claims from credible products should be credited.
"""

# PILIER A - ADVERSITY (Anti-coercition) - PROMPT EXPERT
SYSTEM_PROMPT_A = SYSTEM_PROMPT_BASE + """
PILLAR A - ADVERSITY (Attack Resistance) - EXPERT MODE

ATTACK RESISTANCE EVALUATION:
1. ANTI-COERCION:
   - Duress PIN / Hidden wallets / Auto-wipe = YES if documented as a feature
   - These are specialized features — NO if not mentioned is fair (most products don't have them)

2. PHYSICAL SECURITY:
   - Tamper-evident/resistant = YES if described or certified
   - IP rating (water/dust) = YES if specified
   - Hardware wallets from reputable brands generally have tamper features = check their specs

3. ATTACK RESISTANCE:
   - Side-channel protection = YES if audited or using certified secure elements
   - Brute-force protection = YES if lockout/rate-limiting mentioned
   - DDoS protection = YESp for cloud-hosted services using major providers (AWS, Cloudflare)

4. PRIVACY:
   - Built-in Tor/VPN = YES
   - Mixing/CoinJoin = YES if supported
   - ZK proofs = YES if the protocol uses them (e.g. Zcash, Tornado Cash)
   - No-KYC / self-custody = relevant privacy features worth crediting

NOTE: These norms cover advanced features. NO is acceptable when a product genuinely lacks them — don't force YES.
"""

# PILIER F - FIDELITY (Fiabilite) - PROMPT STANDARD
SYSTEM_PROMPT_F = SYSTEM_PROMPT_BASE + """
PILLAR F - FIDELITY (Reliability & Quality)

RELIABILITY EVALUATION:
1. TRACK RECORD:
   - Years active, uptime history, incident response = YES if documented or well-known
   - Products operating since 2+ years without major hacks = credit their track record
   - Known security incidents that were handled well still deserve partial credit

2. AUDITS & COMPLIANCE:
   - Named audit firm + public report = YES
   - SOC 2, ISO 27001, regulatory licenses = YES
   - Bug bounty program = YES
   - Open-source code on GitHub = YES for transparency norms

3. SOFTWARE QUALITY:
   - Regular updates (check GitHub/changelog) = YES
   - Good documentation = YES
   - Open source = YES for relevant norms

4. DURABILITY & SUPPORT:
   - Active customer support (chat, email, docs) = YES
   - Warranty for hardware = YES if specified
   - Company backing / funding = relevant for longevity norms
"""

# PILIER E - EFFICIENCY (Usabilite) - PROMPT STANDARD
SYSTEM_PROMPT_E = SYSTEM_PROMPT_BASE + """
PILLAR E - EFFICIENCY (Usability & Compatibility)

USABILITY EVALUATION:
1. CHAIN SUPPORT:
   - Check "supported networks/chains" page = YES for each listed
   - YESp for inherent chains (EVM wallet = ETH + all EVM chains, Bitcoin wallet = BTC)
   - EVM products: YESp for ETH, ERC-20, ERC-721, common EIP standards

2. PLATFORM SUPPORT:
   - iOS/Android apps = YES if available on app stores
   - Desktop app = YES if downloadable
   - Browser extension = YES if on Chrome/Firefox store
   - Web interface = YES for web-based products

3. FEATURES:
   - NFT support, DeFi integration, Staking, Swap = YES if offered
   - WalletConnect, dApp browser = YES if supported
   - Multi-currency = YES for wallets supporting multiple assets

4. ACCESSIBILITY & UX:
   - Multiple languages = YES if offered
   - Good onboarding / tutorials = YES
   - Customer support channels = YES
   - Mobile-friendly = YESp for mobile apps
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

        # Products (paginated - no 1000 limit)
        self.products = fetch_all('products', select='*', order='id')
        print(f"   {len(self.products)} products")

        # Product types
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/product_types?select=id,code,name_fr,name,category,description",
            headers=self.headers
        )
        types = r.json() if r.status_code == 200 else []
        self.product_types = {t['id']: t for t in types}
        print(f"   {len(self.product_types)} product types")

        # Norms (paginated - loads ALL 2159+ norms with official summaries)
        self.norms = fetch_all(
            'norms',
            select='id,code,pillar,title,description,is_essential,consumer',
            order='pillar.asc,code.asc'
        )
        self.norms_by_id = {n['id']: n for n in self.norms}
        print(f"   {len(self.norms)} norms")

        # Load official doc summaries (separate query to avoid timeout on large TEXT fields)
        print("   Loading official norm summaries...")
        summary_offset = 0
        summaries_loaded = 0
        while True:
            r = requests.get(
                f"{SUPABASE_URL}/rest/v1/norms?select=id,official_doc_summary&official_doc_summary=not.is.null&limit=100&offset={summary_offset}",
                headers=self.headers,
                timeout=60
            )
            if r.status_code != 200 or not r.json():
                break
            for s in r.json():
                if s['id'] in self.norms_by_id and s.get('official_doc_summary'):
                    self.norms_by_id[s['id']]['official_doc_summary'] = s['official_doc_summary']
                    summaries_loaded += 1
            summary_offset += 100
            if len(r.json()) < 100:
                break
        print(f"   {summaries_loaded} norms with official documentation")

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

    def evaluate_batch_with_ai(self, product_info, norms_batch, pillar, website_content=None):
        """
        Evaluates a batch of APPLICABLE norms for a product.
        Sends the ENTIRE batch in a SINGLE AI call (no model-based splitting).

        In CLAUDE_CODE_ONLY mode, all calls go to the same endpoint,
        so splitting by model strategy wastes tokens and time.
        """
        # Build norms text for the full batch, including official doc summaries when available
        norms_lines = []
        for n in norms_batch:
            line = f"- {n['code']}: {n['title']}"
            if n.get('description'):
                line += f" - {n['description']}"
            # Include official documentation summary for better evaluation accuracy
            official_summary = self.norms_by_id.get(n['id'], {}).get('official_doc_summary', '')
            if official_summary:
                # Truncate to keep prompt manageable (max 200 chars per norm)
                summary_short = official_summary[:200].strip()
                if len(official_summary) > 200:
                    summary_short += "..."
                line += f"\n  [OFFICIAL]: {summary_short}"
            norms_lines.append(line)
        norms_text = "\n".join(norms_lines)

        # Determine dominant complexity for token/context sizing
        complexities = [get_norm_strategy(n['code'])['complexity'] for n in norms_batch]
        has_critical = TaskComplexity.CRITICAL in complexities
        has_complex = TaskComplexity.COMPLEX in complexities
        max_chars = 5000 if (has_critical or has_complex) else 3000

        complexity_label = 'CRITICAL' if has_critical else 'COMPLEX' if has_complex else 'STANDARD'
        print(f"      {len(norms_batch)} norms, 1 call (sonnet, {complexity_label})")

        website_section = ""
        if website_content:
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

EVALUATION RULES:
1. These norms are PRE-FILTERED as applicable to this product type(s)
2. You MUST answer YES, YESp, NO or TBD for EACH norm
3. N/A is FORBIDDEN (non-applicable norms already excluded)
4. Be FAIR: credit what can be reasonably inferred from the product's technology, category, and documentation
5. Use YESp for features inherent to the product's protocol/technology stack
6. Use TBD sparingly — only when truly impossible to determine
7. Provide a BRIEF justification for each answer

IMPORTANT NUANCES:
- Industry-standard practices for this product category count (e.g. all regulated exchanges have KYC)
- Specific technical claims from reputable products should be credited as YES
- Vague marketing ("bank-grade", "military-grade") without ANY specifics = NO
- Don't confuse "not documented" with "not implemented" — use context and industry knowledge

FORMAT (one line per norm):
CODE: RESULT | Brief reason

Evaluate:"""

        # Single AI call for the entire batch
        # Pass 1 always uses sonnet (fast) — opus is reserved for Pass 2 expert review
        result = self.ai_provider.call(prompt)

        if result:
            return parse_evaluation_response(result)
        return {}

    def review_critical_evaluations(self, product_info, evaluations, applicable_norms, website_content=None):
        """
        Expert review (Pass 2) using opus model.
        Reviews:
        - TBD results → must be resolved to YES/YESp or NO
        - NO results on essential norms → check for false negatives
        - NO results on CRITICAL complexity norms → second opinion
        """
        norm_by_code = {n['code']: n for n in applicable_norms}

        # Identify norms needing review
        norms_to_review = []
        for code, eval_data in evaluations.items():
            result = eval_data[0] if isinstance(eval_data, tuple) else eval_data
            norm = norm_by_code.get(code)
            if norm:
                strategy = get_norm_strategy(code)
                needs_review = (
                    result == 'TBD' or
                    (result == 'NO' and norm.get('is_essential')) or
                    (result == 'NO' and strategy['complexity'] == TaskComplexity.CRITICAL)
                )
                if needs_review:
                    norms_to_review.append(norm)

        if not norms_to_review:
            print("   [PASS 2] No norms need expert review")
            return evaluations

        # Count by reason
        tbd_count = sum(1 for n in norms_to_review if evaluations.get(n['code'], ('?',))[0] == 'TBD')
        no_essential = sum(1 for n in norms_to_review if evaluations.get(n['code'], ('?',))[0] == 'NO' and n.get('is_essential'))
        no_critical = len(norms_to_review) - tbd_count - no_essential
        print(f"   [PASS 2] Expert review: {len(norms_to_review)} norms ({tbd_count} TBD, {no_essential} NO-essential, {no_critical} NO-critical)")

        # Process in batches of 50 (same as Pass 1)
        total_corrections = 0
        for i in range(0, len(norms_to_review), EVAL_BATCH_SIZE):
            batch = norms_to_review[i:i+EVAL_BATCH_SIZE]

            norms_text = "\n".join([
                f"- {n['code']}: {n['title']} - {n.get('description', '')} | Current: {evaluations.get(n['code'], ('?', ''))[0]}"
                for n in batch
            ])

            website_section = f"\nDOCUMENTATION:\n{website_content[:5000]}\n" if website_content else ""

            review_prompt = f"""You are a SENIOR CRYPTO SECURITY AUDITOR performing expert review.

TASK: Review and validate/correct these security evaluations.
Some were marked NO but may be false negatives. Some are TBD and need resolution.

PRODUCT: {product_info['name']} ({product_info['type']})
WEBSITE: {product_info['url']}
{website_section}
EVALUATIONS TO REVIEW:
{norms_text}

INSTRUCTIONS:
1. TBD results MUST be resolved to YES, YESp, or NO
2. For NO results on essential/critical norms, verify this is correct:
   - Could this be inferred from the product's technology? (-> YESp)
   - Could this be an industry standard for this product category? (-> YES)
   - Is there truly zero indication? (-> confirm NO)
3. Be FAIR AND BALANCED — same standards as initial evaluation
4. Provide clear justification for any changes

FORMAT:
CODE: RESULT | Detailed justification

Review:"""

            # Single expert call for the batch
            result = self.ai_provider.call_expert(review_prompt)

            if not result:
                continue

            # Parse and merge corrections
            corrections = parse_evaluation_response(result)

            batch_corrections = 0
            for code, new_eval in corrections.items():
                if code in evaluations:
                    old_result = evaluations[code][0] if isinstance(evaluations[code], tuple) else evaluations[code]
                    new_result = new_eval[0] if isinstance(new_eval, tuple) else new_eval
                    if old_result != new_result:
                        batch_corrections += 1
                    evaluations[code] = new_eval

            total_corrections += batch_corrections
            if batch_corrections > 0:
                print(f"      Batch {i//EVAL_BATCH_SIZE + 1}: {batch_corrections} corrections")

            time.sleep(EVAL_BATCH_DELAY)

        print(f"   [PASS 2] Total corrections: {total_corrections}")
        return evaluations

    def evaluate_product(self, product, enable_expert_review=True):
        """
        Evaluates a product using norm_applicability and scraping (multi-type support).

        TWO-PASS SYSTEM (Claude Code):
        1. Pass 1: sonnet — fast evaluation, 1 call per batch of 50 norms
        2. Pass 2: opus — expert review of TBD + NO on essential/critical norms

        Args:
            enable_expert_review: If True, runs Pass 2 expert review
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

        # === PASS 1: Evaluation with Claude Code sonnet ===
        print("   [PASS 1] Evaluation (sonnet)...")

        for pillar in ['S', 'A', 'F', 'E']:
            pillar_norms = [n for n in applicable_norms if n['pillar'] == pillar]

            if not pillar_norms:
                continue

            pillar_results = {}

            for i in range(0, len(pillar_norms), EVAL_BATCH_SIZE):
                batch = pillar_norms[i:i+EVAL_BATCH_SIZE]
                pillar_label = f"{pillar}*" if pillar in CRITICAL_PILLARS else pillar
                print(f"   Pillar {pillar_label} batch {i//EVAL_BATCH_SIZE + 1} ({len(batch)} norms)...")

                batch_results = self.evaluate_batch_with_ai(product_info, batch, pillar, website_content)
                pillar_results.update(batch_results)
                time.sleep(EVAL_BATCH_DELAY)

            # Count results
            yes_count = sum(1 for v in pillar_results.values() if v[0] == 'YES')
            yesp_count = sum(1 for v in pillar_results.values() if v[0] == 'YESp')
            no_count = sum(1 for v in pillar_results.values() if v[0] == 'NO')
            tbd_count = sum(1 for v in pillar_results.values() if v[0] == 'TBD')
            score_base = yes_count + yesp_count + no_count
            pct = (yes_count + yesp_count) * 100 // score_base if score_base > 0 else 0

            print(f"   {pillar}: {yes_count} YES, {yesp_count} YESp, {no_count} NO, {tbd_count} TBD ({pct}%)")

            all_evaluations.update(pillar_results)

        # === PASS 2: Expert review with opus (always runs) ===
        if enable_expert_review:
            all_evaluations = self.review_critical_evaluations(
                product_info, all_evaluations, applicable_norms, website_content
            )

        return all_evaluations, applicable_norms

    def save_evaluations(self, product_id, evaluations, applicable_norms):
        """Saves evaluations to Supabase using upsert on (product_id, norm_id).

        Uses deterministic IDs (20M + product_id*10000 + norm_id) to avoid
        NULL id errors, and ?on_conflict=product_id,norm_id to handle the
        UNIQUE constraint on evaluations_product_norm_unique.
        """
        norm_id_by_code = {n['code']: n['id'] for n in self.norms}
        applicable_norm_ids = {n['id'] for n in applicable_norms}
        today = datetime.now().strftime('%Y-%m-%d')

        def make_id(pid, nid):
            """Deterministic ID: 20M + product_id * 10000 + norm_id"""
            return 20000000 + pid * 10000 + nid

        eval_records = []

        # Add AI evaluations for applicable norms
        for code, eval_data in evaluations.items():
            norm_id = norm_id_by_code.get(code)
            if norm_id:
                result, reason = eval_data if isinstance(eval_data, tuple) else (eval_data, '')
                eval_records.append({
                    'id': make_id(product_id, norm_id),
                    'product_id': product_id,
                    'norm_id': norm_id,
                    'result': result,
                    'why_this_result': reason[:500] if reason else None,
                    'evaluated_by': 'smart_ai',
                    'evaluation_date': today
                })

        # Add N/A for non-applicable norms
        for norm in self.norms:
            if norm['id'] not in applicable_norm_ids:
                eval_records.append({
                    'id': make_id(product_id, norm['id']),
                    'product_id': product_id,
                    'norm_id': norm['id'],
                    'result': 'N/A',
                    'why_this_result': 'Norm not applicable to this product type(s)',
                    'evaluated_by': 'norm_applicability',
                    'evaluation_date': today
                })

        if not eval_records:
            return 0

        # Deduplicate by (product_id, norm_id)
        unique_records = {}
        for rec in eval_records:
            key = (rec['product_id'], rec['norm_id'])
            unique_records[key] = rec
        eval_records = list(unique_records.values())

        # Upsert using on_conflict=product_id,norm_id to handle the UNIQUE constraint
        # This resolves 409 errors for products that already have evaluations with different IDs
        upsert_headers = get_supabase_headers('resolution=merge-duplicates,return=minimal')
        batch_size = 500
        inserted = 0
        max_retries = 3

        print(f"      Upserting {len(eval_records)} evaluations...")
        for i in range(0, len(eval_records), batch_size):
            batch = eval_records[i:i+batch_size]
            batch_num = i // batch_size + 1

            for attempt in range(max_retries):
                try:
                    r = requests.post(
                        f"{SUPABASE_URL}/rest/v1/evaluations?on_conflict=product_id,norm_id",
                        headers=upsert_headers,
                        json=batch,
                        timeout=30
                    )
                    if r.status_code in [200, 201]:
                        inserted += len(batch)
                        break
                    elif r.status_code == 409:
                        # Fallback: delete then insert for this batch
                        print(f"      [WARN] Batch {batch_num}: 409 conflict, deleting old rows first...")
                        for rec in batch:
                            requests.delete(
                                f"{SUPABASE_URL}/rest/v1/evaluations?product_id=eq.{rec['product_id']}&norm_id=eq.{rec['norm_id']}",
                                headers=get_supabase_headers('return=minimal'),
                                timeout=10
                            )
                        # Retry insert
                        r2 = requests.post(
                            f"{SUPABASE_URL}/rest/v1/evaluations",
                            headers=get_supabase_headers('return=minimal'),
                            json=batch,
                            timeout=30
                        )
                        if r2.status_code in [200, 201]:
                            inserted += len(batch)
                        else:
                            print(f"      [SAVE ERROR] Batch {batch_num} retry: HTTP {r2.status_code} - {r2.text[:200]}")
                        break
                    else:
                        print(f"      [SAVE ERROR] Batch {batch_num}: HTTP {r.status_code} - {r.text[:200]}")
                        break
                except requests.exceptions.ConnectionError as e:
                    wait = 5 * (attempt + 1)
                    print(f"      [NET ERROR] Batch {batch_num} attempt {attempt+1}/{max_retries}: {e}")
                    if attempt < max_retries - 1:
                        print(f"      Retrying in {wait}s...")
                        time.sleep(wait)
                    else:
                        print(f"      [SAVE FAILED] Batch {batch_num}: all retries exhausted")
                except Exception as e:
                    print(f"      [SAVE ERROR] Batch {batch_num}: {e}")
                    break

        return inserted

    def get_evaluated_product_ids(self):
        """Gets IDs of already evaluated products (paginated to handle >1000 rows)."""
        all_ids = set()
        offset = 0
        while True:
            r = requests.get(
                f"{SUPABASE_URL}/rest/v1/evaluations?select=product_id&limit=1000&offset={offset}",
                headers=self.headers,
                timeout=60
            )
            if r.status_code != 200:
                break
            evals = r.json()
            if not evals:
                break
            for e in evals:
                all_ids.add(e['product_id'])
            if len(evals) < 1000:
                break
            offset += 1000
        return all_ids

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
    import traceback

    parser = argparse.ArgumentParser(description='Smart Evaluator - AI crypto product evaluation')
    parser.add_argument('--product', type=str, help='Product name to evaluate')
    parser.add_argument('--type', type=int, help='Product type ID to evaluate')
    parser.add_argument('--limit', type=int, default=None, help='Number of products to evaluate')
    parser.add_argument('--resume', action='store_true', help='Skip already evaluated products')
    parser.add_argument('--start', type=int, default=0, help='Start index')
    parser.add_argument('--worker', type=int, default=0, help='Worker ID')

    args = parser.parse_args()

    try:
        evaluator = SmartEvaluator()
        evaluator.run(
            type_id=args.type,
            product_name=args.product,
            limit=args.limit,
            skip_evaluated=args.resume,
            start_index=args.start,
            worker_id=args.worker
        )
    except Exception as e:
        print(f"\n[FATAL ERROR] Worker {args.worker}: {e}")
        traceback.print_exc()
        raise


if __name__ == "__main__":
    main()
