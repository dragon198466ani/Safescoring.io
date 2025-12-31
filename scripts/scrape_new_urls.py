#!/usr/bin/env python3
"""
Scrape only the 45 products that were previously without URLs.
"""

import subprocess
import sys
import time

# Les 45 produits qui avaient des URLs manquantes
PRODUCTS_TO_SCRAPE = [
    "Ballet REAL Bitcoin",
    "BitBox02",
    "Coldcard Mk4",
    "Coldcard Q",
    "Jade",
    "Prokey Optimum",
    "Satochip",
    "SeedSigner",
    "Specter DIY",
    "Status Keycard",
    "Casa",
    "Hermit (Unchained)",
    "Liana Wallet",
    "Phoenix Wallet",
    "Samourai Wallet",
    "Specter Desktop",
    "Zeus Wallet",
    "SAFU Ninja",
    "Seed Phrase Steel",
    "Seedor",
    "SeedPlate",
    "SeedXOR",
    "SteelDisk",
    "Fraxlend",
    "Radiant Capital",
    "RealT",
    "Sommelier",
    "StakeWise",
    "THORSwap",
    "Deblock",
    "Deblock Card",
    "Gnosis Pay",
    "Shakepay Card",
    "SpectroCoin Card",
    "Swipe Card",
    "TenX Card",
    "Trastra Card",
    "Wirex",
    "Wirex Card",
    "Sygnum Bank",
    "Unchained Capital",
    "Vault12 Guard",
    "Xapo Bank",
    "Solayer Emerald",
    "YubiKey 5",
]

def main():
    print("=" * 60)
    print(f"   SCRAPE DES {len(PRODUCTS_TO_SCRAPE)} NOUVEAUX PRODUITS")
    print("=" * 60)
    print()

    for i, product in enumerate(PRODUCTS_TO_SCRAPE, 1):
        print(f"\n[{i}/{len(PRODUCTS_TO_SCRAPE)}] {product}")
        print("-" * 40)

        try:
            result = subprocess.run(
                [sys.executable, "scripts/deep_scrape_classify.py", "--product", product],
                capture_output=False,
                timeout=120
            )
        except subprocess.TimeoutExpired:
            print(f"   [TIMEOUT] {product}")
        except Exception as e:
            print(f"   [ERROR] {e}")

        time.sleep(1)  # Petit délai entre les requêtes

    print()
    print("=" * 60)
    print("   TERMINÉ")
    print("=" * 60)


if __name__ == "__main__":
    main()
