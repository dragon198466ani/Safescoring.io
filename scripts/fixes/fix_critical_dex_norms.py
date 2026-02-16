#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
QUICK FIX: Update critical DEX norms that are obviously wrong
This manually corrects the most important norms before running full AI update
"""

import requests
import json
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# Load config
config = {}
with open('config/env_template_free.txt', 'r', encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            key, value = line.split('=', 1)
            config[key.strip()] = value.strip()

SUPABASE_URL = config.get('NEXT_PUBLIC_SUPABASE_URL', '')
SUPABASE_KEY = config.get('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates'
}

DEX_TYPE_ID = 39

print("="*100)
print("QUICK FIX: Critical DEX Norms")
print("="*100)

# Get all norms
r = requests.get(f'{SUPABASE_URL}/rest/v1/norms?select=id,code,title', headers=headers)
all_norms = r.json()
norms_by_code = {n['code']: n for n in all_norms}

# Critical fixes: (code, should_be_applicable, reason)
critical_fixes = [
    # MUST BE APPLICABLE - Core Ethereum/EVM standards
    ('S01', True, 'AES-256 - Standard encryption for TLS/HTTPS (all DEX websites)'),
    ('S06', True, 'Keccak-256 - CORE Ethereum hashing (addresses, signatures, merkle trees)'),
    ('S10', True, 'Argon2 - Modern password hashing (DEX admin panels, API keys)'),

    # Performance & Chain Support
    ('E01', True, 'Bitcoin BTC - Many DEXs support wrapped BTC (WBTC, renBTC)'),
    ('E11', True, 'Cardano - Cross-chain DEXs may bridge to Cardano'),
    ('E153', True, 'TPS >100K - Performance metric for high-throughput DEXs'),

    # Physical norms that should definitely be N/A
    ('F01', False, 'IP67 - DEXs have no physical component'),
    ('F02', False, 'IP68 - DEXs have no physical component'),
    ('A01', False, 'Duress PIN - DEXs do not have PIN authentication'),
    ('A02', False, 'Wipe PIN - DEXs do not have PIN authentication'),
]

print("\nUpdating norms:")
print("-"*100)

records_to_upsert = []

for code, should_be_applicable, reason in critical_fixes:
    norm = norms_by_code.get(code)
    if not norm:
        print(f"⚠️ Norm {code} not found - SKIP")
        continue

    # Prepare upsert record
    records_to_upsert.append({
        'type_id': DEX_TYPE_ID,
        'norm_id': norm['id'],
        'is_applicable': should_be_applicable
    })

    status = "→ APPLICABLE" if should_be_applicable else "→ N/A"
    print(f"  {code:6s} {status:15s} | {norm['title'][:50]:50s}")
    print(f"           └─ {reason}")

print("\n" + "-"*100)
print(f"Total updates: {len(records_to_upsert)}")
print()

response = input("Apply these changes? (yes/no): ")
if response.lower() not in ['yes', 'y']:
    print("Cancelled.")
    sys.exit(0)

# Batch upsert
print("\nUpdating database...")
r = requests.post(
    f"{SUPABASE_URL}/rest/v1/norm_applicability",
    headers=headers,
    json=records_to_upsert
)

if r.status_code in [200, 201]:
    print(f"✅ Successfully updated {len(records_to_upsert)} norms")
else:
    print(f"❌ Error: {r.status_code}")
    print(r.text)

print("\n" + "="*100)
print("NEXT STEPS:")
print("="*100)
print("1. Run: python get_critical_dex_norms.py")
print("   → Verify the critical norms are now correct")
print()
print("2. Run: python update_dex_applicability.py")
print("   → Full AI review of all 2159 norms for DEX")
print()
print("3. Run: python analyze_dex_norms.py")
print("   → See updated applicability breakdown")
print("="*100)
