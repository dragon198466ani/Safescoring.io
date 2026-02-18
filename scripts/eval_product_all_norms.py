#!/usr/bin/env python3
"""Evaluate a product against all applicable norms with YES/NO/TBD/N/A verdicts"""
import os
import requests
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path('c:/Users/alexa/Desktop/SafeScoring/.env'))

SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', os.environ.get('SUPABASE_KEY', ''))

# Ledger Nano S Plus specifications (known facts)
LEDGER_NANO_S_PLUS = {
    'id': 98,
    'name': 'Ledger Nano S Plus',
    'type': 'hardware_wallet',
    'secure_element': 'ST33K1M5',
    'certification': 'CC EAL5+',
    'connectivity': ['USB-C'],
    'bluetooth': False,
    'nfc': False,
    'battery': False,
    'screen': True,
    'open_source': False,  # Firmware closed, apps open
    'multisig': True,
    'passphrase': True,
    'shamir': False,
    'air_gapped': False,
    'supported_coins': 5500,
    'features': [
        'AES-256', 'SHA-256', 'SHA-512', 'ECDSA', 'EdDSA',
        'BIP32', 'BIP39', 'BIP44', 'PIN protection', 'Recovery phrase 24 words',
        'Secure Element', 'Anti-tampering', 'Genuine check'
    ]
}

