"""
AUTO INCIDENTS IMPORTER
========================
Automatically fetches and imports security incidents from multiple sources:
- DeFiLlama Hacks API
- Rekt News Database
- De.Fi REKT Database

Uses AI (Mistral) to intelligently match protocol names to our products.
Can be run daily via cron/scheduler.
"""
import requests
import re
import json
import time
from datetime import datetime
from difflib import SequenceMatcher

SUPABASE_URL = 'https://ajdncttomdqojlozxjxu.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqZG5jdHRvbWRxb2psb3p4anh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0MjMwNzUsImV4cCI6MjA3OTk5OTA3NX0.tTgqj-ALcl0oIdxFHuFQkB19apiz9CSyvV2X1TMWjEk'
MISTRAL_API_KEY = '1UrlJxV2G7O0kngOXMDI1dMT2xT39rLD'

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
}

# ============================================================
# DATA SOURCES
# ============================================================

def fetch_defillama_hacks():
    """Fetch hacks from DeFiLlama API"""
    print("  Fetching from DeFiLlama...")
    try:
        r = requests.get('https://api.llama.fi/hacks', timeout=30)
        if r.status_code == 200:
            hacks = r.json()
            print(f"    -> {len(hacks)} hacks found")
            return [{
                'source': 'defillama',
                'name': h.get('name', ''),
                'date': datetime.fromtimestamp(h['date']).strftime('%Y-%m-%d') if h.get('date') else None,
                'amount': h.get('amount') or 0,
                'returned': h.get('returnedFunds') or 0,
                'technique': h.get('technique', ''),
                'classification': h.get('classification', ''),
                'chain': h.get('chain', ''),
                'target_type': h.get('targetType', ''),
                'source_url': h.get('source', ''),
            } for h in hacks if h.get('name')]
    except Exception as e:
        print(f"    Error: {e}")
    return []

def fetch_defi_rekt():
    """Fetch from De.Fi REKT database API"""
    print("  Fetching from De.Fi REKT...")
    try:
        r = requests.get('https://de.fi/api/rekt', timeout=30)
        if r.status_code == 200:
            data = r.json()
            hacks = data.get('data', []) if isinstance(data, dict) else data
            print(f"    -> {len(hacks)} hacks found")
            return [{
                'source': 'defi_rekt',
                'name': h.get('project', h.get('name', '')),
                'date': h.get('date', ''),
                'amount': float(h.get('fundsLost', 0) or 0),
                'returned': float(h.get('fundsReturned', 0) or 0),
                'technique': h.get('technique', h.get('type', '')),
                'classification': h.get('category', ''),
                'chain': h.get('chain', ''),
                'target_type': h.get('targetType', ''),
                'source_url': h.get('link', ''),
            } for h in hacks if h.get('project') or h.get('name')]
    except Exception as e:
        print(f"    Error: {e}")
    return []

