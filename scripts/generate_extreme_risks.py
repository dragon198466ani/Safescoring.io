#!/usr/bin/env python3
"""
GENERATE EXTREME RISK WARNINGS & PERSONALIZED ADVICE
=====================================================
Analyzes SPECIFIC failed norms to generate:
- Concrete attack vectors
- Extreme risk scenarios
- Personalized recommendations
Each product gets UNIQUE advice based on its actual evaluation results.
"""
import sys
sys.path.insert(0, 'src')
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)) + '/..')

from core.config import SUPABASE_URL, get_supabase_headers
import requests
import json
import time
import re

READ_HEADERS = get_supabase_headers()
WRITE_HEADERS = get_supabase_headers(use_service_key=True)
WRITE_HEADERS['Content-Type'] = 'application/json'
WRITE_HEADERS['Prefer'] = 'return=minimal'

# Mapping of norm patterns to specific attack vectors and extreme risks
ATTACK_VECTORS = {
    # SECURITY (S) - Critical Attack Vectors
    'audit': {
        'attack': "Unaudited code exploitation - hackers scan for unaudited contracts",
        'extreme_risk': "Total fund drainage via undiscovered vulnerability (e.g., Euler Finance $197M hack)",
        'action': "Get immediate smart contract audit from Trail of Bits, OpenZeppelin, or Consensys Diligence"
    },
    'formal verification': {
        'attack': "Logic bomb or edge case exploitation in unverified code",
        'extreme_risk': "Permanent loss of locked funds due to unforeseen state transitions",
        'action': "Implement formal verification for all fund-handling functions"
    },
    'bug bounty': {
        'attack': "Zero-day exploit sold on dark markets instead of reported",
        'extreme_risk': "Coordinated attack by well-funded hackers who found vulnerability first",
        'action': "Launch bug bounty on Immunefi with minimum $100k critical bounty"
    },
    'encryption': {
        'attack': "Man-in-the-middle attack intercepting unencrypted data",
        'extreme_risk': "Private keys or seed phrases stolen during transmission",
        'action': "Implement end-to-end encryption with AES-256-GCM or ChaCha20-Poly1305"
    },
    'key management': {
        'attack': "Single point of compromise for key storage",
        'extreme_risk': "Insider threat or hack leads to all keys compromised simultaneously",
        'action': "Implement HSM-based key management with multi-party computation (MPC)"
    },
    'multi-sig': {
        'attack': "Single signature allows unauthorized transactions",
        'extreme_risk': "Rogue employee or compromised account drains all funds",
        'action': "Require 3-of-5 multisig for all treasury and admin operations"
    },
    'time-lock': {
        'attack': "Instant malicious contract upgrade or parameter change",
        'extreme_risk': "Flash loan attack combined with governance manipulation",
        'action': "Add 48-hour timelock on all admin functions with public monitoring"
    },
    'reentrancy': {
        'attack': "Classic reentrancy attack during external calls",
        'extreme_risk': "Complete protocol drainage (The DAO $60M hack pattern)",
        'action': "Implement checks-effects-interactions pattern and reentrancy guards"
    },
    'oracle': {
        'attack': "Price oracle manipulation via flash loan",
        'extreme_risk': "Protocol drained through artificial price manipulation (Mango Markets $114M)",
        'action': "Use Chainlink TWAP oracles with circuit breakers and multiple price sources"
    },
    'access control': {
        'attack': "Privilege escalation or unauthorized admin access",
        'extreme_risk': "Attacker gains admin rights and upgrades contracts maliciously",
        'action': "Implement role-based access control with principle of least privilege"
    },
    'input validation': {
        'attack': "Injection attack or overflow exploitation",
        'extreme_risk': "Integer overflow leads to minting unlimited tokens",
        'action': "Use SafeMath or Solidity 0.8+ with comprehensive input validation"
    },

    # ADVERSITY (A) - Disaster Scenarios
    'backup': {
        'attack': "Ransomware destroys primary data with no recovery option",
        'extreme_risk': "Permanent loss of user data and funds mapping",
        'action': "Implement 3-2-1 backup strategy: 3 copies, 2 media types, 1 offsite"
    },
    'disaster recovery': {
        'attack': "Data center failure or regional outage",
        'extreme_risk': "Service unavailable during market crash causing massive user losses",
        'action': "Deploy multi-region active-active architecture with <1hr RTO"
    },
    'key recovery': {
        'attack': "Key custodian unavailable (death, legal, disappearance)",
        'extreme_risk': "Funds permanently locked with no recovery mechanism",
        'action': "Implement social recovery or dead man's switch with trusted guardians"
    },
    'insurance': {
        'attack': "Major hack or exploit with no coverage",
        'extreme_risk': "Company bankruptcy, users lose everything with no recourse",
        'action': "Obtain Nexus Mutual or Unslashed coverage for at least 50% of TVL"
    },
    'physical security': {
        'attack': "$5 wrench attack on key personnel",
        'extreme_risk': "Physical coercion leads to unauthorized access",
        'action': "Implement duress codes and geographic distribution of key holders"
    },
    'fire': {
        'attack': "Physical destruction of seed phrase backup",
        'extreme_risk': "Permanent loss of cold storage funds",
        'action': "Use fire-resistant metal backup (Billfodl, Cryptosteel) in fireproof safe"
    },
    'water': {
        'attack': "Flood damage to hardware wallet or backup",
        'extreme_risk': "Water damage corrupts device and paper backups simultaneously",
        'action': "Store backups in waterproof containers at elevated locations"
    },

    # FIDELITY (F) - Trust & Compliance Risks
    'compliance': {
        'attack': "Regulatory enforcement action",
        'extreme_risk': "Asset seizure and platform shutdown (Tornado Cash pattern)",
        'action': "Engage compliance counsel and implement AML/KYC where required"
    },
    'license': {
        'attack': "Operating without required license",
        'extreme_risk': "Criminal charges against founders, user funds frozen",
        'action': "Obtain relevant licenses: MTL (US), EMI (EU), VASP registration"
    },
    'transparency': {
        'attack': "Hidden liabilities or commingled funds",
        'extreme_risk': "FTX-style collapse - customer funds used for proprietary trading",
        'action': "Publish monthly proof-of-reserves with third-party attestation"
    },
    'reserve': {
        'attack': "Fractional reserve operation discovered",
        'extreme_risk': "Bank run causes insolvency, users cannot withdraw",
        'action': "Maintain 1:1 reserves with real-time on-chain verification"
    },
    'terms': {
        'attack': "Unfavorable terms allow arbitrary actions",
        'extreme_risk': "Platform seizes user funds citing ambiguous ToS clause",
        'action': "Clear, fair ToS reviewed by consumer protection counsel"
    },
    'jurisdiction': {
        'attack': "Operating in hostile regulatory environment",
        'extreme_risk': "Sudden ban leads to trapped user funds",
        'action': "Establish legal entity in crypto-friendly jurisdiction (Switzerland, Singapore)"
    },

    # ECOSYSTEM (E) - Integration Risks
    'integration': {
        'attack': "Dependency on failing/hacked protocol",
        'extreme_risk': "Contagion from integrated protocol collapse",
        'action': "Diversify integrations and implement circuit breakers for dependencies"
    },
    'bridge': {
        'attack': "Cross-chain bridge exploitation",
        'extreme_risk': "Bridge hack leads to unbacked assets (Ronin $625M, Wormhole $320M)",
        'action': "Use only battle-tested bridges with time-delays and monitoring"
    },
    'api': {
        'attack': "API key leakage or endpoint exploitation",
        'extreme_risk': "Automated draining of all connected accounts",
        'action': "Implement API key rotation, IP whitelisting, and withdrawal limits"
    },
    'upgrade': {
        'attack': "Malicious contract upgrade deployed",
        'extreme_risk': "Upgraded contract contains backdoor (e.g., Paid Network rug)",
        'action': "Use transparent proxy pattern with upgrade timelock and monitoring"
    }
}

