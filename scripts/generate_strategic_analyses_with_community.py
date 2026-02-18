#!/usr/bin/env python3
"""
Generate strategic analyses per product per pillar (S, A, F, E).
IMPROVED: Integrates community voting system from migration 136.

Score calculation:
- Base: AI evaluations (YES/NO)
- Adjustment: Community votes (validated challenges)
- Weight: Community consensus strength
"""
import sys
sys.path.insert(0, 'src')
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)) + '/..')

import requests
from core.config import SUPABASE_URL, get_supabase_headers

headers = get_supabase_headers()

# Load ALL norms into memory
print("Loading all norms into memory...")
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

print(f"Loaded {len(norms_map)} norms")

# Load ALL community votes into memory (for fast lookup)
print("Loading community votes...")
community_votes = {}  # evaluation_id -> {'agrees': count, 'disagrees': count, 'validated_challenges': count}
offset = 0
total_votes = 0
while True:
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/evaluation_votes?select=evaluation_id,vote_agrees,status,vote_weight&offset={offset}&limit=1000',
        headers=headers
    )
    if r.status_code != 200 or not r.json():
        break

    for vote in r.json():
        eval_id = vote['evaluation_id']
        if eval_id not in community_votes:
            community_votes[eval_id] = {
                'agrees': 0,
                'disagrees': 0,
                'validated_challenges': 0,
                'total_weight': 0
            }

        weight = float(vote.get('vote_weight', 0.3))
        community_votes[eval_id]['total_weight'] += weight

        if vote['vote_agrees']:
            community_votes[eval_id]['agrees'] += 1
        else:
            community_votes[eval_id]['disagrees'] += 1
            if vote['status'] == 'validated':
                # Community confirmed AI was WRONG
                community_votes[eval_id]['validated_challenges'] += 1

    total_votes += len(r.json())
    offset += 1000
    if len(r.json()) < 1000:
        break

print(f"Loaded {total_votes} community votes covering {len(community_votes)} evaluations")

# Get all products
print("Loading products...")
products = []
offset = 0
while True:
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/products?select=id,name,slug,type_id&offset={offset}&limit=1000',
        headers=headers
    )
    if r.status_code != 200 or not r.json():
        break
    products.extend(r.json())
    offset += 1000
    if len(r.json()) < 1000:
        break

print(f"Loaded {len(products)} products")

PILLARS = ['S', 'A', 'F', 'E']
PILLAR_NAMES = {
    'S': 'Security',
    'A': 'Adversity',
    'F': 'Fidelity',
    'E': 'Ecosystem'
}

def get_pillar_evaluations_with_community(product_id, pillar):
    """Get evaluations with community voting data."""
    evals = []
    offset = 0

    while True:
        r = requests.get(
            f'{SUPABASE_URL}/rest/v1/evaluations?select=id,norm_id,result,why_this_result,confidence_score&product_id=eq.{product_id}&offset={offset}&limit=1000',
            headers=headers
        )
        if r.status_code != 200 or not r.json():
            break

        batch = r.json()

        for e in batch:
            if e['norm_id'] in norms_map:
                norm = norms_map[e['norm_id']]
                if norm['pillar'] == pillar:
                    e['norm_code'] = norm['code']
                    e['norm_title'] = norm['title']

                    # Add community voting data
                    eval_id = e['id']
                    if eval_id in community_votes:
                        cv = community_votes[eval_id]
                        e['community_agrees'] = cv['agrees']
                        e['community_disagrees'] = cv['disagrees']
                        e['community_validated_challenges'] = cv['validated_challenges']
                        e['community_total_weight'] = cv['total_weight']
                    else:
                        e['community_agrees'] = 0
                        e['community_disagrees'] = 0
                        e['community_validated_challenges'] = 0
                        e['community_total_weight'] = 0

                    evals.append(e)

        offset += 1000
        if len(batch) < 1000:
            break

    return evals

