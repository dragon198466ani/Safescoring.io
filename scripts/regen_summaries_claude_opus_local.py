#!/usr/bin/env python3
"""
SAFESCORING - Régénération des résumés avec Claude Opus
========================================================
Utilise les documents LOCAUX (norm_docs/, norm_pdfs/) comme source principale.
Génère des résumés de haute qualité sans hallucination.

Usage:
    python scripts/regen_summaries_claude_opus_local.py --limit 10
    python scripts/regen_summaries_claude_opus_local.py --code S01
    python scripts/regen_summaries_claude_opus_local.py --all
"""

import sys
import os
import re
import time
import argparse
from pathlib import Path
from bs4 import BeautifulSoup

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import requests
from src.core.config import SUPABASE_URL, SUPABASE_HEADERS, CLAUDE_API_KEY, GEMINI_API_KEYS, GROQ_API_KEYS, SAMBANOVA_API_KEYS

# Paths
PROJECT_ROOT = Path(__file__).parent.parent
NORM_DOCS_DIR = PROJECT_ROOT / "norm_docs"
NORM_PDFS_DIR = PROJECT_ROOT / "norm_pdfs"

# API Configuration
# Claude (payant)
CLAUDE_API_URL = "https://api.anthropic.com/v1/messages"
CLAUDE_MODEL = "claude-sonnet-4-20250514"

# Gemini (gratuit - 1500 req/jour)
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"

# Groq (gratuit - ultra rapide)
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.3-70b-versatile"

# SambaNova (gratuit - très rapide)
SAMBANOVA_API_URL = "https://api.sambanova.ai/v1/chat/completions"
SAMBANOVA_MODEL = "Meta-Llama-3.1-70B-Instruct"

# Index pour rotation des clés
gemini_key_index = 0
groq_key_index = 0
sambanova_key_index = 0

SAFESCORING_CONTEXT = """
# SafeScoring - Framework d'Évaluation

SafeScoring est un framework scientifique d'évaluation pour les produits crypto:
- **Hardware Wallets** (Ledger, Trezor, Keystone, etc.)
- **Software Wallets** (MetaMask, Trust Wallet, Rabby, etc.)
- **Exchanges** (CEX et DEX)
- **Protocoles DeFi** (Lending, DEX, Staking, Bridges)
- **Solutions de Backup** (Plaques métal, Cryptosteel, etc.)

## Framework SAFE (4 Piliers)

### S - Security (Sécurité)
Cryptographie, éléments sécurisés, gestion des clés, résistance aux attaques.

### A - Adversity (Adversité)  
Résistance physique, protection contre la coercition, récupération après sinistre.

### F - Fidelity (Fidélité)
Durabilité, fiabilité, qualité des matériaux, garantie, support.

### E - Ecosystem (Écosystème)
Support blockchain, intégration DeFi, interopérabilité, UX.
"""


def get_local_document(code: str) -> tuple[str, str]:
    """
    Cherche le document local pour une norme.
    Retourne (content, source_type) ou (None, None) si non trouvé.
    """
    # Patterns de fichiers possibles
    patterns = [
        f"{code}.html",
        f"{code}.txt",
        f"{code.replace('-', '_')}.html",
        f"{code.replace('-', '_')}.txt",
    ]
    
    # Chercher dans norm_docs
    for pattern in patterns:
        filepath = NORM_DOCS_DIR / pattern
        if filepath.exists():
            try:
                content = filepath.read_text(encoding='utf-8', errors='ignore')
                
                # Si HTML, extraire le texte
                if filepath.suffix == '.html':
                    soup = BeautifulSoup(content, 'html.parser')
                    # Supprimer scripts, styles, nav, footer
                    for tag in soup(['script', 'style', 'nav', 'footer', 'header', 'aside']):
                        tag.decompose()
                    
                    # Chercher le contenu principal
                    main = (soup.find('main') or soup.find('article') or 
                            soup.find('div', {'class': 'content'}) or
                            soup.find('div', {'class': 'markdown-body'}) or
                            soup.body)
                    
                    if main:
                        content = main.get_text(separator='\n', strip=True)
                    else:
                        content = soup.get_text(separator='\n', strip=True)
                
                # Vérifier que le contenu est suffisant (pas juste une page d'erreur)
                if len(content) > 500:
                    return content[:30000], f"local:{filepath.name}"
                    
            except Exception as e:
                print(f"      Erreur lecture {filepath}: {e}")
    
    # Chercher dans norm_pdfs (si PyPDF2 disponible)
    try:
        import PyPDF2
        pdf_path = NORM_PDFS_DIR / f"{code}.pdf"
        if pdf_path.exists():
            text_parts = []
            with open(pdf_path, 'rb') as f:
                reader = PyPDF2.PdfReader(f)
                for page in reader.pages[:30]:  # Max 30 pages
                    text_parts.append(page.extract_text() or '')
            
            content = '\n'.join(text_parts)
            if len(content) > 500:
                return content[:30000], f"local_pdf:{pdf_path.name}"
    except ImportError:
        pass
    except Exception as e:
        print(f"      Erreur PDF: {e}")
    
    return None, None


