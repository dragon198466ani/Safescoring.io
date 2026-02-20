#!/usr/bin/env python3
"""
Generate norm applicability rules using deterministic business rules.
No AI API calls needed - uses category/keyword matching.
"""
import sys
sys.path.insert(0, 'src')
from core.config import SUPABASE_URL, get_supabase_headers
import requests
import time
import re

# Headers for read and write
READ_HEADERS = get_supabase_headers()
WRITE_HEADERS = get_supabase_headers('resolution=merge-duplicates', use_service_key=True)

# ============================================================================
# BUSINESS RULES FOR APPLICABILITY
# ============================================================================

# Keywords that indicate hardware-only norms
HARDWARE_KEYWORDS = [
    'pin', 'wipe', 'firmware', 'secure element', 'chip', 'battery', 'screen',
    'button', 'usb', 'nfc', 'bluetooth', 'device', 'physical', 'tamper',
    'anti-tamper', 'boot', 'enclave', 'tee', 'trustzone', 'se chip',
    'cc eal', 'common criteria', 'fips', 'rohs', 'ip67', 'waterproof',
    'dustproof', 'shockproof', 'led', 'display', 'touchscreen'
]

# Keywords that indicate DeFi/protocol norms
DEFI_KEYWORDS = [
    'smart contract', 'solidity', 'gas', 'tvl', 'liquidity', 'pool',
    'swap', 'amm', 'lending', 'borrowing', 'collateral', 'liquidation',
    'yield', 'farming', 'staking', 'unstaking', 'slippage', 'mev',
    'flash loan', 'oracle', 'price feed', 'defi', 'protocol', 'dao',
    'governance', 'token', 'erc-20', 'erc-721', 'erc-1155', 'nft',
    'bridge', 'cross-chain', 'l2', 'layer 2', 'rollup', 'zk', 'optimistic'
]

# Keywords that indicate wallet norms
WALLET_KEYWORDS = [
    'seed', 'mnemonic', 'bip-32', 'bip-39', 'bip-44', 'derivation path',
    'private key', 'public key', 'address', 'wallet connect', 'dapp',
    'signing', 'transaction', 'utxo', 'account', 'balance', 'send', 'receive'
]

# Keywords that indicate physical backup norms
PHYSICAL_BACKUP_KEYWORDS = [
    'metal', 'steel', 'titanium', 'fire', 'corrosion', 'acid', 'chemical',
    'engraving', 'stamping', 'durability', 'material', 'weather', 'rust',
    'oxidation', 'melting point', 'impact', 'crush', 'ip rating'
]

# Keywords that indicate exchange/CEX norms
EXCHANGE_KEYWORDS = [
    'kyc', 'aml', 'compliance', 'license', 'regulation', 'custody',
    'insurance', 'cold storage', 'hot wallet', 'reserves', 'proof of reserves',
    'trading', 'order book', 'matching engine', 'withdrawal', 'deposit',
    'fiat', 'bank', 'wire', 'card payment'
]

# Universal norms (apply to all products that manage crypto)
UNIVERSAL_KEYWORDS = [
    'encryption', 'aes', 'rsa', 'ecdsa', 'sha', 'hash', 'tls', 'ssl',
    'https', 'certificate', '2fa', 'mfa', 'authentication', 'audit',
    'security audit', 'penetration test', 'bug bounty', 'incident',
    'disclosure', 'transparency', 'open source', 'backup', 'recovery'
]


def load_types():
    """Load all product types with their characteristics"""
    print("Loading product types...")
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/product_types?select=*',
        headers=READ_HEADERS, timeout=30
    )
    types = r.json() if r.status_code == 200 else []
    print(f"  {len(types)} types loaded")
    return types


def load_norms():
    """Load all norms"""
    print("Loading norms...")
    norms = []
    offset = 0
    while True:
        r = requests.get(
            f'{SUPABASE_URL}/rest/v1/norms?select=id,code,title,pillar,description&limit=1000&offset={offset}',
            headers=READ_HEADERS, timeout=60
        )
        data = r.json() if r.status_code == 200 else []
        if not data:
            break
        norms.extend(data)
        offset += len(data)
        if len(data) < 1000:
            break
    print(f"  {len(norms)} norms loaded")
    return norms


def get_type_characteristics(type_info):
    """Determine type characteristics from code and name"""
    code = type_info.get('code', '').lower()
    name = type_info.get('name', '').lower()
    combined = f"{code} {name}"

    # Check database columns first
    is_hardware = type_info.get('is_hardware', False)
    is_wallet = type_info.get('is_wallet', False)
    is_defi = type_info.get('is_defi', False)
    is_protocol = type_info.get('is_protocol', False)
    is_custodial = type_info.get('is_custodial', False)

    # Infer from name/code if not set
    if not any([is_hardware, is_wallet, is_defi, is_protocol]):
        is_hardware = 'hw' in code or 'hardware' in combined
        is_wallet = 'wallet' in combined or 'sw' in code
        is_defi = any(kw in combined for kw in ['defi', 'dex', 'lending', 'yield', 'amm', 'bridge', 'staking'])
        is_protocol = any(kw in combined for kw in ['protocol', 'oracle', 'l2', 'bridge'])
        is_custodial = any(kw in combined for kw in ['cex', 'exchange', 'custody', 'bank'])

    is_physical_backup = 'bkp physical' in code or 'metal' in combined or 'backup' in code
    is_exchange = 'cex' in code or 'exchange' in combined or 'otc' in combined

    return {
        'is_hardware': is_hardware,
        'is_wallet': is_wallet,
        'is_defi': is_defi,
        'is_protocol': is_protocol,
        'is_custodial': is_custodial,
        'is_physical_backup': is_physical_backup,
        'is_exchange': is_exchange,
    }