def get_major_hacks_manual():
    """
    Manual database of major hacks from Rekt News & SlowMist
    that may not be in DeFiLlama or have different names
    """
    print("  Loading manual major hacks database...")
    hacks = [
        # Top CEX hacks
        {'name': 'Bybit', 'date': '2025-02-21', 'amount': 1440000000, 'technique': 'Private Key Compromise', 'chain': 'Multiple'},
        {'name': 'Ronin Network', 'date': '2022-03-23', 'amount': 624000000, 'technique': 'Private Key Compromise', 'chain': 'Ronin'},
        {'name': 'Poly Network', 'date': '2021-08-10', 'amount': 611000000, 'technique': 'Access Control', 'chain': 'Multiple'},
        {'name': 'Binance', 'date': '2022-10-06', 'amount': 586000000, 'technique': 'Bridge Exploit', 'chain': 'BSC'},
        {'name': 'FTX', 'date': '2022-11-12', 'amount': 477000000, 'technique': 'Insider Theft', 'chain': 'Multiple'},
        {'name': 'Wormhole', 'date': '2022-02-02', 'amount': 326000000, 'technique': 'Signature Verification', 'chain': 'Solana'},
        {'name': 'DMM Bitcoin', 'date': '2024-05-30', 'amount': 304000000, 'technique': 'Private Key Compromise', 'chain': 'Bitcoin'},
        {'name': 'WazirX', 'date': '2024-07-18', 'amount': 235000000, 'technique': 'Multisig Compromise', 'chain': 'Ethereum'},
        {'name': 'Nomad', 'date': '2022-08-01', 'amount': 190000000, 'technique': 'Verification Bug', 'chain': 'Multiple'},
        {'name': 'Euler Finance', 'date': '2023-03-13', 'amount': 197000000, 'technique': 'Flash Loan', 'chain': 'Ethereum'},
        {'name': 'Mango Markets', 'date': '2022-10-11', 'amount': 114000000, 'technique': 'Oracle Manipulation', 'chain': 'Solana'},
        {'name': 'Beanstalk', 'date': '2022-04-17', 'amount': 182000000, 'technique': 'Governance Attack', 'chain': 'Ethereum'},
        {'name': 'Wintermute', 'date': '2022-09-20', 'amount': 160000000, 'technique': 'Vanity Address Exploit', 'chain': 'Ethereum'},
        {'name': 'Compound', 'date': '2021-09-30', 'amount': 147000000, 'technique': 'Code Bug', 'chain': 'Ethereum'},
        {'name': 'Vulcan Forged', 'date': '2021-12-13', 'amount': 140000000, 'technique': 'Private Key Compromise', 'chain': 'Polygon'},
        {'name': 'Cream Finance', 'date': '2021-10-27', 'amount': 130000000, 'technique': 'Flash Loan', 'chain': 'Ethereum'},
        {'name': 'Badger DAO', 'date': '2021-12-02', 'amount': 120000000, 'technique': 'Frontend Attack', 'chain': 'Ethereum'},
        {'name': 'Balancer', 'date': '2023-08-22', 'amount': 128000000, 'technique': 'Reentrancy', 'chain': 'Ethereum'},
        {'name': 'Atomic Wallet', 'date': '2023-06-03', 'amount': 100000000, 'technique': 'Supply Chain', 'chain': 'Multiple'},
        {'name': 'Horizon Bridge', 'date': '2022-06-23', 'amount': 100000000, 'technique': 'Private Key Compromise', 'chain': 'Harmony'},
        {'name': 'Bitmart', 'date': '2021-12-04', 'amount': 96000000, 'technique': 'Hot Wallet Compromise', 'chain': 'Multiple'},
        {'name': 'Qubit', 'date': '2022-01-27', 'amount': 80000000, 'technique': 'Bridge Exploit', 'chain': 'BSC'},
        {'name': 'Fei Protocol', 'date': '2022-04-30', 'amount': 80000000, 'technique': 'Reentrancy', 'chain': 'Ethereum'},
        {'name': 'Ascendex', 'date': '2021-12-11', 'amount': 77000000, 'technique': 'Hot Wallet Compromise', 'chain': 'Multiple'},
        {'name': 'Curve Finance', 'date': '2023-07-30', 'amount': 62000000, 'technique': 'Vyper Bug', 'chain': 'Ethereum'},
        {'name': 'KuCoin', 'date': '2020-09-25', 'amount': 45000000, 'technique': 'Hot Wallet Compromise', 'chain': 'Multiple'},
        {'name': 'PancakeSwap', 'date': '2021-03-15', 'amount': 1800000, 'technique': 'DNS Hijack', 'chain': 'BSC'},
        {'name': 'dYdX', 'date': '2022-11-17', 'amount': 9000000, 'technique': 'Market Manipulation', 'chain': 'Ethereum'},
        {'name': 'Transit Swap', 'date': '2022-10-01', 'amount': 21000000, 'technique': 'Contract Bug', 'chain': 'Multiple'},
        {'name': 'Cashio', 'date': '2022-03-23', 'amount': 28000000, 'technique': 'Infinite Mint', 'chain': 'Solana'},
        {'name': 'Platypus', 'date': '2023-02-16', 'amount': 8500000, 'technique': 'Flash Loan', 'chain': 'Avalanche'},
        {'name': 'Yearn Finance', 'date': '2021-02-04', 'amount': 11000000, 'technique': 'Flash Loan', 'chain': 'Ethereum'},
        {'name': 'Harvest Finance', 'date': '2020-10-26', 'amount': 25000000, 'technique': 'Flash Loan', 'chain': 'Ethereum'},
        {'name': 'Pickle Finance', 'date': '2020-11-21', 'amount': 19700000, 'technique': 'Evil Jar', 'chain': 'Ethereum'},
        {'name': 'Indexed Finance', 'date': '2021-10-14', 'amount': 16000000, 'technique': 'Flash Loan', 'chain': 'Ethereum'},
        {'name': 'pNetwork', 'date': '2021-09-19', 'amount': 12700000, 'technique': 'Bridge Exploit', 'chain': 'BSC'},
        {'name': 'Vee Finance', 'date': '2021-09-20', 'amount': 35000000, 'technique': 'Oracle Manipulation', 'chain': 'Avalanche'},
        {'name': 'xToken', 'date': '2021-05-12', 'amount': 24500000, 'technique': 'Flash Loan', 'chain': 'Ethereum'},
        {'name': 'Value DeFi', 'date': '2020-11-14', 'amount': 6000000, 'technique': 'Flash Loan', 'chain': 'Ethereum'},
        {'name': 'Warp Finance', 'date': '2020-12-17', 'amount': 7700000, 'technique': 'Flash Loan', 'chain': 'Ethereum'},
        {'name': 'Alpha Finance', 'date': '2021-02-13', 'amount': 37500000, 'technique': 'Flash Loan', 'chain': 'Ethereum'},
        {'name': 'bZx', 'date': '2020-09-13', 'amount': 8100000, 'technique': 'Duplication Bug', 'chain': 'Ethereum'},
        {'name': 'Uranium Finance', 'date': '2021-04-28', 'amount': 57200000, 'technique': 'Math Bug', 'chain': 'BSC'},
        {'name': 'Spartan Protocol', 'date': '2021-05-01', 'amount': 30500000, 'technique': 'Flash Loan', 'chain': 'BSC'},
        {'name': 'Belt Finance', 'date': '2021-05-29', 'amount': 6300000, 'technique': 'Flash Loan', 'chain': 'BSC'},
        {'name': 'BurgerSwap', 'date': '2021-05-28', 'amount': 7200000, 'technique': 'Reentrancy', 'chain': 'BSC'},
        {'name': 'Merlin', 'date': '2021-05-26', 'amount': 680000, 'technique': 'Flash Loan', 'chain': 'BSC'},
        {'name': 'Rari Capital', 'date': '2022-04-30', 'amount': 80000000, 'technique': 'Reentrancy', 'chain': 'Ethereum'},
        {'name': 'Inverse Finance', 'date': '2022-04-02', 'amount': 15600000, 'technique': 'Oracle Manipulation', 'chain': 'Ethereum'},
        {'name': 'Elephant Money', 'date': '2022-04-12', 'amount': 11200000, 'technique': 'Flash Loan', 'chain': 'BSC'},
        {'name': 'Saddle Finance', 'date': '2022-04-30', 'amount': 10000000, 'technique': 'Reentrancy', 'chain': 'Ethereum'},
        {'name': 'Lodestar Finance', 'date': '2022-12-10', 'amount': 5800000, 'technique': 'Oracle Manipulation', 'chain': 'Arbitrum'},
        {'name': 'Ankr', 'date': '2022-12-01', 'amount': 5000000, 'technique': 'Private Key Compromise', 'chain': 'BSC'},
        {'name': 'Zunami Protocol', 'date': '2023-08-13', 'amount': 2100000, 'technique': 'Price Manipulation', 'chain': 'Ethereum'},
        {'name': 'Exactly Protocol', 'date': '2023-08-18', 'amount': 7300000, 'technique': 'Bridge Exploit', 'chain': 'Optimism'},
        {'name': 'Steadefi', 'date': '2023-08-07', 'amount': 1100000, 'technique': 'Deployer Key Compromise', 'chain': 'Arbitrum'},
        # 2024-2025 hacks
        {'name': 'Orbit Chain', 'date': '2024-01-01', 'amount': 81700000, 'technique': 'Bridge Exploit', 'chain': 'Multiple'},
        {'name': 'Socket', 'date': '2024-01-16', 'amount': 3300000, 'technique': 'Contract Bug', 'chain': 'Ethereum'},
        {'name': 'Abracadabra', 'date': '2024-01-30', 'amount': 6500000, 'technique': 'Rounding Error', 'chain': 'Ethereum'},
        {'name': 'Seneca', 'date': '2024-02-28', 'amount': 6400000, 'technique': 'Arbitrary Call', 'chain': 'Ethereum'},
        {'name': 'Blueberry Protocol', 'date': '2024-02-22', 'amount': 1350000, 'technique': 'Oracle Manipulation', 'chain': 'Ethereum'},
        {'name': 'Shido', 'date': '2024-03-05', 'amount': 35000000, 'technique': 'Contract Bug', 'chain': 'Ethereum'},
        {'name': 'Prisma Finance', 'date': '2024-03-28', 'amount': 11600000, 'technique': 'Flash Loan', 'chain': 'Ethereum'},
        {'name': 'Hedgey Finance', 'date': '2024-04-19', 'amount': 44700000, 'technique': 'Approval Bug', 'chain': 'Multiple'},
        {'name': 'Gala Games', 'date': '2024-05-20', 'amount': 21800000, 'technique': 'Admin Key Compromise', 'chain': 'Ethereum'},
        {'name': 'Lykke', 'date': '2024-06-04', 'amount': 22000000, 'technique': 'Hot Wallet Compromise', 'chain': 'Multiple'},
        {'name': 'UwU Lend', 'date': '2024-06-10', 'amount': 19300000, 'technique': 'Oracle Manipulation', 'chain': 'Ethereum'},
        {'name': 'Velocore', 'date': '2024-06-02', 'amount': 10000000, 'technique': 'Contract Bug', 'chain': 'zkSync'},
        {'name': 'Li.Fi', 'date': '2024-07-16', 'amount': 9700000, 'technique': 'Arbitrary Call', 'chain': 'Multiple'},
        {'name': 'Bittensor', 'date': '2024-07-03', 'amount': 8000000, 'technique': 'Package Exploit', 'chain': 'Bittensor'},
        {'name': 'Dough Finance', 'date': '2024-07-12', 'amount': 1800000, 'technique': 'Flash Loan', 'chain': 'Ethereum'},
        {'name': 'Ronin Network', 'date': '2024-08-06', 'amount': 10000000, 'technique': 'Bridge Exploit', 'chain': 'Ronin'},
        {'name': 'Nexera', 'date': '2024-08-07', 'amount': 1800000, 'technique': 'Contract Bug', 'chain': 'Ethereum'},
        {'name': 'Convergence', 'date': '2024-08-01', 'amount': 210000, 'technique': 'Reentrancy', 'chain': 'Ethereum'},
        {'name': 'Indodax', 'date': '2024-09-11', 'amount': 22000000, 'technique': 'Hot Wallet Compromise', 'chain': 'Multiple'},
        {'name': 'Penpie', 'date': '2024-09-03', 'amount': 27000000, 'technique': 'Reentrancy', 'chain': 'Ethereum'},
        {'name': 'Delta Prime', 'date': '2024-09-16', 'amount': 6000000, 'technique': 'Admin Key Compromise', 'chain': 'Arbitrum'},
        {'name': 'BingX', 'date': '2024-09-20', 'amount': 52000000, 'technique': 'Hot Wallet Compromise', 'chain': 'Multiple'},
        {'name': 'Onyx Protocol', 'date': '2024-09-26', 'amount': 3800000, 'technique': 'Precision Loss', 'chain': 'Ethereum'},
        {'name': 'Radiant Capital', 'date': '2024-10-16', 'amount': 51000000, 'technique': 'Blind Signing', 'chain': 'Multiple'},
        {'name': 'Tapioca DAO', 'date': '2024-10-18', 'amount': 4400000, 'technique': 'Social Engineering', 'chain': 'Multiple'},
        {'name': 'M2 Exchange', 'date': '2024-10-31', 'amount': 13700000, 'technique': 'Hot Wallet Compromise', 'chain': 'Multiple'},
        {'name': 'Thala Labs', 'date': '2024-11-15', 'amount': 25500000, 'technique': 'Farming Contract Bug', 'chain': 'Aptos'},
        {'name': 'Polter Finance', 'date': '2024-11-17', 'amount': 12000000, 'technique': 'Empty Market Exploit', 'chain': 'Fantom'},
        {'name': 'XT.com', 'date': '2024-11-28', 'amount': 1700000, 'technique': 'Hot Wallet Compromise', 'chain': 'Multiple'},
        {'name': 'Clipper DEX', 'date': '2024-12-01', 'amount': 450000, 'technique': 'API Exploit', 'chain': 'Multiple'},
        {'name': 'Aevo', 'date': '2025-12-14', 'amount': 2700000, 'technique': 'Contract Bug', 'chain': 'Ethereum'},
        {'name': 'Cetus', 'date': '2025-05-22', 'amount': 223000000, 'technique': 'Integer Overflow', 'chain': 'Sui'},
    ]
    print(f"    -> {len(hacks)} major hacks in manual database")
    return [{
        'source': 'manual_rekt',
        'name': h['name'],
        'date': h['date'],
        'amount': h['amount'],
        'returned': 0,
        'technique': h['technique'],
        'classification': 'Hack',
        'chain': h['chain'],
        'target_type': '',
        'source_url': f"https://rekt.news/{h['name'].lower().replace(' ', '-')}/",
    } for h in hacks]

