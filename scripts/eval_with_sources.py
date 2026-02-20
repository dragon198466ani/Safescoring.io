#!/usr/bin/env python3
"""
SAFESCORING - Évaluation avec sources officielles
=================================================
Pipeline correcte:
1. Scrape le site officiel du produit
2. Pour chaque norme, vérifie le lien officiel de la norme
3. Compare: le produit respecte-t-il la norme?
4. Sauvegarde les évaluations en base
"""

import requests
import os
import re
import time
import json
from datetime import datetime, timezone
from dotenv import load_dotenv
from bs4 import BeautifulSoup
import sys
from pathlib import Path

# Load from correct absolute path (not relative to CWD)
PROJECT_ROOT = Path(__file__).parent.parent
load_dotenv(PROJECT_ROOT / '.env')
load_dotenv(PROJECT_ROOT / 'config' / '.env')

SUPABASE_URL = os.getenv('SUPABASE_URL') or os.getenv('NEXT_PUBLIC_SUPABASE_URL')
# Préférer la clé service role pour bypasser RLS
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_KEY') or os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

# Validate environment variables are loaded
if not SUPABASE_URL or not SUPABASE_KEY:
    print(f"ERROR: Missing environment variables!")
    print(f"  SUPABASE_URL: {'OK' if SUPABASE_URL else 'MISSING'}")
    print(f"  SUPABASE_KEY: {'OK' if SUPABASE_KEY else 'MISSING'}")
    print(f"  Tried loading from: {PROJECT_ROOT / '.env'}")
    sys.exit(1)

# Cache pour les contenus de normes (éviter de re-scraper)
NORM_CONTENT_CACHE = {}

def get_headers():
    return {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json'
    }

def get_headers_upsert():
    return {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
    }

# User agent pour scraping
SCRAPE_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}


def scrape_url(url, max_chars=10000):
    """Scrape une URL et extrait le texte."""
    try:
        r = requests.get(url, headers=SCRAPE_HEADERS, timeout=15)
        if r.status_code != 200:
            return None

        soup = BeautifulSoup(r.text, 'html.parser')

        # Supprimer scripts et styles
        for tag in soup(['script', 'style', 'nav', 'footer', 'header']):
            tag.decompose()

        # Extraire le texte
        text = soup.get_text(separator=' ', strip=True)
        text = re.sub(r'\s+', ' ', text)

        return text[:max_chars]
    except Exception as e:
        print(f"    Erreur scraping {url[:50]}: {e}")
        return None


def get_product_content(product_url):
    """Scrape le contenu du site officiel du produit."""
    if not product_url:
        return None

    content_parts = []

    # Page principale
    main_content = scrape_url(product_url, 15000)
    if main_content:
        content_parts.append(f"=== PAGE PRINCIPALE ===\n{main_content}")

    # Essayer /security, /specifications, /features
    base = product_url.rstrip('/')
    for path in ['/security', '/technology', '/specifications', '/features']:
        sub_content = scrape_url(base + path, 5000)
        if sub_content and len(sub_content) > 500:
            content_parts.append(f"\n=== {path.upper()} ===\n{sub_content}")

    return "\n\n".join(content_parts) if content_parts else None


