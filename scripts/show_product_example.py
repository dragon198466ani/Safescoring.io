#!/usr/bin/env python3
"""Show complete product analysis example."""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

import json
import os

# Use shared Supabase utilities for auto-pagination
from supabase_utils import fetch_all, fetch_by_ids, get_headers, SUPABASE_URL
import requests

headers = get_headers()

def get_grade(score):
    if score >= 95: return 'A+'
    if score >= 90: return 'A'
    if score >= 85: return 'A-'
    if score >= 80: return 'B+'
    if score >= 75: return 'B'
    if score >= 70: return 'B-'
    return 'C'

def main():
    # Get product
    slug = sys.argv[1] if len(sys.argv) > 1 else 'bitbox02'
    r = requests.get(f'{SUPABASE_URL}/rest/v1/products?slug=eq.{slug}&select=*', headers=headers)
    if not r.json():
        print(f"Product not found: {slug}")
        return
    product = r.json()[0]

    # Get product type
    r2 = requests.get(f'{SUPABASE_URL}/rest/v1/product_types?id=eq.{product["type_id"]}&select=*', headers=headers)
    product_type = r2.json()[0] if r2.json() else {}

    # Get ALL evaluations (auto-pagination handles >1000 rows)
    all_evals = fetch_all(
        'evaluations',
        select='norm_id,result,why_this_result',
        filters={'product_id': f'eq.{product["id"]}'}
    )

    # Get norms by IDs (auto-batching)
    norm_ids = list(set(e['norm_id'] for e in all_evals))
    norms = fetch_by_ids(
        'norms',
        norm_ids,
        select='id,code,title,pillar,is_essential,description'
    )

    # Group by pillar
    pillar_data = {'S': {'yes': [], 'no': []}, 'A': {'yes': [], 'no': []}, 'F': {'yes': [], 'no': []}, 'E': {'yes': [], 'no': []}}
    for ev in all_evals:
        norm = norms.get(ev['norm_id'])
        if not norm or not norm.get('pillar') or norm['pillar'] not in pillar_data:
            continue
        result = (ev.get('result') or '').upper()
        entry = {
            'code': norm['code'],
            'title': norm['title'],
            'is_essential': norm.get('is_essential', False),
            'reason': ev.get('why_this_result', '')[:150] if ev.get('why_this_result') else None
        }
        if result == 'YES':
            pillar_data[norm['pillar']]['yes'].append(entry)
        elif result == 'NO':
            pillar_data[norm['pillar']]['no'].append(entry)

    pillar_names = {
        'S': {'name': 'Security', 'fr': 'Securite', 'icon': '[S]', 'question': 'Mes fonds sont-ils proteges contre le vol ?'},
        'A': {'name': 'Adversity', 'fr': 'Adversite', 'icon': '[A]', 'question': 'Que se passe-t-il si le service ferme ?'},
        'F': {'name': 'Fidelity', 'fr': 'Fidelite', 'icon': '[F]', 'question': 'Suis-je vraiment proprietaire de mes cryptos ?'},
        'E': {'name': 'Ecosystem', 'fr': 'Ecosysteme', 'icon': '[E]', 'question': 'Est-ce facile a utiliser au quotidien ?'}
    }

    print('=' * 80)
    print(f'  FICHE PRODUIT COMPLETE: {product["name"]}')
    print('=' * 80)

    print(f'''
INFORMATIONS PRODUIT
--------------------
Nom:          {product['name']}
Slug:         {product['slug']}
Type:         {product_type.get('name', 'N/A')} ({product_type.get('category', 'N/A')})
URL:          {product.get('url', 'N/A')}
Siege:        {product.get('headquarters', 'N/A')}
Verifie:      {'Oui' if product.get('verified') else 'Non'}
''')

    # Parse strategic advice
    advice = None
    if product.get('safe_priority_reason'):
        try:
            advice = json.loads(product['safe_priority_reason']) if isinstance(product['safe_priority_reason'], str) else product['safe_priority_reason']
        except:
            advice = {'raw': product['safe_priority_reason']}

    total_yes = sum(len(p['yes']) for p in pillar_data.values())
    total_no = sum(len(p['no']) for p in pillar_data.values())
    total = total_yes + total_no
    overall_score = (total_yes / total * 100) if total > 0 else 0

    print(f'''SCORE GLOBAL SAFE
-----------------
Score:        {overall_score:.1f}% ({get_grade(overall_score)})
Evaluations:  {total} normes testees
Reussies:     {total_yes} (YES)
Echouees:     {total_no} (NO)
Pilier prioritaire: {product.get('safe_priority_pillar', 'N/A')}
''')

    print('ANALYSE PAR PILIER SAFE')
    print('-' * 80)

    for pillar in ['S', 'A', 'F', 'E']:
        data = pillar_data[pillar]
        yes_ct = len(data['yes'])
        no_ct = len(data['no'])
        total_p = yes_ct + no_ct
        score = (yes_ct / total_p * 100) if total_p > 0 else 0
        grade = get_grade(score)
        info = pillar_names[pillar]

        print(f'''
{info['icon']} {pillar} - {info['name']} ({info['fr']})
   Score: {score:.1f}% ({grade})  |  {yes_ct} YES / {no_ct} NO
   Question: {info['question']}
''')

        # Show top 3 positive points (essential)
        essential_yes = [p for p in data['yes'] if p['is_essential']]
        if essential_yes:
            print('   [+] POINTS FORTS (essentiels):')
            for p in essential_yes[:3]:
                print(f'       + {p["code"]}: {p["title"][:60]}')

        # Show negative points
        if data['no']:
            print(f'   [-] POINTS FAIBLES ({len(data["no"])} normes non respectees):')
            for p in data['no'][:5]:
                reason = f' - {p["reason"][:50]}...' if p.get('reason') else ''
                print(f'       - {p["code"]}: {p["title"][:50]}{reason}')

    print()
    print('CONSEILS STRATEGIQUES')
    print('-' * 80)

    if advice:
        # Show pillar scores from advice
        if advice.get('pillar_scores'):
            print('\nSCORES CONSEILLES:')
            for p, sc in advice['pillar_scores'].items():
                print(f'  {p}: {sc}%')

        # Weakest pillar
        if advice.get('weakest_pillar'):
            print(f'\nPILIER LE PLUS FAIBLE: {advice["weakest_pillar"]}')

        # Advice by pillar (main strategic content)
        if advice.get('advice_by_pillar'):
            print('\nCONSEILS PAR PILIER:')
            for pillar, tips in advice['advice_by_pillar'].items():
                pname = pillar_names.get(pillar, {}).get('name', pillar)
                print(f'\n  [{pillar}] {pname}:')
                for tip in (tips if isinstance(tips, list) else [tips])[:3]:
                    print(f'    -> {tip[:80]}')

        # Legacy format support
        if advice.get('strengths'):
            print('\nFORCES:')
            for s in advice.get('strengths', [])[:3]:
                print(f'  + {s}')

        if advice.get('weaknesses'):
            print('\nFAIBLESSES:')
            for w in advice.get('weaknesses', [])[:3]:
                print(f'  - {w}')

        if advice.get('user_advice'):
            print(f'\nCONSEIL UTILISATEUR:\n  {advice["user_advice"][:200]}')

        if advice.get('priority_action'):
            print(f'\nACTION PRIORITAIRE:\n  {advice["priority_action"][:200]}')

    print()
    print("RECOMMANDATIONS POUR L'UTILISATEUR")
    print('-' * 80)

    if overall_score >= 90:
        print('  [OK] Produit bien note - repond a la majorite des criteres de securite')
    elif overall_score >= 70:
        print('  [!] Quelques points attention - globalement correct mais surveillez les faiblesses')
    elif overall_score >= 50:
        print('  [!!] Vigilance requise - plusieurs risques identifies')
    else:
        print('  [!!!] Risques significatifs - considerez des alternatives plus sures')

    # Actions prioritaires
    all_negatives = []
    for pillar, data in pillar_data.items():
        for item in data['no']:
            if item['is_essential']:
                all_negatives.append({'pillar': pillar, **item})

    if all_negatives:
        print('\n  ACTIONS PRIORITAIRES:')
        for item in all_negatives[:3]:
            print(f'    -> [{item["pillar"]}] Verifier: {item["title"][:50]}')

    print('\n' + '=' * 80)

if __name__ == '__main__':
    main()
