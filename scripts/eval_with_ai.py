#!/usr/bin/env python3
"""
ÉVALUATION AVEC IA (GROQ) - Évaluation intelligente des normes
Utilise l'IA pour réduire les TBD
"""

import os
import sys
import json
import time
import requests
from datetime import datetime
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv('config/.env')

from src.core.norm_applicability_complete import NORM_APPLICABILITY, normalize_type

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')

# API Keys rotation
GROQ_KEYS = [
    os.getenv('GROQ_API_KEY'),
    os.getenv('GROQ_API_KEY_2'),
    os.getenv('GROQ_API_KEY_3'),
    os.getenv('GROQ_API_KEY_4'),
    os.getenv('GROQ_API_KEY_5'),
]
GROQ_KEYS = [k for k in GROQ_KEYS if k]  # Filter None

groq_key_index = 0

def get_next_groq_key():
    global groq_key_index
    key = GROQ_KEYS[groq_key_index % len(GROQ_KEYS)]
    groq_key_index += 1
    return key

def get_headers():
    return {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
    }

def call_groq(prompt, max_tokens=1000, retries=3):
    """Appelle l'API GROQ avec rotation des clés"""
    for attempt in range(retries):
        try:
            api_key = get_next_groq_key()
            response = requests.post(
                'https://api.groq.com/openai/v1/chat/completions',
                headers={
                    'Authorization': f'Bearer {api_key}',
                    'Content-Type': 'application/json'
                },
                json={
                    'model': 'llama-3.3-70b-versatile',
                    'messages': [{'role': 'user', 'content': prompt}],
                    'max_tokens': max_tokens,
                    'temperature': 0.1
                },
                timeout=60
            )
            if response.status_code == 200:
                return response.json()['choices'][0]['message']['content']
            elif response.status_code == 429:  # Rate limit
                time.sleep(2)
                continue
            else:
                time.sleep(1)
                continue
        except Exception as e:
            time.sleep(1)
            continue
    return None

# Product knowledge base
PRODUCT_KNOWLEDGE = {
    'uniswap': {
        'type': 'DEX',
        'description': 'Decentralized exchange using AMM model. V4 launched 2025.',
        'key_facts': [
            '9 independent audits (OpenZeppelin, Trail of Bits, Certora, etc.)',
            '$15.5M bug bounty - largest in DeFi history',
            '$2.75T+ total volume processed',
            'Zero hacks in v2/v3 history',
            'Deployed on Ethereum, Polygon, Arbitrum, Optimism, Base, Avalanche, BNB',
            'Open source on GitHub',
            'UNI governance token, DAO governance',
            'Non-custodial - users keep keys',
            'TLS/HTTPS for frontend',
            'No mobile app (web only via wallet browsers)',
            'Concentrated liquidity in v3, hooks in v4',
        ]
    },
    'aave': {
        'type': 'LENDING',
        'description': 'Decentralized lending protocol. Largest DeFi lending platform.',
        'key_facts': [
            '14+ auditors: OpenZeppelin, Certora, MixBytes, Trail of Bits, etc.',
            '$1M bug bounty on Immunefi',
            '$15B+ TVL, 8+ years operational (ETHLend 2017)',
            'Zero major hacks',
            '$246M Safety Module backstop',
            'Deployed on 13+ networks',
            'Open source',
            'AAVE token governance',
            'GHO native stablecoin',
            'Over-collateralized lending',
            'Flash loans supported',
        ]
    },
    'binance': {
        'type': 'CEX',
        'description': 'Largest centralized cryptocurrency exchange by volume.',
        'key_facts': [
            'SOC 2 Type II audit by A-LIGN',
            'ISO 27001 certified',
            '$1B SAFU emergency fund',
            'Proof of Reserves with zk-SNARKs (1:1+ backing)',
            '8+ years operational',
            '2019 hack recovered via SAFU, no user losses',
            '100+ chains supported',
            '2FA, passkeys, anti-phishing',
            'Majority in cold storage',
            'KYC/AML compliance',
            'NOT open source (proprietary)',
            'Mobile and desktop apps',
            'Fiat on/off ramps in 50+ currencies',
        ]
    },
    'metamask': {
        'type': 'SW_WALLET',
        'description': 'Most popular Ethereum wallet browser extension.',
        'key_facts': [
            'Audited by Cure53, LeastAuthority',
            'Open source on GitHub',
            '30M+ monthly active users',
            '8+ years operational',
            'Hardware wallet support (Ledger, Trezor)',
            'Browser extension + mobile app',
            'EVM chains only (Ethereum, Polygon, etc.)',
            'No native Bitcoin support',
            'Biometric authentication on mobile',
            'Seed phrase backup',
            'Non-custodial',
            'Snap plugins for extensibility',
        ]
    },
    'ledger-nano-x': {
        'type': 'HW_WALLET',
        'description': 'Hardware wallet with Bluetooth, Secure Element EAL5+ certified.',
        'key_facts': [
            'CC EAL5+ Secure Element (ST33J2M0)',
            'BOLOS custom operating system',
            'PIN protection with wipe after 3 attempts',
            '24-word recovery phrase (BIP-39)',
            'Passphrase for hidden wallets',
            'Bluetooth connectivity',
            '5000+ assets supported',
            '10+ years operational, 7M+ units sold, zero device hacks',
            'Ledger Live companion app',
            'NOT open source (Secure Element constraints)',
            'No biometric authentication',
            'Genuine check verification',
            'Hardware buttons for transaction confirmation',
        ]
    },
    'trezor-safe-5': {
        'type': 'HW_WALLET',
        'description': 'Hardware wallet with touchscreen and EAL6+ Secure Element.',
        'key_facts': [
            'EAL6+ Secure Element',
            '100% open source firmware',
            'PIN with exponential delay',
            'Shamir Backup (SLIP-0039)',
            'Passphrase support',
            'Color touchscreen',
            '11+ years operational (first hardware wallet 2013)',
            'Trezor Suite companion app',
            'No Bluetooth (intentional)',
            'USB-C only',
            'CoinJoin for Bitcoin privacy',
            '9000+ assets supported',
        ]
    },
}


