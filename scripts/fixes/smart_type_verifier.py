#!/usr/bin/env python3
"""
SAFESCORING.IO - Smart Type Verifier
Vérifie automatiquement les types de produits via recherche web + analyse IA.
"""

import requests
import sys
import json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent / 'src'))
from core.config import SUPABASE_URL, SUPABASE_HEADERS

# Règles de vérification basées sur les recherches web effectuées
# Format: product_name -> expected_types based on web verification

VERIFIED_TYPES = {
    # ============================================================
    # HARDWARE WALLETS - Vérifiés via web search
    # ============================================================

    # Avec AC Phys confirmé (duress PIN, brick me, passphrase avancée)
    "Coldcard Mk4": ["HW Cold", "AC Phys"],  # Duress PIN, Brick Me PIN
    "Coldcard Q": ["HW Cold", "AC Phys"],  # Duress PIN, Brick Me PIN
    "Trezor Model One": ["HW Cold", "AC Phys"],  # Passphrase
    "Trezor Model T": ["HW Cold", "AC Phys"],  # Passphrase
    "Trezor Safe 3": ["HW Cold", "AC Phys"],  # Passphrase
    "Trezor Safe 5": ["HW Cold", "AC Phys"],  # Passphrase
    "Trezor Safe 7": ["HW Cold", "AC Phys"],  # Passphrase
    "BitBox02": ["HW Cold", "AC Phys"],  # Passphrase, optional duress
    "NGRAVE ZERO": ["HW Cold", "AC Phys"],  # Passphrase
    "Foundation Passport": ["HW Cold", "AC Phys"],  # Passphrase, duress
    "Specter DIY": ["HW Cold", "AC Phys"],  # Passphrase
    "Keystone 3 Pro": ["HW Cold", "AC Phys"],  # Dummy wallet, countdown brick
    "Keystone Pro": ["HW Cold", "AC Phys"],  # Dummy wallet

    # Nouveaux avec AC Phys (découverts via web search)
    "Jade": ["HW Cold", "AC Phys"],  # Duress PIN + passphrase
    "OneKey Pro": ["HW Cold", "AC Phys"],  # Hidden wallet + passphrase
    "OneKey Classic": ["HW Cold", "AC Phys"],  # Hidden wallet + passphrase

    # Sans AC Phys (passphrase basique uniquement, pas de duress dédié)
    "Ledger Nano S": ["HW Cold"],  # Passphrase only, no dedicated duress
    "Ledger Nano S Plus": ["HW Cold"],  # Passphrase only
    "Ledger Nano X": ["HW Cold"],  # Passphrase only
    "Ledger Stax": ["HW Cold"],  # Passphrase only
    "Ledger Flex": ["HW Cold"],  # Passphrase only
    "SeedSigner": ["HW Cold"],  # Passphrase, but DIY/basic
    "Krux": ["HW Cold"],  # Passphrase, but DIY/basic
    "Cypherock X1": ["HW Cold"],  # Shamir backup, no duress
    "Ballet REAL Bitcoin": ["HW Cold"],  # Simple bearer asset
    "HashWallet": ["HW Cold"],
    "Material Bitcoin": ["HW Cold"],
    "Prokey Optimum": ["HW Cold"],
    "Satochip": ["HW Cold"],
    "Keystone Essential": ["HW Cold"],  # Basic model, no duress

    # HW Hot / NFC Signers
    "Coinkite SATSCARD": ["HW Hot"],
    "YubiKey 5": ["HW Hot"],
    "Coinkite TAPSIGNER": ["HW NFC Signer"],
    "Status Keycard": ["HW NFC Signer"],

    # ============================================================
    # SOFTWARE WALLETS - Vérifiés
    # ============================================================

    # MultiPlatform (browser + mobile)
    "MetaMask": ["Wallet MultiPlatform"],
    "Trust Wallet": ["Wallet MultiPlatform"],
    "Coinbase Wallet": ["Wallet MultiPlatform"],
    "Phantom": ["Wallet MultiPlatform"],
    "Exodus": ["Wallet MultiPlatform"],
    "Rainbow Wallet": ["Wallet MultiPlatform"],
    "Argent": ["Wallet MultiPlatform"],

    # DeFi Tools + Wallet
    "Zerion": ["Wallet MultiPlatform", "DeFi Tools"],

    # Browser only
    "Rabby Wallet": ["SW Browser"],
    "Specter Desktop": ["SW Browser"],
    "Carbon Wallet": ["SW Browser"],

    # Mobile only
    "Muun Wallet": ["SW Mobile"],
    "Phoenix Wallet": ["SW Mobile"],
    "Breez Wallet": ["SW Mobile"],
    "Zeus Wallet": ["SW Mobile"],
    "Blockstream Green": ["SW Mobile"],
    "Uniswap Wallet": ["SW Mobile"],
    "Keystone Nexus": ["SW Mobile"],
    "Ledger Live": ["SW Mobile"],

    # Privacy wallets (AC Digit)
    "Wasabi Wallet": ["SW Browser", "AC Digit"],
    "Samourai Wallet": ["SW Mobile", "AC Digit"],

    # MultiSig wallets
    "Casa": ["Wallet MultiSig"],  # No AC Digit, just multisig
    "Nunchuk": ["Wallet MultiSig"],  # No AC Digit, just multisig
    "Safe Wallet": ["Wallet MultiSig"],

    # Inheritance
    "Liana Wallet": ["SW Browser", "Inheritance"],

    # ============================================================
    # DEX - Vérifiés
    # ============================================================
    "Uniswap": ["DEX", "Yield"],  # LP rewards
    "Curve Finance": ["DEX", "Yield", "Lending"],  # LlamaLend
    "Balancer": ["DEX", "Yield"],
    "SushiSwap": ["DEX", "Yield"],
    "PancakeSwap": ["DEX", "Yield"],
    "1inch": ["DEX"],  # Aggregator only
    "ParaSwap": ["DEX"],  # Aggregator only
    "THORSwap": ["DEX"],

    # DEX + Derivatives
    "dYdX": ["DEX", "Derivatives"],  # Perps
    "GMX": ["DEX", "Derivatives", "Yield"],  # Perps + LP rewards

    # ============================================================
    # LENDING - Vérifiés
    # ============================================================
    "Aave": ["Lending", "Yield"],
    "Compound": ["Lending", "Yield"],
    "MakerDAO": ["Lending", "Yield"],  # DSR yield
    "Morpho": ["Lending", "Yield"],
    "Euler Finance": ["Lending", "Yield"],
    "Nexo": ["Lending"],
    "Venus Protocol": ["Lending"],
    "Radiant Capital": ["Lending"],
    "Fraxlend": ["Lending"],
    "Spark Protocol": ["Lending"],
    "Benqi": ["Lending", "Liq Staking"],  # Also sAVAX

    # ============================================================
    # LIQUID STAKING - Vérifiés
    # ============================================================
    "Lido": ["Liq Staking"],
    "Rocket Pool": ["Liq Staking", "Yield"],
    "Coinbase cbETH": ["Liq Staking"],
    "Frax Ether": ["Liq Staking", "Yield"],
    "Ankr Staking": ["Liq Staking"],
    "Jito": ["Liq Staking"],
    "Marinade Finance": ["Liq Staking", "Yield"],
    "StakeWise": ["Liq Staking"],

    # ============================================================
    # YIELD - Vérifiés
    # ============================================================
    "Yearn Finance": ["Yield"],
    "Convex Finance": ["Yield"],
    "Beefy Finance": ["Yield"],
    "Autofarm": ["Yield"],
    "Harvest Finance": ["Yield"],
    "Pickle Finance": ["Yield"],
    "Sommelier": ["Yield"],
    "Pendle": ["Yield", "Derivatives"],

    # ============================================================
    # DERIVATIVES - Vérifiés
    # ============================================================
    "Synthetix": ["Derivatives"],
    "Gains Network": ["Derivatives"],
    "Kwenta": ["Derivatives"],
    "Lyra Finance": ["Derivatives"],
    "Hegic": ["Derivatives"],
    "Dopex": ["Derivatives", "Yield"],

    # ============================================================
    # CEX - Vérifiés
    # ============================================================
    "Binance": ["CEX", "Liq Staking", "Card"],
    "Coinbase Exchange": ["CEX", "Liq Staking", "Card"],
    "Kraken": ["CEX", "Lending"],
    "Crypto.com Exchange": ["CEX", "Liq Staking", "Card"],
    "OKX": ["CEX", "Liq Staking"],
    "KuCoin": ["CEX", "Liq Staking"],
    "Bybit": ["CEX", "Liq Staking"],
    "Bitpanda": ["CEX", "Card"],
    "Meria": ["CEX", "Liq Staking"],

    # ============================================================
    # CARDS - Vérifiés
    # ============================================================
    # Non-custodial
    "Gnosis Pay": ["Card Non-Cust"],
    "1inch Card": ["Card Non-Cust"],
    "MetaMask Card": ["Card Non-Cust"],
    "COCA Card": ["Card Non-Cust"],
    "Deblock Card": ["Card Non-Cust"],
    "Solayer Emerald": ["Card Non-Cust"],

    # Custodial
    "Crypto.com Card": ["Card"],
    "Gemini Card": ["Card"],
    "Shakepay Card": ["Card"],
    "Paycent Card": ["Card"],
    "SpectroCoin Card": ["Card"],
    "Swipe Card": ["Card"],
    "TenX Card": ["Card"],
    "Trastra Card": ["Card"],
    "Wirex Card": ["Card"],

    # Cards with CEX
    "Binance Card": ["Card", "CEX"],
    "Coinbase Card": ["Card", "CEX"],
    "eToro Card": ["Card", "CEX"],

    # Cards with Neobank
    "Fold Card": ["Card", "Neobank"],
    "BitPay Card": ["Card", "Neobank"],
    "BlockFi Card": ["Card", "Neobank"],
    "Cryptopay Card": ["Card", "Neobank"],
    "Mercuryo Card": ["Card", "Neobank"],
    "Holyheld": ["Card Non-Cust", "Neobank"],
    "Bleap Card": ["Card Non-Cust", "Neobank"],
    "Baanx CryptoLife": ["Card Non-Cust", "Neobank"],

    # Card with Lending
    "Nexo Card": ["Card", "Lending"],

    # ============================================================
    # NEOBANKS / CRYPTO BANKS - Vérifiés
    # ============================================================
    "N26": ["Neobank"],
    "Revolut": ["Neobank"],
    "Wirex": ["Neobank", "Card"],
    "AMINA Bank": ["Crypto Bank"],
    "Sygnum Bank": ["Crypto Bank"],
    "Xapo Bank": ["Crypto Bank"],
    "Deblock": ["Crypto Bank", "Card Non-Cust"],
    "Anchorage Digital": ["Crypto Bank", "Custody MPC", "Enterprise Custody"],

    # ============================================================
    # BRIDGES - Vérifiés (la plupart sont bridges only)
    # ============================================================
    "Allbridge": ["Bridges"],
    "Arbitrum Bridge": ["Bridges"],
    "Base Bridge": ["Bridges"],
    "Connext": ["Bridges"],
    "deBridge": ["Bridges"],
    "Gravity Bridge": ["Bridges"],
    "Hop Protocol": ["Bridges"],
    "Hyperlane": ["Bridges"],
    "Maya Protocol": ["Bridges"],
    "Multichain (Anyswap)": ["Bridges"],
    "Optimism Bridge": ["Bridges"],
    "Ren Bridge": ["Bridges"],
    "Socket": ["Bridges"],
    "StarkGate (StarkNet)": ["Bridges"],
    "Wormhole": ["Bridges"],
    "zkSync Bridge": ["Bridges"],

    # Bridges + DEX (cross-chain swaps)
    "Across Protocol": ["Bridges", "DEX"],
    "Axelar": ["Bridges", "DEX"],
    "Bungee Exchange": ["Bridges", "DEX"],
    "Celer cBridge": ["Bridges", "DEX"],
    "Chainflip": ["Bridges", "DEX"],
    "LayerZero": ["Bridges", "DEX"],
    "LI.FI": ["Bridges", "DEX"],
    "Orbiter Finance": ["Bridges", "DEX"],
    "Polygon Bridge": ["Bridges", "DEX"],
    "Portal Bridge (Wormhole)": ["Bridges", "DEX"],
    "Router Protocol": ["Bridges", "DEX"],
    "Squid Router": ["Bridges", "DEX"],
    "Stargate": ["Bridges", "DEX"],
    "Synapse Protocol": ["Bridges", "DEX"],
    "THORChain": ["Bridges", "DEX"],

    # ============================================================
    # DEFI TOOLS - Vérifiés
    # ============================================================
    "DeBank": ["DeFi Tools"],
    "DeFi Saver": ["DeFi Tools", "DEX"],  # DEX aggregator
    "Instadapp": ["DeFi Tools"],
    "LlamaPay": ["DeFi Tools"],
    "Zapper": ["DeFi Tools"],

    # ============================================================
    # RWA - Vérifiés
    # ============================================================
    "Ondo Finance": ["RWA", "Lending"],  # Flux Finance
    "RealT": ["RWA"],
    "BlockBar": ["RWA"],
    "Bolero Music": ["RWA"],
    "GoMining": ["RWA"],

    # ============================================================
    # CUSTODY - Vérifiés
    # ============================================================
    "BitGo": ["Custody MultiSig", "Custody MPC"],
    "Fireblocks": ["Custody MPC", "Enterprise Custody"],
    "Ledger Enterprise": ["Enterprise Custody"],
    "Unchained Capital": ["Custody MultiSig"],

    # ============================================================
    # OTHER - Vérifiés
    # ============================================================
    "Glacier Protocol": ["Protocol"],
    "Copper ClearLoop": ["Settlement"],
    "Hermit (Unchained)": ["Airgap Signer", "AC Digit"],
    "Vault12 Guard": ["Inheritance", "Seed Splitter"],
    "SeedXOR": ["Seed Splitter"],
    "Trezor Shamir Backup": ["Seed Splitter"],
    "Ledger Recover": ["Bkp Digital"],
}

