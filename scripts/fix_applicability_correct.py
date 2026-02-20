#!/usr/bin/env python3
"""
Corriger l'applicabilite avec les types non-redondants
et une logique appropriee par type de produit
"""
import requests
import re

# Use centralized config (no more hardcoded credentials!)
from config_helper import SUPABASE_URL, SUPABASE_KEY, get_supabase_headers

# =============================================================================
# TYPES CANONIQUES (sans redondance)
# =============================================================================
CANONICAL_TYPES = [
    # Storage/Wallets
    'HW_WALLET',        # Hardware wallet
    'SW_WALLET',        # Software wallet (inclut desktop, mobile, browser, AA)
    'MULTISIG',         # Multi-signature setup
    'CUSTODY',          # Custodial service
    'INHERITANCE',      # Inheritance solution
    'SEED_SPLITTER',    # Seed backup splitter
    'BKP_DIGITAL',      # Digital backup
    'BKP_PHYSICAL',     # Physical backup (steel, paper)

    # Trading
    'CEX',              # Centralized exchange
    'DEX',              # Decentralized exchange (AMM)
    'DEX_AGG',          # DEX aggregator
    'SWAP',             # Simple swap service
    'P2P',              # Peer-to-peer trading
    'OTC',              # Over-the-counter
    'PERP_DEX',         # Perpetual DEX
    'MEV',              # MEV protection
    'INTENT',           # Intent-based trading

    # Cross-chain
    'BRIDGE',           # Cross-chain bridge (inclut INTEROP, WRAPPED)
    'CROSS_AGG',        # Bridge aggregator
    'L2',               # Layer 2 solution

    # DeFi
    'DEFI',             # Generic DeFi (inclut DEFI_TOOLS)
    'LENDING',          # Lending protocol
    'YIELD',            # Yield aggregator (inclut VAULT)
    'STAKING',          # Staking service
    'LIQUID_STAKING',   # Liquid staking
    'LOCKER',           # Token locker
    'VESTING',          # Vesting contract
    'INDEX',            # Index protocol
    'SYNTHETICS',       # Synthetic assets

    # Markets
    'NFT_MARKET',       # NFT marketplace
    'LAUNCHPAD',        # Token launchpad
    'PREDICTION',       # Prediction market
    'SOCIALFI',         # Social finance
    'QUEST',            # Quest/airdrop platform

    # Financial Services
    'BANK',             # Crypto bank
    'CARD',             # Crypto card
    'PAYMENT',          # Payment processor
    'STREAMING',        # Streaming payments
    'PRIME',            # Prime brokerage
    'SETTLEMENT',       # Settlement service

    # Protocols
    'DAO',              # DAO tooling
    'TREASURY',         # Treasury management
    'ORACLE',           # Price oracle
    'INSURANCE',        # DeFi insurance
    'RWA',              # Real world assets
    'STABLECOIN',       # Stablecoin issuer

    # Identity/Privacy
    'IDENTITY',         # Identity solution
    'ATTESTATION',      # Attestation service
    'MESSAGING',        # Encrypted messaging
    'DVPN',             # Decentralized VPN
    'PRIVACY',          # Privacy protocol (inclut PRIVATE_DEFI)

    # Others
    'AI_AGENT',         # AI agent
    'MINING',           # Mining service
    'INFRASTRUCTURE',   # Infrastructure (explorateur, node, etc.)
]

# =============================================================================
# MAPPING DES TYPES VERS CATEGORIES DE NORMES
# =============================================================================

# Types qui gerent des cles privees (normes de securite crypto)
KEY_CUSTODY_TYPES = ['HW_WALLET', 'SW_WALLET', 'MULTISIG', 'CUSTODY', 'INHERITANCE', 'SEED_SPLITTER', 'BKP_DIGITAL', 'BKP_PHYSICAL']

# Types qui font du trading (normes de trading/liquidite)
TRADING_TYPES = ['CEX', 'DEX', 'DEX_AGG', 'SWAP', 'P2P', 'OTC', 'PERP_DEX', 'MEV', 'INTENT']

# Types cross-chain (normes de bridge)
CROSSCHAIN_TYPES = ['BRIDGE', 'CROSS_AGG', 'L2']

