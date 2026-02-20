#!/usr/bin/env python3
"""
SAFESCORING.IO - Enrichissement COMPLET de TOUS les produits
Enrichit automatiquement TOUS les produits avec géographie via IA
"""

import os
import sys
import io

# Fix encoding for Windows console
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

import json
import time
import requests
from datetime import datetime
from typing import Dict, List, Any, Optional

# Configuration
CONFIG_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'config', 'env_template_free.txt')

def load_config():
    config = {}
    config_path = CONFIG_PATH
    if not os.path.exists(config_path):
        # Essayer un autre chemin
        alt_path = os.path.join(os.path.dirname(__file__), 'env.txt')
        if os.path.exists(alt_path):
            config_path = alt_path
        # Essayer config/.env
        env_path = os.path.join(os.path.dirname(__file__), '..', '..', 'config', '.env')
        if os.path.exists(env_path):
            config_path = env_path

    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    config[key.strip()] = value.strip()
    except FileNotFoundError:
        print(f"⚠️ Fichier de config non trouvé: {config_path}")
        print("Utilisation des variables d'environnement...")
        config['NEXT_PUBLIC_SUPABASE_URL'] = os.getenv('NEXT_PUBLIC_SUPABASE_URL', '')
        config['NEXT_PUBLIC_SUPABASE_ANON_KEY'] = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')
        config['GOOGLE_API_KEY'] = os.getenv('GOOGLE_API_KEY', '')
        config['MISTRAL_API_KEY'] = os.getenv('MISTRAL_API_KEY', '')

    return config

CONFIG = load_config()
SUPABASE_URL = CONFIG.get('NEXT_PUBLIC_SUPABASE_URL', '')
SUPABASE_KEY = CONFIG.get('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')
GOOGLE_API_KEY = CONFIG.get('GOOGLE_API_KEY', '')
MISTRAL_API_KEY = CONFIG.get('MISTRAL_API_KEY', '')


