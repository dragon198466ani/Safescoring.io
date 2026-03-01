#!/usr/bin/env python3
"""
MASTER DATA ENRICHMENT - Products AND Norms
=============================================
Fills ALL data gaps across the entire database.

PRODUCTS:
  P1: Find missing URLs (AI lookup + validation)
  P2: Generate missing descriptions (scrape + AI knowledge)  
  P3: Generate missing short_descriptions (from description)
  P4: Find missing logo_url (AI knowledge)

NORMS:
  N1: Fix missing official_links (AI lookup)
  N2: Fix missing descriptions (AI generate)
  N3: Fill official_content (scrape official_link)
  N4: Fill chapter field (derive from norm code/pillar)

Usage:
  python scripts/enrich_complete.py                    # Run ALL phases
  python scripts/enrich_complete.py --phase P2         # Products descriptions only
  python scripts/enrich_complete.py --phase N3         # Norm official_content only
  python scripts/enrich_complete.py --phase P2 --limit 10  # Test with 10
"""

import os, sys, re, json, time, requests, traceback
from datetime import datetime, timezone
from collections import Counter
from urllib.parse import urlparse

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.core.config import SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_KEY

KEY = SUPABASE_SERVICE_KEY or SUPABASE_KEY
HEADERS = {
    'apikey': KEY, 'Authorization': f'Bearer {KEY}',
    'Content-Type': 'application/json', 'Prefer': 'return=minimal'
}
READ_HEADERS = {'apikey': KEY, 'Authorization': f'Bearer {KEY}'}

stats = Counter()

# ─── AI Provider singleton ───────────────────────────────────────────
_ai = None
def get_ai():
    global _ai
    if not _ai:
        from src.core.api_provider import AIProvider
        _ai = AIProvider()
    return _ai

def ai_call(prompt, max_tokens=300, temperature=0.2):
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
                print(f"  AI error: {e}")
    return None

# ─── Supabase helpers ────────────────────────────────────────────────
def fetch_all(table, select='*', extra_params='', page_size=1000):
    rows, offset = [], 0
    while True:
        url = f"{SUPABASE_URL}/rest/v1/{table}?select={select}&limit={page_size}&offset={offset}"
        if extra_params:
            url += f"&{extra_params}"
        r = requests.get(url, headers=READ_HEADERS, timeout=60)
        if r.status_code != 200:
            print(f"  FETCH ERROR {table}: {r.status_code} {r.text[:200]}")
            break
        d = r.json()
        if not d: break
        rows.extend(d)
        if len(d) < page_size: break
        offset += page_size
    return rows

def update_record(table, record_id, data):
    """Update any record in any table."""
    data['data_updated_at'] = datetime.now(timezone.utc).isoformat()
    try:
        r = requests.patch(f"{SUPABASE_URL}/rest/v1/{table}?id=eq.{record_id}",
                           json=data, headers=HEADERS, timeout=30)
        if r.status_code not in [200, 204]:
            print(f"\n  UPDATE ERROR {table} id={record_id}: {r.status_code} {r.text[:200]}")
        return r.status_code in [200, 204]
    except Exception as e:
        print(f"\n  UPDATE EXCEPTION {table} id={record_id}: {e}")
        return False

# ─── HTML parser ─────────────────────────────────────────────────────
def parse_html(html, max_chars=8000):
    from html.parser import HTMLParser
    class P(HTMLParser):
        def __init__(self):
            super().__init__()
            self.t = []; self.skip = False
        def handle_starttag(self, tag, attrs):
            if tag in ['script','style','nav','footer','noscript','iframe','header']:
                self.skip = True
        def handle_endtag(self, tag):
            if tag in ['script','style','nav','footer','noscript','iframe','header']:
                self.skip = False
        def handle_data(self, data):
            if not self.skip:
                t = data.strip()
                if t and len(t) > 2: self.t.append(t)
    p = P()
    try: p.feed(html)
    except: pass
    c = ' '.join(p.t)
    return c[:max_chars] if c else None

# ─── Scraping strategies ─────────────────────────────────────────────
REQ_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/121.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5'
}

