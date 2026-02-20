#!/usr/bin/env python3
"""
SAFESCORING.IO - Unified Evaluation Pipeline
=============================================
Script unifié qui orchestre les 5 étapes d'évaluation:
1. Type Mapping     -> products.type_id
2. Applicability    -> norm_applicability (Type x Norm)
3. Evaluation       -> evaluations (Product x Norm)
4. Score Calculation-> product_scores
5. Verification     -> Vérification des résultats

Usage:
    python run_unified_eval.py                    # Analyse état + propose actions
    python run_unified_eval.py --step=1           # Étape 1: Type mapping
    python run_unified_eval.py --step=2           # Étape 2: Applicability
    python run_unified_eval.py --step=3           # Étape 3: Evaluation
    python run_unified_eval.py --step=4           # Étape 4: Scores
    python run_unified_eval.py --step=5           # Étape 5: Verification
    python run_unified_eval.py --all              # Toutes les étapes
    python run_unified_eval.py --product=ledger   # Évaluer un produit spécifique

Auteur: SafeScoring.io
"""

import os
import sys
import argparse
import time
from pathlib import Path
from datetime import datetime

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / 'src'))

from dotenv import load_dotenv
load_dotenv()

from src.core.config import SUPABASE_URL, get_supabase_headers
import requests

# Constants
HEADERS = get_supabase_headers()


def print_header(title):
    """Print a formatted header."""
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)


def print_status(name, current, expected=None, icon="📊"):
    """Print status with optional comparison."""
    if expected:
        pct = (current / expected * 100) if expected > 0 else 0
        status = "✅" if pct >= 90 else "⚠️" if pct >= 50 else "❌"
        print(f"  {icon} {name}: {current:,}/{expected:,} ({pct:.1f}%) {status}")
    else:
        print(f"  {icon} {name}: {current:,}")


def get_count(table, filter_query="", pk_column="id"):
    """Get count from a Supabase table."""
    url = f"{SUPABASE_URL}/rest/v1/{table}?select={pk_column}{filter_query}"
    headers = {**HEADERS, 'Prefer': 'count=exact'}
    # Use GET with limit=1 instead of HEAD for better compatibility
    r = requests.get(url + "&limit=1", headers=headers)
    if r.status_code in [200, 206]:  # 206 = Partial Content (pagination)
        content_range = r.headers.get('content-range', '0-0/0')
        return int(content_range.split('/')[-1])
    return 0


def analyze_state():
    """Analyze current database state."""
    print_header("ANALYSE DE L'ÉTAT ACTUEL")

    # Get counts
    products = get_count('products')
    products_with_type = get_count('products', '&type_id=not.is.null')
    types = get_count('product_types')
    types_safe = get_count('product_types', '&is_safe_applicable=eq.true')  # Only types managing funds
    norms = get_count('norms')
    applicability = get_count('norm_applicability', pk_column='norm_id')  # No id column
    evaluations = get_count('evaluations')

    # Expected counts - only for types with is_safe_applicable=True
    expected_applicability = types_safe * norms
    expected_evaluations = products * 100  # ~100 norms per product on average

    print("\n  📦 DONNÉES DE BASE:")
    print_status("Produits", products, icon="📦")
    print_status("Produits avec type", products_with_type, products, icon="🏷️")
    print_status("Types de produits", types, icon="📁")
    print(f"  💰 Types gérant des fonds: {types_safe} (is_safe_applicable)")
    print_status("Normes", norms, icon="📋")

    print("\n  🔗 MATRICES:")
    print_status("Règles applicabilité", applicability, expected_applicability, icon="🔗")
    print_status("Évaluations", evaluations, icon="📝")

    # Determine what needs to be done
    needs = []
    if products_with_type < products * 0.9:
        needs.append(("1", "Type Mapping", f"{products - products_with_type} produits sans type"))
    if applicability < expected_applicability * 0.9:
        needs.append(("2", "Applicability", f"{expected_applicability - applicability:,} règles manquantes"))
    if evaluations < products * 50:  # At least 50 evals per product
        needs.append(("3", "Evaluation", f"~{products * 100 - evaluations:,} évaluations à faire"))

    if needs:
        print("\n  🔧 ACTIONS RECOMMANDÉES:")
        for step, name, reason in needs:
            print(f"     → Étape {step}: {name} ({reason})")
    else:
        print("\n  ✅ Toutes les données sont à jour!")

    return {
        'products': products,
        'products_with_type': products_with_type,
        'types': types,
        'norms': norms,
        'applicability': applicability,
        'evaluations': evaluations,
        'needs': needs
    }


