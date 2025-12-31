#!/usr/bin/env python3
"""Compare les scores IA avec les scores Excel"""
import pandas as pd
import requests

# Config Supabase
config = {}
with open('config/env_template_free.txt', 'r', encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            key, value = line.split('=', 1)
            config[key.strip()] = value.strip()

SUPABASE_URL = config.get('NEXT_PUBLIC_SUPABASE_URL', '')
SUPABASE_KEY = config.get('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')
headers = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'}

# Lire l'Excel - trouver les scores
df_excel = pd.read_excel('data/SAFE_SCORING_V7_FINAL.xlsx', sheet_name='ÉVALUATIONS COMPLÈTES', header=None)

# Trouver la ligne avec "Produit"
for i, row in df_excel.iterrows():
    if 'Produit' in str(row.values):
        header_row = i
        break

# Relire avec le bon header
df_excel = pd.read_excel('data/SAFE_SCORING_V7_FINAL.xlsx', sheet_name='ÉVALUATIONS COMPLÈTES', header=header_row)

# Chercher les colonnes de scores
score_cols = [c for c in df_excel.columns if 'SCORE' in str(c).upper() or 'NOTE' in str(c).upper()]
print(f"Colonnes de scores trouvées: {score_cols}")

# Récupérer les évaluations Supabase
r = requests.get(
    f"{SUPABASE_URL}/rest/v1/products?select=id,name,type_id",
    headers=headers
)
products = {p['name']: p for p in r.json()} if r.status_code == 200 else {}

# Récupérer les évaluations
r = requests.get(
    f"{SUPABASE_URL}/rest/v1/evaluations?select=product_id,norm_id,result",
    headers={**headers, 'Range': '0-10000'}
)
evaluations = r.json() if r.status_code == 200 else []

# Grouper par produit
eval_by_product = {}
for e in evaluations:
    pid = e['product_id']
    if pid not in eval_by_product:
        eval_by_product[pid] = {'yes': 0, 'no': 0, 'na': 0}
    result = e.get('result', '').upper()
    if result == 'YES':
        eval_by_product[pid]['yes'] += 1
    elif result == 'NO':
        eval_by_product[pid]['no'] += 1
    else:
        eval_by_product[pid]['na'] += 1

# Comparer
print("\n" + "="*80)
print("COMPARAISON SCORES IA vs EXCEL")
print("="*80)
print(f"{'Produit':<25} | {'Type':<12} | {'IA %':>6} | {'Excel %':>8} | {'Diff':>6}")
print("-"*80)

comparisons = []
for _, row in df_excel.iterrows():
    product_name = str(row.get('Produit', '')).strip()
    if not product_name or product_name == 'nan':
        continue
    
    # Score Excel
    excel_score = None
    for col in score_cols:
        if 'NOTE' in str(col).upper() or 'FINALE' in str(col).upper():
            val = row.get(col)
            if pd.notna(val):
                try:
                    excel_score = float(val)
                    break
                except:
                    pass
    
    # Score IA
    ia_score = None
    if product_name in products:
        pid = products[product_name]['id']
        if pid in eval_by_product:
            stats = eval_by_product[pid]
            total = stats['yes'] + stats['no']
            if total > 0:
                ia_score = round(stats['yes'] * 100 / total, 1)
    
    if excel_score is not None and ia_score is not None:
        diff = ia_score - excel_score
        product_type = str(row.get('Type', ''))[:12]
        print(f"{product_name[:25]:<25} | {product_type:<12} | {ia_score:>5.1f}% | {excel_score:>7.1f}% | {diff:>+5.1f}%")
        comparisons.append({'name': product_name, 'ia': ia_score, 'excel': excel_score, 'diff': diff})

if comparisons:
    avg_diff = sum(c['diff'] for c in comparisons) / len(comparisons)
    print("-"*80)
    print(f"{'MOYENNE':<25} | {'':12} | {'':>6} | {'':>8} | {avg_diff:>+5.1f}%")
    print(f"\n{len(comparisons)} produits comparés")
