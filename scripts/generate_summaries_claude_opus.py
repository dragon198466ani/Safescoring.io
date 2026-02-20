#!/usr/bin/env python3
"""
SAFESCORING - Generate High-Quality Summaries with Claude Opus
===============================================================
Uses Claude Opus (claude-3-opus) for maximum quality summaries.
- 10,000 words max per summary
- Scientific and factual tone
- Contextualized for SafeScoring evaluation framework
- Based on official documentation only
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.core.config import SUPABASE_URL, SUPABASE_HEADERS, CLAUDE_API_KEY, OPENROUTER_API_KEY, OPENROUTER_API_KEYS
import requests
import argparse
import time

# API Configuration - Use OpenRouter for Claude Opus access
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
CLAUDE_OPUS_MODEL = "anthropic/claude-3-opus"  # Via OpenRouter
CLAUDE_SONNET_MODEL = "anthropic/claude-3.5-sonnet"  # Fallback

# Direct Anthropic API (if key available)
CLAUDE_API_URL = "https://api.anthropic.com/v1/messages"
CLAUDE_MODEL = "claude-3-opus-20240229"

SAFESCORING_CONTEXT = """
# SafeScoring Evaluation Framework

SafeScoring is a comprehensive, scientific evaluation framework for cryptocurrency products including:
- **Hardware Wallets** (Ledger, Trezor, Keystone, etc.)
- **Software Wallets** (MetaMask, Trust Wallet, Rabby, etc.)
- **Exchanges** (Centralized and Decentralized)
- **DeFi Protocols** (Lending, DEX, Staking, Bridges)
- **Seed Backup Solutions** (Metal plates, Cryptosteel, etc.)

## The SAFE Framework (4 Pillars)

### S - Security (Sécurité)
Evaluates cryptographic standards, secure elements, key management, attack resistance, and overall security architecture.
- Cryptographic algorithms (AES, RSA, ECC, EdDSA)
- Secure Element certification (CC EAL5+, FIPS 140-2)
- Key derivation (BIP32, BIP39, BIP44)
- Side-channel attack resistance
- Firmware security and update mechanisms

### A - Adversity (Adversité)
Evaluates resilience against physical attacks, coercion, theft, loss scenarios, and disaster recovery.
- Physical tamper resistance
- Duress/coercion protection (duress PIN, plausible deniability)
- Backup and recovery mechanisms
- Multi-signature support
- Social engineering resistance

### F - Fidelity (Fidélité)
Evaluates durability, reliability, longevity, material quality, and warranty.
- Build quality and materials
- Environmental resistance (IP ratings, temperature)
- Component longevity (flash memory endurance)
- Manufacturer support and warranty
- Long-term availability

### E - Ecosystem (Écosystème)
Evaluates blockchain support, DeFi integration, interoperability, and user experience.
- Supported blockchains and tokens
- DeFi protocol compatibility
- Cross-chain capabilities
- User interface quality
- Third-party integrations