# ============================================================
# AI MATCHING
# ============================================================

def call_mistral(prompt, max_tokens=500):
    """Call Mistral API for intelligent matching"""
    try:
        r = requests.post('https://api.mistral.ai/v1/chat/completions',
            headers={'Authorization': f'Bearer {MISTRAL_API_KEY}', 'Content-Type': 'application/json'},
            json={
                'model': 'mistral-small-latest',
                'messages': [{'role': 'user', 'content': prompt}],
                'temperature': 0.1,
                'max_tokens': max_tokens
            },
            timeout=30)
        if r.status_code == 200:
            return r.json()['choices'][0]['message']['content']
        elif r.status_code == 429:
            time.sleep(2)
            return call_mistral(prompt, max_tokens)
    except:
        pass
    return None

def ai_match_protocols(hack_names, product_names):
    """Use AI to match hack protocol names to our product database"""
    print("\n[AI] Matching protocols with Mistral...")

    # Build prompt
    prompt = f"""Match these hacked protocols to the most similar product in our database.
Only match if it's clearly the SAME protocol (not similar names).

HACKED PROTOCOLS:
{chr(10).join(hack_names[:100])}

OUR PRODUCTS:
{chr(10).join(product_names)}

For each EXACT match, output: HACK_NAME -> PRODUCT_NAME
Only output matches, nothing else. Be strict - only match if same protocol."""

    result = call_mistral(prompt, max_tokens=2000)

    matches = {}
    if result:
        for line in result.strip().split('\n'):
            if '->' in line:
                parts = line.split('->')
                if len(parts) == 2:
                    hack = parts[0].strip().lower()
                    product = parts[1].strip().lower()
                    matches[hack] = product

    print(f"    AI found {len(matches)} matches")
    return matches

