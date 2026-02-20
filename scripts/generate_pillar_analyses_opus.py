#!/usr/bin/env python3
"""
STRATEGIC PILLAR ANALYSES GENERATOR - Claude Opus Quality
Generates deep strategic analyses per product per pillar (S, A, F, E).

Uses evaluation justifications to create expert-level strategic conclusions.
All output in English for international audience.
"""
import sys
sys.path.insert(0, 'src')
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)) + '/..')

import requests
import json
from collections import defaultdict
from datetime import datetime
from core.config import SUPABASE_URL, get_supabase_headers

print("=" * 70)
print("STRATEGIC PILLAR ANALYSES GENERATOR - Claude Opus Quality")
print("=" * 70)
print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

headers = get_supabase_headers()

# =============================================================================
# PILLAR DEFINITIONS
# =============================================================================
PILLARS = ['S', 'A', 'F', 'E']
PILLAR_NAMES = {
    'S': 'Security',
    'A': 'Adversity',
    'F': 'Fidelity',
    'E': 'Ecosystem'
}

PILLAR_DESCRIPTIONS = {
    'S': "Cryptographic security foundations - encryption algorithms, key management, signatures, secure elements, and protocol implementations.",
    'A': "Adversity resistance - protection against intentional threats including coercion, regulatory pressure, physical attacks, and privacy violations.",
    'F': "Fidelity and reliability - long-term durability, backup mechanisms, recovery procedures, quality certifications, and company track record.",
    'E': "Ecosystem integration - blockchain support, token standards, DeFi features, platform compatibility, and user experience."
}

# =============================================================================
# STEP 1: LOAD ALL NORMS
# =============================================================================
print("\n[1/6] Loading all norms into memory...")
norms_map = {}

# Use Range header for pagination (Supabase standard)
norm_offset = 0
norm_limit = 1000
while True:
    range_header = headers.copy()
    range_header['Range'] = f'{norm_offset}-{norm_offset + norm_limit - 1}'

    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/norms?select=id,pillar,code,title,summary',
        headers=range_header
    )

    if r.status_code not in [200, 206]:
        print(f"   Error loading norms: {r.status_code} - {r.text[:200]}")
        break

    data = r.json()
    if not data:
        break

    for norm in data:
        norms_map[norm['id']] = norm

    print(f"   Loaded {len(norms_map)} norms so far...")

    if len(data) < norm_limit:
        break

    norm_offset += norm_limit

print(f"   Total norms loaded: {len(norms_map)}")

# =============================================================================
# STEP 2: LOAD ALL PRODUCTS
# =============================================================================
print("\n[2/6] Loading all products...")
products = []

prod_offset = 0
prod_limit = 1000
while True:
    range_header = headers.copy()
    range_header['Range'] = f'{prod_offset}-{prod_offset + prod_limit - 1}'

    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/products?select=id,name,slug,type_id,description',
        headers=range_header
    )

    if r.status_code not in [200, 206]:
        print(f"   Error loading products: {r.status_code}")
        break

    data = r.json()
    if not data:
        break

    products.extend(data)

    if len(data) < prod_limit:
        break

    prod_offset += prod_limit

print(f"   Loaded {len(products)} products")

# =============================================================================
# STEP 3: LOAD PRODUCT TYPES
# =============================================================================
print("\n[3/6] Loading product types...")
types_map = {}
r = requests.get(
    f'{SUPABASE_URL}/rest/v1/product_types?select=id,name,code',
    headers=headers
)
if r.status_code == 200:
    for t in r.json():
        types_map[t['id']] = t
print(f"   Loaded {len(types_map)} product types")

# =============================================================================
# STEP 4: LOAD ALL EVALUATIONS WITH JUSTIFICATIONS
# =============================================================================
print("\n[4/6] Loading ALL evaluations with justifications...")
print("   This may take several minutes...")

evaluations = []
eval_offset = 0
eval_limit = 1000
batch_num = 0

while True:
    batch_num += 1
    if batch_num % 20 == 0:
        print(f"   Batch {batch_num}: loaded {len(evaluations)} evaluations so far...")

    range_header = headers.copy()
    range_header['Range'] = f'{eval_offset}-{eval_offset + eval_limit - 1}'

    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/evaluations?select=id,product_id,norm_id,result,why_this_result,confidence_score',
        headers=range_header,
        timeout=60
    )

    if r.status_code not in [200, 206]:
        print(f"   Error at batch {batch_num}: {r.status_code}")
        break

    data = r.json()
    if not data:
        break

    evaluations.extend(data)

    if len(data) < eval_limit:
        break

    eval_offset += eval_limit