def step_1_type_mapping(limit=None):
    """Step 1: Assign product types based on name matching with database keywords."""
    print_header("ÉTAPE 1: TYPE MAPPING")

    # Get products without type
    url = f"{SUPABASE_URL}/rest/v1/products?type_id=is.null&select=id,name,slug&limit={limit or 1000}"
    r = requests.get(url, headers=HEADERS)
    products = r.json() if r.status_code == 200 else []

    print(f"  📦 {len(products)} produits sans type à traiter")

    if not products:
        print("  ✅ Tous les produits ont un type!")
        return

    # Get product types with code and keywords from database
    url = f"{SUPABASE_URL}/rest/v1/product_types?select=id,code,name,keywords"
    r = requests.get(url, headers=HEADERS)
    db_types = r.json() if r.status_code == 200 else []

    # Build type lookup: code -> (id, keywords)
    type_lookup = {}
    for t in db_types:
        code = t.get('code', '')
        keywords = t.get('keywords', []) or []
        type_lookup[code] = {'id': t['id'], 'name': t['name'], 'keywords': [kw.lower() for kw in keywords]}

    print(f"  📁 {len(type_lookup)} types disponibles")

    # Enhanced manual mappings for specific products (high priority)
    # Format: product_name_substring -> type_code
    manual_mappings = {
        # Hardware Wallets Cold (code: HW Cold, id: 1)
        'ledger': 'HW Cold', 'trezor': 'HW Cold', 'coldcard': 'HW Cold',
        'bitbox': 'HW Cold', 'keystone': 'HW Cold', 'foundation passport': 'HW Cold',
        'ngrave': 'HW Cold', 'jade': 'HW Cold', 'blockstream jade': 'HW Cold',
        'archos safe-t': 'HW Cold', 'cobo vault': 'HW Cold', 'ballet': 'HW Cold',
        'tangem': 'HW Cold', "d'cent": 'HW Cold', 'dcent': 'HW Cold', 'secux': 'HW Cold',
        'ellipal titan': 'HW Cold', 'coolwallet': 'HW Cold', 'keepkey': 'HW Cold',
        'arculus': 'HW Cold', 'gridplus': 'HW Cold', 'lattice1': 'HW Cold',
        'opendime': 'HW Cold', 'onekey': 'HW Cold', 'cypherock': 'HW Cold',
        'prokey': 'HW Cold', 'hashwallet': 'HW Cold', 'krux': 'HW Cold',
        'seedsigner': 'HW Cold', 'satochip': 'HW Cold', 'coinkite': 'HW Cold',
        'satscard': 'HW Cold', 'tapsigner': 'HW Cold', 'bc vault': 'HW Cold',
        'carbon wallet': 'HW Cold',

        # Metal Backups (code: Bkp Physical, id: 9)
        'cryptosteel': 'Bkp Physical', 'billfodl': 'Bkp Physical', 'blockplate': 'Bkp Physical',
        'cryptotag': 'Bkp Physical', 'coldti': 'Bkp Physical', 'coinplate': 'Bkp Physical',
        'hodlinox': 'Bkp Physical', 'cryptowire': 'Bkp Physical', 'bitplates': 'Bkp Physical',
        'seedor': 'Bkp Physical', 'steelwallet': 'Bkp Physical', 'steeldisk': 'Bkp Physical',
        'seedplate': 'Bkp Physical', 'seed phrase steel': 'Bkp Physical',
        'coldbit steel': 'Bkp Physical', 'hodlr swiss': 'Bkp Physical', 'simbit': 'Bkp Physical',
        'safu ninja': 'Bkp Physical', 'ellipal mnemonic': 'Bkp Physical',
        'material bitcoin': 'Bkp Physical', 'seedxor': 'Bkp Physical',

        # Crypto Cards Custodial (code: Card, id: 38)
        'binance card': 'Card', 'crypto.com card': 'Card', 'coinbase card': 'Card',
        'bitpay card': 'Card', '1inch card': 'Card', 'baanx': 'Card', 'bleap card': 'Card',
        'blockfi card': 'Card', 'coca card': 'Card', 'cryptopay card': 'Card',
        'fold card': 'Card', 'paycent card': 'Card', 'shakepay card': 'Card',
        'spectrocoin card': 'Card', 'swipe card': 'Card', 'tenx card': 'Card',
        'trastra card': 'Card', 'wirex card': 'Card', 'etoro card': 'Card',
        'gemini card': 'Card', 'nexo card': 'Card', 'mercuryo card': 'Card',

        # CEX (code: CEX, id: 10)
        'binance': 'CEX', 'coinbase exchange': 'CEX', 'kraken': 'CEX', 'bybit': 'CEX',
        'okx': 'CEX', 'kucoin': 'CEX', 'bitfinex': 'CEX', 'gemini': 'CEX',
        'bitstamp': 'CEX', 'bitpanda': 'CEX', 'crypto.com exchange': 'CEX',
        'upbit': 'CEX', 'gate.io': 'CEX', 'huobi': 'CEX', 'mexc': 'CEX',
        'bithumb': 'CEX', 'robinhood crypto': 'CEX', 'etoro': 'CEX', 'swissborg': 'CEX',

        # DEX Aggregators (code: DEX Agg, id: 12)
        '1inch': 'DEX Agg', 'paraswap': 'DEX Agg', 'matcha': 'DEX Agg', 'jupiter': 'DEX Agg',

        # DEX / AMM (code: DEX, id: 11)
        'uniswap': 'DEX', 'sushiswap': 'DEX', 'curve': 'DEX', 'balancer': 'DEX',
        'pancakeswap': 'DEX', 'quickswap': 'DEX', 'trader joe': 'DEX',
        'raydium': 'DEX', 'orca': 'DEX', 'velodrome': 'DEX', 'aerodrome': 'DEX',
        'dodo': 'DEX', 'osmosis': 'DEX', 'astroport': 'DEX',

        # Lending (code: Lending, id: 16)
        'aave': 'Lending', 'compound': 'Lending', 'benqi': 'Lending', 'morpho': 'Lending',
        'venus': 'Lending', 'radiant': 'Lending', 'spark': 'Lending',
        'euler': 'Lending', 'fraxlend': 'Lending', 'notional': 'Lending',
        'abracadabra': 'Lending',

        # Liquid Staking (code: Liq Staking, id: 18)
        'lido': 'Liq Staking', 'rocket pool': 'Liq Staking', 'ankr staking': 'Liq Staking',
        'stakewise': 'Liq Staking', 'frax ether': 'Liq Staking', 'cbeth': 'Liq Staking',
        'mantle staked': 'Liq Staking', 'swell': 'Liq Staking',
        'jito': 'Liq Staking', 'marinade': 'Liq Staking', 'stader': 'Liq Staking',
        'bedrock': 'Liq Staking', 'solayer': 'Liq Staking',

        # Yield Aggregators (code: Yield, id: 17)
        'yearn': 'Yield', 'beefy': 'Yield', 'autofarm': 'Yield', 'convex': 'Yield',
        'harvest finance': 'Yield', 'pickle': 'Yield',
        'aura finance': 'Yield', 'sommelier': 'Yield', 'tokemak': 'Yield',

        # Bridges (code: Bridges, id: 20)
        'wormhole': 'Bridges', 'layerzero': 'Bridges', 'stargate': 'Bridges',
        'across protocol': 'Bridges', 'hop protocol': 'Bridges', 'celer': 'Bridges',
        'multichain': 'Bridges', 'synapse': 'Bridges', 'portal': 'Bridges',
        'axelar': 'Bridges', 'connext': 'Bridges', 'orbiter': 'Bridges', 'debridge': 'Bridges',

        # Custody (code: Custody, id: 41)
        'fireblocks': 'Custody', 'bitgo': 'Custody', 'anchorage': 'Custody',
        'copper clearloop': 'Custody', 'coinbase prime': 'Custody', 'gemini custody': 'Custody',
        'hex trust': 'Custody', 'copper': 'Custody', 'propine': 'Custody',
        'cobo custody': 'Custody', 'liminal custody': 'Custody',

        # MPC Wallets (code: MPC Wallet, id: 4)
        'zengo': 'MPC Wallet', 'qredo': 'MPC Wallet', 'fordefi': 'MPC Wallet',
        'liminal': 'MPC Wallet', 'dfns': 'MPC Wallet',

        # MultiSig (code: MultiSig, id: 5)
        'safe': 'MultiSig', 'gnosis safe': 'MultiSig', 'casa': 'MultiSig', 'nunchuk': 'MultiSig',

        # Smart Wallets (code: Smart Wallet, id: 7)
        'argent': 'Smart Wallet', 'sequence': 'Smart Wallet', 'candide': 'Smart Wallet',
        'ambire': 'Smart Wallet', 'soul wallet': 'Smart Wallet', 'obvious': 'Smart Wallet',

        # Account Abstraction (code: AA, id: 55)
        'biconomy': 'AA', 'zerodev': 'AA', 'pimlico': 'AA',

        # Browser Extension Wallets (code: SW Browser, id: 2)
        'metamask': 'SW Browser', 'rabby': 'SW Browser', 'rainbow': 'SW Browser',
        'phantom': 'SW Browser', 'coinbase wallet': 'SW Browser', 'frame': 'SW Browser',
        'solflare': 'SW Browser', 'backpack': 'SW Browser', 'keplr': 'SW Browser',
        'temple wallet': 'SW Browser', 'petra': 'SW Browser', 'martian': 'SW Browser',

        # Mobile Wallets (code: SW Mobile, id: 3)
        'trust wallet': 'SW Mobile', 'exodus': 'SW Mobile', 'atomic wallet': 'SW Mobile',
        'imtoken': 'SW Mobile', 'pillar': 'SW Mobile', 'loopring wallet': 'SW Mobile',
        'zerion': 'SW Mobile', 'blockstream green': 'SW Mobile', 'breez': 'SW Mobile',
        'muun': 'SW Mobile', 'phoenix wallet': 'SW Mobile', 'zeus wallet': 'SW Mobile',
        'coin98': 'SW Mobile', 'tokenpocket': 'SW Mobile', 'math wallet': 'SW Mobile',
        'coinomi': 'SW Mobile', 'guarda': 'SW Mobile', 'edge wallet': 'SW Mobile',
        'enjin wallet': 'SW Mobile', 'unstoppable': 'SW Mobile', 'liana': 'SW Mobile',

        # Desktop Wallets (code: SW Desktop, id: 6)
        'electrum': 'SW Desktop', 'sparrow': 'SW Desktop', 'wasabi': 'SW Desktop',
        'bluewallet': 'SW Desktop', 'specter': 'SW Desktop', 'bitcoin core': 'SW Desktop',

        # Crypto Banks (code: Crypto Bank, id: 40)
        'amina bank': 'Crypto Bank', 'seba bank': 'Crypto Bank', 'sygnum': 'Crypto Bank',
        'xapo bank': 'Crypto Bank', 'meria': 'Crypto Bank',

        # CeFi Lending (code: CeFi Lending, id: 42)
        'nexo': 'CeFi Lending', 'youhodler': 'CeFi Lending', 'wirex': 'CeFi Lending',

        # Fiat Gateway / Neobank (code: Fiat Gateway, id: 58)
        'n26': 'Fiat Gateway', 'revolut': 'Fiat Gateway',

        # Perpetual DEX (code: Perps, id: 29)
        'gmx': 'Perps', 'dydx': 'Perps', 'hyperliquid': 'Perps', 'kwenta': 'Perps',
        'gains network': 'Perps', 'vertex': 'Perps', 'aevo': 'Perps',

        # Options DEX (code: Options, id: 30)
        'hegic': 'Options', 'dopex': 'Options', 'lyra': 'Options',

        # NFT (code: NFT Market, id: 56)
        'opensea': 'NFT Market', 'blur': 'NFT Market', 'looksrare': 'NFT Market',
        'rarible': 'NFT Market', 'foundation': 'NFT Market', 'blockbar': 'NFT Market',
        'bolero': 'NFT Market',

        # Restaking (code: Restaking, id: 25)
        'eigenlayer': 'Restaking', 'ether.fi': 'Restaking', 'kelp': 'Restaking',
        'renzo': 'Restaking', 'puffer': 'Restaking',

        # Insurance (code: Insurance, id: 22)
        'nexus mutual': 'Insurance', 'insurace': 'Insurance',

        # Cross-chain Aggregator (code: CrossAgg, id: 27)
        'li.fi': 'CrossAgg', 'socket': 'CrossAgg', 'squid': 'CrossAgg', 'jumper': 'CrossAgg',

        # Research & Analytics (code: Research, id: 53)
        'nansen': 'Research', 'arkham': 'Research', 'token terminal': 'Research',
        'coingecko': 'Research', 'coinmarketcap': 'Research', 'dune analytics': 'Research',
        'defillama': 'Research', 'messari': 'Research', 'debank': 'Research',

        # RWA (code: RWA, id: 35)
        'realt': 'RWA', 'ondo': 'RWA',

        # Streaming Payments (code: Streaming, id: 26)
        'llamapay': 'Streaming', 'sablier': 'Streaming', 'superfluid': 'Streaming',

        # Derivatives / Yield (code: Derivatives, id: 19)
        'pendle': 'Derivatives',

        # Security 2FA (code: Security, id: 77)
        'yubikey': 'Security',
    }

    updated = 0
    not_found = []

    for product in products:
        name_lower = product['name'].lower()
        slug_lower = product.get('slug', '').lower()
        assigned_type_id = None
        assigned_type_name = None

        # 1. Try manual mappings first (most specific)
        for keyword, type_code in manual_mappings.items():
            if keyword in name_lower or keyword in slug_lower:
                if type_code in type_lookup:
                    assigned_type_id = type_lookup[type_code]['id']
                    assigned_type_name = type_lookup[type_code]['name']
                    break

        # 2. Fallback: try database keywords
        if not assigned_type_id:
            for code, type_info in type_lookup.items():
                for kw in type_info['keywords']:
                    if kw in name_lower or kw in slug_lower:
                        assigned_type_id = type_info['id']
                        assigned_type_name = type_info['name']
                        break
                if assigned_type_id:
                    break

        if assigned_type_id:
            # Update product
            url = f"{SUPABASE_URL}/rest/v1/products?id=eq.{product['id']}"
            r = requests.patch(url, headers=HEADERS, json={'type_id': assigned_type_id})
            if r.status_code in [200, 204]:
                updated += 1
                print(f"    ✓ {product['name']:<35} → {assigned_type_name}")
        else:
            not_found.append(product['name'])

    print(f"\n  📊 {updated}/{len(products)} produits mis à jour")

    if not_found and len(not_found) <= 30:
        print(f"\n  ⚠️ Produits non mappés ({len(not_found)}):")
        for name in not_found:
            print(f"       - {name}")


