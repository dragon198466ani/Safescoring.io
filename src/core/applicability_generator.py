#!/usr/bin/env python3
"""
SAFESCORING.IO - Norm Applicability Generator
Generates the norm_applicability table (TRUE/FALSE for each norm/type combination).

WORKFLOW: Applicability (TRUE/FALSE) -> Smart Evaluator (YES/NO/N/A/TBD) -> Score Calculator

This is the FIRST step in the evaluation pipeline.
"""

import requests
import time

# Import from common modules
from .config import SUPABASE_URL, get_supabase_headers
from .api_provider import AIProvider, parse_applicability_response


APPLICABILITY_PROMPT = """Tu es un expert en securite crypto. Tu dois determiner si chaque norme est APPLICABLE a un type de produit.

TYPE DE PRODUIT: {type_name} ({type_code})
Categorie: {category}

DESCRIPTION:
{description}

CARACTERISTIQUES:
- Exemples: {examples}
- Avantages: {advantages}
- Inconvenients: {disadvantages}

NORMES A EVALUER:
{norms_text}

REGLES D'APPLICABILITE:
APPLICABLE (OUI) = La norme A DU SENS pour ce type de produit
NON-APPLICABLE (NON) = La norme N'A AUCUN SENS pour ce type de produit (incompatibilite technique)

En cas de doute, preferer OUI (applicable).

FORMAT DE REPONSE (une ligne par norme):
CODE: OUI ou NON

Evalue chaque norme:"""


class ApplicabilityGenerator:
    """Generates the norm_applicability table with AI."""

    def __init__(self):
        self.headers = get_supabase_headers()
        self.product_types = {}
        self.norms = []
        self.norms_by_code = {}
        self.current_applicability = {}
        self.ai_provider = AIProvider()

    def load_data(self):
        """Loads types and norms from Supabase."""
        print("\n[LOAD] Loading Supabase data...")

        # Load types
        r = requests.get(
            f'{SUPABASE_URL}/rest/v1/product_types?select=*',
            headers=self.headers
        )
        types_list = r.json() if r.status_code == 200 else []
        self.product_types = {t['id']: t for t in types_list}
        print(f"   {len(self.product_types)} product types")

        # Load norms
        r = requests.get(
            f'{SUPABASE_URL}/rest/v1/norms?select=id,code,title,pillar,description',
            headers=self.headers
        )
        self.norms = r.json() if r.status_code == 200 else []
        self.norms_by_code = {n['code']: n for n in self.norms}
        print(f"   {len(self.norms)} norms")

        # Load current applicability
        print("   Loading current applicability...")
        offset = 0
        while True:
            r = requests.get(
                f'{SUPABASE_URL}/rest/v1/norm_applicability?select=norm_id,type_id,is_applicable&limit=1000&offset={offset}',
                headers=self.headers
            )
            data = r.json() if r.status_code == 200 else []
            if not data:
                break
            for row in data:
                key = (row['type_id'], row['norm_id'])
                self.current_applicability[key] = row['is_applicable']
            offset += 1000
        print(f"   {len(self.current_applicability)} existing rules")

    def get_type_context(self, type_info):
        """Builds the complete context of a type."""
        return {
            'name': type_info.get('name', 'Unknown'),
            'code': type_info.get('code', ''),
            'category': type_info.get('category', 'N/A'),
            'description': type_info.get('description', 'No description'),
            'examples': type_info.get('examples', 'No examples'),
            'advantages': type_info.get('advantages', 'N/A'),
            'disadvantages': type_info.get('disadvantages', 'N/A')
        }

    def evaluate_batch(self, type_info, norms_batch):
        """Evaluates applicability of a batch of norms for a type."""
        ctx = self.get_type_context(type_info)

        norms_text = "\n".join([
            f"- {n['code']}: {n['title']}" + (f" ({n.get('description', '')[:60]})" if n.get('description') else "")
            for n in norms_batch
        ])

        prompt = APPLICABILITY_PROMPT.format(
            type_name=ctx['name'],
            type_code=ctx['code'],
            category=ctx['category'],
            description=ctx['description'],
            examples=ctx['examples'],
            advantages=ctx['advantages'],
            disadvantages=ctx['disadvantages'],
            norms_text=norms_text
        )

        result = self.ai_provider.call(prompt)

        if not result:
            return {}

        return parse_applicability_response(result, self.norms_by_code)

    def save_applicability(self, type_id, applicability_dict):
        """Saves applicability rules to Supabase."""
        records = []
        for norm_id, is_applicable in applicability_dict.items():
            records.append({
                'type_id': type_id,
                'norm_id': norm_id,
                'is_applicable': is_applicable
            })

        if not records:
            return 0

        # Upsert
        upsert_headers = get_supabase_headers('resolution=merge-duplicates')

        r = requests.post(
            f"{SUPABASE_URL}/rest/v1/norm_applicability",
            headers=upsert_headers,
            json=records
        )

        return len(records) if r.status_code in [200, 201] else 0

    def run(self, type_id=None, pillar=None, batch_size=30):
        """Run applicability generation."""
        print("""
================================================================
     NORM APPLICABILITY GENERATOR
     Step 1: Determine which norms apply to which product types
================================================================
""")

        self.load_data()

        # Filter types
        if type_id:
            types_to_process = {type_id: self.product_types[type_id]}
        else:
            types_to_process = self.product_types

        # Filter norms
        if pillar:
            norms_to_process = [n for n in self.norms if n['pillar'] == pillar]
        else:
            norms_to_process = self.norms

        print(f"\n{len(types_to_process)} types x {len(norms_to_process)} norms")

        total_saved = 0

        for i, (tid, type_info) in enumerate(types_to_process.items()):
            print(f"\n[{i+1}/{len(types_to_process)}] {type_info['name']}")

            # Process by batches
            all_applicability = {}
            num_batches = (len(norms_to_process) + batch_size - 1) // batch_size

            for batch_idx in range(num_batches):
                start = batch_idx * batch_size
                end = min(start + batch_size, len(norms_to_process))
                batch = norms_to_process[start:end]

                print(f"   Batch {batch_idx+1}/{num_batches} ({len(batch)} norms)...")

                batch_result = self.evaluate_batch(type_info, batch)
                all_applicability.update(batch_result)

                time.sleep(0.5)

            # Save
            saved = self.save_applicability(tid, all_applicability)
            total_saved += saved

            applicable = sum(1 for v in all_applicability.values() if v)
            not_applicable = sum(1 for v in all_applicability.values() if not v)
            print(f"   {saved} saved ({applicable} applicable, {not_applicable} N/A)")

        print(f"\n{'='*60}")
        print(f"COMPLETE: {total_saved} applicability rules saved")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--type-id', type=int, help='Process only this type ID')
    parser.add_argument('--pillar', choices=['S', 'A', 'F', 'E'], help='Process only this pillar')
    args = parser.parse_args()

    generator = ApplicabilityGenerator()
    generator.run(type_id=args.type_id, pillar=args.pillar)
