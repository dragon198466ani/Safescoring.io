#!/usr/bin/env python3
"""
SAFESCORING.IO - Optimisation Multi-Types
==========================================
Script pour nettoyer et optimiser les assignations de types dans la base de données.

Règles appliquées:
1. Produits de backup métal/physique -> UNIQUEMENT Bkp Physical (max 1 type)
2. Produits de backup numérique -> UNIQUEMENT Bkp Digital (max 1 type)
3. Hardware Wallets -> HW Cold + AC Phys si fonctionnalités anti-coercition réelles (max 2 types)
4. Software Wallets -> Type principal + AC Digit si privacy features (max 2-3 types)
5. DeFi Lending -> Lending + Yield (max 2 types)
6. DEX -> DEX + Derivatives/Yield si vraiment applicable (max 2-3 types)
7. Bridges -> Bridges uniquement (max 1 type)
8. Cartes -> Card + Crypto Bank si IBAN (max 2 types)
9. CEX -> CEX + Card si carte intégrée (max 2 types)

Auteur: Claude AI
Date: 2024
"""

import requests
import sys
from pathlib import Path
from typing import Dict, List, Set, Tuple

# Configuration
sys.path.insert(0, str(Path(__file__).parent.parent.parent / 'src'))
try:
    from core.config import SUPABASE_URL, SUPABASE_HEADERS
except ImportError:
    import os
    from dotenv import load_dotenv
    load_dotenv()
    SUPABASE_URL = os.getenv('SUPABASE_URL')
    SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_KEY')
    SUPABASE_HEADERS = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json'
    }


# ============================================================
# DÉFINITION DES RÈGLES DE TYPES PAR PRODUIT
# ============================================================

# Produits qui ne doivent avoir QU'UN SEUL type (backup physique)
BACKUP_PHYSICAL_ONLY = [
    "Keystone Tablet Plus",
    "Keystone Tablet",
    "Stamp Seed",
    "SteelDisk",
    "CryptoTag Zeus",
    "CryptoTag Thor",
    "Cryptosteel Capsule",
    "Cryptosteel Cassette",
    "BitBox SteelWallet",
    "Billfodl",
    "Blockplate",
    "Blockplate 24",
    "Cobo Tablet",
    "Coinplate Alpha",
    "Coinplate Grid",
    "Cryo Card",
    "CryptoStorage",
    "Cypherwheel",
    "Ellipal Seed Phrase Steel",
    "Hodlr Swiss",
    "SafePal Cypher",
    "SecuX Shield",
    "SeedPlate",
    "SeedSigner Steel Plate",
    "Simbit Steel",
    "Steelki",
    "SteelWallet Mnemonic",
    "Tangem Backup",
    "TIPIT Cryptosteel",
]

# Produits qui ne doivent avoir QU'UN SEUL type (backup numérique)
BACKUP_DIGITAL_ONLY = [
    "Ledger Recover",
    "NGRAVE GRAPHENE",
    "Seed Phrase Steel",
    "COLDTI",
    "BitPlates Domino",
    "Ellipal Mnemonic Metal",
    "SAFU Ninja",
    "Seedor",
]

# Types à SUPPRIMER pour les produits de backup (ne devraient jamais les avoir)
TYPES_TO_REMOVE_FROM_BACKUPS = [
    "HW Cold",
    "HW Hot",
    "SW Browser",
    "SW Mobile",
    "DEX",
    "Lending",
    "Yield",
    "Liq Staking",
    "Derivatives",
    "Bridges",
    "CEX",
    "Card",
    "Card Non-Cust",
    "Crypto Bank",
    "DeFi Tools",
    "RWA",
    "Stablecoin",
    "AC Phys",      # Les plaques n'ont pas de fonctions AC
    "AC Digit",     # Les plaques n'ont pas de fonctions AC
    "AC Phygi",     # Les plaques n'ont pas de fonctions AC
    "Bkp Digital",  # Pour backup physique seulement
    "Bkp Physical", # Pour backup digital seulement (inversé)
]