def scrape_http(url, max_chars=8000):
    try:
        r = requests.get(url, timeout=15, headers=REQ_HEADERS, allow_redirects=True)
        if r.status_code == 200:
            return parse_html(r.text, max_chars)
    except: pass
    return None

def scrape_playwright(url, max_chars=8000):
    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            b = p.chromium.launch(headless=True)
            page = b.new_page(user_agent=REQ_HEADERS['User-Agent'])
            page.goto(url, wait_until='networkidle', timeout=20000)
            page.wait_for_timeout(2000)
            html = page.content()
            b.close()
            return parse_html(html, max_chars)
    except: return None

def scrape_subpages(url, max_chars=8000):
    base = url.rstrip('/')
    best, best_len = None, 0
    for sub in ['/about', '/docs', '/about-us', '/faq', '/features']:
        try:
            r = requests.get(f"{base}{sub}", timeout=8, headers=REQ_HEADERS, allow_redirects=True)
            if r.status_code == 200:
                c = parse_html(r.text, max_chars)
                if c and len(c) > best_len:
                    best, best_len = c, len(c)
                    if best_len >= 500: break
        except: continue
    return best

def scrape_full(url, max_chars=8000):
    """Try HTTP -> Playwright -> subpages. Returns (content, method)."""
    c = scrape_http(url, max_chars)
    if c and len(c) >= 100: return c, 'http'
    c2 = scrape_playwright(url, max_chars)
    if c2 and len(c2) >= 100: return c2, 'playwright'
    c3 = scrape_subpages(url, max_chars)
    if c3 and len(c3) >= 100: return c3, 'subpage'
    best = max([c, c2, c3], key=lambda x: len(x) if x else 0)
    return best, ('partial' if best else 'none')

# ─── AI text quality filter ─────────────────────────────────────────
BAD_STARTS = [
    'i notice', "i can't", 'i cannot', 'based on the scraped', 'based on the provid',
    'based on my', 'based on ', 'note:', "there's a mismatch", 'i apologize',
    'unfortunately', "i'm unable", 'the scraped content', 'the provided content',
    "i don't", "i'm not", 'i was unable', 'the content provided', 'from the scraped',
    'description for', "i couldn't", "i'm sorry", 'as an ai', 'this product',
    'no information', 'no reliable'
]
BAD_CONTAINS = [
    'cannot write', 'not enough information', 'insufficient content',
    'does not contain', "doesn't contain", 'no relevant', 'mismatch',
    'not able to', 'unable to determine', 'as an ai model'
]

def clean_ai_text(text, min_len=30):
    """Clean and validate AI-generated text. Returns None if bad."""
    if not text: return None
    desc = text.strip().strip('"').strip("'")
    desc = re.sub(r'^(Description|DESCRIPTION|desc|Note):\s*', '', desc, flags=re.IGNORECASE)
    if desc.upper().strip() in ('UNKNOWN', 'N/A', 'NONE') or len(desc) < min_len:
        return None
    dl = desc.lower()
    if any(dl.startswith(b) for b in BAD_STARTS): return None
    if any(b in dl for b in BAD_CONTAINS): return None
    return desc


# ═══════════════════════════════════════════════════════════════════
# PRODUCT PHASES
# ═══════════════════════════════════════════════════════════════════

