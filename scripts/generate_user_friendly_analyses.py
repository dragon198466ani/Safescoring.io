#!/usr/bin/env python3
"""
USER-FRIENDLY STRATEGIC ANALYSES GENERATOR v4
Generates simple, practical security advice for everyday users who are not tech-savvy.

KEY PRINCIPLES:
- Simple language, no jargon
- Actionable daily advice
- Focus on what the user should DO, not technical details
- Pillar-specific practical tips
- All in English
"""
import sys
sys.path.insert(0, 'src')
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)) + '/..')

import requests
import json
from collections import defaultdict
from datetime import datetime, timezone
from core.config import SUPABASE_URL, get_supabase_headers

print("=" * 70)
print("USER-FRIENDLY STRATEGIC ANALYSES GENERATOR v4")
print("Simple, practical security advice for everyday users")
print("=" * 70)
print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

headers = get_supabase_headers()

# =============================================================================
# PILLAR DEFINITIONS - USER FRIENDLY
# =============================================================================
PILLARS = ['S', 'A', 'F', 'E']
PILLAR_NAMES = {
    'S': 'Security',
    'A': 'Adversity',
    'F': 'Fidelity',
    'E': 'Ecosystem'
}

# Simple explanations for users
PILLAR_USER_EXPLANATIONS = {
    'S': "How well your money and data are protected from hackers and thieves",
    'A': "How well you're protected if someone threatens you or tries to force you to give up your crypto",
    'F': "How reliable this product is over time and how easy it is to recover if something goes wrong",
    'E': "How easy it is to use and how well it works with other apps and services you might need"
}

# =============================================================================
# USER-FRIENDLY ADVICE TEMPLATES BY PILLAR AND SCORE
# =============================================================================

SECURITY_ADVICE = {
    'excellent': [
        "Your funds are well protected. Keep your PIN/password secret and never share it with anyone.",
        "Enable all security features offered by this product.",
        "Still be careful with phishing emails and fake websites pretending to be this service."
    ],
    'good': [
        "Good protection, but stay vigilant. Never click links in emails claiming to be from this service.",
        "Use a strong, unique password that you don't use anywhere else.",
        "Enable two-factor authentication (2FA) if available - it's like having two locks on your door."
    ],
    'moderate': [
        "Be extra careful. Don't store large amounts here until you understand the risks.",
        "Consider using a hardware wallet for your main savings and this product only for small amounts.",
        "Write down your recovery phrase and keep it somewhere safe offline - never on your phone or computer."
    ],
    'poor': [
        "WARNING: This product has security weaknesses. Only use for very small amounts you can afford to lose.",
        "Never store your life savings here. Consider a more secure alternative for important funds.",
        "Be very careful about what information you share and what links you click."
    ]
}

ADVERSITY_ADVICE = {
    'excellent': [
        "This product has features to protect you in dangerous situations.",
        "Learn about the panic/duress features before you need them.",
        "Consider setting up a decoy wallet with small amounts in case someone forces you to show your crypto."
    ],
    'good': [
        "Good protection against threats. Know how to quickly hide or secure your crypto if needed.",
        "Don't tell people how much crypto you have - it makes you a target.",
        "Have a plan for what to do if someone threatens you for your crypto."
    ],
    'moderate': [
        "Limited protection against threats. Be discreet about owning crypto.",
        "Don't show your portfolio balance in public places.",
        "Consider splitting your funds across multiple wallets so you never have to reveal everything."
    ],
    'poor': [
        "WARNING: Little protection if someone threatens you. Be very discreet about using this product.",
        "Never access this product in public where someone could see your screen.",
        "Consider using a different product with better privacy features for larger amounts."
    ]
}

FIDELITY_ADVICE = {
    'excellent': [
        "This product is reliable and has good backup options.",
        "Still make sure to back up your recovery phrase in multiple safe places.",
        "Test your backup by recovering on a different device before storing large amounts."
    ],
    'good': [
        "Good reliability. Make sure you have your recovery phrase written down and stored safely.",
        "Keep your recovery phrase in a fireproof safe or safety deposit box.",
        "Never store your recovery phrase digitally - no photos, no cloud storage, no email."
    ],
    'moderate': [
        "Some reliability concerns. Have multiple backup copies of your recovery information.",
        "Consider using a metal backup plate instead of paper - it survives fire and water.",
        "Tell a trusted family member where your backup is stored (but not what it says)."
    ],
    'poor': [
        "WARNING: Reliability issues detected. Don't put all your eggs in this basket.",
        "Keep smaller amounts here and use a more reliable product for your main savings.",
        "Check regularly that your funds are still accessible and the product is working."
    ]
}

