#!/usr/bin/env python3
"""
Verify type assignments on a large sample.
Checks for obvious mismatches based on product name/URL vs assigned type.
"""
import sys, os, re
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src', 'core'))
from config import SUPABASE_URL, SUPABASE_KEY
import requests
from collections import defaultdict

H_READ = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json'
}
BASE = SUPABASE_URL + '/rest/v1'

# Load all types
r = requests.get(f'{BASE}/product_types?select=id,name,code&order=id&limit=100', headers=H_READ)
types = {t['id']: t for t in r.json()}

# Load all active products
all_products = []
offset = 0
while True:
    r = requests.get(
        f'{BASE}/products?is_active=eq.true&select=id,name,type_id,url,slug&order=id&limit=1000&offset={offset}',
        headers=H_READ
    )
    batch = r.json()
    if not batch:
        break
    all_products.extend(batch)
    offset += 1000

print(f'Total active products: {len(all_products)}')
print()

# ============================================
# HEURISTIC CHECKS
# ============================================
# Check product names/URLs against their type for obvious mismatches

WALLET_KEYWORDS = ['wallet', 'metamask', 'phantom', 'rabby', 'coinbase wallet', 'trust wallet']
EXCHANGE_KEYWORDS = ['exchange', 'binance', 'coinbase', 'kraken', 'bitfinex', 'bybit', 'okx', 'htx', 'kucoin', 'gate.io']
BRIDGE_KEYWORDS = ['bridge', 'relay', 'stargate']
HARDWARE_KEYWORDS = ['ledger', 'trezor', 'coldcard', 'keystone', 'bitbox', 'ngrave', 'ellipal', 'safepal', 'archos']
CARD_KEYWORDS = ['card', 'visa', 'mastercard']
STABLECOIN_KEYWORDS = ['usdt', 'usdc', 'dai ', 'frax', 'tusd', 'busd', 'gusd', 'paxd', 'eurs']
LENDING_KEYWORDS = ['aave', 'compound', 'morpho', 'euler', 'lend']
DEX_KEYWORDS = ['uniswap', 'sushiswap', 'pancakeswap', 'curve', 'balancer', 'camelot']

suspicious = []

for p in all_products:
    name_lower = p['name'].lower()
    url_lower = (p.get('url') or '').lower()
    type_id = p['type_id']
    type_info = types.get(type_id, {})
    type_name = type_info.get('name', '?')
    type_code = type_info.get('code', '?')

    issues = []

    # Hardware products should be type 1 (HW Cold) or related
    if any(kw in name_lower for kw in ['ledger nano', 'trezor model', 'trezor one', 'trezor safe', 'coldcard', 'keystone', 'bitbox02', 'ngrave zero']):
        if type_id not in (1,):  # HW Cold
            issues.append(f'Hardware product but type={type_name}')

    # Products with "card" in name should be type 38 or 39
    if 'card' in name_lower and type_id not in (38, 39, 40):
        if not any(x in name_lower for x in ['coldcard', 'blockcard', 'tangem']):
            issues.append(f'Card product but type={type_name}')

    # Products with "bridge" in name should be type 20
    if 'bridge' in name_lower and type_id not in (20, 27):
        if 'cambridge' not in name_lower:
            issues.append(f'Bridge product but type={type_name}')

    # Lofty appears twice in RWA
    if 'lofty' in name_lower and type_id == 35:
        pass  # RWA is correct for Lofty

    # Check for products that might be L2 but aren't typed as such
    l2_names = ['arbitrum', 'optimism', 'polygon zkevm', 'zksync', 'starknet', 'base', 'linea', 'scroll', 'mantle', 'blast']
    if any(name_lower.startswith(l2) for l2 in l2_names):
        if type_id not in (46, 63):  # L2 or Protocol
            issues.append(f'L2 product but type={type_name}')

    # Duplicates check: Lofty appears as both 794 Lofty and 795 Lofty.ai
    if issues:
        suspicious.append({
            'id': p['id'],
            'name': p['name'],
            'type': f'{type_code} ({type_name})',
            'issues': issues,
            'url': p.get('url', '?'),
        })

# Check for remaining duplicates (similar names)
name_groups = defaultdict(list)
for p in all_products:
    # Normalize name for comparison
    base_name = re.sub(r'\s*(v\d+|2\.0|mini|pro|plus|max|lite|classic|one)\s*$', '', p['name'], flags=re.I).strip().lower()
    base_name = re.sub(r'\s+', ' ', base_name)
    name_groups[base_name].append(p)

remaining_dupes = {k: v for k, v in name_groups.items() if len(v) > 1}

# Filter out legitimate variants (same name, different types)
real_dupes = []
for name, prods in remaining_dupes.items():
    type_ids = set(p['type_id'] for p in prods)
    if len(type_ids) == 1:
        # Same type, likely duplicate
        real_dupes.append((name, prods))

print(f'=== SUSPICIOUS TYPE ASSIGNMENTS ({len(suspicious)}) ===')
for s in suspicious:
    print(f'  [{s["id"]:4d}] {s["name"]:40s} | {s["type"]:30s} | {", ".join(s["issues"])}')

print(f'\n=== POTENTIAL REMAINING DUPLICATES ({len(real_dupes)}) ===')
for name, prods in sorted(real_dupes):
    type_name = types.get(prods[0]['type_id'], {}).get('name', '?')
    ids = [str(p['id']) for p in prods]
    names = [p['name'] for p in prods]
    print(f'  {type_name:30s} | IDs: {",".join(ids):15s} | {" / ".join(names)}')

print(f'\nTotal active: {len(all_products)}')
print(f'Suspicious: {len(suspicious)}')
print(f'Potential duplicates: {len(real_dupes)}')
