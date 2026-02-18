"""
SafeScoring API Client
"""

import requests
from typing import Optional, Dict, Any, List
from .exceptions import (
    SafeScoringError,
    AuthenticationError,
    RateLimitError,
    NotFoundError,
    ValidationError,
)


class Products:
    """Products API endpoints"""

    def __init__(self, client: "SafeScoring"):
        self._client = client

    def list(
        self,
        page: int = 1,
        limit: int = 20,
        type: Optional[str] = None,
        min_score: Optional[int] = None,
        max_score: Optional[int] = None,
        sort: str = "score",
        order: str = "desc",
    ) -> Dict[str, Any]:
        """
        List products with optional filtering.

        Args:
            page: Page number (default: 1)
            limit: Results per page (default: 20, max: 100)
            type: Filter by product type slug
            min_score: Minimum SafeScore
            max_score: Maximum SafeScore
            sort: Sort field (score, name, updated_at)
            order: Sort order (asc, desc)

        Returns:
            Dict with 'data' list and 'meta' pagination info
        """
        params = {
            "page": page,
            "limit": min(limit, 100),
            "sort": sort,
            "order": order,
        }
        if type:
            params["type"] = type
        if min_score is not None:
            params["minScore"] = min_score
        if max_score is not None:
            params["maxScore"] = max_score

        return self._client._request("GET", "/products", params=params)

    def get(
        self,
        slug: str,
        include_history: bool = False,
        include_incidents: bool = False,
    ) -> Dict[str, Any]:
        """
        Get a single product by slug.

        Args:
            slug: Product slug (e.g., "ledger-nano-x")
            include_history: Include score history
            include_incidents: Include security incidents

        Returns:
            Product data with scores and optional history/incidents
        """
        params = {}
        if include_history:
            params["includeHistory"] = "true"
        if include_incidents:
            params["includeIncidents"] = "true"

        return self._client._request("GET", f"/products/{slug}", params=params)

    def search(self, query: str, limit: int = 20) -> List[Dict[str, Any]]:
        """
        Search products by name.

        Args:
            query: Search query
            limit: Max results (default: 20)

        Returns:
            List of matching products
        """
        return self._client._request(
            "GET", "/products", params={"search": query, "limit": limit}
        )


class Incidents:
    """Incidents API endpoints"""

    def __init__(self, client: "SafeScoring"):
        self._client = client

    def list(
        self,
        severity: Optional[str] = None,
        product_slug: Optional[str] = None,
        limit: int = 20,
    ) -> Dict[str, Any]:
        """
        List security incidents.

        Args:
            severity: Filter by severity (critical, high, medium, low)
            product_slug: Filter by product
            limit: Max results

        Returns:
            Dict with incidents data
        """
        params = {"limit": limit}
        if severity:
            params["severity"] = severity
        if product_slug:
            params["product"] = product_slug

        return self._client._request("GET", "/incidents", params=params)

    def recent(self, limit: int = 5) -> List[Dict[str, Any]]:
        """Get most recent incidents"""
        result = self.list(limit=limit)
        return result.get("data", [])


class Stats:
    """Stats API endpoints"""

    def __init__(self, client: "SafeScoring"):
        self._client = client

    def get(self) -> Dict[str, Any]:
        """
        Get global statistics.

        Returns:
            Dict with totalProducts, totalNorms, avgScore, etc.
        """
        return self._client._request("GET", "/stats")

    def get_types(self) -> List[Dict[str, Any]]:
        """Get all product types with counts"""
        return self._client._request("GET", "/types")


