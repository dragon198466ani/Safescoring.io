#!/usr/bin/env python3
"""
SAFESCORING.IO - Norm Applicability Generator
Generates the norm_applicability table (TRUE/FALSE for each norm/type combination).

WORKFLOW: Applicability (TRUE/FALSE) -> Smart Evaluator (YES/NO/N/A/TBD) -> Score Calculator

This is the FIRST step in the evaluation pipeline.
"""

import requests
import time

# Import from common modules
from .config import SUPABASE_URL, get_supabase_headers
from .api_provider import AIProvider, parse_applicability_response
from .ai_strategy import get_applicability_strategy, AIModel
from .supabase_pagination import fetch_all


# Import applicability rules
from .applicability_rules import (
    HARDWARE_ONLY_CATEGORIES,
    DEFI_ONLY_CATEGORIES,
    WALLET_ONLY_CATEGORIES,
    HARDWARE_NORM_CODES,
    SOFTWARE_NORM_CODES,
    WALLET_NORM_CODES,
    HARDWARE_NORM_PREFIXES,
    DEFI_NORM_PREFIXES,
    WALLET_NORM_PREFIXES,
)

# Norm category mapping (based on SAFE_SCORING_V7_FINAL.xlsx)
# Maps individual norm codes to their category for rule-based pre-filtering
NORM_CATEGORIES = {
    # S - Security
    'S01': 'Crypto', 'S02': 'Crypto', 'S03': 'Crypto', 'S04': 'Crypto', 'S05': 'Crypto',
    'S16': 'BIP', 'S17': 'BIP', 'S18': 'BIP', 'S19': 'BIP', 'S20': 'BIP',
    'S50': 'SE', 'S51': 'SE', 'S52': 'SE', 'S53': 'SE', 'S54': 'SE',
    'S73': 'Firmware', 'S74': 'Firmware', 'S75': 'Firmware', 'S76': 'Firmware', 'S77': 'Firmware',
    'S80': 'Auth', 'S81': 'Auth', 'S82': 'Auth', 'S83': 'Auth', 'S84': 'Auth', 'S85': 'Auth',
    'S116': 'TEE', 'S117': 'TEE', 'S118': 'TEE', 'S119': 'TEE', 'S120': 'TEE',
    'S161': 'SC Audit', 'S162': 'SC Audit', 'S163': 'SC Audit', 'S164': 'SC Audit', 'S165': 'SC Audit',
    'S176': 'Biometrics', 'S177': 'Biometrics', 'S178': 'Biometrics', 'S179': 'Biometrics',
    'S191': 'Boot', 'S192': 'Boot', 'S193': 'Boot',
    'S194': 'Anti-Tamper', 'S195': 'Anti-Tamper', 'S196': 'Anti-Tamper', 'S197': 'Anti-Tamper',
    'S220': 'Blockchain', 'S221': 'Blockchain', 'S222': 'Blockchain', 'S223': 'Blockchain', 'S224': 'Blockchain',
    # Secure Element certs: S262-S272
    **{f'S{i}': 'Secure Element' for i in range(262, 273)},
    # Firmware extended: S70-S72
    'S70': 'Firmware', 'S71': 'Firmware', 'S72': 'Firmware',
    # F - Fidelity
    **{f'F{i:02d}': 'Environmental' for i in range(1, 16)},    # F01-F15: Environmental resistance
    **{f'F{i}': 'Mechanical' for i in range(16, 21)},           # F16-F20: Mechanical durability
    **{f'F{i}': 'Fire' for i in range(28, 33)},                 # F28-F32: Fire resistance
    **{f'F{i}': 'Chemical' for i in range(36, 41)},             # F36-F40: Chemical resistance
    **{f'F{i}': 'EM' for i in range(42, 47)},                   # F42-F46: Electromagnetic
    **{f'F{i}': 'Materials' for i in range(57, 62)},            # F57-F61: Material quality
    **{f'F{i}': 'Transport' for i in range(97, 102)},           # F97-F101: Transport durability
    **{f'F{i}': 'MIL' for i in range(112, 116)},                # F112-F115: Military standards
    **{f'F{i}': 'Space' for i in range(116, 119)},              # F116-F118: Space-grade
    'F126': 'Materials',                                          # Inconel/alloy
    # E - Efficiency
    **{f'E{i}': 'Ergonomics' for i in range(43, 48)},           # E43-E47: Physical ergonomics
    **{f'E{i}': 'Battery' for i in range(54, 59)},              # E54-E58: Battery life
    **{f'E{i}': 'DeFi' for i in range(100, 105)},               # E100-E104: DeFi features
    **{f'E{i}': 'L2' for i in range(131, 136)},                 # E131-E135: Layer 2
    **{f'E{i}': 'Cross-chain' for i in range(142, 147)},        # E142-E146: Cross-chain
    **{f'E{i}': 'Gas' for i in range(172, 177)},                # E172-E176: Gas optimization
}

