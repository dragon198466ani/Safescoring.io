#!/usr/bin/env python3
"""
GENERATE REAL-TIME RISK WARNINGS
================================
Creates +/- risk warnings for each product based on actual evaluation data.
Structure similar to product_compatibility for real-time display on product pages.
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
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

# Risk categories for real-time usage
RISK_CATEGORIES = {
    'S': {  # Security
        'critical_norms': [
            'SEC-001', 'SEC-002', 'SEC-003',  # Core security
            'MULTI-SIG', 'COLD-STORAGE', 'AIR-GAP',  # Key protection
            'AUDIT-001', 'BUG-BOUNTY',  # Audits
        ],
        'positive_template': "✓ {norm_title}",
        'negative_template': "⚠ {norm_title} non vérifié",
        'user_context': "En cas de piratage ou d'attaque"
    },
    'A': {  # Adversity
        'critical_norms': [
            'INSURANCE', 'PROOF-RESERVES', 'FDIC',  # Protection funds
            'INCIDENT-RESPONSE', 'BACKUP',  # Recovery
            'LEGAL-JURISDICTION', 'REGULATED',  # Legal
        ],
        'positive_template': "✓ {norm_title}",
        'negative_template': "⚠ {norm_title} absent",
        'user_context': "Si le service fait faillite ou est compromis"
    },
    'F': {  # Fidelity
        'critical_norms': [
            'SELF-CUSTODY', 'NON-CUSTODIAL',  # Ownership
            'OPEN-SOURCE', 'VERIFIABLE',  # Transparency
            'NO-KYC', 'PRIVACY',  # Privacy
        ],
        'positive_template': "✓ {norm_title}",
        'negative_template': "⚠ {norm_title} non garanti",
        'user_context': "Pour garder le contrôle total de vos fonds"
    },
    'E': {  # Ecosystem
        'critical_norms': [
            'MULTI-CHAIN', 'INTEROP',  # Compatibility
            'MOBILE-APP', 'DESKTOP',  # Access
            'ACTIVE-DEV', 'COMMUNITY',  # Support
        ],
        'positive_template': "✓ {norm_title}",
        'negative_template': "⚠ {norm_title} limité",
        'user_context': "Pour l'utilisation quotidienne"
    }
}


def load_norms():
    """Load all norms with their details."""
    norms = {}
    offset = 0
    while True:
        r = requests.get(
            f'{SUPABASE_URL}/rest/v1/norms?select=id,code,title,pillar,is_essential&limit=1000&offset={offset}',
            headers=READ_HEADERS, timeout=60
        )
        if r.status_code != 200:
            print(f"  Error loading norms: {r.status_code} - {r.text[:100]}")
            break
        data = r.json()
        if not data:
            break
        for n in data:
            # Use is_essential as severity indicator (True = high priority)
            n['severity'] = 10 if n.get('is_essential') else 5
            norms[n['id']] = n
        offset += 1000
    return norms


def load_products_from_advice():
    """Load product IDs from the advice JSON file."""
    try:
        with open('data/product_advice.json', 'r', encoding='utf-8') as f:
            advice = json.load(f)
        return list(advice.keys())
    except Exception as e:
        print(f"  Error loading advice file: {e}")
        return []


def get_product_evaluations(product_id):
    """Get all evaluations for a product."""
    evals = []
    offset = 0
    while True:
        r = requests.get(
            f'{SUPABASE_URL}/rest/v1/evaluations?select=norm_id,result,why_this_result&product_id=eq.{product_id}&limit=1000&offset={offset}',
            headers=READ_HEADERS, timeout=60
        )
        if r.status_code != 200:
            break
        data = r.json()
        if not data:
            break
        evals.extend(data)
        offset += 1000
    return evals


def generate_warnings(product, evaluations, norms):
    """Generate real-time warnings based on evaluation data."""
    # Group evaluations by pillar and result
    pillar_results = {'S': {'yes': [], 'no': [], 'tbd': []},
                      'A': {'yes': [], 'no': [], 'tbd': []},
                      'F': {'yes': [], 'no': [], 'tbd': []},
                      'E': {'yes': [], 'no': [], 'tbd': []}}

    for ev in evaluations:
        norm = norms.get(ev['norm_id'])
        if not norm or not norm.get('pillar'):
            continue

        pillar = norm['pillar']
        result = ev.get('result', 'tbd')

        if pillar in pillar_results:
            if result == 'yes':
                pillar_results[pillar]['yes'].append({
                    'norm': norm,
                    'reason': ev.get('why_this_result', '')
                })
            elif result == 'no':
                pillar_results[pillar]['no'].append({
                    'norm': norm,
                    'reason': ev.get('why_this_result', '')
                })
            else:
                pillar_results[pillar]['tbd'].append({
                    'norm': norm,
                    'reason': ev.get('why_this_result', '')
                })

    # Generate warnings structure
    warnings = {
        'product_id': product['id'],
        'product_name': product['name'],
        'product_type': product.get('product_type'),
        'generated_at': time.strftime('%Y-%m-%dT%H:%M:%SZ'),
        'pillars': {}
    }

    for pillar, results in pillar_results.items():
        yes_count = len(results['yes'])
        no_count = len(results['no'])
        tbd_count = len(results['tbd'])
        total = yes_count + no_count + tbd_count

        if total == 0:
            continue

        score = (yes_count / total * 100) if total > 0 else 0

        # Get top positive points (most important norms passed)
        positive_points = []
        for item in sorted(results['yes'], key=lambda x: x['norm'].get('severity', 0), reverse=True)[:5]:
            positive_points.append({
                'norm_code': item['norm'].get('code', ''),
                'title': item['norm'].get('title', ''),
                'reason': item['reason'][:200] if item['reason'] else None
            })

        # Get critical negative points (most important norms failed)
        negative_points = []
        for item in sorted(results['no'], key=lambda x: x['norm'].get('severity', 0), reverse=True)[:5]:
            negative_points.append({
                'norm_code': item['norm'].get('code', ''),
                'title': item['norm'].get('title', ''),
                'reason': item['reason'][:200] if item['reason'] else None,
                'severity': item['norm'].get('severity', 'medium')
            })

        # Get unknowns (TBD - need verification)
        unknown_points = []
        for item in results['tbd'][:3]:
            unknown_points.append({
                'norm_code': item['norm'].get('code', ''),
                'title': item['norm'].get('title', '')
            })

        # Risk level
        if score >= 90:
            risk_level = 'low'
            risk_label = 'Faible risque'
        elif score >= 70:
            risk_level = 'medium'
            risk_label = 'Risque modéré'
        elif score >= 50:
            risk_level = 'elevated'
            risk_label = 'Risque élevé'
        else:
            risk_level = 'high'
            risk_label = 'Risque critique'

        warnings['pillars'][pillar] = {
            'score': round(score, 1),
            'risk_level': risk_level,
            'risk_label': risk_label,
            'yes_count': yes_count,
            'no_count': no_count,
            'tbd_count': tbd_count,
            'positive_points': positive_points,
            'negative_points': negative_points,
            'unknown_points': unknown_points,
            'user_context': RISK_CATEGORIES[pillar]['user_context']
        }

    # Generate overall summary
    all_yes = sum(len(pillar_results[p]['yes']) for p in pillar_results)
    all_no = sum(len(pillar_results[p]['no']) for p in pillar_results)
    all_total = all_yes + all_no + sum(len(pillar_results[p]['tbd']) for p in pillar_results)

    overall_score = (all_yes / all_total * 100) if all_total > 0 else 0

    # Top 3 critical warnings across all pillars
    all_negatives = []
    for pillar, results in pillar_results.items():
        for item in results['no']:
            all_negatives.append({
                'pillar': pillar,
                'norm_code': item['norm'].get('code', ''),
                'title': item['norm'].get('title', ''),
                'severity': item['norm'].get('severity', 0)
            })

    critical_warnings = sorted(all_negatives, key=lambda x: x.get('severity', 0), reverse=True)[:3]

    warnings['summary'] = {
        'overall_score': round(overall_score, 1),
        'total_checks': all_total,
        'passed': all_yes,
        'failed': all_no,
        'critical_warnings': critical_warnings,
        'recommendation': get_recommendation(overall_score, critical_warnings)
    }

    return warnings


def get_recommendation(score, critical_warnings):
    """Generate user recommendation based on score and critical warnings."""
    if score >= 90:
        return "Produit bien noté. Vérifiez les détails avant utilisation."
    elif score >= 70:
        return "Quelques points d'attention. Lisez les avertissements ci-dessous."
    elif score >= 50:
        return "Plusieurs risques identifiés. Utilisez avec précaution."
    else:
        return "Risques significatifs. Considérez des alternatives plus sûres."


def save_warnings_to_db(warnings, skip_db=True):
    """Save warnings to product table."""
    if skip_db:
        return True  # Skip DB save, only save to JSON

    try:
        update_data = {
            'realtime_warnings': json.dumps(warnings, ensure_ascii=False)
        }

        r = requests.patch(
            f'{SUPABASE_URL}/rest/v1/products?id=eq.{warnings["product_id"]}',
            headers=WRITE_HEADERS,
            json=update_data,
            timeout=30
        )
        return r.status_code in [200, 204]
    except Exception as e:
        print(f"  Error saving: {e}")
        return False


def main():
    print("=" * 70)
    print("  GENERATE REAL-TIME RISK WARNINGS")
    print("=" * 70)

    # Load norms
    print("Loading norms...")
    norms = load_norms()
    print(f"  Loaded {len(norms)} norms")

    # Get products from advice JSON (these all have evaluations)
    print("Loading products from advice file...")
    product_ids = load_products_from_advice()
    print(f"  Found {len(product_ids)} products")

    # Get product details
    products_with_evals = []
    for pid in product_ids:
        r = requests.get(
            f'{SUPABASE_URL}/rest/v1/products?select=id,name,slug,type_id&id=eq.{pid}',
            headers=READ_HEADERS, timeout=30
        )
        if r.status_code == 200 and r.json():
            products_with_evals.append(r.json()[0])

    print(f"  Loaded {len(products_with_evals)} product details")

    saved = 0
    failed = 0
    all_warnings = {}

    for i, product in enumerate(products_with_evals):
        try:
            # Get evaluations
            evaluations = get_product_evaluations(product['id'])

            if not evaluations:
                continue

            # Generate warnings
            warnings = generate_warnings(product, evaluations, norms)

            # Save to DB
            if save_warnings_to_db(warnings):
                saved += 1
                score = warnings['summary']['overall_score']
                risk = warnings['summary'].get('critical_warnings', [])
                risk_count = len(risk)
                print(f"[{i+1:4}/{len(products_with_evals)}] {product['name'][:35]:35} | {score:5.1f}% | {risk_count} critical")
            else:
                failed += 1

            # Also save to local JSON for backup
            all_warnings[str(product['id'])] = warnings

            if (saved + failed) % 50 == 0:
                time.sleep(0.5)

        except Exception as e:
            failed += 1
            print(f"  Error on {product['name']}: {e}")

    # Save all to local JSON
    with open('data/realtime_warnings.json', 'w', encoding='utf-8') as f:
        json.dump(all_warnings, f, ensure_ascii=False, indent=2)

    print("=" * 70)
    print(f"  COMPLETE: {saved} products updated, {failed} failed")
    print(f"  Saved to data/realtime_warnings.json")
    print("=" * 70)


if __name__ == "__main__":
    main()
