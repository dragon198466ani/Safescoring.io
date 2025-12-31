#!/usr/bin/env python3
"""
SAFESCORING.IO - AI Product Type Verifier
Utilise l'IA (Mistral/Gemini) pour vérifier les types de produits via web search.
"""

import requests
import sys
import json
import os
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent / 'src'))
from core.config import SUPABASE_URL, SUPABASE_HEADERS

# Configuration API
MISTRAL_API_KEY = os.getenv('MISTRAL_API_KEY')
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')

# Types disponibles dans SafeScoring
AVAILABLE_TYPES = [
    "HW Cold", "HW Hot", "HW NFC Signer",
    "SW Browser", "SW Mobile", "Wallet MultiPlatform", "Wallet MultiSig",
    "DEX", "CEX", "Bridges",
    "Lending", "Yield", "Liq Staking", "Derivatives",
    "Card", "Card Non-Cust", "Neobank", "Crypto Bank",
    "Bkp Physical", "Bkp Digital", "Seed Splitter",
    "AC Phys", "AC Digit",
    "Custody MPC", "Custody MultiSig", "Enterprise Custody",
    "DeFi Tools", "RWA", "Inheritance", "Protocol", "Settlement", "Airgap Signer"
]

TYPE_DEFINITIONS = """
Types disponibles et leurs définitions:

HARDWARE:
- HW Cold: Hardware wallet air-gapped (Ledger, Trezor, Coldcard)
- HW Hot: Hardware 2FA/bearer card (YubiKey, SATSCARD)
- HW NFC Signer: Carte NFC de signature (TAPSIGNER, Status Keycard)

SOFTWARE:
- SW Browser: Extension navigateur uniquement
- SW Mobile: App mobile uniquement
- Wallet MultiPlatform: Wallet disponible sur plusieurs plateformes (browser + mobile)
- Wallet MultiSig: Wallet avec fonctionnalité multi-signature

DEFI:
- DEX: Decentralized exchange
- Lending: Protocole de prêt (Aave, Compound)
- Yield: Yield aggregator/optimizer
- Liq Staking: Liquid staking (Lido, Rocket Pool)
- Derivatives: Options, perpetuals, futures
- DeFi Tools: Dashboards, portfolio trackers

FINANCE:
- CEX: Centralized exchange
- Card: Carte crypto CUSTODIALE
- Card Non-Cust: Carte crypto NON-CUSTODIALE (self-custody)
- Neobank: Banque fintech
- Crypto Bank: Banque crypto régulée

BACKUP:
- Bkp Physical: Backup physique métal/steel
- Bkp Digital: Backup digital/cloud
- Seed Splitter: Shamir/SSS backup

SECURITY:
- AC Phys: Anti-coercion physique (duress PIN, brick me PIN, hidden wallet hardware)
- AC Digit: Anti-coercion digital (coinjoin, privacy features software)

CUSTODY:
- Custody MPC: Multi-Party Computation
- Custody MultiSig: Multi-Signature custody
- Enterprise Custody: Enterprise-grade custody

OTHER:
- Bridges: Cross-chain bridges
- RWA: Real World Assets tokenization
- Inheritance: Inheritance/timelock features
"""


def call_mistral(prompt: str) -> str:
    """Appelle l'API Mistral"""
    if not MISTRAL_API_KEY:
        return None

    response = requests.post(
        "https://api.mistral.ai/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {MISTRAL_API_KEY}",
            "Content-Type": "application/json"
        },
        json={
            "model": "mistral-small-latest",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.1
        }
    )

    if response.status_code == 200:
        return response.json()["choices"][0]["message"]["content"]
    return None


def call_gemini(prompt: str) -> str:
    """Appelle l'API Gemini"""
    if not GEMINI_API_KEY:
        return None

    response = requests.post(
        f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}",
        headers={"Content-Type": "application/json"},
        json={
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.1}
        }
    )

    if response.status_code == 200:
        return response.json()["candidates"][0]["content"]["parts"][0]["text"]
    return None


