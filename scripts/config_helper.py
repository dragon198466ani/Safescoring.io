#!/usr/bin/env python3
"""
SAFESCORING - Configuration Helper for Scripts

This module provides a simple way for scripts to access the centralized
configuration from src/core/config.py without path manipulation.

Usage in any script:
    from config_helper import (
        SUPABASE_URL, SUPABASE_KEY, SUPABASE_HEADERS,
        get_supabase_headers, MISTRAL_API_KEY, GROQ_API_KEY
    )

This replaces all hardcoded credentials and duplicate load_config() functions.
"""

import sys
import os

# Add project root to path
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

# Re-export everything from centralized config
from src.core.config import (
    # Config loader
    load_config,
    CONFIG,

    # Supabase
    SUPABASE_URL,
    SUPABASE_KEY,
    SUPABASE_HEADERS,
    get_supabase_headers,

    # AI API Keys
    MISTRAL_API_KEY,
    GEMINI_API_KEY,
    GEMINI_API_KEYS,
    CLAUDE_API_KEY,
    DEEPSEEK_API_KEY,
    GROQ_API_KEY,
    GROQ_API_KEYS,
    CEREBRAS_API_KEY,
    CEREBRAS_API_KEYS,
    SAMBANOVA_API_KEY,
    SAMBANOVA_API_KEYS,
    OPENROUTER_API_KEY,
    OPENROUTER_API_KEYS,
    OPENROUTER_MODEL,
    TOGETHER_API_KEY,

    # Ollama (local)
    OLLAMA_URL,
    OLLAMA_MODEL,
    OLLAMA_MODEL_FAST,
    OLLAMA_MODEL_DEEPSEEK,

    # Key getters
    get_gemini_keys,
    get_groq_keys,
    get_cerebras_keys,
    get_sambanova_keys,
    get_openrouter_keys,
)

# Convenience function for scripts that just need Supabase
def get_db_connection():
    """
    Returns a tuple of (SUPABASE_URL, headers) for quick database access.

    Usage:
        url, headers = get_db_connection()
        r = requests.get(f'{url}/rest/v1/products', headers=headers)
    """
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError(
            "Supabase configuration missing. "
            "Please check config/.env has NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
        )
    return SUPABASE_URL, get_supabase_headers()


def verify_config(*required_keys):
    """
    Verify that required configuration keys are present.

    Usage:
        verify_config('SUPABASE_URL', 'MISTRAL_API_KEY')

    Raises ValueError if any key is missing.
    """
    missing = []
    config_map = {
        'SUPABASE_URL': SUPABASE_URL,
        'SUPABASE_KEY': SUPABASE_KEY,
        'MISTRAL_API_KEY': MISTRAL_API_KEY,
        'GEMINI_API_KEY': GEMINI_API_KEY,
        'GROQ_API_KEY': GROQ_API_KEY,
        'DEEPSEEK_API_KEY': DEEPSEEK_API_KEY,
        'CLAUDE_API_KEY': CLAUDE_API_KEY,
        'SAMBANOVA_API_KEY': SAMBANOVA_API_KEY,
        'OPENROUTER_API_KEY': OPENROUTER_API_KEY,
    }

    for key in required_keys:
        if key in config_map and not config_map[key]:
            missing.append(key)

    if missing:
        raise ValueError(
            f"Missing required configuration: {', '.join(missing)}. "
            f"Please check config/.env"
        )


# Print config status when run directly
if __name__ == '__main__':
    print("SafeScoring Configuration Status")
    print("=" * 50)
    print(f"Supabase URL: {'OK' if SUPABASE_URL else 'MISSING'}")
    print(f"Supabase Key: {'OK' if SUPABASE_KEY else 'MISSING'}")
    print()
    print("AI Providers:")
    print(f"  Mistral:    {'OK' if MISTRAL_API_KEY else 'MISSING'}")
    print(f"  Gemini:     {len(GEMINI_API_KEYS)} key(s)")
    print(f"  Groq:       {len(GROQ_API_KEYS)} key(s)")
    print(f"  DeepSeek:   {'OK' if DEEPSEEK_API_KEY else 'MISSING'}")
    print(f"  Claude:     {'OK' if CLAUDE_API_KEY else 'MISSING'}")
    print(f"  SambaNova:  {len(SAMBANOVA_API_KEYS)} key(s)")
    print(f"  OpenRouter: {len(OPENROUTER_API_KEYS)} key(s)")
    print(f"  Together:   {'OK' if TOGETHER_API_KEY else 'MISSING'}")
    print(f"  Ollama:     {OLLAMA_URL}")