print(f"   Loaded {len(evaluations)} evaluations total")

# =============================================================================
# STEP 5: GROUP EVALUATIONS BY PRODUCT AND PILLAR
# =============================================================================
print("\n[5/6] Grouping evaluations by product × pillar...")

# Structure: product_pillar_evals[product_id][pillar] = [eval1, eval2, ...]
product_pillar_evals = defaultdict(lambda: defaultdict(list))

for e in evaluations:
    norm_id = e.get('norm_id')
    if norm_id not in norms_map:
        continue

    norm = norms_map[norm_id]
    pillar = norm.get('pillar')
    product_id = e.get('product_id')

    if not pillar or not product_id:
        continue

    product_pillar_evals[product_id][pillar].append({
        'result': e.get('result'),
        'why': e.get('why_this_result', ''),
        'confidence': e.get('confidence_score', 0),
        'norm_code': norm.get('code', ''),
        'norm_title': norm.get('title', ''),
        'norm_summary': norm.get('summary', '')
    })

print(f"   Grouped into {len(product_pillar_evals)} products with evaluations")

# =============================================================================
# STEP 6: GENERATE STRATEGIC ANALYSES
# =============================================================================
print("\n[6/6] Generating strategic analyses...")


def calculate_pillar_score(evals):
    """Calculate pillar score from evaluations."""
    yes_count = sum(1 for e in evals if e['result'] == 'YES')
    no_count = sum(1 for e in evals if e['result'] == 'NO')
    tbd_count = sum(1 for e in evals if e['result'] == 'TBD')
    na_count = sum(1 for e in evals if e['result'] == 'N/A')

    total = yes_count + no_count
    score = (yes_count * 100.0 / total) if total > 0 else 0

    # Confidence based on evaluation coverage
    if total >= 50:
        confidence = 0.95
    elif total >= 20:
        confidence = 0.90
    elif total >= 10:
        confidence = 0.85
    elif total >= 5:
        confidence = 0.75
    else:
        confidence = 0.60

    return score, yes_count, no_count, tbd_count, na_count, confidence


def get_critical_failures(evals, limit=5):
    """Get the most critical failed norms with justifications."""
    failures = [e for e in evals if e['result'] == 'NO']

    # Sort by confidence (higher confidence failures are more critical)
    failures.sort(key=lambda x: x.get('confidence', 0), reverse=True)

    critical = []
    for f in failures[:limit]:
        critical.append({
            'code': f['norm_code'],
            'title': f['norm_title'],
            'why': f.get('why', '')[:200] if f.get('why') else ''
        })

    return critical


def get_key_strengths(evals, limit=5):
    """Get the most important passed norms with justifications."""
    passes = [e for e in evals if e['result'] == 'YES']

    # Sort by confidence
    passes.sort(key=lambda x: x.get('confidence', 0), reverse=True)

    strengths = []
    for p in passes[:limit]:
        strengths.append({
            'code': p['norm_code'],
            'title': p['norm_title'],
            'why': p.get('why', '')[:200] if p.get('why') else ''
        })

    return strengths


def generate_strategic_conclusion(product_name, product_type, pillar, score, yes_count, no_count, tbd_count, critical_failures, key_strengths):
    """Generate a professional strategic conclusion."""
    pillar_name = PILLAR_NAMES[pillar]

    # Score-based assessment
    if score >= 90:
        assessment = "exceptional"
        risk_level = "minimal"
    elif score >= 80:
        assessment = "strong"
        risk_level = "low"
    elif score >= 70:
        assessment = "good"
        risk_level = "moderate"
    elif score >= 60:
        assessment = "adequate"
        risk_level = "elevated"
    elif score >= 50:
        assessment = "moderate"
        risk_level = "significant"
    elif score >= 40:
        assessment = "concerning"
        risk_level = "high"
    else:
        assessment = "critical"
        risk_level = "severe"

    # Build conclusion
    conclusion = f"{product_name} demonstrates {assessment} {pillar_name.lower()} with {score:.1f}% compliance across {yes_count + no_count} evaluated standards. "

    if pillar == 'S':
        if score >= 80:
            conclusion += f"Cryptographic foundations are well-implemented with {yes_count} security standards validated. "
        else:
            conclusion += f"Security gaps identified in {no_count} critical areas require attention. "
    elif pillar == 'A':
        if score >= 80:
            conclusion += f"Protection against adversarial scenarios is robust with strong compliance across {yes_count} resilience criteria. "
        else:
            conclusion += f"Adversity resistance needs strengthening - {no_count} protection mechanisms are insufficient. "
    elif pillar == 'F':
        if score >= 80:
            conclusion += f"Long-term reliability is well-established with {yes_count} quality and durability standards met. "
        else:
            conclusion += f"Fidelity concerns in {no_count} areas may impact long-term asset preservation. "
    elif pillar == 'E':
        if score >= 80:
            conclusion += f"Ecosystem integration is excellent with broad support across {yes_count} compatibility criteria. "
        else:
            conclusion += f"Limited ecosystem support in {no_count} areas may restrict usability. "

    conclusion += f"Overall {pillar_name.lower()} risk level: {risk_level}."

    if tbd_count > 0:
        conclusion += f" Note: {tbd_count} standards await verification."

    return conclusion


