#!/usr/bin/env python3
"""
AUTO-ASSIGN PRODUCT TYPES
=========================
Assigns type_id to products based on name/slug patterns.
"""
import sys
sys.path.insert(0, 'src')
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)) + '/..')

from core.config import SUPABASE_URL, get_supabase_headers
import requests
import re

READ_HEADERS = get_supabase_headers()
WRITE_HEADERS = get_supabase_headers(use_service_key=True)
WRITE_HEADERS['Content-Type'] = 'application/json'
WRITE_HEADERS['Prefer'] = 'return=minimal'


def load_types():
    r = requests.get(f'{SUPABASE_URL}/rest/v1/product_types?select=id,name', headers=READ_HEADERS, timeout=30)
    return {t['name'].lower(): t['id'] for t in (r.json() if r.status_code == 200 else [])}


def load_products_without_type():
    products = []
    offset = 0
    while True:
        r = requests.get(f'{SUPABASE_URL}/rest/v1/products?select=id,name,slug,description&type_id=is.null&limit=500&offset={offset}',
                        headers=READ_HEADERS, timeout=60)
        if r.status_code != 200 or not r.json():
            break
        products.extend(r.json())
        offset += len(r.json())
        if len(r.json()) < 500:
            break
    return products


# Pattern to type mapping (lowercase)
TYPE_PATTERNS = {
    # Wallets
    'hardware wallet cold': [
        r'ledger', r'trezor', r'coldcard', r'ngrave', r'keystone', r'bitbox', r'ellipal',
        r'secux', r'coolwallet', r'safepal', r'bc vault', r'archos', r'passport', r'jade',
        r'cobo vault', r'prokey', r'onekey', r'd\'cent', r'tangem', r'gridplus', r'cypherock'
    ],
    'mobile wallet': [
        r'wallet app', r'mobile wallet', r'trustwallet', r'metamask mobile', r'exodus mobile',
        r'coinbase wallet', r'phantom', r'solflare', r'rainbow', r'zerion', r'argent'
    ],
    'browser extension wallet': [
        r'browser extension', r'chrome extension', r'metamask', r'rabby'
    ],
    'desktop wallet': [
        r'desktop wallet', r'electrum', r'wasabi', r'sparrow', r'specter'
    ],
    'physical backup (metal)': [
        r'cryptosteel', r'billfodl', r'cryptotag', r'blockplate', r'coldti', r'seedsteel',
        r'steelwallet', r'hodlr', r'keystone tablet', r'safu ninja', r'material', r'x-seed',
        r'bundle backup', r'coinplate', r'trezor keep', r'seedkeeper', r'cryo card',
        r'safeword', r'titanium seed', r'cryptodock', r'keypunx', r'seed phrase steel'
    ],
    'digital backup': [
        r'digital backup', r'cloud backup', r'seedxor', r'shamir'
    ],
    'centralized exchange': [
        r'\bexchange\b', r'\bcex\b', r'binance', r'coinbase', r'kraken', r'gemini', r'bitstamp',
        r'bitfinex', r'kucoin', r'okx', r'bybit', r'htx', r'huobi', r'gate\.io', r'bitget',
        r'mexc', r'crypto\.com', r'upbit', r'bithumb', r'coinone', r'probit', r'bitso'
    ],
    'decentralized exchange': [
        r'\bdex\b', r'uniswap', r'sushiswap', r'pancakeswap', r'curve', r'balancer',
        r'quickswap', r'spookyswap', r'trader joe', r'raydium', r'orca', r'osmosis'
    ],
    'defi lending protocol': [
        r'lending', r'\baave\b', r'compound', r'maker', r'morpho', r'spark', r'radiant',
        r'venus', r'benqi', r'iron bank'
    ],
    'yield aggregator': [
        r'yield', r'yearn', r'beefy', r'convex', r'alpaca', r'autofarm', r'harvest'
    ],
    'liquid staking': [
        r'staking', r'\blido\b', r'rocket pool', r'stakewise', r'swell', r'eigenlayer',
        r'marinade', r'jito', r'ankr staking'
    ],
    'cross-chain bridge': [
        r'bridge', r'wormhole', r'layerzero', r'multichain', r'hop', r'across', r'stargate',
        r'synapse', r'celer'
    ],
    'stablecoin': [
        r'usdt', r'usdc', r'dai\b', r'frax', r'tusd', r'busd', r'gusd', r'lusd', r'eusd',
        r'pyusd', r'gho\b', r'crvusd', r'usual', r'stablecoin'
    ],
    'crypto card (custodial)': [
        r'\bcard\b', r'visa', r'mastercard', r'crypto card', r'debit card'
    ],
    'crypto bank': [
        r'\bbank\b', r'neobank', r'fintech', r'n26', r'revolut', r'wise', r'monzo'
    ],
    'oracle protocol': [
        r'oracle', r'chainlink', r'band', r'dia\b', r'api3', r'pyth'
    ],
    'layer 2 solution': [
        r'layer 2', r'l2\b', r'rollup', r'arbitrum', r'optimism', r'base\b', r'zksync',
        r'polygon', r'starknet', r'scroll', r'linea', r'mantle'
    ],
    'privacy protocol': [
        r'privacy', r'mixer', r'tornado', r'zcash', r'monero'
    ],
    'crypto tax software': [
        r'tax', r'koinly', r'cointracker', r'tokentax', r'accointing', r'cryptotax'
    ],
    'developer tools': [
        r'developer', r'sdk', r'api\b', r'infura', r'alchemy', r'quicknode'
    ],
    'research & intelligence': [
        r'research', r'analytics', r'nansen', r'dune', r'messari', r'glassnode',
        r'coinmarketcap', r'coingecko', r'defillama'
    ],
    'defi insurance': [
        r'insurance', r'nexus mutual', r'insurace', r'cover', r'bridge mutual'
    ],
    'mpc wallet': [
        r'\bmpc\b', r'fireblocks', r'fordefi', r'copper', r'liminal'
    ],
    'multisig wallet': [
        r'multisig', r'gnosis safe', r'safe\{wallet\}', r'squads'
    ],
    'institutional custody': [
        r'custody', r'institutional', r'prime trust', r'anchorage', r'bitgo'
    ],
}


