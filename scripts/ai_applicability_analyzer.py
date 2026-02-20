#!/usr/bin/env python3
"""
Analyse d'applicabilite des normes avec IA
Compare le resultat avec le mapping manuel
"""
import requests
import json
import time
import random
from config_helper import SUPABASE_URL, SUPABASE_KEY, get_supabase_headers

# Import du mapping actuel pour comparaison
from src.core.norm_applicability_complete import NORM_APPLICABILITY, CANONICAL_TYPES

# API Gemini (gratuit)
GEMINI_API_KEY = "REVOKED_ROTATE_ON_DASHBOARD"
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"

def analyze_norm_with_ai(norm_code: str, title: str, description: str, pillar: str) -> list:
    """Utilise l'IA pour determiner les types applicables"""

    prompt = f"""Tu es un expert en securite crypto et normes de conformite.

Analyse cette norme et determine a quels types de produits crypto elle s'applique.

NORME:
- Code: {norm_code}
- Pilier: {pillar} (S=Securite, A=Anti-coercion, F=Fiabilite, E=Ecosysteme)
- Titre: {title}
- Description: {description}

TYPES DE PRODUITS DISPONIBLES:
- HW_WALLET: Hardware wallet (Ledger, Trezor)
- SW_WALLET: Software wallet (Metamask, Trust Wallet)
- MULTISIG: Multi-signature wallet
- CUSTODY: Service de garde institutionnel
- CEX: Exchange centralise (Binance, Coinbase)
- DEX: Exchange decentralise (Uniswap, Curve)
- DEX_AGG: Agregateur DEX (1inch, Paraswap)
- BRIDGE: Pont cross-chain (Stargate, Across)
- LENDING: Protocole de pret (Aave, Compound)
- YIELD: Agregateur de rendement (Yearn)
- STAKING: Service de staking
- LIQUID_STAKING: Staking liquide (Lido)
- PERP_DEX: DEX perpetuels (GMX, dYdX)
- NFT_MARKET: Marketplace NFT (OpenSea)
- BANK: Banque crypto
- CARD: Carte crypto
- PAYMENT: Paiement crypto
- DAO: Organisation autonome
- ORACLE: Oracle de prix
- INSURANCE: Assurance DeFi

INSTRUCTIONS:
1. Analyse le contenu de la norme
2. Determine les types de produits auxquels elle s'applique VRAIMENT
3. Sois RESTRICTIF - n'inclus que les types directement concernes
4. Une norme CEX ne s'applique PAS aux wallets
5. Une norme wallet ne s'applique PAS aux DEX

Reponds UNIQUEMENT avec un tableau JSON des types applicables, sans explication.
Exemple: ["CEX", "CUSTODY", "BANK"]
"""

    try:
        response = requests.post(
            f"{GEMINI_URL}?key={GEMINI_API_KEY}",
            headers={"Content-Type": "application/json"},
            json={
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {
                    "temperature": 0.1,
                    "maxOutputTokens": 200
                }
            },
            timeout=30
        )

        if response.status_code == 200:
            result = response.json()
            text = result['candidates'][0]['content']['parts'][0]['text']
            # Extraire le JSON du texte
            text = text.strip()
            if text.startswith('```'):
                text = text.split('```')[1]
                if text.startswith('json'):
                    text = text[4:]
            text = text.strip()
            types = json.loads(text)
            # Filtrer les types valides
            return [t for t in types if t in CANONICAL_TYPES]
        else:
            return []
    except Exception as e:
        return []


