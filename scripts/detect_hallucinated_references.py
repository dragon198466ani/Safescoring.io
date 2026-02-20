#!/usr/bin/env python3
"""
Detect hallucinated references in norm summaries.
Finds summaries that cite ISO/IEC standards with URLs that don't match the official_link.
"""
import os
import re
import requests
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')


def log(msg):
    # Handle Unicode for Windows console
    try:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")
    except UnicodeEncodeError:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg.encode('ascii', 'replace').decode()}")


def get_headers():
    return {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json'
    }


def get_all_norms_with_summaries():
    """Fetch all norms with summaries."""
    url = f"{SUPABASE_URL}/rest/v1/norms?official_doc_summary=not.is.null&select=id,code,title,official_link,official_doc_summary"
    r = requests.get(url, headers=get_headers(), timeout=60)
    if r.status_code == 200:
        return r.json()
    log(f"Error fetching norms: {r.status_code}")
    return []


def extract_references_from_summary(summary):
    """Extract all URLs and standard references from a summary."""
    if not summary:
        return []

    references = []

    # Find markdown links: [text](url)
    md_links = re.findall(r'\[([^\]]+)\]\(([^)]+)\)', summary)
    for text, url in md_links:
        references.append({'text': text, 'url': url, 'type': 'markdown_link'})

    # Find ISO/IEC references: ISO/IEC XXXXX or ISO XXXXX
    iso_refs = re.findall(r'(ISO(?:/IEC)?\s*[\d\-:]+)', summary, re.IGNORECASE)
    for ref in iso_refs:
        references.append({'text': ref, 'url': None, 'type': 'iso_reference'})

    # Find standalone URLs
    urls = re.findall(r'https?://[^\s\)]+', summary)
    for url in urls:
        if not any(r['url'] == url for r in references):
            references.append({'text': None, 'url': url, 'type': 'standalone_url'})

    return references


def check_url_mismatch(official_link, summary_refs):
    """Check if summary references URLs that don't match the official_link."""
    mismatches = []

    if not official_link:
        return mismatches

    # Extract the ISO standard number from official_link if it's an ISO URL
    official_std_num = None
    if 'iso.org/standard/' in official_link:
        match = re.search(r'/standard/(\d+)', official_link)
        if match:
            official_std_num = match.group(1)

    for ref in summary_refs:
        url = ref.get('url')
        if not url:
            continue

        # Check for ISO URL mismatches
        if 'iso.org/standard/' in url:
            match = re.search(r'/standard/(\d+)', url)
            if match:
                ref_std_num = match.group(1)
                if official_std_num and ref_std_num != official_std_num:
                    mismatches.append({
                        'type': 'iso_url_mismatch',
                        'official': official_link,
                        'referenced': url,
                        'text': ref.get('text', '')
                    })
                elif not official_std_num and 'iso.org' not in (official_link or ''):
                    # Summary references ISO but official_link is not ISO
                    mismatches.append({
                        'type': 'unexpected_iso_reference',
                        'official': official_link,
                        'referenced': url,
                        'text': ref.get('text', '')
                    })

    return mismatches


def detect_hallucination_patterns(summary):
    """Detect common hallucination patterns in summaries."""
    patterns = []

    if not summary:
        return patterns

    # ISO/IEC standards that likely don't exist or are misattributed
    suspicious_iso = re.findall(r'ISO/IEC\s*23800[\-:\d]*', summary, re.IGNORECASE)
    if suspicious_iso:
        patterns.append({'type': 'suspicious_iso', 'matches': suspicious_iso})

    # Generic placeholder-like phrases
    placeholder_phrases = [
        r'\[.*?if known.*?\]',
        r'\[.*?official.*?documentation.*?\]',
        r'\[.*?insert.*?\]',
        r'\[.*?TBD.*?\]',
    ]
    for phrase in placeholder_phrases:
        matches = re.findall(phrase, summary, re.IGNORECASE)
        if matches:
            patterns.append({'type': 'placeholder', 'matches': matches})

    # Vague AI-generated phrases
    vague_phrases = [
        'according to industry standards',
        'it is well known that',
        'typically used in',
        'generally accepted',
        'commonly implemented',
        'most implementations use',
    ]
    for phrase in vague_phrases:
        if phrase.lower() in summary.lower():
            patterns.append({'type': 'vague_ai_phrase', 'match': phrase})

    return patterns


