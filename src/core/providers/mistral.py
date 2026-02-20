"""
Mistral Provider Implementation

Mistral AI cloud provider.
"""

import requests
from typing import Optional
from .base import BaseProvider


class MistralProvider(BaseProvider):
    """
    Mistral AI Provider

    Features:
    - European AI provider
    - Good quality models
    - OpenAI-compatible API
    """

    name = "mistral"
    display_name = "Mistral AI"

    DEFAULT_MODEL = "mistral-large-latest"
    BASE_URL = "https://api.mistral.ai/v1/chat/completions"

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
        """Make API call to Mistral."""
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
        """Parse Mistral response (OpenAI-compatible format)."""
        data = response.json()
        return data["choices"][0]["message"]["content"]


def create_mistral_provider(api_key: str = None) -> MistralProvider:
    """Factory function to create Mistral provider with config key."""
    from ..config import MISTRAL_API_KEY
    key = api_key or MISTRAL_API_KEY
    return MistralProvider(api_key=key)
