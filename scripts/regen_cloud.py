#!/usr/bin/env python3
"""
CLOUD-OPTIMIZED Norm Summary Regeneration
Designed for GitHub Actions - autonomous execution.

Features:
- Multiple AI provider rotation with quota management
- Batch processing with progress tracking
- Quality validation (10 chapters required)
- Retry logic with exponential backoff
- Cloud-compatible (no local files required)
"""
import os
import sys
import re
import time
import json
import requests
from datetime import datetime

# Configuration from environment
SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_KEY') or os.environ.get('SUPABASE_ANON_KEY', '')
BATCH_SIZE = int(os.environ.get('BATCH_SIZE', '50'))
FORCE_ALL = os.environ.get('FORCE_ALL', 'false').lower() == 'true'

# AI API Keys (multiple providers for rotation)
MISTRAL_API_KEY = os.environ.get('MISTRAL_API_KEY', '')
GROQ_API_KEYS = [k.strip() for k in os.environ.get('GROQ_API_KEYS', '').split(',') if k.strip()]
CEREBRAS_API_KEYS = [k.strip() for k in os.environ.get('CEREBRAS_API_KEYS', '').split(',') if k.strip()]
SAMBANOVA_API_KEYS = [k.strip() for k in os.environ.get('SAMBANOVA_API_KEYS', '').split(',') if k.strip()]
GEMINI_API_KEYS = [k.strip() for k in os.environ.get('GEMINI_API_KEYS', '').split(',') if k.strip()]
DEEPSEEK_API_KEY = os.environ.get('DEEPSEEK_API_KEY', '')

# API endpoints
MISTRAL_URL = "https://api.mistral.ai/v1/chat/completions"
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
CEREBRAS_URL = "https://api.cerebras.ai/v1/chat/completions"
SAMBANOVA_URL = "https://api.sambanova.ai/v1/chat/completions"
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
DEEPSEEK_URL = "https://api.deepseek.com/chat/completions"

# Tracking
stats = {"success": 0, "failed": 0, "skipped": 0, "api_calls": 0}
api_state = {
    "groq_idx": 0, "groq_disabled": set(),
    "cerebras_idx": 0, "cerebras_disabled": set(),
    "sambanova_idx": 0, "sambanova_disabled": set(),
    "gemini_idx": 0, "gemini_disabled": set(),
}

MIN_SUMMARY_LENGTH = 2500
MAX_RETRIES = 3


def log(msg):
    """Print with timestamp."""
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")


def get_supabase_headers():
    """Get Supabase headers."""
    return {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json'
    }


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
            log(f"Error fetching: {e}")

    # Filter: needs update if no 10 chapters (unless FORCE_ALL)
    needs_update = []
    for n in all_norms:
        summary = n.get('official_doc_summary') or ''
        chapters = len(re.findall(r'^## \d+\.', summary, re.MULTILINE))
        if FORCE_ALL or chapters < 10:
            needs_update.append(n)

    return needs_update[:BATCH_SIZE]  # Limit to batch size


# =============================================================================
# AI API CALLS WITH ROTATION
# =============================================================================

def call_mistral(prompt, max_tokens=5000):
    """Call Mistral AI API."""
    if not MISTRAL_API_KEY:
        return None

    try:
        stats["api_calls"] += 1
        r = requests.post(MISTRAL_URL, headers={
            'Authorization': f'Bearer {MISTRAL_API_KEY}',
            'Content-Type': 'application/json'
        }, json={
            'model': 'mistral-small-latest',
            'messages': [{'role': 'user', 'content': prompt}],
            'max_tokens': max_tokens,
            'temperature': 0.2
        }, timeout=120)

        if r.status_code == 200:
            return r.json()['choices'][0]['message']['content']
        elif r.status_code == 429:
            log("  Mistral rate limited")
            time.sleep(60)
        else:
            log(f"  Mistral error: {r.status_code}")
    except Exception as e:
        log(f"  Mistral exception: {e}")
    return None


