#!/usr/bin/env python3
"""
SAFESCORING.IO - Configuration Module
Central configuration loading for all modules.
"""

import os
import sys
import io

# Note: stdout/stderr wrapping disabled as it causes issues with piped commands
# Original was causing "I/O operation on closed file" errors


def load_config():
    """Load configuration from .env files (root .env has priority)"""
    config = {}

    # All possible config files (loaded in order, later files override)
    # Root .env is loaded LAST to have highest priority
    config_files = [
        os.path.join(os.path.dirname(__file__), '..', '..', 'config', 'env_template_free.txt'),
        os.path.join(os.getcwd(), 'config', 'env_template_free.txt'),
        'config/env_template_free.txt',
        os.path.join(os.path.dirname(__file__), '..', '..', 'config', '.env'),
        os.path.join(os.getcwd(), 'config', '.env'),
        'config/.env',
        # Root .env files (highest priority)
        os.path.join(os.path.dirname(__file__), '..', '..', '.env'),
        os.path.join(os.getcwd(), '.env'),
        '.env',
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
    for i in range(1, 30):  # Support up to 30 keys
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
    for i in range(2, 30):  # Support up to 30 keys
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
    for i in range(2, 20):  # Support up to 20 keys
        key = config.get(f'GROQ_API_KEY_{i}', '')
        if key and key.startswith('gsk_') and key not in keys:
            keys.append(key)

    return keys


def get_sambanova_keys(config):
    """Extract all SambaNova API keys from config (SAMBANOVA_API_KEY, SAMBANOVA_API_KEY_2, etc.)"""
    keys = []

    # Check main key (UUID format)
    main_key = config.get('SAMBANOVA_API_KEY', '')
    if main_key and len(main_key) >= 32:  # UUID format
        keys.append(main_key)

    # Check numbered keys
    for i in range(2, 30):  # Support up to 30 keys (user has 24!)
        key = config.get(f'SAMBANOVA_API_KEY_{i}', '')
        if key and len(key) >= 32 and key not in keys:
            keys.append(key)

    return keys


def get_openrouter_keys(config):
    """Extract all OpenRouter API keys from config (OPENROUTER_API_KEY, OPENROUTER_API_KEY_2, etc.)"""
    keys = []

    # Check main key (sk-or-v1 prefix)
    main_key = config.get('OPENROUTER_API_KEY', '')
    if main_key and main_key.startswith('sk-or-'):
        keys.append(main_key)

    # Check numbered keys
    for i in range(2, 15):  # Support up to 15 keys
        key = config.get(f'OPENROUTER_API_KEY_{i}', '')
        if key and key.startswith('sk-or-') and key not in keys:
            keys.append(key)

    return keys


def get_chutes_keys(config):
    """Extract all Chutes.ai API keys from config (CHUTES_API_KEY, CHUTES_API_KEY_2, etc.)"""
    keys = []

    # Check main key (cpk_ prefix)
    main_key = config.get('CHUTES_API_KEY', '')
    if main_key and main_key.startswith('cpk_'):
        keys.append(main_key)

    # Check numbered keys
    for i in range(2, 30):  # Support up to 30 keys
        key = config.get(f'CHUTES_API_KEY_{i}', '')
        if key and key.startswith('cpk_') and key not in keys:
            keys.append(key)

    return keys


def get_cohere_keys(config):
    """Extract all Cohere API keys from config (COHERE_API_KEY, COHERE_API_KEY_2, etc.)"""
    keys = []

    # Check main key
    main_key = config.get('COHERE_API_KEY', '')
    if main_key and len(main_key) >= 20:
        keys.append(main_key)

    # Check numbered keys
    for i in range(2, 10):  # Support up to 10 keys
        key = config.get(f'COHERE_API_KEY_{i}', '')
        if key and len(key) >= 20 and key not in keys:
            keys.append(key)

    return keys


def get_nvidia_keys(config):
    """Extract all NVIDIA NIM API keys from config (NVIDIA_API_KEY, NVIDIA_API_KEY_2, etc.)"""
    keys = []

    # Check main key (nvapi- prefix)
    main_key = config.get('NVIDIA_API_KEY', '')
    if main_key and (main_key.startswith('nvapi-') or len(main_key) >= 32):
        keys.append(main_key)

    # Check numbered keys
    for i in range(2, 30):  # Support up to 30 keys
        key = config.get(f'NVIDIA_API_KEY_{i}', '')
        if key and (key.startswith('nvapi-') or len(key) >= 32) and key not in keys:
            keys.append(key)

    return keys


def get_cloudflare_keys(config):
    """Extract Cloudflare Workers AI credentials (Account ID + API Token)"""
    keys = []

    # Cloudflare needs Account ID + API Token pair
    account_id = config.get('CLOUDFLARE_ACCOUNT_ID', '')
    api_token = config.get('CLOUDFLARE_API_TOKEN', '')

    if account_id and api_token:
        keys.append({'account_id': account_id, 'api_token': api_token})

    # Check numbered keys for multiple accounts
    for i in range(2, 5):  # Support up to 5 accounts
        acc_id = config.get(f'CLOUDFLARE_ACCOUNT_ID_{i}', '')
        token = config.get(f'CLOUDFLARE_API_TOKEN_{i}', '')
        if acc_id and token:
            keys.append({'account_id': acc_id, 'api_token': token})

    return keys


# Load configuration once at import
CONFIG = load_config()

# Supabase
SUPABASE_URL = CONFIG.get('NEXT_PUBLIC_SUPABASE_URL', '')
SUPABASE_KEY = CONFIG.get('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')
SUPABASE_SERVICE_KEY = CONFIG.get('SUPABASE_SERVICE_ROLE_KEY', '')


def validate_config(require_ai=False):
    """Validate that required configuration is present.
    Call this before starting services to fail fast.

    Args:
        require_ai: If True, also require at least one AI provider key.
    """
    errors = []

    if not SUPABASE_URL:
        errors.append("NEXT_PUBLIC_SUPABASE_URL is not set")
    if not SUPABASE_KEY:
        errors.append("NEXT_PUBLIC_SUPABASE_ANON_KEY is not set")

    if require_ai:
        has_ai = any([
            CONFIG.get('MISTRAL_API_KEY', ''),
            CONFIG.get('GOOGLE_API_KEY', ''),
            CONFIG.get('DEEPSEEK_API_KEY', ''),
            CONFIG.get('GROQ_API_KEY', ''),
            CONFIG.get('CEREBRAS_API_KEY', ''),
            CONFIG.get('SAMBANOVA_API_KEY', ''),
            CONFIG.get('OPENROUTER_API_KEY', ''),
            CONFIG.get('CLAUDE_CODE_ONLY', '').lower() == 'true',
        ])
        if not has_ai:
            errors.append("No AI provider configured (set at least one API key or CLAUDE_CODE_ONLY=true)")

    if errors:
        print("[CONFIG ERROR] Missing required configuration:")
        for e in errors:
            print(f"  - {e}")
        print("\nPlease set these in config/.env or environment variables.")
        return False
    return True

# ============================================
# AI PROVIDER CONFIGURATION
# ============================================
# CLAUDE_CODE_ONLY mode: Use Claude Code CLI (subscription-based, no API key needed)
# All APIs are disabled - evaluations use Claude Code directly
CLAUDE_CODE_ONLY = CONFIG.get('CLAUDE_CODE_ONLY', 'true').lower() == 'true'

# Claude Code CLI model selection
CLAUDE_CODE_MODEL = CONFIG.get('CLAUDE_CODE_MODEL', 'sonnet')            # Default model for standard evaluations
CLAUDE_CODE_MODEL_EXPERT = CONFIG.get('CLAUDE_CODE_MODEL_EXPERT', 'opus')  # Expert review model (Pass 2, critical norms)
CLAUDE_CODE_TIMEOUT = int(CONFIG.get('CLAUDE_CODE_TIMEOUT', '300'))      # CLI timeout in seconds
CLAUDE_CODE_RPM = int(CONFIG.get('CLAUDE_CODE_RPM', '20'))              # Max requests per minute

# Claude API - DISABLED (use Claude Code CLI instead)
CLAUDE_API_KEY = ''  # No API key - use Claude Code CLI

# ============================================
# AI PROVIDER GENERAL SETTINGS
# ============================================
AI_REQUEST_TIMEOUT = int(CONFIG.get('AI_REQUEST_TIMEOUT', '90'))          # Default HTTP timeout for AI APIs
AI_MAX_RETRIES = int(CONFIG.get('AI_MAX_RETRIES', '2'))                  # HTTP retry count
AI_BACKOFF_FACTOR = float(CONFIG.get('AI_BACKOFF_FACTOR', '0.5'))        # Retry backoff multiplier
AI_POOL_CONNECTIONS = int(CONFIG.get('AI_POOL_CONNECTIONS', '10'))        # HTTP connection pool size
AI_POOL_MAXSIZE = int(CONFIG.get('AI_POOL_MAXSIZE', '20'))              # HTTP pool max connections

# ============================================
# GEMINI SETTINGS
# ============================================
GEMINI_COOLDOWN_MINUTES = int(CONFIG.get('GEMINI_COOLDOWN_MINUTES', '65'))
GEMINI_DAILY_COOLDOWN_HOURS = int(CONFIG.get('GEMINI_DAILY_COOLDOWN_HOURS', '24'))
GEMINI_QUOTA_CACHE_HOURS = int(CONFIG.get('GEMINI_QUOTA_CACHE_HOURS', '20'))
GEMINI_QUOTA_FILE = CONFIG.get('GEMINI_QUOTA_FILE', 'config/.gemini_quota_exhausted')
GEMINI_ROTATION_THRESHOLD = int(CONFIG.get('GEMINI_ROTATION_THRESHOLD', '50'))
GEMINI_PRO_MODEL = CONFIG.get('GEMINI_PRO_MODEL', 'gemini-2.5-pro-preview-06-05')
GEMINI_FLASH_MODEL = CONFIG.get('GEMINI_FLASH_MODEL', 'gemini-2.0-flash')

# ============================================
# MODEL NAMES (per provider)
# ============================================
GROQ_MODEL = CONFIG.get('GROQ_MODEL', 'llama-3.3-70b-versatile')
GROQ_RPM_PER_KEY = int(CONFIG.get('GROQ_RPM_PER_KEY', '25'))
CEREBRAS_MODEL = CONFIG.get('CEREBRAS_MODEL', 'llama-3.3-70b')
DEEPSEEK_MODEL = CONFIG.get('DEEPSEEK_MODEL', 'deepseek-chat')
CLAUDE_API_MODEL = CONFIG.get('CLAUDE_API_MODEL', 'claude-sonnet-4-20250514')
MISTRAL_MODEL = CONFIG.get('MISTRAL_MODEL', 'mistral-small-latest')

# ============================================
# TOKEN LIMITS BY COMPLEXITY
# ============================================
TOKENS_CRITICAL = int(CONFIG.get('TOKENS_CRITICAL', '3500'))    # S01-S40, A01-A30, S101-S120
TOKENS_COMPLEX = int(CONFIG.get('TOKENS_COMPLEX', '2500'))      # S41-S90, S221-S260, A51-A110
TOKENS_MODERATE = int(CONFIG.get('TOKENS_MODERATE', '2000'))    # S51-S180, general evaluation
TOKENS_SIMPLE = int(CONFIG.get('TOKENS_SIMPLE', '1500'))        # F, E pillars, factual checks

# ============================================
# TEMPERATURE BY COMPLEXITY
# ============================================
TEMP_CRITICAL = float(CONFIG.get('TEMP_CRITICAL', '0.1'))       # Most deterministic
TEMP_COMPLEX = float(CONFIG.get('TEMP_COMPLEX', '0.15'))        # Slightly creative
TEMP_MODERATE = float(CONFIG.get('TEMP_MODERATE', '0.2'))       # Balanced
TEMP_SIMPLE = float(CONFIG.get('TEMP_SIMPLE', '0.3'))           # Faster for factual

# ============================================
# EVALUATOR SETTINGS
# ============================================
EVAL_BATCH_SIZE = int(CONFIG.get('EVAL_BATCH_SIZE', '50'))              # Norms per batch
EVAL_BATCH_DELAY = float(CONFIG.get('EVAL_BATCH_DELAY', '0.5'))        # Delay between batches (seconds)
EVAL_PASS2_MAX_TOKENS = int(CONFIG.get('EVAL_PASS2_MAX_TOKENS', '2500'))
EVAL_PASS2_TEMPERATURE = float(CONFIG.get('EVAL_PASS2_TEMPERATURE', '0.15'))
EVAL_VALIDATION_TOKENS = int(CONFIG.get('EVAL_VALIDATION_TOKENS', '200'))

# ============================================
# SUPABASE PAGINATION
# ============================================
SUPABASE_PAGE_SIZE = int(CONFIG.get('SUPABASE_PAGE_SIZE', '1000'))
SUPABASE_MAX_PAGES = int(CONFIG.get('SUPABASE_MAX_PAGES', '500'))

# ============================================
# RATE LIMIT GENERAL
# ============================================
RATE_LIMIT_WINDOW_SECONDS = int(CONFIG.get('RATE_LIMIT_WINDOW_SECONDS', '60'))

# ============================================
# NARRATIVE GENERATION
# ============================================
NARRATIVE_MODEL = CONFIG.get('NARRATIVE_MODEL', 'sonnet')
NARRATIVE_EXPERT_MODEL = CONFIG.get('NARRATIVE_EXPERT_MODEL', 'sonnet')
NARRATIVE_MAX_TOKENS = int(CONFIG.get('NARRATIVE_MAX_TOKENS', '4000'))
NARRATIVE_TEMPERATURE = float(CONFIG.get('NARRATIVE_TEMPERATURE', '0.3'))
NARRATIVE_RISK_MAX_TOKENS = int(CONFIG.get('NARRATIVE_RISK_MAX_TOKENS', '3000'))
NARRATIVE_RISK_TEMPERATURE = float(CONFIG.get('NARRATIVE_RISK_TEMPERATURE', '0.2'))
NARRATIVE_ENABLED = CONFIG.get('NARRATIVE_ENABLED', 'true').lower() == 'true'
NARRATIVE_REASON_MAX_LENGTH = int(CONFIG.get('NARRATIVE_REASON_MAX_LENGTH', '500'))

# ============================================
# ALL APIs DISABLED - Using Claude Code CLI only
# No API keys needed - evaluations via Claude Code subscription
# ============================================
if CLAUDE_CODE_ONLY:
    # Disable all free APIs
    MISTRAL_API_KEY = ''
    GEMINI_API_KEY = ''
    DEEPSEEK_API_KEY = ''
    GROQ_API_KEY = ''
    GROQ_API_KEYS = []
    CEREBRAS_API_KEY = ''
    CEREBRAS_API_KEYS = []
    OLLAMA_URL = ''
    OLLAMA_MODEL = ''
    OLLAMA_MODEL_FAST = ''
    OLLAMA_MODEL_DEEPSEEK = ''
    OPENROUTER_API_KEY = ''
    OPENROUTER_API_KEYS = []
    OPENROUTER_MODEL = ''
    SAMBANOVA_API_KEY = ''
    SAMBANOVA_API_KEYS = []
    COHERE_API_KEY = ''
    COHERE_API_KEYS = []
    NVIDIA_API_KEY = ''
    NVIDIA_API_KEYS = []
    CLOUDFLARE_ACCOUNT_ID = ''
    CLOUDFLARE_API_TOKEN = ''
    CLOUDFLARE_KEYS = []
    CHUTES_API_KEY = ''
    CHUTES_API_KEYS = []
    GEMINI_API_KEYS = []
else:
    # Load free API keys (fallback mode)
    MISTRAL_API_KEY = CONFIG.get('MISTRAL_API_KEY', '')
    GEMINI_API_KEY = CONFIG.get('GOOGLE_GEMINI_API_KEY', '') or CONFIG.get('GOOGLE_API_KEY', '')
    DEEPSEEK_API_KEY = CONFIG.get('DEEPSEEK_API_KEY', '')
    GROQ_API_KEY = CONFIG.get('GROQ_API_KEY', '')
    GROQ_API_KEYS = get_groq_keys(CONFIG)
    CEREBRAS_API_KEY = CONFIG.get('CEREBRAS_API_KEY', '')
    CEREBRAS_API_KEYS = get_cerebras_keys(CONFIG)
    OLLAMA_URL = CONFIG.get('OLLAMA_URL', 'http://localhost:11434')
    OLLAMA_MODEL = CONFIG.get('OLLAMA_MODEL', 'qwen2.5:14b')
    OLLAMA_MODEL_FAST = CONFIG.get('OLLAMA_MODEL_FAST', 'llama3.2')
    OLLAMA_MODEL_DEEPSEEK = CONFIG.get('OLLAMA_MODEL_DEEPSEEK', 'deepseek-r1:32b')
    OPENROUTER_API_KEY = CONFIG.get('OPENROUTER_API_KEY', '')
    OPENROUTER_API_KEYS = get_openrouter_keys(CONFIG)
    OPENROUTER_MODEL = CONFIG.get('OPENROUTER_MODEL', 'x-ai/grok-3-mini-beta')
    SAMBANOVA_API_KEY = CONFIG.get('SAMBANOVA_API_KEY', '')
    SAMBANOVA_API_KEYS = get_sambanova_keys(CONFIG)
    COHERE_API_KEY = CONFIG.get('COHERE_API_KEY', '')
    COHERE_API_KEYS = get_cohere_keys(CONFIG)
    NVIDIA_API_KEY = CONFIG.get('NVIDIA_API_KEY', '')
    NVIDIA_API_KEYS = get_nvidia_keys(CONFIG)
    CLOUDFLARE_ACCOUNT_ID = CONFIG.get('CLOUDFLARE_ACCOUNT_ID', '')
    CLOUDFLARE_API_TOKEN = CONFIG.get('CLOUDFLARE_API_TOKEN', '')
    CLOUDFLARE_KEYS = get_cloudflare_keys(CONFIG)
    CHUTES_API_KEY = CONFIG.get('CHUTES_API_KEY', '')
    CHUTES_API_KEYS = get_chutes_keys(CONFIG)
    GEMINI_API_KEYS = get_gemini_keys(CONFIG)

# Supabase Headers
SUPABASE_HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
}


def get_supabase_headers(prefer='return=minimal', use_service_key=False):
    """Get Supabase headers with custom Prefer option.

    Args:
        prefer: Prefer header value (e.g., 'return=minimal', 'resolution=merge-duplicates')
        use_service_key: Use service role key to bypass RLS (for admin operations)
    """
    key = SUPABASE_SERVICE_KEY if use_service_key and SUPABASE_SERVICE_KEY else SUPABASE_KEY
    headers = {
        'apikey': key,
        'Authorization': f'Bearer {key}',
        'Content-Type': 'application/json',
        'Prefer': prefer
    }
    return headers
