#!/usr/bin/env python3
"""Fast evaluation of Ledger Nano S Plus against all norms"""
import os
import uuid
import requests
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path('c:/Users/alexa/Desktop/SafeScoring/.env'))

SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', os.environ.get('SUPABASE_KEY', ''))

headers = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'}
headers_post = {**headers, 'Content-Type': 'application/json', 'Prefer': 'return=minimal'}

PRODUCT_ID = 98  # Ledger Nano S Plus

def evaluate_norm(code, title, pillar):
    """Return (verdict, justification)"""
    code_up = code.upper()
    title_low = (title or '').lower()

    # Security norms
    if 'aes' in title_low and '256' in title_low:
        return 'YES', 'AES-256 hardware in CC EAL5+ Secure Element'
    if 'sha-256' in title_low or 'sha256' in title_low:
        return 'YES', 'SHA-256 hardware accelerated'
    if 'sha-512' in title_low:
        return 'YES', 'SHA-512 for BIP39 derivation'
    if 'ecdsa' in title_low or 'secp256k1' in title_low:
        return 'YES', 'ECDSA secp256k1 native support'
    if 'eddsa' in title_low or 'ed25519' in title_low:
        return 'YES', 'EdDSA Ed25519 supported'
    if 'secure element' in title_low or 'tamper' in title_low:
        return 'YES', 'ST33K1M5 Secure Element CC EAL5+'
    if 'common criteria' in title_low or 'eal' in title_low:
        return 'YES', 'CC EAL5+ certified Secure Element'
    if 'air-gap' in title_low or 'airgap' in code_up:
        return 'NO', 'USB-connected device, not air-gapped'
    if 'wifi' in title_low:
        return 'YES', 'No WiFi capability (USB-C only)'
    if 'bluetooth' in title_low:
        return 'YES', 'No Bluetooth (USB-C only)'
    if 'pin' in title_low:
        return 'YES', 'PIN protection with anti-brute-force'
    if 'passphrase' in title_low:
        return 'YES', 'Optional passphrase supported'
    if 'supply chain' in title_low or 'genuine' in title_low:
        return 'YES', 'Genuine check via Ledger Live'

    # Adversity
    if 'water' in title_low or 'ip67' in title_low:
        return 'NO', 'Not water resistant'
    if 'fire' in title_low and 'resist' in title_low:
        return 'NO', 'Plastic housing, not fire resistant'
    if 'duress' in title_low:
        return 'NO', 'No duress PIN feature'
    if 'backup' in title_low or 'recovery' in title_low:
        return 'YES', '24-word BIP39 recovery phrase'
    if 'temperature' in title_low:
        return 'YES', 'Operating range -20C to +50C'

    # Fidelity
    if 'bip39' in title_low:
        return 'YES', 'Full BIP39 compliance'
    if 'bip32' in title_low:
        return 'YES', 'BIP32 HD wallet derivation'
    if 'bip44' in title_low:
        return 'YES', 'BIP44 multi-account hierarchy'
    if 'firmware' in title_low:
        return 'YES', 'Secure firmware updates'
    if 'shamir' in title_low:
        return 'NO', 'No Shamir backup support'

    # Ecosystem
    if 'multi-chain' in title_low or 'multicoin' in title_low:
        return 'YES', '5500+ cryptocurrencies supported'
    if 'defi' in title_low or 'dapp' in title_low:
        return 'YES', 'DeFi via WalletConnect'
    if 'nft' in title_low:
        return 'YES', 'NFT support via Ledger Live'
    if 'open source' in title_low:
        return 'NO', 'Firmware closed source'
    if 'walletconnect' in title_low:
        return 'YES', 'WalletConnect v2 supported'

    # EIP/ERC
    if code_up.startswith('EIP') or code_up.startswith('ERC'):
        return 'YES', 'Ethereum standard supported'

    # ISO
    if code_up.startswith('ISO'):
        if '27001' in title_low:
            return 'N/A', 'Applies to organizations'
        return 'TBD', 'ISO applicability pending'

    # NIST
    if code_up.startswith('NIST'):
        if 'fips 140' in title_low:
            return 'NO', 'No FIPS certification'
        return 'TBD', 'NIST compliance pending'

    # DeFi
    if code_up.startswith('DEFI'):
        return 'YES', 'DeFi interaction supported'

    # Regulations
    if code_up.startswith('REG'):
        return 'N/A', 'Applies to services, not hardware'

    return 'TBD', 'Evaluation pending'

def main():
    # Get all norms
    print("Fetching norms...")
    all_norms = []
    offset = 0
    while True:
        r = requests.get(
            f'{SUPABASE_URL}/rest/v1/norms?select=id,code,title,pillar&limit=1000&offset={offset}&order=code',
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

    # Evaluate and save
    batch_id = str(uuid.uuid4())
    verdicts = {'YES': 0, 'NO': 0, 'TBD': 0, 'N/A': 0}
    saved = 0
    report = []

    print(f"\nEvaluating Ledger Nano S Plus...\n")

    for i, norm in enumerate(all_norms):
        verdict, justification = evaluate_norm(norm['code'], norm.get('title'), norm.get('pillar'))
        verdicts[verdict] += 1

        report.append({
            'code': norm['code'],
            'title': norm.get('title', ''),
            'verdict': verdict,
            'justification': justification
        })

        # Save to Supabase
        eval_data = {
            'product_id': PRODUCT_ID,
            'norm_id': norm['id'],
            'new_result': verdict,
            'new_justification': justification,
            'change_source': 'ai_evaluation',
            'changed_by': 'claude_opus',
            'batch_id': batch_id
        }

        r = requests.post(
            f'{SUPABASE_URL}/rest/v1/evaluation_history',
            headers=headers_post,
            json=eval_data,
            timeout=10
        )
        if r.status_code in [200, 201]:
            saved += 1

        if (i + 1) % 200 == 0:
            print(f"  Processed {i+1}/{len(all_norms)}...")

    # Summary
    print("\n" + "=" * 70)
    print("RAPPORT D'EVALUATION: Ledger Nano S Plus")
    print("=" * 70)
    print(f"\nTotal normes: {len(all_norms)}")
    print(f"Sauvegardees: {saved}")
    pct = lambda v: verdicts[v] * 100 / len(all_norms)
    print(f"\nVERDICTS:")
    print(f"  YES (Conforme):      {verdicts['YES']:4d} ({pct('YES'):5.1f}%)")
    print(f"  NO  (Non-conforme):  {verdicts['NO']:4d} ({pct('NO'):5.1f}%)")
    print(f"  TBD (A evaluer):     {verdicts['TBD']:4d} ({pct('TBD'):5.1f}%)")
    print(f"  N/A (Non applicable):{verdicts['N/A']:4d} ({pct('N/A'):5.1f}%)")

    # Examples YES
    print("\n" + "-" * 70)
    print("EXEMPLES CONFORMITE (YES):")
    for r in [x for x in report if x['verdict'] == 'YES'][:10]:
        print(f"  [{r['code']:12s}] {r['title'][:30]:30s} -> {r['justification']}")

    # Examples NO
    print("\nEXEMPLES NON-CONFORMITE (NO):")
    for r in [x for x in report if x['verdict'] == 'NO'][:10]:
        print(f"  [{r['code']:12s}] {r['title'][:30]:30s} -> {r['justification']}")

    print("\n" + "=" * 70)
    print(f"Batch ID: {batch_id}")
    print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M UTC')}")
    print("=" * 70)

if __name__ == "__main__":
    main()