## Scoring Methodology
Each norm is evaluated on a scale, and products receive scores based on their compliance with these norms.
The final SafeScore aggregates all pillar scores to provide a comprehensive security rating.
"""

def get_norms_needing_summary():
    """Get ALL norms that need a summary (no summary or short summary)."""
    url = f"{SUPABASE_URL}/rest/v1/norms"
    params = {
        "select": "id,code,title,description,pillar,target_type,official_link,reference_content,summary",
        "order": "code"
    }
    
    all_norms = []
    offset = 0
    while True:
        resp = requests.get(url, headers=SUPABASE_HEADERS, params={**params, "offset": offset, "limit": 1000})
        if resp.status_code != 200:
            print(f"Error fetching norms: {resp.status_code}")
            break
        batch = resp.json()
        if not batch:
            break
        all_norms.extend(batch)
        offset += 1000
        if len(batch) < 1000:
            break
    
    # Filter: needs summary (no summary or summary < 500 chars)
    filtered = []
    for n in all_norms:
        summary = n.get('summary') or ''
        if len(summary) < 500:  # Needs a proper summary
            filtered.append(n)
    
    return filtered


def scrape_official_source(url: str) -> str:
    """Scrape content from official source if not already in reference_content."""
    if not url:
        return None
    
    try:
        from bs4 import BeautifulSoup
        import PyPDF2
        import tempfile
        
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        
        # PDF handling
        if url.lower().endswith('.pdf'):
            resp = requests.get(url, headers=headers, timeout=30, stream=True)
            if resp.status_code == 200:
                with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as f:
                    for chunk in resp.iter_content(chunk_size=8192):
                        f.write(chunk)
                    temp_path = f.name
                
                text_parts = []
                with open(temp_path, 'rb') as f:
                    reader = PyPDF2.PdfReader(f)
                    for page in reader.pages[:30]:  # Max 30 pages
                        text_parts.append(page.extract_text() or '')
                
                os.unlink(temp_path)
                text = '\n'.join(text_parts)
                return text[:20000] if len(text) > 20000 else text
        
        # GitHub raw content
        if 'github.com' in url and '/blob/' in url:
            raw_url = url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/')
            resp = requests.get(raw_url, headers=headers, timeout=15)
            if resp.status_code == 200:
                return resp.text[:20000]
        
        # HTML content
        resp = requests.get(url, headers=headers, timeout=20)
        if resp.status_code == 200:
            soup = BeautifulSoup(resp.text, 'html.parser')
            
            # Remove noise
            for tag in soup(['script', 'style', 'nav', 'footer', 'header', 'aside']):
                tag.decompose()
            
            # Find main content
            main = (soup.find('main') or soup.find('article') or 
                    soup.find('div', {'class': 'content'}) or
                    soup.find('div', {'class': 'markdown-body'}) or
                    soup.find('div', {'class': 'eip'}))
            
            text = (main or soup).get_text(separator='\n', strip=True)
            return text[:20000] if len(text) > 20000 else text
            
    except Exception as e:
        print(f"      Scrape error: {e}")
    
    return None


def generate_summary_with_claude_opus(norm: dict, reference_content: str) -> str:
    """Generate a comprehensive 10,000 word summary using Claude Opus."""
    
    if not CLAUDE_API_KEY:
        print("      ERROR: ANTHROPIC_API_KEY not configured!")
        return None
    
    code = norm['code']
    title = norm['title']
    description = norm.get('description', '') or ''
    pillar = norm.get('pillar', '')
    target_type = norm.get('target_type', 'both')
    official_link = norm.get('official_link', '')
    
    pillar_names = {
        'S': 'Security (Sécurité)',
        'A': 'Adversity (Adversité)', 
        'F': 'Fidelity (Fidélité)',
        'E': 'Ecosystem (Écosystème)'
    }
    pillar_name = pillar_names.get(pillar, pillar)
    
    target_desc = {
        'digital': 'software/digital products (software wallets, exchanges, DeFi protocols)',
        'physical': 'hardware products (hardware wallets, security keys, seed backup devices)',
        'both': 'both hardware and software cryptocurrency products'
    }.get(target_type, 'cryptocurrency products')
    
    # Limit reference content to fit in context
    ref_content = reference_content[:25000] if reference_content else "No official documentation available."
    
    prompt = f"""You are a senior security researcher and technical writer specializing in cryptocurrency security standards.

{SAFESCORING_CONTEXT}

## Your Task

Write a comprehensive, scientific, and factual summary for the following norm/standard. This summary will be used in the SafeScoring evaluation framework to assess cryptocurrency products.

## Norm Information
- **Code**: {code}
- **Title**: {title}
- **Description**: {description}
- **SafeScoring Pillar**: {pillar_name}
- **Applies to**: {target_desc}
- **Official Source**: {official_link}

## Official Documentation Content
{ref_content}

## Summary Requirements

Write a detailed, professional summary (up to 10,000 words) that includes:

### 1. Executive Overview (500-800 words)
- What is this standard/norm and why does it exist?
- Historical context and development
- Governing body or organization
- Current version and status

### 2. Technical Specifications (2000-3000 words)
- Detailed technical requirements
- Algorithms, protocols, or methodologies specified
- Implementation requirements
- Compliance criteria and thresholds
- Testing and validation procedures

### 3. Application to Cryptocurrency Products (2000-3000 words)
- How this norm applies to hardware wallets
- How this norm applies to software wallets
- How this norm applies to exchanges and DeFi protocols
- Specific implementation examples in the crypto industry
- Common compliance challenges

### 4. SafeScoring Evaluation Criteria (1500-2000 words)
- How SafeScoring evaluates products against this norm
- Scoring methodology for this specific norm
- What constitutes full compliance vs partial compliance
- Red flags and automatic disqualification criteria

### 5. Security Implications (1500-2000 words)
- Security benefits of compliance
- Risks of non-compliance
- Attack vectors this norm protects against
- Real-world incidents related to this norm (if any)

### 6. Compliance Checklist (500-1000 words)
- Bullet-point checklist for product manufacturers
- Documentation requirements
- Certification process (if applicable)

## Writing Guidelines

- **Scientific tone**: Use precise technical language
- **Factual only**: Base everything on the official documentation provided
- **No hallucination**: If information is not in the documentation, state "Not specified in official documentation"
- **Practical focus**: Always relate back to cryptocurrency product evaluation
- **Professional English**: Clear, well-structured prose

