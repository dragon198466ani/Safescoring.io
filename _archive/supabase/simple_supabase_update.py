#!/usr/bin/env python3
"""
Mise à jour automatique de Supabase avec IA (Version simple)
Utilise requests directement pour éviter les problèmes de dépendances
"""

import os
import json
import requests
from dotenv import load_dotenv
from datetime import datetime

# Charger les variables d'environnement
def load_env_manually():
    """Charge le fichier .env manuellement"""
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    print(f"Chemin du fichier .env: {env_path}")
    
    if os.path.exists(env_path):
        print("Fichier .env trouvé, lecture...")
        with open(env_path, 'r') as f:
            content = f.read()
            print(f"Contenu du fichier:\n{content}")
            
            for line_num, line in enumerate(content.split('\n'), 1):
                line = line.strip()
                print(f"Ligne {line_num}: '{line}'")
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    key = key.strip()
                    value = value.strip()
                    os.environ[key] = value
                    print(f"  -> Variable chargée: {key} = {value[:20]}...")
    else:
        print(f"Fichier .env non trouvé: {env_path}")

load_env_manually()

class SimpleSupabaseClient:
    """Client Supabase utilisant requests directement"""
    
    def __init__(self, url, key):
        self.url = url
        self.key = key
        self.headers = {
            'apikey': key,
            'Authorization': f'Bearer {key}',
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        }
    
    def test_connection(self):
        """Test la connexion à Supabase"""
        try:
            # Essayer de récupérer les informations du projet
            response = requests.get(f"{self.url}/rest/v1/", headers=self.headers)
            return response.status_code == 200
        except:
            return False
    
    def get_products(self):
        """Récupère la liste des produits"""
        try:
            response = requests.get(
                f"{self.url}/rest/v1/products?select=*",
                headers=self.headers
            )
            if response.status_code == 200:
                return response.json()
            else:
                print(f"Erreur récupération produits: {response.status_code}")
                return []
        except Exception as e:
            print(f"Exception récupération produits: {e}")
            return []
    
    def update_product(self, product_id, data):
        """Met à jour un produit"""
        try:
            response = requests.patch(
                f"{self.url}/rest/v1/products?id=eq.{product_id}",
                headers=self.headers,
                json=data
            )
            return response.status_code == 204
        except Exception as e:
            print(f"Exception mise à jour produit: {e}")
            return False
    
    def insert_evaluation(self, evaluation_data):
        """Insère une évaluation"""
        try:
            response = requests.post(
                f"{self.url}/rest/v1/security_evaluations",
                headers=self.headers,
                json=evaluation_data
            )
            return response.status_code == 201
        except Exception as e:
            print(f"Exception insertion évaluation: {e}")
            return False

def simulate_ai_analysis(product_name):
    """Simule une analyse IA pour l'exemple"""
    # En réalité, ceci utiliserait Google Gemini ou Mistral
    return {
        'risk_score': 75,
        'vulnerabilities': ['CVE-2024-1234', 'CVE-2024-5678'],
        'recommendations': ['Mettre à jour la version', 'Activer l\'authentification 2FA'],
        'analysis_date': datetime.now().isoformat()
    }

def main():
    """Fonction principale"""
    print("🚀 Mise à jour automatique Supabase avec IA")
    print("=" * 50)
    
    # Debug: vérifier le chargement du fichier .env
    print(f"Répertoire courant: {os.getcwd()}")
    print(f"Fichier .env existe: {os.path.exists('.env')}")
    
    # Récupérer les clés
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_KEY')
    
    print(f"SUPABASE_URL: {supabase_url}")
    print(f"SUPABASE_SERVICE_KEY: {supabase_key[:20] if supabase_key else 'None'}...")
    
    if not supabase_url or not supabase_key:
        print("❌ Variables SUPABASE_URL ou SUPABASE_SERVICE_KEY manquantes")
        print("Variables disponibles:", [k for k in os.environ.keys() if 'SUPABASE' in k or 'GOOGLE' in k])
        return
    
    # Créer le client
    client = SimpleSupabaseClient(supabase_url, supabase_key)
    
    # Tester la connexion
    if not client.test_connection():
        print("❌ Impossible de se connecter à Supabase")
        return
    
    print("✅ Connexion à Supabase réussie!")
    
    # Récupérer les produits
    products = client.get_products()
    print(f"📊 {len(products)} produit(s) trouvé(s)")
    
    if not products:
        print("ℹ️  Aucun produit trouvé. Création d'un exemple...")
        # Créer un produit d'exemple
        example_product = {
            'name': 'Application Web Test',
            'description': 'Application de test pour démonstration',
            'url': 'https://example.com',
            'created_at': datetime.now().isoformat()
        }
        
        response = requests.post(
            f"{supabase_url}/rest/v1/products",
            headers=client.headers,
            json=example_product
        )
        
        if response.status_code == 201:
            print("✅ Produit d'exemple créé")
            products = client.get_products()
        else:
            print("❌ Impossible de créer le produit d'exemple")
            return
    
    # Analyser et mettre à jour chaque produit
    updates_count = 0
    for product in products[:3]:  # Limiter à 3 produits pour le test
        print(f"\n🔍 Analyse du produit: {product.get('name', 'N/A')}")
        
        # Simuler l'analyse IA
        ai_result = simulate_ai_analysis(product.get('name', ''))
        
        # Mettre à jour le produit avec les résultats
        update_data = {
            'last_security_scan': datetime.now().isoformat(),
            'risk_score': ai_result['risk_score'],
            'security_status': 'analyzed' if ai_result['risk_score'] < 80 else 'high_risk'
        }
        
        if client.update_product(product['id'], update_data):
            print(f"✅ Produit {product['id']} mis à jour")
            updates_count += 1
            
            # Insérer l'évaluation détaillée
            evaluation_data = {
                'product_id': product['id'],
                'ai_analysis': ai_result,
                'created_at': datetime.now().isoformat()
            }
            
            if client.insert_evaluation(evaluation_data):
                print(f"✅ Évaluation enregistrée pour le produit {product['id']}")
            else:
                print(f"❌ Erreur lors de l'enregistrement de l'évaluation")
        else:
            print(f"❌ Erreur lors de la mise à jour du produit {product['id']}")
    
    print(f"\n🎉 Mise à jour terminée! {updates_count} produit(s) mis à jour(s)")
    print("\n💡 Pour automatiser complètement:")
    print("   - Intégrer Google Gemini API pour l'analyse réelle")
    print("   - Ajouter un cron job pour exécution automatique")
    print("   - Configurer des notifications Telegram/email")

if __name__ == "__main__":
    main()
