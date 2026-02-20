"""
SafeScoring Python SDK

Official Python SDK for the SafeScoring API - Security ratings for crypto products.

Usage:
    from safescoring import SafeScoring

    client = SafeScoring(api_key="sk_live_xxx")
    product = client.products.get("ledger-nano-x")
    print(f"{product['name']}: {product['score']}/100")
"""

__version__ = "1.0.0"
__author__ = "SafeScoring"

from .client import SafeScoring
from .exceptions import (
    SafeScoringError,
    AuthenticationError,
    RateLimitError,
    NotFoundError,
    ValidationError,
)

__all__ = [
    "SafeScoring",
    "SafeScoringError",
    "AuthenticationError",
    "RateLimitError",
    "NotFoundError",
    "ValidationError",
]