def phase_P1(products, types_by_id, limit=None):
    """P1: Find missing URLs for products."""
    targets = [p for p in products if not p.get('url') or len(str(p.get('url','')).strip()) < 5]
    if limit: targets = targets[:limit]
    if not targets:
        print("\n[P1] All products have URLs")
        return

    print(f"\n{'='*60}")
    print(f"[P1] FIND MISSING URLs ({len(targets)} products)")
    print(f"{'='*60}")

    for i, p in enumerate(targets, 1):
        name, slug = p['name'], p.get('slug', '')
        type_name = types_by_id.get(p.get('type_id'), {}).get('name', '')
        print(f"\n[{i}/{len(targets)}] {name} (slug={slug})")

        prompt = f"""What is the official website URL for the crypto/fintech product "{name}"?
Product type: {type_name or 'unknown'}
{f'Known slug: {slug}' if slug else ''}

RULES:
- Return ONLY the URL, nothing else (e.g. https://example.com)
- Must be the official product website, not a third-party page
- If defunct/dead, return the last known official URL
- If you truly don't know, respond with exactly "UNKNOWN"
- Do NOT guess or fabricate URLs"""

        resp = ai_call(prompt, max_tokens=100, temperature=0.0)
        if not resp: 
            stats['P1_ai_fail'] += 1; continue

        url = resp.strip().strip('"').strip("'")
        url_match = re.search(r'https?://[^\s<>"\']+', url)
        if url_match: url = url_match.group(0).rstrip('/.,;:)')
        if not url.startswith('http') or url.upper() == 'UNKNOWN':
            print(f"  -> AI says unknown"); stats['P1_unknown'] += 1; continue

        # Validate URL resolves
        valid = False
        for method in ['head', 'get']:
            try:
                if method == 'head':
                    r = requests.head(url, timeout=8, allow_redirects=True, headers=REQ_HEADERS)
                else:
                    r = requests.get(url, timeout=8, headers=REQ_HEADERS, allow_redirects=True, stream=True)
                    r.close()
                if r.status_code < 400:
                    url = str(r.url).rstrip('/')
                    valid = True; break
            except: continue

        if valid:
            print(f"  -> Found: {url}")
            if update_record('products', p['id'], {'url': url}):
                p['url'] = url
                stats['P1_found'] += 1
            else:
                stats['P1_save_fail'] += 1
        else:
            print(f"  -> URL {url} does not resolve"); stats['P1_no_resolve'] += 1
        time.sleep(1)


def phase_P2(products, types_by_id, limit=None):
    """P2: Generate missing descriptions."""
    targets = [p for p in products if not p.get('description') or len(str(p.get('description',''))) < 15]
    if limit: targets = targets[:limit]
    if not targets:
        print("\n[P2] All products have descriptions")
        return

    print(f"\n{'='*60}")
    print(f"[P2] GENERATE DESCRIPTIONS ({len(targets)} products)")
    print(f"{'='*60}")

    for i, p in enumerate(targets, 1):
        name, url, pid = p['name'], p.get('url', ''), p['id']
        type_name = types_by_id.get(p.get('type_id'), {}).get('name', '')
        print(f"\n[{i}/{len(targets)}] {name}")

        desc = None
        # Try scraping if URL exists
        if url and len(url) > 5:
            content, method = scrape_full(url)
            if content and len(content) >= 100:
                print(f"  -> Scraped {len(content)} chars via {method}")
                type_hint = f" (product type: {type_name})" if type_name else ""
                prompt = f"""Write a concise product description for the crypto/fintech product "{name}"{type_hint}.

Use ONLY factual information from this scraped website content:
{content[:6000]}

STRICT RULES:
- Write exactly 2-4 sentences (50-150 words)
- Focus on: what the product does, key features, target audience
- Be factual, do NOT include pricing or marketing slogans
- Write in English, do NOT start with the product name
- Output ONLY the description text, nothing else"""
                resp = ai_call(prompt)
                desc = clean_ai_text(resp)
                if desc: stats['P2_via_scrape'] += 1

        # Fallback: AI knowledge
        if not desc:
            type_hint = f" (product type: {type_name})" if type_name else ""
            prompt = f"""Write a concise, factual product description for the crypto/fintech product "{name}"{type_hint}.
Website: {url or 'unknown'}

STRICT RULES:
- Write exactly 2-4 sentences (50-150 words)
- ONLY include well-known, verifiable facts about this product
- If you don't know this product, respond with exactly "UNKNOWN"
- Focus on: what the product does, key features, target audience
- Do NOT start with the product name
- Output ONLY the description text, nothing else"""
            resp = ai_call(prompt)
            desc = clean_ai_text(resp)
            if desc: stats['P2_via_knowledge'] += 1

        if desc:
            print(f"  -> {desc[:80]}...")
            if update_record('products', pid, {'description': desc}):
                p['description'] = desc
                stats['P2_saved'] += 1
            else: stats['P2_save_fail'] += 1
        else:
            print(f"  -> FAILED"); stats['P2_failed'] += 1
        time.sleep(0.5)


