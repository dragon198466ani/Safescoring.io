#!/usr/bin/env python3
"""
SAFESCORING.IO - Transfert Excel vers Supabase
Importe automatiquement produits, normes et évaluations depuis Excel
"""

import os
import json
import requests
import pandas as pd
from datetime import datetime
from typing import Dict, List, Any

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

class ExcelToSupabase:
    def __init__(self):
        self.headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}',
            'Content-Type': 'application/json'
        }
        self.excel_file = os.path.join(os.path.dirname(__file__), 'SAFE_SCORING_V7_FINAL.xlsx')
        
        print("🔄 TRANSFERT EXCEL → SUPABASE")
        print("=" * 50)
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
        """Analyse la structure du fichier Excel"""
        print("\n📊 Analyse structure Excel...")
        
        try:
            # Lire toutes les feuilles
            excel_file = pd.ExcelFile(self.excel_file)
            sheets = excel_file.sheet_names
            
            print(f"   📋 Feuilles trouvées: {len(sheets)}")
            for sheet in sheets:
                df = pd.read_excel(self.excel_file, sheet_name=sheet, nrows=5)
                print(f"      - {sheet}: {len(df.columns)} colonnes, {len(df)} lignes (aperçu)")
            
            return sheets
            
        except Exception as e:
            print(f"❌ Erreur lecture Excel: {e}")
            return []
    
    def import_products(self, sheet_name='Products'):
        """Importe les produits depuis Excel"""
        print(f"\n📦 Importation produits depuis: {sheet_name}")
        
        try:
            # Lire la feuille produits
            df = pd.read_excel(self.excel_file, sheet_name=sheet_name)
            print(f"   📊 {len(df)} produits trouvés")
            
            # Nettoyer et préparer les données
            products = []
            for index, row in df.iterrows():
                try:
                    product = {
                        'slug': self._create_slug(row.get('name', f'product-{index}')),
                        'name': str(row.get('name', f'Product {index}')),
                        'description': str(row.get('description', '')),
                        'url': str(row.get('url', '')),
                        'risk_score': int(row.get('risk_score', 0)) if pd.notna(row.get('risk_score')) else 0,
                        'security_status': str(row.get('security_status', 'pending')),
                        'created_at': datetime.now().isoformat()
                    }
                    products.append(product)
                except Exception as e:
                    print(f"   ⚠️  Erreur ligne {index}: {e}")
            
            # Insérer dans Supabase
            return self._batch_insert('products', products)
            
        except Exception as e:
            print(f"❌ Erreur importation produits: {e}")
            return 0
    
    def import_norms(self, sheet_name='Norms'):
        """Importe les normes depuis Excel"""
        print(f"\n📋 Importation normes depuis: {sheet_name}")
        
        try:
            # Lire la feuille normes
            df = pd.read_excel(self.excel_file, sheet_name=sheet_name)
            print(f"   📊 {len(df)} normes trouvées")
            
            # Nettoyer et préparer les données
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
            
            # Insérer dans Supabase
            return self._batch_insert('norms', norms)
            
        except Exception as e:
            print(f"❌ Erreur importation normes: {e}")
            return 0
    
    def import_evaluations(self, sheet_name='Evaluations'):
        """Importe les évaluations depuis Excel"""
        print(f"\n✅ Importation évaluations depuis: {sheet_name}")
        
        try:
            # Lire la feuille évaluations
            df = pd.read_excel(self.excel_file, sheet_name=sheet_name)
            print(f"   📊 {len(df)} évaluations trouvées")
            
            # Récupérer les IDs des produits et normes
            products_map = self._get_products_map()
            norms_map = self._get_norms_map()
            
            # Nettoyer et préparer les données
            evaluations = []
            for index, row in df.iterrows():
                try:
                    product_name = str(row.get('product_name', ''))
                    norm_code = str(row.get('norm_code', ''))
                    
                    # Trouver les IDs correspondants
                    product_id = products_map.get(product_name)
                    norm_id = norms_map.get(norm_code)
                    
                    if product_id and norm_id:
                        evaluation = {
                            'product_id': product_id,
                            'norm_id': norm_id,
                            'result': str(row.get('result', 'N/A')),
                            'evaluated_by': 'excel_import',
                            'evaluation_date': datetime.now().isoformat()
                        }
                        evaluations.append(evaluation)
                    else:
                        print(f"   ⚠️  Produit '{product_name}' ou norme '{norm_code}' non trouvé")
                        
                except Exception as e:
                    print(f"   ⚠️  Erreur ligne {index}: {e}")
            
            # Insérer dans Supabase
            return self._batch_insert('evaluations', evaluations)
            
        except Exception as e:
            print(f"❌ Erreur importation évaluations: {e}")
            return 0
    
    def import_brands(self, sheet_name='Brands'):
        """Importe les marques depuis Excel"""
        print(f"\n🏷️  Importation marques depuis: {sheet_name}")
        
        try:
            # Lire la feuille marques
            df = pd.read_excel(self.excel_file, sheet_name=sheet_name)
            print(f"   📊 {len(df)} marques trouvées")
            
            # Nettoyer et préparer les données
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
            
            # Insérer dans Supabase
            return self._batch_insert('brands', brands)
            
        except Exception as e:
            print(f"❌ Erreur importation marques: {e}")
            return 0
    
    def import_product_types(self, sheet_name='Product_Types'):
        """Importe les types de produits depuis Excel"""
        print(f"\n📂 Importation types produits depuis: {sheet_name}")
        
        try:
            # Lire la feuille types
            df = pd.read_excel(self.excel_file, sheet_name=sheet_name)
            print(f"   📊 {len(df)} types trouvés")
            
            # Nettoyer et préparer les données
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
            
            # Insérer dans Supabase
            return self._batch_insert('product_types', types)
            
        except Exception as e:
            print(f"❌ Erreur importation types: {e}")
            return 0
    
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
                    print(f"      {response.text}")
                    
            except Exception as e:
                print(f"   ❌ Erreur batch {i//batch_size + 1}: {e}")
        
        return inserted
    
    def _get_products_map(self) -> Dict[str, int]:
        """Récupère la correspondance nom → ID des produits"""
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
    
    def run_full_import(self):
        """Exécute l'importation complète"""
        print("🚀 DÉMARRAGE IMPORTATION COMPLÈTE")
        print("=" * 50)
        
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
        
        # Importer dans l'ordre logique
        stats = {}
        
        # 1. Types de produits
        if 'Product_Types' in sheets or 'Types' in sheets:
            sheet = 'Product_Types' if 'Product_Types' in sheets else 'Types'
            stats['types'] = self.import_product_types(sheet)
        
        # 2. Marques
        if 'Brands' in sheets:
            stats['brands'] = self.import_brands('Brands')
        
        # 3. Normes
        if 'Norms' in sheets:
            stats['norms'] = self.import_norms('Norms')
        
        # 4. Produits
        if 'Products' in sheets:
            stats['products'] = self.import_products('Products')
        
        # 5. Évaluations
        if 'Evaluations' in sheets:
            stats['evaluations'] = self.import_evaluations('Evaluations')
        
        # Résumé
        print("\n🎉 IMPORTATION TERMINÉE")
        print("=" * 40)
        for table, count in stats.items():
            print(f"   📊 {table}: {count} enregistrements")
        
        total = sum(stats.values())
        print(f"\n📈 TOTAL: {total} enregistrements transférés")
        
        return True

def main():
    importer = ExcelToSupabase()
    
    if hasattr(importer, 'excel_file') and os.path.exists(importer.excel_file):
        success = importer.run_full_import()
        
        if success:
            print("\n✨ Prochaine étape:")
            print("   - Vérifiez les données dans Supabase")
            print("   - Lancez l'automatisation: python simple_automation.py")
    else:
        print("❌ Fichier Excel non trouvé")

if __name__ == "__main__":
    main()
