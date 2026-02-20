#!/usr/bin/env python3
"""
Claude Applicability Analyzer - Fixed version
Comprehensive analysis with proper logic flow
"""
import os
import sys
import time
import requests
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

load_dotenv(Path('c:/Users/alexa/Desktop/SafeScoring/.env'))

SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')
headers = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'}
headers_post = {**headers, 'Content-Type': 'application/json', 'Prefer': 'return=minimal'}

session = requests.Session()
retry = Retry(total=5, backoff_factor=2, status_forcelist=[429, 500, 502, 503, 504])
session.mount("https://", HTTPAdapter(max_retries=retry))

def get_pillar_name(p):
    return {'S': 'Security', 'A': 'Adversity', 'F': 'Fidelity', 'E': 'Ecosystem'}.get(p, p)

def analyze_applicability(product_type, norm):
    """
    Analyse complète d'applicabilité avec justification détaillée
    """
    # Extract product type data
    type_id = product_type['id']
    type_name = product_type['name']
    definition = (product_type.get('definition') or '').lower()
    includes = product_type.get('includes') or []
    excludes = product_type.get('excludes') or []
    is_hardware = product_type.get('is_hardware') or False
    is_custodial = product_type.get('is_custodial') or False
    is_electronic = product_type.get('is_electronic') or False

    # Extract norm data
    code = (norm.get('code') or '').upper()
    title = (norm.get('title') or '').lower()
    pillar = (norm.get('pillar') or '').upper()
    target_type = (norm.get('target_type') or '').lower()
    summary = (norm.get('summary') or '').lower()
    description = (norm.get('description') or '').lower()

    # Use title and code for specific matching, not full summary
    norm_specific = f"{code.lower()} {title} {description}"
    norm_full = f"{code.lower()} {title} {description} {summary}"
    type_name_lower = type_name.lower()

    # Build analysis
    analysis = []
    analysis.append(f"# Analyse: {code} → {type_name}")
    analysis.append(f"\n## Données")
    analysis.append(f"- Norme: {code} ({norm.get('title', '')})")
    analysis.append(f"- Pilier: {pillar} - {get_pillar_name(pillar)}")
    analysis.append(f"- Target type: {target_type or 'both'}")
    analysis.append(f"- Produit: {type_name}")
    analysis.append(f"- Hardware: {is_hardware}, Custodial: {is_custodial}, Electronic: {is_electronic}")

    # ========================================================================
    # RULE 1: Target type exclusion
    # ========================================================================

    if target_type == 'physical' and not is_hardware:
        analysis.append(f"\n## Règle 1: Exclusion target_type")
        analysis.append(f"La norme cible 'physical', produit non-hardware → NON APPLICABLE")
        return False, "Norme physique, produit non-hardware", '\n'.join(analysis)

    if target_type == 'digital' and is_hardware and not is_electronic:
        analysis.append(f"\n## Règle 1: Exclusion target_type")
        analysis.append(f"La norme cible 'digital', produit hardware non-électronique → NON APPLICABLE")
        return False, "Norme digitale, produit passif", '\n'.join(analysis)

    # ========================================================================
    # RULE 2: Hardware-specific norms
    # ========================================================================

    # Hardware norms: check title/description only, not full summary
    hw_title_keywords = ['secure element', 'tamper', 'hardware security', 'eal5', 'eal6',
                         'common criteria', 'fips 140', 'side-channel', 'fault injection',
                         'power analysis', 'physical attack', 'chip security']

    is_hw_norm = any(kw in norm_specific for kw in hw_title_keywords)

    if is_hw_norm and not is_hardware:
        analysis.append(f"\n## Règle 2: Norme hardware spécifique")
        analysis.append(f"Mots-clés hardware détectés (secure element, tamper, etc.)")
        analysis.append(f"Produit non-hardware → NON APPLICABLE")
        return False, "Norme hardware, produit software", '\n'.join(analysis)

    # ========================================================================
    # RULE 3: Physical durability norms (Pillar A)
    # ========================================================================

    phys_keywords = ['water resist', 'fire resist', 'drop test', 'shock test',
                     'vibration test', 'ip67', 'ip68', 'mil-std', 'salt spray',
                     'corrosion test', 'durability test', 'environmental test']

    is_phys_norm = any(kw in norm_specific for kw in phys_keywords)

    if is_phys_norm and not is_hardware:
        analysis.append(f"\n## Règle 3: Norme durabilité physique")
        analysis.append(f"Tests physiques (eau, feu, chocs) détectés")
        analysis.append(f"Produit non-hardware → NON APPLICABLE")
        return False, "Test physique, produit non-physique", '\n'.join(analysis)

    # ========================================================================
    # RULE 4: Custodial/Regulatory norms
    # ========================================================================

    reg_keywords = ['kyc verification', 'aml compliance', 'anti-money laundering',
                    'know your customer', 'fatf travel rule', 'mica regulation',
                    'dora compliance', 'regulatory license', 'financial license',
                    'proof of reserves audit', 'segregated client accounts',
                    'fiduciary duty', 'custodial insurance']

    is_reg_norm = any(kw in norm_specific for kw in reg_keywords)

    if is_reg_norm and not is_custodial:
        analysis.append(f"\n## Règle 4: Norme réglementaire custodiale")
        analysis.append(f"Exigences réglementaires (KYC, AML, licence) détectées")
        analysis.append(f"Produit non-custodial → NON APPLICABLE")
        return False, "Réglementation custodiale, produit non-custodial", '\n'.join(analysis)

    # ========================================================================
    # RULE 5: Smart contract norms for non-DeFi
    # ========================================================================

    sc_keywords = ['solidity', 'reentrancy', 'flash loan', 'front-running', 'mev',
                   'sandwich attack', 'oracle manipulation', 'price manipulation',
                   'liquidation cascade', 'governance attack', 'upgradeable proxy']

    is_sc_norm = any(kw in norm_specific for kw in sc_keywords)

    defi_types = ['dex', 'defi', 'lending', 'amm', 'yield', 'bridge', 'liquidity',
                  'staking', 'derivatives', 'perpetual', 'options', 'synthetic']
    is_defi_product = any(d in type_name_lower for d in defi_types)

    if is_sc_norm and not is_defi_product:
        # Exception: wallets interact with DeFi
        if 'wallet' not in type_name_lower:
            analysis.append(f"\n## Règle 5: Norme smart contract")
            analysis.append(f"Vulnérabilités DeFi détectées (reentrancy, MEV, etc.)")
            analysis.append(f"Produit non-DeFi → NON APPLICABLE")
            return False, "Norme DeFi, produit non-DeFi", '\n'.join(analysis)

    # ========================================================================
    # RULE 6: Key management for infrastructure
    # ========================================================================

    key_keywords = ['bip39', 'bip32', 'bip44', 'seed phrase', 'mnemonic', 'key derivation',
                    'private key storage', 'key backup', 'passphrase', '12 words', '24 words']

    is_key_norm = any(kw in norm_specific for kw in key_keywords)

    infra_types = ['oracle', 'node', 'rpc', 'indexer', 'explorer', 'validator', 'infrastructure']
    is_infra = any(i in type_name_lower for i in infra_types)

    if is_key_norm and is_infra:
        analysis.append(f"\n## Règle 6: Norme gestion de clés")
        analysis.append(f"Gestion seed phrase/clés détectée")
        analysis.append(f"Produit infrastructure → NON APPLICABLE")
        return False, "Gestion clés utilisateur, produit infrastructure", '\n'.join(analysis)

    # ========================================================================
    # POSITIVE RULES: Applicability by category
    # ========================================================================

    analysis.append(f"\n## Analyse positive")

    # Crypto norms apply broadly - check title/description
    crypto_kw = ['aes', 'sha-256', 'sha-3', 'ecdsa', 'eddsa', 'rsa', 'encryption',
                 'cryptograph', 'cipher']
    if any(kw in norm_specific for kw in crypto_kw):
        analysis.append(f"✓ Norme cryptographique - Applicable à tout produit crypto")
        return True, "Applicable - Standard cryptographique", '\n'.join(analysis)

    # Security pillar applies broadly
    if pillar == 'S':
        analysis.append(f"✓ Pilier Sécurité - Applicable par défaut")
        analysis.append(f"La sécurité est fondamentale pour tous les produits crypto")
        return True, "Applicable - Pilier Sécurité", '\n'.join(analysis)

    # Adversity pillar - depends on hardware
    if pillar == 'A':
        if is_hardware:
            analysis.append(f"✓ Pilier Adversité + produit hardware")
            return True, "Applicable - Adversité hardware", '\n'.join(analysis)
        elif is_custodial:
            analysis.append(f"✓ Pilier Adversité + service custodial (continuité)")
            return True, "Applicable - Adversité opérationnelle", '\n'.join(analysis)
        else:
            analysis.append(f"✗ Pilier Adversité mais produit software décentralisé")
            return False, "Adversité physique non applicable", '\n'.join(analysis)

    # Fidelity pillar - standards
    if pillar == 'F':
        # BIP standards for wallets
        if 'bip' in norm_specific and ('wallet' in type_name_lower or 'backup' in type_name_lower):
            analysis.append(f"✓ Standard BIP pour wallet/backup")
            return True, "Applicable - Standard BIP", '\n'.join(analysis)

        # EIP/ERC for Ethereum ecosystem
        if ('eip' in code.lower() or 'erc' in code.lower()):
            eth_products = ['wallet', 'defi', 'dex', 'bridge', 'staking', 'lending']
            if any(e in type_name_lower for e in eth_products):
                analysis.append(f"✓ Standard Ethereum pour produit EVM")
                return True, "Applicable - Standard Ethereum", '\n'.join(analysis)
            else:
                analysis.append(f"✗ Standard Ethereum, produit non-EVM")
                return False, "Standard Ethereum non applicable", '\n'.join(analysis)

        # General fidelity
        analysis.append(f"✓ Pilier Fidélité - Interopérabilité")
        return True, "Applicable - Pilier Fidélité", '\n'.join(analysis)

    # Ecosystem pillar - broad applicability
    if pillar == 'E':
        analysis.append(f"✓ Pilier Écosystème - Applicable")
        return True, "Applicable - Pilier Écosystème", '\n'.join(analysis)

    # Default: applicable unless excluded
    analysis.append(f"\n## Conclusion")
    analysis.append(f"Aucune règle d'exclusion applicable")
    analysis.append(f"Par défaut: APPLICABLE")
    return True, "Applicable - Défaut", '\n'.join(analysis)