# Type-specific risk amplifiers
TYPE_RISK_AMPLIFIERS = {
    'exchange': "Centralized exchanges are high-value targets - Mt. Gox, FTX collapses show systemic risk",
    'defi': "DeFi protocols face smart contract risk - $3B+ lost to hacks in 2022",
    'bridge': "Cross-chain bridges are attack magnets - 50% of crypto hacks target bridges",
    'lending': "Lending protocols risk cascading liquidations - Celsius, BlockFi insolvencies",
    'hardware': "Hardware wallets must resist physical and supply chain attacks",
    'custod': "Custodians face insider threat and regulatory risk",
    'staking': "Staking involves slashing risk and validator key security"
}


def load_products_with_evaluations():
    """Load products that have evaluations."""
    print("Loading products with evaluations...", flush=True)

    product_ids = set()
    offset = 0
    while True:
        r = requests.get(
            f'{SUPABASE_URL}/rest/v1/evaluations?select=product_id&order=product_id&limit=1000&offset={offset}',
            headers=READ_HEADERS, timeout=60
        )
        if r.status_code != 200:
            break
        data = r.json()
        if not data:
            break
        for e in data:
            product_ids.add(e['product_id'])
        offset += len(data)
        if len(data) < 1000:
            break
        if offset >= 500000:
            break

    print(f"  Found {len(product_ids)} products with evaluations", flush=True)

    # Load product details
    products = []
    ids_list = list(product_ids)
    for i in range(0, len(ids_list), 50):
        batch = ids_list[i:i+50]
        ids_str = ','.join(str(p) for p in batch)
        r = requests.get(
            f'{SUPABASE_URL}/rest/v1/products?select=id,name,slug,type_id&id=in.({ids_str})',
            headers=READ_HEADERS, timeout=60
        )
        if r.status_code == 200:
            products.extend(r.json())

    return products


