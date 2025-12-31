#!/usr/bin/env python3
"""Test complet de l'évaluation Glacier avec debug"""

import sys
sys.path.insert(0, '.')

from src.core.smart_evaluator import SmartEvaluator

# Créer l'évaluateur
evaluator = SmartEvaluator()
evaluator.load_data()

# Trouver Glacier
glacier = next((p for p in evaluator.products if 'glacier' in p['name'].lower()), None)
if not glacier:
    print("Glacier non trouvé!")
    exit(1)

print(f"Produit: {glacier['name']} (type_id={glacier['type_id']})")

# Récupérer les normes applicables
applicable_norms = evaluator.get_applicable_norms(glacier['type_id'])
print(f"\nNormes applicables: {len(applicable_norms)}")

# Compter par pilier
from collections import Counter
pillar_counts = Counter(n['pillar'] for n in applicable_norms)
print(f"Par pilier: {dict(pillar_counts)}")

# Lister les normes A
print("\n--- Normes A applicables ---")
a_norms = [n for n in applicable_norms if n['pillar'] == 'A']
for n in a_norms[:10]:
    print(f"  {n['code']}: {n['title']}")
print(f"  ... total: {len(a_norms)}")

# Tester l'évaluation du pilier A
print("\n" + "=" * 60)
print("TEST ÉVALUATION PILIER A")
print("=" * 60)

product_info = evaluator.get_product_info(glacier)
print(f"Product info: {product_info}")

# Évaluer le pilier A
if a_norms:
    result = evaluator.evaluate_batch_with_ai(product_info, a_norms, 'A', None)
    print(f"\nRésultat: {len(result)} évaluations")
    print(f"Contenu: {result}")
else:
    print("Aucune norme A!")
