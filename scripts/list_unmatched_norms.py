#!/usr/bin/env python3
"""List all norms that don't have official standard mappings."""
import os
import requests
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')

def get_headers():
    return {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json'
    }

# Get all norms
r = requests.get(
    f"{SUPABASE_URL}/rest/v1/norms?select=code,title&order=code",
    headers=get_headers()
)
norms = r.json()

# Check which don't have standard prefix in title
unmatched = []
for norm in norms:
    code = norm['code']
    title = norm['title']
    # Check if title has official standard format (STANDARD: description)
    has_standard = any([
        ':' in title and title.split(':')[0].strip() in [
            'FIPS 140-3', 'FIPS 186-5', 'FIPS 197', 'FIPS 180-4', 'FIPS 202',
            'NIST SP 800-53', 'NIST SP 800-57', 'NIST SP 800-63B', 'NIST SP 800-88', 'NIST SP 800-90A', 'NIST CSF 2.0',
            'ISO/IEC 27001', 'ISO/IEC 27002', 'ISO/IEC 15408', 'ISO 22301',
            'BIP-32', 'BIP-39', 'BIP-44', 'BIP-85', 'BIP-340', 'BIP-341',
            'ERC-20', 'ERC-721', 'EIP-712', 'EIP-1559', 'EIP-4337',
            'RFC 8446', 'RFC 9106', 'RFC 5869', 'RFC 8439',
            'WCAG 2.1/2.2 AA', 'WCAG 2.2 AA',
            'SOC 2 Type II', 'PCI DSS v4.0',
        ],
        title.startswith('NIST'),
        title.startswith('FIPS'),
        title.startswith('ISO'),
        title.startswith('RFC'),
        title.startswith('BIP-'),
        title.startswith('EIP-'),
        title.startswith('ERC-'),
    ])
    if not has_standard:
        unmatched.append((code, title))

print(f"Total norms: {len(norms)}")
print(f"Unmatched: {len(unmatched)}")
print("\nUnmatched norms by pillar:")
print("=" * 70)

# Group by pillar
by_pillar = {'S': [], 'A': [], 'F': [], 'E': [], 'Other': []}
for code, title in unmatched:
    pillar = code[0] if code and code[0] in 'SAFE' else 'Other'
    by_pillar[pillar].append((code, title))

for pillar in ['S', 'A', 'F', 'E', 'Other']:
    items = by_pillar[pillar]
    if items:
        print(f"\n{pillar}-PILLAR ({len(items)} unmatched):")
        for code, title in items[:20]:  # Show first 20
            print(f"  {code}: {title[:60]}...")
        if len(items) > 20:
            print(f"  ... and {len(items) - 20} more")
