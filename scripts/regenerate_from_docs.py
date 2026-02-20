#!/usr/bin/env python3
"""
Regenerate norm summaries from downloaded documents.
Uses the actual HTML/PDF content instead of AI hallucinations.
"""
import os
import sys
import re
import json
import time
import requests
from bs4 import BeautifulSoup

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.core.config import SUPABASE_URL, get_supabase_headers
from src.core.api_provider import AIProvider

NORM_DOCS_DIR = "norm_docs"
NORM_PDFS_DIR = "norm_pdfs"

# Max content length to send to AI
MAX_CONTENT_LENGTH = 50000


def get_unverified_norms():
    """Fetch norms where summary_verified is false."""
    headers = get_supabase_headers()
    all_norms = []

    for offset in range(0, 2000, 500):
        url = f'{SUPABASE_URL}/rest/v1/norms?select=id,code,title,official_link,official_doc_summary&summary_verified=eq.false&limit=500&offset={offset}'
        try:
            r = requests.get(url, headers=headers, timeout=30)
            if r.status_code != 200:
                print(f"  Error at offset {offset}: {r.status_code}")
                continue
            batch = r.json()
            if not batch:
                break
            all_norms.extend(batch)
        except Exception as e:
            print(f"  Exception at offset {offset}: {e}")

    return all_norms


def sanitize_code(code):
    """Create safe filename from code."""
    return re.sub(r'[<>:"/\\|?*]', '_', code)[:100]


def extract_html_content(filepath):
    """Extract readable text from HTML file."""
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            html = f.read()

        soup = BeautifulSoup(html, 'html.parser')

        # Remove scripts and styles
        for tag in soup(['script', 'style', 'nav', 'header', 'footer', 'aside']):
            tag.decompose()

        # Get text
        text = soup.get_text(separator='\n', strip=True)

        # Clean up whitespace
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        text = '\n'.join(lines)

        return text[:MAX_CONTENT_LENGTH]
    except Exception as e:
        print(f"    Error extracting HTML: {e}")
        return None


def extract_pdf_content(filepath):
    """Extract text from PDF file."""
    try:
        import fitz  # PyMuPDF

        doc = fitz.open(filepath)
        text_parts = []

        for page_num in range(min(20, len(doc))):  # First 20 pages max
            page = doc[page_num]
            text_parts.append(page.get_text())

        doc.close()

        text = '\n'.join(text_parts)
        return text[:MAX_CONTENT_LENGTH]
    except ImportError:
        print("    PyMuPDF not installed, trying pdfplumber...")
        try:
            import pdfplumber

            text_parts = []
            with pdfplumber.open(filepath) as pdf:
                for page in pdf.pages[:20]:
                    text = page.extract_text()
                    if text:
                        text_parts.append(text)

            return '\n'.join(text_parts)[:MAX_CONTENT_LENGTH]
        except Exception as e:
            print(f"    Error with pdfplumber: {e}")
            return None
    except Exception as e:
        print(f"    Error extracting PDF: {e}")
        return None


def find_document_for_norm(code):
    """Find downloaded document for a norm by code."""
    # Documents are named by code directly
    html_path = os.path.join(NORM_DOCS_DIR, f"{code}.html")
    if os.path.exists(html_path):
        return ('html', html_path)

    pdf_path = os.path.join(NORM_PDFS_DIR, f"{code}.pdf")
    if os.path.exists(pdf_path):
        return ('pdf', pdf_path)

    # Try with sanitized code as fallback
    safe_code = sanitize_code(code)
    if safe_code != code:
        html_path = os.path.join(NORM_DOCS_DIR, f"{safe_code}.html")
        if os.path.exists(html_path):
            return ('html', html_path)

        pdf_path = os.path.join(NORM_PDFS_DIR, f"{safe_code}.pdf")
        if os.path.exists(pdf_path):
            return ('pdf', pdf_path)

    return (None, None)


def validate_document_relevance(api, code, title, content):
    """Check if the document content actually relates to the norm."""
    content_lower = content.lower()[:10000]
    title_lower = title.lower()
    code_lower = code.lower()

    # Check for code variants in content (EIP-155, eip155, eip:155, etc.)
    code_clean = code_lower.replace('-', '').replace('_', '')
    if code_clean in content_lower.replace('-', '').replace('_', '').replace(':', '').replace(' ', ''):
        return True, "Code found in content"

    # Check for title keywords (more lenient - include 3+ char words)
    key_terms = []
    for word in title_lower.split():
        clean_word = ''.join(c for c in word if c.isalnum())
        if len(clean_word) >= 3 and clean_word not in ['the', 'and', 'for', 'with', 'from', 'that', 'this']:
            key_terms.append(clean_word)

    if key_terms:
        matches = sum(1 for term in key_terms if term in content_lower)
        if matches >= 1:  # At least one term found
            return True, f"Found {matches}/{len(key_terms)} title terms"

    # Be lenient if content has substantial length
    if len(content) > 2000:
        return True, "Substantial content - let AI validate"

    return False, "No matching terms found"


