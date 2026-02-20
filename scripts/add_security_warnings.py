#!/usr/bin/env python3
"""
Add security level and SAFE warnings to product compatibility.
"""

import sys
import json
from pathlib import Path
from datetime import datetime, timezone

sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))
from core.config import SUPABASE_URL, CONFIG
import requests

SERVICE_ROLE_KEY = CONFIG.get('SUPABASE_SERVICE_ROLE_KEY', '')
HEADERS = {
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': f'Bearer {SERVICE_ROLE_KEY}',
    'Content-Type': 'application/json',
}

# Security levels and warnings by type combination
SECURITY_RULES = {
    # Hardware + anything = HIGH security
    ('HW Cold', 'SW Browser'): {
        'security_level': 'HIGH',
        'safe_warning': 'Always verify transaction details on hardware wallet screen before signing.',
    },
    ('HW Cold', 'SW Mobile'): {
        'security_level': 'HIGH',
        'safe_warning': 'Enable Bluetooth only when needed. Verify addresses on device screen.',
    },
    ('HW Cold', 'DEX'): {
        'security_level': 'HIGH',
        'safe_warning': 'Check smart contract approval amounts. Use hardware wallet to sign all transactions.',
    },
    ('HW Cold', 'CEX'): {
        'security_level': 'MEDIUM',
        'safe_warning': 'CEX holds your keys after transfer. Only deposit what you plan to trade.',
    },
    ('HW Cold', 'Lending'): {
        'security_level': 'HIGH',
        'safe_warning': 'Review collateral ratios. Set alerts for liquidation thresholds.',
    },
    ('HW Cold', 'Bridges'): {
        'security_level': 'MEDIUM',
        'safe_warning': 'Bridges carry smart contract risk. Use established bridges with security audits.',
    },

    # Software wallets = MEDIUM security
    ('SW Browser', 'DEX'): {
        'security_level': 'MEDIUM',
        'safe_warning': 'Check URL carefully. Revoke unused token approvals regularly.',
    },
    ('SW Browser', 'Lending'): {
        'security_level': 'MEDIUM',
        'safe_warning': 'Monitor health factor. Browser extensions can be targeted by phishing.',
    },
    ('SW Browser', 'CEX'): {
        'security_level': 'MEDIUM',
        'safe_warning': 'Enable 2FA on exchange. Verify withdrawal addresses carefully.',
    },
    ('SW Mobile', 'DEX'): {
        'security_level': 'MEDIUM',
        'safe_warning': 'Use official apps only. Verify WalletConnect sessions.',
    },
    ('SW Mobile', 'Card'): {
        'security_level': 'MEDIUM',
        'safe_warning': 'Set spending limits. Monitor transactions in real-time.',
    },

    # CEX combinations = LOWER security (custodial)
    ('CEX', 'CEX'): {
        'security_level': 'LOW',
        'safe_warning': 'Both exchanges hold your keys. Not your keys, not your crypto.',
    },
    ('CEX', 'DEX'): {
        'security_level': 'MEDIUM',
        'safe_warning': 'Withdraw to self-custody wallet first for better security.',
    },
    ('CEX', 'Card'): {
        'security_level': 'LOW',
        'safe_warning': 'Card spending is custodial. Exchange controls your funds.',
    },
    ('CEX', 'Lending'): {
        'security_level': 'MEDIUM',
        'safe_warning': 'Use self-custody for DeFi lending instead of CEX lending when possible.',
    },

    # DeFi = MEDIUM to HIGH depending on audit status
    ('DEX', 'Lending'): {
        'security_level': 'MEDIUM',
        'safe_warning': 'Check both protocols have security audits. Review approval amounts.',
    },
    ('DEX', 'Bridges'): {
        'security_level': 'MEDIUM',
        'safe_warning': 'Bridge + DEX = compounded smart contract risk. Use audited protocols.',
    },
    ('DEX', 'Yield'): {
        'security_level': 'MEDIUM',
        'safe_warning': 'High yield = high risk. Check TVL and audit history.',
    },
    ('Lending', 'Lending'): {
        'security_level': 'MEDIUM',
        'safe_warning': 'Cascading liquidation risk. Monitor all positions closely.',
    },
    ('Lending', 'Liq Staking'): {
        'security_level': 'MEDIUM',
        'safe_warning': 'LST depeg risk can trigger liquidation. Set conservative ratios.',
    },

    # Liquid Staking
    ('Liq Staking', 'DEX'): {
        'security_level': 'MEDIUM',
        'safe_warning': 'LST can depeg from underlying. Check liquidity depth before large trades.',
    },
    ('Liq Staking', 'Yield'): {
        'security_level': 'MEDIUM',
        'safe_warning': 'Compounded smart contract risk. Diversify across protocols.',
    },

    # Bridges = MEDIUM risk
    ('Bridges', 'Bridges'): {
        'security_level': 'LOW',
        'safe_warning': 'Multiple bridge hops increase risk. Use direct routes when possible.',
    },
    ('Bridges', 'Lending'): {
        'security_level': 'MEDIUM',
        'safe_warning': 'Bridged assets may have different risk profile. Check collateral eligibility.',
    },

    # Backups
    ('Bkp Physical', 'HW Cold'): {
        'security_level': 'HIGH',
        'safe_warning': 'Store backup in separate location from hardware wallet. Test recovery.',
    },
    ('Bkp Physical', 'Bkp Physical'): {
        'security_level': 'HIGH',
        'safe_warning': 'Multiple backups = redundancy. Store in geographically separate locations.',
    },
    ('Bkp Digital', 'HW Cold'): {
        'security_level': 'MEDIUM',
        'safe_warning': 'Digital backups can be compromised. Use strong encryption and offline storage.',
    },

    # Cards
    ('Card', 'SW Mobile'): {
        'security_level': 'MEDIUM',
        'safe_warning': 'Card spending is often custodial. Keep large amounts in self-custody.',
    },

    # Crypto Banks / CeFi
    ('Crypto Bank', 'CEX'): {
        'security_level': 'LOW',
        'safe_warning': 'Both are custodial. Verify regulatory licenses and insurance coverage.',
    },
    ('CeFi Lending', 'CEX'): {
        'security_level': 'LOW',
        'safe_warning': 'Counterparty risk on both sides. Review financial health of providers.',
    },

    # Stablecoins
    ('Stablecoin', 'Lending'): {
        'security_level': 'MEDIUM',
        'safe_warning': 'Stablecoin depeg risk exists. Diversify across different stablecoin types.',
    },
    ('Stablecoin', 'DEX'): {
        'security_level': 'MEDIUM',
        'safe_warning': 'Check stablecoin reserves and audit reports.',
    },

    # Custody / MultiSig
    ('Custody', 'HW Cold'): {
        'security_level': 'HIGH',
        'safe_warning': 'Different security models. Understand key ownership clearly.',
    },
    ('MultiSig', 'HW Cold'): {
        'security_level': 'HIGH',
        'safe_warning': 'Excellent security combo. Ensure signers store keys safely.',
    },

    # Perps / Options
    ('Perps', 'SW Browser'): {
        'security_level': 'MEDIUM',
        'safe_warning': 'Leverage trading is high risk. Use stop losses and manage position sizes.',
    },
    ('Options', 'SW Browser'): {
        'security_level': 'MEDIUM',
        'safe_warning': 'Options can expire worthless. Understand Greeks and time decay.',
    },

    # MPC
    ('MPC Wallet', 'DEX'): {
        'security_level': 'HIGH',
        'safe_warning': 'MPC provides good security. Verify MPC provider reputation.',
    },
}

