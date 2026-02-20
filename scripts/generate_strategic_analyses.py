#!/usr/bin/env python3
"""
Generate strategic analyses per product per pillar (S, A, F, E).
Uses Claude's analytical logic - NO free AI APIs.

For each product and pillar:
- Calculate pillar score from evaluations
- Analyze norm results to generate strategic conclusions
- Identify key strengths, weaknesses, risks, and recommendations
"""
import sys
sys.path.insert(0, 'src')
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)) + '/..')

import requests
from core.config import SUPABASE_URL, get_supabase_headers

headers = get_supabase_headers()

# OPTIMIZATION: Load ALL norms into memory once
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

print(f"Loaded {len(norms_map)} norms into memory")

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

# Pillars to analyze
PILLARS = ['S', 'A', 'F', 'E']
PILLAR_NAMES = {
    'S': 'Security',
    'A': 'Adversity',
    'F': 'Fidelity',
    'E': 'Ecosystem'
}

def get_pillar_evaluations(product_id, pillar):
    """Get all evaluations for a product for a specific pillar - OPTIMIZED."""
    # Get ALL evaluations for this product at once
    evals = []
    offset = 0
    while True:
        r = requests.get(
            f'{SUPABASE_URL}/rest/v1/evaluations?select=norm_id,result,why_this_result,confidence_score&product_id=eq.{product_id}&offset={offset}&limit=1000',
            headers=headers
        )
        if r.status_code != 200 or not r.json():
            break

        batch = r.json()

        # Filter by pillar using in-memory norms_map (NO API calls!)
        for e in batch:
            if e['norm_id'] in norms_map:
                norm = norms_map[e['norm_id']]
                if norm['pillar'] == pillar:
                    e['norm_code'] = norm['code']
                    e['norm_title'] = norm['title']
                    evals.append(e)

        offset += 1000
        if len(batch) < 1000:
            break

    return evals

def analyze_pillar_results(product_name, pillar, evaluations):
    """
    Generate strategic analysis based on evaluation results.
    Uses Claude's logic - no external AI.
    """
    if not evaluations:
        return {
            'strategic_conclusion': f"No {PILLAR_NAMES[pillar]} evaluations available for {product_name}.",
            'key_strengths': [],
            'key_weaknesses': [],
            'critical_risks': [],
            'recommendations': ["Awaiting comprehensive {PILLAR_NAMES[pillar]} evaluation."]
        }

    # Count results
    yes_count = sum(1 for e in evaluations if e['result'] == 'YES')
    no_count = sum(1 for e in evaluations if e['result'] == 'NO')
    tbd_count = sum(1 for e in evaluations if e['result'] == 'TBD')
    total = len(evaluations)

    # Calculate score
    score = (yes_count * 100.0 / (yes_count + no_count)) if (yes_count + no_count) > 0 else 0

    # Strategic analysis based on pillar type and score
    if pillar == 'S':  # Security
        return analyze_security_pillar(product_name, score, yes_count, no_count, tbd_count, evaluations)
    elif pillar == 'A':  # Adversity
        return analyze_adversity_pillar(product_name, score, yes_count, no_count, tbd_count, evaluations)
    elif pillar == 'F':  # Fidelity
        return analyze_fidelity_pillar(product_name, score, yes_count, no_count, tbd_count, evaluations)
    elif pillar == 'E':  # Ecosystem
        return analyze_ecosystem_pillar(product_name, score, yes_count, no_count, tbd_count, evaluations)