def generate_key_strengths_list(pillar, key_strengths, yes_count, no_count):
    """Generate list of key strengths."""
    strengths = []

    if yes_count > no_count:
        strengths.append(f"Strong overall {PILLAR_NAMES[pillar].lower()} compliance ({yes_count}/{yes_count+no_count} standards passed)")

    for s in key_strengths[:3]:
        if s['why']:
            strengths.append(f"{s['code']}: {s['title']} - {s['why'][:100]}")
        else:
            strengths.append(f"{s['code']}: {s['title']}")

    return strengths[:5]


def generate_key_weaknesses_list(pillar, critical_failures, no_count, total):
    """Generate list of key weaknesses."""
    weaknesses = []

    if no_count > 0:
        pct = (no_count / total * 100) if total > 0 else 0
        if pct > 30:
            weaknesses.append(f"Significant {PILLAR_NAMES[pillar].lower()} gaps: {no_count} standards failed ({pct:.0f}%)")

    for f in critical_failures[:3]:
        if f['why']:
            weaknesses.append(f"{f['code']}: {f['title']} - {f['why'][:100]}")
        else:
            weaknesses.append(f"Missing {f['code']}: {f['title']}")

    return weaknesses[:5]


def generate_critical_risks(pillar, score, critical_failures, no_count):
    """Generate list of critical risks."""
    risks = []

    if pillar == 'S':
        if score < 70:
            risks.append("High vulnerability to cryptographic attacks due to implementation gaps")
        for f in critical_failures[:2]:
            if 'encrypt' in f['title'].lower() or 'key' in f['title'].lower():
                risks.append(f"Critical: {f['title']} - potential data exposure risk")
            elif 'sign' in f['title'].lower() or 'auth' in f['title'].lower():
                risks.append(f"Critical: {f['title']} - potential unauthorized transaction risk")

    elif pillar == 'A':
        if score < 70:
            risks.append("Limited protection against physical coercion or regulatory pressure")
        for f in critical_failures[:2]:
            if 'duress' in f['title'].lower() or 'panic' in f['title'].lower():
                risks.append(f"Critical: {f['title']} - no coercion protection")
            elif 'privacy' in f['title'].lower() or 'anonym' in f['title'].lower():
                risks.append(f"Critical: {f['title']} - privacy exposure risk")

    elif pillar == 'F':
        if score < 70:
            risks.append("Risk of asset loss due to inadequate backup or recovery mechanisms")
        for f in critical_failures[:2]:
            if 'backup' in f['title'].lower() or 'recovery' in f['title'].lower():
                risks.append(f"Critical: {f['title']} - potential permanent asset loss")
            elif 'quality' in f['title'].lower() or 'durability' in f['title'].lower():
                risks.append(f"Critical: {f['title']} - hardware failure risk")

    elif pillar == 'E':
        if score < 70:
            risks.append("Limited usability due to poor ecosystem integration")
        for f in critical_failures[:2]:
            if 'chain' in f['title'].lower() or 'network' in f['title'].lower():
                risks.append(f"Limitation: {f['title']} - restricted blockchain access")
            elif 'token' in f['title'].lower() or 'defi' in f['title'].lower():
                risks.append(f"Limitation: {f['title']} - limited DeFi functionality")

    return risks[:5]


