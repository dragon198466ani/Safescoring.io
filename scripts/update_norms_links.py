#!/usr/bin/env python3
"""Update new norms with official documentation links"""
import requests

from config_helper import SUPABASE_URL, SUPABASE_KEY, get_supabase_headers

headers = get_supabase_headers()

# Official links for new norms
norm_links = {
    # S-DEFI Security norms
    'S-SC-AUDIT': {
        'official_link': 'https://consensys.io/diligence/',
        'issuing_authority': 'Industry Best Practice',
        'standard_reference': 'Smart Contract Security Audit Standards'
    },
    'S-SC-REENTR': {
        'official_link': 'https://swcregistry.io/docs/SWC-107',
        'issuing_authority': 'Smart Contract Weakness Classification',
        'standard_reference': 'SWC-107 Reentrancy'
    },
    'S-SC-FLASH': {
        'official_link': 'https://www.paradigm.xyz/2020/11/so-you-want-to-use-a-flash-loan',
        'issuing_authority': 'Paradigm Research',
        'standard_reference': 'Flash Loan Security Best Practices'
    },
    'S-SC-ORACLE': {
        'official_link': 'https://chain.link/education-hub/oracle-manipulation',
        'issuing_authority': 'Chainlink',
        'standard_reference': 'Oracle Security Guidelines'
    },
    'S-SC-PROXY': {
        'official_link': 'https://docs.openzeppelin.com/upgrades-plugins/1.x/proxies',
        'issuing_authority': 'OpenZeppelin',
        'standard_reference': 'Proxy Upgrade Pattern'
    },
    'S-SC-ACCESS': {
        'official_link': 'https://docs.openzeppelin.com/contracts/4.x/access-control',
        'issuing_authority': 'OpenZeppelin',
        'standard_reference': 'Access Control Standards'
    },
    'S-SC-OVERFLOW': {
        'official_link': 'https://swcregistry.io/docs/SWC-101',
        'issuing_authority': 'Smart Contract Weakness Classification',
        'standard_reference': 'SWC-101 Integer Overflow'
    },
    'S-SC-FRONTRUN': {
        'official_link': 'https://www.flashbots.net/',
        'issuing_authority': 'Flashbots',
        'standard_reference': 'MEV Protection Standards'
    },
    'S-SC-TIMELOCK': {
        'official_link': 'https://docs.openzeppelin.com/contracts/4.x/api/governance#TimelockController',
        'issuing_authority': 'OpenZeppelin',
        'standard_reference': 'TimelockController'
    },
    'S-SC-MULTISIG': {
        'official_link': 'https://safe.global/',
        'issuing_authority': 'Safe (Gnosis Safe)',
        'standard_reference': 'Multi-signature Security'
    },

    # S-BRIDGE Security norms
    'S-BR-VALID': {
        'official_link': 'https://ethereum.org/en/developers/docs/bridges/',
        'issuing_authority': 'Ethereum Foundation',
        'standard_reference': 'Bridge Architecture Guidelines'
    },
    'S-BR-RELAY': {
        'official_link': 'https://layerzero.network/',
        'issuing_authority': 'LayerZero',
        'standard_reference': 'Cross-chain Messaging Protocol'
    },
    'S-BR-LOCK': {
        'official_link': 'https://ethereum.org/en/developers/docs/bridges/#how-do-bridges-work',
        'issuing_authority': 'Ethereum Foundation',
        'standard_reference': 'Lock and Mint Mechanism'
    },
    'S-BR-MINT': {
        'official_link': 'https://wbtc.network/',
        'issuing_authority': 'WBTC Network',
        'standard_reference': 'Wrapped Token Standards'
    },
    'S-BR-THRESH': {
        'official_link': 'https://threshold.network/',
        'issuing_authority': 'Threshold Network',
        'standard_reference': 'Threshold Signatures (TSS)'
    },

    # F-DEFI Reliability norms
    'F-TVL-TRACK': {
        'official_link': 'https://defillama.com/',
        'issuing_authority': 'DefiLlama',
        'standard_reference': 'TVL Tracking Standard'
    },
    'F-DEFI-INS': {
        'official_link': 'https://nexusmutual.io/',
        'issuing_authority': 'Nexus Mutual',
        'standard_reference': 'DeFi Insurance Coverage'
    },
    'F-INCIDENT': {
        'official_link': 'https://www.nist.gov/cyberframework',
        'issuing_authority': 'NIST',
        'standard_reference': 'NIST Cybersecurity Framework - Respond'
    },
    'F-POSTMORTEM': {
        'official_link': 'https://rekt.news/',
        'issuing_authority': 'Industry Best Practice',
        'standard_reference': 'Post-Mortem Disclosure Standards'
    },
    'F-BUGBOUNTY': {
        'official_link': 'https://immunefi.com/',
        'issuing_authority': 'Immunefi',
        'standard_reference': 'Bug Bounty Program Standards'
    },
    'F-MONITOR': {
        'official_link': 'https://forta.org/',
        'issuing_authority': 'Forta Network',
        'standard_reference': 'Real-time Security Monitoring'
    },

    # F-CEX Reliability norms
    'F-POR': {
        'official_link': 'https://chain.link/proof-of-reserve',
        'issuing_authority': 'Chainlink',
        'standard_reference': 'Proof of Reserve (PoR)'
    },
    'F-SEGREG': {
        'official_link': 'https://www.esma.europa.eu/sites/default/files/library/esma70-156-5153_final_report_guidelines_on_client_money.pdf',
        'issuing_authority': 'ESMA',
        'standard_reference': 'Client Asset Segregation'
    },
    'F-COLD': {
        'official_link': 'https://www.ccss.info/',
        'issuing_authority': 'CCSS',
        'standard_reference': 'Cryptocurrency Security Standard'
    },
    'F-INS-FUND': {
        'official_link': 'https://www.binance.com/en/support/faq/introduction-to-secure-asset-fund-for-users-safu',
        'issuing_authority': 'Industry Best Practice',
        'standard_reference': 'SAFU Insurance Fund Model'
    },
    'F-AUDIT-FIN': {
        'official_link': 'https://www.aicpa.org/resources/landing/soc-2',
        'issuing_authority': 'AICPA',
        'standard_reference': 'SOC 2 Type II Audit'
    },
    'F-LICENSE': {
        'official_link': 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32023R1114',
        'issuing_authority': 'European Union',
        'standard_reference': 'MiCA Regulation (EU) 2023/1114'
    },

    # E-CEX Ecosystem norms
    'E-FIAT-ON': {
        'official_link': 'https://www.moonpay.com/',
        'issuing_authority': 'Industry Standard',
        'standard_reference': 'Fiat On-ramp Integration'
    },
    'E-FIAT-OFF': {
        'official_link': 'https://www.circle.com/',
        'issuing_authority': 'Industry Standard',
        'standard_reference': 'Fiat Off-ramp Integration'
    },
    'E-PAIRS': {
        'official_link': 'https://www.coingecko.com/',
        'issuing_authority': 'Industry Standard',
        'standard_reference': 'Trading Pair Listings'
    },
    'E-SPOT': {
        'official_link': 'https://www.investopedia.com/terms/s/spottrade.asp',
        'issuing_authority': 'Financial Industry',
        'standard_reference': 'Spot Trading Definition'
    },
    'E-MARGIN': {
        'official_link': 'https://www.cftc.gov/',
        'issuing_authority': 'CFTC',
        'standard_reference': 'Margin Trading Regulations'
    },
    'E-FUTURES': {
        'official_link': 'https://www.cmegroup.com/',
        'issuing_authority': 'CME Group',
        'standard_reference': 'Futures Contract Standards'
    },
}

print('MISE A JOUR DES LIENS OFFICIELS')
print('=' * 60)

success = 0
errors = 0

for code, data in norm_links.items():
    resp = requests.patch(
        f'{SUPABASE_URL}/rest/v1/norms?code=eq.{code}',
        headers=headers,
        json=data
    )

    if resp.status_code in [200, 204]:
        print(f'[OK] {code}: {data["official_link"][:50]}...')
        success += 1
    else:
        print(f'[ERR] {code}: {resp.status_code}')
        errors += 1

print()
print('=' * 60)
print(f'RESULTAT: {success} mis a jour, {errors} erreurs')
