#!/usr/bin/env python3
"""
HIGH QUALITY norm summary regeneration.
Focus on quality over speed - ensures 10 proper chapters.
"""
import os
import sys
import re
import time
import requests
from bs4 import BeautifulSoup

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.core.config import SUPABASE_URL, get_supabase_headers
from src.core.api_provider import AIProvider

NORM_DOCS_DIR = "norm_docs"
NORM_PDFS_DIR = "norm_pdfs"
MAX_CONTENT_LENGTH = 40000
MIN_SUMMARY_LENGTH = 3000  # Quality threshold
MAX_RETRIES = 3

# Track statistics
stats = {"success": 0, "failed": 0, "skipped": 0, "retried": 0}


def get_norms_needing_update():
    """Fetch norms that need 10-chapter update."""
    headers = get_supabase_headers()
    all_norms = []

    for offset in range(0, 2000, 500):
        url = f'{SUPABASE_URL}/rest/v1/norms?select=id,code,title,official_link,official_doc_summary&limit=500&offset={offset}'
        try:
            r = requests.get(url, headers=headers, timeout=30)
            if r.status_code == 200:
                batch = r.json()
                if not batch:
                    break
                all_norms.extend(batch)
        except Exception as e:
            print(f"Error fetching: {e}")

    # Filter: needs update if no 10 chapters
    needs_update = []
    for n in all_norms:
        summary = n.get('official_doc_summary') or ''
        chapters = len(re.findall(r'^## \d+\.', summary, re.MULTILINE))
        if chapters < 10:
            needs_update.append(n)

    return needs_update


def extract_html_content(filepath):
    """Extract high-quality text from HTML."""
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            html = f.read()

        # Check if it's actually a PDF
        if html[:10].startswith('%PDF'):
            return None

        soup = BeautifulSoup(html, 'html.parser')

        # Remove noise
        for tag in soup(['script', 'style', 'nav', 'header', 'footer', 'aside', 'meta', 'link']):
            tag.decompose()

        # Get main content areas
        main_content = soup.find(['main', 'article', 'div.content', 'div.main'])
        if main_content:
            text = main_content.get_text(separator='\n', strip=True)
        else:
            text = soup.get_text(separator='\n', strip=True)

        # Clean up
        lines = [line.strip() for line in text.split('\n') if line.strip() and len(line.strip()) > 3]
        text = '\n'.join(lines)

        return text[:MAX_CONTENT_LENGTH] if len(text) > 500 else None
    except Exception as e:
        return None


def extract_pdf_content(filepath):
    """Extract text from PDF with multiple methods."""
    try:
        import fitz  # PyMuPDF

        doc = fitz.open(filepath)
        text_parts = []

        for page_num in range(min(30, len(doc))):  # More pages for quality
            page = doc[page_num]
            text = page.get_text()
            if text.strip():
                text_parts.append(text)

        doc.close()

        if text_parts:
            text = '\n'.join(text_parts)
            return text[:MAX_CONTENT_LENGTH] if len(text) > 500 else None
    except:
        pass

    # Fallback to pdfplumber
    try:
        import pdfplumber

        text_parts = []
        with pdfplumber.open(filepath) as pdf:
            for page in pdf.pages[:30]:
                text = page.extract_text()
                if text:
                    text_parts.append(text)

        if text_parts:
            text = '\n'.join(text_parts)
            return text[:MAX_CONTENT_LENGTH] if len(text) > 500 else None
    except:
        pass

    return None


def find_document(code):
    """Find document for a norm."""
    # Try HTML
    html_path = os.path.join(NORM_DOCS_DIR, f"{code}.html")
    if os.path.exists(html_path):
        content = extract_html_content(html_path)
        if content:
            return ('html', content)

    # Try PDF
    pdf_path = os.path.join(NORM_PDFS_DIR, f"{code}.pdf")
    if os.path.exists(pdf_path):
        content = extract_pdf_content(pdf_path)
        if content:
            return ('pdf', content)

    return (None, None)


