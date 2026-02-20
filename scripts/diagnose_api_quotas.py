#!/usr/bin/env python3
"""
API Quota Diagnostic Tool
=========================
Diagnose and report on API key status and quotas.

Usage:
    python scripts/diagnose_api_quotas.py
"""

import os
import sys
import json
import requests
from datetime import datetime

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.core.config import (
    CONFIG, GEMINI_API_KEYS, GROQ_API_KEYS, CEREBRAS_API_KEYS,
    SAMBANOVA_API_KEYS, OPENROUTER_API_KEYS, MISTRAL_API_KEY, DEEPSEEK_API_KEY
)


def test_gemini_key(api_key: str, index: int) -> dict:
    """Test a single Gemini API key and get quota info."""
    result = {
        "index": index,
        "key_prefix": api_key[:10] + "..." if api_key else "N/A",
        "status": "unknown",
        "model": None,
        "error": None
    }

    if not api_key:
        result["status"] = "missing"
        return result

    # Try a minimal API call to check status
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"

    try:
        response = requests.post(
            url,
            json={
                "contents": [{"parts": [{"text": "Say OK"}]}],
                "generationConfig": {"maxOutputTokens": 5}
            },
            timeout=10
        )

        if response.status_code == 200:
            result["status"] = "working"
            result["model"] = "gemini-2.0-flash"
        elif response.status_code == 429:
            error_data = response.json().get("error", {})
            error_msg = error_data.get("message", "")
            if "quota" in error_msg.lower() or "daily" in error_msg.lower():
                result["status"] = "daily_quota_exhausted"
            else:
                result["status"] = "rate_limited"
            result["error"] = error_msg[:100]
        elif response.status_code in (401, 403):
            result["status"] = "invalid_key"
            result["error"] = response.json().get("error", {}).get("message", "Auth error")[:100]
        else:
            result["status"] = f"error_{response.status_code}"
            result["error"] = response.text[:100]

    except Exception as e:
        result["status"] = "connection_error"
        result["error"] = str(e)[:100]

    return result


def test_groq_key(api_key: str, index: int) -> dict:
    """Test a single Groq API key."""
    result = {
        "index": index,
        "key_prefix": api_key[:10] + "..." if api_key else "N/A",
        "status": "unknown",
        "error": None
    }

    if not api_key:
        result["status"] = "missing"
        return result

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}

    try:
        response = requests.post(
            url,
            headers=headers,
            json={
                "model": "llama-3.3-70b-versatile",
                "messages": [{"role": "user", "content": "OK"}],
                "max_tokens": 5
            },
            timeout=10
        )

        if response.status_code == 200:
            result["status"] = "working"
        elif response.status_code == 429:
            result["status"] = "rate_limited"
            result["error"] = response.json().get("error", {}).get("message", "")[:100]
        elif response.status_code in (401, 403):
            result["status"] = "invalid_key"
        else:
            result["status"] = f"error_{response.status_code}"
            result["error"] = response.text[:100]

    except Exception as e:
        result["status"] = "connection_error"
        result["error"] = str(e)[:100]

    return result


def test_cerebras_key(api_key: str, index: int) -> dict:
    """Test a single Cerebras API key."""
    result = {
        "index": index,
        "key_prefix": api_key[:10] + "..." if api_key else "N/A",
        "status": "unknown",
        "error": None
    }

    if not api_key:
        result["status"] = "missing"
        return result

    url = "https://api.cerebras.ai/v1/chat/completions"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}

    try:
        response = requests.post(
            url,
            headers=headers,
            json={
                "model": "llama-3.3-70b",
                "messages": [{"role": "user", "content": "OK"}],
                "max_tokens": 5
            },
            timeout=10
        )

        if response.status_code == 200:
            result["status"] = "working"
        elif response.status_code == 429:
            result["status"] = "rate_limited"
            result["error"] = response.json().get("error", {}).get("message", "")[:100]
        elif response.status_code in (401, 403):
            result["status"] = "invalid_key"
        else:
            result["status"] = f"error_{response.status_code}"
            result["error"] = response.text[:100]

    except Exception as e:
        result["status"] = "connection_error"
        result["error"] = str(e)[:100]

    return result


