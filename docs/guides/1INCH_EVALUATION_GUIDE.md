# 1inch Evaluation Guide

## Current Status

### ✅ DEX Norms Updated
Les normes DEX ont été **mises à jour et corrigées** avec 6 changements critiques:
- **S06 Keccak-256**: ❌ N/A → ✅ APPLICABLE (CRITIQUE pour Ethereum!)
- **S01 AES-256**: ❌ N/A → ✅ APPLICABLE
- **S10 Argon2**: ❌ N/A → ✅ APPLICABLE
- **E01 Bitcoin**: ❌ N/A → ✅ APPLICABLE
- **E11 Cardano**: ❌ N/A → ✅ APPLICABLE
- **E153 TPS >100K**: ❌ N/A → ✅ APPLICABLE

### 📊 1inch Current Evaluation (OLD)

**Product:** 1inch (ID: 249)
- **Type:** DEX (Type ID: 39)
- **URL:** https://1inch.io
- **Evaluations:** 740 total
  - YES: 64
  - YESp: 48
  - NO: 167
  - N/A: 416
  - TBD: 45
- **Score actuel:** **40% (112/279)**

⚠️ **Ce score est basé sur les anciennes règles d'applicabilité** (avant nos corrections)

---

## Comment Ré-évaluer 1inch

### Option 1: Ligne de commande (Recommandé)

```bash
python src/core/smart_evaluator.py --product "1inch" --limit 1
```

**Durée estimée:** 10-20 minutes
- Scraping du site 1inch.io (~30 secondes)
- Évaluation de 501 normes applicables avec IA (~15 minutes)
- Sauvegarde dans Supabase (~5 secondes)

### Option 2: Script batch (Windows)

Double-cliquez sur: `run_1inch_eval.bat`

### Option 3: Script Python dédié

```bash
python quick_eval_1inch.py
```

---

## Après l'Évaluation

### Vérifier les résultats:

```bash
python check_1inch_status.py
```

Cela affichera:
- Nouveau score (devrait être plus élevé grâce aux normes corrigées)
- Détails des évaluations (YES/YESp/NO/N/A/TBD)
- Comparaison avant/après

### Score attendu après mise à jour:

Avec les nouvelles normes DEX (notamment Keccak-256), le score devrait augmenter car 1inch:
- ✅ Utilise Keccak-256 (Ethereum natif)
- ✅ Utilise AES-256 (TLS/HTTPS)
- ✅ Peut utiliser Argon2 (admin/API)
- ✅ Supporte wrapped BTC
- ✅ A un bon TPS

**Score estimé après mise à jour:** 50-60% (au lieu de 40%)

---

## Normes Clés pour 1inch

### Devrait avoir YES:

**Security (S):**
- S03 ECDSA secp256k1 ✅ (Ethereum)
- S05 SHA-256 ✅ (Ethereum)
- S06 Keccak-256 ✅ (Ethereum core) **NOUVEAU!**
- S01 AES-256 ✅ (HTTPS) **NOUVEAU!**
- S104 EIP-2612 Permit ✅
- S105 EIP-4626 ✅

**Efficiency (E):**
- E02 Ethereum ✅
- E03 EVM chains ✅
- E04-E09 Polygon/Arbitrum/Optimism/Base/BNB/Avalanche ✅
- E01 Bitcoin ✅ (wrapped BTC) **NOUVEAU!**
- E153 TPS >100K ✅ (performance) **NOUVEAU!**

**Fidelity (F):**
- F134-F140 Testing (unit, integration, fuzz, coverage) ✅

### Devrait avoir N/A:

**Fidelity (F):**
- F01-F10 Physical resistance (IP ratings, température) ❌ (pas de hardware)
- F100-F104 Transport, matériaux ❌ (pas de hardware)

**Adversity (A):**
- A01-A08 PIN-based features ❌ (pas d'authentification PIN)

---

## Troubleshooting

### Si l'évaluation prend trop de temps:

1. Vérifiez que les clés API sont configurées:
```bash
# Dans config/env_template_free.txt
DEEPSEEK_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-...
GOOGLE_GEMINI_API_KEY=...
```

2. L'évaluation essaie les APIs dans cet ordre:
   - DeepSeek (rapide, économique)
   - Claude (précis, coûteux)
   - Gemini (bon compromis)
   - Ollama (local, gratuit mais lent)
   - Mistral (backup)

### Si l'évaluation échoue:

1. Vérifiez la connexion Supabase:
```bash
python check_1inch_status.py
```

2. Vérifiez le scraping:
   - Le site 1inch.io doit être accessible
   - Le script peut utiliser Playwright si JavaScript est requis

### Si le score ne change pas:

Les résultats sont sauvegardés dans `evaluations` avec:
- `evaluated_by: 'smart_ai'`
- `evaluation_date: NOW()`

Le système fait un DELETE puis INSERT, donc les anciennes évaluations sont écrasées.

---

## Commandes Utiles

```bash
# Voir toutes les évaluations de 1inch
python -c "
import requests, json
config = {}
with open('config/env_template_free.txt') as f:
    for line in f:
        if '=' in line and not line.startswith('#'):
            k, v = line.strip().split('=', 1)
            config[k] = v

headers = {
    'apikey': config['NEXT_PUBLIC_SUPABASE_ANON_KEY'],
    'Authorization': f\"Bearer {config['NEXT_PUBLIC_SUPABASE_ANON_KEY']}\"
}

r = requests.get(
    f\"{config['NEXT_PUBLIC_SUPABASE_URL']}/rest/v1/evaluations?product_id=eq.249&select=result\",
    headers=headers
)

evals = r.json()
print(f'Total: {len(evals)}')
print(f'YES: {sum(1 for e in evals if e[\"result\"] == \"YES\")}')
print(f'YESp: {sum(1 for e in evals if e[\"result\"] == \"YESp\")}')
print(f'NO: {sum(1 for e in evals if e[\"result\"] == \"NO\")}')
print(f'N/A: {sum(1 for e in evals if e[\"result\"] == \"N/A\")}')
print(f'TBD: {sum(1 for e in evals if e[\"result\"] == \"TBD\")}')
"

# Comparer avec les normes applicables DEX
python analyze_dex_norms.py

# Voir les changements de normes DEX
python get_critical_dex_norms.py
```

---

## Résumé

✅ **Fait:**
1. Analyse des normes DEX
2. Correction de 6 normes critiques (notamment Keccak-256!)
3. Vérification de l'état actuel de 1inch (40% score)

🔄 **À faire:**
1. Relancer l'évaluation de 1inch avec les normes corrigées
2. Vérifier le nouveau score (devrait être ~50-60%)
3. Analyser les changements de score par pilier

---

**Pour lancer l'évaluation maintenant:**
```bash
python src/core/smart_evaluator.py --product "1inch" --limit 1
```

Ou simplement double-cliquer sur: **run_1inch_eval.bat**
