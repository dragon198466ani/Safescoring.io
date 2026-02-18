#!/usr/bin/env python3
"""
DEEP STRATEGIC ANALYSES WITH WORST-CASE SCENARIOS
Uses Claude Opus to generate nuanced, personalized analyses per product per pillar.

NOT generic advice - tailored to each product's specific weaknesses and evaluation results.
Imagines worst-case scenarios and provides concrete solutions to avoid/counter them.
"""
import sys
sys.path.insert(0, 'src')
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)) + '/..')

import requests
import json
import subprocess
import tempfile
from collections import defaultdict
from datetime import datetime, timezone
from core.config import SUPABASE_URL, get_supabase_headers

print("=" * 70)
print("DEEP STRATEGIC ANALYSES - Claude Opus Quality")
print("Personalized worst-case scenarios & countermeasures")
print("=" * 70)

headers = get_supabase_headers()

PILLARS = ['S', 'A', 'F', 'E']
PILLAR_NAMES = {
    'S': 'Security',
    'A': 'Adversity',
    'F': 'Fidelity',
    'E': 'Ecosystem'
}

# =============================================================================
# LOAD DATA
# =============================================================================
print("\n[1/5] Loading data...")

# Load norms
norms_map = {}
offset = 0
while True:
    range_header = headers.copy()
    range_header['Range'] = f'{offset}-{offset + 999}'
    r = requests.get(f'{SUPABASE_URL}/rest/v1/norms?select=id,pillar,code,title,summary,is_essential', headers=range_header)
    if r.status_code not in [200, 206] or not r.json():
        break
    for n in r.json():
        norms_map[n['id']] = n
    if len(r.json()) < 1000:
        break
    offset += 1000
print(f"   Norms: {len(norms_map)}")

# Load products
products = []
offset = 0
while True:
    range_header = headers.copy()
    range_header['Range'] = f'{offset}-{offset + 999}'
    r = requests.get(f'{SUPABASE_URL}/rest/v1/products?select=id,name,slug,type_id,description', headers=range_header)
    if r.status_code not in [200, 206] or not r.json():
        break
    products.extend(r.json())
    if len(r.json()) < 1000:
        break
    offset += 1000
print(f"   Products: {len(products)}")

# Load product types
types_map = {}
r = requests.get(f'{SUPABASE_URL}/rest/v1/product_types?select=id,name,code', headers=headers)
if r.status_code == 200:
    for t in r.json():
        types_map[t['id']] = t
print(f"   Types: {len(types_map)}")

# Load evaluations
print("\n[2/5] Loading evaluations...")
evaluations = []
offset = 0
batch = 0
while True:
    batch += 1
    if batch % 100 == 0:
        print(f"   {len(evaluations)} evaluations...")
    range_header = headers.copy()
    range_header['Range'] = f'{offset}-{offset + 999}'
    try:
        r = requests.get(
            f'{SUPABASE_URL}/rest/v1/evaluations?select=product_id,norm_id,result,why_this_result',
            headers=range_header, timeout=60
        )
        if r.status_code not in [200, 206] or not r.json():
            break
        evaluations.extend(r.json())
        if len(r.json()) < 1000:
            break
        offset += 1000
    except:
        break
print(f"   Total: {len(evaluations)}")

# =============================================================================
# GROUP DATA
# =============================================================================
print("\n[3/5] Grouping evaluations...")
products_map = {p['id']: p for p in products}

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
        'why': (e.get('why_this_result') or '')[:500],
        'code': norm.get('code', ''),
        'title': norm.get('title', ''),
        'is_essential': norm.get('is_essential', False)
    })

print(f"   Grouped: {len(product_pillar_evals)} products")


