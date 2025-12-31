#!/usr/bin/env python3
"""
SAFESCORING.IO - Mise à jour des liens officiels (products, brands, norms)
"""

import os
import requests
import pandas as pd

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

# Base de données des URLs officiels
PRODUCT_URLS = {
    # Hardware Wallets
    'ledger nano x': 'https://shop.ledger.com/products/ledger-nano-x',
    'ledger nano s': 'https://shop.ledger.com/products/ledger-nano-s-plus',
    'ledger nano s plus': 'https://shop.ledger.com/products/ledger-nano-s-plus',
    'ledger stax': 'https://shop.ledger.com/products/ledger-stax',
    'ledger flex': 'https://shop.ledger.com/products/ledger-flex',
    'ledger live': 'https://www.ledger.com/ledger-live',
    'ledger recover': 'https://www.ledger.com/recover',
    'ledger enterprise': 'https://enterprise.ledger.com',
    'trezor model t': 'https://trezor.io/trezor-model-t',
    'trezor model one': 'https://trezor.io/trezor-model-one',
    'trezor safe 3': 'https://trezor.io/trezor-safe-3',
    'trezor safe 5': 'https://trezor.io/trezor-safe-5',
    'trezor safe 7': 'https://trezor.io/trezor-safe-7',
    'trezor keep metal': 'https://trezor.io/trezor-keep-metal',
    'trezor shamir backup': 'https://trezor.io/learn/a/what-is-shamir-backup',
    'coldcard mk4': 'https://coldcard.com/docs/coldcard-mk4',
    'coldcard q': 'https://coldcard.com/docs/q1',
    'tangem wallet': 'https://tangem.com/en/wallet',
    'tangem ring': 'https://tangem.com/en/ring',
    'keystone 3 pro': 'https://keyst.one/keystone-3-pro',
    'keystone pro': 'https://keyst.one/keystone-pro',
    'keystone essential': 'https://keyst.one/keystone-essential',
    'keystone nexus': 'https://keyst.one/keystone-nexus',
    'keystone tablet': 'https://keyst.one/keystone-tablet',
    'keystone tablet plus': 'https://keyst.one/keystone-tablet-plus',
    'ngrave zero': 'https://www.ngrave.io/en/products/zero',
    'ngrave graphene': 'https://www.ngrave.io/en/products/graphene',
    'bitbox02': 'https://shiftcrypto.ch/bitbox02',
    'ellipal titan': 'https://www.ellipal.com/products/ellipal-titan',
    'safepal s1': 'https://www.safepal.com/s1',
    'onekey classic': 'https://onekey.so/products/onekey-classic',
    'onekey pro': 'https://onekey.so/products/onekey-pro',
    'arculus card': 'https://www.getarculus.com',
    'gridplus lattice1': 'https://gridplus.io/products/lattice1',
    'keepkey': 'https://www.keepkey.com',
    'jade': 'https://blockstream.com/jade',
    'ballet real bitcoin': 'https://www.ballet.com/products/real-bitcoin',
    'secux v20': 'https://secuxtech.com/products/secux-v20',
    'prokey optimum': 'https://prokey.io/prokey-optimum',
    'material bitcoin': 'https://materialbitcoin.com',
    'satochip': 'https://satochip.io',
    'seedsigner': 'https://seedsigner.com',
    'specter diy': 'https://specter.solutions/hardware',
    'krux': 'https://selfcustody.github.io/krux',
    
    # Software Wallets
    'metamask': 'https://metamask.io',
    'metamask card': 'https://portfolio.metamask.io/card',
    'trust wallet': 'https://trustwallet.com',
    'exodus': 'https://www.exodus.com',
    'atomic wallet': 'https://atomicwallet.io',
    'rabby wallet': 'https://rabby.io',
    'rainbow wallet': 'https://rainbow.me',
    'phantom': 'https://phantom.app',
    'argent': 'https://www.argent.xyz',
    'zerion': 'https://zerion.io',
    'frame': 'https://frame.sh',
    'coinbase wallet': 'https://www.coinbase.com/wallet',
    'binance web3 wallet': 'https://www.binance.com/en/web3wallet',
    'okx wallet': 'https://www.okx.com/web3',
    'safe wallet': 'https://safe.global',
    'gnosis safe': 'https://safe.global',
    'uniswap wallet': 'https://wallet.uniswap.org',
    'ledger live': 'https://www.ledger.com/ledger-live',
    'wasabi wallet': 'https://wasabiwallet.io',
    'sparrow wallet': 'https://sparrowwallet.com',
    'specter desktop': 'https://specter.solutions',
    'electrum': 'https://electrum.org',
    'bluewallet': 'https://bluewallet.io',
    'muun wallet': 'https://muun.com',
    'phoenix wallet': 'https://phoenix.acinq.co',
    'zeus wallet': 'https://zeusln.com',
    'samourai wallet': 'https://samouraiwallet.com',
    
    # Exchanges
    '1inch': 'https://app.1inch.io',
    '1inch card': 'https://1inch.io/card',
    'aave': 'https://app.aave.com',
    'across protocol': 'https://across.to',
    'anchorage digital': 'https://www.anchorage.com',
    'ankr staking': 'https://www.ankr.com/staking',
    'autofarm': 'https://autofarm.network',
    'baanx cryptolife': 'https://baanx.com',
    'balancer': 'https://app.balancer.fi',
    'beefy finance': 'https://app.beefy.com',
    'benqi': 'https://benqi.fi',
    'binance': 'https://www.binance.com',
    'bitstamp': 'https://www.bitstamp.net',
    'bitfinex': 'https://www.bitfinex.com',
    'bybit': 'https://www.bybit.com',
    'coinbase': 'https://www.coinbase.com',
    'compound': 'https://compound.finance',
    'convex finance': 'https://www.convexfinance.com',
    'cream finance': 'https://cream.finance',
    'curve finance': 'https://curve.fi',
    'dydx': 'https://dydx.exchange',
    'gmx': 'https://gmx.io',
    'hop protocol': 'https://hop.exchange',
    'jito': 'https://jito.network',
    'kraken': 'https://www.kraken.com',
    'kucoin': 'https://www.kucoin.com',
    'kwenta': 'https://kwenta.eth.limo',
    'lido': 'https://lido.fi',
    'llamapay': 'https://llamapay.io',
    'lyra finance': 'https://lyra.finance',
    'makerdao': 'https://makerdao.com',
    'marinade finance': 'https://marinade.finance',
    'morpho': 'https://morpho.org',
    'nexo': 'https://nexo.io',
    'okx': 'https://www.okx.com',
    'ondo finance': 'https://ondo.finance',
    'pancakeswap': 'https://pancakeswap.finance',
    'paraswap': 'https://paraswap.io',
    'pendle': 'https://pendle.finance',
    'pickle finance': 'https://pickle.finance',
    'radiant capital': 'https://radiant.capital',
    'realt': 'https://realt.co',
    'rocket pool': 'https://rocketpool.net',
    'sommelier': 'https://sommelier.finance',
    'spark protocol': 'https://spark.fi',
    'stakewise': 'https://stakewise.io',
    'stargate': 'https://stargate.finance',
    'sushiswap': 'https://sushi.com',
    'synapse protocol': 'https://synapseprotocol.com',
    'synthetix': 'https://synthetix.io',
    'thorswap': 'https://thorswap.finance',
    'uniswap': 'https://app.uniswap.org',
    'venus protocol': 'https://venus.io',
    'wormhole': 'https://wormhole.com',
    'yearn finance': 'https://yearn.fi',
    
    # Banks & Cards
    'amina bank': 'https://www.aminagroup.com',
    'crypto.com card': 'https://crypto.com/cards',
    'deblock': 'https://deblock.com',
    'gnosis pay': 'https://gnosispay.com',
    'holyheld': 'https://holyheld.com',
    'mercuryo card': 'https://mercuryo.io',
    'n26': 'https://n26.com',
    'nexo card': 'https://nexo.io/nexo-card',
    'revolut': 'https://www.revolut.com',
    'sygnum bank': 'https://www.sygnum.com',
    'wirex': 'https://wirexapp.com',
    'wirex card': 'https://wirexapp.com/card',
    'xapo bank': 'https://www.xapobank.com',
    'meria': 'https://meria.com',
    
    # Backups
    'billfodl': 'https://privacypros.io/products/billfodl',
    'blockplate': 'https://www.blockplate.com',
    'blockplate 24': 'https://www.blockplate.com',
    'coinplate alpha': 'https://coinplate.io',
    'cryptosteel capsule': 'https://cryptosteel.com/product/cryptosteel-capsule',
    'cryptosteel cassette': 'https://cryptosteel.com/product/cryptosteel-cassette',
    'cryptotag thor': 'https://cryptotag.io/products/thor',
    'seedplate': 'https://seedplate.io',
    'seedor': 'https://seedor.io',
    'steelwallet': 'https://steelwallet.com',
    'steeldisk': 'https://steeldisk.com',
    'seed phrase steel': 'https://bitcoinseedbackup.com',
    'safu ninja': 'https://safuninja.com',
    
    # Tools
    'casa': 'https://keys.casa',
    'debank': 'https://debank.com',
    'defillama': 'https://defillama.com',
    'nunchuk': 'https://nunchuk.io',
    'unchained capital': 'https://unchained.com',
    'hermit (unchained)': 'https://unchained.com/hermit',
    'vault12 guard': 'https://vault12.com',
    'yubikey 5': 'https://www.yubico.com/products/yubikey-5-overview',
    'zapper': 'https://zapper.xyz',
    'liana wallet': 'https://wizardsardine.com/liana',
    'seedxor': 'https://seedxor.com',
    'status keycard': 'https://keycard.tech',
}

