#!/usr/bin/env python3
"""
Comprehensive Applicability Analysis Script
Analyzes ALL product types against ALL norms using structured criteria comparison
Generates detailed justifications (max 5000 words) stored in Supabase
"""
import os
import sys
import json
import requests
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv
import re

load_dotenv(Path('c:/Users/alexa/Desktop/SafeScoring/.env'))

SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')
headers = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'}
headers_post = {**headers, 'Content-Type': 'application/json', 'Prefer': 'return=minimal'}

# ============================================================================
# CRITERIA MAPPING: Which norms apply to which product characteristics
# ============================================================================

# Pillar definitions
PILLAR_DESCRIPTIONS = {
    'S': 'Security - Protection against attacks, key security, authentication',
    'A': 'Adversity - Physical resilience, backup, recovery, durability',
    'F': 'Fidelity - Standards compliance, interoperability, data integrity',
    'E': 'Ecosystem - Integration, compatibility, network support'
}

# Hardware-specific norm patterns
HARDWARE_NORMS = [
    'secure element', 'tamper', 'physical', 'esd', 'emc', 'temperature',
    'humidity', 'drop', 'shock', 'vibration', 'mil-std', 'ip67', 'ip68',
    'water resist', 'fire resist', 'dust', 'seal', 'enclosure', 'pcb',
    'chip', 'firmware', 'bootloader', 'jtag', 'swd', 'debug', 'fuse'
]

# Software/digital norm patterns
SOFTWARE_NORMS = [
    'api', 'sdk', 'library', 'framework', 'protocol', 'encryption',
    'hashing', 'signature', 'key derivation', 'memory', 'buffer',
    'injection', 'xss', 'csrf', 'authentication', 'authorization',
    'session', 'token', 'jwt', 'oauth', 'ssl', 'tls', 'certificate'
]

# Custodial-specific norm patterns
CUSTODIAL_NORMS = [
    'kyc', 'aml', 'compliance', 'regulation', 'license', 'audit',
    'insurance', 'reserve', 'custody', 'fiduciary', 'segregation',
    'proof of reserves', 'cold storage', 'hot wallet', 'withdrawal',
    'deposit', 'user funds', 'segregated accounts'
]

# DeFi-specific norm patterns
DEFI_NORMS = [
    'smart contract', 'solidity', 'evm', 'gas', 'reentrancy', 'flash loan',
    'oracle', 'price feed', 'liquidation', 'collateral', 'amm', 'liquidity',
    'slippage', 'mev', 'front-running', 'sandwich', 'governance', 'dao',
    'timelock', 'multisig', 'proxy', 'upgradeable'
]

# Self-custody wallet patterns
WALLET_NORMS = [
    'seed phrase', 'mnemonic', 'bip39', 'bip32', 'bip44', 'derivation',
    'private key', 'public key', 'address', 'transaction signing',
    'hardware wallet', 'paper wallet', 'backup', 'recovery', 'passphrase',
    'pin', 'biometric', 'screen verification'
]

# ============================================================================
# APPLICABILITY ANALYSIS ENGINE
# ============================================================================