def step_2_applicability():
    """Step 2: Generate norm applicability rules."""
    print_header("ÉTAPE 2: NORM APPLICABILITY")

    from src.core.applicability_generator import ApplicabilityGenerator

    generator = ApplicabilityGenerator()
    # Use 1 worker to avoid race conditions with rate-limited APIs
    stats = generator.run(max_workers=1, parallel=False)

    if isinstance(stats, dict):
        print(f"  ✅ Généré {stats.get('created', stats.get('total', 0)):,} règles d'applicabilité")
    else:
        print(f"  ✅ Génération terminée")


def step_3_evaluation(product_name=None, limit=None):
    """Step 3: Evaluate products against norms."""
    print_header("ÉTAPE 3: ÉVALUATION PRODUITS")

    from src.core.smart_evaluator import SmartEvaluator

    evaluator = SmartEvaluator()

    if product_name:
        # Single product
        url = f"{SUPABASE_URL}/rest/v1/products?name=ilike.*{product_name}*&select=id,name,slug,url,type_id&limit=1"
        r = requests.get(url, headers=HEADERS)
        products = r.json() if r.status_code == 200 else []
    else:
        # Products needing evaluation (no evaluations yet)
        url = f"{SUPABASE_URL}/rest/v1/products?select=id,name,slug,url,type_id&order=id&limit={limit or 10}"
        r = requests.get(url, headers=HEADERS)
        products = r.json() if r.status_code == 200 else []

    print(f"  📦 {len(products)} produits à évaluer")

    for i, product in enumerate(products):
        print(f"\n  [{i+1}/{len(products)}] {product['name']}...")
        try:
            result = evaluator.evaluate_product(product['id'])
            if result:
                scores = result.get('scores', {})
                print(f"       S:{scores.get('S', 0):.0f} A:{scores.get('A', 0):.0f} F:{scores.get('F', 0):.0f} E:{scores.get('E', 0):.0f} → SAFE:{scores.get('SAFE', 0):.0f}%")
        except Exception as e:
            print(f"       ❌ Erreur: {e}")

        if i < len(products) - 1:
            time.sleep(1)  # Rate limiting