def calculate_community_adjusted_score(evaluations):
    """
    Calculate score with community voting adjustments.

    Logic:
    1. Start with AI evaluation (YES/NO)
    2. If community validated a challenge (AI was wrong), flip the result
    3. Weight by community consensus strength
    """
    if not evaluations:
        return 0, 0, 0, 0

    corrected_yes = 0
    corrected_no = 0
    tbd_count = 0
    community_corrections = 0

    for e in evaluations:
        result = e['result']

        if result == 'TBD':
            tbd_count += 1
            continue

        # Check if community validated a challenge (AI was wrong)
        if e['community_validated_challenges'] > 0:
            # Community says AI was WRONG
            # Flip the result
            if result == 'YES':
                corrected_no += 1  # AI said YES, but community proved it's NO
            else:
                corrected_yes += 1  # AI said NO, but community proved it's YES
            community_corrections += 1
        else:
            # Use AI result as-is
            if result == 'YES':
                corrected_yes += 1
            else:
                corrected_no += 1

    total_evaluated = corrected_yes + corrected_no
    score = (corrected_yes * 100.0 / total_evaluated) if total_evaluated > 0 else 0

    return score, corrected_yes, corrected_no, tbd_count

def analyze_pillar_with_community(product_name, pillar, evaluations):
    """Generate strategic analysis with community data."""
    if not evaluations:
        return {
            'strategic_conclusion': f"No {PILLAR_NAMES[pillar]} evaluations available for {product_name}.",
            'key_strengths': [],
            'key_weaknesses': [],
            'critical_risks': [],
            'recommendations': [f"Awaiting {PILLAR_NAMES[pillar]} evaluation."]
        }

    score, yes_count, no_count, tbd_count = calculate_community_adjusted_score(evaluations)

    # Count community corrections
    community_corrections = sum(1 for e in evaluations if e['community_validated_challenges'] > 0)

    # Generate conclusion with community trust indicator
    trust_indicator = ""
    if community_corrections > 0:
        trust_indicator = f" (Community-verified: {community_corrections} AI corrections)"

    strengths = []
    weaknesses = []
    risks = []
    recommendations = []

    # Pillar-specific analysis
    if pillar == 'S':  # Security
        if score >= 90:
            conclusion = f"{product_name} demonstrates exceptional security with {score:.1f}% validated compliance{trust_indicator}."
            strengths.append(f"Outstanding security: {yes_count}/{yes_count+no_count} norms passed")
        elif score >= 75:
            conclusion = f"{product_name} shows strong security practices ({score:.1f}% compliance){trust_indicator}."
            strengths.append(f"Strong security baseline: {yes_count}/{yes_count+no_count}")
        elif score >= 60:
            conclusion = f"{product_name} has moderate security ({score:.1f}%){trust_indicator}. Critical gaps require attention."
            weaknesses.append(f"Security gaps: {no_count} norms failed")
        else:
            conclusion = f"{product_name} exhibits critical security concerns ({score:.1f}%){trust_indicator}. Immediate improvements required."
            weaknesses.append(f"Severe security deficiencies: {no_count} failures")
            risks.append("High vulnerability to security threats")

    elif pillar == 'A':  # Adversity
        if score >= 85:
            conclusion = f"{product_name} demonstrates excellent adversity resilience ({score:.1f}%){trust_indicator}."
            strengths.append(f"Strong regulatory compliance: {yes_count}/{yes_count+no_count}")
        elif score >= 70:
            conclusion = f"{product_name} shows good adversity protection ({score:.1f}%){trust_indicator}."
        elif score >= 50:
            conclusion = f"{product_name} has moderate adversity resilience ({score:.1f}%){trust_indicator}."
            weaknesses.append(f"Regulatory gaps: {no_count} norms failed")
        else:
            conclusion = f"{product_name} shows weak adversity protection ({score:.1f}%){trust_indicator}."
            risks.append("High exposure to regulatory/physical threats")

    elif pillar == 'F':  # Fidelity
        if score >= 85:
            conclusion = f"{product_name} excels in fidelity ({score:.1f}%){trust_indicator}."
            strengths.append(f"Robust backup/recovery: {yes_count}/{yes_count+no_count}")
        elif score >= 70:
            conclusion = f"{product_name} demonstrates good fidelity ({score:.1f}%){trust_indicator}."
        elif score >= 50:
            conclusion = f"{product_name} has moderate fidelity ({score:.1f}%){trust_indicator}."
            weaknesses.append(f"Fidelity gaps: {no_count} failures")
        else:
            conclusion = f"{product_name} shows concerning fidelity issues ({score:.1f}%){trust_indicator}."
            risks.append("Asset loss risk due to inadequate backup")

    elif pillar == 'E':  # Ecosystem
        if score >= 85:
            conclusion = f"{product_name} demonstrates excellent ecosystem integration ({score:.1f}%){trust_indicator}."
            strengths.append(f"Strong standards compliance: {yes_count}/{yes_count+no_count}")
        elif score >= 70:
            conclusion = f"{product_name} shows good ecosystem compatibility ({score:.1f}%){trust_indicator}."
        elif score >= 50:
            conclusion = f"{product_name} has moderate ecosystem support ({score:.1f}%){trust_indicator}."
            weaknesses.append(f"Limited standards support: {no_count} failures")
        else:
            conclusion = f"{product_name} exhibits limited ecosystem integration ({score:.1f}%){trust_indicator}."
            risks.append("Poor interoperability limits usage")

    # Add community-specific insights
    if community_corrections > 0:
        strengths.append(f"Community-verified accuracy ({community_corrections} AI corrections)")

    # Failed norms analysis
    failed_norms = [e for e in evaluations if e['result'] == 'NO' and e['community_validated_challenges'] == 0]
    failed_norms += [e for e in evaluations if e['result'] == 'YES' and e['community_validated_challenges'] > 0]

    for norm in failed_norms[:3]:
        risks.append(f"Missing {norm.get('norm_code', '')}: {norm.get('norm_title', '')[:80]}")

    if score < 80:
        recommendations.append(f"Address {no_count} failing {PILLAR_NAMES[pillar].lower()} standards")
    if tbd_count > yes_count + no_count:
        recommendations.append(f"Complete {tbd_count} pending evaluations")

    return {
        'strategic_conclusion': conclusion,
        'key_strengths': strengths[:5],
        'key_weaknesses': weaknesses[:5],
        'critical_risks': risks[:5],
        'recommendations': recommendations[:5]
    }

