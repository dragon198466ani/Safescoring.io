#!/usr/bin/env python3
"""
STRATEGIC PILLAR ANALYSES GENERATOR v3
Generates expert-level strategic analyses per product per pillar (S, A, F, E).

KEY IMPROVEMENTS:
- Uses evaluation justifications (why_this_result) for concrete security advice
- Extracts specific vulnerabilities and protections from evaluations
- Provides actionable user-focused security recommendations
- All output in English for international audience
"""
import sys
sys.path.insert(0, 'src')
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)) + '/..')

import requests
import json
import re
from collections import defaultdict
from datetime import datetime, timezone
from core.config import SUPABASE_URL, get_supabase_headers

print("=" * 70)
print("STRATEGIC PILLAR ANALYSES GENERATOR v3")
print("With Evaluation Justifications for Actionable Security Advice")
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

PILLAR_USER_FOCUS = {
    'S': "What cryptographic protections secure your assets",
    'A': "How you're protected against threats, coercion, and attacks",
    'F': "Long-term reliability and backup capabilities",
    'E': "Compatibility and ease of use across platforms"
}

# =============================================================================
# STEP 1: LOAD ALL NORMS
# =============================================================================
print("\n[1/6] Loading all norms into memory...")
norms_map = {}

norm_offset = 0
norm_limit = 1000
while True:
    range_header = headers.copy()
    range_header['Range'] = f'{norm_offset}-{norm_offset + norm_limit - 1}'

    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/norms?select=id,pillar,code,title,summary,is_essential',
        headers=range_header
    )

    if r.status_code not in [200, 206]:
        print(f"   Error loading norms: {r.status_code}")
        break

    data = r.json()
    if not data:
        break

    for norm in data:
        norms_map[norm['id']] = norm

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
    if batch_num % 50 == 0:
        print(f"   Batch {batch_num}: loaded {len(evaluations)} evaluations so far...")

    range_header = headers.copy()
    range_header['Range'] = f'{eval_offset}-{eval_offset + eval_limit - 1}'

    try:
        r = requests.get(
            f'{SUPABASE_URL}/rest/v1/evaluations?select=id,product_id,norm_id,result,why_this_result,confidence_score',
            headers=range_header,
            timeout=60
        )

        if r.status_code not in [200, 206]:
            print(f"   Stopping at batch {batch_num}: {r.status_code}")
            break

        data = r.json()
        if not data:
            break

        evaluations.extend(data)

        if len(data) < eval_limit:
            break

        eval_offset += eval_limit

    except Exception as e:
        print(f"   Error at batch {batch_num}: {e}")
        break

print(f"   Loaded {len(evaluations)} evaluations total")

# =============================================================================
# STEP 5: GROUP EVALUATIONS BY PRODUCT AND PILLAR
# =============================================================================
print("\n[5/6] Grouping evaluations by product × pillar...")

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
        'why': e.get('why_this_result', '') or '',
        'confidence': e.get('confidence_score', 0) or 0,
        'norm_code': norm.get('code', ''),
        'norm_title': norm.get('title', ''),
        'norm_summary': norm.get('summary', '') or '',
        'is_essential': norm.get('is_essential', False)
    })

print(f"   Grouped into {len(product_pillar_evals)} products with evaluations")

# =============================================================================
# STEP 6: GENERATE STRATEGIC ANALYSES
# =============================================================================
print("\n[6/6] Generating strategic analyses with security advice...")


def calculate_pillar_score(evals):
    """Calculate pillar score from evaluations."""
    yes_count = sum(1 for e in evals if e['result'] in ['YES', 'YESp'])
    no_count = sum(1 for e in evals if e['result'] == 'NO')
    tbd_count = sum(1 for e in evals if e['result'] == 'TBD')
    na_count = sum(1 for e in evals if e['result'] == 'N/A')

    total = yes_count + no_count
    score = (yes_count * 100.0 / total) if total > 0 else 0

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


def extract_security_insights(evals, result_filter='NO', limit=10):
    """Extract security insights from evaluation justifications."""
    filtered = [e for e in evals if e['result'] == result_filter and e.get('why')]

    # Sort by essential first, then confidence
    filtered.sort(key=lambda x: (not x.get('is_essential', False), -x.get('confidence', 0)))

    insights = []
    for e in filtered[:limit]:
        why = e.get('why', '')
        # Clean up the justification
        why_clean = why.strip()
        if len(why_clean) > 300:
            why_clean = why_clean[:297] + '...'

        insights.append({
            'code': e['norm_code'],
            'title': e['norm_title'],
            'why': why_clean,
            'is_essential': e.get('is_essential', False)
        })

    return insights