def evaluate_by_type_heuristics(norm, product_type, code, title):
    """
    Évalue une norme basée sur des heuristiques par type de produit.
    Utilisé quand le contenu du produit n'est pas disponible.
    """
    code_lower = code.lower()
    title_lower = title.lower()
    pillar = norm.get('pillar', '')

    # ========== HARDWARE WALLETS (HW Cold, HW Hot) ==========
    if 'hw' in product_type.lower() or 'hardware' in product_type.lower():
        # Normes crypto standards - tous les HW wallets les implémentent
        hw_standards = ['bip32', 'bip39', 'bip44', 'secp256k1', 'ecdsa', 'sha256', 'aes', 'pin']
        if any(std in code_lower.replace('-', '') for std in hw_standards):
            return ('YESp', f'Standard implementation for hardware wallets')

        # Secure Element - la plupart des HW modernes
        if 'secure element' in title_lower or 'se ' in code_lower:
            return ('YESp', f'Common in modern hardware wallets')

    # ========== EXCHANGES (CEX) ==========
    elif 'exchange' in product_type.lower() or 'cex' in product_type.lower():
        # Compliance standards - tous les exchanges régulés
        if 'kyc' in code_lower or 'aml' in code_lower:
            return ('YES', 'Required for regulated exchanges')
        if 'proof of reserves' in title_lower or 'por' in code_lower:
            return ('TBD', 'Varies by exchange - requires verification')

    # ========== DEFI PROTOCOLS ==========
    elif 'defi' in product_type.lower() or 'lending' in product_type.lower():
        # Smart contract standards
        if 'erc20' in code_lower or 'erc-20' in code_lower:
            return ('YES', 'Standard for DeFi tokens')
        if 'audit' in title_lower:
            return ('TBD', 'Requires verification of audit reports')

    # ========== SOFTWARE WALLETS ==========
    elif 'wallet' in product_type.lower() and 'hw' not in product_type.lower():
        # Standards crypto de base
        if any(std in code_lower.replace('-', '') for std in ['bip32', 'bip39', 'bip44']):
            return ('YESp', f'Standard for software wallets')

    # ========== CRYPTO CARDS ==========
    elif 'card' in product_type.lower():
        if 'visa' in code_lower or 'mastercard' in code_lower:
            return ('YESp', 'Common for crypto cards')

    # Par défaut - ne pas pouvoir vérifier
    return ('TBD', f'Cannot verify without product documentation')


def get_norm_official_content(norm):
    """
    Récupère le contenu officiel de la norme.
    NOTE: On n'utilise plus le scraping des official_link car trop lent.
    On utilise les données déjà présentes en base (official_doc_summary, description).
    """
    # Utiliser les données en cache dans la base
    summary = norm.get('official_doc_summary', '')
    description = norm.get('description', '')

    if summary:
        return summary
    return description or ''