class CompleteProductEnricher:
    """Enrichit TOUS les produits avec géographie"""

    def __init__(self, batch_size=10, delay=1.5):
        self.headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        }
        self.batch_size = batch_size
        self.delay = delay  # Délai entre requêtes (rate limiting)

        print("🚀 ENRICHISSEMENT COMPLET DES PRODUITS")
        print("=" * 60)
        print(f"🔑 Supabase: {'✅' if SUPABASE_URL else '❌'}")
        print(f"🤖 Gemini API: {'✅' if GOOGLE_API_KEY else '❌'}")
        print(f"🤖 Mistral API: {'✅' if MISTRAL_API_KEY else '❌'}")
        print(f"📦 Batch size: {batch_size}")
        print(f"⏱️  Délai entre requêtes: {delay}s")
        print("=" * 60)

    def get_all_products(self, filter_missing_only=False) -> List[Dict]:
        """Récupère tous les produits (ou seulement ceux sans géographie)"""
        try:
            url = f"{SUPABASE_URL}/rest/v1/products?select=*&order=name"

            if filter_missing_only:
                # Récupérer seulement les produits sans données géographiques
                url = f"{SUPABASE_URL}/rest/v1/products?select=*&or=(country_origin.is.null,legal_countries.is.null)&order=name"

            response = requests.get(url, headers=self.headers, timeout=30)

            if response.status_code == 200:
                products = response.json()
                print(f"\n📊 {len(products)} produits récupérés")
                return products
            else:
                print(f"❌ Erreur HTTP {response.status_code}: {response.text}")
                return []
        except Exception as e:
            print(f"❌ Erreur: {e}")
            return []

    def call_gemini(self, prompt: str) -> Optional[str]:
        """Appelle Gemini API"""
        if not GOOGLE_API_KEY:
            return None

        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GOOGLE_API_KEY}"

            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0.1, "maxOutputTokens": 1000}
            }

            response = requests.post(url, json=payload, timeout=60)

            if response.status_code == 200:
                data = response.json()
                if 'candidates' in data and data['candidates']:
                    return data['candidates'][0]['content']['parts'][0]['text']
            else:
                print(f"   ⚠️ Gemini HTTP {response.status_code}")
            return None

        except Exception as e:
            print(f"   ⚠️ Erreur Gemini: {e}")
            return None

    def call_mistral(self, prompt: str) -> Optional[str]:
        """Appelle Mistral API"""
        if not MISTRAL_API_KEY:
            return None

        try:
            url = "https://api.mistral.ai/v1/chat/completions"

            headers = {
                "Authorization": f"Bearer {MISTRAL_API_KEY}",
                "Content-Type": "application/json"
            }

            payload = {
                "model": "mistral-small-latest",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.1,
                "max_tokens": 1000
            }

            response = requests.post(url, headers=headers, json=payload, timeout=60)

            if response.status_code == 200:
                data = response.json()
                return data['choices'][0]['message']['content']
            else:
                print(f"   ⚠️ Mistral HTTP {response.status_code}")
            return None

        except Exception as e:
            print(f"   ⚠️ Erreur Mistral: {e}")
            return None

    def call_ai(self, prompt: str) -> Optional[str]:
        """Appelle Gemini puis Mistral en fallback"""
        result = self.call_gemini(prompt)
        if result:
            return result

        print("   🔄 Fallback Mistral...")
        return self.call_mistral(prompt)

    def get_product_geography(self, product: Dict) -> Dict:
        """Obtient la géographie d'un produit via IA"""

        name = product.get('name', 'Unknown')
        description = product.get('description', '')
        url = product.get('url', '')
        slug = product.get('slug', '')

        prompt = f"""Tu es un expert crypto/fintech. Fournis les informations géographiques FACTUELLES sur ce produit crypto.

PRODUIT: {name}
SLUG: {slug}
DESCRIPTION: {description}
URL: {url}

Réponds UNIQUEMENT en JSON valide (sans markdown):
{{
    "country_origin": "code ISO 2 lettres du pays de création (ex: US, FR, CH, GB, SG, AE, HK, etc.)",
    "headquarters": "ville et pays du siège social (ex: 'Paris, France', 'New York, USA')",
    "legal_countries": ["liste COMPLÈTE des pays où légalement disponible - codes ISO 2 lettres"],
    "excluded_countries": ["pays où interdit/restreint - codes ISO 2 lettres"],
    "confidence": "high/medium/low"
}}

RÈGLES IMPORTANTES:
1. country_origin: Pays où le produit/entreprise a été fondé(e)
   - Hardware wallets: FR (Ledger), CZ (Trezor), CA (Coldcard), CH (BitBox), etc.
   - Exchanges: AE (Binance), US (Coinbase, Kraken, Gemini), HK (Bitfinex), etc.
   - DeFi: US (Uniswap, MakerDAO), GB (Aave), CH (Curve), etc.

2. headquarters: Ville et pays du siège social actuel
   - Ex: "Paris, France", "Dubai, UAE", "San Francisco, USA"

3. legal_countries: TOUS les pays où le produit est légalement utilisable
   - Hardware wallets: ~40 pays (presque mondial sauf sanctionnés)
   - Exchanges: Variable selon régulations
     * Binance: ~40 pays (exclu US, GB, CN)
     * Coinbase: ~15 pays (US, CA, GB, FR, DE, etc.)
     * Kraken: ~19 pays
   - DeFi/Layer2: ~45-50 pays (décentralisés, très accessible)
   - Blockchains: ~50+ pays (Bitcoin, Ethereum)

4. excluded_countries: Pays avec interdictions/restrictions
   - Presque tous: ["CN", "KP", "IR", "SY"] (sanctions)
   - Exchanges offshore: ["US"] souvent exclu
   - Binance: ["US", "GB", "CN", "CA"]

5. confidence: Ton niveau de confiance
   - "high": Informations publiques confirmées
   - "medium": Informations probables mais non confirmées
   - "low": Estimation basée sur le type de produit

EXEMPLES CONCRETS:
- Ledger: {{"country_origin": "FR", "headquarters": "Paris, France", "legal_countries": ["US", "CA", "GB", "FR", "DE", "IT", "ES", "NL", "BE", "CH", "AT", "SE", "NO", "DK", "FI", "IE", "PT", "PL", "CZ", "HU", "RO", "GR", "AU", "NZ", "JP", "KR", "SG", "HK", "TW", "IN", "BR", "MX", "AR", "CL", "CO", "PE", "ZA", "AE", "IL", "TR"], "excluded_countries": ["CN", "KP", "IR", "SY"]}}
- Binance: {{"country_origin": "AE", "headquarters": "Dubai, UAE", "legal_countries": ["AE", "FR", "ES", "IT", "NL", "BE", "CH", "AT", "SE", "NO", "DK", "FI", "IE", "PT", "PL", "CZ", "HU", "RO", "GR", "AU", "NZ", "JP", "KR", "SG", "HK", "TW", "IN", "BR", "MX", "AR", "CL", "CO", "PE", "ZA", "TR", "TH", "MY", "PH", "ID", "VN"], "excluded_countries": ["US", "GB", "CN", "CA"]}}
- MetaMask: {{"country_origin": "US", "headquarters": "New York, USA", "legal_countries": ["US", "CA", "GB", "FR", "DE", "IT", "ES", "NL", "BE", "CH", "AT", "SE", "NO", "DK", "FI", "IE", "PT", "PL", "CZ", "HU", "RO", "GR", "AU", "NZ", "JP", "KR", "SG", "HK", "TW", "IN", "BR", "MX", "AR", "CL", "CO", "PE", "ZA", "AE", "IL", "TR", "TH", "MY", "PH", "ID", "VN"], "excluded_countries": ["CN", "KP", "IR", "SY"]}}

Sois FACTUEL et PRÉCIS. Utilise tes connaissances sur les régulations crypto."""

        result = self.call_ai(prompt)

        if result:
            try:
                # Nettoyer le JSON
                result = result.strip()
                if result.startswith('```'):
                    result = result.split('```')[1]
                    if result.startswith('json'):
                        result = result[4:]
                result = result.strip()

                data = json.loads(result)

                # Validation
                if not data.get('country_origin') or not data.get('legal_countries'):
                    print(f"   ⚠️ Données incomplètes pour {name}")
                    return {}

                return data
            except json.JSONDecodeError as e:
                print(f"   ⚠️ JSON invalide: {e}")
                print(f"   Réponse brute: {result[:200]}")

        return {}

    def update_product_geography(self, product_id: int, geo_data: Dict) -> bool:
        """Met à jour la géographie d'un produit dans Supabase"""
        try:
            update_data = {
                'country_origin': geo_data.get('country_origin'),
                'headquarters': geo_data.get('headquarters'),
                'legal_countries': geo_data.get('legal_countries', [])
            }

            # Aussi mettre à jour specs pour historique
            specs_update = {
                'country_origin': geo_data.get('country_origin'),
                'headquarters': geo_data.get('headquarters'),
                'legal_countries': geo_data.get('legal_countries', []),
                'excluded_countries': geo_data.get('excluded_countries', []),
                'geo_confidence': geo_data.get('confidence', 'medium'),
                'geo_updated_at': datetime.now().isoformat()
            }

            # Récupérer specs existants
            response = requests.get(
                f"{SUPABASE_URL}/rest/v1/products?id=eq.{product_id}&select=specs",
                headers=self.headers,
                timeout=10
            )

            if response.status_code == 200 and response.json():
                existing_specs = response.json()[0].get('specs', {}) or {}
                if isinstance(existing_specs, str):
                    existing_specs = {}
                existing_specs.update(specs_update)
                update_data['specs'] = existing_specs

            # Mettre à jour
            response = requests.patch(
                f"{SUPABASE_URL}/rest/v1/products?id=eq.{product_id}",
                headers=self.headers,
                json=update_data,
                timeout=30
            )

            return response.status_code in [200, 204]

        except Exception as e:
            print(f"   ❌ Erreur update: {e}")
            return False

    def enrich_all_products(self, missing_only=False, dry_run=False):
        """Enrichit tous les produits"""

        print(f"\n{'🔍 MODE DRY RUN - Aucune modification' if dry_run else '💾 MODE PRODUCTION'}")
        print(f"{'📋 Seulement produits sans géographie' if missing_only else '🌍 Tous les produits'}")
        print("-" * 60)

        # Récupérer tous les produits
        products = self.get_all_products(filter_missing_only=missing_only)

        if not products:
            print("❌ Aucun produit à traiter")
            return

        total = len(products)
        print(f"\n🎯 {total} produits à enrichir")
        print("=" * 60)

        enriched = 0
        skipped = 0
        errors = 0

        for i, product in enumerate(products, 1):
            product_id = product.get('id')
            name = product.get('name', 'Unknown')
            slug = product.get('slug', 'unknown')

            # Vérifier si déjà enrichi
            if not missing_only and product.get('country_origin') and product.get('legal_countries'):
                print(f"\n[{i}/{total}] ⏭️  {name} - Déjà enrichi, skip")
                skipped += 1
                continue

            print(f"\n[{i}/{total}] 🔍 {name} ({slug})...")

            # Obtenir géographie via IA
            geo_data = self.get_product_geography(product)

            if geo_data:
                origin = geo_data.get('country_origin', 'N/A')
                hq = geo_data.get('headquarters', 'N/A')
                legal = geo_data.get('legal_countries', [])
                excluded = geo_data.get('excluded_countries', [])
                confidence = geo_data.get('confidence', 'N/A')

                print(f"   🌍 Origine: {origin}")
                print(f"   🏢 Siège: {hq}")
                print(f"   ✅ Légal: {len(legal)} pays ({', '.join(legal[:5])}{'...' if len(legal) > 5 else ''})")
                print(f"   🚫 Exclu: {', '.join(excluded) if excluded else 'Aucun'}")
                print(f"   📊 Confiance: {confidence}")

                if not dry_run:
                    if self.update_product_geography(product_id, geo_data):
                        print(f"   ✅ Mis à jour dans Supabase!")
                        enriched += 1
                    else:
                        print(f"   ❌ Erreur mise à jour")
                        errors += 1
                else:
                    print(f"   🔍 DRY RUN - Pas de mise à jour")
                    enriched += 1
            else:
                print(f"   ⚠️ Pas de données obtenues")
                errors += 1

            # Rate limiting
            if i < total:
                print(f"   ⏳ Pause {self.delay}s...")
                time.sleep(self.delay)

        # Résumé
        print("\n" + "=" * 60)
        print("🎉 ENRICHISSEMENT TERMINÉ!")
        print("=" * 60)
        print(f"✅ Enrichis: {enriched}/{total}")
        print(f"⏭️  Skippés: {skipped}/{total}")
        print(f"❌ Erreurs: {errors}/{total}")
        print(f"📊 Taux de succès: {(enriched/(total-skipped)*100) if (total-skipped) > 0 else 0:.1f}%")

        if dry_run:
            print("\n⚠️ MODE DRY RUN - Aucune modification apportée")
            print("Relancez sans --dry-run pour appliquer les changements")


