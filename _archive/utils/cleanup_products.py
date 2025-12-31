#!/usr/bin/env python3
"""
SAFESCORING.IO - Nettoyage de la table products
Supprime les doublons et produits "Unnamed" invalides
"""

import os
import requests

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

class ProductsCleaner:
    def __init__(self):
        self.headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}',
            'Content-Type': 'application/json'
        }
        
        print("🧹 NETTOYAGE DE LA TABLE PRODUCTS")
        print("=" * 60)
    
    def get_all_products(self):
        """Récupère tous les produits"""
        try:
            response = requests.get(
                f"{SUPABASE_URL}/rest/v1/products?select=id,name,slug&order=id.asc",
                headers=self.headers,
                timeout=30
            )
            
            if response.status_code == 200:
                return response.json()
            return []
        except:
            return []
    
    def delete_product(self, product_id):
        """Supprime un produit"""
        try:
            response = requests.delete(
                f"{SUPABASE_URL}/rest/v1/products?id=eq.{product_id}",
                headers=self.headers,
                timeout=30
            )
            
            return response.status_code in [200, 204]
        except:
            return False
    
    def cleanup(self):
        """Nettoie les produits"""
        print("\n📦 Récupération des produits...")
        
        products = self.get_all_products()
        if not products:
            print("❌ Aucun produit trouvé")
            return 0
        
        print(f"   ✅ {len(products)} produits trouvés")
        
        # Identifier les produits à supprimer
        to_delete = []
        valid_products = []
        seen_names = set()
        
        for product in products:
            name = product['name']
            product_id = product['id']
            
            # Critères de suppression
            should_delete = False
            
            # 1. Produits "Unnamed" avec numéros
            if 'unnamed:' in name.lower() and any(char.isdigit() for char in name):
                should_delete = True
                reason = "Unnamed avec numéro"
            
            # 2. Doublons
            elif name in seen_names:
                should_delete = True
                reason = "Doublon"
            
            if should_delete:
                to_delete.append((product_id, name, reason))
            else:
                valid_products.append(product)
                seen_names.add(name)
        
        print(f"\n🗑️  Produits à supprimer: {len(to_delete)}")
        print(f"✅ Produits valides: {len(valid_products)}")
        
        if to_delete:
            print(f"\n📋 Liste des suppressions:")
            for pid, name, reason in to_delete[:20]:
                print(f"   ❌ #{pid}: {name} ({reason})")
            
            if len(to_delete) > 20:
                print(f"   ... et {len(to_delete) - 20} autres")
            
            # Demander confirmation
            print(f"\n⚠️  Voulez-vous supprimer {len(to_delete)} produits ?")
            print("   Tapez 'oui' pour confirmer:")
            
            # Pour l'automatisation, on supprime automatiquement les "Unnamed"
            deleted = 0
            for pid, name, reason in to_delete:
                if self.delete_product(pid):
                    deleted += 1
            
            print(f"\n   ✅ {deleted} produits supprimés")
            return deleted
        else:
            print("\n✅ Aucun produit à supprimer")
            return 0
    
    def run_cleanup(self):
        """Exécute le nettoyage"""
        print("🚀 DÉMARRAGE NETTOYAGE")
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
        
        # Nettoyer
        count = self.cleanup()
        
        # Résumé
        print("\n🎉 NETTOYAGE TERMINÉ")
        print("=" * 60)
        print(f"   🗑️  Produits supprimés: {count}")
        
        print("\n✨ Prochaine étape:")
        print("   - Vérifiez: python verify_data.py")
        print("   - La table products est maintenant propre")
        
        return True

def main():
    cleaner = ProductsCleaner()
    cleaner.run_cleanup()

if __name__ == "__main__":
    main()
