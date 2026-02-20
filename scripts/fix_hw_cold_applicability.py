#!/usr/bin/env python3
"""
Fix applicability for HW Cold (Hardware Wallet Cold) type.

Rules:
- ADD: Hardware-specific norms (SE, CC, BIP, firmware, tamper, etc.)
- REMOVE: Banking, CEX, DeFi-specific norms
"""

import requests
import os
from dotenv import load_dotenv
load_dotenv('config/.env')

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')

def get_headers():
    return {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
    }

TYPE_ID = 1  # HW Cold

# Patterns for norms that SHOULD apply to HW Cold
SHOULD_APPLY_PATTERNS = [
    # Secure Element & Hardware Security
    'SECURE ELEMENT', 'SE ', 'SE-', '-SE', 'CHIP',
    'CC ', 'COMMON CRITERIA', 'EAL', 'FIPS', 'CSPN', 'ANSSI',
    'TAMPER', 'ANTI-TAMPER', 'GLITCH', 'FAULT', 'DPA', 'SPA',
    'FIRMWARE', 'BOOT', 'JTAG', 'RNG', 'TRNG', 'ENTROPY',

    # BIP Standards (wallet)
    'BIP-32', 'BIP-39', 'BIP-44', 'BIP-49', 'BIP-84', 'BIP-86',
    'BIP-141', 'BIP-174', 'BIP-340', 'BIP-341', 'BIP-370',
    'S-BIP', 'BIP32', 'BIP39', 'BIP44',

    # Key Management
    'SEED', 'MNEMONIC', 'PASSPHRASE', 'KEY DERIVATION', 'HD WALLET',
    'RECOVERY', 'BACKUP', 'SHAMIR', 'SSS',

    # Physical Security
    'PIN', 'WIPE', 'DURESS', 'DECOY', 'HIDDEN WALLET',
    'ATTESTATION', 'SUPPLY CHAIN', 'COUNTERFEIT',

    # Device Features
    'DISPLAY', 'SCREEN', 'BUTTON', 'USB', 'BLUETOOTH', 'NFC',
    'BATTERY', 'CHARGING',

    # Certifications
    'CE MARK', 'ROHS', 'FCC', 'EMC', 'EMI',

    # Crypto Standards
    'SECP256K1', 'ED25519', 'ECDSA', 'SCHNORR', 'AES', 'SHA',
    'ENCRYPTION', 'SIGNATURE', 'HASH',

    # Chains (wallets support chains)
    'BITCOIN', 'ETHEREUM', 'SOLANA', 'CARDANO', 'POLKADOT',
    'ERC-20', 'ERC-721', 'NFT', 'TOKEN',
]

# Patterns for norms that should NOT apply to HW Cold
SHOULD_NOT_APPLY_PATTERNS = [
    # Banking
    'BANK', 'BANKING', 'AML', 'KYC', 'FIAT', 'IBAN',

    # Exchange (CEX)
    'CEX', 'EXCHANGE', 'TRADING', 'ORDER BOOK', 'LIQUIDITY POOL',
    'PROOF OF RESERVES', 'POR', 'SEGREGATION',

    # DeFi specific
    'DEFI', 'LENDING', 'BORROWING', 'YIELD', 'APY', 'APR',
    'TVL', 'LIQUIDITY', 'STAKING POOL', 'VALIDATOR',
    'AMM', 'SWAP', 'DEX', 'UNISWAP', 'AAVE', 'COMPOUND',

    # Bridge specific
    'BRIDGE', 'CROSS-CHAIN', 'RELAY', 'FINALITY',

    # Smart Contract specific (not HW wallet)
    'REENTRANCY', 'FLASH LOAN', 'ORACLE', 'PRICE FEED',
    'GOVERNANCE TOKEN', 'DAO', 'TIMELOCK',

    # Card specific
    'CASHBACK', 'SPENDING LIMIT', 'CARD NETWORK', 'VISA', 'MASTERCARD',

    # Custody specific (not self-custody HW)
    'CUSTODY SERVICE', 'INSTITUTIONAL', 'OMNIBUS',
]


