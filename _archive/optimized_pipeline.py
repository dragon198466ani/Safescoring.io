#!/usr/bin/env python3
"""
SAFESCORING.IO - OPTIMIZED EVALUATION PIPELINE
===============================================

Script optimisé sans duplication - utilise les modules core existants:
- src/core/api_provider.py     → AIProvider avec fallback automatique
- src/core/scraper.py          → WebScraper centralisé
- src/core/config.py           → Configuration centralisée
- SQL trigger                  → Calcul automatique des scores

Workflow complet:
1. Vérification des types de produits
2. Génération de l'applicabilité par type
3. Évaluation de chaque norme (YES/NO/N/A/TBD)
4. Calcul automatique des scores (trigger SQL)

Usage:
    python -m src.automation.optimized_pipeline --mode test        # 1 produit
    python -m src.automation.optimized_pipeline --mode partial     # 10 produits
    python -m src.automation.optimized_pipeline --mode full        # Tous
    python -m src.automation.optimized_pipeline --product <slug>   # 1 produit spécifique
    python -m src.automation.optimized_pipeline --force            # Force tout recalculer

Auteur: SafeScoring.io
"""

import os
import sys
import re
import argparse
import time
import requests
from datetime import datetime
from pathlib import Path
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from dotenv import load_dotenv
load_dotenv()

# Import core modules - NO DUPLICATION
from src.core.config import SUPABASE_URL, SUPABASE_KEY
from src.core.api_provider import AIProvider, parse_evaluation_response, parse_applicability_response
from src.core.scraper import WebScraper


# =============================================================================
# CENTRALIZED SUPABASE CLIENT (Single Implementation)
# =============================================================================

class SupabaseClient:
    """Unified Supabase client with retry logic."""

    def __init__(self):
        self.url = SUPABASE_URL
        self.headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}',
            'Content-Type': 'application/json'
        }

        # Session with retry
        self.session = requests.Session()
        retry = Retry(total=3, backoff_factor=1, status_forcelist=[429, 500, 502, 503, 504])
        self.session.mount('https://', HTTPAdapter(max_retries=retry))

    def get(self, table, params=''):
        """GET request to Supabase."""
        r = self.session.get(f'{self.url}/rest/v1/{table}?{params}', headers=self.headers, timeout=30)
        return r.json() if r.status_code == 200 else []

    def upsert(self, table, data, conflict_columns=None):
        """UPSERT (insert or update on conflict)."""
        headers = {**self.headers, 'Prefer': 'resolution=merge-duplicates'}
        url = f'{self.url}/rest/v1/{table}'
        if conflict_columns:
            url += f'?on_conflict={conflict_columns}'
        r = self.session.post(url, headers=headers, json=data, timeout=60)
        if r.status_code not in [200, 201]:
            print(f"      [DB ERROR] {table}: {r.status_code} - {r.text[:200]}")
            return False
        return True

    def get_products(self, limit=None):
        """Get active products."""
        params = 'select=*&order=name'
        if limit:
            params += f'&limit={limit}'
        return self.get('products', params)

    def get_product_by_slug(self, slug):
        """Get single product by slug."""
        data = self.get('products', f'slug=eq.{slug}&limit=1')
        return data[0] if data else None

    def get_product_types(self):
        """Get all product types."""
        return self.get('product_types', 'select=*')

    def get_norms(self):
        """Get all norms."""
        return self.get('norms', 'select=id,code,title,pillar,description')

    def get_product_type_mapping(self, product_id):
        """Get types for a product."""
        return self.get('product_type_mapping', f'product_id=eq.{product_id}&select=type_id')

    def get_norm_applicability(self, type_id):
        """Get applicable norms for a type."""
        return self.get('norm_applicability', f'type_id=eq.{type_id}&is_applicable=eq.true&select=norm_id')

    def get_evaluations_count(self, product_id):
        """Check if product has evaluations."""
        data = self.get('evaluations', f'product_id=eq.{product_id}&limit=1')
        return len(data) > 0

    def delete_evaluations(self, product_id):
        """Delete all evaluations for a product."""
        r = self.session.delete(
            f'{self.url}/rest/v1/evaluations?product_id=eq.{product_id}',
            headers=self.headers,
            timeout=30
        )
        return r.status_code in [200, 204]

    def save_applicability(self, type_id, applicability_dict):
        """Save norm applicability rules."""
        records = [
            {'type_id': type_id, 'norm_id': norm_id, 'is_applicable': is_applicable}
            for norm_id, is_applicable in applicability_dict.items()
        ]
        return self.upsert('norm_applicability', records) if records else True

    def _find_norm_by_code(self, code, norms_by_code):
        """Find norm by code, trying multiple formats (A4 -> A04, A004)."""
        # Direct match
        if code in norms_by_code:
            return norms_by_code[code]

        # Try to normalize: extract letter and number
        import re
        match = re.match(r'^([SAFE])(\d+)$', code, re.IGNORECASE)
        if match:
            letter = match.group(1).upper()
            number = match.group(2)

            # Try zero-padded versions
            for padding in [2, 3]:
                padded_code = f"{letter}{number.zfill(padding)}"
                if padded_code in norms_by_code:
                    return norms_by_code[padded_code]

            # Try without leading zeros
            stripped_code = f"{letter}{number.lstrip('0') or '0'}"
            if stripped_code in norms_by_code:
                return norms_by_code[stripped_code]

        return None

    def save_evaluations(self, product_id, evaluations, norms_by_code):
        """Save product evaluations in batches."""
        records = []
        missing_codes = []

        for code, eval_data in evaluations.items():
            norm = self._find_norm_by_code(code, norms_by_code)
            if norm:
                result, reason = eval_data if isinstance(eval_data, tuple) else (eval_data, '')
                records.append({
                    'product_id': product_id,
                    'norm_id': norm['id'],
                    'result': result,
                    'why_this_result': reason[:500] if reason else None,
                    'evaluated_by': 'optimized_pipeline',
                    'evaluation_date': datetime.now().strftime('%Y-%m-%d')
                })
            else:
                missing_codes.append(code)

        if missing_codes and len(missing_codes) < 10:
            print(f"      [WARN] Codes not found: {missing_codes[:5]}")

        if not records:
            print(f"      [WARN] No records to save!")
            return False

        # Save in batches of 100
        batch_size = 100
        success_count = 0

        for i in range(0, len(records), batch_size):
            batch = records[i:i+batch_size]
            if self.upsert('evaluations', batch):
                success_count += len(batch)
            else:
                print(f"      [ERROR] Failed batch {i//batch_size + 1}")

        return success_count > 0


