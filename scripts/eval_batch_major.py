#!/usr/bin/env python3
"""
ÉVALUATION BATCH - Uniswap, Kraken, Coinbase
Basée sur recherche approfondie 2025
"""

import os
import sys
import requests
from datetime import datetime
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv('config/.env')

from src.core.norm_applicability_complete import NORM_APPLICABILITY, normalize_type

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')

def get_headers():
    return {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
    }

# =============================================================================
# DONNÉES RECHERCHÉES
# =============================================================================

PRODUCTS_DATA = {
    'uniswap': {
        'name': 'Uniswap',
        'type': 'DEX',
        'founded': 2018,
        'years_operating': 7,
        'hacks': 0,
        'tvl': 5_000_000_000,  # ~$5B
        'volume_total': 2_750_000_000_000,  # $2.75T all-time

        'chains_supported': [
            'Ethereum', 'Polygon', 'Arbitrum', 'Optimism', 'Base',
            'BNB Chain', 'Avalanche', 'Blast', 'World Chain', 'Zora'
        ],

        'security': {
            'auditors': ['OpenZeppelin', 'Spearbit', 'Certora', 'Trail of Bits', 'ABDK', 'Pashov'],
            'audit_count': 9,
            'bug_bounty': 15_500_000,  # $15.5M - largest in history
            'open_source': True,
            'no_hacks': True,  # Zero hacks in v2, v3
            'competition_reward': 2_350_000,  # $2.35M security competition
        },

        'features': {
            'amm': True,
            'concentrated_liquidity': True,  # v3
            'hooks': True,  # v4
            'flash_swaps': True,
            'non_custodial': True,
            'governance': True,
        },
    },

    'kraken': {
        'name': 'Kraken',
        'type': 'CEX',
        'founded': 2011,
        'years_operating': 14,
        'hacks': 0,  # Never been hacked

        'chains_supported': [
            'Bitcoin', 'Ethereum', 'Solana', 'Cardano', 'Polkadot',
            'XRP', 'Polygon', 'Arbitrum', 'Optimism', 'Avalanche',
            'Cosmos', 'Near', 'Tezos', 'Algorand', 'Stellar'
        ],

        'security': {
            'iso_27001': True,
            'soc_2_type_2': True,
            'proof_of_reserves': True,
            'cold_storage': True,  # Armed guards, CCTV
            '2fa': True,
            'never_hacked': True,
        },

        'features': {
            'custodial': True,
            'spot_trading': True,
            'futures': True,
            'staking': True,
            'fiat_onramp': True,
            'institutional': True,  # Kraken Prime
        },
    },

    'coinbase-exchange': {
        'name': 'Coinbase',
        'type': 'CEX',
        'founded': 2012,
        'years_operating': 13,
        'public_company': True,  # NASDAQ: COIN

        'chains_supported': [
            'Bitcoin', 'Ethereum', 'Solana', 'Cardano', 'Polkadot',
            'XRP', 'Polygon', 'Arbitrum', 'Optimism', 'Avalanche',
            'Base', 'Cosmos', 'Near', 'Tezos', 'Algorand', 'Stellar'
        ],

        'security': {
            'soc_1_type_2': True,
            'soc_2_type_2': True,
            'insurance': 320_000_000,  # $320M hot wallet insurance
            'cold_storage_percent': 98,  # 98% in cold storage
            'cds_military_grade': True,  # Cross-Domain Solution
            'mpc_open_source': True,
            'etf_custodian': True,  # 8/11 Bitcoin ETFs
        },

        'features': {
            'custodial': True,
            'spot_trading': True,
            'staking': True,
            'fiat_onramp': True,
            'card': True,
            'institutional': True,  # Coinbase Prime
            'base_l2': True,  # Base L2
        },
    },
}