# ============================================================
# MATCHING LOGIC
# ============================================================

# Known bad matches to exclude (different protocols with similar names)
EXCLUSIONS = {
    'hope finance',  # Not Hop Protocol
    'dexodus finance',  # Not Exodus
    'coinex',  # Not Convex
    'agave',  # Not Aave
    'corepound',  # Not Compound
    'pike',  # Not Pickle
    'compounder finance',  # Not Compound
    'ara finance',  # Not Aura
    'eralend',  # Not Fraxlend
    'orbit bridge',  # Not Orbiter
    'leadblock\'s morpho blue market',  # Not Morpho
}

# Manual mappings (DeFiLlama/Rekt name -> our product)
MANUAL_MAPPINGS = {
    # DeFi protocols
    'abracadabra spell': 'abracadabra',
    'euler v1': 'euler finance',
    'curve dex': 'curve finance',
    'curve finance': 'curve finance',
    'balancer v2': 'balancer',
    'compound v2': 'compound',
    'binance bridge': 'binance',
    'lifi finance': 'li.fi',
    'li.fi': 'li.fi',
    'raydium amm': 'raydium',
    'dydx v3': 'dydx',
    'dydx': 'dydx',
    'okx dex': 'okx',
    'gmx v1 perps': 'gmx',
    'gmx v2 perps': 'gmx',
    'ankr': 'ankr staking',
    'crypto.com': 'crypto.com exchange',
    'yearn finance': 'yearn finance',
    'yearn finance v1': 'yearn finance',
    'harvest finance': 'harvest finance',
    'pickle finance': 'pickle finance',
    'pickle': 'pickle finance',
    'sushiswap': 'sushiswap',
    # CEXs
    'ftx': 'ftx',
    'kucoin': 'kucoin',
    'gate': 'gate.io',
    'gate.io': 'gate.io',
    'bybit': 'bybit',
    'upbit': 'upbit',
    'coinbase': 'coinbase exchange',
    'bitmart': 'bitmart',
    'bingx': 'bingx',
    # Bridges & L2
    'ronin network': 'ronin',
    'wormhole': 'wormhole',
    'horizon bridge': 'harmony',
    # Wallets
    'atomic wallet': 'atomic wallet',
    'trust wallet': 'trust wallet',
    # More DeFi
    'pancakeswap': 'pancakeswap',
    'cream finance': 'cream finance',
    'alpha finance': 'alpha finance',
    'badger dao': 'badger dao',
    'rari capital': 'rari capital',
    'radiant capital': 'radiant capital',
    'inverse finance': 'inverse finance',
    'mango markets': 'mango',
    'ribbon': 'ribbon finance',
    'ribbon finance': 'ribbon finance',
    'alchemix': 'alchemix',
    '1inch': '1inch',
    'swissborg': 'swissborg',
}

