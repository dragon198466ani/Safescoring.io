#!/usr/bin/env python3
"""
FIX APPLICABILITY - Corrige les problèmes d'applicabilité
==========================================================

Ce script:
1. Identifie les types sans applicabilité
2. Régénère l'applicabilité avec un prompt amélioré
3. Corrige les évaluations incohérentes
4. Force la ré-évaluation des produits affectés

Usage:
    python scripts/fix_applicability.py --analyze           # Analyse seulement
    python scripts/fix_applicability.py --fix-types         # Régénère applicabilité manquante
    python scripts/fix_applicability.py --fix-evaluations   # Corrige évaluations incohérentes
    python scripts/fix_applicability.py --fix-all           # Tout corriger
"""

import sys
import json
import time
import requests
import re
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Set

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.core.config import SUPABASE_URL, get_supabase_headers
from src.core.api_provider import AIProvider


# ============================================================
# PROMPT AMÉLIORÉ - Plus permissif pour l'applicabilité
# ============================================================

IMPROVED_APPLICABILITY_PROMPT = """Tu es un expert en évaluation de sécurité pour les produits crypto/blockchain.

## CONTEXTE
Tu dois déterminer si chaque norme de sécurité est APPLICABLE ou NON à un type de produit donné.

## RÈGLE FONDAMENTALE
En cas de DOUTE, marque la norme comme APPLICABLE (OUI).

Une norme est NON-APPLICABLE seulement si elle est **techniquement impossible** ou **absurde** pour ce type de produit.

## EXEMPLES

Pour un Hardware Wallet (HW Cold):
- "Screen size" → OUI (il a un écran)
- "Mobile app responsiveness" → OUI (il peut avoir une app companion)
- "DEX liquidity pools" → NON (un hardware wallet ne gère pas de pools)
- "Smart contract audits" → NON (il ne déploie pas de smart contracts)

Pour un DEX:
- "Private key storage" → OUI (les utilisateurs interagissent avec leurs clés)
- "Screen resolution" → NON (c'est du software, pas de hardware dédié)
- "Firmware updates" → NON (pas de firmware, c'est un smart contract)

## TYPE DE PRODUIT À ÉVALUER
{type_info}

## NORMES À ÉVALUER
{norms_list}

## FORMAT DE RÉPONSE

Réponds UNIQUEMENT avec un JSON valide, sans texte avant ou après:
[
    {{"code": "S001", "applicable": true}},
    {{"code": "S002", "applicable": false, "reason": "raison courte"}},
    ...
]

RAPPEL: En cas de doute → applicable = true
"""