def generate_user_focused_conclusion(product_name, product_type, pillar, score, yes_count, no_count, tbd_count, failures, strengths):
    """Generate a user-focused strategic conclusion."""
    pillar_name = PILLAR_NAMES[pillar]
    user_focus = PILLAR_USER_FOCUS[pillar]

    # Determine risk level
    if score >= 90:
        risk_level = "minimal"
        assessment = "excellent"
    elif score >= 80:
        risk_level = "low"
        assessment = "strong"
    elif score >= 70:
        risk_level = "moderate"
        assessment = "good"
    elif score >= 60:
        risk_level = "elevated"
        assessment = "adequate"
    elif score >= 50:
        risk_level = "significant"
        assessment = "moderate"
    else:
        risk_level = "high"
        assessment = "concerning"

    conclusion = f"{product_name} demonstrates {assessment} {pillar_name.lower()} ({score:.1f}% compliance). "

    # Add pillar-specific user-focused insight
    if pillar == 'S':
        if score >= 80:
            conclusion += f"Your cryptographic assets are protected by {yes_count} validated security standards. "
        else:
            conclusion += f"Critical security gaps in {no_count} areas require your attention. "
    elif pillar == 'A':
        if score >= 80:
            conclusion += f"Strong protection against {yes_count} threat scenarios including coercion and attacks. "
        else:
            conclusion += f"Vulnerability to {no_count} threat scenarios - consider additional precautions. "
    elif pillar == 'F':
        if score >= 80:
            conclusion += f"Reliable long-term asset preservation with {yes_count} quality standards met. "
        else:
            conclusion += f"Concerns in {no_count} reliability areas may impact long-term security. "
    elif pillar == 'E':
        if score >= 80:
            conclusion += f"Excellent compatibility across {yes_count} ecosystem standards. "
        else:
            conclusion += f"Limited support in {no_count} areas may restrict your options. "

    # Add key concern if any essential failures
    essential_failures = [f for f in failures if f.get('is_essential')]
    if essential_failures:
        conclusion += f"IMPORTANT: {len(essential_failures)} essential security standard(s) not met. "

    conclusion += f"Overall {pillar_name.lower()} risk: {risk_level}."

    if tbd_count > 5:
        conclusion += f" ({tbd_count} standards pending verification)"

    return conclusion


def generate_actionable_strengths(pillar, strengths, yes_count, no_count):
    """Generate user-actionable strengths based on evaluation justifications."""
    strength_list = []

    # Overall strength statement
    if yes_count > no_count:
        pct = (yes_count / (yes_count + no_count) * 100) if (yes_count + no_count) > 0 else 0
        strength_list.append(f"Strong {PILLAR_NAMES[pillar].lower()} foundation: {yes_count}/{yes_count+no_count} standards passed ({pct:.0f}%)")

    # Extract specific strengths from justifications
    for s in strengths[:4]:
        if s.get('why'):
            # Make the strength user-focused
            why = s['why']
            if pillar == 'S':
                strength_list.append(f"✓ {s['code']}: {s['title']} - {why[:120]}")
            elif pillar == 'A':
                strength_list.append(f"✓ {s['code']}: {s['title']} - {why[:120]}")
            elif pillar == 'F':
                strength_list.append(f"✓ {s['code']}: {s['title']} - {why[:120]}")
            elif pillar == 'E':
                strength_list.append(f"✓ {s['code']}: {s['title']} - {why[:120]}")
        else:
            strength_list.append(f"✓ Implements {s['code']}: {s['title']}")

    return strength_list[:5]


def generate_actionable_weaknesses(pillar, failures, no_count, total):
    """Generate user-actionable weaknesses with specific security advice."""
    weakness_list = []

    # Overall weakness statement
    if no_count > 0:
        pct = (no_count / total * 100) if total > 0 else 0
        if pct > 30:
            weakness_list.append(f"Significant gaps: {no_count} standards not met ({pct:.0f}%)")

    # Extract specific weaknesses with user advice
    for f in failures[:4]:
        if f.get('is_essential'):
            prefix = "⚠️ ESSENTIAL"
        else:
            prefix = "⚠️"

        if f.get('why'):
            weakness_list.append(f"{prefix} {f['code']}: {f['title']} - {f['why'][:100]}")
        else:
            weakness_list.append(f"{prefix} Missing {f['code']}: {f['title']}")

    return weakness_list[:5]


