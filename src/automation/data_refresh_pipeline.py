#!/usr/bin/env python3
"""
SAFESCORING.IO - DATA REFRESH PIPELINE
======================================

Pipeline unifié qui orchestre TOUTES les mises à jour de données dans le bon ordre:

    ÉTAPE 0: Refresh Normes (mensuel)
    ÉTAPE 1: Refresh Produits (hebdomadaire) + Prix (quotidien)
    ÉTAPE 2: Classification Types (si nouveaux produits)
    ÉTAPE 3: Applicabilité (si nouveaux types/normes)
    ÉTAPE 4: Évaluations (pour produits modifiés)
    ÉTAPE 5: Scores (automatique via trigger SQL)

Usage:
    python -m src.automation.data_refresh_pipeline --step all
    python -m src.automation.data_refresh_pipeline --step norms
    python -m src.automation.data_refresh_pipeline --step products
    python -m src.automation.data_refresh_pipeline --step prices
    python -m src.automation.data_refresh_pipeline --step evaluations --limit 10
    python -m src.automation.data_refresh_pipeline --product ledger-nano-x

Frequencies (recommended):
    - Norms: Monthly (1st of month)
    - Products: Weekly (Monday)
    - Prices: Daily
    - Evaluations: Weekly + on-demand

Author: SafeScoring.io
"""

import os
import sys
import argparse
import time
import requests
from datetime import datetime, timedelta
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from dotenv import load_dotenv
load_dotenv()

from src.core.config import SUPABASE_URL, get_supabase_headers