# Bridges - doivent avoir UNIQUEMENT Bridges comme type
BRIDGES_ONLY = [
    "Allbridge",
    "Arbitrum Bridge",
    "Base Bridge",
    "Connext",
    "deBridge",
    "Gravity Bridge",
    "Hop Protocol",
    "Maya Protocol",
    "Optimism Bridge",
    "Socket",
    "Synapse",
    "Wormhole",
]

# Bridges avec fonctionnalités DEX (peuvent avoir DEX en secondaire)
BRIDGES_WITH_DEX = [
    "Across Protocol",
    "Axelar",
    "Celer cBridge",
    "LayerZero",
    "Polygon Bridge",
    "Portal Bridge (Wormhole)",
    "Stargate",
]

# Types invalides pour les bridges
TYPES_TO_REMOVE_FROM_BRIDGES = [
    "Lending",
    "Yield",
    "Liq Staking",
    "Derivatives",
    "DeFi Tools",
    "RWA",
    "Card",
    "Card Non-Cust",
    "Crypto Bank",
    "Protocol",
    "Reglement Hors-Exchange",
]

# Cartes - configuration des types valides
CARDS_CONFIG = {
    # Cartes custodiales simples
    "Crypto.com Card": ["Card"],
    "Gemini Card": ["Card"],
    "Shakepay Card": ["Card"],
    "Paycent Card": ["Card"],

    # Cartes avec app/banking
    "Fold Card": ["Card", "Neobank"],
    "BitPay Card": ["Card", "Neobank"],
    "BlockFi Card": ["Card", "Neobank"],
    "Cryptopay Card": ["Card", "Neobank"],
    "Mercuryo Card": ["Card", "Neobank"],
    "Nexo Card": ["Card", "Crypto Lending"],
    "Coinbase Card": ["Card", "CEX"],
    "Binance Card": ["Card", "CEX"],
    "eToro Card": ["Card", "CEX"],

    # Cartes non-custodiales
    "Gnosis Pay": ["Card Non-Cust"],
    "Holyheld": ["Card Non-Cust", "Neobank"],
    "Bleap Card": ["Card Non-Cust", "Neobank"],
    "Baanx CryptoLife": ["Card Non-Cust", "Neobank"],
    "COCA Card": ["Card Non-Cust"],
    "MetaMask Card": ["Card Non-Cust", "SW Mobile"],
}

# CEX - types valides (max 3-4)
CEX_CONFIG = {
    "Binance": ["CEX", "Liq Staking", "Card"],
    "Coinbase Exchange": ["CEX", "Liq Staking", "Card"],
    "Kraken": ["CEX", "Crypto Lending"],
    "Crypto.com Exchange": ["CEX", "Liq Staking", "Card"],
    "OKX": ["CEX", "Liq Staking"],
    "KuCoin": ["CEX", "Liq Staking"],
    "Bybit": ["CEX", "Liq Staking"],
    "Bitpanda": ["CEX", "Card"],
    "Meria": ["CEX", "Liq Staking"],
}

# Lending protocols - types valides (max 2)
LENDING_CONFIG = {
    "Aave": ["Lending", "Yield"],
    "Compound": ["Lending", "Yield"],
    "MakerDAO": ["Lending", "Yield"],  # MakerDAO fait aussi yield avec DSR
    "Morpho": ["Lending", "Yield"],
    "Euler Finance": ["Lending", "Yield"],
    "Benqi": ["Lending", "Liq Staking"],
    "Radiant Capital": ["Lending"],
    "Fraxlend": ["Lending"],
}

# DEX - types valides (max 2-3)
DEX_CONFIG = {
    "Uniswap": ["DEX"],
    "1inch": ["DEX"],
    "ParaSwap": ["DEX"],
    "Curve Finance": ["DEX", "Yield"],
    "Balancer": ["DEX", "Yield"],
    "SushiSwap": ["DEX", "Yield"],
    "PancakeSwap": ["DEX", "Yield"],
    "GMX": ["DEX", "Derivatives"],
    "dYdX": ["DEX", "Derivatives", "Lending"],
    "Trader Joe": ["DEX", "Lending"],
}

