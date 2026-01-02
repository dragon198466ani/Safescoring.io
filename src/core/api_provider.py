#!/usr/bin/env python3
"""
SAFESCORING.IO - AI API Provider
Centralized AI API calls with automatic fallback.
Supports: DeepSeek, Claude, Gemini (multi-key rotation), Ollama, Mistral

QUOTA HANDLING:
- Rate limit (per minute): Wait 1h05 then retry
- Daily quota exceeded: Wait 24h then retry

STRATEGIC MODEL SELECTION:
- call_for_norm(): Auto-select model based on norm complexity
- call_for_applicability(): Select model for type-based evaluation
- call_for_compatibility(): Select model for product compatibility
"""

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import time
import re
from .config import (
    DEEPSEEK_API_KEY, CLAUDE_API_KEY, GEMINI_API_KEY, GEMINI_API_KEYS,
    MISTRAL_API_KEY, GROQ_API_KEY, GROQ_API_KEYS, CEREBRAS_API_KEY, CEREBRAS_API_KEYS,
    OLLAMA_URL, OLLAMA_MODEL, OLLAMA_MODEL_FAST
)
from .ai_strategy import (
    AIModel, TaskComplexity,
    get_norm_strategy, get_applicability_strategy, get_compatibility_strategy,
    NORM_MODEL_STRATEGY, APPLICABILITY_STRATEGY
)

# Quality-first token limits by complexity
# CRITICAL: 3500 tokens (S01-S40, A01-A30, S101-S120)
# COMPLEX: 2500 tokens (S41-S90, S221-S260, A51-A110)
# MODERATE: 2000 tokens (S51-S180, general evaluation)
# SIMPLE/TRIVIAL: 1500 tokens (F, E pillars, factual checks)


