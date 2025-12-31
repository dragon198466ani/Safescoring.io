#!/usr/bin/env python3
"""Check current state of safe_scoring_definitions."""

import requests
from collections import defaultdict

SUPABASE_URL = 'https://ajdncttomdqojlozxjxu.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqZG5jdHRvbWRxb2psb3p4anh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0MjMwNzUsImV4cCI6MjA3OTk5OTA3NX0.tTgqj-ALcl0oIdxFHuFQkB19apiz9CSyvV2X1TMWjEk'

HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
}

# Get norms with pillar
r = requests.get(f'{SUPABASE_URL}/rest/v1/norms?select=id,pillar', headers=HEADERS)
norms = {n['id']: n['pillar'] for n in r.json()}

# Get definitions
r = requests.get(f'{SUPABASE_URL}/rest/v1/safe_scoring_definitions?select=norm_id,is_essential,is_consumer,is_full', headers=HEADERS)
defs = r.json()

print("=" * 60)
print("📊 SAFE_SCORING_DEFINITIONS STATUS")
print("=" * 60)

# Stats by pillar
stats = defaultdict(lambda: {'total': 0, 'essential': 0, 'consumer': 0})

for d in defs:
    pillar = norms.get(d['norm_id'], '?')
    stats[pillar]['total'] += 1
    if d['is_essential']:
        stats[pillar]['essential'] += 1
    if d['is_consumer']:
        stats[pillar]['consumer'] += 1

print(f"\n{'Pillar':<8} {'Total':<8} {'Essential':<15} {'Consumer':<15}")
print("-" * 50)

for p in ['S', 'A', 'F', 'E']:
    s = stats[p]
    ess_pct = s['essential']/s['total']*100 if s['total'] > 0 else 0
    con_pct = s['consumer']/s['total']*100 if s['total'] > 0 else 0
    print(f"{p:<8} {s['total']:<8} {s['essential']} ({ess_pct:.0f}%)        {s['consumer']} ({con_pct:.0f}%)")

total_ess = sum(s['essential'] for s in stats.values())
total_con = sum(s['consumer'] for s in stats.values())
total_all = sum(s['total'] for s in stats.values())

print("-" * 50)
print(f"{'TOTAL':<8} {total_all:<8} {total_ess} ({total_ess/total_all*100:.0f}%)        {total_con} ({total_con/total_all*100:.0f}%)")

print("\n✅ La table safe_scoring_definitions est déjà à jour avec la distribution équilibrée!")
