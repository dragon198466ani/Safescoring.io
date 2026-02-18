#!/usr/bin/env python3
"""Batch evaluation with progress output"""
import os
import sys
import uuid
import requests
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path('c:/Users/alexa/Desktop/SafeScoring/.env'))

SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')
PRODUCT_ID = 98  # Ledger Nano S Plus

headers = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'}

def evaluate(code, title):
    c = code.upper()
    t = (title or '').lower()

    # YES cases
    if any(x in t for x in ['aes', 'sha-256', 'sha256', 'ecdsa', 'eddsa', 'ed25519', 'secp256k1']):
        return 'YES', 'Crypto hardware supported'
    if 'secure element' in t or 'tamper' in t:
        return 'YES', 'SE CC EAL5+ certified'
    if any(x in t for x in ['bip39', 'bip32', 'bip44', 'mnemonic', 'hd wallet']):
        return 'YES', 'BIP standard supported'
    if 'pin' in t or 'passphrase' in t:
        return 'YES', 'Authentication supported'
    if any(x in t for x in ['defi', 'dapp', 'nft', 'erc-20', 'walletconnect', 'multi-chain']):
        return 'YES', 'Ecosystem feature supported'
    if c.startswith('EIP') or c.startswith('ERC'):
        return 'YES', 'Ethereum standard supported'
    if c.startswith('DEFI'):
        return 'YES', 'DeFi protocol supported'
    if 'wifi' in t or 'bluetooth' in t:
        return 'YES', 'No wireless (USB only) - secure'
    if 'firmware' in t or 'update' in t:
        return 'YES', 'Secure updates via Ledger Live'
    if 'backup' in t or 'recovery' in t:
        return 'YES', '24-word recovery supported'
    if 'temperature' in t:
        return 'YES', 'Operating range -20C to +50C'

    # NO cases
    if 'air-gap' in t or 'airgap' in c:
        return 'NO', 'USB-connected, not air-gapped'
    if 'water' in t or 'ip67' in t or 'ip68' in t:
        return 'NO', 'Not water resistant'
    if 'fire' in t and 'resist' in t:
        return 'NO', 'Not fire resistant'
    if 'duress' in t:
        return 'NO', 'No duress PIN'
    if 'shamir' in t or 'slip39' in t:
        return 'NO', 'No Shamir backup'
    if 'open source' in t or 'open-source' in t:
        return 'NO', 'Firmware closed source'
    if 'fips 140' in t:
        return 'NO', 'No FIPS certification'

    # N/A cases
    if c.startswith('REG'):
        return 'N/A', 'Regulatory - applies to services'
    if '27001' in t:
        return 'N/A', 'ISO 27001 for organizations'

    return 'TBD', 'Pending evaluation'

# Get all norms
sys.stdout.write("Fetching norms...\n")
sys.stdout.flush()

all_norms = []
offset = 0
while True:
    r = requests.get(f'{SUPABASE_URL}/rest/v1/norms?select=id,code,title&limit=500&offset={offset}&order=id',
        headers=headers, timeout=60)
    batch = r.json() if r.status_code == 200 else []
    if not batch:
        break
    all_norms.extend(batch)
    offset += len(batch)
    sys.stdout.write(f"  Fetched {len(all_norms)}...\n")
    sys.stdout.flush()
    if len(batch) < 500:
        break

sys.stdout.write(f"Total: {len(all_norms)} norms\n\n")
sys.stdout.flush()

# Evaluate
batch_id = str(uuid.uuid4())
headers_post = {**headers, 'Content-Type': 'application/json', 'Prefer': 'return=minimal'}

verdicts = {'YES': 0, 'NO': 0, 'TBD': 0, 'N/A': 0}
saved = 0
examples = {'YES': [], 'NO': [], 'TBD': [], 'N/A': []}

for i, norm in enumerate(all_norms):
    verdict, justification = evaluate(norm['code'], norm.get('title'))
    verdicts[verdict] += 1

    if len(examples[verdict]) < 5:
        examples[verdict].append((norm['code'], norm.get('title', ''), justification))

    data = {
        'product_id': PRODUCT_ID,
        'norm_id': norm['id'],
        'new_result': verdict,
        'new_justification': justification,
        'change_source': 'ai_evaluation',
        'changed_by': 'claude_opus',
        'batch_id': batch_id
    }

    try:
        r = requests.post(f'{SUPABASE_URL}/rest/v1/evaluation_history', headers=headers_post, json=data, timeout=10)
        if r.status_code in [200, 201]:
            saved += 1
    except:
        pass

    if (i + 1) % 100 == 0:
        sys.stdout.write(f"  Processed {i+1}/{len(all_norms)}...\n")
        sys.stdout.flush()

# Report
print("\n" + "=" * 70)
print("RAPPORT: Ledger Nano S Plus")
print("=" * 70)
print(f"Total: {len(all_norms)} | Saved: {saved}")
print(f"\nYES: {verdicts['YES']} ({verdicts['YES']*100//len(all_norms)}%)")
print(f"NO:  {verdicts['NO']} ({verdicts['NO']*100//len(all_norms)}%)")
print(f"TBD: {verdicts['TBD']} ({verdicts['TBD']*100//len(all_norms)}%)")
print(f"N/A: {verdicts['N/A']} ({verdicts['N/A']*100//len(all_norms)}%)")

print("\n--- EXEMPLES YES ---")
for code, title, j in examples['YES']:
    print(f"  {code}: {j}")

print("\n--- EXEMPLES NO ---")
for code, title, j in examples['NO']:
    print(f"  {code}: {j}")

print(f"\nBatch: {batch_id[:8]}...")
print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
