"""
Score Handler
=============
Calcule les scores SAFE des produits.
"""

from datetime import datetime


def handle_calculate_score(supabase, task: dict, add_task) -> dict:
    """
    Calcule le score SAFE d'un produit.

    Flow:
    1. Récupère toutes les évaluations du produit
    2. Récupère les infos des normes (pilier, poids, essential)
    3. Calcule score par pilier
    4. Calcule score global
    5. Sauvegarde
    """
    product_id = task['target_id']

    # Récupérer évaluations avec infos normes
    evals = supabase.table('evaluations').select(
        '*, norms(code, pillar, is_essential, is_consumer, weight)'
    ).eq('product_id', product_id).execute()

    if not evals.data:
        return {'error': 'No evaluations found'}

    # Organiser par pilier
    pillars = {
        'Security': {'yes': 0, 'total': 0, 'essential_yes': 0, 'essential_total': 0},
        'Accessibility': {'yes': 0, 'total': 0, 'essential_yes': 0, 'essential_total': 0},
        'Freedom': {'yes': 0, 'total': 0, 'essential_yes': 0, 'essential_total': 0},
        'Experience': {'yes': 0, 'total': 0, 'essential_yes': 0, 'essential_total': 0},
    }

    # Mapper les lettres aux noms complets
    pillar_map = {'S': 'Security', 'A': 'Accessibility', 'F': 'Freedom', 'E': 'Experience'}

    for ev in evals.data:
        norm = ev.get('norms')
        if not norm:
            continue

        result = ev['result']
        if result == 'N/A':
            continue  # N/A ne compte pas

        # Déterminer le pilier
        pillar_code = norm.get('pillar', 'S')
        if pillar_code in pillar_map:
            pillar = pillar_map[pillar_code]
        elif pillar_code in pillars:
            pillar = pillar_code
        else:
            pillar = 'Security'  # Default

        weight = norm.get('weight', 1) or 1
        is_essential = norm.get('is_essential', False)

        # Incrémenter les compteurs
        pillars[pillar]['total'] += weight

        if result == 'YES':
            pillars[pillar]['yes'] += weight

        if is_essential:
            pillars[pillar]['essential_total'] += 1
            if result == 'YES':
                pillars[pillar]['essential_yes'] += 1

    # Calculer les scores
    scores = {}
    details = {}

    for pillar, data in pillars.items():
        key = f'score_{pillar[0].lower()}'  # score_s, score_a, score_f, score_e

        if data['total'] > 0:
            score = round((data['yes'] / data['total']) * 100, 1)
            scores[key] = score

            # Détails pour debug
            details[pillar] = {
                'score': score,
                'yes': data['yes'],
                'total': data['total'],
                'essential_passed': data['essential_yes'],
                'essential_total': data['essential_total']
            }
        else:
            scores[key] = None
            details[pillar] = {'score': None, 'evaluated': 0}

    # Score global (moyenne des piliers évalués)
    valid_scores = [v for v in scores.values() if v is not None]
    if valid_scores:
        scores['score_global'] = round(sum(valid_scores) / len(valid_scores), 1)
    else:
        scores['score_global'] = None

    # Calculer la "note" (A, B, C, D, F)
    global_score = scores.get('score_global')
    if global_score is not None:
        if global_score >= 90:
            grade = 'A'
        elif global_score >= 75:
            grade = 'B'
        elif global_score >= 60:
            grade = 'C'
        elif global_score >= 40:
            grade = 'D'
        else:
            grade = 'F'
        scores['grade'] = grade

    # Vérifier normes essentielles non respectées
    essential_failed = []
    for ev in evals.data:
        norm = ev.get('norms')
        if norm and norm.get('is_essential') and ev['result'] == 'NO':
            essential_failed.append(norm['code'])

    if essential_failed:
        scores['essential_failed'] = essential_failed
        # Baisser la note si essentielles échouent
        if len(essential_failed) >= 3:
            scores['grade'] = 'F'
        elif len(essential_failed) >= 1 and scores.get('grade') in ['A', 'B']:
            scores['grade'] = 'C'

    # Sauvegarder
    supabase.table('products').update({
        'scores': scores,
        'score_updated_at': datetime.now().isoformat()
    }).eq('id', product_id).execute()

    return {
        'score_global': scores.get('score_global'),
        'grade': scores.get('grade'),
        'pillars': {
            'S': scores.get('score_s'),
            'A': scores.get('score_a'),
            'F': scores.get('score_f'),
            'E': scores.get('score_e'),
        },
        'evaluations_count': len(evals.data),
        'essential_failed': len(essential_failed)
    }
