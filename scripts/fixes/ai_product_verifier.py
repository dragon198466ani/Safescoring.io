#!/usr/bin/env python3
"""
SAFESCORING.IO - AI Product Type Verifier
Utilise l'IA (Mistral/Gemini) pour vérifier les types de produits via web search.
"""

import requests
import sys
import json
import os
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent / 'src'))
from core.config import SUPABASE_URL, SUPABASE_HEADERS

# Configuration API
MISTRAL_API_KEY = os.getenv('MISTRAL_API_KEY')
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')

# Types disponibles dans SafeScoring - synchronisé avec ai_strategy.py
# NOTE: HW Hot removed - not standard terminology (HW = cold by definition)
AVAILABLE_TYPES = [
    # HARDWARE
    "HW Cold", "HW NFC Signer",
    # SOFTWARE WALLETS
    "SW Browser", "SW Mobile", "SW Desktop", "Wallet MultiPlatform",
    "Smart Wallet", "MPC Wallet", "MultiSig",
    # EXCHANGES
    "CEX", "DEX", "DEX Agg", "AMM", "Atomic Swap", "OTC", "NFT Market",
    # DEFI PROTOCOLS
    "Lending", "CeFi Lending", "Yield", "Liq Staking", "Restaking",
    "Derivatives", "Options", "Perps", "Synthetics",
    "Bridges", "CrossAgg", "Index", "Insurance", "Intent",
    "Launchpad", "Locker", "Prediction", "Prime", "Streaming", "Vesting", "Wrapped",
    # FINANCE
    "Card", "Card Non-Cust", "Neobank", "Crypto Bank", "Fiat Gateway", "Payment", "Treasury",
    # BACKUP
    "Bkp Physical", "Bkp Digital", "Seed Splitter",
    # CUSTODY
    "Custody", "Custody MPC", "Custody MultiSig", "Enterprise Custody",
    # PRIVACY
    "Privacy", "Private DeFi",
    # INFRASTRUCTURE
    "AA", "Interop", "L2", "Validator",
    # CONSUMER
    "Fan Token", "GameFi", "Metaverse", "NFT Tools",
    # OTHER
    "DeFi Tools", "RWA", "Stablecoin", "Inheritance", "Protocol", "Settlement", "Airgap Signer",
    # WEB3 INFRASTRUCTURE & SERVICES
    "AI Agent", "Attestation", "Compute", "DAO", "Data Indexer", "Dev Tools", "Explorer",
    "Identity", "MEV", "Messaging", "Mining", "Node RPC", "Oracle", "Quest", "Research",
    "Security", "SocialFi", "Storage", "Tax", "dVPN"
]