# Default warnings by security level
DEFAULT_WARNINGS = {
    'HIGH': 'Good security setup. Always verify transactions before signing.',
    'MEDIUM': 'Standard security. Enable 2FA where available. Review permissions regularly.',
    'LOW': 'Lower security setup. Consider self-custody for significant amounts.',
}


def get_security_for_types(type_a_code, type_b_code):
    """Get security level and warning for type combination"""
    # Check both directions
    key1 = (type_a_code, type_b_code)
    key2 = (type_b_code, type_a_code)

    if key1 in SECURITY_RULES:
        return SECURITY_RULES[key1]
    if key2 in SECURITY_RULES:
        return SECURITY_RULES[key2]

    # Determine default based on type characteristics
    hw_types = ['HW Cold', 'HW Wallet', 'Bkp Physical']
    custodial_types = ['CEX', 'Crypto Bank', 'CeFi Lending', 'Custody', 'Card']
    defi_types = ['DEX', 'Lending', 'Yield', 'Liq Staking', 'Bridges', 'Perps', 'Options']

    # Hardware involved = HIGH
    if type_a_code in hw_types or type_b_code in hw_types:
        return {'security_level': 'HIGH', 'safe_warning': DEFAULT_WARNINGS['HIGH']}

    # Both custodial = LOW
    if type_a_code in custodial_types and type_b_code in custodial_types:
        return {'security_level': 'LOW', 'safe_warning': DEFAULT_WARNINGS['LOW']}

    # DeFi = MEDIUM
    if type_a_code in defi_types or type_b_code in defi_types:
        return {'security_level': 'MEDIUM', 'safe_warning': DEFAULT_WARNINGS['MEDIUM']}

    # Default MEDIUM
    return {'security_level': 'MEDIUM', 'safe_warning': DEFAULT_WARNINGS['MEDIUM']}


