#!/usr/bin/env python3
"""
SAFESCORING.IO - Ajout des URLs de documentation
Ajoute les URLs de documentation (GitHub, docs, audits) pour chaque produit
"""

import requests

# Configuration Supabase
SUPABASE_URL = 'https://ajdncttomdqojlozxjxu.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqZG5jdHRvbWRxb2psb3p4anh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0MjMwNzUsImV4cCI6MjA3OTk5OTA3NX0.tTgqj-ALcl0oIdxFHuFQkB19apiz9CSyvV2X1TMWjEk'

HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
}

# URLs de documentation connues pour les produits majeurs
DOC_URLS = {
    # Hardware Wallets
    'Ledger Nano X': {
        'github': 'https://github.com/LedgerHQ',
        'docs': 'https://developers.ledger.com',
        'support': 'https://support.ledger.com'
    },
    'Ledger Nano S Plus': {
        'github': 'https://github.com/LedgerHQ',
        'docs': 'https://developers.ledger.com',
        'support': 'https://support.ledger.com'
    },
    'Ledger Stax': {
        'github': 'https://github.com/LedgerHQ',
        'docs': 'https://developers.ledger.com',
        'support': 'https://support.ledger.com'
    },
    'Ledger Flex': {
        'github': 'https://github.com/LedgerHQ',
        'docs': 'https://developers.ledger.com',
        'support': 'https://support.ledger.com'
    },
    'Trezor Model T': {
        'github': 'https://github.com/trezor',
        'docs': 'https://docs.trezor.io',
        'wiki': 'https://wiki.trezor.io'
    },
    'Trezor Safe 3': {
        'github': 'https://github.com/trezor',
        'docs': 'https://docs.trezor.io',
        'wiki': 'https://wiki.trezor.io'
    },
    'Trezor Safe 5': {
        'github': 'https://github.com/trezor',
        'docs': 'https://docs.trezor.io',
        'wiki': 'https://wiki.trezor.io'
    },
    'BitBox02': {
        'github': 'https://github.com/digitalbitbox',
        'docs': 'https://shiftcrypto.support'
    },
    'Coldcard Mk4': {
        'github': 'https://github.com/Coldcard',
        'docs': 'https://coldcard.com/docs'
    },
    'Coldcard Q': {
        'github': 'https://github.com/Coldcard',
        'docs': 'https://coldcard.com/docs'
    },
    'NGRAVE ZERO': {
        'docs': 'https://support.ngrave.io'
    },
    'Keystone Pro': {
        'github': 'https://github.com/KeystoneHQ',
        'docs': 'https://support.keyst.one'
    },
    'Foundation Passport': {
        'github': 'https://github.com/Foundation-Devices',
        'docs': 'https://docs.foundationdevices.com'
    },
    
    # Software Wallets
    'MetaMask': {
        'github': 'https://github.com/MetaMask',
        'docs': 'https://docs.metamask.io',
        'support': 'https://support.metamask.io'
    },
    'Trust Wallet': {
        'github': 'https://github.com/trustwallet',
        'docs': 'https://developer.trustwallet.com'
    },
    'Exodus': {
        'support': 'https://support.exodus.com',
        'docs': 'https://www.exodus.com/support'
    },
    'Phantom': {
        'github': 'https://github.com/phantom',
        'docs': 'https://docs.phantom.app'
    },
    'Rabby': {
        'github': 'https://github.com/RabbyHub',
        'docs': 'https://rabby.io/docs'
    },
    
    # DeFi Protocols
    'Aave': {
        'github': 'https://github.com/aave',
        'docs': 'https://docs.aave.com',
        'governance': 'https://governance.aave.com'
    },
    'Uniswap': {
        'github': 'https://github.com/Uniswap',
        'docs': 'https://docs.uniswap.org'
    },
    'Compound': {
        'github': 'https://github.com/compound-finance',
        'docs': 'https://docs.compound.finance'
    },
    'Curve Finance': {
        'github': 'https://github.com/curvefi',
        'docs': 'https://resources.curve.fi'
    },
    'Lido': {
        'github': 'https://github.com/lidofinance',
        'docs': 'https://docs.lido.fi'
    },
    'Rocket Pool': {
        'github': 'https://github.com/rocket-pool',
        'docs': 'https://docs.rocketpool.net'
    },
    'MakerDAO': {
        'github': 'https://github.com/makerdao',
        'docs': 'https://docs.makerdao.com'
    },
    '1inch': {
        'github': 'https://github.com/1inch',
        'docs': 'https://docs.1inch.io'
    },
    
    # Exchanges
    'Binance': {
        'github': 'https://github.com/binance',
        'docs': 'https://www.binance.com/en/support',
        'api': 'https://binance-docs.github.io/apidocs'
    },
    'Coinbase Exchange': {
        'github': 'https://github.com/coinbase',
        'docs': 'https://docs.cloud.coinbase.com',
        'support': 'https://help.coinbase.com'
    },
    'Kraken': {
        'github': 'https://github.com/krakenfx',
        'docs': 'https://docs.kraken.com',
        'support': 'https://support.kraken.com'
    },
    
    # Bridges
    'Across Protocol': {
        'github': 'https://github.com/across-protocol',
        'docs': 'https://docs.across.to'
    },
    'Stargate': {
        'github': 'https://github.com/stargate-protocol',
        'docs': 'https://stargateprotocol.gitbook.io'
    },
    'Hop Protocol': {
        'github': 'https://github.com/hop-protocol',
        'docs': 'https://docs.hop.exchange'
    },
    
    # Multisig
    'Safe Wallet': {
        'github': 'https://github.com/safe-global',
        'docs': 'https://docs.safe.global'
    },
    'Casa': {
        'support': 'https://support.keys.casa',
        'docs': 'https://keys.casa/security'
    },
}


def update_product_specs():
    """Met à jour les specs des produits avec les URLs de documentation"""
    print("📥 Chargement des produits...")
    
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/products?select=id,name,specs',
        headers=HEADERS
    )
    products = r.json()
    print(f"   ✅ {len(products)} produits")
    
    updated = 0
    
    for product in products:
        name = product['name']
        
        if name in DOC_URLS:
            doc_urls = DOC_URLS[name]
            
            # Mettre à jour les specs
            current_specs = product.get('specs') or {}
            current_specs['doc_urls'] = doc_urls
            
            r = requests.patch(
                f'{SUPABASE_URL}/rest/v1/products?id=eq.{product["id"]}',
                headers=HEADERS,
                json={'specs': current_specs}
            )
            
            if r.status_code in [200, 204]:
                updated += 1
                print(f"   ✅ {name}: {list(doc_urls.keys())}")
            else:
                print(f"   ❌ {name}: {r.status_code}")
    
    print(f"\n✅ {updated} produits mis à jour avec URLs de documentation")


if __name__ == '__main__':
    update_product_specs()