def test_openrouter_key(api_key: str, index: int) -> dict:
    """Test a single OpenRouter API key."""
    result = {
        "index": index,
        "key_prefix": api_key[:15] + "..." if api_key else "N/A",
        "status": "unknown",
        "credits": None,
        "error": None
    }

    if not api_key:
        result["status"] = "missing"
        return result

    # First check credits/limits
    try:
        limits_url = "https://openrouter.ai/api/v1/auth/key"
        headers = {"Authorization": f"Bearer {api_key}"}
        resp = requests.get(limits_url, headers=headers, timeout=10)
        if resp.status_code == 200:
            data = resp.json().get("data", {})
            result["credits"] = data.get("limit_remaining")
            result["rate_limit"] = data.get("rate_limit", {})
    except:
        pass

    # Test actual API call
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}

    try:
        response = requests.post(
            url,
            headers=headers,
            json={
                "model": "google/gemini-2.0-flash-exp:free",
                "messages": [{"role": "user", "content": "OK"}],
                "max_tokens": 5
            },
            timeout=15
        )

        if response.status_code == 200:
            result["status"] = "working"
        elif response.status_code == 429:
            result["status"] = "rate_limited"
            result["error"] = response.json().get("error", {}).get("message", "")[:100]
        elif response.status_code in (401, 403):
            result["status"] = "invalid_key"
        elif response.status_code == 402:
            result["status"] = "insufficient_credits"
        else:
            result["status"] = f"error_{response.status_code}"
            result["error"] = response.text[:100]

    except Exception as e:
        result["status"] = "connection_error"
        result["error"] = str(e)[:100]

    return result


def test_sambanova_key(api_key: str, index: int) -> dict:
    """Test a single SambaNova API key."""
    result = {
        "index": index,
        "key_prefix": api_key[:12] + "..." if api_key else "N/A",
        "status": "unknown",
        "error": None
    }

    if not api_key:
        result["status"] = "missing"
        return result

    url = "https://api.sambanova.ai/v1/chat/completions"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}

    try:
        response = requests.post(
            url,
            headers=headers,
            json={
                "model": "Meta-Llama-3.3-70B-Instruct",
                "messages": [{"role": "user", "content": "OK"}],
                "max_tokens": 5
            },
            timeout=10
        )

        if response.status_code == 200:
            result["status"] = "working"
        elif response.status_code == 429:
            result["status"] = "rate_limited"
            result["error"] = response.json().get("error", {}).get("message", "")[:100]
        elif response.status_code in (401, 403):
            result["status"] = "invalid_key"
        else:
            result["status"] = f"error_{response.status_code}"
            result["error"] = response.text[:100]

    except Exception as e:
        result["status"] = "connection_error"
        result["error"] = str(e)[:100]

    return result


def check_gemini_quota_file():
    """Check if Gemini quota file exists and its age."""
    quota_file = 'config/.gemini_quota_exhausted'
    if os.path.exists(quota_file):
        mtime = os.path.getmtime(quota_file)
        file_time = datetime.fromtimestamp(mtime)
        age_hours = (datetime.now() - file_time).total_seconds() / 3600
        return {
            "exists": True,
            "created_at": file_time.isoformat(),
            "age_hours": round(age_hours, 1),
            "will_reset_in_hours": max(0, round(20 - age_hours, 1))
        }
    return {"exists": False}


