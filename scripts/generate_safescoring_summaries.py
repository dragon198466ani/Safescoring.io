#!/usr/bin/env python3
"""
Generate SafeScoring-contextualized summaries using Claude.
Based on official scraped content (reference_content).
Max 10,000 words per summary.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.core.config import SUPABASE_URL, SUPABASE_HEADERS
from src.core.api_provider import AIProvider
import requests
import argparse
import time

SAFESCORING_CONTEXT = """
SafeScoring is a comprehensive evaluation framework for cryptocurrency products (hardware wallets, software wallets, exchanges, DeFi protocols, etc.).

The framework uses 4 pillars (SAFE):
- **S (Security)**: Cryptographic standards, secure elements, key management, attack resistance
- **A (Adversity)**: Resilience against physical attacks, coercion, theft, loss scenarios  
- **F (Fidelity)**: Durability, reliability, longevity, material quality, warranty
- **E (Ecosystem)**: Blockchain support, DeFi integration, interoperability, user experience

Each norm evaluates a specific aspect of crypto product security/quality.
Products are scored based on compliance with these norms.
"""

def get_norms_with_content_no_summary():
    """Get norms that have reference_content but no summary."""
    url = f"{SUPABASE_URL}/rest/v1/norms"
    params = {
        "select": "id,code,title,description,pillar,target_type,reference_content,official_link,summary",
        "order": "code"
    }
    
    all_norms = []
    offset = 0
    while True:
        resp = requests.get(url, headers=SUPABASE_HEADERS, params={**params, "offset": offset, "limit": 1000})
        if resp.status_code != 200:
            print(f"Error: {resp.status_code}")
            break
        batch = resp.json()
        if not batch:
            break
        all_norms.extend(batch)
        offset += 1000
        if len(batch) < 1000:
            break
    
    # Filter: has reference_content but no summary
    filtered = []
    for n in all_norms:
        has_content = n.get('reference_content') and len(n.get('reference_content', '')) > 100
        no_summary = not n.get('summary') or len(n.get('summary', '')) < 50
        if has_content and no_summary:
            filtered.append(n)
    
    return filtered

def generate_summary_with_ai(ai: AIProvider, norm: dict) -> str:
    """Generate SafeScoring-contextualized summary using AI."""
    
    code = norm['code']
    title = norm['title']
    description = norm.get('description', '') or ''
    pillar = norm.get('pillar', '')
    target_type = norm.get('target_type', 'both')
    reference_content = norm.get('reference_content', '')[:12000]  # Limit content size
    official_link = norm.get('official_link', '')
    
    pillar_names = {
        'S': 'Security',
        'A': 'Adversity',
        'F': 'Fidelity', 
        'E': 'Ecosystem'
    }
    pillar_name = pillar_names.get(pillar, pillar)
    
    target_desc = {
        'digital': 'software/digital products (software wallets, exchanges, DeFi)',
        'physical': 'hardware products (hardware wallets, security keys)',
        'both': 'both hardware and software crypto products'
    }.get(target_type, 'crypto products')
    
    prompt = f"""You are an expert in cryptocurrency security standards and the SafeScoring evaluation framework.

{SAFESCORING_CONTEXT}

Based ONLY on the official documentation provided below, write a comprehensive summary for this norm.

## Norm Information
- **Code**: {code}
- **Title**: {title}
- **Description**: {description}
- **Pillar**: {pillar_name}
- **Applies to**: {target_desc}
- **Official Source**: {official_link}

## Official Documentation Content
{reference_content}

## Instructions
Write a detailed summary that:
1. Explains what this standard/norm is and its purpose
2. Describes the technical requirements and specifications
3. Explains how it applies to cryptocurrency product evaluation in SafeScoring
4. Lists key compliance criteria for crypto products
5. Mentions security implications for hardware/software wallets

IMPORTANT:
- Use ONLY information from the official documentation above
- Do NOT invent or hallucinate any details
- If information is limited, keep the summary focused on what's documented
- Write in clear, professional English

Output the summary directly, no preamble."""

    try:
        response = ai.call(prompt=prompt, max_tokens=4000, temperature=0.2)
        if response and len(response) > 100:
            return response.strip()
    except Exception as e:
        print(f"      AI exception: {e}")
    
    return None

def update_norm_summary(norm_id: int, summary: str) -> bool:
    """Update summary for a norm."""
    url = f"{SUPABASE_URL}/rest/v1/norms?id=eq.{norm_id}"
    data = {"summary": summary}
    resp = requests.patch(url, headers=SUPABASE_HEADERS, json=data)
    return resp.status_code in [200, 204]

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=50)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    
    print("=" * 70)
    print("SAFESCORING SUMMARY GENERATION")
    print("Based on official scraped content only")
    print("=" * 70)
    
    ai = AIProvider()
    
    norms = get_norms_with_content_no_summary()
    print(f"\n📋 Found {len(norms)} norms with content but no summary")
    
    if args.limit:
        norms = norms[:args.limit]
        print(f"   Processing first {len(norms)}")
    
    success = 0
    failed = 0
    
    for i, norm in enumerate(norms, 1):
        code = norm['code']
        title = norm['title']
        content_len = len(norm.get('reference_content', ''))
        
        print(f"\n[{i}/{len(norms)}] {code} - {title}")
        print(f"   📄 Content: {content_len} chars")
        
        summary = generate_summary_with_ai(ai, norm)
        
        if summary and len(summary) > 100:
            print(f"   ✅ Summary generated ({len(summary)} chars)")
            if not args.dry_run:
                if update_norm_summary(norm['id'], summary):
                    success += 1
                    print(f"   💾 Stored")
                else:
                    failed += 1
                    print(f"   ❌ Failed to store")
            else:
                success += 1
                print(f"   [DRY-RUN] Would store")
        else:
            failed += 1
            print(f"   ❌ Failed to generate")
        
        time.sleep(0.5)
    
    print("\n" + "=" * 70)
    print(f"✅ Success: {success}")
    print(f"❌ Failed: {failed}")

if __name__ == "__main__":
    main()
