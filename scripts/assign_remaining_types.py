#!/usr/bin/env python3
"""
ASSIGN TYPES TO REMAINING PRODUCTS
==================================
Intelligent assignment of types to products that couldn't be matched automatically.
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

# Specific product name -> type mapping (exact or pattern)
SPECIFIC_MAPPINGS = {
    # Security Keys (FIDO2/Hardware) -> Hardware Wallet Cold (security hardware)
    'yubikey': 'Hardware Wallet Cold',
    'solokey': 'Hardware Wallet Cold',
    'nitrokey': 'Hardware Wallet Cold',
    'onlykey': 'Hardware Wallet Cold',
    'feitian': 'Hardware Wallet Cold',
    'thetis': 'Hardware Wallet Cold',
    'gotrust': 'Hardware Wallet Cold',

    # Security/Privacy Software -> Privacy Protocol
    'tails os': 'Privacy Protocol',
    'whonix': 'Privacy Protocol',
    'qubes os': 'Privacy Protocol',
    'brave browser': 'Privacy Protocol',

    # Password Managers -> Developer Tools (security tools)
    '1password': 'Developer Tools',
    'bitwarden': 'Developer Tools',

    # Crypto Accessories -> Physical Backup (Metal)
    'faraday bag': 'Physical Backup (Metal)',
    'hardware wallet case': 'Physical Backup (Metal)',
    'usb data blocker': 'Physical Backup (Metal)',
    'privacy screen': 'Physical Backup (Metal)',
    'webcam cover': 'Physical Backup (Metal)',
    'encrypted usb': 'Physical Backup (Metal)',
    'air-gapped': 'Physical Backup (Metal)',

    # Physical Crypto Collectibles -> Real World Assets
    'casascius': 'Real World Assets',
    'crypto stamp': 'Real World Assets',
    'btcc mint': 'Real World Assets',
    'alitin mint': 'Real World Assets',
    'crypto merch': 'Real World Assets',

    # NFT Physical -> NFT Marketplace
    'azuki pbt': 'NFT Marketplace',
    'iyk': 'NFT Marketplace',
    'rtfkt': 'NFT Marketplace',
    'courtyard': 'NFT Marketplace',
    '4k (tokenized': 'NFT Marketplace',

    # Bitcoin L2 / Sidechains -> Layer 2 Solution
    'bob (build on bitcoin)': 'Layer 2 Solution',
    'bevm': 'Layer 2 Solution',
    'citrea': 'Layer 2 Solution',
    'babylon': 'Layer 2 Solution',

    # DAOs and Governance -> DAO Tools
    'aragon': 'DAO Tools',
    'boardroom': 'DAO Tools',
    'colony': 'DAO Tools',
    'snapshot': 'DAO Tools',
    'tally': 'DAO Tools',
    'llama': 'DAO Tools',

    # Stablecoins -> Stablecoin
    'angle protocol': 'Stablecoin',
    'ethena': 'Stablecoin',
    'raft': 'Stablecoin',
    'prisma': 'Stablecoin',
    'reserve': 'Stablecoin',
    'liquity': 'Stablecoin',
    'crvusd': 'Stablecoin',

    # Gift Cards / Spending -> Fiat On/Off Ramp
    'bitrefill': 'Fiat On/Off Ramp',
    'bidali': 'Fiat On/Off Ramp',
    'coingate gift': 'Fiat On/Off Ramp',

    # Savings Apps -> CeFi Lending / Earn
    '21bitcoin': 'CeFi Lending / Earn',
    'bitstack': 'CeFi Lending / Earn',
    'amber group': 'Prime Brokerage',
    'b2c2': 'Prime Brokerage',

    # Prediction Markets -> Prediction Market
    'azuro': 'Prediction Market',
    'polymarket': 'Prediction Market',
    'kalshi': 'Prediction Market',

    # Address Generators -> Developer Tools
    'bitaddress': 'Developer Tools',
    'vanity-eth': 'Developer Tools',

    # Decentralized Identity
    'ens': 'Decentralized Identity',
    'unstoppable domains': 'Decentralized Identity',
    'lens protocol': 'Decentralized Identity',
    'spruce': 'Decentralized Identity',
    'ceramic': 'Decentralized Identity',

    # OTC / Market Makers -> OTC / P2P Trading
    'cumberland': 'OTC / P2P Trading',
    'enigma securities': 'OTC / P2P Trading',
    'falconx': 'OTC / P2P Trading',
    'flowdesk': 'OTC / P2P Trading',
    'gsr': 'OTC / P2P Trading',
    'galaxy otc': 'OTC / P2P Trading',
    'jump crypto': 'OTC / P2P Trading',
    'keyrock': 'OTC / P2P Trading',
    'nonco': 'OTC / P2P Trading',
    'woorton': 'OTC / P2P Trading',
    'wintermute': 'OTC / P2P Trading',
    'xbto': 'OTC / P2P Trading',
    'genesis': 'OTC / P2P Trading',
    'b2c2': 'OTC / P2P Trading',

    # More DAOs
    'coordinape': 'DAO Tools',
    'deepdao': 'DAO Tools',
    'daohaus': 'DAO Tools',
    'juicebox': 'DAO Tools',
    'party protocol': 'DAO Tools',
    'syndicate': 'DAO Tools',
    'safe dao': 'DAO Tools',
    'utopia labs': 'DAO Tools',

    # Bitcoin Layers / Sidechains
    'lightning network': 'Layer 2 Solution',
    'liquid network': 'Layer 2 Solution',
    'rgb protocol': 'Layer 2 Solution',
    'rootstock': 'Layer 2 Solution',
    'rsk': 'Layer 2 Solution',
    'stacks': 'Layer 2 Solution',
    'merlin chain': 'Layer 2 Solution',
    'core chain': 'Layer 2 Solution',

    # More Stablecoins
    'dyad': 'Stablecoin',
    'gyroscope': 'Stablecoin',
    'reflexer': 'Stablecoin',

    # More Privacy Tools
    'protonmail': 'Privacy Protocol',
    'simplelogin': 'Privacy Protocol',
    'tutanota': 'Privacy Protocol',
    'signal': 'Privacy Protocol',
    'tor browser': 'Privacy Protocol',
    'keepassxc': 'Privacy Protocol',

    # More Prediction Markets
    'gnosis prediction': 'Prediction Market',
    'hedgehog markets': 'Prediction Market',
    'zeitgeist': 'Prediction Market',

    # Physical Bitcoin / Collectibles
    'denarium': 'Real World Assets',
    'lealana': 'Real World Assets',
    'titan bitcoin': 'Real World Assets',

    # Bitcoin DCA / Savings Apps
    'getbittr': 'Fiat On/Off Ramp',
    'relai': 'Fiat On/Off Ramp',
    'pocket bitcoin': 'Fiat On/Off Ramp',
    'lolli': 'Fiat On/Off Ramp',
    'satsback': 'Fiat On/Off Ramp',
    'stackinsat': 'Fiat On/Off Ramp',
    'fold app': 'Fiat On/Off Ramp',
    'the bitcoin company': 'Fiat On/Off Ramp',

    # RWA / ETF
    'grayscale': 'Real World Assets',

    # Perpetual DEX
    'drift protocol': 'Perpetual DEX',

    # MEV
    'mev blocker': 'MEV Protection',

    # Developer Tools / Generators
    'walletgenerator': 'Developer Tools',

    # NFT / Physical NFT
    'an1': 'NFT Marketplace',
    'another-1': 'NFT Marketplace',
    'legitimate': 'NFT Marketplace',
    'arianee': 'NFT Marketplace',

    # Restaking -> Restaking Protocol
    'eigenlayer': 'Restaking Protocol',
    'etherfi': 'Restaking Protocol',
    'kelp': 'Restaking Protocol',
    'renzo': 'Restaking Protocol',
    'puffer': 'Restaking Protocol',

    # Liquid Staking
    'lido': 'Liquid Staking',
    'rocket pool': 'Liquid Staking',
    'stakewise': 'Liquid Staking',
    'swell': 'Liquid Staking',
    'frax eth': 'Liquid Staking',
    'stader': 'Liquid Staking',
    'mantle lsp': 'Liquid Staking',
    'coinbase cbeth': 'Liquid Staking',
    'binance beth': 'Liquid Staking',

    # MEV Protection
    'flashbots': 'MEV Protection',
    'cow swap': 'MEV Protection',
    'bloXroute': 'MEV Protection',

    # Intent Protocols -> Intent Protocol
    'cowswap': 'Intent Protocol',
    '1inch fusion': 'Intent Protocol',
    'uniswap x': 'Intent Protocol',

    # Synthetic Assets
    'synthetix': 'Synthetic Assets Protocol',
    'gmx': 'Perpetual DEX',
    'dydx': 'Perpetual DEX',
    'vertex': 'Perpetual DEX',
    'hyperliquid': 'Perpetual DEX',

    # Social Finance
    'friend.tech': 'SocialFi Platform',
    'farcaster': 'SocialFi Platform',
    'warpcast': 'SocialFi Platform',
    'hey': 'SocialFi Platform',

    # Airdrop/Quest
    'galxe': 'Airdrop / Quest Platform',
    'layer3': 'Airdrop / Quest Platform',
    'rabbithole': 'Airdrop / Quest Platform',
    'zealy': 'Airdrop / Quest Platform',

    # Default fallback for remaining
    'token': 'Real World Assets',
    'finance': 'DeFi Tools & Analytics',
    'swap': 'Decentralized Exchange',
    'vault': 'Yield Aggregator',
    'lend': 'DeFi Lending Protocol',
}


def load_types():
    r = requests.get(f'{SUPABASE_URL}/rest/v1/product_types?select=id,name', headers=READ_HEADERS, timeout=30)
    return {t['name']: t['id'] for t in (r.json() if r.status_code == 200 else [])}


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


def find_type(product, types_dict):
    """Find the best type for a product."""
    name = (product.get('name', '') or '').lower()
    slug = (product.get('slug', '') or '').lower()
    desc = (product.get('description', '') or '').lower()
    combined = f"{name} {slug} {desc}"

    # Check specific mappings first
    for pattern, type_name in SPECIFIC_MAPPINGS.items():
        if pattern in name or pattern in slug:
            type_id = types_dict.get(type_name)
            if type_id:
                return type_id, type_name

    # Check in description
    for pattern, type_name in SPECIFIC_MAPPINGS.items():
        if pattern in desc:
            type_id = types_dict.get(type_name)
            if type_id:
                return type_id, type_name

    return None, None


def main():
    print("=" * 70, flush=True)
    print("  ASSIGN TYPES TO REMAINING PRODUCTS", flush=True)
    print("=" * 70, flush=True)

    types_dict = load_types()
    print(f"Loaded {len(types_dict)} types", flush=True)

    products = load_products_without_type()
    print(f"Products without type: {len(products)}", flush=True)

    assigned = 0
    not_assigned = []

    for product in products:
        type_id, type_name = find_type(product, types_dict)

        if type_id:
            r = requests.patch(
                f'{SUPABASE_URL}/rest/v1/products?id=eq.{product["id"]}',
                headers=WRITE_HEADERS,
                json={'type_id': type_id},
                timeout=30
            )
            if r.status_code in [200, 204]:
                assigned += 1
                name_clean = product['name'].encode('ascii', 'ignore').decode('ascii')
                print(f"  {name_clean[:40]:40} -> {type_name}", flush=True)
            else:
                print(f"  ERROR: {product['name']} - {r.status_code}", flush=True)
        else:
            not_assigned.append(product['name'])

    print("=" * 70, flush=True)
    print(f"Assigned: {assigned}", flush=True)
    print(f"Not assigned: {len(not_assigned)}", flush=True)

    if not_assigned:
        print("\nProducts still without type (need manual review):", flush=True)
        for name in not_assigned:
            name_clean = name.encode('ascii', 'ignore').decode('ascii')
            print(f"  - {name_clean}", flush=True)


if __name__ == "__main__":
    main()
