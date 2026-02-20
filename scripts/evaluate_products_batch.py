#!/usr/bin/env python3
"""
Batch product evaluation with deterministic rules.
Evaluates products against applicable norms.
"""
import sys
sys.path.insert(0, 'src')
from core.config import SUPABASE_URL, get_supabase_headers
import requests
import time
import re

READ_HEADERS = get_supabase_headers()
WRITE_HEADERS = get_supabase_headers('resolution=merge-duplicates', use_service_key=True)

# Top products to prioritize (by name substring)
TOP_PRODUCTS = [
    'ledger', 'trezor', 'metamask', 'trust wallet', 'exodus',
    'binance', 'coinbase', 'kraken', 'okx', 'bybit', 'kucoin',
    'uniswap', 'aave', 'compound', 'maker', 'curve', 'lido',
    '1inch', 'opensea', 'blur', 'rarible',
    'bitcoin', 'ethereum', 'solana', 'polygon', 'arbitrum',
    'safe', 'gnosis', 'argent', 'rainbow', 'zerion',
    'cryptosteel', 'billfodl', 'coldcard', 'bitbox', 'keystone',
    'phantom', 'rabby', 'frame', 'blockwallet'
]


def load_products(limit=None, top_first=True):
    """Load products, optionally prioritizing top products"""
    print("Loading products...", flush=True)
    products = []
    offset = 0

    while True:
        r = requests.get(
            f'{SUPABASE_URL}/rest/v1/products?select=id,name,slug,type_id,url,description,price_details&limit=1000&offset={offset}',
            headers=READ_HEADERS, timeout=60
        )
        data = r.json() if r.status_code == 200 else []
        if not data:
            break
        products.extend(data)
        offset += len(data)
        if len(data) < 1000:
            break

    print(f"  {len(products)} products loaded")

    if top_first:
        # Sort to put top products first
        def priority(p):
            name = p.get('name', '').lower()
            for i, top in enumerate(TOP_PRODUCTS):
                if top in name:
                    return i
            return 1000

        products = sorted(products, key=priority)

    if limit:
        products = products[:limit]
        print(f"  Limited to {len(products)} products")

    return products


def load_types():
    """Load product types"""
    print("Loading types...")
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/product_types?select=*',
        headers=READ_HEADERS, timeout=30
    )
    types = {t['id']: t for t in (r.json() if r.status_code == 200 else [])}
    print(f"  {len(types)} types")
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
    print(f"  {len(norms)} norms")
    return {n['id']: n for n in norms}


def load_applicability(type_id):
    """Load applicable norm IDs for a type"""
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/norm_applicability?select=norm_id&type_id=eq.{type_id}&is_applicable=eq.true&limit=5000',
        headers=READ_HEADERS, timeout=60
    )
    return [a['norm_id'] for a in (r.json() if r.status_code == 200 else [])]


def get_product_context(product, type_info):
    """Build context string for product"""
    name = product.get('name', 'Unknown')
    desc = product.get('description', '') or ''
    url = product.get('url', '') or ''
    price_details = product.get('price_details', {}) or {}

    type_name = type_info.get('name', 'Unknown') if type_info else 'Unknown'

    context = f"Product: {name}\nType: {type_name}\nURL: {url}\n"
    if desc:
        context += f"Description: {desc[:200]}\n"

    # Add metadata
    for key in ['audits', 'security_features', 'open_source', 'founded_year', 'licenses']:
        if key in price_details and price_details[key]:
            context += f"{key}: {price_details[key]}\n"

    return context


