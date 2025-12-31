#!/usr/bin/env python3
"""
SAFESCORING.IO - TRANSFERT FINAL EXCEL → SUPABASE
Colonnes adaptées aux tables existantes
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

class FinalTransfer:
    def __init__(self):
        self.headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}',
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        }
        self.excel_file = 'SAFE_SCORING_V7_FINAL.xlsx'
        
        self.types_map = {}
        self.brands_map = {}
        self.norms_map = {}
        self.products_map = {}
        self.stats = {}
        
        print("🚀 TRANSFERT FINAL EXCEL → SUPABASE")
        print("=" * 70)
    
    def test_connection(self):
        try:
            response = requests.get(f"{SUPABASE_URL}/rest/v1/", headers=self.headers, timeout=10)
            return response.status_code == 200
        except:
            return False
    
    def clear_tables(self):
        """Vide les tables pour réimporter proprement"""
        print("\n🗑️  Nettoyage des tables...")
        
        tables = ['evaluations', 'products', 'norms', 'brands', 'product_types']
        for table in tables:
            try:
                requests.delete(f"{SUPABASE_URL}/rest/v1/{table}?id=gte.0", headers=self.headers, timeout=30)
                print(f"   ✅ {table} vidée")
            except:
                pass
    
    # ========================================
    # MARQUES - Colonnes: name, website, logo_url
    # ========================================
    def import_brands(self):
        print("\n🏷️ [1/5] Marques → brands")
        print("-" * 50)
        
        brands_data = [
            {'name': 'Ledger', 'website': 'https://www.ledger.com'},
            {'name': 'Trezor', 'website': 'https://www.trezor.io'},
            {'name': 'MetaMask', 'website': 'https://metamask.io'},
            {'name': 'Binance', 'website': 'https://www.binance.com'},
            {'name': 'Coinbase', 'website': 'https://www.coinbase.com'},
            {'name': 'Trust Wallet', 'website': 'https://trustwallet.com'},
            {'name': 'Exodus', 'website': 'https://www.exodus.com'},
            {'name': 'Atomic Wallet', 'website': 'https://atomicwallet.io'},
            {'name': 'SafePal', 'website': 'https://www.safepal.io'},
            {'name': 'Ellipal', 'website': 'https://www.ellipal.com'},
            {'name': 'BitBox', 'website': 'https://shiftcrypto.ch'},
            {'name': 'Coldcard', 'website': 'https://coldcard.com'},
            {'name': 'Gnosis', 'website': 'https://gnosis.io'},
            {'name': 'Uniswap', 'website': 'https://uniswap.org'},
            {'name': 'Aave', 'website': 'https://aave.com'},
            {'name': 'Lido', 'website': 'https://lido.fi'},
            {'name': 'Deblock', 'website': 'https://deblock.com'},
            {'name': 'Morpho', 'website': 'https://morpho.org'},
            {'name': 'Kraken', 'website': 'https://www.kraken.com'},
            {'name': 'Crypto.com', 'website': 'https://crypto.com'},
        ]
        
        print(f"   📊 {len(brands_data)} marques")
        count = self._batch_insert('brands', brands_data)
        self.stats['brands'] = count
        self._load_brands_map()
        return count
    
    # ========================================
    # TYPES - Colonnes: code, name, category
    # ========================================
    def import_types(self):
        print("\n📂 [2/5] Types → product_types")
        print("-" * 50)
        
        try:
            df = pd.read_excel(self.excel_file, sheet_name='DÉFINITIONS TYPES', header=2)
            
            types = []
            for index, row in df.iterrows():
                code = str(row.iloc[0]).strip() if pd.notna(row.iloc[0]) else ''
                if not code or code == 'nan' or 'DÉFINITIONS' in code:
                    continue
                
                name = str(row.iloc[1]).strip() if len(row) > 1 and pd.notna(row.iloc[1]) else code
                if name == 'nan':
                    name = code
                
                category = str(row.iloc[3]).strip() if len(row) > 3 and pd.notna(row.iloc[3]) else 'General'
                if category == 'nan':
                    category = 'General'
                
                product_type = {
                    'code': code,
                    'name': name,
                    'category': category
                }
                types.append(product_type)
            
            print(f"   📊 {len(types)} types trouvés")
            count = self._batch_insert('product_types', types)
            self.stats['product_types'] = count
            self._load_types_map()
            return count
            
        except Exception as e:
            print(f"   ❌ Erreur: {e}")
            return 0
    
    # ========================================
    # NORMES - Colonnes: code, pillar, title, description, is_essential
    # ========================================
    def import_norms(self):
        print("\n📋 [3/5] Normes → norms")
        print("-" * 50)
        
        try:
            df = pd.read_excel(self.excel_file, sheet_name='ÉVALUATIONS DÉTAIL', header=3)
            
            norms = []
            for index, row in df.iterrows():
                code = str(row.get('ID', '')).strip()
                if not code or code == 'nan' or code == 'ID':
                    continue
                
                pillar = str(row.get('Pilier', 'S')).strip().upper()
                if not pillar or pillar == 'NAN':
                    pillar = code[0] if code else 'S'
                
                title = str(row.get('Norme', '')).strip()
                if title == 'nan':
                    title = f'Norm {code}'
                
                description = str(row.get('Description', '')).strip()
                if description == 'nan':
                    description = ''
                
                is_essential = str(row.get('Essential', 'NON')).upper() in ['OUI', 'YES', 'TRUE', '1']
                
                norm = {
                    'code': code,
                    'pillar': pillar,
                    'title': title,
                    'description': description[:500] if description else '',
                    'is_essential': is_essential
                }
                norms.append(norm)
            
            print(f"   📊 {len(norms)} normes trouvées")
            count = self._batch_insert('norms', norms)
            self.stats['norms'] = count
            self._load_norms_map()
            return count
            
        except Exception as e:
            print(f"   ❌ Erreur: {e}")
            return 0
    
    # ========================================
    # PRODUITS - depuis COMPAT PRODUITS
    # ========================================
    def import_products(self):
        print("\n📦 [4/5] Produits → products")
        print("-" * 50)
        
        try:
            df = pd.read_excel(self.excel_file, sheet_name='COMPAT PRODUITS', header=2)
            
            products = []
            seen_names = set()
            
            for index, row in df.iterrows():
                name = str(row.iloc[0]).strip() if pd.notna(row.iloc[0]) else ''
                if not name or name == 'nan' or name in seen_names or '🔗' in name:
                    continue
                
                product_type = str(row.iloc[1]).strip() if len(row) > 1 and pd.notna(row.iloc[1]) else ''
                if product_type == 'nan':
                    product_type = ''
                
                seen_names.add(name)
                
                type_id = self._determine_type_id(name, product_type)
                brand_id = self._determine_brand_id(name)
                
                product = {
                    'slug': self._create_slug(name),
                    'name': name,
                    'description': product_type,
                    'url': self._get_product_url(name),
                    'type_id': type_id,
                    'brand_id': brand_id,
                    'specs': json.dumps({}),
                    'scores': json.dumps({}),
                    'risk_score': 0,
                    'security_status': 'pending'
                }
                products.append(product)
            
            print(f"   📊 {len(products)} produits trouvés")
            count = self._batch_insert('products', products)
            self.stats['products'] = count
            self._load_products_map()
            return count
            
        except Exception as e:
            print(f"   ❌ Erreur: {e}")
            return 0
    
    # ========================================
    # ÉVALUATIONS - depuis ÉVALUATIONS DÉTAIL
    # ========================================
    def import_evaluations(self):
        print("\n✅ [5/5] Évaluations → evaluations")
        print("-" * 50)
        
        try:
            df = pd.read_excel(self.excel_file, sheet_name='ÉVALUATIONS DÉTAIL', header=3)
            
            # Colonnes de produits (après les colonnes de normes)
            product_cols = []
            for col in df.columns[9:]:  # Skip ID, Pilier, Catégorie, Norme, Description, Source, Accès, Lien, Essential
                col_name = str(col).strip()
                if col_name and col_name != 'nan' and 'Unnamed' not in col_name:
                    product_cols.append(col_name)
            
            print(f"   📊 {len(product_cols)} colonnes produits détectées")
            
            evaluations = []
            
            for index, row in df.iterrows():
                norm_code = str(row.get('ID', '')).strip()
                if not norm_code or norm_code == 'nan':
                    continue
                
                norm_id = self.norms_map.get(norm_code)
                if not norm_id:
                    continue
                
                # Pour chaque type de produit
                for col_name in product_cols:
                    # Trouver les produits de ce type
                    for product_name, product_id in self.products_map.items():
                        # Vérifier si le produit correspond au type
                        product_type = col_name.replace('Type ', '').strip()
                        
                        if product_type.lower() in product_name.lower():
                            value = row.get(col_name, None)
                            
                            if pd.isna(value):
                                result = 'N/A'
                            elif str(value).upper() in ['OUI', 'YES', '✅', '1', 'TRUE']:
                                result = 'YES'
                            elif str(value).upper() in ['NON', 'NO', '❌', '0', 'FALSE']:
                                result = 'NO'
                            else:
                                result = 'N/A'
                            
                            evaluation = {
                                'product_id': product_id,
                                'norm_id': norm_id,
                                'result': result,
                                'evaluated_by': 'excel_import'
                            }
                            evaluations.append(evaluation)
                
                if index % 100 == 0 and index > 0:
                    print(f"   📊 {index} normes traitées...")
            
            print(f"   📊 TOTAL: {len(evaluations)} évaluations")
            count = self._batch_insert('evaluations', evaluations)
            self.stats['evaluations'] = count
            return count
            
        except Exception as e:
            print(f"   ❌ Erreur: {e}")
            return 0
    
    # ========================================
    # HELPERS
    # ========================================
    def _load_types_map(self):
        try:
            r = requests.get(f"{SUPABASE_URL}/rest/v1/product_types?select=id,code,name", headers=self.headers, timeout=30)
            if r.status_code == 200:
                types = r.json()
                self.types_map = {t['code']: t['id'] for t in types}
                self.types_name_map = {t.get('name', ''): t['id'] for t in types}
        except: pass
    
    def _load_brands_map(self):
        try:
            r = requests.get(f"{SUPABASE_URL}/rest/v1/brands?select=id,name", headers=self.headers, timeout=30)
            if r.status_code == 200:
                self.brands_map = {b['name']: b['id'] for b in r.json()}
        except: pass
    
    def _load_norms_map(self):
        try:
            r = requests.get(f"{SUPABASE_URL}/rest/v1/norms?select=id,code", headers=self.headers, timeout=30)
            if r.status_code == 200:
                self.norms_map = {n['code']: n['id'] for n in r.json()}
        except: pass
    
    def _load_products_map(self):
        try:
            r = requests.get(f"{SUPABASE_URL}/rest/v1/products?select=id,name", headers=self.headers, timeout=30)
            if r.status_code == 200:
                self.products_map = {p['name']: p['id'] for p in r.json()}
        except: pass
    
    def _determine_type_id(self, name, type_str):
        type_lower = type_str.lower() if type_str else ''
        name_lower = name.lower()
        
        type_mappings = {
            'hw cold': 'HW Cold', 'hw hot': 'HW Hot',
            'sw browser': 'SW Browser', 'sw mobile': 'SW Mobile',
            'bkp digital': 'Bkp Digital', 'bkp physical': 'Bkp Physical',
            'card non-cust': 'Card Non-Cust', 'card': 'Card',
            'crypto bank': 'Crypto Bank',
            'dex': 'DEX', 'cex': 'CEX',
            'lending': 'Lending', 'yield': 'Yield',
            'liq staking': 'Liq Staking', 'derivatives': 'Derivatives',
            'bridges': 'Bridges', 'defi tools': 'DeFi Tools', 'rwa': 'RWA',
        }
        
        for key, type_code in type_mappings.items():
            if key in type_lower:
                return self.types_map.get(type_code)
        
        return None
    
    def _determine_brand_id(self, name):
        name_lower = name.lower()
        
        brands = {
            'ledger': 'Ledger', 'trezor': 'Trezor', 'metamask': 'MetaMask',
            'binance': 'Binance', 'coinbase': 'Coinbase', 'trust': 'Trust Wallet',
            'exodus': 'Exodus', 'atomic': 'Atomic Wallet', 'safepal': 'SafePal',
            'ellipal': 'Ellipal', 'kraken': 'Kraken', 'crypto.com': 'Crypto.com',
            'gnosis': 'Gnosis', 'uniswap': 'Uniswap', 'aave': 'Aave', 'lido': 'Lido',
            'deblock': 'Deblock', 'morpho': 'Morpho'
        }
        
        for key, brand_name in brands.items():
            if key in name_lower:
                return self.brands_map.get(brand_name)
        
        return None
    
    def _get_product_url(self, name):
        urls = {
            'ledger': 'https://www.ledger.com', 'trezor': 'https://www.trezor.io',
            'metamask': 'https://metamask.io', 'binance': 'https://www.binance.com',
            'coinbase': 'https://www.coinbase.com', 'kraken': 'https://www.kraken.com',
        }
        
        for key, url in urls.items():
            if key in name.lower():
                return url
        return ''
    
    def _create_slug(self, name):
        slug = re.sub(r'[^\w\s-]', '', name.lower())
        slug = re.sub(r'[-\s]+', '-', slug)
        return slug.strip('-')
    
    def _batch_insert(self, table, data):
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
                    timeout=120
                )
                
                if response.status_code in [200, 201]:
                    inserted += len(batch)
                    print(f"   ✅ Batch {i//batch_size + 1}: {len(batch)} insérés")
                elif response.status_code == 409:
                    inserted += len(batch)
                    print(f"   ⚠️  Batch {i//batch_size + 1}: déjà existant")
                else:
                    print(f"   ❌ Batch {i//batch_size + 1}: {response.status_code} - {response.text[:100]}")
                    
            except Exception as e:
                print(f"   ❌ Batch {i//batch_size + 1}: {e}")
        
        return inserted
    
    def run_transfer(self):
        print("🚀 DÉMARRAGE TRANSFERT FINAL")
        print("=" * 70)
        
        if not self.test_connection():
            print("❌ Erreur connexion Supabase")
            return False
        
        print("✅ Connexion Supabase OK")
        
        # Nettoyer les tables
        self.clear_tables()
        
        # Importer dans l'ordre
        self.import_brands()
        self.import_types()
        self.import_norms()
        self.import_products()
        self.import_evaluations()
        
        # Résumé
        print("\n" + "=" * 70)
        print("🎉 TRANSFERT FINAL TERMINÉ")
        print("=" * 70)
        
        total = 0
        for table, count in self.stats.items():
            emoji = {'product_types': '📂', 'brands': '🏷️', 'norms': '📋', 'products': '📦', 'evaluations': '✅'}.get(table, '📊')
            print(f"   {emoji} {table:20}: {count:>8} enregistrements")
            total += count
        
        print(f"\n📈 TOTAL: {total:,} enregistrements transférés".replace(',', ' '))
        
        return True

def main():
    transfer = FinalTransfer()
    transfer.run_transfer()

if __name__ == "__main__":
    main()