# Generate analyses
print("\nGenerating community-aware strategic analyses...")
analyses = []
total = len(products) * len(PILLARS)
count = 0

for product in products:  # ALL products
    print(f"\nAnalyzing {product['name']} (ID {product['id']})...")

    for pillar in PILLARS:
        count += 1
        print(f"  [{count}/{total}] Pillar {pillar} ({PILLAR_NAMES[pillar]})...", end=' ', flush=True)

        evals = get_pillar_evaluations_with_community(product['id'], pillar)

        if not evals:
            print("No evaluations")
            continue

        score, yes_count, no_count, tbd_count = calculate_community_adjusted_score(evals)
        confidence = 0.90 if (yes_count + no_count) >= 10 else 0.70

        # Boost confidence if community validated
        community_total = sum(e['community_agrees'] + e['community_disagrees'] for e in evals)
        if community_total > 5:
            confidence = min(0.95, confidence + 0.05)

        analysis = analyze_pillar_with_community(product['name'], pillar, evals)

        record = {
            'product_id': product['id'],
            'pillar': pillar,
            'pillar_score': round(score, 2),
            'confidence_score': confidence,
            'strategic_conclusion': analysis['strategic_conclusion'],
            'key_strengths': analysis['key_strengths'],
            'key_weaknesses': analysis['key_weaknesses'],
            'critical_risks': analysis['critical_risks'],
            'recommendations': analysis['recommendations'],
            'evaluated_norms_count': len(evals),
            'passed_norms_count': yes_count,
            'failed_norms_count': no_count,
            'tbd_norms_count': tbd_count,
            'community_vote_count': sum(e['community_agrees'] + e['community_disagrees'] for e in evals)
        }

        analyses.append(record)
        print(f"Score: {score:.1f}% ({yes_count}/{yes_count+no_count})")

print(f"\nGenerated {len(analyses)} analyses")
print("Importing to database...")

# Import analyses in batches (use service key for RLS)
batch_size = 100
imported = 0
import_headers = get_supabase_headers(use_service_key=True, prefer='resolution=merge-duplicates')

for i in range(0, len(analyses), batch_size):
    batch = analyses[i:i+batch_size]

    r = requests.post(
        f'{SUPABASE_URL}/rest/v1/product_pillar_analyses?on_conflict=product_id,pillar',
        json=batch,
        headers=import_headers
    )

    if r.status_code in [200, 201]:
        imported += len(batch)
        if imported % 500 == 0:
            print(f"Imported: {imported} / {len(analyses)}", flush=True)
    else:
        print(f"Error: {r.status_code} - {r.text[:200]}")

print(f"\nComplete! Imported {imported} strategic analyses to database")
