#!/usr/bin/env python3
"""
DIAGNOSTIC: Analyse du problème d'applicabilité des normes
==========================================================

Ce script analyse pourquoi il y a trop de N/A pour certains produits.
"""

import sys
import requests
from pathlib import Path
from collections import Counter

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.core.config import SUPABASE_URL, get_supabase_headers


def get_product_info(product_slug: str = "ledger-nano-x"):
    """Récupère les infos d'un produit"""
    headers = get_supabase_headers()

    # Get product
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/products?slug=eq.{product_slug}&select=*",
        headers=headers
    )
    if r.status_code == 200 and r.json():
        return r.json()[0]

    # Try by name
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/products?name=ilike.*ledger*nano*x*&select=*&limit=1",
        headers=headers
    )
    if r.status_code == 200 and r.json():
        return r.json()[0]

    return None


def get_product_types(product_id: int):
    """Récupère les types d'un produit"""
    headers = get_supabase_headers()

    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/product_type_mapping?product_id=eq.{product_id}&select=type_id,is_primary,product_types(id,code,name,description)",
        headers=headers
    )

    if r.status_code == 200:
        return r.json()
    return []


def get_all_types():
    """Récupère tous les types de produits"""
    headers = get_supabase_headers()

    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/product_types?select=*&order=code",
        headers=headers
    )

    if r.status_code == 200:
        return r.json()
    return []


def get_applicability_for_type(type_id: int):
    """Récupère l'applicabilité pour un type"""
    headers = get_supabase_headers()

    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/norm_applicability?type_id=eq.{type_id}&select=norm_id,is_applicable",
        headers=headers
    )

    if r.status_code == 200:
        return r.json()
    return []


def get_all_norms():
    """Récupère toutes les normes"""
    headers = get_supabase_headers()

    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/norms?select=id,code,pillar,title&order=code",
        headers=headers
    )

    if r.status_code == 200:
        return r.json()
    return []


def get_evaluations(product_id: int):
    """Récupère les évaluations d'un produit"""
    headers = get_supabase_headers()

    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/evaluations?product_id=eq.{product_id}&select=norm_id,result",
        headers=headers
    )

    if r.status_code == 200:
        return r.json()
    return []


def analyze_applicability_distribution():
    """Analyse la distribution de l'applicabilité par type"""
    headers = get_supabase_headers()

    types = get_all_types()
    norms = get_all_norms()

    print(f"\n{'='*70}")
    print("ANALYSE DE L'APPLICABILITÉ PAR TYPE")
    print(f"{'='*70}")
    print(f"\nTotal normes: {len(norms)}")
    print(f"Total types: {len(types)}")

    print(f"\n{'Type':<25} {'Applicable':<12} {'Non-Appl.':<12} {'Ratio %':<10}")
    print("-" * 60)

    for t in types:
        applicability = get_applicability_for_type(t['id'])
        applicable = sum(1 for a in applicability if a['is_applicable'])
        non_applicable = sum(1 for a in applicability if not a['is_applicable'])

        ratio = (applicable / len(norms) * 100) if len(norms) > 0 else 0

        # Highlight problematic ratios
        flag = "⚠️" if ratio < 30 else "✓"

        print(f"{t['code']:<25} {applicable:<12} {non_applicable:<12} {ratio:>6.1f}% {flag}")


