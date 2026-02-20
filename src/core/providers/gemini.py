"""
Gemini Provider Implementation

Google's Gemini AI with multi-key rotation.
Free tier: 15 RPM, 1 million tokens/month per key.
"""

import requests
from typing import Optional
from .base import BaseProvider, QuotaExhaustedError


class GeminiProvider(BaseProvider):
    """
    Google Gemini AI Provider

    Features:
    - Powerful reasoning capabilities
    - Good free tier
    - Multi-key rotation support (up to 20 keys)
    """

    name = "gemini"
    display_name = "Google Gemini"

    DEFAULT_MODEL = "gemini-2.0-flash-exp"
    BASE_URL_TEMPLATE = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

    def __init__(
        self,
        api_key: Optional[str] = None,
        api_keys: Optional[list] = None,
        model: Optional[str] = None,
        **kwargs
    ):
        model = model or self.DEFAULT_MODEL
        super().__init__(
            api_key=api_key,
            api_keys=api_keys,
            base_url=self.BASE_URL_TEMPLATE.format(model=model),
            model=model,
            **kwargs
        )
        # Track daily quota exhaustion
        self.quota_exhausted_keys = set()

    def _call_api(
        self,
        prompt: str,
        max_tokens: int,
        temperature: float,
        api_key: str,
    ) -> requests.Response:
        """Make API call to Gemini."""
        url = f"{self.base_url}?key={api_key}"
        payload = {
            "contents": [
                {
                    "parts": [{"text": prompt}]
                }
            ],
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_tokens,
            }
        }
        return self.session.post(
            url,
            json=payload,
            timeout=self.timeout,
        )

    def _parse_response(self, response: requests.Response) -> str:
        """Parse Gemini response."""
        data = response.json()
        return data["candidates"][0]["content"]["parts"][0]["text"]

    def _handle_error(self, response: requests.Response, api_key: str):
        """Handle Gemini-specific errors."""
        status = response.status_code

        # Check for quota exhaustion
        if status == 429:
            try:
                error_data = response.json()
                error_message = str(error_data.get("error", {}).get("message", ""))
                if "quota" in error_message.lower() or "daily" in error_message.lower():
                    self.mark_key_quota_exhausted(api_key)
                    raise QuotaExhaustedError(f"Gemini daily quota exhausted for key")
            except ValueError:
                pass

        # Fall back to base error handling
        super()._handle_error(response, api_key)

    def mark_key_quota_exhausted(self, key: str):
        """Mark a key as having exhausted daily quota."""
        try:
            index = self.api_keys.index(key)
            self.quota_exhausted_keys.add(index)
            self.invalid_keys.add(index)  # Treat as invalid until reset
        except ValueError:
            pass

    def get_current_key(self) -> Optional[str]:
        """Get current key, excluding quota-exhausted keys."""
        available_keys = [
            k for i, k in enumerate(self.api_keys)
            if i not in self.disabled_keys
            and i not in self.invalid_keys
            and i not in self.quota_exhausted_keys
        ]
        if not available_keys:
            return None

        key = available_keys[self.current_key_index % len(available_keys)]
        self.current_key_index = (self.current_key_index + 1) % len(available_keys)
        return key

    def reset_quota(self):
        """Reset quota-exhausted keys (call after 24h)."""
        self.quota_exhausted_keys.clear()
        # Also reset from invalid_keys those that were quota-related
        self.invalid_keys -= self.quota_exhausted_keys


def create_gemini_provider(api_keys: list = None) -> GeminiProvider:
    """Factory function to create Gemini provider with config keys."""
    from ..config import GEMINI_API_KEYS
    keys = api_keys or GEMINI_API_KEYS
    return GeminiProvider(api_keys=keys)
