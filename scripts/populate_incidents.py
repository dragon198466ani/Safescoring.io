#!/usr/bin/env python3
"""
Populate security incidents from multiple sources:
- DeFiLlama Hacks API (primary - most comprehensive)
- Rekt News Leaderboard (scraping)
- De.Fi REKT Database API
- CertiK Skynet (major incidents)
- Immunefi (disclosed vulnerabilities)
- PeckShield (curated major hacks)
- SlowMist Hacked (curated list)

Note: SlowMist API is no longer available (404), using curated data
"""

import requests
import sys
import re
import time
import json
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))
from core.config import SUPABASE_URL, SUPABASE_HEADERS

# Data sources
SOURCES = {
    'defillama': 'https://api.llama.fi/hacks',
    'rekt': 'https://rekt.news/leaderboard/',
    'defi_rekt': 'https://api.de.fi/v1/rekt',
    'immunefi': 'https://immunefi.com/api/bounties',
}


def get_products():
    """Get all products from database."""
    r = requests.get(f'{SUPABASE_URL}/rest/v1/products?select=id,name,slug,url', headers=SUPABASE_HEADERS)
    return r.json()


def normalize_name(name):
    """Normalize name for matching."""
    return re.sub(r'[^a-z0-9]', '', name.lower())


def levenshtein_distance(s1, s2):
    """Calculate Levenshtein distance between two strings."""
    if len(s1) < len(s2):
        return levenshtein_distance(s2, s1)
    if len(s2) == 0:
        return len(s1)

    previous_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row

    return previous_row[-1]


def similarity_ratio(s1, s2):
    """Calculate similarity ratio between two strings using Levenshtein distance (0.0 to 1.0)."""
    if not s1 or not s2:
        return 0.0
    if s1 == s2:
        return 1.0

    len1, len2 = len(s1), len(s2)
    if len1 == 0 or len2 == 0:
        return 0.0

    shorter, longer = (s1, s2) if len1 <= len2 else (s2, s1)

    # If shorter is a PREFIX of longer - high confidence match
    # e.g., "abracadabra" is prefix of "abracadabraspell", "curve" is prefix of "curvefinance"
    if longer.startswith(shorter) and len(shorter) >= 5:
        return 0.95

    # Calculate Levenshtein-based similarity
    distance = levenshtein_distance(s1, s2)
    max_len = max(len1, len2)
    similarity = 1.0 - (distance / max_len)

    return similarity


def match_product(hack_name, hack_target, products):
    """Try to match a hack to a product - strict matching to avoid false positives."""
    hack_normalized = normalize_name(hack_name)
    target_normalized = normalize_name(hack_target) if hack_target else ""

    best_match = None
    best_score = 0.0

    for product in products:
        product_normalized = normalize_name(product['name'])
        slug = normalize_name(product['slug'])

        # 1. Exact match - highest priority
        if hack_normalized == product_normalized:
            return product
        if target_normalized and target_normalized == product_normalized:
            return product

        # 2. Slug exact match
        if hack_normalized == slug:
            return product

        # 3. Calculate similarity scores
        score = 0.0

        # Compare hack name with product name
        name_sim = similarity_ratio(hack_normalized, product_normalized)
        if name_sim >= 0.85:  # High threshold for match
            score = max(score, name_sim)

        # Compare target with product name
        if target_normalized:
            target_sim = similarity_ratio(target_normalized, product_normalized)
            if target_sim >= 0.85:
                score = max(score, target_sim)

        # Compare with slug
        slug_sim = similarity_ratio(hack_normalized, slug)
        if slug_sim >= 0.85:
            score = max(score, slug_sim)

        # Track best match
        if score > best_score:
            best_score = score
            best_match = product

    # Only return if we have a strong match (85%+)
    if best_score >= 0.85:
        return best_match

    return None


