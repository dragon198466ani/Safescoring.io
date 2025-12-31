#!/usr/bin/env python3
"""
SAFESCORING.IO - FULL EVALUATION PIPELINE
==========================================

Script tout-en-un qui exécute le workflow complet:
1. Vérification/assignation des types de produits
2. Génération de l'applicabilité des normes par type
3. Évaluation de chaque produit (YES/NO/N/A/TBD)
4. Calcul automatique des scores (via trigger SQL)

Usage:
    python -m src.automation.full_pipeline --mode test     # 1 produit (test)
    python -m src.automation.full_pipeline --mode partial  # 10 produits
    python -m src.automation.full_pipeline --mode full     # Tous les produits
    python -m src.automation.full_pipeline --product <slug>  # 1 produit spécifique

Auteur: SafeScoring.io
"""

import os
import sys
import argparse
import time
from datetime import datetime
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from dotenv import load_dotenv
load_dotenv()

# Import modules
from src.core.applicability_generator import ApplicabilityGenerator
from src.core.smart_evaluator import SmartEvaluator
from src.core.score_calculator import ScoreCalculator


def print_banner(step: int, title: str):
    """Print a step banner."""
    print(f"""
{'='*70}
   STEP {step}: {title}
{'='*70}
""")


def print_summary(stats: dict):
    """Print final summary."""
    print(f"""
{'='*70}
   PIPELINE COMPLETE
{'='*70}

   Duration: {stats.get('duration', 0):.1f} seconds

   Step 1 - Type Verification:
      Products checked: {stats.get('products_checked', 0)}
      Types assigned: {stats.get('types_assigned', 0)}

   Step 2 - Applicability:
      Types processed: {stats.get('types_processed', 0)}
      Rules generated: {stats.get('applicability_rules', 0)}

   Step 3 - Evaluations:
      Products evaluated: {stats.get('products_evaluated', 0)}
      Total evaluations: {stats.get('total_evaluations', 0)}

   Step 4 - Score Calculation:
      Scores calculated: {stats.get('scores_calculated', 0)}

{'='*70}
""")