def diagnose_product(product_slug: str = "ledger-nano-x"):
    """Diagnostic complet pour un produit"""
    print(f"\n{'='*70}")
    print(f"DIAGNOSTIC: {product_slug}")
    print(f"{'='*70}")

    # 1. Get product
    product = get_product_info(product_slug)
    if not product:
        print(f"❌ Produit '{product_slug}' non trouvé!")
        return

    print(f"\n📦 Produit: {product['name']} (ID: {product['id']})")
    print(f"   Website: {product.get('website', 'N/A')}")

    # 2. Get types
    types = get_product_types(product['id'])
    print(f"\n🏷️  Types assignés: {len(types)}")

    if not types:
        print("   ❌ AUCUN TYPE ASSIGNÉ - C'est probablement le problème!")
        return

    for t in types:
        type_info = t.get('product_types', {}) or {}
        desc = type_info.get('description') or 'N/A'
        print(f"   - {type_info.get('code', '?')} ({type_info.get('name', '?')})")
        print(f"     Description: {desc[:100] if desc else 'N/A'}...")

    # 3. Get applicability for each type
    print(f"\n📋 Applicabilité par type:")

    all_applicable_norms = set()
    norms = get_all_norms()
    norms_by_id = {n['id']: n for n in norms}

    for t in types:
        type_id = t['type_id']
        type_code = t.get('product_types', {}).get('code', '?')

        applicability = get_applicability_for_type(type_id)
        applicable = [a['norm_id'] for a in applicability if a['is_applicable']]
        non_applicable = [a['norm_id'] for a in applicability if not a['is_applicable']]

        all_applicable_norms.update(applicable)

        print(f"\n   Type: {type_code}")
        print(f"   - Applicables: {len(applicable)} / {len(norms)}")
        print(f"   - Non-applicables: {len(non_applicable)}")
        print(f"   - Ratio: {len(applicable)/len(norms)*100:.1f}%")

        # Show some non-applicable norms
        if non_applicable:
            print(f"\n   Exemples de normes marquées NON-APPLICABLE:")
            for nid in non_applicable[:10]:
                norm = norms_by_id.get(nid, {})
                print(f"      - {norm.get('code', '?')}: {norm.get('title', '?')[:50]}")

    # 4. Analyze evaluations
    print(f"\n📊 Analyse des évaluations:")
    evaluations = get_evaluations(product['id'])

    if not evaluations:
        print("   ❌ Aucune évaluation trouvée!")
        return

    # Count by result
    counter = Counter(e['result'] for e in evaluations)

    print(f"   Total évaluations: {len(evaluations)}")
    print(f"   - YES:  {counter.get('YES', 0)} + YESp: {counter.get('YESp', 0)}")
    print(f"   - NO:   {counter.get('NO', 0)}")
    print(f"   - N/A:  {counter.get('N/A', 0)}")
    print(f"   - TBD:  {counter.get('TBD', 0)}")

    # Analyze N/A distribution by pillar
    print(f"\n   Distribution N/A par pilier:")
    na_evals = [e for e in evaluations if e['result'] == 'N/A']

    pillar_counter = Counter()
    for e in na_evals:
        norm = norms_by_id.get(e['norm_id'], {})
        pillar_counter[norm.get('pillar', '?')] += 1

    for pillar in ['S', 'A', 'F', 'E']:
        count = pillar_counter.get(pillar, 0)
        total_pillar = sum(1 for n in norms if n['pillar'] == pillar)
        print(f"      {pillar}: {count} N/A / {total_pillar} total ({count/total_pillar*100:.0f}%)")

    # 5. Union check
    print(f"\n🔍 Vérification union des types:")
    print(f"   Normes applicables (union): {len(all_applicable_norms)} / {len(norms)}")
    print(f"   Normes non-applicables: {len(norms) - len(all_applicable_norms)}")

    expected_na = len(norms) - len(all_applicable_norms)
    actual_na = counter.get('N/A', 0)

    if actual_na != expected_na:
        print(f"\n   ⚠️  INCOHÉRENCE DÉTECTÉE:")
        print(f"      N/A attendus (basé sur applicabilité): {expected_na}")
        print(f"      N/A réels (dans évaluations): {actual_na}")
        print(f"      Différence: {actual_na - expected_na}")

    # 6. Recommendations
    print(f"\n{'='*70}")
    print("RECOMMANDATIONS")
    print(f"{'='*70}")

    na_ratio = counter.get('N/A', 0) / len(norms) * 100

    if na_ratio > 70:
        print(f"""
⚠️  RATIO N/A TROP ÉLEVÉ ({na_ratio:.0f}%)

Causes possibles:
1. L'applicabilité a été générée de façon trop restrictive
2. Le type du produit est trop spécifique
3. Les définitions de types manquent de détails

Actions recommandées:
1. Régénérer l'applicabilité avec un prompt plus permissif
2. Vérifier que le produit a les bons types
3. Ajouter des types supplémentaires si pertinent
4. Revoir les définitions des types dans product_types
""")

    if len(types) == 1:
        print("""
💡 Ce produit n'a qu'UN SEUL TYPE assigné.
   Considérez ajouter des types supplémentaires pour augmenter
   le nombre de normes applicables.

   Exemple pour Ledger Nano X:
   - HW Cold (principal)
   - AC Phys (si Duress PIN disponible)
   - Bkp Physical (si support Shamir/SLIP39)
""")


def suggest_missing_applicability():
    """Suggère des normes qui devraient être applicables pour HW Cold"""

    print(f"\n{'='*70}")
    print("NORMES QUI DEVRAIENT ÊTRE APPLICABLES POUR HW COLD")
    print(f"{'='*70}")

    # Keywords that indicate HW wallet relevance
    hw_keywords = [
        'hardware', 'physical', 'device', 'screen', 'button', 'pin',
        'seed', 'backup', 'recovery', 'firmware', 'secure element',
        'usb', 'bluetooth', 'nfc', 'battery', 'tamper', 'key storage',
        'signature', 'transaction', 'address', 'verification',
        'wallet', 'crypto', 'bitcoin', 'ethereum', 'multi-chain'
    ]

    norms = get_all_norms()

    print(f"\nNormes contenant des mots-clés HW wallet (devraient être APPLICABLES):\n")

    found = []
    for n in norms:
        title = n.get('title', '').lower()
        for kw in hw_keywords:
            if kw in title:
                found.append((n['code'], n['title'], kw))
                break

    for code, title, keyword in found[:30]:
        print(f"   {code}: {title[:60]}... (mot-clé: {keyword})")

    print(f"\n   Total: {len(found)} normes potentiellement applicables")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description='Diagnostic applicabilité')
    parser.add_argument('--product', type=str, default='ledger-nano-x',
                        help='Slug du produit à analyser')
    parser.add_argument('--distribution', action='store_true',
                        help='Afficher la distribution par type')
    parser.add_argument('--suggest', action='store_true',
                        help='Suggérer des normes manquantes')

    args = parser.parse_args()

    if args.distribution:
        analyze_applicability_distribution()
    elif args.suggest:
        suggest_missing_applicability()
    else:
        diagnose_product(args.product)
        analyze_applicability_distribution()
