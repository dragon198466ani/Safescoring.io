#!/usr/bin/env python3
"""
SAFESCORING - EVALUATION COMPLETE AVEC IAs GRATUITES
=====================================================
Pipeline complète d'évaluation:
1. Charge les produits et normes applicables
2. Utilise les prompts experts par type de produit
3. Évalue chaque pilier (S, A, F, E) avec IAs gratuites
4. Calcule les scores: YES / (YES + NO) * 100
5. Sauvegarde dans Supabase

IAs utilisées (ordre de priorité):
- Groq (Llama 70B) - 14,400 req/jour
- SambaNova (DeepSeek) - ILLIMITÉ
- Cerebras (Llama 70B) - ILLIMITÉ
- Google Gemini - 1.5M tokens/jour
"""

import os
import sys
import requests
import time
import json
from datetime import datetime
from dotenv import load_dotenv

# Ajouter le chemin src pour les imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv('config/.env')

from src.core.api_provider import AIProvider, parse_evaluation_response
from src.core.config import SUPABASE_URL, get_supabase_headers

# =============================================================================
# PROMPTS EXPERTS PAR TYPE DE PRODUIT
# =============================================================================

SYSTEM_PROMPT_BASE = """You are an expert in crypto security and blockchain product evaluation.

RATING SYSTEM:
- YES = Product implements this norm WITH documented evidence (official docs, audit report, source code)
- YESp = Mathematically inherent to the protocol (secp256k1 for ETH, SHA-256 for BTC, TLS for HTTPS)
- NO = No evidence found, or norm not applicable to product architecture
- N/A = Not applicable to this product type (e.g., physical norms for software)

EVIDENCE-BASED EVALUATION:
1. NO EVIDENCE = NO: Silence about a feature is not evidence of implementation
2. AUDIT EVIDENCE: Named firm with published report = YES for audit scope only
3. SOURCE CODE: Verifiable implementation in open source = YES
4. CERTIFICATIONS: ISO, SOC2, CC EAL = YES for covered norms
5. 50-70% is NORMAL for good products. 90%+ is exceptional.

=== ANTI-HALLUCINATION RULES ===
1. CHAIN SUPPORT - BE SPECIFIC:
   - EVM-only products do NOT support Bitcoin, Solana, Cosmos, Polkadot
   - Only YES if explicitly supported
2. PHYSICAL vs SOFTWARE:
   - Material norms (metals, waterproof) = N/A for software/DeFi
   - Secure Element = N/A for software/DeFi
3. AVOID:
   - "High TVL" as justification for security features
   - Generic "secure" without mechanism

FORMAT (one line per norm):
CODE: RESULT | Brief justification (max 100 chars)
"""

# Prompts spécialisés par type
PROMPT_DEFI = SYSTEM_PROMPT_BASE + """
TYPE: DeFi Protocol (DEX, Lending, Yield)

SPECIFIC RULES:
- Audited by OpenZeppelin/Trail of Bits/Certik = YES for security norms
- High TVL maintained = security works (but not for specific technical norms)
- EVM-only = YES for EVM chains, NO for Bitcoin/Solana/Cosmos
- Physical norms = N/A (not applicable to DeFi)
- Secure Element norms = N/A (software product)

YESp AUTOMATIC: secp256k1, ECDSA, Keccak-256, EIP-712, TLS 1.3, HTTPS
"""

PROMPT_HARDWARE = SYSTEM_PROMPT_BASE + """
TYPE: Hardware Wallet

SPECIFIC RULES:
- Secure Element: Ledger (ST33), Trezor Safe 3 (ATECC608), etc. = YES
- CC EAL5+/FIPS certifications: if product is from major brand (Ledger, Trezor) = YES
- BIP-39/32/44 = YESp (standard for all HD wallets)
- Physical security: Ledger/Trezor/NGRAVE/CoolWallet are KNOWN secure = YES
- Open source firmware (Trezor) = YES for transparency
- Closed source with SE (Ledger) = YES for security (different model)

ESTABLISHED BRANDS (use documented specs as evidence):
- Ledger: Secure Element ST33 documented, EAL5+ certified = YES for certified norms
- Trezor: Open source firmware, multiple public audits = YES for audited/verified norms
- NGRAVE: Air-gapped design, EAL7 certified = YES for certified norms
- CoolWallet: Bluetooth, Secure Element, established = YES for basic norms

NO DEVICE HACKS = YES for attack resistance norms
"""