def matches_keywords(text, keywords):
    """Check if text contains any of the keywords"""
    if not text:
        return False
    text_lower = text.lower()
    return any(kw in text_lower for kw in keywords)


def determine_applicability(norm, type_chars):
    """Determine if a norm applies to a type based on business rules"""
    title = norm.get('title', '')
    desc = norm.get('description', '')
    code = norm.get('code', '')
    pillar = norm.get('pillar', '')
    combined_text = f"{title} {desc} {code}".lower()

    # Rule 1: Hardware-specific norms only apply to hardware
    if matches_keywords(combined_text, HARDWARE_KEYWORDS):
        if type_chars['is_hardware']:
            return True, "Hardware norm - applies to hardware wallet"
        else:
            return False, "Hardware-only norm"

    # Rule 2: Physical backup norms only apply to physical backups
    if matches_keywords(combined_text, PHYSICAL_BACKUP_KEYWORDS):
        if type_chars['is_physical_backup']:
            return True, "Physical backup norm - applies"
        elif type_chars['is_hardware']:
            return True, "Physical norm - also applies to hardware"
        else:
            return False, "Physical backup only"

    # Rule 3: DeFi/protocol norms
    if matches_keywords(combined_text, DEFI_KEYWORDS):
        if type_chars['is_defi'] or type_chars['is_protocol']:
            return True, "DeFi/protocol norm - applies"
        else:
            return False, "DeFi/protocol only"

    # Rule 4: Wallet-specific norms
    if matches_keywords(combined_text, WALLET_KEYWORDS):
        if type_chars['is_wallet'] or type_chars['is_hardware']:
            return True, "Wallet norm - applies"
        else:
            return False, "Wallet only"

    # Rule 5: Exchange norms
    if matches_keywords(combined_text, EXCHANGE_KEYWORDS):
        if type_chars['is_exchange'] or type_chars['is_custodial']:
            return True, "Exchange/custodial norm - applies"
        # Most exchange norms also apply to wallets (KYC is optional for non-custodial)
        elif type_chars['is_wallet'] or type_chars['is_defi']:
            return True, "Also applicable to wallets/DeFi"
        else:
            return False, "Exchange/custodial only"

    # Rule 6: Universal norms (security, encryption, audit)
    if matches_keywords(combined_text, UNIVERSAL_KEYWORDS):
        return True, "Universal security norm"

    # Rule 7: Pillar-based defaults
    if pillar == 'S':  # Security - generally applicable
        return True, "Security pillar - default applicable"
    elif pillar == 'A':  # Adversity - generally applicable
        return True, "Adversity pillar - default applicable"
    elif pillar == 'F':  # Fidelity - depends on type
        if type_chars['is_hardware'] or type_chars['is_physical_backup']:
            return True, "Fidelity - applicable to physical products"
        else:
            return True, "Fidelity - applicable (track record)"
    elif pillar == 'E':  # Ecosystem - depends on features
        return True, "Ecosystem pillar - default applicable"

    # Default: applicable (conservative approach)
    return True, "Default applicable"


def save_batch(records):
    """Save a batch of applicability records"""
    if not records:
        return 0

    try:
        r = requests.post(
            f'{SUPABASE_URL}/rest/v1/norm_applicability',
            headers=WRITE_HEADERS,
            json=records,
            timeout=60
        )
        if r.status_code in [200, 201]:
            return len(records)
        else:
            print(f"    Save error: {r.status_code} - {r.text[:100]}")
            return 0
    except Exception as e:
        print(f"    Save exception: {e}")
        return 0


def main():
    print("=" * 60)
    print("  APPLICABILITY RULES GENERATOR")
    print("  Using deterministic business rules (no AI)")
    print("=" * 60)

    types = load_types()
    norms = load_norms()

    # Filter to SAFE-applicable types only
    safe_types = [t for t in types if t.get('is_safe_applicable', True)]
    print(f"\nProcessing {len(safe_types)} SAFE-applicable types x {len(norms)} norms")

    total_saved = 0
    batch = []
    batch_size = 500

    for i, type_info in enumerate(safe_types):
        type_id = type_info['id']
        type_code = type_info.get('code', 'Unknown')
        type_chars = get_type_characteristics(type_info)

        applicable_count = 0
        not_applicable_count = 0

        for norm in norms:
            norm_id = norm['id']
            is_applicable, reason = determine_applicability(norm, type_chars)

            if is_applicable:
                applicable_count += 1
            else:
                not_applicable_count += 1

            batch.append({
                'type_id': type_id,
                'norm_id': norm_id,
                'is_applicable': is_applicable,
                'applicability_reason': reason[:200]
            })

            # Save when batch is full
            if len(batch) >= batch_size:
                saved = save_batch(batch)
                total_saved += saved
                batch = []
                time.sleep(0.2)

        print(f"[{i+1}/{len(safe_types)}] {type_code}: {applicable_count} applicable, {not_applicable_count} N/A")

    # Save remaining batch
    if batch:
        saved = save_batch(batch)
        total_saved += saved

    print(f"\n{'=' * 60}")
    print(f"  COMPLETE: {total_saved} applicability rules saved")
    print(f"  Expected: {len(safe_types) * len(norms)}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
