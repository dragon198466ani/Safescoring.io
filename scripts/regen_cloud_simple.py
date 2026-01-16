#!/usr/bin/env python3
"""
SIMPLIFIED Cloud Regeneration - Single JSON config secret.
Uses API_CONFIG environment variable with all keys.
"""
import os
import sys
import re
import json
import time
import requests
from datetime import datetime

# Parse config from single JSON secret
API_CONFIG = json.loads(os.environ.get('API_CONFIG', '{}'))

SUPABASE_URL = API_CONFIG.get('SUPABASE_URL', '')
SUPABASE_KEY = API_CONFIG.get('SUPABASE_SERVICE_KEY', '')
GROQ_KEYS = API_CONFIG.get('GROQ_KEYS', [])
CEREBRAS_KEYS = API_CONFIG.get('CEREBRAS_KEYS', [])
SAMBANOVA_KEYS = API_CONFIG.get('SAMBANOVA_KEYS', [])
MISTRAL_KEY = API_CONFIG.get('MISTRAL_KEY', '')
GEMINI_KEYS = API_CONFIG.get('GEMINI_KEYS', [])

BATCH_SIZE = int(os.environ.get('BATCH_SIZE', '50'))
FORCE_ALL = os.environ.get('FORCE_ALL', 'false').lower() == 'true'

# API URLs
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
CEREBRAS_URL = "https://api.cerebras.ai/v1/chat/completions"
SAMBANOVA_URL = "https://api.sambanova.ai/v1/chat/completions"
MISTRAL_URL = "https://api.mistral.ai/v1/chat/completions"

stats = {"success": 0, "failed": 0}
key_idx = {"groq": 0, "cerebras": 0, "sambanova": 0}


def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")


def get_supabase_headers():
    return {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json'
    }


def call_groq(prompt):
    if not GROQ_KEYS:
        return None
    key = GROQ_KEYS[key_idx["groq"] % len(GROQ_KEYS)]
    key_idx["groq"] += 1
    try:
        r = requests.post(GROQ_URL, headers={
            'Authorization': f'Bearer {key}',
            'Content-Type': 'application/json'
        }, json={
            'model': 'llama-3.3-70b-versatile',
            'messages': [{'role': 'user', 'content': prompt}],
            'max_tokens': 5000,
            'temperature': 0.2
        }, timeout=90)
        if r.status_code == 200:
            return r.json()['choices'][0]['message']['content']
    except:
        pass
    return None


def call_cerebras(prompt):
    if not CEREBRAS_KEYS:
        return None
    key = CEREBRAS_KEYS[key_idx["cerebras"] % len(CEREBRAS_KEYS)]
    key_idx["cerebras"] += 1
    try:
        r = requests.post(CEREBRAS_URL, headers={
            'Authorization': f'Bearer {key}',
            'Content-Type': 'application/json'
        }, json={
            'model': 'llama-3.3-70b',
            'messages': [{'role': 'user', 'content': prompt}],
            'max_tokens': 5000,
            'temperature': 0.2
        }, timeout=90)
        if r.status_code == 200:
            return r.json()['choices'][0]['message']['content']
    except:
        pass
    return None


def call_sambanova(prompt):
    if not SAMBANOVA_KEYS:
        return None
    key = SAMBANOVA_KEYS[key_idx["sambanova"] % len(SAMBANOVA_KEYS)]
    key_idx["sambanova"] += 1
    try:
        r = requests.post(SAMBANOVA_URL, headers={
            'Authorization': f'Bearer {key}',
            'Content-Type': 'application/json'
        }, json={
            'model': 'Meta-Llama-3.1-70B-Instruct',
            'messages': [{'role': 'user', 'content': prompt}],
            'max_tokens': 5000,
            'temperature': 0.2
        }, timeout=120)
        if r.status_code == 200:
            return r.json()['choices'][0]['message']['content']
    except:
        pass
    return None


def call_mistral(prompt):
    if not MISTRAL_KEY:
        return None
    try:
        r = requests.post(MISTRAL_URL, headers={
            'Authorization': f'Bearer {MISTRAL_KEY}',
            'Content-Type': 'application/json'
        }, json={
            'model': 'mistral-small-latest',
            'messages': [{'role': 'user', 'content': prompt}],
            'max_tokens': 5000,
            'temperature': 0.2
        }, timeout=90)
        if r.status_code == 200:
            return r.json()['choices'][0]['message']['content']
    except:
        pass
    return None


def call_ai(prompt):
    for func in [call_groq, call_cerebras, call_sambanova, call_mistral]:
        result = func(prompt)
        if result:
            return result
        time.sleep(0.5)
    return None


def generate_summary(code, title):
    prompt = f"""Create a 10-chapter summary for "{code}: {title}"

Format with ## headers numbered 1-10:
## 1. Executive Summary
## 2. Purpose & Scope
## 3. Key Requirements
## 4. Technical Specifications
## 5. Security Controls
## 6. Crypto/Blockchain Application
## 7. Compliance Criteria
## 8. Implementation Guidelines
## 9. Risk Considerations
## 10. Related Standards & References

Each chapter: 80-120 words. Verified facts only."""

    for _ in range(2):
        response = call_ai(prompt)
        if response:
            response = re.sub(r'<think>.*?</think>', '', response, flags=re.DOTALL).strip()
            if len(re.findall(r'^## \d+\.', response, re.MULTILINE)) >= 10:
                return response
        time.sleep(2)
    return None


def get_norms_needing_update():
    headers = get_supabase_headers()
    all_norms = []
    for offset in range(0, 3000, 500):
        url = f'{SUPABASE_URL}/rest/v1/norms?select=id,code,title,official_doc_summary&limit=500&offset={offset}'
        try:
            r = requests.get(url, headers=headers, timeout=30)
            if r.status_code == 200:
                batch = r.json()
                if batch:
                    all_norms.extend(batch)
                else:
                    break
        except:
            pass

    needs_update = []
    for n in all_norms:
        summary = n.get('official_doc_summary') or ''
        chapters = len(re.findall(r'^## \d+\.', summary, re.MULTILINE))
        if FORCE_ALL or chapters < 10:
            needs_update.append(n)

    return needs_update[:BATCH_SIZE]


def update_database(norm_id, summary):
    headers = get_supabase_headers()
    headers['Prefer'] = 'return=minimal'
    url = f'{SUPABASE_URL}/rest/v1/norms?id=eq.{norm_id}'

    full_summary = f"""📚 **AI KNOWLEDGE SUMMARY - 10 CHAPTERS**
Updated: {datetime.now().strftime('%Y-%m-%d %H:%M UTC')}

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


def main():
    log("=" * 50)
    log("CLOUD NORM REGENERATION (SIMPLE)")
    log(f"APIs: Groq({len(GROQ_KEYS)}), Cerebras({len(CEREBRAS_KEYS)}), SambaNova({len(SAMBANOVA_KEYS)})")
    log("=" * 50)

    if not SUPABASE_URL:
        log("ERROR: No SUPABASE config")
        sys.exit(1)

    norms = get_norms_needing_update()
    log(f"To process: {len(norms)}")

    if not norms:
        log("All done!")
        return

    for i, norm in enumerate(norms):
        code, title = norm['code'], norm['title']
        log(f"[{i+1}/{len(norms)}] {code}...")

        summary = generate_summary(code, title)
        if summary and update_database(norm['id'], summary):
            stats["success"] += 1
            log(f"  OK")
        else:
            stats["failed"] += 1
            log(f"  FAIL")

        time.sleep(2)

    log(f"\nDone: {stats['success']} OK, {stats['failed']} FAIL")


if __name__ == '__main__':
    main()
