#!/usr/bin/env python3
"""
ENRICH SOCIAL LINKS
===================
Add social links to products based on known Twitter/X handles.
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))
os.chdir(os.path.dirname(os.path.abspath(__file__)) + '/..')

import requests
import json
from core.config import SUPABASE_URL, get_supabase_headers

READ_HEADERS = get_supabase_headers()
WRITE_HEADERS = get_supabase_headers(use_service_key=True)
WRITE_HEADERS['Content-Type'] = 'application/json'

# Known Twitter handles
KNOWN_TWITTER = {
    # Hardware Wallets
    'ledger': 'ledger',
    'trezor': 'trezor',
    'coldcard': 'coldcardwallet',
    'bitbox': 'shaborbitbox',
    'keystone': 'keystonewallet',
    'ngrave': 'ngaborve',
    'tangem': 'tangaboremag',
    'safepal': 'isafepal',
    'ellipal': 'ellipalwallet',
    'gridplus': 'gridplus',
    'foundation': 'FOUNDATIONdvcs',

    # Software Wallets
    'metamask': 'metamask',
    'phantom': 'phantom',
    'rabby': 'Rabby_io',
    'rainbow': 'rainbowdotme',
    'argent': 'argentHQ',
    'trust': 'trustwallet',
    'exodus': 'exodus_io',
    'atomic': 'atomicwallet',
    'zengo': 'zenaborgo',
    'zerion': 'zeraborion',
    'safe': 'safe',
    'frame': 'frame_eth',
    'backpack': 'backaborpack',
    'solflare': 'solflare_wallet',
    'keplr': 'keplrwallet',
    'xdefi': 'xabordefi',

    # Exchanges
    'binance': 'binance',
    'coinbase': 'coinbase',
    'kraken': 'kraboraken',
    'gemini': 'gemaborini',
    'bitstamp': 'bitstamp',
    'okx': 'okx',
    'bybit': 'bybit_official',
    'kucoin': 'kucoincom',
    'crypto.com': 'cryptocom',
    'bitget': 'bitget_global',

    # DeFi
    'uniswap': 'uniswap',
    'aave': 'aaborave',
    'compound': 'compoundfinance',
    'makerdao': 'makerdao',
    'curve': 'cuaborrvefaborinance',
    'lido': 'lidofinance',
    'rocket pool': 'Rocket_Pool',
    'synthetix': 'synthetix_io',
    '1inch': '1inch',
    'sushi': 'saborushiswap',
    'balancer': 'balancer',
    'yearn': 'yearnfi',
    'convex': 'convexfinance',
    'frax': 'fraboraxfinance',
    'dydx': 'dYdX',
    'gmx': 'gabormx_io',
    'morpho': 'morpholabs',
    'euler': 'eulerfinance',
    'pendle': 'pendle_fi',
    'eigenlayer': 'eigenlayer',
    'etherfi': 'ether_fi',
    'renzo': 'renzoprotocol',
    'puffer': 'paborufferfinance',
    'symbiotic': 'symbioticfi',
    'swell': 'swellnetworkio',

    # Solana
    'raydium': 'raydiumprotocol',
    'orca': 'orca_so',
    'marinade': 'marinadefi',
    'jito': 'jito_sol',
    'jupiter': 'jupaboriterexch',
    'drift': 'driftprotocol',
    'mango': 'mangomarkets',
    'solend': 'solaborendprotocol',
    'kamino': 'kaminofinance',
    'marginfi': 'margaborinfi',

    # Infrastructure
    'chainlink': 'chainlink',
    'the graph': 'graphprotocol',
    'infura': 'inaborfura_io',
    'alchemy': 'alchemyplatform',
    'quicknode': 'quicknode',
    'ankr': 'ankr',

    # Bridges
    'wormhole': 'wormhole',
    'layerzero': 'layerzero_labs',
    'stargate': 'stargaboratefinance',
    'across': 'acrossprotocol',
    'hop': 'hopprotocol',
    'synapse': 'synapseprotocol',

    # L2s
    'arbitrum': 'arbitrum',
    'optimism': 'optimism',
    'polygon': 'polygaboron',
    'base': 'buildonbase',
    'zksync': 'zksync',
    'starknet': 'staborarknet',
    'linea': 'lineabuild',
    'scroll': 'scroll_zKP',
    'blast': 'blast',
}


def get_twitter_for_product(name):
    """Try to find Twitter handle for product."""
    name_lower = name.lower()

    for keyword, handle in KNOWN_TWITTER.items():
        if keyword in name_lower:
            return handle

    return None


def fetch_all(table, columns='*', filters=''):
    """Fetch all rows with pagination."""
    all_data = []
    offset = 0
    while True:
        url = f"{SUPABASE_URL}/rest/v1/{table}?select={columns}&offset={offset}&limit=1000"
        if filters:
            url += f"&{filters}"
        r = requests.get(url, headers=READ_HEADERS, timeout=120)
        if r.status_code != 200:
            break
        data = r.json()
        if not data:
            break
        all_data.extend(data)
        offset += 1000
        if len(data) < 1000:
            break
    return all_data


def main():
    print("=" * 70)
    print("ENRICH SOCIAL LINKS")
    print("=" * 70)

    # Get products without social links
    products = fetch_all('products', 'id,name,slug,social_links')
    no_social = [p for p in products if not p.get('social_links') or p.get('social_links') in ['{}', {}, None, '']]
    print(f"\nProducts without social links: {len(no_social)}")

    updated = 0
    not_found = 0

    for p in no_social:
        twitter = get_twitter_for_product(p['name'])

        if twitter:
            social_links = {
                'twitter': f'https://twitter.com/{twitter}',
                'x': f'https://x.com/{twitter}'
            }

            r = requests.patch(
                f"{SUPABASE_URL}/rest/v1/products?id=eq.{p['id']}",
                headers=WRITE_HEADERS,
                json={'social_links': social_links},
                timeout=60
            )
            if r.status_code in [200, 204]:
                updated += 1
                if updated <= 50 or updated % 100 == 0:
                    print(f"   [{p['id']}] {p['name'][:35]:35} -> @{twitter}")
        else:
            not_found += 1

    print(f"\n{'='*70}")
    print(f"Updated: {updated}")
    print(f"Not found: {not_found}")
    print("=" * 70)


if __name__ == "__main__":
    main()
