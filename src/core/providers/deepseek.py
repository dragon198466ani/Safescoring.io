"""
DeepSeek Provider Implementation

DeepSeek provides cost-effective inference.
Price: $0.14/1M tokens (very affordable)
"""

import requests
from typing import Optional
from .base import BaseProvider


class DeepSeekProvider(BaseProvider):
    """
    DeepSeek AI Provider

    Features:
    - Very cost-effective ($0.14/1M tokens)
    - Good quality for crypto/smart contract analysis
    - OpenAI-compatible API
    """

    name = "deepseek"
    display_name = "DeepSeek"

    DEFAULT_MODEL = "deepseek-chat"
    BASE_URL = "https://api.deepseek.com/v1/chat/completions"

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        **kwargs
    ):
        super().__init__(
            api_key=api_key,
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
        """Make API call to DeepSeek."""
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
        """Parse DeepSeek response (OpenAI-compatible format)."""
        data = response.json()
        return data["choices"][0]["message"]["content"]


def create_deepseek_provider(api_key: str = None) -> DeepSeekProvider:
    """Factory function to create DeepSeek provider with config key."""
    from ..config import DEEPSEEK_API_KEY
    key = api_key or DEEPSEEK_API_KEY
    return DeepSeekProvider(api_key=key)
