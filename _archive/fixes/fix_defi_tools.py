#!/usr/bin/env python3
"""Corrige les descriptions des types DeFi Tools et autres"""
import requests

config = {}
with open('config/env_template_free.txt', 'r', encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            key, value = line.split('=', 1)
            config[key.strip()] = value.strip()

SUPABASE_URL = config.get('NEXT_PUBLIC_SUPABASE_URL', '')
SUPABASE_KEY = config.get('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
}

# Corrections des descriptions pour être plus précises sur la gestion des fonds

updates = {
    'DeFi Tools': {
        'description': 'Outils DeFi: portfolio trackers, analytics, agrégateurs de swaps. Se CONNECTENT aux wallets pour afficher positions, exécuter transactions, gérer staking. Interface entre utilisateur et protocoles DeFi. Accès aux données sensibles.',
        'advantages': '• Multi-chain portfolio view\n• Swap aggregation (1inch, Paraswap)\n• Gas optimization\n• DeFi positions management\n• Transaction execution\n• Staking/unstaking interface',
        'disadvantages': '• Connexion wallet requise\n• Risque phishing interface\n• Permissions wallet étendues\n• Dépend APIs tierces\n• Smart contract interactions'
    },
    'Lending': {
        'description': 'Protocole de prêt/emprunt DeFi. Dépôt de collatéral crypto pour emprunter. Taux algorithmiques. Liquidation automatique si collatéral insuffisant. GESTION DE FONDS RÉELS déposés dans smart contracts.',
        'advantages': '• Non-custodial lending\n• Collatéral over-collateralized\n• Taux variables/fixes\n• Governance token rewards\n• Composable DeFi\n• Flash loans',
        'disadvantages': '• Risque liquidation\n• Oracle manipulation risk\n• Smart contract vulnerabilities\n• Impermanent loss\n• Gas fees élevés'
    },
    'DEX': {
        'description': 'Plateforme d\'échange décentralisée. Trading crypto via smart contracts on-chain. AMM ou order book. Non-custodial mais FONDS DÉPOSÉS dans pools de liquidité. Pas de KYC.',
        'advantages': '• Non-custodial trading\n• Smart contracts audités\n• AMM/Order book\n• Permissionless\n• Liquidity mining rewards\n• No KYC',
        'disadvantages': '• Gas fees variables\n• Slippage sur gros trades\n• Smart contract risk\n• Impermanent loss pour LPs\n• Front-running MEV'
    },
    'Yield': {
        'description': 'Agrégateur de rendement DeFi. Optimise yield farming automatiquement. Auto-compound des rewards. Vaults stratégiques. GESTION AUTOMATISÉE DE FONDS déposés.',
        'advantages': '• Auto-compound rewards\n• Multi-stratégies optimisées\n• Gas optimization\n• Vaults diversifiés\n• Higher APY\n• Set and forget',
        'disadvantages': '• Smart contract risk (multiple layers)\n• Stratégie parfois opaque\n• Performance fees\n• Dépend protocoles sous-jacents\n• Risque de hack composé'
    },
    'Liq Staking': {
        'description': 'Staking avec token liquide. Stake ETH/SOL → reçoit stETH/mSOL. Token REPRÉSENTE LES FONDS STAKÉS, utilisable en DeFi. Rewards automatiques.',
        'advantages': '• Token liquide tradeable\n• DeFi composable (collateral)\n• Rewards automatiques\n• Slashing protection\n• No lock-up period',
        'disadvantages': '• Depeg risk vs underlying\n• Centralisation risque (Lido 30%+)\n• Smart contract risk\n• Validator slashing\n• Redemption delays'
    },
    'Bridges': {
        'description': 'Ponts inter-chaînes. Transfert d\'assets entre blockchains. Lock sur chaîne source, mint sur destination. GESTION DE FONDS VERROUILLÉS. CIBLE #1 des hacks crypto (>$2B volés).',
        'advantages': '• Cross-chain transfers\n• Multi-chain liquidity\n• Atomic swaps\n• Fast finality options\n• Chain abstraction',
        'disadvantages': '• CIBLE HACKS #1 crypto\n• Trust assumptions variables\n• Délais de confirmation\n• Frais de bridge\n• Risque de perte totale'
    },
    'Derivatives': {
        'description': 'Produits dérivés on-chain. Futures, options, perpetuals décentralisés. Trading avec LEVIER sur fonds déposés. Liquidation automatique.',
        'advantages': '• Levier x1-100\n• Non-custodial\n• Prix via oracles\n• Funding rates transparents\n• 24/7 trading',
        'disadvantages': '• Risque liquidation rapide\n• Oracle manipulation\n• Volatilité extrême\n• Funding rates coûteux\n• Complexité trading'
    }
}

print("🔧 Correction des descriptions DeFi...")

for code, data in updates.items():
    r = requests.patch(
        f"{SUPABASE_URL}/rest/v1/product_types?code=eq.{code}",
        headers=headers,
        json=data
    )
    status = "✅" if r.status_code in [200, 204] else f"❌ {r.status_code}"
    print(f"   {code}: {status}")

print("\n✅ Descriptions mises à jour. Relancez l'analyse d'applicabilité.")