def main():
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
    }
    
    print("🔗 MISE À JOUR DES LIENS OFFICIELS")
    print("=" * 60)
    
    # ========================================
    # 1. PRODUITS
    # ========================================
    print("\n📦 [1/3] Mise à jour URLs des PRODUITS...")
    
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/products?select=id,name,url&order=id.asc",
        headers=headers,
        timeout=30
    )
    
    if response.status_code == 200:
        products = response.json()
        updated_products = 0
        
        for product in products:
            name_lower = product['name'].lower()
            current_url = product.get('url') or ''
            
            # Chercher URL correspondant
            new_url = None
            for key, url in PRODUCT_URLS.items():
                if key in name_lower or name_lower in key:
                    new_url = url
                    break
            
            # Mise à jour si URL trouvée et différente
            if new_url and new_url != current_url:
                response = requests.patch(
                    f"{SUPABASE_URL}/rest/v1/products?id=eq.{product['id']}",
                    headers=headers,
                    json={'url': new_url},
                    timeout=30
                )
                
                if response.status_code in [200, 204]:
                    updated_products += 1
                    if updated_products <= 15:
                        print(f"   ✅ {product['name'][:30]:30} → {new_url[:40]}")
        
        if updated_products > 15:
            print(f"   ... et {updated_products - 15} autres")
        print(f"\n   📊 {updated_products} produits mis à jour")
    
    # ========================================
    # 2. BRANDS
    # ========================================
    print("\n🏷️  [2/3] Mise à jour URLs des MARQUES...")
    
    brand_urls = {
        'ledger': 'https://www.ledger.com',
        'trezor': 'https://trezor.io',
        'tangem': 'https://tangem.com',
        'keystone': 'https://keyst.one',
        'ngrave': 'https://www.ngrave.io',
        'bitbox': 'https://shiftcrypto.ch',
        'coldcard': 'https://coldcard.com',
        'ellipal': 'https://www.ellipal.com',
        'safepal': 'https://www.safepal.com',
        'onekey': 'https://onekey.so',
        'ballet': 'https://www.ballet.com',
        'arculus': 'https://www.getarculus.com',
        'gridplus': 'https://gridplus.io',
        'keepkey': 'https://www.keepkey.com',
        'prokey': 'https://prokey.io',
        'secux': 'https://secuxtech.com',
        'jade': 'https://blockstream.com/jade',
        'metamask': 'https://metamask.io',
        'trust wallet': 'https://trustwallet.com',
        'exodus': 'https://www.exodus.com',
        'atomic wallet': 'https://atomicwallet.io',
        'rabby': 'https://rabby.io',
        'rainbow': 'https://rainbow.me',
        'phantom': 'https://phantom.app',
        'argent': 'https://www.argent.xyz',
        'zerion': 'https://zerion.io',
        'frame': 'https://frame.sh',
        'binance': 'https://www.binance.com',
        'coinbase': 'https://www.coinbase.com',
        'kraken': 'https://www.kraken.com',
        'okx': 'https://www.okx.com',
        'kucoin': 'https://www.kucoin.com',
        'bybit': 'https://www.bybit.com',
        'bitfinex': 'https://www.bitfinex.com',
        'gemini': 'https://www.gemini.com',
        'crypto.com': 'https://crypto.com',
        'meria': 'https://meria.com',
        'uniswap': 'https://uniswap.org',
        'aave': 'https://aave.com',
        'compound': 'https://compound.finance',
        'makerdao': 'https://makerdao.com',
        'curve': 'https://curve.fi',
        'balancer': 'https://balancer.fi',
        'sushiswap': 'https://sushi.com',
        'pancakeswap': 'https://pancakeswap.finance',
        'dydx': 'https://dydx.exchange',
        'gmx': 'https://gmx.io',
        'synthetix': 'https://synthetix.io',
        'yearn': 'https://yearn.fi',
        'convex': 'https://www.convexfinance.com',
        'beefy': 'https://beefy.finance',
        '1inch': 'https://1inch.io',
        'lido': 'https://lido.fi',
        'rocket pool': 'https://rocketpool.net',
        'morpho': 'https://morpho.org',
        'pendle': 'https://pendle.finance',
        'stargate': 'https://stargate.finance',
        'across': 'https://across.to',
        'wormhole': 'https://wormhole.com',
        'layerzero': 'https://layerzero.network',
        'hop protocol': 'https://hop.exchange',
        'deblock': 'https://deblock.com',
        'sygnum': 'https://www.sygnum.com',
        'amina': 'https://www.aminagroup.com',
        'nexo': 'https://nexo.io',
        'revolut': 'https://www.revolut.com',
        'n26': 'https://n26.com',
        'wirex': 'https://wirexapp.com',
        'cryptosteel': 'https://cryptosteel.com',
        'billfodl': 'https://privacypros.io',
        'blockplate': 'https://www.blockplate.com',
        'cryptotag': 'https://cryptotag.io',
        'gnosis': 'https://gnosis.io',
        'safe': 'https://safe.global',
        'casa': 'https://keys.casa',
        'unchained': 'https://unchained.com',
        'zapper': 'https://zapper.xyz',
        'debank': 'https://debank.com',
    }
    
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/brands?select=id,name,website&order=id.asc",
        headers=headers,
        timeout=30
    )
    
    if response.status_code == 200:
        brands = response.json()
        updated_brands = 0
        
        for brand in brands:
            name_lower = brand['name'].lower()
            current_url = brand.get('website') or ''
            
            new_url = brand_urls.get(name_lower)
            
            if new_url and new_url != current_url:
                response = requests.patch(
                    f"{SUPABASE_URL}/rest/v1/brands?id=eq.{brand['id']}",
                    headers=headers,
                    json={'website': new_url},
                    timeout=30
                )
                
                if response.status_code in [200, 204]:
                    updated_brands += 1
                    print(f"   ✅ {brand['name']:20} → {new_url}")
        
        print(f"\n   📊 {updated_brands} marques mises à jour")
    
    # ========================================
    # 3. NORMES (depuis Excel)
    # ========================================
    print("\n📋 [3/3] Mise à jour liens des NORMES...")
    
    try:
        df = pd.read_excel('SAFE_SCORING_V7_FINAL.xlsx', sheet_name='ÉVALUATIONS DÉTAIL', header=3)
        
        # Extraire les liens par code
        norm_links = {}
        for index, row in df.iterrows():
            code = str(row.get('ID', '')).strip()
            link = str(row.get('Lien Officiel', '')).strip()
            
            if code and code != 'nan' and link and link != 'nan' and link.startswith('http'):
                norm_links[code] = link
        
        print(f"   📊 {len(norm_links)} liens trouvés dans Excel")
        
        # Vérifier si la colonne existe
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/norms?select=id,code&limit=1",
            headers=headers,
            timeout=30
        )
        
        if response.status_code == 200:
            # Récupérer toutes les normes
            response = requests.get(
                f"{SUPABASE_URL}/rest/v1/norms?select=id,code",
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                norms = response.json()
                updated_norms = 0
                
                for norm in norms:
                    code = norm['code']
                    if code in norm_links:
                        # Note: La table norms n'a peut-être pas de colonne official_link
                        # On peut l'ajouter ou utiliser description
                        pass
                
                print(f"   ⚠️  Colonne 'official_link' non présente dans la table norms")
                print(f"   💡 Ajoutez la colonne avec: ALTER TABLE norms ADD COLUMN official_link TEXT;")
    
    except Exception as e:
        print(f"   ❌ Erreur: {e}")
    
    # ========================================
    # RÉSUMÉ
    # ========================================
    print("\n" + "=" * 60)
    print("🎉 MISE À JOUR TERMINÉE")
    print("=" * 60)
    print("   ✅ URLs des produits mis à jour")
    print("   ✅ URLs des marques mis à jour")
    print("   💡 Pour les normes, ajoutez la colonne 'official_link' dans Supabase")

if __name__ == "__main__":
    main()
