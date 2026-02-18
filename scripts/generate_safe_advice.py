#!/usr/bin/env python3
"""
GENERATE SAFE STRATEGIC ADVICE FOR ALL PRODUCTS
================================================
Analyzes evaluation results and generates strategic recommendations
per pillar (S, A, F, E) for each product.
Stores advice in Supabase.
"""
import sys
sys.path.insert(0, 'src')
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)) + '/..')

from core.config import SUPABASE_URL, get_supabase_headers
import requests
import json
import time

READ_HEADERS = get_supabase_headers()
WRITE_HEADERS = get_supabase_headers(use_service_key=True)
WRITE_HEADERS['Content-Type'] = 'application/json'
WRITE_HEADERS['Prefer'] = 'return=minimal'

# Strategic advice templates per pillar based on weak norms
ADVICE_TEMPLATES = {
    'S': {  # Security
        'low': [
            "Prioritize security audits from reputable firms (Trail of Bits, OpenZeppelin)",
            "Implement formal verification for critical smart contract functions",
            "Establish bug bounty program with meaningful rewards",
            "Add multi-signature requirements for admin functions",
            "Implement time-locks on sensitive operations"
        ],
        'medium': [
            "Consider additional penetration testing",
            "Review and document security incident response procedures",
            "Implement real-time monitoring and alerting systems"
        ],
        'high': [
            "Maintain current security standards",
            "Continue regular security assessments",
            "Stay updated on emerging threat vectors"
        ]
    },
    'A': {  # Adversity
        'low': [
            "Develop comprehensive disaster recovery plan",
            "Implement geographic redundancy for critical systems",
            "Create backup key management procedures",
            "Add hardware security modules (HSM) for key storage",
            "Establish clear procedures for adverse scenarios"
        ],
        'medium': [
            "Test recovery procedures regularly",
            "Document and practice incident response",
            "Consider insurance for custody operations"
        ],
        'high': [
            "Continue regular resilience testing",
            "Update recovery procedures as systems evolve",
            "Maintain redundancy across all critical paths"
        ]
    },
    'F': {  # Fidelity
        'low': [
            "Increase transparency in operations and governance",
            "Publish regular proof-of-reserves or attestations",
            "Obtain relevant regulatory licenses and certifications",
            "Implement comprehensive compliance program",
            "Establish clear terms of service and user agreements"
        ],
        'medium': [
            "Consider SOC 2 Type II certification",
            "Expand regulatory coverage to additional jurisdictions",
            "Improve documentation of internal controls"
        ],
        'high': [
            "Maintain compliance with evolving regulations",
            "Continue transparent communication practices",
            "Regular third-party compliance audits"
        ]
    },
    'E': {  # Ecosystem
        'low': [
            "Expand blockchain and protocol integrations",
            "Improve developer documentation and APIs",
            "Build community governance mechanisms",
            "Add support for additional token standards",
            "Integrate with major DeFi protocols"
        ],
        'medium': [
            "Enhance user interface and experience",
            "Add more wallet and protocol integrations",
            "Improve cross-chain functionality"
        ],
        'high': [
            "Continue ecosystem expansion",
            "Support emerging standards and protocols",
            "Maintain strong community engagement"
        ]
    }
}

PILLAR_NAMES = {
    'S': 'Security',
    'A': 'Adversity',
    'F': 'Fidelity',
    'E': 'Ecosystem'
}


def get_score_level(score):
    """Convert score to level for advice selection."""
    if score < 70:
        return 'low'
    elif score < 85:
        return 'medium'
    else:
        return 'high'