class AIProvider:
    """
    Centralized AI API provider with automatic fallback.

    Priority order (optimized for rate limits):
    1. Gemini (6 keys rotation) - skip if daily quota exhausted
    2. Groq (Llama 3.3 70B) - max 3 retries on rate limit
    3. Cerebras (Llama 3.3 70B) - ultra-fast, good quota
    4. Ollama (local) - unlimited, always available
    5. Mistral - cloud backup

    Note: DeepSeek and Claude are on standby (disabled until profitable)
    """

    # Wait time when all Gemini keys are rate-limited (1h05 = 65 minutes)
    GEMINI_COOLDOWN_SECONDS = 65 * 60
    # Wait time for daily quota reset (24h + 5min buffer)
    GEMINI_DAILY_COOLDOWN_SECONDS = 24 * 60 * 60 + 5 * 60

    # File to persist Gemini quota exhaustion state
    GEMINI_QUOTA_FILE = 'config/.gemini_quota_exhausted'

    def __init__(self):
        # HTTP Connection Pooling - reuse connections for better performance
        self.session = requests.Session()
        retry_strategy = Retry(
            total=2,
            backoff_factor=0.5,
            status_forcelist=[500, 502, 503, 504],
            allowed_methods=["POST", "GET"]
        )
        adapter = HTTPAdapter(
            pool_connections=10,
            pool_maxsize=20,
            max_retries=retry_strategy
        )
        self.session.mount('https://', adapter)
        self.session.mount('http://', adapter)

        # QUALITY FIRST: DeepSeek re-enabled for crypto/smart contract tasks (excellent quality, $0.14/1M)
        # Claude still on standby (too expensive at $3/1M for bulk operations)
        self.disabled_apis = set(['Claude'])
        self.gemini_key_index = 0  # Current Gemini key index for rotation
        self.gemini_disabled_keys = set()  # Disabled Gemini keys (rate limit)
        self.gemini_invalid_keys = set()  # Invalid keys (401/403 - permanent)
        self.gemini_daily_quota_keys = set()  # Keys that hit daily quota
        self.gemini_request_count = 0  # Count requests per key
        self.retry_count = 0  # Track consecutive retries after 1h05 cooldown
        self.gemini_quota_exhausted = self._check_gemini_quota_file()  # Check persisted state
        # Cerebras key rotation
        self.cerebras_key_index = 0
        self.cerebras_disabled_keys = set()  # Keys with rate limit
        self.cerebras_invalid_keys = set()  # Invalid keys (401/403 - permanent)
        # Groq key rotation (5 keys = 72,000 req/day!)
        self.groq_key_index = 0
        self.groq_disabled_keys = set()  # Keys with rate limit
        self.groq_invalid_keys = set()  # Invalid keys (401/403 - permanent)
        self.groq_rate_limit_time = 0  # Time when all keys were rate-limited
        # Global Groq rate limiter: 30 req/min per key = 150 req/min for 5 keys
        self.groq_request_times = []  # List of request timestamps
        self.groq_max_rpm = 25 * len(GROQ_API_KEYS) if GROQ_API_KEYS else 100  # Leave some buffer

    def _check_gemini_quota_file(self):
        """Check if Gemini quota was exhausted recently (within 20h)"""
        import os
        from datetime import datetime, timedelta

        try:
            if os.path.exists(self.GEMINI_QUOTA_FILE):
                mtime = os.path.getmtime(self.GEMINI_QUOTA_FILE)
                file_time = datetime.fromtimestamp(mtime)
                if datetime.now() - file_time < timedelta(hours=20):
                    print("      [GEMINI] Quota exhausted (cached) - skipping")
                    return True
                else:
                    # File is old, remove it
                    os.remove(self.GEMINI_QUOTA_FILE)
        except Exception:
            pass
        return False

    def _mark_gemini_quota_exhausted(self):
        """Persist Gemini quota exhaustion to file"""
        import os
        try:
            os.makedirs(os.path.dirname(self.GEMINI_QUOTA_FILE), exist_ok=True)
            with open(self.GEMINI_QUOTA_FILE, 'w') as f:
                f.write(str(time.time()))
            self.gemini_quota_exhausted = True
            print("      [GEMINI] Quota journalier epuise - skip Gemini pour cette session")
        except Exception:
            pass

    def call(self, prompt=None, max_tokens=4000, temperature=0.1, system_prompt=None, user_prompt=None, model='flash'):
        """
        Call AI with automatic fallback between APIs.
        Returns the AI response text or None if all APIs fail.

        Supports two calling styles:
        - call(prompt) - single prompt
        - call(system_prompt=..., user_prompt=...) - separate system and user prompts

        Args:
            model: 'flash' (default, fast) or 'pro' (expert, slower)
        """
        # Handle both calling styles
        if prompt is None and user_prompt is not None:
            if system_prompt:
                prompt = f"{system_prompt}\n\n{user_prompt}"
            else:
                prompt = user_prompt

        if prompt is None:
            return None

        result = None

        # Priority: Gemini -> Ollama (skip Groq/Cerebras when quota exhausted to avoid rate limit waits)
        # DeepSeek/Claude on standby (disabled in __init__)
        # Gemini: skip if daily quota exhausted (don't waste time trying)
        gemini_available = len(GEMINI_API_KEYS) > 0 and not self.gemini_quota_exhausted

        # When Gemini is exhausted, go directly to Ollama (faster than waiting for Groq/Cerebras rate limits)
        if self.gemini_quota_exhausted:
            apis = [
                ('Ollama', self._check_ollama_available(), self._call_ollama),  # Local: qwen2.5:14b (fast, unlimited)
                ('Mistral', MISTRAL_API_KEY, self._call_mistral),
            ]
        else:
            groq_available = len(GROQ_API_KEYS) > 0
            cerebras_available = len(CEREBRAS_API_KEYS) > 0
            # OPTIMIZED ORDER: Gemini (quality) -> Cerebras (fastest) -> Groq -> DeepSeek (quality) -> Ollama -> Mistral
            apis = [
                ('Gemini', gemini_available, lambda p, t, temp: self._call_gemini_rotation(p, t, temp, model=model)),
                ('Cerebras', cerebras_available, self._call_cerebras_rotation),  # Faster than Groq
                ('Groq', groq_available, self._call_groq_rotation),
                ('DeepSeek', DEEPSEEK_API_KEY, self._call_deepseek),  # Quality fallback
                ('Ollama', self._check_ollama_available(), self._call_ollama),
                ('Mistral', MISTRAL_API_KEY, self._call_mistral),
            ]

        for api_name, api_key, api_func in apis:
            if api_key and not result and api_name not in self.disabled_apis:
                result = api_func(prompt, max_tokens, temperature)
                if result:
                    break

        return result

    def call_expert(self, prompt, max_tokens=4000, temperature=0.2):
        """
        Expert mode call using Gemini 2.5 Pro for critical evaluations.
        Falls back to Groq, DeepSeek or Claude if Pro quota exhausted.

        Used for:
        - Security (S) pillar evaluations
        - Adversity (A) pillar evaluations
        - TBD result reviews
        """
        # Try Gemini Pro first
        result = self._call_gemini_pro_direct(prompt, max_tokens, temperature)

        if result:
            return result

        # Fallback to Groq (free, 70B Llama)
        if GROQ_API_KEY and 'Groq' not in self.disabled_apis:
            print("      [EXPERT] Fallback to Groq (Llama 70B)...")
            result = self._call_groq(prompt, max_tokens, temperature)
            if result:
                return result

        # Fallback to DeepSeek (good for code/security)
        if DEEPSEEK_API_KEY and 'DeepSeek' not in self.disabled_apis:
            print("      [EXPERT] Fallback to DeepSeek...")
            result = self._call_deepseek(prompt, max_tokens, temperature)
            if result:
                return result

        # Final fallback to Claude (best quality)
        if CLAUDE_API_KEY and 'Claude' not in self.disabled_apis:
            print("      [EXPERT] Fallback to Claude...")
            result = self._call_claude(prompt, max_tokens, temperature)
            if result:
                return result

        return None

    # =========================================================================
    # STRATEGIC MODEL SELECTION METHODS
    # =========================================================================

    def call_for_norm(self, norm_code: str, prompt: str, max_tokens: int = None,
                      temperature: float = None, pass2_override: bool = False) -> str:
        """
        Call AI with strategic model selection based on norm complexity.
        QUALITY FIRST: Tokens and temperature auto-adjusted by complexity.

        Uses NORM_MODEL_STRATEGY to select optimal model for each norm:
        - CRITICAL norms (S01-S40, A01-A30): 3500 tokens, temp 0.1, Gemini Pro + review
        - COMPLEX norms: 2500 tokens, temp 0.15, Gemini Flash/DeepSeek
        - MODERATE norms: 2000 tokens, temp 0.2, Gemini Flash
        - SIMPLE/TRIVIAL norms: 1500 tokens, temp 0.3, Groq (FREE)

        Args:
            norm_code: Norm code like 'S01', 'A150', 'F200'
            prompt: The evaluation prompt
            max_tokens: Override auto-calculated tokens (optional)
            temperature: Override auto-calculated temperature (optional)
            pass2_override: Force second pass review (for TBD results)

        Returns:
            AI response text or None if all APIs fail
        """
        strategy = get_norm_strategy(norm_code)
        model = strategy['model']
        complexity = strategy['complexity']

        # QUALITY FIRST: Auto-adjust tokens and temperature by complexity
        if max_tokens is None:
            if complexity == TaskComplexity.CRITICAL:
                max_tokens = 3500  # Maximum detail for security-critical
            elif complexity == TaskComplexity.COMPLEX:
                max_tokens = 2500  # High detail for complex analysis
            elif complexity == TaskComplexity.MODERATE:
                max_tokens = 2000  # Standard detail
            else:  # SIMPLE, TRIVIAL
                max_tokens = 1500  # Sufficient for factual checks

        if temperature is None:
            if complexity == TaskComplexity.CRITICAL:
                temperature = 0.1  # Most deterministic for critical
            elif complexity == TaskComplexity.COMPLEX:
                temperature = 0.15  # Slightly more creative for complex reasoning
            elif complexity == TaskComplexity.MODERATE:
                temperature = 0.2  # Balanced
            else:
                temperature = 0.3  # Faster for simple factual checks

        # Select API based on model type
        result = self._call_by_model(model, prompt, max_tokens, temperature)

        # If failed, try fallback
        if not result and 'fallback' in strategy:
            fallback_model = strategy['fallback']
            result = self._call_by_model(fallback_model, prompt, max_tokens, temperature)

        # Second pass review for CRITICAL norms or TBD override
        if result and (strategy.get('pass2_review') or pass2_override):
            if complexity == TaskComplexity.CRITICAL or pass2_override:
                # Quick validation with different model
                validation_prompt = f"""Verify this evaluation is correct:

NORM: {norm_code}
EVALUATION: {result[:500]}

If the evaluation looks correct, respond with: CONFIRMED
If there's an issue, respond with: REVIEW NEEDED - [reason]
"""
                validation = self._call_by_model(AIModel.GROQ_LLAMA, validation_prompt, 200, 0.1)
                if validation and 'REVIEW NEEDED' in validation:
                    # Re-evaluate with expert model
                    result = self._call_by_model(AIModel.GEMINI_PRO, prompt, max_tokens, 0.2)

        return result

    def call_for_applicability(self, type_code: str, prompt: str,
                                max_tokens: int = 1000, temperature: float = 0.1) -> str:
        """
        Call AI for determining norm applicability based on product type.

        Uses APPLICABILITY_STRATEGY to select model for each product type.
        Falls back to default call chain if strategy model fails.

        Args:
            type_code: Product type code like 'HW_COLD', 'DEX', 'SW_MOBILE'
            prompt: The applicability evaluation prompt

        Returns:
            AI response text or None if all APIs fail
        """
        strategy = get_applicability_strategy(type_code)
        model = strategy['model']

        # _call_by_model now handles fallback internally
        result = self._call_by_model(model, prompt, max_tokens, temperature)

        return result

    def call_for_compatibility(self, type_a: str, type_b: str, prompt: str,
                                max_tokens: int = 1500, temperature: float = 0.1) -> str:
        """
        Call AI for analyzing compatibility between two product types.

        Uses COMPATIBILITY_STRATEGY to select model and criteria.
        Falls back to default call chain if strategy model fails.

        Args:
            type_a: First product type
            type_b: Second product type
            prompt: The compatibility analysis prompt

        Returns:
            AI response text or None if all APIs fail
        """
        strategy = get_compatibility_strategy(type_a, type_b)
        model = strategy['model']

        # _call_by_model now handles fallback internally
        result = self._call_by_model(model, prompt, max_tokens, temperature)

        return result

    def call_for_content(self, content_type: str, prompt: str,
                         max_tokens: int = 1500, temperature: float = 0.7) -> str:
        """
        Call AI for content generation (marketing, social media).

        QUALITY PRIORITY for content:
        1. Gemini Flash - Best for creative content, good quality
        2. DeepSeek - Excellent quality, cheap ($0.14/1M)
        3. Groq/Cerebras - Fast but less creative
        4. Ollama - Local fallback

        Args:
            content_type: Type of content ('twitter', 'linkedin', 'blog', 'educational')
            prompt: The content generation prompt
            max_tokens: Max tokens for response
            temperature: Higher for creativity (0.6-0.8)

        Returns:
            AI response text or None if all APIs fail
        """
        result = None

        # QUALITY CHAIN for content generation (creativity matters)
        # 1. Try Gemini Flash first (best for creative content)
        if len(GEMINI_API_KEYS) > 0 and not self.gemini_quota_exhausted and 'Gemini' not in self.disabled_apis:
            result = self._call_gemini_rotation(prompt, max_tokens, temperature, model='flash')
            if result:
                return result

        # 2. Try DeepSeek (excellent quality for content)
        if DEEPSEEK_API_KEY and 'DeepSeek' not in self.disabled_apis:
            result = self._call_deepseek(prompt, max_tokens, temperature)
            if result:
                return result

        # 3. Try Groq (Llama 70B - good for content)
        if len(GROQ_API_KEYS) > 0 and 'Groq' not in self.disabled_apis:
            result = self._call_groq_rotation(prompt, max_tokens, temperature)
            if result:
                return result

        # 4. Try Cerebras
        if len(CEREBRAS_API_KEYS) > 0 and 'Cerebras' not in self.disabled_apis:
            result = self._call_cerebras_rotation(prompt, max_tokens, temperature)
            if result:
                return result

        # 5. Ollama local fallback
        if self._check_ollama_available() and 'Ollama' not in self.disabled_apis:
            result = self._call_ollama(prompt, max_tokens, temperature)
            if result:
                return result

        return result

    def call_for_classification(self, prompt: str, max_tokens: int = 1500,
                                  temperature: float = 0.3) -> str:
        """
        Call AI for product type classification.

        QUALITY PRIORITY for classification (accuracy + context understanding):
        1. Gemini Flash - Best for classification with web context
        2. Groq/Cerebras - Fast and good for structured classification
        3. DeepSeek - Good reasoning
        4. Ollama - Local fallback

        Args:
            prompt: The classification prompt (includes web scraped content)
            max_tokens: Max tokens for response
            temperature: Moderate for balanced classification (0.2-0.4)

        Returns:
            AI response text or None if all APIs fail
        """
        result = None

        # QUALITY CHAIN for classification (needs context understanding)
        # 1. Try Gemini Flash first (best for classification with web context)
        if len(GEMINI_API_KEYS) > 0 and not self.gemini_quota_exhausted and 'Gemini' not in self.disabled_apis:
            result = self._call_gemini_rotation(prompt, max_tokens, temperature, model='flash')
            if result:
                return result

        # 2. Try Cerebras (fast, good for structured output)
        if len(CEREBRAS_API_KEYS) > 0 and 'Cerebras' not in self.disabled_apis:
            result = self._call_cerebras_rotation(prompt, max_tokens, temperature)
            if result:
                return result

        # 3. Try Groq (Llama 70B - good reasoning)
        if len(GROQ_API_KEYS) > 0 and 'Groq' not in self.disabled_apis:
            result = self._call_groq_rotation(prompt, max_tokens, temperature)
            if result:
                return result

        # 4. Try DeepSeek (good reasoning)
        if DEEPSEEK_API_KEY and 'DeepSeek' not in self.disabled_apis:
            result = self._call_deepseek(prompt, max_tokens, temperature)
            if result:
                return result

        # 5. Ollama local fallback
        if self._check_ollama_available() and 'Ollama' not in self.disabled_apis:
            result = self._call_ollama(prompt, max_tokens, temperature)
            if result:
                return result

        return result

    def call_for_product_compatibility(self, prompt: str, max_tokens: int = 2500,
                                        temperature: float = 0.2) -> str:
        """
        Call AI for product x product compatibility analysis.
        QUALITY FIRST: Higher tokens for detailed compatibility reasoning.

        QUALITY PRIORITY for product compatibility (needs web context + reasoning):
        1. Gemini Flash - Best for web content understanding
        2. DeepSeek - Good reasoning for integration analysis
        3. Groq/Cerebras - Fast fallback
        4. Ollama - Local fallback

        Args:
            prompt: The analysis prompt (includes web scraped content)
            max_tokens: Max tokens for response (default 2500 for quality)
            temperature: Lower for accuracy (0.2)

        Returns:
            AI response text or None if all APIs fail
        """
        result = None

        # QUALITY CHAIN for product compatibility (needs context + reasoning)
        # 1. Try Gemini Flash first (best for web content understanding)
        if len(GEMINI_API_KEYS) > 0 and not self.gemini_quota_exhausted and 'Gemini' not in self.disabled_apis:
            result = self._call_gemini_rotation(prompt, max_tokens, temperature, model='flash')
            if result:
                return result

        # 2. Try DeepSeek (good reasoning for integration analysis)
        if DEEPSEEK_API_KEY and 'DeepSeek' not in self.disabled_apis:
            result = self._call_deepseek(prompt, max_tokens, temperature)
            if result:
                return result

        # 3. Try Groq (Llama 70B - good reasoning)
        if len(GROQ_API_KEYS) > 0 and 'Groq' not in self.disabled_apis:
            result = self._call_groq_rotation(prompt, max_tokens, temperature)
            if result:
                return result

        # 4. Try Cerebras
        if len(CEREBRAS_API_KEYS) > 0 and 'Cerebras' not in self.disabled_apis:
            result = self._call_cerebras_rotation(prompt, max_tokens, temperature)
            if result:
                return result

        # 5. Ollama local fallback
        if self._check_ollama_available() and 'Ollama' not in self.disabled_apis:
            result = self._call_ollama(prompt, max_tokens, temperature)
            if result:
                return result

        return result

    def call_for_crypto_analysis(self, prompt: str, max_tokens: int = 3500,
                                  temperature: float = 0.1) -> str:
        """
        Call AI for crypto/smart contract analysis.
        QUALITY FIRST: Higher tokens for detailed crypto reasoning.

        QUALITY PRIORITY for crypto (accuracy is critical):
        1. Gemini Pro - Best reasoning for crypto
        2. DeepSeek - Excellent for code/crypto ($0.14/1M)
        3. Ollama DeepSeek-R1 - Local reasoning model
        4. Gemini Flash - Fast alternative

        Args:
            prompt: The analysis prompt
            max_tokens: Max tokens for response (default 3500 for quality)
            temperature: Lower for accuracy (0.1 for deterministic)

        Returns:
            AI response text or None if all APIs fail
        """
        result = None

        # QUALITY CHAIN for crypto analysis (accuracy is paramount)
        # 1. Try Gemini Pro first (best reasoning)
        if len(GEMINI_API_KEYS) > 0 and not self.gemini_quota_exhausted and 'Gemini' not in self.disabled_apis:
            result = self._call_gemini_rotation(prompt, max_tokens, temperature, model='pro')
            if result:
                return result

        # 2. Try DeepSeek API (excellent for crypto/code)
        if DEEPSEEK_API_KEY and 'DeepSeek' not in self.disabled_apis:
            result = self._call_deepseek(prompt, max_tokens, temperature)
            if result:
                return result

        # 3. Try Ollama DeepSeek-R1 (local reasoning model)
        if self._check_ollama_available() and 'Ollama' not in self.disabled_apis:
            result = self._call_ollama_deepseek(prompt, max_tokens, temperature)
            if result:
                return result

        # 4. Fallback to Gemini Flash
        if len(GEMINI_API_KEYS) > 0 and not self.gemini_quota_exhausted and 'Gemini' not in self.disabled_apis:
            result = self._call_gemini_rotation(prompt, max_tokens, temperature, model='flash')
            if result:
                return result

        # 5. Final fallback to Groq
        if len(GROQ_API_KEYS) > 0 and 'Groq' not in self.disabled_apis:
            result = self._call_groq_rotation(prompt, max_tokens, temperature)

        return result

    def _call_by_model(self, model: AIModel, prompt: str, max_tokens: int = 2000,
                       temperature: float = 0.1) -> str:
        """
        Internal method to call specific AI model.
        Falls back to default call chain if the specific model fails or is unavailable.

        Args:
            model: AIModel enum value
            prompt: The prompt to send
            max_tokens: Max response tokens
            temperature: Model temperature

        Returns:
            AI response text or None
        """
        result = None

        # When Gemini is exhausted, skip cloud APIs and go directly to Ollama
        if self.gemini_quota_exhausted:
            if self._check_ollama_available() and 'Ollama' not in self.disabled_apis:
                result = self._call_ollama(prompt, max_tokens, temperature)
            if result:
                return result
            # Fallback to Mistral
            if MISTRAL_API_KEY and 'Mistral' not in self.disabled_apis:
                result = self._call_mistral(prompt, max_tokens, temperature)
            return result

        # Normal mode: try specific model first
        if model == AIModel.GROQ_LLAMA:
            if len(GROQ_API_KEYS) > 0 and 'Groq' not in self.disabled_apis:
                result = self._call_groq_rotation(prompt, max_tokens, temperature)

        elif model == AIModel.GEMINI_FLASH:
            if len(GEMINI_API_KEYS) > 0 and 'Gemini' not in self.disabled_apis:
                result = self._call_gemini_rotation(prompt, max_tokens, temperature, model='flash')

        elif model == AIModel.GEMINI_PRO:
            if len(GEMINI_API_KEYS) > 0 and 'Gemini' not in self.disabled_apis:
                result = self._call_gemini_rotation(prompt, max_tokens, temperature, model='pro')

        elif model == AIModel.DEEPSEEK:
            if DEEPSEEK_API_KEY and 'DeepSeek' not in self.disabled_apis:
                result = self._call_deepseek(prompt, max_tokens, temperature)

        elif model == AIModel.CLAUDE_SONNET:
            if CLAUDE_API_KEY and 'Claude' not in self.disabled_apis:
                result = self._call_claude(prompt, max_tokens, temperature)

        elif model == AIModel.OLLAMA:
            if self._check_ollama_available() and 'Ollama' not in self.disabled_apis:
                result = self._call_ollama(prompt, max_tokens, temperature)

        elif model == AIModel.OLLAMA_DEEPSEEK:
            if self._check_ollama_available() and 'Ollama' not in self.disabled_apis:
                result = self._call_ollama_deepseek(prompt, max_tokens, temperature)

        # If model succeeded, return result
        if result:
            return result

        # If specified model failed or unavailable, use default call chain (fallback)
        return self.call(prompt, max_tokens, temperature)

    def get_model_for_norm(self, norm_code: str) -> str:
        """
        Get the recommended model name for a specific norm.
        Useful for logging and debugging.

        Args:
            norm_code: Norm code like 'S01', 'F200'

        Returns:
            Model name string
        """
        strategy = get_norm_strategy(norm_code)
        return strategy['model'].value

    # =========================================================================
    # END STRATEGIC METHODS
    # =========================================================================

    def _call_gemini_pro_direct(self, prompt, max_tokens=4000, temperature=0.2):
        """
        Direct call to Gemini 2.5 Pro (expert model).
        Uses first available key, no rotation to preserve Pro quota.
        """
        if not GEMINI_API_KEYS:
            return None

        # Use first valid key for Pro
        for api_key in GEMINI_API_KEYS:
            if api_key in self.gemini_invalid_keys:
                continue

            try:
                time.sleep(1.5)  # Slower rate for Pro

                r = self.session.post(
                    f'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro-preview-06-05:generateContent?key={api_key}',
                    headers={'Content-Type': 'application/json'},
                    json={
                        'contents': [{'parts': [{'text': prompt}]}],
                        'generationConfig': {'temperature': temperature, 'maxOutputTokens': max_tokens}
                    },
                    timeout=120  # Longer timeout for Pro (thinking model)
                )

                if r.status_code == 200:
                    return r.json()['candidates'][0]['content']['parts'][0]['text']
                elif r.status_code == 429:
                    print(f"      [EXPERT] Gemini Pro quota exceeded")
                    continue  # Try next key
                elif r.status_code in [401, 403]:
                    self.gemini_invalid_keys.add(api_key)
                    continue

            except Exception as e:
                print(f"      [EXPERT] Gemini Pro error: {e}")
                continue

        return None

    def _call_groq_rotation(self, prompt, max_tokens=4000, temperature=0.1):
        """
        Groq API call with multi-key rotation.
        5 keys = 72,000 req/day (14,400 × 5)!
        Uses Llama 3.3 70B - quality comparable to GPT-4

        If all keys are rate-limited, falls back to next provider (Cerebras).
        Rate-limited keys reset after 60 seconds.
        """
        if not GROQ_API_KEYS:
            return None

        # Get valid keys (exclude permanently invalid ones)
        valid_keys = [k for k in GROQ_API_KEYS if k not in self.groq_invalid_keys]
        if not valid_keys:
            print("      All Groq keys invalid - DISABLED", flush=True)
            self.disabled_apis.add('Groq')
            return None

        # Check if we should reset rate-limited keys (after 60 seconds)
        if self.groq_rate_limit_time > 0:
            elapsed = time.time() - self.groq_rate_limit_time
            if elapsed >= 60:
                # Reset rate-limited keys
                self.groq_disabled_keys = self.groq_invalid_keys.copy()
                self.groq_rate_limit_time = 0
                print("      Groq rate limit reset - retrying keys", flush=True)

        # Get available keys (exclude rate-limited ones)
        available_keys = [k for k in valid_keys if k not in self.groq_disabled_keys]

        if not available_keys:
            # All keys rate-limited - wait 60s and retry instead of falling back to poor quality models
            elapsed = time.time() - self.groq_rate_limit_time if self.groq_rate_limit_time > 0 else 0
            wait_time = max(1, 60 - int(elapsed))

            if self.groq_rate_limit_time == 0:
                self.groq_rate_limit_time = time.time()
                wait_time = 60

            print(f"      Groq all keys rate-limited - waiting {wait_time}s...", flush=True)
            time.sleep(wait_time)

            # Reset rate-limited keys and retry
            self.groq_disabled_keys = self.groq_invalid_keys.copy()
            self.groq_rate_limit_time = 0
            available_keys = [k for k in valid_keys if k not in self.groq_disabled_keys]

        # Try each available key
        attempts = 0
        while attempts < len(GROQ_API_KEYS):
            if self.groq_key_index >= len(GROQ_API_KEYS):
                self.groq_key_index = 0

            current_key = GROQ_API_KEYS[self.groq_key_index]

            # Skip disabled keys
            if current_key in self.groq_disabled_keys:
                self.groq_key_index += 1
                attempts += 1
                continue

            result = self._call_groq_single(prompt, current_key, max_tokens, temperature)
            if result:
                # Success - rotate to next key for load balancing
                self.groq_key_index += 1
                return result

            # Key failed, try next
            self.groq_key_index += 1
            attempts += 1

        # All keys tried and rate-limited - return None to fallback
        return None

    def _call_groq_single(self, prompt, api_key, max_tokens=4000, temperature=0.1):
        """Single Groq API call with specific key"""
        try:
            # Global rate limiter - clean old timestamps and check rate
            current_time = time.time()
            self.groq_request_times = [t for t in self.groq_request_times if current_time - t < 60]

            # If approaching rate limit, wait until oldest request expires
            while len(self.groq_request_times) >= self.groq_max_rpm:
                oldest = min(self.groq_request_times)
                wait_time = 60 - (current_time - oldest) + 1
                if wait_time > 0:
                    print(f"      Groq rate limit protection - waiting {int(wait_time)}s...", flush=True)
                    time.sleep(wait_time)
                current_time = time.time()
                self.groq_request_times = [t for t in self.groq_request_times if current_time - t < 60]

            # Record this request
            self.groq_request_times.append(current_time)

            r = self.session.post(
                'https://api.groq.com/openai/v1/chat/completions',
                headers={
                    'Authorization': f'Bearer {api_key}',
                    'Content-Type': 'application/json'
                },
                json={
                    'model': 'llama-3.3-70b-versatile',
                    'messages': [{'role': 'user', 'content': prompt}],
                    'temperature': temperature,
                    'max_tokens': max_tokens
                },
                timeout=90
            )

            if r.status_code == 200:
                return r.json()['choices'][0]['message']['content']
            elif r.status_code == 429:
                key_idx = GROQ_API_KEYS.index(api_key) + 1
                print(f"      Groq rate limit (key {key_idx}) - rotating to next key")
                self.groq_disabled_keys.add(api_key)
            elif r.status_code in [401, 403]:
                key_idx = GROQ_API_KEYS.index(api_key) + 1
                print(f"      Groq key {key_idx} invalid - permanently disabled")
                self.groq_disabled_keys.add(api_key)
                self.groq_invalid_keys.add(api_key)
            else:
                print(f"      Groq HTTP {r.status_code}: {r.text[:200]}")
        except Exception as e:
            print(f"      Groq error: {e}")
        return None

    def _parse_groq_reset_time(self, reset_str):
        """Parse Groq reset time like '1m26.4s' or '500ms' to seconds"""
        import re
        total_seconds = 0

        # Match minutes
        m_match = re.search(r'(\d+)m', reset_str)
        if m_match:
            total_seconds += int(m_match.group(1)) * 60

        # Match seconds (including decimal)
        s_match = re.search(r'([\d.]+)s', reset_str)
        if s_match and 'ms' not in reset_str[s_match.start():s_match.end()+2]:
            total_seconds += float(s_match.group(1))

        # Match milliseconds
        ms_match = re.search(r'(\d+)ms', reset_str)
        if ms_match:
            total_seconds += int(ms_match.group(1)) / 1000

        return int(total_seconds) if total_seconds > 0 else 60  # Default 60s

    def _call_cerebras_rotation(self, prompt, max_tokens=4000, temperature=0.1):
        """
        Cerebras API call with multi-key rotation.
        Ultra-fast inference with Llama 3.3 70B
        """
        if not CEREBRAS_API_KEYS:
            return None

        # Get valid keys (exclude permanently invalid ones)
        valid_keys = [k for k in CEREBRAS_API_KEYS if k not in self.cerebras_invalid_keys]
        if not valid_keys:
            print("      All Cerebras keys invalid - DISABLED")
            self.disabled_apis.add('Cerebras')
            return None

        # Get available keys (exclude rate-limited ones)
        available_keys = [k for k in valid_keys if k not in self.cerebras_disabled_keys]

        if not available_keys:
            # All keys rate-limited - wait briefly then reset
            print("      Cerebras all keys rate-limited - waiting 30s...")
            time.sleep(30)
            self.cerebras_disabled_keys = self.cerebras_invalid_keys.copy()
            available_keys = [k for k in valid_keys if k not in self.cerebras_disabled_keys]
            if not available_keys:
                return None

        # Try each available key
        attempts = 0
        while attempts < len(CEREBRAS_API_KEYS):
            if self.cerebras_key_index >= len(CEREBRAS_API_KEYS):
                self.cerebras_key_index = 0

            current_key = CEREBRAS_API_KEYS[self.cerebras_key_index]

            # Skip disabled keys
            if current_key in self.cerebras_disabled_keys:
                self.cerebras_key_index += 1
                attempts += 1
                continue

            result = self._call_cerebras_single(prompt, current_key, max_tokens, temperature)
            if result:
                # Success - rotate to next key for load balancing
                self.cerebras_key_index += 1
                return result

            # Key failed, try next
            self.cerebras_key_index += 1
            attempts += 1

        return None

    def _call_cerebras_single(self, prompt, api_key, max_tokens=4000, temperature=0.1):
        """Single Cerebras API call with specific key"""
        try:
            r = self.session.post(
                'https://api.cerebras.ai/v1/chat/completions',
                headers={
                    'Authorization': f'Bearer {api_key}',
                    'Content-Type': 'application/json'
                },
                json={
                    'model': 'llama-3.3-70b',
                    'messages': [{'role': 'user', 'content': prompt}],
                    'temperature': temperature,
                    'max_tokens': max_tokens
                },
                timeout=90
            )

            if r.status_code == 200:
                return r.json()['choices'][0]['message']['content']
            elif r.status_code == 429:
                key_idx = CEREBRAS_API_KEYS.index(api_key) + 1
                print(f"      Cerebras rate limit (key {key_idx}) - rotating")
                self.cerebras_disabled_keys.add(api_key)
            elif r.status_code in [401, 403]:
                key_idx = CEREBRAS_API_KEYS.index(api_key) + 1
                print(f"      Cerebras key {key_idx} invalid - permanently disabled")
                self.cerebras_disabled_keys.add(api_key)
                self.cerebras_invalid_keys.add(api_key)
            else:
                print(f"      Cerebras HTTP {r.status_code}: {r.text[:200]}")
        except Exception as e:
            print(f"      Cerebras error: {e}")
        return None

    def _call_deepseek(self, prompt, max_tokens=4000, temperature=0.1):
        """DeepSeek API call - excellent quality, very cheap"""
        try:
            r = self.session.post(
                'https://api.deepseek.com/chat/completions',
                headers={
                    'Authorization': f'Bearer {DEEPSEEK_API_KEY}',
                    'Content-Type': 'application/json'
                },
                json={
                    'model': 'deepseek-chat',
                    'messages': [{'role': 'user', 'content': prompt}],
                    'temperature': temperature,
                    'max_tokens': max_tokens
                },
                timeout=90
            )

            if r.status_code == 200:
                return r.json()['choices'][0]['message']['content']
            elif r.status_code in [401, 402, 403]:
                print(f"      DeepSeek HTTP {r.status_code} - DISABLED")
                self.disabled_apis.add('DeepSeek')
            else:
                print(f"      DeepSeek HTTP {r.status_code}: {r.text[:200]}")
        except Exception as e:
            print(f"      DeepSeek error: {e}")
        return None

    def _call_claude(self, prompt, max_tokens=4000, temperature=0.1):
        """Claude API call (Anthropic) - highest quality"""
        try:
            r = self.session.post(
                'https://api.anthropic.com/v1/messages',
                headers={
                    'x-api-key': CLAUDE_API_KEY,
                    'anthropic-version': '2023-06-01',
                    'Content-Type': 'application/json'
                },
                json={
                    'model': 'claude-sonnet-4-20250514',
                    'max_tokens': max_tokens,
                    'temperature': temperature,
                    'messages': [{'role': 'user', 'content': prompt}]
                },
                timeout=90
            )

            if r.status_code == 200:
                return r.json()['content'][0]['text']
            elif r.status_code in [401, 402, 403]:
                print(f"      Claude HTTP {r.status_code} - DISABLED")
                self.disabled_apis.add('Claude')
            else:
                print(f"      Claude HTTP {r.status_code}: {r.text[:200]}")
        except Exception as e:
            print(f"      Claude error: {e}")
        return None

    def _call_gemini_rotation(self, prompt, max_tokens=4000, temperature=0.3, model='flash'):
        """
        Gemini API call with multi-key rotation.
        Returns None on quota exhaustion to allow fallback to other APIs (Ollama, etc.)

        Args:
            model: 'flash' (default, fast, high quota) or 'pro' (gemini-2.5-pro, expert)
        """
        if not GEMINI_API_KEYS:
            return None

        # Get valid keys (exclude permanently invalid ones)
        valid_keys = [k for k in GEMINI_API_KEYS if k not in self.gemini_invalid_keys]
        if not valid_keys:
            print("      All Gemini keys invalid - DISABLED")
            self.disabled_apis.add('Gemini')
            return None

        # Check if all valid keys are disabled (rate limit or daily quota)
        available_keys = [k for k in valid_keys if k not in self.gemini_disabled_keys]

        if not available_keys:
            # All keys exhausted - check if it's daily quota (fallback to other APIs)
            daily_quota_count = len(self.gemini_daily_quota_keys - self.gemini_invalid_keys)

            if daily_quota_count >= len(valid_keys):
                # All keys hit DAILY quota -> persist and skip Gemini
                self._mark_gemini_quota_exhausted()
                return None  # Let the main call() fallback to next provider

            # Only rate limited (per minute) - wait briefly then retry once
            if self.retry_count < 1:
                print(f"      [GEMINI] Rate limit - attente 60s puis retry...")
                time.sleep(60)  # Wait 1 minute instead of 1h05
                # Reset rate-limited keys (but keep daily quota keys)
                self.gemini_disabled_keys = self.gemini_invalid_keys | self.gemini_daily_quota_keys
                self.retry_count += 1
            else:
                # Already retried - fallback to other APIs
                print("      [GEMINI] Rate limit persiste - fallback vers Ollama...")
                return None

        # Find next available key
        attempts = 0
        while attempts < len(GEMINI_API_KEYS):
            if self.gemini_key_index >= len(GEMINI_API_KEYS):
                self.gemini_key_index = 0

            current_key = GEMINI_API_KEYS[self.gemini_key_index]

            # Skip disabled keys
            if current_key in self.gemini_disabled_keys:
                self.gemini_key_index += 1
                attempts += 1
                continue

            result, quota_type = self._call_gemini_single(prompt, current_key, max_tokens, temperature, model=model)
            if result:
                # Success - reset retry count
                self.retry_count = 0
                # Rotate to next key for next call (spread load)
                self.gemini_request_count += 1
                if self.gemini_request_count >= 50:  # Rotate every 50 requests
                    self.gemini_key_index += 1
                    self.gemini_request_count = 0
                return result

            # Key failed, try next
            self.gemini_key_index += 1
            attempts += 1

        # All keys exhausted after trying - check if it's daily quota
        daily_quota_count = len(self.gemini_daily_quota_keys - self.gemini_invalid_keys)
        valid_key_count = len(GEMINI_API_KEYS) - len(self.gemini_invalid_keys)

        if daily_quota_count >= valid_key_count and valid_key_count > 0:
            # All valid keys hit daily quota - persist and skip Gemini
            self._mark_gemini_quota_exhausted()

        return None

    def _wait_for_quota_reset(self):
        """Wait 1h05 for Gemini rate limit to reset with countdown"""
        import sys
        wait_seconds = self.GEMINI_COOLDOWN_SECONDS
        print(f"\n{'='*60}")
        print(f"   RATE LIMIT GEMINI - Attente 1h05")
        print(f"   Toutes les cles ont atteint la limite par minute")
        print(f"   Reprise dans {wait_seconds//60} minutes")
        print(f"   (Tentative {self.retry_count + 1}/2 avant passage a 24h)")
        print(f"{'='*60}")

        self._countdown(wait_seconds)

        print(f"\n{'='*60}")
        print(f"   REPRISE DES ANALYSES")
        print(f"{'='*60}\n")

    def _wait_for_daily_reset(self):
        """Wait 24h for Gemini daily quota to reset with countdown"""
        import sys
        wait_seconds = self.GEMINI_DAILY_COOLDOWN_SECONDS
        hours = wait_seconds // 3600
        mins = (wait_seconds % 3600) // 60
        print(f"\n{'='*60}")
        print(f"   QUOTA JOURNALIER GEMINI ATTEINT - Attente 24h")
        print(f"   Toutes les cles ont depasse leur quota quotidien")
        print(f"   Reprise dans {hours}h{mins:02d}")
        print(f"{'='*60}")

        self._countdown(wait_seconds)

        print(f"\n{'='*60}")
        print(f"   REPRISE DES ANALYSES APRES 24H")
        print(f"{'='*60}\n")

    def _countdown(self, wait_seconds):
        """Display countdown timer"""
        import sys
        start_time = time.time()
        while True:
            elapsed = time.time() - start_time
            remaining = wait_seconds - elapsed
            if remaining <= 0:
                break

            hours = int(remaining // 3600)
            mins = int((remaining % 3600) // 60)
            secs = int(remaining % 60)

            if hours > 0:
                print(f"\r   Attente: {hours:02d}:{mins:02d}:{secs:02d} restant...   ", end='')
            else:
                print(f"\r   Attente: {mins:02d}:{secs:02d} restant...   ", end='')
            sys.stdout.flush()
            time.sleep(10)  # Update every 10 seconds

    def _call_gemini_single(self, prompt, api_key, max_tokens=4000, temperature=0.3, model='flash'):
        """
        Single Gemini API call with specific key.
        Returns: (result, quota_type) where quota_type is 'rate_limit', 'daily_quota', or None

        Args:
            model: 'flash' (gemini-2.0-flash, fast, high quota) or 'pro' (gemini-2.5-pro, expert)
        """
        try:
            # Rate limiting delay (slower for Pro)
            delay = 1.5 if model == 'pro' else 1.0
            time.sleep(delay)

            # Select model endpoint
            if model == 'pro':
                model_name = 'gemini-2.5-pro-preview-06-05'
                timeout = 120  # Pro needs more time (thinking model)
            else:
                model_name = 'gemini-2.0-flash'
                timeout = 60

            r = self.session.post(
                f'https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}',
                headers={'Content-Type': 'application/json'},
                json={
                    'contents': [{'parts': [{'text': prompt}]}],
                    'generationConfig': {'temperature': temperature, 'maxOutputTokens': max_tokens}
                },
                timeout=timeout
            )

            if r.status_code == 200:
                return r.json()['candidates'][0]['content']['parts'][0]['text'], None
            elif r.status_code == 429:
                # Check if it's daily quota or rate limit
                response_text = r.text.lower()
                key_idx = GEMINI_API_KEYS.index(api_key) + 1

                if 'quota' in response_text and ('day' in response_text or 'daily' in response_text or 'per day' in response_text):
                    # Daily quota exceeded
                    print(f"      Gemini QUOTA JOURNALIER (key {key_idx}) - marque pour 24h")
                    self.gemini_disabled_keys.add(api_key)
                    self.gemini_daily_quota_keys.add(api_key)
                    return None, 'daily_quota'
                else:
                    # Rate limit (per minute)
                    print(f"      Gemini rate limit (key {key_idx}) - rotating")
                    self.gemini_disabled_keys.add(api_key)
                    return None, 'rate_limit'
            elif r.status_code in [401, 403]:
                # Invalid key - permanent disable
                key_idx = GEMINI_API_KEYS.index(api_key) + 1
                print(f"      Gemini key {key_idx} invalid - permanently disabled")
                self.gemini_disabled_keys.add(api_key)
                self.gemini_invalid_keys.add(api_key)
            elif r.status_code == 400:
                # Bad request - might be content issue, not key issue
                print(f"      Gemini HTTP 400: {r.text[:100]}")
            else:
                print(f"      Gemini HTTP {r.status_code}")
        except Exception as e:
            print(f"      Gemini error: {e}")
        return None, None

    def _call_gemini(self, prompt, max_tokens=4000, temperature=0.3):
        """Legacy single-key Gemini call (fallback)"""
        if GEMINI_API_KEY:
            result, _ = self._call_gemini_single(prompt, GEMINI_API_KEY, max_tokens, temperature)
            return result
        return None

    def _check_ollama_available(self):
        """Check if Ollama is running and has models available"""
        try:
            r = self.session.get(f'{OLLAMA_URL}/api/tags', timeout=2)
            if r.status_code == 200:
                models = r.json().get('models', [])
                return len(models) > 0
        except (requests.exceptions.RequestException, ValueError, KeyError):
            pass  # Ollama not running or invalid response - expected in many environments
        return False

    def _call_ollama(self, prompt, max_tokens=2000, temperature=0.1, use_fast=False):
        """
        Ollama local API call - FREE and UNLIMITED

        Args:
            use_fast: Use fast model (llama3.2) instead of quality model (qwen2.5:14b)
        """
        try:
            model = OLLAMA_MODEL_FAST if use_fast else OLLAMA_MODEL

            # Check if preferred model exists, fallback to any available
            try:
                tags = self.session.get(f'{OLLAMA_URL}/api/tags', timeout=2)
                if tags.status_code == 200:
                    available = [m['name'] for m in tags.json().get('models', [])]
                    if model not in available and available:
                        # Try without tag (e.g., 'qwen2.5:14b' -> 'qwen2.5')
                        model_base = model.split(':')[0]
                        matching = [m for m in available if m.startswith(model_base)]
                        if matching:
                            model = matching[0]
                        else:
                            model = available[0]  # Use first available model
                            print(f"      [OLLAMA] Using {model} (preferred not found)")
            except (requests.exceptions.RequestException, ValueError, KeyError):
                pass  # Model check failed, continue with default

            r = self.session.post(
                f'{OLLAMA_URL}/api/generate',
                json={
                    'model': model,
                    'prompt': prompt,
                    'stream': False,
                    'options': {
                        'temperature': temperature,
                        'num_predict': max_tokens
                    }
                },
                timeout=180  # Longer timeout for local inference
            )

            if r.status_code == 200:
                response = r.json().get('response', '')
                if response:
                    print(f"      [OLLAMA] {model} OK")
                    return response
            elif r.status_code == 404:
                print(f"      [OLLAMA] Model {model} not found")
        except requests.exceptions.Timeout:
            print("      [OLLAMA] Timeout (model too slow)")
        except Exception as e:
            print(f"      [OLLAMA] Error: {e}")
        return None

    def _call_ollama_deepseek(self, prompt, max_tokens=2000, temperature=0.1):
        """
        DeepSeek via Ollama - FREE local reasoning model
        Uses deepseek-r1 which excels at complex reasoning tasks.
        """
        try:
            from .config import OLLAMA_MODEL_DEEPSEEK
            model = OLLAMA_MODEL_DEEPSEEK

            # Check if DeepSeek model exists
            try:
                tags = self.session.get(f'{OLLAMA_URL}/api/tags', timeout=2)
                if tags.status_code == 200:
                    available = [m['name'] for m in tags.json().get('models', [])]
                    if model not in available:
                        # Try to find any deepseek model
                        deepseek_models = [m for m in available if 'deepseek' in m.lower()]
                        if deepseek_models:
                            model = deepseek_models[0]
                            print(f"      [OLLAMA-DEEPSEEK] Using {model}")
                        else:
                            print(f"      [OLLAMA-DEEPSEEK] No DeepSeek model found")
                            return None
            except (requests.exceptions.RequestException, ValueError, KeyError):
                pass  # Model check failed, continue with default

            r = self.session.post(
                f'{OLLAMA_URL}/api/generate',
                json={
                    'model': model,
                    'prompt': prompt,
                    'stream': False,
                    'options': {
                        'temperature': temperature,
                        'num_predict': max_tokens
                    }
                },
                timeout=300  # DeepSeek reasoning can take longer
            )

            if r.status_code == 200:
                response = r.json().get('response', '')
                if response:
                    print(f"      [OLLAMA-DEEPSEEK] {model} OK")
                    return response
            elif r.status_code == 404:
                print(f"      [OLLAMA-DEEPSEEK] Model {model} not found")
        except requests.exceptions.Timeout:
            print("      [OLLAMA-DEEPSEEK] Timeout")
        except Exception as e:
            print(f"      [OLLAMA-DEEPSEEK] Error: {e}")
        return None

    def _call_mistral(self, prompt, max_tokens=2000, temperature=0.1):
        """Mistral API call"""
        try:
            r = self.session.post(
                'https://api.mistral.ai/v1/chat/completions',
                headers={
                    'Authorization': f'Bearer {MISTRAL_API_KEY}',
                    'Content-Type': 'application/json'
                },
                json={
                    'model': 'mistral-small-latest',
                    'messages': [{'role': 'user', 'content': prompt}],
                    'temperature': temperature,
                    'max_tokens': max_tokens
                },
                timeout=60
            )

            if r.status_code == 200:
                return r.json()['choices'][0]['message']['content']
            elif r.status_code in [401, 402, 403]:
                print(f"      Mistral HTTP {r.status_code} - DISABLED")
                self.disabled_apis.add('Mistral')
            elif r.status_code == 429:
                print("      Rate limit, waiting 5s...")
                time.sleep(5)
                return self._call_mistral(prompt, max_tokens, temperature)
            else:
                print(f"      Mistral HTTP {r.status_code}: {r.text[:200]}")
        except Exception as e:
            print(f"      Mistral error: {e}")
        return None


def parse_evaluation_response(response):
    """
    Parse AI evaluation response.
    Returns dict: {norm_code: (result, reason)}
    Handles multiple formats including multi-line responses.
    """
    evaluations = {}
    lines = response.split('\n')
    last_code = None

    for i, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue

        # Try to find a norm code on this line
        code_match = re.search(r'\b([SAFE])[-_]?(\d+)\b', line, re.IGNORECASE)
        if code_match:
            letter = code_match.group(1).upper()
            number = code_match.group(2)
            last_code = f"{letter}{number}"

        # Try to find result on same line after code, or on current line if we have a pending code
        # Pattern: look for result words, prioritizing YESp over YES
        result_match = re.search(r'\b(YESp|YES|NO|TBD|N/?A|OUI|NON)\b', line, re.IGNORECASE)

        if result_match and last_code:
            value = result_match.group(1).upper().replace('/', '')

            # Extract reason (text after the result)
            reason = ''
            rest_of_line = line[result_match.end():].strip()
            reason_clean = re.sub(r'^[\s\|\-:]+', '', rest_of_line)
            if reason_clean:
                reason = reason_clean[:200]

            # Normalize result
            if value == 'YESP':
                result = 'YESp'
            elif value in ['YES', 'OUI']:
                result = 'YES'
            elif value == 'TBD':
                result = 'TBD'
            elif value in ['NA', 'N/A']:
                result = 'TBD'  # Convert N/A to TBD for applicable norms
            elif value in ['NO', 'NON']:
                result = 'NO'
            else:
                result = 'TBD'

            # Only save if we haven't already saved this code (first match wins)
            if last_code not in evaluations:
                evaluations[last_code] = (result, reason)

            # Reset last_code after successful match to avoid re-using it
            last_code = None

    return evaluations


def parse_applicability_response(response, norms_by_code):
    """
    Parse AI applicability response.
    Returns dict: {norm_id: is_applicable}
    Supports multiple formats:
    - Strict: "S01: OUI" or "F200: NON"
    - Verbose (Gemini): "**Norme F200**\nReponse : OUI"
    """
    applicability = {}
    last_code = None  # Track last seen code for multi-line parsing

    for line in response.split('\n'):
        line = line.strip()
        if not line:
            continue

        # Try to find a norm code on this line
        code_match = re.search(r'\b([SAFE])[-_]?(\d+)\b', line, re.IGNORECASE)
        if code_match:
            letter = code_match.group(1).upper()
            number = code_match.group(2)
            last_code = f"{letter}{number}"

        # Try to find OUI/NON/YES/NO on this line
        result_match = re.search(r'\b(OUI|NON|YES|NO)\b', line, re.IGNORECASE)

        if result_match and last_code:
            value = result_match.group(1).upper()
            norm = norms_by_code.get(last_code)
            if norm and norm['id'] not in applicability:
                is_applicable = value in ['OUI', 'YES']
                applicability[norm['id']] = is_applicable
                last_code = None  # Reset after matching

    return applicability


# Global instance for convenience
ai_provider = AIProvider()