def generate_recommendations(pillar, score, critical_failures, tbd_count):
    """Generate actionable recommendations."""
    recommendations = []

    # Priority based on score
    if score < 60:
        recommendations.append(f"URGENT: Address critical {PILLAR_NAMES[pillar].lower()} gaps before production use")
    elif score < 80:
        recommendations.append(f"Improve {PILLAR_NAMES[pillar].lower()} compliance to reduce risk exposure")

    # Specific recommendations based on failures
    for f in critical_failures[:2]:
        recommendations.append(f"Implement {f['code']}: {f['title']}")

    # TBD recommendations
    if tbd_count > 10:
        recommendations.append(f"Complete evaluation of {tbd_count} pending standards for full assessment")
    elif tbd_count > 0:
        recommendations.append(f"Verify remaining {tbd_count} standards for complete coverage")

    # Pillar-specific generic recommendations
    if pillar == 'S' and score < 80:
        recommendations.append("Consider third-party security audit for cryptographic implementations")
    elif pillar == 'A' and score < 80:
        recommendations.append("Evaluate adding duress protection and privacy-enhancing features")
    elif pillar == 'F' and score < 80:
        recommendations.append("Implement redundant backup mechanisms and recovery testing procedures")
    elif pillar == 'E' and score < 80:
        recommendations.append("Expand blockchain and protocol support to improve user accessibility")

    return recommendations[:5]


# Generate analyses for all products
analyses = []
products_map = {p['id']: p for p in products}
total_products = len(product_pillar_evals)
count = 0

for product_id, pillars_data in product_pillar_evals.items():
    count += 1

    if product_id not in products_map:
        continue

    product = products_map[product_id]
    product_name = product['name']
    product_type_id = product.get('type_id')
    product_type = types_map.get(product_type_id, {}).get('name', 'Unknown')

    if count % 50 == 0:
        print(f"   Progress: {count}/{total_products} products ({count/total_products*100:.1f}%)")

    for pillar in PILLARS:
        evals = pillars_data.get(pillar, [])

        if not evals:
            continue

        # Calculate metrics
        score, yes_count, no_count, tbd_count, na_count, confidence = calculate_pillar_score(evals)

        # Skip if too few evaluations
        if yes_count + no_count < 3:
            continue

        # Get detailed analysis data
        critical_failures = get_critical_failures(evals)
        key_strengths = get_key_strengths(evals)

        # Generate analysis components
        conclusion = generate_strategic_conclusion(
            product_name, product_type, pillar, score,
            yes_count, no_count, tbd_count, critical_failures, key_strengths
        )

        strengths_list = generate_key_strengths_list(pillar, key_strengths, yes_count, no_count)
        weaknesses_list = generate_key_weaknesses_list(pillar, critical_failures, no_count, yes_count + no_count)
        risks_list = generate_critical_risks(pillar, score, critical_failures, no_count)
        recommendations_list = generate_recommendations(pillar, score, critical_failures, tbd_count)

        # Build analysis record
        analysis = {
            'product_id': product_id,
            'pillar': pillar,
            'pillar_score': round(score, 2),
            'confidence_score': confidence,
            'strategic_conclusion': conclusion,
            'key_strengths': strengths_list,
            'key_weaknesses': weaknesses_list,
            'critical_risks': risks_list,
            'recommendations': recommendations_list,
            'evaluated_norms_count': len(evals),
            'passed_norms_count': yes_count,
            'failed_norms_count': no_count,
            'tbd_norms_count': tbd_count,
            'community_vote_count': 0,
            'generated_by': 'claude_opus_4.5_strategic_v2',
            'generated_at': datetime.utcnow().isoformat() + 'Z'
        }

        analyses.append(analysis)

print(f"\n   Generated {len(analyses)} strategic analyses")

# =============================================================================
# IMPORT TO DATABASE
# =============================================================================
print("\nImporting to database...")

batch_size = 50
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
            timeout=60
        )

        if r.status_code in [200, 201]:
            imported += len(batch)
            if imported % 200 == 0 or imported == len(analyses):
                print(f"   Imported: {imported}/{len(analyses)} ({imported/len(analyses)*100:.1f}%)")
        else:
            errors += 1
            if errors <= 5:
                print(f"   Error: {r.status_code} - {r.text[:200]}")
    except Exception as e:
        errors += 1
        if errors <= 5:
            print(f"   Exception: {str(e)[:100]}")

# =============================================================================
# SUMMARY
# =============================================================================
print("\n" + "=" * 70)
print("COMPLETE!")
print("=" * 70)
print(f"Finished at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print(f"\nSummary:")
print(f"  - Products analyzed: {total_products}")
print(f"  - Analyses generated: {len(analyses)}")
print(f"  - Successfully imported: {imported}")
print(f"  - Errors: {errors}")

# Breakdown by pillar
pillar_counts = defaultdict(int)
for a in analyses:
    pillar_counts[a['pillar']] += 1

print(f"\nAnalyses by pillar:")
for pillar in PILLARS:
    print(f"  - {pillar} ({PILLAR_NAMES[pillar]}): {pillar_counts[pillar]}")

print(f"\nStrategic analyses are now available via API:")
print(f"  GET /api/products/[slug]/strategic-analyses")