def get_all_product_types():
    r = session.get(f'{SUPABASE_URL}/rest/v1/product_types?select=*&order=id',
                    headers=headers, timeout=60)
    return r.json() if r.status_code == 200 else []


def get_all_norms():
    all_norms = []
    offset = 0
    while True:
        r = session.get(
            f'{SUPABASE_URL}/rest/v1/norms?select=id,code,title,pillar,target_type,summary,description&limit=500&offset={offset}&order=id',
            headers=headers, timeout=120
        )
        batch = r.json() if r.status_code == 200 else []
        if not batch:
            break
        all_norms.extend(batch)
        offset += len(batch)
        time.sleep(0.3)
        if len(batch) < 500:
            break
    return all_norms


def upsert_batch(data_batch):
    for attempt in range(5):
        try:
            r = session.post(
                f'{SUPABASE_URL}/rest/v1/norm_applicability?on_conflict=norm_id,type_id',
                headers={**headers_post, 'Prefer': 'resolution=merge-duplicates'},
                json=data_batch,
                timeout=120
            )
            if r.status_code in [200, 201]:
                time.sleep(0.2)
                return True
            elif r.status_code == 429:
                time.sleep(2 ** attempt)
        except Exception as e:
            print(f"    Error: {str(e)[:50]}, retry...")
            time.sleep(2 ** attempt)
    return False


