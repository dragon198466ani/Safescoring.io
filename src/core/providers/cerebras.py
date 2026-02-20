"""
Cerebras Provider Implementation

Cerebras provides fast Llama inference.
"""

import requests
from typing import Optional
from .base import BaseProvider


class CerebrasProvider(BaseProvider):
    """
    Cerebras AI Provider (Llama 3.3 70B)

    Features:
    - Fast inference
    - Good quota
    - Multi-key rotation support
    """

    name = "cerebras"
    display_name = "Cerebras"

    DEFAULT_MODEL = "llama-3.3-70b"
    BASE_URL = "https://api.cerebras.ai/v1/chat/completions"

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
        """Make API call to Cerebras."""
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
        """Parse Cerebras response (OpenAI-compatible format)."""
        data = response.json()
        return data["choices"][0]["message"]["content"]


def create_cerebras_provider(api_keys: list = None) -> CerebrasProvider:
    """Factory function to create Cerebras provider with config keys."""
    from ..config import CEREBRAS_API_KEYS
    keys = api_keys or CEREBRAS_API_KEYS
    return CerebrasProvider(api_keys=keys)