def phase_P3(products, limit=None):
    """P3: Generate missing short_descriptions from existing descriptions."""
    targets = [p for p in products 
               if (not p.get('short_description') or len(str(p.get('short_description',''))) < 10)
               and p.get('description') and len(str(p.get('description',''))) >= 15]
    if limit: targets = targets[:limit]
    if not targets:
        print("\n[P3] All products with descriptions have short_descriptions")
        return

    print(f"\n{'='*60}")
    print(f"[P3] GENERATE SHORT DESCRIPTIONS ({len(targets)} products)")
    print(f"{'='*60}")

    for i, p in enumerate(targets, 1):
        name, desc = p['name'], p['description']
        print(f"[{i}/{len(targets)}] {name}...", end=' ')

        prompt = f"""Summarize this product description in exactly ONE short sentence (10-20 words, under 140 characters):

Product: {name}
Description: {desc}

RULES:
- One sentence only, max 140 characters total
- Capture the core value proposition
- Do NOT start with the product name  
- Output ONLY the sentence, nothing else"""

        resp = ai_call(prompt, max_tokens=60, temperature=0.1)
        short = clean_ai_text(resp, min_len=10)
        if short:
            # Column is varchar(150) - hard limit
            if len(short) > 147: short = short[:147] + '...'
            if update_record('products', p['id'], {'short_description': short}):
                print(f"OK ({len(short)} chars)")
                stats['P3_saved'] += 1
            else: print("save fail"); stats['P3_save_fail'] += 1
        else:
            print("fail"); stats['P3_failed'] += 1
        time.sleep(0.3)


def phase_P4(products, limit=None):
    """P4: Find missing logo_url via AI knowledge."""
    targets = [p for p in products if not p.get('logo_url')]
    if limit: targets = targets[:limit]
    if not targets:
        print("\n[P4] All products have logo URLs")
        return

    print(f"\n{'='*60}")
    print(f"[P4] FIND LOGO URLs ({len(targets)} products)")
    print(f"{'='*60}")

    for i, p in enumerate(targets, 1):
        name, url = p['name'], p.get('url', '')
        print(f"[{i}/{len(targets)}] {name}...", end=' ')

        # Strategy 1: Try favicon/logo from website
        if url and len(url) > 5:
            domain = urlparse(url).netloc
            # Common logo locations
            logo_candidates = [
                f"https://www.google.com/s2/favicons?domain={domain}&sz=128",
                f"https://logo.clearbit.com/{domain}",
            ]
            for logo_url in logo_candidates:
                try:
                    r = requests.head(logo_url, timeout=5, allow_redirects=True)
                    if r.status_code == 200:
                        if update_record('products', p['id'], {'logo_url': logo_url}):
                            print(f"OK ({logo_url[:50]})")
                            stats['P4_found'] += 1
                        break
                except: continue
            else:
                print("no logo found"); stats['P4_not_found'] += 1
        else:
            print("no URL"); stats['P4_no_url'] += 1
        time.sleep(0.2)


# ═══════════════════════════════════════════════════════════════════
# NORM PHASES  
# ═══════════════════════════════════════════════════════════════════