class FullPipeline:
    """Complete evaluation pipeline."""

    def __init__(self):
        self.stats = {
            'start_time': time.time(),
            'products_checked': 0,
            'types_assigned': 0,
            'types_processed': 0,
            'applicability_rules': 0,
            'products_evaluated': 0,
            'total_evaluations': 0,
            'scores_calculated': 0
        }

    def step1_verify_types(self, products):
        """Step 1: Verify all products have types assigned."""
        print_banner(1, "TYPE VERIFICATION")

        import requests
        from src.core.config import SUPABASE_URL, get_supabase_headers

        headers = get_supabase_headers()

        # Check products without types
        products_without_type = []
        for p in products:
            if not p.get('type_id'):
                # Check product_type_mapping
                r = requests.get(
                    f"{SUPABASE_URL}/rest/v1/product_type_mapping?product_id=eq.{p['id']}&limit=1",
                    headers=headers
                )
                mapping = r.json() if r.status_code == 200 else []
                if not mapping:
                    products_without_type.append(p)

        self.stats['products_checked'] = len(products)

        if products_without_type:
            print(f"   WARNING: {len(products_without_type)} products without type:")
            for p in products_without_type[:5]:
                print(f"      - {p['name']} (id: {p['id']})")
            if len(products_without_type) > 5:
                print(f"      ... and {len(products_without_type) - 5} more")
            print("\n   These products will be skipped during evaluation.")
        else:
            print(f"   All {len(products)} products have types assigned.")

        return [p for p in products if p not in products_without_type]

    def step2_applicability(self, force_regenerate=False):
        """Step 2: Generate norm applicability for all types."""
        print_banner(2, "NORM APPLICABILITY GENERATION")

        import requests
        from src.core.config import SUPABASE_URL, get_supabase_headers

        headers = get_supabase_headers()

        # Check if applicability already exists
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/norm_applicability?select=id&limit=1",
            headers=headers
        )
        existing = r.json() if r.status_code == 200 else []

        if existing and not force_regenerate:
            # Count existing rules
            r = requests.get(
                f"{SUPABASE_URL}/rest/v1/norm_applicability?select=id",
                headers={**headers, 'Prefer': 'count=exact'}
            )
            count = int(r.headers.get('content-range', '0-0/0').split('/')[-1])
            print(f"   Applicability already exists ({count} rules)")
            print(f"   Use --force-applicability to regenerate")
            self.stats['applicability_rules'] = count
            return

        generator = ApplicabilityGenerator()
        generator.run()

        # Count rules after generation
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/norm_applicability?select=id",
            headers={**headers, 'Prefer': 'count=exact'}
        )
        count = int(r.headers.get('content-range', '0-0/0').split('/')[-1])
        self.stats['applicability_rules'] = count
        self.stats['types_processed'] = len(generator.product_types)

    def step3_evaluations(self, products, skip_evaluated=True):
        """Step 3: Evaluate products with AI."""
        print_banner(3, "PRODUCT EVALUATIONS")

        import requests
        from src.core.config import SUPABASE_URL, get_supabase_headers

        headers = get_supabase_headers()

        evaluator = SmartEvaluator()
        evaluator.load_data()

        evaluated_count = 0
        total_evals = 0

        for i, product in enumerate(products):
            print(f"\n[{i+1}/{len(products)}] Processing {product['name']}...")

            # Check if already evaluated (has evaluations)
            if skip_evaluated:
                r = requests.get(
                    f"{SUPABASE_URL}/rest/v1/evaluations?product_id=eq.{product['id']}&limit=1",
                    headers=headers
                )
                existing_evals = r.json() if r.status_code == 200 else []
                if existing_evals:
                    print(f"   Already evaluated, skipping (use --force-evaluate to re-evaluate)")
                    continue

            try:
                result = evaluator.evaluate_product(product)

                if result and len(result) == 2:
                    evaluations, applicable_norms = result

                    if evaluations:
                        evaluator.save_evaluations(product['id'], evaluations, applicable_norms)
                        evaluated_count += 1
                        total_evals += len(evaluations)
                        print(f"   Saved {len(evaluations)} evaluations")

                time.sleep(1)  # Rate limiting

            except Exception as e:
                print(f"   ERROR: {e}")
                continue

        self.stats['products_evaluated'] = evaluated_count
        self.stats['total_evaluations'] = total_evals

    def step4_calculate_scores(self):
        """Step 4: Calculate scores (also triggered automatically by SQL trigger)."""
        print_banner(4, "SCORE CALCULATION")

        calculator = ScoreCalculator(record_history=True)
        calculator.run()

        # The calculator prints its own stats
        self.stats['scores_calculated'] = len(calculator.products)

    def run(self, mode='test', product_slug=None, force_applicability=False, force_evaluate=False):
        """Run the full pipeline."""
        print("""
╔══════════════════════════════════════════════════════════════════════╗
║                                                                      ║
║     SAFESCORING.IO - FULL EVALUATION PIPELINE                        ║
║                                                                      ║
║     Step 1: Type Verification                                        ║
║     Step 2: Norm Applicability                                       ║
║     Step 3: AI Evaluations (YES/NO/N/A/TBD)                          ║
║     Step 4: Score Calculation                                        ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
""")

        import requests
        from src.core.config import SUPABASE_URL, get_supabase_headers

        headers = get_supabase_headers()

        # Determine products to process
        if product_slug:
            print(f"Mode: Single product ({product_slug})")
            r = requests.get(
                f"{SUPABASE_URL}/rest/v1/products?slug=eq.{product_slug}&select=*",
                headers=headers
            )
            products = r.json() if r.status_code == 200 else []
            if not products:
                print(f"ERROR: Product '{product_slug}' not found!")
                return
        else:
            # Get all active products
            r = requests.get(
                f"{SUPABASE_URL}/rest/v1/products?select=*&order=name",
                headers=headers
            )
            all_products = r.json() if r.status_code == 200 else []

            if mode == 'test':
                products = all_products[:1]
                print(f"Mode: TEST (1 product)")
            elif mode == 'partial':
                products = all_products[:10]
                print(f"Mode: PARTIAL (10 products)")
            else:
                products = all_products
                print(f"Mode: FULL ({len(products)} products)")

        print(f"\nProducts to process: {len(products)}")

        # Step 1: Verify types
        products = self.step1_verify_types(products)

        if not products:
            print("ERROR: No products with valid types to process!")
            return

        # Step 2: Applicability
        self.step2_applicability(force_regenerate=force_applicability)

        # Step 3: Evaluations
        self.step3_evaluations(products, skip_evaluated=not force_evaluate)

        # Step 4: Calculate scores
        self.step4_calculate_scores()

        # Final summary
        self.stats['duration'] = time.time() - self.stats['start_time']
        print_summary(self.stats)


def main():
    parser = argparse.ArgumentParser(description='SafeScoring Full Evaluation Pipeline')
    parser.add_argument('--mode', choices=['test', 'partial', 'full'], default='test',
                        help='Processing mode: test (1), partial (10), full (all)')
    parser.add_argument('--product', type=str, help='Process a single product by slug')
    parser.add_argument('--force-applicability', action='store_true',
                        help='Force regeneration of applicability rules')
    parser.add_argument('--force-evaluate', action='store_true',
                        help='Re-evaluate products even if already evaluated')

    args = parser.parse_args()

    pipeline = FullPipeline()
    pipeline.run(
        mode=args.mode,
        product_slug=args.product,
        force_applicability=args.force_applicability,
        force_evaluate=args.force_evaluate
    )


if __name__ == '__main__':
    main()