PROMPT_SOFTWARE_WALLET = SYSTEM_PROMPT_BASE + """
TYPE: Software Wallet

SPECIFIC RULES:
- Encrypted storage (AES-256, ChaCha20) = YES if documented
- Open source on GitHub = YES for transparency
- BIP-39/32/44 = YESp for seed-based wallets
- Secure enclave usage (iOS Keychain, Android TEE) = YES if documented
- Physical norms = N/A (software product)

TLS/HTTPS = YESp for all network connections
"""

PROMPT_EXCHANGE = SYSTEM_PROMPT_BASE + """
TYPE: Centralized Exchange (CEX)

SPECIFIC RULES:
- Cold storage (95%+ funds) = YES if documented
- Proof of Reserves = YES if public attestation exists
- 2FA mandatory = YES if required
- SOC 2/ISO 27001 = YES if certified
- Regulatory licenses = YES if listed
- Insurance coverage = YES if documented amount

NO RESERVES PROOF = NO for reserve-related norms
"""

PROMPT_BRIDGE = SYSTEM_PROMPT_BASE + """
TYPE: Cross-Chain Bridge

⚠️ HIGH-RISK CATEGORY (Major hacks: Ronin $625M, Wormhole $320M)

SPECIFIC RULES:
- Multiple audits REQUIRED for bridges
- Validator set documentation needed
- Emergency pause mechanism = YES if exists
- Rate limiting = YES if documented
- Single-party control = NO for decentralization

STRICT: Past exploit without post-mortem = concern
"""

PROMPT_BACKUP = SYSTEM_PROMPT_BASE + """
TYPE: Physical Backup (Metal plates, etc.)

SPECIFIC RULES:
- Material quality (titanium, steel grade) = YES if documented
- Fire resistance (temp rating) = YES if tested/documented
- Water resistance (IP rating) = YES if rated
- Corrosion resistance = YES if material specs given
- Anti-tamper = YES if sealed packaging

STRICT: "Military-grade" without specs = NO
"""

# Mapping type_code -> prompt
TYPE_PROMPTS = {
    # DeFi
    'DEX': PROMPT_DEFI,
    'DEX Agg': PROMPT_DEFI,
    'Lending': PROMPT_DEFI,
    'Derivatives': PROMPT_DEFI,
    'Liq Staking': PROMPT_DEFI,
    'Restaking': PROMPT_DEFI,

    # Hardware
    'HW Cold': PROMPT_HARDWARE,

    # Software Wallets
    'SW Desktop': PROMPT_SOFTWARE_WALLET,
    'SW Mobile': PROMPT_SOFTWARE_WALLET,
    'SW Browser': PROMPT_SOFTWARE_WALLET,

    # Exchanges
    'CEX': PROMPT_EXCHANGE,
    'Custody': PROMPT_EXCHANGE,

    # Bridges
    'Bridges': PROMPT_BRIDGE,

    # Physical Backup
    'Bkp Physical': PROMPT_BACKUP,
}