def phase_N1(norms, limit=None):
    """N1: Find missing official_links for norms."""
    targets = [n for n in norms if not n.get('official_link') or len(str(n.get('official_link','')).strip()) < 5]
    if limit: targets = targets[:limit]
    if not targets:
        print("\n[N1] All norms have official links")
        return

    print(f"\n{'='*60}")
    print(f"[N1] FIND MISSING NORM LINKS ({len(targets)} norms)")
    print(f"{'='*60}")

    for i, n in enumerate(targets, 1):
        code, title, pillar = n['code'], n.get('title', ''), n.get('pillar', '')
        desc = n.get('description', '') or ''
        print(f"\n[{i}/{len(targets)}] {code}: {title}")

        prompt = f"""Find the official documentation URL for this security/compliance norm:

Code: {code}
Title: {title}
Pillar: {pillar}
Description: {desc}

RULES:
- Return ONLY the URL, nothing else
- Must be an official standard body or documentation source
- For hardware security norms (Active Shield, Triple SE, etc), link to relevant Common Criteria, GlobalPlatform, or FIPS documentation
- If you cannot find an exact match, return the closest relevant standard URL
- If truly unknown, respond with "UNKNOWN"
"""
        resp = ai_call(prompt, max_tokens=150, temperature=0.0)
        if not resp: stats['N1_ai_fail'] += 1; continue

        url = resp.strip().strip('"').strip("'")
        url_match = re.search(r'https?://[^\s<>"\']+', url)
        if url_match: url = url_match.group(0).rstrip('/.,;:)')
        if not url.startswith('http') or 'UNKNOWN' in url.upper():
            print(f"  -> Unknown"); stats['N1_unknown'] += 1; continue

        print(f"  -> {url}")
        if update_record('norms', n['id'], {'official_link': url}):
            n['official_link'] = url
            stats['N1_found'] += 1
        else: stats['N1_save_fail'] += 1
        time.sleep(1)


def phase_N2(norms, limit=None):
    """N2: Generate missing norm descriptions."""
    targets = [n for n in norms if not n.get('description') or len(str(n.get('description',''))) < 5]
    if limit: targets = targets[:limit]
    if not targets:
        print("\n[N2] All norms have descriptions")
        return

    print(f"\n{'='*60}")
    print(f"[N2] GENERATE NORM DESCRIPTIONS ({len(targets)} norms)")
    print(f"{'='*60}")

    for i, n in enumerate(targets, 1):
        code, title, pillar = n['code'], n.get('title', ''), n.get('pillar', '')
        print(f"[{i}/{len(targets)}] {code}: {title}...", end=' ')

        prompt = f"""Write a concise description (1-2 sentences, 10-40 words) for this crypto/security norm:

Code: {code}
Title: {title}
Pillar: {pillar} (S=Security, A=Accessibility, F=Fiability, E=Ecosystem)

RULES:
- Describe what this norm checks/evaluates
- Be technical and precise
- Output ONLY the description, nothing else"""

        resp = ai_call(prompt, max_tokens=100, temperature=0.2)
        desc = clean_ai_text(resp, min_len=8)
        if desc:
            if update_record('norms', n['id'], {'description': desc}):
                print(f"OK"); stats['N2_saved'] += 1
            else: print("save fail"); stats['N2_save_fail'] += 1
        else:
            print("fail"); stats['N2_failed'] += 1
        time.sleep(0.5)


def phase_N3(norms, limit=None):
    """N3: Fill official_content by scraping official_link."""
    targets = [n for n in norms 
               if (not n.get('official_content') or len(str(n.get('official_content',''))) < 10)
               and n.get('official_link') and len(str(n.get('official_link',''))) >= 5]
    if limit: targets = targets[:limit]
    if not targets:
        print("\n[N3] All norms with links have official_content")
        return

    print(f"\n{'='*60}")
    print(f"[N3] SCRAPE OFFICIAL CONTENT ({len(targets)} norms)")
    print(f"{'='*60}")

    for i, n in enumerate(targets, 1):
        code = n['code']
        link = n['official_link']
        print(f"\n[{i}/{len(targets)}] {code}: {link[:60]}...")

        content = scrape_http(link, max_chars=15000)
        if not content or len(content) < 50:
            content = scrape_playwright(link, max_chars=15000)
        
        if content and len(content) >= 50:
            # Strip null bytes that cause PostgreSQL 22P05 errors
            content = content.replace('\x00', '').replace('\u0000', '')
            print(f"  -> Scraped {len(content)} chars")
            if update_record('norms', n['id'], {'official_content': content}):
                stats['N3_saved'] += 1
            else: stats['N3_save_fail'] += 1
        else:
            clen = len(content) if content else 0
            print(f"  -> Too short ({clen} chars)")
            stats['N3_scrape_fail'] += 1
        time.sleep(1)