def get_incident_type(technique):
    """Map DeFiLlama technique to our type."""
    technique_lower = (technique or "").lower()

    mapping = {
        "flash loan": "flash_loan_attack",
        "flashloan": "flash_loan_attack",
        "reentrancy": "smart_contract_bug",
        "smart contract": "smart_contract_bug",
        "oracle": "oracle_manipulation",
        "price manipulation": "oracle_manipulation",
        "bridge": "bridge_attack",
        "rug pull": "rug_pull",
        "rugpull": "rug_pull",
        "exit scam": "rug_pull",
        "phishing": "phishing",
        "social engineering": "phishing",
        "frontend": "frontend_attack",
        "dns": "frontend_attack",
        "exploit": "exploit",
        "hack": "hack",
        "vulnerability": "vulnerability",
    }

    for key, value in mapping.items():
        if key in technique_lower:
            return value

    return "exploit"


def get_severity(funds_lost):
    """Determine severity based on funds lost."""
    if funds_lost >= 100_000_000:  # $100M+
        return "critical"
    if funds_lost >= 10_000_000:   # $10M+
        return "high"
    if funds_lost >= 1_000_000:    # $1M+
        return "medium"
    return "low"


def get_response_quality(funds_lost, funds_recovered, technique):
    """Determine response quality based on recovery and technique."""
    if funds_recovered and funds_lost > 0:
        recovery_rate = funds_recovered / funds_lost
        if recovery_rate >= 0.9:
            return "excellent"
        if recovery_rate >= 0.5:
            return "good"
        if recovery_rate > 0:
            return "partial"

    # No recovery - rate based on technique (some are unrecoverable)
    unrecoverable = ["rug pull", "exit scam", "rugpull", "private key"]
    if any(t in (technique or "").lower() for t in unrecoverable):
        return "unrecoverable"

    return "none"


def get_resolution_details(funds_lost, funds_recovered, technique):
    """Generate resolution details text."""
    if funds_recovered and funds_recovered > 0:
        recovery_rate = (funds_recovered / funds_lost * 100) if funds_lost > 0 else 0
        if recovery_rate >= 90:
            return f"Funds fully recovered ({recovery_rate:.0f}%)"
        elif recovery_rate >= 50:
            return f"Partial recovery: ${funds_recovered/1_000_000:.1f}M ({recovery_rate:.0f}%)"
        else:
            return f"Minor recovery: ${funds_recovered/1_000_000:.1f}M ({recovery_rate:.0f}%)"

    technique_lower = (technique or "").lower()
    if "rug" in technique_lower or "exit" in technique_lower:
        return "Exit scam - funds unrecoverable"
    if "flash loan" in technique_lower:
        return "Flash loan attack - no recovery"
    if "exploit" in technique_lower or "hack" in technique_lower:
        return "Exploit patched - funds not recovered"

    return "Incident resolved - no fund recovery"


def calculate_risk_level(stats):
    """Calculate overall risk level."""
    if stats['has_active_incidents'] or stats['critical_count'] > 0:
        return "critical"
    if stats['high_count'] > 0 or stats['total_funds_lost'] > 50_000_000:
        return "high"
    if stats['medium_count'] > 0 or stats['total_funds_lost'] > 5_000_000:
        return "medium"
    return "low"


def save_incident(product_id, incident):
    """Save incident to database."""
    # Only include columns that exist in the table
    payload = {
        'product_id': product_id,
        'title': incident['title'][:200],
        'description': incident.get('description', '')[:500],
        'type': incident['type'],
        'severity': incident['severity'],
        'status': 'resolved',
        'date': incident['date'],
        'funds_lost': incident['funds_lost'],
        'funds_recovered': incident.get('funds_recovered', 0),
        'source_url': incident.get('source_url', '')
    }

    r = requests.post(f'{SUPABASE_URL}/rest/v1/product_incidents', headers=SUPABASE_HEADERS, json=payload)
    return r.status_code in [200, 201]


def update_stats(product_id):
    """Update aggregated stats for a product."""
    # Get all incidents for this product
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/product_incidents?product_id=eq.{product_id}&select=*',
        headers=SUPABASE_HEADERS
    )
    incidents = r.json()

    stats = {
        'product_id': product_id,
        'total_incidents': len(incidents),
        'total_funds_lost': sum(float(i.get('funds_lost', 0) or 0) for i in incidents),
        'critical_count': sum(1 for i in incidents if i.get('severity') == 'critical'),
        'high_count': sum(1 for i in incidents if i.get('severity') == 'high'),
        'medium_count': sum(1 for i in incidents if i.get('severity') == 'medium'),
        'low_count': sum(1 for i in incidents if i.get('severity') == 'low'),
        'has_active_incidents': any(i.get('status') == 'active' for i in incidents),
        'last_incident_date': max((i['date'] for i in incidents), default=None)
    }
    stats['risk_level'] = calculate_risk_level(stats)

    r = requests.post(f'{SUPABASE_URL}/rest/v1/product_security_stats', headers=SUPABASE_HEADERS, json=stats)
    return r.status_code in [200, 201]


