#!/usr/bin/env python3
"""
SAFESCORING - Régénération locale avec providers GRATUITS
==========================================================
Utilise les clés de .env (Groq, SambaNova, Cerebras)
Structure: 5 sections en français, max 10,000 mots
"""
import os
import sys
import re
import time
import requests
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

# Load .env from project root
PROJECT_ROOT = Path(__file__).parent.parent
load_dotenv(PROJECT_ROOT / '.env')

# Supabase config
SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', os.environ.get('SUPABASE_KEY', ''))

# Collect all API keys
def get_all_keys(prefix):
    """Get all keys with prefix (e.g., GROQ_API_KEY, GROQ_API_KEY_2, ...)"""
    keys = []
    base = os.environ.get(f'{prefix}_API_KEY', '')
    if base:
        keys.append(base)
    for i in range(2, 30):
        key = os.environ.get(f'{prefix}_API_KEY_{i}', '')
        if key:
            keys.append(key)
    return keys

GROQ_KEYS = get_all_keys('GROQ')
SAMBANOVA_KEYS = get_all_keys('SAMBANOVA')
CEREBRAS_KEYS = get_all_keys('CEREBRAS')

# Gemini keys (different naming: GOOGLE_GEMINI_API_KEY, etc.)
def get_gemini_keys():
    keys = []
    for prefix in ['GOOGLE_GEMINI_API_KEY', 'GEMINI_API_KEY']:
        base = os.environ.get(prefix, '')
        if base:
            keys.append(base)
        for i in range(2, 30):
            key = os.environ.get(f'{prefix}_{i}', '')
            if key:
                keys.append(key)
    return list(set(keys))  # Remove duplicates

GEMINI_KEYS = get_gemini_keys()

# API URLs
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
SAMBANOVA_URL = "https://api.sambanova.ai/v1/chat/completions"
CEREBRAS_URL = "https://api.cerebras.ai/v1/chat/completions"

# Key rotation indices
key_idx = {"groq": 0, "sambanova": 0, "cerebras": 0, "gemini": 0}

# Stats
stats = {"success": 0, "failed": 0, "skipped": 0}

SAFESCORING_CONTEXT = """
# SafeScoring - Framework d'Évaluation Crypto

SafeScoring évalue les produits crypto selon 4 piliers (SAFE):
- **S - Security**: Cryptographie, éléments sécurisés, gestion des clés
- **A - Adversity**: Résistance physique, protection contre la coercition
- **F - Fidelity**: Durabilité, fiabilité, qualité des matériaux
- **E - Ecosystem**: Support blockchain, intégration DeFi, UX

Produits évalués: Hardware Wallets, Software Wallets, CEX, DEX, DeFi, Backups
"""

SUMMARY_TEMPLATE = """Tu es un expert en sécurité crypto et standards techniques.

{context}

## Norme à résumer
- **Code**: {code}
- **Titre**: {title}
- **Description**: {description}
- **Pilier**: {pillar_name}
- **S'applique à**: {target_desc}

## INSTRUCTIONS CRITIQUES
1. Génère un résumé en FRANÇAIS
2. Maximum 10,000 mots
3. Structure EXACTE en 5 sections (voir format ci-dessous)
4. OBLIGATOIRE: Tableaux markdown dans sections 2 et 4
5. Si info non disponible, écris "Non spécifié dans la documentation officielle"
6. Commence DIRECTEMENT par "## 1. Vue d'ensemble" sans préambule

## FORMAT OBLIGATOIRE (5 SECTIONS)

## 1. Vue d'ensemble

(2-4 paragraphes)
Définition de la norme, contexte, importance pour la sécurité crypto.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

OBLIGATOIRE - Tableau markdown:
| Paramètre | Valeur |
|-----------|--------|
| ... | ... |

Inclure: valeurs numériques, algorithmes, versions, exigences quantifiables.

## 3. Application aux Produits Crypto

### Hardware Wallets
- **Ledger** : [application]
- **Trezor** : [application]
- **Coldcard** : [application]

### Software Wallets
- **MetaMask** : [application]
- **Trust Wallet** : [application]

### CEX
- **Binance** : [application]
- **Kraken** : [application]

### DEX / DeFi
- **Uniswap** : [application]
- **Aave** : [application]

(Inclure uniquement catégories pertinentes)

## 4. Critères d'Évaluation SafeScoring

OBLIGATOIRE - Tableau:
| Niveau | Description | Points |
|--------|-------------|--------|
| **Conforme complet** | [critères] | 100% |
| **Conforme partiel** | [critères] | 50-80% |
| **Non-conforme** | [critères] | 0-30% |

## 5. Sources et Références

- [Documentation officielle](URL)
- SafeScoring Criteria {code} v1.0
- Standards connexes

---
Génère maintenant le résumé complet:"""


