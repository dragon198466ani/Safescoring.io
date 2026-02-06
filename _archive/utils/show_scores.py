#!/usr/bin/env python3
"""Affiche les scores SAFE calculés depuis Supabase"""
import requests

# Config
SUPABASE_URL = 'https://ajdncttomdqojlozxjxu.supabase.co'
SUPABASE_KEY = 'REVOKED_ROTATE_ON_DASHBOARD'
headers = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'}

# Récupérer les scores depuis Supabase
r = requests.get(f'{SUPABASE_URL}/rest/v1/products?select=name,scores&order=name', headers=headers)
products = r.json()

# Afficher les scores
print('='*90)
print('SCORES SAFE CALCULÉS PAR IA - TOP 30')
print('='*90)
print(f"{'Produit':<35} | {'SAFE':>6} | {'S':>6} | {'A':>6} | {'F':>6} | {'E':>6}")
print('-'*90)

scored = []
for p in products:
    if p.get('scores') and p['scores'].get('full'):
        s = p['scores']['full']
        safe = s.get('SAFE')
        if safe is not None:
            scored.append((p['name'], safe, s.get('S'), s.get('A'), s.get('F'), s.get('E')))

scored.sort(key=lambda x: x[1] if x[1] else 0, reverse=True)

for name, safe, s, a, f, e in scored[:30]:
    safe_str = f'{safe:.1f}%' if safe else 'N/A'
    s_str = f'{s:.1f}%' if s else 'N/A'
    a_str = f'{a:.1f}%' if a else 'N/A'
    f_str = f'{f:.1f}%' if f else 'N/A'
    e_str = f'{e:.1f}%' if e else 'N/A'
    print(f'{name[:35]:<35} | {safe_str:>6} | {s_str:>6} | {a_str:>6} | {f_str:>6} | {e_str:>6}')

print('-'*90)
print(f'\nTotal: {len(scored)} produits avec scores')

# Stats
if scored:
    avg = sum(x[1] for x in scored) / len(scored)
    print(f'Moyenne SAFE: {avg:.1f}%')
    print(f'Min: {min(x[1] for x in scored):.1f}%')
    print(f'Max: {max(x[1] for x in scored):.1f}%')