def init_all_products_stats(products):
    """Initialize stats for all products (set to low risk if no incidents)."""
    print("\n[3] Initialisation des stats pour tous les produits...")

    # Batch insert for efficiency
    all_stats = []
    for product in products:
        all_stats.append({
            'product_id': product['id'],
            'total_incidents': 0,
            'total_funds_lost': 0,
            'critical_count': 0,
            'high_count': 0,
            'medium_count': 0,
            'low_count': 0,
            'has_active_incidents': False,
            'risk_level': 'low',
            'last_incident_date': None
        })

    # Insert in batches
    batch_size = 50
    for i in range(0, len(all_stats), batch_size):
        batch = all_stats[i:i+batch_size]
        requests.post(f'{SUPABASE_URL}/rest/v1/product_security_stats', headers=SUPABASE_HEADERS, json=batch)

    print(f"   OK: {len(products)} produits initialises")


def fetch_defillama():
    """Fetch from DeFiLlama."""
    try:
        r = requests.get(SOURCES['defillama'], timeout=30)
        data = r.json()
        incidents = []
        for hack in data:
            timestamp = hack.get('date')
            date = datetime.fromtimestamp(timestamp).strftime('%Y-%m-%d') if timestamp else '2020-01-01'
            incidents.append({
                'name': hack.get('name', ''),
                'target': hack.get('target', ''),
                'description': hack.get('description', ''),
                'technique': hack.get('technique', ''),
                'amount': float(hack.get('amount', 0) or 0),
                'returned': float(hack.get('returnedFunds', 0) or 0),
                'date': date,
                'link': hack.get('link', ''),
                'source': 'defillama'
            })
        return incidents
    except Exception as e:
        print(f"   [!] DeFiLlama error: {e}")
        return []


def fetch_rekt_scrape():
    """Scrape Rekt.news leaderboard - extracts data separately then matches."""
    try:
        r = requests.get(SOURCES['rekt'], headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }, timeout=30)
        html = r.text
        incidents = []

        # Extract all -rekt links (in order)
        slugs = re.findall(r'href="/([a-z0-9-]+-rekt)"', html)
        # Extract all amounts (in order)
        amounts = re.findall(r'\$<!-- -->([0-9,]+)', html)
        # Extract all dates (in order)
        dates = re.findall(r'(\d{2}/\d{2}/\d{4})', html)

        # Match by position (they appear in order in the leaderboard)
        min_len = min(len(slugs), len(amounts), len(dates))

        for i in range(min(min_len, 200)):
            slug = slugs[i]
            amount_str = amounts[i]
            date_str = dates[i]

            # Parse amount
            amount = float(amount_str.replace(',', ''))

            # Parse date (MM/DD/YYYY -> YYYY-MM-DD)
            try:
                date_obj = datetime.strptime(date_str, '%m/%d/%Y')
                date = date_obj.strftime('%Y-%m-%d')
            except:
                date = '2023-01-01'

            # Clean name from slug (bybit-rekt -> Bybit)
            clean_name = slug.replace('-rekt', '').replace('-', ' ').title()

            incidents.append({
                'name': clean_name,
                'target': clean_name,
                'description': f'Security incident reported by Rekt News',
                'technique': 'exploit',
                'amount': amount,
                'returned': 0,
                'date': date,
                'link': f'https://rekt.news/{slug}',
                'source': 'rekt'
            })
        return incidents
    except Exception as e:
        print(f"   [!] Rekt.news error: {e}")
        return []


