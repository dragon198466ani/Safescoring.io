"""
SafeScoring SDK Exceptions
"""


class SafeScoringError(Exception):
    """Base exception for SafeScoring SDK"""

    def __init__(self, message: str, status_code: int = None, response: dict = None):
        self.message = message
        self.status_code = status_code
        self.response = response
        super().__init__(self.message)


class AuthenticationError(SafeScoringError):
    """Raised when API key is invalid or missing"""
    pass


class RateLimitError(SafeScoringError):
    """Raised when rate limit is exceeded"""

    def __init__(self, message: str, retry_after: int = None, **kwargs):
        self.retry_after = retry_after
        super().__init__(message, **kwargs)


class NotFoundError(SafeScoringError):
    """Raised when a resource is not found"""
    pass


class ValidationError(SafeScoringError):
    """Raised when request validation fails"""
    pass
