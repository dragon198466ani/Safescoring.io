#!/usr/bin/env python3
"""
TURBO REGENERATION - Maximum speed with all APIs in parallel.
Uses threading + all available API keys for maximum throughput.
"""
import os
import sys
import re
import time
import json
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.core.config import (
    SUPABASE_URL, get_supabase_headers,
    GROQ_API_KEYS, CEREBRAS_API_KEYS, SAMBANOVA_API_KEYS,
    MISTRAL_API_KEY
)

# Configuration
MAX_WORKERS = 8  # Parallel threads
MIN_SUMMARY_LENGTH = 2500
MAX_RETRIES = 2

# API endpoints
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
CEREBRAS_URL = "https://api.cerebras.ai/v1/chat/completions"
SAMBANOVA_URL = "https://api.sambanova.ai/v1/chat/completions"
MISTRAL_URL = "https://api.mistral.ai/v1/chat/completions"

# Thread-safe counters
stats_lock = Lock()
stats = {"success": 0, "failed": 0, "api_calls": 0}

# API key rotation with locks
groq_lock = Lock()
groq_idx = [0]
cerebras_lock = Lock()
cerebras_idx = [0]
sambanova_lock = Lock()
sambanova_idx = [0]


def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")


def get_next_groq_key():
    with groq_lock:
        if not GROQ_API_KEYS:
            return None
        key = GROQ_API_KEYS[groq_idx[0] % len(GROQ_API_KEYS)]
        groq_idx[0] += 1
        return key


def get_next_cerebras_key():
    with cerebras_lock:
        if not CEREBRAS_API_KEYS:
            return None
        key = CEREBRAS_API_KEYS[cerebras_idx[0] % len(CEREBRAS_API_KEYS)]
        cerebras_idx[0] += 1
        return key


def get_next_sambanova_key():
    with sambanova_lock:
        if not SAMBANOVA_API_KEYS:
            return None
        key = SAMBANOVA_API_KEYS[sambanova_idx[0] % len(SAMBANOVA_API_KEYS)]
        sambanova_idx[0] += 1
        return key


def call_groq(prompt, max_tokens=5000):
    key = get_next_groq_key()
    if not key:
        return None
    try:
        r = requests.post(GROQ_URL, headers={
            'Authorization': f'Bearer {key}',
            'Content-Type': 'application/json'
        }, json={
            'model': 'llama-3.3-70b-versatile',
            'messages': [{'role': 'user', 'content': prompt}],
            'max_tokens': max_tokens,
            'temperature': 0.2
        }, timeout=90)
        if r.status_code == 200:
            return r.json()['choices'][0]['message']['content']
    except:
        pass
    return None


def call_cerebras(prompt, max_tokens=5000):
    key = get_next_cerebras_key()
    if not key:
        return None
    try:
        r = requests.post(CEREBRAS_URL, headers={
            'Authorization': f'Bearer {key}',
            'Content-Type': 'application/json'
        }, json={
            'model': 'llama-3.3-70b',
            'messages': [{'role': 'user', 'content': prompt}],
            'max_tokens': max_tokens,
            'temperature': 0.2
        }, timeout=90)
        if r.status_code == 200:
            return r.json()['choices'][0]['message']['content']
    except:
        pass
    return None


def call_sambanova(prompt, max_tokens=5000):
    key = get_next_sambanova_key()
    if not key:
        return None
    try:
        r = requests.post(SAMBANOVA_URL, headers={
            'Authorization': f'Bearer {key}',
            'Content-Type': 'application/json'
        }, json={
            'model': 'Meta-Llama-3.1-70B-Instruct',
            'messages': [{'role': 'user', 'content': prompt}],
            'max_tokens': max_tokens,
            'temperature': 0.2
        }, timeout=120)
        if r.status_code == 200:
            return r.json()['choices'][0]['message']['content']
    except:
        pass
    return None


def call_mistral(prompt, max_tokens=5000):
    if not MISTRAL_API_KEY:
        return None
    try:
        r = requests.post(MISTRAL_URL, headers={
            'Authorization': f'Bearer {MISTRAL_API_KEY}',
            'Content-Type': 'application/json'
        }, json={
            'model': 'mistral-small-latest',
            'messages': [{'role': 'user', 'content': prompt}],
            'max_tokens': max_tokens,
            'temperature': 0.2
        }, timeout=90)
        if r.status_code == 200:
            return r.json()['choices'][0]['message']['content']
    except:
        pass
    return None


def call_ai(prompt):
    """Try all APIs in sequence until one works."""
    with stats_lock:
        stats["api_calls"] += 1

    # Try in order of speed
    for api_func in [call_groq, call_cerebras, call_sambanova, call_mistral]:
        result = api_func(prompt)
        if result:
            return result
        time.sleep(0.5)

    return None


