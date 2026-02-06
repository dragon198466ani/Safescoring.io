#!/usr/bin/env python3
"""
Démonstration de mise à jour automatique Supabase avec IA
Version simplifiée avec variables intégrées
"""

import os
import json
import requests
from datetime import datetime

# Configuration directe (remplacer par vos vraies clés)
SUPABASE_URL = "https://ajdncttomdqojlozxjxu.supabase.co"
SUPABASE_SERVICE_KEY = "REVOKED_ROTATE_ON_DASHBOARD"
GOOGLE_API_KEY = "REVOKED_ROTATE_ON_DASHBOARD"

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
            response = requests.get(f"{self.url}/rest/v1/", headers=self.headers)
            print(f"Test connexion: Status {response.status_code}")
            return response.status_code == 200
        except Exception as e:
            print(f"Erreur connexion: {e}")
            return False
    
    def get_products(self):
        """Récupère la liste des produits"""
        try:
            response = requests.get(
                f"{self.url}/rest/v1/products?select=*",
                headers=self.headers
            )
            print(f"Récupération produits: Status {response.status_code}")
            if response.status_code == 200:
                return response.json()
            else:
                print(f"Erreur: {response.text}")
                return []
        except Exception as e:
            print(f"Exception: {e}")
            return []
    
    def create_table_if_not_exists(self):
        """Crée les tables nécessaires si elles n'existent pas"""
        print("🔧 Vérification/Création des tables...")
        
        # Note: Ceci nécessite les droits admin sur Supabase
        # Pour l'instant, nous supposons que les tables existent
        print("ℹ️  Les tables doivent être créées manuellement dans l'interface Supabase")
        print("   Tables requises: products, security_evaluations")
        return True
    
    def create_sample_product(self):
        """Crée un produit d'exemple"""
        sample_data = {
            'name': 'Application Web Demo',
            'description': 'Application de démonstration pour SafeScoring',
            'url': 'https://demo.example.com',
            'created_at': datetime.now().isoformat(),
            'last_security_scan': None,
            'risk_score': 0,
            'security_status': 'pending'
        }
        
        try:
            response = requests.post(
                f"{self.url}/rest/v1/products",
                headers=self.headers,
                json=sample_data
            )
            if response.status_code == 201:
                print("✅ Produit d'exemple créé avec succès")
                return True
            else:
                print(f"❌ Erreur création produit: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            print(f"Exception création produit: {e}")
            return False

def simulate_ai_analysis(product_name, product_url):
    """Simule une analyse IA avec Google Gemini"""
    print(f"🤖 Analyse IA pour: {product_name}")
    
    # Simulation - en réalité, utiliserait Google Gemini API
    import random
    
    risk_score = random.randint(20, 90)
    
    analysis = {
        'risk_score': risk_score,
        'vulnerabilities': [
            f'CVE-2024-{random.randint(1000, 9999)}',
            f'CVE-2024-{random.randint(1000, 9999)}'
        ] if risk_score > 60 else [],
        'recommendations': [
            'Mettre à jour les dépendances',
            'Activer HTTPS partout',
            'Implémenter l\'authentification 2FA'
        ] if risk_score > 50 else ['Aucune action immédiate requise'],
        'analysis_date': datetime.now().isoformat(),
        'ai_model': 'gemini-1.5-flash-simulation'
    }
    
    print(f"   Score de risque: {risk_score}/100")
    print(f"   Vulnérabilités trouvées: {len(analysis['vulnerabilities'])}")
    
    return analysis

def main():
    """Fonction principale de démonstration"""
    print("🚀 Démonstration SafeScoring - Mise à jour automatique Supabase avec IA")
    print("=" * 70)
    
    # Créer le client Supabase
    client = SimpleSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    # Tester la connexion
    print("\n📡 Test de connexion à Supabase...")
    if not client.test_connection():
        print("❌ Impossible de se connecter à Supabase")
        print("Vérifiez vos clés dans le script")
        return
    
    print("✅ Connexion réussie!")
    
    # Créer les tables si nécessaire
    client.create_table_if_not_exists()
    
    # Récupérer les produits existants
    print("\n📊 Récupération des produits...")
    products = client.get_products()
    
    if not products:
        print("📝 Aucun produit trouvé. Création d'un produit d'exemple...")
        if client.create_sample_product():
            products = client.get_products()
    
    if not products:
        print("❌ Impossible de récupérer ou créer des produits")
        return
    
    print(f"✅ {len(products)} produit(s) trouvé(s)")
    
    # Analyser chaque produit avec l'IA
    print("\n🔍 Lancement des analyses IA...")
    updates_count = 0
    
    for i, product in enumerate(products[:3], 1):  # Limite à 3 produits pour la démo
        print(f"\n--- Analyse {i}/{3}: {product.get('name', 'N/A')} ---")
        
        # Analyse IA simulée
        ai_result = simulate_ai_analysis(
            product.get('name', ''),
            product.get('url', '')
        )
        
        # Préparer les données de mise à jour
        update_data = {
            'last_security_scan': datetime.now().isoformat(),
            'risk_score': ai_result['risk_score'],
            'security_status': 'secure' if ai_result['risk_score'] < 40 else 'warning' if ai_result['risk_score'] < 70 else 'critical'
        }
        
        # Mettre à jour le produit
        try:
            response = requests.patch(
                f"{SUPABASE_URL}/rest/v1/products?id=eq.{product['id']}",
                headers=client.headers,
                json=update_data
            )
            
            if response.status_code == 204:
                print(f"✅ Produit mis à jour (Score: {ai_result['risk_score']}/100)")
                updates_count += 1
            else:
                print(f"❌ Erreur mise à jour: {response.status_code}")
                
        except Exception as e:
            print(f"❌ Exception mise à jour: {e}")
    
    # Résumé
    print(f"\n🎉 Analyse terminée!")
    print(f"   📊 Produits analysés: {len(products[:3])}")
    print(f"   ✅ Mises à jour réussies: {updates_count}")
    
    print(f"\n💡 Prochaines étapes pour l'automatisation complète:")
    print(f"   1. Configurer Google Gemini API pour l'analyse réelle")
    print(f"   2. Mettre en place un cron job (Windows Task Scheduler)")
    print(f"   3. Ajouter des notifications (Telegram, Email)")
    print(f"   4. Implémenter le monitoring des vulnérabilités CVE")

if __name__ == "__main__":
    main()
