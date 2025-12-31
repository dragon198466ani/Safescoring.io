#!/usr/bin/env python3
"""
Fix incorrect AI classifications with accurate manual assignments.
"""

import requests
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))
from core.config import SUPABASE_URL, SUPABASE_HEADERS

# CORRECTIONS MANUELLES - Types exacts pour chaque produit
# Format: "Product Name": ["Type1 (primary)", "Type2", ...]
CORRECTIONS = {
    # === HARDWARE WALLETS (HW Cold) ===
    "Ledger Nano S": ["HW Cold"],
    "Ledger Nano S Plus": ["HW Cold"],
    "Ledger Nano X": ["HW Cold"],
    "Ledger Stax": ["HW Cold"],
    "Ledger Flex": ["HW Cold"],
    "Trezor Model One": ["HW Cold"],
    "Trezor Model T": ["HW Cold"],
    "Trezor Safe 3": ["HW Cold"],
    "Trezor Safe 5": ["HW Cold"],
    "Trezor Safe 7": ["HW Cold"],
    "Coldcard Mk4": ["HW Cold"],
    "Coldcard Q": ["HW Cold"],
    "BitBox02": ["HW Cold"],
    "Keystone 3 Pro": ["HW Cold"],
    "Keystone Pro": ["HW Cold"],
    "Keystone Essential": ["HW Cold"],
    "Foundation Passport": ["HW Cold"],
    "NGRAVE ZERO": ["HW Cold"],
    "Ellipal Titan": ["HW Cold"],
    "Ellipal Titan 2.0": ["HW Cold"],
    "CoolWallet Pro": ["HW Cold"],
    "CoolWallet S": ["HW Cold"],
    "SecuX V20": ["HW Cold"],
    "SecuX W20": ["HW Cold"],
    "KeepKey": ["HW Cold"],
    "Cobo Vault Pro": ["HW Cold"],
    "SafePal S1": ["HW Cold"],
    "SafePal X1": ["HW Cold"],
    "BC Vault": ["HW Cold"],
    "Arculus Card": ["HW Cold"],  # NFC card wallet
    "Tangem Wallet": ["HW Cold"],  # NFC card wallet
    "GridPlus Lattice1": ["HW Cold"],
    "Cypherock X1": ["HW Cold"],
    "D'CENT Wallet": ["HW Cold"],
    "OneKey Pro": ["HW Cold"],
    "OneKey Classic": ["HW Cold"],
    "HashWallet": ["HW Cold"],
    "Prokey Optimum": ["HW Cold"],
    "Satochip": ["HW Cold"],
    "Status Keycard": ["HW Cold"],
    "Jade": ["HW Cold"],  # Blockstream Jade
    "Krux": ["HW Cold"],  # DIY signing device
    "SeedSigner": ["HW Cold"],  # DIY signing device
    "Specter DIY": ["HW Cold"],

    # === HARDWARE SIGNING DEVICES ===
    "Coinkite TAPSIGNER": ["HW Sign"],
    "Coinkite SATSCARD": ["HW Sign"],
    "Opendime": ["HW Sign"],

    # === BACKUP PHYSIQUE (Metal) ===
    "Billfodl": ["Bkp Physical"],
    "Cryptosteel Capsule": ["Bkp Physical"],
    "Cryptosteel Cassette": ["Bkp Physical"],
    "CryptoTag Thor": ["Bkp Physical"],
    "CryptoTag Zeus": ["Bkp Physical"],
    "Blockplate": ["Bkp Physical"],
    "Blockplate 24": ["Bkp Physical"],
    "BitPlates Domino": ["Bkp Physical"],
    "Coinplate Alpha": ["Bkp Physical"],
    "Seed Phrase Steel": ["Bkp Physical"],
    "SeedPlate": ["Bkp Physical"],
    "Seedor": ["Bkp Physical"],
    "SteelDisk": ["Bkp Physical"],
    "Steelwallet": ["Bkp Physical"],
    "Steel Bitcoin": ["Bkp Physical"],
    "NGRAVE GRAPHENE": ["Bkp Physical"],
    "Keystone Tablet": ["Bkp Physical"],
    "Keystone Tablet Plus": ["Bkp Physical"],
    "Trezor Keep Metal": ["Bkp Physical"],
    "COLDTI": ["Bkp Physical"],
    "Hodlr Swiss": ["Bkp Physical"],
    "Coldbit Steel": ["Bkp Physical"],
    "Simbit": ["Bkp Physical"],
    "Material Bitcoin": ["Bkp Physical"],
    "SAFU Ninja": ["Bkp Physical"],
    "Ellipal Mnemonic Metal": ["Bkp Physical"],
    "SeedXOR": ["Bkp Physical"],  # Seed splitting tool

    # === SOFTWARE WALLETS - Desktop ===
    "Electrum": ["SW Desktop"],
    "Sparrow Wallet": ["SW Desktop"],
    "Bitcoin Core": ["SW Desktop"],
    "Specter Desktop": ["SW Desktop"],
    "Wasabi Wallet": ["SW Desktop"],
    "Samourai Wallet": ["SW Mobile"],
    "BlueWallet": ["SW Mobile"],
    "Exodus": ["Wallet MultiPlatform"],
    "Atomic Wallet": ["Wallet MultiPlatform"],
    "Guarda Wallet": ["Wallet MultiPlatform"],
    "Coinomi": ["Wallet MultiPlatform"],
    "Edge Wallet": ["SW Mobile"],
    "Unstoppable Wallet": ["SW Mobile"],
    "Liana Wallet": ["SW Desktop"],
    "Nunchuk": ["SW Desktop", "MultiSig"],
    "Casa": ["MultiSig", "Custody"],

    # === SOFTWARE WALLETS - Browser ===
    "MetaMask": ["SW Browser"],
    "Rabby Wallet": ["SW Browser"],
    "Rainbow Wallet": ["SW Mobile"],
    "Phantom Wallet": ["SW Browser"],
    "Trust Wallet": ["SW Mobile"],
    "Coin98 Wallet": ["Wallet MultiPlatform"],
    "Frame Wallet": ["SW Desktop"],
    "OKX Wallet": ["Wallet MultiPlatform"],
    "Keplr Wallet": ["SW Browser"],
    "Temple Wallet": ["SW Browser"],
    "Petra Wallet": ["SW Browser"],
    "Martian Wallet": ["SW Browser"],
    "Backpack Wallet": ["SW Browser"],
    "Solflare": ["SW Browser"],
    "imToken": ["SW Mobile"],
    "TokenPocket": ["SW Mobile"],
    "Math Wallet": ["Wallet MultiPlatform"],
    "Argent Wallet": ["Smart Wallet"],
    "Argent X": ["SW Browser"],  # StarkNet
    "Braavos Wallet": ["SW Browser"],  # StarkNet
    "Safe Wallet": ["Smart Wallet", "MultiSig"],
    "Sequence Wallet": ["Smart Wallet"],
    "ZenGo": ["MPC Wallet"],
    "Fireblocks": ["MPC Wallet", "Custody"],
    "Fordefi": ["MPC Wallet"],
    "Dfns": ["MPC Wallet"],

    # === LIGHTNING WALLETS ===
    "Muun Wallet": ["SW Mobile"],
    "Breez Wallet": ["SW Mobile"],
    "Phoenix Wallet": ["SW Mobile"],
    "Zeus Wallet": ["SW Mobile"],

    # === CEX (Exchanges Centralisés) ===
    "Binance": ["CEX"],
    "Coinbase Exchange": ["CEX"],
    "Coinbase Pro": ["CEX"],
    "Kraken": ["CEX"],
    "KuCoin": ["CEX"],
    "Bybit": ["CEX"],
    "OKX": ["CEX"],
    "Bitfinex": ["CEX"],
    "Bitstamp": ["CEX"],
    "Gemini": ["CEX"],
    "Gate.io": ["CEX"],
    "MEXC": ["CEX"],
    "HTX (Huobi)": ["CEX"],
    "Upbit": ["CEX"],
    "Bithumb": ["CEX"],
    "Bitpanda": ["CEX"],
    "FTX": ["CEX"],  # Historical
    "Crypto.com Exchange": ["CEX"],
    "Crypto.com App": ["CEX"],
    "Robinhood Crypto": ["CEX"],
    "eToro": ["CEX"],

    # === DEX ===
    "Uniswap": ["DEX", "AMM"],
    "SushiSwap": ["DEX", "AMM"],
    "PancakeSwap": ["DEX", "AMM"],
    "Curve Finance": ["DEX", "AMM"],
    "Balancer": ["DEX", "AMM"],
    "Camelot DEX": ["DEX"],
    "Velodrome": ["DEX"],
    "Aerodrome": ["DEX"],
    "QuickSwap": ["DEX"],
    "SpookySwap": ["DEX"],
    "Trader Joe": ["DEX"],
    "Biswap": ["DEX"],
    "Raydium": ["DEX"],
    "Orca": ["DEX"],
    "Jupiter": ["DEX Agg"],
    "Osmosis": ["DEX"],
    "Astroport": ["DEX"],
    "KyberSwap": ["DEX Agg"],
    "DODO": ["DEX"],
    "THORSwap": ["DEX", "Atomic Swap"],

    # === DEX AGGREGATORS ===
    "1inch": ["DEX Agg"],
    "ParaSwap": ["DEX Agg"],
    "DeFiLlama": ["Analytics"],  # Not a DEX

    # === BRIDGES ===
    "Across Protocol": ["Bridges"],
    "Stargate": ["Bridges"],
    "Wormhole": ["Bridges"],
    "LayerZero": ["Bridges"],
    "Axelar": ["Bridges"],
    "Multichain": ["Bridges"],
    "Celer cBridge": ["Bridges"],
    "Hop Protocol": ["Bridges"],
    "Connext": ["Bridges"],
    "Synapse Protocol": ["Bridges"],
    "Socket": ["Bridges"],
    "Li.Fi": ["Bridges"],
    "deBridge": ["Bridges"],
    "Orbiter Finance": ["Bridges"],

    # === LENDING ===
    "Aave": ["Lending"],
    "Compound": ["Lending"],
    "MakerDAO": ["Lending"],
    "Spark Protocol": ["Lending"],
    "Fraxlend": ["Lending"],
    "Euler Finance": ["Lending"],
    "Notional Finance": ["Lending"],
    "Morpho": ["Lending"],
    "Benqi": ["Lending"],
    "Venus Protocol": ["Lending"],
    "Radiant Capital": ["Lending"],
    "Alchemix": ["Lending"],  # Self-repaying loans
    "Abracadabra": ["Lending"],  # CDP

    # === YIELD / STAKING ===
    "Lido": ["Liq Staking"],
    "Rocket Pool": ["Liq Staking"],
    "Frax Ether": ["Liq Staking"],
    "Ankr Staking": ["Liq Staking"],
    "StakeWise": ["Liq Staking"],
    "Swell Network": ["Liq Staking"],
    "Ether.fi": ["Liq Staking"],
    "Jito": ["Liq Staking"],
    "Marinade Finance": ["Liq Staking"],
    "Coinbase cbETH": ["Liq Staking"],
    "Stader Labs": ["Liq Staking"],
    "Kelp DAO": ["Restaking"],
    "EigenLayer": ["Restaking"],
    "Renzo Protocol": ["Restaking"],
    "Puffer Finance": ["Restaking"],
    "Bedrock": ["Restaking"],
    "Solayer Emerald": ["Liq Staking"],

    # === YIELD AGGREGATORS ===
    "Yearn Finance": ["Yield"],
    "Beefy Finance": ["Yield"],
    "Autofarm": ["Yield"],
    "Harvest Finance": ["Yield"],
    "Convex Finance": ["Yield"],
    "Aura Finance": ["Yield"],
    "Pickle Finance": ["Yield"],
    "Sommelier": ["Yield"],

    # === DERIVATIVES ===
    "dYdX": ["Derivatives"],
    "GMX": ["Derivatives"],
    "Gains Network": ["Derivatives"],
    "Synthetix": ["Derivatives"],
    "Kwenta": ["Derivatives"],
    "Lyra Finance": ["Derivatives"],
    "Dopex": ["Derivatives"],
    "Hegic": ["Derivatives"],
    "Ribbon Finance": ["Derivatives"],
    "Pendle": ["Derivatives"],  # Yield trading

    # === CUSTODY ===
    "Anchorage Digital": ["Custody"],
    "BitGo": ["Custody"],
    "Ledger Enterprise": ["Custody"],
    "Cobo Custody": ["Custody"],
    "Hex Trust": ["Custody"],
    "Liminal Custody": ["Custody"],
    "Copper": ["Custody"],
    "Copper ClearLoop": ["Custody"],
    "Qredo": ["Custody", "MPC Wallet"],
    "Propine": ["Custody"],
    "Sygnum Bank": ["Crypto Bank"],
    "AMINA Bank": ["Crypto Bank"],

    # === CARDS ===
    "Binance Card": ["Card"],
    "Coinbase Card": ["Card"],
    "Crypto.com Card": ["Card"],
    "Nexo Card": ["Card"],
    "BitPay Card": ["Card"],
    "Fold Card": ["Card"],
    "Gemini Card": ["Card"],
    "BlockFi Card": ["Card"],
    "Wirex Card": ["Card"],
    "Wirex": ["Card"],
    "Shakepay Card": ["Card"],
    "Swipe Card": ["Card"],
    "eToro Card": ["Card"],
    "Mercuryo Card": ["Card"],
    "Cryptopay Card": ["Card"],
    "Trastra Card": ["Card"],
    "SpectroCoin Card": ["Card"],
    "TenX Card": ["Card"],
    "Paycent Card": ["Card"],
    "MetaMask Card": ["Card"],
    "COCA Card": ["Card"],
    "Baanx CryptoLife": ["Card"],
    "Bleap Card": ["Card"],
    "Deblock Card": ["Card"],
    "Gnosis Pay": ["Card Non-Cust"],  # Self-custody card
    "Holyheld": ["Card"],

    # === CRYPTO BANKS / NEOBANKS ===
    "Nexo": ["Crypto Bank"],
    "YouHodler": ["Crypto Bank"],
    "Meria": ["Crypto Bank"],
    "Swissborg": ["CEX"],
    "N26": ["Crypto Bank"],
    "Revolut": ["Crypto Bank"],
    "Xapo Bank": ["Crypto Bank"],

    # === ANALYTICS / PORTFOLIO ===
    "Zapper": ["Analytics"],
    "Zerion": ["Analytics"],
    "DeBank": ["Analytics"],
    "Nansen": ["Analytics"],
    "Dune Analytics": ["Analytics"],
    "Arkham": ["Analytics"],
    "Token Terminal": ["Analytics"],
    "CoinGecko": ["Analytics"],
    "CoinMarketCap": ["Analytics"],
    "Messari": ["Analytics"],

    # === DEFI TOOLS ===
    "DeFi Saver": ["DeFi Tools"],
    "Instadapp": ["DeFi Tools"],
    "LlamaPay": ["Payment"],

    # === RWA ===
    "RealT": ["RWA"],
    "Ondo Finance": ["RWA"],
    "BlockBar": ["RWA"],

    # === ACCOUNT ABSTRACTION ===
    "Biconomy": ["AA"],
    "ZeroDev": ["AA"],
    "Pimlico": ["AA"],
    "Candide": ["AA"],
    "Obvious Wallet": ["Smart Wallet"],

    # === INFRASTRUCTURE ===
    "Unchained Capital": ["MultiSig", "Custody"],
    "Hermit (Unchained)": ["SW Desktop"],
    "Glacier Protocol": ["MultiSig"],
    "Vault12 Guard": ["Bkp Digital"],
    "Ledger Live": ["SW Desktop"],
    "Ledger Recover": ["Bkp Digital"],
    "Trezor Shamir Backup": ["Bkp Digital"],

    # === OTHER ===
    "GoMining": ["Mining"],
    "Bolero Music": ["Fan Token"],
    "YubiKey 5": ["Identity"],
    "Tokemak": ["Yield"],
    "Olympus DAO": ["DeFi Tools"],  # Protocol
    "Carbon Wallet": ["SW Mobile"],
}