def load_types():
    """Load product types."""
    r = requests.get(f'{SUPABASE_URL}/rest/v1/product_types?select=id,name', headers=READ_HEADERS, timeout=30)
    return {t['id']: t['name'] for t in (r.json() if r.status_code == 200 else [])}


def load_norms():
    """Load all norms."""
    norms = []
    offset = 0
    while True:
        r = requests.get(
            f'{SUPABASE_URL}/rest/v1/norms?select=id,code,title,pillar,description&limit=1000&offset={offset}',
            headers=READ_HEADERS, timeout=60
        )
        if r.status_code != 200:
            break
        data = r.json()
        if not data:
            break
        norms.extend(data)
        offset += len(data)
        if len(data) < 1000:
            break
    return {n['id']: n for n in norms}


def get_product_evaluations(product_id):
    """Get all evaluations for a product."""
    evals = []
    offset = 0
    while True:
        r = requests.get(
            f'{SUPABASE_URL}/rest/v1/evaluations?select=norm_id,result,why_this_result&product_id=eq.{product_id}&limit=1000&offset={offset}',
            headers=READ_HEADERS, timeout=60
        )
        if r.status_code != 200:
            break
        data = r.json()
        if not data:
            break
        evals.extend(data)
        offset += len(data)
        if len(data) < 1000:
            break
    return evals


def analyze_failed_norms(evaluations, norms_dict):
    """Analyze failed norms and categorize by pillar."""
    pillars = {
        'S': {'yes': 0, 'no': 0, 'failed': []},
        'A': {'yes': 0, 'no': 0, 'failed': []},
        'F': {'yes': 0, 'no': 0, 'failed': []},
        'E': {'yes': 0, 'no': 0, 'failed': []}
    }

    for e in evaluations:
        norm = norms_dict.get(e['norm_id'], {})
        pillar = norm.get('pillar', '')
        if pillar in pillars:
            if e['result'] in ['YES', 'YESp']:
                pillars[pillar]['yes'] += 1
            elif e['result'] == 'NO':
                pillars[pillar]['no'] += 1
                pillars[pillar]['failed'].append({
                    'code': norm.get('code', ''),
                    'title': norm.get('title', ''),
                    'description': norm.get('description', ''),
                    'reason': e.get('why_this_result', '')
                })

    return pillars


