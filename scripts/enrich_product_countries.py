#!/usr/bin/env python3
"""
ENRICH PRODUCT COUNTRIES
========================
Add country_origin to products based on known company locations.
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))
os.chdir(os.path.dirname(os.path.abspath(__file__)) + '/..')

import requests
from datetime import datetime
from core.config import SUPABASE_URL, get_supabase_headers

READ_HEADERS = get_supabase_headers()
WRITE_HEADERS = get_supabase_headers(use_service_key=True)
WRITE_HEADERS['Content-Type'] = 'application/json'

# Known product origins (company HQ country codes)
KNOWN_ORIGINS = {
    # Hardware Wallets
    'ledger': 'FR',
    'trezor': 'CZ',
    'coldcard': 'CA',
    'bitbox': 'CH',
    'keystone': 'HK',
    'ngrave': 'BE',
    'tangem': 'CH',
    'safepal': 'CN',
    'ellipal': 'HK',
    'keepkey': 'US',
    'archos': 'FR',
    'cobo': 'CN',
    'secux': 'TW',
    'coolwallet': 'TW',
    'gridplus': 'US',
    'foundation': 'US',

    # Software Wallets
    'metamask': 'US',
    'phantom': 'US',
    'rabby': 'SG',
    'rainbow': 'US',
    'argent': 'UK',
    'trust': 'US',
    'coinbase': 'US',
    'exodus': 'US',
    'atomic': 'EE',
    'zengo': 'IL',
    'zerion': 'US',
    'safe': 'DE',
    'gnosis': 'DE',
    'frame': 'US',
    'backpack': 'US',
    'solflare': 'US',
    'keplr': 'KR',
    'leap': 'US',
    'xdefi': 'UK',
    'rabby': 'SG',
    'brave': 'US',
    'opera': 'NO',
    'mytonwallet': 'RU',
    'tonkeeper': 'UK',

    # Exchanges
    'binance': 'KY',
    'coinbase': 'US',
    'kraken': 'US',
    'gemini': 'US',
    'bitstamp': 'LU',
    'bitfinex': 'HK',
    'okx': 'SC',
    'bybit': 'AE',
    'kucoin': 'SC',
    'huobi': 'SC',
    'gate': 'KY',
    'crypto.com': 'SG',
    'ftx': 'BS',
    'bitget': 'SC',
    'mexc': 'SC',
    'bitmart': 'KY',

    # DeFi - Ethereum
    'uniswap': 'US',
    'aave': 'UK',
    'compound': 'US',
    'makerdao': 'DK',
    'curve': 'CH',
    'lido': 'KY',
    'rocket pool': 'AU',
    'synthetix': 'AU',
    '1inch': 'KY',
    'sushiswap': 'JP',
    'balancer': 'PT',
    'yearn': 'US',
    'convex': 'US',
    'frax': 'US',
    'olympus': 'US',
    'ribbon': 'US',
    'dydx': 'US',
    'gmx': 'KY',
    'gains': 'US',
    'perp': 'TW',
    'instadapp': 'IN',
    'defisaver': 'HR',
    'morpho': 'FR',
    'euler': 'UK',
    'radiant': 'US',
    'pendle': 'SG',
    'eigenlayer': 'US',
    'etherfi': 'US',
    'renzo': 'US',
    'kelp': 'IN',
    'puffer': 'US',
    'symbiotic': 'US',
    'swell': 'AU',
    'stakewise': 'CH',

    # Solana
    'raydium': 'US',
    'orca': 'US',
    'marinade': 'CZ',
    'jito': 'US',
    'jupiter': 'SG',
    'drift': 'US',
    'mango': 'US',
    'solend': 'US',
    'kamino': 'US',
    'marginfi': 'US',

    # Cosmos
    'osmosis': 'US',
    'stride': 'US',
    'astroport': 'US',
    'mars': 'CH',

    # Infrastructure
    'chainlink': 'KY',
    'the graph': 'US',
    'infura': 'US',
    'alchemy': 'US',
    'quicknode': 'US',
    'moralis': 'SE',
    'ankr': 'US',

    # Bridges
    'wormhole': 'US',
    'layerzero': 'CA',
    'stargate': 'CA',
    'across': 'US',
    'hop': 'US',
    'synapse': 'US',
    'celer': 'US',
    'multichain': 'CN',
    'portal': 'US',
    'socket': 'IN',

    # L2s
    'arbitrum': 'US',
    'optimism': 'US',
    'polygon': 'IN',
    'base': 'US',
    'zksync': 'DE',
    'starknet': 'IL',
    'linea': 'US',
    'scroll': 'US',
    'mantle': 'HK',
    'blast': 'US',
    'mode': 'US',

    # Oracles
    'pyth': 'US',
    'api3': 'CH',
    'redstone': 'PL',
    'uma': 'US',
    'band': 'TH',
    'tellor': 'US',

    # Insurance
    'nexus mutual': 'UK',
    'insurace': 'SG',
    'unslashed': 'FR',

    # Backups
    'cryptosteel': 'CZ',
    'billfodl': 'US',
    'cryptotag': 'NL',
    'blockplate': 'US',
    'hodlr': 'CH',
    'seedplate': 'DE',
}


def get_country_for_product(name):
    """Try to determine country from product name."""
    name_lower = name.lower()

    for keyword, country in KNOWN_ORIGINS.items():
        if keyword in name_lower:
            return country

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
    print("ENRICH PRODUCT COUNTRIES")
    print("=" * 70)

    # Get products without country
    products = fetch_all('products', 'id,name,slug,country_origin', 'country_origin=is.null')
    print(f"\nProducts without country: {len(products)}")

    updated = 0
    not_found = 0

    for p in products:
        country = get_country_for_product(p['name'])

        if country:
            r = requests.patch(
                f"{SUPABASE_URL}/rest/v1/products?id=eq.{p['id']}",
                headers=WRITE_HEADERS,
                json={'country_origin': country},
                timeout=60
            )
            if r.status_code in [200, 204]:
                updated += 1
                if updated <= 50 or updated % 100 == 0:
                    print(f"   [{p['id']}] {p['name'][:35]:35} -> {country}")
        else:
            not_found += 1

    print(f"\n{'='*70}")
    print(f"Updated: {updated}")
    print(f"Not found: {not_found}")
    print("=" * 70)


if __name__ == "__main__":
    main()
