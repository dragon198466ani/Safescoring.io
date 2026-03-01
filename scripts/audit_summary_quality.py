#!/usr/bin/env python3
"""
Audit the quality of AI-generated norm summaries in SafeScoring.
Checks for template patterns, official links, doc summaries, reference sources, and hallucination scores.
"""
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
import requests, re
from collections import Counter
from src.core.config import SUPABASE_URL, get_supabase_headers

headers = get_supabase_headers(use_service_key=True)

all_norms = []
offset = 0
while True:
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/norms?select=id,code,pillar,title,summary,official_doc_summary,official_link,reference_sources,hallucination_checked,hallucination_score,official_content&order=code&limit=1000&offset={offset}",
        headers=headers
    )
    if r.status_code != 200 or not r.json():
        break
    all_norms.extend(r.json())
    if len(r.json()) < 1000:
        break
    offset += 1000

print(f"Total: {len(all_norms)} norms")

# 1. Summary template detection
print("\n=== SUMMARY TEMPLATE ANALYSIS ===")
template_patterns = [
    r"^This (standard|norm|document|specification|framework|protocol|guideline)",
    r"is a (comprehensive|critical|essential|important|fundamental)",
    r"aims to (provide|establish|ensure|define|standardize)",
    r"^## (Purpose|Overview|Scope|Key Requirements)",
]

template_counts = Counter()
for n in all_norms:
    s = str(n.get("summary", ""))
    for pat in template_patterns:
        if re.search(pat, s, re.MULTILINE):
            template_counts[pat] += 1

for pat, cnt in template_counts.most_common():
    print(f"  Pattern '{pat}': {cnt} matches ({cnt*100//len(all_norms)}%)")

# Check summary lengths
lengths = [len(str(n.get("summary", ""))) for n in all_norms]
print(f"\n  Summary length: min={min(lengths)}, max={max(lengths)}, avg={sum(lengths)//len(lengths)}")

# 2. Official links quality
print("\n=== OFFICIAL LINKS ===")
link_types = Counter()
for n in all_norms:
    link = str(n.get("official_link", ""))
    if not link or link == "None":
        link_types["MISSING"] += 1
    elif "iso.org" in link:
        link_types["iso.org"] += 1
    elif "nist.gov" in link:
        link_types["nist.gov"] += 1
    elif "rfc-editor.org" in link or "ietf.org" in link:
        link_types["IETF/RFC"] += 1
    elif "github.com" in link:
        link_types["github.com"] += 1
    elif "eips.ethereum.org" in link:
        link_types["eips.ethereum.org"] += 1
    elif "owasp.org" in link:
        link_types["owasp.org"] += 1
    elif "pcisecuritystandards.org" in link:
        link_types["pcisecuritystandards.org"] += 1
    elif "w3.org" in link:
        link_types["w3.org"] += 1
    elif link.startswith("http"):
        link_types["other_url"] += 1
    else:
        link_types["invalid: " + link[:50]] += 1

for t, c in link_types.most_common(20):
    print(f"  {t}: {c}")

# 3. Official doc summary quality
print("\n=== OFFICIAL DOC SUMMARY ===")
doc_lengths = [len(str(n.get("official_doc_summary", ""))) for n in all_norms]
print(f"  Length: min={min(doc_lengths)}, max={max(doc_lengths)}, avg={sum(doc_lengths)//len(doc_lengths)}")
short_docs = [n for n in all_norms if len(str(n.get("official_doc_summary", ""))) < 50]
print(f"  Short (<50 chars): {len(short_docs)}")
generic_docs = [n for n in all_norms if "could not" in str(n.get("official_doc_summary", "")).lower() or "unable to" in str(n.get("official_doc_summary", "")).lower() or "no information" in str(n.get("official_doc_summary", "")).lower()]
print(f"  Generic/failed scrape: {len(generic_docs)}")

# 4. Reference sources
print("\n=== REFERENCE SOURCES ===")
has_refs = [n for n in all_norms if n.get("reference_sources") and str(n["reference_sources"]).strip() not in ("", "None", "null", "[]")]
print(f"  Have reference_sources: {len(has_refs)}/{len(all_norms)}")
if has_refs:
    print(f"  Sample:")
    for n in has_refs[:5]:
        print(f"    {n['code']}: {str(n['reference_sources'])[:200]}")

# 5. Hallucination scores
print("\n=== HALLUCINATION CHECK ===")
checked = [n for n in all_norms if n.get("hallucination_checked")]
print(f"  Checked: {len(checked)}/{len(all_norms)}")
high_risk = [n for n in all_norms if n.get("hallucination_score") is not None and float(n["hallucination_score"]) > 0.5]
print(f"  High risk (score > 0.5): {len(high_risk)}")
for n in high_risk[:10]:
    print(f"    {n['code']}: score={n['hallucination_score']} | {n['title'][:50]}")

# 6. Sample norms per pillar
print("\n=== SAMPLE NORMS (5 per pillar) ===")
for pillar in ["S", "A", "F", "E"]:
    pnorms = [n for n in all_norms if n.get("pillar") == pillar]
    print(f"\n--- {pillar} pillar ({len(pnorms)} total, sample 5) ---")
    import random
    random.seed(42)
    sample = random.sample(pnorms, min(5, len(pnorms)))
    for n in sample:
        summary = str(n.get("summary", ""))[:300]
        doc_summary = str(n.get("official_doc_summary", ""))[:200]
        link = str(n.get("official_link", ""))
        print(f"  {n['code']}: {n['title']}")
        print(f"    Link: {link}")
        print(f"    Doc summary: {doc_summary[:150]}...")
        print(f"    AI Summary: {summary[:200]}...")
        print()
