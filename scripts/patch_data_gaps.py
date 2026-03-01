"""
Fix all remaining data gaps in products and norms before evaluation.
Run after enrich_complete.py finishes.

Fixes:
1. 2 products missing description (AI knowledge)
2. 131 products with short descriptions (<50 chars) - regenerate better ones
3. 9 products missing URL - decide per product
4. 1838 norms with full=NULL - set to True (default for scoring)
5. 3 products missing short_description
"""
import sys, os, time, json
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import requests
from datetime import datetime, timezone
from src.core.config import SUPABASE_URL, SUPABASE_SERVICE_KEY

HEADERS = {
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal',
}
READ_HEADERS = {
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
    'Prefer': 'return=representation',
}

def fetch_all(table, select='*', extra='', order='id.asc'):
    all_rows = []
    offset = 0
    limit = 1000
    while True:
        url = f"{SUPABASE_URL}/rest/v1/{table}?select={select}&offset={offset}&limit={limit}&order={order}"
        if extra: url += f"&{extra}"
        r = requests.get(url, headers=READ_HEADERS, timeout=30)
        if r.status_code != 200: break
        rows = r.json()
        if not isinstance(rows, list) or not rows: break
        all_rows.extend(rows)
        if len(rows) < limit: break
        offset += limit
    return all_rows

def update_record(table, record_id, data):
    data['data_updated_at'] = datetime.now(timezone.utc).isoformat()
    try:
        r = requests.patch(f"{SUPABASE_URL}/rest/v1/{table}?id=eq.{record_id}",
                           json=data, headers=HEADERS, timeout=30)
        if r.status_code not in [200, 204]:
            print(f"  UPDATE ERROR {table} id={record_id}: {r.status_code} {r.text[:200]}")
        return r.status_code in [200, 204]
    except Exception as e:
        print(f"  UPDATE EXCEPTION: {e}")
        return False

_ai = None
def get_ai():
    global _ai
    if not _ai:
        from src.core.api_provider import AIProvider
        _ai = AIProvider()
    return _ai

def ai_call(prompt, max_tokens=500, temperature=0.3):
    """Safe AI call with retry."""
    for attempt in range(3):
        try:
            resp = get_ai().call(prompt, max_tokens=max_tokens, temperature=temperature)
            if resp:
                return resp.strip()
        except Exception as e:
            if attempt < 2:
                time.sleep(2)
            else:
                print(f"  AI ERROR: {e}")
    return None

BAD_STARTS = [
    'i notice', "i can't", 'i cannot', 'based on the scraped', 'based on the provid',
    'based on my', 'based on ', 'based on general', 'note:', "there's a mismatch", 'i apologize',
    'unfortunately', "i'm unable", 'the scraped content', 'the provided content',
    "i don't", "i'm not", 'i was unable', 'the content provided', 'from the scraped',
    "i couldn't", "i'm sorry", 'as an ai', 'this product',
    'no information', 'no reliable', 'i need permission', 'i need access',
    'i need to', 'could you', 'please provide', 'i would need',
    'here is', "here's", 'sure,', 'certainly',
]

def clean_ai_text(text, min_len=30):
    """Clean AI response, reject meta-commentary."""
    if not text:
        return None
    text = text.strip().strip('"').strip("'").strip()
    # Remove markdown
    if text.startswith('**') and text.endswith('**'):
        text = text[2:-2].strip()
    low = text.lower()
    for bad in BAD_STARTS:
        if low.startswith(bad):
            return None
    if len(text) < min_len:
        return None
    return text

import argparse
parser = argparse.ArgumentParser()
parser.add_argument('--phase', help='Phase to run: FIX1,FIX2,FIX3,FIX4,FIX5 or ALL')
parser.add_argument('--dry-run', action='store_true')
args = parser.parse_args()

phases = [p.strip().upper() for p in args.phase.split(',')] if args.phase else ['FIX1','FIX2','FIX3','FIX4','FIX5']

# ============================================================
# FIX1: 2 products missing description
# ============================================================
if 'FIX1' in phases:
    print("\n" + "=" * 60)
    print("[FIX1] Products missing description")
    print("=" * 60)
    
    missing_desc = [
        (78, "Hermit (Unchained)", "Hermit is a command-line tool by Unchained Capital for creating air-gapped Bitcoin hardware wallets using multiple devices. It enables multi-signature setups with Trezor, Ledger, and Coldcard devices, allowing users to securely sign transactions offline for enhanced security."),
        (295, "Obvious Wallet", "Obvious is a self-custody smart wallet built on account abstraction technology. It simplifies crypto interactions with features like gasless transactions, social recovery, session keys, and multi-chain support, making Web3 accessible to mainstream users."),
    ]
    
    for pid, name, desc in missing_desc:
        print(f"\n  [{pid}] {name}")
        if not args.dry_run:
            if update_record('products', pid, {'description': desc}):
                print(f"    -> Description saved ({len(desc)} chars)")
            else:
                print(f"    -> FAILED")
        else:
            print(f"    -> [DRY RUN] Would save: {desc[:80]}...")

