import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
import requests
from collections import Counter
from src.core.config import SUPABASE_URL, get_supabase_headers

headers = get_supabase_headers(use_service_key=True)

# Load all norms
all_norms = []
offset = 0
while True:
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/norms?select=id,code,pillar,title,chapter,target_type&order=code&limit=1000&offset={offset}",
        headers=headers
    )
    if r.status_code != 200 or not r.json():
        break
    all_norms.extend(r.json())
    if len(r.json()) < 1000:
        break
    offset += 1000

import re
bad = [n for n in all_norms if not re.match(r'^[A-Z]+\d+$', n.get("code", ""))]
print(f"Total bad format codes: {len(bad)}")
print()

# Group by prefix pattern
prefix_groups = Counter()
for n in bad:
    code = n.get("code", "")
    parts = code.split("-")
    if len(parts) >= 2:
        prefix_groups[parts[0] + "-" + parts[1]] += 1
    else:
        prefix_groups[code] += 1

print("Prefix groups:")
for p, c in prefix_groups.most_common(50):
    print(f"  {p}: {c}")

print()
print("Full list of bad codes by pillar:")
by_pillar = {}
for n in bad:
    p = n.get("pillar", "?")
    if p not in by_pillar:
        by_pillar[p] = []
    by_pillar[p].append(n)

for pillar in sorted(by_pillar):
    items = by_pillar[pillar]
    print(f"\n  Pillar {pillar} ({len(items)} codes):")
    for n in sorted(items, key=lambda x: x["code"])[:30]:
        print(f"    {n['code']} | {n['title'][:60]} | chapter={n.get('chapter','')[:30]} | target={n.get('target_type','')}")
    if len(items) > 30:
        print(f"    ... and {len(items)-30} more")
