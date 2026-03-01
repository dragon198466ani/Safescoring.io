#!/usr/bin/env python3
"""Full audit of all 2,159 norms - structure, data quality, coherence."""
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
import re
import requests
from collections import Counter, defaultdict
from src.core.config import SUPABASE_URL, get_supabase_headers

headers = get_supabase_headers(use_service_key=True)

# Load all norms with pagination
def load_all_norms():
    all_norms = []
    offset = 0
    while True:
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/norms?select=id,code,pillar,title,description,is_essential,consumer,official_link,access_type,full,official_doc_summary,chapter,summary_status,norm_status,target_type,summary,hallucination_checked,hallucination_score&order=code&limit=1000&offset={offset}",
            headers=headers
        )
        if r.status_code != 200 or not r.json():
            break
        all_norms.extend(r.json())
        if len(r.json()) < 1000:
            break
        offset += 1000
    return all_norms

print("Loading all norms...")
norms = load_all_norms()
print(f"Loaded {len(norms)} norms\n")

print("=" * 70)
print("   AUDIT COMPLET DES NORMES")
print("=" * 70)

issues_total = 0

# ============================================
# 1. PILLAR DISTRIBUTION
# ============================================
pillars = Counter(n.get("pillar") for n in norms)
print(f"\n1. PILLAR DISTRIBUTION ({len(pillars)} pillars):")
for p, c in sorted(pillars.items()):
    print(f"   {p}: {c} norms")

invalid_pillars = [n for n in norms if n.get("pillar") not in ("S", "A", "F", "E")]
if invalid_pillars:
    print(f"\n   INVALID PILLARS: {len(invalid_pillars)}")
    for n in invalid_pillars[:10]:
        print(f"     {n['code']}: pillar='{n.get('pillar')}'")
    issues_total += len(invalid_pillars)

# ============================================
# 2. CODE FORMAT
# ============================================
print(f"\n2. CODE FORMAT:")
code_formats = defaultdict(list)
bad_format = []
for n in norms:
    code = n.get("code", "")
    pillar = n.get("pillar", "")

    # Detect code pattern
    m = re.match(r'^([A-Z]+)(\d+)$', code)
    if m:
        prefix = m.group(1)
        num = int(m.group(2))
        code_formats[prefix].append({"code": code, "num": num, "pillar": pillar, "id": n["id"]})
    else:
        bad_format.append(n)

print(f"   Code prefixes found:")
for prefix, items in sorted(code_formats.items()):
    nums = sorted(i["num"] for i in items)
    pillar_set = set(i["pillar"] for i in items)
    print(f"     {prefix}: {len(items)} norms, range {min(nums)}-{max(nums)}, pillar(s): {pillar_set}")

if bad_format:
    print(f"\n   BAD FORMAT CODES: {len(bad_format)}")
    for n in bad_format[:10]:
        print(f"     '{n['code']}' (pillar={n.get('pillar')})")
    issues_total += len(bad_format)

# ============================================
# 3. CODE-PILLAR COHERENCE
# ============================================
print(f"\n3. CODE-PILLAR COHERENCE:")
# Expected: S* -> S, A* -> A, F* -> F, E* -> E
# But also: PRIV* -> A, etc.
prefix_to_expected_pillar = {
    "S": "S", "A": "A", "F": "F", "E": "E",
    "PRIV": "A",  # Privacy norms in Adversity pillar
}

mismatched = []
for prefix, items in code_formats.items():
    expected = prefix_to_expected_pillar.get(prefix)
    if expected:
        for item in items:
            if item["pillar"] != expected:
                mismatched.append(item)
    else:
        # Unknown prefix - flag for review
        for item in items:
            mismatched.append({**item, "note": f"Unknown prefix {prefix}"})

if mismatched:
    print(f"   MISMATCHED: {len(mismatched)}")
    for m in mismatched[:20]:
        note = m.get("note", "")
        print(f"     {m['code']} -> pillar={m['pillar']} {note}")
    issues_total += len(mismatched)
else:
    print(f"   All codes match their pillar")

# ============================================
# 4. DUPLICATE CODES
# ============================================
print(f"\n4. DUPLICATE CODES:")
code_counts = Counter(n.get("code") for n in norms)
dupes = {code: cnt for code, cnt in code_counts.items() if cnt > 1}
if dupes:
    print(f"   {len(dupes)} duplicate codes!")
    for code, cnt in sorted(dupes.items()):
        matching = [n for n in norms if n["code"] == code]
        ids = [n["id"] for n in matching]
        print(f"     {code}: {cnt}x (ids: {ids})")
    issues_total += len(dupes)
else:
    print(f"   No duplicates")

# ============================================
# 5. DATA COMPLETENESS
# ============================================
print(f"\n5. DATA COMPLETENESS:")
no_title = [n for n in norms if not n.get("title") or len(str(n["title"]).strip()) < 3]
no_desc = [n for n in norms if not n.get("description") or len(str(n["description"]).strip()) < 5]
has_full = [n for n in norms if n.get("full") and str(n["full"]).strip() not in ("", "True", "False")]
has_summary = [n for n in norms if n.get("official_doc_summary") and len(str(n["official_doc_summary"]).strip()) > 20]
has_link = [n for n in norms if n.get("official_link") and len(str(n["official_link"]).strip()) > 5]
has_chapter = [n for n in norms if n.get("chapter") and len(str(n["chapter"]).strip()) > 2]
has_ai_summary = [n for n in norms if n.get("summary") and len(str(n["summary"]).strip()) > 50]