def call_groq(prompt, max_tokens=5000):
    """Call Groq API with key rotation."""
    if not GROQ_API_KEYS:
        return None

    available = [i for i in range(len(GROQ_API_KEYS)) if i not in api_state["groq_disabled"]]
    if not available:
        api_state["groq_disabled"].clear()  # Reset after trying all
        available = list(range(len(GROQ_API_KEYS)))

    for _ in range(len(available)):
        idx = api_state["groq_idx"] % len(GROQ_API_KEYS)
        api_state["groq_idx"] += 1

        if idx in api_state["groq_disabled"]:
            continue

        key = GROQ_API_KEYS[idx]
        try:
            stats["api_calls"] += 1
            r = requests.post(GROQ_URL, headers={
                'Authorization': f'Bearer {key}',
                'Content-Type': 'application/json'
            }, json={
                'model': 'llama-3.3-70b-versatile',
                'messages': [{'role': 'user', 'content': prompt}],
                'max_tokens': max_tokens,
                'temperature': 0.2
            }, timeout=120)

            if r.status_code == 200:
                return r.json()['choices'][0]['message']['content']
            elif r.status_code == 429:
                log(f"  Groq key {idx} rate limited")
                api_state["groq_disabled"].add(idx)
            else:
                log(f"  Groq error: {r.status_code}")
        except Exception as e:
            log(f"  Groq exception: {e}")

    return None


def call_cerebras(prompt, max_tokens=5000):
    """Call Cerebras API with key rotation."""
    if not CEREBRAS_API_KEYS:
        return None

    available = [i for i in range(len(CEREBRAS_API_KEYS)) if i not in api_state["cerebras_disabled"]]
    if not available:
        api_state["cerebras_disabled"].clear()
        available = list(range(len(CEREBRAS_API_KEYS)))

    for _ in range(len(available)):
        idx = api_state["cerebras_idx"] % len(CEREBRAS_API_KEYS)
        api_state["cerebras_idx"] += 1

        if idx in api_state["cerebras_disabled"]:
            continue

        key = CEREBRAS_API_KEYS[idx]
        try:
            stats["api_calls"] += 1
            r = requests.post(CEREBRAS_URL, headers={
                'Authorization': f'Bearer {key}',
                'Content-Type': 'application/json'
            }, json={
                'model': 'llama-3.3-70b',
                'messages': [{'role': 'user', 'content': prompt}],
                'max_tokens': max_tokens,
                'temperature': 0.2
            }, timeout=120)

            if r.status_code == 200:
                return r.json()['choices'][0]['message']['content']
            elif r.status_code == 429:
                log(f"  Cerebras key {idx} rate limited")
                api_state["cerebras_disabled"].add(idx)
        except Exception as e:
            log(f"  Cerebras exception: {e}")

    return None


def call_sambanova(prompt, max_tokens=5000):
    """Call SambaNova API with key rotation."""
    if not SAMBANOVA_API_KEYS:
        return None

    available = [i for i in range(len(SAMBANOVA_API_KEYS)) if i not in api_state["sambanova_disabled"]]
    if not available:
        api_state["sambanova_disabled"].clear()
        available = list(range(len(SAMBANOVA_API_KEYS)))

    for _ in range(len(available)):
        idx = api_state["sambanova_idx"] % len(SAMBANOVA_API_KEYS)
        api_state["sambanova_idx"] += 1

        if idx in api_state["sambanova_disabled"]:
            continue

        key = SAMBANOVA_API_KEYS[idx]
        try:
            stats["api_calls"] += 1
            r = requests.post(SAMBANOVA_URL, headers={
                'Authorization': f'Bearer {key}',
                'Content-Type': 'application/json'
            }, json={
                'model': 'DeepSeek-R1',
                'messages': [{'role': 'user', 'content': prompt}],
                'max_tokens': max_tokens,
                'temperature': 0.2
            }, timeout=180)

            if r.status_code == 200:
                return r.json()['choices'][0]['message']['content']
            elif r.status_code == 429:
                log(f"  SambaNova key {idx} rate limited")
                api_state["sambanova_disabled"].add(idx)
        except Exception as e:
            log(f"  SambaNova exception: {e}")

    return None