# Yield Aggregators - types valides (max 2)
YIELD_CONFIG = {
    "Yearn Finance": ["Yield"],
    "Beefy Finance": ["Yield"],
    "Convex Finance": ["Yield"],
    "Harvest Finance": ["Yield"],
    "Pickle Finance": ["Yield"],
    "Autofarm": ["Yield"],
    "Pendle": ["Yield", "Derivatives"],
}

# Derivatives - types valides (max 2)
DERIVATIVES_CONFIG = {
    "Hegic": ["Derivatives"],
    "Dopex": ["Derivatives", "Yield"],
    "Gains Network": ["Derivatives"],
    "Lyra Finance": ["Derivatives"],
    "Kwenta": ["Derivatives"],
}

# Liquid Staking - types valides (max 2)
LIQUID_STAKING_CONFIG = {
    "Lido": ["Liq Staking"],
    "Rocket Pool": ["Liq Staking", "Yield"],
    "Frax Ether": ["Liq Staking", "Yield"],
    "Ankr Staking": ["Liq Staking"],
    "Coinbase cbETH": ["Liq Staking"],
    "Jito": ["Liq Staking"],
    "Marinade Finance": ["Liq Staking", "Yield"],
}

# Hardware Wallets - configuration
# HW Cold + AC Phys pour ceux avec vraies fonctions anti-coercition (duress PIN, etc.)
HW_WITH_AC = [
    "Coldcard Mk4",
    "Coldcard Q",
    "Trezor Safe 3",
    "Trezor Safe 5",
    "Trezor Model T",
    "Foundation Passport",
    "BitBox02",
    "NGRAVE ZERO",
]

HW_WITHOUT_AC = [
    "Ledger Nano S",
    "Ledger Nano S Plus",
    "Ledger Nano X",
    "Ledger Stax",
    "Ledger Flex",
    "OneKey Classic",
    "OneKey Pro",
    "Prokey Optimum",
    "Ballet REAL Bitcoin",
    "HashWallet",
    "Jade",
    "Keystone Pro",
    "Keystone 3 Pro",
    "Keystone Essential",
    "Krux",
    "Material Bitcoin",
    "Satochip",
    "SeedSigner",
    "Cypherock X1",
]

# Software Wallets - configuration
SW_CONFIG = {
    # Multi-platform wallets
    "MetaMask": ["Wallet MultiPlatform", "SW Mobile"],
    "Phantom": ["Wallet MultiPlatform", "SW Mobile"],
    "Exodus": ["Wallet MultiPlatform", "SW Mobile"],
    "Trust Wallet": ["Wallet MultiPlatform", "SW Mobile"],
    "Coinbase Wallet": ["Wallet MultiPlatform", "SW Mobile"],
    "Rainbow Wallet": ["Wallet MultiPlatform", "SW Browser"],

    # Browser-only
    "Rabby Wallet": ["SW Browser", "SW Mobile"],

    # Mobile-only
    "Muun Wallet": ["SW Mobile"],
    "Phoenix Wallet": ["SW Mobile"],
    "Breez Wallet": ["SW Mobile"],
    "Safe Wallet": ["SW Mobile"],

    # Privacy wallets (avec AC Digit)
    "Wasabi Wallet": ["SW Browser", "AC Digit"],
    "Sparrow Wallet": ["SW Browser", "AC Digit"],
    "Samourai Wallet": ["SW Mobile", "AC Digit"],

    # Wallets avec héritage/timelock
    "Liana Wallet": ["SW Browser", "AC Digit"],
    "Casa": ["Wallet MultiSig", "AC Digit"],
    "Nunchuk": ["Wallet MultiSig", "AC Digit"],
}


