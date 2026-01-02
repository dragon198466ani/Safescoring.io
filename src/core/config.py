#!/usr/bin/env python3
"""
SAFESCORING.IO - Configuration Module
Central configuration loading for all modules.
"""

import os
import sys
import io

# Fix encoding for Windows console
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')


def load_config():
    """Load configuration from .env files (config/.env has priority)"""
    config = {}

    # All possible config files (loaded in order, later files override)
    config_files = [
        os.path.join(os.path.dirname(__file__), '..', '..', 'config', 'env_template_free.txt'),
        os.path.join(os.getcwd(), 'config', 'env_template_free.txt'),
        'config/env_template_free.txt',
        os.path.join(os.path.dirname(__file__), '..', '..', 'config', '.env'),
        os.path.join(os.getcwd(), 'config', '.env'),
        'config/.env',
    ]

    for path in config_files:
        if os.path.exists(path):
            with open(path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, value = line.split('=', 1)
                        config[key.strip()] = value.strip()

    return config


def get_gemini_keys(config):
    """Extract all Gemini API keys from config (GOOGLE_API_KEY, GOOGLE_API_KEY_1, etc.)"""
    keys = []

    # Check main key
    main_key = config.get('GOOGLE_API_KEY', '')
    if main_key and main_key.startswith('AIza'):
        keys.append(main_key)

    # Check numbered keys (GOOGLE_API_KEY_1, GOOGLE_API_KEY_2, etc.)
    for i in range(1, 20):  # Support up to 20 keys
        key = config.get(f'GOOGLE_API_KEY_{i}', '')
        if key and key.startswith('AIza') and key not in keys:
            keys.append(key)

    # Also check GEMINI_API_KEY variant
    gemini_key = config.get('GOOGLE_GEMINI_API_KEY', '')
    if gemini_key and gemini_key.startswith('AIza') and gemini_key not in keys:
        keys.insert(0, gemini_key)

    return keys


def get_cerebras_keys(config):
    """Extract all Cerebras API keys from config (CEREBRAS_API_KEY, CEREBRAS_API_KEY_2, etc.)"""
    keys = []

    # Check main key
    main_key = config.get('CEREBRAS_API_KEY', '')
    if main_key and main_key.startswith('csk-'):
        keys.append(main_key)

    # Check numbered keys
    for i in range(2, 10):  # Support up to 10 keys
        key = config.get(f'CEREBRAS_API_KEY_{i}', '')
        if key and key.startswith('csk-') and key not in keys:
            keys.append(key)

    return keys


def get_groq_keys(config):
    """Extract all Groq API keys from config (GROQ_API_KEY, GROQ_API_KEY_2, etc.)"""
    keys = []

    # Check main key
    main_key = config.get('GROQ_API_KEY', '')
    if main_key and main_key.startswith('gsk_'):
        keys.append(main_key)

    # Check numbered keys
    for i in range(2, 10):  # Support up to 10 keys
        key = config.get(f'GROQ_API_KEY_{i}', '')
        if key and key.startswith('gsk_') and key not in keys:
            keys.append(key)

    return keys


# Load configuration once at import
CONFIG = load_config()

# Supabase
SUPABASE_URL = CONFIG.get('NEXT_PUBLIC_SUPABASE_URL', '')
SUPABASE_KEY = CONFIG.get('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')

# API Keys
MISTRAL_API_KEY = CONFIG.get('MISTRAL_API_KEY', '')
GEMINI_API_KEY = CONFIG.get('GOOGLE_GEMINI_API_KEY', '') or CONFIG.get('GOOGLE_API_KEY', '')
CLAUDE_API_KEY = CONFIG.get('ANTHROPIC_API_KEY', '')
DEEPSEEK_API_KEY = CONFIG.get('DEEPSEEK_API_KEY', '')
GROQ_API_KEY = CONFIG.get('GROQ_API_KEY', '')  # Free tier: 14,400 req/day
GROQ_API_KEYS = get_groq_keys(CONFIG)  # Multiple keys for rotation (3 keys = 43,200 req/day!)
CEREBRAS_API_KEY = CONFIG.get('CEREBRAS_API_KEY', '')  # Ultra-fast inference
CEREBRAS_API_KEYS = get_cerebras_keys(CONFIG)  # Multiple keys for rotation
OLLAMA_URL = CONFIG.get('OLLAMA_URL', 'http://localhost:11434')
OLLAMA_MODEL = CONFIG.get('OLLAMA_MODEL', 'qwen2.5:14b')  # Better model for crypto evaluation
OLLAMA_MODEL_FAST = CONFIG.get('OLLAMA_MODEL_FAST', 'llama3.2')  # Fast model for simple tasks
OLLAMA_MODEL_DEEPSEEK = CONFIG.get('OLLAMA_MODEL_DEEPSEEK', 'deepseek-r1:8b')  # DeepSeek reasoning model

# Multiple Gemini keys for rotation (loaded from config/.env)
GEMINI_API_KEYS = get_gemini_keys(CONFIG)

# Supabase Headers
SUPABASE_HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
}


def get_supabase_headers(prefer='return=minimal'):
    """Get Supabase headers with custom Prefer option"""
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': prefer
    }
    return headers
