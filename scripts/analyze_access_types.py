import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
import requests
from collections import Counter
from src.core.config import SUPABASE_URL, get_supabase_headers

headers = get_supabase_headers(use_service_key=True)

all_norms = []
offset = 0
while True:
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/norms?select=id,code,pillar,title,description,is_essential,consumer,access_type,target_type,chapter&order=code&limit=1000&offset={offset}",
        headers=headers
    )
    if r.status_code != 200 or not r.json():
        break
    all_norms.extend(r.json())
    if len(r.json()) < 1000:
        break
    offset += 1000

print(f"Total norms: {len(all_norms)}")

# 1. Access type analysis
print("\n=== ACCESS TYPE ANALYSIS ===")
access = Counter(n.get("access_type", "NONE") for n in all_norms)
for a, c in access.most_common():
    print(f"  {a!r}: {c}")

# Show examples for each access type
for at in ["Gratuit", "Payant", "Freemium", "R", "F"]:
    examples = [n for n in all_norms if n.get("access_type") == at][:5]
    print(f"\n  Examples of access_type='{at}':")
    for n in examples:
        print(f"    {n['code']} | {n['title'][:50]} | pillar={n['pillar']}")

# 2. Missing descriptions
print("\n\n=== MISSING DESCRIPTIONS ===")
no_desc = [n for n in all_norms if not n.get("description") or len(str(n["description"]).strip()) < 5]
for n in no_desc:
    print(f"  {n['code']} (pillar={n['pillar']}): title='{n['title']}', desc='{n.get('description','')}'")

# 3. Essential norms in F and E pillars
print("\n\n=== ESSENTIAL NORMS PER PILLAR ===")
for pillar in ["S", "A", "F", "E"]:
    pnorms = [n for n in all_norms if n.get("pillar") == pillar]
    ess = [n for n in pnorms if n.get("is_essential")]
    print(f"  {pillar}: {len(ess)}/{len(pnorms)} essential")
    if pillar in ("F", "E") and ess:
        for n in ess[:10]:
            print(f"    {n['code']}: {n['title'][:60]}")

# 4. Check if F and E SHOULD have essential norms
print("\n\n=== F PILLAR - MOST IMPORTANT NORMS (by code) ===")
f_norms = [n for n in all_norms if n.get("pillar") == "F"]
for n in sorted(f_norms, key=lambda x: x["code"])[:20]:
    print(f"  {n['code']}: {n['title'][:60]} | consumer={n.get('consumer')}")

print("\n=== E PILLAR - MOST IMPORTANT NORMS ===")
e_norms = [n for n in all_norms if n.get("pillar") == "E"]
for n in sorted(e_norms, key=lambda x: x["code"])[:20]:
    print(f"  {n['code']}: {n['title'][:60]} | consumer={n.get('consumer')}")