def normalize(name):
    """Normalize name for matching"""
    if not name:
        return ""
    name = name.lower().strip()
    name = re.sub(r'\s*(protocol|finance|network|exchange|swap|dex|bridge|v\d+|\.com|\.io|\.fi)$', '', name, flags=re.I)
    return re.sub(r'[^a-z0-9]', '', name)

def similarity(a, b):
    return SequenceMatcher(None, normalize(a), normalize(b)).ratio()

def classify_severity(amount):
    if not amount: return 'medium'
    if amount >= 100_000_000: return 'critical'
    if amount >= 10_000_000: return 'high'
    if amount >= 1_000_000: return 'medium'
    return 'low'

def map_type(technique, classification):
    t = (technique or '').lower()
    c = (classification or '').lower()
    if 'rug' in t or 'rug' in c: return 'rug_pull'
    if 'flash' in t: return 'flash_loan_attack'
    if 'key' in t or 'compromise' in t: return 'private_key_compromise'
    if 'reentrancy' in t: return 'reentrancy'
    if 'oracle' in t: return 'oracle_manipulation'
    if 'bridge' in t: return 'bridge_exploit'
    if 'phish' in t: return 'phishing'
    if 'exploit' in t: return 'exploit'
    return 'hack'

# ============================================================
# MAIN IMPORT LOGIC
# ============================================================

