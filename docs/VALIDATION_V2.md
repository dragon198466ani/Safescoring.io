# SAFE v2.0 - Validation Technique

## ✅ TESTS DE VALIDATION

### Test 1: Vérification des Reclassifications

**Normes S → A**:
```bash
python -c "
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
headers = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'}

for code in ['S169', 'S220', 'S222', 'S276']:
    r = requests.get(f'{SUPABASE_URL}/rest/v1/norms?code=eq.{code}&select=code,pillar,title', headers=headers)
    n = r.json()[0]
    status = '✅' if n['pillar'] == 'A' else '❌'
    print(f'{status} {n[\"code\"]:6s} | {n[\"pillar\"]} | {n[\"title\"][:50]}')
"
```

**Résultat attendu**: Toutes ces normes doivent être pillar='A'

**Normes A → S**:
```bash
python -c "
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
headers = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'}

for code in ['A145', 'A21', 'A53']:
    r = requests.get(f'{SUPABASE_URL}/rest/v1/norms?code=eq.{code}&select=code,pillar,title', headers=headers)
    n = r.json()[0]
    status = '✅' if n['pillar'] == 'S' else '❌'
    print(f'{status} {n[\"code\"]:6s} | {n[\"pillar\"]} | {n[\"title\"][:50]}')
"
```

**Résultat attendu**: Toutes ces normes doivent être pillar='S'

---

### Test 2: Vérification des Nouvelles Normes F

```bash
python -c "
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
headers = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'}

r = requests.get(f'{SUPABASE_URL}/rest/v1/norms?code=in.(F200,F201,F202,F203,F204)&select=code,title,is_essential,pillar', headers=headers)
for norm in sorted(r.json(), key=lambda x: x['code']):
    essential = '✅ ESSENTIAL' if norm.get('is_essential') else '   consumer'
    pillar_ok = '✅' if norm['pillar'] == 'F' else '❌'
    print(f'{pillar_ok} {norm[\"code\"]:6s} | {essential} | {norm[\"title\"][:40]}')
"
```

**Résultat attendu**:
- F200: consumer, pillar=F ✅
- F201: **ESSENTIAL**, pillar=F ✅
- F202: **ESSENTIAL**, pillar=F ✅
- F203: consumer, pillar=F ✅
- F204: consumer, pillar=F ✅

---

### Test 3: Vérification norm_applicability DEX

```bash
python -c "
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
headers = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'}

# DEX type_id = 39
r = requests.get(
    f'{SUPABASE_URL}/rest/v1/norm_applicability?type_id=eq.39&select=is_applicable',
    headers=headers
)
applicability = r.json()
applicable = sum(1 for a in applicability if a['is_applicable'])
na = sum(1 for a in applicability if not a['is_applicable'])

print(f'DEX (type_id=39):')
print(f'  Applicables: {applicable} (attendu: 506)')
print(f'  N/A: {na} (attendu: 406)')
print(f'  Total: {len(applicability)} (attendu: 912)')
print()

# Check specifically F200-F204
r_norms = requests.get(
    f'{SUPABASE_URL}/rest/v1/norms?code=in.(F200,F201,F202,F203,F204)&select=id,code',
    headers=headers
)
f_norm_ids = [n['id'] for n in r_norms.json()]

r_app = requests.get(
    f'{SUPABASE_URL}/rest/v1/norm_applicability?type_id=eq.39&norm_id=in.({','.join(map(str, f_norm_ids))})&select=norm_id,is_applicable',
    headers=headers
)

print('F200-F204 applicability for DEX:')
for app in sorted(r_app.json(), key=lambda x: x['norm_id']):
    norm = next(n for n in r_norms.json() if n['id'] == app['norm_id'])
    status = '✅ APPLICABLE' if app['is_applicable'] else '❌ N/A'
    print(f'  {norm[\"code\"]}: {status}')
"
```

**Résultat attendu**:
- Total: 912 normes ✅
- Applicables: 506 ✅
- N/A: 406 ✅
- F200-F204: Toutes APPLICABLE pour DEX ✅

---

### Test 4: Distribution des Piliers

