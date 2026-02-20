#!/usr/bin/env python3
"""
Met a jour les aliases de types dans norm_applicability_complete.py
pour que TOUS les types de la base soient correctement mappes
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import requests
from config_helper import SUPABASE_URL, get_supabase_headers
from src.core.norm_applicability_complete import ALL_PRODUCT_TYPES, TYPE_ALIASES

def main():
    headers = get_supabase_headers()

    # Get all types from database
    resp = requests.get(
        f'{SUPABASE_URL}/rest/v1/product_types?select=id,code,name&order=code',
        headers=headers
    )
    db_types = resp.json() if resp.status_code == 200 else []

    print("="*70)
    print("  ANALYSE DES TYPES - BASE vs MAPPING")
    print("="*70)

    print(f"\nTypes canoniques definis: {len(ALL_PRODUCT_TYPES)}")
    print(f"Aliases definis: {len(TYPE_ALIASES)}")
    print(f"Types dans la base: {len(db_types)}")

    # Check each DB type
    missing = []
    mapped = []
    canonical = []

    print("\n" + "-"*70)
    print(f"  {'Code DB':<20} {'Status':<12} {'Mappe vers':<20}")
    print("-"*70)

    for t in db_types:
        code = t['code']
        code_upper = code.upper().replace(' ', '_')

        if code in ALL_PRODUCT_TYPES or code_upper in ALL_PRODUCT_TYPES:
            canonical.append(code)
            print(f"  {code:<20} {'CANONICAL':<12} {code_upper:<20}")
        elif code in TYPE_ALIASES:
            mapped.append(code)
            print(f"  {code:<20} {'ALIAS':<12} {TYPE_ALIASES[code]:<20}")
        elif code_upper in TYPE_ALIASES:
            mapped.append(code)
            print(f"  {code:<20} {'ALIAS':<12} {TYPE_ALIASES[code_upper]:<20}")
        elif code.upper().replace(' ', '_') in TYPE_ALIASES:
            key = code.upper().replace(' ', '_')
            mapped.append(code)
            print(f"  {code:<20} {'ALIAS':<12} {TYPE_ALIASES[key]:<20}")
        else:
            missing.append(t)
            print(f"  {code:<20} {'MANQUANT':<12} ???")

    print("-"*70)
    print(f"\n  Canonical: {len(canonical)}, Mapped: {len(mapped)}, Missing: {len(missing)}")

    if missing:
        print("\n" + "="*70)
        print("  TYPES MANQUANTS - A AJOUTER DANS TYPE_ALIASES")
        print("="*70)

        # Suggest mappings
        suggestions = {
            'Card': 'CARD',
            'Lending': 'LENDING',
            'HW Cold': 'HW_WALLET',
            'SW Desktop': 'SW_WALLET',
            'SW Mobile': 'SW_WALLET',
            'SW Browser': 'SW_WALLET',
            'CEX': 'CEX',
            'DEX': 'DEX',
            'DEX Agg': 'DEX_AGG',
            'Bridge': 'BRIDGE',
            'Staking': 'STAKING',
            'Liquid Staking': 'LIQUID_STAKING',
            'Yield': 'YIELD',
            'NFT Market': 'NFT_MARKET',
            'Launchpad': 'LAUNCHPAD',
            'Payment': 'PAYMENT',
            'Bank': 'BANK',
            'Custody': 'CUSTODY',
            'Multisig': 'MULTISIG',
            'DAO': 'DAO',
            'Oracle': 'ORACLE',
            'Insurance': 'INSURANCE',
            'Privacy': 'PRIVACY',
            'Identity': 'IDENTITY',
            'Messaging': 'MESSAGING',
            'Bkp Physical': 'BKP_PHYSICAL',
            'Bkp Digital': 'BKP_DIGITAL',
            'Inheritance': 'INHERITANCE',
            'Perp DEX': 'PERP_DEX',
            'Synthetics': 'SYNTHETICS',
            'RWA': 'RWA',
            'Stablecoin': 'STABLECOIN',
            'AI Agent': 'AI_AGENT',
            'Infrastructure': 'INFRASTRUCTURE',
            'Mining': 'MINING',
            'Index': 'INDEX',
            'Locker': 'LOCKER',
            'Vesting': 'VESTING',
            'Treasury': 'TREASURY',
            'Settlement': 'SETTLEMENT',
            'Prime': 'PRIME',
            'OTC': 'OTC',
            'P2P': 'P2P',
            'Swap': 'SWAP',
            'Cross Agg': 'CROSS_AGG',
            'L2': 'L2',
            'DEFI': 'DEFI',
            'MEV': 'MEV',
            'Intent': 'INTENT',
            'Prediction': 'PREDICTION',
            'SocialFi': 'SOCIALFI',
            'Quest': 'QUEST',
            'Streaming': 'STREAMING',
            'Attestation': 'ATTESTATION',
            'DVPN': 'DVPN',
            'Seed Splitter': 'SEED_SPLITTER',
        }

        print("\nCode Python a ajouter dans TYPE_ALIASES:")
        print("```python")
        for t in missing:
            code = t['code']
            name = t['name']

            # Try to find suggestion
            suggested = None
            for key, val in suggestions.items():
                if key.lower() == code.lower() or key.lower() in code.lower():
                    suggested = val
                    break

            if not suggested:
                # Try to derive from code
                suggested = code.upper().replace(' ', '_')
                if suggested not in ALL_PRODUCT_TYPES:
                    suggested = '???'

            # Generate both formats
            print(f"    '{code}': '{suggested}',")
            code_underscore = code.replace(' ', '_').upper()
            if code_underscore != code:
                print(f"    '{code_underscore}': '{suggested}',")
        print("```")

    return missing


if __name__ == '__main__':
    missing = main()
    sys.exit(1 if missing else 0)
