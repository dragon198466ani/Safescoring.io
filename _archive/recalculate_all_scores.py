#!/usr/bin/env python3
"""
Recalcule tous les scores SAFE pour tous les produits
et les sauvegarde dans la table safe_scoring_results
"""

import requests
from datetime import datetime
from collections import defaultdict

# Configuration Supabase
SUPABASE_URL = 'https://ajdncttomdqojlozxjxu.supabase.co'
SUPABASE_KEY = 'REVOKED_ROTATE_ON_DASHBOARD'

HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}


def calculate_score(results):
    """
    Calcule le score à partir d'une liste de résultats
    Score = (YES + YESp) / (YES + YESp + NO) * 100
    """
    yes_count = sum(1 for r in results if r in ['YES', 'YESp'])
    no_count = sum(1 for r in results if r == 'NO')
    
    total = yes_count + no_count
    if total == 0:
        return None
    
    return round(yes_count * 100 / total, 1)


def recalculate_all():
    """Recalcule tous les scores"""
    print("=" * 70)
    print("🧮 RECALCUL DE TOUS LES SCORES SAFE")
    print("=" * 70)
    
    # Charger les produits
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/products?select=id,name,type_id',
        headers=HEADERS
    )
    products = r.json()
    print(f"\n📦 {len(products)} produits")
    
    # Charger les normes
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/norms?select=id,code,pillar,is_essential,consumer,full',
        headers=HEADERS
    )
    norms_list = r.json()
    norms = {n['id']: n for n in norms_list}
    print(f"📋 {len(norms)} normes")
    
    # Charger toutes les évaluations
    evaluations = []
    offset = 0
    while True:
        r = requests.get(
            f'{SUPABASE_URL}/rest/v1/evaluations?select=product_id,norm_id,result&offset={offset}&limit=1000',
            headers=HEADERS
        )
        data = r.json()
        if not data:
            break
        evaluations.extend(data)
        offset += 1000
    print(f"📊 {len(evaluations)} évaluations")
    
    # Grouper les évaluations par produit
    evals_by_product = defaultdict(list)
    for e in evaluations:
        evals_by_product[e['product_id']].append(e)
    
    print(f"\n{'Produit':<35} │ {'FULL':^20} │ {'CONSUMER':^20} │ {'ESSENTIAL':^20}")
    print(f"{'':35} │ {'SAFE':>5} {'S':>4} {'A':>4} {'F':>4} {'E':>4} │ {'SAFE':>5} {'S':>4} {'A':>4} {'F':>4} {'E':>4} │ {'SAFE':>5} {'S':>4} {'A':>4} {'F':>4} {'E':>4}")
    print("=" * 115)
    
    updated = 0
    
    for product in products:
        product_id = product['id']
        product_name = product['name']
        product_evals = evals_by_product.get(product_id, [])
        
        if not product_evals:
            continue
        
        # Organiser par catégorie et pilier
        scores_data = {
            'full': {'S': [], 'A': [], 'F': [], 'E': [], 'SAFE': []},
            'consumer': {'S': [], 'A': [], 'F': [], 'E': [], 'SAFE': []},
            'essential': {'S': [], 'A': [], 'F': [], 'E': [], 'SAFE': []}
        }
        
        stats = {'yes': 0, 'no': 0, 'na': 0}
        
        for eval_item in product_evals:
            norm_id = eval_item['norm_id']
            result = eval_item['result']
            
            if norm_id not in norms:
                continue
            
            norm = norms[norm_id]
            pillar = norm.get('pillar', 'S')
            is_essential = norm.get('is_essential', False)
            is_consumer = norm.get('consumer', False)
            is_full = norm.get('full', True)
            
            # Stats
            if result in ['YES', 'YESp']:
                stats['yes'] += 1
            elif result == 'NO':
                stats['no'] += 1
            elif result == 'TBD':
                stats['tbd'] = stats.get('tbd', 0) + 1
            else:
                stats['na'] += 1
            
            # Exclure N/A et TBD du calcul des scores
            if not pillar or result in ['N/A', 'TBD']:
                continue
            
            # FULL: toutes les normes avec full=true
            if is_full:
                scores_data['full'][pillar].append(result)
                scores_data['full']['SAFE'].append(result)
            
            # CONSUMER: normes avec consumer=true
            if is_consumer:
                scores_data['consumer'][pillar].append(result)
                scores_data['consumer']['SAFE'].append(result)
            
            # ESSENTIAL: normes avec is_essential=true
            if is_essential:
                scores_data['essential'][pillar].append(result)
                scores_data['essential']['SAFE'].append(result)
        
        # Calculer les scores finaux
        result_scores = {}
        for category in ['full', 'consumer', 'essential']:
            result_scores[category] = {}
            for pillar in ['S', 'A', 'F', 'E', 'SAFE']:
                result_scores[category][pillar] = calculate_score(scores_data[category][pillar])
        
        # Préparer les données pour safe_scoring_results
        scores_record = {
            'product_id': product_id,
            # Full scores
            'note_finale': result_scores['full']['SAFE'],
            'score_s': result_scores['full']['S'],
            'score_a': result_scores['full']['A'],
            'score_f': result_scores['full']['F'],
            'score_e': result_scores['full']['E'],
            # Consumer scores
            'note_consumer': result_scores['consumer']['SAFE'],
            's_consumer': result_scores['consumer']['S'],
            'a_consumer': result_scores['consumer']['A'],
            'f_consumer': result_scores['consumer']['F'],
            'e_consumer': result_scores['consumer']['E'],
            # Essential scores
            'note_essential': result_scores['essential']['SAFE'],
            's_essential': result_scores['essential']['S'],
            'a_essential': result_scores['essential']['A'],
            'f_essential': result_scores['essential']['F'],
            'e_essential': result_scores['essential']['E'],
            # Stats
            'total_norms_evaluated': stats['yes'] + stats['no'] + stats['na'] + stats.get('tbd', 0),
            'total_yes': stats['yes'],
            'total_no': stats['no'],
            'total_na': stats['na'],
            'total_tbd': stats.get('tbd', 0),
            'calculated_at': datetime.now().isoformat()
        }
        
        # Upsert dans safe_scoring_results (insert ou update si existe)
        headers_upsert = HEADERS.copy()
        headers_upsert['Prefer'] = 'resolution=merge-duplicates,return=minimal'
        
        r = requests.post(
            f'{SUPABASE_URL}/rest/v1/safe_scoring_results',
            headers=headers_upsert,
            json=scores_record
        )
        
        if r.status_code in [200, 201, 204]:
            updated += 1
            
            # Afficher
            def fmt(val):
                return f"{val:>4.0f}" if val is not None else "   -"
            
            f = result_scores['full']
            c = result_scores['consumer']
            e = result_scores['essential']
            
            print(f"{product_name[:34]:<35} │ {fmt(f['SAFE'])} {fmt(f['S'])} {fmt(f['A'])} {fmt(f['F'])} {fmt(f['E'])} │ {fmt(c['SAFE'])} {fmt(c['S'])} {fmt(c['A'])} {fmt(c['F'])} {fmt(c['E'])} │ {fmt(e['SAFE'])} {fmt(e['S'])} {fmt(e['A'])} {fmt(e['F'])} {fmt(e['E'])}")
    
    print("=" * 115)
    print(f"\n✅ {updated} produits mis à jour")


if __name__ == '__main__':
    recalculate_all()