# Pillar-specific additions
PILLAR_ADDITIONS = {
    'S': """
PILLAR S - SECURITY (Focus on cryptographic security)
- Encryption algorithms, key management, secure storage
- Audit status, vulnerability history
- Protocol standards implementation
""",
    'A': """
PILLAR A - ADVERSITY (Attack resistance)
- Anti-coercion features (duress PIN, hidden wallets) - mainly for hardware
- Incident response, insurance coverage
- Privacy features, decentralization
""",
    'F': """
PILLAR F - FIDELITY (Reliability & track record)
- Years of operation, incident history
- Audit transparency, documentation quality
- Support channels, community health
- PHYSICAL MATERIAL NORMS (F01-F20) = N/A for software/DeFi
""",
    'E': """
PILLAR E - ECOSYSTEM (Usability & compatibility)
- Supported chains (be SPECIFIC - EVM only vs multi-chain)
- Platform availability (web, mobile, desktop)
- Integration capabilities, token standards
"""
}


def get_headers():
    return get_supabase_headers()


def load_products(limit=None, product_filter=None):
    """Charge les produits avec leur type."""
    headers = get_headers()
    url = f'{SUPABASE_URL}/rest/v1/products?select=id,name,slug,url,type_id,product_types(code,name,is_hardware,is_custodial)'

    if product_filter:
        url += f"&slug=eq.{product_filter}"
    if limit:
        url += f"&limit={limit}"

    r = requests.get(url, headers=headers)
    if r.status_code == 200:
        return r.json()
    return []


def load_norms():
    """Charge toutes les normes."""
    headers = get_headers()
    all_norms = []
    offset = 0

    while True:
        r = requests.get(
            f'{SUPABASE_URL}/rest/v1/norms?select=id,code,pillar,title,description&limit=1000&offset={offset}',
            headers=headers
        )
        if r.status_code != 200:
            break
        batch = r.json()
        if not batch:
            break
        all_norms.extend(batch)
        if len(batch) < 1000:
            break
        offset += 1000

    return all_norms


def load_applicable_norms(type_id):
    """Charge les IDs des normes applicables pour un type."""
    headers = get_headers()
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/norm_applicability?type_id=eq.{type_id}&is_applicable=eq.true&select=norm_id',
        headers=headers
    )
    if r.status_code == 200:
        return {n['norm_id'] for n in r.json()}
    return set()


def calculate_pillar_score(evaluations):
    """
    Score simple: YES / (YES + NO) * 100
    N/A et TBD sont ignorés.
    """
    yes_count = sum(1 for e in evaluations if e['result'] in ['YES', 'YESp'])
    no_count = sum(1 for e in evaluations if e['result'] == 'NO')

    total = yes_count + no_count
    if total == 0:
        return None

    return round((yes_count / total) * 100, 1)


def build_evaluation_prompt(product, norms, pillar, type_code, batch_num=1, total_batches=1):
    """Construit le prompt d'évaluation pour un pilier."""
    # Sélectionner le prompt par type
    base_prompt = TYPE_PROMPTS.get(type_code, SYSTEM_PROMPT_BASE)
    pillar_addition = PILLAR_ADDITIONS.get(pillar, '')

    # Construire la liste des normes
    norms_text = "\n".join([
        f"- {n['code']}: {n['title']}"
        for n in norms
    ])

    batch_info = f" (Batch {batch_num}/{total_batches})" if total_batches > 1 else ""

    prompt = f"""{base_prompt}

{pillar_addition}

=== PRODUCT TO EVALUATE ===
Name: {product['name']}
Type: {type_code}
URL: {product.get('url', 'N/A')}

=== NORMS TO EVALUATE (Pillar {pillar}{batch_info}) ===
{norms_text}

Evaluate each norm. Format: CODE: RESULT | Brief reason
"""
    return prompt


def evaluate_pillar_batched(product, pillar_norms, pillar, type_code, ai_provider, batch_size=35):
    """Évalue un pilier en plusieurs batches si nécessaire."""
    all_parsed = {}
    total_batches = (len(pillar_norms) + batch_size - 1) // batch_size

    for batch_idx in range(total_batches):
        start = batch_idx * batch_size
        end = min(start + batch_size, len(pillar_norms))
        batch_norms = pillar_norms[start:end]

        prompt = build_evaluation_prompt(
            product, batch_norms, pillar, type_code,
            batch_num=batch_idx + 1, total_batches=total_batches
        )

        try:
            result = ai_provider.call(prompt, max_tokens=3000, temperature=0.1)
            if result:
                parsed = parse_evaluation_response(result)
                all_parsed.update(parsed)
        except Exception as e:
            print(f"  Batch {batch_idx+1} erreur: {e}")

        if total_batches > 1 and batch_idx < total_batches - 1:
            time.sleep(0.3)  # Petit délai entre batches

    return all_parsed


