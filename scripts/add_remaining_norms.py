#!/usr/bin/env python3
"""Ajout des normes restantes pour combler toutes les lacunes"""
import requests
import time

from config_helper import SUPABASE_URL, SUPABASE_KEY, get_supabase_headers

headers = get_supabase_headers()

NEW_NORMS = [
    # =========================================================================
    # BRIDGE - Cross-chain (12 normes pour combler le gap majeur)
    # =========================================================================
    # Security Bridge (5)
    {'code': 'S-BRIDGE-AUDIT', 'pillar': 'S', 'title': 'Bridge Smart Contract Audit', 'description': 'Audit complet contrats bridge par firme reconnue', 'is_essential': True, 'official_link': 'https://consensys.io/diligence/', 'crypto_relevance': 'Critical - Bridge contracts are high-value targets'},
    {'code': 'S-BRIDGE-VALID', 'pillar': 'S', 'title': 'Bridge Validator Set', 'description': 'Set validateurs decentralise et diversifie', 'is_essential': True, 'official_link': 'https://ethereum.org/en/bridges/', 'crypto_relevance': 'Critical - Validator security is core to bridge safety'},
    {'code': 'S-BRIDGE-MPC', 'pillar': 'S', 'title': 'Bridge MPC Signatures', 'description': 'Signatures MPC pour operations bridge', 'is_essential': True, 'official_link': 'https://fireblocks.com/', 'crypto_relevance': 'Critical - Prevents single point of failure'},
    {'code': 'S-BRIDGE-LOCK', 'pillar': 'S', 'title': 'Bridge Lock Mechanism', 'description': 'Mecanisme verrouillage actifs securise', 'is_essential': True, 'official_link': 'https://ethereum.org/en/bridges/', 'crypto_relevance': 'Critical - Lock security protects bridged assets'},
    {'code': 'S-BRIDGE-PAUSE', 'pillar': 'S', 'title': 'Bridge Emergency Pause', 'description': 'Capacite pause urgence en cas d attaque', 'is_essential': True, 'official_link': 'https://docs.openzeppelin.com/', 'crypto_relevance': 'Critical - Emergency response capability'},

    # Anti-coercion Bridge (3)
    {'code': 'A-BRIDGE-LIMIT', 'pillar': 'A', 'title': 'Bridge Transfer Limits', 'description': 'Limites transfert par periode', 'is_essential': True, 'official_link': 'https://ethereum.org/en/bridges/', 'crypto_relevance': 'High - Limits damage from exploit'},
    {'code': 'A-BRIDGE-DELAY', 'pillar': 'A', 'title': 'Bridge Finality Delay', 'description': 'Delai finalite pour gros transferts', 'is_essential': True, 'official_link': 'https://ethereum.org/en/bridges/', 'crypto_relevance': 'High - Time to detect attacks'},
    {'code': 'A-BRIDGE-VERIFY', 'pillar': 'A', 'title': 'Bridge Destination Verify', 'description': 'Verification adresse destination', 'is_essential': True, 'official_link': 'https://ethereum.org/en/bridges/', 'crypto_relevance': 'High - Prevents wrong chain errors'},

    # Fiabilite Bridge (3)
    {'code': 'F-BRIDGE-TVL', 'pillar': 'F', 'title': 'Bridge TVL Tracking', 'description': 'Suivi TVL temps reel par chaine', 'is_essential': True, 'official_link': 'https://defillama.com/', 'crypto_relevance': 'High - Protocol health indicator'},
    {'code': 'F-BRIDGE-RATE', 'pillar': 'F', 'title': 'Bridge Success Rate', 'description': 'Taux succes transferts public', 'is_essential': True, 'official_link': 'https://defillama.com/', 'crypto_relevance': 'High - Reliability metric'},
    {'code': 'F-BRIDGE-TIME', 'pillar': 'F', 'title': 'Bridge Transfer Time', 'description': 'Temps transfert moyen affiche', 'is_essential': True, 'official_link': 'https://ethereum.org/en/bridges/', 'crypto_relevance': 'Medium - User expectation'},

    # Ecosysteme Bridge (3)
    {'code': 'E-BRIDGE-CHAINS', 'pillar': 'E', 'title': 'Bridge Supported Chains', 'description': 'Nombre blockchains supportees', 'is_essential': False, 'official_link': 'https://defillama.com/', 'crypto_relevance': 'Medium - Coverage'},
    {'code': 'E-BRIDGE-TOKEN', 'pillar': 'E', 'title': 'Bridge Token Support', 'description': 'Tokens supportes par chain', 'is_essential': False, 'official_link': 'https://defillama.com/', 'crypto_relevance': 'Medium - Asset variety'},
    {'code': 'E-BRIDGE-FEE', 'pillar': 'E', 'title': 'Bridge Fee Transparency', 'description': 'Frais bridge transparents', 'is_essential': True, 'official_link': 'https://ethereum.org/en/bridges/', 'crypto_relevance': 'High - Cost clarity'},

    # =========================================================================
    # WALLET - Fiabilite (3 normes pour combler le gap)
    # =========================================================================
    {'code': 'F-WALLET-SUPPORT', 'pillar': 'F', 'title': 'Wallet Customer Support', 'description': 'Support client disponible et reactif', 'is_essential': True, 'official_link': 'https://www.ccss.info/', 'crypto_relevance': 'High - User assistance'},
    {'code': 'F-WALLET-UPDATE', 'pillar': 'F', 'title': 'Wallet Firmware Updates', 'description': 'Mises a jour firmware regulieres', 'is_essential': True, 'official_link': 'https://www.ccss.info/', 'crypto_relevance': 'Critical - Security patches'},
    {'code': 'F-WALLET-WARRANTY', 'pillar': 'F', 'title': 'Wallet Warranty', 'description': 'Garantie produit minimum 2 ans', 'is_essential': False, 'official_link': 'https://ec.europa.eu/', 'crypto_relevance': 'Medium - Consumer protection'},

    # =========================================================================
    # DEX - Security (2 normes supplementaires)
    # =========================================================================
    {'code': 'S-DEX-AUDIT', 'pillar': 'S', 'title': 'DEX Smart Contract Audit', 'description': 'Audit smart contracts AMM par firme reconnue', 'is_essential': True, 'official_link': 'https://consensys.io/diligence/', 'crypto_relevance': 'Critical - Contract security'},
    {'code': 'S-DEX-ORACLE', 'pillar': 'S', 'title': 'DEX Price Oracle', 'description': 'Oracle prix TWAP ou Chainlink', 'is_essential': True, 'official_link': 'https://chain.link/', 'crypto_relevance': 'Critical - Price manipulation protection'},

    # =========================================================================
    # YIELD - Security (2 normes supplementaires)
    # =========================================================================
    {'code': 'S-YIELD-ACCESS', 'pillar': 'S', 'title': 'Yield Access Control', 'description': 'Controle acces fonctions admin', 'is_essential': True, 'official_link': 'https://docs.openzeppelin.com/', 'crypto_relevance': 'Critical - Prevents unauthorized changes'},
    {'code': 'S-YIELD-TIMELOCK', 'pillar': 'S', 'title': 'Yield Strategy Timelock', 'description': 'Timelock changement strategies', 'is_essential': True, 'official_link': 'https://docs.openzeppelin.com/', 'crypto_relevance': 'High - User exit time'},

    # =========================================================================
    # PERP - Security (2 normes supplementaires)
    # =========================================================================
    {'code': 'S-PERP-ACCESS', 'pillar': 'S', 'title': 'Perp DEX Access Control', 'description': 'Controle acces admin multisig', 'is_essential': True, 'official_link': 'https://safe.global/', 'crypto_relevance': 'Critical - Prevents unauthorized changes'},
    {'code': 'S-PERP-MONITOR', 'pillar': 'S', 'title': 'Perp DEX Monitoring', 'description': 'Monitoring temps reel positions', 'is_essential': True, 'official_link': 'https://forta.org/', 'crypto_relevance': 'High - Anomaly detection'},

    # =========================================================================
    # CARD - Crypto Card (4 normes supplementaires)
    # =========================================================================
    {'code': 'S-CARD-PCI', 'pillar': 'S', 'title': 'Crypto Card PCI DSS', 'description': 'Conformite PCI DSS pour carte', 'is_essential': True, 'official_link': 'https://www.pcisecuritystandards.org/', 'crypto_relevance': 'Critical - Card security'},
    {'code': 'S-CARD-EMV', 'pillar': 'S', 'title': 'Crypto Card EMV Chip', 'description': 'Puce EMV securisee', 'is_essential': True, 'official_link': 'https://www.emvco.com/', 'crypto_relevance': 'Critical - Transaction security'},
    {'code': 'F-CARD-CONVERT', 'pillar': 'F', 'title': 'Crypto Card Conversion Rate', 'description': 'Taux conversion crypto-fiat transparent', 'is_essential': True, 'official_link': 'https://www.visa.com/', 'crypto_relevance': 'High - Cost transparency'},
    {'code': 'F-CARD-CASHBACK', 'pillar': 'F', 'title': 'Crypto Card Rewards', 'description': 'Programme cashback transparent', 'is_essential': False, 'official_link': 'https://www.visa.com/', 'crypto_relevance': 'Medium - User benefits'},

    # =========================================================================
    # BANK - Crypto Bank (4 normes supplementaires)
    # =========================================================================
    {'code': 'S-BANK-CYBER', 'pillar': 'S', 'title': 'Crypto Bank Cybersecurity', 'description': 'Programme cybersecurite complet', 'is_essential': True, 'official_link': 'https://www.nist.gov/cyberframework', 'crypto_relevance': 'Critical - Bank security'},
    {'code': 'S-BANK-SOC2', 'pillar': 'S', 'title': 'Crypto Bank SOC 2', 'description': 'Certification SOC 2 Type II', 'is_essential': True, 'official_link': 'https://www.aicpa.org/', 'crypto_relevance': 'Critical - Security audit'},
    {'code': 'E-BANK-SAVINGS', 'pillar': 'E', 'title': 'Crypto Bank Savings', 'description': 'Compte epargne crypto', 'is_essential': False, 'official_link': 'https://www.eba.europa.eu/', 'crypto_relevance': 'Medium - User feature'},
    {'code': 'E-BANK-LOANS', 'pillar': 'E', 'title': 'Crypto Bank Loans', 'description': 'Prets adosses crypto', 'is_essential': False, 'official_link': 'https://www.eba.europa.eu/', 'crypto_relevance': 'Medium - Financial services'},
]