def log(msg):
    # Handle Windows encoding issues
    try:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")
    except UnicodeEncodeError:
        safe_msg = msg.encode('ascii', 'replace').decode('ascii')
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {safe_msg}")


def call_groq(prompt):
    if not GROQ_KEYS:
        return None
    key = GROQ_KEYS[key_idx["groq"] % len(GROQ_KEYS)]
    key_idx["groq"] += 1
    try:
        r = requests.post(GROQ_URL, headers={
            'Authorization': f'Bearer {key}',
            'Content-Type': 'application/json'
        }, json={
            'model': 'llama-3.3-70b-versatile',
            'messages': [{'role': 'user', 'content': prompt}],
            'max_tokens': 8000,
            'temperature': 0.2
        }, timeout=120)
        if r.status_code == 200:
            return r.json()['choices'][0]['message']['content']
        elif r.status_code == 429:
            log(f"    Groq rate limit, rotating...")
            return None
    except Exception as e:
        log(f"    Groq error: {e}")
    return None


def call_sambanova(prompt):
    if not SAMBANOVA_KEYS:
        return None
    key = SAMBANOVA_KEYS[key_idx["sambanova"] % len(SAMBANOVA_KEYS)]
    key_idx["sambanova"] += 1
    try:
        r = requests.post(SAMBANOVA_URL, headers={
            'Authorization': f'Bearer {key}',
            'Content-Type': 'application/json'
        }, json={
            'model': 'Meta-Llama-3.1-70B-Instruct',
            'messages': [{'role': 'user', 'content': prompt}],
            'max_tokens': 8000,
            'temperature': 0.2
        }, timeout=180)
        if r.status_code == 200:
            return r.json()['choices'][0]['message']['content']
        else:
            log(f"    SambaNova HTTP {r.status_code}")
    except Exception as e:
        log(f"    SambaNova error: {e}")
    return None


def call_cerebras(prompt):
    if not CEREBRAS_KEYS:
        return None
    key = CEREBRAS_KEYS[key_idx["cerebras"] % len(CEREBRAS_KEYS)]
    key_idx["cerebras"] += 1
    try:
        r = requests.post(CEREBRAS_URL, headers={
            'Authorization': f'Bearer {key}',
            'Content-Type': 'application/json'
        }, json={
            'model': 'llama-3.3-70b',
            'messages': [{'role': 'user', 'content': prompt}],
            'max_tokens': 8000,
            'temperature': 0.2
        }, timeout=120)
        if r.status_code == 200:
            return r.json()['choices'][0]['message']['content']
        else:
            log(f"    Cerebras HTTP {r.status_code}")
    except Exception as e:
        log(f"    Cerebras error: {e}")
    return None


def call_gemini(prompt):
    if not GEMINI_KEYS:
        return None
    key = GEMINI_KEYS[key_idx["gemini"] % len(GEMINI_KEYS)]
    key_idx["gemini"] += 1
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={key}"
        r = requests.post(url, headers={
            'Content-Type': 'application/json'
        }, json={
            'contents': [{'parts': [{'text': prompt}]}],
            'generationConfig': {
                'temperature': 0.2,
                'maxOutputTokens': 8000
            }
        }, timeout=120)
        if r.status_code == 200:
            data = r.json()
            if 'candidates' in data and data['candidates']:
                return data['candidates'][0]['content']['parts'][0]['text']
        else:
            log(f"    Gemini HTTP {r.status_code}")
    except Exception as e:
        log(f"    Gemini error: {e}")
    return None


def call_ai(prompt):
    """Try all providers with multiple retries"""
    # Try each provider - prioritize those with quota
    providers = [call_gemini, call_groq, call_cerebras]

    for attempt in range(3):
        for func in providers:
            result = func(prompt)
            if result:
                # Clean any thinking tags
                result = re.sub(r'<think>.*?</think>', '', result, flags=re.DOTALL).strip()
                # Accept if has structure OR is long enough
                if "## 1. Vue d'ensemble" in result or len(result) > 2000:
                    return result
            time.sleep(0.5)
        time.sleep(2)  # Wait before retry round
    return None


def get_norms_to_process(limit=50, force=False):
    """Get norms that need summaries"""
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}'
    }

    all_norms = []
    for offset in range(0, 3000, 500):
        url = f'{SUPABASE_URL}/rest/v1/norms?select=id,code,title,description,pillar,target_type,summary&limit=500&offset={offset}&order=code'
        try:
            r = requests.get(url, headers=headers, timeout=30)
            if r.status_code == 200:
                batch = r.json()
                if batch:
                    all_norms.extend(batch)
                else:
                    break
        except Exception as e:
            log(f"Error fetching norms: {e}")
            break

    # Filter norms needing update
    needs_update = []
    for n in all_norms:
        summary = n.get('summary') or ''
        # Check if has proper 5-section structure
        has_structure = "## 1. Vue d'ensemble" in summary and "## 5. Sources" in summary
        if force or not has_structure or len(summary) < 500:
            needs_update.append(n)

    return needs_update[:limit]