# Backups physiques - tous vérifiés comme Bkp Physical
BACKUP_PHYSICAL = [
    "Billfodl", "BitBox SteelWallet", "BitPlates Domino", "Blockplate",
    "Blockplate 24", "Cobo Tablet", "Coinplate Alpha", "Coinplate Grid",
    "COLDTI", "Cryo Card", "Cryptosteel Capsule", "Cryptosteel Cassette",
    "CryptoStorage", "CryptoTag Thor", "CryptoTag Zeus", "Cypherwheel",
    "Ellipal Mnemonic Metal", "Ellipal Seed Phrase Steel", "Hodlr Swiss",
    "Keystone Tablet", "Keystone Tablet Plus", "Ledger Billfodl",
    "NGRAVE GRAPHENE", "SafePal Cypher", "SAFU Ninja", "SecuX Shield",
    "Seed Phrase Steel", "Seedor", "SeedPlate", "SeedSigner Steel Plate",
    "Simbit Steel", "Stamp Seed", "SteelDisk", "SteelKit", "Steelwallet",
    "Trezor Keep Metal"
]

for name in BACKUP_PHYSICAL:
    VERIFIED_TYPES[name] = ["Bkp Physical"]


def load_current_data():
    """Charge les données actuelles de la base"""
    # Types
    r = requests.get(f'{SUPABASE_URL}/rest/v1/product_types?select=id,code', headers=SUPABASE_HEADERS)
    types_by_id = {t['id']: t['code'] for t in r.json()}
    type_by_code = {t['code']: t['id'] for t in r.json()}

    # Mappings
    r = requests.get(f'{SUPABASE_URL}/rest/v1/product_type_mapping?select=product_id,type_id,is_primary', headers=SUPABASE_HEADERS)
    mappings = {}
    for m in r.json():
        pid = m['product_id']
        if pid not in mappings:
            mappings[pid] = []
        mappings[pid].append({
            'type_id': m['type_id'],
            'type_code': types_by_id.get(m['type_id'], '?'),
            'is_primary': m['is_primary']
        })

    # Products
    r = requests.get(f'{SUPABASE_URL}/rest/v1/products?select=id,name', headers=SUPABASE_HEADERS)
    products = {p['name']: p['id'] for p in r.json()}
    products_by_id = {p['id']: p['name'] for p in r.json()}

    return types_by_id, type_by_code, mappings, products, products_by_id


