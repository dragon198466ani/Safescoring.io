#!/usr/bin/env python3
"""Update ALL columns for the 33 new norms with complete information"""
import requests
from datetime import datetime

from config_helper import SUPABASE_URL, SUPABASE_KEY, get_supabase_headers

headers = get_supabase_headers()

# Complete data for all 33 new norms
# Note: access_type is VARCHAR(1) - use 'G' for global/public
# scope_type: international, regulatory, technical, operational, functional
complete_norm_data = {
    # =============================================================================
    # S-DEFI (Security DeFi) - 10 norms
    # =============================================================================
    'S-SC-AUDIT': {
        'is_essential': True,
        'consumer': True,
        'full': True,
        'classification_method': 'manual',
        'classification_date': '2026-01-12',
        'crypto_relevance': 'Critical - External audit is the foundation of smart contract security',
        'geographic_scope': 'global',
        'scope_type': 'technical',
        'access_type': 'G',
        'official_doc_summary': 'External smart contract audits by recognized security firms verify code integrity and identify vulnerabilities.',
        'official_link': 'https://consensys.io/diligence/',
        'issuing_authority': 'Industry Best Practice',
        'standard_reference': 'Smart Contract Security Audit Standards'
    },
    'S-SC-REENTR': {
        'is_essential': True,
        'consumer': True,
        'full': True,
        'classification_method': 'manual',
        'classification_date': '2026-01-12',
        'crypto_relevance': 'Critical - Reentrancy is one of the most exploited vulnerabilities',
        'geographic_scope': 'global',
        'scope_type': 'technical',
        'access_type': 'G',
        'official_doc_summary': 'Protection against reentrancy attacks via checks-effects-interactions pattern or guards.',
        'official_link': 'https://swcregistry.io/docs/SWC-107',
        'issuing_authority': 'Smart Contract Weakness Classification',
        'standard_reference': 'SWC-107 Reentrancy'
    },
    'S-SC-FLASH': {
        'is_essential': True,
        'consumer': True,
        'full': True,
        'classification_method': 'manual',
        'classification_date': '2026-01-12',
        'crypto_relevance': 'Critical - Flash loan attacks are a major DeFi threat vector',
        'geographic_scope': 'global',
        'scope_type': 'technical',
        'access_type': 'G',
        'official_doc_summary': 'Protection against flash loan price manipulation using TWAP oracles and delay mechanisms.',
        'official_link': 'https://www.paradigm.xyz/2020/11/so-you-want-to-use-a-flash-loan',
        'issuing_authority': 'Paradigm Research',
        'standard_reference': 'Flash Loan Security Best Practices'
    },
    'S-SC-ORACLE': {
        'is_essential': True,
        'consumer': True,
        'full': True,
        'classification_method': 'manual',
        'classification_date': '2026-01-12',
        'crypto_relevance': 'Critical - Oracle manipulation has caused billions in losses',
        'geographic_scope': 'global',
        'scope_type': 'technical',
        'access_type': 'G',
        'official_doc_summary': 'Protection against price oracle manipulation using decentralized oracles and TWAP.',
        'official_link': 'https://chain.link/education-hub/oracle-manipulation',
        'issuing_authority': 'Chainlink',
        'standard_reference': 'Oracle Security Guidelines'
    },
    'S-SC-PROXY': {
        'is_essential': True,
        'consumer': True,
        'full': True,
        'classification_method': 'manual',
        'classification_date': '2026-01-12',
        'crypto_relevance': 'High - Proxy upgrades can introduce vulnerabilities or rug pulls',
        'geographic_scope': 'global',
        'scope_type': 'technical',
        'access_type': 'G',
        'official_doc_summary': 'Security of upgradeable proxy contracts with proper storage and initialization protection.',
        'official_link': 'https://docs.openzeppelin.com/upgrades-plugins/1.x/proxies',
        'issuing_authority': 'OpenZeppelin',
        'standard_reference': 'Proxy Upgrade Pattern'
    },
    'S-SC-ACCESS': {
        'is_essential': True,
        'consumer': True,
        'full': True,
        'classification_method': 'manual',
        'classification_date': '2026-01-12',
        'crypto_relevance': 'Critical - Unauthorized access to admin functions enables exploits',
        'geographic_scope': 'global',
        'scope_type': 'technical',
        'access_type': 'G',
        'official_doc_summary': 'Role-based access control on admin functions using OpenZeppelin patterns.',
        'official_link': 'https://docs.openzeppelin.com/contracts/4.x/access-control',
        'issuing_authority': 'OpenZeppelin',
        'standard_reference': 'Access Control Standards'
    },
    'S-SC-OVERFLOW': {
        'is_essential': True,
        'consumer': True,
        'full': True,
        'classification_method': 'manual',
        'classification_date': '2026-01-12',
        'crypto_relevance': 'High - Integer issues can enable token minting exploits',
        'geographic_scope': 'global',
        'scope_type': 'technical',
        'access_type': 'G',
        'official_doc_summary': 'Protection against integer overflow/underflow with Solidity 0.8+ or SafeMath.',
        'official_link': 'https://swcregistry.io/docs/SWC-101',
        'issuing_authority': 'Smart Contract Weakness Classification',
        'standard_reference': 'SWC-101 Integer Overflow'
    },
    'S-SC-FRONTRUN': {
        'is_essential': True,
        'consumer': True,
        'full': True,
        'classification_method': 'manual',
        'classification_date': '2026-01-12',
        'crypto_relevance': 'High - MEV extraction costs users billions annually',
        'geographic_scope': 'global',
        'scope_type': 'technical',
        'access_type': 'G',
        'official_doc_summary': 'Protection against front-running and MEV via private mempools or commit-reveal.',
        'official_link': 'https://www.flashbots.net/',
        'issuing_authority': 'Flashbots',
        'standard_reference': 'MEV Protection Standards'
    },
    'S-SC-TIMELOCK': {
        'is_essential': True,
        'consumer': True,
        'full': True,
        'classification_method': 'manual',
        'classification_date': '2026-01-12',
        'crypto_relevance': 'High - Timelocks give users time to exit before malicious changes',
        'geographic_scope': 'global',
        'scope_type': 'technical',
        'access_type': 'G',
        'official_doc_summary': 'Mandatory delay period for admin actions allowing users to exit before changes.',
        'official_link': 'https://docs.openzeppelin.com/contracts/4.x/api/governance#TimelockController',
        'issuing_authority': 'OpenZeppelin',
        'standard_reference': 'TimelockController'
    },
    'S-SC-MULTISIG': {
        'is_essential': True,
        'consumer': True,
        'full': True,
        'classification_method': 'manual',
        'classification_date': '2026-01-12',
        'crypto_relevance': 'Critical - Single key control is a major rug pull vector',
        'geographic_scope': 'global',
        'scope_type': 'technical',
        'access_type': 'G',
        'official_doc_summary': 'Multi-signature requirement for critical operations preventing single-point compromise.',
        'official_link': 'https://safe.global/',
        'issuing_authority': 'Safe (Gnosis Safe)',
        'standard_reference': 'Multi-signature Security'
    },

    # =============================================================================
    # S-BRIDGE (Security Bridge) - 5 norms
    # =============================================================================
    'S-BR-VALID': {
        'is_essential': True,
        'consumer': True,
        'full': True,
        'classification_method': 'manual',
        'classification_date': '2026-01-12',
        'crypto_relevance': 'Critical - Bridge validators are the main security layer',
        'geographic_scope': 'global',
        'scope_type': 'technical',
        'access_type': 'G',
        'official_doc_summary': 'Decentralized validator set for cross-chain message verification.',
        'official_link': 'https://ethereum.org/en/developers/docs/bridges/',
        'issuing_authority': 'Ethereum Foundation',
        'standard_reference': 'Bridge Architecture Guidelines'
    },
    'S-BR-RELAY': {
        'is_essential': True,
        'consumer': True,
        'full': True,
        'classification_method': 'manual',
        'classification_date': '2026-01-12',
        'crypto_relevance': 'Critical - Relay security prevents message forgery',
        'geographic_scope': 'global',
        'scope_type': 'technical',
        'access_type': 'G',
        'official_doc_summary': 'Secure relay mechanism with cryptographic verification for cross-chain messages.',
        'official_link': 'https://layerzero.network/',
        'issuing_authority': 'LayerZero',
        'standard_reference': 'Cross-chain Messaging Protocol'
    },
    'S-BR-LOCK': {
        'is_essential': True,
        'consumer': True,
        'full': True,
        'classification_method': 'manual',
        'classification_date': '2026-01-12',
        'crypto_relevance': 'Critical - Lock mechanism secures bridged assets',
        'geographic_scope': 'global',
        'scope_type': 'technical',
        'access_type': 'G',
        'official_doc_summary': 'Secure lock mechanism for native assets on source chain.',
        'official_link': 'https://ethereum.org/en/developers/docs/bridges/#how-do-bridges-work',
        'issuing_authority': 'Ethereum Foundation',
        'standard_reference': 'Lock and Mint Mechanism'
    },
    'S-BR-MINT': {
        'is_essential': True,
        'consumer': True,
        'full': True,
        'classification_method': 'manual',
        'classification_date': '2026-01-12',
        'crypto_relevance': 'Critical - Uncontrolled minting causes infinite mint exploits',
        'geographic_scope': 'global',
        'scope_type': 'technical',
        'access_type': 'G',
        'official_doc_summary': 'Controlled minting of wrapped tokens ensuring 1:1 backing.',
        'official_link': 'https://wbtc.network/',
        'issuing_authority': 'WBTC Network',
        'standard_reference': 'Wrapped Token Standards'
    },
    'S-BR-THRESH': {
        'is_essential': True,
        'consumer': True,
        'full': True,
        'classification_method': 'manual',
        'classification_date': '2026-01-12',
        'crypto_relevance': 'High - TSS prevents single-point key compromise',
        'geographic_scope': 'global',
        'scope_type': 'technical',
        'access_type': 'G',
        'official_doc_summary': 'Threshold Signature Scheme (TSS) or MPC for distributed key management.',
        'official_link': 'https://threshold.network/',
        'issuing_authority': 'Threshold Network',
        'standard_reference': 'Threshold Signatures (TSS)'
    },

    # =============================================================================
    # F-DEFI (Fiabilite DeFi) - 6 norms
    # =============================================================================
    'F-TVL-TRACK': {
        'is_essential': False,
        'consumer': True,
        'full': True,
        'classification_method': 'manual',
        'classification_date': '2026-01-12',
        'crypto_relevance': 'Medium - TVL transparency indicates protocol health',
        'geographic_scope': 'global',
        'scope_type': 'operational',
        'access_type': 'G',
        'official_doc_summary': 'Real-time Total Value Locked tracking via DefiLlama integration.',
        'official_link': 'https://defillama.com/',
        'issuing_authority': 'DefiLlama',
        'standard_reference': 'TVL Tracking Standard'
    },
    'F-DEFI-INS': {
        'is_essential': False,
        'consumer': True,
        'full': True,
        'classification_method': 'manual',
        'classification_date': '2026-01-12',
        'crypto_relevance': 'Medium - Insurance provides financial protection against exploits',
        'geographic_scope': 'global',
        'scope_type': 'operational',
        'access_type': 'G',
        'official_doc_summary': 'DeFi insurance coverage through Nexus Mutual or similar protocols.',
        'official_link': 'https://nexusmutual.io/',
        'issuing_authority': 'Nexus Mutual',
        'standard_reference': 'DeFi Insurance Coverage'
    },
    'F-INCIDENT': {
        'is_essential': True,
        'consumer': True,
        'full': True,
        'classification_method': 'manual',
        'classification_date': '2026-01-12',
        'crypto_relevance': 'High - Fast incident response minimizes losses',
        'geographic_scope': 'global',
        'scope_type': 'operational',
        'access_type': 'G',
        'official_doc_summary': 'Documented incident response plan following NIST framework.',
        'official_link': 'https://www.nist.gov/cyberframework',
        'issuing_authority': 'NIST',
        'standard_reference': 'NIST Cybersecurity Framework - Respond'
    },
    'F-POSTMORTEM': {
        'is_essential': False,
        'consumer': True,
        'full': True,
        'classification_method': 'manual',
        'classification_date': '2026-01-12',
        'crypto_relevance': 'Medium - Transparency after incidents builds trust',
        'geographic_scope': 'global',
        'scope_type': 'operational',
        'access_type': 'G',
        'official_doc_summary': 'Public post-mortem disclosure after security incidents.',
        'official_link': 'https://rekt.news/',
        'issuing_authority': 'Industry Best Practice',
        'standard_reference': 'Post-Mortem Disclosure Standards'
    },
    'F-BUGBOUNTY': {
        'is_essential': True,
        'consumer': True,
        'full': True,
        'classification_method': 'manual',
        'classification_date': '2026-01-12',
        'crypto_relevance': 'High - Bug bounties incentivize responsible disclosure',
        'geographic_scope': 'global',
        'scope_type': 'operational',
        'access_type': 'G',
        'official_doc_summary': 'Active bug bounty program through Immunefi or similar platforms.',
        'official_link': 'https://immunefi.com/',
        'issuing_authority': 'Immunefi',
        'standard_reference': 'Bug Bounty Program Standards'
    },
    'F-MONITOR': {
        'is_essential': True,
        'consumer': True,
        'full': True,
        'classification_method': 'manual',
        'classification_date': '2026-01-12',
        'crypto_relevance': 'High - Real-time monitoring enables fast attack detection',
        'geographic_scope': 'global',
        'scope_type': 'operational',
        'access_type': 'G',
        'official_doc_summary': 'Real-time 24/7 security monitoring using Forta or similar tools.',
        'official_link': 'https://forta.org/',
        'issuing_authority': 'Forta Network',
        'standard_reference': 'Real-time Security Monitoring'
    },

    # =============================================================================
    # F-CEX (Fiabilite CEX) - 6 norms
    # =============================================================================
    'F-POR': {
        'is_essential': True,
        'consumer': True,
        'full': True,
        'classification_method': 'manual',
        'classification_date': '2026-01-12',
        'crypto_relevance': 'Critical - PoR proves exchange solvency after FTX collapse',
        'geographic_scope': 'global',
        'scope_type': 'regulatory',
        'access_type': 'G',
        'official_doc_summary': 'Verifiable Proof of Reserves using Merkle trees and third-party audits.',
        'official_link': 'https://chain.link/proof-of-reserve',
        'issuing_authority': 'Chainlink',
        'standard_reference': 'Proof of Reserve (PoR)'
    },
    'F-SEGREG': {
        'is_essential': True,
        'consumer': True,
        'full': True,
        'classification_method': 'manual',
        'classification_date': '2026-01-12',
        'crypto_relevance': 'Critical - Segregation protects user funds in bankruptcy',
        'geographic_scope': 'EU',
        'scope_type': 'regulatory',
        'access_type': 'G',
        'official_doc_summary': 'Segregation of client funds from operational funds per ESMA guidelines.',
        'official_link': 'https://www.esma.europa.eu/sites/default/files/library/esma70-156-5153_final_report_guidelines_on_client_money.pdf',
        'issuing_authority': 'ESMA',
        'standard_reference': 'Client Asset Segregation'
    },
    'F-COLD': {
        'is_essential': True,
        'consumer': True,
        'full': True,
        'classification_method': 'manual',
        'classification_date': '2026-01-12',
        'crypto_relevance': 'Critical - Cold storage protects against hot wallet hacks',
        'geographic_scope': 'global',
        'scope_type': 'technical',
        'access_type': 'G',
        'official_doc_summary': 'Minimum cold storage ratio (95%+) per CCSS standards.',
        'official_link': 'https://www.ccss.info/',
        'issuing_authority': 'CCSS',
        'standard_reference': 'Cryptocurrency Security Standard'
    },
    'F-INS-FUND': {
        'is_essential': False,
        'consumer': True,
        'full': True,
        'classification_method': 'manual',
        'classification_date': '2026-01-12',
        'crypto_relevance': 'High - Insurance fund compensates users after security breaches',
        'geographic_scope': 'global',
        'scope_type': 'operational',
        'access_type': 'G',
        'official_doc_summary': 'Insurance fund (SAFU model) for user loss protection.',
        'official_link': 'https://www.binance.com/en/support/faq/introduction-to-secure-asset-fund-for-users-safu',
        'issuing_authority': 'Industry Best Practice',
        'standard_reference': 'SAFU Insurance Fund Model'
    },
    'F-AUDIT-FIN': {
        'is_essential': True,
        'consumer': True,
        'full': True,
        'classification_method': 'manual',
        'classification_date': '2026-01-12',
        'crypto_relevance': 'High - Financial audits ensure exchange solvency',
        'geographic_scope': 'global',
        'scope_type': 'regulatory',
        'access_type': 'G',
        'official_doc_summary': 'Annual external financial audit with SOC 2 Type II certification.',
        'official_link': 'https://www.aicpa.org/resources/landing/soc-2',
        'issuing_authority': 'AICPA',
        'standard_reference': 'SOC 2 Type II Audit'
    },
    'F-LICENSE': {
        'is_essential': True,
        'consumer': True,
        'full': True,
        'classification_method': 'manual',
        'classification_date': '2026-01-12',
        'crypto_relevance': 'Critical - Regulatory license ensures legal compliance',
        'geographic_scope': 'EU',
        'scope_type': 'regulatory',
        'access_type': 'G',
        'official_doc_summary': 'Regulatory license under MiCA, MSB, or equivalent VASP registration.',
        'official_link': 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32023R1114',
        'issuing_authority': 'European Union',
        'standard_reference': 'MiCA Regulation (EU) 2023/1114'
    },

    # =============================================================================
    # E-CEX (Ecosysteme CEX) - 6 norms
    # =============================================================================
    'E-FIAT-ON': {
        'is_essential': False,
        'consumer': True,
        'full': True,
        'classification_method': 'manual',
        'classification_date': '2026-01-12',
        'crypto_relevance': 'Medium - Fiat on-ramp enables new user onboarding',
        'geographic_scope': 'global',
        'scope_type': 'functional',
        'access_type': 'G',
        'official_doc_summary': 'Fiat on-ramp support via bank transfer and card payments.',
        'official_link': 'https://www.moonpay.com/',
        'issuing_authority': 'Industry Standard',
        'standard_reference': 'Fiat On-ramp Integration'
    },
    'E-FIAT-OFF': {
        'is_essential': False,
        'consumer': True,
        'full': True,
        'classification_method': 'manual',
        'classification_date': '2026-01-12',
        'crypto_relevance': 'Medium - Fiat off-ramp enables crypto-to-bank conversion',
        'geographic_scope': 'global',
        'scope_type': 'functional',
        'access_type': 'G',
        'official_doc_summary': 'Fiat off-ramp support to withdraw funds to bank accounts.',
        'official_link': 'https://www.circle.com/',
        'issuing_authority': 'Industry Standard',
        'standard_reference': 'Fiat Off-ramp Integration'
    },
    'E-PAIRS': {
        'is_essential': False,
        'consumer': True,
        'full': True,
        'classification_method': 'manual',
        'classification_date': '2026-01-12',
        'crypto_relevance': 'Low - Trading pair variety is a convenience feature',
        'geographic_scope': 'global',
        'scope_type': 'functional',
        'access_type': 'G',
        'official_doc_summary': 'Extensive trading pair listings (100+ pairs).',
        'official_link': 'https://www.coingecko.com/',
        'issuing_authority': 'Industry Standard',
        'standard_reference': 'Trading Pair Listings'
    },
    'E-SPOT': {
        'is_essential': False,
        'consumer': True,
        'full': True,
        'classification_method': 'manual',
        'classification_date': '2026-01-12',
        'crypto_relevance': 'Low - Spot trading is basic exchange functionality',
        'geographic_scope': 'global',
        'scope_type': 'functional',
        'access_type': 'G',
        'official_doc_summary': 'Spot trading functionality for immediate buy/sell orders.',
        'official_link': 'https://www.investopedia.com/terms/s/spottrade.asp',
        'issuing_authority': 'Financial Industry',
        'standard_reference': 'Spot Trading Definition'
    },
    'E-MARGIN': {
        'is_essential': False,
        'consumer': True,
        'full': True,
        'classification_method': 'manual',
        'classification_date': '2026-01-12',
        'crypto_relevance': 'Low - Margin trading is an advanced feature',
        'geographic_scope': 'US',
        'scope_type': 'regulatory',
        'access_type': 'G',
        'official_doc_summary': 'Margin trading with leverage subject to CFTC regulations.',
        'official_link': 'https://www.cftc.gov/',
        'issuing_authority': 'CFTC',
        'standard_reference': 'Margin Trading Regulations'
    },
    'E-FUTURES': {
        'is_essential': False,
        'consumer': True,
        'full': True,
        'classification_method': 'manual',
        'classification_date': '2026-01-12',
        'crypto_relevance': 'Low - Futures trading is an advanced feature',
        'geographic_scope': 'global',
        'scope_type': 'regulatory',
        'access_type': 'G',
        'official_doc_summary': 'Futures and perpetual contract trading for advanced users.',
        'official_link': 'https://www.cmegroup.com/',
        'issuing_authority': 'CME Group',
        'standard_reference': 'Futures Contract Standards'
    },
}

print('MISE A JOUR COMPLETE DES 33 NOUVELLES NORMES')
print('=' * 70)

success = 0
errors = 0

for code, data in complete_norm_data.items():
    resp = requests.patch(
        f'{SUPABASE_URL}/rest/v1/norms?code=eq.{code}',
        headers=headers,
        json=data
    )

    if resp.status_code in [200, 204]:
        print(f'[OK] {code}: {len(data)} colonnes mises a jour')
        success += 1
    else:
        print(f'[ERR] {code}: {resp.status_code} - {resp.text[:100]}')
        errors += 1

print()
print('=' * 70)
print(f'RESULTAT: {success} normes mises a jour, {errors} erreurs')
