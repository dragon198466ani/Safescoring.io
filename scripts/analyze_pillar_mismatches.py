#!/usr/bin/env python3
"""Analyze dash-format codes that may be in the wrong pillar."""
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
import requests
from collections import Counter, defaultdict
from src.core.config import SUPABASE_URL, get_supabase_headers

headers = get_supabase_headers(use_service_key=True)

all_norms = []
offset = 0
while True:
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/norms?select=id,code,pillar,title,chapter,target_type,is_essential,consumer&order=code&limit=1000&offset={offset}",
        headers=headers
    )
    if r.status_code != 200 or not r.json():
        break
    all_norms.extend(r.json())
    if len(r.json()) < 1000:
        break
    offset += 1000

# Focus on dash-format codes
dash_codes = [n for n in all_norms if "-" in n.get("code", "")]
print(f"Total dash-format codes: {len(dash_codes)}")

# Group by pillar and code prefix
by_pillar_prefix = defaultdict(list)
for n in dash_codes:
    code = n["code"]
    parts = code.split("-")
    prefix = "-".join(parts[:2])
    by_pillar_prefix[(n["pillar"], prefix)].append(n)

print("\n=== DASH CODES BY PILLAR/PREFIX ===")
for (pillar, prefix), items in sorted(by_pillar_prefix.items()):
    sample_titles = [i["title"][:40] for i in items[:3]]
    print(f"  Pillar {pillar} | {prefix}: {len(items)} norms | e.g.: {sample_titles}")

# Check for code-prefix vs pillar mismatches
# A-ADD, A-ATTACK, A-CONCEAL etc. should be in A pillar
# S-ADD, S-CARD etc. should be in S pillar
# E-ADD, E-NEW etc. should be in E pillar
# F-ADD, F-NEW etc. should be in F pillar
print("\n\n=== POTENTIAL PILLAR MISMATCHES ===")
mismatches = []
for n in dash_codes:
    code = n["code"]
    pillar = n["pillar"]
    first_letter = code[0]

    # Expected: code starting with A -> pillar A, S -> S, E -> E, F -> F
    expected_map = {"A": "A", "S": "S", "E": "E", "F": "F", "W": None}
    expected = expected_map.get(first_letter)

    if expected and expected != pillar:
        mismatches.append(n)

if mismatches:
    print(f"  Found {len(mismatches)} mismatches:")
    by_pair = defaultdict(list)
    for m in mismatches:
        by_pair[(m["code"][:5], m["pillar"])].append(m)

    for (prefix, pillar), items in sorted(by_pair.items()):
        print(f"\n  Code prefix '{prefix}...' in pillar {pillar} ({len(items)} norms):")
        for n in items[:5]:
            print(f"    {n['code']}: {n['title'][:60]} | chapter={n.get('chapter','')[:25]}")
        if len(items) > 5:
            print(f"    ... and {len(items)-5} more")
else:
    print("  No pillar mismatches found")

# Also check non-dash codes for mismatches
print("\n\n=== NON-DASH CODE PILLAR CHECK ===")
import re
non_dash = [n for n in all_norms if "-" not in n.get("code", "")]
non_dash_mismatches = []
for n in non_dash:
    code = n["code"]
    pillar = n["pillar"]
    m = re.match(r'^([A-Z]+)', code)
    if m:
        prefix = m.group(1)
        # Known prefix-pillar mappings
        known = {"S": "S", "A": "A", "F": "F", "E": "E", "PRIV": "A", "NETPRIV": "A",
                 "REG": "A", "KYC": "A", "OPSEC": "A", "INS": "A", "TAMP": "A",
                 "DURS": "A", "TIME": "A", "DP": None,  # mixed
                 "NIST": "S", "ISO": "S", "OWASP": "S", "PCI": "S", "FIPS": "S",
                 "RFC": "S", "EIP": "S", "ERC": "S", "BIP": "S", "FIDO": "S",
                 "CRYP": "S", "HSM": "S", "HW": "S", "MOB": "S", "AUTH": "S",
                 "SCA": "S", "SEC": "S", "STK": "S", "LIQ": "S", "PAY": "S",
                 "CC": "S", "PQC": "S", "G": "S", "NET": None,  # mixed
                 "BIO": None, "DID": None,  # mixed
                 "BATT": "F", "FIRE": "F", "DROP": "F", "MAT": "F", "MIL": "F",
                 "ENV": "F", "QA": "F", "REC": "F", "LONG": "F", "IP": "F",
                 "IR": "F", "COR": "F", "STB": "F", "DISP": "F",
                 "BC": "E", "CHAIN": "E", "DEFI": "E", "NFT": "E", "TOK": "E",
                 "TOKEN": "E", "UX": "E", "WC": "E", "XCH": "E", "LN": "E",
                 "INF": "E", "COMM": "E", "CONN": "E", "FW": "E", "TEST": "E",
                 "APP": "E", "DATA": None,  # mixed
                 "AI": None, "API": None, "GM": None, "RWA": None,  # mixed
                 "L": "E",
                 }
        expected = known.get(prefix)
        if expected and expected != pillar:
            non_dash_mismatches.append((n, prefix, expected))

if non_dash_mismatches:
    print(f"  Found {len(non_dash_mismatches)} mismatches:")
    for n, prefix, expected in non_dash_mismatches[:30]:
        print(f"    {n['code']} (prefix={prefix}): pillar={n['pillar']} should be {expected} | {n['title'][:50]}")
else:
    print("  All non-dash codes match expected pillars")