def evaluate_norm(norm, product_specs):
    """Evaluate a single norm against product specifications"""
    code = norm['code']
    title = norm.get('title', '')
    pillar = norm.get('pillar', '')
    description = norm.get('description', '')

    # Default
    verdict = 'TBD'
    justification = f"Evaluation pending for {code}"

    code_upper = code.upper()
    title_lower = title.lower()
    desc_lower = description.lower() if description else ''

    # Security norms (S pillar)
    if pillar == 'S' or code_upper.startswith('S'):
        # Cryptography
        if 'aes' in title_lower or 'aes-256' in desc_lower:
            verdict = 'YES'
            justification = 'AES-256 implemented in hardware via ST33K1M5 Secure Element (CC EAL5+)'
        elif 'sha-256' in title_lower or 'sha256' in desc_lower:
            verdict = 'YES'
            justification = 'SHA-256 hardware accelerated in Secure Element'
        elif 'sha-512' in title_lower:
            verdict = 'YES'
            justification = 'SHA-512 supported for BIP39 derivation'
        elif 'ecdsa' in title_lower or 'secp256k1' in desc_lower:
            verdict = 'YES'
            justification = 'ECDSA secp256k1 native support for Bitcoin/Ethereum'
        elif 'eddsa' in title_lower or 'ed25519' in desc_lower:
            verdict = 'YES'
            justification = 'EdDSA Ed25519 supported for Solana, Cardano'
        elif 'rsa' in title_lower:
            verdict = 'NO'
            justification = 'RSA not used in cryptocurrency operations'

        # Secure Element
        elif 'secure element' in title_lower or 'tamper' in title_lower:
            verdict = 'YES'
            justification = 'ST33K1M5 Secure Element with CC EAL5+ certification'
        elif 'common criteria' in title_lower or 'eal' in title_lower:
            verdict = 'YES'
            justification = 'CC EAL5+ certified (ST33K1M5)'

        # Air-gap
        elif 'air-gap' in title_lower or 'airgap' in code_upper:
            verdict = 'NO'
            justification = 'USB-connected device, not air-gapped'
        elif 'wifi' in title_lower or 'bluetooth' in title_lower:
            verdict = 'YES'  # No WiFi/BT is good for security
            justification = 'No wireless connectivity (USB-C only)'

        # PIN/Auth
        elif 'pin' in title_lower:
            verdict = 'YES'
            justification = '4-8 digit PIN with anti-brute-force (3 attempts before wipe)'
        elif 'passphrase' in title_lower or '25th word' in desc_lower:
            verdict = 'YES'
            justification = 'Optional passphrase (25th word) supported'

        # Supply chain
        elif 'supply chain' in title_lower or 'genuine' in title_lower:
            verdict = 'YES'
            justification = 'Genuine check via Ledger Live attestation'

    # Adversity norms (A pillar)
    elif pillar == 'A' or code_upper.startswith('A'):
        if 'temperature' in title_lower:
            verdict = 'YES'
            justification = 'Operating range -20C to +50C per Ledger specs'
        elif 'humidity' in title_lower:
            verdict = 'TBD'
            justification = 'No official humidity rating published'
        elif 'drop' in title_lower or 'shock' in title_lower:
            verdict = 'TBD'
            justification = 'Plastic casing, no formal drop test certification'
        elif 'water' in title_lower or 'ip6' in title_lower:
            verdict = 'NO'
            justification = 'Not water resistant, no IP rating'
        elif 'fire' in title_lower:
            verdict = 'NO'
            justification = 'Plastic housing, not fire resistant'
        elif 'backup' in title_lower or 'recovery' in title_lower:
            verdict = 'YES'
            justification = '24-word BIP39 recovery phrase backup'
        elif 'duress' in title_lower:
            verdict = 'NO'
            justification = 'No duress PIN feature (unlike Coldcard)'

    # Fidelity norms (F pillar)
    elif pillar == 'F' or code_upper.startswith('F'):
        if 'bip39' in title_lower or 'mnemonic' in title_lower:
            verdict = 'YES'
            justification = 'Full BIP39 compliance, 24-word recovery'
        elif 'bip32' in title_lower or 'hd wallet' in title_lower:
            verdict = 'YES'
            justification = 'BIP32 HD wallet derivation'
        elif 'bip44' in title_lower:
            verdict = 'YES'
            justification = 'BIP44 multi-account hierarchy'
        elif 'longevity' in title_lower or 'lifetime' in title_lower:
            verdict = 'TBD'
            justification = 'Estimated 10+ year lifespan, no formal guarantee'
        elif 'firmware' in title_lower or 'update' in title_lower:
            verdict = 'YES'
            justification = 'Secure firmware updates via Ledger Live'

    # Ecosystem norms (E pillar)
    elif pillar == 'E' or code_upper.startswith('E'):
        if 'multi-chain' in title_lower or 'multicoin' in title_lower:
            verdict = 'YES'
            justification = '5500+ supported cryptocurrencies'
        elif 'defi' in title_lower or 'dapp' in title_lower:
            verdict = 'YES'
            justification = 'WalletConnect and Ledger Live DeFi support'
        elif 'nft' in title_lower:
            verdict = 'YES'
            justification = 'NFT display and management via Ledger Live'
        elif 'open source' in title_lower:
            verdict = 'NO'
            justification = 'Firmware closed source (apps are open source)'
        elif 'mobile' in title_lower:
            verdict = 'NO'
            justification = 'USB-C only, no Bluetooth for mobile'

    # EIP/ERC standards
    elif code_upper.startswith('EIP') or code_upper.startswith('ERC'):
        if 'eip-1559' in title_lower or '1559' in code:
            verdict = 'YES'
            justification = 'EIP-1559 transaction signing supported'
        elif 'erc-20' in title_lower or 'erc20' in title_lower:
            verdict = 'YES'
            justification = 'Full ERC-20 token support'
        elif 'erc-721' in title_lower or 'nft' in title_lower:
            verdict = 'YES'
            justification = 'ERC-721 NFT support via Ledger Live'
        elif 'eip-712' in title_lower or 'typed data' in title_lower:
            verdict = 'YES'
            justification = 'EIP-712 typed data signing (clear signing)'
        else:
            verdict = 'TBD'
            justification = f'Standard {code} applicability to be verified'

    # ISO standards
    elif code_upper.startswith('ISO'):
        if 'iso 27001' in title_lower:
            verdict = 'N/A'
            justification = 'ISO 27001 applies to organizations, not devices'
        elif 'iso 15408' in title_lower or 'common criteria' in title_lower:
            verdict = 'YES'
            justification = 'Secure Element CC EAL5+ certified per ISO 15408'
        else:
            verdict = 'TBD'
            justification = f'ISO standard {code} applicability pending review'

    # NIST standards
    elif code_upper.startswith('NIST'):
        if 'fips 140' in title_lower:
            verdict = 'NO'
            justification = 'No FIPS 140-2/140-3 certification'
        elif 'nist 800-63' in title_lower:
            verdict = 'N/A'
            justification = 'Identity guidelines not applicable to hardware wallets'
        else:
            verdict = 'TBD'
            justification = f'NIST {code} compliance pending verification'

    # DeFi protocols
    elif code_upper.startswith('DEFI'):
        verdict = 'YES'
        justification = 'DeFi protocol interaction via WalletConnect/Ledger Live'

    # Regulations
    elif code_upper.startswith('REG'):
        verdict = 'N/A'
        justification = 'Regulatory norms apply to service providers, not hardware'

    return {
        'norm_id': norm['id'],
        'norm_code': code,
        'norm_title': title,
        'pillar': pillar,
        'verdict': verdict,
        'justification': justification
    }