def main():
    print("=" * 60)
    print("API QUOTA DIAGNOSTIC REPORT")
    print(f"Generated at: {datetime.now().isoformat()}")
    print("=" * 60)

    # Check Gemini quota file
    print("\n📁 GEMINI QUOTA FILE STATUS")
    print("-" * 40)
    quota_status = check_gemini_quota_file()
    if quota_status["exists"]:
        print(f"  ⚠️  Quota file EXISTS")
        print(f"     Created: {quota_status['created_at']}")
        print(f"     Age: {quota_status['age_hours']} hours")
        print(f"     Reset in: {quota_status['will_reset_in_hours']} hours")
        print(f"     → Delete config/.gemini_quota_exhausted to force retry")
    else:
        print(f"  ✅ No quota file (Gemini will be tried)")

    # Test Gemini keys
    print(f"\n🔑 GEMINI API KEYS ({len(GEMINI_API_KEYS)} configured)")
    print("-" * 40)
    gemini_working = 0
    for i, key in enumerate(GEMINI_API_KEYS):
        result = test_gemini_key(key, i + 1)
        status_icon = "✅" if result["status"] == "working" else "❌"
        if result["status"] == "working":
            gemini_working += 1
        print(f"  {status_icon} Key {i+1}: {result['key_prefix']} → {result['status']}")
        if result["error"]:
            print(f"      Error: {result['error']}")
    print(f"\n  Summary: {gemini_working}/{len(GEMINI_API_KEYS)} working")

    # Test Groq keys
    print(f"\n🔑 GROQ API KEYS ({len(GROQ_API_KEYS)} configured)")
    print("-" * 40)
    groq_working = 0
    for i, key in enumerate(GROQ_API_KEYS):
        result = test_groq_key(key, i + 1)
        status_icon = "✅" if result["status"] == "working" else "❌"
        if result["status"] == "working":
            groq_working += 1
        print(f"  {status_icon} Key {i+1}: {result['key_prefix']} → {result['status']}")
        if result["error"]:
            print(f"      Error: {result['error']}")
    print(f"\n  Summary: {groq_working}/{len(GROQ_API_KEYS)} working")

    # Test Cerebras keys
    print(f"\n🔑 CEREBRAS API KEYS ({len(CEREBRAS_API_KEYS)} configured)")
    print("-" * 40)
    cerebras_working = 0
    for i, key in enumerate(CEREBRAS_API_KEYS):
        result = test_cerebras_key(key, i + 1)
        status_icon = "✅" if result["status"] == "working" else "❌"
        if result["status"] == "working":
            cerebras_working += 1
        print(f"  {status_icon} Key {i+1}: {result['key_prefix']} → {result['status']}")
        if result["error"]:
            print(f"      Error: {result['error']}")
    print(f"\n  Summary: {cerebras_working}/{len(CEREBRAS_API_KEYS)} working")

    # Test SambaNova keys
    print(f"\n🔑 SAMBANOVA API KEYS ({len(SAMBANOVA_API_KEYS)} configured)")
    print("-" * 40)
    sambanova_working = 0
    for i, key in enumerate(SAMBANOVA_API_KEYS):
        result = test_sambanova_key(key, i + 1)
        status_icon = "✅" if result["status"] == "working" else "❌"
        if result["status"] == "working":
            sambanova_working += 1
        print(f"  {status_icon} Key {i+1}: {result['key_prefix']} → {result['status']}")
        if result["error"]:
            print(f"      Error: {result['error']}")
    print(f"\n  Summary: {sambanova_working}/{len(SAMBANOVA_API_KEYS)} working")

    # Test OpenRouter keys
    print(f"\n🔑 OPENROUTER API KEYS ({len(OPENROUTER_API_KEYS)} configured)")
    print("-" * 40)
    openrouter_working = 0
    for i, key in enumerate(OPENROUTER_API_KEYS):
        result = test_openrouter_key(key, i + 1)
        status_icon = "✅" if result["status"] == "working" else "❌"
        if result["status"] == "working":
            openrouter_working += 1
        print(f"  {status_icon} Key {i+1}: {result['key_prefix']} → {result['status']}")
        if result["credits"] is not None:
            print(f"      Credits remaining: {result['credits']}")
        if result["error"]:
            print(f"      Error: {result['error']}")
    print(f"\n  Summary: {openrouter_working}/{len(OPENROUTER_API_KEYS)} working")

    # Other single keys
    print("\n🔑 OTHER API KEYS")
    print("-" * 40)
    print(f"  Mistral: {'✅ Configured' if MISTRAL_API_KEY else '❌ Not configured'}")
    print(f"  DeepSeek: {'✅ Configured' if DEEPSEEK_API_KEY else '❌ Not configured'}")

    # Summary and recommendations
    print("\n" + "=" * 60)
    print("📊 SUMMARY & RECOMMENDATIONS")
    print("=" * 60)

    total_working = gemini_working + groq_working + cerebras_working + sambanova_working + openrouter_working
    total_keys = len(GEMINI_API_KEYS) + len(GROQ_API_KEYS) + len(CEREBRAS_API_KEYS) + len(SAMBANOVA_API_KEYS) + len(OPENROUTER_API_KEYS)

    print(f"\nTotal working keys: {total_working}/{total_keys}")

    if gemini_working == 0 and quota_status.get("exists"):
        print("\n⚠️  ISSUE: All Gemini keys blocked by quota file")
        print("   FIX: Delete config/.gemini_quota_exhausted")
        print("   CMD: del config\\.gemini_quota_exhausted")

    if gemini_working == 0 and not quota_status.get("exists"):
        print("\n⚠️  ISSUE: All Gemini keys exhausted or invalid")
        print("   The quotas are PER GCP PROJECT, not per key!")
        print("   If all keys are from same project = same quota")
        print("   FIX: Create keys from DIFFERENT GCP projects")

    if groq_working == 0:
        print("\n⚠️  ISSUE: All Groq keys exhausted")
        print("   Groq: 100k tokens/day per account")
        print("   FIX: Wait until midnight PST for reset")

    print("\n💡 QUOTA TIPS:")
    print("   • Gemini: 5 RPM, ~100 req/day per PROJECT (not key!)")
    print("   • Groq: 30 RPM, 100k tokens/day per account")
    print("   • Cerebras: Very generous, rarely exhausted")
    print("   • SambaNova: 20-30 RPM, no daily limit")
    print("   • OpenRouter: 50 req/day (free), varies with credits")

    print("\n" + "=" * 60)


if __name__ == "__main__":
    main()
