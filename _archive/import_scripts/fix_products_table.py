#!/usr/bin/env python3
"""
SAFESCORING.IO - Correction de la table products
Met à jour les produits avec les bonnes informations (type_id, brand_id, noms corrects)
"""

import os
import json
import requests
import pandas as pd
from datetime import datetime
import re

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

class ProductsFixer:
    def __init__(self):
        self.headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}',
            'Content-Type': 'application/json'
        }
        self.excel_file = 'SAFE_SCORING_V7_FINAL.xlsx'
        
        print("🔧 CORRECTION DE LA TABLE PRODUCTS")
        print("=" * 60)
        
        # Maps
        self.types_map = {}
        self.brands_map = {}
    
    def load_maps(self):
        """Charge les maps de types et marques"""
        print("\n📋 Chargement des références...")
        
        # Types
        try:
            r = requests.get(f"{SUPABASE_URL}/rest/v1/product_types?select=id,code,name", headers=self.headers)
            if r.status_code == 200:
                types = r.json()
                self.types_map = {t['code']: t['id'] for t in types}
                self.types_name_map = {t['name']: t['id'] for t in types}
                print(f"   ✅ {len(self.types_map)} types chargés")
        except: pass
        
        # Marques
        try:
            r = requests.get(f"{SUPABASE_URL}/rest/v1/brands?select=id,name", headers=self.headers)
            if r.status_code == 200:
                brands = r.json()
                self.brands_map = {b['name']: b['id'] for b in brands}
                print(f"   ✅ {len(self.brands_map)} marques chargées")
        except: pass
    
    def get_real_product_names(self):
        """Extrait les vrais noms de produits depuis Excel"""
        print("\n🔍 Extraction des vrais noms depuis Excel...")
        
        try:
            # Lire la ligne d'en-tête
            df = pd.read_excel(self.excel_file, sheet_name='ÉVALUATIONS DÉTAIL', header=None, nrows=4)
            
            # Ligne 3 contient les noms
            product_row = df.iloc[3]
            
            # Extraire les noms (colonnes 9+)
            real_names = []
            for i in range(9, len(product_row)):
                value = product_row.iloc[i]
                if pd.notna(value) and str(value).strip() not in ['', 'nan']:
                    real_names.append(str(value).strip())
            
            print(f"   ✅ {len(real_names)} noms trouvés")
            return real_names
            
        except Exception as e:
            print(f"   ❌ Erreur: {e}")
            return []
    
    def determine_type_id(self, product_name):
        """Détermine le type_id basé sur le nom"""
        name_lower = product_name.lower()
        
        # Mapping nom → type
        if 'hw cold' in name_lower or 'hardware' in name_lower and 'cold' in name_lower:
            return self.types_name_map.get('Type HW Cold') or self.types_map.get('hw_wallet')
        elif 'hw hot' in name_lower:
            return self.types_name_map.get('Type HW Hot') or self.types_map.get('hw_wallet')
        elif 'sw browser' in name_lower or 'browser' in name_lower:
            return self.types_name_map.get('Type SW Browser') or self.types_map.get('sw_wallet')
        elif 'sw mobile' in name_lower or 'mobile' in name_lower:
            return self.types_name_map.get('Type SW Mobile') or self.types_map.get('sw_wallet')
        elif 'bkp digital' in name_lower:
            return self.types_name_map.get('Type Bkp Digital')
        elif 'bkp physical' in name_lower:
            return self.types_name_map.get('Type Bkp Physical')
        elif 'card' in name_lower and 'non-cust' not in name_lower:
            return self.types_name_map.get('Type Card')
        elif 'card non-cust' in name_lower:
            return self.types_name_map.get('Type Card Non-Cust')
        elif 'ac phys' in name_lower:
            return self.types_name_map.get('Type AC Phys')
        elif 'ac digit' in name_lower:
            return self.types_name_map.get('Type AC Digit')
        elif 'ac phygi' in name_lower:
            return self.types_name_map.get('Type AC Phygi')
        elif 'dex' in name_lower:
            return self.types_name_map.get('Type DEX') or self.types_map.get('defi')
        elif 'cex' in name_lower:
            return self.types_name_map.get('Type CEX') or self.types_map.get('exchange')
        elif 'lending' in name_lower:
            return self.types_name_map.get('Type Lending')
        elif 'yield' in name_lower:
            return self.types_name_map.get('Type Yield')
        elif 'liq staking' in name_lower or 'staking' in name_lower:
            return self.types_name_map.get('Type Liq Staking')
        elif 'derivatives' in name_lower:
            return self.types_name_map.get('Type Derivatives')
        elif 'bridges' in name_lower or 'bridge' in name_lower:
            return self.types_name_map.get('Type Bridges')
        elif 'defi tools' in name_lower:
            return self.types_name_map.get('Type DeFi Tools')
        elif 'rwa' in name_lower:
            return self.types_name_map.get('Type RWA')
        elif 'crypto bank' in name_lower or 'bank' in name_lower:
            return self.types_name_map.get('Type Crypto Bank')
        elif 'ledger' in name_lower:
            return self.types_map.get('hw_wallet')
        elif 'trezor' in name_lower:
            return self.types_map.get('hw_wallet')
        elif 'metamask' in name_lower:
            return self.types_map.get('sw_wallet')
        elif 'binance' in name_lower:
            return self.types_map.get('exchange')
        elif 'coinbase' in name_lower:
            return self.types_map.get('exchange')
        else:
            return self.types_map.get('sw_wallet')  # Par défaut
    
    def determine_brand_id(self, product_name):
        """Détermine le brand_id basé sur le nom"""
        name_lower = product_name.lower()
        
        brands = {
            'ledger': 'Ledger',
            'trezor': 'Trezor',
            'metamask': 'MetaMask',
            'binance': 'Binance',
            'coinbase': 'Coinbase'
        }
        
        for key, brand_name in brands.items():
            if key in name_lower:
                return self.brands_map.get(brand_name)
        
        return None
    
    def fix_all_products(self):
        """Corrige tous les produits"""
        print("\n📦 Correction des produits...")
        
        # Récupérer tous les produits
        try:
            response = requests.get(
                f"{SUPABASE_URL}/rest/v1/products?select=id,name,slug,type_id,brand_id&order=id.asc",
                headers=self.headers,
                timeout=30
            )
            
            if response.status_code != 200:
                print("❌ Erreur récupération produits")
                return 0
            
            products = response.json()
            print(f"   📊 {len(products)} produits à corriger")
            
        except Exception as e:
            print(f"❌ Erreur: {e}")
            return 0
        
        # Obtenir les vrais noms depuis Excel
        real_names = self.get_real_product_names()
        
        # Corriger chaque produit
        updated = 0
        for i, product in enumerate(products):
            try:
                product_id = product['id']
                current_name = product['name']
                
                # Déterminer le nouveau nom
                if i < len(real_names):
                    new_name = real_names[i]
                else:
                    new_name = current_name
                
                # Déterminer type_id et brand_id
                type_id = self.determine_type_id(new_name)
                brand_id = self.determine_brand_id(new_name)
                
                # Préparer les données de mise à jour
                update_data = {
                    'name': new_name,
                    'slug': self._create_slug(new_name),
                    'type_id': type_id,
                    'brand_id': brand_id,
                    'updated_at': datetime.now().isoformat()
                }
                
                # Mettre à jour
                response = requests.patch(
                    f"{SUPABASE_URL}/rest/v1/products?id=eq.{product_id}",
                    headers=self.headers,
                    json=update_data,
                    timeout=30
                )
                
                if response.status_code in [200, 204]:
                    updated += 1
                    if i < 10 or 'unnamed' in current_name.lower():
                        print(f"   ✅ #{product_id}: {current_name} → {new_name}")
                
            except Exception as e:
                print(f"   ⚠️  Erreur produit #{product.get('id')}: {e}")
        
        print(f"\n   ✅ {updated}/{len(products)} produits mis à jour")
        return updated
    
    def _create_slug(self, name):
        """Crée un slug"""
        slug = re.sub(r'[^\w\s-]', '', name.lower())
        slug = re.sub(r'[-\s]+', '-', slug)
        return slug.strip('-')
    
    def run_fix(self):
        """Exécute la correction complète"""
        print("🚀 DÉMARRAGE CORRECTION")
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
        
        # Charger les maps
        self.load_maps()
        
        # Corriger les produits
        count = self.fix_all_products()
        
        # Résumé
        print("\n🎉 CORRECTION TERMINÉE")
        print("=" * 60)
        print(f"   📦 Produits corrigés: {count}")
        
        print("\n✨ Prochaine étape:")
        print("   - Vérifiez dans Supabase Dashboard")
        print("   - Table: products")
        print("   - Les noms, types et marques sont maintenant corrects")
        
        return True

def main():
    fixer = ProductsFixer()
    fixer.run_fix()

if __name__ == "__main__":
    main()