def load_data():
    """Charge toutes les données nécessaires"""
    print("\n[LOAD] Chargement des données...")

    # Types
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/product_types?select=id,code,name",
        headers=SUPABASE_HEADERS
    )
    types_by_code = {}
    types_by_id = {}
    if r.status_code == 200:
        for t in r.json():
            types_by_code[t['code']] = t['id']
            types_by_id[t['id']] = t
    print(f"   {len(types_by_code)} types")

    # Produits
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/products?select=id,name,slug,type_id",
        headers=SUPABASE_HEADERS
    )
    products = r.json() if r.status_code == 200 else []
    products_by_name = {p['name']: p for p in products}
    print(f"   {len(products)} produits")

    # Mappings
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/product_type_mapping?select=id,product_id,type_id,is_primary",
        headers=SUPABASE_HEADERS
    )
    mappings = {}
    if r.status_code == 200:
        for m in r.json():
            pid = m['product_id']
            if pid not in mappings:
                mappings[pid] = []
            mappings[pid].append(m)
    print(f"   {sum(len(v) for v in mappings.values())} mappings")

    return types_by_code, types_by_id, products, products_by_name, mappings


def analyze_problems(products, mappings, types_by_id):
    """Analyse les problèmes de typage"""
    print("\n" + "=" * 80)
    print("ANALYSE DES PROBLÈMES")
    print("=" * 80)

    problems = {
        'excessive_types': [],      # >3 types
        'backup_with_wrong_types': [],
        'bridge_with_defi': [],
        'card_with_ac': [],
        'defi_excessive': [],
    }

    for p in products:
        pid = p['id']
        name = p['name']

        if pid not in mappings:
            continue

        type_count = len(mappings[pid])
        type_codes = [types_by_id.get(m['type_id'], {}).get('code', '?') for m in mappings[pid]]

        # Excessive types (>5)
        if type_count > 5:
            problems['excessive_types'].append({
                'name': name,
                'count': type_count,
                'types': type_codes
            })

        # Backup avec mauvais types
        if name in BACKUP_PHYSICAL_ONLY or name in BACKUP_DIGITAL_ONLY:
            invalid_types = [t for t in type_codes if t not in ['Bkp Physical', 'Bkp Digital']]
            if invalid_types:
                problems['backup_with_wrong_types'].append({
                    'name': name,
                    'invalid': invalid_types
                })

    # Affichage
    print(f"\n[!] Produits avec >5 types: {len(problems['excessive_types'])}")
    for p in problems['excessive_types'][:10]:
        print(f"   - {p['name']}: {p['count']} types")

    print(f"\n[!] Backups avec types invalides: {len(problems['backup_with_wrong_types'])}")
    for p in problems['backup_with_wrong_types'][:10]:
        print(f"   - {p['name']}: {p['invalid']}")

    return problems


