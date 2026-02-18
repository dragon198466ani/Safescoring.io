#!/usr/bin/env python3
"""
Generate complete applicability mapping for all 1302 norms
Each norm gets a list of applicable product types
"""
import requests
import json
import re

from config_helper import SUPABASE_URL, SUPABASE_KEY, get_supabase_headers

headers = get_supabase_headers()

# All product types
ALL_TYPES = [
    'HW_WALLET', 'SW_WALLET', 'CUSTODY', 'MULTISIG',
    'CEX', 'DEX', 'DEX_AGG', 'SWAP', 'P2P', 'OTC',
    'LENDING', 'YIELD', 'STAKING', 'LIQUID_STAKING', 'VAULT',
    'BRIDGE', 'PERP_DEX',
    'NFT_MARKET', 'LAUNCHPAD', 'DAO',
    'PAYMENT', 'CARD', 'BANK',
    'BROWSER_EXT', 'MOBILE_WALLET', 'DESKTOP_WALLET',
]

# Type groups for easier mapping
WALLET_TYPES = ['HW_WALLET', 'SW_WALLET', 'MULTISIG', 'BROWSER_EXT', 'MOBILE_WALLET', 'DESKTOP_WALLET']
EXCHANGE_TYPES = ['CEX', 'DEX', 'DEX_AGG', 'SWAP', 'P2P', 'OTC']
DEFI_TYPES = ['DEX', 'DEX_AGG', 'LENDING', 'YIELD', 'STAKING', 'LIQUID_STAKING', 'VAULT', 'BRIDGE', 'PERP_DEX']
CUSTODY_TYPES = ['CUSTODY', 'CEX']
TRADING_TYPES = ['CEX', 'DEX', 'DEX_AGG', 'PERP_DEX', 'OTC']
FIAT_TYPES = ['CEX', 'PAYMENT', 'CARD', 'BANK', 'P2P']
NFT_TYPES = ['NFT_MARKET', 'LAUNCHPAD']

