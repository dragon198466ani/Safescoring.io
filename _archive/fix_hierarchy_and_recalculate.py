#!/usr/bin/env python3
"""
Fix hierarchy in safe_scoring_definitions and recalculate scores.
Hierarchy: Essential ⊂ Consumer ⊂ Full

This script:
1. Fixes all hierarchy violations in safe_scoring_definitions
2. Recalculates all scores in safe_scoring_results
"""

import requests
from datetime import datetime

SUPABASE_URL = 'https://ajdncttomdqojlozxjxu.supabase.co'
SUPABASE_KEY = 'REVOKED_ROTATE_ON_DASHBOARD'

HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
}


def fix_hierarchy():
    """
    Fix hierarchy violations:
    - Essential=True → Consumer must be True
    - Consumer=True → Full must be True (already enforced)
    """
    print("=" * 70)
    print("🔧 FIXING HIERARCHY: Essential ⊂ Consumer ⊂ Full")
    print("=" * 70)
    
    # Get all definitions
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/safe_scoring_definitions?select=norm_id,is_essential,is_consumer,is_full',
        headers=HEADERS
    )
    definitions = r.json()
    
    print(f"\n📊 Total definitions: {len(definitions)}")
    
    # Count current state
    essential_count = sum(1 for d in definitions if d['is_essential'])
    consumer_count = sum(1 for d in definitions if d['is_consumer'])
    full_count = sum(1 for d in definitions if d['is_full'])
    
    print(f"   Before fix:")
    print(f"   - Essential: {essential_count}")
    print(f"   - Consumer: {consumer_count}")
    print(f"   - Full: {full_count}")
    
    # Find and fix violations
    fixed_count = 0
    
    for d in definitions:
        updates = {}
        
        # Rule 1: Essential → Consumer
        if d['is_essential'] and not d['is_consumer']:
            updates['is_consumer'] = True
        
        # Rule 2: Consumer → Full (should always be True)
        if d['is_consumer'] and not d['is_full']:
            updates['is_full'] = True
        
        # Rule 3: All norms should be Full
        if not d['is_full']:
            updates['is_full'] = True
        
        if updates:
            r = requests.patch(
                f'{SUPABASE_URL}/rest/v1/safe_scoring_definitions?norm_id=eq.{d["norm_id"]}',
                headers=HEADERS,
                json=updates
            )
            if r.status_code in [200, 204]:
                fixed_count += 1
    
    print(f"\n   ✅ Fixed {fixed_count} definitions")
    
    # Verify after fix
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/safe_scoring_definitions?select=norm_id,is_essential,is_consumer,is_full',
        headers=HEADERS
    )
    definitions = r.json()
    
    essential_count = sum(1 for d in definitions if d['is_essential'])
    consumer_count = sum(1 for d in definitions if d['is_consumer'])
    full_count = sum(1 for d in definitions if d['is_full'])
    
    print(f"\n   After fix:")
    print(f"   - Essential: {essential_count}")
    print(f"   - Consumer: {consumer_count}")
    print(f"   - Full: {full_count}")
    
    # Verify hierarchy
    violations = 0
    for d in definitions:
        if d['is_essential'] and not d['is_consumer']:
            violations += 1
        if d['is_consumer'] and not d['is_full']:
            violations += 1
    
    if violations == 0:
        print(f"\n   ✅ Hierarchy verified: Essential ⊂ Consumer ⊂ Full")
    else:
        print(f"\n   ❌ Still {violations} violations!")
    
    return fixed_count


