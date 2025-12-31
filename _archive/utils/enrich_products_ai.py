#!/usr/bin/env python3
"""
SAFESCORING.IO - Enrichissement Produits via IA
Ajoute prix, description, pays création, pays exclus, siège social aux produits
"""

import os
import sys
import json
import time
import requests
from datetime import datetime
from typing import Dict, List, Any, Optional

# Configuration
CONFIG_PATH = os.path.join(os.path.dirname(__file__), '..', 'config', 'env_template_free.txt')

def load_config():
    config = {}
    with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                config[key.strip()] = value.strip()
    return config

CONFIG = load_config()
SUPABASE_URL = CONFIG.get('NEXT_PUBLIC_SUPABASE_URL', '')
SUPABASE_KEY = CONFIG.get('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')
GOOGLE_API_KEY = CONFIG.get('GOOGLE_API_KEY', '')
MISTRAL_API_KEY = CONFIG.get('MISTRAL_API_KEY', '')


class ProductEnricher:
    """Enrichit les produits avec infos via IA"""
    
    def __init__(self):
        self.headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        }
        
        print("🚀 ENRICHISSEMENT PRODUITS VIA IA")
        print("=" * 50)
        print(f"🤖 Gemini API: {'✅' if GOOGLE_API_KEY else '❌'}")
        print(f"🤖 Mistral API: {'✅' if MISTRAL_API_KEY else '❌'}")
    
    def get_products(self) -> List[Dict]:
        """Récupère tous les produits"""
        try:
            response = requests.get(
                f"{SUPABASE_URL}/rest/v1/products?select=*&order=name",
                headers=self.headers,
                timeout=30
            )
            if response.status_code == 200:
                return response.json()
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
                "generationConfig": {"temperature": 0.1, "maxOutputTokens": 800}
            }
            
            response = requests.post(url, json=payload, timeout=60)
            
            if response.status_code == 200:
                data = response.json()
                if 'candidates' in data and data['candidates']:
                    return data['candidates'][0]['content']['parts'][0]['text']
            else:
                print(f"   ⚠️ Gemini HTTP {response.status_code}: {response.text[:200]}")
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
                "max_tokens": 800
            }
            
            response = requests.post(url, headers=headers, json=payload, timeout=60)
            
            if response.status_code == 200:
                data = response.json()
                return data['choices'][0]['message']['content']
            else:
                print(f"   ⚠️ Mistral HTTP {response.status_code}: {response.text[:200]}")
            return None
            
        except Exception as e:
            print(f"   ⚠️ Erreur Mistral: {e}")
            return None
    
    def call_ai(self, prompt: str) -> Optional[str]:
        """Appelle Gemini puis Mistral en fallback"""
        result = self.call_gemini(prompt)
        if result:
            return result
        
        print("   🔄 Fallback vers Mistral...")
        return self.call_mistral(prompt)
    
    def get_product_info(self, product_name: str, product_type: str, product_url: str) -> Dict:
        """Obtient les infos produit via IA"""
        
        prompt = f"""Tu es un expert crypto/fintech. Donne les informations FACTUELLES sur ce produit.

PRODUIT: {product_name}
TYPE: {product_type}
URL: {product_url}

Réponds UNIQUEMENT en JSON valide (sans markdown):
{{
    "price_eur": null,
    "price_details": "description du prix ou frais",
    "short_description": "description courte en français max 80 caractères",
    "country_origin": "pays de création/fondation (code ISO 2 lettres, ex: US, FR, CH)",
    "excluded_countries": ["liste des pays où le service est interdit/non disponible"],
    "headquarters": "ville et pays du siège social",
    "year_founded": 2020,
    "key_metrics": {{
        "users": "nombre utilisateurs si connu",
        "volume_24h": "volume trading si exchange",
        "supported_coins": "nombre de cryptos supportées"
    }}
}}

RÈGLES:
- Hardware wallet: prix en EUR (ex: 79, 149)
- Exchange/DEX: frais trading (ex: "0.1% maker/taker")
- Software gratuit: price_eur = 0
- Si inconnu: null
- excluded_countries: pays avec restrictions (US, CN souvent exclus des exchanges)
- Sois factuel, pas d'invention"""

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
                
                return json.loads(result)
            except json.JSONDecodeError as e:
                print(f"   ⚠️ JSON invalide: {e}")
        
        return {}
    
    def update_product(self, product_id: int, data: Dict) -> bool:
        """Met à jour un produit dans Supabase"""
        try:
            # Préparer les données pour le champ specs (JSONB)
            update_data = {
                'specs': data
            }
            
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
    
    def enrich_all_products(self, limit: int = None):
        """Enrichit tous les produits"""
        products = self.get_products()
        
        if limit:
            products = products[:limit]
        
        print(f"\n📦 {len(products)} produits à enrichir")
        print("-" * 50)
        
        enriched = 0
        errors = 0
        
        for i, product in enumerate(products, 1):
            name = product.get('name', 'Unknown')
            desc = product.get('description', '')
            url = product.get('url', '')
            product_id = product.get('id')
            
            print(f"\n[{i}/{len(products)}] 🔍 {name}...")
            
            # Obtenir infos via IA
            info = self.get_product_info(name, desc, url)
            
            if info and isinstance(info, dict):
                # Fusionner avec specs existants
                existing_specs = product.get('specs', {}) or {}
                if isinstance(existing_specs, str):
                    existing_specs = {}
                
                # Ajouter les nouvelles infos
                existing_specs['price_eur'] = info.get('price_eur')
                existing_specs['price_details'] = info.get('price_details')
                existing_specs['short_description'] = info.get('short_description')
                existing_specs['country_origin'] = info.get('country_origin')
                existing_specs['excluded_countries'] = info.get('excluded_countries', [])
                existing_specs['headquarters'] = info.get('headquarters')
                existing_specs['year_founded'] = info.get('year_founded')
                existing_specs['key_metrics'] = info.get('key_metrics', {})
                existing_specs['enriched_at'] = datetime.now().isoformat()
                
                if self.update_product(product_id, existing_specs):
                    print(f"   ✅ Prix: {info.get('price_details', 'N/A')}")
                    print(f"   🏠 Siège: {info.get('headquarters', 'N/A')}")
                    print(f"   🌍 Origine: {info.get('country_origin', 'N/A')}")
                    print(f"   🚫 Exclus: {', '.join(info.get('excluded_countries', [])) or 'Aucun'}")
                    enriched += 1
                else:
                    errors += 1
            else:
                print(f"   ⚠️ Pas d'info trouvée")
                errors += 1
            
            # Rate limiting Gemini (60 req/min)
            time.sleep(1.2)
        
        print("\n" + "=" * 50)
        print(f"🎉 TERMINÉ: {enriched} enrichis, {errors} erreurs")
        
        return enriched, errors


