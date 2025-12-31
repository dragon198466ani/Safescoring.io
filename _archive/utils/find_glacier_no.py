#!/usr/bin/env python3
"""Trouve des normes qui pourraient donner des NO à Glacier Protocol"""

import requests

SUPABASE_URL = 'https://ajdncttomdqojlozxjxu.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqZG5jdHRvbWRxb2psb3p4anh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0MjMwNzUsImV4cCI6MjA3OTk5OTA3NX0.tTgqj-ALcl0oIdxFHuFQkB19apiz9CSyvV2X1TMWjEk'

headers = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'}

# Récupérer toutes les normes
r = requests.get(f'{SUPABASE_URL}/rest/v1/norms?select=id,code,title,pillar,description', headers=headers)
all_norms = r.json()

print("=" * 70)
print("NORMES QUI POURRAIENT DONNER DES 'NO' À GLACIER PROTOCOL")
print("=" * 70)
print("\nGlacier = Cold storage Bitcoin, air-gapped, multisig, 2017")
print("Cherchons ce que Glacier NE FAIT PAS mais DEVRAIT pour un guide complet:\n")

# Catégories de lacunes potentielles de Glacier
categories = {
    "Ethereum/Altcoins (Glacier = Bitcoin only)": [
        'eip-', 'ethereum', 'erc-', 'smart contract', 'defi', 'nft',
        'solana', 'cardano', 'polkadot', 'cosmos', 'avalanche'
    ],
    "Privacy avancée (Glacier = basique)": [
        'coinjoin', 'mixer', 'tornado', 'wasabi', 'whirlpool',
        'monero', 'zcash', 'zero knowledge', 'zk-snark'
    ],
    "Mobile/Connecté (Glacier = offline only)": [
        'mobile', 'bluetooth', 'nfc', 'wifi', 'cloud sync',
        'push notification', 'real-time'
    ],
    "Trading/DeFi (Glacier = stockage only)": [
        'swap', 'exchange', 'trading', 'liquidity', 'staking',
        'yield', 'lending', 'borrowing'
    ],
    "Hardware spécifique (Glacier = software protocol)": [
        'secure element', 'tpm', 'hsm', 'chip', 'tamper',
        'biometric', 'fingerprint'
    ],
    "Multi-chain (Glacier = Bitcoin only)": [
        'multi-chain', 'cross-chain', 'bridge', 'interoperability'
    ],
    "Lightning/Layer 2 (Glacier = on-chain only)": [
        'lightning', 'layer 2', 'l2', 'channel', 'routing'
    ],
    "Régulations/Compliance (Glacier = self-custody)": [
        'kyc', 'aml', 'compliance', 'regulatory', 'tax reporting'
    ],
}

for category, keywords in categories.items():
    matching_norms = []
    for norm in all_norms:
        title_lower = norm['title'].lower()
        desc_lower = (norm.get('description') or '').lower()
        text = f"{title_lower} {desc_lower}"
        
        for kw in keywords:
            if kw in text:
                matching_norms.append((norm, kw))
                break
    
    if matching_norms:
        print(f"\n{'='*70}")
        print(f"❌ {category}")
        print(f"{'='*70}")
        for norm, kw in matching_norms[:5]:
            print(f"  [{norm['pillar']}] {norm['code']}: {norm['title'][:50]}")
        if len(matching_norms) > 5:
            print(f"  ... et {len(matching_norms) - 5} autres")

# Normes spécifiques qui pourraient être des NO pour Glacier
print("\n" + "=" * 70)
print("NORMES SPÉCIFIQUES CANDIDATES POUR 'NO'")
print("=" * 70)

specific_no_candidates = [
    # Ethereum - Glacier ne supporte pas
    ('S28', 'EIP-55 Checksum', 'Glacier = Bitcoin only, pas Ethereum'),
    ('S29', 'EIP-155 Replay protection', 'Glacier = Bitcoin only'),
    ('S30', 'EIP-191 Data signing', 'Glacier = Bitcoin only'),
    ('S31', 'EIP-712 Typed data', 'Glacier = Bitcoin only'),
    ('S35', 'EIP-4361 SIWE', 'Glacier = Bitcoin only'),
    
    # Privacy avancée - Glacier ne couvre pas
    ('A78', 'Confidential Transactions', 'Glacier ne documente pas CT'),
    ('A172', 'Silent Payments', 'Standard 2023, pas dans Glacier'),
    
    # Standards récents - Glacier 2017
    ('S22', 'BIP-86 Taproot', 'Taproot = 2021, Glacier = 2017'),
    ('S98', 'BIP-352 Silent Payments', 'Standard 2023'),
    
    # Fonctionnalités non couvertes
    ('A19', 'Steganographic backup', 'Glacier = backup papier simple'),
    ('A105', 'Encrypted cloud backup', 'Glacier = offline only, pas cloud'),
    ('A65', 'Air-gapped operation', 'Glacier FAIT ça - devrait être YES'),
]

print("\nNormes qui pourraient logiquement être NO pour Glacier:\n")
for code, title, reason in specific_no_candidates:
    print(f"  {code}: {title}")
    print(f"       → {reason}\n")