def verify_product_with_ai(product_name: str, current_types: list) -> dict:
    """Vérifie un produit avec l'IA"""

    prompt = f"""Tu es un expert en crypto/blockchain. Analyse le produit "{product_name}" et détermine ses types corrects.

{TYPE_DEFINITIONS}

Types actuels assignés: {', '.join(current_types) if current_types else 'Aucun'}

INSTRUCTIONS:
1. Recherche ce que fait réellement "{product_name}"
2. Détermine les types appropriés (max 3)
3. Pour AC Phys: SEULEMENT si le produit a un duress PIN, brick me PIN, ou hidden wallet HARDWARE dédié
4. Pour AC Digit: SEULEMENT si le produit a des fonctionnalités de privacy (coinjoin, etc.)

Réponds UNIQUEMENT avec un JSON valide:
{{
    "product": "{product_name}",
    "description": "Description courte du produit",
    "recommended_types": ["Type1", "Type2"],
    "reasoning": "Explication",
    "changes": {{
        "add": ["types à ajouter"],
        "remove": ["types à supprimer"]
    }}
}}
"""

    # Try Mistral first, then Gemini
    response = call_mistral(prompt)
    if not response:
        response = call_gemini(prompt)

    if response:
        try:
            # Extract JSON from response
            start = response.find('{')
            end = response.rfind('}') + 1
            if start >= 0 and end > start:
                return json.loads(response[start:end])
        except json.JSONDecodeError:
            pass

    return None


def load_current_data():
    """Charge les données actuelles"""
    r = requests.get(f'{SUPABASE_URL}/rest/v1/product_types?select=id,code', headers=SUPABASE_HEADERS)
    types_by_id = {t['id']: t['code'] for t in r.json()}
    type_by_code = {t['code']: t['id'] for t in r.json()}

    r = requests.get(f'{SUPABASE_URL}/rest/v1/product_type_mapping?select=product_id,type_id', headers=SUPABASE_HEADERS)
    mappings = {}
    for m in r.json():
        pid = m['product_id']
        if pid not in mappings:
            mappings[pid] = []
        mappings[pid].append(types_by_id.get(m['type_id'], '?'))

    r = requests.get(f'{SUPABASE_URL}/rest/v1/products?select=id,name&order=name', headers=SUPABASE_HEADERS)
    products = r.json()

    return types_by_id, type_by_code, mappings, products


def main():
    import argparse

    parser = argparse.ArgumentParser(description='AI Product Type Verifier')
    parser.add_argument('--product', type=str, help='Vérifier un produit spécifique')
    parser.add_argument('--batch', type=int, default=10, help='Nombre de produits à vérifier')
    parser.add_argument('--start', type=int, default=0, help='Index de départ')
    parser.add_argument('--apply', action='store_true', help='Appliquer les corrections')
    args = parser.parse_args()

    print("\n" + "=" * 70)
    print("AI PRODUCT TYPE VERIFIER")
    print("=" * 70)

    if not MISTRAL_API_KEY and not GEMINI_API_KEY:
        print("\n⚠️  Aucune clé API trouvée!")
        print("Définissez MISTRAL_API_KEY ou GEMINI_API_KEY")
        return

    types_by_id, type_by_code, mappings, products = load_current_data()

    if args.product:
        # Vérifier un produit spécifique
        product = next((p for p in products if p['name'].lower() == args.product.lower()), None)
        if not product:
            print(f"Produit '{args.product}' non trouvé")
            return

        current_types = mappings.get(product['id'], [])
        print(f"\nVérification de: {product['name']}")
        print(f"Types actuels: {', '.join(current_types)}")

        result = verify_product_with_ai(product['name'], current_types)
        if result:
            print(f"\n{json.dumps(result, indent=2, ensure_ascii=False)}")
    else:
        # Vérifier un batch
        batch = products[args.start:args.start + args.batch]
        results = []

        for i, product in enumerate(batch):
            current_types = mappings.get(product['id'], [])
            print(f"\n[{i+1}/{len(batch)}] {product['name']}")
            print(f"  Types actuels: {', '.join(current_types)}")

            result = verify_product_with_ai(product['name'], current_types)
            if result:
                results.append(result)
                if result.get('changes', {}).get('add') or result.get('changes', {}).get('remove'):
                    print(f"  ⚠️  Changements suggérés:")
                    if result['changes'].get('add'):
                        print(f"     + {', '.join(result['changes']['add'])}")
                    if result['changes'].get('remove'):
                        print(f"     - {', '.join(result['changes']['remove'])}")
                else:
                    print(f"  ✓ OK")

            time.sleep(1)  # Rate limiting

        # Summary
        print("\n" + "=" * 70)
        print("RÉSUMÉ")
        print("=" * 70)
        changes_needed = [r for r in results if r.get('changes', {}).get('add') or r.get('changes', {}).get('remove')]
        print(f"Produits vérifiés: {len(results)}")
        print(f"Changements suggérés: {len(changes_needed)}")


if __name__ == "__main__":
    main()
