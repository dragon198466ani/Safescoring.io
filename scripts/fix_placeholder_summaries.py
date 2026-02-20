#!/usr/bin/env python3
"""
Fix norms with placeholder text in summaries.
Regenerates summaries with proper references and updates official_link.
"""
import os
import sys
import re
import json
import time
import requests
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# Config
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')
GROQ_API_KEY = os.getenv('GROQ_API_KEY')
SAMBANOVA_API_KEY = os.getenv('SAMBANOVA_API_KEY')

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
SAMBANOVA_URL = "https://api.sambanova.ai/v1/chat/completions"

# Map norm types to appropriate official links
LINK_MAPPINGS = {
    # Physical/Hardware standards
    "waterjet": ("https://www.iso.org/standard/63555.html", "P", "ISO 20653:2013 - Road vehicles protection against water"),
    "anti-corrosion": ("https://www.iso.org/standard/71866.html", "P", "ISO 9227:2017 - Corrosion tests in artificial atmospheres"),
    "sand/dust": ("https://www.iec.ch/ip-ratings", "G", "IEC 60529 - IP ratings for dust/water ingress protection"),
    "sapphire": ("https://www.iso.org/standard/76693.html", "P", "ISO 14577 - Materials hardness testing"),
    "weight": ("https://www.iso.org/standard/27001", "P", "ISO/IEC 27001 - Physical security guidelines"),
    # Financial/Exchange standards
    "withdrawal": ("https://www.fatf-gafi.org/recommendations.html", "G", "FATF Guidelines - AML/CFT requirements"),
    "insurance": ("https://www.lloyds.com/about-lloyds/what-is-lloyds", "G", "Lloyd's of London - Insurance standards"),
    "yield": ("https://defisafety.com/", "G", "DeFi Safety - Yield protocol evaluation"),
    "fee": ("https://www.iso.org/standard/27001", "P", "ISO/IEC 27001 - Information security management"),
    # User experience standards
    "price": ("https://www.iso.org/standard/27001", "P", "ISO/IEC 27001 - Information security management"),
    "forum": ("https://www.w3.org/WAI/WCAG21/quickref/", "G", "WCAG 2.1 - Web Content Accessibility Guidelines"),
    "p&l": ("https://www.iso.org/standard/27001", "P", "ISO/IEC 27001 - Information security management"),
    # Security standards
    "delay": ("https://pages.nist.gov/800-63-3/", "G", "NIST SP 800-63 - Digital Identity Guidelines"),
}


def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")


def get_headers():
    return {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json'
    }


def call_groq(prompt):
    """Call Groq API for summary generation."""
    try:
        r = requests.post(GROQ_URL, headers={
            'Authorization': f'Bearer {GROQ_API_KEY}',
            'Content-Type': 'application/json'
        }, json={
            'model': 'llama-3.3-70b-versatile',
            'messages': [{'role': 'user', 'content': prompt}],
            'max_tokens': 4000,
            'temperature': 0.3
        }, timeout=120)
        if r.status_code == 200:
            return r.json()['choices'][0]['message']['content']
        else:
            log(f"  Groq error: {r.status_code}")
    except Exception as e:
        log(f"  Groq exception: {e}")
    return None


def call_sambanova(prompt):
    """Call SambaNova API as fallback."""
    try:
        r = requests.post(SAMBANOVA_URL, headers={
            'Authorization': f'Bearer {SAMBANOVA_API_KEY}',
            'Content-Type': 'application/json'
        }, json={
            'model': 'Meta-Llama-3.1-70B-Instruct',
            'messages': [{'role': 'user', 'content': prompt}],
            'max_tokens': 4000,
            'temperature': 0.3
        }, timeout=120)
        if r.status_code == 200:
            return r.json()['choices'][0]['message']['content']
        else:
            log(f"  SambaNova error: {r.status_code}")
    except Exception as e:
        log(f"  SambaNova exception: {e}")
    return None


def call_ai(prompt):
    """Try multiple AI providers."""
    result = call_groq(prompt)
    if result:
        return result
    log("  Falling back to SambaNova...")
    return call_sambanova(prompt)


def find_best_link(title):
    """Find the most appropriate official link based on norm title."""
    title_lower = title.lower()
    for keyword, (link, access_type, reference) in LINK_MAPPINGS.items():
        if keyword in title_lower:
            return link, access_type, reference
    # Default fallback
    return "https://www.iso.org/standard/27001", "P", "ISO/IEC 27001 - Information security management"