def flag_norm_as_hallucinated(norm_id, issues):
    """Add warning header to summary and update status."""
    # Get current summary
    url = f"{SUPABASE_URL}/rest/v1/norms?id=eq.{norm_id}&select=official_doc_summary"
    r = requests.get(url, headers=get_headers(), timeout=30)
    if r.status_code != 200 or not r.json():
        return False

    current_summary = r.json()[0].get('official_doc_summary', '')

    # Skip if already flagged
    if '**HALLUCINATION DETECTED**' in current_summary:
        return True

    # Build issues description
    issues_text = '\n'.join([f"- {issue}" for issue in issues[:3]])

    warning_header = f"""**[!] HALLUCINATION DETECTED** - This summary contains AI-generated references that could not be verified.

**Issues found:**
{issues_text}

**Action required:** Manual review and correction needed.

---

"""

    new_summary = warning_header + current_summary

    # Update
    update_url = f"{SUPABASE_URL}/rest/v1/norms?id=eq.{norm_id}"
    headers = get_headers()
    headers['Prefer'] = 'return=minimal'

    data = {
        'official_doc_summary': new_summary,
        'summary_status': 'needs_review'
    }

    r = requests.patch(update_url, headers=headers, json=data, timeout=30)
    return r.status_code in [200, 204]


def main():
    log("=" * 70)
    log("DETECT HALLUCINATED REFERENCES IN NORM SUMMARIES")
    log("=" * 70)

    if not all([SUPABASE_URL, SUPABASE_KEY]):
        log("ERROR: Missing SUPABASE_URL or SUPABASE_KEY")
        return

    norms = get_all_norms_with_summaries()
    log(f"Checking {len(norms)} norms with summaries...")

    hallucinated = []

    for norm in norms:
        norm_id = norm['id']
        code = norm.get('code', 'Unknown')
        title = norm.get('title', 'Unknown')
        official_link = norm.get('official_link')
        summary = norm.get('official_doc_summary', '')

        issues = []

        # Extract and check references
        refs = extract_references_from_summary(summary)
        mismatches = check_url_mismatch(official_link, refs)

        for m in mismatches:
            issues.append(f"URL mismatch: references {m['referenced']} but official_link is {m['official']}")

        # Check for hallucination patterns
        patterns = detect_hallucination_patterns(summary)
        for p in patterns:
            if p['type'] == 'suspicious_iso':
                issues.append(f"Suspicious ISO reference: {p['matches']}")
            elif p['type'] == 'placeholder':
                issues.append(f"Contains placeholder text: {p['matches']}")
            elif p['type'] == 'vague_ai_phrase':
                issues.append(f"Vague AI-generated phrase: '{p['match']}'")

        if issues:
            hallucinated.append({
                'id': norm_id,
                'code': code,
                'title': title,
                'official_link': official_link,
                'issues': issues
            })

    log(f"\nFound {len(hallucinated)} norms with potential hallucinations:")
    log("-" * 70)

    for h in hallucinated:
        log(f"\n[ID {h['id']}] {h['code']}: {h['title'][:50]}...")
        log(f"  Official link: {h['official_link']}")
        for issue in h['issues']:
            log(f"  [X] {issue}")

    # Ask before flagging
    if hallucinated:
        log("\n" + "=" * 70)
        response = input(f"Flag {len(hallucinated)} norms as needing review? (y/n): ")
        if response.lower() == 'y':
            flagged = 0
            for h in hallucinated:
                if flag_norm_as_hallucinated(h['id'], h['issues']):
                    flagged += 1
                    log(f"  Flagged: {h['code']}")
            log(f"\nFlagged {flagged}/{len(hallucinated)} norms")

    log("\nDone.")


if __name__ == '__main__':
    main()