def generate_summary_claude(norm: dict, reference_content: str, source_type: str) -> str:
    """
    Génère un résumé avec Claude.
    IMPORTANT: Ne fait AUCUNE hallucination - si pas d'info, le dit clairement.
    """
    if not CLAUDE_API_KEY:
        print("      ERREUR: ANTHROPIC_API_KEY non configurée!")
        return None
    
    code = norm['code']
    title = norm['title']
    description = norm.get('description', '') or ''
    pillar = norm.get('pillar', '')
    target_type = norm.get('target_type', 'both')
    
    pillar_names = {
        'S': 'Security (Sécurité)',
        'A': 'Adversity (Adversité)', 
        'F': 'Fidelity (Fidélité)',
        'E': 'Ecosystem (Écosystème)'
    }
    pillar_name = pillar_names.get(pillar, pillar)
    
    target_desc = {
        'digital': 'produits logiciels (wallets software, exchanges, protocoles DeFi)',
        'physical': 'produits matériels (hardware wallets, clés de sécurité, backups physiques)',
        'both': 'produits crypto matériels et logiciels'
    }.get(target_type, 'produits crypto')
    
    # Construire le prompt
    if reference_content and len(reference_content) > 500:
        source_info = f"""
## Documentation Source ({source_type})
{reference_content[:25000]}
"""
        instruction = """
## Instructions CRITIQUES

1. Base ton résumé UNIQUEMENT sur la documentation fournie ci-dessus
2. EXTRAIS LES DONNÉES TECHNIQUES FACTUELLES: valeurs numériques, algorithmes, niveaux, versions
3. Si une information n'est PAS dans la documentation, écris: "Non spécifié dans la documentation officielle"
4. NE JAMAIS inventer ou supposer des informations - utilise UNIQUEMENT ce qui est dans le document
5. Cite les passages pertinents avec leurs références (section, page, paragraphe)
6. INCLUS DES TABLEAUX si le standard définit des niveaux, classes ou catégories
7. Si la documentation est insuffisante ou hors-sujet, indique-le clairement
"""
    else:
        source_info = f"""
## Documentation Source
AUCUNE documentation officielle disponible pour cette norme.
Seules informations connues:
- Code: {code}
- Titre: {title}
- Description: {description}
"""
        instruction = """
## Instructions CRITIQUES

1. AUCUNE documentation officielle n'est disponible
2. Génère un résumé MINIMAL basé uniquement sur le titre et la description
3. Indique clairement: "Documentation officielle non disponible - résumé basé sur le titre uniquement"
4. NE JAMAIS inventer de spécifications techniques ou de détails
5. Suggère où trouver la documentation officielle si possible
"""

    prompt = f"""Tu es un expert en sécurité crypto et standards techniques.

{SAFESCORING_CONTEXT}

## Norme à Résumer
- **Code**: {code}
- **Titre**: {title}
- **Description**: {description}
- **Pilier SafeScoring**: {pillar_name}
- **S'applique à**: {target_desc}

{source_info}

{instruction}

## Format du Résumé (STRUCTURE OBLIGATOIRE - MAX 10,000 MOTS)

Génère un résumé en français avec EXACTEMENT cette structure en 5 sections:

## 1. Vue d'ensemble

(2-4 paragraphes narratifs)
- Définition claire de la norme/standard
- Contexte historique et organisme responsable
- Importance pour la sécurité des produits crypto
- Lien avec le framework SafeScoring

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

OBLIGATOIRE: Utilise des TABLEAUX MARKDOWN pour présenter:

| Paramètre | Valeur |
|-----------|--------|
| ... | ... |

Inclure selon pertinence:
- **Valeurs numériques**: longueurs de clés (128/256 bits), niveaux (EAL1-7), températures (-40°C à +85°C)
- **Algorithmes**: AES-256-GCM, SHA-3-256, ECDSA secp256k1, EdDSA Ed25519
- **Versions**: ISO/IEC 27001:2022, NIST SP 800-53 Rev.5
- **Exigences quantifiables**: MTBF, temps de réponse, cycles d'écriture
- **Niveaux/Classes** avec tableau détaillé si applicable

## 3. Application aux Produits Crypto

Organise par sous-sections avec ###:

### Hardware Wallets
- **Ledger** : [application spécifique]
- **Trezor** : [application spécifique]
- **Coldcard** : [application spécifique]
- **Keystone** : [application spécifique]

### Software Wallets
- **MetaMask** : [application spécifique]
- **Trust Wallet** : [application spécifique]
- **Rabby** : [application spécifique]

### CEX (Exchanges Centralisés)
- **Binance** : [application spécifique]
- **Kraken** : [application spécifique]
- **Coinbase** : [application spécifique]

### DEX / DeFi
- **Uniswap** : [application spécifique]
- **Aave** : [application spécifique]
- **Lido** : [application spécifique]

### Solutions de Backup
- **Cryptosteel** : [application spécifique]
- **Billfodl** : [application spécifique]

(Inclure uniquement les catégories pertinentes pour cette norme)

## 4. Critères d'Évaluation SafeScoring

OBLIGATOIRE: Tableau de scoring:

| Niveau | Description | Points |
|--------|-------------|--------|
| **Conforme complet** | [critères] | 100% |
| **Conforme partiel** | [critères] | 50-80% |
| **Non-conforme** | [critères] | 0-30% |

## 5. Sources et Références

- [Titre du document officiel](URL)
- SafeScoring Criteria {code} v1.0
- Standards connexes: [liste]

---
RÈGLES STRICTES:
- Maximum 10,000 mots
- Utilise ## pour les sections principales (1-5)
- Utilise ### pour les sous-sections
- OBLIGATOIRE: tableaux markdown avec | pour les données structurées
- **Gras** pour les termes clés
- Pas de préambule, commence directement par "## 1. Vue d'ensemble"
"""

    try:
        response = requests.post(
            CLAUDE_API_URL,
            headers={
                'x-api-key': CLAUDE_API_KEY,
                'anthropic-version': '2023-06-01',
                'Content-Type': 'application/json'
            },
            json={
                'model': CLAUDE_MODEL,
                'max_tokens': 16000,  # ~10,000 mots max
                'temperature': 0.2,  # Bas pour factualité
                'messages': [{'role': 'user', 'content': prompt}]
            },
            timeout=180  # Plus de temps pour résumés longs
        )
        
        if response.status_code == 200:
            result = response.json()
            summary = result['content'][0]['text']
            return summary.strip()
        elif response.status_code == 429:
            print(f"      Rate limit - attente 60s...")
            time.sleep(60)
            return None
        else:
            print(f"      Erreur Claude {response.status_code}: {response.text[:200]}")
            return None
            
    except Exception as e:
        print(f"      Exception Claude: {e}")
        return None


