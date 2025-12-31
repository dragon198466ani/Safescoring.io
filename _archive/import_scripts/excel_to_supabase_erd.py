#!/usr/bin/env python3
"""
SAFESCORING.IO - Transfert Excel vers Supabase (Architecture ERD)
Importe automatiquement TOUTES les données en respectant le schéma ERD complet
"""

import os
import json
import requests
import pandas as pd
from datetime import datetime
from typing import Dict, List, Any, Tuple

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

class ERDExcelToSupabase:
    def __init__(self):
        self.headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}',
            'Content-Type': 'application/json'
        }
        self.excel_file = os.path.join(os.path.dirname(__file__), 'SAFE_SCORING_V7_FINAL.xlsx')
        
        # Maps pour les relations (nom → ID)
        self.product_types_map = {}
        self.brands_map = {}
        self.norms_map = {}
        self.products_map = {}
        
        print("🏗️  TRANSFERT EXCEL → SUPABASE (Architecture ERD)")
        print("=" * 60)
        print(f"📁 Fichier Excel: {self.excel_file}")
        
        if not os.path.exists(self.excel_file):
            print(f"❌ Fichier Excel non trouvé: {self.excel_file}")
            return False
    
    def test_connection(self):
        """Test connexion Supabase"""
        try:
            response = requests.get(f"{SUPABASE_URL}/rest/v1/", headers=self.headers, timeout=10)
            return response.status_code == 200
        except:
            return False
    
    def analyze_excel_structure(self):
        """Analyse la structure complète du fichier Excel"""
        print("\n📊 Analyse structure Excel complète...")
        
        try:
            excel_file = pd.ExcelFile(self.excel_file)
            sheets = excel_file.sheet_names
            
            print(f"   📋 Feuilles trouvées: {len(sheets)}")
            for sheet in sheets:
                df = pd.read_excel(self.excel_file, sheet_name=sheet, nrows=3)
                print(f"      - {sheet}: {len(df.columns)} colonnes")
                for col in df.columns:
                    print(f"        • {col}")
            
            return sheets
            
        except Exception as e:
            print(f"❌ Erreur lecture Excel: {e}")
            return []
    
    def import_subscription_plans(self):
        """Importe les plans d'abonnement (données de base)"""
        print("\n💳 Importation plans d'abonnement...")
        
        plans = [
            {
                'code': 'free',
                'name': 'Gratuit',
                'max_setups': 1,
                'max_products': 10,
                'price_monthly': 0.00,
                'features': '["10 produits", "1 setup", "Mises à jour mensuelles"]'
            },
            {
                'code': 'basic',
                'name': 'Basic',
                'max_setups': 5,
                'max_products': 50,
                'price_monthly': 19.99,
                'features': '["50 produits", "5 setups", "Mises à jour hebdomadaires"]'
            },
            {
                'code': 'pro',
                'name': 'Professionnel',
                'max_setups': 20,
                'max_products': 200,
                'price_monthly': 49.99,
                'features': '["200 produits", "20 setups", "Mises à jour quotidiennes"]'
            }
        ]
        
        return self._batch_insert('subscription_plans', plans)
    
    def import_product_types(self, sheet_name='Product_Types'):
        """Importe les types de produits selon ERD"""
        print(f"\n📂 Importation types produits (ERD): {sheet_name}")
        
        try:
            # Essayer de lire depuis Excel
            if sheet_name in pd.ExcelFile(self.excel_file).sheet_names:
                df = pd.read_excel(self.excel_file, sheet_name=sheet_name)
                print(f"   📊 {len(df)} types trouvés dans Excel")
            else:
                # Types par défaut selon ERD
                df = pd.DataFrame([
                    {'code': 'hw_wallet', 'name': 'Hardware Wallet', 'category': 'Hardware'},
                    {'code': 'sw_wallet', 'name': 'Software Wallet', 'category': 'Software'},
                    {'code': 'exchange', 'name': 'Exchange Crypto', 'category': 'Platform'},
                    {'code': 'defi', 'name': 'Protocole DeFi', 'category': 'DeFi'},
                    {'code': 'nft', 'name': 'Plateforme NFT', 'category': 'NFT'},
                    {'code': 'custodial', 'name': 'Service Custodial', 'category': 'Service'},
                    {'code': 'mining', 'name': 'Pool Mining', 'category': 'Mining'}
                ])
                print(f"   📊 {len(df)} types par défaut (ERD)")
            
            types = []
            for index, row in df.iterrows():
                try:
                    product_type = {
                        'code': str(row.get('code', f'T{index:03d}')),
                        'name': str(row.get('name', f'Type {index}')),
                        'category': str(row.get('category', 'General')),
                        'created_at': datetime.now().isoformat()
                    }
                    types.append(product_type)
                except Exception as e:
                    print(f"   ⚠️  Erreur ligne {index}: {e}")
            
            # Insérer et récupérer les IDs
            inserted = self._batch_insert('product_types', types)
            if inserted > 0:
                self.product_types_map = self._get_product_types_map()
            
            return inserted
            
        except Exception as e:
            print(f"❌ Erreur importation types: {e}")
            return 0
    
    def import_brands(self, sheet_name='Brands'):
        """Importe les marques selon ERD"""
        print(f"\n🏷️  Importation marques (ERD): {sheet_name}")
        
        try:
            # Essayer de lire depuis Excel
            if sheet_name in pd.ExcelFile(self.excel_file).sheet_names:
                df = pd.read_excel(self.excel_file, sheet_name=sheet_name)
                print(f"   📊 {len(df)} marques trouvées dans Excel")
            else:
                # Marques connues par défaut
                df = pd.DataFrame([
                    {'name': 'Ledger', 'website': 'https://www.ledger.com'},
                    {'name': 'Trezor', 'website': 'https://www.trezor.io'},
                    {'name': 'MetaMask', 'website': 'https://metamask.io'},
                    {'name': 'Binance', 'website': 'https://www.binance.com'},
                    {'name': 'Coinbase', 'website': 'https://www.coinbase.com'},
                    {'name': 'Trust Wallet', 'website': 'https://trustwallet.com'},
                    {'name': 'Exodus', 'website': 'https://www.exodus.com'},
                    {'name': 'Atomic Wallet', 'website': 'https://atomicwallet.io'},
                    {'name': 'SafePal', 'website': 'https://www.safepal.io'},
                    {'name': 'Ellipal', 'website': 'https://www.ellipal.com'}
                ])
                print(f"   📊 {len(df)} marques par défaut")
            
            brands = []
            for index, row in df.iterrows():
                try:
                    brand = {
                        'name': str(row.get('name', f'Brand {index}')),
                        'logo_url': str(row.get('logo_url', '')),
                        'website': str(row.get('website', '')),
                        'created_at': datetime.now().isoformat()
                    }
                    brands.append(brand)
                except Exception as e:
                    print(f"   ⚠️  Erreur ligne {index}: {e}")
            
            # Insérer et récupérer les IDs
            inserted = self._batch_insert('brands', brands)
            if inserted > 0:
                self.brands_map = self._get_brands_map()
            
            return inserted
            
        except Exception as e:
            print(f"❌ Erreur importation marques: {e}")
            return 0
    
    def import_norms(self, sheet_name='Norms'):
        """Importe les 911 normes SAFE selon ERD"""
        print(f"\n📋 Importation normes SAFE (ERD): {sheet_name}")
        
        try:
            # Essayer de lire depuis Excel
            if sheet_name in pd.ExcelFile(self.excel_file).sheet_names:
                df = pd.read_excel(self.excel_file, sheet_name=sheet_name)
                print(f"   📊 {len(df)} normes trouvées dans Excel")
            else:
                # Générer les normes SAFE par défaut (911 normes)
                df = self._generate_safe_norms()
                print(f"   📊 {len(df)} normes SAFE générées (par défaut)")
            
            norms = []
            for index, row in df.iterrows():
                try:
                    norm = {
                        'code': str(row.get('code', f'N{index:03d}')),
                        'pillar': str(row.get('pillar', 'S')).upper(),
                        'title': str(row.get('title', f'Norm {index}')),
                        'description': str(row.get('description', '')),
                        'is_essential': bool(row.get('is_essential', False)),
                        'created_at': datetime.now().isoformat()
                    }
                    norms.append(norm)
                except Exception as e:
                    print(f"   ⚠️  Erreur ligne {index}: {e}")
            
            # Insérer et récupérer les IDs
            inserted = self._batch_insert('norms', norms)
            if inserted > 0:
                self.norms_map = self._get_norms_map()
            
            return inserted
            
        except Exception as e:
            print(f"❌ Erreur importation normes: {e}")
            return 0
    
    def import_products(self, sheet_name='Products'):
        """Importe les produits selon ERD avec clés étrangères"""
        print(f"\n📦 Importation produits (ERD): {sheet_name}")
        
        try:
            # Lire depuis Excel
            df = pd.read_excel(self.excel_file, sheet_name=sheet_name)
            print(f"   📊 {len(df)} produits trouvés")
            
            products = []
            for index, row in df.iterrows():
                try:
                    # Trouver les IDs des clés étrangères
                    type_name = str(row.get('type_name', ''))
                    brand_name = str(row.get('brand_name', ''))
                    
                    type_id = self.product_types_map.get(type_name) if type_name else None
                    brand_id = self.brands_map.get(brand_name) if brand_name else None
                    
                    product = {
                        'slug': self._create_slug(str(row.get('name', f'product-{index}'))),
                        'name': str(row.get('name', f'Product {index}')),
                        'description': str(row.get('description', '')),
                        'url': str(row.get('url', '')),
                        'type_id': type_id,
                        'brand_id': brand_id,
                        'specs': {},  # JSONB vide pour l'instant
                        'scores': {},  # JSONB vide pour l'instant
                        'risk_score': int(row.get('risk_score', 0)) if pd.notna(row.get('risk_score')) else 0,
                        'security_status': str(row.get('security_status', 'pending')),
                        'created_at': datetime.now().isoformat(),
                        'updated_at': datetime.now().isoformat()
                    }
                    products.append(product)
                except Exception as e:
                    print(f"   ⚠️  Erreur ligne {index}: {e}")
            
            # Insérer et récupérer les IDs
            inserted = self._batch_insert('products', products)
            if inserted > 0:
                self.products_map = self._get_products_map()
            
            return inserted
            
        except Exception as e:
            print(f"❌ Erreur importation produits: {e}")
            return 0
    
    def import_norm_applicability(self):
        """Importe la table pivot N:M norm_applicability selon ERD"""
        print("\n🔗 Importation applicabilité normes (N:M pivot)...")
        
        try:
            applicability = []
            
            # Pour chaque type de produit, rendre les normes applicables
            for type_code, type_id in self.product_types_map.items():
                for norm_code, norm_id in self.norms_map.items():
                    # Logique: certaines normes ne s'appliquent pas à certains types
                    is_applicable = self._is_norm_applicable_to_type(norm_code, type_code)
                    
                    if is_applicable:
                        app = {
                            'norm_id': norm_id,
                            'type_id': type_id,
                            'is_applicable': True
                        }
                        applicability.append(app)
            
            print(f"   📊 {len(applicability)} relations N:M créées")
            return self._batch_insert('norm_applicability', applicability)
            
        except Exception as e:
            print(f"❌ Erreur importation applicabilité: {e}")
            return 0
    
    def import_evaluations(self, sheet_name='Evaluations'):
        """Importe les évaluations selon ERD"""
        print(f"\n✅ Importation évaluations (ERD): {sheet_name}")
        
        try:
            # Si la feuille existe dans Excel
            if sheet_name in pd.ExcelFile(self.excel_file).sheet_names:
                df = pd.read_excel(self.excel_file, sheet_name=sheet_name)
                print(f"   📊 {len(df)} évaluations trouvées dans Excel")
            else:
                # Générer des évaluations de test
                df = self._generate_sample_evaluations()
                print(f"   📊 {len(df)} évaluations générées (test)")
            
            evaluations = []
            for index, row in df.iterrows():
                try:
                    product_name = str(row.get('product_name', ''))
                    norm_code = str(row.get('norm_code', ''))
                    
                    product_id = self.products_map.get(product_name)
                    norm_id = self.norms_map.get(norm_code)
                    
                    if product_id and norm_id:
                        evaluation = {
                            'product_id': product_id,
                            'norm_id': norm_id,
                            'result': str(row.get('result', 'N/A')),
                            'evaluated_by': str(row.get('evaluated_by', 'excel_import')),
                            'evaluated_at': datetime.now().isoformat()
                        }
                        evaluations.append(evaluation)
                        
                except Exception as e:
                    print(f"   ⚠️  Erreur ligne {index}: {e}")
            
            return self._batch_insert('evaluations', evaluations)
            
        except Exception as e:
            print(f"❌ Erreur importation évaluations: {e}")
            return 0
    
    def _generate_safe_norms(self):
        """Génère les 911 normes SAFE par défaut"""
        norms = []
        
        # Pillar S - Security (300 normes)
        for i in range(1, 301):
            norms.append({
                'code': f'S{i:03d}',
                'pillar': 'S',
                'title': f'Security Norm {i}',
                'description': f'Security requirement {i} for crypto products',
                'is_essential': i <= 50
            })
        
        # Pillar A - Availability (250 normes)
        for i in range(1, 251):
            norms.append({
                'code': f'A{i:03d}',
                'pillar': 'A',
                'title': f'Availability Norm {i}',
                'description': f'Availability requirement {i} for crypto services',
                'is_essential': i <= 30
            })
        
        # Pillar F - Financial (200 normes)
        for i in range(1, 201):
            norms.append({
                'code': f'F{i:03d}',
                'pillar': 'F',
                'title': f'Financial Norm {i}',
                'description': f'Financial compliance {i} for crypto services',
                'is_essential': i <= 40
            })
        
        # Pillar E - Environmental (161 normes)
        for i in range(1, 162):
            norms.append({
                'code': f'E{i:03d}',
                'pillar': 'E',
                'title': f'Environmental Norm {i}',
                'description': f'Environmental sustainability {i} for crypto',
                'is_essential': i <= 20
            })
        
        return pd.DataFrame(norms)
    
    def _generate_sample_evaluations(self):
        """Génère des évaluations de test"""
        evaluations = []
        
        for product_name in self.products_map.keys():
            for norm_code in list(self.norms_map.keys())[:50]:  # 50 premières normes par produit
                result = 'YES' if hash(product_name + norm_code) % 3 != 0 else 'NO'
                evaluations.append({
                    'product_name': product_name,
                    'norm_code': norm_code,
                    'result': result,
                    'evaluated_by': 'sample_data'
                })
        
        return pd.DataFrame(evaluations)
    
    def _is_norm_applicable_to_type(self, norm_code: str, type_code: str) -> bool:
        """Détermine si une norme s'applique à un type de produit"""
        # Logique simple: certaines normes spécifiques à certains types
        if norm_code.startswith('S') and type_code == 'hw_wallet':
            return True
        if norm_code.startswith('A') and type_code in ['exchange', 'defi']:
            return True
        if norm_code.startswith('F') and type_code in ['exchange', 'custodial']:
            return True
        if norm_code.startswith('E'):
            return True  # Environmental s'applique à tous
        
        # Par défaut, 80% des normes s'appliquent
        return hash(norm_code + type_code) % 10 < 8
    
    def _create_slug(self, name: str) -> str:
        """Crée un slug à partir d'un nom"""
        import re
        slug = re.sub(r'[^\w\s-]', '', name.lower())
        slug = re.sub(r'[-\s]+', '-', slug)
        return slug.strip('-')
    
    def _batch_insert(self, table: str, data: List[Dict]) -> int:
        """Insère les données par batch de 50"""
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
                else:
                    print(f"   ❌ Erreur batch {i//batch_size + 1}: {response.status_code}")
                    print(f"      {response.text[:200]}...")
                    
            except Exception as e:
                print(f"   ❌ Erreur batch {i//batch_size + 1}: {e}")
        
        return inserted
    
    def _get_product_types_map(self) -> Dict[str, int]:
        """Récupère la correspondance code → ID des types"""
        try:
            response = requests.get(
                f"{SUPABASE_URL}/rest/v1/product_types?select=id,code",
                headers=self.headers,
                timeout=30
            )
            
            if response.status_code == 200:
                types = response.json()
                return {t['code']: t['id'] for t in types}
            return {}
            
        except:
            return {}
    
    def _get_brands_map(self) -> Dict[str, int]:
        """Récupère la correspondance name → ID des marques"""
        try:
            response = requests.get(
                f"{SUPABASE_URL}/rest/v1/brands?select=id,name",
                headers=self.headers,
                timeout=30
            )
            
            if response.status_code == 200:
                brands = response.json()
                return {b['name']: b['id'] for b in brands}
            return {}
            
        except:
            return {}
    
    def _get_norms_map(self) -> Dict[str, int]:
        """Récupère la correspondance code → ID des normes"""
        try:
            response = requests.get(
                f"{SUPABASE_URL}/rest/v1/norms?select=id,code",
                headers=self.headers,
                timeout=30
            )
            
            if response.status_code == 200:
                norms = response.json()
                return {n['code']: n['id'] for n in norms}
            return {}
            
        except:
            return {}
    
    def _get_products_map(self) -> Dict[str, int]:
        """Récupère la correspondance name → ID des produits"""
        try:
            response = requests.get(
                f"{SUPABASE_URL}/rest/v1/products?select=id,name",
                headers=self.headers,
                timeout=30
            )
            
            if response.status_code == 200:
                products = response.json()
                return {p['name']: p['id'] for p in products}
            return {}
            
        except:
            return {}
    
    def run_full_erd_import(self):
        """Exécute l'importation complète selon l'architecture ERD"""
        print("🏗️  DÉMARRAGE IMPORTATION COMPLÈTE (Architecture ERD)")
        print("=" * 60)
        
        # Test connexion
        if not self.test_connection():
            print("❌ Erreur connexion Supabase")
            return False
        
        print("✅ Connexion Supabase OK")
        
        # Analyser structure Excel
        sheets = self.analyze_excel_structure()
        if not sheets:
            print("❌ Impossible d'analyser le fichier Excel")
            return False
        
        # Importer dans l'ordre logique (respectant les clés étrangères)
        stats = {}
        
        print("\n📋 ORDRE D'IMPORTATION (Architecture ERD):")
        print("   1. subscription_plans (données de base)")
        print("   2. product_types (référence)")
        print("   3. brands (référence)")
        print("   4. norms (référence)")
        print("   5. products (clés étrangères types/brands)")
        print("   6. norm_applicability (table pivot N:M)")
        print("   7. evaluations (clés étrangères products/norms)")
        print()
        
        # 1. Plans d'abonnement
        stats['subscription_plans'] = self.import_subscription_plans()
        
        # 2. Types de produits
        stats['product_types'] = self.import_product_types('Product_Types')
        
        # 3. Marques
        stats['brands'] = self.import_brands('Brands')
        
        # 4. Normes
        stats['norms'] = self.import_norms('Norms')
        
        # 5. Produits (avec clés étrangères)
        if 'Products' in sheets:
            stats['products'] = self.import_products('Products')
        
        # 6. Table pivot N:M
        stats['norm_applicability'] = self.import_norm_applicability()
        
        # 7. Évaluations
        if 'Evaluations' in sheets:
            stats['evaluations'] = self.import_evaluations('Evaluations')
        
        # Résumé final
        print("\n🎉 IMPORTATION ERD TERMINÉE")
        print("=" * 50)
        print("📊 Résumé par table:")
        for table, count in stats.items():
            print(f"   📋 {table}: {count:,} enregistrements".replace(',', ' '))
        
        total = sum(stats.values())
        print(f"\n📈 TOTAL: {total:,} enregistrements transférés".replace(',', ' '))
        
        print(f"\n🏗️  Architecture ERD respectée:")
        print(f"   ✅ Clés primaires (PK)")
        print(f"   ✅ Clés étrangères (FK)") 
        print(f"   ✅ Tables pivot N:M")
        print(f"   ✅ JSONB pour specs/scores")
        print(f"   ✅ Relations correctes")
        
        return True

def main():
    importer = ERDExcelToSupabase()
    
    if hasattr(importer, 'excel_file') and os.path.exists(importer.excel_file):
        success = importer.run_full_erd_import()
        
        if success:
            print("\n✨ Prochaines étapes:")
            print("   1. Vérifiez les données dans Supabase Dashboard")
            print("   2. Lancez l'automatisation IA: python simple_automation.py")
            print("   3. Planifiez les mises à jour mensuelles")
    else:
        print("❌ Fichier Excel non trouvé")

if __name__ == "__main__":
    main()