# Keywords to product type mapping
KEYWORD_MAPPING = {
    # Wallet-specific
    'wallet': WALLET_TYPES,
    'hardware': ['HW_WALLET'],
    'software wallet': ['SW_WALLET', 'BROWSER_EXT', 'MOBILE_WALLET', 'DESKTOP_WALLET'],
    'seed': WALLET_TYPES,
    'mnemonic': WALLET_TYPES,
    'bip32': WALLET_TYPES,
    'bip39': WALLET_TYPES,
    'bip44': WALLET_TYPES,
    'derivation': WALLET_TYPES,
    'passphrase': WALLET_TYPES,
    'pin': ['HW_WALLET'],
    'secure element': ['HW_WALLET'],
    'tamper': ['HW_WALLET'],
    'firmware': ['HW_WALLET'],
    'duress': WALLET_TYPES + ['CUSTODY'],
    'hidden wallet': WALLET_TYPES,
    'decoy': WALLET_TYPES,
    'wipe': ['HW_WALLET', 'SW_WALLET'],

    # Exchange-specific
    'exchange': EXCHANGE_TYPES,
    'cex': ['CEX'],
    'dex': ['DEX', 'DEX_AGG'],
    'amm': ['DEX', 'DEX_AGG'],
    'order book': ['CEX', 'DEX', 'PERP_DEX'],
    'trading': TRADING_TYPES,
    'liquidity': ['DEX', 'DEX_AGG', 'LENDING', 'BRIDGE'],
    'swap': ['DEX', 'DEX_AGG', 'SWAP'],
    'slippage': ['DEX', 'DEX_AGG', 'SWAP', 'BRIDGE'],
    'mev': ['DEX', 'DEX_AGG'],
    'front-run': ['DEX', 'DEX_AGG'],
    'sandwich': ['DEX', 'DEX_AGG'],

    # DeFi-specific
    'defi': DEFI_TYPES,
    'smart contract': DEFI_TYPES + ['NFT_MARKET'],
    'audit': DEFI_TYPES + ['CEX', 'CUSTODY', 'NFT_MARKET'],
    'lending': ['LENDING'],
    'borrow': ['LENDING'],
    'collateral': ['LENDING', 'PERP_DEX'],
    'liquidation': ['LENDING', 'PERP_DEX'],
    'yield': ['YIELD', 'LENDING', 'STAKING', 'LIQUID_STAKING'],
    'vault': ['YIELD', 'VAULT'],
    'staking': ['STAKING', 'LIQUID_STAKING'],
    'validator': ['STAKING', 'LIQUID_STAKING', 'BRIDGE'],
    'stake': ['STAKING', 'LIQUID_STAKING'],
    'unstake': ['STAKING', 'LIQUID_STAKING'],
    'liquid staking': ['LIQUID_STAKING'],
    'lst': ['LIQUID_STAKING'],

    # Bridge-specific
    'bridge': ['BRIDGE'],
    'cross-chain': ['BRIDGE'],
    'relay': ['BRIDGE'],
    'lock': ['BRIDGE'],
    'mint': ['BRIDGE', 'NFT_MARKET'],
    'wrapped': ['BRIDGE'],

    # Perp-specific
    'perpetual': ['PERP_DEX'],
    'perp': ['PERP_DEX'],
    'futures': ['PERP_DEX', 'CEX'],
    'margin': ['PERP_DEX', 'CEX', 'LENDING'],
    'leverage': ['PERP_DEX', 'CEX'],
    'funding rate': ['PERP_DEX'],

    # Custody-specific
    'custody': ['CUSTODY', 'CEX'],
    'institutional': ['CUSTODY', 'CEX', 'OTC'],
    'mpc': ['CUSTODY', 'HW_WALLET'],
    'hsm': ['CUSTODY', 'CEX', 'HW_WALLET'],
    'cold storage': ['CUSTODY', 'CEX', 'HW_WALLET'],
    'segregat': ['CUSTODY', 'CEX', 'BANK'],
    'quorum': ['CUSTODY', 'MULTISIG'],

    # NFT-specific
    'nft': NFT_TYPES,
    'royalt': ['NFT_MARKET'],
    'collection': ['NFT_MARKET'],
    'marketplace': ['NFT_MARKET'],
    'erc721': ['NFT_MARKET'] + WALLET_TYPES,
    'erc1155': ['NFT_MARKET'] + WALLET_TYPES,

    # Payment-specific
    'payment': ['PAYMENT', 'CARD'],
    'card': ['CARD'],
    'fiat': FIAT_TYPES,
    'bank': ['BANK', 'CEX'],
    'iban': ['BANK'],
    'sepa': ['BANK', 'CEX'],
    'pci': ['PAYMENT', 'CARD', 'CEX'],

    # Regulatory
    'mica': ['CEX', 'CUSTODY', 'BANK'],
    'license': ['CEX', 'CUSTODY', 'BANK', 'PAYMENT'],
    'aml': ['CEX', 'CUSTODY', 'BANK', 'PAYMENT'],
    'kyc': ['CEX', 'CUSTODY', 'BANK', 'PAYMENT', 'P2P'],
    'gdpr': ALL_TYPES,

    # Security general
    'encryption': ALL_TYPES,
    '2fa': ['CEX', 'CUSTODY', 'BANK', 'SW_WALLET'],
    'authentication': ALL_TYPES,
    'backup': WALLET_TYPES + ['CUSTODY'],
    'recovery': WALLET_TYPES + ['CUSTODY'],

    # Oracle
    'oracle': DEFI_TYPES,
    'chainlink': DEFI_TYPES,
    'twap': ['DEX', 'DEX_AGG', 'LENDING'],
    'price feed': DEFI_TYPES,

    # Governance
    'dao': ['DAO', 'YIELD', 'DEX'],
    'governance': DEFI_TYPES + ['DAO'],
    'multisig': ['MULTISIG', 'CUSTODY', 'DAO'] + DEFI_TYPES,
    'timelock': DEFI_TYPES + ['CUSTODY'],
}