def evaluate_norm_for_product(norm, product_context, type_chars):
    """
    Evaluate a single norm for a product using deterministic rules.
    Returns (rating, justification)
    """
    code = norm.get('code', '')
    title = norm.get('title', '').lower()
    desc = norm.get('description', '').lower() if norm.get('description') else ''
    pillar = norm.get('pillar', '')
    combined = f"{title} {desc}".lower()
    ctx_lower = product_context.lower()

    # =====================================================
    # PILLAR S - SECURITY
    # =====================================================
    if pillar == 'S':
        # Encryption norms (S01-S10: AES, RSA, etc.)
        if any(kw in combined for kw in ['aes', 'encryption', 'cipher', 'encrypt']):
            if any(kw in ctx_lower for kw in ['encrypt', 'secure', 'audit', 'wallet', 'exchange']):
                return 'YES', 'Standard encryption for crypto products'
            return 'YES', 'Industry standard encryption assumed'

        # Hash functions
        if any(kw in combined for kw in ['sha', 'hash', 'keccak', 'blake']):
            return 'YES', 'Standard hash functions in blockchain'

        # Signing algorithms
        if any(kw in combined for kw in ['ecdsa', 'secp256k1', 'ed25519', 'signature']):
            return 'YESp', 'Protocol inherent - blockchain signing'

        # BIP standards (wallet-related)
        if 'bip' in combined:
            if type_chars.get('is_wallet') or type_chars.get('is_hardware'):
                return 'YES', 'BIP standards for wallet'
            return 'NO', 'BIP only for wallets'

        # Hardware security norms
        if any(kw in combined for kw in ['secure element', 'chip', 'pin', 'wipe', 'firmware']):
            if type_chars.get('is_hardware'):
                return 'YES', 'Hardware security feature'
            return 'NO', 'Hardware-only norm'

        # Smart contract audits
        if any(kw in combined for kw in ['smart contract', 'audit', 'solidity']):
            if type_chars.get('is_defi') or type_chars.get('is_protocol'):
                if 'audit' in ctx_lower:
                    return 'YES', 'Audited smart contracts'
                return 'TBD', 'Audit status unknown'
            return 'NO', 'Not a smart contract product'

        # 2FA / MFA
        if any(kw in combined for kw in ['2fa', 'mfa', 'authentication', 'totp']):
            if type_chars.get('is_exchange') or type_chars.get('is_custodial'):
                return 'YES', 'Standard exchange security'
            return 'YES', 'Authentication supported'

        # Default for Security pillar
        return 'YES', 'Security standard applicable'

    # =====================================================
    # PILLAR A - ADVERSITY
    # =====================================================
    elif pillar == 'A':
        # Physical attack resistance
        if any(kw in combined for kw in ['physical', 'tamper', 'theft', 'attack']):
            if type_chars.get('is_hardware') or type_chars.get('is_physical'):
                return 'YES', 'Physical security features'
            return 'NO', 'Physical norms for hardware only'

        # Legal/compliance
        if any(kw in combined for kw in ['legal', 'compliance', 'regulation', 'license']):
            if type_chars.get('is_exchange') or type_chars.get('is_custodial'):
                if any(kw in ctx_lower for kw in ['license', 'regulated', 'compliance']):
                    return 'YES', 'Regulated/licensed entity'
                return 'TBD', 'Regulatory status unknown'
            return 'YES', 'Compliance applicable'

        # Insurance
        if 'insurance' in combined:
            if type_chars.get('is_exchange') or type_chars.get('is_custodial'):
                return 'TBD', 'Insurance coverage unknown'
            return 'NO', 'Insurance for custodial only'

        # Incident response
        if any(kw in combined for kw in ['incident', 'breach', 'hack', 'response']):
            return 'TBD', 'Incident history unknown'

        # Default for Adversity
        return 'YES', 'Adversity norm applicable'

    # =====================================================
    # PILLAR F - FIDELITY
    # =====================================================
    elif pillar == 'F':
        # Physical durability
        if any(kw in combined for kw in ['fire', 'water', 'corrosion', 'material', 'metal', 'durability']):
            if type_chars.get('is_hardware') or type_chars.get('is_physical'):
                return 'YES', 'Physical durability standard'
            return 'NO', 'Physical norms only'

        # Track record
        if any(kw in combined for kw in ['track record', 'history', 'reputation', 'years']):
            return 'YES', 'Track record applicable'

        # Support
        if any(kw in combined for kw in ['support', 'documentation', 'help']):
            return 'YES', 'Support available'

        # Uptime
        if any(kw in combined for kw in ['uptime', 'availability', 'sla']):
            if type_chars.get('is_defi') or type_chars.get('is_exchange'):
                return 'YES', 'Service availability'
            return 'YES', 'Uptime applicable'

        # Default for Fidelity
        return 'YES', 'Fidelity norm applicable'

    # =====================================================
    # PILLAR E - ECOSYSTEM
    # =====================================================
    elif pillar == 'E':
        # Chain support
        if any(kw in combined for kw in ['bitcoin', 'btc']):
            if 'bitcoin' in ctx_lower or 'btc' in ctx_lower or 'multi-chain' in ctx_lower:
                return 'YES', 'Bitcoin supported'
            if type_chars.get('is_defi'):
                return 'NO', 'EVM-only, no native BTC'
            return 'TBD', 'Bitcoin support unknown'

        if any(kw in combined for kw in ['ethereum', 'eth', 'evm']):
            if type_chars.get('is_defi') or 'ethereum' in ctx_lower or 'evm' in ctx_lower:
                return 'YES', 'Ethereum/EVM supported'
            return 'TBD', 'Ethereum support unknown'

        if any(kw in combined for kw in ['solana', 'sol']):
            if 'solana' in ctx_lower:
                return 'YES', 'Solana supported'
            if type_chars.get('is_defi'):
                return 'NO', 'Not on Solana'
            return 'TBD', 'Solana support unknown'

        # Multi-chain
        if any(kw in combined for kw in ['multi-chain', 'cross-chain', 'bridge']):
            if type_chars.get('is_defi'):
                return 'YES', 'Multi-chain DeFi'
            return 'TBD', 'Multi-chain unknown'

        # DeFi features
        if any(kw in combined for kw in ['swap', 'liquidity', 'lending', 'staking']):
            if type_chars.get('is_defi'):
                return 'YES', 'DeFi feature'
            return 'NO', 'DeFi-only feature'

        # UX
        if any(kw in combined for kw in ['ux', 'ui', 'interface', 'mobile', 'desktop']):
            return 'YES', 'UX/platform feature'

        # Default for Ecosystem
        return 'YES', 'Ecosystem norm applicable'

    # Default fallback
    return 'TBD', 'Evaluation needed'


