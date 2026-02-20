#!/usr/bin/env python3
"""
SAFESCORING - ÉVALUATION PAR IA GRATUITE
=========================================
Utilise la pipeline complète avec IAs gratuites:
- Groq (Llama 70B)
- SambaNova (ILLIMITÉ)
- Cerebras (ILLIMITÉ)
- NVIDIA NIM
- Cloudflare

Score simple: YES / (YES + NO) * 100
Pas de pondération.
"""

import os
import sys
import requests
import time
from datetime import datetime
from dotenv import load_dotenv

# Ajouter le chemin src pour les imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv('config/.env')

from src.core.api_provider import AIProvider, parse_evaluation_response
from src.core.config import SUPABASE_URL, get_supabase_headers

# =============================================================================
# PROMPTS POUR L'ÉVALUATION (simplifiés de smart_evaluator.py)
# =============================================================================

SYSTEM_PROMPT = """You are an expert in crypto security and blockchain product evaluation.

RATING SYSTEM:
- YES = Product implements this norm
- YESp = Inherent to technology/protocol
- NO = Product does NOT implement this
- N/A = Not applicable to this product type

RULES:
1. EVIDENCE REQUIRED: No documentation = NO (silence is not evidence)
2. Audited by named firm WITH published report = YES for audit scope only
3. YESp ONLY for protocol-mandatory crypto primitives (secp256k1, SHA-256)
4. Track record is context, not evidence for specific technical features

FORMAT (one line per norm):
CODE: RESULT | Brief justification

Evaluate:"""


def get_headers():
    return get_supabase_headers()


def load_all_products():
    """Charge tous les produits avec leur type."""
    headers = get_headers()
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/products?select=id,name,slug,url,type_id,product_types(code,name)',
        headers=headers
    )
    if r.status_code == 200:
        return r.json()
    return []


def load_all_norms():
    """Charge toutes les normes."""
    headers = get_headers()
    all_norms = []
    offset = 0
    page_size = 1000

    while True:
        r = requests.get(
            f'{SUPABASE_URL}/rest/v1/norms?select=id,code,pillar,title,description&limit={page_size}&offset={offset}',
            headers=headers
        )
        if r.status_code != 200:
            break
        batch = r.json()
        if not batch:
            break
        all_norms.extend(batch)
        if len(batch) < page_size:
            break
        offset += page_size

    return all_norms


def load_applicable_norms(type_id):
    """Charge les normes applicables pour un type de produit."""
    headers = get_headers()
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/norm_applicability?type_id=eq.{type_id}&is_applicable=eq.true&select=norm_id',
        headers=headers
    )
    if r.status_code == 200:
        return {n['norm_id'] for n in r.json()}
    return set()


def calculate_pillar_score(evaluations):
    """
    Calcule le score d'un pilier.
    Formule simple: YES / (YES + NO) * 100
    """
    yes_count = sum(1 for e in evaluations if e['result'] in ['YES', 'YESp'])
    no_count = sum(1 for e in evaluations if e['result'] == 'NO')

    total = yes_count + no_count
    if total == 0:
        return None

    return round((yes_count / total) * 100, 1)