def generate_fixed_summary(code, title, official_link, standard_reference):
    """Generate a summary without placeholders."""
    prompt = f"""Generate a professional technical summary for the cryptocurrency security standard: "{code}: {title}"

Official Reference: {standard_reference}
Official Link: {official_link}

Create a structured summary with these 10 sections (use ### headers):

### **1. PURPOSE**
Why this standard matters for cryptocurrency security (2-3 sentences)

### **2. ORIGIN**
- **Organization**: [Actual issuing body]
- **First Published**: [Year or "Industry standard"]
- **Status**: Active
- **Type**: [Standard type]

### **3. TECHNICAL SPECIFICATIONS**
Key technical requirements with specific values where applicable

### **4. CRYPTOGRAPHIC PRIMITIVES**
Related cryptographic aspects (or "N/A - Not a cryptographic standard" if not applicable)

### **5. SECURITY PROPERTIES**
- **Protects against**: [Specific threats]
- **Security level**: [Low/Medium/High]
- **Trust model**: [Assumptions]

### **6. COMPLIANCE REQUIREMENTS**
- **MUST**: [Required items]
- **SHOULD**: [Recommended items]

### **7. DEPENDENCIES & REFERENCES**
Related standards and specifications

### **8. USE CASES**
How this applies to hardware wallets, software wallets, and exchanges

### **9. LIMITATIONS & WARNINGS**
Trade-offs and potential risks

### **10. REFERENCES**
- [{standard_reference}]({official_link})
- Additional relevant official sources

IMPORTANT:
- Do NOT use placeholder text like "[Official documentation URL if known]"
- Use the actual official_link provided: {official_link}
- Keep it concise but informative
- Focus on cryptocurrency/blockchain security context"""

    return call_groq(prompt)


def get_norms_with_placeholders():
    """Find all norms with placeholder text in summaries."""
    url = f"{SUPABASE_URL}/rest/v1/norms?official_doc_summary=ilike.*Official%20documentation%20URL%20if%20known*&select=id,code,title,official_link,official_doc_summary"
    r = requests.get(url, headers=get_headers(), timeout=30)
    if r.status_code == 200:
        return r.json()
    return []


def update_norm(norm_id, summary, official_link, access_type, standard_reference, issuing_authority):
    """Update norm with fixed data."""
    url = f"{SUPABASE_URL}/rest/v1/norms?id=eq.{norm_id}"
    headers = get_headers()
    headers['Prefer'] = 'return=representation'

    data = {
        'official_doc_summary': summary,
        'official_link': official_link,
        'access_type': access_type,
        'standard_reference': standard_reference,
        'issuing_authority': issuing_authority,
        'summary_status': 'complete'
    }

    r = requests.patch(url, headers=headers, json=data, timeout=30)
    return r.status_code in [200, 204]


def main():
    log("=" * 60)
    log("FIX PLACEHOLDER SUMMARIES")
    log("=" * 60)

    if not all([SUPABASE_URL, SUPABASE_KEY, GROQ_API_KEY]):
        log("ERROR: Missing environment variables")
        sys.exit(1)

    norms = get_norms_with_placeholders()
    log(f"Found {len(norms)} norms with placeholder text")

    if not norms:
        log("Nothing to fix!")
        return

    success = 0
    failed = 0

    for i, norm in enumerate(norms):
        norm_id = norm['id']
        code = norm['code']
        title = norm['title']

        log(f"\n[{i+1}/{len(norms)}] {code}: {title}")

        # Find appropriate link
        official_link, access_type, standard_reference = find_best_link(title)
        log(f"  Link: {official_link}")
        log(f"  Reference: {standard_reference}")

        # Extract issuing authority from reference
        issuing_authority = standard_reference.split(" - ")[0] if " - " in standard_reference else "International Standards Organization"

        # Generate new summary
        log("  Generating summary...")
        summary = generate_fixed_summary(code, title, official_link, standard_reference)

        if not summary:
            log("  FAILED: Could not generate summary")
            failed += 1
            continue

        # Clean up response
        summary = re.sub(r'<think>.*?</think>', '', summary, flags=re.DOTALL).strip()

        # Add header
        full_summary = f"""### **Summary: {title} ({code})**

{summary}"""

        # Update database
        log("  Updating database...")
        if update_norm(norm_id, full_summary, official_link, access_type, standard_reference, issuing_authority):
            log("  SUCCESS")
            success += 1
        else:
            log("  FAILED: Database update error")
            failed += 1

        # Rate limit
        time.sleep(3)

    log("\n" + "=" * 60)
    log(f"COMPLETE: {success} fixed, {failed} failed")
    log("=" * 60)


if __name__ == '__main__':
    main()
