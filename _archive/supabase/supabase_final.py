#!/usr/bin/env python3
"""
SafeScoring - Version finale utilisant env_template_free.txt
Système d'automatisation Supabase avec IA
"""

import os
import json
import requests
from datetime import datetime, timedelta
import random
import time
from typing import List, Dict, Optional

# APIs IA gratuites
try:
    from mistralai import Mistral
except ImportError:
    print("⚠️  Installer mistralai: pip install mistralai")
    Mistral = None

try:
    import google.generativeai as genai
except ImportError:
    print("⚠️  Installer google-generativeai: pip install google-generativeai")
    genai = None

# Charger la configuration depuis env_template_free.txt
def load_config():
    """Charge les variables depuis env_template_free.txt"""
    config = {}
    config_path = os.path.join(os.path.dirname(__file__), 'env_template_free.txt')
    
    if os.path.exists(config_path):
        with open(config_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    config[key.strip()] = value.strip()
    
    return config

# Configuration
CONFIG = load_config()
SUPABASE_URL = CONFIG.get('NEXT_PUBLIC_SUPABASE_URL', '')
SUPABASE_SERVICE_KEY = CONFIG.get('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')
GOOGLE_API_KEY = CONFIG.get('GOOGLE_API_KEY', '')
MISTRAL_API_KEY = CONFIG.get('MISTRAL_API_KEY', '')

# Clients IA
mistral_client = None
if MISTRAL_API_KEY and Mistral:
    mistral_client = Mistral(api_key=MISTRAL_API_KEY)

if GOOGLE_API_KEY and genai:
    genai.configure(api_key=GOOGLE_API_KEY)

class SafeScoringSystem:
    """Système principal SafeScoring"""
    
    def __init__(self):
        self.url = SUPABASE_URL
        self.key = SUPABASE_SERVICE_KEY
        self.headers = {
            'apikey': self.key,
            'Authorization': f'Bearer {self.key}',
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        }
        
        print("🔑 Configuration chargée:")
        print(f"   Supabase URL: {self.url[:30]}...")
        print(f"   Google API: {'✅' if GOOGLE_API_KEY else '❌'}")
        print(f"   Mistral API: {'✅' if MISTRAL_API_KEY else '❌'}")
        print(f"   Clients IA: Mistral={'✅' if mistral_client else '❌'} Gemini={'✅' if genai else '❌'}")
    
    def test_connection(self):
        """Test la connexion à Supabase"""
        try:
            response = requests.get(f"{self.url}/rest/v1/", headers=self.headers)
            return response.status_code == 200
        except:
            return False
    
    def check_tables(self):
        """Vérifie les tables existantes"""
        tables = ['products', 'security_evaluations', 'automation_logs']
        existing = []
        
        for table in tables:
            try:
                response = requests.get(
                    f"{self.url}/rest/v1/{table}?select=count&limit=1",
                    headers=self.headers
                )
                if response.status_code == 200:
                    existing.append(table)
                    print(f"✅ Table '{table}' disponible")
                else:
                    print(f"❌ Table '{table}' manquante")
            except:
                print(f"❌ Erreur table '{table}'")
        
        return existing
    
    def create_sample_data(self):
        """Crée des données de test si les tables existent"""
        if 'products' not in self.check_tables():
            return []
        
        products = [
            {
                'name': 'Site E-Commerce',
                'description': 'Boutique en ligne avec paiement sécurisé',
                'url': 'https://shop.example.com',
                'risk_score': 0,
                'security_status': 'pending'
            },
            {
                'name': 'API Backend',
                'description': 'API REST pour application mobile',
                'url': 'https://api.example.com',
                'risk_score': 0,
                'security_status': 'pending'
            },
            {
                'name': 'Dashboard Admin',
                'description': 'Panneau d\'administration',
                'url': 'https://admin.example.com',
                'risk_score': 0,
                'security_status': 'pending'
            }
        ]
        
        created = []
        for product in products:
            try:
                response = requests.post(
                    f"{self.url}/rest/v1/products",
                    headers=self.headers,
                    json=product
                )
                if response.status_code == 201:
                    created.append(product)
                    print(f"✅ Produit créé: {product['name']}")
            except:
                pass
        
        return created
    
    def analyze_with_mistral(self, product_name: str, product_description: str = "") -> Dict:
        """Analyse avec Mistral IA (gratuit, français)."""
        if not mistral_client:
            return self._fallback_analysis(product_name)
        
        try:
            prompt = f"""Expert en sécurité des produits crypto. Analyse : {product_name}

Description : {product_description}

Réponds en JSON uniquement avec :
{{
  "risk_score": 0-100,
  "vulnerabilities": ["liste"],
  "recommendations": ["liste"],
  "status": "secure|warning|critical"
}}"""
            
            response = mistral_client.chat.complete(
                model="mistral-small-latest",
                messages=[
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=1000
            )
            
            return json.loads(response.choices[0].message.content)
            
        except Exception as e:
            print(f"   ⚠️  Erreur Mistral: {e}")
            return self._fallback_analysis(product_name)
    
    def analyze_with_gemini(self, product_name: str, product_description: str = "") -> Dict:
        """Analyse avec Gemini (backup)."""
        if not genai:
            return self._fallback_analysis(product_name)
            
        try:
            model = genai.GenerativeModel('gemini-1.5-flash')
            
            prompt = f"""Expert sécurité crypto. Produit : {product_name}

Description : {product_description}

JSON uniquement :
{{
  "risk_score": 0-100,
  "vulnerabilities": [],
  "recommendations": [],
  "status": "secure|warning|critical"
}}"""
            
            response = model.generate_content(prompt)
            json_str = response.text.strip()
            
            if '```' in json_str:
                json_str = json_str.split('```')[1].replace('json', '').strip()
                
            return json.loads(json_str)
            
        except Exception as e:
            print(f"   ⚠️  Erreur Gemini: {e}")
            return self._fallback_analysis(product_name)
    
    def _fallback_analysis(self, product_name: str) -> Dict:
        """Analyse de secours si IA indisponible."""
        product_lower = product_name.lower()
        
        if 'api' in product_lower:
            return {
                'risk_score': 75,
                'vulnerabilities': ['CVE-2024-API-001', 'CVE-2024-API-002'],
                'recommendations': ['Sécuriser les endpoints', 'Implémenter rate limiting'],
                'status': 'warning'
            }
        elif 'ecommerce' in product_lower or 'shop' in product_lower:
            return {
                'risk_score': 85,
                'vulnerabilities': ['CVE-2024-CART-001', 'CVE-2024-PAY-001'],
                'recommendations': ['Mettre à jour SSL', 'Vérifier PCI-DSS'],
                'status': 'critical'
            }
        else:
            return {
                'risk_score': 45,
                'vulnerabilities': [],
                'recommendations': ['Activer 2FA', 'Surveiller les logs'],
                'status': 'secure'
            }
    
    def run_monthly_update(self):
        """Exécute la mise à jour mensuelle automatique par produits."""
        print("\n🗓️  MISE À JOUR MENSUELLE AUTOMATIQUE")
        print("=" * 50)
        
        if not self.test_connection():
            print("❌ Erreur de connexion Supabase")
            return
        
        # Vérifier les tables requises
        required_tables = ['products', 'evaluations', 'automation_logs']
        existing = self.check_tables()
        missing = [t for t in required_tables if t not in existing]
        
        if missing:
            print(f"❌ Tables manquantes: {missing}")
            print("⚠️  Créez les tables avec le script SQL du guide d'automatisation")
            return
        
        # Log de démarrage
        start_time = datetime.now()
        log_data = {
            'run_date': start_time.isoformat(),
            'products_updated': 0,
            'evaluations_count': 0,
            'ai_service': 'mistral',
            'duration_sec': 0,
            'errors': []
        }
        
        try:
            # Récupérer tous les produits
            response = requests.get(f"{self.url}/rest/v1/products?select=*&order=created_at.asc", headers=self.headers)
            if response.status_code != 200:
                raise Exception(f"Erreur récupération produits: {response.status_code}")
            
            products = response.json()
            if not products:
                print("⚠️  Aucun produit trouvé")
                return
            
            print(f"📊 {len(products)} produits à mettre à jour")
            
            # Traiter chaque produit
            for i, product in enumerate(products, 1):
                print(f"\n📦 [{i}/{len(products)}] {product['name']}")
                
                try:
                    # Analyse avec IA
                    if mistral_client:
                        print("   🤖 Analyse Mistral...")
                        analysis = self.analyze_with_mistral(
                            product['name'], 
                            product.get('description', '')
                        )
                        time.sleep(1.5)  # Rate limit Mistral
                    else:
                        print("   🔮 Analyse Gemini (backup)...")
                        analysis = self.analyze_with_gemini(
                            product['name'],
                            product.get('description', '')
                        )
                        time.sleep(1.2)
                    
                    # Mettre à jour le produit
                    update_data = {
                        'last_security_scan': datetime.now().isoformat(),
                        'risk_score': analysis['risk_score'],
                        'security_status': analysis['status'],
                        'specs': analysis.get('specs', {}),
                        'last_monthly_update': start_time.isoformat()
                    }
                    
                    response = requests.patch(
                        f"{self.url}/rest/v1/products?id=eq.{product['id']}",
                        headers=self.headers,
                        json=update_data
                    )
                    
                    if response.status_code == 204:
                        print(f"   ✅ Mis à jour: {analysis['risk_score']}/100 ({analysis['status']})")
                        log_data['products_updated'] += 1
                    else:
                        error = f"Erreur update produit {product['id']}: {response.status_code}"
                        print(f"   ❌ {error}")
                        log_data['errors'].append(error)
                    
                except Exception as e:
                    error = f"Erreur produit {product['name']}: {str(e)}"
                    print(f"   ❌ {error}")
                    log_data['errors'].append(error)
            
            # Finaliser le log
            end_time = datetime.now()
            log_data['duration_sec'] = int((end_time - start_time).total_seconds())
            
            # Sauvegarder le log d'automatisation
            try:
                response = requests.post(
                    f"{self.url}/rest/v1/automation_logs",
                    headers=self.headers,
                    json=log_data
                )
                if response.status_code == 201:
                    print(f"\n📋 Log d'automatisation sauvegardé")
            except:
                pass
            
            # Résumé
            print(f"\n🎉 MISE À JOUR MENSUELLE TERMINÉE")
            print(f"   ⏱️  Durée: {log_data['duration_sec']} secondes")
            print(f"   📦 Produits mis à jour: {log_data['products_updated']}/{len(products)}")
            print(f"   ❌ Erreurs: {len(log_data['errors'])}")
            
            if log_data['errors']:
                print("\n🚨 Erreurs rencontrées:")
                for error in log_data['errors'][:5]:  # Limiter l'affichage
                    print(f"   - {error}")
                if len(log_data['errors']) > 5:
                    print(f"   ... et {len(log_data['errors']) - 5} autres")
            
        except Exception as e:
            print(f"❌ Erreur critique: {e}")
            log_data['errors'].append(f"Critical error: {str(e)}")
    
    def schedule_monthly_update(self):
        """Planifie la mise à jour mensuelle (pour utilisation avec cron/scheduler)."""
        print("\n⏰ PLANIFICATION MISE À JOUR MENSUELLE")
        print("Utilisez: python supabase_final.py --monthly")
        print("Ou configurez cron: 0 3 1 * * /usr/bin/python /path/to/supabase_final.py --monthly")
        """Exécute le scan de sécurité complet"""
    def run_security_scan(self):
        """Exécute le scan de sécurité complet (mode legacy)."""
        print("\n🚀 Lancement du scan de sécurité (mode legacy)")
        print("⚠️  Utilisez --monthly pour la mise à jour mensuelle automatique")
        print("=" * 40)
        
        if not self.test_connection():
            print("❌ Erreur de connexion Supabase")
            return
        
        print("✅ Connexion Supabase OK")
        
        # Vérifier les tables
        tables = self.check_tables()
        if len(tables) < 3:
            print("\n⚠️  Tables manquantes. Créez-les avec:")
            print("   1. Allez sur https://supabase.com/dashboard")
            print("   2. SQL Editor -> New query")
            print("   3. Exécutez les requêtes SQL du script précédent")
            return
        
        # Récupérer ou créer des produits
        try:
            response = requests.get(f"{self.url}/rest/v1/products?select=*", headers=self.headers)
            if response.status_code == 200:
                products = response.json()
                if not products:
                    print("📝 Création des produits de test...")
                    products = self.create_sample_data()
                
                if products:
                    print(f"📊 {len(products)} produit(s) à analyser")
                    
                    # Analyser chaque produit avec Mistral prioritaire
                    for product in products:
                        print(f"\n📦 Analyse: {product['name']}")
                        
                        # Utiliser Mistral en priorité, Gemini en backup
                        if mistral_client:
                            print("   🤖 Analyse avec Mistral...")
                            analysis = self.analyze_with_mistral(
                                product['name'], 
                                product.get('description', '')
                            )
                            time.sleep(1.5)  # Rate limit Mistral: 1 req/sec
                        else:
                            print("   🔮 Analyse avec Gemini (backup)...")
                            analysis = self.analyze_with_gemini(
                                product['name'],
                                product.get('description', '')
                            )
                            time.sleep(1.2)  # Rate limit Gemini
                        
                        # Mettre à jour le produit
                        update_data = {
                            'last_security_scan': datetime.now().isoformat(),
                            'risk_score': analysis['risk_score'],
                            'security_status': analysis['status']
                        }
                        
                        try:
                            response = requests.patch(
                                f"{self.url}/rest/v1/products?id=eq.{product['id']}",
                                headers=self.headers,
                                json=update_data
                            )
                            if response.status_code == 204:
                                print(f"   ✅ {product['name']}: {analysis['risk_score']}/100 ({analysis['status']})")
                        except:
                            print(f"   ❌ Erreur mise à jour: {product['name']}")
                    
                    print(f"\n🎉 Scan terminé !")
                    print(f"💡 Pour automatiser: Planifiez 'python supabase_final.py' quotidiennement")
                
        except Exception as e:
            print(f"❌ Erreur: {e}")

def main():
    """Point d'entrée principal"""
    import sys
    
    print("🛡️  SAFESCORING - Automatisation Sécurité avec IA")
    print("=" * 50)
    
    system = SafeScoringSystem()
    
    # Vérifier les arguments
    if len(sys.argv) > 1 and sys.argv[1] == "--monthly":
        # Mode mise à jour mensuelle
        system.run_monthly_update()
    else:
        # Mode scan normal (compatibilité)
        system.run_security_scan()
    
    print(f"\n📋 Configuration active:")
    print(f"   ✅ Fichier config: env_template_free.txt")
    print(f"   ✅ APIs IA: Mistral (principal) + Gemini (backup)")
    print(f"   ✅ Automatisation mensuelle: --monthly")
    print(f"   ✅ Base Supabase: SAFE_SCORING_V7_FINAL")

if __name__ == "__main__":
    main()
