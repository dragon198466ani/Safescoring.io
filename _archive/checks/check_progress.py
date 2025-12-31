import requests
from collections import Counter

SUPABASE_URL = 'https://ajdncttomdqojlozxjxu.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqZG5jdHRvbWRxb2psb3p4anh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0MjMwNzUsImV4cCI6MjA3OTk5OTA3NX0.tTgqj-ALcl0oIdxFHuFQkB19apiz9CSyvV2X1TMWjEk'

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
}

# Compter les produits évalués (avec pagination)
all_evals = []
offset = 0
while True:
    r = requests.get(f'{SUPABASE_URL}/rest/v1/evaluations?select=product_id,result&offset={offset}&limit=1000', headers=headers)
    data = r.json()
    if not data:
        break
    all_evals.extend(data)
    offset += 1000

products_evaluated = len(set(e['product_id'] for e in all_evals))

# Total produits
r2 = requests.get(f'{SUPABASE_URL}/rest/v1/products?select=id', headers=headers)
total_products = len(r2.json())

print(f"Progression: {products_evaluated}/{total_products} produits évalués ({products_evaluated*100//total_products}%)")
print(f"Total évaluations: {len(all_evals)}")

# Répartition des résultats
counts = Counter(e['result'] for e in all_evals if e.get('result'))
print(f"\nRépartition:")
for k, v in sorted(counts.items()):
    print(f"  {k}: {v}")

# Temps estimé
if products_evaluated > 0:
    remaining = total_products - products_evaluated
    hours = remaining * 3.5 / 60
    print(f"\nTemps restant estimé: ~{hours:.1f} heures")
