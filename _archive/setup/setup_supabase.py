#!/usr/bin/env python3
"""
SAFESCORING.IO - Script de configuration Supabase
Crée les tables de base et données de test
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

class SupabaseSetup:
    def __init__(self):
        self.headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}',
            'Content-Type': 'application/json'
        }
    
    def execute_sql(self, sql: str) -> bool:
        """Exécute du SQL via REST API"""
        try:
            data = {'query': sql}
            response = requests.post(
                f"{SUPABASE_URL}/rest/v1/rpc/execute_sql",
                headers=self.headers,
                json=data,
                timeout=30
            )
            
            if response.status_code == 200:
                print("✅ SQL exécuté avec succès")
                return True
            else:
                print(f"❌ Erreur SQL: {response.status_code}")
                print(f"Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Erreur SQL: {e}")
            return False
    
    def create_minimal_tables(self):
        """Crée les tables minimales pour tester"""
        
        # Tables de base
        tables_sql = """
-- Table produits (simplifiée)
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    url VARCHAR(255),
    risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
    security_status VARCHAR(20) DEFAULT 'pending' CHECK (security_status IN ('pending', 'secure', 'warning', 'critical')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_security_scan TIMESTAMP,
    last_monthly_update TIMESTAMP
);

-- Table logs d'automatisation
CREATE TABLE IF NOT EXISTS automation_logs (
    id SERIAL PRIMARY KEY,
    run_date TIMESTAMP NOT NULL,
    run_type VARCHAR(20) DEFAULT 'monthly',
    products_updated INTEGER DEFAULT 0,
    ai_service VARCHAR(50),
    duration_sec INTEGER DEFAULT 0,
    errors JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
"""
        
        print("🗄️  Création des tables...")
        if self.execute_sql(tables_sql):
            print("✅ Tables créées")
            return True
        return False
    
    def insert_test_data(self):
        """Insère des données de test"""
        
        products = [
            {
                'slug': 'ledger-nano-x',
                'name': 'Ledger Nano X',
                'description': 'Hardware wallet Bluetooth',
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
                'description': 'Software wallet browser extension',
                'url': 'https://metamask.io/',
                'risk_score': 0,
                'security_status': 'pending'
            }
        ]
        
        print("📝 Insertion données de test...")
        
        for product in products:
            try:
                response = requests.post(
                    f"{SUPABASE_URL}/rest/v1/products",
                    headers=self.headers,
                    json=product,
                    timeout=30
                )
                
                if response.status_code in [201, 409]:  # 409 == déjà existe
                    print(f"   ✅ {product['name']}")
                else:
                    print(f"   ❌ {product['name']}: {response.status_code}")
                    
            except Exception as e:
                print(f"   ❌ {product['name']}: {e}")
    
    def check_tables(self):
        """Vérifie les tables existantes"""
        try:
            response = requests.get(
                f"{SUPABASE_URL}/rest/v1/products?select=count&limit=1",
                headers=self.headers,
                timeout=10
            )
            
            if response.status_code == 200:
                return True
            return False
            
        except:
            return False
    
    def run_setup(self):
        """Exécute le setup complet"""
        print("🔧 SETUP SUPABASE SAFESCORING")
        print("=" * 40)
        
        # Vérifier connexion
        try:
            response = requests.get(f"{SUPABASE_URL}/rest/v1/", headers=self.headers, timeout=10)
            if response.status_code != 200:
                print("❌ Erreur connexion Supabase")
                return False
        except:
            print("❌ Erreur connexion Supabase")
            return False
        
        print("✅ Connexion Supabase OK")
        
        # Vérifier si tables existent
        if self.check_tables():
            print("📋 Tables déjà existantes")
        else:
            # Créer tables
            if not self.create_minimal_tables():
                print("❌ Erreur création tables")
                return False
        
        # Insérer données de test
        self.insert_test_data()
        
        print("\n🎉 SETUP TERMINÉ")
        print("Vous pouvez maintenant lancer: python simple_automation.py")
        
        return True

def main():
    setup = SupabaseSetup()
    success = setup.run_setup()
    
    if success:
        print("\n✨ Prochaine étape:")
        print("   python simple_automation.py")

if __name__ == "__main__":
    main()