# Code prefix to types mapping
CODE_PREFIX_MAPPING = {
    # CEX norms
    'S-CEX': ['CEX'],
    'A-CEX': ['CEX'],
    'F-CEX': ['CEX'],
    'E-CEX': ['CEX'],

    # Custody norms
    'S-CUST': ['CUSTODY'],
    'A-CUST': ['CUSTODY'],
    'F-CUST': ['CUSTODY'],
    'E-CUST': ['CUSTODY'],

    # Lending norms
    'S-LEND': ['LENDING'],
    'A-LEND': ['LENDING'],
    'F-LEND': ['LENDING'],
    'E-LEND': ['LENDING'],

    # Staking norms
    'S-STAKE': ['STAKING', 'LIQUID_STAKING'],
    'A-STAKE': ['STAKING', 'LIQUID_STAKING'],
    'F-STAKE': ['STAKING', 'LIQUID_STAKING'],
    'E-STAKE': ['STAKING', 'LIQUID_STAKING'],

    # Liquid Staking norms
    'S-LST': ['LIQUID_STAKING'],
    'A-LST': ['LIQUID_STAKING'],
    'F-LST': ['LIQUID_STAKING'],
    'E-LST': ['LIQUID_STAKING'],

    # Yield norms
    'S-YIELD': ['YIELD', 'VAULT'],
    'A-YIELD': ['YIELD', 'VAULT'],
    'F-YIELD': ['YIELD', 'VAULT'],
    'E-YIELD': ['YIELD', 'VAULT'],

    # Perp norms
    'S-PERP': ['PERP_DEX'],
    'A-PERP': ['PERP_DEX'],
    'F-PERP': ['PERP_DEX'],
    'E-PERP': ['PERP_DEX'],

    # Bridge norms
    'S-BRIDGE': ['BRIDGE'],
    'A-BRIDGE': ['BRIDGE'],
    'F-BRIDGE': ['BRIDGE'],
    'E-BRIDGE': ['BRIDGE'],
    'S-BR-': ['BRIDGE'],

    # NFT norms
    'S-NFT': ['NFT_MARKET'],
    'A-NFT': ['NFT_MARKET'],
    'F-NFT': ['NFT_MARKET'],
    'E-NFT': ['NFT_MARKET'],

    # Payment norms
    'S-PAY': ['PAYMENT'],
    'A-PAY': ['PAYMENT'],
    'F-PAY': ['PAYMENT'],
    'E-PAY': ['PAYMENT'],

    # Card norms
    'S-CARD': ['CARD'],
    'A-CARD': ['CARD'],
    'F-CARD': ['CARD'],
    'E-CARD': ['CARD'],

    # Bank norms
    'S-BANK': ['BANK'],
    'A-BANK': ['BANK'],
    'F-BANK': ['BANK'],
    'E-BANK': ['BANK'],

    # DEX norms
    'S-DEX': ['DEX', 'DEX_AGG'],
    'A-DEX': ['DEX', 'DEX_AGG'],
    'F-DEX': ['DEX', 'DEX_AGG'],
    'E-DEX': ['DEX', 'DEX_AGG'],

    # Smart Contract norms (DeFi)
    'S-SC-': DEFI_TYPES,

    # Wallet norms
    'F-WALLET': WALLET_TYPES,
    'S-WALLET': WALLET_TYPES,

    # Anti-coercion wallet specific
    'A-PHY': ['HW_WALLET'],
    'A-HDN': WALLET_TYPES,
    'A-OPS': WALLET_TYPES + ['CUSTODY'],
}

def get_all_norms():
    """Fetch all norms from database"""
    all_norms = []
    offset = 0
    while True:
        resp = requests.get(
            f'{SUPABASE_URL}/rest/v1/norms?select=code,pillar,title,description&offset={offset}&limit=1000',
            headers=headers
        )
        if resp.status_code != 200:
            break
        batch = resp.json()
        if not batch:
            break
        all_norms.extend(batch)
        offset += 1000
        if len(batch) < 1000:
            break
    return all_norms