TYPE_DEFINITIONS = """
Types disponibles et leurs définitions (synchronisé avec ai_strategy.py):

HARDWARE:
- HW Cold: Hardware wallet (Ledger, Trezor, Coldcard) - ALL HW are cold by definition
- HW NFC Signer: Carte NFC de signature (TAPSIGNER, Status Keycard)

SOFTWARE WALLETS:
- SW Browser: Extension navigateur uniquement (Rabby browser-only)
- SW Mobile: App mobile uniquement (Phoenix, Breez)
- SW Desktop: Application desktop uniquement
- Wallet MultiPlatform: Wallet multi-plateformes (MetaMask, Trust Wallet)
- Smart Wallet: Account abstraction wallets (Argent, Sequence)
- MPC Wallet: Multi-Party Computation wallets (Zengo, Coinbase)
- MultiSig: Multi-signature wallets (Safe, Casa, Nunchuk)

EXCHANGES:
- CEX: Centralized exchange (Binance, Coinbase, Kraken)
- DEX: Decentralized exchange (Uniswap, SushiSwap)
- DEX Agg: DEX aggregators (1inch, Paraswap)
- AMM: Automated Market Makers (Curve, Balancer)
- Atomic Swap: Cross-chain atomic swaps (THORChain)
- OTC: Over-the-counter/P2P trading
- NFT Market: NFT marketplaces (OpenSea, Blur)

DEFI PROTOCOLS:
- Lending: DeFi lending (Aave, Compound)
- CeFi Lending: Centralized lending (Nexo, BlockFi - regulatory focus)
- Yield: Yield aggregator/optimizer (Yearn, Beefy)
- Liq Staking: Liquid staking (Lido, Rocket Pool)
- Restaking: Restaking protocols (EigenLayer)
- Derivatives: General derivatives
- Options: Options protocols (Lyra, Dopex)
- Perps: Perpetual futures (dYdX, GMX)
- Synthetics: Synthetic assets (Synthetix)
- Bridges: Cross-chain bridges (Wormhole, LayerZero)
- CrossAgg: Cross-chain aggregators (Li.Fi)
- Index: Index tokens (Index Coop)
- Insurance: DeFi insurance (Nexus Mutual)
- Intent: Intent-based protocols (CoW Protocol)
- Launchpad: Token launchpads
- Locker: Token lockers (Team.finance)
- Prediction: Prediction markets (Polymarket)
- Prime: Prime brokerage
- Streaming: Payment streaming (Superfluid)
- Vesting: Token vesting
- Wrapped: Wrapped tokens (WBTC, WETH)
- DeFi Tools: Dashboards, portfolio trackers (DeBank, Zapper)

FINANCE:
- Card: Carte crypto CUSTODIALE (Binance Card)
- Card Non-Cust: Carte crypto NON-CUSTODIALE (Gnosis Pay)
- Neobank: Banque fintech (N26, Revolut)
- Crypto Bank: Banque crypto régulée (Seba, Sygnum)
- Fiat Gateway: Fiat on/off ramps (MoonPay, Ramp)
- Payment: Payment services (BitPay)
- Treasury: Treasury management (Parcel, Coinshift)

BACKUP:
- Bkp Physical: Backup physique métal/steel (Cryptosteel, Billfodl)
- Bkp Digital: Backup digital/cloud (Ledger Recover)
- Seed Splitter: Shamir/SSS backup (SeedXOR, Cypherock)

CUSTODY:
- Custody: Generic custody service
- Custody MPC: MPC custody (Fireblocks, BitGo)
- Custody MultiSig: MultiSig custody (Unchained)
- Enterprise Custody: Enterprise-grade custody

PRIVACY:
- Privacy: Privacy protocols (Tornado Cash, Railgun)
- Private DeFi: Private DeFi (Aztec)

INFRASTRUCTURE:
- AA: Account Abstraction infrastructure
- Interop: Interoperability protocols
- L2: Layer 2 solutions (Arbitrum, Optimism)
- Validator: Validator services

CONSUMER:
- Fan Token: Fan tokens (Chiliz, Socios)
- GameFi: Gaming/play-to-earn (Axie Infinity)
- Metaverse: Metaverse platforms (Decentraland)
- NFT Tools: NFT analytics tools

OTHER:
- RWA: Real World Assets tokenization
- Stablecoin: Stablecoin issuers (Circle, Tether)
- Inheritance: Inheritance/timelock features (Liana)
- Protocol: Base protocols
- Settlement: Settlement infrastructure
- Airgap Signer: Airgapped signing tools

WEB3 INFRASTRUCTURE & SERVICES:
- AI Agent: AI agents for crypto trading/management
- Attestation: Attestation services for identity/credentials
- Compute: Decentralized compute networks (Akash, Render)
- DAO: DAO tooling and governance platforms
- Data Indexer: Blockchain data indexing (The Graph, Dune)
- Dev Tools: Developer tooling and SDKs
- Explorer: Blockchain explorers (Etherscan, Blockscout)
- Identity: Decentralized identity (ENS, Lens, Worldcoin)
- MEV: MEV protection/extraction services
- Messaging: Web3 messaging (XMTP, Push Protocol)
- Mining: Mining pools and services
- Node RPC: RPC node providers (Alchemy, Infura)
- Oracle: Oracle networks (Chainlink, Pyth)
- Quest: Quest/airdrop platforms (Galxe, Layer3)
- Research: Research and analytics platforms
- Security: Security audit and monitoring services
- SocialFi: Social finance (friend.tech, Farcaster)
- Storage: Decentralized storage (IPFS, Arweave, Filecoin)
- Tax: Crypto tax calculation services
- dVPN: Decentralized VPN services (Orchid, Mysterium)
"""


def call_mistral(prompt: str) -> str:
    """Appelle l'API Mistral"""
    if not MISTRAL_API_KEY:
        return None

    response = requests.post(
        "https://api.mistral.ai/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {MISTRAL_API_KEY}",
            "Content-Type": "application/json"
        },
        json={
            "model": "mistral-small-latest",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.1
        }
    )

    if response.status_code == 200:
        return response.json()["choices"][0]["message"]["content"]
    return None


def call_gemini(prompt: str) -> str:
    """Appelle l'API Gemini"""
    if not GEMINI_API_KEY:
        return None

    response = requests.post(
        f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}",
        headers={"Content-Type": "application/json"},
        json={
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.1}
        }
    )

    if response.status_code == 200:
        return response.json()["candidates"][0]["content"]["parts"][0]["text"]
    return None