def fetch_web3sec():
    """Fetch from Web3 security incidents (manual curated for major protocols)."""
    # Known major incidents not always in DeFiLlama
    known_incidents = [
        # Major exchange hacks
        {'name': 'Mt. Gox', 'amount': 460_000_000, 'date': '2014-02-24', 'technique': 'hack', 'link': 'https://en.wikipedia.org/wiki/Mt._Gox'},
        {'name': 'Bitfinex', 'amount': 72_000_000, 'date': '2016-08-02', 'technique': 'hack', 'link': 'https://www.bitfinex.com/'},
        {'name': 'Coincheck', 'amount': 534_000_000, 'date': '2018-01-26', 'technique': 'hack', 'link': 'https://coincheck.com/'},
        {'name': 'KuCoin', 'amount': 280_000_000, 'date': '2020-09-25', 'technique': 'hack', 'returned': 204_000_000, 'link': 'https://www.kucoin.com/'},
        # DeFi protocol incidents
        {'name': 'bZx', 'amount': 55_000_000, 'date': '2021-11-05', 'technique': 'exploit', 'link': 'https://bzx.network/'},
        {'name': 'Harvest Finance', 'amount': 34_000_000, 'date': '2020-10-26', 'technique': 'flash_loan', 'link': 'https://harvest.finance/'},
        {'name': 'Yearn Finance', 'amount': 11_000_000, 'date': '2021-02-04', 'technique': 'flash_loan', 'link': 'https://yearn.finance/'},
        {'name': 'Alpha Homora', 'amount': 37_500_000, 'date': '2021-02-13', 'technique': 'flash_loan', 'link': 'https://alphafinance.io/'},
        {'name': 'Cream Finance', 'amount': 130_000_000, 'date': '2021-10-27', 'technique': 'flash_loan', 'link': 'https://cream.finance/'},
        {'name': 'BadgerDAO', 'amount': 120_000_000, 'date': '2021-12-02', 'technique': 'frontend_attack', 'link': 'https://badger.com/'},
        {'name': 'Vulcan Forged', 'amount': 140_000_000, 'date': '2021-12-13', 'technique': 'hack', 'link': 'https://vulcanforged.com/'},
        {'name': 'Multichain', 'amount': 126_000_000, 'date': '2023-07-06', 'technique': 'bridge_attack', 'link': 'https://multichain.org/'},
        {'name': 'Euler Finance', 'amount': 197_000_000, 'date': '2023-03-13', 'technique': 'flash_loan', 'returned': 197_000_000, 'link': 'https://euler.finance/'},
        {'name': 'Atomic Wallet', 'amount': 100_000_000, 'date': '2023-06-03', 'technique': 'hack', 'link': 'https://atomicwallet.io/'},
        {'name': 'Mixin Network', 'amount': 200_000_000, 'date': '2023-09-23', 'technique': 'hack', 'link': 'https://mixin.one/'},
        {'name': 'Poloniex', 'amount': 126_000_000, 'date': '2023-11-10', 'technique': 'hack', 'link': 'https://poloniex.com/'},
        {'name': 'Orbit Chain', 'amount': 80_000_000, 'date': '2024-01-01', 'technique': 'bridge_attack', 'link': 'https://bridge.orbitchain.io/'},
        {'name': 'PlayDapp', 'amount': 290_000_000, 'date': '2024-02-09', 'technique': 'hack', 'link': 'https://playdapp.io/'},
        {'name': 'Radiant Capital', 'amount': 53_000_000, 'date': '2024-10-16', 'technique': 'exploit', 'link': 'https://radiant.capital/'},
    ]

    incidents = []
    for h in known_incidents:
        incidents.append({
            'name': h['name'],
            'target': h['name'],
            'description': f"Major security incident affecting {h['name']}",
            'technique': h.get('technique', 'hack'),
            'amount': h['amount'],
            'returned': h.get('returned', 0),
            'date': h['date'],
            'link': h.get('link', ''),
            'source': 'curated'
        })
    return incidents


