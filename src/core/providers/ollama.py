"""
Ollama Provider Implementation

Local LLM inference using Ollama.
Unlimited, always available (if running locally).
"""

import requests
from typing import Optional
from .base import BaseProvider


class OllamaProvider(BaseProvider):
    """
    Ollama Local Provider

    Features:
    - Completely free (local inference)
    - No rate limits
    - Privacy-preserving
    - Requires Ollama running locally
    """

    name = "ollama"
    display_name = "Ollama (Local)"

    DEFAULT_MODEL = "llama3.2"
    DEFAULT_FAST_MODEL = "llama3.2:1b"
    DEFAULT_URL = "http://localhost:11434"

    def __init__(
        self,
        base_url: Optional[str] = None,
        model: Optional[str] = None,
        **kwargs
    ):
        # Remove api_key from kwargs if present (not needed for Ollama)
        kwargs.pop('api_key', None)
        kwargs.pop('api_keys', None)

        super().__init__(
            base_url=base_url or self.DEFAULT_URL,
            model=model or self.DEFAULT_MODEL,
            **kwargs
        )
        # Ollama doesn't need API keys
        self.api_keys = ["local"]

    def _call_api(
        self,
        prompt: str,
        max_tokens: int,
        temperature: float,
        api_key: str,  # Ignored for Ollama
    ) -> requests.Response:
        """Make API call to local Ollama."""
        url = f"{self.base_url}/api/generate"
        payload = {
            "model": self.model,
            "prompt": prompt,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens,
            },
            "stream": False,
        }
        return self.session.post(
            url,
            json=payload,
            timeout=self.timeout,
        )

    def _parse_response(self, response: requests.Response) -> str:
        """Parse Ollama response."""
        data = response.json()
        return data.get("response", "")

    def is_available(self) -> bool:
        """Check if Ollama is running locally."""
        try:
            response = self.session.get(
                f"{self.base_url}/api/tags",
                timeout=5
            )
            return response.status_code == 200
        except Exception:
            return False


def create_ollama_provider(url: str = None, model: str = None) -> OllamaProvider:
    """Factory function to create Ollama provider with config."""
    from ..config import OLLAMA_URL, OLLAMA_MODEL
    return OllamaProvider(
        base_url=url or OLLAMA_URL,
        model=model or OLLAMA_MODEL
    )
