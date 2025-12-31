#!/usr/bin/env python3
"""
SAFESCORING.IO - Setup rapide avec API REST
Crée directement les produits de test
"""

import os
import json
import requests
from datetime import datetime

# Charger configuration
def load_config():
    config = {}
    config_path = os.path.join(os.path.dirname(__file__), 'env_template_free.txt')
    
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

class QuickSetup:
    def __init__(self):
        self.headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}',
            'Content-Type': 'application/json'
        }
    
    def test_connection(self):
        """Test connexion Supabase"""
        try:
            response = requests.get(f"{SUPABASE_URL}/rest/v1/", headers=self.headers, timeout=10)
            return response.status_code == 200
        except:
            return False
    
    def check_products_table(self):
        """Vérifie si la table products existe"""
        try:
            response = requests.get(
                f"{SUPABASE_URL}/rest/v1/products?select=count&limit=1",
                headers=self.headers,
                timeout=10
            )
            
            if response.status_code == 200:
                print("✅ Table products existe")
                return True
            elif response.status_code == 404:
                print("❌ Table products n'existe pas")
                return False
            else:
                print(f"❌ Erreur: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Erreur: {e}")
            return False
    
    def create_test_products(self):
        """Crée les produits de test"""
        products = [
            {
                'slug': 'ledger-nano-x',
                'name': 'Ledger Nano X',
                'description': 'Hardware wallet Bluetooth avec écran',
                'url': 'https://www.ledger.com/products/ledger-nano-x',
                'risk_score': 0,
                'security_status': 'pending'
            },
            {
                'slug': 'trezor-model-t',
                'name': 'Trezor Model T', 
                'description': 'Hardware wallet avec écran tactile',
                'url': 'https://www.trezor.io/trezor-model-t',
                'risk_score': 0,
                'security_status': 'pending'
            },
            {
                'slug': 'metamask-wallet',
                'name': 'MetaMask Wallet',
                'description': 'Software wallet extension navigateur',
                'url': 'https://metamask.io/',
                'risk_score': 0,
                'security_status': 'pending'
            },
            {
                'slug': 'binance-wallet',
                'name': 'Binance Web3 Wallet',
                'description': 'Wallet intégré Binance',
                'url': 'https://www.binance.com/en/web3-wallet',
                'risk_score': 0,
                'security_status': 'pending'
            },
            {
                'slug': 'coinbase-wallet',
                'name': 'Coinbase Wallet',
                'description': 'Software wallet Coinbase',
                'url': 'https://www.coinbase.com/wallet',
                'risk_score': 0,
                'security_status': 'pending'
            }
        ]
        
        print("📝 Création produits de test...")
        
        created = 0
        for product in products:
            try:
                response = requests.post(
                    f"{SUPABASE_URL}/rest/v1/products",
                    headers=self.headers,
                    json=product,
                    timeout=30
                )
                
                if response.status_code == 201:
                    print(f"   ✅ {product['name']} créé")
                    created += 1
                elif response.status_code == 409:  # Conflit/déjà existe
                    print(f"   ⚠️  {product['name']} existe déjà")
                    created += 1
                else:
                    print(f"   ❌ {product['name']}: {response.status_code} - {response.text}")
                    
            except Exception as e:
                print(f"   ❌ {product['name']}: {e}")
        
        return created
    
    def check_existing_products(self):
        """Vérifie les produits existants"""
        try:
            response = requests.get(
                f"{SUPABASE_URL}/rest/v1/products?select=id,name,slug&limit=10",
                headers=self.headers,
                timeout=10
            )
            
            if response.status_code == 200:
                products = response.json()
                print(f"📊 {len(products)} produit(s) trouvé(s):")
                for p in products:
                    print(f"   - {p['name']} ({p['slug']})")
                return products
            else:
                print("❌ Erreur récupération produits")
                return []
                
        except Exception as e:
            print(f"❌ Erreur: {e}")
            return []
    
    def run_setup(self):
        """Exécute le setup rapide"""
        print("🚀 SETUP RAPIDE SUPABASE")
        print("=" * 40)
        
        # Test connexion
        if not self.test_connection():
            print("❌ Erreur connexion Supabase")
            return False
        
        print("✅ Connexion Supabase OK")
        
        # Vérifier table
        if not self.check_products_table():
            print("\n❌ La table products n'existe pas.")
            print("📋 Instructions manuelles:")
            print("1. Allez sur https://supabase.com/dashboard")
            print("2. Sélectionnez votre projet")
            print("3. SQL Editor > New query")
            print("4. Copiez-collez le contenu de create_tables.sql")
            print("5. Exécutez le script")
            print("6. Relancez: python quick_setup.py")
            return False
        
        # Vérifier produits existants
        existing = self.check_existing_products()
        
        if existing:
            print(f"\n✅ {len(existing)} produits déjà en base")
        else:
            # Créer produits de test
            created = self.create_test_products()
            if created > 0:
                print(f"\n✅ {created} produits créés")
            else:
                print("\n❌ Aucun produit créé")
                return False
        
        print("\n🎉 SETUP TERMINÉ")
        print("Vous pouvez maintenant lancer l'automatisation:")
        print("   python simple_automation.py")
        
        return True

def main():
    setup = QuickSetup()
    success = setup.run_setup()
    
    if success:
        print("\n🔄 Lancement de l'automatisation...")
        print("   python simple_automation.py")

if __name__ == "__main__":
    main()