ECOSYSTEM_ADVICE = {
    'excellent': [
        "This product works well with most other crypto services and apps.",
        "You can easily connect to popular apps and exchanges.",
        "Take time to learn the features - there's a lot you can do with this product."
    ],
    'good': [
        "Works with most common services. Check compatibility before trying new apps.",
        "The interface is reasonably easy to use - don't be afraid to explore.",
        "Look for tutorials or guides specific to this product if you get stuck."
    ],
    'moderate': [
        "Limited compatibility with some services. Check if it supports what you need before committing.",
        "You may need to use multiple products to do everything you want.",
        "Start with basic features and learn gradually - don't try everything at once."
    ],
    'poor': [
        "WARNING: Limited compatibility and features. Make sure it does what you need before using.",
        "You may find it difficult to connect with popular services.",
        "Consider a more versatile product if you want to use many different crypto apps."
    ]
}

# =============================================================================
# DATA LOADING FUNCTIONS
# =============================================================================

def load_all_data():
    """Load all necessary data from database."""
    print("\n[1/4] Loading norms...")
    norms_map = {}
    offset = 0
    while True:
        range_header = headers.copy()
        range_header['Range'] = f'{offset}-{offset + 999}'
        r = requests.get(
            f'{SUPABASE_URL}/rest/v1/norms?select=id,pillar,code,title,is_essential',
            headers=range_header
        )
        if r.status_code not in [200, 206] or not r.json():
            break
        for norm in r.json():
            norms_map[norm['id']] = norm
        if len(r.json()) < 1000:
            break
        offset += 1000
    print(f"   Loaded {len(norms_map)} norms")

    print("\n[2/4] Loading products...")
    products = []
    offset = 0
    while True:
        range_header = headers.copy()
        range_header['Range'] = f'{offset}-{offset + 999}'
        r = requests.get(
            f'{SUPABASE_URL}/rest/v1/products?select=id,name,slug,type_id',
            headers=range_header
        )
        if r.status_code not in [200, 206] or not r.json():
            break
        products.extend(r.json())
        if len(r.json()) < 1000:
            break
        offset += 1000
    print(f"   Loaded {len(products)} products")

    print("\n[3/4] Loading product types...")
    types_map = {}
    r = requests.get(f'{SUPABASE_URL}/rest/v1/product_types?select=id,name,code', headers=headers)
    if r.status_code == 200:
        for t in r.json():
            types_map[t['id']] = t
    print(f"   Loaded {len(types_map)} product types")

    print("\n[4/4] Loading evaluations...")
    evaluations = []
    offset = 0
    batch = 0
    while True:
        batch += 1
        if batch % 50 == 0:
            print(f"   Batch {batch}: {len(evaluations)} evaluations...")
        range_header = headers.copy()
        range_header['Range'] = f'{offset}-{offset + 999}'
        try:
            r = requests.get(
                f'{SUPABASE_URL}/rest/v1/evaluations?select=product_id,norm_id,result,why_this_result',
                headers=range_header,
                timeout=60
            )
            if r.status_code not in [200, 206] or not r.json():
                break
            evaluations.extend(r.json())
            if len(r.json()) < 1000:
                break
            offset += 1000
        except:
            break
    print(f"   Loaded {len(evaluations)} evaluations")

    return norms_map, products, types_map, evaluations


def group_evaluations(evaluations, norms_map):
    """Group evaluations by product and pillar."""
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
            'code': norm.get('code', ''),
            'title': norm.get('title', ''),
            'is_essential': norm.get('is_essential', False)
        })

    return product_pillar_evals


# =============================================================================
# ANALYSIS GENERATION
# =============================================================================

def get_score_category(score):
    """Get simple score category."""
    if score >= 85:
        return 'excellent'
    elif score >= 70:
        return 'good'
    elif score >= 50:
        return 'moderate'
    else:
        return 'poor'


def get_user_friendly_rating(score):
    """Get user-friendly rating description."""
    if score >= 90:
        return "Excellent"
    elif score >= 80:
        return "Very Good"
    elif score >= 70:
        return "Good"
    elif score >= 60:
        return "Acceptable"
    elif score >= 50:
        return "Fair"
    elif score >= 40:
        return "Below Average"
    else:
        return "Poor"


def calculate_score(evals):
    """Calculate pillar score."""
    yes = sum(1 for e in evals if e['result'] in ['YES', 'YESp'])
    no = sum(1 for e in evals if e['result'] == 'NO')
    tbd = sum(1 for e in evals if e['result'] == 'TBD')

    total = yes + no
    score = (yes * 100.0 / total) if total > 0 else 0

    confidence = 0.95 if total >= 50 else 0.90 if total >= 20 else 0.80 if total >= 10 else 0.70

    return score, yes, no, tbd, confidence


