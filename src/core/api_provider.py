#!/usr/bin/env python3
"""
SAFESCORING.IO - AI API Provider
Centralized AI API calls with automatic fallback.
Supports: DeepSeek, Claude, Gemini, Ollama, Mistral
"""

import requests
import time
import re
from .config import (
    DEEPSEEK_API_KEY, CLAUDE_API_KEY, GEMINI_API_KEY,
    MISTRAL_API_KEY, OLLAMA_URL, OLLAMA_MODEL
)


class AIProvider:
    """
    Centralized AI API provider with automatic fallback.
    Priority order: DeepSeek -> Claude -> Gemini -> Ollama -> Mistral
    """

    def __init__(self):
        self.disabled_apis = set()  # APIs disabled due to errors (401, 402, 403)

    def call(self, prompt=None, max_tokens=4000, temperature=0.1, system_prompt=None, user_prompt=None):
        """
        Call AI with automatic fallback between APIs.
        Returns the AI response text or None if all APIs fail.

        Supports two calling styles:
        - call(prompt) - single prompt
        - call(system_prompt=..., user_prompt=...) - separate system and user prompts
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

        apis = [
            ('DeepSeek', DEEPSEEK_API_KEY, self._call_deepseek),
            ('Claude', CLAUDE_API_KEY, self._call_claude),
            ('Gemini', GEMINI_API_KEY, self._call_gemini),
            ('Ollama', True, self._call_ollama),  # Always try Ollama
            ('Mistral', MISTRAL_API_KEY, self._call_mistral),
        ]

        for api_name, api_key, api_func in apis:
            if api_key and not result and api_name not in self.disabled_apis:
                result = api_func(prompt, max_tokens, temperature)
                if result:
                    break

        return result

    def _call_deepseek(self, prompt, max_tokens=4000, temperature=0.1):
        """DeepSeek API call - excellent quality, very cheap"""
        try:
            r = requests.post(
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
            r = requests.post(
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

    def _call_gemini(self, prompt, max_tokens=4000, temperature=0.3):
        """Gemini API call"""
        try:
            r = requests.post(
                f'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key={GEMINI_API_KEY}',
                headers={'Content-Type': 'application/json'},
                json={
                    'contents': [{'parts': [{'text': prompt}]}],
                    'generationConfig': {'temperature': temperature, 'maxOutputTokens': max_tokens}
                },
                timeout=60
            )

            if r.status_code == 200:
                return r.json()['candidates'][0]['content']['parts'][0]['text']
            elif r.status_code in [401, 402, 403]:
                print(f"      Gemini HTTP {r.status_code} - DISABLED")
                self.disabled_apis.add('Gemini')
        except Exception as e:
            print(f"      Gemini error: {e}")
        return None

    def _call_ollama(self, prompt, max_tokens=2000, temperature=0.1):
        """Ollama local API call - FREE and UNLIMITED"""
        try:
            # Quick check if Ollama is running
            test = requests.get(f'{OLLAMA_URL}/api/tags', timeout=1)
            if test.status_code != 200:
                return None

            r = requests.post(
                f'{OLLAMA_URL}/api/generate',
                json={
                    'model': OLLAMA_MODEL,
                    'prompt': prompt,
                    'stream': False,
                    'options': {
                        'temperature': temperature,
                        'num_predict': max_tokens
                    }
                },
                timeout=120
            )

            if r.status_code == 200:
                return r.json().get('response', '')
        except:
            pass  # Ollama not running - silent fail
        return None

    def _call_mistral(self, prompt, max_tokens=2000, temperature=0.1):
        """Mistral API call"""
        try:
            r = requests.post(
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
    - Verbose (Gemini): "**Norme F200**\nRéponse : OUI"
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
