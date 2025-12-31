#!/usr/bin/env python3
"""
SAFESCORING.IO - Script d'automatisation simplifié
Compatible Python 3.14 - Utilise uniquement requests + APIs REST
"""

import os
import json
import time
import requests
from datetime import datetime

# Charger configuration
def load_config():
    config = {}
    config_path = os.path.join(os.path.dirname(__file__), 'env_template_free.txt')
    
    if not os.path.exists(config_path):
        print("❌ Fichier config non trouvé")
        return {}
    
    with open(config_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                config[key.strip()] = value.strip()
    
    return config

CONFIG = load_config()
SUPABASE_URL = CONFIG.get('NEXT_PUBLIC_SUPABASE_URL', '')
SUPABASE_KEY = CONFIG.get('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')
MISTRAL_API_KEY = CONFIG.get('MISTRAL_API_KEY', '')
GOOGLE_API_KEY = CONFIG.get('GOOGLE_API_KEY', '')

class SimpleAutomation:
    def __init__(self):
        self.headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}',
            'Content-Type': 'application/json'
        }
        
        print("🔑 Configuration:")
        print(f"   Supabase: {'✅' if SUPABASE_URL else '❌'}")
        print(f"   Mistral: {'✅' if MISTRAL_API_KEY else '❌'}")
        print(f"   Gemini: {'✅' if GOOGLE_API_KEY else '❌'}")
    
    def test_connection(self):
        """Test connexion Supabase"""
        try:
            response = requests.get(f"{SUPABASE_URL}/rest/v1/", headers=self.headers, timeout=10)
            return response.status_code == 200
        except:
            return False
    
    def call_mistral(self, prompt: str) -> dict:
        """Appelle Mistral API directement avec requests"""
        if not MISTRAL_API_KEY:
            return {}
        
        try:
            headers = {
                'Authorization': f'Bearer {MISTRAL_API_KEY}',
                'Content-Type': 'application/json'
            }
            
            data = {
                'model': 'mistral-small-latest',
                'messages': [{'role': 'user', 'content': prompt}],
                'temperature': 0.1,
                'max_tokens': 2000
            }
            
            response = requests.post(
                'https://api.mistral.ai/v1/chat/completions',
                headers=headers,
                json=data,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                content = result['choices'][0]['message']['content']
                
                # Extraire JSON
                if '```' in content:
                    content = content.split('```')[1].replace('json', '').strip()
                
                return json.loads(content)
            else:
                print(f"   ❌ Mistral API error: {response.status_code}")
                return {}
                
        except Exception as e:
            print(f"   ❌ Erreur Mistral: {e}")
            return {}
    
    def call_gemini(self, prompt: str) -> dict:
        """Appelle Gemini API directement avec requests"""
        if not GOOGLE_API_KEY:
            return {}
        
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GOOGLE_API_KEY}"
            
            data = {
                'contents': [{'parts': [{'text': prompt}]}],
                'generationConfig': {
                    'temperature': 0.1,
                    'maxOutputTokens': 2000
                }
            }
            
            response = requests.post(url, json=data, timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                content = result['candidates'][0]['content']['parts'][0]['text']
                
                # Extraire JSON
                if '```' in content:
                    content = content.split('```')[1].replace('json', '').strip()
                
                return json.loads(content)
            else:
                print(f"   ❌ Gemini API error: {response.status_code}")
                return {}
                
        except Exception as e:
            print(f"   ❌ Erreur Gemini: {e}")
            return {}
    
    def analyze_product(self, product_name: str, description: str = "") -> dict:
        """Analyse un produit avec IA"""
        
        # Essayer Mistral d'abord
        if MISTRAL_API_KEY:
            print("   🤖 Analyse avec Mistral...")
            prompt = f"""Expert en sécurité crypto. Analyse : {product_name}

Description : {description}

Réponds en JSON uniquement :
{{
  "risk_score": 0-100,
  "vulnerabilities": ["liste"],
  "recommendations": ["liste"],
  "status": "secure|warning|critical"
}}"""
            
            result = self.call_mistral(prompt)
            if result:
                time.sleep(1.5)  # Rate limit
                return result
        
        # Fallback Gemini
        if GOOGLE_API_KEY:
            print("   🔮 Analyse avec Gemini...")
            prompt = f"""Security expert for crypto product: {product_name}

Description: {description}

Return JSON only:
{{
  "risk_score": 0-100,
  "vulnerabilities": ["list"],
  "recommendations": ["list"],
  "status": "secure|warning|critical"
}}"""
            
            result = self.call_gemini(prompt)
            if result:
                time.sleep(1.2)  # Rate limit
                return result
        
        # Fallback par défaut
        return {
            'risk_score': 50,
            'vulnerabilities': ['Unknown security model'],
            'recommendations': ['Research security audits'],
            'status': 'warning'
        }
    
    def get_products(self) -> list:
        """Récupère les produits depuis Supabase"""
        try:
            response = requests.get(
                f"{SUPABASE_URL}/rest/v1/products?select=*",
                headers=self.headers,
                timeout=30
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                print(f"❌ Erreur récupération produits: {response.status_code}")
                return []
                
        except Exception as e:
            print(f"❌ Erreur get products: {e}")
            return []
    
    def update_product(self, product_id: int, analysis: dict) -> bool:
        """Met à jour un produit dans Supabase"""
        try:
            data = {
                'risk_score': analysis['risk_score'],
                'security_status': analysis['status'],
                'last_security_scan': datetime.now().isoformat(),
                'last_monthly_update': datetime.now().isoformat()
            }
            
            response = requests.patch(
                f"{SUPABASE_URL}/rest/v1/products?id=eq.{product_id}",
                headers=self.headers,
                json=data,
                timeout=30
            )
            
            return response.status_code in [200, 204]
            
        except Exception as e:
            print(f"❌ Erreur update product: {e}")
            return False
    
    def run_automation(self):
        """Exécute l'automatisation complète"""
        print("\n🗓️  AUTOMATISATION SAFESCORING (Version Simplifiée)")
        print("=" * 60)
        
        if not self.test_connection():
            print("❌ Erreur connexion Supabase")
            return False
        
        print("✅ Connexion Supabase OK")
        
        # Récupérer produits
        products = self.get_products()
        if not products:
            print("❌ Aucun produit trouvé")
            return False
        
        print(f"📊 {len(products)} produits à analyser")
        print()
        
        # Statistiques
        stats = {
            'total': len(products),
            'updated': 0,
            'errors': 0
        }
        
        # Analyser chaque produit
        for i, product in enumerate(products, 1):
            print(f"📦 [{i}/{len(products)}] {product['name']}")
            
            try:
                # Analyse IA
                analysis = self.analyze_product(
                    product['name'], 
                    product.get('description', '')
                )
                
                # Mise à jour
                if self.update_product(product['id'], analysis):
                    print(f"   ✅ Mis à jour: {analysis['risk_score']}/100 ({analysis['status']})")
                    stats['updated'] += 1
                else:
                    print(f"   ❌ Erreur mise à jour")
                    stats['errors'] += 1
                    
            except Exception as e:
                print(f"   ❌ Erreur: {e}")
                stats['errors'] += 1
            
            print()
        
        # Résumé
        print("🎉 AUTOMATISATION TERMINÉE")
        print("=" * 40)
        print(f"📦 Produits totaux: {stats['total']}")
        print(f"✅ Mis à jour: {stats['updated']}")
        print(f"❌ Erreurs: {stats['errors']}")
        
        return True

def main():
    automation = SimpleAutomation()
    success = automation.run_automation()
    
    if success:
        print("\n✨ Pour automatiser mensuellement:")
        print("   - Planifier: python simple_automation.py")
        print("   - Cron: 0 3 1 * * python simple_automation.py")

if __name__ == "__main__":
    main()