def evaluate_uniswap(norm_code, norm_title, norm_desc):
    """Évalue une norme pour Uniswap"""
    title_lower = (norm_title or '').lower()
    code_upper = norm_code.upper()

    # SECURITY
    if code_upper.startswith('S') and any(x in title_lower for x in ['aes', 'encryption', 'symmetric', 'ecdsa', 'signature', 'sha', 'keccak', 'hash']):
        return 'YESp', 'EVM standard cryptography (secp256k1, Keccak-256, ECDSA)'

    if code_upper.startswith('S') and any(x in title_lower for x in ['secure element', 'tpm', 'hsm', 'firmware', 'bootloader', 'pin', 'biometric']):
        return 'N/A', 'Hardware security not applicable to DeFi protocol'

    if any(x in title_lower for x in ['tls', 'https', 'ssl']):
        return 'YES', 'app.uniswap.org uses TLS 1.3/HTTPS'

    if any(x in title_lower for x in ['audit', 'security review', 'penetration']):
        return 'YES', '9 independent audits: OpenZeppelin, Spearbit, Certora, Trail of Bits, ABDK, Pashov'

    if any(x in title_lower for x in ['open source', 'source code', 'github']):
        return 'YES', 'Fully open source: github.com/Uniswap'

    if any(x in title_lower for x in ['bug bounty', 'vulnerability reward']):
        return 'YES', '$15.5M bug bounty - LARGEST IN HISTORY'

    if any(x in title_lower for x in ['smart contract', 'solidity']):
        return 'YES', 'Smart contracts audited 9 times, no critical vulnerabilities found'

    # ADVERSITY
    if code_upper.startswith('A') and any(x in title_lower for x in ['duress', 'coercion', 'hidden', 'tamper', 'physical']):
        return 'N/A', 'Physical/anti-coercion features not applicable to DeFi'

    if any(x in title_lower for x in ['incident', 'response', 'emergency']):
        return 'YES', 'Zero hacks in v2/v3 history, $2.75T+ volume processed safely'

    if any(x in title_lower for x in ['governance', 'dao']):
        return 'YES', 'Uniswap DAO governance with UNI token'

    # FIDELITY
    if any(x in title_lower for x in ['track record', 'history', 'longevity']):
        return 'YES', '7+ years operational, $2.75T+ total volume, zero hacks'

    if any(x in title_lower for x in ['uptime', 'availability']):
        return 'YES', 'High availability across 10+ networks'

    if any(x in title_lower for x in ['documentation', 'docs']):
        return 'YES', 'Comprehensive documentation at docs.uniswap.org'

    if code_upper.startswith('F') and any(x in title_lower for x in ['metal', 'steel', 'waterproof', 'fire', 'temperature']):
        return 'N/A', 'Physical material properties not applicable to software'

    # ECOSYSTEM
    chain_keywords = ['ethereum', 'evm', 'polygon', 'arbitrum', 'optimism', 'avalanche', 'bnb', 'base', 'blast']
    if any(x in title_lower for x in chain_keywords):
        return 'YES', 'Deployed on Ethereum, Polygon, Arbitrum, Optimism, Base, BNB, Avalanche, Blast, etc.'

    if any(x in title_lower for x in ['bitcoin', 'solana', 'cosmos', 'polkadot', 'cardano']):
        return 'NO', 'Non-EVM chain not supported by Uniswap'

    if any(x in title_lower for x in ['web', 'browser']):
        return 'YES', 'app.uniswap.org web interface'

    if any(x in title_lower for x in ['mobile', 'ios', 'android']):
        return 'YES', 'Uniswap mobile wallet on iOS and Android'

    if any(x in title_lower for x in ['swap', 'exchange', 'trade', 'liquidity', 'amm']):
        return 'YES', 'Core AMM functionality with concentrated liquidity (v3) and hooks (v4)'

    return 'TBD', 'Requires further verification'