def generate_advice(pillar, score, failed_norms):
    """Generate strategic advice based on pillar score and failed norms."""
    level = get_score_level(score)
    templates = ADVICE_TEMPLATES.get(pillar, {}).get(level, [])

    advice = []

    # Add context-specific advice based on failed norms
    if failed_norms:
        # Analyze failed norms for specific recommendations
        failed_titles = ' '.join([n.get('title', '').lower() for n in failed_norms[:10]])

        if pillar == 'S':
            if 'audit' in failed_titles:
                advice.append("Obtain comprehensive smart contract audit from tier-1 firm")
            if 'encryption' in failed_titles or 'cryptograph' in failed_titles:
                advice.append("Implement industry-standard encryption (AES-256, ChaCha20)")
            if 'key' in failed_titles:
                advice.append("Enhance key management with HSM or secure enclave")
            if 'access' in failed_titles or 'auth' in failed_titles:
                advice.append("Strengthen access controls with MFA and role-based permissions")

        elif pillar == 'A':
            if 'backup' in failed_titles:
                advice.append("Implement automated backup systems with encryption")
            if 'recovery' in failed_titles:
                advice.append("Document and test recovery procedures quarterly")
            if 'physical' in failed_titles or 'hardware' in failed_titles:
                advice.append("Consider hardware redundancy for critical components")
            if 'insurance' in failed_titles:
                advice.append("Evaluate crypto custody insurance options")

        elif pillar == 'F':
            if 'compliance' in failed_titles or 'regulation' in failed_titles:
                advice.append("Engage compliance counsel for regulatory guidance")
            if 'transparency' in failed_titles or 'disclosure' in failed_titles:
                advice.append("Publish regular transparency reports")
            if 'license' in failed_titles:
                advice.append("Pursue relevant licenses (MTL, EMI, VASP)")
            if 'reserve' in failed_titles or 'proof' in failed_titles:
                advice.append("Implement proof-of-reserves with third-party attestation")

        elif pillar == 'E':
            if 'integration' in failed_titles:
                advice.append("Prioritize integrations with major DeFi protocols")
            if 'api' in failed_titles or 'sdk' in failed_titles:
                advice.append("Improve API documentation and developer tools")
            if 'chain' in failed_titles or 'multi' in failed_titles:
                advice.append("Expand multi-chain support (Arbitrum, Optimism, Base)")
            if 'community' in failed_titles or 'governance' in failed_titles:
                advice.append("Implement community governance mechanisms")

    # Add template advice
    advice.extend(templates[:3])

    # Deduplicate and limit
    seen = set()
    unique_advice = []
    for a in advice:
        if a.lower() not in seen:
            seen.add(a.lower())
            unique_advice.append(a)

    return unique_advice[:5]


def load_products_with_evaluations(skip_existing=True):
    """Load products that have evaluations."""
    print("Loading products with evaluations...", flush=True)

    # Get distinct product_ids from evaluations
    product_ids = set()
    offset = 0
    while True:
        r = requests.get(
            f'{SUPABASE_URL}/rest/v1/evaluations?select=product_id&order=product_id&limit=1000&offset={offset}',
            headers=READ_HEADERS, timeout=60
        )
        if r.status_code != 200:
            break
        data = r.json()
        if not data:
            break
        for e in data:
            product_ids.add(e['product_id'])
        offset += len(data)
        if len(data) < 1000:
            break
        if offset >= 500000:  # Safety limit
            break

    print(f"  Found {len(product_ids)} products with evaluations", flush=True)

    # Load product details
    products = []
    skipped = 0
    for pid in product_ids:
        r = requests.get(
            f'{SUPABASE_URL}/rest/v1/products?select=id,name,slug,type_id,safe_priority_pillar&id=eq.{pid}&limit=1',
            headers=READ_HEADERS, timeout=30
        )
        if r.status_code == 200 and r.json():
            p = r.json()[0]
            # Skip products that already have advice if requested
            if skip_existing and p.get('safe_priority_pillar'):
                skipped += 1
                continue
            products.append(p)

    if skipped:
        print(f"  Skipping {skipped} products that already have advice", flush=True)
    print(f"  Processing {len(products)} products", flush=True)

    return products


def load_norms():
    """Load all norms."""
    norms = []
    offset = 0
    while True:
        r = requests.get(
            f'{SUPABASE_URL}/rest/v1/norms?select=id,code,title,pillar&limit=1000&offset={offset}',
            headers=READ_HEADERS, timeout=60
        )
        if r.status_code != 200:
            break
        data = r.json()
        if not data:
            break
        norms.extend(data)
        offset += len(data)
        if len(data) < 1000:
            break
    return {n['id']: n for n in norms}


def get_product_evaluations(product_id, max_retries=3):
    """Get all evaluations for a product with retry logic."""
    evals = []
    offset = 0
    while True:
        for attempt in range(max_retries):
            try:
                r = requests.get(
                    f'{SUPABASE_URL}/rest/v1/evaluations?select=norm_id,result,why_this_result&product_id=eq.{product_id}&limit=1000&offset={offset}',
                    headers=READ_HEADERS, timeout=120
                )
                if r.status_code != 200:
                    return evals
                data = r.json()
                break
            except (requests.exceptions.ReadTimeout, requests.exceptions.ConnectionError) as e:
                if attempt < max_retries - 1:
                    time.sleep(2 ** attempt)  # Exponential backoff
                    continue
                return evals  # Return what we have so far

        if not data:
            break
        evals.extend(data)
        offset += len(data)
        if len(data) < 1000:
            break
    return evals