def build_analysis_prompt(product_name, product_type, pillar, pillar_name, score, failures, strengths, tbd_items):
    """Build prompt for Claude to generate deep analysis."""

    # Format failures with justifications
    failures_text = ""
    for i, f in enumerate(failures[:10], 1):
        why = f.get('why', '').strip()
        essential = " [ESSENTIAL]" if f.get('is_essential') else ""
        failures_text += f"{i}. {f['code']}: {f['title']}{essential}\n"
        if why:
            failures_text += f"   Reason: {why}\n"

    # Format strengths
    strengths_text = ""
    for i, s in enumerate(strengths[:5], 1):
        strengths_text += f"{i}. {s['code']}: {s['title']}\n"

    prompt = f"""You are a crypto security expert analyzing {product_name} ({product_type}).

PILLAR: {pillar_name} ({pillar})
SCORE: {score:.1f}%

FAILED STANDARDS ({len(failures)} total):
{failures_text if failures_text else "None"}

PASSED STANDARDS ({len(strengths)} shown of many):
{strengths_text if strengths_text else "Few or none"}

PENDING VERIFICATION: {len(tbd_items)} standards

Generate a DEEP, PERSONALIZED analysis for an everyday user who is NOT tech-savvy.
This must be SPECIFIC to {product_name}, not generic advice.

Your response MUST be valid JSON with this exact structure:
{{
  "conclusion": "2-3 sentences explaining what this score means for {product_name} specifically, in simple terms",
  "worst_case_scenarios": [
    "Specific worst-case scenario 1 based on the actual failures listed above",
    "Specific worst-case scenario 2 based on actual failures",
    "Specific worst-case scenario 3 if applicable"
  ],
  "how_to_protect_yourself": [
    "Concrete action to counter scenario 1 - specific to {product_name}",
    "Concrete action to counter scenario 2",
    "Concrete action to counter scenario 3 if applicable"
  ],
  "what_this_product_does_well": [
    "Specific strength based on passed standards",
    "Another specific strength"
  ],
  "daily_habits": [
    "Simple daily habit to stay safe with {product_name}",
    "Another practical habit"
  ],
  "risk_level": "LOW/MEDIUM/HIGH/CRITICAL based on actual failures"
}}

IMPORTANT:
- Be SPECIFIC to {product_name} and its actual failures
- Imagine REALISTIC worst-case scenarios based on the failed standards
- Provide ACTIONABLE countermeasures, not vague advice
- Use SIMPLE language for non-technical users
- If score > 85%, focus on maintaining security; if < 60%, be direct about risks
- Each worst-case scenario must map to a protection measure

Return ONLY the JSON, no other text."""

    return prompt


def generate_analysis_with_claude(prompt):
    """Call Claude to generate analysis."""
    # Write prompt to temp file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8') as f:
        f.write(prompt)
        prompt_file = f.name

    try:
        # Call Claude via subprocess (this uses Claude Code CLI)
        result = subprocess.run(
            ['claude', '-p', prompt, '--output-format', 'text'],
            capture_output=True,
            text=True,
            timeout=120,
            encoding='utf-8'
        )

        if result.returncode == 0:
            response = result.stdout.strip()
            # Try to parse as JSON
            # Find JSON in response
            start = response.find('{')
            end = response.rfind('}') + 1
            if start >= 0 and end > start:
                json_str = response[start:end]
                return json.loads(json_str)

        return None
    except Exception as e:
        print(f"      Error: {e}")
        return None
    finally:
        try:
            os.unlink(prompt_file)
        except:
            pass


def calculate_score(evals):
    """Calculate pillar score."""
    yes = sum(1 for e in evals if e['result'] in ['YES', 'YESp'])
    no = sum(1 for e in evals if e['result'] == 'NO')
    tbd = sum(1 for e in evals if e['result'] == 'TBD')
    total = yes + no
    score = (yes * 100.0 / total) if total > 0 else 0
    confidence = 0.95 if total >= 50 else 0.90 if total >= 20 else 0.80
    return score, yes, no, tbd, confidence


# =============================================================================
# GENERATE ANALYSES
# =============================================================================
print("\n[4/5] Generating deep analyses with Claude Opus...")

analyses = []
total = len(product_pillar_evals)
count = 0
errors = 0

