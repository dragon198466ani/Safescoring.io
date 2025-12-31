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

# Prendre Coinbase Card
r = requests.get(SUPABASE_URL + '/rest/v1/products?name=eq.Coinbase Card&select=id', headers=headers)
product = r.json()[0]
product_id = product['id']
print(f"Coinbase Card (id={product_id})")

# Récupérer ses évaluations
r = requests.get(SUPABASE_URL + f'/rest/v1/evaluations?product_id=eq.{product_id}&select=norm_id,result', headers=headers)
evals = r.json()
print(f"Total évaluations: {len(evals)}")

# Récupérer les normes
r = requests.get(SUPABASE_URL + '/rest/v1/norms?select=id,is_essential,consumer,full', headers=headers)
norms = {n['id']: n for n in r.json()}

# Compter YES/NO par catégorie
stats = {
    'full': {'yes': 0, 'no': 0, 'na': 0},
    'consumer': {'yes': 0, 'no': 0, 'na': 0},
    'essential': {'yes': 0, 'no': 0, 'na': 0}
}

for e in evals:
    norm = norms.get(e['norm_id'])
    if not norm:
        continue
    result = e['result'].upper() if e['result'] else 'N/A'
    
    # Full (toutes les normes)
    if norm.get('full'):
        if result == 'YES': stats['full']['yes'] += 1
        elif result == 'NO': stats['full']['no'] += 1
        else: stats['full']['na'] += 1
    
    # Consumer
    if norm.get('consumer'):
        if result == 'YES': stats['consumer']['yes'] += 1
        elif result == 'NO': stats['consumer']['no'] += 1
        else: stats['consumer']['na'] += 1
    
    # Essential
    if norm.get('is_essential'):
        if result == 'YES': stats['essential']['yes'] += 1
        elif result == 'NO': stats['essential']['no'] += 1
        else: stats['essential']['na'] += 1

print("\nStatistiques par catégorie:")
for cat, s in stats.items():
    total_applicable = s['yes'] + s['no']
    score = (s['yes'] / total_applicable * 100) if total_applicable > 0 else 0
    print(f"  {cat.upper():10} -> YES={s['yes']:3}, NO={s['no']:3}, N/A={s['na']:3} | Applicable={total_applicable:3} | Score={score:.1f}%")