# =============================================================================
# PROMPTS (Centralized - No Duplication)
# =============================================================================

APPLICABILITY_PROMPT = """Tu es un expert en sécurité crypto. Détermine si chaque norme est APPLICABLE à ce type de produit.

TYPE DE PRODUIT: {type_name} ({type_code})
Catégorie: {category}
Est un produit hardware: {is_hardware}
Description: {description}

NORMES À ÉVALUER:
{norms_text}

RÈGLES STRICTES:
- OUI = La norme est techniquement applicable à ce type de produit
- NON = La norme n'est PAS applicable (incompatibilité technique)

⚠️ RÈGLES HARDWARE vs SOFTWARE:
- Si is_hardware=False (produit LOGICIEL/SOFTWARE):
  → NON pour TOUTES les normes physiques (IP67, température, chocs, flammes, sel, pression, MIL-STD, etc.)
  → NON pour TOUTES les normes de durabilité physique (warranty hardware, hermetic seals, etc.)
  → OUI uniquement pour les normes SOFTWARE (uptime, audits, patches, API, etc.)

- Si is_hardware=True (produit HARDWARE):
  → Évaluer normalement les normes physiques et logicielles

FORMAT (une ligne par norme, TOUTES les normes):
CODE: OUI ou NON

Évalue:"""


EVALUATION_PROMPT = """Évalue {norm_count} normes de sécurité pour ce produit crypto.

PRODUIT: {product_name} ({product_type})

DOCUMENTATION DU PRODUIT:
{website_content}

NORMES ({norm_count} à évaluer - RÉPONDS À TOUTES):
{norms_text}

RÉSULTATS (YES/NO/TBD pour chaque norme):
- YES = Le produit implémente cette norme (preuve trouvée)
- NO = Le produit N'implémente PAS cette norme
- TBD = Impossible à déterminer

⚠️ IMPORTANT: Tu DOIS évaluer les {norm_count} normes ci-dessus. Format strict:
{codes_template}

Évaluations (complète TOUTES les lignes):"""