def recalculate_all_scores():
    """Recalculate all scores using the corrected definitions."""
    print("\n" + "=" * 70)
    print("🧮 RECALCULATING ALL SCORES")
    print("=" * 70)
    
    # Load data
    print("\n📥 Loading data...")
    
    # Products
    r = requests.get(f'{SUPABASE_URL}/rest/v1/products?select=id,name', headers=HEADERS)
    products = r.json()
    product_names = {p['id']: p['name'] for p in products}
    print(f"   ✅ {len(products)} products")
    
    # Norms
    r = requests.get(f'{SUPABASE_URL}/rest/v1/norms?select=id,code,pillar', headers=HEADERS)
    norms = {n['id']: n for n in r.json()}
    print(f"   ✅ {len(norms)} norms")
    
    # Definitions
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/safe_scoring_definitions?select=norm_id,is_essential,is_consumer,is_full',
        headers=HEADERS
    )
    definitions = {d['norm_id']: d for d in r.json()}
    print(f"   ✅ {len(definitions)} definitions")
    
    # Evaluations - load per product to avoid 1000 limit
    print("   Loading evaluations per product...")
    from collections import defaultdict
    evals_by_product = defaultdict(list)
    
    for i, product in enumerate(products):
        pid = product['id']
        r = requests.get(
            f'{SUPABASE_URL}/rest/v1/evaluations?select=norm_id,result&product_id=eq.{pid}',
            headers=HEADERS
        )
        if r.status_code == 200:
            for e in r.json():
                evals_by_product[pid].append(e)
        
        if (i + 1) % 50 == 0:
            total_evals = sum(len(v) for v in evals_by_product.values())
            print(f"      [{i+1}/{len(products)}] Loaded {total_evals} evaluations...")
    
    total_evals = sum(len(v) for v in evals_by_product.values())
    print(f"   ✅ {total_evals} evaluations total")
    
    # Calculate scores for each product
    print(f"\n📊 Calculating scores for {len(products)} products...")
    print("-" * 70)
    
    success_count = 0
    
    for i, product in enumerate(products, 1):
        pid = product['id']
        pname = product['name'][:30]
        
        product_evals = evals_by_product.get(pid, [])
        if not product_evals:
            continue
        
        # Initialize score containers
        scores = {
            'full': {'S': [], 'A': [], 'F': [], 'E': [], 'SAFE': []},
            'consumer': {'S': [], 'A': [], 'F': [], 'E': [], 'SAFE': []},
            'essential': {'S': [], 'A': [], 'F': [], 'E': [], 'SAFE': []}
        }
        
        stats = {'total': 0, 'yes': 0, 'no': 0, 'na': 0, 'tbd': 0}
        
        for e in product_evals:
            norm_id = e.get('norm_id')
            result = e.get('result')
            
            if not norm_id or not result:
                continue
            
            if norm_id not in norms:
                continue
            
            norm = norms[norm_id]
            pillar = norm.get('pillar')
            
            # Get definition
            defn = definitions.get(norm_id, {'is_essential': False, 'is_consumer': False, 'is_full': True})
            
            # Count stats
            stats['total'] += 1
            if result in ['YES', 'YESp']:
                stats['yes'] += 1
            elif result == 'NO':
                stats['no'] += 1
            elif result == 'N/A':
                stats['na'] += 1
            elif result == 'TBD':
                stats['tbd'] += 1
            
            # Skip N/A and TBD for score calculation
            if not pillar or result in ['N/A', 'TBD']:
                continue
            
            # FULL: all norms with is_full=True
            if defn.get('is_full', True):
                scores['full'][pillar].append(result)
                scores['full']['SAFE'].append(result)
            
            # CONSUMER: norms with is_consumer=True
            if defn.get('is_consumer', False):
                scores['consumer'][pillar].append(result)
                scores['consumer']['SAFE'].append(result)
            
            # ESSENTIAL: norms with is_essential=True
            if defn.get('is_essential', False):
                scores['essential'][pillar].append(result)
                scores['essential']['SAFE'].append(result)
        
        # Calculate final scores
        def calc_score(results):
            yes = sum(1 for r in results if r in ['YES', 'YESp'])
            no = sum(1 for r in results if r == 'NO')
            total = yes + no
            return round(yes * 100 / total, 1) if total > 0 else None
        
        result_scores = {}
        for cat in ['full', 'consumer', 'essential']:
            result_scores[cat] = {}
            for pillar in ['S', 'A', 'F', 'E', 'SAFE']:
                result_scores[cat][pillar] = calc_score(scores[cat][pillar])
        
        # Save to safe_scoring_results
        results_data = {
            'product_id': pid,
            # FULL
            'note_finale': result_scores['full']['SAFE'],
            'score_s': result_scores['full']['S'],
            'score_a': result_scores['full']['A'],
            'score_f': result_scores['full']['F'],
            'score_e': result_scores['full']['E'],
            # CONSUMER
            'note_consumer': result_scores['consumer']['SAFE'],
            's_consumer': result_scores['consumer']['S'],
            'a_consumer': result_scores['consumer']['A'],
            'f_consumer': result_scores['consumer']['F'],
            'e_consumer': result_scores['consumer']['E'],
            # ESSENTIAL
            'note_essential': result_scores['essential']['SAFE'],
            's_essential': result_scores['essential']['S'],
            'a_essential': result_scores['essential']['A'],
            'f_essential': result_scores['essential']['F'],
            'e_essential': result_scores['essential']['E'],
            # Stats
            'total_norms_evaluated': stats['total'],
            'total_yes': stats['yes'],
            'total_no': stats['no'],
            'total_na': stats['na'],
            'total_tbd': stats.get('tbd', 0),
            'calculated_at': datetime.now().isoformat()
        }
        
        # Upsert
        r = requests.post(
            f'{SUPABASE_URL}/rest/v1/safe_scoring_results',
            headers={**HEADERS, 'Prefer': 'resolution=merge-duplicates,return=minimal'},
            json=results_data
        )
        
        if r.status_code == 409:
            r = requests.patch(
                f'{SUPABASE_URL}/rest/v1/safe_scoring_results?product_id=eq.{pid}',
                headers=HEADERS,
                json=results_data
            )
        
        if r.status_code in [200, 201, 204]:
            success_count += 1
            
            # Display
            nf = result_scores['full']['SAFE'] or 0
            nc = result_scores['consumer']['SAFE'] or 0
            ne = result_scores['essential']['SAFE'] or 0
            
            print(f"[{i:3}/{len(products)}] {pname:<30} | FULL:{nf:5.1f}% CONSUMER:{nc:5.1f}% ESSENTIAL:{ne:5.1f}%")
    
    print("-" * 70)
    print(f"\n✅ {success_count} products updated")