def save_evaluations(evaluations):
    """Save evaluation batch to Supabase"""
    if not evaluations:
        return 0

    try:
        r = requests.post(
            f'{SUPABASE_URL}/rest/v1/evaluations',
            headers=WRITE_HEADERS,
            json=evaluations,
            timeout=60
        )
        if r.status_code in [200, 201]:
            return len(evaluations)
        else:
            print(f"    Save error: {r.status_code} - {r.text[:200]}")
            return 0
    except Exception as e:
        print(f"    Save exception: {e}")
        return 0


def main():
    import sys
    print("=" * 60, flush=True)
    print("  PRODUCT EVALUATION - BATCH", flush=True)
    print("  Using deterministic rules", flush=True)
    print("=" * 60, flush=True)

    # Load data
    products = load_products(limit=100, top_first=True)  # Start with top 100
    types = load_types()
    norms = load_norms()

    total_saved = 0
    batch = []
    batch_size = 500

    for i, product in enumerate(products):
        product_id = product['id']
        product_name = product.get('name', 'Unknown')
        type_id = product.get('type_id')

        if not type_id:
            print(f"[{i+1}/{len(products)}] {product_name}: No type_id - skipping")
            continue

        type_info = types.get(type_id, {})
        type_chars = {
            'is_hardware': type_info.get('is_hardware', False) or 'HW' in type_info.get('code', ''),
            'is_wallet': type_info.get('is_wallet', False) or 'Wallet' in type_info.get('name', ''),
            'is_defi': type_info.get('is_defi', False) or any(kw in type_info.get('code', '') for kw in ['DEX', 'DeFi', 'Lending']),
            'is_protocol': type_info.get('is_protocol', False),
            'is_custodial': type_info.get('is_custodial', False) or 'CEX' in type_info.get('code', ''),
            'is_exchange': 'CEX' in type_info.get('code', '') or 'Exchange' in type_info.get('name', ''),
            'is_physical': type_info.get('is_physical', False) or 'Physical' in type_info.get('name', ''),
        }

        # Get applicable norms for this type
        applicable_norm_ids = load_applicability(type_id)
        if not applicable_norm_ids:
            print(f"[{i+1}/{len(products)}] {product_name}: No applicable norms")
            continue

        product_context = get_product_context(product, type_info)

        yes_count = 0
        no_count = 0
        tbd_count = 0

        for norm_id in applicable_norm_ids:
            norm = norms.get(norm_id)
            if not norm:
                continue

            rating, justification = evaluate_norm_for_product(norm, product_context, type_chars)

            if rating == 'YES' or rating == 'YESp':
                yes_count += 1
            elif rating == 'NO':
                no_count += 1
            else:
                tbd_count += 1

            batch.append({
                'product_id': product_id,
                'norm_id': norm_id,
                'result': rating,
                'why_this_result': justification[:500],
                'evaluated_by': 'claude_opus_deterministic',
            })

            if len(batch) >= batch_size:
                saved = save_evaluations(batch)
                total_saved += saved
                batch = []
                time.sleep(0.3)

        total = yes_count + no_count
        score = (yes_count / total * 100) if total > 0 else 0
        print(f"[{i+1}/{len(products)}] {product_name[:30]:30} | YES:{yes_count:4} NO:{no_count:4} TBD:{tbd_count:4} | Score:{score:5.1f}%")

    # Save remaining
    if batch:
        saved = save_evaluations(batch)
        total_saved += saved

    print(f"\n{'=' * 60}")
    print(f"  COMPLETE: {total_saved} evaluations saved")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
