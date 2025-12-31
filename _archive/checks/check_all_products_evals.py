#!/usr/bin/env python3
"""Vérifie les évaluations de tous les produits"""
import requests

config = {}
with open('config/env_template_free.txt', 'r', encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            key, value = line.split('=', 1)
            config[key.strip()] = value.strip()

SUPABASE_URL = config.get('NEXT_PUBLIC_SUPABASE_URL', '')
SUPABASE_KEY = config.get('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')
headers = {'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY}

# Récupérer tous les produits
r = requests.get(SUPABASE_URL + '/rest/v1/products?select=id,name&order=name.asc', headers=headers)
products = r.json()

print(f"Analyse de {len(products)} produits...\n")

low_score_products = []
good_products = []

for p in products:
    r = requests.get(
        SUPABASE_URL + f'/rest/v1/evaluations?product_id=eq.{p["id"]}&select=result',
        headers=headers
    )
    evals = r.json()
    
    yes = sum(1 for e in evals if e.get('result') == 'YES')
    no = sum(1 for e in evals if e.get('result') == 'NO')
    total = yes + no
    
    if total > 0:
        pct = yes * 100 // total
        if pct < 20:  # Score anormalement bas
            low_score_products.append((p['name'], yes, total, pct))
        else:
            good_products.append((p['name'], yes, total, pct))

print(f"✅ Produits avec scores normaux (>20%): {len(good_products)}")
print(f"⚠️  Produits avec scores anormaux (<20%): {len(low_score_products)}")

if low_score_products:
    print("\n⚠️  PRODUITS À CORRIGER:")
    for name, yes, total, pct in low_score_products:
        print(f"   - {name}: {yes}/{total} = {pct}%")