def get_main_issues(evals, limit=3):
    """Get main issues in simple language."""
    failures = [e for e in evals if e['result'] == 'NO']
    # Prioritize essential failures
    failures.sort(key=lambda x: (not x.get('is_essential', False)))

    issues = []
    for f in failures[:limit]:
        # Simplify the issue description
        title = f.get('title', '')
        why = f.get('why', '')

        # Create simple issue description
        if why and len(why) > 20:
            # Extract the key point from the justification
            simple_why = why[:150].split('.')[0]
            issues.append(f"{title}: {simple_why}")
        else:
            issues.append(f"Missing: {title}")

    return issues


def generate_user_conclusion(product_name, pillar, score, yes_count, no_count):
    """Generate simple user-friendly conclusion."""
    pillar_name = PILLAR_NAMES[pillar]
    explanation = PILLAR_USER_EXPLANATIONS[pillar]
    rating = get_user_friendly_rating(score)

    conclusion = f"{product_name} has {rating.lower()} {pillar_name.lower()} ({score:.0f}%). "
    conclusion += f"This means: {explanation}. "

    if score >= 85:
        conclusion += f"You can feel confident using this product for {pillar_name.lower()}."
    elif score >= 70:
        conclusion += f"Overall good, but pay attention to the advice below."
    elif score >= 50:
        conclusion += f"Some concerns - read the advice carefully before storing large amounts."
    else:
        conclusion += f"Significant concerns - consider alternatives for important funds."

    return conclusion


def generate_practical_advice(pillar, score, evals):
    """Generate practical everyday advice for users."""
    category = get_score_category(score)

    # Get base advice for this pillar and score level
    if pillar == 'S':
        base_advice = SECURITY_ADVICE.get(category, SECURITY_ADVICE['moderate'])
    elif pillar == 'A':
        base_advice = ADVERSITY_ADVICE.get(category, ADVERSITY_ADVICE['moderate'])
    elif pillar == 'F':
        base_advice = FIDELITY_ADVICE.get(category, FIDELITY_ADVICE['moderate'])
    else:  # E
        base_advice = ECOSYSTEM_ADVICE.get(category, ECOSYSTEM_ADVICE['moderate'])

    # Add specific advice based on failures
    specific_advice = []
    failures = [e for e in evals if e['result'] == 'NO' and e.get('is_essential')]

    if pillar == 'S':
        for f in failures[:2]:
            title_lower = f.get('title', '').lower()
            if 'encrypt' in title_lower or 'key' in title_lower:
                specific_advice.append("Be extra careful with your passwords and PINs.")
            elif '2fa' in title_lower or 'two-factor' in title_lower:
                specific_advice.append("Use additional security like email verification when possible.")
            elif 'backup' in title_lower:
                specific_advice.append("Make sure you have written down your recovery phrase.")

    elif pillar == 'A':
        for f in failures[:2]:
            title_lower = f.get('title', '').lower()
            if 'duress' in title_lower or 'panic' in title_lower:
                specific_advice.append("This product won't protect you if someone forces you to hand over your crypto.")
            elif 'privacy' in title_lower or 'anonym' in title_lower:
                specific_advice.append("Your activity may be visible to others - be discreet.")

    elif pillar == 'F':
        for f in failures[:2]:
            title_lower = f.get('title', '').lower()
            if 'backup' in title_lower or 'recovery' in title_lower:
                specific_advice.append("Recovery options are limited - triple-check your backups.")
            elif 'update' in title_lower or 'support' in title_lower:
                specific_advice.append("Check if the product is still actively maintained and updated.")

    elif pillar == 'E':
        for f in failures[:2]:
            title_lower = f.get('title', '').lower()
            if 'chain' in title_lower or 'network' in title_lower:
                specific_advice.append("Check if it supports all the cryptocurrencies you want to use.")
            elif 'connect' in title_lower or 'wallet' in title_lower:
                specific_advice.append("May not connect to all apps and services - verify compatibility first.")

    # Combine base and specific advice
    all_advice = list(base_advice) + specific_advice
    return all_advice[:5]


def generate_what_to_watch(pillar, failures):
    """Generate simple 'what to watch out for' list."""
    watch_list = []

    for f in failures[:3]:
        title = f.get('title', '')
        why = f.get('why', '')

        # Create simple warning
        if f.get('is_essential'):
            prefix = "Important: "
        else:
            prefix = "Note: "

        if why and len(why) > 10:
            watch_list.append(f"{prefix}{title} - {why[:80]}")
        else:
            watch_list.append(f"{prefix}{title} is not available")

    return watch_list


def generate_strengths_simple(pillar, evals, yes_count):
    """Generate simple list of what's good."""
    strengths = []

    if yes_count >= 10:
        strengths.append(f"Passed {yes_count} security checks in {PILLAR_NAMES[pillar].lower()}")

    # Get top passed items
    passed = [e for e in evals if e['result'] in ['YES', 'YESp'] and e.get('is_essential')]
    for p in passed[:2]:
        strengths.append(f"Has {p['title']}")

    return strengths[:4]


