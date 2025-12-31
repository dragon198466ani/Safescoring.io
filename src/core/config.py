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
    """Load configuration from env_template_free.txt"""
    config = {}
    possible_paths = [
        os.path.join(os.path.dirname(__file__), '..', '..', 'config', 'env_template_free.txt'),
        os.path.join(os.getcwd(), 'config', 'env_template_free.txt'),
        'config/env_template_free.txt',
    ]
    for path in possible_paths:
        if os.path.exists(path):
            with open(path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, value = line.split('=', 1)
                        config[key.strip()] = value.strip()
            break
    return config


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
OLLAMA_URL = CONFIG.get('OLLAMA_URL', 'http://localhost:11434')
OLLAMA_MODEL = CONFIG.get('OLLAMA_MODEL', 'llama3.2')

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