APPLICABILITY_PROMPT = """You are a crypto security and blockchain expert.

TASK: Determine if each norm is APPLICABLE to this product type.

PRODUCT TYPE: {type_name} ({type_code})
Category: {category}
Description: {description}

TYPE CHARACTERISTICS:
- Is a physical device (hardware): {is_hardware}
- Is a wallet: {is_wallet}
- Is a DeFi protocol: {is_defi}
- Is a protocol (smart contracts): {is_protocol}

STRICT APPLICABILITY RULES:

1. HARDWARE NORMS (PIN, wipe, firmware, secure element, battery, physical resistance):
   → APPLICABLE only if is_hardware = True
   → NOT APPLICABLE for DeFi protocols, software wallets, CEX, bridges

2. DEFI NORMS (gas optimization, smart contract audit, cross-chain, L2):
   → APPLICABLE only if is_defi = True
   → NOT APPLICABLE for hardware wallets, physical backups

3. WALLET NORMS (BIP-32/39/44, seed phrase, key management, recovery):
   → APPLICABLE only if is_wallet = True
   → NOT APPLICABLE for DeFi protocols (they don't have seed phrases)

4. PHYSICAL BACKUP NORMS (fire resistance, chemical resistance, material durability):
   → APPLICABLE only for physical backups (metal plates)

NON-APPLICABILITY EXAMPLES:
- "PIN 4-8 digits" for a Bridge = NO (a smart contract has no PIN)
- "Wipe after failures" for a DEX = NO (no device to wipe)
- "Smart contract audit" for a Ledger = NO (no smart contract)
- "IP67 waterproof" for Uniswap = NO (no physical component)

NORMS TO EVALUATE:
{norms_text}

RESPONSE FORMAT (one line per norm):
CODE: YES or NO

IMPORTANT: When in doubt, prefer NO if the norm makes no technical sense.

Evaluate each norm:"""