# Types DeFi (normes smart contract)
DEFI_TYPES = ['DEFI', 'LENDING', 'YIELD', 'STAKING', 'LIQUID_STAKING', 'LOCKER', 'VESTING', 'INDEX', 'SYNTHETICS']

# Types marketplace (normes NFT/listing)
MARKET_TYPES = ['NFT_MARKET', 'LAUNCHPAD', 'PREDICTION', 'SOCIALFI', 'QUEST']

# Types services financiers (normes compliance)
FINANCIAL_TYPES = ['BANK', 'CARD', 'PAYMENT', 'STREAMING', 'PRIME', 'SETTLEMENT']

# Types protocoles (normes governance)
PROTOCOL_TYPES = ['DAO', 'TREASURY', 'ORACLE', 'INSURANCE', 'RWA', 'STABLECOIN']

# Types identity/privacy (normes privacy)
PRIVACY_TYPES = ['IDENTITY', 'ATTESTATION', 'MESSAGING', 'DVPN', 'PRIVACY']

# Types autres
OTHER_TYPES = ['AI_AGENT', 'MINING', 'INFRASTRUCTURE']


def get_applicable_types_for_norm(norm_code: str, title: str, description: str) -> list:
    """Determine les types applicables pour une norme donnee"""
    code_upper = norm_code.upper()
    text = f"{title} {description}".lower()

    applicable = set()

    # 1. Mapping par prefixe de code
    prefix_mapping = {
        # Wallet/Hardware
        'S-CC': KEY_CUSTODY_TYPES,  # Common Criteria
        'S-SE': KEY_CUSTODY_TYPES + ['CARD'],  # Secure Element
        'S-SEED': KEY_CUSTODY_TYPES,
        'S-PIN': KEY_CUSTODY_TYPES,
        'S-BIP': KEY_CUSTODY_TYPES + TRADING_TYPES,
        'A-CC': KEY_CUSTODY_TYPES,
        'A-PHY': ['HW_WALLET', 'BKP_PHYSICAL', 'SEED_SPLITTER'],
        'A-HDN': KEY_CUSTODY_TYPES,
        'A-PNC': KEY_CUSTODY_TYPES,
        'A-DRS': KEY_CUSTODY_TYPES,
        'A-OPS': KEY_CUSTODY_TYPES + ['CUSTODY'],
        'A-SOC': KEY_CUSTODY_TYPES + ['CUSTODY'],
        'F-WALLET': KEY_CUSTODY_TYPES,

        # CEX
        'S-CEX': ['CEX', 'PRIME', 'SETTLEMENT'],
        'A-CEX': ['CEX', 'PRIME', 'SETTLEMENT'],
        'F-CEX': ['CEX', 'PRIME', 'SETTLEMENT'],
        'E-CEX': ['CEX', 'PRIME', 'SETTLEMENT'],

        # Custody
        'S-CUST': ['CUSTODY', 'PRIME', 'TREASURY', 'INHERITANCE'],
        'A-CUST': ['CUSTODY', 'PRIME', 'TREASURY', 'INHERITANCE'],
        'F-CUST': ['CUSTODY', 'PRIME', 'TREASURY', 'INHERITANCE'],
        'E-CUST': ['CUSTODY', 'PRIME', 'TREASURY', 'INHERITANCE'],

        # Lending
        'S-LEND': ['LENDING', 'YIELD', 'RWA'],
        'A-LEND': ['LENDING', 'YIELD', 'RWA'],
        'F-LEND': ['LENDING', 'YIELD', 'RWA'],
        'E-LEND': ['LENDING', 'YIELD', 'RWA'],

        # Staking
        'S-STAKE': ['STAKING', 'LIQUID_STAKING', 'MINING'],
        'A-STAKE': ['STAKING', 'LIQUID_STAKING', 'MINING'],
        'F-STAKE': ['STAKING', 'LIQUID_STAKING', 'MINING'],
        'E-STAKE': ['STAKING', 'LIQUID_STAKING', 'MINING'],

        # Liquid Staking (specifique - ne pas elargir)
        'S-LST': ['LIQUID_STAKING', 'STAKING'],
        'A-LST': ['LIQUID_STAKING', 'STAKING'],
        'F-LST': ['LIQUID_STAKING', 'STAKING'],
        'E-LST': ['LIQUID_STAKING', 'STAKING'],

        # Yield
        'S-YIELD': ['YIELD', 'DEFI', 'INDEX'],
        'A-YIELD': ['YIELD', 'DEFI', 'INDEX'],
        'F-YIELD': ['YIELD', 'DEFI', 'INDEX'],
        'E-YIELD': ['YIELD', 'DEFI', 'INDEX'],

        # DEX
        'S-DEX': TRADING_TYPES,
        'A-DEX': TRADING_TYPES,
        'F-DEX': TRADING_TYPES,
        'E-DEX': TRADING_TYPES,

        # Perp DEX
        'S-PERP': ['PERP_DEX', 'DEX', 'SYNTHETICS', 'PREDICTION'],
        'A-PERP': ['PERP_DEX', 'DEX', 'SYNTHETICS', 'PREDICTION'],
        'F-PERP': ['PERP_DEX', 'DEX', 'SYNTHETICS', 'PREDICTION'],
        'E-PERP': ['PERP_DEX', 'DEX', 'SYNTHETICS', 'PREDICTION'],

        # Bridge
        'S-BRIDGE': CROSSCHAIN_TYPES,
        'A-BRIDGE': CROSSCHAIN_TYPES,
        'F-BRIDGE': CROSSCHAIN_TYPES,
        'E-BRIDGE': CROSSCHAIN_TYPES,

        # NFT
        'S-NFT': ['NFT_MARKET', 'LAUNCHPAD', 'SOCIALFI', 'QUEST'],
        'A-NFT': ['NFT_MARKET', 'LAUNCHPAD', 'SOCIALFI', 'QUEST'],
        'F-NFT': ['NFT_MARKET', 'LAUNCHPAD', 'SOCIALFI', 'QUEST'],
        'E-NFT': ['NFT_MARKET', 'LAUNCHPAD', 'SOCIALFI', 'QUEST'],

        # Payment
        'S-PAY': ['PAYMENT', 'CARD', 'STREAMING'],
        'A-PAY': ['PAYMENT', 'CARD', 'STREAMING'],
        'F-PAY': ['PAYMENT', 'CARD', 'STREAMING'],
        'E-PAY': ['PAYMENT', 'CARD', 'STREAMING'],

        # Card
        'S-CARD': ['CARD', 'BANK', 'PAYMENT'],
        'A-CARD': ['CARD', 'BANK', 'PAYMENT'],
        'F-CARD': ['CARD', 'BANK', 'PAYMENT'],
        'E-CARD': ['CARD', 'BANK', 'PAYMENT'],

        # Bank
        'S-BANK': ['BANK', 'CEX', 'CUSTODY'],
        'A-BANK': ['BANK', 'CEX', 'CUSTODY'],
        'F-BANK': ['BANK', 'CEX', 'CUSTODY'],
        'E-BANK': ['BANK', 'CEX', 'CUSTODY'],

        # Smart Contract / DeFi general
        'S-SC': DEFI_TYPES + CROSSCHAIN_TYPES + MARKET_TYPES,
        'S-DEFI': DEFI_TYPES,
        'S-AMM': ['DEX', 'DEX_AGG', 'SWAP'],

        # Compliance
        'E-AML': TRADING_TYPES + FINANCIAL_TYPES + ['CUSTODY'],
        'E-KYC': TRADING_TYPES + FINANCIAL_TYPES + ['CUSTODY'],
        'E-LIC': TRADING_TYPES + FINANCIAL_TYPES + ['CUSTODY'],
        'E-REG': TRADING_TYPES + FINANCIAL_TYPES + ['CUSTODY'],
    }

    # Flag pour savoir si un prefixe specifique a matche
    specific_prefix_matched = False

    for prefix, types in prefix_mapping.items():
        if code_upper.startswith(prefix):
            applicable.update(types)
            # Prefixes specifiques (avec tiret) sont prioritaires
            if '-' in prefix and len(prefix) > 2:
                specific_prefix_matched = True

    # 2. Mapping par mots-cles dans titre/description
    # SEULEMENT si aucun prefixe specifique n'a matche
    keyword_mapping = {
        'wallet': KEY_CUSTODY_TYPES,
        'hardware': ['HW_WALLET', 'BKP_PHYSICAL', 'SEED_SPLITTER'],
        'shock': ['HW_WALLET', 'BKP_PHYSICAL'],
        'battery': ['HW_WALLET'],
        'screen': ['HW_WALLET'],
        'firmware': ['HW_WALLET'],
        'tamper': ['HW_WALLET', 'BKP_PHYSICAL'],
        'waterproof': ['HW_WALLET', 'BKP_PHYSICAL'],
        'ip67': ['HW_WALLET', 'BKP_PHYSICAL'],
        'physical': ['HW_WALLET', 'BKP_PHYSICAL', 'SEED_SPLITTER'],
        'software': ['SW_WALLET'],
        'seed': KEY_CUSTODY_TYPES,
        'private key': KEY_CUSTODY_TYPES,
        'mnemonic': KEY_CUSTODY_TYPES,
        'backup': ['BKP_DIGITAL', 'BKP_PHYSICAL', 'INHERITANCE'],
        'recovery': KEY_CUSTODY_TYPES,
        'cold storage': ['HW_WALLET', 'CUSTODY', 'CEX'],

        'exchange': TRADING_TYPES + ['CEX'],
        'trading': TRADING_TYPES,
        'swap': ['DEX', 'SWAP', 'DEX_AGG'],
        'liquidity': ['DEX', 'LENDING', 'YIELD'],
        'amm': ['DEX', 'DEX_AGG'],
        'order book': ['CEX', 'DEX', 'PERP_DEX'],
        'limit order': ['CEX', 'DEX', 'PERP_DEX'],

        'bridge': CROSSCHAIN_TYPES,
        'cross-chain': CROSSCHAIN_TYPES,
        'layer 2': ['L2', 'BRIDGE'],

        'lending': ['LENDING', 'YIELD', 'RWA'],
        'borrow': ['LENDING'],
        'collateral': ['LENDING', 'PERP_DEX', 'SYNTHETICS'],
        'yield': ['YIELD', 'STAKING', 'LENDING'],
        'staking': ['STAKING', 'LIQUID_STAKING'],
        'validator': ['STAKING', 'LIQUID_STAKING'],
        'defi': DEFI_TYPES,

        'nft': MARKET_TYPES,
        'marketplace': ['NFT_MARKET', 'P2P'],

        'payment': FINANCIAL_TYPES,
        'card': ['CARD', 'PAYMENT'],
        'bank': ['BANK', 'CUSTODY'],

        'custody': ['CUSTODY', 'CEX', 'PRIME'],
        'custodial': ['CUSTODY', 'CEX', 'PRIME'],

        'insurance': ['INSURANCE'],
        'oracle': ['ORACLE', 'DEFI', 'SYNTHETICS'],
        'dao': ['DAO', 'TREASURY'],
        'governance': ['DAO', 'TREASURY', 'DEFI'],

        'privacy': PRIVACY_TYPES,
        'identity': ['IDENTITY', 'ATTESTATION'],

        'smart contract': DEFI_TYPES + CROSSCHAIN_TYPES,
        'audit': DEFI_TYPES + CROSSCHAIN_TYPES + ['CEX', 'CUSTODY'],

        'kyc': TRADING_TYPES + FINANCIAL_TYPES + ['CUSTODY'],
        'aml': TRADING_TYPES + FINANCIAL_TYPES + ['CUSTODY'],
        'compliance': TRADING_TYPES + FINANCIAL_TYPES + ['CUSTODY'],
        'regulation': TRADING_TYPES + FINANCIAL_TYPES + ['CUSTODY'],
    }

    # Appliquer les mots-cles seulement si pas de prefixe specifique
    if not specific_prefix_matched:
        for keyword, types in keyword_mapping.items():
            if keyword in text:
                applicable.update(types)

    # 3. Si aucun type trouve, analyser le contenu pour fallback intelligent
    if not applicable:
        # Analyser le titre/description pour determiner la categorie
        text_lower = text.lower()

        # Categories specifiques basees sur le contenu
        if any(w in text_lower for w in ['pin', 'wipe', 'firmware', 'secure element', 'tamper', 'physical', 'shock', 'battery', 'screen']):
            # Normes hardware
            applicable = set(['HW_WALLET', 'BKP_PHYSICAL', 'SEED_SPLITTER'])
        elif any(w in text_lower for w in ['liquid staking', 'lst', 'steth', 'reth']):
            applicable = set(['LIQUID_STAKING', 'STAKING'])
        elif any(w in text_lower for w in ['staking', 'validator', 'slash', 'unstake']):
            applicable = set(['STAKING', 'LIQUID_STAKING', 'MINING'])
        elif any(w in text_lower for w in ['bip-32', 'bip-39', 'bip-44', 'bip-84', 'bip-388', 'derivation', 'mnemonic']):
            applicable = set(KEY_CUSTODY_TYPES)
        elif any(w in text_lower for w in ['trading', 'volume', 'order', 'market maker']):
            applicable = set(TRADING_TYPES)
        elif any(w in text_lower for w in ['cross-chain', 'bridge', 'relay', 'wrapped']):
            applicable = set(CROSSCHAIN_TYPES)
        elif any(w in text_lower for w in ['lending', 'borrow', 'collateral', 'ltv', 'liquidation']):
            applicable = set(['LENDING', 'YIELD', 'RWA'])
        elif any(w in text_lower for w in ['gas', 'l2', 'layer 2', 'rollup']):
            applicable = set(['L2', 'BRIDGE', 'DEX', 'DEFI'])
        elif any(w in text_lower for w in ['duress', 'panic', 'emergency', 'decoy']):
            applicable = set(KEY_CUSTODY_TYPES + ['CUSTODY'])
        elif any(w in text_lower for w in ['nft', 'royalty', 'collection']):
            applicable = set(MARKET_TYPES)
        elif any(w in text_lower for w in ['chain', 'blockchain', 'network']):
            # Support multi-chain - applicable a beaucoup de types
            applicable = set(DEFI_TYPES + TRADING_TYPES + KEY_CUSTODY_TYPES)
        else:
            # Fallback par pilier seulement si vraiment rien trouve
            pillar = None
            if code_upper.startswith('S-') or code_upper.startswith('S'):
                pillar = 'S'
            elif code_upper.startswith('A-') or code_upper.startswith('A'):
                pillar = 'A'
            elif code_upper.startswith('F-') or code_upper.startswith('F'):
                pillar = 'F'
            elif code_upper.startswith('E-') or code_upper.startswith('E'):
                pillar = 'E'

            if pillar == 'S':
                # Securite generale -> tous les types qui gerent de l'argent
                applicable = set(CANONICAL_TYPES) - {'INFRASTRUCTURE'}
            elif pillar == 'A':
                # Anti-coercion -> principalement wallets, custody et trading
                applicable = set(KEY_CUSTODY_TYPES + TRADING_TYPES + ['CUSTODY', 'PRIME', 'SETTLEMENT', 'TREASURY'])
            elif pillar == 'F':
                # Fiabilite -> types qui ont des caracteristiques physiques ou operationnelles
                applicable = set(KEY_CUSTODY_TYPES + TRADING_TYPES + FINANCIAL_TYPES)
            elif pillar == 'E':
                # Ecosysteme -> tous sauf infrastructure
                applicable = set(CANONICAL_TYPES) - {'INFRASTRUCTURE'}
            else:
                # Fallback pour piliers inconnus - tous sauf infra
                applicable = set(CANONICAL_TYPES) - {'INFRASTRUCTURE'}

    return sorted(list(applicable))


