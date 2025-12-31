#!/usr/bin/env python3
"""
SAFESCORING.IO - Mise à jour automatique des type_id et brand_id pour tous les produits
"""

import os
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

def main():
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
    }
    
    print("🔄 MISE À JOUR AUTOMATIQUE TYPE_ID & BRAND_ID")
    print("=" * 60)
    
    # 1. Charger les types de produits
    print("\n📂 Chargement des types de produits...")
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/product_types?select=id,code,name",
        headers=headers,
        timeout=30
    )
    
    types_by_code = {}
    types_by_name = {}
    if response.status_code == 200:
        for t in response.json():
            types_by_code[t['code'].lower()] = t['id']
            types_by_name[t['name'].lower()] = t['id']
        print(f"   ✅ {len(types_by_code)} types chargés")
    
    # 2. Charger les marques
    print("\n🏷️  Chargement des marques...")
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/brands?select=id,name",
        headers=headers,
        timeout=30
    )
    
    brands_map = {}
    if response.status_code == 200:
        for b in response.json():
            brands_map[b['name'].lower()] = b['id']
        print(f"   ✅ {len(brands_map)} marques chargées")
    
    # Ajouter des marques supplémentaires à détecter
    brand_keywords = {
        'ledger': 'ledger',
        'trezor': 'trezor',
        'metamask': 'metamask',
        'binance': 'binance',
        'coinbase': 'coinbase',
        'trust': 'trust wallet',
        'exodus': 'exodus',
        'atomic': 'atomic wallet',
        'safepal': 'safepal',
        'ellipal': 'ellipal',
        'bitbox': 'bitbox',
        'coldcard': 'coldcard',
        'gnosis': 'gnosis',
        'uniswap': 'uniswap',
        'aave': 'aave',
        'lido': 'lido',
        'deblock': 'deblock',
        'morpho': 'morpho',
        'kraken': 'kraken',
        'crypto.com': 'crypto.com',
        'okx': 'okx',
        'bybit': 'bybit',
        'kucoin': 'kucoin',
        '1inch': '1inch',
        'curve': 'curve',
        'balancer': 'balancer',
        'compound': 'compound',
        'maker': 'maker',
        'yearn': 'yearn',
        'sushi': 'sushi',
        'pancake': 'pancakeswap',
        'dydx': 'dydx',
        'gmx': 'gmx',
        'synthetix': 'synthetix',
        'rocket': 'rocket pool',
        'ankr': 'ankr',
        'beefy': 'beefy',
        'stargate': 'stargate',
        'across': 'across',
        'wormhole': 'wormhole',
        'layer': 'layerzero',
        'zapper': 'zapper',
        'zerion': 'zerion',
        'debank': 'debank',
        'rabby': 'rabby',
        'rainbow': 'rainbow',
        'phantom': 'phantom',
        'argent': 'argent',
        'safe': 'gnosis',
        'casa': 'casa',
        'unchained': 'unchained',
        'tangem': 'tangem',
        'keystone': 'keystone',
        'ngrave': 'ngrave',
        'ballet': 'ballet',
        'cryptosteel': 'cryptosteel',
        'billfodl': 'billfodl',
        'blockplate': 'blockplate',
        'keepass': 'keepass',
        'veracrypt': 'veracrypt',
        '1password': '1password',
        'bitwarden': 'bitwarden',
    }
    
    # 3. Charger tous les produits
    print("\n📦 Chargement des produits...")
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/products?select=id,name,description,type_id,brand_id&order=id.asc",
        headers=headers,
        timeout=30
    )
    
    if response.status_code != 200:
        print(f"   ❌ Erreur: {response.status_code}")
        return
    
    products = response.json()
    print(f"   📊 {len(products)} produits à traiter")
    
    # 4. Mettre à jour chaque produit
    print("\n🔄 Mise à jour des produits...")
    updated_type = 0
    updated_brand = 0
    
    for product in products:
        product_id = product['id']
        name = product['name'].lower()
        description = (product.get('description') or '').lower()
        current_type_id = product.get('type_id')
        current_brand_id = product.get('brand_id')
        
        update_data = {}
        
        # Déterminer type_id depuis description
        new_type_id = None
        if description:
            # Chercher correspondance exacte avec code
            if description in types_by_code:
                new_type_id = types_by_code[description]
            else:
                # Chercher dans les codes
                for code, type_id in types_by_code.items():
                    if code in description or description in code:
                        new_type_id = type_id
                        break
        
        if new_type_id and new_type_id != current_type_id:
            update_data['type_id'] = new_type_id
        
        # Déterminer brand_id depuis le nom
        new_brand_id = None
        for keyword, brand_key in brand_keywords.items():
            if keyword in name:
                if brand_key in brands_map:
                    new_brand_id = brands_map[brand_key]
                    break
        
        if new_brand_id and new_brand_id != current_brand_id:
            update_data['brand_id'] = new_brand_id
        
        # Mettre à jour si nécessaire
        if update_data:
            response = requests.patch(
                f"{SUPABASE_URL}/rest/v1/products?id=eq.{product_id}",
                headers=headers,
                json=update_data,
                timeout=30
            )
            
            if response.status_code in [200, 204]:
                if 'type_id' in update_data:
                    updated_type += 1
                if 'brand_id' in update_data:
                    updated_brand += 1
                print(f"   ✅ {product['name'][:30]:30} | type_id: {update_data.get('type_id', '-'):4} | brand_id: {update_data.get('brand_id', '-')}")
    
    # 5. Résumé
    print("\n" + "=" * 60)
    print("🎉 MISE À JOUR TERMINÉE")
    print("=" * 60)
    print(f"   📂 type_id mis à jour  : {updated_type} produits")
    print(f"   🏷️  brand_id mis à jour : {updated_brand} produits")
    
    # Vérification finale
    print("\n🔍 Vérification...")
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/products?select=name,type_id,brand_id&type_id=not.is.null&limit=10",
        headers=headers,
        timeout=30
    )
    
    if response.status_code == 200:
        products_with_type = response.json()
        print(f"   📊 Produits avec type_id défini: {len(products_with_type)}")
    
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/products?select=name,type_id,brand_id&brand_id=not.is.null&limit=10",
        headers=headers,
        timeout=30
    )
    
    if response.status_code == 200:
        products_with_brand = response.json()
        print(f"   📊 Produits avec brand_id défini: {len(products_with_brand)}")

if __name__ == "__main__":
    main()