def evaluate_norm_batch_with_ai(product_slug, product_info, norms_batch):
    """Évalue un batch de normes avec l'IA"""

    product_name = product_info.get('name', product_slug)
    knowledge = PRODUCT_KNOWLEDGE.get(product_slug, {})
    product_type = knowledge.get('type', 'Unknown')
    description = knowledge.get('description', '')
    key_facts = knowledge.get('key_facts', [])

    # Build context
    context = f"""Product: {product_name}
Type: {product_type}
Description: {description}

Key Security Facts:
{chr(10).join(f'- {fact}' for fact in key_facts)}
"""

    # Build norms list
    norms_text = ""
    for norm in norms_batch:
        norms_text += f"\n{norm['code']}: {norm['title']}"
        if norm.get('description'):
            norms_text += f" - {norm['description'][:100]}"

    prompt = f"""You are evaluating {product_name} ({product_type}) against security standards.

{context}

EVALUATION RULES:
- YES: The product/protocol has this feature or capability
- YESp: Feature is INHERITED from underlying platform (EVM crypto, blockchain security)
- NO: The product explicitly lacks this feature AND the feature is relevant to this product type
- N/A: This norm is NOT APPLICABLE to this product category (e.g., hardware norms for software, physical features for DeFi)

IMPORTANT CONTEXT:
- For DeFi protocols: Most hardware/physical security norms are N/A
- For DeFi protocols: EVM cryptography (ECDSA, Keccak, secp256k1) is YESp
- For software wallets: Secure Element norms are N/A
- For CEX: Most norms about custody, 2FA, cold storage are YES

Format: CODE|RESULT|REASON (50 chars max for reason)

NORMS:{norms_text}

Evaluations (one per line):
"""

    response = call_groq(prompt, max_tokens=2000)
    if not response:
        return None

    # Parse response
    results = {}
    for line in response.strip().split('\n'):
        line = line.strip()
        if '|' in line:
            parts = line.split('|')
            if len(parts) >= 2:
                code = parts[0].strip()
                result = parts[1].strip().upper()
                reason = parts[2].strip() if len(parts) > 2 else ''

                # Validate result
                if result in ['YES', 'YESP', 'NO', 'N/A', 'NA', 'TBD']:
                    if result == 'YESP': result = 'YESp'
                    if result == 'NA': result = 'N/A'
                    results[code] = {'result': result, 'reason': reason[:200]}

    return results