Output the summary directly without any preamble or meta-commentary."""

    try:
        response = requests.post(
            CLAUDE_API_URL,
            headers={
                'x-api-key': CLAUDE_API_KEY,
                'anthropic-version': '2023-06-01',
                'Content-Type': 'application/json'
            },
            json={
                'model': CLAUDE_MODEL,
                'max_tokens': 16000,  # ~10,000 words
                'temperature': 0.3,  # Lower for factual accuracy
                'messages': [{'role': 'user', 'content': prompt}]
            },
            timeout=180  # 3 minutes for long responses
        )
        
        if response.status_code == 200:
            result = response.json()
            summary = result['content'][0]['text']
            return summary.strip()
        elif response.status_code == 429:
            print(f"      Claude rate limit - waiting 60s...")
            time.sleep(60)
            return None
        elif response.status_code in [401, 402, 403]:
            print(f"      Claude API key error: {response.status_code}")
            return None
        else:
            print(f"      Claude error {response.status_code}: {response.text[:200]}")
            return None
            
    except Exception as e:
        print(f"      Claude exception: {e}")
        return None


def update_norm_summary(norm_id: int, summary: str, reference_content: str = None) -> bool:
    """Update summary (and optionally reference_content) for a norm."""
    url = f"{SUPABASE_URL}/rest/v1/norms?id=eq.{norm_id}"
    data = {"summary": summary}
    if reference_content:
        data["reference_content"] = reference_content
    
    resp = requests.patch(url, headers=SUPABASE_HEADERS, json=data)
    return resp.status_code in [200, 204]


def main():
    parser = argparse.ArgumentParser(description="Generate high-quality summaries with Claude Opus")
    parser.add_argument("--limit", type=int, default=10, help="Number of norms to process")
    parser.add_argument("--dry-run", action="store_true", help="Don't save to database")
    parser.add_argument("--start-from", type=str, help="Start from this norm code")
    args = parser.parse_args()
    
    print("=" * 80)
    print("SAFESCORING - CLAUDE OPUS SUMMARY GENERATION")
    print("=" * 80)
    print(f"Model: {CLAUDE_MODEL}")
    print(f"Max words: ~10,000 per summary")
    print(f"Context: SafeScoring + Crypto Products")
    print("=" * 80)
    
    if not CLAUDE_API_KEY:
        print("\n❌ ERROR: ANTHROPIC_API_KEY not configured in .env")
        print("   Please add: ANTHROPIC_API_KEY=sk-ant-...")
        return
    
    norms = get_norms_needing_summary()
    print(f"\n📋 Found {len(norms)} norms needing summaries")
    
    # Start from specific code if requested
    if args.start_from:
        start_idx = next((i for i, n in enumerate(norms) if n['code'] >= args.start_from), 0)
        norms = norms[start_idx:]
        print(f"   Starting from {args.start_from} ({len(norms)} remaining)")
    
    if args.limit:
        norms = norms[:args.limit]
        print(f"   Processing {len(norms)} norms")
    
    success = 0
    failed = 0
    
    for i, norm in enumerate(norms, 1):
        code = norm['code']
        title = norm['title']
        official_link = norm.get('official_link', '')
        existing_content = norm.get('reference_content', '')
        
        print(f"\n[{i}/{len(norms)}] {code} - {title}")
        
        # Get reference content
        reference_content = existing_content
        if not reference_content or len(reference_content) < 200:
            if official_link:
                print(f"   📥 Scraping: {official_link[:60]}...")
                reference_content = scrape_official_source(official_link)
                if reference_content:
                    print(f"   ✅ Scraped {len(reference_content)} chars")
        
        if reference_content:
            print(f"   📄 Reference: {len(reference_content)} chars")
        else:
            print(f"   ⚠️  No reference content - using metadata only")
            reference_content = f"Title: {title}\nDescription: {norm.get('description', '')}"
        
        # Generate summary with Claude Opus
        print(f"   🤖 Generating summary with Claude Opus...")
        summary = generate_summary_with_claude_opus(norm, reference_content)
        
        if summary and len(summary) > 500:
            word_count = len(summary.split())
            print(f"   ✅ Summary generated: {len(summary)} chars (~{word_count} words)")
            
            if not args.dry_run:
                # Save both summary and reference_content
                if update_norm_summary(norm['id'], summary, reference_content if not existing_content else None):
                    success += 1
                    print(f"   💾 Saved to database")
                else:
                    failed += 1
                    print(f"   ❌ Failed to save")
            else:
                success += 1
                print(f"   [DRY-RUN] Would save")
        else:
            failed += 1
            print(f"   ❌ Failed to generate summary")
        
        # Rate limiting - Claude Opus has lower limits
        time.sleep(2)
    
    print("\n" + "=" * 80)
    print(f"✅ Success: {success}")
    print(f"❌ Failed: {failed}")
    print("=" * 80)


if __name__ == "__main__":
    main()
