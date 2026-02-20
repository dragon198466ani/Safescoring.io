#!/usr/bin/env python3
"""
Generate nuanced norm applicability rules based on:
- Norm code prefix (EIP, BIP, CRYP, etc.)
- Norm pillar (S, A, F, E)
- Norm title keywords
- Product type characteristics (physical, custodial, defi, etc.)

Uses Claude's analysis logic - NO external AI APIs.
"""
import sys
sys.path.insert(0, 'src')
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)) + '/..')

import json
import requests
from core.config import SUPABASE_URL, get_supabase_headers

headers = get_supabase_headers()

# Get all types
r = requests.get(f'{SUPABASE_URL}/rest/v1/product_types?select=id,name,category', headers=headers)
TYPES = {t['id']: t for t in r.json()}

# Get all norms
all_norms = []
offset = 0
while True:
    r = requests.get(f'{SUPABASE_URL}/rest/v1/norms?select=id,code,pillar,title&offset={offset}&limit=1000', headers=headers)
    if r.status_code != 200 or not r.json():
        break
    all_norms.extend(r.json())
    offset += 1000
    if len(r.json()) < 1000:
        break

print(f"Loaded {len(all_norms)} norms, {len(TYPES)} types")

# ============================================================
# NORM CLASSIFICATION RULES
# ============================================================

def classify_norm(norm):
    """Classify a norm based on its code and title."""
    code = norm.get('code', '').upper()
    title = norm.get('title', '').lower()
    pillar = norm.get('pillar', '')

    classification = {
        'requires_physical': False,
        'requires_custodial': False,
        'requires_non_custodial': False,
        'requires_defi': False,
        'requires_exchange': False,
        'requires_bitcoin': False,
        'requires_ethereum': False,
        'requires_web': False,
        'requires_mobile': False,
        'requires_wallet': False,
        'requires_hardware': False,
        'universal': False,  # Applies to all
    }

    # PHYSICAL NORMS (F pillar mostly)
    physical_keywords = ['weight', 'gram', 'dimension', 'mm', 'material', 'steel', 'titanium',
                        'tamper', 'seal', 'water', 'ip67', 'ip68', 'shock', 'drop', 'temperature',
                        'battery', 'screen', 'display', 'button', 'usb-c', 'nfc', 'bluetooth',
                        'mil-std', 'iec 60529', 'enclosure', 'casing']
    for kw in physical_keywords:
        if kw in title or kw in code.lower():
            classification['requires_physical'] = True
            break

    # MIL-STD norms are physical
    if code.startswith('MIL'):
        classification['requires_physical'] = True

    # BITCOIN SPECIFIC
    if code.startswith('BIP') or 'bitcoin' in title or 'btc' in title:
        classification['requires_bitcoin'] = True

    # ETHEREUM SPECIFIC
    if code.startswith('EIP') or code.startswith('ERC') or 'ethereum' in title or 'evm' in title:
        classification['requires_ethereum'] = True

    # DEFI SPECIFIC
    defi_keywords = ['defi', 'amm', 'liquidity', 'lending', 'yield', 'staking', 'swap',
                    'pool', 'farm', 'vault', 'flash loan', 'oracle']
    if code.startswith('DEFI') or any(kw in title for kw in defi_keywords):
        classification['requires_defi'] = True

    # WALLET SPECIFIC
    wallet_keywords = ['wallet', 'seed', 'mnemonic', 'private key', 'signing', 'transaction signing']
    if code.startswith('WC') or any(kw in title for kw in wallet_keywords):
        classification['requires_wallet'] = True

    # CUSTODIAL SPECIFIC (regulatory, compliance)
    custodial_keywords = ['kyc', 'aml', 'fatf', 'travel rule', 'custody', 'custodian',
                         'regulatory', 'compliance', 'license', 'amld', 'mica']
    if code.startswith('REG') or any(kw in title for kw in custodial_keywords):
        classification['requires_custodial'] = True

    # NON-CUSTODIAL SPECIFIC
    non_custodial_keywords = ['self-custody', 'non-custodial', 'trustless', 'permissionless']
    if any(kw in title for kw in non_custodial_keywords):
        classification['requires_non_custodial'] = True

    # EXCHANGE SPECIFIC
    exchange_keywords = ['orderbook', 'matching engine', 'trading', 'market maker', 'liquidity provider']
    if any(kw in title for kw in exchange_keywords):
        classification['requires_exchange'] = True

    # WEB SPECIFIC
    web_keywords = ['owasp', 'xss', 'csrf', 'injection', 'web security', 'browser', 'cors', 'csp']
    if code.startswith('OWASP') or any(kw in title for kw in web_keywords):
        classification['requires_web'] = True

    # MOBILE SPECIFIC
    mobile_keywords = ['mobile', 'ios', 'android', 'biometric', 'face id', 'touch id']
    if any(kw in title for kw in mobile_keywords):
        classification['requires_mobile'] = True

    # HARDWARE SPECIFIC
    hardware_keywords = ['secure element', 'hsm', 'tpm', 'trusted execution', 'tee',
                        'hardware security', 'cc eal', 'common criteria']
    if code.startswith('HSM') or any(kw in title for kw in hardware_keywords):
        classification['requires_hardware'] = True

    # UNIVERSAL NORMS (apply to everyone)
    universal_prefixes = ['ISO', 'NIST', 'FIPS']
    universal_keywords = ['encryption', 'cryptograph', 'security audit', 'penetration test',
                         'incident response', 'backup', 'recovery', 'documentation',
                         'transparency', 'open source', 'audit']
    if any(code.startswith(p) for p in universal_prefixes):
        classification['universal'] = True
    if any(kw in title for kw in universal_keywords):
        classification['universal'] = True

    # Cryptography norms are mostly universal
    if code.startswith('CRYP') or code.startswith('RFC'):
        classification['universal'] = True

    return classification