def evaluate_product(product, all_norms, ai_provider):
    """Évalue un produit sur les 4 piliers."""
    product_name = product['name']
    product_type = product.get('product_types', {}) or {}
    type_code = product_type.get('code', 'Unknown')
    type_id = product.get('type_id')

    print(f"\n{'='*60}")
    print(f"[{product_name}] - Type: {type_code}")
    print('='*60)

    # Charger les normes applicables
    if type_id:
        applicable_ids = load_applicable_norms(type_id)
        applicable_norms = [n for n in all_norms if n['id'] in applicable_ids]
    else:
        applicable_norms = all_norms

    print(f"Normes applicables: {len(applicable_norms)}")

    if not applicable_norms:
        print("  SKIP: Aucune norme applicable")
        return None

    all_evaluations = []
    pillar_scores = {}

    # Évaluer chaque pilier
    for pillar in ['S', 'A', 'F', 'E']:
        pillar_norms = [n for n in applicable_norms if n['pillar'] == pillar]

        if not pillar_norms:
            print(f"  {pillar}: 0 normes")
            continue

        num_batches = (len(pillar_norms) + 34) // 35
        print(f"  {pillar}: {len(pillar_norms)} normes ({num_batches} batches)...", end=" ", flush=True)

        # Évaluer par batches
        parsed = evaluate_pillar_batched(product, pillar_norms, pillar, type_code, ai_provider)

        if not parsed:
            print("SKIP (pas de réponse)")
            continue

        # Créer les évaluations
        pillar_evals = []
        for norm in pillar_norms:
            code = norm['code']
            if code in parsed:
                eval_result, reason = parsed[code]
            else:
                eval_result, reason = 'TBD', 'Non évalué'

            pillar_evals.append({
                'norm_id': norm['id'],
                'norm_code': code,
                'result': eval_result,
                'reason': reason
            })

        all_evaluations.extend(pillar_evals)

        # Calculer le score
        score = calculate_pillar_score(pillar_evals)
        pillar_scores[pillar] = score

        # Stats
        yes = sum(1 for e in pillar_evals if e['result'] in ['YES', 'YESp'])
        no = sum(1 for e in pillar_evals if e['result'] == 'NO')
        na = sum(1 for e in pillar_evals if e['result'] == 'N/A')
        tbd = sum(1 for e in pillar_evals if e['result'] == 'TBD')

        score_str = f"{score:.1f}%" if score else "N/A"
        print(f"{score_str} (YES:{yes} NO:{no} N/A:{na} TBD:{tbd})")

        time.sleep(0.5)  # Rate limiting

    # Score SAFE global
    valid_scores = [s for s in pillar_scores.values() if s is not None]
    global_score = sum(valid_scores) / len(valid_scores) if valid_scores else 0

    print(f"\n  >>> SAFE Score: {global_score:.1f}%")
    print(f"      S={pillar_scores.get('S', 0):.1f} A={pillar_scores.get('A', 0):.1f} F={pillar_scores.get('F', 0):.1f} E={pillar_scores.get('E', 0):.1f}")

    return {
        'product_id': product['id'],
        'product_name': product_name,
        'evaluations': all_evaluations,
        'pillar_scores': pillar_scores,
        'global_score': global_score
    }


