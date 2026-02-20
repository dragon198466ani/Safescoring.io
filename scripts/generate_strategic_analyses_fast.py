#!/usr/bin/env python3
"""
ULTRA-FAST Strategic Analyses Generator
Loads ALL data into memory at once, then processes in bulk
"""
import sys
sys.path.insert(0, 'src')
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)) + '/..')

import requests
from collections import defaultdict
from core.config import SUPABASE_URL, get_supabase_headers

print("="*60)
print("ULTRA-FAST Strategic Analyses Generator")
print("="*60)

headers = get_supabase_headers()

# Step 1: Load ALL norms
print("\n[1/5] Loading all norms...")
norms_map = {}
offset = 0
while True:
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/norms?select=id,pillar,code,title&offset={offset}&limit=1000',
        headers=headers
    )
    if r.status_code != 200 or not r.json():
        break
    for norm in r.json():
        norms_map[norm['id']] = norm
    offset += 1000
    if len(r.json()) < 1000:
        break
print(f"   Loaded {len(norms_map)} norms")

# Step 2: Load ALL products
print("\n[2/5] Loading all products...")
products_map = {}
offset = 0
while True:
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/products?select=id,name,slug&offset={offset}&limit=1000',
        headers=headers
    )
    if r.status_code != 200 or not r.json():
        break
    for product in r.json():
        products_map[product['id']] = product
    offset += 1000
    if len(r.json()) < 1000:
        break
print(f"   Loaded {len(products_map)} products")

# Step 3: Load ALL evaluations at once
print("\n[3/5] Loading ALL evaluations (this may take 2-3 minutes)...")
evaluations = []
offset = 0
batch_num = 0
while True:
    batch_num += 1
    print(f"   Batch {batch_num}: offset {offset}...", end=' ', flush=True)
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/evaluations?select=product_id,norm_id,result&offset={offset}&limit=1000',
        headers=headers
    )
    if r.status_code != 200 or not r.json():
        print("done")
        break
    batch = r.json()
    evaluations.extend(batch)
    print(f"{len(batch)} records")
    offset += 1000
    if len(batch) < 1000:
        break

print(f"   Loaded {len(evaluations)} evaluations")

# Step 4: Group evaluations by product and pillar
print("\n[4/5] Grouping evaluations by product × pillar...")
# Structure: product_pillar_evals[product_id][pillar] = [eval1, eval2, ...]
product_pillar_evals = defaultdict(lambda: defaultdict(list))

for e in evaluations:
    if e['norm_id'] not in norms_map:
        continue

    norm = norms_map[e['norm_id']]
    pillar = norm['pillar']
    product_id = e['product_id']

    product_pillar_evals[product_id][pillar].append({
        'result': e['result'],
        'norm_code': norm['code'],
        'norm_title': norm['title']
    })

print(f"   Grouped into {len(product_pillar_evals)} products × 4 pillars")

# Step 5: Generate analyses for all products
print("\n[5/5] Generating strategic analyses...")

PILLARS = ['S', 'A', 'F', 'E']
PILLAR_NAMES = {
    'S': 'Security',
    'A': 'Adversity',
    'F': 'Fidelity',
    'E': 'Ecosystem'
}

def calculate_score(evals):
    """Calculate pillar score from evaluations."""
    yes = sum(1 for e in evals if e['result'] == 'YES')
    no = sum(1 for e in evals if e['result'] == 'NO')
    tbd = sum(1 for e in evals if e['result'] == 'TBD')

    total = yes + no
    score = (yes * 100.0 / total) if total > 0 else 0

    return score, yes, no, tbd

