import requests
from collections import Counter

SUPABASE_URL = 'https://ajdncttomdqojlozxjxu.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqZG5jdHRvbWRxb2psb3p4anh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0MjMwNzUsImV4cCI6MjA3OTk5OTA3NX0.tTgqj-ALcl0oIdxFHuFQkB19apiz9CSyvV2X1TMWjEk'

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json'
}

# Vérifier les évaluations pour le produit 249 (1inch)
r = requests.get(
    f'{SUPABASE_URL}/rest/v1/evaluations?product_id=eq.249&select=result,evaluated_by&limit=1000',
    headers=headers
)
if r.status_code == 200:
    results = r.json()
    print(f'Évaluations pour produit 249 (1inch): {len(results)}')
    
    # Compter par type
    counts = Counter(e['result'] for e in results if e.get('result'))
    print(f'\nRépartition:')
    for k, v in sorted(counts.items()):
        print(f'  {k}: {v}')
    
    # Compter par evaluated_by
    by_eval = Counter(e['evaluated_by'] for e in results if e.get('evaluated_by'))
    print(f'\nPar évaluateur:')
    for k, v in sorted(by_eval.items()):
        print(f'  {k}: {v}')
else:
    print(f'Erreur: {r.status_code} - {r.text}')