def step_4_scores():
    """Step 4: Calculate and save scores."""
    print_header("ÉTAPE 4: CALCUL DES SCORES")

    from src.core.scoring_engine import ScoringEngine

    engine = ScoringEngine()
    stats = engine.calculate_all_scores()

    print(f"  ✅ Calculé scores pour {stats.get('products_scored', 0)} produits")


def step_5_verification():
    """Step 5: Verify results."""
    print_header("ÉTAPE 5: VÉRIFICATION")

    # Get sample scores
    url = f"{SUPABASE_URL}/rest/v1/products?select=id,name,score_s,score_a,score_f,score_e,score_safe&score_safe=not.is.null&order=score_safe.desc&limit=20"
    r = requests.get(url, headers=HEADERS)
    products = r.json() if r.status_code == 200 else []

    print(f"\n  🏆 TOP 20 SCORES SAFE:")
    print(f"  {'Produit':<30} | S    | A    | F    | E    | SAFE")
    print(f"  {'-'*30}-+------+------+------+------+------")

    for p in products:
        name = p['name'][:30]
        s = p.get('score_s', 0) or 0
        a = p.get('score_a', 0) or 0
        f = p.get('score_f', 0) or 0
        e = p.get('score_e', 0) or 0
        safe = p.get('score_safe', 0) or 0
        print(f"  {name:<30} | {s:4.0f} | {a:4.0f} | {f:4.0f} | {e:4.0f} | {safe:4.0f}%")

    # Check for anomalies
    print("\n  🔍 VÉRIFICATION DES ANOMALIES:")

    # Products with 100% score (suspicious)
    url = f"{SUPABASE_URL}/rest/v1/products?score_safe=eq.100&select=id,name"
    r = requests.get(url, headers=HEADERS)
    perfect = r.json() if r.status_code == 200 else []
    if perfect:
        print(f"    ⚠️ {len(perfect)} produits avec 100% (vérifier)")
    else:
        print(f"    ✅ Pas de scores parfaits suspects")

    # Products with 0% score (suspicious)
    url = f"{SUPABASE_URL}/rest/v1/products?score_safe=eq.0&select=id,name"
    r = requests.get(url, headers=HEADERS)
    zeros = r.json() if r.status_code == 200 else []
    if zeros:
        print(f"    ⚠️ {len(zeros)} produits avec 0% (vérifier)")
    else:
        print(f"    ✅ Pas de scores nuls suspects")


def main():
    parser = argparse.ArgumentParser(description='SafeScoring Unified Pipeline')
    parser.add_argument('--step', type=int, choices=[1, 2, 3, 4, 5], help='Run specific step')
    parser.add_argument('--all', action='store_true', help='Run all steps')
    parser.add_argument('--product', type=str, help='Evaluate specific product')
    parser.add_argument('--limit', type=int, default=10, help='Limit number of items')

    args = parser.parse_args()

    print_header("SAFESCORING.IO - UNIFIED PIPELINE")
    print(f"  📅 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    # Analyze state first
    state = analyze_state()

    if args.step == 1 or args.all:
        step_1_type_mapping(args.limit)

    if args.step == 2 or args.all:
        step_2_applicability()

    if args.step == 3 or args.all or args.product:
        step_3_evaluation(args.product, args.limit)

    if args.step == 4 or args.all:
        step_4_scores()

    if args.step == 5 or args.all:
        step_5_verification()

    if not any([args.step, args.all, args.product]):
        print("\n  💡 Utilisez --step=N ou --all pour exécuter des étapes")
        print("     Exemple: python run_unified_eval.py --step=3 --limit=5")


if __name__ == '__main__':
    main()
