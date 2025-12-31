#!/usr/bin/env python3
"""
SAFESCORING.IO - Ajouter toutes les marques détectées
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

def main():
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
    }
    
    print("🏷️  AJOUT DE TOUTES LES MARQUES")
    print("=" * 60)
    
    # Liste complète des marques
    brands = [
        # Hardware Wallets
        {'name': 'Ledger', 'website': 'https://www.ledger.com'},
        {'name': 'Trezor', 'website': 'https://trezor.io'},
        {'name': 'Tangem', 'website': 'https://tangem.com'},
        {'name': 'Keystone', 'website': 'https://keyst.one'},
        {'name': 'NGRAVE', 'website': 'https://www.ngrave.io'},
        {'name': 'BitBox', 'website': 'https://shiftcrypto.ch'},
        {'name': 'Coldcard', 'website': 'https://coldcard.com'},
        {'name': 'Ellipal', 'website': 'https://www.ellipal.com'},
        {'name': 'SafePal', 'website': 'https://www.safepal.com'},
        {'name': 'OneKey', 'website': 'https://onekey.so'},
        {'name': 'Ballet', 'website': 'https://www.ballet.com'},
        {'name': 'Arculus', 'website': 'https://www.getarculus.com'},
        {'name': 'GridPlus', 'website': 'https://gridplus.io'},
        {'name': 'KeepKey', 'website': 'https://www.keepkey.com'},
        {'name': 'Prokey', 'website': 'https://prokey.io'},
        {'name': 'SecuX', 'website': 'https://secuxtech.com'},
        {'name': 'Jade', 'website': 'https://blockstream.com/jade'},
        
        # Software Wallets
        {'name': 'MetaMask', 'website': 'https://metamask.io'},
        {'name': 'Trust Wallet', 'website': 'https://trustwallet.com'},
        {'name': 'Exodus', 'website': 'https://www.exodus.com'},
        {'name': 'Atomic Wallet', 'website': 'https://atomicwallet.io'},
        {'name': 'Rabby', 'website': 'https://rabby.io'},
        {'name': 'Rainbow', 'website': 'https://rainbow.me'},
        {'name': 'Phantom', 'website': 'https://phantom.app'},
        {'name': 'Argent', 'website': 'https://www.argent.xyz'},
        {'name': 'Zerion', 'website': 'https://zerion.io'},
        {'name': 'Frame', 'website': 'https://frame.sh'},
        
        # Exchanges
        {'name': 'Binance', 'website': 'https://www.binance.com'},
        {'name': 'Coinbase', 'website': 'https://www.coinbase.com'},
        {'name': 'Kraken', 'website': 'https://www.kraken.com'},
        {'name': 'OKX', 'website': 'https://www.okx.com'},
        {'name': 'KuCoin', 'website': 'https://www.kucoin.com'},
        {'name': 'Bybit', 'website': 'https://www.bybit.com'},
        {'name': 'Bitfinex', 'website': 'https://www.bitfinex.com'},
        {'name': 'Gemini', 'website': 'https://www.gemini.com'},
        {'name': 'Crypto.com', 'website': 'https://crypto.com'},
        {'name': 'Meria', 'website': 'https://meria.com'},
        
        # DeFi Protocols
        {'name': 'Uniswap', 'website': 'https://uniswap.org'},
        {'name': 'Aave', 'website': 'https://aave.com'},
        {'name': 'Compound', 'website': 'https://compound.finance'},
        {'name': 'MakerDAO', 'website': 'https://makerdao.com'},
        {'name': 'Curve', 'website': 'https://curve.fi'},
        {'name': 'Balancer', 'website': 'https://balancer.fi'},
        {'name': 'SushiSwap', 'website': 'https://sushi.com'},
        {'name': 'PancakeSwap', 'website': 'https://pancakeswap.finance'},
        {'name': 'dYdX', 'website': 'https://dydx.exchange'},
        {'name': 'GMX', 'website': 'https://gmx.io'},
        {'name': 'Synthetix', 'website': 'https://synthetix.io'},
        {'name': 'Yearn', 'website': 'https://yearn.fi'},
        {'name': 'Convex', 'website': 'https://www.convexfinance.com'},
        {'name': 'Beefy', 'website': 'https://beefy.finance'},
        {'name': '1inch', 'website': 'https://1inch.io'},
        {'name': 'Lido', 'website': 'https://lido.fi'},
        {'name': 'Rocket Pool', 'website': 'https://rocketpool.net'},
        {'name': 'Morpho', 'website': 'https://morpho.org'},
        {'name': 'Pendle', 'website': 'https://pendle.finance'},
        
        # Bridges
        {'name': 'Stargate', 'website': 'https://stargate.finance'},
        {'name': 'Across', 'website': 'https://across.to'},
        {'name': 'Wormhole', 'website': 'https://wormhole.com'},
        {'name': 'LayerZero', 'website': 'https://layerzero.network'},
        {'name': 'Hop Protocol', 'website': 'https://hop.exchange'},
        
        # Crypto Banks
        {'name': 'Deblock', 'website': 'https://deblock.com'},
        {'name': 'Sygnum', 'website': 'https://www.sygnum.com'},
        {'name': 'AMINA', 'website': 'https://www.aminagroup.com'},
        {'name': 'Nexo', 'website': 'https://nexo.io'},
        {'name': 'Revolut', 'website': 'https://www.revolut.com'},
        {'name': 'N26', 'website': 'https://n26.com'},
        {'name': 'Wirex', 'website': 'https://wirexapp.com'},
        
        # Backup
        {'name': 'Cryptosteel', 'website': 'https://cryptosteel.com'},
        {'name': 'Billfodl', 'website': 'https://privacypros.io'},
        {'name': 'Blockplate', 'website': 'https://www.blockplate.com'},
        {'name': 'CryptoTag', 'website': 'https://cryptotag.io'},
        
        # Tools
        {'name': 'Gnosis', 'website': 'https://gnosis.io'},
        {'name': 'Safe', 'website': 'https://safe.global'},
        {'name': 'Casa', 'website': 'https://keys.casa'},
        {'name': 'Unchained', 'website': 'https://unchained.com'},
        {'name': 'Zapper', 'website': 'https://zapper.xyz'},
        {'name': 'DeBank', 'website': 'https://debank.com'},
    ]
    
    print(f"   📊 {len(brands)} marques à ajouter")
    
    # Récupérer les marques existantes
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/brands?select=name",
        headers=headers,
        timeout=30
    )
    
    existing_brands = set()
    if response.status_code == 200:
        existing_brands = {b['name'].lower() for b in response.json()}
        print(f"   📊 {len(existing_brands)} marques déjà existantes")
    
    # Filtrer les nouvelles marques
    new_brands = [b for b in brands if b['name'].lower() not in existing_brands]
    print(f"   📊 {len(new_brands)} nouvelles marques à ajouter")
    
    if new_brands:
        # Insérer les nouvelles marques
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/brands",
            headers=headers,
            json=new_brands,
            timeout=30
        )
        
        if response.status_code in [200, 201]:
            print(f"   ✅ {len(new_brands)} marques ajoutées!")
        else:
            print(f"   ❌ Erreur: {response.status_code} - {response.text[:200]}")
    
    # Afficher toutes les marques
    print("\n🏷️  Liste des marques:")
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/brands?select=name,website&order=name.asc",
        headers=headers,
        timeout=30
    )
    
    if response.status_code == 200:
        all_brands = response.json()
        for b in all_brands[:20]:
            print(f"   • {b['name']:20} | {b['website']}")
        if len(all_brands) > 20:
            print(f"   ... et {len(all_brands) - 20} autres")
        print(f"\n   📊 TOTAL: {len(all_brands)} marques")

if __name__ == "__main__":
    main()