def main():
    import argparse
    parser = argparse.ArgumentParser(description='Enrichir les produits via IA')
    parser.add_argument('--all', action='store_true', help='Enrichir tous les produits')
    parser.add_argument('--test', type=int, default=0, help='Enrichir N premiers produits (test)')
    parser.add_argument('--product', type=str, help='Enrichir un produit spécifique par nom')
    args = parser.parse_args()
    
    enricher = ProductEnricher()
    
    if args.all:
        enricher.enrich_all_products()
    elif args.test > 0:
        enricher.enrich_all_products(limit=args.test)
    elif args.product:
        products = enricher.get_products()
        product = next((p for p in products if args.product.lower() in p['name'].lower()), None)
        if product:
            print(f"\n🔍 Enrichissement de: {product['name']}")
            info = enricher.get_product_info(product['name'], product.get('description', ''), product.get('url', ''))
            print(json.dumps(info, indent=2, ensure_ascii=False))
            
            # Mettre à jour si info trouvée
            if info:
                existing_specs = product.get('specs', {}) or {}
                existing_specs.update({
                    'price_eur': info.get('price_eur'),
                    'price_details': info.get('price_details'),
                    'short_description': info.get('short_description'),
                    'country_origin': info.get('country_origin'),
                    'excluded_countries': info.get('excluded_countries', []),
                    'headquarters': info.get('headquarters'),
                    'year_founded': info.get('year_founded'),
                    'key_metrics': info.get('key_metrics', {}),
                    'enriched_at': datetime.now().isoformat()
                })
                if enricher.update_product(product['id'], existing_specs):
                    print("\n✅ Produit mis à jour dans Supabase!")
        else:
            print(f"❌ Produit '{args.product}' non trouvé")
    else:
        print("\nUsage:")
        print("  python enrich_products_ai.py --test 5    # Test avec 5 produits")
        print("  python enrich_products_ai.py --all       # Tous les produits")
        print("  python enrich_products_ai.py --product 'Binance'  # Un produit")


if __name__ == "__main__":
    main()