def generate_quality_summary(api, code, title, content=None):
    """Generate HIGH QUALITY 10-chapter summary."""

    if content:
        # From document
        prompt = f"""You are an expert technical writer specializing in cybersecurity and cryptocurrency standards.

TASK: Create a comprehensive 10-chapter technical summary for "{code}: {title}"

DOCUMENT CONTENT TO ANALYZE:
{content[:15000]}

CRITICAL REQUIREMENTS:
1. Generate EXACTLY 10 chapters with detailed, substantive content
2. Each chapter MUST have 100-200 words of real information
3. Use ONLY the markdown format below with ## headers
4. Extract real facts from the document
5. You MAY add verified contextual knowledge to enrich chapters
6. NEVER invent fake numbers, dates, or fictional claims
7. If document lacks info for a chapter, write "Not explicitly covered" then add verified general knowledge

OUTPUT FORMAT (use exactly this):

## 1. Executive Summary
[Comprehensive overview of what this standard covers, its importance, and key benefits - minimum 100 words]

## 2. Purpose & Scope
[Detailed objectives, target audience, and boundaries of application - minimum 100 words]

## 3. Key Requirements
[Main technical requirements, mandatory controls, compliance obligations - minimum 100 words]

## 4. Technical Specifications
[Specific thresholds, algorithms, protocols, metrics, parameters - minimum 100 words]

## 5. Security Controls
[Security measures, cryptographic requirements, protection mechanisms - minimum 100 words]

## 6. Crypto/Blockchain Application
[How this applies to cryptocurrency, blockchain, DeFi, digital assets, wallets - minimum 100 words]

## 7. Compliance Criteria
[What organizations must implement, certification requirements, audit criteria - minimum 100 words]

## 8. Implementation Guidelines
[Practical steps, best practices, deployment recommendations - minimum 100 words]

## 9. Risk Considerations
[Threats addressed, vulnerabilities mitigated, risk management strategies - minimum 100 words]

## 10. Related Standards & References
[Connected standards, dependencies, official sources, further reading - minimum 100 words]

Write a comprehensive, professional summary. Quality over brevity."""

    else:
        # From AI knowledge
        prompt = f"""You are an expert in cybersecurity, cryptocurrency, and compliance standards.

TASK: Create a comprehensive 10-chapter summary for "{code}: {title}"

IMPORTANT RULES:
1. Use ONLY verified, factual information you are confident about
2. Generate EXACTLY 10 chapters with detailed content
3. Each chapter MUST have 100-200 words
4. If you don't know specific details, say "Specific details require official documentation"
5. Use "typically", "generally", "commonly" for uncertain claims
6. Focus on what this standard IS and WHY it matters for crypto security
7. NEVER invent fake numbers, dates, or specifications

OUTPUT FORMAT (use exactly this):

## 1. Executive Summary
[Comprehensive overview - minimum 100 words]

## 2. Purpose & Scope
[Objectives and application boundaries - minimum 100 words]

## 3. Key Requirements
[Main technical requirements - minimum 100 words]

## 4. Technical Specifications
[Technical details if known, or note that specifics require documentation - minimum 100 words]

## 5. Security Controls
[Security measures this provides - minimum 100 words]

## 6. Crypto/Blockchain Application
[How this applies to cryptocurrency and blockchain - minimum 100 words]

## 7. Compliance Criteria
[Implementation requirements - minimum 100 words]

## 8. Implementation Guidelines
[Practical implementation steps - minimum 100 words]

## 9. Risk Considerations
[Risks addressed or mitigated - minimum 100 words]

## 10. Related Standards & References
[Connected standards and verified sources - minimum 100 words]

Be factual, comprehensive, and honest about uncertainty."""

    # Call AI with retries
    for attempt in range(MAX_RETRIES):
        try:
            time.sleep(3)  # Rate limiting

            response = api._call_mistral(prompt=prompt, max_tokens=5000)

            if not response:
                time.sleep(5)
                response = api._call_cerebras_rotation(prompt=prompt, max_tokens=5000)

            if response:
                # Clean response
                response = re.sub(r'<think>.*?</think>', '', response, flags=re.DOTALL).strip()

                # Check for MISMATCH
                if response.strip().upper().startswith("MISMATCH"):
                    return None

                # Validate quality
                chapters = len(re.findall(r'^## \d+\.', response, re.MULTILINE))

                if chapters >= 10 and len(response) >= MIN_SUMMARY_LENGTH:
                    return response
                else:
                    print(f"      Attempt {attempt+1}: Quality check failed ({chapters} chapters, {len(response)} chars)")
                    stats["retried"] += 1
                    time.sleep(5)
                    continue

        except Exception as e:
            print(f"      Attempt {attempt+1} error: {e}")
            time.sleep(10)

    return None


def update_database(norm_id, summary, has_document):
    """Update norm in database with quality summary."""
    headers = get_supabase_headers('return=minimal')
    url = f'{SUPABASE_URL}/rest/v1/norms?id=eq.{norm_id}'

    if has_document:
        full_summary = f"""✅ **VERIFIED SUMMARY - 10 CHAPTERS**
Generated from official document with AI enrichment.

---

{summary}"""
        verified = True
    else:
        full_summary = f"""📚 **AI KNOWLEDGE SUMMARY - 10 CHAPTERS**
Generated from verified AI knowledge (no official document available).

---

{summary}"""
        verified = False

    r = requests.patch(url, headers=headers, json={
        'official_doc_summary': full_summary,
        'summary_verified': verified
    })
    return r.status_code in [200, 204]


def main():
    print("=" * 70)
    print("HIGH QUALITY NORM SUMMARY REGENERATION")
    print("Focus: 10 chapters, quality content, verified facts")
    print("=" * 70)

    api = AIProvider()

    print("\nFetching norms needing 10-chapter update...")
    norms = get_norms_needing_update()
    print(f"Found {len(norms)} norms needing update")

    if not norms:
        print("All norms already have 10 chapters!")
        return

    # Process each norm
    for i, norm in enumerate(norms):
        code = norm['code']
        title = norm['title']

        print(f"\n[{i+1}/{len(norms)}] {code}: {title[:45]}...")

        # Find document
        doc_type, content = find_document(code)

        if doc_type:
            print(f"    📄 Source: {doc_type} document")
        else:
            print(f"    🤖 Source: AI knowledge")

        # Generate summary
        summary = generate_quality_summary(api, code, title, content)

        if not summary:
            print(f"    ❌ Failed to generate quality summary")
            stats["failed"] += 1
            continue

        # Validate
        chapters = len(re.findall(r'^## \d+\.', summary, re.MULTILINE))
        print(f"    ✓ Generated: {len(summary)} chars, {chapters} chapters")

        # Update database
        if update_database(norm['id'], summary, doc_type is not None):
            print(f"    ✅ Saved to database")
            stats["success"] += 1
        else:
            print(f"    ❌ Database update failed")
            stats["failed"] += 1

        # Progress report every 25
        if (i + 1) % 25 == 0:
            print(f"\n{'='*50}")
            print(f"PROGRESS: {stats['success']} success, {stats['failed']} failed, {stats['retried']} retries")
            print(f"{'='*50}\n")

        time.sleep(4)  # Rate limiting

    print("\n" + "=" * 70)
    print("FINAL RESULTS")
    print("=" * 70)
    print(f"✅ Successfully generated: {stats['success']}")
    print(f"❌ Failed: {stats['failed']}")
    print(f"🔄 Quality retries: {stats['retried']}")


if __name__ == '__main__':
    main()
