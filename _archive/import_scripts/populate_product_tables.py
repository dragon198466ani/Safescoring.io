#!/usr/bin/env python3
"""
SAFESCORING.IO - Peuplement de la table product_tables
Crée les entrées dans product_tables depuis les produits existants
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

class ProductTablesPopulator:
    def __init__(self):
        self.headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}',
            'Content-Type': 'application/json'
        }
        
        print("📊 PEUPLEMENT TABLE PRODUCT_TABLES")
        print("=" * 60)
    
    def get_all_products(self):
        """Récupère tous les produits"""
        try:
            response = requests.get(
                f"{SUPABASE_URL}/rest/v1/products?select=id,name,slug,type_id,brand_id,url",
                headers=self.headers,
                timeout=30
            )
            
            if response.status_code == 200:
                return response.json()
            return []
        except:
            return []
    
    def get_product_types(self):
        """Récupère les types de produits"""
        try:
            response = requests.get(
                f"{SUPABASE_URL}/rest/v1/product_types?select=id,code,name",
                headers=self.headers,
                timeout=30
            )
            
            if response.status_code == 200:
                return {t['id']: t for t in response.json()}
            return {}
        except:
            return {}
    
    def get_brands(self):
        """Récupère les marques"""
        try:
            response = requests.get(
                f"{SUPABASE_URL}/rest/v1/brands?select=id,name",
                headers=self.headers,
                timeout=30
            )
            
            if response.status_code == 200:
                return {b['id']: b for b in response.json()}
            return {}
        except:
            return {}
    
    def determine_supplier(self, product_name, brand_name):
        """Détermine le fournisseur basé sur le nom"""
        name_lower = product_name.lower()
        
        # Fournisseurs connus
        suppliers = {
            'ledger': 'Ledger SAS',
            'trezor': 'SatoshiLabs',
            'metamask': 'ConsenSys',
            'binance': 'Binance Holdings',
            'coinbase': 'Coinbase Inc',
            'trust': 'Trust Wallet',
            'exodus': 'Exodus Movement',
            'atomic': 'Atomic Wallet',
            'safepal': 'SafePal',
            'ellipal': 'Ellipal'
        }
        
        for key, supplier in suppliers.items():
            if key in name_lower or (brand_name and key in brand_name.lower()):
                return supplier
        
        return brand_name if brand_name else 'Unknown'
    
    def estimate_price(self, product_name, product_type):
        """Estime le prix basé sur le type de produit"""
        name_lower = product_name.lower()
        
        # Prix estimés par type
        if 'hw' in product_type.lower() or 'hardware' in product_type.lower():
            if 'nano s' in name_lower:
                return 59.00
            elif 'nano x' in name_lower:
                return 149.00
            elif 'trezor one' in name_lower:
                return 69.00
            elif 'trezor model t' in name_lower:
                return 219.00
            else:
                return 99.00
        elif 'sw' in product_type.lower() or 'software' in product_type.lower():
            return 0.00  # Gratuit
        elif 'exchange' in product_type.lower() or 'cex' in product_type.lower():
            return 0.00  # Gratuit (frais de trading séparés)
        elif 'card' in product_type.lower():
            return 15.00
        else:
            return 0.00
    
    def populate_product_tables(self):
        """Peuple la table product_tables"""
        print("\n📦 Récupération des produits...")
        
        products = self.get_all_products()
        types_map = self.get_product_types()
        brands_map = self.get_brands()
        
        if not products:
            print("❌ Aucun produit trouvé")
            return 0
        
        print(f"   ✅ {len(products)} produits trouvés")
        print(f"   ✅ {len(types_map)} types chargés")
        print(f"   ✅ {len(brands_map)} marques chargées")
        
        print("\n📝 Création des entrées product_tables...")
        
        product_tables_entries = []
        
        for product in products:
            try:
                # Récupérer les infos du type et de la marque
                type_id = product.get('type_id')
                brand_id = product.get('brand_id')
                
                type_info = types_map.get(type_id, {})
                brand_info = brands_map.get(brand_id, {})
                
                type_name = type_info.get('name', 'Unknown')
                brand_name = brand_info.get('name', '')
                
                # Déterminer le fournisseur
                supplier = self.determine_supplier(product['name'], brand_name)
                
                # Estimer le prix
                price = self.estimate_price(product['name'], type_name)
                
                # Créer l'entrée
                entry = {
                    'type_product': type_name,
                    'name_product': product['name'],
                    'supplier': supplier,
                    'price': price,
                    'link_supplier': product.get('url', '')
                }
                
                product_tables_entries.append(entry)
                
            except Exception as e:
                print(f"   ⚠️  Erreur produit {product.get('name', 'N/A')}: {e}")
        
        print(f"   📊 {len(product_tables_entries)} entrées à insérer")
        
        # Insérer dans la base
        return self._batch_insert('product_tables', product_tables_entries)
    
    def _batch_insert(self, table, data):
        """Insère par batch"""
        if not data:
            return 0
        
        inserted = 0
        batch_size = 50
        
        for i in range(0, len(data), batch_size):
            batch = data[i:i+batch_size]
            
            try:
                response = requests.post(
                    f"{SUPABASE_URL}/rest/v1/{table}",
                    headers=self.headers,
                    json=batch,
                    timeout=60
                )
                
                if response.status_code in [200, 201]:
                    inserted += len(batch)
                    print(f"   ✅ Batch {i//batch_size + 1}: {len(batch)} insérés")
                elif response.status_code == 409:
                    inserted += len(batch)
                    print(f"   ⚠️  Batch {i//batch_size + 1}: déjà existant")
                else:
                    print(f"   ❌ Batch {i//batch_size + 1}: {response.status_code}")
                    print(f"      {response.text[:200]}")
                    
            except Exception as e:
                print(f"   ❌ Batch {i//batch_size + 1}: {e}")
        
        return inserted
    
    def run_population(self):
        """Exécute le peuplement"""
        print("🚀 DÉMARRAGE PEUPLEMENT")
        print("=" * 60)
        
        # Test connexion
        try:
            response = requests.get(f"{SUPABASE_URL}/rest/v1/", headers=self.headers, timeout=10)
            if response.status_code != 200:
                print("❌ Erreur connexion Supabase")
                return False
        except:
            print("❌ Erreur connexion Supabase")
            return False
        
        print("✅ Connexion Supabase OK")
        
        # Peupler product_tables
        count = self.populate_product_tables()
        
        # Résumé
        print("\n🎉 PEUPLEMENT TERMINÉ")
        print("=" * 60)
        print(f"   📊 Entrées product_tables: {count}")
        
        print("\n✨ Prochaine étape:")
        print("   - Vérifiez dans Supabase Dashboard")
        print("   - Table: product_tables")
        
        return True

def main():
    populator = ProductTablesPopulator()
    populator.run_population()

if __name__ == "__main__":
    main()