class ApplicabilityFixer:
    """Corrige les problèmes d'applicabilité"""

    def __init__(self):
        self.ai_provider = AIProvider()
        self.types = []
        self.norms = []
        self.applicability = {}

    def load_data(self):
        """Charge les données de Supabase"""
        headers = get_supabase_headers()

        # Types
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/product_types?select=*&order=code",
            headers=headers
        )
        if r.status_code == 200:
            self.types = r.json()
            print(f"✓ {len(self.types)} types chargés")

        # Norms
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/norms?select=id,code,pillar,title,description&order=code",
            headers=headers
        )
        if r.status_code == 200:
            self.norms = r.json()
            self.norms_by_id = {n['id']: n for n in self.norms}
            self.norms_by_code = {n['code']: n for n in self.norms}
            print(f"✓ {len(self.norms)} normes chargées")

        # Applicability
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/norm_applicability?select=*",
            headers=headers
        )
        if r.status_code == 200:
            for a in r.json():
                key = (a['type_id'], a['norm_id'])
                self.applicability[key] = a['is_applicable']
            print(f"✓ {len(self.applicability)} règles d'applicabilité")

    def get_types_without_applicability(self) -> List[Dict]:
        """Identifie les types sans règles d'applicabilité"""
        types_without = []

        for t in self.types:
            count = sum(1 for (tid, _), _ in self.applicability.items() if tid == t['id'])
            if count == 0:
                types_without.append(t)

        return types_without

    def get_types_with_low_applicability(self, threshold: float = 0.2) -> List[Dict]:
        """Identifie les types avec un ratio d'applicabilité trop bas"""
        types_low = []

        for t in self.types:
            applicable = sum(1 for (tid, _), is_app in self.applicability.items()
                             if tid == t['id'] and is_app)
            total = sum(1 for (tid, _), _ in self.applicability.items() if tid == t['id'])

            if total > 0:
                ratio = applicable / len(self.norms)
                if ratio < threshold:
                    types_low.append({**t, 'ratio': ratio, 'applicable': applicable})

        return types_low

    def generate_applicability_for_type(self, product_type: Dict, batch_size: int = 50) -> Dict[str, bool]:
        """Génère l'applicabilité pour un type avec le prompt amélioré"""

        results = {}

        type_info = f"""
Code: {product_type['code']}
Nom: {product_type['name']}
Catégorie: {product_type.get('category', 'N/A')}
Description: {product_type.get('description', 'Pas de description')}
"""

        # Process in batches
        for i in range(0, len(self.norms), batch_size):
            batch = self.norms[i:i + batch_size]

            norms_list = "\n".join([
                f"- {n['code']}: {n['title']}"
                for n in batch
            ])

            prompt = IMPROVED_APPLICABILITY_PROMPT.format(
                type_info=type_info,
                norms_list=norms_list
            )

            try:
                # Use strategic applicability method for quality
                full_prompt = "Tu es un expert en classification de normes de sécurité crypto.\n\n" + prompt
                response = self.ai_provider.call_for_applicability(
                    type_code=type_data.get('code', 'DEFAULT'),
                    prompt=full_prompt,
                    max_tokens=4000
                )

                if response:
                    # Extract JSON
                    json_match = re.search(r'\[[\s\S]*\]', response)
                    if json_match:
                        parsed = json.loads(json_match.group())
                        for item in parsed:
                            code = item.get('code')
                            if code:
                                results[code] = item.get('applicable', True)

                print(f"   Batch {i//batch_size + 1}: {len(results)} résultats")
                time.sleep(2)  # Rate limiting

            except Exception as e:
                print(f"   ❌ Erreur batch {i//batch_size + 1}: {e}")

        return results

    def save_applicability(self, type_id: int, results: Dict[str, bool]) -> int:
        """Sauvegarde l'applicabilité dans Supabase"""
        headers = get_supabase_headers()
        saved = 0

        for code, is_applicable in results.items():
            norm = self.norms_by_code.get(code)
            if not norm:
                continue

            data = {
                'type_id': type_id,
                'norm_id': norm['id'],
                'is_applicable': is_applicable
            }

            r = requests.post(
                f"{SUPABASE_URL}/rest/v1/norm_applicability",
                headers={**headers, 'Prefer': 'resolution=merge-duplicates'},
                json=data
            )

            if r.status_code in [200, 201]:
                saved += 1

        return saved

    def fix_missing_applicability(self, dry_run: bool = False):
        """Régénère l'applicabilité pour les types qui en manquent"""
        print("\n" + "=" * 70)
        print("FIX: Régénération de l'applicabilité manquante")
        print("=" * 70)

        missing = self.get_types_without_applicability()
        print(f"\n{len(missing)} types sans applicabilité:")

        for t in missing:
            print(f"   - {t['code']}: {t['name']}")

        if not missing:
            print("✓ Tous les types ont des règles d'applicabilité")
            return

        if dry_run:
            print("\n[DRY RUN] Aucune modification")
            return

        for i, t in enumerate(missing):
            print(f"\n[{i+1}/{len(missing)}] Génération pour {t['code']}...")

            results = self.generate_applicability_for_type(t)

            if results:
                saved = self.save_applicability(t['id'], results)
                print(f"   ✓ {saved} règles sauvegardées")
                print(f"   Applicables: {sum(1 for v in results.values() if v)}")
                print(f"   Non-applicables: {sum(1 for v in results.values() if not v)}")

            time.sleep(3)

    def analyze_evaluation_inconsistencies(self, product_id: int = None) -> List[Dict]:
        """Analyse les incohérences entre applicabilité et évaluations"""
        headers = get_supabase_headers()

        # Get evaluations
        url = f"{SUPABASE_URL}/rest/v1/evaluations?select=id,product_id,norm_id,result"
        if product_id:
            url += f"&product_id=eq.{product_id}"

        r = requests.get(url, headers=headers)
        evaluations = r.json() if r.status_code == 200 else []

        # Get product types mapping
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/product_type_mapping?select=product_id,type_id",
            headers=headers
        )
        product_types = {}
        if r.status_code == 200:
            for m in r.json():
                if m['product_id'] not in product_types:
                    product_types[m['product_id']] = []
                product_types[m['product_id']].append(m['type_id'])

        inconsistencies = []

        for eval in evaluations:
            pid = eval['product_id']
            nid = eval['norm_id']
            result = eval['result']

            # Get types for this product
            types = product_types.get(pid, [])

            # Check if norm is applicable for ANY of the product's types
            is_applicable = any(
                self.applicability.get((tid, nid), False)
                for tid in types
            )

            # Inconsistency: N/A but should be applicable
            if result == 'N/A' and is_applicable:
                inconsistencies.append({
                    'evaluation_id': eval['id'],
                    'product_id': pid,
                    'norm_id': nid,
                    'norm_code': self.norms_by_id.get(nid, {}).get('code', '?'),
                    'current_result': result,
                    'should_be': 'APPLICABLE (needs evaluation)',
                    'type': 'false_na'
                })

            # Inconsistency: YES/NO but not applicable
            elif result in ['YES', 'YESp', 'NO'] and not is_applicable and types:
                inconsistencies.append({
                    'evaluation_id': eval['id'],
                    'product_id': pid,
                    'norm_id': nid,
                    'norm_code': self.norms_by_id.get(nid, {}).get('code', '?'),
                    'current_result': result,
                    'should_be': 'N/A',
                    'type': 'false_evaluation'
                })

        return inconsistencies

    def fix_evaluation_inconsistencies(self, product_id: int = None, dry_run: bool = False):
        """Corrige les évaluations incohérentes"""
        print("\n" + "=" * 70)
        print("FIX: Correction des évaluations incohérentes")
        print("=" * 70)

        inconsistencies = self.analyze_evaluation_inconsistencies(product_id)

        false_na = [i for i in inconsistencies if i['type'] == 'false_na']
        false_eval = [i for i in inconsistencies if i['type'] == 'false_evaluation']

        print(f"\nIncohérences trouvées:")
        print(f"   - N/A incorrects (normes applicables): {len(false_na)}")
        print(f"   - Évaluations sur normes non-applicables: {len(false_eval)}")

        if not inconsistencies:
            print("\n✓ Aucune incohérence trouvée")
            return

        if dry_run:
            print("\n[DRY RUN] Corrections suggérées:")
            for i in inconsistencies[:20]:
                print(f"   {i['norm_code']}: {i['current_result']} → {i['should_be']}")
            if len(inconsistencies) > 20:
                print(f"   ... et {len(inconsistencies) - 20} autres")
            return

        headers = get_supabase_headers()

        # Fix false N/A by deleting them (they'll be re-evaluated)
        print(f"\nSuppression des {len(false_na)} N/A incorrects...")
        deleted = 0
        for i in false_na:
            r = requests.delete(
                f"{SUPABASE_URL}/rest/v1/evaluations?id=eq.{i['evaluation_id']}",
                headers=headers
            )
            if r.status_code in [200, 204]:
                deleted += 1

        print(f"   ✓ {deleted} évaluations supprimées (à ré-évaluer)")

        # Fix false evaluations by setting them to N/A
        print(f"\nCorrection des {len(false_eval)} évaluations incorrectes → N/A...")
        fixed = 0
        for i in false_eval:
            r = requests.patch(
                f"{SUPABASE_URL}/rest/v1/evaluations?id=eq.{i['evaluation_id']}",
                headers=headers,
                json={'result': 'N/A'}
            )
            if r.status_code in [200, 204]:
                fixed += 1

        print(f"   ✓ {fixed} évaluations corrigées")

    def run_full_analysis(self):
        """Analyse complète"""
        print("\n" + "=" * 70)
        print("ANALYSE COMPLÈTE DE L'APPLICABILITÉ")
        print("=" * 70)

        # Types without applicability
        missing = self.get_types_without_applicability()
        print(f"\n📊 Types sans applicabilité: {len(missing)}")
        for t in missing[:10]:
            print(f"   - {t['code']}")
        if len(missing) > 10:
            print(f"   ... et {len(missing) - 10} autres")

        # Types with low applicability
        low = self.get_types_with_low_applicability(0.25)
        print(f"\n📊 Types avec applicabilité < 25%: {len(low)}")
        for t in low[:10]:
            print(f"   - {t['code']}: {t['ratio']*100:.1f}% ({t['applicable']} normes)")

        # Evaluation inconsistencies
        inconsistencies = self.analyze_evaluation_inconsistencies()
        print(f"\n📊 Incohérences d'évaluation: {len(inconsistencies)}")

        false_na = sum(1 for i in inconsistencies if i['type'] == 'false_na')
        false_eval = sum(1 for i in inconsistencies if i['type'] == 'false_evaluation')
        print(f"   - N/A incorrects: {false_na}")
        print(f"   - Évaluations sur normes N/A: {false_eval}")


def main():
    import argparse

    parser = argparse.ArgumentParser(description='Fix Applicability Issues')
    parser.add_argument('--analyze', action='store_true', help='Analyse complète')
    parser.add_argument('--fix-types', action='store_true', help='Régénère applicabilité manquante')
    parser.add_argument('--fix-evaluations', action='store_true', help='Corrige évaluations incohérentes')
    parser.add_argument('--fix-all', action='store_true', help='Tout corriger')
    parser.add_argument('--product-id', type=int, help='ID produit spécifique')
    parser.add_argument('--dry-run', action='store_true', help='Simulation')

    args = parser.parse_args()

    fixer = ApplicabilityFixer()
    fixer.load_data()

    if args.analyze or not any([args.fix_types, args.fix_evaluations, args.fix_all]):
        fixer.run_full_analysis()

    if args.fix_types or args.fix_all:
        fixer.fix_missing_applicability(dry_run=args.dry_run)

    if args.fix_evaluations or args.fix_all:
        fixer.fix_evaluation_inconsistencies(product_id=args.product_id, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