def main():
    headers = get_headers()

    # Load norms
    print("Chargement des normes...")
    r = requests.get(f'{SUPABASE_URL}/rest/v1/norms?select=id,code,pillar,title,description', headers=headers)
    all_norms = {n['code']: n for n in r.json()}
    print(f"Normes chargées: {len(all_norms)}")

    # Products to evaluate with AI
    products_to_eval = [
        'uniswap',
        'aave',
        'binance',
        'metamask',
        'ledger-nano-x',
        'trezor-safe-5',
    ]

    for slug in products_to_eval:
        knowledge = PRODUCT_KNOWLEDGE.get(slug, {})
        if not knowledge:
            print(f"[SKIP] {slug} - pas de knowledge base")
            continue

        # Load product
        r = requests.get(f'{SUPABASE_URL}/rest/v1/products?select=id,name,slug,type_id&slug=eq.{slug}', headers=headers)
        products = r.json()

        if not products:
            print(f"[SKIP] {slug} - non trouvé en DB")
            continue

        product = products[0]
        print(f"\n{'='*60}")
        print(f"Évaluation IA de: {product['name']} (ID: {product['id']})")

        # Get applicable norms
        canonical_type = normalize_type(knowledge.get('type', 'DEX'))
        applicable_codes = [code for code, types in NORM_APPLICABILITY.items() if canonical_type in types]

        # Filter norms
        norms_to_eval = [all_norms[code] for code in applicable_codes if code in all_norms]
        print(f"Normes applicables: {len(norms_to_eval)}")

        # Evaluate in batches
        batch_size = 30
        all_results = {}

        for i in range(0, len(norms_to_eval), batch_size):
            batch = norms_to_eval[i:i+batch_size]
            print(f"  Batch {i//batch_size + 1}/{(len(norms_to_eval) + batch_size - 1)//batch_size}...", end=" ", flush=True)

            results = evaluate_norm_batch_with_ai(slug, product, batch)
            if results:
                all_results.update(results)
                print(f"OK ({len(results)} résultats)")
            else:
                print("ERREUR")

            time.sleep(0.5)  # Rate limit - reduced with key rotation

        # Compile evaluations
        evaluations = []
        stats = {'YES': 0, 'YESp': 0, 'NO': 0, 'N/A': 0, 'TBD': 0}

        for norm in norms_to_eval:
            code = norm['code']
            if code in all_results:
                result = all_results[code]['result']
                reason = all_results[code]['reason']
            else:
                result = 'TBD'
                reason = 'AI evaluation failed'

            stats[result] = stats.get(result, 0) + 1

            evaluations.append({
                'product_id': product['id'],
                'norm_id': norm['id'],
                'result': result,
                'why_this_result': reason[:500],
                'evaluated_by': 'claude_groq_ai_v1',
                'confidence_score': 0.9 if result != 'TBD' else 0.5
            })

        # Stats
        print(f"\nRésultats:")
        for k, v in stats.items():
            print(f"  {k}: {v}")

        # Calculate score
        positive = stats['YES'] + stats['YESp']
        negative = stats['NO']
        total = positive + negative
        if total > 0:
            score = (positive / total) * 100
            print(f"\nScore: {score:.1f}%")

        # Save to database
        print(f"\nSauvegarde de {len(evaluations)} évaluations...")
        batch_size = 200
        saved = 0

        for i in range(0, len(evaluations), batch_size):
            batch = evaluations[i:i+batch_size]
            r = requests.post(
                f'{SUPABASE_URL}/rest/v1/evaluations',
                headers=headers,
                json=batch
            )
            if r.status_code in [200, 201]:
                saved += len(batch)

        print(f"Sauvegardé: {saved}/{len(evaluations)}")

if __name__ == '__main__':
    main()