# =============================================================================
# OPTIMIZED PIPELINE
# =============================================================================

class OptimizedPipeline:
    """Pipeline d'évaluation optimisé sans duplication."""

    def __init__(self):
        self.db = SupabaseClient()
        self.ai = AIProvider()
        self.scraper = WebScraper()
        self.stats = {
            'start_time': time.time(),
            'products_processed': 0,
            'evaluations_saved': 0,
            'applicability_rules': 0,
            'errors': []
        }

        # Cache
        self.norms = []
        self.norms_by_code = {}
        self.norms_by_id = {}
        self.product_types = {}
        self.applicability_cache = {}  # {type_id: [norm_ids]}

    def load_data(self):
        """Load reference data."""
        print("\n[LOAD] Chargement des données...")

        # Norms
        self.norms = self.db.get_norms()
        self.norms_by_code = {n['code']: n for n in self.norms}
        self.norms_by_id = {n['id']: n for n in self.norms}
        print(f"   {len(self.norms)} normes")

        # Product types
        types_list = self.db.get_product_types()
        self.product_types = {t['id']: t for t in types_list}
        print(f"   {len(self.product_types)} types de produits")

        # Applicability cache
        for type_id in self.product_types:
            applicable = self.db.get_norm_applicability(type_id)
            self.applicability_cache[type_id] = [a['norm_id'] for a in applicable]
        print(f"   Applicabilité chargée")

    def get_product_types_ids(self, product):
        """Get type IDs for a product."""
        # Try mapping table first
        mapping = self.db.get_product_type_mapping(product['id'])
        if mapping:
            return [m['type_id'] for m in mapping]

        # Fallback to type_id field
        if product.get('type_id'):
            return [product['type_id']]

        return []

    def get_applicable_norms(self, type_ids):
        """Get all applicable norms for a list of types (union)."""
        applicable_norm_ids = set()
        for type_id in type_ids:
            applicable_norm_ids.update(self.applicability_cache.get(type_id, []))

        return [self.norms_by_id[nid] for nid in applicable_norm_ids if nid in self.norms_by_id]

    # =========================================================================
    # STEP 1: Generate Applicability (if needed)
    # =========================================================================

    def generate_applicability_for_type(self, type_id):
        """Generate applicability rules for a single type."""
        type_info = self.product_types.get(type_id)
        if not type_info:
            return {}

        print(f"\n   [APPLICABILITY] {type_info['name']}...")

        # Build prompt
        norms_text = "\n".join([
            f"- {n['code']}: {n['title']}" + (f" ({n.get('description', '')[:60]})" if n.get('description') else "")
            for n in self.norms
        ])

        prompt = APPLICABILITY_PROMPT.format(
            type_name=type_info.get('name', 'Unknown'),
            type_code=type_info.get('code', ''),
            category=type_info.get('category', 'N/A'),
            is_hardware=type_info.get('is_hardware', False),
            description=type_info.get('definition') or type_info.get('description', 'No description'),
            norms_text=norms_text
        )

        # Call AI
        result = self.ai.call(prompt)
        if not result:
            print(f"      AI call failed")
            return {}

        # Parse response
        applicability = parse_applicability_response(result, self.norms_by_code)

        # Save to database
        self.db.save_applicability(type_id, applicability)

        # Update cache
        self.applicability_cache[type_id] = [nid for nid, is_app in applicability.items() if is_app]

        applicable_count = sum(1 for v in applicability.values() if v)
        print(f"      {applicable_count} normes applicables")
        self.stats['applicability_rules'] += len(applicability)

        return applicability

    def ensure_applicability(self, type_ids, force=False):
        """Ensure all types have applicability rules."""
        for type_id in type_ids:
            if force or not self.applicability_cache.get(type_id):
                self.generate_applicability_for_type(type_id)
                time.sleep(1)  # Rate limiting

    # =========================================================================
    # STEP 2: Evaluate Product
    # =========================================================================

    def evaluate_product(self, product, force=False):
        """Evaluate a single product."""
        print(f"\n[EVAL] {product['name']}...")

        # Check if already evaluated
        has_evaluations = self.db.get_evaluations_count(product['id'])
        if not force and has_evaluations:
            print(f"   Déjà évalué, skip (use --force)")
            return False

        # Delete existing evaluations if force mode
        if force and has_evaluations:
            print(f"   Suppression des anciennes évaluations...")
            self.db.delete_evaluations(product['id'])

        # Get product types
        type_ids = self.get_product_types_ids(product)
        if not type_ids:
            print(f"   Pas de type assigné!")
            return False

        type_names = [self.product_types.get(tid, {}).get('name', '?') for tid in type_ids]
        print(f"   Types: {', '.join(type_names)}")

        # Ensure applicability exists
        self.ensure_applicability(type_ids)

        # Get applicable norms
        applicable_norms = self.get_applicable_norms(type_ids)
        if not applicable_norms:
            print(f"   Aucune norme applicable!")
            return False

        print(f"   {len(applicable_norms)} normes applicables")

        # Scrape product website
        website_content = ""
        if product.get('url'):
            print(f"   Scraping {product['url'][:50]}...")
            try:
                website_content = self.scraper.scrape_product(product) or ""
            except Exception as e:
                print(f"   Scraping error: {e}")

        # Evaluate by pillar (in batches of 25 norms max for better AI completion)
        all_evaluations = {}
        BATCH_SIZE = 25

        for pillar in ['S', 'A', 'F', 'E']:
            pillar_norms = [n for n in applicable_norms if n['pillar'] == pillar]
            if not pillar_norms:
                continue

            print(f"   Pillar {pillar}: {len(pillar_norms)} normes...")
            pillar_yes = 0
            pillar_no = 0

            # Split into batches
            for batch_idx in range(0, len(pillar_norms), BATCH_SIZE):
                batch_norms = pillar_norms[batch_idx:batch_idx + BATCH_SIZE]
                batch_num = batch_idx // BATCH_SIZE + 1
                total_batches = (len(pillar_norms) + BATCH_SIZE - 1) // BATCH_SIZE

                if total_batches > 1:
                    print(f"      Batch {batch_num}/{total_batches} ({len(batch_norms)} normes)...")

                # Build prompt with full norm definitions
                norms_text = "\n".join([
                    f"- {n['code']}: {n.get('title', '')} - {n.get('description', '')[:100]}"
                    for n in batch_norms
                ])

                # Create template showing expected format
                codes_template = "\n".join([f"{n['code']}: [YES/NO/TBD]" for n in batch_norms])

                prompt = EVALUATION_PROMPT.format(
                    product_name=product['name'],
                    product_type=', '.join(type_names),
                    website_content=website_content[:2500] if website_content else "Pas de documentation disponible",
                    norms_text=norms_text,
                    norm_count=len(batch_norms),
                    codes_template=codes_template
                )

                # Call AI
                result = self.ai.call(prompt)
                if not result:
                    print(f"      AI call failed for pillar {pillar} batch {batch_num}")
                    continue

                # Parse response
                raw_evals = parse_evaluation_response(result)

                # CRITICAL: Filter to only codes we actually sent (prevent AI hallucination)
                batch_codes = {n['code'] for n in batch_norms}
                # Also include normalized versions (A4 for A04, etc.)
                batch_codes_normalized = set()
                for code in batch_codes:
                    batch_codes_normalized.add(code)
                    # Add stripped version (A04 -> A4)
                    m = re.match(r'^([SAFE])0*(\d+)$', code, re.IGNORECASE)
                    if m:
                        batch_codes_normalized.add(f"{m.group(1).upper()}{m.group(2)}")

                batch_evals = {}
                for code, eval_data in raw_evals.items():
                    # Check if code matches (with normalization)
                    if code in batch_codes_normalized:
                        batch_evals[code] = eval_data
                    else:
                        # Try to find matching code with different padding
                        m = re.match(r'^([SAFE])(\d+)$', code, re.IGNORECASE)
                        if m:
                            letter = m.group(1).upper()
                            number = m.group(2)
                            padded = f"{letter}{number.zfill(2)}"
                            if padded in batch_codes:
                                batch_evals[code] = eval_data

                # Debug: show parse rate
                if len(batch_evals) < len(batch_norms) * 0.5:
                    print(f"      [WARN] Low parse rate: {len(batch_evals)}/{len(batch_norms)} normes")

                all_evaluations.update(batch_evals)

                # Count for stats
                pillar_yes += sum(1 for v in batch_evals.values() if v[0] in ['YES', 'YESp'])
                pillar_no += sum(1 for v in batch_evals.values() if v[0] == 'NO')

                time.sleep(0.5)  # Rate limiting between batches

            print(f"      {pillar_yes} YES, {pillar_no} NO")

        # Save evaluations
        if True:  # Always try to save, even if no AI results
            # Build complete evaluation dict
            applicable_norm_ids = {n['id'] for n in applicable_norms}
            applicable_codes = {n['code'] for n in applicable_norms}

            # Add TBD for applicable norms not evaluated by AI
            for norm in applicable_norms:
                if norm['code'] not in all_evaluations:
                    # Check if AI returned with different format (A4 vs A04)
                    found = False
                    for ai_code in all_evaluations.keys():
                        if self.db._find_norm_by_code(ai_code, {norm['code']: norm}):
                            found = True
                            break
                    if not found:
                        all_evaluations[norm['code']] = ('TBD', 'Non évalué par AI')

            # Add N/A for non-applicable norms
            for norm in self.norms:
                if norm['id'] not in applicable_norm_ids and norm['code'] not in all_evaluations:
                    all_evaluations[norm['code']] = ('N/A', 'Non applicable à ce type de produit')

            self.db.save_evaluations(product['id'], all_evaluations, self.norms_by_code)
            self.stats['evaluations_saved'] += len(all_evaluations)
            print(f"   {len(all_evaluations)} évaluations sauvegardées")

            # Score is calculated automatically by SQL trigger!
            print(f"   Score recalculé automatiquement (trigger SQL)")

        self.stats['products_processed'] += 1
        return True

    # =========================================================================
    # MAIN RUN
    # =========================================================================

    def run(self, mode='test', product_slug=None, force=False):
        """Run the optimized pipeline."""
        print("""
╔══════════════════════════════════════════════════════════════════════╗
║                                                                      ║
║     SAFESCORING.IO - OPTIMIZED PIPELINE                              ║
║                                                                      ║
║     Utilise les modules core (pas de duplication)                    ║
║     Score auto-calculé par trigger SQL                               ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
""")

        # Load reference data
        self.load_data()

        # Get products to process
        if product_slug:
            product = self.db.get_product_by_slug(product_slug)
            if not product:
                print(f"ERROR: Product '{product_slug}' not found!")
                return
            products = [product]
            print(f"\nMode: SINGLE ({product_slug})")
        else:
            all_products = self.db.get_products()

            if mode == 'test':
                products = all_products[:1]
                print(f"\nMode: TEST (1 produit)")
            elif mode == 'partial':
                products = all_products[:10]
                print(f"\nMode: PARTIAL (10 produits)")
            else:
                products = all_products
                print(f"\nMode: FULL ({len(products)} produits)")

        print(f"Produits à traiter: {len(products)}")
        if force:
            print("Force mode: ON (réévaluation même si déjà fait)")

        # Process each product
        for i, product in enumerate(products):
            print(f"\n{'='*60}")
            print(f"[{i+1}/{len(products)}] {product['name']}")
            print('='*60)

            try:
                self.evaluate_product(product, force=force)
            except Exception as e:
                print(f"   ERROR: {e}")
                self.stats['errors'].append(f"{product['name']}: {e}")

            time.sleep(1)  # Rate limiting between products

        # Print summary
        duration = time.time() - self.stats['start_time']
        print(f"""
{'='*60}
   PIPELINE TERMINÉ
{'='*60}

   Durée: {duration:.1f} secondes
   Produits traités: {self.stats['products_processed']}
   Évaluations sauvegardées: {self.stats['evaluations_saved']}
   Règles d'applicabilité: {self.stats['applicability_rules']}
   Erreurs: {len(self.stats['errors'])}

{'='*60}
""")

        if self.stats['errors']:
            print("Erreurs rencontrées:")
            for err in self.stats['errors'][:5]:
                print(f"   - {err}")


def main():
    parser = argparse.ArgumentParser(description='SafeScoring Optimized Pipeline')
    parser.add_argument('--mode', choices=['test', 'partial', 'full'], default='test',
                        help='Mode: test (1), partial (10), full (all)')
    parser.add_argument('--product', type=str, help='Évaluer un seul produit par slug')
    parser.add_argument('--force', action='store_true',
                        help='Forcer la réévaluation même si déjà fait')

    args = parser.parse_args()

    pipeline = OptimizedPipeline()
    pipeline.run(
        mode=args.mode,
        product_slug=args.product,
        force=args.force
    )


if __name__ == '__main__':
    main()