# ============================================================
# TYPE CHARACTERISTICS
# ============================================================

def get_type_characteristics(type_id, type_info):
    """Get characteristics for a product type."""
    name = type_info.get('name', '').lower()
    category = type_info.get('category', '')

    chars = {
        'is_physical': False,
        'is_custodial': False,
        'is_defi': False,
        'is_exchange': False,
        'supports_bitcoin': True,  # Most support BTC
        'supports_ethereum': True,  # Most support ETH
        'is_web': False,
        'is_mobile': False,
        'is_wallet': False,
        'is_hardware': False,
    }

    # PHYSICAL
    if category == 'Hardware' or 'hardware' in name or 'physical' in name or 'metal' in name:
        chars['is_physical'] = True
        chars['is_hardware'] = True
    if 'card' in name:
        chars['is_physical'] = True

    # CUSTODIAL
    if 'custod' in name and 'non-custod' not in name:
        chars['is_custodial'] = True
    if category == 'Exchange' and 'decentralized' not in name and 'dex' not in name:
        chars['is_custodial'] = True  # CEX is custodial
    if 'bank' in name or 'institutional' in name:
        chars['is_custodial'] = True

    # DEFI
    if category == 'DeFi' or 'defi' in name or 'dex' in name:
        chars['is_defi'] = True
        chars['supports_bitcoin'] = False  # Most DeFi is EVM
    if 'amm' in name or 'lending' in name or 'yield' in name or 'staking' in name:
        chars['is_defi'] = True

    # EXCHANGE
    if category == 'Exchange' or 'exchange' in name:
        chars['is_exchange'] = True

    # WALLET
    if 'wallet' in name:
        chars['is_wallet'] = True

    # WEB
    if 'browser' in name or 'extension' in name or 'web' in name:
        chars['is_web'] = True
    if category in ['DeFi', 'Exchange', 'Infrastructure']:
        chars['is_web'] = True

    # MOBILE
    if 'mobile' in name:
        chars['is_mobile'] = True

    # Backup specific
    if 'backup' in name:
        chars['is_wallet'] = False
        chars['is_defi'] = False
        if 'metal' in name or 'physical' in name:
            chars['is_physical'] = True

    return chars


# ============================================================
# APPLICABILITY LOGIC
# ============================================================

def is_norm_applicable(norm_class, type_chars):
    """Determine if a norm applies to a product type."""

    # Universal norms apply to all
    if norm_class['universal']:
        # Except physical norms don't apply to non-physical
        if norm_class['requires_physical'] and not type_chars['is_physical']:
            return False, "Physical norm, non-physical product"
        return True, "Universal norm"

    # Physical requirements
    if norm_class['requires_physical'] and not type_chars['is_physical']:
        return False, "Physical norm, non-physical product"

    # Hardware requirements
    if norm_class['requires_hardware'] and not type_chars['is_hardware']:
        return False, "Hardware security norm, non-hardware product"

    # Custodial requirements
    if norm_class['requires_custodial'] and not type_chars['is_custodial']:
        return False, "Custodial/regulatory norm, non-custodial product"

    # Non-custodial requirements
    if norm_class['requires_non_custodial'] and type_chars['is_custodial']:
        return False, "Self-custody norm, custodial product"

    # DeFi requirements
    if norm_class['requires_defi'] and not type_chars['is_defi']:
        return False, "DeFi norm, non-DeFi product"

    # Exchange requirements
    if norm_class['requires_exchange'] and not type_chars['is_exchange']:
        return False, "Exchange norm, non-exchange product"

    # Bitcoin requirements
    if norm_class['requires_bitcoin'] and not type_chars['supports_bitcoin']:
        return False, "Bitcoin norm, product doesn't support BTC"

    # Ethereum requirements
    if norm_class['requires_ethereum'] and not type_chars['supports_ethereum']:
        return False, "Ethereum norm, product doesn't support ETH"

    # Web requirements
    if norm_class['requires_web'] and not type_chars['is_web']:
        return False, "Web security norm, non-web product"

    # Mobile requirements
    if norm_class['requires_mobile'] and not type_chars['is_mobile']:
        return False, "Mobile norm, non-mobile product"

    # Wallet requirements
    if norm_class['requires_wallet'] and not type_chars['is_wallet']:
        return False, "Wallet norm, non-wallet product"

    return True, "Applicable"


# ============================================================
# GENERATE RULES
# ============================================================

print("\nGenerating nuanced applicability rules...")

rules = []
stats = {'applicable': 0, 'not_applicable': 0, 'reasons': {}}

for type_id, type_info in TYPES.items():
    type_chars = get_type_characteristics(type_id, type_info)

    for norm in all_norms:
        norm_class = classify_norm(norm)
        is_applicable, reason = is_norm_applicable(norm_class, type_chars)

        rules.append({
            'norm_id': norm['id'],
            'type_id': type_id,
            'is_applicable': is_applicable,
            'applicability_reason': reason
        })

        if is_applicable:
            stats['applicable'] += 1
        else:
            stats['not_applicable'] += 1

        stats['reasons'][reason] = stats['reasons'].get(reason, 0) + 1

print(f"\nGenerated {len(rules):,} rules:")
print(f"  Applicable: {stats['applicable']:,}")
print(f"  Not applicable: {stats['not_applicable']:,}")
print(f"\nTop reasons for non-applicability:")
sorted_reasons = sorted(stats['reasons'].items(), key=lambda x: -x[1])
for reason, count in sorted_reasons[:10]:
    print(f"  {reason}: {count:,}")

# Save to file
output_file = 'data/norm_applicability_nuanced.json'
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(rules, f)
print(f"\nSaved to {output_file}")