def generate_conclusion(product_name, pillar, score, yes, no):
    """Generate strategic conclusion based on score."""
    pillar_name = PILLAR_NAMES[pillar]

    if score >= 90:
        return f"{product_name} demonstrates exceptional {pillar_name.lower()} with {score:.1f}% compliance across industry standards."
    elif score >= 75:
        return f"{product_name} shows strong {pillar_name.lower()} practices with {score:.1f}% compliance."
    elif score >= 60:
        return f"{product_name} has moderate {pillar_name.lower()} implementation with {score:.1f}% compliance. Improvements recommended."
    else:
        return f"{product_name} exhibits significant {pillar_name.lower()} concerns with only {score:.1f}% compliance. Critical improvements required."

analyses = []
count = 0
total = len(product_pillar_evals) * 4

for product_id, pillars_data in product_pillar_evals.items():
    if product_id not in products_map:
        continue

    product_name = products_map[product_id]['name']

    for pillar in PILLARS:
        count += 1
        if count % 500 == 0:
            print(f"   Progress: {count}/{total} ({count/total*100:.1f}%)")

        evals = pillars_data.get(pillar, [])
        if not evals:
            continue

        score, yes, no, tbd = calculate_score(evals)
        confidence = 0.90 if (yes + no) >= 10 else 0.70

        conclusion = generate_conclusion(product_name, pillar, score, yes, no)

        # Basic strengths/weaknesses
        strengths = []
        weaknesses = []
        risks = []
        recommendations = []

        if score >= 80:
            strengths.append(f"Strong {PILLAR_NAMES[pillar].lower()}: {yes}/{yes+no} norms passed")
        elif score < 60:
            weaknesses.append(f"{PILLAR_NAMES[pillar]} gaps: {no} norms failed")
            risks.append(f"High {PILLAR_NAMES[pillar].lower()} vulnerability")

        if no > 0:
            recommendations.append(f"Address {no} failing {PILLAR_NAMES[pillar].lower()} standards")
        if tbd > yes + no:
            recommendations.append(f"Complete {tbd} pending evaluations")

        # Get failed norms for risks
        failed_norms = [e for e in evals if e['result'] == 'NO'][:3]
        for norm in failed_norms:
            risks.append(f"Missing {norm['norm_code']}: {norm['norm_title'][:60]}")

        analyses.append({
            'product_id': product_id,
            'pillar': pillar,
            'pillar_score': round(score, 2),
            'confidence_score': confidence,
            'strategic_conclusion': conclusion,
            'key_strengths': strengths[:5],
            'key_weaknesses': weaknesses[:5],
            'critical_risks': risks[:5],
            'recommendations': recommendations[:5],
            'evaluated_norms_count': len(evals),
            'passed_norms_count': yes,
            'failed_norms_count': no,
            'tbd_norms_count': tbd,
            'community_vote_count': 0
        })

print(f"\n   Generated {len(analyses)} strategic analyses")

# Step 6: Import to database
print("\nImporting to database...")
batch_size = 100
imported = 0
errors = 0

import_headers = get_supabase_headers(use_service_key=True, prefer='resolution=merge-duplicates')

for i in range(0, len(analyses), batch_size):
    batch = analyses[i:i+batch_size]

    try:
        r = requests.post(
            f'{SUPABASE_URL}/rest/v1/product_pillar_analyses?on_conflict=product_id,pillar',
            json=batch,
            headers=import_headers,
            timeout=30
        )

        if r.status_code in [200, 201]:
            imported += len(batch)
            if imported % 500 == 0:
                print(f"   Imported: {imported}/{len(analyses)} ({imported/len(analyses)*100:.1f}%)")
        else:
            errors += 1
            if errors <= 3:
                print(f"   Error: {r.status_code} - {r.text[:100]}")
    except Exception as e:
        errors += 1
        if errors <= 3:
            print(f"   Exception: {str(e)[:100]}")

print(f"\n{'='*60}")
print(f"COMPLETE!")
print(f"{'='*60}")
print(f"Total analyses generated: {len(analyses)}")
print(f"Successfully imported: {imported}")
print(f"Errors: {errors}")
print(f"\nStrategic analyses are now available via API:")
print(f"  GET /api/products/[slug]/strategic-analyses")