def call_gemini(prompt, max_tokens=5000):
    """Call Gemini API with key rotation."""
    if not GEMINI_API_KEYS:
        return None

    available = [i for i in range(len(GEMINI_API_KEYS)) if i not in api_state["gemini_disabled"]]
    if not available:
        api_state["gemini_disabled"].clear()
        available = list(range(len(GEMINI_API_KEYS)))

    for _ in range(len(available)):
        idx = api_state["gemini_idx"] % len(GEMINI_API_KEYS)
        api_state["gemini_idx"] += 1

        if idx in api_state["gemini_disabled"]:
            continue

        key = GEMINI_API_KEYS[idx]
        try:
            stats["api_calls"] += 1
            url = f"{GEMINI_URL}?key={key}"
            r = requests.post(url, headers={
                'Content-Type': 'application/json'
            }, json={
                'contents': [{'parts': [{'text': prompt}]}],
                'generationConfig': {
                    'maxOutputTokens': max_tokens,
                    'temperature': 0.2
                }
            }, timeout=120)

            if r.status_code == 200:
                data = r.json()
                if 'candidates' in data and data['candidates']:
                    return data['candidates'][0]['content']['parts'][0]['text']
            elif r.status_code == 429:
                log(f"  Gemini key {idx} rate limited")
                api_state["gemini_disabled"].add(idx)
        except Exception as e:
            log(f"  Gemini exception: {e}")

    return None


def call_deepseek(prompt, max_tokens=5000):
    """Call DeepSeek API."""
    if not DEEPSEEK_API_KEY:
        return None

    try:
        stats["api_calls"] += 1
        r = requests.post(DEEPSEEK_URL, headers={
            'Authorization': f'Bearer {DEEPSEEK_API_KEY}',
            'Content-Type': 'application/json'
        }, json={
            'model': 'deepseek-chat',
            'messages': [{'role': 'user', 'content': prompt}],
            'max_tokens': max_tokens,
            'temperature': 0.2
        }, timeout=120)

        if r.status_code == 200:
            return r.json()['choices'][0]['message']['content']
        elif r.status_code == 429:
            log("  DeepSeek rate limited")
    except Exception as e:
        log(f"  DeepSeek exception: {e}")
    return None


def call_ai_with_fallback(prompt, max_tokens=5000):
    """Call AI with automatic fallback between providers."""
    # Priority order: Groq -> SambaNova -> Cerebras -> Gemini -> Mistral -> DeepSeek
    providers = [
        ("Groq", call_groq),
        ("SambaNova", call_sambanova),
        ("Cerebras", call_cerebras),
        ("Gemini", call_gemini),
        ("Mistral", call_mistral),
        ("DeepSeek", call_deepseek),
    ]

    for name, func in providers:
        result = func(prompt, max_tokens)
        if result:
            log(f"  API: {name}")
            return result
        time.sleep(1)  # Small delay between providers

    return None


# =============================================================================
# SUMMARY GENERATION
# =============================================================================

def generate_quality_summary(code, title):
    """Generate HIGH QUALITY 10-chapter summary."""
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