def main():
    import argparse
    parser = argparse.ArgumentParser(
        description='Enrichir TOUS les produits avec données géographiques via IA'
    )
    parser.add_argument('--missing-only', action='store_true',
                        help='Enrichir seulement les produits sans géographie')
    parser.add_argument('--dry-run', action='store_true',
                        help='Simuler sans modifier la base (test)')
    parser.add_argument('--batch-size', type=int, default=10,
                        help='Nombre de produits par batch')
    parser.add_argument('--delay', type=float, default=1.5,
                        help='Délai en secondes entre requêtes IA (rate limiting)')

    args = parser.parse_args()

    if not SUPABASE_URL or not SUPABASE_KEY:
        print("❌ Configuration Supabase manquante!")
        print("Vérifiez config/env.txt ou variables d'environnement")
        sys.exit(1)

    if not GOOGLE_API_KEY and not MISTRAL_API_KEY:
        print("❌ Aucune clé API IA configurée!")
        print("Configurez GOOGLE_API_KEY ou MISTRAL_API_KEY")
        sys.exit(1)

    enricher = CompleteProductEnricher(
        batch_size=args.batch_size,
        delay=args.delay
    )

    enricher.enrich_all_products(
        missing_only=args.missing_only,
        dry_run=args.dry_run
    )


if __name__ == "__main__":
    main()
