"""
SafeScoring AI Provider Abstraction Layer

This module provides a unified interface for all AI providers:
- Groq (Llama 3.3 70B)
- Cerebras (Llama inference)
- Gemini (Google)
- DeepSeek
- Mistral
- Ollama (local)

Usage:
    from src.core.providers import ProviderRegistry, get_provider

    # Get a specific provider
    groq = get_provider("groq")
    response = groq.call("What is Bitcoin?")

    # Use the registry for automatic fallback
    registry = ProviderRegistry()
    response = registry.call_with_fallback("What is Bitcoin?")
"""

from .base import BaseProvider, ProviderError, RateLimitError, InvalidKeyError
from .registry import ProviderRegistry, get_provider, get_available_providers

__all__ = [
    "BaseProvider",
    "ProviderError",
    "RateLimitError",
    "InvalidKeyError",
    "ProviderRegistry",
    "get_provider",
    "get_available_providers",
]