# ============================================================
# FIX2: Products with description < 50 chars - investigate & fix
# ============================================================
if 'FIX2' in phases:
    print("\n" + "=" * 60)
    print("[FIX2] Products with short descriptions (<50 chars)")
    print("=" * 60)
    
    products = fetch_all('products', 'id,name,url,description,type_id', 'deleted_at=is.null')
    short_prods = [p for p in products if p.get('description') and len(p['description'].strip()) < 50]
    
    print(f"\n  Found {len(short_prods)} products with description < 50 chars")
    
    # Show length distribution
    import collections
    buckets = collections.Counter()
    for p in short_prods:
        l = len(p['description'].strip())
        if l < 10: buckets['<10'] += 1
        elif l < 20: buckets['10-19'] += 1
        elif l < 30: buckets['20-29'] += 1
        elif l < 40: buckets['30-39'] += 1
        else: buckets['40-49'] += 1
    print(f"  Length distribution:")
    for k in ['<10', '10-19', '20-29', '30-39', '40-49']:
        if buckets.get(k, 0): print(f"    {k}: {buckets[k]}")
    
    # Show samples
    print(f"\n  Samples:")
    for p in short_prods[:30]:
        print(f"    id={p['id']:5d} {p['name'][:30]:30s} ({len(p['description'].strip()):2d}ch): \"{p['description'].strip()[:60]}\"")
    if len(short_prods) > 30:
        print(f"    ... and {len(short_prods)-30} more")
    
    # Regenerate descriptions for those with < 30 chars (likely garbage)
    very_short = [p for p in short_prods if len(p['description'].strip()) < 30]
    print(f"\n  Very short (<30 chars): {len(very_short)} - will regenerate")
    
    saved = 0
    failed = 0
    for i, p in enumerate(very_short):
        name = p['name']
        url = p.get('url', '')
        print(f"\n  [{i+1}/{len(very_short)}] {name} ({len(p['description'].strip())}ch: \"{p['description'].strip()[:40]}\")")
        
        prompt = f"""You are a crypto product database writer. Output ONLY the description text, no preamble.

{name} — write 2-3 factual sentences (80-250 chars) describing what this product does.

Do NOT start with "{name}". Do NOT say "Based on". Do NOT ask questions. ONLY output the description."""

        if not args.dry_run:
            resp = ai_call(prompt, max_tokens=200, temperature=0.2)
            cleaned = clean_ai_text(resp, min_len=30)
            if cleaned:
                if update_record('products', p['id'], {'description': cleaned}):
                    print(f"    -> OK ({len(cleaned)} chars)")
                    saved += 1
                else:
                    print(f"    -> save fail")
                    failed += 1
            else:
                print(f"    -> AI fail: {(resp or 'None')[:60]}")
                failed += 1
            time.sleep(0.5)
        else:
            print(f"    -> [DRY RUN]")
    
    print(f"\n  FIX2 Results: {saved} saved, {failed} failed out of {len(very_short)} very short")

# ============================================================
# FIX3: 9 products missing URL
# ============================================================
if 'FIX3' in phases:
    print("\n" + "=" * 60)
    print("[FIX3] Products missing URL - soft-delete defunct products")
    print("=" * 60)
    
    # These are products confirmed defunct/uncollectable in previous enrichment runs
    defunct_products = [
        (78, "Hermit (Unchained)", "Absorbed into Unchained platform, CLI tool deprecated"),
        (157, "SteelDisk", "Niche physical product, no website"),
        (165, "TenX Card", "Project shut down in 2021"),
        (467, "Prime Trust (RIP)", "Company collapsed, no longer operating"),
        (785, "BRICS Chain", "Appears to be vaporware/defunct"),
        (1291, "Alitin Mint", "Niche physical mint, no web presence"),
        (1299, "BTCC Mint Coins", "Physical collectible coins, BTCC mint discontinued"),
        (1341, "Lealana Coins", "Physical Bitcoin coins, maker inactive"),
        (1372, "Titan Bitcoin", "Physical Bitcoin products, defunct"),
    ]
    
    for pid, name, reason in defunct_products:
        print(f"  [{pid}] {name}: {reason}")
    
    print(f"\n  These {len(defunct_products)} products have no URL and are defunct/unreachable.")
    print(f"  Recommendation: soft-delete them (set deleted_at) so they don't pollute eval.")
    
    if not args.dry_run:
        deleted = 0
        for pid, name, reason in defunct_products:
            if update_record('products', pid, {'deleted_at': datetime.now(timezone.utc).isoformat()}):
                print(f"    [{pid}] {name} -> soft-deleted")
                deleted += 1
            else:
                print(f"    [{pid}] {name} -> FAILED")
        print(f"\n  Soft-deleted {deleted}/{len(defunct_products)}")
    else:
        print(f"  [DRY RUN] Would soft-delete {len(defunct_products)} products")

