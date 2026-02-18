#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SAFESCORING.IO - Hallucination Verification for Norm Summaries
Verifies AI-generated summaries against ORIGINAL source documents to detect hallucinations.

USAGE:
    python -m scripts.verify_hallucinations [--limit N] [--pillar S|A|F|E]

PROCESS:
1. Load norms with summaries but not yet hallucination-checked
2. Scrape the ORIGINAL document from official_link (not cached summaries)
3. Compare AI summary against freshly scraped source
4. Score hallucination level (0=none, 1=severe)
5. Update database with results
"""

import requests
import time
import sys
import os
import argparse
from datetime import datetime
from urllib.parse import urlparse
from html.parser import HTMLParser

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.core.config import SUPABASE_URL, get_supabase_headers
from src.core.api_provider import AIProvider


class TextExtractor(HTMLParser):
    """Simple HTML to text extractor."""
    def __init__(self):
        super().__init__()
        self.text = []
        self.skip = False

    def handle_starttag(self, tag, attrs):
        if tag in ['script', 'style', 'nav', 'footer', 'noscript', 'iframe', 'header']:
            self.skip = True

    def handle_endtag(self, tag):
        if tag in ['script', 'style', 'nav', 'footer', 'noscript', 'iframe', 'header']:
            self.skip = False

    def handle_data(self, data):
        if not self.skip:
            text = data.strip()
            if text:
                self.text.append(text)

    def get_text(self):
        return ' '.join(self.text)


class HallucinationVerifier:
    """
    Verifies norm summaries for hallucinations by scraping and comparing against
    ORIGINAL source documents (not cached database fields).
    """

    def __init__(self):
        self.headers = get_supabase_headers()
        self.ai_provider = AIProvider()
        self.request_headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
        self.stats = {
            'checked': 0,
            'no_hallucination': 0,
            'minor_issues': 0,
            'major_issues': 0,
            'no_source': 0,
            'errors': 0
        }

    def load_unchecked_norms(self, limit=None, pillar=None):
        """Load norms that need hallucination verification (with official_link)."""
        url = f"{SUPABASE_URL}/rest/v1/norms"
        url += "?select=id,code,pillar,title,description,summary,official_link"
        url += "&summary=not.is.null"
        url += "&official_link=not.is.null"  # Must have source link
        url += "&or=(hallucination_checked.is.null,hallucination_checked.eq.false)"
        
        if pillar:
            url += f"&pillar=eq.{pillar}"
        
        url += "&order=code.asc"
        
        if limit:
            url += f"&limit={limit}"

        r = requests.get(url, headers=self.headers)
        if r.status_code == 200:
            return r.json()
        print(f"Error loading norms: {r.status_code}")
        return []

    def scrape_source(self, url):
        """Scrape the original source document from official_link."""
        if not url:
            return None
            
        try:
            parsed = urlparse(url)
            domain = parsed.netloc.lower()
            
            # GitHub - get raw content
            if 'github.com' in domain:
                return self._scrape_github(url)
            
            # PDF links - can't scrape directly
            if url.lower().endswith('.pdf'):
                return None
                
            # Generic HTML scraping
            r = requests.get(url, timeout=15, headers=self.request_headers)
            if r.status_code == 200:
                parser = TextExtractor()
                parser.feed(r.text)
                text = parser.get_text()
                return text[:12000] if text else None
                
        except Exception as e:
            print(f"      Scrape error: {e}")
        return None

    def _scrape_github(self, url):
        """Scrape GitHub repository or file."""
        try:
            parsed = urlparse(url)
            path_parts = parsed.path.strip('/').split('/')
            
            if len(path_parts) >= 2:
                owner, repo = path_parts[0], path_parts[1]
                
                # Direct file (markdown, etc.)
                if 'blob' in path_parts:
                    raw_url = url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/')
                    r = requests.get(raw_url, timeout=15, headers=self.request_headers)
                    if r.status_code == 200:
                        return r.text[:12000]
                
                # Try README
                readme_url = f"https://api.github.com/repos/{owner}/{repo}/readme"
                r = requests.get(readme_url, timeout=15, headers={'Accept': 'application/vnd.github.v3.raw'})
                if r.status_code == 200:
                    return r.text[:12000]
                    
        except Exception as e:
            print(f"      GitHub error: {e}")
        return None

    def verify_summary(self, norm):
        """
        Verify a norm's summary against FRESHLY SCRAPED source content.
        Returns (score, issues) where score is 0-1 (0=no hallucination, 1=severe)
        """
        summary = norm.get('summary', '')
        if not summary:
            return None, "No summary to verify"

        # Scrape the ORIGINAL source document (not cached DB fields)
        official_link = norm.get('official_link')
        reference = self.scrape_source(official_link)
        
        if not reference or len(reference) < 100:
            # Can't verify without source - mark as skipped
            return None, f"Could not scrape source: {official_link}"

        prompt = f"""You are a fact-checker verifying an AI-generated summary against official documentation.