def update_norm(norm_id, summary, code):
    """Update norm summary in Supabase"""
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
    }

    url = f'{SUPABASE_URL}/rest/v1/norms?id=eq.{norm_id}'

    # Add header with date
    full_summary = f"""# {code} - Resume SafeScoring
**Mis a jour:** {datetime.now().strftime('%Y-%m-%d %H:%M UTC')}

---

{summary}"""

    try:
        r = requests.patch(url, headers=headers, json={
            'summary': full_summary,
            'summary_status': 'ai_generated',
            'last_summarized_at': datetime.now().isoformat() + 'Z'
        }, timeout=30)
        return r.status_code in [200, 204]
    except:
        return False


def generate_summary(norm):
    """Generate summary for a norm"""
    code = norm['code']
    title = norm['title']
    description = norm.get('description') or ''
    pillar = norm.get('pillar', '')
    target_type = norm.get('target_type', 'both')

    pillar_names = {
        'S': 'Security (Sécurité)',
        'A': 'Adversity (Adversité)',
        'F': 'Fidelity (Fidélité)',
        'E': 'Ecosystem (Écosystème)'
    }

    target_descs = {
        'digital': 'produits logiciels (wallets software, exchanges, protocoles DeFi)',
        'physical': 'produits matériels (hardware wallets, backups physiques)',
        'both': 'tous les produits crypto (matériels et logiciels)'
    }

    prompt = SUMMARY_TEMPLATE.format(
        context=SAFESCORING_CONTEXT,
        code=code,
        title=title,
        description=description,
        pillar_name=pillar_names.get(pillar, pillar),
        target_desc=target_descs.get(target_type, target_descs['both'])
    )

    return call_ai(prompt)


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Régénère les résumés avec providers gratuits")
    parser.add_argument("--limit", type=int, default=50, help="Nombre de normes à traiter")
    parser.add_argument("--force", action="store_true", help="Régénérer même si résumé existe")
    parser.add_argument("--dry-run", action="store_true", help="Ne pas sauvegarder")
    args = parser.parse_args()

    log("=" * 60)
    log("SAFESCORING - RÉGÉNÉRATION RÉSUMÉS (PROVIDERS GRATUITS)")
    log("=" * 60)
    log(f"Cles: Gemini({len(GEMINI_KEYS)}), Groq({len(GROQ_KEYS)}), Cerebras({len(CEREBRAS_KEYS)})")
    log(f"Structure: 5 sections français, max 10,000 mots")
    log("=" * 60)

    if not SUPABASE_URL or not SUPABASE_KEY:
        log("ERREUR: Configuration Supabase manquante")
        return

    if not GROQ_KEYS and not SAMBANOVA_KEYS and not CEREBRAS_KEYS:
        log("ERREUR: Aucune clé API configurée")
        return

    norms = get_norms_to_process(limit=args.limit, force=args.force)
    log(f"\n[INFO] {len(norms)} normes a traiter")

    if not norms:
        log("Toutes les normes ont déjà des résumés!")
        return

    for i, norm in enumerate(norms, 1):
        code = norm['code']
        title = norm['title'][:50]

        log(f"\n[{i}/{len(norms)}] {code} - {title}...")

        summary = generate_summary(norm)

        if summary and len(summary) > 500:
            word_count = len(summary.split())
            log(f"    [OK] Genere: {len(summary)} chars (~{word_count} mots)")

            if not args.dry_run:
                if update_norm(norm['id'], summary, code):
                    stats["success"] += 1
                    log(f"    [SAVE] Sauvegarde OK")
                else:
                    stats["failed"] += 1
                    log(f"    [FAIL] Erreur sauvegarde")
            else:
                stats["success"] += 1
                log(f"    [DRY-RUN] Non sauvegardé")
        else:
            stats["failed"] += 1
            log(f"    [FAIL] Échec génération")

        # Rate limiting - longer wait for quota recovery
        time.sleep(5)

    log("\n" + "=" * 60)
    log("RÉSULTAT FINAL")
    log("=" * 60)
    log(f"[OK] Succès: {stats['success']}")
    log(f"[FAIL] Échecs: {stats['failed']}")
    log(f"[STATS] Total: {len(norms)}")


if __name__ == "__main__":
    main()
