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

# Compter les normes par type
r = requests.get(SUPABASE_URL + '/rest/v1/norms?select=id,code,is_essential,consumer,full', headers=headers)
norms = r.json()

total = len(norms)
essential_true = sum(1 for n in norms if n.get('is_essential') == True)
consumer_true = sum(1 for n in norms if n.get('consumer') == True)
full_true = sum(1 for n in norms if n.get('full') == True)

print(f'Total normes: {total}')
print(f'is_essential=True: {essential_true} ({essential_true*100/total:.1f}%)')
print(f'consumer=True: {consumer_true} ({consumer_true*100/total:.1f}%)')
print(f'full=True: {full_true} ({full_true*100/total:.1f}%)')
print()

# Logique attendue:
# - Full: TOUTES les normes (911)
# - Consumer: SOUS-ENSEMBLE de Full (moins de normes)
# - Essential: SOUS-ENSEMBLE de Consumer (encore moins de normes)

print('Logique attendue:')
print('  Full >= Consumer >= Essential (en nombre de normes)')
print()
print(f'Actuel: Full={full_true}, Consumer={consumer_true}, Essential={essential_true}')

if essential_true > consumer_true or consumer_true > full_true:
    print('⚠️  PROBLÈME: Les valeurs ne sont pas cohérentes!')