def main():
    print("=== CORRECTION DES CLASSIFICATIONS ===\n")

    # Load current data
    r = requests.get(f'{SUPABASE_URL}/rest/v1/products?select=id,name', headers=SUPABASE_HEADERS)
    products = {p['name']: p['id'] for p in r.json()}

    r = requests.get(f'{SUPABASE_URL}/rest/v1/product_types?select=id,code', headers=SUPABASE_HEADERS)
    types = {t['code']: t['id'] for t in r.json()}

    print(f"Products: {len(products)}")
    print(f"Types: {len(types)}")
    print(f"Corrections to apply: {len(CORRECTIONS)}\n")

    corrected = 0
    errors = []

    for product_name, type_codes in CORRECTIONS.items():
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
        for i, type_code in enumerate(type_codes):
            type_id = types.get(type_code)
            if not type_id:
                errors.append(f"Type not found: {type_code} for {product_name}")
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
            if r.status_code in [200, 201]:
                primary = "(P)" if i == 0 else ""
                print(f"  {product_name}: {type_code} {primary}")
                corrected += 1
            else:
                errors.append(f"Insert failed: {product_name} -> {type_code}")

    print(f"\n=== DONE ===")
    print(f"Corrections applied: {corrected}")

    if errors:
        print(f"\nErrors ({len(errors)}):")
        for e in errors[:20]:
            print(f"  - {e}")


if __name__ == "__main__":
    main()