def calculate_pillar_scores(evaluations, norms_dict):
    """Calculate scores per pillar and identify failed norms."""
    pillars = {
        'S': {'yes': 0, 'no': 0, 'failed_norms': []},
        'A': {'yes': 0, 'no': 0, 'failed_norms': []},
        'F': {'yes': 0, 'no': 0, 'failed_norms': []},
        'E': {'yes': 0, 'no': 0, 'failed_norms': []}
    }

    for e in evaluations:
        norm = norms_dict.get(e['norm_id'], {})
        pillar = norm.get('pillar', '')
        if pillar in pillars:
            if e['result'] in ['YES', 'YESp']:
                pillars[pillar]['yes'] += 1
            elif e['result'] == 'NO':
                pillars[pillar]['no'] += 1
                pillars[pillar]['failed_norms'].append(norm)

    # Calculate scores
    scores = {}
    for p in ['S', 'A', 'F', 'E']:
        total = pillars[p]['yes'] + pillars[p]['no']
        if total > 0:
            scores[p] = {
                'score': (pillars[p]['yes'] / total) * 100,
                'yes': pillars[p]['yes'],
                'no': pillars[p]['no'],
                'failed_norms': pillars[p]['failed_norms'][:10]  # Top 10 failed
            }
        else:
            scores[p] = {'score': 0, 'yes': 0, 'no': 0, 'failed_norms': []}

    return scores


def save_product_advice(product_id, pillar_scores, advice_by_pillar):
    """Save advice to Supabase."""
    # Find weakest pillar
    min_score = 100
    min_pillar = 'S'
    for p in ['S', 'A', 'F', 'E']:
        if pillar_scores[p]['score'] < min_score:
            min_score = pillar_scores[p]['score']
            min_pillar = p

    # Build comprehensive advice JSON
    advice_json = {
        'pillar_scores': {
            'S': round(pillar_scores['S']['score'], 1),
            'A': round(pillar_scores['A']['score'], 1),
            'F': round(pillar_scores['F']['score'], 1),
            'E': round(pillar_scores['E']['score'], 1)
        },
        'overall_score': round(sum(pillar_scores[p]['score'] for p in ['S','A','F','E']) / 4, 1),
        'weakest_pillar': min_pillar,
        'advice_by_pillar': advice_by_pillar,
        'priority_actions': advice_by_pillar.get(min_pillar, [])[:3]
    }

    # Calculate grade
    overall = advice_json['overall_score']
    if overall >= 90: grade = 'A+'
    elif overall >= 85: grade = 'A'
    elif overall >= 80: grade = 'A-'
    elif overall >= 75: grade = 'B+'
    elif overall >= 70: grade = 'B'
    elif overall >= 65: grade = 'B-'
    elif overall >= 60: grade = 'C+'
    elif overall >= 55: grade = 'C'
    else: grade = 'D'
    advice_json['grade'] = grade

    # Update product with advice
    update_data = {
        'safe_priority_pillar': min_pillar,
        'safe_priority_reason': json.dumps(advice_json, ensure_ascii=False)
    }

    r = requests.patch(
        f'{SUPABASE_URL}/rest/v1/products?id=eq.{product_id}',
        headers=WRITE_HEADERS,
        json=update_data,
        timeout=30
    )

    return r.status_code in [200, 204]


def main():
    print("=" * 70, flush=True)
    print("  GENERATE SAFE STRATEGIC ADVICE", flush=True)
    print("=" * 70, flush=True)

    # Load data
    products = load_products_with_evaluations()
    norms_dict = load_norms()
    print(f"Loaded {len(norms_dict)} norms", flush=True)

    if not products:
        print("No products with evaluations found!")
        return

    total_saved = 0
    start_time = time.time()

    for i, product in enumerate(products):
        try:
            # Get evaluations
            evals = get_product_evaluations(product['id'])

            if not evals:
                print(f"[{i+1:4}/{len(products)}] {product.get('name', 'Unknown')[:35]:35} | No evals | Skipped", flush=True)
                continue

            # Calculate scores
            pillar_scores = calculate_pillar_scores(evals, norms_dict)

            # Generate advice for each pillar
            advice_by_pillar = {}
            for p in ['S', 'A', 'F', 'E']:
                advice = generate_advice(
                    p,
                    pillar_scores[p]['score'],
                    pillar_scores[p]['failed_norms']
                )
                advice_by_pillar[p] = advice

            # Save to database
            if save_product_advice(product['id'], pillar_scores, advice_by_pillar):
                total_saved += 1

            # Progress
            product_name = product['name'].encode('ascii', 'ignore').decode('ascii')[:35]
            overall = sum(pillar_scores[p]['score'] for p in ['S','A','F','E']) / 4
            print(f"[{i+1:4}/{len(products)}] {product_name:35} | {overall:5.1f}% | Saved", flush=True)

        except Exception as e:
            product_name = product.get('name', 'Unknown')[:35]
            print(f"[{i+1:4}/{len(products)}] {product_name:35} | ERROR: {str(e)[:30]}", flush=True)
            continue

        # Rate limiting
        if (i + 1) % 50 == 0:
            time.sleep(1)

    elapsed = time.time() - start_time
    print("=" * 70, flush=True)
    print(f"  COMPLETE: {total_saved} products with advice in {elapsed:.1f}s", flush=True)
    print("=" * 70, flush=True)


if __name__ == "__main__":
    main()
