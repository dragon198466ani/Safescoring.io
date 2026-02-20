"""
Provider Registry

Central registry for all AI providers with automatic fallback support.
"""

from typing import Dict, List, Optional, Type
from .base import BaseProvider, ProviderError, RateLimitError, InvalidKeyError


# =============================================================================
# PROVIDER REGISTRY
# =============================================================================

class ProviderRegistry:
    """
    Central registry for all AI providers.

    Features:
    - Automatic fallback between providers
    - Priority-based provider selection
    - Health checking
    - Unified interface for all providers
    """

    # Default provider priority (free/high-quota first)
    DEFAULT_PRIORITY = [
        "gemini",
        "groq",
        "cerebras",
        "ollama",
        "deepseek",
        "mistral",
    ]

    def __init__(self, priority: List[str] = None):
        """
        Initialize the registry.

        Args:
            priority: Custom provider priority order
        """
        self.providers: Dict[str, BaseProvider] = {}
        self.priority = priority or self.DEFAULT_PRIORITY
        self._initialize_providers()

    def _initialize_providers(self):
        """Initialize all available providers."""
        from .groq import create_groq_provider
        from .cerebras import create_cerebras_provider
        from .gemini import create_gemini_provider
        from .deepseek import create_deepseek_provider
        from .mistral import create_mistral_provider
        from .ollama import create_ollama_provider

        # Try to initialize each provider
        provider_factories = {
            "groq": create_groq_provider,
            "cerebras": create_cerebras_provider,
            "gemini": create_gemini_provider,
            "deepseek": create_deepseek_provider,
            "mistral": create_mistral_provider,
            "ollama": create_ollama_provider,
        }

        for name, factory in provider_factories.items():
            try:
                provider = factory()
                if provider.is_available():
                    self.providers[name] = provider
                    print(f"[Registry] {name} provider initialized")
            except Exception as e:
                print(f"[Registry] {name} provider not available: {e}")

    def get_provider(self, name: str) -> Optional[BaseProvider]:
        """Get a specific provider by name."""
        return self.providers.get(name)

    def get_available_providers(self) -> List[str]:
        """Get list of available provider names."""
        return [
            name for name in self.priority
            if name in self.providers and self.providers[name].is_available()
        ]

    def call(
        self,
        prompt: str,
        max_tokens: int = 2000,
        temperature: float = 0.1,
        provider: str = None,
    ) -> Optional[str]:
        """
        Call a specific provider or the first available one.

        Args:
            prompt: The prompt to send
            max_tokens: Maximum tokens in response
            temperature: Sampling temperature
            provider: Specific provider name (optional)

        Returns:
            Response text or None
        """
        if provider:
            p = self.get_provider(provider)
            if p:
                return p.call(prompt, max_tokens, temperature)
            return None

        # Use first available provider
        for name in self.priority:
            p = self.get_provider(name)
            if p and p.is_available():
                result = p.call(prompt, max_tokens, temperature)
                if result:
                    return result

        return None

    def call_with_fallback(
        self,
        prompt: str,
        max_tokens: int = 2000,
        temperature: float = 0.1,
        exclude: List[str] = None,
    ) -> Optional[str]:
        """
        Call providers with automatic fallback.

        Tries each provider in priority order until one succeeds.

        Args:
            prompt: The prompt to send
            max_tokens: Maximum tokens in response
            temperature: Sampling temperature
            exclude: Provider names to exclude

        Returns:
            Response text or None if all providers fail
        """
        exclude = exclude or []

        for name in self.priority:
            if name in exclude:
                continue

            provider = self.get_provider(name)
            if not provider or not provider.is_available():
                continue

            try:
                result = provider.call(prompt, max_tokens, temperature)
                if result:
                    return result
            except RateLimitError:
                print(f"[Registry] {name} rate limited, trying next...")
                continue
            except InvalidKeyError:
                print(f"[Registry] {name} invalid key, trying next...")
                continue
            except ProviderError as e:
                print(f"[Registry] {name} error: {e}, trying next...")
                continue

        print("[Registry] All providers failed")
        return None

    def get_stats(self) -> Dict[str, dict]:
        """Get statistics for all providers."""
        return {
            name: provider.get_stats()
            for name, provider in self.providers.items()
        }

    def reset_all(self):
        """Reset all provider states (disabled keys, etc.)."""
        for provider in self.providers.values():
            provider.reset_disabled_keys()


# =============================================================================
# CONVENIENCE FUNCTIONS
# =============================================================================

# Global registry instance
_registry: Optional[ProviderRegistry] = None


def get_registry() -> ProviderRegistry:
    """Get or create the global registry instance."""
    global _registry
    if _registry is None:
        _registry = ProviderRegistry()
    return _registry


def get_provider(name: str) -> Optional[BaseProvider]:
    """Get a specific provider by name."""
    return get_registry().get_provider(name)


def get_available_providers() -> List[str]:
    """Get list of available provider names."""
    return get_registry().get_available_providers()


def call_ai(
    prompt: str,
    max_tokens: int = 2000,
    temperature: float = 0.1,
    provider: str = None,
) -> Optional[str]:
    """
    Convenience function to call AI with automatic fallback.

    Args:
        prompt: The prompt to send
        max_tokens: Maximum tokens in response
        temperature: Sampling temperature
        provider: Specific provider name (optional)

    Returns:
        Response text or None
    """
    registry = get_registry()
    if provider:
        return registry.call(prompt, max_tokens, temperature, provider)
    return registry.call_with_fallback(prompt, max_tokens, temperature)


# =============================================================================
# TASK-SPECIFIC HELPERS
# =============================================================================

def call_for_evaluation(prompt: str, complexity: str = "moderate") -> Optional[str]:
    """
    Call AI for norm evaluation.

    Uses appropriate model based on complexity:
    - critical: Higher token limit, prefer Gemini
    - complex: Medium token limit
    - moderate: Standard settings
    - simple: Lower token limit, any provider
    """
    token_limits = {
        "critical": 3500,
        "complex": 2500,
        "moderate": 2000,
        "simple": 1500,
    }
    max_tokens = token_limits.get(complexity, 2000)

    # For critical evaluations, prefer Gemini
    if complexity == "critical":
        registry = get_registry()
        gemini = registry.get_provider("gemini")
        if gemini and gemini.is_available():
            result = gemini.call(prompt, max_tokens, 0.1)
            if result:
                return result

    return call_ai(prompt, max_tokens, 0.1)


def call_for_classification(prompt: str) -> Optional[str]:
    """
    Call AI for product classification.

    Uses quality-first chain: Gemini → Cerebras → Groq
    """
    registry = get_registry()

    for provider_name in ["gemini", "cerebras", "groq"]:
        provider = registry.get_provider(provider_name)
        if provider and provider.is_available():
            result = provider.call(prompt, 2000, 0.1)
            if result:
                return result

    return call_ai(prompt, 2000, 0.1)


def call_for_crypto_analysis(prompt: str) -> Optional[str]:
    """
    Call AI for crypto/smart contract analysis.

    Uses expert mode: DeepSeek (best for crypto) → Gemini → Ollama
    """
    registry = get_registry()

    for provider_name in ["deepseek", "gemini", "ollama"]:
        provider = registry.get_provider(provider_name)
        if provider and provider.is_available():
            result = provider.call(prompt, 3000, 0.1)
            if result:
                return result

    return call_ai(prompt, 3000, 0.1)
