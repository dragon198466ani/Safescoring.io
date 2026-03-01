#!/usr/bin/env python3
"""Inspect data gaps in products and norms."""
import os, sys, json, requests
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.core.config import SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_KEY

KEY = SUPABASE_SERVICE_KEY or SUPABASE_KEY
H = {'apikey': KEY, 'Authorization': f'Bearer {KEY}'}

def get(path):
    r = requests.get(f"{SUPABASE_URL}/rest/v1/{path}", headers=H, timeout=30)
    return r.json() if r.status_code == 200 else []

# Sample norms with chapters
print("=== SAMPLE CHAPTERS ===")
for n in get("norms?select=code,chapter&chapter=not.is.null&limit=10"):
    print(f"  {n['code']}: chapter={n.get('chapter')}")

# Norms missing description 
print("\n=== NORMS MISSING DESCRIPTION ===")
for n in get("norms?select=id,code,pillar,title,description,official_link&or=(description.is.null,description.eq.)&limit=10"):
    link = str(n.get('official_link', ''))[:60]
    print(f"  {n['code']}: title={n.get('title','?')[:60]} | link={link}")

# Norms missing official_link
print("\n=== NORMS MISSING OFFICIAL_LINK ===")
for n in get("norms?select=id,code,pillar,title,official_link&or=(official_link.is.null,official_link.eq.)&limit=10"):
    print(f"  {n['code']}: {n.get('title','?')[:70]}")

# Sample norm with official_doc_summary
print("\n=== SAMPLE NORM (full data) ===")
norms = get("norms?select=id,code,pillar,title,description,full,official_link,official_doc_summary,official_content,chapter,target_type,consumer,norm_status,hallucination_checked&limit=2&description=not.is.null&official_doc_summary=not.is.null")
for n in norms:
    for k, v in n.items():
        val = str(v)[:150] if v else 'NULL'
        print(f"  {k}: {val}")
    print()

# How many norms have full but its empty vs truly null
print("=== FULL TEXT STATUS ===")
all_norms = get("norms?select=code,full&limit=5&full=not.is.null")
if all_norms:
    print(f"  Norms with non-null full: found some")
    for n in all_norms[:3]:
        full_val = str(n.get('full', ''))[:100]
        print(f"    {n['code']}: full={full_val}")
else:
    print("  NO norms have full text populated")

# Check official_content
print("\n=== OFFICIAL_CONTENT STATUS ===")
oc = get("norms?select=code,official_content&limit=5&official_content=not.is.null")
if oc:
    for n in oc[:3]:
        print(f"  {n['code']}: {str(n.get('official_content',''))[:100]}")
else:
    print("  NO norms have official_content populated")