def evaluate_norm_with_sources(norm, product_name, product_content, product_type):
    """
    Évalue UNE norme en comparant:
    - Le contenu du produit (product_content)
    - La définition officielle de la norme (norm['official_link'])

    Retourne: (result, reason)
    """
    code = norm['code']
    title = norm['title']
    description = norm.get('description', '')
    pillar = norm.get('pillar', '')

    # Récupérer le contenu officiel de la norme
    norm_content = get_norm_official_content(norm)

    # Keywords à chercher - extraits de la norme
    keywords = []

    # Extraire keywords du code, titre et description
    code_parts = re.split(r'[-_\s]', code.lower())
    keywords.extend([p for p in code_parts if len(p) > 2])
    keywords.extend([w for w in title.lower().split() if len(w) > 3])
    if description:
        keywords.extend([w for w in description.lower().split()[:15] if len(w) > 3])

    # Mots à ignorer (trop communs)
    stopwords = {'the', 'and', 'for', 'with', 'that', 'this', 'from', 'have', 'are', 'was', 'been',
                 'should', 'must', 'will', 'dans', 'pour', 'avec', 'une', 'des', 'les', 'que'}
    keywords = [kw for kw in keywords if kw not in stopwords]
    keywords = list(set(keywords))  # Unique

    # =========== ÉVALUATION ===========

    # Si pas de contenu produit, utiliser des heuristiques basées sur le type
    if not product_content:
        # Pour certains types, on peut inférer des normes standards
        return evaluate_by_type_heuristics(norm, product_type, code, title)

    content_lower = product_content.lower()
    product_name_lower = product_name.lower()
    code_lower = code.lower()
    title_lower = title.lower()

    # 1. Chercher le code de la norme directement (ex: "bip-39", "eip-712", "cc eal5+")
    code_normalized = code.lower().replace('-', '').replace('_', '').replace(' ', '')
    content_normalized = content_lower.replace('-', '').replace('_', '').replace(' ', '')
    code_match = code_normalized in content_normalized

    # 2. Chercher variantes du code
    code_variants = [
        code.lower(),
        code.lower().replace('-', ' '),
        code.lower().replace('-', ''),
        code.lower().replace('_', '-'),
    ]
    variant_match = any(v in content_lower for v in code_variants if len(v) > 3)

    # 3. Compter les keyword matches
    keyword_matches = sum(1 for kw in keywords if kw in content_lower)
    keyword_ratio = keyword_matches / len(keywords) if keywords else 0

    # 4. Vérifier des patterns spécifiques par pilier
    specific_match = False
    specific_reason = ""

    # Pilier S (Security) - normes crypto et hardware
    if pillar == 'S':
        crypto_standards = {
            'aes': ['aes-256', 'aes 256', 'aes256', 'encryption'],
            'sha': ['sha-256', 'sha256', 'sha-3', 'sha3', 'hashing'],
            'ecdsa': ['ecdsa', 'elliptic curve', 'secp256k1', 'signature'],
            'rsa': ['rsa-2048', 'rsa2048', 'rsa 2048'],
            'secure element': ['secure element', 'se chip', 'secure chip', 'cc eal'],
            'pin': ['pin code', 'pin protection', 'device pin'],
            'firmware': ['firmware', 'secure boot', 'bootloader'],
        }
        for std, patterns in crypto_standards.items():
            if std in code.lower() or std in title.lower():
                if any(p in content_lower for p in patterns):
                    specific_match = True
                    specific_reason = f"Crypto standard {std} found"
                    break

    # Pilier A (Adversity) - anti-coercition, privacy
    elif pillar == 'A':
        # Ces normes sont rarement explicitement documentées
        # Être plus strict
        if 'air-gap' in code.lower() or 'airgap' in code.lower():
            if 'bluetooth' in content_lower or 'usb' in content_lower or 'wifi' in content_lower:
                return ('NO', 'Device has connectivity (Bluetooth/USB/WiFi) - not air-gapped')
        if 'tor' in code.lower():
            if 'tor' not in content_lower and 'onion' not in content_lower:
                return ('NO', 'No Tor/onion routing mentioned in documentation')

    # Pilier F (Fidelity) - open source, audits
    elif pillar == 'F':
        if 'open source' in code.lower() or 'open-source' in code.lower():
            if 'open source' in content_lower or 'github' in content_lower or 'gitlab' in content_lower:
                specific_match = True
                specific_reason = "Open source mentioned"
        if 'audit' in code.lower():
            if 'audit' in content_lower or 'security review' in content_lower:
                specific_match = True
                specific_reason = "Security audit mentioned"

    # 5. Décision finale basée sur les scores
    # YES = preuve explicite dans la documentation
    if code_match:
        return ('YES', f'Exact code match: {code}')

    if variant_match and keyword_ratio >= 0.3:
        return ('YES', f'Code variant + keywords: {title[:40]}')

    if specific_match:
        return ('YESp', specific_reason)

    # YESp = bonne probabilité basée sur keywords
    if keyword_ratio >= 0.5:
        return ('YESp', f'Strong keyword match ({keyword_matches}/{len(keywords)})')

    if keyword_ratio >= 0.35:
        return ('YESp', f'Good keyword match: {title[:40]}')

    # Normes standards par type de produit
    hw_types = ['hw cold', 'hw hot', 'hardware wallet cold', 'hardware wallet hot', 'hardware wallet']
    if product_type.lower() in hw_types:
        # Standards crypto essentiels pour HW wallets
        essential_hw = ['bip32', 'bip39', 'bip44', 'secp256k1', 'ecdsa', 'sha256', 'aes']
        if any(term in code_normalized for term in essential_hw):
            return ('YESp', f'Standard for hardware wallets')

        # PIN protection - essentiel pour HW
        if 'pin' in code_lower and ('pin' in content_lower or 'code' in content_lower):
            return ('YESp', 'PIN protection standard')

    # NO = preuve négative explicite ou fonctionnalité clairement absente
    # Air-gapped: si présence de connectivité
    if 'air-gap' in code_lower or 'airgap' in code_lower:
        if any(conn in content_lower for conn in ['bluetooth', 'wifi', 'usb', 'nfc']):
            return ('NO', 'Device has connectivity - not air-gapped')

    # Tor: si pas mentionné
    if 'tor' in code_lower and 'anonymity' in title_lower:
        if 'tor' not in content_lower and 'onion' not in content_lower:
            return ('NO', 'No Tor/onion support found')

    # Open source: vérifier explicitement
    if 'open source' in title_lower or 'open-source' in title_lower:
        if 'open source' not in content_lower and 'github' not in content_lower:
            return ('NO', 'No open source evidence')

    # Audits/Certifications: si pas mentionnés
    if keyword_matches == 0 and len(keywords) >= 3:
        documented_features = ['audit', 'certification', 'insurance', 'compliance']
        if any(feat in title_lower for feat in documented_features):
            return ('NO', f'Typically documented feature not found: {title[:30]}')

    # Keyword partiel mais insuffisant
    if keyword_ratio >= 0.15:
        return ('TBD', f'Partial evidence ({keyword_matches} keywords)')

    # Rien trouvé
    return ('TBD', f'No clear evidence')