OUTPUT FORMAT (use exactly this markdown format with ## headers):

## 1. Executive Summary
[Comprehensive overview - minimum 100 words]

## 2. Purpose & Scope
[Objectives and application boundaries - minimum 100 words]

## 3. Key Requirements
[Main technical requirements - minimum 100 words]

## 4. Technical Specifications
[Technical details if known - minimum 100 words]

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

    # Retry logic with quality validation
    for attempt in range(MAX_RETRIES):
        response = call_ai_with_fallback(prompt, 5000)

        if response:
            # Clean response
            response = re.sub(r'<think>.*?</think>', '', response, flags=re.DOTALL).strip()

            # Validate quality
            chapters = len(re.findall(r'^## \d+\.', response, re.MULTILINE))

            if chapters >= 10 and len(response) >= MIN_SUMMARY_LENGTH:
                return response
            else:
                log(f"  Attempt {attempt+1}: Quality failed ({chapters} chapters, {len(response)} chars)")
                time.sleep(5)

        time.sleep(3)  # Rate limiting

    return None


def update_database(norm_id, summary):
    """Update norm in database with quality summary."""
    headers = get_supabase_headers()
    headers['Prefer'] = 'return=minimal'
    url = f'{SUPABASE_URL}/rest/v1/norms?id=eq.{norm_id}'

    full_summary = f"""📚 **AI KNOWLEDGE SUMMARY - 10 CHAPTERS**
Generated automatically by SafeScoring AI Pipeline.
Last updated: {datetime.now().strftime('%Y-%m-%d %H:%M UTC')}

---

{summary}"""

    r = requests.patch(url, headers=headers, json={
        'official_doc_summary': full_summary,
        'summary_verified': False  # Mark for human review
    }, timeout=30)

    return r.status_code in [200, 204]


# =============================================================================
# MAIN
# =============================================================================

def main():
    log("=" * 60)
    log("CLOUD NORM SUMMARY REGENERATION")
    log(f"Batch size: {BATCH_SIZE}, Force all: {FORCE_ALL}")
    log("=" * 60)

    if not SUPABASE_URL or not SUPABASE_KEY:
        log("ERROR: SUPABASE credentials not configured")
        sys.exit(1)

    # Count available API keys
    api_count = sum([
        1 if MISTRAL_API_KEY else 0,
        len(GROQ_API_KEYS),
        len(CEREBRAS_API_KEYS),
        len(SAMBANOVA_API_KEYS),
        len(GEMINI_API_KEYS),
        1 if DEEPSEEK_API_KEY else 0,
    ])
    log(f"API keys available: {api_count}")

    if api_count == 0:
        log("ERROR: No API keys configured")
        sys.exit(1)

    # Fetch norms
    log("Fetching norms needing update...")
    norms = get_norms_needing_update()
    log(f"Found {len(norms)} norms to process")

    if not norms:
        log("All norms already have 10 chapters!")
        return

    # Process each norm
    start_time = time.time()

    for i, norm in enumerate(norms):
        # Check time limit (50 minutes max)
        elapsed = (time.time() - start_time) / 60
        if elapsed > 50:
            log(f"Time limit reached ({elapsed:.1f} min), stopping")
            break

        code = norm['code']
        title = norm['title']

        log(f"[{i+1}/{len(norms)}] {code}: {title[:40]}...")

        # Generate summary
        summary = generate_quality_summary(code, title)

        if not summary:
            log(f"  FAILED")
            stats["failed"] += 1
            continue

        # Validate
        chapters = len(re.findall(r'^## \d+\.', summary, re.MULTILINE))
        log(f"  Generated: {len(summary)} chars, {chapters} chapters")

        # Update database
        if update_database(norm['id'], summary):
            log(f"  SAVED")
            stats["success"] += 1
        else:
            log(f"  DB ERROR")
            stats["failed"] += 1

        time.sleep(2)  # Rate limiting

    # Final report
    elapsed = (time.time() - start_time) / 60
    log("")
    log("=" * 60)
    log("RESULTS")
    log("=" * 60)
    log(f"Success: {stats['success']}")
    log(f"Failed: {stats['failed']}")
    log(f"API calls: {stats['api_calls']}")
    log(f"Time: {elapsed:.1f} minutes")

    # Save progress for next run
    with open('config/regen_progress.json', 'w') as f:
        json.dump({
            'last_run': datetime.now().isoformat(),
            'processed': stats['success'] + stats['failed'],
            'success': stats['success'],
            'failed': stats['failed']
        }, f)


if __name__ == '__main__':
    main()
