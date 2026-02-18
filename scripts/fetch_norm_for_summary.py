#!/usr/bin/env python3
"""Fetch norm data and official content for manual summary generation."""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.core.config import SUPABASE_URL, SUPABASE_HEADERS
import requests
from bs4 import BeautifulSoup
import json
import argparse

def get_norms_without_summary(limit=10):
    """Get norms that need summaries."""
    url = f"{SUPABASE_URL}/rest/v1/norms"
    params = {
        "select": "id,code,title,description,pillar,target_type,official_link,reference_content",
        "order": "code",
        "limit": limit
    }
    
    resp = requests.get(url, headers=SUPABASE_HEADERS, params=params)
    if resp.status_code != 200:
        print(f"Error: {resp.status_code}")
        return []
    
    norms = resp.json()
    # Filter those without good summary
    return [n for n in norms if not n.get('reference_content') or len(n.get('reference_content', '')) < 500]

def scrape_url(url):
    """Scrape content from URL."""
    try:
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        resp = requests.get(url, headers=headers, timeout=20)
        if resp.status_code != 200:
            return None
        
        soup = BeautifulSoup(resp.text, 'html.parser')
        
        # Remove noise
        for tag in soup(['script', 'style', 'nav', 'footer', 'header', 'aside']):
            tag.decompose()
        
        # Find main content
        main = (soup.find('main') or soup.find('article') or 
                soup.find('div', {'id': 'mw-content-text'}) or
                soup.find('div', {'class': 'mw-parser-output'}) or
                soup.find('div', {'class': 'content'}))
        
        text = (main or soup).get_text(separator='\n', strip=True)
        
        # Clean up
        lines = [l.strip() for l in text.split('\n') if l.strip()]
        return '\n'.join(lines)[:15000]
        
    except Exception as e:
        print(f"Error scraping {url}: {e}")
        return None

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--code", type=str, help="Specific norm code to fetch")
    parser.add_argument("--limit", type=int, default=5)
    args = parser.parse_args()
    
    if args.code:
        # Fetch specific norm
        url = f"{SUPABASE_URL}/rest/v1/norms"
        params = {"select": "*", "code": f"eq.{args.code}"}
        resp = requests.get(url, headers=SUPABASE_HEADERS, params=params)
        norms = resp.json() if resp.status_code == 200 else []
    else:
        norms = get_norms_without_summary(args.limit)
    
    for norm in norms:
        print("=" * 80)
        print(f"CODE: {norm['code']}")
        print(f"TITLE: {norm['title']}")
        print(f"DESCRIPTION: {norm.get('description', '')}")
        print(f"PILLAR: {norm.get('pillar', '')}")
        print(f"TARGET: {norm.get('target_type', '')}")
        print(f"OFFICIAL_LINK: {norm.get('official_link', '')}")
        print("-" * 80)
        
        # Scrape if needed
        official_link = norm.get('official_link', '')
        if official_link:
            print(f"Scraping {official_link}...")
            content = scrape_url(official_link)
            if content:
                print(f"\nOFFICIAL CONTENT ({len(content)} chars):")
                print("-" * 40)
                print(content[:8000])
                print("-" * 40)
            else:
                print("Could not scrape content")
        
        print("=" * 80)
        print()

if __name__ == "__main__":
    main()