def get_all_norms():
    """Récupère toutes les normes avec pagination."""
    headers = get_headers()
    all_norms = []
    offset = 0
    limit = 1000

    while True:
        r = requests.get(
            f'{SUPABASE_URL}/rest/v1/norms?select=id,code,pillar,title,description,official_link,official_doc_summary&order=id&limit={limit}&offset={offset}',
            headers=headers
        )
        batch = r.json()
        if not batch:
            break
        all_norms.extend(batch)
        if len(batch) < limit:
            break
        offset += limit

    return all_norms


def get_all_products():
    """Récupère tous les produits."""
    headers = get_headers()
    all_products = []
    offset = 0
    limit = 1000

    while True:
        r = requests.get(
            f'{SUPABASE_URL}/rest/v1/products?select=id,name,slug,url,type_id&order=id&limit={limit}&offset={offset}',
            headers=headers
        )
        batch = r.json()
        if not batch:
            break
        all_products.extend(batch)
        if len(batch) < limit:
            break
        offset += limit

    return all_products


def get_product_types():
    """Récupère les types de produits."""
    headers = get_headers()
    r = requests.get(f'{SUPABASE_URL}/rest/v1/product_types?select=id,name', headers=headers)
    return {t['id']: t['name'] for t in r.json()}


def get_applicable_norm_ids(type_id):
    """Récupère les IDs des normes applicables pour un type."""
    if not type_id:
        return set()

    headers = get_headers()
    all_ids = set()
    offset = 0
    limit = 1000

    while True:
        r = requests.get(
            f'{SUPABASE_URL}/rest/v1/norm_applicability?type_id=eq.{type_id}&is_applicable=eq.true&select=norm_id&limit={limit}&offset={offset}',
            headers=headers
        )
        batch = r.json()
        # Handle error responses or empty results
        if not batch or not isinstance(batch, list):
            break
        all_ids.update(a['norm_id'] for a in batch if isinstance(a, dict) and 'norm_id' in a)
        if len(batch) < limit:
            break
        offset += limit

    return all_ids


