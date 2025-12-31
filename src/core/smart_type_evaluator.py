#!/usr/bin/env python3
"""
SAFESCORING.IO - Smart Type Evaluator
Évalue et vérifie les types de produits en utilisant l'IA et le scraping web.
Même architecture que smart_evaluator.py.

Usage:
    python smart_type_evaluator.py --product "Ledger Nano X"
    python smart_type_evaluator.py --batch 20 --start 0
    python smart_type_evaluator.py --all --apply
"""

import requests
import sys
import json
import time
import re
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Optional, Tuple

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.config import SUPABASE_URL, SUPABASE_HEADERS
from core.api_provider import AIProvider
from core.scraper import WebScraper


class SmartTypeEvaluator:
    """
    Intelligent type evaluator using AI and web scraping.
    Determines correct product types based on Supabase definitions.
    """

    def __init__(self):
        self.ai_provider = AIProvider()
        self.scraper = WebScraper()

        # Data from Supabase
        self.products = []
        self.product_types = {}  # {id: {code, name, description}}
        self.type_by_code = {}   # {code: id}
        self.current_mappings = {}  # {product_id: [{type_id, type_code, is_primary}]}

        # Results
        self.corrections = []
        self.verified = []

    def load_data(self):
        """Load all data from Supabase"""
        print("\n[LOAD] Chargement des données Supabase...")

        # Load product types with descriptions
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/product_types?select=id,code,name,name_fr,description&order=code",
            headers=SUPABASE_HEADERS
        )
        if r.status_code == 200:
            for t in r.json():
                self.product_types[t['id']] = t
                self.type_by_code[t['code']] = t['id']
            print(f"   ✓ {len(self.product_types)} types de produits")

        # Load products
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/products?select=id,name,slug,website&order=name",
            headers=SUPABASE_HEADERS
        )
        if r.status_code == 200:
            self.products = r.json()
            print(f"   ✓ {len(self.products)} produits")

        # Load current type mappings
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/product_type_mapping?select=product_id,type_id,is_primary",
            headers=SUPABASE_HEADERS
        )
        if r.status_code == 200:
            for m in r.json():
                pid = m['product_id']
                if pid not in self.current_mappings:
                    self.current_mappings[pid] = []
                type_info = self.product_types.get(m['type_id'], {})
                self.current_mappings[pid].append({
                    'type_id': m['type_id'],
                    'type_code': type_info.get('code', '?'),
                    'is_primary': m['is_primary']
                })
            print(f"   ✓ {len(self.current_mappings)} produits avec mappings")

    def build_type_definitions_prompt(self) -> str:
        """Build type definitions from Supabase for AI context"""
        definitions = "## DÉFINITIONS DES TYPES (depuis Supabase)\n\n"

        for type_id, t in sorted(self.product_types.items(), key=lambda x: x[1]['code']):
            definitions += f"### {t['code']}\n"
            definitions += f"**Nom:** {t.get('name', 'N/A')}\n"
            if t.get('description'):
                definitions += f"**Description:** {t['description']}\n"
            definitions += "\n"

        return definitions

    def get_system_prompt(self) -> str:
        """Build system prompt with type definitions"""
        type_defs = self.build_type_definitions_prompt()

        return f"""Tu es un expert en classification de produits crypto/blockchain.
Tu dois déterminer les types corrects pour chaque produit en te basant sur les définitions officielles.

{type_defs}

## RÈGLES DE CLASSIFICATION

### Règle 1: Maximum 3 types par produit
Sauf cas exceptionnels justifiés (ex: CEX avec card + staking)

### Règle 2: AC Phys - CRITÈRES STRICTS
Un produit a AC Phys SEULEMENT si:
- Duress PIN dédié (PIN qui ouvre un wallet leurre différent)
- Brick Me PIN (PIN qui détruit/reset le device)
- Hidden wallet HARDWARE avec PIN dédié
- Countdown to brick/reset

ATTENTION: Une simple passphrase (25e mot) NE SUFFIT PAS pour AC Phys!
Presque tous les hardware wallets supportent passphrase, c'est standard.

Exemples VALIDES pour AC Phys:
- Coldcard: Duress PIN + Brick Me PIN ✓
- Trezor: Passphrase avec PIN alternatif dédié ✓
- Keystone: Dummy wallet + Countdown to brick ✓
- Jade (Blockstream): Duress PIN ✓

Exemples NON VALIDES:
- Ledger: Passphrase seulement, pas de duress PIN hardware dédié ✗
- SeedSigner: Passphrase seulement ✗

### Règle 3: Wallet MultiPlatform vs SW Browser/Mobile
- Si disponible sur browser ET mobile → Wallet MultiPlatform (PAS les deux séparément)
- SW Browser = navigateur UNIQUEMENT
- SW Mobile = mobile UNIQUEMENT

### Règle 4: Card vs Card Non-Cust
- Card = CUSTODIAL (exchange/émetteur garde les fonds)
- Card Non-Cust = SELF-CUSTODY (utilisateur garde ses clés)

### Règle 5: DEX combinaisons
- DEX + Yield = si LP rewards significatifs
- DEX + Bridges = si cross-chain swaps natifs
- DEX + Derivatives = si perps/options

### Règle 6: Bkp Physical vs Bkp Digital
- Bkp Physical = métal, steel, titanium, papier
- Bkp Digital = cloud, encrypted backup service

## FORMAT DE RÉPONSE

Réponds UNIQUEMENT avec un JSON valide (pas de texte avant ou après):
```json
{{
    "product": "Nom du produit",
    "current_types": ["Type1", "Type2"],
    "recommended_types": ["Type1", "Type2"],
    "analysis": "Analyse factuelle du produit",
    "changes": {{
        "add": ["types à ajouter"],
        "remove": ["types à supprimer"],
        "reason": "Raison des changements"
    }},
    "ac_phys_analysis": {{
        "eligible": true/false,
        "features_found": ["duress PIN", "brick me", etc.],
        "reason": "Explication"
    }},
    "confidence": "high/medium/low"
}}
```
"""

    def get_product_current_types(self, product_id: int) -> List[str]:
        """Get current types for a product"""
        return [m['type_code'] for m in self.current_mappings.get(product_id, [])]

    def scrape_product(self, product: Dict) -> Optional[str]:
        """Scrape product website for information"""
        website = product.get('website', '')
        if not website:
            return None

        try:
            content = self.scraper.scrape_product(product, max_pages=5, max_chars=15000)
            return content
        except Exception as e:
            print(f"      [WARN] Scraping failed: {e}")
            return None

    def evaluate_product(self, product: Dict, web_content: Optional[str] = None) -> Optional[Dict]:
        """Evaluate a single product with AI"""
        product_name = product['name']
        current_types = self.get_product_current_types(product['id'])

        # Build user prompt
        user_prompt = f"""## PRODUIT À ANALYSER

**Nom:** {product_name}
**Site web:** {product.get('website', 'Non disponible')}
**Types actuels:** {', '.join(current_types) if current_types else 'Aucun'}

"""

        if web_content:
            # Limit content
            content_preview = web_content[:10000] if len(web_content) > 10000 else web_content
            user_prompt += f"""## CONTENU DU SITE (extrait)

{content_preview}

"""

        user_prompt += """## TÂCHE

Analyse ce produit et détermine ses types corrects selon les définitions officielles.
Sois particulièrement vigilant sur les critères AC Phys (duress PIN, brick me, etc.).
"""

        # Call AI
        system_prompt = self.get_system_prompt()

        try:
            response = self.ai_provider.call(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                max_tokens=1500
            )

            if response:
                # Extract JSON
                json_match = re.search(r'\{[\s\S]*\}', response)
                if json_match:
                    result = json.loads(json_match.group())
                    result['product_id'] = product['id']
                    result['product_name'] = product_name
                    result['current_types'] = current_types
                    return result
        except json.JSONDecodeError as e:
            print(f"      [ERROR] JSON parse failed: {e}")
        except Exception as e:
            print(f"      [ERROR] AI call failed: {e}")

        return None

    def analyze_result(self, result: Dict) -> Tuple[bool, Dict]:
        """Analyze AI result and determine if changes needed"""
        if not result:
            return False, {}

        current = set(result.get('current_types', []))
        recommended = set(result.get('recommended_types', []))

        to_add = recommended - current
        to_remove = current - recommended

        needs_change = bool(to_add or to_remove)

        summary = {
            'product_id': result.get('product_id'),
            'product_name': result.get('product_name'),
            'current': list(current),
            'recommended': list(recommended),
            'to_add': list(to_add),
            'to_remove': list(to_remove),
            'analysis': result.get('analysis', ''),
            'ac_phys_analysis': result.get('ac_phys_analysis', {}),
            'confidence': result.get('confidence', 'medium'),
            'change_reason': result.get('changes', {}).get('reason', '')
        }

        return needs_change, summary

    def evaluate_batch(self, products: List[Dict], scrape: bool = True, delay: float = 2.0) -> List[Dict]:
        """Evaluate a batch of products"""
        corrections = []

        for i, product in enumerate(products):
            print(f"\n[{i+1}/{len(products)}] {product['name']}")
            current_types = self.get_product_current_types(product['id'])
            print(f"      Types actuels: {', '.join(current_types) if current_types else 'Aucun'}")

            # Scrape if enabled
            web_content = None
            if scrape and product.get('website'):
                print(f"      Scraping...")
                web_content = self.scrape_product(product)
                if web_content:
                    print(f"      Scraped {len(web_content)} chars")

            # AI evaluation
            print(f"      Analyse IA...")
            result = self.evaluate_product(product, web_content)

            if result:
                needs_change, summary = self.analyze_result(result)

                if needs_change:
                    corrections.append(summary)
                    print(f"      ⚠️  CHANGEMENT SUGGÉRÉ:")
                    print(f"         Actuel:     {', '.join(summary['current'])}")
                    print(f"         Recommandé: {', '.join(summary['recommended'])}")
                    if summary['to_add']:
                        print(f"         + Ajouter:  {', '.join(summary['to_add'])}")
                    if summary['to_remove']:
                        print(f"         - Supprimer: {', '.join(summary['to_remove'])}")
                    if summary.get('change_reason'):
                        print(f"         Raison: {summary['change_reason']}")
                    print(f"         Confiance: {summary['confidence']}")
                else:
                    self.verified.append(summary)
                    print(f"      ✓ Types corrects")
            else:
                print(f"      [SKIP] Pas de résultat IA")

            # Rate limiting
            time.sleep(delay)

        return corrections

    def apply_corrections(self, corrections: List[Dict], auto_confirm: bool = False):
        """Apply corrections to Supabase"""
        if not corrections:
            print("\n[INFO] Aucune correction à appliquer")
            return

        print(f"\n[APPLY] {len(corrections)} corrections à appliquer")

        if not auto_confirm:
            print("\nDétail des corrections:")
            for c in corrections:
                print(f"  • {c['product_name']}: {' + '.join(c['current'])} → {' + '.join(c['recommended'])}")

            confirm = input("\nAppliquer ces corrections? (y/N): ")
            if confirm.lower() != 'y':
                print("[SKIP] Corrections annulées")
                return

        applied = 0
        for c in corrections:
            pid = c['product_id']

            # Remove types
            for type_code in c['to_remove']:
                type_id = self.type_by_code.get(type_code)
                if type_id:
                    r = requests.delete(
                        f"{SUPABASE_URL}/rest/v1/product_type_mapping?product_id=eq.{pid}&type_id=eq.{type_id}",
                        headers=SUPABASE_HEADERS
                    )
                    if r.status_code in [200, 204]:
                        print(f"   [{c['product_name']}] - {type_code}")

            # Add types
            for type_code in c['to_add']:
                type_id = self.type_by_code.get(type_code)
                if type_id:
                    # Check if exists
                    r = requests.get(
                        f"{SUPABASE_URL}/rest/v1/product_type_mapping?product_id=eq.{pid}&type_id=eq.{type_id}",
                        headers=SUPABASE_HEADERS
                    )
                    if not r.json():
                        data = {'product_id': pid, 'type_id': type_id, 'is_primary': False}
                        r = requests.post(
                            f"{SUPABASE_URL}/rest/v1/product_type_mapping",
                            headers=SUPABASE_HEADERS,
                            json=data
                        )
                        if r.status_code in [200, 201]:
                            print(f"   [{c['product_name']}] + {type_code}")
                            applied += 1

        print(f"\n[DONE] {applied} modifications appliquées")

    def run(self,
            product_filter: Optional[str] = None,
            batch_size: int = 10,
            start: int = 0,
            scrape: bool = True,
            apply: bool = False,
            auto_confirm: bool = False):
        """Main evaluation run"""

        print("\n" + "=" * 70)
        print("SMART TYPE EVALUATOR")
        print("Évaluation IA des types de produits")
        print("=" * 70)
        print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"Scraping: {'Activé' if scrape else 'Désactivé'}")
        print(f"Application: {'Auto' if auto_confirm else 'Manuel' if apply else 'Dry run'}")

        # Load data
        self.load_data()

        # Filter products
        if product_filter:
            products = [p for p in self.products if product_filter.lower() in p['name'].lower()]
            print(f"\n[FILTER] {len(products)} produits correspondant à '{product_filter}'")
        else:
            products = self.products[start:start + batch_size]
            print(f"\n[BATCH] Produits {start} à {start + len(products)}")

        if not products:
            print("[ERROR] Aucun produit trouvé")
            return []

        print(f"[INFO] {len(products)} produits à évaluer")
        print("-" * 70)

        # Evaluate
        corrections = self.evaluate_batch(products, scrape=scrape)
        self.corrections = corrections

        # Summary
        print("\n" + "=" * 70)
        print("RÉSUMÉ")
        print("=" * 70)
        print(f"Produits évalués: {len(products)}")
        print(f"Types corrects: {len(self.verified)}")
        print(f"Corrections suggérées: {len(corrections)}")

        if corrections:
            print("\nCorrections détaillées:")
            for c in corrections:
                print(f"\n  📦 {c['product_name']}")
                print(f"     Actuel:     {' + '.join(c['current'])}")
                print(f"     Recommandé: {' + '.join(c['recommended'])}")
                if c.get('ac_phys_analysis', {}).get('reason'):
                    print(f"     AC Phys: {c['ac_phys_analysis']['reason']}")

        # Apply if requested
        if apply and corrections:
            self.apply_corrections(corrections, auto_confirm=auto_confirm)

        return corrections

    def export_results(self, filename: str = "type_evaluation_results.json"):
        """Export results to JSON file"""
        results = {
            'timestamp': datetime.now().isoformat(),
            'corrections': self.corrections,
            'verified': self.verified,
            'summary': {
                'total_evaluated': len(self.corrections) + len(self.verified),
                'corrections_needed': len(self.corrections),
                'verified_ok': len(self.verified)
            }
        }

        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)

        print(f"\n[EXPORT] Résultats exportés vers {filename}")