def generate_summary_from_content(api, code, title, content):
    """Generate summary using AI from actual document content with 10 chapters."""
    # Extract key sections for analysis (limit to avoid prompt overflow)
    content_preview = content[:12000]

    prompt = f"""Analyze this official document for the standard "{code}: {title}".

DOCUMENT CONTENT:
{content_preview}

INSTRUCTIONS:
1. If this document has NO RELATION to "{title}" or the topic area, respond ONLY: "MISMATCH: [actual topic]"
   Note: Accept partial matches - e.g., if the standard covers the general area even if not the exact title.
2. If relevant (even partially), provide a COMPREHENSIVE technical summary with exactly 10 chapters.
   Use EXACTLY this markdown format (## for headers, numbered 1-10):

## 1. Executive Summary
Brief overview of what this standard covers and why it matters (2-3 sentences).

## 2. Purpose & Scope
What this standard defines, its objectives, and boundaries of application.

## 3. Key Requirements
Main technical requirements, mandatory controls, or specifications.

## 4. Technical Specifications
Specific thresholds, metrics, algorithms, protocols, or parameters mentioned.

## 5. Security Controls
Security measures, cryptographic requirements, and protection mechanisms.

## 6. Crypto/Blockchain Application
How this applies specifically to cryptocurrency, blockchain, DeFi, or digital assets.

## 7. Compliance Criteria
What organizations must implement to comply, certification requirements.

## 8. Implementation Guidelines
Practical steps and best practices for implementation.

## 9. Risk Considerations
Potential risks, threats addressed, and mitigation strategies.

## 10. Related Standards & References
Connected standards, dependencies, and official documentation sources.

Write approximately 100-150 words per chapter.

CRITICAL RULES:
- Extract real information from the document
- You MAY add contextual enrichment with REAL, VERIFIED technical facts
- You MUST NOT invent false information, fake numbers, or fictional claims
- If a chapter has no relevant info in the document, write "Not explicitly covered in this document" and add only VERIFIED general knowledge
- Prefer saying "typically" or "generally" over making absolute claims you can't verify"""

    try:
        # Use Mistral (working) + Cerebras fallback
        import time
        time.sleep(2)
        response = api._call_mistral(prompt=prompt, max_tokens=4000)
        if not response:
            time.sleep(5)
            response = api._call_cerebras_rotation(prompt=prompt, max_tokens=4000)
        if response:
            # Check if AI detected mismatch
            if response.strip().startswith("MISMATCH:"):
                return None  # Document doesn't match
            # Remove any accidental <think> tags
            response = re.sub(r'<think>.*?</think>', '', response, flags=re.DOTALL).strip()
            return response
    except Exception as e:
        print(f"    AI Error: {e}")

    return None


def update_norm_summary(norm_id, summary):
    """Update norm summary in database and mark as verified."""
    headers = get_supabase_headers('return=minimal')
    url = f'{SUPABASE_URL}/rest/v1/norms?id=eq.{norm_id}'

    # Add verified header
    verified_summary = f"""✅ **VERIFIED SUMMARY - FROM OFFICIAL DOCUMENT**
This summary was generated from the actual official document.

---

{summary}"""

    r = requests.patch(url, headers=headers, json={
        'official_doc_summary': verified_summary,
        'summary_verified': True
    })
    return r.status_code in [200, 204]


def main():
    print("=" * 70)
    print("REGENERATING SUMMARIES FROM DOWNLOADED DOCUMENTS")
    print("=" * 70)

    # Check if we have document directories
    if not os.path.exists(NORM_DOCS_DIR) and not os.path.exists(NORM_PDFS_DIR):
        print("ERROR: No downloaded documents found!")
        print("Run download_all_norms.py first.")
        return

    # Initialize API
    api = AIProvider()

    # Get unverified norms
    print("\nFetching unverified norms from database...")
    norms = get_unverified_norms()
    print(f"Found {len(norms)} unverified norms")

    # Find norms that have downloaded docs
    to_process = []
    for norm in norms:
        doc_type, doc_path = find_document_for_norm(norm['code'])
        if doc_type:
            to_process.append((norm, doc_type, doc_path))

    print(f"\nFound {len(to_process)} unverified norms with downloaded documents")

    if not to_process:
        print("Nothing to process!")
        return

    # Process each norm
    success = 0
    failed = 0

    for i, (norm, doc_type, doc_path) in enumerate(to_process):
        code = norm['code']
        title = norm['title']

        print(f"\n[{i+1}/{len(to_process)}] {code}: {title[:50]}...")
        print(f"    Source: {doc_type} - {os.path.basename(doc_path)}")

        # Extract content
        if doc_type == 'html':
            content = extract_html_content(doc_path)
        else:
            content = extract_pdf_content(doc_path)

        if not content or len(content) < 500:
            print(f"    Skipping - insufficient content ({len(content) if content else 0} chars)")
            failed += 1
            continue

        print(f"    Extracted {len(content)} chars")

        # Validate document relevance first
        is_valid, reason = validate_document_relevance(api, code, title, content)
        if not is_valid:
            print(f"    Skipping - {reason}")
            failed += 1
            continue

        # Generate summary
        summary = generate_summary_from_content(api, code, title, content)

        if not summary:
            print(f"    Failed to generate summary")
            failed += 1
            continue

        print(f"    Generated {len(summary)} char summary")

        # Update database
        if update_norm_summary(norm['id'], summary):
            print(f"    ✓ Updated in database")
            success += 1
        else:
            print(f"    ✗ Failed to update database")
            failed += 1

        time.sleep(5)  # Rate limiting - 5s between requests to avoid quota issues

    print("\n" + "=" * 70)
    print("RESULTS")
    print("=" * 70)
    print(f"Successfully regenerated: {success}")
    print(f"Failed: {failed}")


if __name__ == '__main__':
    main()
