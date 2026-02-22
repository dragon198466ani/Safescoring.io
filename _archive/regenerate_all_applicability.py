#!/usr/bin/env python3
"""
REGENERATE ALL APPLICABILITY
============================

Régénère l'applicabilité des normes pour TOUS les types de produits.
Utilise un prompt amélioré plus permissif.

Usage:
    python scripts/regenerate_all_applicability.py --analyze          # Analyse seulement
    python scripts/regenerate_all_applicability.py --type HW_Cold     # Un seul type
    python scripts/regenerate_all_applicability.py --all              # Tous les types
    python scripts/regenerate_all_applicability.py --missing          # Types sans règles
    python scripts/regenerate_all_applicability.py --all --force      # Force réécriture

IMPORTANT: Ce script va générer ~71,000 règles (78 types × 2159 normes)
Temps estimé: ~2-4 heures avec rate limiting
"""

import sys
import json
import time
import requests
import re
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Optional

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.core.config import SUPABASE_URL, get_supabase_headers
from src.core.api_provider import AIProvider


# ============================================================
# PROMPT AMÉLIORÉ - PLUS PERMISSIF
# ============================================================

SYSTEM_PROMPT = """Tu es un expert en sécurité crypto/blockchain.
Tu détermines si chaque norme de sécurité est applicable à un type de produit.

RÈGLE FONDAMENTALE: En cas de doute → APPLICABLE (OUI)

Une norme est NON-APPLICABLE seulement si elle est:
- Techniquement IMPOSSIBLE pour ce type
- Complètement ABSURDE ou hors contexte

EXEMPLES:
- "Screen size" pour un DEX (software) → NON (pas d'écran physique)
- "Transaction signing" pour un DEX → OUI (les users signent)
- "Firmware updates" pour un protocole DeFi → NON (pas de firmware)
- "API security" pour un hardware wallet → OUI (peut avoir une API)
"""

USER_PROMPT_TEMPLATE = """## TYPE DE PRODUIT

Code: {type_code}
Nom: {type_name}
Catégorie: {category}
Description: {description}

## NORMES À ÉVALUER

{norms_text}

## INSTRUCTIONS

Pour chaque norme, réponds OUI (applicable) ou NON (non-applicable).

En cas de doute → OUI

Format de réponse (JSON uniquement):
[
  {{"code": "S001", "applicable": true}},
  {{"code": "S002", "applicable": false}},
  ...
]
"""