def main():
    import argparse

    parser = argparse.ArgumentParser(
        description='Smart Type Evaluator - Évaluation IA des types de produits',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemples:
  python smart_type_evaluator.py --product "Coldcard"
  python smart_type_evaluator.py --batch 20 --start 0
  python smart_type_evaluator.py --all --no-scrape
  python smart_type_evaluator.py --product "Ledger" --apply
        """
    )
    parser.add_argument('--product', type=str, help='Filtrer par nom de produit')
    parser.add_argument('--batch', type=int, default=10, help='Taille du batch (défaut: 10)')
    parser.add_argument('--start', type=int, default=0, help='Index de départ')
    parser.add_argument('--all', action='store_true', help='Évaluer tous les produits')
    parser.add_argument('--no-scrape', action='store_true', help='Désactiver le scraping web')
    parser.add_argument('--apply', action='store_true', help='Appliquer les corrections')
    parser.add_argument('--auto', action='store_true', help='Appliquer sans confirmation')
    parser.add_argument('--export', type=str, help='Exporter les résultats en JSON')

    args = parser.parse_args()

    evaluator = SmartTypeEvaluator()

    if args.all:
        corrections = evaluator.run(
            batch_size=999,
            scrape=not args.no_scrape,
            apply=args.apply,
            auto_confirm=args.auto
        )
    elif args.product:
        corrections = evaluator.run(
            product_filter=args.product,
            scrape=not args.no_scrape,
            apply=args.apply,
            auto_confirm=args.auto
        )
    else:
        corrections = evaluator.run(
            batch_size=args.batch,
            start=args.start,
            scrape=not args.no_scrape,
            apply=args.apply,
            auto_confirm=args.auto
        )

    if args.export:
        evaluator.export_results(args.export)


if __name__ == "__main__":
    main()