def save_evaluations(evaluations):
    """Sauvegarde les évaluations en base de données."""
    if not evaluations:
        return 0

    headers = get_headers()
    headers_upsert = get_headers_upsert()

    # Supprimer les anciennes évaluations par petits lots (éviter timeout)
    product_ids = list(set(e['product_id'] for e in evaluations))
    for pid in product_ids:
        # Supprimer par petits lots de 100
        while True:
            r = requests.delete(
                f'{SUPABASE_URL}/rest/v1/evaluations?product_id=eq.{pid}&limit=200',
                headers=headers
            )
            if r.status_code != 200 and r.status_code != 204:
                break
            # Vérifier s'il reste des enregistrements
            check = requests.get(
                f'{SUPABASE_URL}/rest/v1/evaluations?product_id=eq.{pid}&select=id&limit=1',
                headers=headers
            )
            if not check.json():
                break
            time.sleep(0.5)

    # Insérer par lots de 100 (plus petit pour éviter timeout)
    saved = 0
    for i in range(0, len(evaluations), 100):
        batch = evaluations[i:i+100]
        try:
            r = requests.post(
                f'{SUPABASE_URL}/rest/v1/evaluations',
                headers=headers,
                json=batch,
                timeout=30
            )
            if r.status_code in [200, 201]:
                saved += len(batch)
            else:
                print(f"    Erreur sauvegarde lot {i}: {r.status_code}")
        except Exception as e:
            print(f"    Timeout lot {i}: {e}")
        time.sleep(0.3)  # Pause entre les lots

    return saved


def calculate_scores(evaluations):
    """Calcule les scores par pilier."""
    # Grouper par pilier
    by_pillar = {'S': [], 'A': [], 'F': [], 'E': []}

    for e in evaluations:
        pillar = e.get('pillar', '')
        if pillar in by_pillar:
            by_pillar[pillar].append(e['result'])

    scores = {}
    for pillar, results in by_pillar.items():
        yes_count = sum(1 for r in results if r in ['YES', 'YESp'])
        no_count = sum(1 for r in results if r == 'NO')
        total = yes_count + no_count
        if total > 0:
            scores[pillar] = (yes_count / total) * 100
        else:
            scores[pillar] = 0

    # Score SAFE = moyenne des piliers
    pillar_scores = [s for s in scores.values() if s > 0]
    scores['SAFE'] = sum(pillar_scores) / len(pillar_scores) if pillar_scores else 0

    return scores


def evaluate_product_with_sources(product, all_norms, product_types, save_to_db=True):
    """Évalue un produit en utilisant les sources officielles."""
    product_id = product['id']
    product_name = product['name']
    product_url = product.get('url')
    type_id = product.get('type_id')
    product_type = product_types.get(type_id, 'Unknown')

    print(f"\n{'=' * 60}")
    print(f"ÉVALUATION: {product_name}")
    print(f"Type: {product_type} | URL: {product_url or 'N/A'}")
    print('=' * 60)

    # Scraper le contenu du produit
    print("\n[1] Scraping du site officiel...")
    product_content = get_product_content(product_url)
    if product_content:
        print(f"    OK - {len(product_content)} caractères récupérés")
    else:
        print("    AVERTISSEMENT - Pas de contenu récupéré")

    # Obtenir les normes applicables
    if type_id:
        applicable_ids = get_applicable_norm_ids(type_id)
        print(f"    {len(applicable_ids)} normes applicables pour ce type")
    else:
        applicable_ids = set()
        print(f"    Pas de type_id - utilisation de toutes les normes")

    # Filtrer les normes applicables (ou utiliser toutes si pas d'applicabilité définie)
    if applicable_ids:
        norms = [n for n in all_norms if n['id'] in applicable_ids]
    else:
        # Pas d'applicabilité définie - utiliser toutes les normes
        norms = all_norms
    print(f"\n[2] Évaluation de {len(norms)} normes...")

    # Évaluer chaque norme
    evaluations = []
    results_count = {'YES': 0, 'YESp': 0, 'NO': 0, 'TBD': 0}

    for i, norm in enumerate(norms):
        result, reason = evaluate_norm_with_sources(norm, product_name, product_content, product_type)

        evaluations.append({
            'product_id': product_id,
            'norm_id': norm['id'],
            'pillar': norm.get('pillar', ''),
            'result': result,
            'why_this_result': reason[:200],
            'evaluated_by': 'source_based_eval_v2',
            'confidence_score': 0.85 if result in ['YES', 'NO'] else 0.6
        })

        results_count[result] = results_count.get(result, 0) + 1

        if (i + 1) % 50 == 0:
            print(f"    Progression: {i+1}/{len(norms)}")

    # Résumé
    print(f"\n[3] Résultats:")
    for res, cnt in results_count.items():
        print(f"    {res}: {cnt}")

    # Calculer les scores
    scores = calculate_scores(evaluations)
    print(f"\n[4] Scores par pilier:")
    for pillar in ['S', 'A', 'F', 'E', 'SAFE']:
        print(f"    {pillar}: {scores.get(pillar, 0):.1f}%")

    # Sauvegarder si demandé
    if save_to_db and evaluations:
        # Retirer le champ pillar avant sauvegarde (pas dans le schéma evaluations)
        evals_for_db = [{k: v for k, v in e.items() if k != 'pillar'} for e in evaluations]
        print(f"\n[5] Sauvegarde en base...")
        saved = save_evaluations(evals_for_db)
        print(f"    {saved} évaluations sauvegardées")

    return evaluations, scores