class ApplicabilityRegenerator:
    """Régénère toute l'applicabilité"""

    def __init__(self):
        self.ai_provider = AIProvider()
        self.types = []
        self.norms = []
        self.existing_rules = {}

    def load_data(self):
        """Charge les données"""
        headers = get_supabase_headers()

        # Types
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/product_types?select=*&order=code",
            headers=headers
        )
        self.types = r.json() if r.status_code == 200 else []
        print(f"✓ {len(self.types)} types")

        # Norms
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/norms?select=id,code,pillar,title,description&order=code",
            headers=headers
        )
        self.norms = r.json() if r.status_code == 200 else []
        self.norms_by_code = {n['code']: n for n in self.norms}
        print(f"✓ {len(self.norms)} normes")

        # Existing applicability
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/norm_applicability?select=type_id,norm_id",
            headers=headers
        )
        if r.status_code == 200:
            for a in r.json():
                key = (a['type_id'], a['norm_id'])
                self.existing_rules[key] = True
        print(f"✓ {len(self.existing_rules)} règles existantes")

    def get_types_status(self) -> Dict:
        """Analyse le statut de chaque type"""
        status = {}

        for t in self.types:
            count = sum(1 for (tid, _) in self.existing_rules.keys() if tid == t['id'])
            status[t['code']] = {
                'id': t['id'],
                'name': t['name'],
                'rules_count': count,
                'coverage': count / len(self.norms) * 100 if self.norms else 0,
                'missing': len(self.norms) - count
            }

        return status

    def generate_for_type(self, product_type: Dict, batch_size: int = 40) -> Dict[str, bool]:
        """Génère l'applicabilité pour un type"""
        results = {}

        type_info = {
            'type_code': product_type.get('code', ''),
            'type_name': product_type.get('name', ''),
            'category': product_type.get('category', 'Unknown'),
            'description': product_type.get('description', 'Pas de description')
        }

        # Process par batch
        for i in range(0, len(self.norms), batch_size):
            batch = self.norms[i:i + batch_size]
            batch_num = i // batch_size + 1
            total_batches = (len(self.norms) + batch_size - 1) // batch_size

            print(f"      Batch {batch_num}/{total_batches}...", end=" ", flush=True)

            norms_text = "\n".join([
                f"- {n['code']}: {n['title']}"
                for n in batch
            ])

            prompt = USER_PROMPT_TEMPLATE.format(
                norms_text=norms_text,
                **type_info
            )

            try:
                # Combine system prompt and user prompt
                full_prompt = f"{SYSTEM_PROMPT}\n\n{prompt}"
                response = self.ai_provider.call(full_prompt, max_tokens=3000)

                if response:
                    # Parse JSON - try multiple patterns
                    parsed = None

                    # Try full JSON array
                    json_match = re.search(r'\[\s*\{[\s\S]*\}\s*\]', response)
                    if json_match:
                        try:
                            parsed = json.loads(json_match.group())
                        except json.JSONDecodeError:
                            pass

                    # If failed, try extracting individual objects
                    if not parsed:
                        parsed = []
                        for obj_match in re.finditer(r'\{\s*"code"\s*:\s*"([A-Z]\d{3})"\s*,\s*"applicable"\s*:\s*(true|false)\s*\}', response, re.I):
                            code = obj_match.group(1).upper()
                            is_applicable = obj_match.group(2).lower() == 'true'
                            parsed.append({'code': code, 'applicable': is_applicable})

                    # Fallback: parse OUI/NON or CODE: true/false format
                    if not parsed:
                        for line in response.split('\n'):
                            match = re.match(r'[\-\*\s]*([A-Z]\d{3})\s*[:=]\s*(OUI|NON|true|false|yes|no)', line, re.I)
                            if match:
                                code = match.group(1).upper()
                                result = match.group(2).upper()
                                is_applicable = result in ['OUI', 'TRUE', 'YES']
                                parsed.append({'code': code, 'applicable': is_applicable})

                    if parsed:
                        for item in parsed:
                            code = item.get('code', '').upper()
                            if code in self.norms_by_code:
                                results[code] = item.get('applicable', True)

                        applicable = sum(1 for v in results.values() if v)
                        print(f"OK ({len(parsed)} parsed, {applicable} OUI)")
                    else:
                        print("No results parsed")
                else:
                    print("No response")

            except Exception as e:
                print(f"Error: {e}")

            time.sleep(1.5)  # Rate limiting

        return results

    def save_applicability(self, type_id: int, results: Dict[str, bool], force: bool = False) -> int:
        """Sauvegarde l'applicabilité"""
        headers = get_supabase_headers()
        saved = 0
        skipped = 0

        for code, is_applicable in results.items():
            norm = self.norms_by_code.get(code)
            if not norm:
                continue

            key = (type_id, norm['id'])

            # Skip if exists and not force
            if key in self.existing_rules and not force:
                skipped += 1
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
                self.existing_rules[key] = True

        return saved, skipped

    def run_analysis(self):
        """Analyse le statut actuel"""
        print("\n" + "=" * 70)
        print("ANALYSE DE L'APPLICABILITÉ")
        print("=" * 70)

        status = self.get_types_status()

        # Grouper par coverage
        no_rules = [s for s in status.values() if s['rules_count'] == 0]
        partial = [s for s in status.values() if 0 < s['coverage'] < 100]
        complete = [s for s in status.values() if s['coverage'] >= 100]

        print(f"\n📊 Résumé:")
        print(f"   Types sans règles:    {len(no_rules)} / {len(self.types)}")
        print(f"   Types partiels:       {len(partial)}")
        print(f"   Types complets:       {len(complete)}")

        expected_total = len(self.types) * len(self.norms)
        actual_total = len(self.existing_rules)
        print(f"\n   Règles existantes:    {actual_total:,}")
        print(f"   Règles attendues:     {expected_total:,}")
        print(f"   Manquantes:           {expected_total - actual_total:,}")

        if no_rules:
            print(f"\n❌ Types sans applicabilité ({len(no_rules)}):")
            for s in sorted(no_rules, key=lambda x: x['id'])[:20]:
                print(f"   - {s['name']}")
            if len(no_rules) > 20:
                print(f"   ... et {len(no_rules) - 20} autres")

        if partial:
            print(f"\n⚠️ Types avec applicabilité partielle ({len(partial)}):")
            for s in sorted(partial, key=lambda x: x['coverage']):
                print(f"   - {s['name']}: {s['coverage']:.1f}% ({s['rules_count']}/{len(self.norms)})")

    def run_generation(self, type_filter: str = None, missing_only: bool = False,
                       force: bool = False, dry_run: bool = False, auto_confirm: bool = False):
        """Lance la génération"""
        print("\n" + "=" * 70)
        print("GÉNÉRATION DE L'APPLICABILITÉ")
        print("=" * 70)

        # Filtrer les types à traiter
        types_to_process = []

        if type_filter:
            # Un seul type
            types_to_process = [t for t in self.types if t['code'].upper() == type_filter.upper()]
            if not types_to_process:
                print(f"❌ Type '{type_filter}' non trouvé")
                return
        elif missing_only:
            # Seulement les types sans règles
            status = self.get_types_status()
            types_to_process = [t for t in self.types if status[t['code']]['rules_count'] == 0]
        else:
            # Tous les types
            types_to_process = self.types

        print(f"\n{len(types_to_process)} types à traiter")
        print(f"Force: {force}")
        print(f"Dry run: {dry_run}")

        if dry_run:
            print("\n[DRY RUN] Aucune modification")
            for t in types_to_process[:10]:
                print(f"   - {t['code']}: {t['name']}")
            if len(types_to_process) > 10:
                print(f"   ... et {len(types_to_process) - 10} autres")
            return

        # Estimation du temps
        estimated_batches = len(types_to_process) * (len(self.norms) // 40 + 1)
        estimated_time = estimated_batches * 2  # 2 sec par batch
        print(f"\n⏱️ Temps estimé: {estimated_time // 60} minutes")

        if not auto_confirm:
            confirm = input("\nContinuer? (y/N): ")
            if confirm.lower() != 'y':
                print("Annulé")
                return
        else:
            print("\n[AUTO-CONFIRM] Démarrage...")

        # Génération
        total_saved = 0
        total_skipped = 0
        start_time = time.time()

        for i, t in enumerate(types_to_process):
            print(f"\n[{i+1}/{len(types_to_process)}] {t['code']} - {t['name']}")

            results = self.generate_for_type(t)

            if results:
                applicable = sum(1 for v in results.values() if v)
                print(f"   Résultats: {len(results)} normes ({applicable} applicables, {len(results) - applicable} non-applicables)")

                saved, skipped = self.save_applicability(t['id'], results, force=force)
                total_saved += saved
                total_skipped += skipped
                print(f"   Sauvegardé: {saved} (skipped: {skipped})")
            else:
                print(f"   ❌ Aucun résultat")

            # Progress
            elapsed = time.time() - start_time
            avg_per_type = elapsed / (i + 1)
            remaining = avg_per_type * (len(types_to_process) - i - 1)
            print(f"   ⏱️ Restant: ~{remaining/60:.0f} min")

            time.sleep(2)  # Rate limiting entre types

        # Résumé final
        elapsed = time.time() - start_time
        print(f"\n" + "=" * 70)
        print("TERMINÉ")
        print(f"=" * 70)
        print(f"   Durée: {elapsed/60:.1f} minutes")
        print(f"   Règles sauvegardées: {total_saved}")
        print(f"   Règles ignorées: {total_skipped}")


def main():
    import argparse

    parser = argparse.ArgumentParser(description='Regenerate All Applicability')
    parser.add_argument('--analyze', action='store_true', help='Analyse seulement')
    parser.add_argument('--type', type=str, help='Un seul type (ex: HW_Cold)')
    parser.add_argument('--missing', action='store_true', help='Seulement types sans règles')
    parser.add_argument('--all', action='store_true', help='Tous les types')
    parser.add_argument('--force', action='store_true', help='Force réécriture')
    parser.add_argument('--dry-run', action='store_true', help='Simulation')
    parser.add_argument('--yes', '-y', action='store_true', help='Auto-confirm')

    args = parser.parse_args()

    regen = ApplicabilityRegenerator()
    regen.load_data()

    if args.analyze or not any([args.type, args.missing, args.all]):
        regen.run_analysis()
    else:
        regen.run_generation(
            type_filter=args.type,
            missing_only=args.missing,
            force=args.force,
            dry_run=args.dry_run,
            auto_confirm=args.yes
        )


if __name__ == "__main__":
    main()