def generate_user_risks(pillar, score, failures, no_count):
    """Generate user-focused risk warnings based on failures."""
    risks = []

    # Get essential failures
    essential_failures = [f for f in failures if f.get('is_essential')]

    if pillar == 'S':
        if essential_failures:
            for f in essential_failures[:2]:
                risks.append(f"CRITICAL: {f['title']} not implemented - {f.get('why', 'may expose your private keys')[:80]}")
        if score < 70:
            risks.append("Your assets may be vulnerable to cryptographic attacks due to security gaps")

        # Specific security risks from failures
        for f in failures[:3]:
            if 'key' in f['title'].lower() or 'encrypt' in f['title'].lower():
                risks.append(f"Key security concern: {f['title']} - {f.get('why', '')[:80]}")
                break

    elif pillar == 'A':
        if essential_failures:
            for f in essential_failures[:2]:
                risks.append(f"CRITICAL: {f['title']} - {f.get('why', 'leaves you vulnerable to coercion')[:80]}")
        if score < 70:
            risks.append("Limited protection against physical threats, coercion, or regulatory pressure")

        for f in failures[:3]:
            if 'duress' in f['title'].lower() or 'panic' in f['title'].lower():
                risks.append(f"Coercion vulnerability: {f['title']} - no panic/duress protection")
                break

    elif pillar == 'F':
        if essential_failures:
            for f in essential_failures[:2]:
                risks.append(f"CRITICAL: {f['title']} - {f.get('why', 'risk of permanent asset loss')[:80]}")
        if score < 70:
            risks.append("Risk of asset loss due to inadequate backup or recovery mechanisms")

        for f in failures[:3]:
            if 'backup' in f['title'].lower() or 'recovery' in f['title'].lower():
                risks.append(f"Recovery risk: {f['title']} - {f.get('why', '')[:80]}")
                break

    elif pillar == 'E':
        if score < 70:
            risks.append("Limited blockchain or protocol support may restrict your DeFi options")

        for f in failures[:3]:
            if 'chain' in f['title'].lower() or 'network' in f['title'].lower():
                risks.append(f"Compatibility limitation: {f['title']} - {f.get('why', '')[:80]}")
                break

    return risks[:5]


def generate_user_recommendations(pillar, score, failures, tbd_count, product_type):
    """Generate actionable recommendations for users."""
    recommendations = []

    essential_failures = [f for f in failures if f.get('is_essential')]

    # Urgent recommendations for essential failures
    if essential_failures:
        recommendations.append(f"PRIORITY: Address {len(essential_failures)} essential security gap(s) before storing significant value")

    # Score-based recommendations
    if score < 60:
        recommendations.append(f"Consider pairing with a more secure {PILLAR_NAMES[pillar].lower()} solution to compensate for gaps")
    elif score < 80:
        recommendations.append(f"Review the {len([f for f in failures if f.get('why')])} identified weaknesses and assess your risk tolerance")

    # Pillar-specific user advice
    if pillar == 'S':
        if score < 80:
            recommendations.append("Consider using a hardware wallet for high-value storage")
        for f in failures[:2]:
            if f.get('why'):
                recommendations.append(f"Security action: {f['code']} - {f['title'][:50]}")

    elif pillar == 'A':
        if score < 80:
            recommendations.append("Create a security plan for physical threats and coercion scenarios")
        if any('duress' in f['title'].lower() for f in failures):
            recommendations.append("Set up a decoy wallet or plausible deniability if traveling with crypto")

    elif pillar == 'F':
        if score < 80:
            recommendations.append("Test your backup recovery process before storing significant value")
        if any('backup' in f['title'].lower() for f in failures):
            recommendations.append("Create multiple backup copies stored in different secure locations")

    elif pillar == 'E':
        if score < 80:
            recommendations.append("Verify support for all blockchains and tokens you plan to use")

    # TBD recommendations
    if tbd_count > 10:
        recommendations.append(f"Research the {tbd_count} unverified features before making security decisions")

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

    if count % 100 == 0:
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

        # Extract insights from justifications
        failures = extract_security_insights(evals, 'NO', 10)
        strengths = extract_security_insights(evals, 'YES', 10)

        # Generate user-focused analysis
        conclusion = generate_user_focused_conclusion(
            product_name, product_type, pillar, score,
            yes_count, no_count, tbd_count, failures, strengths
        )

        strengths_list = generate_actionable_strengths(pillar, strengths, yes_count, no_count)
        weaknesses_list = generate_actionable_weaknesses(pillar, failures, no_count, yes_count + no_count)
        risks_list = generate_user_risks(pillar, score, failures, no_count)
        recommendations_list = generate_user_recommendations(pillar, score, failures, tbd_count, product_type)

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
            'generated_by': 'claude_opus_4.5_strategic_v3',
            'generated_at': datetime.now(timezone.utc).isoformat()
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
            if imported % 500 == 0 or imported == len(analyses):
                print(f"   Imported: {imported}/{len(analyses)} ({imported/len(analyses)*100:.1f}%)")
        else:
            errors += 1
            if errors <= 3:
                print(f"   Error: {r.status_code} - {r.text[:200]}")
    except Exception as e:
        errors += 1
        if errors <= 3:
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

# Sample output
print(f"\nSample analysis structure (first product):")
if analyses:
    sample = analyses[0]
    print(f"  Product ID: {sample['product_id']}")
    print(f"  Pillar: {sample['pillar']} ({PILLAR_NAMES[sample['pillar']]})")
    print(f"  Score: {sample['pillar_score']}%")
    print(f"  Conclusion: {sample['strategic_conclusion'][:150]}...")
    print(f"  Strengths: {len(sample['key_strengths'])} items")
    print(f"  Weaknesses: {len(sample['key_weaknesses'])} items")
    print(f"  Risks: {len(sample['critical_risks'])} items")
    print(f"  Recommendations: {len(sample['recommendations'])} items")

print(f"\nStrategic analyses are now available via API:")
print(f"  GET /api/products/[slug]/strategic-analyses")
