#!/usr/bin/env python3
"""Find products that are likely NOT crypto-related based on name/URL patterns."""
import sys, os, re
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src', 'core'))
from config import SUPABASE_URL, SUPABASE_KEY
import requests

HR = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}', 'Content-Type': 'application/json'}
BASE = SUPABASE_URL + '/rest/v1'

all_prods = []
offset = 0
while True:
    r = requests.get(
        f'{BASE}/products?is_active=eq.true&select=id,name,url,type_id,headquarters,description&order=id&limit=1000&offset={offset}',
        headers=HR
    )
    batch = r.json()
    if not batch:
        break
    all_prods.extend(batch)
    offset += 1000

# Load type names
r = requests.get(f'{BASE}/product_types?select=id,name&order=id', headers=HR)
types = {t['id']: t['name'] for t in r.json()}

print(f'Loaded {len(all_prods)} active products\n')

# Known non-crypto product patterns
NON_CRYPTO_NAMES = [
    'yubikey', 'vpn', 'nordvpn', 'surfshark', 'protonvpn',
    'signal', 'telegram', 'whatsapp', 'discord',
    'lastpass', 'dashlane', 'bitwarden', 'keepass',
    'faraday', 'rfid', 'anti-theft',
    'webcam cover', 'hardware wallet case', 'laptop',
    'usb drive', 'screen protector',
]

# Products with descriptions that explicitly say they're not crypto
NOT_CRYPTO_DESC_PATTERNS = [
    'not a crypto', 'not crypto', 'not blockchain',
    'traditional bank', 'traditional financial',
]

# Check for generic accessories/non-crypto items
suspects = []
for p in all_prods:
    name = p['name'].lower()
    url = (p.get('url') or '').lower()
    desc = (p.get('description') or '').lower()
    tid = p.get('type_id')
    tname = types.get(tid, '?')

    flagged = False
    reason = ''

    # Check name patterns
    for pattern in NON_CRYPTO_NAMES:
        if pattern in name:
            flagged = True
            reason = f'Name matches non-crypto pattern: {pattern}'
            break

    # Check desc patterns
    if not flagged:
        for pattern in NOT_CRYPTO_DESC_PATTERNS:
            if pattern in desc:
                flagged = True
                reason = f'Desc mentions: {pattern}'
                break

    # Check for products with no/empty URL
    if not flagged and not p.get('url'):
        flagged = True
        reason = 'No URL'

    # Check for products whose URL is a general domain (not crypto-specific)
    if not flagged:
        general_domains = ['amazon.com', 'ebay.com', 'walmart.com', 'apple.com',
                          'google.com', 'microsoft.com', 'linkedin.com', 'twitter.com']
        for d in general_domains:
            if d in url:
                flagged = True
                reason = f'URL is general domain: {d}'
                break

    if flagged:
        suspects.append((p['id'], p['name'], tname, tid, p.get('url', ''), reason))

print(f'Suspects ({len(suspects)}):')
for pid, name, tname, tid, url, reason in suspects:
    print(f'  [{pid}] {name} (type={tname}) url={url}')
    print(f'         Reason: {reason}')