def main():
    print("=" * 70)
    print("CLAUDE APPLICABILITY ANALYZER v2")
    print("=" * 70)
    print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M')}")

    print("\nChargement...")
    product_types = get_all_product_types()
    print(f"  {len(product_types)} types")

    norms = get_all_norms()
    print(f"  {len(norms)} normes")

    total = len(product_types) * len(norms)
    print(f"\nTotal: {total:,} combinaisons")

    stats = {'applicable': 0, 'non_applicable': 0, 'saved': 0}

    for i, pt in enumerate(product_types):
        print(f"\n[{i+1}/{len(product_types)}] {pt['name']}")

        batch = []
        type_applicable = 0

        for j, norm in enumerate(norms):
            is_applicable, reason, analysis = analyze_applicability(pt, norm)

            if is_applicable:
                type_applicable += 1
                stats['applicable'] += 1
            else:
                stats['non_applicable'] += 1

            # Truncate
            if len(analysis) > 25000:
                analysis = analysis[:25000] + "\n...[tronqué]"

            batch.append({
                'norm_id': norm['id'],
                'type_id': pt['id'],
                'is_applicable': is_applicable,
                'reason': reason[:500],
                'applicability_reason': analysis
            })

            if len(batch) >= 50:
                if upsert_batch(batch):
                    stats['saved'] += len(batch)
                batch = []

            if (j + 1) % 500 == 0:
                pct = type_applicable / (j + 1) * 100
                print(f"    {j+1}/{len(norms)} - {pct:.0f}% applicable")

        if batch:
            if upsert_batch(batch):
                stats['saved'] += len(batch)

        pct = type_applicable / len(norms) * 100
        print(f"  -> {type_applicable}/{len(norms)} ({pct:.1f}%)")

    print("\n" + "=" * 70)
    print("RAPPORT")
    print("=" * 70)
    total = stats['applicable'] + stats['non_applicable']
    pct_app = stats['applicable'] * 100 / total if total > 0 else 0
    print(f"Total: {total:,}")
    print(f"  Applicable: {stats['applicable']:,} ({pct_app:.1f}%)")
    print(f"  Non-applicable: {stats['non_applicable']:,}")
    print(f"  Saved: {stats['saved']:,}")
    print(f"\nFin: {datetime.now().strftime('%Y-%m-%d %H:%M')}")


if __name__ == "__main__":
    main()