def get_norms_to_process(limit=None, code=None, missing_only=True):
    """Récupère les normes à traiter depuis Supabase."""
    url = f"{SUPABASE_URL}/rest/v1/norms"
    params = {
        "select": "id,code,title,description,pillar,target_type,official_link,summary",
        "order": "code"
    }
    
    if code:
        params["code"] = f"eq.{code}"
    
    all_norms = []
    offset = 0
    
    while True:
        resp = requests.get(url, headers=SUPABASE_HEADERS, params={**params, "offset": offset, "limit": 1000})
        if resp.status_code != 200:
            print(f"Erreur: {resp.status_code}")
            break
        batch = resp.json()
        if not batch:
            break
        all_norms.extend(batch)
        offset += 1000
        if len(batch) < 1000:
            break
    
    # Filtrer si missing_only
    if missing_only and not code:
        all_norms = [n for n in all_norms if not n.get('summary') or len(n.get('summary', '')) < 500]
    
    if limit and not code:
        all_norms = all_norms[:limit]
    
    return all_norms


def update_norm_summary(norm_id: int, summary: str, source_type: str) -> bool:
    """Met à jour le résumé dans Supabase."""
    url = f"{SUPABASE_URL}/rest/v1/norms?id=eq.{norm_id}"
    data = {
        "summary": summary,
        "summary_status": "generated",
        "last_summarized_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }
    
    resp = requests.patch(url, headers=SUPABASE_HEADERS, json=data)
    return resp.status_code in [200, 204]


def main():
    parser = argparse.ArgumentParser(description="Régénère les résumés avec Claude + docs locaux")
    parser.add_argument("--limit", type=int, default=10, help="Nombre de normes à traiter")
    parser.add_argument("--code", type=str, help="Code spécifique d'une norme")
    parser.add_argument("--all", action="store_true", help="Traiter toutes les normes sans résumé")
    parser.add_argument("--dry-run", action="store_true", help="Ne pas sauvegarder")
    parser.add_argument("--force", action="store_true", help="Régénérer même si résumé existe")
    args = parser.parse_args()
    
    print("=" * 70)
    print("SAFESCORING - RÉGÉNÉRATION RÉSUMÉS CLAUDE OPUS")
    print("=" * 70)
    print(f"Modèle: {CLAUDE_MODEL}")
    print(f"Sources: Documents locaux (norm_docs/, norm_pdfs/)")
    print(f"Docs disponibles: {len(list(NORM_DOCS_DIR.glob('*')))} fichiers")
    print("=" * 70)
    
    if not CLAUDE_API_KEY:
        print("\n❌ ERREUR: ANTHROPIC_API_KEY non configurée dans .env")
        return
    
    # Récupérer les normes
    limit = None if args.all else args.limit
    norms = get_norms_to_process(limit=limit, code=args.code, missing_only=not args.force)
    
    print(f"\n📋 {len(norms)} normes à traiter")
    
    if not norms:
        print("Aucune norme à traiter.")
        return
    
    success = 0
    failed = 0
    no_doc = 0
    
    for i, norm in enumerate(norms, 1):
        code = norm['code']
        title = norm['title']
        
        print(f"\n[{i}/{len(norms)}] {code} - {title[:50]}")
        
        # 1. Chercher le document local
        content, source_type = get_local_document(code)
        
        if content:
            print(f"   📄 Document trouvé: {source_type} ({len(content)} chars)")
        else:
            print(f"   ⚠️  Pas de document local")
            no_doc += 1
            # On génère quand même un résumé minimal
            content = None
            source_type = "metadata_only"
        
        # 2. Générer le résumé avec Claude
        print(f"   🤖 Génération avec Claude...")
        summary = generate_summary_claude(norm, content, source_type)
        
        if summary and len(summary) > 300:
            word_count = len(summary.split())
            print(f"   ✅ Résumé: {len(summary)} chars (~{word_count} mots)")
            
            if not args.dry_run:
                if update_norm_summary(norm['id'], summary, source_type):
                    success += 1
                    print(f"   💾 Sauvegardé")
                else:
                    failed += 1
                    print(f"   ❌ Erreur sauvegarde")
            else:
                success += 1
                print(f"   [DRY-RUN] Non sauvegardé")
                # Afficher un extrait
                print(f"   📝 Extrait: {summary[:200]}...")
        else:
            failed += 1
            print(f"   ❌ Échec génération")
        
        # Rate limiting
        time.sleep(1)
    
    print("\n" + "=" * 70)
    print("RÉSUMÉ")
    print("=" * 70)
    print(f"✅ Succès: {success}")
    print(f"❌ Échecs: {failed}")
    print(f"⚠️  Sans doc local: {no_doc}")
    print(f"📊 Total traité: {len(norms)}")


if __name__ == "__main__":
    main()
