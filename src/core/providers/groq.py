"""
Groq Provider Implementation

Groq provides ultra-fast inference for Llama models.
Free tier: 14,400 requests/day per key.
"""

import requests
from typing import Optional
from .base import BaseProvider


class GroqProvider(BaseProvider):
    """
    Groq AI Provider (Llama 3.3 70B)

    Features:
    - Ultra-fast inference
    - Good free tier quota
    - Multi-key rotation support
    """

    name = "groq"
    display_name = "Groq"

    DEFAULT_MODEL = "llama-3.3-70b-versatile"
    BASE_URL = "https://api.groq.com/openai/v1/chat/completions"

    def __init__(
        self,
        api_key: Optional[str] = None,
        api_keys: Optional[list] = None,
        model: Optional[str] = None,
        **kwargs
    ):
        super().__init__(
            api_key=api_key,
            api_keys=api_keys,
            base_url=self.BASE_URL,
            model=model or self.DEFAULT_MODEL,
            **kwargs
        )

    def _call_api(
        self,
        prompt: str,
        max_tokens: int,
        temperature: float,
        api_key: str,
    ) -> requests.Response:
        """Make API call to Groq."""
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        return self.session.post(
            self.base_url,
            headers=headers,
            json=payload,
            timeout=self.timeout,
        )

    def _parse_response(self, response: requests.Response) -> str:
        """Parse Groq response (OpenAI-compatible format)."""
        data = response.json()
        return data["choices"][0]["message"]["content"]


def create_groq_provider(api_keys: list = None) -> GroqProvider:
    """Factory function to create Groq provider with config keys."""
    from ..config import GROQ_API_KEYS
    keys = api_keys or GROQ_API_KEYS
    return GroqProvider(api_keys=keys)