def fetch_defi_rekt():
    """Fetch from De.Fi REKT Database API."""
    try:
        # De.Fi has a public API for their REKT database
        r = requests.get(
            'https://api.de.fi/v1/rekt',
            headers={'User-Agent': 'Mozilla/5.0'},
            timeout=30
        )
        if r.status_code != 200:
            # Fallback to scraping the website
            return fetch_defi_rekt_scrape()

        data = r.json()
        incidents = []
        for item in data.get('data', data) if isinstance(data, dict) else data:
            if isinstance(item, dict):
                incidents.append({
                    'name': item.get('project', item.get('name', '')),
                    'target': item.get('project', item.get('name', '')),
                    'description': item.get('description', ''),
                    'technique': item.get('type', item.get('category', 'exploit')),
                    'amount': float(item.get('fundsLost', item.get('amount', 0)) or 0),
                    'returned': float(item.get('fundsReturned', 0) or 0),
                    'date': item.get('date', '2023-01-01'),
                    'link': item.get('link', item.get('url', '')),
                    'source': 'defi_rekt'
                })
        return incidents
    except Exception as e:
        print(f"   [!] De.Fi REKT API error: {e}")
        return fetch_defi_rekt_scrape()


def fetch_defi_rekt_scrape():
    """Scrape De.Fi REKT database website as fallback."""
    try:
        r = requests.get(
            'https://de.fi/rekt-database',
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'},
            timeout=30
        )
        # Parse the page for incident data (simplified)
        # Note: Real implementation would need proper HTML parsing
        return []
    except Exception as e:
        print(f"   [!] De.Fi scrape error: {e}")
        return []


def fetch_certik_incidents():
    """Curated incidents from CertiK Skynet reports."""
    # CertiK doesn't have a public API, using curated data from their reports
    certik_incidents = [
        # 2024 Major incidents tracked by CertiK
        {'name': 'WazirX', 'amount': 235_000_000, 'date': '2024-07-18', 'technique': 'hack', 'link': 'https://skynet.certik.com/'},
        {'name': 'DMM Bitcoin', 'amount': 305_000_000, 'date': '2024-05-31', 'technique': 'hack', 'link': 'https://skynet.certik.com/'},
        {'name': 'Munchables', 'amount': 62_500_000, 'date': '2024-03-26', 'technique': 'insider', 'returned': 62_500_000, 'link': 'https://skynet.certik.com/'},
        {'name': 'Prisma Finance', 'amount': 11_600_000, 'date': '2024-03-28', 'technique': 'flash_loan', 'link': 'https://skynet.certik.com/'},
        {'name': 'Seneca Protocol', 'amount': 6_400_000, 'date': '2024-02-28', 'technique': 'smart_contract', 'returned': 5_300_000, 'link': 'https://skynet.certik.com/'},
        {'name': 'Socket', 'amount': 3_300_000, 'date': '2024-01-16', 'technique': 'smart_contract', 'link': 'https://skynet.certik.com/'},
        # 2023 incidents
        {'name': 'Stake.com', 'amount': 41_000_000, 'date': '2023-09-04', 'technique': 'hack', 'link': 'https://skynet.certik.com/'},
        {'name': 'CoinEx', 'amount': 70_000_000, 'date': '2023-09-12', 'technique': 'hack', 'link': 'https://skynet.certik.com/'},
        {'name': 'HTX (Huobi)', 'amount': 30_000_000, 'date': '2023-11-22', 'technique': 'hack', 'link': 'https://skynet.certik.com/'},
        {'name': 'Curve Finance', 'amount': 73_500_000, 'date': '2023-07-30', 'technique': 'reentrancy', 'returned': 52_300_000, 'link': 'https://skynet.certik.com/'},
    ]

    incidents = []
    for h in certik_incidents:
        incidents.append({
            'name': h['name'],
            'target': h['name'],
            'description': f"Security incident tracked by CertiK Skynet",
            'technique': h.get('technique', 'hack'),
            'amount': h['amount'],
            'returned': h.get('returned', 0),
            'date': h['date'],
            'link': h.get('link', ''),
            'source': 'certik'
        })
    return incidents