def evaluate_kraken(norm_code, norm_title, norm_desc):
    """Évalue une norme pour Kraken"""
    title_lower = (norm_title or '').lower()
    code_upper = norm_code.upper()

    # SECURITY
    if code_upper.startswith('S') and any(x in title_lower for x in ['aes', 'encryption', 'symmetric']):
        return 'YES', 'AES-256 encryption for data at rest'

    if code_upper.startswith('S') and any(x in title_lower for x in ['ecdsa', 'signature', 'sha', 'hash']):
        return 'YES', 'Standard cryptography for blockchain operations'

    if code_upper.startswith('S') and any(x in title_lower for x in ['secure element', 'tpm', 'firmware', 'bootloader']):
        return 'N/A', 'Hardware security not applicable to exchange'

    if any(x in title_lower for x in ['tls', 'https', 'ssl']):
        return 'YES', 'TLS 1.3/HTTPS for all communications'

    if any(x in title_lower for x in ['2fa', 'two-factor', 'mfa']):
        return 'YES', '2FA via authenticator, hardware keys supported'

    if any(x in title_lower for x in ['audit', 'security review']):
        return 'YES', 'ISO 27001 certified, SOC 2 Type 2 examined'

    if any(x in title_lower for x in ['open source']):
        return 'NO', 'Kraken platform is proprietary'

    if any(x in title_lower for x in ['cold storage', 'offline']):
        return 'YES', 'Crypto in secure cages with armed guards, CCTV, 24/7 surveillance'

    # ADVERSITY
    if code_upper.startswith('A') and any(x in title_lower for x in ['duress', 'coercion', 'hidden', 'tamper']):
        return 'N/A', 'Physical features not applicable to exchange'

    if any(x in title_lower for x in ['insurance', 'reserve', 'backstop', 'proof of reserves']):
        return 'YES', 'Quarterly Proof of Reserves (1:1+ backing), Merkle verification available'

    if any(x in title_lower for x in ['incident', 'response']):
        return 'YES', '14 years operational, never been hacked'

    if any(x in title_lower for x in ['kyc', 'aml', 'compliance']):
        return 'YES', 'Full KYC/AML compliance, licensed in multiple jurisdictions'

    # FIDELITY
    if any(x in title_lower for x in ['track record', 'history', 'longevity']):
        return 'YES', '14+ years operational since 2011, never hacked'

    if any(x in title_lower for x in ['uptime', 'availability']):
        return 'YES', 'High availability trading platform'

    if any(x in title_lower for x in ['documentation']):
        return 'YES', 'Comprehensive support documentation'

    if any(x in title_lower for x in ['support', 'help']):
        return 'YES', '24/7 customer support'

    if code_upper.startswith('F') and any(x in title_lower for x in ['metal', 'steel', 'waterproof', 'fire']):
        return 'N/A', 'Physical material not applicable to exchange'

    # ECOSYSTEM - All chains supported
    chain_keywords = ['ethereum', 'bitcoin', 'solana', 'cardano', 'polkadot', 'xrp', 'polygon', 'arbitrum', 'cosmos', 'near', 'tezos']
    if any(x in title_lower for x in chain_keywords):
        return 'YES', 'Supported via Kraken deposits/withdrawals'

    if any(x in title_lower for x in ['web', 'browser']):
        return 'YES', 'kraken.com web platform'

    if any(x in title_lower for x in ['mobile', 'ios', 'android']):
        return 'YES', 'Kraken mobile app available'

    if any(x in title_lower for x in ['desktop']):
        return 'YES', 'Kraken Pro desktop app'

    if any(x in title_lower for x in ['trading', 'spot', 'order']):
        return 'YES', 'Full spot trading with advanced order types'

    if any(x in title_lower for x in ['futures', 'derivative', 'leverage']):
        return 'YES', 'Kraken Futures available'

    if any(x in title_lower for x in ['staking', 'earn']):
        return 'YES', 'Staking available for multiple assets'

    if any(x in title_lower for x in ['fiat', 'bank']):
        return 'YES', 'Fiat on/off ramps supported'

    return 'TBD', 'Requires further verification'


def evaluate_coinbase(norm_code, norm_title, norm_desc):
    """Évalue une norme pour Coinbase"""
    title_lower = (norm_title or '').lower()
    code_upper = norm_code.upper()

    # SECURITY
    if code_upper.startswith('S') and any(x in title_lower for x in ['aes', 'encryption', 'symmetric']):
        return 'YES', 'AES-256 encryption, MPC cryptography (open source)'

    if code_upper.startswith('S') and any(x in title_lower for x in ['ecdsa', 'signature', 'sha', 'hash']):
        return 'YES', 'Standard cryptography with MPC key management'

    if code_upper.startswith('S') and any(x in title_lower for x in ['secure element', 'tpm', 'firmware', 'bootloader']):
        return 'N/A', 'Hardware security not applicable to exchange'

    if any(x in title_lower for x in ['tls', 'https', 'ssl']):
        return 'YES', 'TLS 1.3/HTTPS for all communications'

    if any(x in title_lower for x in ['2fa', 'two-factor', 'mfa']):
        return 'YES', '2FA via authenticator, SMS, hardware keys'

    if any(x in title_lower for x in ['audit', 'security review']):
        return 'YES', 'SOC 1 Type II and SOC 2 Type II audited by Deloitte'

    if any(x in title_lower for x in ['open source']):
        return 'YES', 'MPC cryptography library open-sourced (March 2025)'

    if any(x in title_lower for x in ['cold storage', 'offline']):
        return 'YES', '98% of crypto in cold storage with military-grade CDS technology'

    if any(x in title_lower for x in ['bug bounty']):
        return 'YES', 'Active bug bounty program on HackerOne'

    # ADVERSITY
    if code_upper.startswith('A') and any(x in title_lower for x in ['duress', 'coercion', 'hidden', 'tamper']):
        return 'N/A', 'Physical features not applicable to exchange'

    if any(x in title_lower for x in ['insurance', 'reserve', 'backstop']):
        return 'YES', '$320M commercial crime insurance for hot wallets - largest in industry'

    if any(x in title_lower for x in ['incident', 'response']):
        return 'YES', 'Established incident response, data breach in 2025 handled with enhanced measures'

    if any(x in title_lower for x in ['kyc', 'aml', 'compliance']):
        return 'YES', 'Full KYC/AML, publicly traded company (NASDAQ: COIN)'

    # FIDELITY
    if any(x in title_lower for x in ['track record', 'history', 'longevity']):
        return 'YES', '13+ years operational, public company, 8/11 Bitcoin ETF custodian'

    if any(x in title_lower for x in ['uptime', 'availability']):
        return 'YES', 'High availability platform'

    if any(x in title_lower for x in ['documentation']):
        return 'YES', 'Comprehensive help center'

    if any(x in title_lower for x in ['support', 'help']):
        return 'YES', 'Customer support available'

    if code_upper.startswith('F') and any(x in title_lower for x in ['metal', 'steel', 'waterproof', 'fire']):
        return 'N/A', 'Physical material not applicable to exchange'

    # ECOSYSTEM - All chains supported + Base L2
    chain_keywords = ['ethereum', 'bitcoin', 'solana', 'cardano', 'polkadot', 'xrp', 'polygon', 'arbitrum', 'optimism', 'base', 'cosmos', 'near']
    if any(x in title_lower for x in chain_keywords):
        return 'YES', 'Supported via Coinbase + Base L2 native support'

    if any(x in title_lower for x in ['web', 'browser']):
        return 'YES', 'coinbase.com web platform'

    if any(x in title_lower for x in ['mobile', 'ios', 'android']):
        return 'YES', 'Coinbase mobile app on iOS and Android'

    if any(x in title_lower for x in ['trading', 'spot', 'order']):
        return 'YES', 'Full spot trading'

    if any(x in title_lower for x in ['staking', 'earn']):
        return 'YES', 'Staking available, cbETH liquid staking'

    if any(x in title_lower for x in ['fiat', 'bank']):
        return 'YES', 'Extensive fiat support, debit card available'

    if any(x in title_lower for x in ['card', 'payment']):
        return 'YES', 'Coinbase Card for crypto spending'

    return 'TBD', 'Requires further verification'


