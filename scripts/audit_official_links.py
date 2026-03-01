#!/usr/bin/env python3
"""Audit official_link quality - find mismatched, generic, or Wikipedia links."""
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
import requests, re
from collections import Counter, defaultdict
from src.core.config import SUPABASE_URL, get_supabase_headers

headers = get_supabase_headers(use_service_key=True)

all_norms = []
offset = 0
while True:
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/norms?select=id,code,pillar,title,official_link,official_doc_summary&order=code&limit=1000&offset={offset}",
        headers=headers
    )
    if r.status_code != 200 or not r.json():
        break
    all_norms.extend(r.json())
    if len(r.json()) < 1000:
        break
    offset += 1000

print(f"Total: {len(all_norms)} norms")

# 1. Categorize link quality
issues = []

# Wikipedia links (not credible primary source)
wiki_links = [n for n in all_norms if "wikipedia.org" in str(n.get("official_link", ""))]
print(f"\n=== WIKIPEDIA LINKS ({len(wiki_links)}) ===")
for n in wiki_links[:30]:
    print(f"  {n['code']}: {n['title'][:40]} -> {n['official_link']}")
if len(wiki_links) > 30:
    print(f"  ... and {len(wiki_links)-30} more")

# Generic/homepage links (not specific to the norm)
generic_patterns = [
    r"^https?://[^/]+/?$",  # Just a domain root
    r"/wiki/[A-Z][a-z]",  # Wikipedia article
    r"w3\.org/(WAI|TR)/?$",  # W3C homepage
    r"nist\.gov/?$",
]

# BIP links - check if they point to the right BIP number
bip_mismatches = []
for n in all_norms:
    code = n.get("code", "")
    link = str(n.get("official_link", ""))
    title = n.get("title", "")

    # Check BIP number matches
    bip_match = re.match(r'^BIP(\d+)$', code)
    if bip_match:
        bip_num = bip_match.group(1)
        if f"bip-{bip_num.zfill(4)}" not in link and f"bip{bip_num}" not in link.lower():
            bip_mismatches.append(n)

    # Check EIP number matches
    eip_match = re.match(r'^EIP(\d+)$', code)
    if eip_match:
        eip_num = eip_match.group(1)
        if f"eip-{eip_num}" not in link and f"eip/{eip_num}" not in link and f"eips/{eip_num}" not in link:
            # Check if the link even mentions the right number
            if eip_num not in link:
                bip_mismatches.append(n)

print(f"\n=== BIP/EIP NUMBER MISMATCHES ({len(bip_mismatches)}) ===")
for n in bip_mismatches:
    print(f"  {n['code']}: {n['title'][:40]}")
    print(f"    Link: {n['official_link']}")

# NIST links - check generic vs specific
nist_generic = [n for n in all_norms if "nist.gov" in str(n.get("official_link", "")) and
                str(n.get("official_link", "")).count("/") <= 4]
print(f"\n=== POTENTIALLY GENERIC NIST LINKS ({len(nist_generic)}) ===")
for n in nist_generic[:10]:
    print(f"  {n['code']}: {n['title'][:40]}")
    print(f"    Link: {n['official_link']}")

# Check doc_summary quality - "Comprehensive Analysis" templates (AI-generated, not real)
ai_generated_docs = [n for n in all_norms if "Comprehensive Analysis" in str(n.get("official_doc_summary", "")) or
                     "Generated:" in str(n.get("official_doc_summary", ""))[:100]]
print(f"\n=== AI-GENERATED DOC SUMMARIES (not real scraped content) ({len(ai_generated_docs)}) ===")
for n in ai_generated_docs[:15]:
    doc = str(n.get("official_doc_summary", ""))[:150]
    print(f"  {n['code']}: {n['title'][:40]}")
    print(f"    Doc: {doc}...")

# Count by domain
print(f"\n=== LINK DOMAINS ===")
domains = Counter()
for n in all_norms:
    link = str(n.get("official_link", ""))
    m = re.match(r'https?://([^/]+)', link)
    if m:
        domain = m.group(1).replace("www.", "")
        domains[domain] += 1

for d, c in domains.most_common(25):
    print(f"  {d}: {c}")

# Summary
total_issues = len(wiki_links) + len(bip_mismatches) + len(ai_generated_docs)
print(f"\n=== SUMMARY ===")
print(f"  Wikipedia links: {len(wiki_links)}")
print(f"  BIP/EIP mismatches: {len(bip_mismatches)}")
print(f"  AI-generated doc summaries: {len(ai_generated_docs)}")
print(f"  Total link issues: {total_issues}")
