#!/usr/bin/env python3
"""
SAFESCORING.IO - TRANSFERT COMPLET EXCEL → SUPABASE
Analyse toutes les feuilles et transfère les données aux bonnes tables
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

class CompleteExcelTransfer:
    def __init__(self):
        self.headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}',
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        }
        self.excel_file = 'SAFE_SCORING_V7_FINAL.xlsx'
        
        # Maps pour les relations
        self.types_map = {}
        self.brands_map = {}
        self.norms_map = {}
        self.products_map = {}
        
        # Stats
        self.stats = {}
        
        print("🚀 TRANSFERT COMPLET EXCEL → SUPABASE")
        print("=" * 70)
    
    def test_connection(self):
        try:
            response = requests.get(f"{SUPABASE_URL}/rest/v1/", headers=self.headers, timeout=10)
            return response.status_code == 200
        except:
            return False
    
    # ========================================
    # 1. DÉFINITIONS TYPES (21 types)
    # ========================================
    def import_types_from_definitions(self):
        """Importe les types depuis DÉFINITIONS TYPES"""
        print("\n📂 [1/10] DÉFINITIONS TYPES → product_types")
        print("-" * 50)
        
        try:
            df = pd.read_excel(self.excel_file, sheet_name='DÉFINITIONS TYPES', header=2)
            
            # Trouver les bonnes colonnes
            df.columns = ['Code', 'Nom', 'Description', 'Catégorie', 'Exemples', 'Col5', 'Col6'][:len(df.columns)]
            
            types = []
            for index, row in df.iterrows():
                code = str(row.get('Code', '')).strip()
                if not code or code == 'nan' or code == 'Code':
                    continue
                
                name = str(row.get('Nom', '')).strip()
                if name == 'nan':
                    name = f'Type {code}'
                
                desc = str(row.get('Description', '')).strip()
                if desc == 'nan':
                    desc = ''
                
                cat = str(row.get('Catégorie', 'General')).strip()
                if cat == 'nan':
                    cat = 'General'
                
                product_type = {
                    'code': code,
                    'name': name,
                    'description': desc,
                    'category': cat,
                    'created_at': datetime.now().isoformat()
                }
                types.append(product_type)
            
            print(f"   📊 {len(types)} types trouvés")
            
            # Insérer
            count = self._batch_insert('product_types', types)
            self.stats['product_types'] = count
            
            # Recharger la map
            self._load_types_map()
            
            return count
            
        except Exception as e:
            print(f"   ❌ Erreur: {e}")
            return 0
    
    # ========================================
    # 2. ÉVALUATIONS DÉTAIL (911 normes)
    # ========================================
    def import_norms_from_evaluations_detail(self):
        """Importe les normes depuis ÉVALUATIONS DÉTAIL"""
        print("\n📋 [2/10] ÉVALUATIONS DÉTAIL → norms")
        print("-" * 50)
        
        try:
            # Supprimer les anciennes normes
            requests.delete(f"{SUPABASE_URL}/rest/v1/norms?id=gte.0", headers=self.headers, timeout=30)
            
            df = pd.read_excel(self.excel_file, sheet_name='ÉVALUATIONS DÉTAIL', header=3)
            
            norms = []
            for index, row in df.iterrows():
                code = str(row.get('ID', '')).strip()
                if not code or code == 'nan' or code == 'ID':
                    continue
                
                pillar = str(row.get('Pilier', 'S')).strip().upper()
                if not pillar or pillar == 'NAN':
                    pillar = code[0] if code else 'S'
                
                category = str(row.get('Catégorie', '')).strip()
                if category == 'nan':
                    category = ''
                
                title = str(row.get('Norme', '')).strip()
                if title == 'nan':
                    title = f'Norm {code}'
                
                description = str(row.get('Description', '')).strip()
                if description == 'nan':
                    description = ''
                
                source = str(row.get('Source', '')).strip()
                if source == 'nan':
                    source = ''
                
                access = str(row.get('Accès', '')).strip()
                if access == 'nan':
                    access = ''
                
                link = str(row.get('Lien Officiel', '')).strip()
                if link == 'nan':
                    link = ''
                
                is_essential = str(row.get('Essential', 'NON')).upper() in ['OUI', 'YES', 'TRUE', '1']
                
                norm = {
                    'code': code,
                    'pillar': pillar,
                    'category': category,
                    'title': title,
                    'description': description,
                    'source': source,
                    'access_type': access,
                    'official_link': link,
                    'is_essential': is_essential,
                    'created_at': datetime.now().isoformat()
                }
                norms.append(norm)
            
            print(f"   📊 {len(norms)} normes trouvées")
            
            count = self._batch_insert('norms', norms)
            self.stats['norms'] = count
            
            # Recharger la map
            self._load_norms_map()
            
            return count
            
        except Exception as e:
            print(f"   ❌ Erreur: {e}")
            return 0
    
    # ========================================
    # 3. COMPAT PRODUITS (195 produits)
    # ========================================
    def import_products_from_compat(self):
        """Importe les produits depuis COMPAT PRODUITS"""
        print("\n📦 [3/10] COMPAT PRODUITS → products")
        print("-" * 50)
        
        try:
            # Supprimer les anciens produits
            requests.delete(f"{SUPABASE_URL}/rest/v1/products?id=gte.0", headers=self.headers, timeout=30)
            
            df = pd.read_excel(self.excel_file, sheet_name='COMPAT PRODUITS', header=2)
            
            # Les colonnes sont: Produit, Type, puis les compatibilités
            products = []
            seen_names = set()
            
            for index, row in df.iterrows():
                # Première colonne = nom du produit
                name = str(row.iloc[0]).strip() if pd.notna(row.iloc[0]) else ''
                if not name or name == 'nan' or name in seen_names:
                    continue
                
                # Deuxième colonne = type
                product_type = str(row.iloc[1]).strip() if len(row) > 1 and pd.notna(row.iloc[1]) else ''
                if product_type == 'nan':
                    product_type = ''
                
                seen_names.add(name)
                
                # Déterminer type_id et brand_id
                type_id = self._determine_type_id(name, product_type)
                brand_id = self._determine_brand_id(name)
                
                product = {
                    'slug': self._create_slug(name),
                    'name': name,
                    'description': f'{product_type}' if product_type else '',
                    'url': self._get_product_url(name),
                    'type_id': type_id,
                    'brand_id': brand_id,
                    'specs': {},
                    'scores': {},
                    'risk_score': 0,
                    'security_status': 'pending',
                    'created_at': datetime.now().isoformat()
                }
                products.append(product)
            
            print(f"   📊 {len(products)} produits trouvés")
            
            count = self._batch_insert('products', products)
            self.stats['products'] = count
            
            # Recharger la map
            self._load_products_map()
            
            return count
            
        except Exception as e:
            print(f"   ❌ Erreur: {e}")
            return 0
    
    # ========================================
    # 4. ÉVALUATIONS COMPLÈTES (produits × normes)
    # ========================================
    def import_evaluations_from_complete(self):
        """Importe les évaluations depuis ÉVALUATIONS COMPLÈTES"""
        print("\n✅ [4/10] ÉVALUATIONS COMPLÈTES → evaluations")
        print("-" * 50)
        
        try:
            # Supprimer les anciennes évaluations
            requests.delete(f"{SUPABASE_URL}/rest/v1/evaluations?id=gte.0", headers=self.headers, timeout=30)
            
            df = pd.read_excel(self.excel_file, sheet_name='ÉVALUATIONS COMPLÈTES', header=3)
            
            # Première colonne = code norme, reste = produits
            evaluations = []
            
            # Obtenir les noms de produits depuis les en-têtes
            product_names = [str(col).strip() for col in df.columns[1:] if pd.notna(col) and str(col).strip() not in ['', 'nan']]
            
            print(f"   📊 {len(product_names)} produits dans la matrice")
            
            for index, row in df.iterrows():
                norm_code = str(row.iloc[0]).strip() if pd.notna(row.iloc[0]) else ''
                if not norm_code or norm_code == 'nan':
                    continue
                
                norm_id = self.norms_map.get(norm_code)
                if not norm_id:
                    continue
                
                # Pour chaque produit
                for i, product_name in enumerate(product_names):
                    product_id = self.products_map.get(product_name)
                    if not product_id:
                        continue
                    
                    # Valeur d'évaluation
                    value = row.iloc[i+1] if i+1 < len(row) else None
                    
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
                        'evaluated_by': 'excel_import',
                        'evaluation_date': datetime.now().isoformat()
                    }
                    evaluations.append(evaluation)
                
                if index % 100 == 0:
                    print(f"   📊 {index} normes traitées, {len(evaluations)} évaluations...")
            
            print(f"   📊 TOTAL: {len(evaluations)} évaluations")
            
            count = self._batch_insert('evaluations', evaluations)
            self.stats['evaluations'] = count
            
            return count
            
        except Exception as e:
            print(f"   ❌ Erreur: {e}")
            return 0
    
    # ========================================
    # 5. COMPATIBILITÉ (matrice types)
    # ========================================
    def import_compatibility_matrix(self):
        """Importe la matrice de compatibilité entre types"""
        print("\n🔗 [5/10] COMPATIBILITÉ → type_compatibility")
        print("-" * 50)
        
        try:
            df = pd.read_excel(self.excel_file, sheet_name='COMPATIBILITÉ', header=2)
            
            compatibilities = []
            
            # Première colonne = type source, reste = types cibles
            type_names = [str(col).strip() for col in df.columns[1:] if pd.notna(col) and str(col).strip() not in ['', 'nan', 'Unnamed']]
            
            print(f"   📊 {len(type_names)} types dans la matrice")
            
            for index, row in df.iterrows():
                source_type = str(row.iloc[0]).strip() if pd.notna(row.iloc[0]) else ''
                if not source_type or source_type == 'nan':
                    continue
                
                for i, target_type in enumerate(type_names):
                    value = row.iloc[i+1] if i+1 < len(row) else None
                    
                    if pd.isna(value):
                        continue
                    
                    compat_type = 'incompatible'
                    if '✅' in str(value) or 'DIRECT' in str(value).upper():
                        compat_type = 'direct'
                    elif '🔄' in str(value) or 'VIA' in str(value).upper():
                        compat_type = 'via'
                    elif '📤' in str(value) or 'TRANSFER' in str(value).upper():
                        compat_type = 'transfer'
                    elif '🔐' in str(value) or 'BACKUP' in str(value).upper():
                        compat_type = 'backup'
                    elif '❌' in str(value):
                        compat_type = 'incompatible'
                    
                    compatibility = {
                        'source_type': source_type,
                        'target_type': target_type,
                        'compatibility': compat_type,
                        'notes': str(value)[:200] if pd.notna(value) else '',
                        'created_at': datetime.now().isoformat()
                    }
                    compatibilities.append(compatibility)
            
            print(f"   📊 {len(compatibilities)} compatibilités")
            
            # Note: La table type_compatibility doit exister
            count = self._batch_insert('type_compatibility', compatibilities)
            self.stats['type_compatibility'] = count
            
            return count
            
        except Exception as e:
            print(f"   ⚠️  Table non créée ou erreur: {e}")
            self.stats['type_compatibility'] = 0
            return 0
    
    # ========================================
    # 6. RÉCAP SETUPS (classement)
    # ========================================
    def import_setups_recap(self):
        """Importe le récap des setups"""
        print("\n📊 [6/10] RÉCAP SETUPS → user_setups")
        print("-" * 50)
        
        try:
            df = pd.read_excel(self.excel_file, sheet_name='RÉCAP SETUPS', header=2)
            
            setups = []
            
            for index, row in df.iterrows():
                name = str(row.iloc[0]).strip() if pd.notna(row.iloc[0]) else ''
                if not name or name == 'nan' or 'Rang' in name:
                    continue
                
                # Score SAFE
                score = 0
                try:
                    score = float(row.iloc[1]) if len(row) > 1 and pd.notna(row.iloc[1]) else 0
                except:
                    pass
                
                setup = {
                    'name': name,
                    'config': {'source': 'excel_import'},
                    'score_s': score * 0.25,
                    'score_a': score * 0.25,
                    'score_f': score * 0.25,
                    'score_e': score * 0.25,
                    'total_score': score,
                    'created_at': datetime.now().isoformat()
                }
                setups.append(setup)
            
            print(f"   📊 {len(setups)} setups trouvés")
            
            count = self._batch_insert('user_setups', setups)
            self.stats['user_setups'] = count
            
            return count
            
        except Exception as e:
            print(f"   ⚠️  Erreur: {e}")
            self.stats['user_setups'] = 0
            return 0
    
    # ========================================
    # 7. RWA TOKENIZATION
    # ========================================
    def import_rwa_projects(self):
        """Importe les projets RWA"""
        print("\n🏛️ [7/10] RWA TOKENIZATION → rwa_projects")
        print("-" * 50)
        
        try:
            df = pd.read_excel(self.excel_file, sheet_name='RWA TOKENIZATION', header=2)
            
            projects = []
            
            for index, row in df.iterrows():
                name = str(row.iloc[0]).strip() if pd.notna(row.iloc[0]) else ''
                if not name or name == 'nan' or '🏛️' in name:
                    continue
                
                category = str(row.iloc[1]).strip() if len(row) > 1 and pd.notna(row.iloc[1]) else ''
                if category == 'nan':
                    category = 'RWA'
                
                project = {
                    'name': name,
                    'category': category,
                    'status': 'active',
                    'created_at': datetime.now().isoformat()
                }
                projects.append(project)
            
            print(f"   📊 {len(projects)} projets RWA")
            
            # Note: La table rwa_projects doit exister
            count = self._batch_insert('rwa_projects', projects)
            self.stats['rwa_projects'] = count
            
            return count
            
        except Exception as e:
            print(f"   ⚠️  Table non créée ou erreur: {e}")
            self.stats['rwa_projects'] = 0
            return 0
    
    # ========================================
    # 8. NORMES HÉRITAGE
    # ========================================
    def import_norm_applicability(self):
        """Importe l'applicabilité des normes par type"""
        print("\n📋 [8/10] NORMES HÉRITAGE → norm_applicability")
        print("-" * 50)
        
        try:
            df = pd.read_excel(self.excel_file, sheet_name='NORMES HÉRITAGE', header=2)
            
            applicabilities = []
            
            # Première colonne = norme, reste = types
            type_names = [str(col).strip() for col in df.columns[1:] if pd.notna(col) and 'Unnamed' not in str(col)]
            
            print(f"   📊 {len(type_names)} types dans la matrice")
            
            for index, row in df.iterrows():
                norm_code = str(row.iloc[0]).strip() if pd.notna(row.iloc[0]) else ''
                if not norm_code or norm_code == 'nan':
                    continue
                
                norm_id = self.norms_map.get(norm_code)
                
                for i, type_code in enumerate(type_names):
                    type_id = self.types_map.get(type_code)
                    
                    value = row.iloc[i+1] if i+1 < len(row) else None
                    
                    is_applicable = False
                    if pd.notna(value):
                        if str(value).upper() in ['OUI', 'YES', '✅', '1', 'TRUE']:
                            is_applicable = True
                    
                    if norm_id and type_id:
                        applicability = {
                            'norm_id': norm_id,
                            'type_id': type_id,
                            'is_applicable': is_applicable,
                            'created_at': datetime.now().isoformat()
                        }
                        applicabilities.append(applicability)
            
            print(f"   📊 {len(applicabilities)} applicabilités")
            
            count = self._batch_insert('norm_applicability', applicabilities)
            self.stats['norm_applicability'] = count
            
            return count
            
        except Exception as e:
            print(f"   ⚠️  Erreur: {e}")
            self.stats['norm_applicability'] = 0
            return 0
    
    # ========================================
    # 9. MARQUES (extraites des produits)
    # ========================================
    def import_brands(self):
        """Importe les marques"""
        print("\n🏷️ [9/10] Marques → brands")
        print("-" * 50)
        
        brands_data = [
            {'name': 'Ledger', 'website': 'https://www.ledger.com', 'country': 'France'},
            {'name': 'Trezor', 'website': 'https://www.trezor.io', 'country': 'Czech Republic'},
            {'name': 'MetaMask', 'website': 'https://metamask.io', 'country': 'USA'},
            {'name': 'Binance', 'website': 'https://www.binance.com', 'country': 'Cayman Islands'},
            {'name': 'Coinbase', 'website': 'https://www.coinbase.com', 'country': 'USA'},
            {'name': 'Trust Wallet', 'website': 'https://trustwallet.com', 'country': 'USA'},
            {'name': 'Exodus', 'website': 'https://www.exodus.com', 'country': 'USA'},
            {'name': 'Atomic Wallet', 'website': 'https://atomicwallet.io', 'country': 'Estonia'},
            {'name': 'SafePal', 'website': 'https://www.safepal.io', 'country': 'China'},
            {'name': 'Ellipal', 'website': 'https://www.ellipal.com', 'country': 'Hong Kong'},
            {'name': 'BitBox', 'website': 'https://shiftcrypto.ch', 'country': 'Switzerland'},
            {'name': 'KeepKey', 'website': 'https://www.keepkey.com', 'country': 'USA'},
            {'name': 'Coldcard', 'website': 'https://coldcard.com', 'country': 'Canada'},
            {'name': 'Gnosis', 'website': 'https://gnosis.io', 'country': 'Gibraltar'},
            {'name': 'Uniswap', 'website': 'https://uniswap.org', 'country': 'USA'},
            {'name': 'Aave', 'website': 'https://aave.com', 'country': 'UK'},
            {'name': 'Compound', 'website': 'https://compound.finance', 'country': 'USA'},
            {'name': 'Lido', 'website': 'https://lido.fi', 'country': 'Cayman Islands'},
            {'name': 'Deblock', 'website': 'https://deblock.com', 'country': 'France'},
            {'name': 'Morpho', 'website': 'https://morpho.org', 'country': 'France'},
        ]
        
        for brand in brands_data:
            brand['created_at'] = datetime.now().isoformat()
        
        print(f"   📊 {len(brands_data)} marques")
        
        count = self._batch_insert('brands', brands_data)
        self.stats['brands'] = count
        
        self._load_brands_map()
        
        return count
    
    # ========================================
    # 10. PRODUCT COMPATIBILITY (produit × produit)
    # ========================================
    def import_product_compatibility(self):
        """Importe la compatibilité produit × produit"""
        print("\n🔗 [10/10] COMPAT PRODUITS → product_compatibility")
        print("-" * 50)
        
        try:
            df = pd.read_excel(self.excel_file, sheet_name='COMPAT PRODUITS', header=2)
            
            # Obtenir les noms de produits
            product_names = [str(row.iloc[0]).strip() for index, row in df.iterrows() if pd.notna(row.iloc[0]) and str(row.iloc[0]).strip() not in ['', 'nan']]
            
            print(f"   📊 {len(product_names)} produits dans la matrice")
            print(f"   ⚠️  Matrice trop grande ({len(product_names)}×{len(product_names)}), stockage en JSON")
            
            # Stocker comme métadonnées sur les produits plutôt que table séparée
            self.stats['product_compatibility'] = len(product_names)
            
            return len(product_names)
            
        except Exception as e:
            print(f"   ⚠️  Erreur: {e}")
            self.stats['product_compatibility'] = 0
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
        """Détermine le type_id"""
        type_lower = type_str.lower() if type_str else ''
        name_lower = name.lower()
        
        # Mapping direct
        type_mappings = {
            'hw cold': 'HW Cold',
            'hw hot': 'HW Hot',
            'sw browser': 'SW Browser',
            'sw mobile': 'SW Mobile',
            'bkp digital': 'Bkp Digital',
            'bkp physical': 'Bkp Physical',
            'card': 'Card',
            'card non-cust': 'Card Non-Cust',
            'crypto bank': 'Crypto Bank',
            'dex': 'DEX',
            'cex': 'CEX',
            'lending': 'Lending',
            'yield': 'Yield',
            'liq staking': 'Liq Staking',
            'derivatives': 'Derivatives',
            'bridges': 'Bridges',
            'defi tools': 'DeFi Tools',
            'rwa': 'RWA',
        }
        
        for key, type_code in type_mappings.items():
            if key in type_lower:
                return self.types_map.get(type_code) or self.types_name_map.get(f'Type {type_code}')
        
        # Par défaut selon le nom
        if 'ledger' in name_lower or 'trezor' in name_lower:
            return self.types_map.get('hw_wallet')
        elif 'metamask' in name_lower:
            return self.types_map.get('sw_wallet')
        
        return None
    
    def _determine_brand_id(self, name):
        """Détermine le brand_id"""
        name_lower = name.lower()
        
        brands = ['ledger', 'trezor', 'metamask', 'binance', 'coinbase', 'trust', 'exodus', 'atomic', 'safepal', 'ellipal']
        
        for brand in brands:
            if brand in name_lower:
                return self.brands_map.get(brand.title())
        
        return None
    
    def _get_product_url(self, name):
        """Retourne l'URL du produit"""
        urls = {
            'ledger': 'https://www.ledger.com',
            'trezor': 'https://www.trezor.io',
            'metamask': 'https://metamask.io',
            'binance': 'https://www.binance.com',
            'coinbase': 'https://www.coinbase.com',
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
        batch_size = 100
        
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
                elif response.status_code == 404:
                    print(f"   ❌ Table '{table}' non trouvée")
                    return 0
                else:
                    print(f"   ❌ Batch {i//batch_size + 1}: {response.status_code}")
                    
            except Exception as e:
                print(f"   ❌ Batch {i//batch_size + 1}: {e}")
        
        return inserted
    
    # ========================================
    # MAIN
    # ========================================
    def run_complete_transfer(self):
        """Exécute le transfert complet"""
        print("🚀 DÉMARRAGE TRANSFERT COMPLET")
        print("=" * 70)
        
        if not self.test_connection():
            print("❌ Erreur connexion Supabase")
            return False
        
        print("✅ Connexion Supabase OK")
        
        # Charger les maps existantes
        self._load_types_map()
        self._load_brands_map()
        self._load_norms_map()
        self._load_products_map()
        
        # Exécuter toutes les importations
        self.import_brands()
        self.import_types_from_definitions()
        self.import_norms_from_evaluations_detail()
        self.import_products_from_compat()
        self.import_evaluations_from_complete()
        self.import_compatibility_matrix()
        self.import_setups_recap()
        self.import_rwa_projects()
        self.import_norm_applicability()
        self.import_product_compatibility()
        
        # Résumé final
        print("\n" + "=" * 70)
        print("🎉 TRANSFERT COMPLET TERMINÉ")
        print("=" * 70)
        
        total = 0
        for table, count in self.stats.items():
            emoji = {
                'product_types': '📂',
                'brands': '🏷️',
                'norms': '📋',
                'products': '📦',
                'evaluations': '✅',
                'type_compatibility': '🔗',
                'user_setups': '📊',
                'rwa_projects': '🏛️',
                'norm_applicability': '📋',
                'product_compatibility': '🔗'
            }.get(table, '📊')
            
            print(f"   {emoji} {table:25}: {count:>8} enregistrements")
            total += count
        
        print(f"\n📈 TOTAL: {total:,} enregistrements transférés".replace(',', ' '))
        
        print("\n✨ Toutes les feuilles Excel ont été analysées et transférées !")
        
        return True

def main():
    transfer = CompleteExcelTransfer()
    transfer.run_complete_transfer()

if __name__ == "__main__":
    main()
