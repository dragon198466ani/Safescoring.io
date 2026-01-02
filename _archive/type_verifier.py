#!/usr/bin/env python3
"""
SAFESCORING.IO - Smart Type Verifier
Utilise le même pattern que smart_evaluator.py pour vérifier les types de produits.
Utilise l'IA (DeepSeek/Gemini/Mistral/Ollama) + Web scraping.
"""

import requests
import sys
import json
import time
from pathlib import Path
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.config import SUPABASE_URL, SUPABASE_HEADERS
from core.api_provider import AIProvider
from core.scraper import WebScraper


class SmartTypeVerifier:
    """
    Intelligent type verifier using AI and web scraping.
    Same architecture as SmartEvaluator.
    """

    # Type definitions for AI context
    TYPE_DEFINITIONS = """
## TYPES DISPONIBLES ET DÉFINITIONS

### HARDWARE (Wallets physiques)
- **HW Cold**: Hardware wallet (Ledger, Trezor, Coldcard). Stockage offline des clés.
  Note: ALL hardware wallets are "cold" by industry definition - they keep keys offline.
- **HW NFC Signer**: Carte NFC de signature uniquement (TAPSIGNER, Status Keycard).

### SOFTWARE (Wallets logiciels)
- **SW Browser**: Extension navigateur UNIQUEMENT (Rabby si browser-only).
- **SW Mobile**: Application mobile UNIQUEMENT (Phoenix, Breez).
- **Wallet MultiPlatform**: Disponible sur PLUSIEURS plateformes (browser + mobile + desktop). Ex: MetaMask, Trust Wallet.
- **Wallet MultiSig**: Wallet avec fonctionnalité multi-signature native (Casa, Nunchuk, Safe).

### DEFI (Finance décentralisée)
- **DEX**: Decentralized exchange pour swaps (Uniswap, Curve, 1inch).
- **Lending**: Protocole de prêt/emprunt (Aave, Compound, MakerDAO).
- **Yield**: Yield aggregator/optimizer (Yearn, Beefy, Convex).
- **Liq Staking**: Liquid staking - stake + token liquide (Lido, Rocket Pool, Jito).
- **Derivatives**: Options, perpetuals, futures (dYdX, GMX, Synthetix).
- **DeFi Tools**: Dashboards, portfolio trackers, automation (DeBank, Zapper, DeFi Saver).

### FINANCE CENTRALISÉE
- **CEX**: Centralized exchange (Binance, Coinbase, Kraken).
- **Card**: Carte crypto CUSTODIALE - exchange garde les fonds.
- **Card Non-Cust**: Carte crypto NON-CUSTODIALE - user garde ses clés (Gnosis Pay).
- **Neobank**: Banque fintech avec crypto (Revolut, N26).
- **Crypto Bank**: Banque crypto régulée (AMINA, Sygnum).

### BACKUP
- **Bkp Physical**: Backup physique métal/steel/titanium (Cryptosteel, Billfodl).
- **Bkp Digital**: Backup digital/cloud (Ledger Recover).
- **Seed Splitter**: Shamir Secret Sharing backup (SeedXOR, Trezor Shamir).

### CUSTODY
# NOTE: Anti-coercion features (duress PIN, etc.) are evaluated via Adversity (A) pillar, not as separate types
- **Custody MPC**: Multi-Party Computation custody (Fireblocks).
- **Custody MultiSig**: Multi-Signature custody (BitGo).
- **Enterprise Custody**: Custody enterprise-grade.

### AUTRES
- **Bridges**: Cross-chain bridges (Wormhole, Stargate).
- **RWA**: Real World Assets tokenization (Ondo, RealT).
- **Inheritance**: Fonctionnalités d'héritage/timelock.
- **Protocol**: Protocole générique.
- **Settlement**: Settlement/clearing.
- **Airgap Signer**: Signeur air-gapped DIY.
"""

    SYSTEM_PROMPT = """Tu es un expert en crypto/blockchain spécialisé dans la classification des produits.

{type_definitions}

## RÈGLES IMPORTANTES

1. **Maximum 3 types** par produit (sauf exceptions justifiées)

2. **Wallet MultiPlatform vs SW Browser/Mobile**:
   - Si disponible sur browser ET mobile → Wallet MultiPlatform (pas les deux)
   - SW Browser = UNIQUEMENT browser
   - SW Mobile = UNIQUEMENT mobile

4. **DEX + autre type**:
   - DEX + Yield = si le DEX a des LP rewards significatifs
   - DEX + Bridges = si le DEX fait aussi bridge cross-chain
   - DEX + Derivatives = si perps/options

5. **Card vs Card Non-Cust**:
   - Card = custodial (exchange garde les fonds)
   - Card Non-Cust = self-custody (user garde ses clés)

## FORMAT DE RÉPONSE

Réponds UNIQUEMENT avec un JSON valide:
```json
{{
    "product": "Nom du produit",
    "analysis": "Analyse factuelle basée sur le contenu web",
    "recommended_types": ["Type1", "Type2"],
    "confidence": "high/medium/low"
}}
```
"""

    def __init__(self):
        self.ai_provider = AIProvider()
        self.scraper = WebScraper()
        self.products = []
        self.product_types = {}
        self.current_mappings = {}
        self.corrections = []

    def load_data(self):
        """Load all data from Supabase"""
        print("\n[LOAD] Chargement des données Supabase...")

        # Load product types
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/product_types?select=id,code,name",
            headers=SUPABASE_HEADERS
        )
        if r.status_code == 200:
            for t in r.json():
                self.product_types[t['id']] = t
            self.type_by_code = {t['code']: t['id'] for t in self.product_types.values()}
            print(f"   {len(self.product_types)} types de produits")

        # Load products
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/products?select=id,name,slug,website&order=name",
            headers=SUPABASE_HEADERS
        )
        if r.status_code == 200:
            self.products = r.json()
            print(f"   {len(self.products)} produits")

        # Load current mappings
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/product_type_mapping?select=product_id,type_id,is_primary",
            headers=SUPABASE_HEADERS
        )
        if r.status_code == 200:
            for m in r.json():
                pid = m['product_id']
                if pid not in self.current_mappings:
                    self.current_mappings[pid] = []
                type_code = self.product_types.get(m['type_id'], {}).get('code', '?')
                self.current_mappings[pid].append({
                    'type_id': m['type_id'],
                    'type_code': type_code,
                    'is_primary': m['is_primary']
                })
            print(f"   {len(self.current_mappings)} produits avec mappings")

    def get_product_types(self, product_id):
        """Get current types for a product"""
        return [m['type_code'] for m in self.current_mappings.get(product_id, [])]

    def scrape_product_info(self, product):
        """Scrape product website for type-relevant information"""
        website = product.get('website', '')
        if not website:
            return None

        try:
            content = self.scraper.scrape_product(product, max_pages=5, max_chars=15000)
            return content
        except Exception as e:
            print(f"   [WARN] Scraping failed: {e}")
            return None

    def verify_product_with_ai(self, product, web_content=None):
        """Verify product types using AI"""
        product_name = product['name']
        current_types = self.get_product_types(product['id'])

        # Build prompt
        context = f"""
## PRODUIT À ANALYSER: {product_name}

### Types actuellement assignés:
{', '.join(current_types) if current_types else 'Aucun'}

### Site web:
{product.get('website', 'Non disponible')}
"""

        if web_content:
            # Limit content to avoid token overflow
            content_preview = web_content[:8000] if len(web_content) > 8000 else web_content
            context += f"""
### Contenu du site (extrait):
{content_preview}
"""

        context += """
### QUESTION:
Analyse ce produit et détermine ses types corrects selon les définitions.
"""

        # Call AI
        system_prompt = self.SYSTEM_PROMPT.format(type_definitions=self.TYPE_DEFINITIONS)

        try:
            response = self.ai_provider.call(
                system_prompt=system_prompt,
                user_prompt=context,
                max_tokens=1000
            )

            if response:
                # Parse JSON from response
                start = response.find('{')
                end = response.rfind('}') + 1
                if start >= 0 and end > start:
                    result = json.loads(response[start:end])
                    result['current_types'] = current_types
                    return result
        except Exception as e:
            print(f"   [ERROR] AI call failed: {e}")

        return None

    def compare_and_suggest(self, product, ai_result):
        """Compare AI suggestion with current types"""
        if not ai_result:
            return None

        current = set(ai_result.get('current_types', []))
        recommended = set(ai_result.get('recommended_types', []))

        to_add = recommended - current
        to_remove = current - recommended

        if to_add or to_remove:
            return {
                'product_id': product['id'],
                'product_name': product['name'],
                'current': list(current),
                'recommended': list(recommended),
                'to_add': list(to_add),
                'to_remove': list(to_remove),
                'analysis': ai_result.get('analysis', ''),
                'confidence': ai_result.get('confidence', 'medium')
            }
        return None

    def verify_batch(self, products, scrape=True, delay=2):
        """Verify a batch of products"""
        results = []

        for i, product in enumerate(products):
            print(f"\n[{i+1}/{len(products)}] {product['name']}")
            print(f"   Types actuels: {', '.join(self.get_product_types(product['id']))}")

            # Scrape if enabled
            web_content = None
            if scrape and product.get('website'):
                print(f"   Scraping {product['website']}...")
                web_content = self.scrape_product_info(product)

            # AI verification
            print(f"   Analyse IA...")
            ai_result = self.verify_product_with_ai(product, web_content)

            if ai_result:
                suggestion = self.compare_and_suggest(product, ai_result)
                if suggestion:
                    results.append(suggestion)
                    print(f"   ⚠️  CHANGEMENT SUGGÉRÉ:")
                    print(f"      Actuel:    {', '.join(suggestion['current'])}")
                    print(f"      Recommandé: {', '.join(suggestion['recommended'])}")
                    if suggestion['to_add']:
                        print(f"      + Ajouter:  {', '.join(suggestion['to_add'])}")
                    if suggestion['to_remove']:
                        print(f"      - Supprimer: {', '.join(suggestion['to_remove'])}")
                    print(f"      Confiance: {suggestion['confidence']}")
                else:
                    print(f"   ✓ Types corrects")
            else:
                print(f"   [SKIP] Pas de résultat IA")

            # Rate limiting
            time.sleep(delay)

        return results

    def apply_corrections(self, corrections):
        """Apply corrections to database"""
        print("\n[APPLY] Application des corrections...")

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

    def run(self, product_filter=None, batch_size=10, start=0, scrape=True, apply=False):
        """Main verification run"""
        print("\n" + "=" * 70)
        print("SMART TYPE VERIFIER - Vérification IA des types")
        print("=" * 70)
        print(f"Timestamp: {datetime.now().isoformat()}")
        print(f"Scraping: {'Activé' if scrape else 'Désactivé'}")
        print(f"Application: {'Oui' if apply else 'Non (dry run)'}")

        # Load data
        self.load_data()

        # Filter products
        if product_filter:
            products = [p for p in self.products if product_filter.lower() in p['name'].lower()]
        else:
            products = self.products[start:start + batch_size]

        print(f"\n[INFO] {len(products)} produits à vérifier")
        print("-" * 70)

        # Verify batch
        corrections = self.verify_batch(products, scrape=scrape)

        # Summary
        print("\n" + "=" * 70)
        print("RÉSUMÉ")
        print("=" * 70)
        print(f"Produits vérifiés: {len(products)}")
        print(f"Corrections suggérées: {len(corrections)}")

        if corrections:
            print("\nDétail des corrections:")
            for c in corrections:
                print(f"\n  {c['product_name']}:")
                print(f"    {' + '.join(c['current'])} → {' + '.join(c['recommended'])}")

        # Apply if requested
        if apply and corrections:
            confirm = input("\nAppliquer les corrections? (y/N): ")
            if confirm.lower() == 'y':
                self.apply_corrections(corrections)
                print("\n[DONE] Corrections appliquées!")
            else:
                print("\n[SKIP] Corrections non appliquées")

        return corrections


def main():
    import argparse

    parser = argparse.ArgumentParser(description='Smart Type Verifier')
    parser.add_argument('--product', type=str, help='Vérifier un produit spécifique')
    parser.add_argument('--batch', type=int, default=10, help='Taille du batch')
    parser.add_argument('--start', type=int, default=0, help='Index de départ')
    parser.add_argument('--no-scrape', action='store_true', help='Désactiver le scraping')
    parser.add_argument('--apply', action='store_true', help='Appliquer les corrections')
    parser.add_argument('--all', action='store_true', help='Vérifier tous les produits')
    args = parser.parse_args()

    verifier = SmartTypeVerifier()

    if args.all:
        verifier.run(
            batch_size=999,
            scrape=not args.no_scrape,
            apply=args.apply
        )
    elif args.product:
        verifier.run(
            product_filter=args.product,
            scrape=not args.no_scrape,
            apply=args.apply
        )
    else:
        verifier.run(
            batch_size=args.batch,
            start=args.start,
            scrape=not args.no_scrape,
            apply=args.apply
        )


if __name__ == "__main__":
    main()