def check_duplicate(code):
    resp = requests.get(
        f'{SUPABASE_URL}/rest/v1/norms?code=eq.{code}',
        headers={'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'}
    )
    return len(resp.json()) > 0 if resp.status_code == 200 else False

def main():
    print('=' * 80)
    print('AJOUT DES NORMES RESTANTES')
    print(f'Total: {len(NEW_NORMS)} normes')
    print('=' * 80)

    added = 0
    skipped = 0
    errors = 0

    for norm in NEW_NORMS:
        code = norm['code']

        if check_duplicate(code):
            print(f'[SKIP] {code}')
            skipped += 1
            continue

        full_norm = {
            'code': code,
            'pillar': norm['pillar'],
            'title': norm['title'],
            'description': norm['description'],
            'is_essential': norm.get('is_essential', True),
            'consumer': True,
            'full': True,
            'classification_method': 'manual',
            'classification_date': '2026-01-12',
            'geographic_scope': 'global',
            'scope_type': 'technical',
            'access_type': 'G',
            'official_link': norm.get('official_link', 'https://www.ccss.info/'),
            'crypto_relevance': norm.get('crypto_relevance', f'High - {norm["title"]}'),
            'official_doc_summary': norm['description'],
            'issuing_authority': 'Industry Best Practice',
            'standard_reference': norm['title']
        }

        resp = requests.post(
            f'{SUPABASE_URL}/rest/v1/norms',
            headers=headers,
            json=full_norm
        )

        if resp.status_code in [200, 201]:
            print(f'[OK] {code}: {norm["title"][:40]}')
            added += 1
        else:
            print(f'[ERR] {code}: {resp.status_code}')
            errors += 1

        time.sleep(0.1)

    print()
    print('=' * 80)
    print(f'RESULTAT: {added} ajoutees, {skipped} existantes, {errors} erreurs')

if __name__ == '__main__':
    main()