def show_top_products():
    """Show top products with all 3 score categories."""
    print("\n" + "=" * 70)
    print("🏆 TOP 15 PRODUCTS (by FULL score)")
    print("=" * 70)
    
    # Get products
    r = requests.get(f'{SUPABASE_URL}/rest/v1/products?select=id,name', headers=HEADERS)
    products = {p['id']: p['name'] for p in r.json()}
    
    # Get top scores
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/safe_scoring_results?select=product_id,note_finale,note_consumer,note_essential&order=note_finale.desc.nullslast&limit=15',
        headers=HEADERS
    )
    
    print(f"\n{'Product':<35} {'FULL':>8} {'CONSUMER':>10} {'ESSENTIAL':>10}")
    print("-" * 70)
    
    for row in r.json():
        pid = row['product_id']
        name = products.get(pid, f'Product {pid}')[:35]
        nf = row.get('note_finale') or 0
        nc = row.get('note_consumer') or 0
        ne = row.get('note_essential') or 0
        
        print(f"{name:<35} {nf:>7.1f}% {nc:>9.1f}% {ne:>9.1f}%")


if __name__ == '__main__':
    # 1. Fix hierarchy
    fix_hierarchy()
    
    # 2. Recalculate all scores
    recalculate_all_scores()
    
    # 3. Show results
    show_top_products()
