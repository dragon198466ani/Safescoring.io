"""
Base Provider Abstract Class

All AI providers inherit from this base class.
Provides common functionality for:
- HTTP session management
- Error handling
- Response parsing
- Metrics tracking
"""

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any, List
import time


# =============================================================================
# EXCEPTIONS
# =============================================================================

class ProviderError(Exception):
    """Base exception for provider errors."""
    pass


class RateLimitError(ProviderError):
    """Raised when rate limit is exceeded."""
    def __init__(self, message: str, retry_after: int = 60):
        super().__init__(message)
        self.retry_after = retry_after


class InvalidKeyError(ProviderError):
    """Raised when API key is invalid."""
    pass


class QuotaExhaustedError(ProviderError):
    """Raised when daily quota is exhausted."""
    pass


# =============================================================================
# BASE PROVIDER CLASS
# =============================================================================

class BaseProvider(ABC):
    """
    Abstract base class for AI providers.

    All providers must implement:
    - _call_api(): Make the actual API call
    - _parse_response(): Parse the response into text

    Provides:
    - HTTP session with connection pooling
    - Automatic retry logic
    - Error handling
    - Metrics tracking
    """

    # Provider identification
    name: str = "base"
    display_name: str = "Base Provider"

    # Default configuration
    DEFAULT_TIMEOUT = 90
    DEFAULT_MAX_TOKENS = 2000
    DEFAULT_TEMPERATURE = 0.1

    def __init__(
        self,
        api_key: Optional[str] = None,
        api_keys: Optional[List[str]] = None,
        base_url: Optional[str] = None,
        model: Optional[str] = None,
        timeout: int = DEFAULT_TIMEOUT,
    ):
        """
        Initialize the provider.

        Args:
            api_key: Single API key
            api_keys: List of API keys for rotation
            base_url: API endpoint URL
            model: Model identifier
            timeout: Request timeout in seconds
        """
        self.api_key = api_key
        self.api_keys = api_keys or ([api_key] if api_key else [])
        self.base_url = base_url
        self.model = model
        self.timeout = timeout

        # Key rotation state
        self.current_key_index = 0
        self.disabled_keys = set()
        self.invalid_keys = set()

        # Metrics
        self.total_calls = 0
        self.successful_calls = 0
        self.failed_calls = 0
        self.total_latency_ms = 0

        # Initialize HTTP session
        self.session = self._create_session()

    def _create_session(self) -> requests.Session:
        """Create HTTP session with connection pooling and retry logic."""
        session = requests.Session()
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
        session.mount('https://', adapter)
        session.mount('http://', adapter)
        return session

    def get_current_key(self) -> Optional[str]:
        """Get the current API key, rotating if necessary."""
        available_keys = [
            k for i, k in enumerate(self.api_keys)
            if i not in self.disabled_keys and i not in self.invalid_keys
        ]
        if not available_keys:
            return None

        # Simple round-robin rotation
        key = available_keys[self.current_key_index % len(available_keys)]
        self.current_key_index = (self.current_key_index + 1) % len(available_keys)
        return key

    def mark_key_rate_limited(self, key: str, duration_seconds: int = 60):
        """Mark a key as temporarily rate limited."""
        try:
            index = self.api_keys.index(key)
            self.disabled_keys.add(index)
            # Auto-reset after duration (in a real implementation, use a scheduler)
        except ValueError:
            pass

    def mark_key_invalid(self, key: str):
        """Mark a key as permanently invalid."""
        try:
            index = self.api_keys.index(key)
            self.invalid_keys.add(index)
        except ValueError:
            pass

    def reset_disabled_keys(self):
        """Reset all temporarily disabled keys."""
        self.disabled_keys.clear()

    @abstractmethod
    def _call_api(
        self,
        prompt: str,
        max_tokens: int,
        temperature: float,
        api_key: str,
    ) -> requests.Response:
        """
        Make the actual API call. Must be implemented by subclasses.

        Args:
            prompt: The prompt to send
            max_tokens: Maximum tokens in response
            temperature: Sampling temperature
            api_key: API key to use

        Returns:
            requests.Response object
        """
        pass

    @abstractmethod
    def _parse_response(self, response: requests.Response) -> str:
        """
        Parse the API response into text. Must be implemented by subclasses.

        Args:
            response: The API response

        Returns:
            Parsed text content
        """
        pass

    def _handle_error(self, response: requests.Response, api_key: str):
        """Handle API errors and update key status."""
        status = response.status_code

        if status == 429:
            self.mark_key_rate_limited(api_key)
            raise RateLimitError(f"{self.name} rate limit exceeded", retry_after=60)

        if status in [401, 403]:
            self.mark_key_invalid(api_key)
            raise InvalidKeyError(f"{self.name} API key invalid")

        if status >= 500:
            raise ProviderError(f"{self.name} server error: {status}")

        raise ProviderError(f"{self.name} error: {status} - {response.text[:200]}")

    def call(
        self,
        prompt: str,
        max_tokens: int = DEFAULT_MAX_TOKENS,
        temperature: float = DEFAULT_TEMPERATURE,
    ) -> Optional[str]:
        """
        Call the AI provider with automatic error handling.

        Args:
            prompt: The prompt to send
            max_tokens: Maximum tokens in response
            temperature: Sampling temperature

        Returns:
            Response text or None if all attempts fail
        """
        api_key = self.get_current_key()
        if not api_key:
            print(f"[{self.name}] No available API keys")
            return None

        start_time = time.time()
        self.total_calls += 1

        try:
            response = self._call_api(prompt, max_tokens, temperature, api_key)

            if response.status_code == 200:
                result = self._parse_response(response)
                self.successful_calls += 1
                self.total_latency_ms += int((time.time() - start_time) * 1000)
                return result
            else:
                self._handle_error(response, api_key)

        except RateLimitError:
            self.failed_calls += 1
            raise
        except InvalidKeyError:
            self.failed_calls += 1
            raise
        except Exception as e:
            self.failed_calls += 1
            print(f"[{self.name}] Error: {e}")
            return None

        return None

    def call_with_retry(
        self,
        prompt: str,
        max_tokens: int = DEFAULT_MAX_TOKENS,
        temperature: float = DEFAULT_TEMPERATURE,
        max_retries: int = 3,
    ) -> Optional[str]:
        """
        Call with automatic retry on rate limit errors.

        Args:
            prompt: The prompt to send
            max_tokens: Maximum tokens in response
            temperature: Sampling temperature
            max_retries: Maximum retry attempts

        Returns:
            Response text or None if all attempts fail
        """
        for attempt in range(max_retries):
            try:
                result = self.call(prompt, max_tokens, temperature)
                if result:
                    return result
            except RateLimitError as e:
                if attempt < max_retries - 1:
                    wait_time = min(e.retry_after, 30)
                    print(f"[{self.name}] Rate limited, waiting {wait_time}s...")
                    time.sleep(wait_time)
                    self.reset_disabled_keys()
            except InvalidKeyError:
                # Try next key
                continue

        return None

    def get_stats(self) -> Dict[str, Any]:
        """Get provider statistics."""
        avg_latency = (
            self.total_latency_ms / self.successful_calls
            if self.successful_calls > 0
            else 0
        )
        return {
            "name": self.name,
            "total_calls": self.total_calls,
            "successful_calls": self.successful_calls,
            "failed_calls": self.failed_calls,
            "success_rate": (
                self.successful_calls / self.total_calls * 100
                if self.total_calls > 0
                else 0
            ),
            "average_latency_ms": int(avg_latency),
            "available_keys": len(self.api_keys) - len(self.invalid_keys),
            "disabled_keys": len(self.disabled_keys),
        }

    def is_available(self) -> bool:
        """Check if provider has available keys."""
        return bool(self.get_current_key())

    def __repr__(self) -> str:
        return f"<{self.display_name} available={self.is_available()}>"