def analyze_security_pillar(product_name, score, yes, no, tbd, evals):
    """Strategic analysis for Security pillar."""
    strengths = []
    weaknesses = []
    risks = []
    recommendations = []

    # Overall assessment
    if score >= 90:
        conclusion = f"{product_name} demonstrates exceptional security posture with {score:.1f}% compliance across cryptographic, hardware, and software security standards."
        strengths.append(f"Outstanding security compliance ({yes}/{yes+no} norms passed)")
    elif score >= 75:
        conclusion = f"{product_name} shows strong security practices with {score:.1f}% compliance, meeting most industry standards."
        strengths.append(f"Strong security foundation ({yes}/{yes+no} norms passed)")
    elif score >= 60:
        conclusion = f"{product_name} has moderate security implementation with {score:.1f}% compliance. Several critical standards require attention."
        weaknesses.append(f"Moderate security gaps ({no} norms failed)")
    else:
        conclusion = f"{product_name} exhibits significant security concerns with only {score:.1f}% compliance. Immediate security improvements required."
        weaknesses.append(f"Critical security deficiencies ({no} norms failed)")
        risks.append("High vulnerability to security threats")

    # Specific risk assessment
    failed_security_norms = [e for e in evals if e['result'] == 'NO']
    if failed_security_norms:
        critical_failed = failed_security_norms[:3]
        for norm in critical_failed:
            risks.append(f"Does not implement {norm.get('norm_code', 'standard')}: {norm.get('norm_title', '')[:80]}")

    # Recommendations based on score
    if score < 80:
        recommendations.append("Implement missing cryptographic standards and security best practices")
        recommendations.append("Conduct comprehensive security audit to address identified gaps")
    if tbd > yes + no:
        recommendations.append(f"Complete evaluation of {tbd} pending security standards")

    return {
        'strategic_conclusion': conclusion,
        'key_strengths': strengths[:5],
        'key_weaknesses': weaknesses[:5],
        'critical_risks': risks[:5],
        'recommendations': recommendations[:5]
    }

def analyze_adversity_pillar(product_name, score, yes, no, tbd, evals):
    """Strategic analysis for Adversity pillar (regulatory, physical resilience)."""
    strengths = []
    weaknesses = []
    risks = []
    recommendations = []

    if score >= 85:
        conclusion = f"{product_name} demonstrates excellent adversity resilience with {score:.1f}% compliance across regulatory and physical security requirements."
        strengths.append(f"Strong regulatory compliance ({yes}/{yes+no} norms passed)")
    elif score >= 70:
        conclusion = f"{product_name} shows good adversity resistance with {score:.1f}% compliance, meeting most regulatory and durability standards."
        strengths.append(f"Good adversity preparedness ({yes}/{yes+no} norms passed)")
    elif score >= 50:
        conclusion = f"{product_name} has moderate adversity protection with {score:.1f}% compliance. Regulatory gaps present risks."
        weaknesses.append(f"Regulatory compliance gaps ({no} norms failed)")
    else:
        conclusion = f"{product_name} shows weak adversity protection with only {score:.1f}% compliance. Critical regulatory and durability issues."
        weaknesses.append(f"Severe adversity vulnerabilities ({no} norms failed)")
        risks.append("High exposure to regulatory and physical threats")

    failed_adversity_norms = [e for e in evals if e['result'] == 'NO']
    if failed_adversity_norms:
        for norm in failed_adversity_norms[:3]:
            risks.append(f"Non-compliant with {norm.get('norm_code', '')}: {norm.get('norm_title', '')[:80]}")

    if score < 70:
        recommendations.append("Address regulatory compliance gaps to reduce legal and operational risks")
        recommendations.append("Improve physical resilience and durability standards")

    return {
        'strategic_conclusion': conclusion,
        'key_strengths': strengths[:5],
        'key_weaknesses': weaknesses[:5],
        'critical_risks': risks[:5],
        'recommendations': recommendations[:5]
    }

def analyze_fidelity_pillar(product_name, score, yes, no, tbd, evals):
    """Strategic analysis for Fidelity pillar (backup, recovery, transparency)."""
    strengths = []
    weaknesses = []
    risks = []
    recommendations = []

    if score >= 85:
        conclusion = f"{product_name} excels in fidelity with {score:.1f}% compliance, providing excellent backup, recovery, and transparency mechanisms."
        strengths.append(f"Robust fidelity practices ({yes}/{yes+no} norms passed)")
    elif score >= 70:
        conclusion = f"{product_name} demonstrates good fidelity with {score:.1f}% compliance across backup and transparency standards."
        strengths.append(f"Solid fidelity implementation ({yes}/{yes+no} norms passed)")
    elif score >= 50:
        conclusion = f"{product_name} has moderate fidelity with {score:.1f}% compliance. Backup and recovery improvements recommended."
        weaknesses.append(f"Fidelity gaps in critical areas ({no} norms failed)")
    else:
        conclusion = f"{product_name} shows concerning fidelity issues with only {score:.1f}% compliance. Recovery mechanisms insufficient."
        weaknesses.append(f"Critical fidelity deficiencies ({no} norms failed)")
        risks.append("High risk of asset loss due to inadequate backup/recovery")

    failed_fidelity_norms = [e for e in evals if e['result'] == 'NO']
    if failed_fidelity_norms:
        for norm in failed_fidelity_norms[:3]:
            risks.append(f"Lacks {norm.get('norm_code', '')}: {norm.get('norm_title', '')[:80]}")

    if score < 75:
        recommendations.append("Implement comprehensive backup and recovery mechanisms")
        recommendations.append("Improve transparency and documentation standards")

    return {
        'strategic_conclusion': conclusion,
        'key_strengths': strengths[:5],
        'key_weaknesses': weaknesses[:5],
        'critical_risks': risks[:5],
        'recommendations': recommendations[:5]
    }