# Process all products
for product_id, pillars_data in product_pillar_evals.items():
    count += 1

    if product_id not in products_map:
        continue

    product = products_map[product_id]
    product_name = product['name']
    product_type_id = product.get('type_id')
    product_type = types_map.get(product_type_id, {}).get('name', 'Unknown')

    if count % 10 == 0:
        print(f"   [{count}/{total}] Processing {product_name}...")

    for pillar in PILLARS:
        evals = pillars_data.get(pillar, [])
        if not evals:
            continue

        score, yes_count, no_count, tbd_count, confidence = calculate_score(evals)

        if yes_count + no_count < 5:
            continue

        # Get failures and strengths
        failures = [e for e in evals if e['result'] == 'NO']
        failures.sort(key=lambda x: (not x.get('is_essential', False)))

        strengths = [e for e in evals if e['result'] in ['YES', 'YESp']]
        tbd_items = [e for e in evals if e['result'] == 'TBD']

        # Build prompt
        prompt = build_analysis_prompt(
            product_name, product_type, pillar, PILLAR_NAMES[pillar],
            score, failures, strengths, tbd_items
        )

        # Generate with Claude
        claude_response = generate_analysis_with_claude(prompt)

        if claude_response:
            # Build analysis record
            analysis = {
                'product_id': product_id,
                'pillar': pillar,
                'pillar_score': round(score, 2),
                'confidence_score': confidence,
                'strategic_conclusion': claude_response.get('conclusion', ''),
                'key_strengths': claude_response.get('what_this_product_does_well', [])[:5],
                'key_weaknesses': claude_response.get('worst_case_scenarios', [])[:5],
                'critical_risks': claude_response.get('how_to_protect_yourself', [])[:5],
                'recommendations': claude_response.get('daily_habits', [])[:5],
                'evaluated_norms_count': len(evals),
                'passed_norms_count': yes_count,
                'failed_norms_count': no_count,
                'tbd_norms_count': tbd_count,
                'community_vote_count': 0,
                'generated_by': 'claude_opus_4.5_deep_v5',
                'generated_at': datetime.now(timezone.utc).isoformat()
            }
            analyses.append(analysis)
        else:
            errors += 1
            # Fallback to basic analysis
            risk_level = "LOW" if score >= 85 else "MEDIUM" if score >= 70 else "HIGH" if score >= 50 else "CRITICAL"

            analysis = {
                'product_id': product_id,
                'pillar': pillar,
                'pillar_score': round(score, 2),
                'confidence_score': confidence,
                'strategic_conclusion': f"{product_name} scores {score:.0f}% in {PILLAR_NAMES[pillar]}. Risk level: {risk_level}.",
                'key_strengths': [f"Passed {yes_count} standards"],
                'key_weaknesses': [f"Failed {no_count} standards"],
                'critical_risks': [f"Review {no_count} gaps"],
                'recommendations': ["Review detailed evaluation results"],
                'evaluated_norms_count': len(evals),
                'passed_norms_count': yes_count,
                'failed_norms_count': no_count,
                'tbd_norms_count': tbd_count,
                'community_vote_count': 0,
                'generated_by': 'fallback_basic',
                'generated_at': datetime.now(timezone.utc).isoformat()
            }
            analyses.append(analysis)

print(f"\n   Generated {len(analyses)} analyses ({errors} fallbacks)")

# =============================================================================
# IMPORT TO DATABASE
# =============================================================================
print("\n[5/5] Importing to database...")

import_headers = get_supabase_headers(use_service_key=True, prefer='resolution=merge-duplicates')
batch_size = 50
imported = 0

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
            if imported % 200 == 0 or imported >= len(analyses):
                print(f"   Imported: {imported}/{len(analyses)}")
    except Exception as e:
        print(f"   Error: {e}")

print("\n" + "=" * 70)
print("COMPLETE!")
print(f"Generated: {len(analyses)} | Imported: {imported} | Errors: {errors}")
print("=" * 70)