def verify_product_with_ai(product_name: str, current_types: list) -> dict:
    """Vérifie un produit avec l'IA"""

    prompt = f"""Tu es un expert en crypto/blockchain. Analyse le produit "{product_name}" et détermine ses types corrects.

{TYPE_DEFINITIONS}

Types actuels assignés: {', '.join(current_types) if current_types else 'Aucun'}

INSTRUCTIONS:
1. Recherche ce que fait réellement "{product_name}"
2. Détermine les types appropriés (max 3)

Réponds UNIQUEMENT avec un JSON valide:
{{
    "product": "{product_name}",
    "description": "Description courte du produit",
    "recommended_types": ["Type1", "Type2"],
    "reasoning": "Explication",
    "changes": {{
        "add": ["types à ajouter"],
        "remove": ["types à supprimer"]
    }}
}}
"""

    # Try Mistral first, then Gemini
    response = call_mistral(prompt)
    if not response:
        response = call_gemini(prompt)

    if response:
        try:
            # Extract JSON from response
            start = response.find('{')
            end = response.rfind('}') + 1
            if start >= 0 and end > start:
                return json.loads(response[start:end])
        except json.JSONDecodeError:
            pass

    return None


def load_current_data():
    """Charge les données actuelles"""
    r = requests.get(f'{SUPABASE_URL}/rest/v1/product_types?select=id,code', headers=SUPABASE_HEADERS)
    types_by_id = {t['id']: t['code'] for t in r.json()}
    type_by_code = {t['code']: t['id'] for t in r.json()}

    r = requests.get(f'{SUPABASE_URL}/rest/v1/product_type_mapping?select=product_id,type_id', headers=SUPABASE_HEADERS)
    mappings = {}
    for m in r.json():
        pid = m['product_id']
        if pid not in mappings:
            mappings[pid] = []
        mappings[pid].append(types_by_id.get(m['type_id'], '?'))

    r = requests.get(f'{SUPABASE_URL}/rest/v1/products?select=id,name&order=name', headers=SUPABASE_HEADERS)
    products = r.json()

    return types_by_id, type_by_code, mappings, products


def main():
    import argparse

    parser = argparse.ArgumentParser(description='AI Product Type Verifier')
    parser.add_argument('--product', type=str, help='Vérifier un produit spécifique')
    parser.add_argument('--batch', type=int, default=10, help='Nombre de produits à vérifier')
    parser.add_argument('--start', type=int, default=0, help='Index de départ')
    parser.add_argument('--apply', action='store_true', help='Appliquer les corrections')
    args = parser.parse_args()

    print("\n" + "=" * 70)
    print("AI PRODUCT TYPE VERIFIER")
    print("=" * 70)

    if not MISTRAL_API_KEY and not GEMINI_API_KEY:
        print("\n⚠️  Aucune clé API trouvée!")
        print("Définissez MISTRAL_API_KEY ou GEMINI_API_KEY")
        return

    types_by_id, type_by_code, mappings, products = load_current_data()

    if args.product:
        # Vérifier un produit spécifique
        product = next((p for p in products if p['name'].lower() == args.product.lower()), None)
        if not product:
            print(f"Produit '{args.product}' non trouvé")
            return

        current_types = mappings.get(product['id'], [])
        print(f"\nVérification de: {product['name']}")
        print(f"Types actuels: {', '.join(current_types)}")

        result = verify_product_with_ai(product['name'], current_types)
        if result:
            print(f"\n{json.dumps(result, indent=2, ensure_ascii=False)}")
    else:
        # Vérifier un batch
        batch = products[args.start:args.start + args.batch]
        results = []

        for i, product in enumerate(batch):
            current_types = mappings.get(product['id'], [])
            print(f"\n[{i+1}/{len(batch)}] {product['name']}")
            print(f"  Types actuels: {', '.join(current_types)}")

            result = verify_product_with_ai(product['name'], current_types)
            if result:
                results.append(result)
                if result.get('changes', {}).get('add') or result.get('changes', {}).get('remove'):
                    print(f"  ⚠️  Changements suggérés:")
                    if result['changes'].get('add'):
                        print(f"     + {', '.join(result['changes']['add'])}")
                    if result['changes'].get('remove'):
                        print(f"     - {', '.join(result['changes']['remove'])}")
                else:
                    print(f"  ✓ OK")

            time.sleep(1)  # Rate limiting

        # Summary
        print("\n" + "=" * 70)
        print("RÉSUMÉ")
        print("=" * 70)
        changes_needed = [r for r in results if r.get('changes', {}).get('add') or r.get('changes', {}).get('remove')]
        print(f"Produits vérifiés: {len(results)}")
        print(f"Changements suggérés: {len(changes_needed)}")


if __name__ == "__main__":
    main()
