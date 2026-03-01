import requests, sys, json
sys.path.insert(0, '.')
from src.core.config import SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_KEY

key = SUPABASE_SERVICE_KEY or SUPABASE_KEY
h = {'apikey': key, 'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'}

tables = ['products', 'product_types', 'norms', 'product_type_mapping', 'evaluations',
          'safe_scoring_results', 'product_pillar_narratives', 'score_history']

for table in tables:
    r = requests.get(f'{SUPABASE_URL}/rest/v1/{table}?select=*&limit=1', headers=h, timeout=30)
    if r.status_code == 200:
        data = r.json()
        if data:
            cols = list(data[0].keys())
            print(f"\n{table} ({len(cols)} cols): {cols}")
        else:
            print(f"\n{table}: EMPTY (0 rows)")
    else:
        print(f"\n{table}: ERROR {r.status_code} - {r.text[:150]}")