print(f"   Title: {len(norms)-len(no_title)}/{len(norms)} ({(len(norms)-len(no_title))*100//len(norms)}%)")
print(f"   Description: {len(norms)-len(no_desc)}/{len(norms)} ({(len(norms)-len(no_desc))*100//len(norms)}%)")
print(f"   Official doc summary: {len(has_summary)}/{len(norms)} ({len(has_summary)*100//len(norms)}%)")
print(f"   Official link: {len(has_link)}/{len(norms)} ({len(has_link)*100//len(norms)}%)")
print(f"   Chapter: {len(has_chapter)}/{len(norms)} ({len(has_chapter)*100//len(norms)}%)")
print(f"   AI Summary: {len(has_ai_summary)}/{len(norms)} ({len(has_ai_summary)*100//len(norms)}%)")

if no_title:
    print(f"\n   MISSING TITLE ({len(no_title)}):")
    for n in no_title[:5]:
        print(f"     {n['code']}: '{n.get('title','')}'")
    issues_total += len(no_title)

if no_desc:
    print(f"\n   MISSING DESCRIPTION ({len(no_desc)}):")
    for n in no_desc[:5]:
        print(f"     {n['code']}: '{str(n.get('description',''))[:50]}'")
    issues_total += len(no_desc)

# ============================================
# 6. FLAGS (Essential / Consumer)
# ============================================
print(f"\n6. FLAGS:")
essential_count = sum(1 for n in norms if n.get("is_essential"))
consumer_count = sum(1 for n in norms if n.get("consumer"))
print(f"   Essential: {essential_count} ({essential_count*100//len(norms)}%)")
print(f"   Consumer: {consumer_count} ({consumer_count*100//len(norms)}%)")

# Per pillar
for pillar in ["S", "A", "F", "E"]:
    pnorms = [n for n in norms if n.get("pillar") == pillar]
    ess = sum(1 for n in pnorms if n.get("is_essential"))
    cons = sum(1 for n in pnorms if n.get("consumer"))
    print(f"   {pillar}: {len(pnorms)} norms, {ess} essential ({ess*100//max(len(pnorms),1)}%), {cons} consumer ({cons*100//max(len(pnorms),1)}%)")

# ============================================
# 7. CHAPTERS
# ============================================
print(f"\n7. CHAPTERS:")
chapters = Counter(n.get("chapter", "NONE") for n in norms)
for ch, cnt in chapters.most_common(30):
    print(f"   {ch}: {cnt}")

# ============================================
# 8. NORM STATUS
# ============================================
print(f"\n8. NORM STATUS:")
statuses = Counter(n.get("norm_status", "NONE") for n in norms)
for s, c in statuses.most_common():
    print(f"   {s}: {c}")

# ============================================
# 9. SUMMARY STATUS
# ============================================
print(f"\n9. SUMMARY STATUS:")
sum_statuses = Counter(n.get("summary_status", "NONE") for n in norms)
for s, c in sum_statuses.most_common():
    print(f"   {s}: {c}")

# ============================================
# 10. HALLUCINATION CHECK
# ============================================
print(f"\n10. HALLUCINATION CHECK:")
checked = sum(1 for n in norms if n.get("hallucination_checked"))
scores = [n.get("hallucination_score") for n in norms if n.get("hallucination_score") is not None]
print(f"    Checked: {checked}/{len(norms)}")
if scores:
    print(f"    Score range: {min(scores)}-{max(scores)}")
    print(f"    Average: {sum(scores)/len(scores):.1f}")

# ============================================
# 11. TARGET TYPE
# ============================================
print(f"\n11. TARGET TYPE:")
targets = Counter(n.get("target_type", "NONE") for n in norms)
for t, c in targets.most_common():
    print(f"    {t}: {c}")

# ============================================
# 12. ACCESS TYPE
# ============================================
print(f"\n12. ACCESS TYPE:")
access = Counter(n.get("access_type", "NONE") for n in norms)
for a, c in access.most_common():
    print(f"    {a}: {c}")

# ============================================
# 13. CODE RANGES PER PILLAR
# ============================================
print(f"\n13. CODE RANGES:")
for prefix, items in sorted(code_formats.items()):
    nums = sorted(i["num"] for i in items)
    full_range = set(range(min(nums), max(nums)+1))
    gaps = full_range - set(nums)
    if gaps and len(gaps) <= 30:
        print(f"   {prefix}: {min(nums)}-{max(nums)}, gaps: {sorted(gaps)}")
    elif gaps:
        print(f"   {prefix}: {min(nums)}-{max(nums)}, {len(gaps)} gaps")
    else:
        print(f"   {prefix}: {min(nums)}-{max(nums)}, continuous")

# ============================================
# SUMMARY
# ============================================
print(f"\n{'='*70}")
if issues_total == 0:
    print(f"   ZERO ISSUES - ALL {len(norms)} NORMS ARE CLEAN")
else:
    print(f"   TOTAL ISSUES: {issues_total}")
print(f"{'='*70}")