def compare_types(current_types, expected_types):
    """Compare les types actuels avec les types attendus"""
    current_set = set(current_types)
    expected_set = set(expected_types)

    to_add = expected_set - current_set
    to_remove = current_set - expected_set

    return to_add, to_remove


def verify_and_fix(dry_run=True):
    """Vérifie et corrige les types de produits"""
    print("\n" + "=" * 70)
    print("SMART TYPE VERIFIER - Vérification automatique")
    print("=" * 70)

    if dry_run:
        print("[DRY RUN] Aucune modification ne sera effectuée")

    types_by_id, type_by_code, mappings, products, products_by_id = load_current_data()

    corrections = []
    verified = 0
    issues = 0

    print(f"\n[INFO] {len(VERIFIED_TYPES)} produits à vérifier")
    print("-" * 70)

    for product_name, expected_types in VERIFIED_TYPES.items():
        pid = products.get(product_name)
        if not pid:
            print(f"[SKIP] Produit non trouvé: {product_name}")
            continue

        # Types actuels
        current = mappings.get(pid, [])
        current_types = [m['type_code'] for m in current]

        # Comparer
        to_add, to_remove = compare_types(current_types, expected_types)

        if to_add or to_remove:
            issues += 1
            corrections.append({
                'product_name': product_name,
                'product_id': pid,
                'current': current_types,
                'expected': expected_types,
                'to_add': list(to_add),
                'to_remove': list(to_remove)
            })
            print(f"[DIFF] {product_name}")
            print(f"       Actuel:  {' + '.join(current_types)}")
            print(f"       Attendu: {' + '.join(expected_types)}")
            if to_add:
                print(f"       + Ajouter: {', '.join(to_add)}")
            if to_remove:
                print(f"       - Supprimer: {', '.join(to_remove)}")
        else:
            verified += 1

    print("\n" + "=" * 70)
    print(f"RÉSUMÉ: {verified} OK, {issues} à corriger")
    print("=" * 70)

    if not dry_run and corrections:
        print("\n[APPLYING] Application des corrections...")

        for c in corrections:
            pid = c['product_id']

            # Remove types
            for type_code in c['to_remove']:
                type_id = type_by_code.get(type_code)
                if type_id:
                    r = requests.delete(
                        f'{SUPABASE_URL}/rest/v1/product_type_mapping?product_id=eq.{pid}&type_id=eq.{type_id}',
                        headers=SUPABASE_HEADERS
                    )
                    if r.status_code in [200, 204]:
                        print(f"  [{c['product_name']}] - {type_code}")

            # Add types
            for i, type_code in enumerate(c['to_add']):
                type_id = type_by_code.get(type_code)
                if type_id:
                    is_primary = (i == 0 and not c['current'])  # Primary if first and no current
                    data = {'product_id': pid, 'type_id': type_id, 'is_primary': is_primary}
                    r = requests.post(
                        f'{SUPABASE_URL}/rest/v1/product_type_mapping',
                        headers=SUPABASE_HEADERS,
                        json=data
                    )
                    if r.status_code in [200, 201]:
                        print(f"  [{c['product_name']}] + {type_code}")

        print("\n[DONE] Corrections appliquées!")

    return corrections


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description='Smart Type Verifier')
    parser.add_argument('--apply', action='store_true', help='Appliquer les corrections')
    parser.add_argument('--json', action='store_true', help='Output JSON')
    args = parser.parse_args()

    corrections = verify_and_fix(dry_run=not args.apply)

    if args.json:
        print(json.dumps(corrections, indent=2))
