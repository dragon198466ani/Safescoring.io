#!/usr/bin/env python3
"""
SAFE SCORING - Score Report & Validation
1. Detailed report by category (FULL, CONSUMER, ESSENTIAL)
2. Verify Essential ⊂ Consumer ⊂ Full hierarchy
3. Recalculate scores
"""

import requests

SUPABASE_URL = 'https://ajdncttomdqojlozxjxu.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqZG5jdHRvbWRxb2psb3p4anh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0MjMwNzUsImV4cCI6MjA3OTk5OTA3NX0.tTgqj-ALcl0oIdxFHuFQkB19apiz9CSyvV2X1TMWjEk'

HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json'
}


def get_products():
    """Get all products with names"""
    r = requests.get(f'{SUPABASE_URL}/rest/v1/products?select=id,name', headers=HEADERS)
    return {p['id']: p['name'] for p in r.json()}


def report_detailed_scores():
    """1. Detailed report by category"""
    print("=" * 80)
    print("1. RAPPORT DÉTAILLÉ - Top 15 produits par score FULL")
    print("=" * 80)
    
    products = get_products()
    
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/safe_scoring_results?select=*&order=note_finale.desc.nullslast&limit=15',
        headers=HEADERS
    )
    
    for row in r.json():
        pid = row['product_id']
        name = products.get(pid, f'Product {pid}')[:30]
        
        nf = row.get('note_finale') or 0
        nc = row.get('note_consumer') or 0
        ne = row.get('note_essential') or 0
        
        ss = row.get('score_s') or 0
        sa = row.get('score_a') or 0
        sf = row.get('score_f') or 0
        se = row.get('score_e') or 0
        
        sc = row.get('s_consumer') or 0
        ac = row.get('a_consumer') or 0
        fc = row.get('f_consumer') or 0
        ec = row.get('e_consumer') or 0
        
        ses = row.get('s_essential') or 0
        ae = row.get('a_essential') or 0
        fe = row.get('f_essential') or 0
        ee = row.get('e_essential') or 0
        
        print(f"\n📊 {name}")
        print(f"   FULL:      {nf:5.1f}% | S:{ss:5.1f} A:{sa:5.1f} F:{sf:5.1f} E:{se:5.1f}")
        print(f"   CONSUMER:  {nc:5.1f}% | S:{sc:5.1f} A:{ac:5.1f} F:{fc:5.1f} E:{ec:5.1f}")
        print(f"   ESSENTIAL: {ne:5.1f}% | S:{ses:5.1f} A:{ae:5.1f} F:{fe:5.1f} E:{ee:5.1f}")


def verify_hierarchy():
    """2. Verify Essential ⊂ Consumer ⊂ Full"""
    print("\n" + "=" * 80)
    print("2. VÉRIFICATION HIÉRARCHIE: Essential ⊂ Consumer ⊂ Full")
    print("=" * 80)
    
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/safe_scoring_definitions?select=norm_id,is_essential,is_consumer,is_full',
        headers=HEADERS
    )
    definitions = r.json()
    
    total = len(definitions)
    essential_count = sum(1 for d in definitions if d['is_essential'])
    consumer_count = sum(1 for d in definitions if d['is_consumer'])
    full_count = sum(1 for d in definitions if d['is_full'])
    
    print(f"\n📈 Distribution des normes:")
    print(f"   ESSENTIAL: {essential_count} normes ({essential_count/total*100:.1f}%)")
    print(f"   CONSUMER:  {consumer_count} normes ({consumer_count/total*100:.1f}%)")
    print(f"   FULL:      {full_count} normes ({full_count/total*100:.1f}%)")
    
    # Check hierarchy violations
    violations_essential_not_consumer = []
    violations_consumer_not_full = []
    
    for d in definitions:
        # Essential should be Consumer
        if d['is_essential'] and not d['is_consumer']:
            violations_essential_not_consumer.append(d['norm_id'])
        
        # Consumer should be Full
        if d['is_consumer'] and not d['is_full']:
            violations_consumer_not_full.append(d['norm_id'])
    
    print(f"\n🔍 Vérification de la hiérarchie:")
    
    if violations_essential_not_consumer:
        print(f"   ❌ {len(violations_essential_not_consumer)} normes Essential qui ne sont PAS Consumer")
        print(f"      Norm IDs: {violations_essential_not_consumer[:10]}...")
    else:
        print(f"   ✅ Toutes les normes Essential sont aussi Consumer")
    
    if violations_consumer_not_full:
        print(f"   ❌ {len(violations_consumer_not_full)} normes Consumer qui ne sont PAS Full")
        print(f"      Norm IDs: {violations_consumer_not_full[:10]}...")
    else:
        print(f"   ✅ Toutes les normes Consumer sont aussi Full")
    
    return violations_essential_not_consumer, violations_consumer_not_full


def fix_hierarchy():
    """Fix hierarchy: Essential → Consumer, Consumer → Full"""
    print("\n" + "=" * 80)
    print("3. CORRECTION DE LA HIÉRARCHIE")
    print("=" * 80)
    
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/safe_scoring_definitions?select=norm_id,is_essential,is_consumer,is_full',
        headers=HEADERS
    )
    definitions = r.json()
    
    fixed_count = 0
    
    for d in definitions:
        needs_update = False
        updates = {}
        
        # Essential should be Consumer
        if d['is_essential'] and not d['is_consumer']:
            updates['is_consumer'] = True
            needs_update = True
        
        # Consumer should be Full
        if d['is_consumer'] and not d['is_full']:
            updates['is_full'] = True
            needs_update = True
        
        # Full should always be True
        if not d['is_full']:
            updates['is_full'] = True
            needs_update = True
        
        if needs_update:
            r = requests.patch(
                f'{SUPABASE_URL}/rest/v1/safe_scoring_definitions?norm_id=eq.{d["norm_id"]}',
                headers=HEADERS,
                json=updates
            )
            if r.status_code in [200, 204]:
                fixed_count += 1
    
    print(f"   ✅ {fixed_count} normes corrigées pour respecter la hiérarchie")
    return fixed_count


def recalculate_scores():
    """Recalculate all scores using score_calculator"""
    print("\n" + "=" * 80)
    print("4. RECALCUL DES SCORES")
    print("=" * 80)
    
    import sys
    import os
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src', 'core'))
    
    from score_calculator import ScoreCalculator
    
    calculator = ScoreCalculator()
    calculator.run()


if __name__ == '__main__':
    # 1. Detailed report
    report_detailed_scores()
    
    # 2. Verify hierarchy
    v1, v2 = verify_hierarchy()
    
    # 3. Fix hierarchy if needed
    if v1 or v2:
        print("\n⚠️  Des violations de hiérarchie ont été détectées!")
        fix_hierarchy()
        
        # Verify again
        print("\n🔄 Vérification après correction:")
        verify_hierarchy()
    
    # 4. Recalculate scores
    recalculate_scores()