def generate_personalized_risks(failed_norms, type_name):
    """Generate specific attack vectors based on failed norms."""
    risks = []
    seen_categories = set()

    for norm in failed_norms:
        title_lower = (norm['title'] or '').lower()
        desc_lower = (norm.get('description') or '').lower()
        combined = title_lower + ' ' + desc_lower

        # Match against known attack vectors
        for pattern, risk_info in ATTACK_VECTORS.items():
            if pattern in combined and pattern not in seen_categories:
                seen_categories.add(pattern)
                risks.append({
                    'category': pattern.title(),
                    'norm_code': norm['code'],
                    'norm_title': norm['title'][:60],
                    'attack_vector': risk_info['attack'],
                    'extreme_scenario': risk_info['extreme_risk'],
                    'recommended_action': risk_info['action']
                })

    # Add type-specific risks
    type_lower = (type_name or '').lower()
    for type_key, amplifier in TYPE_RISK_AMPLIFIERS.items():
        if type_key in type_lower:
            risks.append({
                'category': 'Type-Specific Risk',
                'norm_code': 'TYPE',
                'norm_title': f'{type_name} specific warning',
                'attack_vector': f'Industry-specific attack patterns for {type_name}',
                'extreme_scenario': amplifier,
                'recommended_action': f'Review {type_key}-specific security best practices'
            })
            break

    return risks[:10]  # Top 10 most critical


def generate_pillar_advice(pillar, score, failed_norms, type_name):
    """Generate specific advice for a pillar based on actual failed norms."""
    advice = []

    # Personalized based on failed norms
    for norm in failed_norms[:5]:
        title_lower = (norm['title'] or '').lower()

        # Generate specific advice based on norm
        if 'audit' in title_lower:
            advice.append(f"CRITICAL: Obtain security audit - norm {norm['code']} failed")
        elif 'encrypt' in title_lower:
            advice.append(f"Implement encryption per {norm['code']}: {norm['title'][:40]}")
        elif 'backup' in title_lower:
            advice.append(f"Establish backup procedures per {norm['code']}")
        elif 'key' in title_lower:
            advice.append(f"Improve key management per {norm['code']}")
        elif 'multi' in title_lower or 'sig' in title_lower:
            advice.append(f"Implement multi-signature per {norm['code']}")
        elif 'compliance' in title_lower or 'regulation' in title_lower:
            advice.append(f"Address compliance gap: {norm['code']}")
        elif 'oracle' in title_lower:
            advice.append(f"Secure oracle implementation per {norm['code']}")
        elif 'bridge' in title_lower:
            advice.append(f"Review bridge security per {norm['code']}")
        elif 'access' in title_lower:
            advice.append(f"Strengthen access controls per {norm['code']}")
        else:
            # Generic but specific to the norm
            advice.append(f"Address {norm['code']}: {norm['title'][:50]}")

    return advice[:5]


def calculate_risk_score(pillar_data):
    """Calculate overall risk score (inverse of compliance)."""
    scores = []
    for p in ['S', 'A', 'F', 'E']:
        total = pillar_data[p]['yes'] + pillar_data[p]['no']
        if total > 0:
            compliance = (pillar_data[p]['yes'] / total) * 100
            scores.append(compliance)

    if scores:
        overall = sum(scores) / len(scores)
        risk_score = 100 - overall  # Higher = more risky
        return overall, risk_score
    return 0, 100


def save_product_risks(product_id, data):
    """Save risk analysis to Supabase."""
    update = {
        'safe_priority_pillar': data['weakest_pillar'],
        'safe_priority_reason': json.dumps(data, ensure_ascii=False)
    }

    r = requests.patch(
        f'{SUPABASE_URL}/rest/v1/products?id=eq.{product_id}',
        headers=WRITE_HEADERS,
        json=update,
        timeout=30
    )
    return r.status_code in [200, 204]


