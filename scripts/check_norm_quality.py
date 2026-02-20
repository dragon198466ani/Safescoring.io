#!/usr/bin/env python3
"""Check quality of norm title updates."""
import os
import requests
from collections import Counter
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
    f"{SUPABASE_URL}/rest/v1/norms?select=code,title&order=code&limit=2000",
    headers=get_headers()
)
norms = r.json()

# Extract standard prefixes
standard_counts = Counter()
problematic = []

for norm in norms:
    code = norm['code']
    title = norm['title']

    # Extract the standard if it exists (before first colon)
    if ':' in title:
        std = title.split(':')[0].strip()
        standard_counts[std] += 1

        # Flag potentially wrong matches
        wrong_matches = [
            ('Avail', code) if std == 'Avail' and 'avail' not in code.lower() else None,
            ('Simple Power Analysis', code) if std == 'Simple Power Analysis' and 'spa' not in code.lower() and 'power' not in title.lower() else None,
            ('GlobalPlatform SE', code) if std == 'GlobalPlatform SE' and 'se' not in code.lower() and 'secure element' not in title.lower() else None,
            ('Electromagnetic Analysis', code) if std == 'Electromagnetic Analysis' and 'ema' not in code.lower() and 'electromagnetic' not in title.lower() else None,
        ]
        for match in wrong_matches:
            if match:
                problematic.append((code, title, match[0]))

print("=" * 70)
print("STANDARD DISTRIBUTION IN NORMS")
print("=" * 70)
print("\nTop 30 most used standards:")
for std, count in standard_counts.most_common(30):
    print(f"  {count:4d} x {std}")

print(f"\n{len(problematic)} potentially wrong matches:")
for code, title, std in problematic[:30]:
    print(f"  {code}: {std} -> {title[:50]}...")
if len(problematic) > 30:
    print(f"  ... and {len(problematic) - 30} more")