def fetch_slowmist_incidents():
    """Curated incidents from SlowMist Hacked database."""
    # SlowMist tracks incidents at hacked.slowmist.io - using curated data
    slowmist_incidents = [
        # Major incidents tracked by SlowMist
        {'name': 'Bybit', 'amount': 1_460_000_000, 'date': '2025-02-21', 'technique': 'hack', 'link': 'https://hacked.slowmist.io/'},
        {'name': 'FixedFloat', 'amount': 26_100_000, 'date': '2024-02-18', 'technique': 'hack', 'link': 'https://hacked.slowmist.io/'},
        {'name': 'Hedgey Finance', 'amount': 44_700_000, 'date': '2024-04-19', 'technique': 'smart_contract', 'link': 'https://hacked.slowmist.io/'},
        {'name': 'Gala Games', 'amount': 21_800_000, 'date': '2024-05-20', 'technique': 'access_control', 'returned': 21_800_000, 'link': 'https://hacked.slowmist.io/'},
        {'name': 'UwU Lend', 'amount': 19_300_000, 'date': '2024-06-10', 'technique': 'oracle_manipulation', 'link': 'https://hacked.slowmist.io/'},
        {'name': 'LI.FI', 'amount': 11_600_000, 'date': '2024-07-16', 'technique': 'smart_contract', 'link': 'https://hacked.slowmist.io/'},
        {'name': 'Ronin Network', 'amount': 625_000_000, 'date': '2022-03-23', 'technique': 'bridge_attack', 'link': 'https://hacked.slowmist.io/'},
        {'name': 'Wormhole', 'amount': 326_000_000, 'date': '2022-02-02', 'technique': 'bridge_attack', 'link': 'https://hacked.slowmist.io/'},
        {'name': 'Nomad Bridge', 'amount': 190_000_000, 'date': '2022-08-01', 'technique': 'bridge_attack', 'link': 'https://hacked.slowmist.io/'},
        {'name': 'BNB Bridge', 'amount': 586_000_000, 'date': '2022-10-06', 'technique': 'bridge_attack', 'link': 'https://hacked.slowmist.io/'},
    ]

    incidents = []
    for h in slowmist_incidents:
        incidents.append({
            'name': h['name'],
            'target': h['name'],
            'description': f"Security incident tracked by SlowMist Hacked",
            'technique': h.get('technique', 'hack'),
            'amount': h['amount'],
            'returned': h.get('returned', 0),
            'date': h['date'],
            'link': h.get('link', ''),
            'source': 'slowmist'
        })
    return incidents


def fetch_peckshield_incidents():
    """Curated incidents from PeckShield alerts."""
    # PeckShield tracks incidents via their Twitter/alerts - using curated data
    peckshield_incidents = [
        # Major incidents reported by PeckShield
        {'name': 'Penpie', 'amount': 27_000_000, 'date': '2024-09-03', 'technique': 'reentrancy', 'link': 'https://peckshield.com/'},
        {'name': 'Indodax', 'amount': 22_000_000, 'date': '2024-09-11', 'technique': 'hack', 'link': 'https://peckshield.com/'},
        {'name': 'BingX', 'amount': 52_000_000, 'date': '2024-09-20', 'technique': 'hack', 'link': 'https://peckshield.com/'},
        {'name': 'Shido', 'amount': 35_000_000, 'date': '2024-03-05', 'technique': 'exploit', 'link': 'https://peckshield.com/'},
        {'name': 'Curio', 'amount': 16_000_000, 'date': '2024-03-25', 'technique': 'smart_contract', 'link': 'https://peckshield.com/'},
        {'name': 'Hundred Finance', 'amount': 7_400_000, 'date': '2023-04-15', 'technique': 'flash_loan', 'link': 'https://peckshield.com/'},
        {'name': 'Level Finance', 'amount': 1_100_000, 'date': '2023-05-01', 'technique': 'smart_contract', 'link': 'https://peckshield.com/'},
        {'name': 'Jimbo Protocol', 'amount': 7_500_000, 'date': '2023-05-28', 'technique': 'flash_loan', 'link': 'https://peckshield.com/'},
    ]

    incidents = []
    for h in peckshield_incidents:
        incidents.append({
            'name': h['name'],
            'target': h['name'],
            'description': f"Security incident reported by PeckShield",
            'technique': h.get('technique', 'hack'),
            'amount': h['amount'],
            'returned': h.get('returned', 0),
            'date': h['date'],
            'link': h.get('link', ''),
            'source': 'peckshield'
        })
    return incidents