def save_evaluations(product_id, evaluations, headers):
    """Sauvegarde les évaluations dans Supabase."""
    if not evaluations:
        return 0

    # Supprimer les anciennes
    requests.delete(
        f'{SUPABASE_URL}/rest/v1/evaluations?product_id=eq.{product_id}',
        headers=headers
    )

    # Préparer les nouvelles
    records = []
    for e in evaluations:
        records.append({
            'product_id': product_id,
            'norm_id': e['norm_id'],
            'result': e['result'],
            'why_this_result': e['reason'][:500] if e.get('reason') else None,
            'evaluated_by': 'ai_pipeline_v2',
            'confidence_score': 0.8
        })

    # Sauvegarder par batch
    saved = 0
    for i in range(0, len(records), 100):
        batch = records[i:i+100]
        r = requests.post(
            f'{SUPABASE_URL}/rest/v1/evaluations',
            headers=headers,
            json=batch
        )
        if r.status_code in [200, 201]:
            saved += len(batch)

    return saved


def save_product_scores(product_id, pillar_scores, global_score, headers):
    """Met à jour les scores du produit."""
    update_data = {
        'score_s': pillar_scores.get('S'),
        'score_a': pillar_scores.get('A'),
        'score_f': pillar_scores.get('F'),
        'score_e': pillar_scores.get('E'),
        'score_safe': global_score,
        'updated_at': datetime.utcnow().isoformat()
    }

    r = requests.patch(
        f'{SUPABASE_URL}/rest/v1/products?id=eq.{product_id}',
        headers=headers,
        json=update_data
    )
    return r.status_code in [200, 204]


def main():
    import argparse
    parser = argparse.ArgumentParser(description='Évaluation SAFE avec IAs gratuites')
    parser.add_argument('--limit', type=int, default=10, help='Nombre de produits à évaluer')
    parser.add_argument('--product', type=str, help='Slug d\'un produit spécifique')
    parser.add_argument('--save', action='store_true', help='Sauvegarder dans Supabase')
    args = parser.parse_args()

    print("=" * 60)
    print("   SAFESCORING - ÉVALUATION COMPLETE")
    print("   IAs: Groq → SambaNova → Cerebras → Gemini")
    print("=" * 60)

    headers = get_headers()

    # Initialiser le provider IA
    print("\nInitialisation des IAs gratuites...")
    ai_provider = AIProvider()

    # Charger les données
    print("Chargement des produits...")
    products = load_products(limit=args.limit, product_filter=args.product)
    print(f"  {len(products)} produits")

    print("Chargement des normes...")
    all_norms = load_norms()
    print(f"  {len(all_norms)} normes")

    # Évaluer
    results = []
    total_saved = 0

    for i, product in enumerate(products):
        print(f"\n[{i+1}/{len(products)}]", end="")

        result = evaluate_product(product, all_norms, ai_provider)

        if result:
            results.append(result)

            if args.save:
                saved = save_evaluations(result['product_id'], result['evaluations'], headers)
                save_product_scores(result['product_id'], result['pillar_scores'], result['global_score'], headers)
                print(f"  Sauvegardé: {saved} évaluations")
                total_saved += saved

        time.sleep(1)

    # Résumé final
    print(f"\n{'=' * 70}")
    print("RÉSUMÉ FINAL")
    print("=" * 70)
    print(f"{'Produit':<35} | {'SAFE':>6} | {'S':>5} | {'A':>5} | {'F':>5} | {'E':>5}")
    print("-" * 70)

    if results:
        results.sort(key=lambda x: x['global_score'], reverse=True)
        for r in results:
            ps = r['pillar_scores']
            s = ps.get('S', 0) or 0
            a = ps.get('A', 0) or 0
            f = ps.get('F', 0) or 0
            e = ps.get('E', 0) or 0
            print(f"{r['product_name'][:35]:<35} | {r['global_score']:>5.1f}% | {s:>5.1f} | {a:>5.1f} | {f:>5.1f} | {e:>5.1f}")

    print("=" * 70)
    if args.save:
        print(f"Total évaluations sauvegardées: {total_saved}")
    else:
        print("Mode simulation (--save pour sauvegarder)")


if __name__ == '__main__':
    main()