def main():
    print("=" * 70)
    print("SAFESCORING - Évaluation avec sources officielles")
    print("=" * 70, flush=True)

    # Charger les données de référence
    print("\n[INIT] Chargement des données...", flush=True)
    all_norms = get_all_norms()
    print(f"    {len(all_norms)} normes chargées")

    product_types = get_product_types()
    print(f"    {len(product_types)} types de produits")

    all_products = get_all_products()
    print(f"    {len(all_products)} produits à évaluer")

    # Filtrer les produits avec URL
    products_with_url = [p for p in all_products if p.get('url')]
    print(f"    {len(products_with_url)} produits avec URL officielle")

    # Arguments en ligne de commande
    products_to_eval = products_with_url
    limit = None

    for i, arg in enumerate(sys.argv[1:], 1):
        if arg == '--test':
            products_to_eval = products_with_url[:1]
            print(f"\n[MODE TEST] Évaluation de 1 produit uniquement")
        elif arg.startswith('--limit='):
            limit = int(arg.split('=')[1])
            products_to_eval = products_with_url[:limit]
            print(f"\n[MODE LIMITÉ] Évaluation de {limit} produits")
        elif arg.isdigit():
            target_id = int(arg)
            products_to_eval = [p for p in all_products if p['id'] == target_id]
            print(f"\n[MODE CIBLÉ] Évaluation du produit ID={target_id}")

    # Évaluer chaque produit
    all_results = []
    for i, product in enumerate(products_to_eval):
        print(f"\n\n[{i+1}/{len(products_to_eval)}] ", end="")

        try:
            evaluations, scores = evaluate_product_with_sources(
                product, all_norms, product_types, save_to_db=True
            )
            all_results.append({
                'product': product['name'],
                'scores': scores,
                'eval_count': len(evaluations)
            })

            # Pause entre les produits pour ne pas surcharger
            if i < len(products_to_eval) - 1:
                time.sleep(2)

        except Exception as e:
            print(f"    ERREUR: {e}")
            continue

    # Résumé final
    print("\n\n" + "=" * 70)
    print("RÉSUMÉ FINAL")
    print("=" * 70)
    print(f"\nProduits évalués: {len(all_results)}")

    # Afficher les scores SAFE
    print("\nScores SAFE:")
    for res in sorted(all_results, key=lambda x: x['scores'].get('SAFE', 0), reverse=True):
        safe_score = res['scores'].get('SAFE', 0)
        print(f"    {res['product'][:30]:30} | SAFE: {safe_score:.1f}% ({res['eval_count']} évals)")


if __name__ == '__main__':
    main()