def main():
    print("=" * 70)
    print("AUTO INCIDENTS IMPORTER")
    print("=" * 70)
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    # 1. Fetch from all sources
    print("\n[1] FETCHING FROM SOURCES")
    all_hacks = []
    all_hacks.extend(fetch_defillama_hacks())
    all_hacks.extend(fetch_defi_rekt())
    all_hacks.extend(get_major_hacks_manual())

    print(f"\n    TOTAL: {len(all_hacks)} hacks from all sources")

    # Dedupe by name + date
    seen = set()
    unique_hacks = []
    for h in all_hacks:
        key = (normalize(h['name']), h.get('date', ''))
        if key not in seen:
            seen.add(key)
            unique_hacks.append(h)
    print(f"    After dedup: {len(unique_hacks)} unique hacks")

    # 2. Fetch our products
    print("\n[2] FETCHING OUR PRODUCTS")
    r = requests.get(f'{SUPABASE_URL}/rest/v1/products?select=id,name,slug', headers=headers)
    products = r.json() if r.status_code == 200 else []
    print(f"    Found {len(products)} products")

    # Build lookups
    product_by_norm = {normalize(p['name']): p for p in products}
    product_by_slug = {normalize(p['slug']): p for p in products if p.get('slug')}
    product_names = [p['name'] for p in products]

    # 3. Get AI matches for unmatched protocols
    hack_names = list(set([h['name'] for h in unique_hacks]))
    unmatched_hacks = [n for n in hack_names if normalize(n) not in product_by_norm and normalize(n) not in product_by_slug]

    ai_matches = {}
    if unmatched_hacks:
        ai_matches = ai_match_protocols(unmatched_hacks, product_names)

    # 4. Match all hacks to products
    print("\n[3] MATCHING HACKS TO PRODUCTS")
    matched_incidents = []
    matched_count = 0

    for hack in unique_hacks:
        name = hack['name']
        norm = normalize(name)
        name_lower = name.lower().strip()

        # Skip exclusions
        if name_lower in EXCLUSIONS:
            continue

        # Try manual mapping first
        product = None
        if name_lower in MANUAL_MAPPINGS:
            target = MANUAL_MAPPINGS[name_lower]
            product = product_by_norm.get(normalize(target))
            if not product:
                for p in products:
                    if target.lower() in p['name'].lower():
                        product = p
                        break

        # Try direct match
        if not product:
            product = product_by_norm.get(norm) or product_by_slug.get(norm)

        # Try AI match
        if not product and name_lower in ai_matches:
            target = ai_matches[name_lower]
            product = product_by_norm.get(normalize(target))
            if not product:
                # Fuzzy find AI target
                for p in products:
                    if target in p['name'].lower() or similarity(target, p['name']) > 0.85:
                        product = p
                        break

        # Try fuzzy match (strict)
        if not product:
            for p in products:
                if similarity(name, p['name']) >= 0.92:
                    product = p
                    break

        if product:
            matched_count += 1
            incident = {
                'product_id': product['id'],
                'title': f"{name} - {hack.get('technique', 'Security Incident')}"[:200],
                'description': f"Chain: {hack.get('chain', 'Unknown')}. Type: {hack.get('classification', 'Unknown')}. Source: {hack.get('source', 'DeFiLlama')}.",
                'type': map_type(hack.get('technique'), hack.get('classification')),
                'severity': classify_severity(hack.get('amount')),
                'status': 'resolved',
                'date': hack.get('date') or '2024-01-01',
                'funds_lost': hack.get('amount', 0),
                'funds_recovered': hack.get('returned', 0),
                'source_url': hack.get('source_url', '')
            }
            matched_incidents.append(incident)

            if matched_count <= 30:
                amt = hack.get('amount', 0)
                print(f"    MATCH: {name} -> {product['name']} (${amt/1e6:.1f}M)")

    if matched_count > 30:
        print(f"    ... and {matched_count - 30} more matches")

    print(f"\n    TOTAL MATCHED: {matched_count} incidents")

    if not matched_incidents:
        print("No incidents to import!")
        return

    # 5. Import to database
    print("\n[4] IMPORTING TO DATABASE")

    # Clear existing
    r = requests.delete(f'{SUPABASE_URL}/rest/v1/product_incidents?id=gt.0', headers=headers)
    print(f"    Cleared existing (status: {r.status_code})")

    # Insert in batches
    batch_size = 50
    inserted = 0
    for i in range(0, len(matched_incidents), batch_size):
        batch = matched_incidents[i:i+batch_size]
        r = requests.post(
            f'{SUPABASE_URL}/rest/v1/product_incidents',
            headers={**headers, 'Prefer': 'return=minimal'},
            json=batch
        )
        if r.status_code in [200, 201]:
            inserted += len(batch)

    print(f"    Inserted: {inserted} incidents")

    # 6. Summary
    print("\n" + "=" * 70)
    print("IMPORT COMPLETE")
    print("=" * 70)

    # Stats by product
    product_stats = {}
    for inc in matched_incidents:
        pid = inc['product_id']
        if pid not in product_stats:
            product_stats[pid] = {'count': 0, 'lost': 0, 'name': ''}
        product_stats[pid]['count'] += 1
        product_stats[pid]['lost'] += inc.get('funds_lost', 0)

    for p in products:
        if p['id'] in product_stats:
            product_stats[p['id']]['name'] = p['name']

    # Top 20 by losses
    sorted_stats = sorted(product_stats.values(), key=lambda x: x['lost'], reverse=True)[:20]

    print("\nTOP 20 PRODUCTS BY LOSSES:")
    for s in sorted_stats:
        print(f"  {s['name']}: {s['count']} incidents, ${s['lost']/1e6:.1f}M lost")

    print(f"\nFinished at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

if __name__ == '__main__':
    main()
