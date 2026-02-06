import sys
import os
import requests
import re
import time
from collections import defaultdict

# Add src to path for config import
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# Load configuration from central config
from src.core.config import SUPABASE_URL, SUPABASE_KEY, MISTRAL_API_KEY, get_supabase_headers

# Verify required config
if not all([SUPABASE_URL, SUPABASE_KEY, MISTRAL_API_KEY]):
    print("[ERROR] Missing required configuration in config/.env")
    print("Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, MISTRAL_API_KEY")
    sys.exit(1)

WORKER_ID = int(sys.argv[1])
START_IDX = int(sys.argv[2])
END_IDX = int(sys.argv[3])

headers = get_supabase_headers('return=representation')

print(f'[W{WORKER_ID}] Starting products {START_IDX}-{END_IDX}')

r = requests.get(f'{SUPABASE_URL}/rest/v1/products?select=id,name,url', headers=headers)
all_products = r.json()
products = all_products[START_IDX:END_IDX]

r = requests.get(f'{SUPABASE_URL}/rest/v1/product_types?select=id,name', headers=headers)
types = {t['id']: t['name'] for t in r.json()}

r = requests.get(f'{SUPABASE_URL}/rest/v1/norms?select=id,code,title,pillar', headers=headers)
norms = r.json()
norms_by_code = {n['code']: n for n in norms}

r = requests.get(f'{SUPABASE_URL}/rest/v1/product_type_mapping?select=product_id,type_id', headers=headers)
product_types = defaultdict(set)
for m in r.json():
    product_types[m['product_id']].add(m['type_id'])

norm_applicability = {}
for tid in types.keys():
    r = requests.get(f'{SUPABASE_URL}/rest/v1/norm_applicability?type_id=eq.{tid}&is_applicable=eq.true&select=norm_id', headers=headers)
    if r.status_code == 200:
        norm_applicability[tid] = {a['norm_id'] for a in r.json()}

def get_applicable_norms(type_ids):
    applicable = set()
    for tid in type_ids:
        applicable.update(norm_applicability.get(tid, set()))
    return [n for n in norms if n['id'] in applicable]

PROMPT = """Expert crypto. Evaluate product.
PRODUCT: {name} | TYPES: {types}
NORMS: {norms}
FORMAT: CODE: YES/YESp/NO/TBD
Evaluate:"""

def call_mistral(prompt, _retries=0, _max_retries=5):
    try:
        r = requests.post('https://api.mistral.ai/v1/chat/completions',
            headers={'Authorization': f'Bearer {MISTRAL_API_KEY}', 'Content-Type': 'application/json'},
            json={'model': 'mistral-small-latest', 'messages': [{'role': 'user', 'content': prompt}], 'temperature': 0.1, 'max_tokens': 3000},
            timeout=90)
        if r.status_code == 200:
            return r.json()['choices'][0]['message']['content']
        elif r.status_code == 429:
            if _retries >= _max_retries:
                print(f'[W{WORKER_ID}] Rate limit: max retries ({_max_retries}) reached, skipping')
                return None
            wait_time = (3 + WORKER_ID) * (2 ** _retries)
            print(f'[W{WORKER_ID}] Rate limited, retry {_retries + 1}/{_max_retries} in {wait_time}s')
            time.sleep(wait_time)
            return call_mistral(prompt, _retries=_retries + 1, _max_retries=_max_retries)
        else:
            print(f'[W{WORKER_ID}] Mistral API HTTP {r.status_code}: {r.text[:200]}')
    except requests.RequestException as e:
        print(f'[W{WORKER_ID}] Mistral API error: {e}')
    except (KeyError, IndexError) as e:
        print(f'[W{WORKER_ID}] Response parsing error: {e}')
    return None

for idx, product in enumerate(products):
    pid = product['id']
    type_ids = product_types.get(pid, set())
    if not type_ids:
        continue

    applicable_norms = get_applicable_norms(type_ids)
    print(f'[W{WORKER_ID}] {idx+1}/{len(products)} {product["name"][:25]} ({len(applicable_norms)} norms)')

    if not applicable_norms:
        continue

    all_evals = {}
    type_names = ', '.join([types.get(t, '?')[:15] for t in list(type_ids)[:3]])

    for pillar in ['S', 'A', 'F', 'E']:
        pillar_norms = [n for n in applicable_norms if n['pillar'] == pillar]
        for i in range(0, len(pillar_norms), 35):
            batch = pillar_norms[i:i+35]
            norms_text = '; '.join([f"{n['code']}:{n['title'][:30]}" for n in batch])
            result = call_mistral(PROMPT.format(name=product['name'], types=type_names, norms=norms_text))
            if result:
                for line in result.split('\n'):
                    m = re.search(r'([SAFE])(\d+).*?(YES|YESp|NO|TBD)', line, re.I)
                    if m:
                        code = f'{m.group(1).upper()}{m.group(2)}'
                        val = m.group(3).upper()
                        if val == 'YESP': val = 'YESp'
                        all_evals[code] = val
            time.sleep(0.5)

    records = []
    app_ids = {n['id'] for n in applicable_norms}
    for code, res in all_evals.items():
        norm = norms_by_code.get(code)
        if norm:
            records.append({'product_id': pid, 'norm_id': norm['id'], 'result': res, 'evaluated_by': 'multi_type_ai'})
    for n in norms:
        if n['id'] not in app_ids:
            records.append({'product_id': pid, 'norm_id': n['id'], 'result': 'N/A', 'evaluated_by': 'multi_type_na'})

    requests.delete(f'{SUPABASE_URL}/rest/v1/evaluations?product_id=eq.{pid}', headers={**headers, 'Prefer': 'return=minimal'})
    if records:
        requests.post(f'{SUPABASE_URL}/rest/v1/evaluations', headers={**headers, 'Prefer': 'resolution=merge-duplicates'}, json=records)
        yes = sum(1 for v in all_evals.values() if v in ['YES', 'YESp'])
        no = sum(1 for v in all_evals.values() if v == 'NO')
        pct = yes*100//(yes+no) if yes+no else 0
        print(f'    -> {pct}%')

print(f'[W{WORKER_ID}] DONE')
