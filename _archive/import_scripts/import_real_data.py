#!/usr/bin/env python3
"""
SAFESCORING.IO - Importation des données réelles depuis Excel
Structure spécifique du fichier SAFE_SCORING_V7_FINAL.xlsx
"""

import os
import json
import requests
import pandas as pd
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

class RealDataImporter:
    def __init__(self):
        self.headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}',
            'Content-Type': 'application/json'
        }
        self.excel_file = os.path.join(os.path.dirname(__file__), 'SAFE_SCORING_V7_FINAL.xlsx')
        
        print("📊 IMPORTATION DONNÉES RÉELLES SAFE_SCORING")
        print("=" * 60)
        
        # Maps pour les relations
        self.product_types_map = {}
        self.brands_map = {}
        self.norms_map = {}
        self.products_map = {}
    
    def test_connection(self):
        """Test connexion Supabase"""
        try:
            response = requests.get(f"{SUPABASE_URL}/rest/v1/", headers=self.headers, timeout=10)
            return response.status_code == 200
        except:
            return False
    
    def import_products_from_evaluations(self):
        """Extrait les produits depuis la matrice d'évaluations"""
        print("\n📦 Extraction des produits depuis la matrice d'évaluations...")
        
        try:
            # Lire la feuille d'évaluations détaillées
            df = pd.read_excel(self.excel_file, sheet_name='ÉVALUATIONS DÉTAIL', header=2)
            
            # Trouver les colonnes de produits (après les 7 premières colonnes)
            product_columns = []
            for col in df.columns[7:]:  # Skip ID, Pilier, Catégorie, Norme, Description, Source, Accès
                if pd.notna(col) and str(col).strip() != '':
                    product_columns.append(str(col).strip())
            
            print(f"   📊 {len(product_columns)} produits trouvés dans la matrice")
            
            # Créer les produits
            products = []
            for product_name in product_columns:
                try:
                    # Déterminer le type et la marque
                    product_type = self._determine_product_type(product_name)
                    brand = self._determine_brand(product_name)
                    
                    product = {
                        'slug': self._create_slug(product_name),
                        'name': product_name,
                        'description': f'{product_type} - {brand}',
                        'url': self._get_product_url(product_name),
                        'type_id': self.product_types_map.get(product_type),
                        'brand_id': self.brands_map.get(brand),
                        'specs': {},
                        'scores': {},
                        'risk_score': 0,
                        'security_status': 'pending',
                        'created_at': datetime.now().isoformat(),
                        'updated_at': datetime.now().isoformat()
                    }
                    products.append(product)
                    
                except Exception as e:
                    print(f"   ⚠️  Erreur produit {product_name}: {e}")
            
            # Insérer les produits
            if products:
                inserted = self._batch_insert('products', products)
                if inserted > 0:
                    self.products_map = self._get_products_map()
                return inserted
            
            return 0
            
        except Exception as e:
            print(f"❌ Erreur extraction produits: {e}")
            return 0
    
    def import_evaluations_from_matrix(self):
        """Importe les évaluations depuis la matrice Excel"""
        print("\n✅ Importation évaluations depuis la matrice...")
        
        try:
            # Lire la feuille avec les bonnes en-têtes
            df = pd.read_excel(self.excel_file, sheet_name='ÉVALUATIONS DÉTAIL', header=2)
            
            # Nettoyer les données
            df = df.dropna(subset=['ID', 'Pilier'])  # Garder seulement les lignes avec des normes
            
            evaluations = []
            processed = 0
            
            for index, row in df.iterrows():
                try:
                    norm_code = str(row.get('ID', ''))
                    norm_id = self.norms_map.get(norm_code)
                    
                    if not norm_id:
                        continue
                    
                    # Pour chaque produit, vérifier l'évaluation
                    for col in df.columns[7:]:  # Colonnes de produits
                        product_name = str(col).strip()
                        product_id = self.products_map.get(product_name)
                        
                        if not product_id:
                            continue
                        
                        # Valeur d'évaluation (OUI/NON/N/A)
                        value = row.get(col, '')
                        if pd.isna(value):
                            result = 'N/A'
                        elif str(value).upper() in ['OUI', 'YES', '✅']:
                            result = 'YES'
                        elif str(value).upper() in ['NON', 'NO', '❌']:
                            result = 'NO'
                        else:
                            result = 'N/A'
                        
                        evaluation = {
                            'product_id': product_id,
                            'norm_id': norm_id,
                            'result': result,
                            'evaluated_by': 'excel_matrix',
                            'evaluated_at': datetime.now().isoformat()
                        }
                        evaluations.append(evaluation)
                    
                    processed += 1
                    if processed % 50 == 0:
                        print(f"   📊 {processed} normes traitées...")
                        
                except Exception as e:
                    print(f"   ⚠️  Erreur ligne {index}: {e}")
            
            print(f"   📊 {len(evaluations)} évaluations à insérer")
            
            # Insérer par batch
            return self._batch_insert('evaluations', evaluations)
            
        except Exception as e:
            print(f"❌ Erreur importation évaluations: {e}")
            return 0
    
    def _determine_product_type(self, product_name: str) -> str:
        """Détermine le type de produit depuis son nom"""
        name_lower = product_name.lower()
        
        if any(x in name_lower for x in ['ledger', 'trezor', 'cold', 'hardware']):
            return 'hw_wallet'
        elif any(x in name_lower for x in ['metamask', 'trust', 'exodus', 'mobile', 'browser']):
            return 'sw_wallet'
        elif any(x in name_lower for x in ['binance', 'coinbase', 'kraken', 'exchange']):
            return 'exchange'
        elif any(x in name_lower for x in ['defi', 'uniswap', 'aave', 'compound']):
            return 'defi'
        elif any(x in name_lower for x in ['nft', 'opensea', 'rarible']):
            return 'nft'
        else:
            return 'sw_wallet'  # Par défaut
    
    def _determine_brand(self, product_name: str) -> str:
        """Détermine la marque depuis le nom du produit"""
        name_lower = product_name.lower()
        
        brands = ['ledger', 'trezor', 'metamask', 'binance', 'coinbase', 'trust wallet', 
                 'exodus', 'atomic wallet', 'safepal', 'ellipal']
        
        for brand in brands:
            if brand in name_lower:
                return brand.title()
        
        return 'Unknown'
    
    def _get_product_url(self, product_name: str) -> str:
        """Retourne l'URL probable du produit"""
        name_lower = product_name.lower()
        
        urls = {
            'ledger nano x': 'https://www.ledger.com/products/ledger-nano-x',
            'ledger nano s': 'https://www.ledger.com/products/ledger-nano-s',
            'trezor model t': 'https://www.trezor.io/trezor-model-t',
            'trezor one': 'https://www.trezor.io/trezor-one',
            'metamask': 'https://metamask.io/',
            'binance': 'https://www.binance.com/',
            'coinbase': 'https://www.coinbase.com/',
            'trust wallet': 'https://trustwallet.com/',
            'exodus': 'https://www.exodus.com/',
            'atomic wallet': 'https://atomicwallet.io/',
            'safepal': 'https://www.safepal.io/',
            'ellipal': 'https://www.ellipal.com/'
        }
        
        return urls.get(name_lower, '')
    
    def _create_slug(self, name: str) -> str:
        """Crée un slug à partir d'un nom"""
        import re
        slug = re.sub(r'[^\w\s-]', '', name.lower())
        slug = re.sub(r'[-\s]+', '-', slug)
        return slug.strip('-')
    
    def _batch_insert(self, table: str, data: list) -> int:
        """Insère les données par batch"""
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
                    
            except Exception as e:
                print(f"   ❌ Erreur batch {i//batch_size + 1}: {e}")
        
        return inserted
    
    def _get_products_map(self) -> dict:
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
    
    def load_existing_maps(self):
        """Charge les maps existantes depuis Supabase"""
        print("\n📋 Chargement des références existantes...")
        
        # Types de produits
        try:
            response = requests.get(f"{SUPABASE_URL}/rest/v1/product_types?select=id,code", headers=self.headers)
            if response.status_code == 200:
                self.product_types_map = {t['code']: t['id'] for t in response.json()}
                print(f"   ✅ {len(self.product_types_map)} types chargés")
        except:
            pass
        
        # Marques
        try:
            response = requests.get(f"{SUPABASE_URL}/rest/v1/brands?select=id,name", headers=self.headers)
            if response.status_code == 200:
                self.brands_map = {b['name']: b['id'] for b in response.json()}
                print(f"   ✅ {len(self.brands_map)} marques chargées")
        except:
            pass
        
        # Normes
        try:
            response = requests.get(f"{SUPABASE_URL}/rest/v1/norms?select=id,code", headers=self.headers)
            if response.status_code == 200:
                self.norms_map = {n['code']: n['id'] for n in response.json()}
                print(f"   ✅ {len(self.norms_map)} normes chargées")
        except:
            pass
    
    def run_real_import(self):
        """Exécute l'importation complète des données réelles"""
        print("🚀 DÉMARRAGE IMPORTATION DONNÉES RÉELLES")
        print("=" * 50)
        
        # Test connexion
        if not self.test_connection():
            print("❌ Erreur connexion Supabase")
            return False
        
        print("✅ Connexion Supabase OK")
        
        # Charger les références existantes
        self.load_existing_maps()
        
        if not self.norms_map:
            print("❌ Aucune norme trouvée. Exécutez d'abord excel_to_supabase_erd.py")
            return False
        
        # Importer les produits depuis la matrice
        products_count = self.import_products_from_evaluations()
        
        if products_count > 0:
            # Importer les évaluations
            evaluations_count = self.import_evaluations_from_matrix()
        else:
            evaluations_count = 0
        
        # Résumé
        print("\n🎉 IMPORTATION DONNÉES RÉELLES TERMINÉE")
        print("=" * 50)
        print(f"📦 Produits importés: {products_count}")
        print(f"✅ Évaluations importées: {evaluations_count}")
        
        total = products_count + evaluations_count
        print(f"\n📈 TOTAL: {total} enregistrements")
        
        if total > 0:
            print(f"\n✨ Prochaine étape:")
            print(f"   - Lancez l'automatisation IA: python simple_automation.py")
            print(f"   - Les produits seront analysés avec Mistral/Gemini")
        
        return True

def main():
    importer = RealDataImporter()
    
    if os.path.exists(importer.excel_file):
        success = importer.run_real_import()
    else:
        print("❌ Fichier Excel non trouvé")

if __name__ == "__main__":
    main()