def fetch_immunefi_incidents():
    """Fetch disclosed vulnerabilities from Immunefi bug bounty platform."""
    # Immunefi discloses some paid bounties - using curated data from their blog
    immunefi_incidents = [
        # Major bounties paid (indicates vulnerabilities found and fixed)
        {'name': 'Wormhole', 'amount': 10_000_000, 'date': '2022-02-24', 'technique': 'vulnerability', 'returned': 10_000_000, 'link': 'https://immunefi.com/', 'bounty': True},
        {'name': 'Aurora', 'amount': 6_000_000, 'date': '2022-04-26', 'technique': 'vulnerability', 'returned': 6_000_000, 'link': 'https://immunefi.com/', 'bounty': True},
        {'name': 'Polygon', 'amount': 2_000_000, 'date': '2021-12-03', 'technique': 'vulnerability', 'returned': 2_000_000, 'link': 'https://immunefi.com/', 'bounty': True},
        {'name': 'Optimism', 'amount': 2_000_000, 'date': '2022-02-10', 'technique': 'vulnerability', 'returned': 2_000_000, 'link': 'https://immunefi.com/', 'bounty': True},
        {'name': 'MakerDAO', 'amount': 1_500_000, 'date': '2023-06-15', 'technique': 'vulnerability', 'returned': 1_500_000, 'link': 'https://immunefi.com/', 'bounty': True},
        {'name': 'Arbitrum', 'amount': 400_000, 'date': '2022-09-20', 'technique': 'vulnerability', 'returned': 400_000, 'link': 'https://immunefi.com/', 'bounty': True},
    ]

    incidents = []
    for h in immunefi_incidents:
        # For bounties, the "amount" is the bounty paid (potential loss prevented)
        incidents.append({
            'name': h['name'],
            'target': h['name'],
            'description': f"Critical vulnerability found via Immunefi bug bounty (${h['amount']:,} bounty paid)",
            'technique': h.get('technique', 'vulnerability'),
            'amount': 0,  # No actual loss for bounties
            'returned': 0,
            'date': h['date'],
            'link': h.get('link', ''),
            'source': 'immunefi',
            'is_bounty': True
        })
    return incidents


def clear_existing_data():
    """Clear existing incidents and stats for fresh import."""
    print("[0] Nettoyage des donnees existantes...")

    # Delete all incidents
    r1 = requests.delete(
        f'{SUPABASE_URL}/rest/v1/product_incidents?id=gt.0',
        headers=SUPABASE_HEADERS
    )
    print(f"   -> Incidents: {'OK' if r1.status_code in [200, 204] else 'Error'}")

    # Delete all stats
    r2 = requests.delete(
        f'{SUPABASE_URL}/rest/v1/product_security_stats?id=gt.0',
        headers=SUPABASE_HEADERS
    )
    print(f"   -> Stats: {'OK' if r2.status_code in [200, 204] else 'Error'}")