def main():
    print("\n" + "=" * 60)
    print("  ADDING SECURITY LEVELS & SAFE WARNINGS")
    print("=" * 60)

    # Load product types
    r = requests.get(f'{SUPABASE_URL}/rest/v1/product_types?select=id,code', headers=HEADERS)
    types_by_id = {t['id']: t['code'] for t in r.json()} if r.status_code == 200 else {}
    print(f"\n📦 {len(types_by_id)} product types loaded")

    # Load products with types
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/products?select=id,type_id&type_id=not.is.null',
        headers=HEADERS
    )
    products = {p['id']: p['type_id'] for p in r.json()} if r.status_code == 200 else {}
    print(f"📦 {len(products)} products loaded")

    # Update type_compatibility with security info
    print("\n🔒 Updating type_compatibility...")
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/type_compatibility?select=id,type_a_id,type_b_id',
        headers=HEADERS
    )
    type_compats = r.json() if r.status_code == 200 else []

    updates = 0
    for tc in type_compats:
        type_a = types_by_id.get(tc['type_a_id'], '')
        type_b = types_by_id.get(tc['type_b_id'], '')

        security = get_security_for_types(type_a, type_b)

        # Update via PATCH
        r = requests.patch(
            f"{SUPABASE_URL}/rest/v1/type_compatibility?id=eq.{tc['id']}",
            headers=HEADERS,
            json={
                'security_level': security['security_level'],
                'safe_warning': security['safe_warning']
            }
        )
        if r.status_code in [200, 204]:
            updates += 1

    print(f"   ✅ {updates}/{len(type_compats)} type compatibilities updated")

    # Update product_compatibility with security info
    print("\n🔒 Updating product_compatibility...")

    # Process in batches to avoid timeout
    offset = 0
    limit = 500
    total_updates = 0

    while True:
        r = requests.get(
            f'{SUPABASE_URL}/rest/v1/product_compatibility?select=id,product_a_id,product_b_id&offset={offset}&limit={limit}',
            headers=HEADERS
        )
        prod_compats = r.json() if r.status_code == 200 else []

        if not prod_compats:
            break

        for pc in prod_compats:
            type_a_id = products.get(pc['product_a_id'])
            type_b_id = products.get(pc['product_b_id'])

            if not type_a_id or not type_b_id:
                continue

            type_a = types_by_id.get(type_a_id, '')
            type_b = types_by_id.get(type_b_id, '')

            security = get_security_for_types(type_a, type_b)

            # Update
            r = requests.patch(
                f"{SUPABASE_URL}/rest/v1/product_compatibility?id=eq.{pc['id']}",
                headers=HEADERS,
                json={
                    'security_level': security['security_level'],
                    'safe_warning': security['safe_warning']
                }
            )
            if r.status_code in [200, 204]:
                total_updates += 1

        offset += limit
        print(f"   Processed {offset} product compatibilities...")

    print(f"   ✅ {total_updates} product compatibilities updated with security info")

    print("\n" + "=" * 60)
    print("  ✅ SECURITY & SAFE WARNINGS ADDED")
    print("=" * 60)


if __name__ == "__main__":
    main()