def evaluate_product_with_ai(product, norms, ai_provider):
    """
    Évalue un produit en utilisant les IAs gratuites.

    Pipeline:
    1. Filtre les normes applicables au type de produit
    2. Évalue par pilier (S, A, F, E) avec l'IA
    3. Calcule les scores simples
    """
    product_name = product['name']
    product_type = product.get('product_types', {})
    type_code = product_type.get('code', 'Unknown') if product_type else 'Unknown'
    type_name = product_type.get('name', 'Unknown') if product_type else 'Unknown'
    type_id = product.get('type_id')

    print(f"\n[{product_name}] ({type_code})")

    # Charger les normes applicables
    if type_id:
        applicable_ids = load_applicable_norms(type_id)
        applicable_norms = [n for n in norms if n['id'] in applicable_ids]
    else:
        applicable_norms = norms  # Toutes si pas de type

    print(f"  {len(applicable_norms)} normes applicables")

    if not applicable_norms:
        return None

    all_evaluations = []
    pillar_scores = {}

    # Évaluer par pilier
    for pillar in ['S', 'A', 'F', 'E']:
        pillar_norms = [n for n in applicable_norms if n['pillar'] == pillar]

        if not pillar_norms:
            print(f"  {pillar}: 0 normes")
            continue

        # Construire le prompt pour ce pilier
        norms_text = "\n".join([
            f"- {n['code']}: {n['title']}"
            for n in pillar_norms[:50]  # Limiter pour éviter tokens excessifs
        ])

        prompt = f"""{SYSTEM_PROMPT}

PRODUCT: {product_name}
TYPE: {type_name} ({type_code})
URL: {product.get('url', 'N/A')}

PILLAR: {pillar}
NORMS TO EVALUATE:
{norms_text}

Evaluate each norm with YES, YESp, NO, or N/A:"""

        # Appeler l'IA avec la stratégie par norme
        print(f"  {pillar}: évaluation de {len(pillar_norms)} normes...", end=" ", flush=True)

        try:
            result = ai_provider.call(prompt, max_tokens=2500, temperature=0.2)
        except Exception as e:
            print(f"ERREUR: {e}")
            result = None

        if not result:
            print("SKIP (pas de réponse)")
            continue

        # Parser les résultats
        parsed = parse_evaluation_response(result)

        # Créer les évaluations
        pillar_evals = []
        for norm in pillar_norms:
            code = norm['code']
            if code in parsed:
                eval_result, reason = parsed[code]
            else:
                eval_result, reason = 'TBD', 'Non évalué par IA'

            pillar_evals.append({
                'norm_id': norm['id'],
                'norm_code': code,
                'result': eval_result,
                'reason': reason
            })

        all_evaluations.extend(pillar_evals)

        # Calculer le score du pilier
        score = calculate_pillar_score(pillar_evals)
        pillar_scores[pillar] = score

        yes = sum(1 for e in pillar_evals if e['result'] in ['YES', 'YESp'])
        no = sum(1 for e in pillar_evals if e['result'] == 'NO')
        na = sum(1 for e in pillar_evals if e['result'] == 'N/A')
        tbd = sum(1 for e in pillar_evals if e['result'] == 'TBD')

        print(f"{score:.1f}% (YES:{yes} NO:{no} N/A:{na} TBD:{tbd})")

        time.sleep(0.5)  # Rate limiting

    # Score global
    valid_scores = [s for s in pillar_scores.values() if s is not None]
    global_score = sum(valid_scores) / len(valid_scores) if valid_scores else 0

    print(f"  SAFE Score: {global_score:.1f}%")

    return {
        'product_id': product['id'],
        'evaluations': all_evaluations,
        'pillar_scores': pillar_scores,
        'global_score': global_score
    }


def save_evaluations(product_id, evaluations, headers):
    """Sauvegarde les évaluations dans Supabase."""
    if not evaluations:
        return 0

    # Supprimer les anciennes évaluations
    requests.delete(
        f'{SUPABASE_URL}/rest/v1/evaluations?product_id=eq.{product_id}',
        headers=headers
    )

    # Préparer les nouvelles
    records = []
    for e in evaluations:
        records.append({
            'product_id': product_id,
            'norm_id': e['norm_id'],
            'result': e['result'],
            'why_this_result': e['reason'][:500] if e.get('reason') else None,
            'evaluated_by': 'ai_free_pipeline',
            'confidence_score': 0.8
        })

    # Sauvegarder par batch
    saved = 0
    batch_size = 100
    for i in range(0, len(records), batch_size):
        batch = records[i:i+batch_size]
        r = requests.post(
            f'{SUPABASE_URL}/rest/v1/evaluations',
            headers=headers,
            json=batch
        )
        if r.status_code in [200, 201]:
            saved += len(batch)

    return saved


def main():
    print("=" * 60)
    print("   SAFESCORING - ÉVALUATION PAR IA GRATUITE")
    print("   Pipeline: Groq → SambaNova → Cerebras → NVIDIA")
    print("=" * 60)

    headers = get_headers()

    # Initialiser le provider IA
    print("\nInitialisation des IAs gratuites...")
    ai_provider = AIProvider()

    # Charger les données
    print("Chargement des produits...")
    products = load_all_products()
    print(f"  {len(products)} produits")

    print("Chargement des normes...")
    norms = load_all_norms()
    print(f"  {len(norms)} normes")

    # Évaluer les produits
    results = []
    total_saved = 0

    # Limiter pour test
    products_to_eval = products[:10]  # Modifier pour plus

    for i, product in enumerate(products_to_eval):
        print(f"\n[{i+1}/{len(products_to_eval)}]", end="")

        result = evaluate_product_with_ai(product, norms, ai_provider)

        if result:
            saved = save_evaluations(result['product_id'], result['evaluations'], headers)
            print(f"  Sauvegardé: {saved} évaluations")
            total_saved += saved

            results.append({
                'name': product['name'],
                'score': result['global_score'],
                **result['pillar_scores']
            })

        time.sleep(1)  # Rate limiting entre produits

    # Résumé
    print(f"\n{'=' * 60}")
    print("RÉSUMÉ")
    print("=" * 60)

    if results:
        results.sort(key=lambda x: x['score'], reverse=True)
        for r in results:
            s = r.get('S', 0) or 0
            a = r.get('A', 0) or 0
            f = r.get('F', 0) or 0
            e = r.get('E', 0) or 0
            print(f"  {r['name'][:30]:<30} | SAFE: {r['score']:.1f}% | S:{s:.0f} A:{a:.0f} F:{f:.0f} E:{e:.0f}")

    print(f"\nTotal évaluations sauvegardées: {total_saved}")
    print("=" * 60)


if __name__ == '__main__':
    main()