class ApplicabilityGenerator:
    """Generates the norm_applicability table with AI."""

    def __init__(self):
        self.headers = get_supabase_headers()
        self.product_types = {}
        self.norms = []
        self.norms_by_code = {}
        self.current_applicability = {}
        self.ai_provider = AIProvider()

    def load_data(self):
        """Loads types and norms from Supabase."""
        print("\n[LOAD] Loading Supabase data...", flush=True)

        # Load types
        r = requests.get(
            f'{SUPABASE_URL}/rest/v1/product_types?select=*',
            headers=self.headers
        )
        types_list = r.json() if r.status_code == 200 else []
        self.product_types = {t['id']: t for t in types_list}
        print(f"   {len(self.product_types)} product types", flush=True)

        # Load norms (paginated - loads ALL 2159+ norms beyond 1000 limit)
        self.norms = fetch_all('norms', select='id,code,title,pillar,description', order='id')
        self.norms_by_code = {n['code']: n for n in self.norms}
        print(f"   {len(self.norms)} norms", flush=True)

        # Load current applicability
        print("   Loading current applicability...", flush=True)
        offset = 0
        while True:
            r = requests.get(
                f'{SUPABASE_URL}/rest/v1/norm_applicability?select=norm_id,type_id,is_applicable&limit=1000&offset={offset}',
                headers=self.headers
            )
            data = r.json() if r.status_code == 200 else []
            if not data:
                break
            for row in data:
                key = (row['type_id'], row['norm_id'])
                self.current_applicability[key] = row['is_applicable']
            offset += 1000
        print(f"   {len(self.current_applicability)} existing rules", flush=True)

    def get_type_context(self, type_info):
        """Builds the complete context of a type using Supabase columns."""
        type_code = type_info.get('code', '')

        # Get characteristics directly from Supabase product_types table
        # These columns should be added via migration_add_type_characteristics.sql
        is_hardware = type_info.get('is_hardware', False)
        is_wallet = type_info.get('is_wallet', False)
        is_defi = type_info.get('is_defi', False)
        is_protocol = type_info.get('is_protocol', False)

        # Fallback: infer from code if columns not yet in DB
        if not any([is_hardware, is_wallet, is_defi, is_protocol]):
            is_hardware = type_code in ['HW Cold', 'HW Hot']
            is_wallet = type_code in ['HW Cold', 'HW Hot', 'SW Browser', 'SW Mobile', 'SW Desktop', 'MPC Wallet', 'MultiSig', 'Smart Wallet']
            is_defi = type_code in ['DEX', 'DEX Agg', 'Lending', 'Yield', 'Liq Staking', 'Derivatives', 'Bridges', 'AMM', 'Perps', 'Options', 'DeFi Tools']
            is_protocol = type_code in ['DEX', 'DEX Agg', 'Lending', 'Yield', 'Liq Staking', 'Derivatives', 'Bridges', 'AMM', 'Perps', 'Options', 'Stablecoin', 'Oracle', 'L2', 'Protocol']

        return {
            'name': type_info.get('name', 'Unknown'),
            'code': type_code,
            'category': type_info.get('category', 'N/A'),
            'description': type_info.get('description') or type_info.get('definition') or 'No description',
            'examples': type_info.get('examples', 'No examples'),
            'definition': type_info.get('definition', ''),
            'includes': type_info.get('includes', []),
            'excludes': type_info.get('excludes', []),
            'risk_factors': type_info.get('risk_factors', []),
            # Business characteristics from Supabase
            'is_hardware': is_hardware,
            'is_wallet': is_wallet,
            'is_defi': is_defi,
            'is_protocol': is_protocol,
        }

    def evaluate_batch(self, type_info, norms_batch):
        """
        Evaluates applicability of a batch of norms for a type.
        Uses STRATEGIC MODEL SELECTION based on type complexity.
        Now includes business rules pre-filtering.
        """
        ctx = self.get_type_context(type_info)
        type_code = type_info.get('code', 'DEFAULT')

        # Get strategy for this type
        strategy = get_applicability_strategy(type_code)
        model_name = strategy['model'].value

        # PRE-FILTER: Apply business rules to skip obvious non-applicable norms
        # Three layers: 1) exact code sets, 2) category mapping, 3) prefix matching
        pre_filtered_results = {}
        norms_to_evaluate = []

        for norm in norms_batch:
            norm_code = norm['code']
            filtered = False

            # Layer 1: Exact code set matching (fastest, most reliable)
            if norm_code in HARDWARE_NORM_CODES and not ctx['is_hardware']:
                pre_filtered_results[norm['id']] = False
                filtered = True
            elif norm_code in SOFTWARE_NORM_CODES and not ctx['is_defi'] and not ctx['is_protocol']:
                pre_filtered_results[norm['id']] = False
                filtered = True
            elif norm_code in WALLET_NORM_CODES and not ctx['is_wallet']:
                pre_filtered_results[norm['id']] = False
                filtered = True

            # Layer 2: Category mapping (NORM_CATEGORIES dict)
            if not filtered:
                norm_category = NORM_CATEGORIES.get(norm_code)
                if norm_category:
                    if norm_category in HARDWARE_ONLY_CATEGORIES and not ctx['is_hardware']:
                        pre_filtered_results[norm['id']] = False
                        filtered = True
                    elif norm_category in DEFI_ONLY_CATEGORIES and not ctx['is_defi']:
                        pre_filtered_results[norm['id']] = False
                        filtered = True
                    elif norm_category in WALLET_ONLY_CATEGORIES and not ctx['is_wallet']:
                        pre_filtered_results[norm['id']] = False
                        filtered = True

            # Layer 3: Prefix-based matching (norm code families)
            if not filtered:
                code_upper = norm_code.upper()
                for prefix in HARDWARE_NORM_PREFIXES:
                    if code_upper.startswith(prefix) and not ctx['is_hardware']:
                        pre_filtered_results[norm['id']] = False
                        filtered = True
                        break
                if not filtered:
                    for prefix in DEFI_NORM_PREFIXES:
                        if code_upper.startswith(prefix) and not ctx['is_defi'] and not ctx['is_protocol']:
                            pre_filtered_results[norm['id']] = False
                            filtered = True
                            break
                if not filtered:
                    for prefix in WALLET_NORM_PREFIXES:
                        if code_upper.startswith(prefix) and not ctx['is_wallet']:
                            pre_filtered_results[norm['id']] = False
                            filtered = True
                            break

            if not filtered:
                norms_to_evaluate.append(norm)

        if pre_filtered_results:
            print(f"      Pre-filtered: {len(pre_filtered_results)} norms (rules-based)", flush=True)

        # Build prompt for remaining norms
        if not norms_to_evaluate:
            return pre_filtered_results

        norms_text = "\n".join([
            f"- {n['code']}: {n['title']}" + (f" ({n.get('description', '')[:60]})" if n.get('description') else "")
            for n in norms_to_evaluate
        ])

        prompt = APPLICABILITY_PROMPT.format(
            type_name=ctx['name'],
            type_code=ctx['code'],
            category=ctx['category'],
            description=ctx['description'],
            is_hardware=ctx['is_hardware'],
            is_wallet=ctx['is_wallet'],
            is_defi=ctx['is_defi'],
            is_protocol=ctx['is_protocol'],
            norms_text=norms_text
        )

        # Use strategic model selection
        result = self.ai_provider.call_for_applicability(type_code, prompt)

        if not result:
            # Return only pre-filtered results if AI fails
            return pre_filtered_results

        # Parse AI response and merge with pre-filtered results
        ai_results = parse_applicability_response(result, self.norms_by_code)

        # Merge: pre-filtered results take precedence (business rules)
        merged_results = {**ai_results, **pre_filtered_results}
        return merged_results

    def save_applicability(self, type_id, applicability_dict):
        """Saves applicability rules to Supabase."""
        records = []
        for norm_id, is_applicable in applicability_dict.items():
            records.append({
                'type_id': type_id,
                'norm_id': norm_id,
                'is_applicable': is_applicable
            })

        if not records:
            return 0

        # Upsert
        upsert_headers = get_supabase_headers('resolution=merge-duplicates')

        r = requests.post(
            f"{SUPABASE_URL}/rest/v1/norm_applicability",
            headers=upsert_headers,
            json=records
        )

        return len(records) if r.status_code in [200, 201] else 0

    def run(self, type_id=None, pillar=None, batch_size=30):
        """Run applicability generation."""
        print("""
================================================================
     NORM APPLICABILITY GENERATOR
     Step 1: Determine which norms apply to which product types
================================================================
""", flush=True)

        self.load_data()

        # Filter types
        if type_id:
            types_to_process = {type_id: self.product_types[type_id]}
        else:
            types_to_process = self.product_types

        # Filter norms
        if pillar:
            norms_to_process = [n for n in self.norms if n['pillar'] == pillar]
        else:
            norms_to_process = self.norms

        print(f"\n{len(types_to_process)} types x {len(norms_to_process)} norms", flush=True)

        total_saved = 0

        for i, (tid, type_info) in enumerate(types_to_process.items()):
            print(f"\n[{i+1}/{len(types_to_process)}] {type_info['name']}", flush=True)

            # Process by batches
            all_applicability = {}
            num_batches = (len(norms_to_process) + batch_size - 1) // batch_size

            for batch_idx in range(num_batches):
                start = batch_idx * batch_size
                end = min(start + batch_size, len(norms_to_process))
                batch = norms_to_process[start:end]

                print(f"   Batch {batch_idx+1}/{num_batches} ({len(batch)} norms)...", flush=True)

                batch_result = self.evaluate_batch(type_info, batch)
                all_applicability.update(batch_result)

                time.sleep(0.5)

            # Save
            saved = self.save_applicability(tid, all_applicability)
            total_saved += saved

            applicable = sum(1 for v in all_applicability.values() if v)
            not_applicable = sum(1 for v in all_applicability.values() if not v)
            print(f"   {saved} saved ({applicable} applicable, {not_applicable} N/A)", flush=True)

        print(f"\n{'='*60}", flush=True)
        print(f"COMPLETE: {total_saved} applicability rules saved", flush=True)


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--type-id', type=int, help='Process only this type ID')
    parser.add_argument('--pillar', choices=['S', 'A', 'F', 'E'], help='Process only this pillar')
    args = parser.parse_args()

    generator = ApplicabilityGenerator()
    generator.run(type_id=args.type_id, pillar=args.pillar)
