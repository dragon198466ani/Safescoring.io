#!/usr/bin/env python3
"""
Revert AI misclassifications from deep_scrape_classify.py run.
Only fixes the obvious errors, keeps correct changes.
"""

import requests
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))
from core.config import SUPABASE_URL, SUPABASE_HEADERS

# REVERSIONS - Produits mal classifiés par l'IA (Run 2)
# Format: "Product Name": ["Type1 (primary)", "Type2", ...]
REVERSIONS = {
    # === HARDWARE WALLETS mal classifiés en SW Desktop ===
    "D'CENT Wallet": ["HW Cold"],          # C'est un hardware wallet biométrique
    "SafePal S1": ["HW Cold"],              # C'est un hardware wallet air-gapped
    "SafePal X1": ["HW Cold"],              # C'est un hardware wallet
    "Tangem Wallet": ["HW Cold"],           # C'est une carte NFC hardware wallet

    # === BRIDGES mal classifiés en DEX + AMM ===
    "Connext": ["Bridges"],                 # Protocol de bridge cross-chain
    "LayerZero": ["Bridges"],               # Infrastructure d'interopérabilité
    "Li.Fi": ["Bridges"],                   # Aggregateur de bridges
    "Multichain": ["Bridges"],              # Protocol de bridge (anciennement Anyswap)

    # === DERIVATIVES mal classifiés en DEX + AMM ===
    "GMX": ["Derivatives"],                 # Perpetual trading platform
    "Gains Network": ["Derivatives"],       # Perpetual trading / gTrade
    "Dopex": ["Derivatives"],               # Options protocol
    "Kwenta": ["Derivatives"],              # Synthetix perpetuals frontend
    "Pendle": ["Derivatives"],              # Yield trading / tokenization

    # === CARDS mal classifiés ===
    "MetaMask Card": ["Card"],              # C'est une carte de paiement crypto

    # === BACKUP PHYSICAL mal classifié ===
    "Keystone Tablet Plus": ["Bkp Physical"],  # C'est une plaque de backup métal

    # === WALLETS mal classifiés ===
    "OKX Wallet": ["SW Browser", "SW Mobile"],  # Extension + App mobile
    "Petra Wallet": ["SW Browser"],             # Extension Aptos
    "Uniswap Wallet": ["SW Browser", "SW Mobile"],  # Wallet Uniswap, pas DEX
    "Math Wallet": ["SW Browser", "SW Mobile"],  # Extension + App mobile

    # === ACCOUNT ABSTRACTION mal classifié ===
    "Pimlico": ["AA"],                      # Infrastructure AA (bundler/paymaster)

    # === RESTAKING mal classifié ===
    "Renzo Protocol": ["Restaking"],        # Liquid restaking protocol
    "Puffer Finance": ["Restaking"],        # Liquid restaking protocol
    "Kelp DAO": ["Restaking"],              # Liquid restaking protocol

    # === DEX AGGREGATORS mal classifiés ===
    "KyberSwap": ["DEX Agg"],               # DEX Aggregator
    "ParaSwap": ["DEX Agg"],                # DEX Aggregator

    # === LENDING mal classifié en DEX/AMM ===
    "Venus Protocol": ["Lending"],          # Lending protocol on BSC
    "Aave": ["Lending"],                    # THE lending protocol
    "Morpho": ["Lending"],                  # Lending optimizer
    "Notional Finance": ["Lending"],        # Fixed-rate lending
    "Euler Finance": ["Lending"],           # Lending protocol
    "Benqi": ["Lending"],                   # Avalanche lending

    # === DEX mal classifiés en DEX Agg ===
    "Raydium": ["DEX"],                     # Solana AMM DEX
    "Orca": ["DEX"],                        # Solana AMM DEX
    "Osmosis": ["DEX"],                     # Cosmos DEX
    "Trader Joe": ["DEX"],                  # Avalanche DEX

    # === LIQUID STAKING mal classifié ===
    "Marinade Finance": ["Liq Staking"],    # Solana liquid staking
    "Jito": ["Liq Staking"],                # Solana MEV staking

    # === YIELD AGGREGATORS mal classifiés ===
    "Beefy Finance": ["Yield"],             # Yield optimizer
    "Yearn Finance": ["Yield"],             # Yield aggregator
}


def main():
    print("=" * 60)
    print("   REVERSION DES MISCLASSIFICATIONS IA")
    print("=" * 60)
    print()

    # Load current data
    r = requests.get(f'{SUPABASE_URL}/rest/v1/products?select=id,name', headers=SUPABASE_HEADERS)
    products = {p['name']: p['id'] for p in r.json()}

    r = requests.get(f'{SUPABASE_URL}/rest/v1/product_types?select=id,code', headers=SUPABASE_HEADERS)
    types = {t['code']: t['id'] for t in r.json()}

    print(f"Products in DB: {len(products)}")
    print(f"Types in DB: {len(types)}")
    print(f"Reversions to apply: {len(REVERSIONS)}")
    print()

    corrected = 0
    errors = []

    for product_name, type_codes in REVERSIONS.items():
        product_id = products.get(product_name)
        if not product_id:
            errors.append(f"Product not found: {product_name}")
            continue

        # Delete existing mappings
        r = requests.delete(
            f'{SUPABASE_URL}/rest/v1/product_type_mapping?product_id=eq.{product_id}',
            headers=SUPABASE_HEADERS
        )

        # Add new mappings
        success = True
        for i, type_code in enumerate(type_codes):
            type_id = types.get(type_code)
            if not type_id:
                errors.append(f"Type not found: {type_code} for {product_name}")
                success = False
                continue

            data = {
                'product_id': product_id,
                'type_id': type_id,
                'is_primary': i == 0
            }
            r = requests.post(
                f'{SUPABASE_URL}/rest/v1/product_type_mapping',
                headers=SUPABASE_HEADERS,
                json=data
            )
            if r.status_code not in [200, 201]:
                errors.append(f"Insert failed: {product_name} -> {type_code}")
                success = False

        if success:
            types_str = " + ".join(type_codes)
            print(f"  ✓ {product_name}: → {types_str}")
            corrected += 1

    print()
    print("=" * 60)
    print(f"   RÉSUMÉ")
    print("=" * 60)
    print(f"   Corrigés: {corrected}/{len(REVERSIONS)}")

    if errors:
        print(f"\n   Erreurs ({len(errors)}):")
        for e in errors[:10]:
            print(f"     - {e}")


if __name__ == "__main__":
    main()