def main():
    print("=" * 70, flush=True)
    print("  GENERATE EXTREME RISK WARNINGS & PERSONALIZED ADVICE", flush=True)
    print("=" * 70, flush=True)

    products = load_products_with_evaluations()
    types = load_types()
    norms_dict = load_norms()

    print(f"Loaded {len(products)} products, {len(types)} types, {len(norms_dict)} norms", flush=True)

    if not products:
        print("No products with evaluations found!")
        return

    total_saved = 0
    start_time = time.time()

    for i, product in enumerate(products):
        type_name = types.get(product.get('type_id'), 'Unknown')
        evals = get_product_evaluations(product['id'])

        if not evals:
            continue

        # Analyze
        pillar_data = analyze_failed_norms(evals, norms_dict)
        overall_score, risk_score = calculate_risk_score(pillar_data)

        # Find weakest pillar
        min_score = 100
        min_pillar = 'S'
        pillar_scores = {}
        for p in ['S', 'A', 'F', 'E']:
            total = pillar_data[p]['yes'] + pillar_data[p]['no']
            if total > 0:
                score = (pillar_data[p]['yes'] / total) * 100
                pillar_scores[p] = round(score, 1)
                if score < min_score:
                    min_score = score
                    min_pillar = p
            else:
                pillar_scores[p] = 0

        # Collect all failed norms
        all_failed = []
        for p in ['S', 'A', 'F', 'E']:
            all_failed.extend(pillar_data[p]['failed'])

        # Generate personalized risks
        risks = generate_personalized_risks(all_failed, type_name)

        # Generate pillar-specific advice
        advice_by_pillar = {}
        for p in ['S', 'A', 'F', 'E']:
            advice_by_pillar[p] = generate_pillar_advice(
                p, pillar_scores[p], pillar_data[p]['failed'], type_name
            )

        # Calculate grade
        if overall_score >= 90: grade = 'A+'
        elif overall_score >= 85: grade = 'A'
        elif overall_score >= 80: grade = 'A-'
        elif overall_score >= 75: grade = 'B+'
        elif overall_score >= 70: grade = 'B'
        elif overall_score >= 65: grade = 'B-'
        elif overall_score >= 60: grade = 'C+'
        elif overall_score >= 55: grade = 'C'
        else: grade = 'D'

        # Build comprehensive risk profile
        risk_profile = {
            'product_name': product['name'],
            'product_type': type_name,
            'grade': grade,
            'overall_score': round(overall_score, 1),
            'risk_score': round(risk_score, 1),
            'pillar_scores': pillar_scores,
            'weakest_pillar': min_pillar,
            'weakest_pillar_score': round(min_score, 1),
            'critical_risks': risks[:5],
            'all_risks': risks,
            'advice_by_pillar': advice_by_pillar,
            'priority_actions': advice_by_pillar.get(min_pillar, [])[:3],
            'failed_norms_count': {
                'S': len(pillar_data['S']['failed']),
                'A': len(pillar_data['A']['failed']),
                'F': len(pillar_data['F']['failed']),
                'E': len(pillar_data['E']['failed'])
            }
        }

        # Save
        if save_product_risks(product['id'], risk_profile):
            total_saved += 1

        product_name = product['name'].encode('ascii', 'ignore').decode('ascii')[:30]
        risk_count = len(risks)
        print(f"[{i+1:4}/{len(products)}] {product_name:30} | {grade:2} {overall_score:5.1f}% | {risk_count} risks | Saved", flush=True)

        if (i + 1) % 50 == 0:
            time.sleep(0.3)

    elapsed = time.time() - start_time
    print("=" * 70, flush=True)
    print(f"  COMPLETE: {total_saved} products with personalized risks in {elapsed:.1f}s", flush=True)
    print("=" * 70, flush=True)


if __name__ == "__main__":
    main()
