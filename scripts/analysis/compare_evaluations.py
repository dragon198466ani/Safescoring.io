#!/usr/bin/env python3
"""Compare AI evaluations with Excel data"""

import pandas as pd
import requests
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from scripts.translate_supabase_data import SUPABASE_URL, SUPABASE_KEY, HEADERS

def compare_product(product_name):
    h = {**HEADERS}
    h.pop('Prefer', None)
    
    # Load Excel
    excel_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'SAFE_SCORING_V7_FINAL.xlsx')
    df = pd.read_excel(excel_path, sheet_name='ÉVALUATIONS COMPLÈTES', header=5)
    
    # Find product in Excel
    excel_row = df[df['Produit'] == product_name]
    
    print(f"\n{'='*60}")
    print(f"COMPARAISON: {product_name}")
    print(f"{'='*60}")
    
    if len(excel_row) == 0:
        print(f"⚠️ {product_name} not found in Excel")
        return
    
    # Excel scores
    row = excel_row.iloc[0]
    excel_note = row.iloc[7] if pd.notna(row.iloc[7]) else 0
    excel_s = row.iloc[8] if pd.notna(row.iloc[8]) else 0
    excel_a = row.iloc[9] if pd.notna(row.iloc[9]) else 0
    excel_f = row.iloc[10] if pd.notna(row.iloc[10]) else 0
    excel_e = row.iloc[11] if pd.notna(row.iloc[11]) else 0
    
    print(f"\n📊 EXCEL SCORES:")
    print(f"   NOTE FINALE: {excel_note}")
    print(f"   S (Security):  {excel_s}%")
    print(f"   A (Adversity): {excel_a}%")
    print(f"   F (Fidelity):  {excel_f}%")
    print(f"   E (Efficiency):{excel_e}%")
    
    # Get product from Supabase
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/products?name=eq.{product_name}&select=id,name,type_id",
        headers=h
    )
    products = r.json()
    
    if not products:
        print(f"\n⚠️ {product_name} not found in Supabase")
        return
    
    product = products[0]
    product_id = product['id']
    
    # Get evaluations
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/evaluations?product_id=eq.{product_id}&select=result,norm_id",
        headers=h
    )
    all_evals = r.json()
    
    # Get AI evaluations only
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/evaluations?product_id=eq.{product_id}&evaluated_by=eq.smart_ai&select=result,norm_id",
        headers=h
    )
    ai_evals = r.json()
    
    # Get norms to map by pillar
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/norms?select=id,code,pillar",
        headers=h
    )
    norms = {n['id']: n for n in r.json()}
    
    # Count by pillar
    pillar_stats = {'S': {'yes': 0, 'yesp': 0, 'no': 0, 'tbd': 0},
                    'A': {'yes': 0, 'yesp': 0, 'no': 0, 'tbd': 0},
                    'F': {'yes': 0, 'yesp': 0, 'no': 0, 'tbd': 0},
                    'E': {'yes': 0, 'yesp': 0, 'no': 0, 'tbd': 0}}
    
    for e in ai_evals:
        norm = norms.get(e['norm_id'], {})
        pillar = norm.get('pillar', '?')
        if pillar in pillar_stats:
            if e['result'] == 'YES':
                pillar_stats[pillar]['yes'] += 1
            elif e['result'] == 'YESp':
                pillar_stats[pillar]['yesp'] += 1
            elif e['result'] == 'NO':
                pillar_stats[pillar]['no'] += 1
            elif e['result'] == 'TBD':
                pillar_stats[pillar]['tbd'] += 1
    
    print(f"\n🤖 AI SCORES (smart_ai):")
    for pillar, stats in pillar_stats.items():
        total = stats['yes'] + stats['yesp'] + stats['no']
        score = (stats['yes'] + stats['yesp']) * 100 / total if total > 0 else 0
        print(f"   {pillar}: {score:.1f}% ({stats['yes']} YES, {stats['yesp']} YESp, {stats['no']} NO, {stats['tbd']} TBD)")
    
    # Overall
    total_yes = sum(s['yes'] for s in pillar_stats.values())
    total_yesp = sum(s['yesp'] for s in pillar_stats.values())
    total_no = sum(s['no'] for s in pillar_stats.values())
    total_tbd = sum(s['tbd'] for s in pillar_stats.values())
    total = total_yes + total_yesp + total_no
    overall = (total_yes + total_yesp) * 100 / total if total > 0 else 0
    
    print(f"\n   OVERALL AI: {overall:.1f}%")
    print(f"   EXCEL NOTE: {excel_note}%")
    print(f"\n   📈 ÉCART: {abs(overall - float(excel_note)):.1f} points")

if __name__ == "__main__":
    products_to_compare = ["Compound", "Balancer", "Aave", "1inch", "Binance"]
    
    for p in products_to_compare:
        try:
            compare_product(p)
        except Exception as e:
            print(f"Error comparing {p}: {e}")