def analyze_applicability(product_type, norm):
    """
    Comprehensive analysis of whether a norm applies to a product type.
    Returns (is_applicable: bool, reason: str, applicability_reason: str)
    """
    type_id = product_type['id']
    type_name = product_type['name']
    definition = product_type.get('definition') or ''
    includes = product_type.get('includes') or []
    excludes = product_type.get('excludes') or []
    risk_factors = product_type.get('risk_factors') or []
    keywords = product_type.get('keywords') or []
    is_hardware = product_type.get('is_hardware', False)
    is_custodial = product_type.get('is_custodial', False)
    is_electronic = product_type.get('is_electronic', False)

    norm_id = norm['id']
    code = (norm.get('code') or '').upper()
    title = (norm.get('title') or '').lower()
    pillar = (norm.get('pillar') or '').upper()
    target_type = (norm.get('target_type') or '').lower()
    summary = (norm.get('summary') or '').lower()
    description = (norm.get('description') or '').lower()

    # Combined text for keyword matching
    norm_text = f"{title} {description} {summary}"
    type_text = f"{definition} {' '.join(includes) if isinstance(includes, list) else str(includes)}"

    # ========================================================================
    # PHASE 1: Target Type Analysis
    # ========================================================================

    if target_type == 'physical' and not is_hardware:
        return False, f"Norme physique non applicable", f"La norme {code} cible explicitement les produits physiques (target_type='physical'). {type_name} est un produit {'logiciel' if not is_electronic else 'électronique non-hardware'}, donc cette norme n'est pas applicable."

    if target_type == 'digital' and is_hardware and not is_electronic:
        return False, f"Norme digitale, produit physique non-électronique", f"La norme {code} cible les produits digitaux (target_type='digital'). {type_name} est un produit physique non-électronique (ex: backup métal), donc cette norme n'est pas applicable."

    # ========================================================================
    # PHASE 2: Pillar-Based Analysis
    # ========================================================================

    pillar_analysis = ""

    if pillar == 'S':  # Security
        pillar_analysis = f"Pilier Sécurité (S): Cette norme concerne la protection contre les attaques et la sécurité des clés."

        # Hardware security norms
        if any(hw in norm_text for hw in ['secure element', 'tamper', 'hardware security']):
            if is_hardware:
                return True, "Applicable - Sécurité hardware", f"{pillar_analysis} {type_name} est un produit hardware qui doit implémenter des mesures de sécurité physique comme le Secure Element et la protection contre la falsification."
            else:
                return False, "Non applicable - Norme hardware uniquement", f"{pillar_analysis} Cette norme concerne la sécurité hardware (Secure Element, tamper protection). {type_name} n'est pas un produit hardware physique."

        # Cryptographic security - applicable to all
        if any(crypto in norm_text for crypto in ['aes', 'sha', 'ecdsa', 'eddsa', 'encryption', 'hashing']):
            return True, "Applicable - Cryptographie", f"{pillar_analysis} Les standards cryptographiques (AES, SHA, ECDSA, EdDSA) s'appliquent à tous les produits crypto qui gèrent des clés ou signent des transactions. {type_name} doit implémenter ces algorithmes de manière sécurisée."

        # Authentication norms
        if any(auth in norm_text for auth in ['pin', 'password', 'biometric', 'authentication', '2fa', 'mfa']):
            if is_custodial or 'wallet' in type_name.lower():
                return True, "Applicable - Authentification", f"{pillar_analysis} Les normes d'authentification s'appliquent aux produits qui gèrent l'accès utilisateur. {type_name} nécessite des mécanismes d'authentification robustes."
            elif any(cat in type_name.lower() for cat in ['protocol', 'oracle', 'indexer', 'explorer']):
                return False, "Non applicable - Infrastructure", f"{pillar_analysis} Cette norme d'authentification utilisateur n'est pas applicable à {type_name} qui est un service d'infrastructure sans authentification utilisateur directe."

    elif pillar == 'A':  # Adversity
        pillar_analysis = f"Pilier Adversité (A): Cette norme concerne la résilience physique, les backups et la récupération."

        # Physical durability norms
        if any(phys in norm_text for phys in ['water', 'fire', 'temperature', 'drop', 'shock', 'humidity', 'ip67', 'ip68', 'mil-std']):
            if is_hardware:
                return True, "Applicable - Durabilité physique", f"{pillar_analysis} Les tests de résistance physique (eau, feu, chocs) s'appliquent aux produits hardware comme {type_name}. Ces tests vérifient la durabilité du matériel dans des conditions extrêmes."
            else:
                return False, "Non applicable - Norme physique", f"{pillar_analysis} Les tests de résistance physique ne s'appliquent pas à {type_name} qui est un produit logiciel/service sans composant physique à tester."

        # Backup/Recovery norms
        if any(backup in norm_text for backup in ['backup', 'recovery', 'seed', 'mnemonic', 'restore']):
            if 'wallet' in type_name.lower() or 'backup' in type_name.lower():
                return True, "Applicable - Backup/Récupération", f"{pillar_analysis} Les normes de backup et récupération sont essentielles pour {type_name}. La capacité à restaurer l'accès aux fonds après une perte est critique."
            elif is_custodial:
                return True, "Applicable - Récupération custodiale", f"{pillar_analysis} Les services custodials comme {type_name} doivent avoir des procédures de backup et récupération robustes pour protéger les fonds des utilisateurs."
            else:
                return False, "Non applicable - Pas de gestion de clés", f"{pillar_analysis} {type_name} ne gère pas directement les clés privées ou seed phrases des utilisateurs, donc les normes de backup ne s'appliquent pas directement."

    elif pillar == 'F':  # Fidelity
        pillar_analysis = f"Pilier Fidélité (F): Cette norme concerne la conformité aux standards et l'intégrité des données."

        # BIP standards
        if code.startswith('BIP') or any(bip in norm_text for bip in ['bip39', 'bip32', 'bip44', 'bip84', 'bip141']):
            if 'wallet' in type_name.lower() or 'backup' in type_name.lower():
                return True, "Applicable - Standard BIP", f"{pillar_analysis} Les standards BIP (Bitcoin Improvement Proposals) définissent la gestion des clés et adresses. {type_name} doit implémenter ces standards pour assurer l'interopérabilité."
            else:
                return False, "Non applicable - Pas de dérivation de clés", f"{pillar_analysis} Les standards BIP concernent la dérivation des clés et adresses. {type_name} n'implémente pas directement ces fonctions de wallet."

        # EIP/ERC standards
        if code.startswith('EIP') or code.startswith('ERC'):
            if any(eth in type_text.lower() for eth in ['ethereum', 'evm', 'erc', 'defi', 'dapp', 'smart contract']):
                return True, "Applicable - Standard Ethereum", f"{pillar_analysis} Les standards EIP/ERC définissent les interfaces et protocoles Ethereum. {type_name} interagit avec l'écosystème Ethereum et doit supporter ces standards."
            else:
                return False, "Non applicable - Pas d'interaction Ethereum", f"{pillar_analysis} {type_name} n'interagit pas directement avec l'écosystème Ethereum, donc les standards EIP/ERC ne s'appliquent pas."

    elif pillar == 'E':  # Ecosystem
        pillar_analysis = f"Pilier Écosystème (E): Cette norme concerne l'intégration et la compatibilité avec l'écosystème."

        # Multi-chain support
        if any(chain in norm_text for chain in ['multi-chain', 'cross-chain', 'bridge', 'interoperability']):
            if any(cross in type_text.lower() for cross in ['cross-chain', 'bridge', 'multi-chain', 'interoperability']):
                return True, "Applicable - Interopérabilité cross-chain", f"{pillar_analysis} {type_name} opère dans un contexte cross-chain et doit respecter les normes d'interopérabilité pour assurer des transferts sécurisés entre chaînes."
            elif 'wallet' in type_name.lower():
                return True, "Applicable - Support multi-chain", f"{pillar_analysis} Les wallets modernes comme {type_name} doivent supporter plusieurs blockchains. Cette norme définit les exigences d'interopérabilité."

    # ========================================================================
    # PHASE 3: Norm Code Pattern Analysis
    # ========================================================================

    # ISO standards
    if code.startswith('ISO'):
        if '27001' in code or '27002' in code or '27001' in norm_text:
            if is_custodial or 'institutional' in type_name.lower():
                return True, "Applicable - ISO 27001 sécurité organisationnelle", f"La norme ISO 27001/27002 définit les systèmes de management de la sécurité de l'information. {type_name} en tant que service custodial/institutionnel doit implémenter ces contrôles de sécurité organisationnels."
            else:
                return False, "Non applicable - Standard organisationnel", f"ISO 27001/27002 est un standard de management de la sécurité pour les organisations. {type_name} est un produit/protocole décentralisé qui n'a pas d'organisation centralisée responsable de la conformité."

        if '15408' in code or 'common criteria' in norm_text:
            if is_hardware:
                return True, "Applicable - Common Criteria (ISO 15408)", f"ISO 15408 (Common Criteria) définit les critères d'évaluation de la sécurité des produits IT. {type_name} en tant que produit hardware peut obtenir une certification CC (EAL1 à EAL7)."
            else:
                return False, "Non applicable - Certification hardware", f"La certification Common Criteria (ISO 15408) s'applique principalement aux produits hardware et aux systèmes d'exploitation. {type_name} est un produit logiciel/service qui n'est généralement pas soumis à cette certification."

    # NIST standards
    if code.startswith('NIST'):
        if 'fips 140' in norm_text or 'fips-140' in code.lower():
            if is_hardware or 'institutional' in type_name.lower():
                return True, "Applicable - FIPS 140 modules crypto", f"FIPS 140-2/140-3 certifie les modules cryptographiques. {type_name} qui manipule des clés sensibles bénéficie de cette certification pour garantir la sécurité des opérations crypto."
            else:
                return False, "Non applicable - Certification module crypto", f"FIPS 140 certifie les modules cryptographiques hardware. {type_name} utilise des bibliothèques crypto mais n'implémente pas de module certifiable FIPS."

        if 'sp 800' in norm_text or 'framework' in norm_text:
            if is_custodial:
                return True, "Applicable - Framework NIST", f"Les frameworks NIST (SP 800-xx) fournissent des guidelines de sécurité. {type_name} en tant que service custodial doit suivre ces recommandations pour sécuriser les données utilisateurs."
            else:
                return False, "Non applicable - Guidelines organisationnelles", f"Les frameworks NIST sont des guidelines pour les organisations. {type_name} en tant que produit décentralisé n'a pas d'obligation directe de conformité NIST."

    # Regulatory norms
    if code.startswith('REG'):
        if is_custodial:
            return True, "Applicable - Régulation", f"Les régulations crypto (MiCA, DORA, etc.) s'appliquent aux services custodials et exchanges. {type_name} doit se conformer aux exigences réglementaires applicables dans chaque juridiction."
        else:
            return False, "Non applicable - Service non-custodial", f"Les régulations concernent principalement les services custodials et les intermédiaires financiers. {type_name} est un service non-custodial ou un protocole décentralisé qui n'est pas directement soumis à ces régulations."

    # OWASP/Security standards
    if code.startswith('OWASP'):
        if 'api' in type_text.lower() or 'web' in type_text.lower() or is_custodial:
            return True, "Applicable - Sécurité web/API", f"Les standards OWASP définissent les meilleures pratiques de sécurité web et API. {type_name} expose des interfaces web/API et doit se protéger contre les vulnérabilités OWASP Top 10."
        else:
            return False, "Non applicable - Pas d'interface web", f"{type_name} n'expose pas d'interface web ou API directe aux utilisateurs, donc les standards OWASP de sécurité web ne s'appliquent pas directement."

    # DeFi standards
    if code.startswith('DEFI'):
        if any(defi in type_text.lower() for defi in ['defi', 'lending', 'dex', 'amm', 'liquidity', 'yield', 'staking']):
            return True, "Applicable - Protocole DeFi", f"Les normes DeFi s'appliquent directement à {type_name} qui est un protocole de finance décentralisée. Ces normes définissent les bonnes pratiques de sécurité des smart contracts et de gestion des risques."
        elif 'wallet' in type_name.lower():
            return True, "Applicable - Interaction DeFi", f"Les wallets comme {type_name} interagissent avec les protocoles DeFi. Cette norme définit les exigences pour une interaction sécurisée avec les protocoles DeFi."
        else:
            return False, "Non applicable - Pas un protocole DeFi", f"{type_name} n'est pas un protocole DeFi et n'interagit pas directement avec des smart contracts DeFi."

    # ========================================================================
    # PHASE 4: Keyword-Based Analysis
    # ========================================================================

    # Hardware-specific keywords
    hardware_match = sum(1 for hw in HARDWARE_NORMS if hw in norm_text)
    if hardware_match >= 2:
        if is_hardware:
            return True, "Applicable - Spécifications hardware", f"Cette norme contient plusieurs références aux spécifications hardware ({hardware_match} correspondances). {type_name} est un produit hardware qui doit répondre à ces exigences techniques."
        else:
            return False, "Non applicable - Norme hardware", f"Cette norme est spécifique aux produits hardware ({hardware_match} références hardware détectées). {type_name} n'est pas un produit hardware."

    # Custodial-specific keywords
    custodial_match = sum(1 for cust in CUSTODIAL_NORMS if cust in norm_text)
    if custodial_match >= 2:
        if is_custodial:
            return True, "Applicable - Service custodial", f"Cette norme concerne les services custodials ({custodial_match} correspondances). {type_name} est un service custodial qui doit se conformer à ces exigences."
        else:
            return False, "Non applicable - Norme custodiale", f"Cette norme est spécifique aux services custodials ({custodial_match} références custodiales). {type_name} est un service non-custodial."

    # DeFi-specific keywords
    defi_match = sum(1 for d in DEFI_NORMS if d in norm_text)
    if defi_match >= 2:
        if any(defi in type_name.lower() for defi in ['defi', 'lending', 'dex', 'amm', 'yield', 'bridge']):
            return True, "Applicable - Protocole DeFi", f"Cette norme concerne les protocoles DeFi ({defi_match} correspondances). {type_name} est un protocole DeFi qui doit implémenter ces exigences de sécurité."
        elif 'wallet' in type_name.lower():
            return True, "Applicable - Interaction DeFi wallet", f"Cette norme DeFi s'applique aussi aux wallets qui interagissent avec les protocoles DeFi. {type_name} doit pouvoir vérifier et signer des transactions DeFi de manière sécurisée."

    # Wallet-specific keywords
    wallet_match = sum(1 for w in WALLET_NORMS if w in norm_text)
    if wallet_match >= 2:
        if 'wallet' in type_name.lower() or 'backup' in type_name.lower():
            return True, "Applicable - Gestion des clés wallet", f"Cette norme concerne la gestion des clés et wallets ({wallet_match} correspondances). {type_name} implémente ces fonctions de gestion des clés privées."
        else:
            return False, "Non applicable - Norme wallet", f"Cette norme est spécifique aux wallets et à la gestion des clés ({wallet_match} références). {type_name} ne gère pas directement les clés privées des utilisateurs."

    # ========================================================================
    # PHASE 5: Default Analysis Based on Product Category
    # ========================================================================

    # Categorize the product type
    is_wallet = 'wallet' in type_name.lower() or 'backup' in type_name.lower()
    is_defi = any(d in type_name.lower() for d in ['defi', 'lending', 'dex', 'amm', 'yield', 'staking', 'bridge'])
    is_exchange = 'exchange' in type_name.lower() or 'trading' in type_name.lower()
    is_infrastructure = any(i in type_name.lower() for i in ['oracle', 'node', 'indexer', 'layer', 'validator'])

    # Generate default applicability based on category and pillar
    if pillar == 'S':
        if is_wallet or is_exchange or is_custodial:
            return True, "Applicable - Sécurité générale", f"Les normes de sécurité (Pilier S) s'appliquent à {type_name} qui gère des actifs ou des accès utilisateurs. La sécurité est fondamentale pour ce type de produit."
        elif is_defi:
            return True, "Applicable - Sécurité smart contract", f"Les normes de sécurité s'appliquent aux protocoles DeFi comme {type_name}. La sécurité des smart contracts et des fonds utilisateurs est critique."
        elif is_infrastructure:
            return True, "Applicable - Sécurité infrastructure", f"Les normes de sécurité s'appliquent à l'infrastructure blockchain comme {type_name}. Un composant d'infrastructure compromis peut affecter tout l'écosystème."

    elif pillar == 'A':
        if is_wallet and is_hardware:
            return True, "Applicable - Résilience hardware wallet", f"Les normes d'adversité (Pilier A) s'appliquent aux hardware wallets comme {type_name}. La durabilité physique et les capacités de backup sont essentielles."
        elif 'backup' in type_name.lower():
            return True, "Applicable - Solution de backup", f"Les normes d'adversité sont au cœur des solutions de backup comme {type_name}. La résilience et la durabilité sont les fonctions principales."
        elif is_custodial:
            return True, "Applicable - Résilience service custodial", f"Les services custodials comme {type_name} doivent avoir des plans de continuité et de récupération robustes pour protéger les fonds des utilisateurs."
        else:
            return False, "Non applicable - Service digital résilient par design", f"Les normes d'adversité physique ne s'appliquent pas à {type_name} qui est un service digital. La résilience est assurée par la décentralisation du protocole."

    elif pillar == 'F':
        if is_wallet:
            return True, "Applicable - Standards wallet", f"Les normes de fidélité (Pilier F) s'appliquent aux wallets comme {type_name}. La conformité aux standards BIP/EIP assure l'interopérabilité et la compatibilité."
        elif is_defi or is_infrastructure:
            return True, "Applicable - Standards protocole", f"Les normes de fidélité s'appliquent aux protocoles comme {type_name}. Le respect des standards assure l'intégration dans l'écosystème."

    elif pillar == 'E':
        if is_wallet or is_defi:
            return True, "Applicable - Écosystème", f"Les normes d'écosystème (Pilier E) s'appliquent à {type_name}. L'intégration avec l'écosystème blockchain est essentielle pour ce type de produit."
        elif is_infrastructure:
            return True, "Applicable - Infrastructure écosystème", f"Les normes d'écosystème s'appliquent à l'infrastructure comme {type_name}. Ce composant fait partie intégrante de l'écosystème blockchain."

    # ========================================================================
    # DEFAULT: Apply broad analysis
    # ========================================================================

    # If we reach here, do a final broad analysis
    if any(x in type_text.lower() for x in ['crypto', 'blockchain', 'token', 'coin', 'asset']):
        return True, "Applicable - Produit crypto", f"Cette norme s'applique de manière générale aux produits crypto. {type_name} fait partie de l'écosystème crypto et doit respecter les standards et bonnes pratiques de l'industrie."

    return True, "Applicable - Standard général", f"En l'absence de critères d'exclusion spécifiques, cette norme s'applique à {type_name}. Une analyse plus détaillée peut être nécessaire pour déterminer le niveau de conformité requis."