def generate_corrections(products_by_name, mappings, types_by_code, types_by_id):
    """Génère la liste des corrections à appliquer"""
    corrections = []

    # 1. Backups physiques - garder uniquement Bkp Physical
    for name in BACKUP_PHYSICAL_ONLY:
        if name in products_by_name:
            pid = products_by_name[name]['id']
            corrections.append({
                'product_id': pid,
                'product_name': name,
                'action': 'set_single_type',
                'target_type': 'Bkp Physical',
                'reason': 'Plaque métal - doit avoir uniquement Bkp Physical'
            })

    # 2. Backups numériques - garder uniquement Bkp Digital
    for name in BACKUP_DIGITAL_ONLY:
        if name in products_by_name:
            pid = products_by_name[name]['id']
            corrections.append({
                'product_id': pid,
                'product_name': name,
                'action': 'set_single_type',
                'target_type': 'Bkp Digital',
                'reason': 'Backup numérique - doit avoir uniquement Bkp Digital'
            })

    # 3. Bridges simples - garder uniquement Bridges
    for name in BRIDGES_ONLY:
        if name in products_by_name:
            pid = products_by_name[name]['id']
            corrections.append({
                'product_id': pid,
                'product_name': name,
                'action': 'set_single_type',
                'target_type': 'Bridges',
                'reason': 'Bridge simple - doit avoir uniquement Bridges'
            })

    # 4. Bridges avec DEX
    for name in BRIDGES_WITH_DEX:
        if name in products_by_name:
            pid = products_by_name[name]['id']
            corrections.append({
                'product_id': pid,
                'product_name': name,
                'action': 'set_types',
                'target_types': ['Bridges', 'DEX'],
                'reason': 'Bridge avec agrégation - Bridges + DEX uniquement'
            })

    # 5. Lending protocols
    for name, types in LENDING_CONFIG.items():
        if name in products_by_name:
            pid = products_by_name[name]['id']
            corrections.append({
                'product_id': pid,
                'product_name': name,
                'action': 'set_types',
                'target_types': types,
                'reason': f'Lending protocol - max {len(types)} types'
            })

    # 6. DEX
    for name, types in DEX_CONFIG.items():
        if name in products_by_name:
            pid = products_by_name[name]['id']
            corrections.append({
                'product_id': pid,
                'product_name': name,
                'action': 'set_types',
                'target_types': types,
                'reason': f'DEX - max {len(types)} types'
            })

    # 7. Cards
    for name, types in CARDS_CONFIG.items():
        if name in products_by_name:
            pid = products_by_name[name]['id']
            corrections.append({
                'product_id': pid,
                'product_name': name,
                'action': 'set_types',
                'target_types': types,
                'reason': f'Carte crypto - types spécifiques'
            })

    # 8. CEX
    for name, types in CEX_CONFIG.items():
        if name in products_by_name:
            pid = products_by_name[name]['id']
            corrections.append({
                'product_id': pid,
                'product_name': name,
                'action': 'set_types',
                'target_types': types,
                'reason': f'CEX - max {len(types)} types'
            })

    # 9. Yield Aggregators
    for name, types in YIELD_CONFIG.items():
        if name in products_by_name:
            pid = products_by_name[name]['id']
            corrections.append({
                'product_id': pid,
                'product_name': name,
                'action': 'set_types',
                'target_types': types,
                'reason': f'Yield Aggregator - max {len(types)} types'
            })

    # 10. Derivatives
    for name, types in DERIVATIVES_CONFIG.items():
        if name in products_by_name:
            pid = products_by_name[name]['id']
            corrections.append({
                'product_id': pid,
                'product_name': name,
                'action': 'set_types',
                'target_types': types,
                'reason': f'Derivatives - max {len(types)} types'
            })

    # 11. Liquid Staking
    for name, types in LIQUID_STAKING_CONFIG.items():
        if name in products_by_name:
            pid = products_by_name[name]['id']
            corrections.append({
                'product_id': pid,
                'product_name': name,
                'action': 'set_types',
                'target_types': types,
                'reason': f'Liquid Staking - max {len(types)} types'
            })

    # 12. Hardware Wallets avec AC
    for name in HW_WITH_AC:
        if name in products_by_name:
            pid = products_by_name[name]['id']
            corrections.append({
                'product_id': pid,
                'product_name': name,
                'action': 'set_types',
                'target_types': ['HW Cold', 'AC Phys'],
                'reason': 'HW avec fonctions anti-coercition réelles'
            })

    # 13. Hardware Wallets sans AC
    for name in HW_WITHOUT_AC:
        if name in products_by_name:
            pid = products_by_name[name]['id']
            corrections.append({
                'product_id': pid,
                'product_name': name,
                'action': 'set_single_type',
                'target_type': 'HW Cold',
                'reason': 'HW standard - uniquement HW Cold'
            })

    return corrections