def should_apply_to_hw_cold(code, title):
    """Determine if a norm should apply to HW Cold."""
    text = f"{code} {title}".upper()

    # Check NOT apply patterns first (more specific)
    for pattern in SHOULD_NOT_APPLY_PATTERNS:
        if pattern in text:
            return False

    # Check SHOULD apply patterns
    for pattern in SHOULD_APPLY_PATTERNS:
        if pattern in text:
            return True

    # Default: keep current applicability
    return None  # No change


def main():
    headers = get_headers()

    print("=" * 60)
    print("CORRECTION APPLICABILITÉ - HW Cold (type_id=1)")
    print("=" * 60)

    # Get all norms
    r = requests.get(f'{SUPABASE_URL}/rest/v1/norms?select=id,code,title,pillar&order=code', headers=headers)
    all_norms = r.json()
    print(f"Total normes: {len(all_norms)}")

    # Get current applicability
    r = requests.get(f'{SUPABASE_URL}/rest/v1/norm_applicability?type_id=eq.{TYPE_ID}&select=norm_id,is_applicable', headers=headers)
    current_app = {a['norm_id']: a['is_applicable'] for a in r.json()}
    print(f"Applicabilité actuelle: {len(current_app)} entrées")

    # Analyze and fix
    to_add_applicable = []
    to_remove_applicable = []
    to_insert = []

    for norm in all_norms:
        norm_id = norm['id']
        code = norm['code']
        title = norm['title']

        should_apply = should_apply_to_hw_cold(code, title)

        if should_apply is None:
            continue  # Keep current state

        current = current_app.get(norm_id)

        if should_apply and current is False:
            to_add_applicable.append((code, title))
            to_insert.append({
                'type_id': TYPE_ID,
                'norm_id': norm_id,
                'is_applicable': True
            })
        elif not should_apply and current is True:
            to_remove_applicable.append((code, title))
            to_insert.append({
                'type_id': TYPE_ID,
                'norm_id': norm_id,
                'is_applicable': False
            })
        elif current is None:
            # No entry exists, create one
            to_insert.append({
                'type_id': TYPE_ID,
                'norm_id': norm_id,
                'is_applicable': should_apply
            })

    print(f"\n[+] À rendre APPLICABLE: {len(to_add_applicable)}")
    for code, title in to_add_applicable[:10]:
        print(f"    {code}: {title[:50]}")
    if len(to_add_applicable) > 10:
        print(f"    ... et {len(to_add_applicable) - 10} autres")

    print(f"\n[-] À rendre NON-APPLICABLE: {len(to_remove_applicable)}")
    for code, title in to_remove_applicable[:10]:
        print(f"    {code}: {title[:50]}")
    if len(to_remove_applicable) > 10:
        print(f"    ... et {len(to_remove_applicable) - 10} autres")

    # Apply changes via upsert
    if to_insert:
        print(f"\nApplication des {len(to_insert)} changements...")

        # Upsert in batches
        updated = 0
        for i in range(0, len(to_insert), 50):
            batch = to_insert[i:i+50]

            # Delete existing entries for these norms
            norm_ids = [item['norm_id'] for item in batch]
            requests.delete(
                f'{SUPABASE_URL}/rest/v1/norm_applicability?type_id=eq.{TYPE_ID}&norm_id=in.({",".join(map(str, norm_ids))})',
                headers=headers
            )

            # Insert new entries
            r = requests.post(
                f'{SUPABASE_URL}/rest/v1/norm_applicability',
                headers=headers,
                json=batch
            )
            if r.status_code in [200, 201]:
                updated += len(batch)

        print(f"Mis à jour: {updated} entrées")

    # Verify final counts
    r = requests.get(f'{SUPABASE_URL}/rest/v1/norm_applicability?type_id=eq.{TYPE_ID}&select=is_applicable', headers=headers)
    final = r.json()
    applicable = sum(1 for a in final if a['is_applicable'])
    not_applicable = sum(1 for a in final if not a['is_applicable'])

    print(f"\n{'=' * 60}")
    print(f"RÉSULTAT FINAL - HW Cold")
    print(f"{'=' * 60}")
    print(f"  Applicable: {applicable}")
    print(f"  Non-applicable: {not_applicable}")
    print(f"  Total: {len(final)}")


if __name__ == '__main__':
    main()
