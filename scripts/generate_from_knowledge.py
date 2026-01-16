#!/usr/bin/env python3
"""
Generate norm summaries from AI knowledge for norms without documents.
Uses verified knowledge to create 10-chapter summaries.
"""
import os
import sys
import re
import time
import requests

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.core.config import SUPABASE_URL, get_supabase_headers
from src.core.api_provider import AIProvider

NORM_DOCS_DIR = "norm_docs"
NORM_PDFS_DIR = "norm_pdfs"


def get_norms_without_docs():
    """Fetch norms that don't have local documents."""
    headers = get_supabase_headers()
    all_norms = []

    for offset in range(0, 2000, 500):
        url = f'{SUPABASE_URL}/rest/v1/norms?select=id,code,title,official_link&limit=500&offset={offset}'
        try:
            r = requests.get(url, headers=headers, timeout=30)
            if r.status_code != 200:
                continue
            batch = r.json()
            if not batch:
                break
            all_norms.extend(batch)
        except Exception as e:
            print(f"Error: {e}")

    # Filter to those WITHOUT local documents
    without_docs = []
    for n in all_norms:
        code = n['code']
        has_html = os.path.exists(f'{NORM_DOCS_DIR}/{code}.html')
        has_pdf = os.path.exists(f'{NORM_PDFS_DIR}/{code}.pdf')
        if not has_html and not has_pdf:
            without_docs.append(n)

    return without_docs


def generate_summary_from_knowledge(api, code, title):
    """Generate summary using AI knowledge (no document)."""

    prompt = f"""You are an expert in cybersecurity, cryptocurrency, and compliance standards.

Generate a comprehensive 10-chapter summary for the standard/feature: "{code}: {title}"

IMPORTANT RULES:
1. Use ONLY verified, factual information that you are confident is accurate
2. If you don't know specific details, say "Specific details not available" in that section
3. Do NOT invent fake numbers, dates, or technical specifications
4. Use "typically", "generally", "commonly" for uncertain claims
5. Focus on what this standard/feature IS and WHY it matters for crypto security

Use EXACTLY this markdown format:

## 1. Executive Summary
Brief overview of what this standard/feature covers and why it matters (2-3 sentences).

## 2. Purpose & Scope
What this standard defines, its objectives, and where it applies.

## 3. Key Requirements
Main technical requirements or specifications (if known).

## 4. Technical Specifications
Specific technical details, algorithms, or protocols (if applicable).

## 5. Security Controls
Security measures and protection mechanisms this provides.

## 6. Crypto/Blockchain Application
How this specifically applies to cryptocurrency, blockchain, DeFi, or digital assets.

## 7. Compliance Criteria
What organizations need to implement (if applicable).

## 8. Implementation Guidelines
Practical steps for implementation (if applicable).

## 9. Risk Considerations
What risks this addresses or mitigates.

## 10. Related Standards & References
Connected standards or official sources (only verified ones).

Write approximately 80-120 words per chapter. Be factual and honest about uncertainty."""

    try:
        time.sleep(2)
        response = api._call_mistral(prompt=prompt, max_tokens=4000)
        if not response:
            time.sleep(5)
            response = api._call_cerebras_rotation(prompt=prompt, max_tokens=4000)
        if response:
            # Remove any <think> tags
            response = re.sub(r'<think>.*?</think>', '', response, flags=re.DOTALL).strip()
            return response
    except Exception as e:
        print(f"    AI Error: {e}")

    return None


def update_norm_summary(norm_id, summary):
    """Update norm summary in database."""
    headers = get_supabase_headers('return=minimal')
    url = f'{SUPABASE_URL}/rest/v1/norms?id=eq.{norm_id}'

    # Add knowledge-based header
    full_summary = f"""📚 **AI KNOWLEDGE SUMMARY - 10 CHAPTERS**
Generated from verified AI knowledge (no official document available).

---

{summary}"""

    r = requests.patch(url, headers=headers, json={
        'official_doc_summary': full_summary,
        'summary_verified': False  # Mark as not document-verified
    })
    return r.status_code in [200, 204]


def main():
    print("=" * 70)
    print("GENERATING SUMMARIES FROM AI KNOWLEDGE")
    print("(For norms without local documents)")
    print("=" * 70)

    # Initialize API
    api = AIProvider()

    # Get norms without docs
    print("\nFetching norms without documents...")
    norms = get_norms_without_docs()
    print(f"Found {len(norms)} norms without local documents")

    if not norms:
        print("Nothing to process!")
        return

    # Process each norm
    success = 0
    failed = 0

    for i, norm in enumerate(norms):
        code = norm['code']
        title = norm['title']

        print(f"\n[{i+1}/{len(norms)}] {code}: {title[:40]}...")

        # Generate summary
        summary = generate_summary_from_knowledge(api, code, title)

        if not summary:
            print(f"    ✗ Failed to generate")
            failed += 1
            continue

        # Count chapters
        chapters = len(re.findall(r'^## \d+\.', summary, re.MULTILINE))
        print(f"    Generated {len(summary)} chars, {chapters} chapters")

        # Update database
        if update_norm_summary(norm['id'], summary):
            print(f"    ✓ Updated in database")
            success += 1
        else:
            print(f"    ✗ Failed to update database")
            failed += 1

        # Progress update
        if (i + 1) % 50 == 0:
            print(f"\n--- Progress: {success} success, {failed} failed ---\n")

        time.sleep(3)  # Rate limiting

    print("\n" + "=" * 70)
    print("RESULTS")
    print("=" * 70)
    print(f"Successfully generated: {success}")
    print(f"Failed: {failed}")


if __name__ == '__main__':
    main()