def fetch_all_product_types():
    """Fetch all product types with full criteria"""
    r = requests.get(f'{SUPABASE_URL}/rest/v1/product_types?select=*&order=id',
                     headers=headers, timeout=60)
    return r.json() if r.status_code == 200 else []


def fetch_all_norms():
    """Fetch all norms with pagination"""
    all_norms = []
    offset = 0
    while True:
        r = requests.get(
            f'{SUPABASE_URL}/rest/v1/norms?select=id,code,title,pillar,target_type,summary,description&limit=500&offset={offset}&order=id',
            headers=headers, timeout=60
        )
        batch = r.json() if r.status_code == 200 else []
        if not batch:
            break
        all_norms.extend(batch)
        offset += len(batch)
        if len(batch) < 500:
            break
    return all_norms


def upsert_applicability(norm_id, type_id, is_applicable, reason, applicability_reason):
    """Upsert applicability record to Supabase"""
    # Truncate applicability_reason to max 5000 words (~30000 chars)
    if len(applicability_reason) > 30000:
        applicability_reason = applicability_reason[:30000] + "..."

    data = {
        'norm_id': norm_id,
        'type_id': type_id,
        'is_applicable': is_applicable,
        'reason': reason[:500] if reason else '',
        'applicability_reason': applicability_reason
    }

    # Upsert with on_conflict
    r = requests.post(
        f'{SUPABASE_URL}/rest/v1/norm_applicability?on_conflict=norm_id,type_id',
        headers={**headers_post, 'Prefer': 'resolution=merge-duplicates'},
        json=data,
        timeout=30
    )
    return r.status_code in [200, 201]


