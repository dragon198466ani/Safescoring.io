#!/usr/bin/env python3
"""
SAFESCORING.IO - Correction et réimportation des VRAIES données
Importe les vraies normes et produits depuis la matrice Excel
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

class DataFixer:
    def __init__(self):
        self.headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}',
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        }
        self.excel_file = 'SAFE_SCORING_V7_FINAL.xlsx'
        
        print("🔧 CORRECTION ET RÉIMPORTATION DES VRAIES DONNÉES")
        print("=" * 60)
    
    def delete_all_norms(self):
        """Supprime toutes les normes existantes"""
        print("\n🗑️  Suppression des anciennes normes...")
        
        try:
            # Supprimer toutes les normes
            response = requests.delete(
                f"{SUPABASE_URL}/rest/v1/norms?id=gte.0",
                headers=self.headers,
                timeout=30
            )
            
            if response.status_code in [200, 204]:
                print("   ✅ Anciennes normes supprimées")
                return True
            else:
                print(f"   ⚠️  Statut: {response.status_code}")
                return True  # Continuer quand même
        except Exception as e:
            print(f"   ⚠️  Erreur: {e}")
            return True
    
    def import_real_norms_from_matrix(self):
        """Importe les VRAIES normes depuis la matrice d'évaluations"""
        print("\n📋 Importation des VRAIES normes depuis la matrice...")
        
        try:
            # Lire la matrice avec les vraies données
            df = pd.read_excel(self.excel_file, sheet_name='ÉVALUATIONS DÉTAIL', header=3)
            
            # Nettoyer les données
            df = df.dropna(subset=['ID'])
            
            print(f"   📊 {len(df)} normes trouvées dans la matrice")
            
            norms = []
            for index, row in df.iterrows():
                try:
                    code = str(row.get('ID', '')).strip()
                    if not code or code == 'nan' or code == '':
                        continue
                    
                    pillar = str(row.get('Pilier', 'S')).strip().upper()
                    if not pillar or pillar == 'NAN':
                        pillar = code[0] if code else 'S'
                    
                    title = str(row.get('Norme', f'Norm {code}')).strip()
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
                        'description': description,
                        'is_essential': is_essential,
                        'created_at': datetime.now().isoformat()
                    }
                    norms.append(norm)
                    
                except Exception as e:
                    continue
            
            print(f"   📊 {len(norms)} normes valides à importer")
            
            # Insérer par batch
            return self._batch_insert('norms', norms)
            
        except Exception as e:
            print(f"   ❌ Erreur: {e}")
            return 0
    
    def import_real_product_names_from_matrix(self):
        """Importe les VRAIS noms de produits depuis la matrice"""
        print("\n📦 Correction des noms de produits...")
        
        try:
            # Lire la ligne d'en-tête avec les vrais noms
            df_header = pd.read_excel(self.excel_file, sheet_name='ÉVALUATIONS DÉTAIL', header=None, nrows=4)
            
            # La ligne 3 contient les noms de produits
            product_names_row = df_header.iloc[3]
            
            # Extraire les noms de produits (colonnes 9+)
            real_names = {}
            for i in range(9, len(product_names_row)):
                value = product_names_row.iloc[i]
                if pd.notna(value) and str(value).strip() not in ['', 'nan']:
                    real_names[i-9] = str(value).strip()
            
            print(f"   📊 {len(real_names)} noms de produits trouvés:")
            for idx, name in list(real_names.items())[:10]:
                print(f"      - {name}")
            if len(real_names) > 10:
                print(f"      ... et {len(real_names) - 10} autres")
            
            # Récupérer les produits existants
            response = requests.get(
                f"{SUPABASE_URL}/rest/v1/products?select=id,name&order=id.asc",
                headers=self.headers,
                timeout=30
            )
            
            if response.status_code != 200:
                print("   ❌ Erreur récupération produits")
                return 0
            
            existing_products = response.json()
            
            # Mettre à jour les noms
            updated = 0
            for i, product in enumerate(existing_products):
                if i in real_names:
                    new_name = real_names[i]
                    product_id = product['id']
                    
                    # Mettre à jour le nom
                    update_data = {
                        'name': new_name,
                        'slug': self._create_slug(new_name)
                    }
                    
                    response = requests.patch(
                        f"{SUPABASE_URL}/rest/v1/products?id=eq.{product_id}",
                        headers=self.headers,
                        json=update_data,
                        timeout=30
                    )
                    
                    if response.status_code in [200, 204]:
                        updated += 1
            
            print(f"   ✅ {updated} noms de produits mis à jour")
            return updated
            
        except Exception as e:
            print(f"   ❌ Erreur: {e}")
            return 0
    
    def _create_slug(self, name):
        """Crée un slug"""
        import re
        slug = re.sub(r'[^\w\s-]', '', name.lower())
        slug = re.sub(r'[-\s]+', '-', slug)
        return slug.strip('-')
    
    def _batch_insert(self, table, data):
        """Insère par batch"""
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
                else:
                    print(f"   ❌ Batch {i//batch_size + 1}: {response.status_code}")
                    
            except Exception as e:
                print(f"   ❌ Batch {i//batch_size + 1}: {e}")
        
        return inserted
    
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
        
        # 1. Supprimer les anciennes normes
        self.delete_all_norms()
        
        # 2. Importer les vraies normes
        norms_count = self.import_real_norms_from_matrix()
        
        # 3. Corriger les noms de produits
        products_count = self.import_real_product_names_from_matrix()
        
        # Résumé
        print("\n🎉 CORRECTION TERMINÉE")
        print("=" * 60)
        print(f"   📋 Normes réimportées: {norms_count}")
        print(f"   📦 Produits corrigés: {products_count}")
        
        print("\n✨ Prochaine étape:")
        print("   - Vérifiez: python verify_data.py")
        print("   - Relancez l'automatisation: python simple_automation.py")
        
        return True

def main():
    fixer = DataFixer()
    fixer.run_fix()

if __name__ == "__main__":
    main()
