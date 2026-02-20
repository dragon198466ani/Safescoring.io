#!/usr/bin/env python3
"""Add 33 new norms with applicability to Supabase"""
import requests

from config_helper import SUPABASE_URL, SUPABASE_KEY, get_supabase_headers

headers = get_supabase_headers()

# All new norms
new_norms = [
    # S-DEFI (Security DeFi) - 10 norms
    {'code': 'S-SC-AUDIT', 'pillar': 'S', 'title': 'Smart Contract Audit', 'description': 'Audit externe des smart contracts par firme reconnue'},
    {'code': 'S-SC-REENTR', 'pillar': 'S', 'title': 'Reentrancy Protection', 'description': 'Protection contre les attaques de reentrancy'},
    {'code': 'S-SC-FLASH', 'pillar': 'S', 'title': 'Flash Loan Protection', 'description': 'Protection contre les attaques flash loan'},
    {'code': 'S-SC-ORACLE', 'pillar': 'S', 'title': 'Oracle Manipulation Protection', 'description': 'Protection contre manipulation des oracles de prix'},
    {'code': 'S-SC-PROXY', 'pillar': 'S', 'title': 'Proxy Upgrade Security', 'description': 'Securite des mecanismes upgrade proxy'},
    {'code': 'S-SC-ACCESS', 'pillar': 'S', 'title': 'Access Control', 'description': 'Controle acces strict sur fonctions admin'},
    {'code': 'S-SC-OVERFLOW', 'pillar': 'S', 'title': 'Integer Overflow Protection', 'description': 'Protection overflow/underflow'},
    {'code': 'S-SC-FRONTRUN', 'pillar': 'S', 'title': 'Front-running Protection', 'description': 'Protection front-running'},
    {'code': 'S-SC-TIMELOCK', 'pillar': 'S', 'title': 'Timelock on Admin', 'description': 'Timelock sur fonctions admin'},
    {'code': 'S-SC-MULTISIG', 'pillar': 'S', 'title': 'Multi-sig Admin', 'description': 'Multi-signature pour operations admin critiques'},

    # F-DEFI (Fiabilite DeFi) - 6 norms
    {'code': 'F-TVL-TRACK', 'pillar': 'F', 'title': 'TVL Tracking', 'description': 'Suivi TVL en temps reel'},
    {'code': 'F-DEFI-INS', 'pillar': 'F', 'title': 'DeFi Insurance', 'description': 'Couverture assurance DeFi'},
    {'code': 'F-INCIDENT', 'pillar': 'F', 'title': 'Incident Response Plan', 'description': 'Plan de reponse incident documente'},
    {'code': 'F-POSTMORTEM', 'pillar': 'F', 'title': 'Post-Mortem Public', 'description': 'Publication post-mortem publique apres incidents'},
    {'code': 'F-BUGBOUNTY', 'pillar': 'F', 'title': 'Bug Bounty Active', 'description': 'Programme bug bounty actif'},
    {'code': 'F-MONITOR', 'pillar': 'F', 'title': '24/7 Monitoring', 'description': 'Monitoring temps reel 24/7'},

    # F-CEX (Fiabilite CEX) - 6 norms
    {'code': 'F-POR', 'pillar': 'F', 'title': 'Proof of Reserves', 'description': 'Preuve de reserves verifiable'},
    {'code': 'F-SEGREG', 'pillar': 'F', 'title': 'Fund Segregation', 'description': 'Segregation fonds clients vs operationnels'},
    {'code': 'F-COLD', 'pillar': 'F', 'title': 'Cold Storage Ratio', 'description': 'Ratio minimum fonds en cold storage'},
    {'code': 'F-INS-FUND', 'pillar': 'F', 'title': 'Insurance Fund', 'description': 'Fonds assurance pour pertes utilisateurs'},
    {'code': 'F-AUDIT-FIN', 'pillar': 'F', 'title': 'Financial Audit', 'description': 'Audit financier externe annuel'},
    {'code': 'F-LICENSE', 'pillar': 'F', 'title': 'Regulatory License', 'description': 'Licence regulateur MiCA/MSB/VASP'},

    # E-CEX (Ecosysteme CEX) - 6 norms
    {'code': 'E-FIAT-ON', 'pillar': 'E', 'title': 'Fiat On-ramp', 'description': 'Depot fiat virement/carte'},
    {'code': 'E-FIAT-OFF', 'pillar': 'E', 'title': 'Fiat Off-ramp', 'description': 'Retrait fiat vers banque'},
    {'code': 'E-PAIRS', 'pillar': 'E', 'title': 'Trading Pairs', 'description': 'Nombre paires trading >100'},
    {'code': 'E-SPOT', 'pillar': 'E', 'title': 'Spot Trading', 'description': 'Trading spot disponible'},
    {'code': 'E-MARGIN', 'pillar': 'E', 'title': 'Margin Trading', 'description': 'Trading sur marge'},
    {'code': 'E-FUTURES', 'pillar': 'E', 'title': 'Futures Trading', 'description': 'Trading futures/perpetuels'},

    # S-BRIDGE (Security Bridge) - 5 norms
    {'code': 'S-BR-VALID', 'pillar': 'S', 'title': 'Bridge Validators', 'description': 'Validateurs decentralises pour bridge'},
    {'code': 'S-BR-RELAY', 'pillar': 'S', 'title': 'Secure Relay', 'description': 'Relais securise avec verification crypto'},
    {'code': 'S-BR-LOCK', 'pillar': 'S', 'title': 'Lock Mechanism', 'description': 'Mecanisme verrouillage securise'},
    {'code': 'S-BR-MINT', 'pillar': 'S', 'title': 'Mint Control', 'description': 'Controle emission wrapped tokens'},
    {'code': 'S-BR-THRESH', 'pillar': 'S', 'title': 'Threshold Signatures', 'description': 'Signatures a seuil TSS/MPC'},
]

print('AJOUT DES 33 NOUVELLES NORMES')
print('=' * 60)

success = 0
exists = 0
errors = 0

for norm in new_norms:
    payload = {
        'code': norm['code'],
        'pillar': norm['pillar'],
        'title': norm['title'],
        'description': norm['description'],
    }

    resp = requests.post(
        f'{SUPABASE_URL}/rest/v1/norms',
        headers=headers,
        json=payload
    )

    if resp.status_code in [200, 201]:
        print(f'[NEW] {norm["code"]}: {norm["title"]}')
        success += 1
    elif resp.status_code == 409 or 'duplicate' in resp.text.lower():
        print(f'[OK]  {norm["code"]}: existe deja')
        exists += 1
    else:
        print(f'[ERR] {norm["code"]}: {resp.status_code}')
        errors += 1

print()
print('=' * 60)
print(f'RESULTAT: {success} nouvelles, {exists} existantes, {errors} erreurs')