def guess_type(product, types_dict):
    """Guess the product type based on name patterns."""
    name = (product.get('name', '') or '').lower()
    slug = (product.get('slug', '') or '').lower()
    desc = (product.get('description', '') or '').lower()

    combined = f"{name} {slug} {desc}"

    for type_name, patterns in TYPE_PATTERNS.items():
        type_id = types_dict.get(type_name)
        if not type_id:
            continue
        for pattern in patterns:
            if re.search(pattern, combined, re.IGNORECASE):
                return type_id, type_name

    return None, None


def main():
    print("=" * 70, flush=True)
    print("  AUTO-ASSIGN PRODUCT TYPES", flush=True)
    print("=" * 70, flush=True)

    types_dict = load_types()
    print(f"Loaded {len(types_dict)} types", flush=True)

    products = load_products_without_type()
    print(f"Products without type: {len(products)}", flush=True)

    assigned = 0
    not_assigned = []

    for product in products:
        type_id, type_name = guess_type(product, types_dict)

        if type_id:
            r = requests.patch(
                f'{SUPABASE_URL}/rest/v1/products?id=eq.{product["id"]}',
                headers=WRITE_HEADERS,
                json={'type_id': type_id},
                timeout=30
            )
            if r.status_code in [200, 204]:
                assigned += 1
                print(f"  {product['name'][:40]:40} -> {type_name}", flush=True)
            else:
                print(f"  ERROR: {product['name']} - {r.status_code}", flush=True)
        else:
            not_assigned.append(product['name'])

    print("=" * 70, flush=True)
    print(f"Assigned: {assigned}", flush=True)
    print(f"Not assigned: {len(not_assigned)}", flush=True)

    if not_assigned:
        print("\nProducts not assigned (need manual review):", flush=True)
        for name in not_assigned[:50]:
            print(f"  - {name}", flush=True)


if __name__ == "__main__":
    main()