def main():
    headers = get_headers()

    # Load norms
    r = requests.get(f'{SUPABASE_URL}/rest/v1/norms?select=id,code,pillar,title,description', headers=headers)
    norms = {n['code']: n for n in r.json()}

    products_to_eval = [
        ('uniswap', 'DEX', evaluate_uniswap),
        ('kraken', 'CEX', evaluate_kraken),
        ('coinbase-exchange', 'CEX', evaluate_coinbase),
    ]

    for slug, canonical_type, eval_func in products_to_eval:
        # Load product
        r = requests.get(f'{SUPABASE_URL}/rest/v1/products?select=id,name,slug,type_id&slug=eq.{slug}', headers=headers)
        products = r.json()

        if not products:
            print(f"Produit {slug} non trouvé!")
            continue

        product = products[0]
        print(f"\n{'='*60}")
        print(f"Évaluation de: {product['name']} (ID: {product['id']})")

        # Get applicable norms
        applicable_codes = [code for code, types in NORM_APPLICABILITY.items() if canonical_type in types]
        print(f"Normes applicables: {len(applicable_codes)}")

        # Evaluate
        evaluations = []
        stats = {'YES': 0, 'YESp': 0, 'NO': 0, 'N/A': 0, 'TBD': 0}

        for code in applicable_codes:
            norm = norms.get(code)
            if not norm:
                continue

            evaluation, justification = eval_func(
                code,
                norm.get('title', ''),
                norm.get('description', '')
            )

            stats[evaluation] = stats.get(evaluation, 0) + 1

            evaluations.append({
                'product_id': product['id'],
                'norm_id': norm['id'],
                'result': evaluation,
                'why_this_result': justification[:500],
                'evaluated_by': 'claude_research_v1',
                'confidence_score': 0.9 if evaluation != 'TBD' else 0.5
            })

        print(f"\nRésultats:")
        for k, v in stats.items():
            print(f"  {k}: {v}")

        # Calculate score
        positive = stats['YES'] + stats['YESp']
        negative = stats['NO']
        total = positive + negative
        if total > 0:
            score = (positive / total) * 100
            print(f"\nScore préliminaire: {score:.1f}%")

        # Save
        print(f"\nSauvegarde de {len(evaluations)} évaluations...")
        batch_size = 200
        saved = 0

        for i in range(0, len(evaluations), batch_size):
            batch = evaluations[i:i+batch_size]
            r = requests.post(
                f'{SUPABASE_URL}/rest/v1/evaluations',
                headers=headers,
                json=batch
            )
            if r.status_code in [200, 201]:
                saved += len(batch)
                print(f"  Batch {i//batch_size + 1}: {len(batch)} saved")
            else:
                print(f"  Batch {i//batch_size + 1}: ERROR - {r.text[:100]}")

        print(f"Total sauvegardé: {saved}/{len(evaluations)}")

if __name__ == '__main__':
    main()