def determine_applicability(norm):
    """Determine which product types a norm applies to"""
    code = norm['code']
    title = norm.get('title', '')
    desc = norm.get('description', '')
    text = f"{code} {title} {desc}".lower()

    applicable_types = set()

    # Check code prefix first (most specific)
    for prefix, types in CODE_PREFIX_MAPPING.items():
        if code.upper().startswith(prefix):
            applicable_types.update(types)

    # If we found specific types from prefix, return those
    if applicable_types:
        return sorted(list(applicable_types))

    # Check keywords
    for keyword, types in KEYWORD_MAPPING.items():
        if keyword in text:
            applicable_types.update(types)

    # If still no types found, determine by pillar and general category
    if not applicable_types:
        pillar = norm.get('pillar', 'S')

        # Check for general patterns in code
        code_upper = code.upper()

        # Hardware wallet codes (A01-A50 range for anti-coercion)
        if pillar == 'A' and re.match(r'^A\d{1,3}$', code_upper):
            num = int(re.search(r'\d+', code_upper).group())
            if num <= 50:
                applicable_types.update(WALLET_TYPES)
            elif num <= 80:
                applicable_types.update(['CEX', 'CUSTODY'])

        # Security norms (S-codes)
        elif pillar == 'S':
            if any(kw in text for kw in ['key', 'seed', 'mnemonic', 'backup']):
                applicable_types.update(WALLET_TYPES + ['CUSTODY'])
            elif any(kw in text for kw in ['contract', 'solidity', 'evm']):
                applicable_types.update(DEFI_TYPES)
            else:
                # Generic security applies to all
                applicable_types.update(ALL_TYPES)

        # Fiability norms
        elif pillar == 'F':
            if any(kw in text for kw in ['tvl', 'protocol', 'defi']):
                applicable_types.update(DEFI_TYPES)
            else:
                applicable_types.update(ALL_TYPES)

        # Ecosystem norms
        elif pillar == 'E':
            if any(kw in text for kw in ['chain', 'network', 'token']):
                applicable_types.update(DEFI_TYPES + WALLET_TYPES)
            else:
                applicable_types.update(ALL_TYPES)

    # Default: apply to all types if nothing specific found
    if not applicable_types:
        applicable_types.update(ALL_TYPES)

    return sorted(list(applicable_types))

def main():
    print('=' * 80)
    print('GENERATION DU MAPPING D\'APPLICABILITE')
    print('=' * 80)

    norms = get_all_norms()
    print(f'Total normes: {len(norms)}')

    # Generate mapping
    applicability_mapping = {}

    for norm in norms:
        code = norm['code']
        types = determine_applicability(norm)
        applicability_mapping[code] = types

    # Statistics
    type_counts = {}
    for types in applicability_mapping.values():
        for t in types:
            type_counts[t] = type_counts.get(t, 0) + 1

    print('\nNormes par type de produit:')
    print('-' * 40)
    for t in sorted(type_counts.keys()):
        print(f'  {t:20}: {type_counts[t]:4} normes')

    # Generate Python code
    output_file = 'c:/Users/alexa/Desktop/SafeScoring/src/core/norm_applicability_complete.py'

    with open(output_file, 'w', encoding='utf-8') as f:
        f.write('#!/usr/bin/env python3\n')
        f.write('"""\nComplete norm applicability mapping for all 1302 norms\n')
        f.write('Auto-generated - maps each norm code to applicable product types\n"""\n\n')

        f.write('# All product types\n')
        f.write('ALL_PRODUCT_TYPES = [\n')
        for t in ALL_TYPES:
            f.write(f"    '{t}',\n")
        f.write(']\n\n')

        f.write('# Complete norm to product type applicability mapping\n')
        f.write('NORM_APPLICABILITY = {\n')

        for code in sorted(applicability_mapping.keys()):
            types = applicability_mapping[code]
            types_str = ', '.join([f"'{t}'" for t in types])
            f.write(f"    '{code}': [{types_str}],\n")

        f.write('}\n\n')

        f.write('def is_norm_applicable(norm_code: str, product_type: str) -> bool:\n')
        f.write('    """Check if a norm applies to a product type"""\n')
        f.write('    if norm_code not in NORM_APPLICABILITY:\n')
        f.write('        return True  # Unknown norms apply to all\n')
        f.write('    return product_type.upper() in NORM_APPLICABILITY[norm_code]\n\n')

        f.write('def get_applicable_norms(product_type: str) -> list:\n')
        f.write('    """Get all norms applicable to a product type"""\n')
        f.write('    product_type = product_type.upper()\n')
        f.write('    return [code for code, types in NORM_APPLICABILITY.items() if product_type in types]\n\n')

        f.write('def get_norm_types(norm_code: str) -> list:\n')
        f.write('    """Get all product types a norm applies to"""\n')
        f.write('    return NORM_APPLICABILITY.get(norm_code, ALL_PRODUCT_TYPES)\n')

    print(f'\nMapping genere: {output_file}')
    print(f'Total: {len(applicability_mapping)} normes mappees')

if __name__ == '__main__':
    main()