# ============================================================
# FIX4: 1838 norms with full=NULL -> set to True
# ============================================================
if 'FIX4' in phases:
    print("\n" + "=" * 60)
    print("[FIX4] Norms with full=NULL -> set to True")
    print("=" * 60)
    
    # The `full` boolean indicates if a norm is included in "full" scoring mode
    # safe_scoring_definitions already has is_full for all 2159 norms
    # But the norms.full column being NULL might cause issues elsewhere
    # Let's sync it from safe_scoring_definitions
    
    defs = fetch_all('safe_scoring_definitions', 'norm_id,is_full', '')
    defs_map = {d['norm_id']: d['is_full'] for d in defs}
    
    null_full_norms = fetch_all('norms', 'id,code,full', 'full=is.null')
    print(f"\n  Norms with full=NULL: {len(null_full_norms)}")
    print(f"  Scoring definitions available: {len(defs_map)}")
    
    if not args.dry_run:
        # Batch update: set full=True for all norms where it's NULL
        # Since safe_scoring_definitions has is_full for all 2159 norms, 
        # we sync from there
        updated = 0
        failed = 0
        for i, n in enumerate(null_full_norms):
            is_full = defs_map.get(n['id'], True)  # default True if not in defs
            r = requests.patch(
                f"{SUPABASE_URL}/rest/v1/norms?id=eq.{n['id']}",
                json={'full': is_full, 'data_updated_at': datetime.now(timezone.utc).isoformat()},
                headers=HEADERS, timeout=30
            )
            if r.status_code in [200, 204]:
                updated += 1
            else:
                failed += 1
                if failed <= 3:
                    print(f"  ERROR norm {n['id']}: {r.status_code} {r.text[:100]}")
            
            if (i+1) % 200 == 0:
                print(f"  ... {i+1}/{len(null_full_norms)} processed")
        
        print(f"\n  Updated: {updated}, Failed: {failed}")
    else:
        print(f"  [DRY RUN] Would set full for {len(null_full_norms)} norms")

# ============================================================
# FIX5: 3 products missing short_description
# ============================================================
if 'FIX5' in phases:
    print("\n" + "=" * 60)
    print("[FIX5] Products missing short_description")
    print("=" * 60)
    
    # Fetch products with description but no short_description
    products = fetch_all('products', 'id,name,description,short_description', 'deleted_at=is.null')
    missing_short = [p for p in products if p.get('description') and not p.get('short_description')]
    
    print(f"\n  Products with desc but no short_desc: {len(missing_short)}")
    
    saved = 0
    for p in missing_short:
        name = p['name']
        desc = p['description'][:500]
        print(f"\n  [{p['id']}] {name}")
        
        prompt = f"""You are a crypto product database writer. Output ONLY the summary, no preamble.

Summarize in ONE sentence (10-20 words, under 140 chars):
{name}: {desc}

Do NOT start with "{name}". ONLY output the sentence."""

        if not args.dry_run:
            resp = ai_call(prompt, max_tokens=60, temperature=0.1)
            cleaned = clean_ai_text(resp, min_len=10)
            if cleaned:
                short = cleaned
                if len(short) > 147: short = short[:147] + '...'
                if update_record('products', p['id'], {'short_description': short}):
                    print(f"    -> OK ({len(short)} chars): {short}")
                    saved += 1
                else:
                    print(f"    -> save fail")
            else:
                print(f"    -> AI fail")
            time.sleep(0.3)
        else:
            print(f"    -> [DRY RUN]")
    
    print(f"\n  FIX5 Results: {saved}/{len(missing_short)} saved")

print("\n" + "=" * 60)
print("ALL FIXES COMPLETE")
print("=" * 60)
