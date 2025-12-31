#!/usr/bin/env python3
"""
SAFESCORING.IO - Vérification des données Supabase
Affiche un rapport complet de toutes les données importées
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

class DataVerifier:
    def __init__(self):
        self.headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}',
            'Content-Type': 'application/json'
        }
        
        print("🔍 VÉRIFICATION DES DONNÉES SUPABASE")
        print("=" * 60)
    
    def get_count(self, table):
        """Compte les enregistrements d'une table"""
        try:
            response = requests.get(
                f"{SUPABASE_URL}/rest/v1/{table}?select=count",
                headers=self.headers,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                return len(data)
            return 0
        except:
            return 0
    
    def get_sample_data(self, table, limit=5):
        """Récupère des exemples de données"""
        try:
            response = requests.get(
                f"{SUPABASE_URL}/rest/v1/{table}?select=*&limit={limit}",
                headers=self.headers,
                timeout=10
            )
            
            if response.status_code == 200:
                return response.json()
            return []
        except:
            return []
    
    def verify_products(self):
        """Vérifie les produits"""
        print("\n📦 PRODUITS")
        print("-" * 60)
        
        count = self.get_count('products')
        print(f"   Total: {count} produits")
        
        # Récupérer échantillon
        products = self.get_sample_data('products', 10)
        
        if products:
            print(f"\n   📊 Échantillon (10 premiers):")
            for p in products:
                status_emoji = {
                    'secure': '🟢',
                    'warning': '🟡',
                    'critical': '🔴',
                    'pending': '⚪'
                }.get(p.get('security_status', 'pending'), '⚪')
                
                print(f"      {status_emoji} {p.get('name', 'N/A')[:40]:40} | Score: {p.get('risk_score', 0):3}/100 | {p.get('security_status', 'pending')}")
        
        # Statistiques par statut
        try:
            response = requests.get(
                f"{SUPABASE_URL}/rest/v1/products?select=security_status",
                headers=self.headers,
                timeout=10
            )
            
            if response.status_code == 200:
                all_products = response.json()
                statuses = {}
                for p in all_products:
                    status = p.get('security_status', 'pending')
                    statuses[status] = statuses.get(status, 0) + 1
                
                print(f"\n   📊 Répartition par statut:")
                for status, count in sorted(statuses.items()):
                    emoji = {'secure': '🟢', 'warning': '🟡', 'critical': '🔴', 'pending': '⚪'}.get(status, '⚪')
                    print(f"      {emoji} {status:10}: {count:3} produits")
        except:
            pass
        
        return count
    
    def verify_norms(self):
        """Vérifie les normes"""
        print("\n📋 NORMES SAFE")
        print("-" * 60)
        
        count = self.get_count('norms')
        print(f"   Total: {count} normes")
        
        # Récupérer échantillon
        norms = self.get_sample_data('norms', 10)
        
        if norms:
            print(f"\n   📊 Échantillon (10 premières):")
            for n in norms:
                pillar_emoji = {
                    'S': '🛡️',
                    'A': '⚡',
                    'F': '💰',
                    'E': '🌱'
                }.get(n.get('pillar', 'S'), '📋')
                
                essential = '⭐' if n.get('is_essential') else '  '
                print(f"      {pillar_emoji} {n.get('code', 'N/A'):6} | {essential} | {n.get('title', 'N/A')[:50]}")
        
        # Statistiques par pilier
        try:
            response = requests.get(
                f"{SUPABASE_URL}/rest/v1/norms?select=pillar",
                headers=self.headers,
                timeout=10
            )
            
            if response.status_code == 200:
                all_norms = response.json()
                pillars = {}
                for n in all_norms:
                    pillar = n.get('pillar', 'S')
                    pillars[pillar] = pillars.get(pillar, 0) + 1
                
                print(f"\n   📊 Répartition par pilier:")
                pillar_names = {
                    'S': 'Security',
                    'A': 'Availability',
                    'F': 'Financial',
                    'E': 'Environmental'
                }
                for pillar, count in sorted(pillars.items()):
                    emoji = {'S': '🛡️', 'A': '⚡', 'F': '💰', 'E': '🌱'}.get(pillar, '📋')
                    name = pillar_names.get(pillar, 'Unknown')
                    print(f"      {emoji} {pillar} - {name:15}: {count:3} normes")
        except:
            pass
        
        return count
    
    def verify_product_types(self):
        """Vérifie les types de produits"""
        print("\n📂 TYPES DE PRODUITS")
        print("-" * 60)
        
        count = self.get_count('product_types')
        print(f"   Total: {count} types")
        
        types = self.get_sample_data('product_types', 30)
        
        if types:
            print(f"\n   📊 Liste complète:")
            for t in types:
                print(f"      • {t.get('code', 'N/A'):15} | {t.get('name', 'N/A'):30} | {t.get('category', 'N/A')}")
        
        return count
    
    def verify_brands(self):
        """Vérifie les marques"""
        print("\n🏷️  MARQUES")
        print("-" * 60)
        
        count = self.get_count('brands')
        print(f"   Total: {count} marques")
        
        brands = self.get_sample_data('brands', 20)
        
        if brands:
            print(f"\n   📊 Liste:")
            for b in brands:
                website = b.get('website', '')
                if website:
                    print(f"      • {b.get('name', 'N/A'):20} | {website}")
                else:
                    print(f"      • {b.get('name', 'N/A')}")
        
        return count
    
    def verify_evaluations(self):
        """Vérifie les évaluations"""
        print("\n✅ ÉVALUATIONS")
        print("-" * 60)
        
        count = self.get_count('evaluations')
        print(f"   Total: {count} évaluations")
        
        if count > 0:
            # Échantillon
            evals = self.get_sample_data('evaluations', 10)
            
            if evals:
                print(f"\n   📊 Échantillon (10 premières):")
                for e in evals:
                    result_emoji = {
                        'YES': '✅',
                        'NO': '❌',
                        'N/A': '➖'
                    }.get(e.get('result', 'N/A'), '❓')
                    
                    print(f"      {result_emoji} Produit #{e.get('product_id', 'N/A')} × Norme #{e.get('norm_id', 'N/A')} = {e.get('result', 'N/A')}")
            
            # Statistiques par résultat
            try:
                response = requests.get(
                    f"{SUPABASE_URL}/rest/v1/evaluations?select=result",
                    headers=self.headers,
                    timeout=10
                )
                
                if response.status_code == 200:
                    all_evals = response.json()
                    results = {}
                    for e in all_evals:
                        result = e.get('result', 'N/A')
                        results[result] = results.get(result, 0) + 1
                    
                    print(f"\n   📊 Répartition par résultat:")
                    for result, count in sorted(results.items()):
                        emoji = {'YES': '✅', 'NO': '❌', 'N/A': '➖'}.get(result, '❓')
                        print(f"      {emoji} {result:3}: {count:6} évaluations")
            except:
                pass
        
        return count
    
    def verify_automation_logs(self):
        """Vérifie les logs d'automatisation"""
        print("\n📋 LOGS D'AUTOMATISATION")
        print("-" * 60)
        
        count = self.get_count('automation_logs')
        print(f"   Total: {count} exécutions")
        
        if count > 0:
            logs = self.get_sample_data('automation_logs', 5)
            
            if logs:
                print(f"\n   📊 Dernières exécutions:")
                for log in logs:
                    run_date = log.get('run_date', 'N/A')
                    products = log.get('products_updated', 0)
                    duration = log.get('duration_sec', 0)
                    errors = len(log.get('errors', []))
                    
                    status = '✅' if errors == 0 else '⚠️'
                    print(f"      {status} {run_date[:19]} | {products:2} produits | {duration:3}s | {errors} erreurs")
        
        return count
    
    def run_verification(self):
        """Exécute la vérification complète"""
        print("🚀 DÉMARRAGE VÉRIFICATION")
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
        
        # Vérifier chaque table
        stats = {}
        
        stats['product_types'] = self.verify_product_types()
        stats['brands'] = self.verify_brands()
        stats['norms'] = self.verify_norms()
        stats['products'] = self.verify_products()
        stats['evaluations'] = self.verify_evaluations()
        stats['automation_logs'] = self.verify_automation_logs()
        
        # Résumé final
        print("\n🎉 RÉSUMÉ DE VÉRIFICATION")
        print("=" * 60)
        
        total = sum(stats.values())
        
        print(f"\n📊 Statistiques globales:")
        for table, count in stats.items():
            emoji = {
                'product_types': '📂',
                'brands': '🏷️',
                'norms': '📋',
                'products': '📦',
                'evaluations': '✅',
                'automation_logs': '📋'
            }.get(table, '📊')
            
            status = '✅' if count > 0 else '⚪'
            print(f"   {status} {emoji} {table:20}: {count:6,} enregistrements".replace(',', ' '))
        
        print(f"\n📈 TOTAL: {total:,} enregistrements dans la base".replace(',', ' '))
        
        # Vérifications de cohérence
        print(f"\n🔍 Vérifications de cohérence:")
        
        if stats['norms'] >= 900:
            print(f"   ✅ Normes SAFE complètes ({stats['norms']}/911)")
        else:
            print(f"   ⚠️  Normes incomplètes ({stats['norms']}/911)")
        
        if stats['products'] >= 50:
            print(f"   ✅ Produits importés ({stats['products']} produits)")
        else:
            print(f"   ⚠️  Peu de produits ({stats['products']} produits)")
        
        if stats['product_types'] >= 20:
            print(f"   ✅ Types de produits complets ({stats['product_types']} types)")
        else:
            print(f"   ⚪ Types de produits basiques ({stats['product_types']} types)")
        
        if stats['evaluations'] > 0:
            print(f"   ✅ Évaluations présentes ({stats['evaluations']} évaluations)")
        else:
            print(f"   ⚪ Aucune évaluation (à importer)")
        
        print(f"\n✨ Base de données SafeScoring vérifiée !")
        print(f"   URL: {SUPABASE_URL}")
        print(f"   Projet: ajdncttomdqojlozxjxu")
        
        return True

def main():
    verifier = DataVerifier()
    verifier.run_verification()

if __name__ == "__main__":
    main()