class DataRefreshPipeline:
    """
    Unified pipeline for ALL data refresh operations.
    Orchestrates the correct order of operations to ensure data consistency.
    """

    def __init__(self, verbose: bool = True):
        self.verbose = verbose
        self.headers = get_supabase_headers()
        self.stats = {
            'start_time': time.time(),
            'norms_updated': 0,
            'products_scraped': 0,
            'prices_updated': 0,
            'types_classified': 0,
            'applicability_generated': 0,
            'products_evaluated': 0,
            'errors': []
        }

    def log(self, message: str, level: str = 'INFO'):
        """Print log message with timestamp."""
        if self.verbose:
            timestamp = datetime.now().strftime('%H:%M:%S')
            print(f"[{timestamp}] [{level}] {message}", flush=True)

    def log_step(self, step: int, title: str):
        """Print step header."""
        print(f"\n{'='*60}")
        print(f"   STEP {step}: {title}")
        print(f"{'='*60}\n")

    # =========================================================================
    # STEP 0: REFRESH NORMS (Monthly)
    # =========================================================================

    def step0_refresh_norms(self, limit: int = None):
        """
        Refresh norm documentation from official sources.
        Scrapes NIST, EIP, RFC, BIP docs and generates AI summaries.

        Frequency: Monthly (norms don't change often)
        """
        self.log_step(0, "REFRESH NORMS DOCUMENTATION")

        try:
            from src.automation.norm_doc_scraper import NormDocScraper

            scraper = NormDocScraper()
            norms = scraper.load_norms(access_type='G', limit=limit)

            if not norms:
                self.log("No norms to refresh (all have documentation)")
                return

            self.log(f"Found {len(norms)} norms needing documentation refresh")

            updated = 0
            for i, norm in enumerate(norms):
                if norm.get('official_doc_summary'):
                    continue  # Already has summary

                self.log(f"[{i+1}/{len(norms)}] Processing {norm['code']}: {norm['title'][:50]}...")

                try:
                    result = scraper.process_norm(norm)
                    if result:
                        updated += 1
                        self.log(f"   Updated: {norm['code']}")
                except Exception as e:
                    self.log(f"   Error: {e}", 'ERROR')
                    self.stats['errors'].append(f"Norm {norm['code']}: {e}")

                time.sleep(1)  # Rate limiting

            self.stats['norms_updated'] = updated
            self.log(f"Norms updated: {updated}/{len(norms)}")

        except ImportError:
            self.log("norm_doc_scraper not available, skipping", 'WARN')
        except Exception as e:
            self.log(f"Error in step0: {e}", 'ERROR')
            self.stats['errors'].append(f"Step 0: {e}")

    # =========================================================================
    # STEP 1: REFRESH PRODUCTS (Weekly)
    # =========================================================================

    def step1_refresh_products(self, limit: int = None, force: bool = False):
        """
        Refresh product data by scraping official websites.
        Updates: scraped_content, specs, doc_urls

        Frequency: Weekly (products update their sites occasionally)
        """
        self.log_step(1, "REFRESH PRODUCTS (SCRAPING)")

        try:
            from src.core.scraper import WebScraper

            scraper = WebScraper(use_cache=not force)

            # Get products that need refresh (no recent scrape)
            query = f"{SUPABASE_URL}/rest/v1/products?select=id,name,slug,url,specs"
            if not force:
                # Only products not scraped in last 7 days
                # Note: We check cache internally, but this filters by updated_at
                week_ago = (datetime.now() - timedelta(days=7)).isoformat()
                query += f"&or=(updated_at.is.null,updated_at.lt.{week_ago})"

            if limit:
                query += f"&limit={limit}"

            r = requests.get(query, headers=self.headers)
            products = r.json() if r.status_code == 200 else []

            if not products:
                self.log("No products need scraping refresh")
                return

            self.log(f"Found {len(products)} products to refresh")

            scraped = 0
            for i, product in enumerate(products):
                self.log(f"[{i+1}/{len(products)}] Scraping {product['name']}...")

                try:
                    content = scraper.scrape_product(product)
                    if content and len(content) > 100:
                        # Update product specs with scraped content
                        specs = product.get('specs') or {}
                        specs['scraped_content'] = content[:50000]  # Limit size
                        specs['last_scraped'] = datetime.now().isoformat()

                        # Save to DB
                        update_url = f"{SUPABASE_URL}/rest/v1/products?id=eq.{product['id']}"
                        requests.patch(
                            update_url,
                            headers=self.headers,
                            json={'specs': specs, 'updated_at': datetime.now().isoformat()}
                        )
                        scraped += 1
                        self.log(f"   Scraped: {len(content)} chars")

                except Exception as e:
                    self.log(f"   Error: {e}", 'ERROR')
                    self.stats['errors'].append(f"Product {product['slug']}: {e}")

                time.sleep(0.5)  # Rate limiting

            self.stats['products_scraped'] = scraped
            self.log(f"Products scraped: {scraped}/{len(products)}")

        except Exception as e:
            self.log(f"Error in step1: {e}", 'ERROR')
            self.stats['errors'].append(f"Step 1: {e}")

    # =========================================================================
    # STEP 1b: REFRESH PRICES (Daily)
    # =========================================================================

    def step1b_refresh_prices(self, limit: int = None, force: bool = False):
        """
        Refresh product prices from various sources.

        Frequency: Daily (prices change frequently)
        """
        self.log_step("1b", "REFRESH PRICES")

        try:
            from src.automation.price_updater import PriceUpdater

            updater = PriceUpdater()
            updated = updater.run(limit=limit, force=force, dry_run=False)

            self.stats['prices_updated'] = updated
            self.log(f"Prices updated: {updated}")

        except ImportError:
            self.log("price_updater not available, skipping", 'WARN')
        except Exception as e:
            self.log(f"Error in step1b: {e}", 'ERROR')
            self.stats['errors'].append(f"Step 1b: {e}")

    # =========================================================================
    # STEP 2: CLASSIFY PRODUCT TYPES (On-demand)
    # =========================================================================

    def step2_classify_types(self, limit: int = None):
        """
        Classify products that don't have a type assigned.

        Frequency: On-demand (when new products are added)
        """
        self.log_step(2, "CLASSIFY PRODUCT TYPES")

        try:
            # Find products without type
            query = f"{SUPABASE_URL}/rest/v1/products?type_id=is.null&select=id,name,slug,url"
            if limit:
                query += f"&limit={limit}"

            r = requests.get(query, headers=self.headers)
            products_without_type = r.json() if r.status_code == 200 else []

            if not products_without_type:
                self.log("All products have types assigned")
                return

            self.log(f"Found {len(products_without_type)} products without type")

            from src.automation.handlers.classify_handler import handle_classify_type
            from src.core.database import Database

            db = Database()

            classified = 0
            for i, product in enumerate(products_without_type):
                self.log(f"[{i+1}/{len(products_without_type)}] Classifying {product['name']}...")

                try:
                    # Create a mock task for the handler
                    task = {'payload': {'product_id': product['id']}}
                    result = handle_classify_type(db, task, lambda *args: None)

                    if result:
                        classified += 1
                        self.log(f"   Classified: {result.get('type_code', 'unknown')}")

                except Exception as e:
                    self.log(f"   Error: {e}", 'ERROR')
                    self.stats['errors'].append(f"Classify {product['slug']}: {e}")

                time.sleep(1)

            self.stats['types_classified'] = classified
            self.log(f"Types classified: {classified}/{len(products_without_type)}")

        except Exception as e:
            self.log(f"Error in step2: {e}", 'ERROR')
            self.stats['errors'].append(f"Step 2: {e}")

    # =========================================================================
    # STEP 3: GENERATE APPLICABILITY (On-demand)
    # =========================================================================

    def step3_applicability(self, force: bool = False):
        """
        Generate norm applicability matrix (Type x Norm → TRUE/FALSE).

        Frequency: On-demand (when new types or norms are added)
        """
        self.log_step(3, "GENERATE APPLICABILITY")

        try:
            # Check if applicability needs regeneration
            r = requests.get(
                f"{SUPABASE_URL}/rest/v1/norm_applicability?select=id&limit=1",
                headers=self.headers
            )
            existing = r.json() if r.status_code == 200 else []

            if existing and not force:
                # Count existing
                r = requests.get(
                    f"{SUPABASE_URL}/rest/v1/norm_applicability?select=id",
                    headers={**self.headers, 'Prefer': 'count=exact'}
                )
                count = int(r.headers.get('content-range', '0-0/0').split('/')[-1])
                self.log(f"Applicability exists: {count} rules (use --force to regenerate)")
                return

            from src.core.applicability_generator import ApplicabilityGenerator

            generator = ApplicabilityGenerator()
            generator.run()

            # Count after generation
            r = requests.get(
                f"{SUPABASE_URL}/rest/v1/norm_applicability?select=id",
                headers={**self.headers, 'Prefer': 'count=exact'}
            )
            count = int(r.headers.get('content-range', '0-0/0').split('/')[-1])
            self.stats['applicability_generated'] = count

            self.log(f"Applicability generated: {count} rules")

        except Exception as e:
            self.log(f"Error in step3: {e}", 'ERROR')
            self.stats['errors'].append(f"Step 3: {e}")

    # =========================================================================
    # STEP 4: EVALUATE PRODUCTS (Weekly + On-demand)
    # =========================================================================

    def step4_evaluations(self, limit: int = None, force: bool = False, product_slug: str = None):
        """
        Run AI evaluations for products.

        Frequency: Weekly (after product scrape) + on-demand
        """
        self.log_step(4, "PRODUCT EVALUATIONS")

        try:
            from src.core.smart_evaluator import SmartEvaluator

            evaluator = SmartEvaluator()
            evaluator.load_data()

            # Get products to evaluate
            if product_slug:
                query = f"{SUPABASE_URL}/rest/v1/products?slug=eq.{product_slug}&select=*"
            else:
                query = f"{SUPABASE_URL}/rest/v1/products?select=*&order=name"

            r = requests.get(query, headers=self.headers)
            products = r.json() if r.status_code == 200 else []

            if not force:
                # Filter out already evaluated products
                r = requests.get(
                    f"{SUPABASE_URL}/rest/v1/evaluations?select=product_id",
                    headers=self.headers
                )
                evals = r.json() if r.status_code == 200 else []
                evaluated_ids = set(e['product_id'] for e in evals)
                products = [p for p in products if p['id'] not in evaluated_ids]

            if limit:
                products = products[:limit]

            if not products:
                self.log("No products need evaluation")
                return

            self.log(f"Evaluating {len(products)} products...")

            evaluated = 0
            for i, product in enumerate(products):
                self.log(f"[{i+1}/{len(products)}] Evaluating {product['name']}...")

                try:
                    result = evaluator.evaluate_product(product, enable_expert_review=False)

                    if result and len(result) == 2:
                        evaluations, applicable_norms = result
                        if evaluations:
                            evaluator.save_evaluations(product['id'], evaluations, applicable_norms)
                            evaluated += 1
                            self.log(f"   Saved: {len(evaluations)} evaluations")

                except Exception as e:
                    self.log(f"   Error: {e}", 'ERROR')
                    self.stats['errors'].append(f"Evaluate {product['slug']}: {e}")

                time.sleep(0.5)

            self.stats['products_evaluated'] = evaluated
            self.log(f"Products evaluated: {evaluated}/{len(products)}")

        except Exception as e:
            self.log(f"Error in step4: {e}", 'ERROR')
            self.stats['errors'].append(f"Step 4: {e}")

    # =========================================================================
    # STEP 5: SCORES (Automatic via SQL Trigger)
    # =========================================================================

    def step5_verify_scores(self):
        """
        Verify that scores are up-to-date.
        Scores are calculated automatically by SQL trigger, but we can verify.
        """
        self.log_step(5, "VERIFY SCORES (SQL Trigger)")

        try:
            # Check products with evaluations but no scores
            query = """
                SELECT DISTINCT e.product_id
                FROM evaluations e
                LEFT JOIN safe_scoring_results s ON s.product_id = e.product_id
                WHERE s.product_id IS NULL
            """
            # Use RPC for complex query
            r = requests.post(
                f"{SUPABASE_URL}/rest/v1/rpc/get_products_without_scores",
                headers=self.headers,
                json={}
            )

            if r.status_code == 200:
                missing = r.json()
                if missing:
                    self.log(f"WARNING: {len(missing)} products have evaluations but no scores", 'WARN')
                    # Trigger recalculation
                    for product_id in missing[:10]:  # Limit to 10
                        requests.post(
                            f"{SUPABASE_URL}/rest/v1/rpc/calculate_product_scores",
                            headers=self.headers,
                            json={'p_product_id': product_id}
                        )
                    self.log(f"Triggered recalculation for {min(len(missing), 10)} products")
                else:
                    self.log("All products with evaluations have scores")
            else:
                # RPC doesn't exist, just count
                r = requests.get(
                    f"{SUPABASE_URL}/rest/v1/safe_scoring_results?select=product_id",
                    headers={**self.headers, 'Prefer': 'count=exact'}
                )
                count = int(r.headers.get('content-range', '0-0/0').split('/')[-1])
                self.log(f"Products with scores: {count}")

        except Exception as e:
            self.log(f"Error in step5: {e}", 'ERROR')

    # =========================================================================
    # MAIN RUN METHOD
    # =========================================================================

    def run(self, step: str = 'all', limit: int = None, force: bool = False, product_slug: str = None):
        """
        Run the data refresh pipeline.

        Args:
            step: Which step(s) to run: 'all', 'norms', 'products', 'prices', 'types', 'applicability', 'evaluations'
            limit: Limit number of items to process
            force: Force refresh even if data exists
            product_slug: Process a single product
        """
        print("""
╔══════════════════════════════════════════════════════════════════════╗
║                                                                      ║
║     SAFESCORING.IO - DATA REFRESH PIPELINE                           ║
║                                                                      ║
║     Step 0: Norms Documentation (monthly)                            ║
║     Step 1: Products Scraping (weekly)                               ║
║     Step 1b: Prices Update (daily)                                   ║
║     Step 2: Type Classification (on-demand)                          ║
║     Step 3: Applicability Matrix (on-demand)                         ║
║     Step 4: AI Evaluations (weekly)                                  ║
║     Step 5: Scores (auto via SQL trigger)                            ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
""")

        self.log(f"Mode: {step}, Limit: {limit}, Force: {force}")

        if product_slug:
            # Single product mode - only run relevant steps
            self.log(f"Single product mode: {product_slug}")
            self.step1_refresh_products(limit=1, force=True)  # Scrape this product
            self.step4_evaluations(product_slug=product_slug, force=True)
            self.step5_verify_scores()
        else:
            # Run requested steps
            if step in ['all', 'norms']:
                self.step0_refresh_norms(limit=limit)

            if step in ['all', 'products']:
                self.step1_refresh_products(limit=limit, force=force)

            if step in ['all', 'prices']:
                self.step1b_refresh_prices(limit=limit, force=force)

            if step in ['all', 'types']:
                self.step2_classify_types(limit=limit)

            if step in ['all', 'applicability']:
                self.step3_applicability(force=force)

            if step in ['all', 'evaluations']:
                self.step4_evaluations(limit=limit, force=force)

            if step == 'all':
                self.step5_verify_scores()

        # Print summary
        self.print_summary()

    def print_summary(self):
        """Print final summary."""
        duration = time.time() - self.stats['start_time']
        print(f"""
{'='*60}
   PIPELINE COMPLETE
{'='*60}

   Duration: {duration:.1f} seconds

   Norms updated:       {self.stats['norms_updated']}
   Products scraped:    {self.stats['products_scraped']}
   Prices updated:      {self.stats['prices_updated']}
   Types classified:    {self.stats['types_classified']}
   Applicability rules: {self.stats['applicability_generated']}
   Products evaluated:  {self.stats['products_evaluated']}

   Errors: {len(self.stats['errors'])}
""")
        if self.stats['errors']:
            print("   Error details:")
            for err in self.stats['errors'][:10]:
                print(f"      - {err}")
            if len(self.stats['errors']) > 10:
                print(f"      ... and {len(self.stats['errors']) - 10} more")

        print('='*60)


def main():
    parser = argparse.ArgumentParser(description='SafeScoring Data Refresh Pipeline')
    parser.add_argument('--step', choices=['all', 'norms', 'products', 'prices', 'types', 'applicability', 'evaluations'],
                        default='all', help='Which step to run')
    parser.add_argument('--limit', type=int, help='Limit number of items to process')
    parser.add_argument('--force', action='store_true', help='Force refresh even if data exists')
    parser.add_argument('--product', type=str, help='Process a single product by slug')
    parser.add_argument('--quiet', action='store_true', help='Reduce output verbosity')

    args = parser.parse_args()

    pipeline = DataRefreshPipeline(verbose=not args.quiet)
    pipeline.run(
        step=args.step,
        limit=args.limit,
        force=args.force,
        product_slug=args.product
    )


if __name__ == '__main__':
    main()
