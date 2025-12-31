#!/usr/bin/env python3
"""
Add missing URLs for products without URLs in the database.
"""

import requests
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))
from core.config import SUPABASE_URL, SUPABASE_HEADERS

# URLs manquantes pour les produits
MISSING_URLS = {
    # Hardware Wallets
    "Ballet REAL Bitcoin": "https://www.ballet.com",
    "BitBox02": "https://shiftcrypto.ch",
    "Coldcard Mk4": "https://coldcard.com",
    "Coldcard Q": "https://coldcard.com",
    "Jade": "https://blockstream.com/jade",
    "Prokey Optimum": "https://prokey.io",
    "Satochip": "https://satochip.io",
    "SeedSigner": "https://seedsigner.com",
    "Specter DIY": "https://specter.solutions",
    "Status Keycard": "https://keycard.tech",

    # Software Wallets
    "Casa": "https://casa.io",
    "Hermit (Unchained)": "https://unchained.com/hermit",
    "Liana Wallet": "https://wizardsardine.com/liana",
    "Phoenix Wallet": "https://phoenix.acinq.co",
    "Samourai Wallet": "https://samouraiwallet.com",
    "Specter Desktop": "https://specter.solutions",
    "Zeus Wallet": "https://zeusln.com",

    # Backup Physical
    "SAFU Ninja": "https://safuninja.com",
    "Seed Phrase Steel": "https://seedphrasesteel.com",
    "Seedor": "https://seedor.io",
    "SeedPlate": "https://seedplate.com",
    "SeedXOR": "https://seedxor.com",
    "SteelDisk": "https://steeldisk.com",

    # DeFi Protocols
    "Fraxlend": "https://app.frax.finance/fraxlend",
    "Radiant Capital": "https://radiant.capital",
    "RealT": "https://realt.co",
    "Sommelier": "https://sommelier.finance",
    "StakeWise": "https://stakewise.io",
    "THORSwap": "https://thorswap.finance",

    # Cards
    "Deblock": "https://deblock.com",
    "Deblock Card": "https://deblock.com",
    "Gnosis Pay": "https://gnosispay.com",
    "Shakepay Card": "https://shakepay.com",
    "SpectroCoin Card": "https://spectrocoin.com",
    "Swipe Card": "https://swipe.io",
    "TenX Card": "https://tenx.tech",
    "Trastra Card": "https://trastra.com",
    "Wirex": "https://wirexapp.com",
    "Wirex Card": "https://wirexapp.com",

    # Custody / Banks
    "Sygnum Bank": "https://sygnum.com",
    "Unchained Capital": "https://unchained.com",
    "Vault12 Guard": "https://vault12.com",
    "Xapo Bank": "https://xapobank.com",

    # Other
    "Solayer Emerald": "https://solayer.org",
    "YubiKey 5": "https://yubico.com",
}


def main():
    print("=" * 60)
    print("   AJOUT DES URLs MANQUANTES")
    print("=" * 60)
    print()

    # Load products
    r = requests.get(f'{SUPABASE_URL}/rest/v1/products?select=id,name,url', headers=SUPABASE_HEADERS)
    products = {p['name']: p for p in r.json()}

    print(f"Products in DB: {len(products)}")
    print(f"URLs to add: {len(MISSING_URLS)}")
    print()

    updated = 0
    errors = []
    already_has_url = []

    for product_name, url in MISSING_URLS.items():
        product = products.get(product_name)

        if not product:
            errors.append(f"Product not found: {product_name}")
            continue

        if product.get('url'):
            already_has_url.append(product_name)
            continue

        # Update URL
        r = requests.patch(
            f'{SUPABASE_URL}/rest/v1/products?id=eq.{product["id"]}',
            headers=SUPABASE_HEADERS,
            json={'url': url}
        )

        if r.status_code in [200, 204]:
            print(f"  ✓ {product_name}: {url}")
            updated += 1
        else:
            errors.append(f"Update failed: {product_name} ({r.status_code})")

    print()
    print("=" * 60)
    print(f"   RÉSUMÉ")
    print("=" * 60)
    print(f"   URLs ajoutées: {updated}")

    if already_has_url:
        print(f"   Déjà avec URL: {len(already_has_url)}")

    if errors:
        print(f"\n   Erreurs ({len(errors)}):")
        for e in errors[:10]:
            print(f"     - {e}")


if __name__ == "__main__":
    main()