def phase_N4(norms, limit=None):
    """N4: Fill missing chapter field based on norm code and pillar."""
    targets = [n for n in norms if not n.get('chapter')]
    if limit: targets = targets[:limit]
    if not targets:
        print("\n[N4] All norms have chapter assigned")
        return

    # First gather existing chapter mappings to understand the pattern
    existing_chapters = {}
    for n in norms:
        if n.get('chapter'):
            prefix = re.match(r'^([A-Z]+)', n['code'])
            if prefix:
                key = (prefix.group(1), n.get('pillar', ''))
                if key not in existing_chapters:
                    existing_chapters[key] = n['chapter']

    print(f"\n{'='*60}")
    print(f"[N4] ASSIGN CHAPTERS ({len(targets)} norms)")
    # Convert tuple keys to strings for JSON display
    display_chapters = {f"{k[0]}/{k[1]}": v for k, v in existing_chapters.items()}
    print(f"Existing chapter patterns: {json.dumps(display_chapters, indent=2, ensure_ascii=False)}")
    print(f"{'='*60}")

    # Try to assign based on existing patterns first
    assigned_auto = 0
    remaining = []
    for n in targets:
        prefix = re.match(r'^([A-Z]+)', n['code'])
        if prefix:
            key = (prefix.group(1), n.get('pillar', ''))
            if key in existing_chapters:
                chapter = existing_chapters[key]
                if update_record('norms', n['id'], {'chapter': chapter}):
                    assigned_auto += 1
                    stats['N4_auto'] += 1
                continue
        remaining.append(n)

    print(f"  Auto-assigned from patterns: {assigned_auto}")
    print(f"  Remaining (need AI): {len(remaining)}")

    # Use AI for remaining
    for i, n in enumerate(remaining, 1):
        code, title, pillar = n['code'], n.get('title', ''), n.get('pillar', '')
        desc = n.get('description', '') or ''
        print(f"[{i}/{len(remaining)}] {code}: {title}...", end=' ')

        pillar_names = {'S': 'Security', 'A': 'Accessibility', 'F': 'Reliability', 'E': 'Ecosystem'}
        existing_list = [f"  {k[0]}/{k[1]}: {v}" for k, v in existing_chapters.items()]

        prompt = f"""Assign a chapter name (in English) for this norm based on its category:

Code: {code}
Title: {title}  
Pillar: {pillar} ({pillar_names.get(pillar, '?')})
Description: {desc}

Existing chapters in this system:
{chr(10).join(existing_list)}

RULES:
- Use an existing chapter name if this norm fits
- If no existing chapter fits, create a short English chapter name (2-4 words)
- Output ONLY the chapter name, nothing else"""

        resp = ai_call(prompt, max_tokens=50, temperature=0.1)
        if resp:
            chapter = resp.strip().strip('"').strip("'")
            if len(chapter) >= 3 and len(chapter) <= 100:
                if update_record('norms', n['id'], {'chapter': chapter}):
                    print(f"-> {chapter}"); stats['N4_ai'] += 1
                    # Remember for future norms
                    prefix = re.match(r'^([A-Z]+)', code)
                    if prefix:
                        existing_chapters[(prefix.group(1), pillar)] = chapter
                else: print("save fail"); stats['N4_save_fail'] += 1
            else: print("bad resp"); stats['N4_failed'] += 1
        else: print("ai fail"); stats['N4_failed'] += 1
        time.sleep(0.3)


# ═══════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════

ALL_PHASES = ['P1', 'P2', 'P3', 'P4', 'N1', 'N2', 'N3', 'N4']