def apply_corrections(corrections, types_by_code, dry_run=True):
    """Applique les corrections"""
    print("\n" + "=" * 80)
    print(f"APPLICATION DES CORRECTIONS {'(DRY RUN)' if dry_run else '(LIVE)'}")
    print("=" * 80)

    stats = {'deleted': 0, 'added': 0, 'skipped': 0, 'errors': 0}

    for corr in corrections:
        pid = corr['product_id']
        name = corr['product_name']

        print(f"\n[{corr['action']}] {name}")
        print(f"   Raison: {corr['reason']}")

        if corr['action'] == 'set_single_type':
            target_type = corr['target_type']
            target_type_id = types_by_code.get(target_type)

            if not target_type_id:
                print(f"   [ERROR] Type inconnu: {target_type}")
                stats['errors'] += 1
                continue

            if not dry_run:
                # Supprimer tous les mappings existants
                r = requests.delete(
                    f"{SUPABASE_URL}/rest/v1/product_type_mapping?product_id=eq.{pid}",
                    headers=SUPABASE_HEADERS
                )
                if r.status_code in [200, 204]:
                    stats['deleted'] += 1

                # Ajouter le type unique
                r = requests.post(
                    f"{SUPABASE_URL}/rest/v1/product_type_mapping",
                    headers=SUPABASE_HEADERS,
                    json={
                        'product_id': pid,
                        'type_id': target_type_id,
                        'is_primary': True
                    }
                )
                if r.status_code in [200, 201]:
                    stats['added'] += 1
                    print(f"   [OK] -> {target_type}")
                else:
                    stats['errors'] += 1
                    print(f"   [ERROR] {r.status_code}")
            else:
                print(f"   [DRY] Supprimer tous les mappings, ajouter {target_type}")

        elif corr['action'] == 'set_types':
            target_types = corr['target_types']
            target_type_ids = [types_by_code.get(t) for t in target_types if types_by_code.get(t)]

            if len(target_type_ids) != len(target_types):
                print(f"   [ERROR] Types inconnus dans {target_types}")
                stats['errors'] += 1
                continue

            if not dry_run:
                # Supprimer tous les mappings existants
                r = requests.delete(
                    f"{SUPABASE_URL}/rest/v1/product_type_mapping?product_id=eq.{pid}",
                    headers=SUPABASE_HEADERS
                )
                if r.status_code in [200, 204]:
                    stats['deleted'] += 1

                # Ajouter les nouveaux types
                for i, (type_code, type_id) in enumerate(zip(target_types, target_type_ids)):
                    r = requests.post(
                        f"{SUPABASE_URL}/rest/v1/product_type_mapping",
                        headers=SUPABASE_HEADERS,
                        json={
                            'product_id': pid,
                            'type_id': type_id,
                            'is_primary': (i == 0)  # Premier = primary
                        }
                    )
                    if r.status_code in [200, 201]:
                        stats['added'] += 1
                    else:
                        stats['errors'] += 1

                print(f"   [OK] -> {' + '.join(target_types)}")
            else:
                print(f"   [DRY] Supprimer tous, ajouter {' + '.join(target_types)}")

    print("\n" + "-" * 80)
    print(f"[STATS] Supprimés: {stats['deleted']}, Ajoutés: {stats['added']}, Erreurs: {stats['errors']}")

    return stats


def main():
    import argparse

    parser = argparse.ArgumentParser(description='Optimiser les multi-types')
    parser.add_argument('--dry-run', action='store_true', default=True,
                        help='Afficher les modifications sans les appliquer (défaut)')
    parser.add_argument('--apply', action='store_true',
                        help='Appliquer réellement les modifications')
    parser.add_argument('--analyze-only', action='store_true',
                        help='Analyser uniquement sans proposer de corrections')

    args = parser.parse_args()

    # Charger les données
    types_by_code, types_by_id, products, products_by_name, mappings = load_data()

    # Analyser les problèmes
    problems = analyze_problems(products, mappings, types_by_id)

    if args.analyze_only:
        return

    # Générer les corrections
    corrections = generate_corrections(products_by_name, mappings, types_by_code, types_by_id)

    print(f"\n[INFO] {len(corrections)} corrections générées")

    # Appliquer (ou dry run)
    dry_run = not args.apply
    apply_corrections(corrections, types_by_code, dry_run=dry_run)

    if dry_run:
        print("\n" + "=" * 80)
        print("[INFO] Mode DRY RUN - aucune modification appliquée")
        print("       Utilisez --apply pour appliquer les modifications")
        print("=" * 80)


if __name__ == "__main__":
    main()
