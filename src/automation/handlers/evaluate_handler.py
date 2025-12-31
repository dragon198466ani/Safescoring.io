"""
Evaluate Handlers
=================
Gère l'évaluation des produits contre les normes.
"""

import json
import time
from datetime import datetime


def get_ai_client():
    """Récupère ou crée le client IA."""
    from handlers.scrape_handler import get_ai_client as _get_ai
    return _get_ai()


def handle_evaluate_product(supabase, task: dict, add_task) -> dict:
    """
    Évalue un produit contre toutes ses normes applicables.

    Flow:
    1. Récupère produit + specs
    2. Récupère normes applicables au type
    3. Évalue par batch avec IA
    4. Sauvegarde évaluations
    5. Déclenche calcul du score
    """
    product_id = task['target_id']

    # Récupérer produit
    product = supabase.table('products').select('name, type_id, specs') \
        .eq('id', product_id).single().execute()

    if not product.data:
        return {'error': 'Product not found'}

    if not product.data.get('type_id'):
        return {'error': 'Product has no type assigned'}

    specs = product.data.get('specs', {})
    if not specs:
        return {'error': 'Product has no specs', 'suggestion': 'Run scrape_product first'}

    # Récupérer normes applicables
    norms_result = supabase.table('norm_applicability').select(
        'norms(id, code, description, official_content, pillar)'
    ).eq('product_type_id', product.data['type_id']).eq('is_applicable', True).execute()

    norms = [n['norms'] for n in norms_result.data if n.get('norms')]

    if not norms:
        # Fallback: toutes les normes
        norms_result = supabase.table('norms').select('id, code, description, official_content, pillar').execute()
        norms = norms_result.data[:100]  # Limiter

    print(f"  Evaluating {len(norms)} norms for {product.data['name']}...")

    # Préparer normes avec contexte officiel
    norms_with_context = []
    for norm in norms:
        context = norm.get('official_content') or norm['description']
        norms_with_context.append({
            'id': norm['id'],
            'code': norm['code'],
            'description': norm['description'],
            'context': context[:1500]  # Limiter tokens
        })

    # Évaluer par batch
    ai = get_ai_client()
    all_evaluations = {}
    batch_size = 20

    for i in range(0, len(norms_with_context), batch_size):
        batch = norms_with_context[i:i + batch_size]

        # Construire prompt
        norms_text = ""
        for n in batch:
            norms_text += f"\n### {n['code']}: {n['description']}\n"
            if n['context'] != n['description']:
                norms_text += f"Critères: {n['context'][:500]}\n"

        prompt = f"""Expert sécurité crypto - Méthodologie SAFE Scoring.

## PRODUIT - SPÉCIFICATIONS:
{json.dumps(specs, indent=2, ensure_ascii=False)}

## NORMES À ÉVALUER:
{norms_text}

## INSTRUCTIONS:
Pour chaque norme, évalue si le produit la respecte:
- "YES" = Le produit respecte clairement cette norme
- "NO" = Le produit ne respecte pas cette norme
- "N/A" = Cette norme n'est pas applicable à ce produit

En cas de doute, réponds "NO".

Réponds UNIQUEMENT en JSON: {{"CODE1": "YES", "CODE2": "NO", ...}}"""

        try:
            result = ai.evaluate_norms(specs, [{'code': n['code'], 'description': n['description']} for n in batch])
            all_evaluations.update(result)
            print(f"    Batch {i // batch_size + 1}: {len(result)} evaluated")
        except Exception as e:
            print(f"    Batch error: {e}")

        time.sleep(1)  # Rate limiting

    if not all_evaluations:
        return {'error': 'No evaluations generated'}

    # Sauvegarder évaluations
    count = save_evaluations(supabase, product_id, norms, all_evaluations)

    # Déclencher calcul du score
    add_task('calculate_score', product_id, 'product', priority=2)

    return {'evaluated': count, 'total_norms': len(norms)}


def handle_evaluate_norm_all(supabase, task: dict, add_task) -> dict:
    """
    Évalue une nouvelle norme pour tous les produits concernés.

    Flow:
    1. Récupère la norme
    2. Trouve les types où elle s'applique
    3. Ajoute tâche d'évaluation pour chaque produit
    """
    norm_id = task['target_id']

    # Récupérer la norme
    norm = supabase.table('norms').select('code, description').eq('id', norm_id).single().execute()

    if not norm.data:
        return {'error': 'Norm not found'}

    # Trouver les types applicables
    applicability = supabase.table('norm_applicability').select('product_type_id') \
        .eq('norm_id', norm_id).eq('is_applicable', True).execute()

    type_ids = list(set([a['product_type_id'] for a in applicability.data]))

    if not type_ids:
        # Si pas d'applicabilité définie, évaluer tous les produits
        products = supabase.table('products').select('id').eq('is_active', True).execute()
    else:
        products = supabase.table('products').select('id') \
            .in_('type_id', type_ids).eq('is_active', True).execute()

    # Ajouter tâche pour chaque produit
    for product in products.data:
        add_task(
            'evaluate_single_norm',
            product['id'],
            'product',
            priority=5,
            payload={'norm_id': norm_id}
        )

    return {
        'norm_code': norm.data['code'],
        'products_queued': len(products.data),
        'types_affected': len(type_ids)
    }


def handle_evaluate_single_norm(supabase, task: dict, add_task) -> dict:
    """
    Évalue une seule norme pour un produit.
    Utilisé quand une nouvelle norme est ajoutée.
    """
    product_id = task['target_id']
    norm_id = task['payload'].get('norm_id')

    if not norm_id:
        return {'error': 'norm_id missing in payload'}

    # Récupérer produit
    product = supabase.table('products').select('name, specs') \
        .eq('id', product_id).single().execute()

    if not product.data or not product.data.get('specs'):
        return {'error': 'Product not found or no specs'}

    # Récupérer norme
    norm = supabase.table('norms').select('id, code, description, official_content') \
        .eq('id', norm_id).single().execute()

    if not norm.data:
        return {'error': 'Norm not found'}

    # Évaluer
    ai = get_ai_client()

    try:
        result = ai.evaluate_norms(
            product.data['specs'],
            [{'code': norm.data['code'], 'description': norm.data['description']}]
        )
    except Exception as e:
        return {'error': str(e)}

    if result:
        # Sauvegarder
        save_evaluations(supabase, product_id, [norm.data], result)

        # Recalculer score
        add_task('calculate_score', product_id, 'product', priority=4)

        return {'result': result}
    else:
        return {'error': 'Evaluation failed'}


def save_evaluations(supabase, product_id: int, norms: list, evaluations: dict) -> int:
    """Sauvegarde les évaluations dans la base."""

    # Map code → id
    norm_map = {n['code']: n['id'] for n in norms}

    records = []
    for code, result in evaluations.items():
        if code in norm_map and result in ('YES', 'NO', 'N/A'):
            records.append({
                'product_id': product_id,
                'norm_id': norm_map[code],
                'result': result,
                'evaluated_at': datetime.now().isoformat(),
                'evaluated_by': 'automation-ai'
            })

    if records:
        supabase.table('evaluations').upsert(
            records,
            on_conflict='product_id,norm_id'
        ).execute()

    return len(records)