def main():
    import argparse
    parser = argparse.ArgumentParser(description='Master data enrichment - Products & Norms')
    parser.add_argument('--phase', type=str, help=f'Run specific phase: {", ".join(ALL_PHASES)}')
    parser.add_argument('--limit', type=int, help='Limit records per phase')
    args = parser.parse_args()

    phases = [p.strip().upper() for p in args.phase.split(',')] if args.phase else ALL_PHASES

    # Load data
    print("Loading data...")
    products = fetch_all('products',
        'id,name,slug,url,description,short_description,type_id,coingecko_id,defillama_slug,logo_url',
        'deleted_at=is.null&order=name')
    types_raw = fetch_all('product_types', 'id,name,code')
    types_by_id = {t['id']: t for t in types_raw}
    norms = fetch_all('norms',
        'id,code,pillar,title,description,full,official_link,official_doc_summary,official_content,chapter,target_type,consumer,norm_status,hallucination_checked')

    total_p = len(products)
    total_n = len(norms)

    # Quick gap report
    no_url = sum(1 for p in products if not p.get('url') or len(str(p.get('url','')).strip()) < 5)
    no_desc = sum(1 for p in products if not p.get('description') or len(str(p.get('description',''))) < 15)
    no_short = sum(1 for p in products if (not p.get('short_description') or len(str(p.get('short_description',''))) < 10) and p.get('description') and len(str(p.get('description',''))) >= 15)
    no_logo = sum(1 for p in products if not p.get('logo_url'))
    no_nlink = sum(1 for n in norms if not n.get('official_link') or len(str(n.get('official_link','')).strip()) < 5)
    no_ndesc = sum(1 for n in norms if not n.get('description') or len(str(n.get('description',''))) < 5)
    no_ncont = sum(1 for n in norms if (not n.get('official_content') or len(str(n.get('official_content',''))) < 10) and n.get('official_link') and len(str(n.get('official_link',''))) >= 5)
    no_nchap = sum(1 for n in norms if not n.get('chapter'))

    print(f"\n{'='*60}")
    print(f"DATA GAPS - {total_p} products, {total_n} norms")
    print(f"{'='*60}")
    print(f"  [P1] Product URLs missing:         {no_url}")
    print(f"  [P2] Product descriptions missing:  {no_desc}")
    print(f"  [P3] Product short_desc missing:    {no_short}")
    print(f"  [P4] Product logos missing:          {no_logo}")
    print(f"  [N1] Norm official_links missing:    {no_nlink}")
    print(f"  [N2] Norm descriptions missing:      {no_ndesc}")
    print(f"  [N3] Norm official_content missing:  {no_ncont}")
    print(f"  [N4] Norm chapters missing:          {no_nchap}")
    print(f"\nPhases to run: {', '.join(phases)}")
    if args.limit: print(f"Limit: {args.limit} per phase")

    # Execute phases
    for phase in phases:
        try:
            if phase == 'P1': phase_P1(products, types_by_id, args.limit)
            elif phase == 'P2': phase_P2(products, types_by_id, args.limit)
            elif phase == 'P3': phase_P3(products, args.limit)
            elif phase == 'P4': phase_P4(products, args.limit)
            elif phase == 'N1': phase_N1(norms, args.limit)
            elif phase == 'N2': phase_N2(norms, args.limit)
            elif phase == 'N3': phase_N3(norms, args.limit)
            elif phase == 'N4': phase_N4(norms, args.limit)
            else: print(f"Unknown phase: {phase}")
        except Exception as e:
            print(f"\nERROR in phase {phase}: {e}")
            traceback.print_exc()

        # Reload products after P1 (URLs needed for P2)
        if phase == 'P1' and ('P2' in phases or 'P4' in phases):
            print("\nReloading products after URL enrichment...")
            products = fetch_all('products',
                'id,name,slug,url,description,short_description,type_id,coingecko_id,defillama_slug,logo_url',
                'deleted_at=is.null&order=name')
        # Reload after P2 (descriptions needed for P3)
        if phase == 'P2' and 'P3' in phases:
            print("\nReloading products after description enrichment...")
            products = fetch_all('products',
                'id,name,slug,url,description,short_description,type_id,coingecko_id,defillama_slug,logo_url',
                'deleted_at=is.null&order=name')

    # Final report
    print(f"\n{'='*60}")
    print(f"ENRICHMENT COMPLETE")
    print(f"{'='*60}")
    for k, v in sorted(stats.items()):
        print(f"  {k}: {v}")
    print(f"\nTotal operations: {sum(stats.values())}")

if __name__ == '__main__':
    main()