def main():
    print("=" * 80)
    print("ANALYSE D'APPLICABILITÉ COMPLÈTE")
    print("=" * 80)
    print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print()

    # Fetch data
    print("Chargement des types de produits...")
    product_types = fetch_all_product_types()
    print(f"  {len(product_types)} types de produits chargés")

    print("Chargement des normes...")
    norms = fetch_all_norms()
    print(f"  {len(norms)} normes chargées")

    total_combinations = len(product_types) * len(norms)
    print(f"\nCombinations à analyser: {total_combinations:,}")
    print()

    # Stats
    stats = {'applicable': 0, 'non_applicable': 0, 'saved': 0, 'errors': 0}

    # Process each combination
    for i, product_type in enumerate(product_types):
        type_id = product_type['id']
        type_name = product_type['name']

        print(f"\n[{i+1}/{len(product_types)}] Analyse: {type_name} (ID: {type_id})")

        type_applicable = 0
        type_non_applicable = 0

        for j, norm in enumerate(norms):
            is_applicable, reason, applicability_reason = analyze_applicability(product_type, norm)

            if is_applicable:
                stats['applicable'] += 1
                type_applicable += 1
            else:
                stats['non_applicable'] += 1
                type_non_applicable += 1

            # Save to Supabase
            if upsert_applicability(norm['id'], type_id, is_applicable, reason, applicability_reason):
                stats['saved'] += 1
            else:
                stats['errors'] += 1

            # Progress update every 500 norms
            if (j + 1) % 500 == 0:
                print(f"    Processed {j+1}/{len(norms)} norms...")

        pct_applicable = (type_applicable / len(norms)) * 100
        print(f"  -> Applicable: {type_applicable} ({pct_applicable:.1f}%) | Non-applicable: {type_non_applicable}")

    # Final report
    print("\n" + "=" * 80)
    print("RAPPORT FINAL")
    print("=" * 80)
    print(f"Total combinaisons analysées: {total_combinations:,}")
    print(f"  Applicable: {stats['applicable']:,} ({stats['applicable']*100/total_combinations:.1f}%)")
    print(f"  Non-applicable: {stats['non_applicable']:,} ({stats['non_applicable']*100/total_combinations:.1f}%)")
    print(f"  Sauvegardées: {stats['saved']:,}")
    print(f"  Erreurs: {stats['errors']:,}")
    print(f"\nDate fin: {datetime.now().strftime('%Y-%m-%d %H:%M')}")


if __name__ == "__main__":
    main()