# =============================================================================
# MAIN EXECUTION
# =============================================================================

# Load data
norms_map, products, types_map, evaluations = load_all_data()
products_map = {p['id']: p for p in products}

# Group evaluations
print("\nGrouping evaluations by product...")
product_pillar_evals = group_evaluations(evaluations, norms_map)
print(f"   Grouped into {len(product_pillar_evals)} products")

# Generate analyses
print("\nGenerating user-friendly analyses...")
analyses = []
total = len(product_pillar_evals)
count = 0

for product_id, pillars_data in product_pillar_evals.items():
    count += 1
    if count % 100 == 0:
        print(f"   Progress: {count}/{total} ({count/total*100:.1f}%)")

    if product_id not in products_map:
        continue

    product = products_map[product_id]
    product_name = product['name']

    for pillar in PILLARS:
        evals = pillars_data.get(pillar, [])
        if not evals:
            continue

        score, yes_count, no_count, tbd_count, confidence = calculate_score(evals)

        if yes_count + no_count < 3:
            continue

        # Get failures for analysis
        failures = [e for e in evals if e['result'] == 'NO']
        failures.sort(key=lambda x: (not x.get('is_essential', False)))

        # Generate user-friendly content
        conclusion = generate_user_conclusion(product_name, pillar, score, yes_count, no_count)
        practical_advice = generate_practical_advice(pillar, score, evals)
        what_to_watch = generate_what_to_watch(pillar, failures)
        strengths = generate_strengths_simple(pillar, evals, yes_count)

        analysis = {
            'product_id': product_id,
            'pillar': pillar,
            'pillar_score': round(score, 2),
            'confidence_score': confidence,
            'strategic_conclusion': conclusion,
            'key_strengths': strengths,
            'key_weaknesses': what_to_watch,
            'critical_risks': [],  # Will add specific risks if score is low
            'recommendations': practical_advice,
            'evaluated_norms_count': len(evals),
            'passed_norms_count': yes_count,
            'failed_norms_count': no_count,
            'tbd_norms_count': tbd_count,
            'community_vote_count': 0,
            'generated_by': 'claude_opus_user_friendly_v4',
            'generated_at': datetime.now(timezone.utc).isoformat()
        }

        # Add critical risks for low scores
        if score < 50:
            if pillar == 'S':
                analysis['critical_risks'] = [
                    "Your funds may not be well protected - use only for small amounts",
                    "Consider using a more secure product for your savings"
                ]
            elif pillar == 'A':
                analysis['critical_risks'] = [
                    "Limited protection if someone threatens you",
                    "Be very discreet about owning crypto"
                ]
            elif pillar == 'F':
                analysis['critical_risks'] = [
                    "Risk of losing access to your funds if something goes wrong",
                    "Make multiple backups and test recovery before storing large amounts"
                ]
            elif pillar == 'E':
                analysis['critical_risks'] = [
                    "May be difficult to use with other services",
                    "Limited features compared to alternatives"
                ]
        elif score < 70:
            if pillar == 'S':
                analysis['critical_risks'] = ["Some security gaps - be extra careful with passwords and backups"]
            elif pillar == 'A':
                analysis['critical_risks'] = ["Some vulnerability to threats - don't advertise your crypto holdings"]
            elif pillar == 'F':
                analysis['critical_risks'] = ["Some reliability concerns - always have backup copies"]
            elif pillar == 'E':
                analysis['critical_risks'] = ["Check compatibility before committing to this product"]

        analyses.append(analysis)

print(f"\n   Generated {len(analyses)} analyses")

# Import to database
print("\nImporting to database...")
import_headers = get_supabase_headers(use_service_key=True, prefer='resolution=merge-duplicates')

batch_size = 50
imported = 0
errors = 0

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
                print(f"   Error: {r.status_code} - {r.text[:100]}")
    except Exception as e:
        errors += 1

# Summary
print("\n" + "=" * 70)
print("COMPLETE!")
print("=" * 70)
print(f"\nSummary:")
print(f"  - Products analyzed: {total}")
print(f"  - Analyses generated: {len(analyses)}")
print(f"  - Imported: {imported}")
print(f"  - Errors: {errors}")

pillar_counts = defaultdict(int)
for a in analyses:
    pillar_counts[a['pillar']] += 1

print(f"\nBy pillar:")
for p in PILLARS:
    print(f"  - {p} ({PILLAR_NAMES[p]}): {pillar_counts[p]}")

print(f"\nUser-friendly analyses now available via API:")
print(f"  GET /api/products/[slug]/strategic-analyses")