class Alerts:
    """Alerts API endpoints (requires authentication)"""

    def __init__(self, client: "SafeScoring"):
        self._client = client

    def create(
        self,
        type: str,
        product_slug: Optional[str] = None,
        webhook_url: Optional[str] = None,
        email: Optional[str] = None,
        threshold: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Create a new alert subscription.

        Args:
            type: Alert type (score_change, threshold, incident)
            product_slug: Product to monitor (optional for global alerts)
            webhook_url: URL to receive webhook notifications
            email: Email for notifications
            threshold: Score threshold for threshold alerts

        Returns:
            Created alert data
        """
        data = {"type": type}
        if product_slug:
            data["productSlug"] = product_slug
        if webhook_url:
            data["webhookUrl"] = webhook_url
        if email:
            data["email"] = email
        if threshold is not None:
            data["threshold"] = threshold

        return self._client._request("POST", "/alerts", json=data)

    def list(self) -> List[Dict[str, Any]]:
        """List your alert subscriptions"""
        return self._client._request("GET", "/alerts")

    def delete(self, alert_id: str) -> bool:
        """Delete an alert subscription"""
        self._client._request("DELETE", f"/alerts/{alert_id}")
        return True


class SafeScoring:
    """
    SafeScoring API Client

    Args:
        api_key: Your API key (optional for public endpoints)
        base_url: API base URL (default: https://safescoring.io)
        timeout: Request timeout in seconds (default: 30)

    Example:
        client = SafeScoring(api_key="sk_live_xxx")
        product = client.products.get("ledger-nano-x")
        print(f"Score: {product['data']['score']}")
    """

    DEFAULT_BASE_URL = "https://safescoring.io"
    API_VERSION = "v1"

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: str = DEFAULT_BASE_URL,
        timeout: int = 30,
    ):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

        # Initialize endpoint handlers
        self.products = Products(self)
        self.incidents = Incidents(self)
        self.stats = Stats(self)
        self.alerts = Alerts(self)

    def _get_headers(self) -> Dict[str, str]:
        """Build request headers"""
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "safescoring-python/1.0.0",
        }
        if self.api_key:
            headers["X-API-Key"] = self.api_key
        return headers

    def _request(
        self,
        method: str,
        endpoint: str,
        params: Optional[Dict] = None,
        json: Optional[Dict] = None,
    ) -> Any:
        """Make an API request"""
        url = f"{self.base_url}/api/{self.API_VERSION}{endpoint}"

        try:
            response = requests.request(
                method=method,
                url=url,
                headers=self._get_headers(),
                params=params,
                json=json,
                timeout=self.timeout,
            )

            # Handle errors
            if response.status_code == 401:
                raise AuthenticationError(
                    "Invalid or missing API key",
                    status_code=401,
                    response=response.json() if response.text else None,
                )
            elif response.status_code == 404:
                raise NotFoundError(
                    f"Resource not found: {endpoint}",
                    status_code=404,
                    response=response.json() if response.text else None,
                )
            elif response.status_code == 429:
                retry_after = response.headers.get("Retry-After")
                raise RateLimitError(
                    "Rate limit exceeded",
                    retry_after=int(retry_after) if retry_after else None,
                    status_code=429,
                    response=response.json() if response.text else None,
                )
            elif response.status_code == 422:
                raise ValidationError(
                    "Validation error",
                    status_code=422,
                    response=response.json() if response.text else None,
                )
            elif response.status_code >= 400:
                raise SafeScoringError(
                    f"API error: {response.status_code}",
                    status_code=response.status_code,
                    response=response.json() if response.text else None,
                )

            return response.json()

        except requests.exceptions.Timeout:
            raise SafeScoringError(f"Request timeout after {self.timeout}s")
        except requests.exceptions.RequestException as e:
            raise SafeScoringError(f"Request failed: {str(e)}")

    # Convenience methods
    def get_score(self, slug: str) -> int:
        """Quick method to get just the score for a product"""
        result = self.products.get(slug)
        return result.get("data", {}).get("score")

    def compare(self, slug1: str, slug2: str) -> Dict[str, Any]:
        """Compare two products"""
        p1 = self.products.get(slug1)
        p2 = self.products.get(slug2)

        score1 = p1.get("data", {}).get("score", 0)
        score2 = p2.get("data", {}).get("score", 0)

        return {
            "product1": p1.get("data"),
            "product2": p2.get("data"),
            "winner": slug1 if score1 >= score2 else slug2,
            "scoreDiff": abs(score1 - score2),
        }

    def leaderboard(self, limit: int = 10, type: Optional[str] = None) -> List[Dict]:
        """Get top-scoring products"""
        result = self.products.list(limit=limit, type=type, sort="score", order="desc")
        return result.get("data", [])