NORM: {norm['code']} - {norm.get('title', 'N/A')}

OFFICIAL SOURCE (scraped from {official_link}):
{reference}

AI-GENERATED SUMMARY TO VERIFY:
{summary}

TASK: Check if the summary contains hallucinations (fabricated facts not in the reference).

SCORING:
- 0.0 = Perfect - Summary accurately reflects the reference
- 0.1-0.3 = Minor issues - Small inaccuracies or slight exaggerations
- 0.4-0.6 = Moderate issues - Some fabricated details or misrepresentations
- 0.7-0.9 = Major issues - Significant hallucinations or wrong information
- 1.0 = Severe - Completely fabricated or contradicts the reference

RESPOND IN THIS EXACT FORMAT:
SCORE: [0.0-1.0]
ISSUES: [List specific hallucinations found, or "None" if accurate]
VERDICT: [PASS/MINOR/MAJOR/FAIL]

Be strict but fair. Minor wording differences are OK. Focus on factual accuracy."""

        try:
            response = self.ai_provider.call(prompt, max_tokens=800, temperature=0.1)
            if not response:
                return None, "AI verification failed"

            # Parse response
            score = 0.0
            issues = "Parse error"
            
            for line in response.split('\n'):
                line = line.strip()
                if line.startswith('SCORE:'):
                    try:
                        score_str = line.replace('SCORE:', '').strip()
                        score = float(score_str)
                        score = max(0.0, min(1.0, score))  # Clamp to 0-1
                    except:
                        pass
                elif line.startswith('ISSUES:'):
                    issues = line.replace('ISSUES:', '').strip()

            return score, issues

        except Exception as e:
            return None, f"Error: {str(e)}"

    def update_norm(self, norm_id, score, issues):
        """Update norm with hallucination check results."""
        url = f"{SUPABASE_URL}/rest/v1/norms?id=eq.{norm_id}"
        
        data = {
            'hallucination_checked': True,
            'hallucination_score': score,
            'hallucination_issues': issues[:1000] if issues else None,
            'hallucination_checked_at': datetime.utcnow().isoformat()
        }

        r = requests.patch(url, json=data, headers=self.headers)
        return r.status_code in [200, 204]

    def run(self, limit=None, pillar=None):
        """Run hallucination verification on unchecked norms."""
        print("\n" + "="*60)
        print("SAFESCORING - Hallucination Verification")
        print("="*60)

        norms = self.load_unchecked_norms(limit=limit, pillar=pillar)
        total = len(norms)
        
        if total == 0:
            print("\n✅ All norms have been hallucination-checked!")
            return

        print(f"\n📋 Found {total} norms to verify")
        if pillar:
            print(f"   Filtering by pillar: {pillar}")
        print()

        for i, norm in enumerate(norms, 1):
            code = norm['code']
            title = norm.get('title', 'N/A')[:50]
            
            print(f"[{i}/{total}] {code} - {title}...")
            
            score, issues = self.verify_summary(norm)
            
            if score is None:
                print(f"   ❌ Error: {issues}")
                self.stats['errors'] += 1
                continue

            # Update database
            if self.update_norm(norm['id'], score, issues):
                self.stats['checked'] += 1
                
                if score <= 0.1:
                    print(f"   ✅ PASS (score: {score:.2f})")
                    self.stats['no_hallucination'] += 1
                elif score <= 0.4:
                    print(f"   ⚠️  MINOR (score: {score:.2f}) - {issues[:80]}")
                    self.stats['minor_issues'] += 1
                else:
                    print(f"   🚨 MAJOR (score: {score:.2f}) - {issues[:80]}")
                    self.stats['major_issues'] += 1
            else:
                print(f"   ❌ Failed to update database")
                self.stats['errors'] += 1

            # Rate limiting
            time.sleep(0.5)

        # Final stats
        print("\n" + "="*60)
        print("VERIFICATION COMPLETE")
        print("="*60)
        print(f"✅ Checked:        {self.stats['checked']}")
        print(f"🟢 No issues:      {self.stats['no_hallucination']}")
        print(f"🟡 Minor issues:   {self.stats['minor_issues']}")
        print(f"🔴 Major issues:   {self.stats['major_issues']}")
        print(f"❌ Errors:         {self.stats['errors']}")
        
        if self.stats['checked'] > 0:
            accuracy = (self.stats['no_hallucination'] / self.stats['checked']) * 100
            print(f"\n📊 Accuracy rate: {accuracy:.1f}%")


def main():
    parser = argparse.ArgumentParser(description='Verify norm summaries for hallucinations')
    parser.add_argument('--limit', type=int, help='Max norms to verify')
    parser.add_argument('--pillar', choices=['S', 'A', 'F', 'E'], help='Filter by pillar')
    args = parser.parse_args()

    verifier = HallucinationVerifier()
    verifier.run(limit=args.limit, pillar=args.pillar)


if __name__ == '__main__':
    main()