def main():
    print("=" * 60)
    print("   IMPORT DES INCIDENTS DE SECURITE")
    print("   Sources: DeFiLlama, Rekt.news, CertiK, SlowMist,")
    print("            PeckShield, Immunefi, De.Fi REKT")
    print("=" * 60)
    print()

    # Clear existing data first
    clear_existing_data()

    # Get products
    print("\n[1] Chargement des produits...")
    products = get_products()
    print(f"   OK: {len(products)} produits")

    # Fetch from all sources
    print("\n[2] Recuperation des incidents (7 sources)...")

    all_hacks = []

    print("   -> DeFiLlama...", end=" ", flush=True)
    defillama_hacks = fetch_defillama()
    print(f"{len(defillama_hacks)} hacks")
    all_hacks.extend(defillama_hacks)
    time.sleep(0.5)

    print("   -> Rekt.news...", end=" ", flush=True)
    rekt_hacks = fetch_rekt_scrape()
    print(f"{len(rekt_hacks)} hacks")
    all_hacks.extend(rekt_hacks)
    time.sleep(0.5)

    print("   -> De.Fi REKT...", end=" ", flush=True)
    defi_rekt_hacks = fetch_defi_rekt()
    print(f"{len(defi_rekt_hacks)} hacks")
    all_hacks.extend(defi_rekt_hacks)
    time.sleep(0.5)

    print("   -> CertiK Skynet...", end=" ", flush=True)
    certik_hacks = fetch_certik_incidents()
    print(f"{len(certik_hacks)} hacks")
    all_hacks.extend(certik_hacks)
    time.sleep(0.3)

    print("   -> SlowMist Hacked...", end=" ", flush=True)
    slowmist_hacks = fetch_slowmist_incidents()
    print(f"{len(slowmist_hacks)} hacks")
    all_hacks.extend(slowmist_hacks)
    time.sleep(0.3)

    print("   -> PeckShield...", end=" ", flush=True)
    peckshield_hacks = fetch_peckshield_incidents()
    print(f"{len(peckshield_hacks)} hacks")
    all_hacks.extend(peckshield_hacks)
    time.sleep(0.3)

    print("   -> Immunefi...", end=" ", flush=True)
    immunefi_hacks = fetch_immunefi_incidents()
    print(f"{len(immunefi_hacks)} bounties")
    all_hacks.extend(immunefi_hacks)
    time.sleep(0.3)

    print("   -> Curated DB...", end=" ", flush=True)
    curated_hacks = fetch_web3sec()
    print(f"{len(curated_hacks)} hacks")
    all_hacks.extend(curated_hacks)

    # Deduplicate by name (keep the one with more info)
    seen = {}
    for hack in all_hacks:
        name_key = hack['name'].lower().replace(' ', '')
        if name_key not in seen or hack['amount'] > seen[name_key]['amount']:
            seen[name_key] = hack
    all_hacks = list(seen.values())

    print(f"\n   OK: Total {len(all_hacks)} incidents uniques")

    hacks = all_hacks

    # Initialize all products with default stats
    init_all_products_stats(products)

    # Match hacks to products
    print("\n[4] Matching des hacks aux produits...")
    matched = 0
    incidents_by_product = {}

    for hack in hacks:
        name = hack.get('name', '')
        target = hack.get('target', '')

        product = match_product(name, target, products)
        if product:
            product_id = product['id']
            funds_lost = hack.get('amount', 0)
            funds_recovered = hack.get('returned', 0) or 0
            technique = hack.get('technique', '')

            incident = {
                'title': name[:200],
                'description': hack.get('description', '')[:500] if hack.get('description') else f"Security incident affecting {name}",
                'type': get_incident_type(technique),
                'severity': get_severity(funds_lost),
                'date': hack.get('date', '2020-01-01'),
                'funds_lost': funds_lost,
                'funds_recovered': funds_recovered,
                'response_quality': get_response_quality(funds_lost, funds_recovered, technique),
                'resolution_details': get_resolution_details(funds_lost, funds_recovered, technique),
                'source_url': hack.get('link', '')
            }

            if product_id not in incidents_by_product:
                incidents_by_product[product_id] = []
            incidents_by_product[product_id].append(incident)
            matched += 1

    print(f"   OK: {matched} hacks matches a {len(incidents_by_product)} produits")

    # Save incidents
    print("\n[5] Sauvegarde des incidents...")
    saved = 0
    for product_id, incidents in incidents_by_product.items():
        for incident in incidents:
            if save_incident(product_id, incident):
                saved += 1

        # Update stats for this product
        update_stats(product_id)

    print(f"   OK: {saved} incidents sauvegardes")

    # Summary
    print()
    print("=" * 60)
    print("   RESUME")
    print("=" * 60)
    print(f"   Produits avec incidents: {len(incidents_by_product)}")
    print(f"   Total incidents: {saved}")

    # Show top affected products
    print("\n   Top 5 produits affectes:")
    sorted_products = sorted(
        incidents_by_product.items(),
        key=lambda x: sum(i['funds_lost'] for i in x[1]),
        reverse=True
    )[:5]

    for product_id, incidents in sorted_products:
        product_name = next((p['name'] for p in products if p['id'] == product_id), 'Unknown')
        total_lost = sum(i['funds_lost'] for i in incidents)
        print(f"   - {product_name}: ${total_lost/1_000_000:.1f}M ({len(incidents)} incidents)")


if __name__ == "__main__":
    main()
