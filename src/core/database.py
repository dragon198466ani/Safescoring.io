"""
Unified Supabase Database Client

Single source of truth for all database operations.
Provides:
- Connection pooling
- Query builder methods
- Type-safe operations
- Consistent error handling
"""

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from typing import Optional, Dict, List, Any, Union
from .config import SUPABASE_URL, SUPABASE_KEY


# =============================================================================
# DATABASE CLIENT
# =============================================================================

class SupabaseClient:
    """
    Unified Supabase database client.

    Replaces direct HTTP calls scattered across the codebase.
    Uses the PostgREST API directly for optimal performance.
    """

    _instance: Optional['SupabaseClient'] = None

    def __new__(cls):
        """Singleton pattern."""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if getattr(self, '_initialized', False):
            return
        self._initialized = True

        self.url = SUPABASE_URL
        self.key = SUPABASE_KEY
        self.rest_url = f"{self.url}/rest/v1"

        # Headers for all requests
        self.headers = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }

        # Initialize session with connection pooling
        self.session = self._create_session()

    def _create_session(self) -> requests.Session:
        """Create HTTP session with retry logic."""
        session = requests.Session()
        retry_strategy = Retry(
            total=3,
            backoff_factor=0.5,
            status_forcelist=[500, 502, 503, 504],
            allowed_methods=["GET", "POST", "PATCH", "DELETE"]
        )
        adapter = HTTPAdapter(
            pool_connections=10,
            pool_maxsize=20,
            max_retries=retry_strategy
        )
        session.mount('https://', adapter)
        session.mount('http://', adapter)
        return session

    def is_configured(self) -> bool:
        """Check if Supabase is properly configured."""
        return bool(self.url and self.key)

    # =========================================================================
    # QUERY METHODS
    # =========================================================================

    def select(
        self,
        table: str,
        columns: str = "*",
        filters: Dict[str, Any] = None,
        order: str = None,
        order_desc: bool = False,
        limit: int = None,
        offset: int = None,
        single: bool = False,
    ) -> Union[List[Dict], Dict, None]:
        """
        Select data from a table.

        Args:
            table: Table name
            columns: Columns to select (comma-separated or *)
            filters: Dict of column: value for filtering
            order: Column to order by
            order_desc: Order descending
            limit: Max rows to return
            offset: Offset for pagination
            single: Return single row (not list)

        Returns:
            List of rows, single row, or None on error
        """
        url = f"{self.rest_url}/{table}?select={columns}"

        # Add filters
        if filters:
            for col, val in filters.items():
                if isinstance(val, list):
                    url += f"&{col}=in.({','.join(str(v) for v in val)})"
                else:
                    url += f"&{col}=eq.{val}"

        # Add ordering
        if order:
            direction = ".desc" if order_desc else ".asc"
            url += f"&order={order}{direction}"

        # Add pagination
        if limit:
            url += f"&limit={limit}"
        if offset:
            url += f"&offset={offset}"

        headers = {**self.headers}
        if single:
            headers["Accept"] = "application/vnd.pgrst.object+json"

        try:
            response = self.session.get(url, headers=headers, timeout=30)
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 406 and single:
                return None  # No matching row
            else:
                print(f"[DB] Select error: {response.status_code} - {response.text[:200]}")
                return None if single else []
        except Exception as e:
            print(f"[DB] Select exception: {e}")
            return None if single else []

    def insert(
        self,
        table: str,
        data: Union[Dict, List[Dict]],
        upsert: bool = False,
        on_conflict: str = None,
    ) -> Union[List[Dict], Dict, None]:
        """
        Insert data into a table.

        Args:
            table: Table name
            data: Row or list of rows to insert
            upsert: Upsert instead of insert
            on_conflict: Columns for upsert conflict resolution

        Returns:
            Inserted row(s) or None on error
        """
        url = f"{self.rest_url}/{table}"

        headers = {**self.headers}
        if upsert:
            resolution = f"resolution=merge-duplicates"
            if on_conflict:
                resolution += f",on_conflict={on_conflict}"
            headers["Prefer"] = f"return=representation,{resolution}"

        try:
            response = self.session.post(url, headers=headers, json=data, timeout=30)
            if response.status_code in [200, 201]:
                return response.json()
            else:
                print(f"[DB] Insert error: {response.status_code} - {response.text[:200]}")
                return None
        except Exception as e:
            print(f"[DB] Insert exception: {e}")
            return None

    def update(
        self,
        table: str,
        data: Dict,
        filters: Dict[str, Any],
    ) -> Union[List[Dict], None]:
        """
        Update rows in a table.

        Args:
            table: Table name
            data: Fields to update
            filters: Dict of column: value for filtering

        Returns:
            Updated row(s) or None on error
        """
        url = f"{self.rest_url}/{table}"

        # Add filters (required for updates)
        if not filters:
            raise ValueError("Filters required for update")

        for col, val in filters.items():
            if isinstance(val, list):
                url += f"?{col}=in.({','.join(str(v) for v in val)})"
            else:
                url += f"?{col}=eq.{val}"

        try:
            response = self.session.patch(url, headers=self.headers, json=data, timeout=30)
            if response.status_code == 200:
                return response.json()
            else:
                print(f"[DB] Update error: {response.status_code} - {response.text[:200]}")
                return None
        except Exception as e:
            print(f"[DB] Update exception: {e}")
            return None

    def delete(
        self,
        table: str,
        filters: Dict[str, Any],
    ) -> bool:
        """
        Delete rows from a table.

        Args:
            table: Table name
            filters: Dict of column: value for filtering

        Returns:
            True if successful, False otherwise
        """
        url = f"{self.rest_url}/{table}"

        # Add filters (required for deletes)
        if not filters:
            raise ValueError("Filters required for delete")

        for col, val in filters.items():
            url += f"?{col}=eq.{val}"

        try:
            response = self.session.delete(url, headers=self.headers, timeout=30)
            return response.status_code in [200, 204]
        except Exception as e:
            print(f"[DB] Delete exception: {e}")
            return False

    def rpc(
        self,
        function_name: str,
        params: Dict = None,
    ) -> Any:
        """
        Call a Supabase RPC function.

        Args:
            function_name: Name of the function
            params: Function parameters

        Returns:
            Function result or None on error
        """
        url = f"{self.rest_url}/rpc/{function_name}"

        try:
            response = self.session.post(
                url,
                headers=self.headers,
                json=params or {},
                timeout=60
            )
            if response.status_code == 200:
                return response.json()
            else:
                print(f"[DB] RPC error: {response.status_code} - {response.text[:200]}")
                return None
        except Exception as e:
            print(f"[DB] RPC exception: {e}")
            return None

    # =========================================================================
    # CONVENIENCE METHODS
    # =========================================================================

    def get_by_id(self, table: str, id: Any, id_column: str = "id") -> Optional[Dict]:
        """Get a single row by ID."""
        return self.select(table, filters={id_column: id}, single=True)

    def get_all(
        self,
        table: str,
        columns: str = "*",
        order: str = None,
        limit: int = 1000,
    ) -> List[Dict]:
        """Get all rows from a table."""
        return self.select(table, columns=columns, order=order, limit=limit) or []

    def count(self, table: str, filters: Dict[str, Any] = None) -> int:
        """Count rows in a table."""
        url = f"{self.rest_url}/{table}?select=count"
        if filters:
            for col, val in filters.items():
                url += f"&{col}=eq.{val}"

        headers = {**self.headers, "Prefer": "count=exact"}

        try:
            response = self.session.head(url, headers=headers, timeout=30)
            count_range = response.headers.get("Content-Range", "*/0")
            return int(count_range.split("/")[1])
        except Exception:
            return 0

    def batch_insert(
        self,
        table: str,
        rows: List[Dict],
        batch_size: int = 100,
    ) -> int:
        """
        Insert rows in batches.

        Args:
            table: Table name
            rows: List of rows to insert
            batch_size: Rows per batch

        Returns:
            Total rows inserted
        """
        total = 0
        for i in range(0, len(rows), batch_size):
            batch = rows[i:i + batch_size]
            result = self.insert(table, batch)
            if result:
                total += len(result) if isinstance(result, list) else 1
        return total

    def batch_update(
        self,
        table: str,
        updates: List[Dict],
        id_column: str = "id",
    ) -> int:
        """
        Update multiple rows by ID.

        Args:
            table: Table name
            updates: List of dicts with id_column and fields to update
            id_column: Column name for ID matching

        Returns:
            Total rows updated
        """
        total = 0
        for update in updates:
            id_value = update.pop(id_column, None)
            if id_value and update:
                result = self.update(table, update, {id_column: id_value})
                if result:
                    total += 1
        return total


# =============================================================================
# GLOBAL INSTANCE
# =============================================================================

_client: Optional[SupabaseClient] = None


def get_db() -> SupabaseClient:
    """Get or create the global database client."""
    global _client
    if _client is None:
        _client = SupabaseClient()
    return _client


def is_db_configured() -> bool:
    """Check if database is configured."""
    return get_db().is_configured()