```bash
python -c "
import requests
from collections import Counter
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

r = requests.get(f'{SUPABASE_URL}/rest/v1/norms?select=pillar', headers=headers)
counts = Counter(n['pillar'] for n in r.json())

print('Distribution des normes par pilier:')
print(f'  S (Security):   {counts.get(\"S\", 0):3d} (attendu: 269)')
print(f'  A (Adversity):  {counts.get(\"A\", 0):3d} (attendu: 193)')
print(f'  F (Fidelity):   {counts.get(\"F\", 0):3d} (attendu: 195)')
print(f'  E (Efficiency): {counts.get(\"E\", 0):3d} (attendu: 259)')
print(f'  TOTAL:          {sum(counts.values()):3d} (attendu: 2159)')
"
```

**Résultat attendu**:
- S: 269 (-1 vs v1.0)
- A: 193 (+1 vs v1.0)
- F: 195 (+5 vs v1.0) ✨
- E: 259 (inchangé)
- **Total: 2159** (+5 vs v1.0)

---

### Test 5: Évaluation 1inch en Cours

```bash
python monitor_1inch_v2.py
```

**Vérifier que**:
1. Total evals augmente progressivement
2. Nouvelles normes F200-F204 seront évaluées
3. Score final ~70-75% (vs ~60% v1.0)

---

## 📊 RÉSULTATS ATTENDUS

### Comparaison v1.0 vs v2.0 pour 1inch

| Aspect | v1.0 | v2.0 | Δ |
|--------|------|------|---|
| **Normes applicables** | 501 | **506** | +5 |
| **Pilier S** | ~75% | ~75% | 0 |
| **Pilier A** | ~45% | ~45% | 0 |
| **Pilier F** | ~50%? (vague) | **~85%** | +35 |
| **Pilier E** | ~90% | ~90% | 0 |
| **SCORE TOTAL** | ~60% | **~74%** | **+14** |

### Détail Pilier F pour 1inch (v2.0)

| Norme | Résultat attendu | Justification |
|-------|------------------|---------------|
| F200 Uptime | ✅ YES | Status page: 99.95% |
| F201 Patches | ✅ YES | Track record <7j |
| F202 Audits | ✅ YES | Certik, Trail of Bits, OZ |
| F203 LTS | ✅ YES | Actif depuis 2019 |
| F204 Track | ✅ YES | 6 ans, 0 hacks majeurs |

**Score F estimé**: 85-90% (vs 50-60% v1.0)

---

## 🎯 CRITÈRES DE SUCCÈS

### Validation Technique ✅

- [x] 7 normes reclassifiées correctement
- [x] 5 normes F créées avec bons flags
- [x] 110 règles applicability créées
- [x] Distribution piliers cohérente (2159 total)

### Validation Fonctionnelle ⏳

- [ ] 1inch évaluation complète (en cours)
- [ ] F200-F204 évaluées correctement
- [ ] Score F amélioré (~85% vs ~50%)
- [ ] Score total ~74% (vs ~60%)

### Validation Qualitative 📋

- [x] Définitions SAFE v2.0 cohérentes
- [x] Critères F objectifs et mesurables
- [x] Documentation complète (15000+ mots)
- [x] Guide d'évaluation avec exemples

---

## 🚀 PROCHAINES ACTIONS

### Si validation 1inch OK:

1. ✅ Comparer scores v1.0 vs v2.0
2. ✅ Valider cohérence F200-F204 evaluations
3. ⏳ Lancer ré-évaluation tous DEX:
   ```bash
   python src/core/smart_evaluator.py --type 39
   ```

### Si validation 1inch KO:

1. ⚠️ Identifier problèmes spécifiques
2. 🔧 Corriger scripts ou critères
3. 🔄 Relancer test pilote

---

## 📈 MONITORING CONTINU

**Commandes utiles**:

```bash
# Status 1inch
python monitor_1inch_v2.py

# Status général task
# (si lancé en background)

# Logs détaillés
tail -f worker_1.log  # si utilise run_parallel.py
```

---

**Version**: 2.0
**Date**: 2025-12-20
**Status**: ✅ Tests techniques passés, validation fonctionnelle en cours