def main():
    headers = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'}

    # Get all norms
    print("Fetching all norms...")
    all_norms = []
    offset = 0
    while True:
        r = requests.get(
            f'{SUPABASE_URL}/rest/v1/norms?select=id,code,title,pillar,description&limit=1000&offset={offset}&order=code',
            headers=headers, timeout=60
        )
        batch = r.json() if r.status_code == 200 else []
        if not batch:
            break
        all_norms.extend(batch)
        offset += len(batch)
        if len(batch) < 1000:
            break

    print(f"Total norms: {len(all_norms)}")

    # Evaluate each norm
    print(f"\nEvaluating {LEDGER_NANO_S_PLUS['name']} against all norms...\n")

    evaluations = []
    verdicts_count = {'YES': 0, 'NO': 0, 'TBD': 0, 'N/A': 0}

    for norm in all_norms:
        eval_result = evaluate_norm(norm, LEDGER_NANO_S_PLUS)
        evaluations.append(eval_result)
        verdicts_count[eval_result['verdict']] += 1

    # Summary
    print("=" * 80)
    print(f"EVALUATION SUMMARY: {LEDGER_NANO_S_PLUS['name']}")
    print("=" * 80)
    print(f"\nTotal norms evaluated: {len(evaluations)}")
    print(f"  YES: {verdicts_count['YES']} ({verdicts_count['YES']*100/len(evaluations):.1f}%)")
    print(f"  NO:  {verdicts_count['NO']} ({verdicts_count['NO']*100/len(evaluations):.1f}%)")
    print(f"  TBD: {verdicts_count['TBD']} ({verdicts_count['TBD']*100/len(evaluations):.1f}%)")
    print(f"  N/A: {verdicts_count['N/A']} ({verdicts_count['N/A']*100/len(evaluations):.1f}%)")

    # Save to Supabase
    print(f"\nSaving evaluations to Supabase...")

    headers_post = {
        **headers,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
    }

    saved = 0
    batch_id = f"eval_{LEDGER_NANO_S_PLUS['id']}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

    for i, ev in enumerate(evaluations):
        eval_data = {
            'product_id': LEDGER_NANO_S_PLUS['id'],
            'norm_id': ev['norm_id'],
            'new_result': ev['verdict'],
            'new_justification': ev['justification'],
            'change_source': 'ai_evaluation',
            'changed_by': 'claude_opus',
            'batch_id': batch_id
        }

        r = requests.post(
            f'{SUPABASE_URL}/rest/v1/evaluation_history',
            headers=headers_post,
            json=eval_data,
            timeout=30
        )

        if r.status_code in [200, 201]:
            saved += 1

        if (i + 1) % 100 == 0:
            print(f"  Saved {i+1}/{len(evaluations)}...")

    print(f"\nSaved: {saved}/{len(evaluations)} evaluations")
    print(f"Batch ID: {batch_id}")

    # Generate report
    print("\n" + "=" * 80)
    print("DETAILED REPORT")
    print("=" * 80)

    # Group by pillar
    by_pillar = {'S': [], 'A': [], 'F': [], 'E': [], 'Other': []}
    for ev in evaluations:
        p = ev['pillar'] if ev['pillar'] in by_pillar else 'Other'
        by_pillar[p].append(ev)

    for pillar, evals in by_pillar.items():
        if not evals:
            continue
        pillar_names = {'S': 'Security', 'A': 'Adversity', 'F': 'Fidelity', 'E': 'Ecosystem', 'Other': 'Other'}
        print(f"\n### {pillar_names[pillar]} ({len(evals)} norms)")
        print("-" * 60)

        # Show first 5 YES and first 5 NO
        yes_evals = [e for e in evals if e['verdict'] == 'YES'][:5]
        no_evals = [e for e in evals if e['verdict'] == 'NO'][:5]

        if yes_evals:
            print("\n  CONFORME (YES):")
            for ev in yes_evals:
                print(f"    [{ev['norm_code']}] {ev['norm_title'][:40]}")
                print(f"      -> {ev['justification'][:60]}")

        if no_evals:
            print("\n  NON-CONFORME (NO):")
            for ev in no_evals:
                print(f"    [{ev['norm_code']}] {ev['norm_title'][:40]}")
                print(f"      -> {ev['justification'][:60]}")

    print("\n" + "=" * 80)
    print(f"Evaluation complete: {datetime.now().strftime('%Y-%m-%d %H:%M UTC')}")
    print("=" * 80)


if __name__ == "__main__":
    main()