def generate_summary(code, title):
    """Generate 10-chapter summary."""
    prompt = f"""You are an expert in cybersecurity and cryptocurrency standards.

Create a comprehensive 10-chapter summary for "{code}: {title}"

RULES:
1. Use ONLY verified, factual information
2. Generate EXACTLY 10 chapters
3. Each chapter: 80-120 words
4. Use "typically", "generally" for uncertain claims
5. NEVER invent fake data

FORMAT (use exactly):

## 1. Executive Summary
[Overview - 80-120 words]

## 2. Purpose & Scope
[Objectives - 80-120 words]

## 3. Key Requirements
[Requirements - 80-120 words]

## 4. Technical Specifications
[Technical details - 80-120 words]

## 5. Security Controls
[Security measures - 80-120 words]

## 6. Crypto/Blockchain Application
[Crypto relevance - 80-120 words]

## 7. Compliance Criteria
[Compliance needs - 80-120 words]

## 8. Implementation Guidelines
[Implementation - 80-120 words]

## 9. Risk Considerations
[Risks - 80-120 words]

## 10. Related Standards & References
[References - 80-120 words]"""

    for attempt in range(MAX_RETRIES):
        response = call_ai(prompt)
        if response:
            # Clean
            response = re.sub(r'<think>.*?</think>', '', response, flags=re.DOTALL).strip()
            chapters = len(re.findall(r'^## \d+\.', response, re.MULTILINE))
            if chapters >= 10 and len(response) >= MIN_SUMMARY_LENGTH:
                return response
        time.sleep(1)

    return None


def update_database(norm_id, summary):
    """Update norm in database."""
    headers = get_supabase_headers('return=minimal')
    url = f'{SUPABASE_URL}/rest/v1/norms?id=eq.{norm_id}'

    full_summary = f"""📚 **AI KNOWLEDGE SUMMARY - 10 CHAPTERS**
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}

---

{summary}"""

    try:
        r = requests.patch(url, headers=headers, json={
            'official_doc_summary': full_summary,
            'summary_verified': False
        }, timeout=30)
        return r.status_code in [200, 204]
    except:
        return False


def process_norm(norm):
    """Process a single norm (called by thread pool)."""
    code = norm['code']
    title = norm['title']
    norm_id = norm['id']

    summary = generate_summary(code, title)

    if not summary:
        with stats_lock:
            stats["failed"] += 1
        return (code, False, 0)

    chapters = len(re.findall(r'^## \d+\.', summary, re.MULTILINE))

    if update_database(norm_id, summary):
        with stats_lock:
            stats["success"] += 1
        return (code, True, chapters)
    else:
        with stats_lock:
            stats["failed"] += 1
        return (code, False, 0)


def get_norms_needing_update():
    """Fetch norms without 10 chapters."""
    headers = get_supabase_headers()
    all_norms = []

    for offset in range(0, 2000, 500):
        url = f'{SUPABASE_URL}/rest/v1/norms?select=id,code,title,official_doc_summary&limit=500&offset={offset}'
        try:
            r = requests.get(url, headers=headers, timeout=30)
            if r.status_code == 200:
                batch = r.json()
                if not batch:
                    break
                all_norms.extend(batch)
        except:
            pass

    needs_update = []
    for n in all_norms:
        summary = n.get('official_doc_summary') or ''
        chapters = len(re.findall(r'^## \d+\.', summary, re.MULTILINE))
        if chapters < 10:
            needs_update.append(n)

    return needs_update


def main():
    log("=" * 60)
    log("TURBO REGENERATION - PARALLEL PROCESSING")
    log(f"APIs: Groq({len(GROQ_API_KEYS)}), Cerebras({len(CEREBRAS_API_KEYS)}), SambaNova({len(SAMBANOVA_API_KEYS)}), Mistral")
    log(f"Workers: {MAX_WORKERS}")
    log("=" * 60)

    norms = get_norms_needing_update()
    log(f"Normes a traiter: {len(norms)}")

    if not norms:
        log("Toutes les normes ont 10 chapitres!")
        return

    start_time = time.time()

    # Process in parallel
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {executor.submit(process_norm, norm): norm for norm in norms}

        for i, future in enumerate(as_completed(futures)):
            code, success, chapters = future.result()
            status = f"✓ {chapters}ch" if success else "✗"
            log(f"[{i+1}/{len(norms)}] {code}: {status}")

            # Progress report
            if (i + 1) % 50 == 0:
                elapsed = (time.time() - start_time) / 60
                rate = (i + 1) / elapsed if elapsed > 0 else 0
                remaining = (len(norms) - i - 1) / rate if rate > 0 else 0
                log(f"--- Progress: {stats['success']} OK, {stats['failed']} FAIL | {rate:.1f}/min | ETA: {remaining:.0f}min ---")

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
    log(f"Rate: {(stats['success'] + stats['failed']) / elapsed:.1f} norms/min")


if __name__ == '__main__':
    main()