def main():
    print('=' * 80)
    print('ANALYSE D\'APPLICABILITE PAR IA')
    print('=' * 80)

    # Recuperer un echantillon de normes
    headers = get_supabase_headers()

    # Selectionner des normes variees pour test
    test_codes = [
        # Normes specifiques
        'S-CEX-COLD', 'S-CEX-HSM', 'A-CEX-2FA',
        'S-BRIDGE-AUDIT', 'A-BRIDGE-DELAY',
        'S-LEND-LTV', 'A-LEND-LIMIT',
        'S-NFT-AUDIT', 'A-NFT-FRAUD',
        'S-LST-AUDIT', 'S-STAKE-SLASH',
        # Normes generiques
        'S-BIP39', 'A-CRYPTO-DURESS', 'S-SC-AUDIT',
        # Normes legacy
        'A01', 'E101', 'F201', 'S101',
    ]

    # Recuperer les details des normes
    resp = requests.get(
        f'{SUPABASE_URL}/rest/v1/norms?code=in.({",".join(test_codes)})&select=code,pillar,title,description',
        headers=headers
    )

    if resp.status_code != 200:
        print(f'Erreur: {resp.status_code}')
        return

    norms = resp.json()
    print(f'Normes a analyser: {len(norms)}')
    print()

    results = []
    matches = 0
    total = 0

    for norm in norms:
        code = norm['code']
        title = norm.get('title', '')
        desc = norm.get('description', '')
        pillar = norm.get('pillar', '')

        print(f'Analyse: {code} - {title[:40]}...')

        # Mapping manuel actuel
        manual_types = NORM_APPLICABILITY.get(code, [])

        # Analyse IA
        ai_types = analyze_norm_with_ai(code, title, desc, pillar)

        # Comparaison
        manual_set = set(manual_types)
        ai_set = set(ai_types)

        # Intersection et differences
        common = manual_set & ai_set
        only_manual = manual_set - ai_set
        only_ai = ai_set - manual_set

        # Score de similarite
        if manual_set or ai_set:
            similarity = len(common) / len(manual_set | ai_set) * 100
        else:
            similarity = 100

        total += 1
        if similarity >= 50:
            matches += 1

        results.append({
            'code': code,
            'manual': sorted(manual_types)[:5],
            'ai': sorted(ai_types)[:5],
            'similarity': similarity,
            'only_manual': sorted(only_manual)[:3],
            'only_ai': sorted(only_ai)[:3]
        })

        # Affichage
        status = 'OK' if similarity >= 70 else 'DIFF' if similarity >= 40 else 'ECART'
        print(f'  [{status}] Similarite: {similarity:.0f}%')
        print(f'  Manuel: {manual_types[:4]}...' if len(manual_types) > 4 else f'  Manuel: {manual_types}')
        print(f'  IA:     {ai_types[:4]}...' if len(ai_types) > 4 else f'  IA:     {ai_types}')
        if only_manual:
            print(f'  Seulement manuel: {list(only_manual)[:3]}')
        if only_ai:
            print(f'  Seulement IA: {list(only_ai)[:3]}')
        print()

        # Rate limiting
        time.sleep(1)

    # Resume
    print('=' * 80)
    print('RESUME COMPARAISON MANUEL vs IA')
    print('=' * 80)
    print(f'Normes analysees: {total}')
    print(f'Concordance >= 50%: {matches}/{total} ({matches/total*100:.0f}%)')
    print()

    # Cas interessants
    print('CAS AVEC ECARTS SIGNIFICATIFS:')
    for r in results:
        if r['similarity'] < 50:
            print(f"  {r['code']}: {r['similarity']:.0f}%")
            print(f"    Manuel: {r['manual']}")
            print(f"    IA: {r['ai']}")

    # Recommandations
    print()
    print('ANALYSE:')
    avg_similarity = sum(r['similarity'] for r in results) / len(results)
    print(f'  Similarite moyenne: {avg_similarity:.0f}%')

    if avg_similarity >= 70:
        print('  -> Le mapping manuel est globalement correct')
    elif avg_similarity >= 50:
        print('  -> Le mapping manuel est acceptable mais peut etre affine')
    else:
        print('  -> Le mapping manuel necessite une revision')


if __name__ == '__main__':
    main()