def main():
    print('=' * 80)
    print('REGENERATION DE L\'APPLICABILITE AVEC TYPES CORRECTS')
    print('=' * 80)

    # Fetch all norms (with pagination to get all 1302+)
    headers = get_supabase_headers()

    norms = []
    offset = 0
    limit = 1000

    while True:
        resp = requests.get(
            f'{SUPABASE_URL}/rest/v1/norms?select=code,title,description&order=code&offset={offset}&limit={limit}',
            headers=headers
        )

        if resp.status_code != 200:
            print(f'Erreur: {resp.status_code}')
            return

        batch = resp.json()
        if not batch:
            break

        norms.extend(batch)
        offset += limit

        if len(batch) < limit:
            break
    print(f'Total normes: {len(norms)}')

    # Generate mapping
    mapping = {}
    stats = {t: 0 for t in CANONICAL_TYPES}

    for norm in norms:
        code = norm['code']
        title = norm.get('title', '')
        desc = norm.get('description', '')

        types = get_applicable_types_for_norm(code, title, desc)
        mapping[code] = types

        for t in types:
            if t in stats:
                stats[t] += 1

    # Write Python file
    output = '''#!/usr/bin/env python3
"""
Applicabilite des normes par type de produit
Genere automatiquement avec logique corrigee
"""

# Types canoniques (sans redondance)
ALL_PRODUCT_TYPES = [
'''
    for t in CANONICAL_TYPES:
        output += f"    '{t}',\n"
    output += ']\n\n'

    # Type aliases for backward compatibility
    output += '''# Aliases pour compatibilite (types fusionnes)
TYPE_ALIASES = {
    'DESKTOP_WALLET': 'SW_WALLET',
    'MOBILE_WALLET': 'SW_WALLET',
    'BROWSER_EXT': 'SW_WALLET',
    'AA': 'SW_WALLET',
    'COMPUTE': 'INFRASTRUCTURE',
    'DATA_INDEXER': 'INFRASTRUCTURE',
    'DEV_TOOLS': 'INFRASTRUCTURE',
    'EXPLORER': 'INFRASTRUCTURE',
    'NODE_RPC': 'INFRASTRUCTURE',
    'PROTOCOL': 'INFRASTRUCTURE',
    'RESEARCH': 'INFRASTRUCTURE',
    'SECURITY': 'INFRASTRUCTURE',
    'STORAGE': 'INFRASTRUCTURE',
    'TAX': 'INFRASTRUCTURE',
    'DEFI_TOOLS': 'DEFI',
    'VAULT': 'YIELD',
    'INTEROP': 'BRIDGE',
    'WRAPPED': 'BRIDGE',
    'PRIVATE_DEFI': 'PRIVACY',
}

def normalize_type(product_type: str) -> str:
    """Normalise un type de produit vers le type canonique"""
    t = product_type.upper()
    return TYPE_ALIASES.get(t, t)

'''

    output += '# Applicabilite par norme\n'
    output += 'NORM_APPLICABILITY = {\n'
    for code in sorted(mapping.keys()):
        types = mapping[code]
        types_str = ', '.join([f"'{t}'" for t in types])
        output += f"    '{code}': [{types_str}],\n"
    output += '}\n\n'

    output += '''
def is_norm_applicable(norm_code: str, product_type: str) -> bool:
    """Verifie si une norme s'applique a un type de produit"""
    normalized_type = normalize_type(product_type)

    if norm_code not in NORM_APPLICABILITY:
        # Norme inconnue -> applicable par defaut
        return True

    applicable_types = NORM_APPLICABILITY[norm_code]
    if not applicable_types:
        # Liste vide -> applicable a tous
        return True

    return normalized_type in applicable_types


def get_applicable_norms(product_type: str) -> list:
    """Retourne la liste des codes de normes applicables a un type"""
    normalized_type = normalize_type(product_type)

    applicable = []
    for code, types in NORM_APPLICABILITY.items():
        if not types or normalized_type in types:
            applicable.append(code)
    return sorted(applicable)


def get_norm_types(norm_code: str) -> list:
    """Retourne la liste des types pour une norme"""
    return NORM_APPLICABILITY.get(norm_code, [])
'''

    with open('c:/Users/alexa/Desktop/SafeScoring/src/core/norm_applicability_complete.py', 'w', encoding='utf-8') as f:
        f.write(output)

    print(f'\nFichier genere: src/core/norm_applicability_complete.py')
    print(f'\nStatistiques par type:')
    print('=' * 50)
    for t, count in sorted(stats.items(), key=lambda x: -x[1]):
        bar = '#' * (count // 20)
        print(f'{t:20} {count:4} normes {bar}')

    # Types avec 0 normes
    zero_types = [t for t, c in stats.items() if c == 0]
    if zero_types:
        print(f'\nATTENTION: Types avec 0 normes: {zero_types}')


if __name__ == '__main__':
    main()