def analyze_ecosystem_pillar(product_name, score, yes, no, tbd, evals):
    """Strategic analysis for Ecosystem pillar (standards, interoperability)."""
    strengths = []
    weaknesses = []
    risks = []
    recommendations = []

    if score >= 85:
        conclusion = f"{product_name} demonstrates excellent ecosystem integration with {score:.1f}% compliance across industry standards and protocols."
        strengths.append(f"Strong standards compliance ({yes}/{yes+no} norms passed)")
    elif score >= 70:
        conclusion = f"{product_name} shows good ecosystem compatibility with {score:.1f}% compliance with key industry standards."
        strengths.append(f"Good ecosystem integration ({yes}/{yes+no} norms passed)")
    elif score >= 50:
        conclusion = f"{product_name} has moderate ecosystem support with {score:.1f}% compliance. Limited interoperability may restrict usage."
        weaknesses.append(f"Ecosystem compatibility gaps ({no} norms failed)")
    else:
        conclusion = f"{product_name} exhibits limited ecosystem integration with only {score:.1f}% compliance. Poor standards support."
        weaknesses.append(f"Poor ecosystem standards support ({no} norms failed)")
        risks.append("Limited interoperability with industry ecosystem")

    failed_ecosystem_norms = [e for e in evals if e['result'] == 'NO']
    if failed_ecosystem_norms:
        for norm in failed_ecosystem_norms[:3]:
            risks.append(f"Missing support for {norm.get('norm_code', '')}: {norm.get('norm_title', '')[:80]}")

    if score < 75:
        recommendations.append("Implement missing industry standards for better ecosystem integration")
        recommendations.append("Improve interoperability with common protocols and interfaces")

    return {
        'strategic_conclusion': conclusion,
        'key_strengths': strengths[:5],
        'key_weaknesses': weaknesses[:5],
        'critical_risks': risks[:5],
        'recommendations': recommendations[:5]
    }

# Generate analyses
print("\nGenerating strategic analyses...")

analyses = []
total = len(products) * len(PILLARS)
count = 0

for product in products:
    print(f"\nAnalyzing {product['name']} (ID {product['id']})...")

    for pillar in PILLARS:
        count += 1
        print(f"  [{count}/{total}] Pillar {pillar} ({PILLAR_NAMES[pillar]})...", end=' ', flush=True)

        # Get evaluations for this pillar
        evals = get_pillar_evaluations(product['id'], pillar)

        if not evals:
            print(f"No evaluations found")
            continue

        # Calculate scores
        yes_count = sum(1 for e in evals if e['result'] == 'YES')
        no_count = sum(1 for e in evals if e['result'] == 'NO')
        tbd_count = sum(1 for e in evals if e['result'] == 'TBD')

        pillar_score = (yes_count * 100.0 / (yes_count + no_count)) if (yes_count + no_count) > 0 else 0
        confidence = 0.90 if (yes_count + no_count) >= 10 else 0.70

        # Generate strategic analysis
        analysis = analyze_pillar_results(product['name'], pillar, evals)

        # Create record
        record = {
            'product_id': product['id'],
            'pillar': pillar,
            'pillar_score': round(pillar_score, 2),
            'confidence_score': confidence,
            'strategic_conclusion': analysis['strategic_conclusion'],
            'key_strengths': analysis['key_strengths'],
            'key_weaknesses': analysis['key_weaknesses'],
            'critical_risks': analysis['critical_risks'],
            'recommendations': analysis['recommendations'],
            'evaluated_norms_count': len(evals),
            'passed_norms_count': yes_count,
            'failed_norms_count': no_count,
            'tbd_norms_count': tbd_count
        }

        analyses.append(record)
        print(f"Score: {pillar_score:.1f}% ({yes_count}/{yes_count+no_count})")

print(f"\nGenerated {len(analyses)} strategic analyses")
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
        print(f"Imported: {imported} / {len(analyses)}", flush=True)
    else:
        print(f"Error: {r.status_code} - {r.text[:200]}")

print(f"\nComplete! Imported {imported} strategic analyses")
