"""
Unified Cache Manager

Single source of truth for all caching operations.
Replaces duplicated cache implementations in:
- api_provider.py (ResponseCache)
- scraper.py (ScrapingCache)
"""

import sqlite3
import hashlib
import json
import os
from threading import Lock
from datetime import datetime, timedelta
from typing import Optional, Any, Dict
from abc import ABC, abstractmethod


# =============================================================================
# CACHE INTERFACE
# =============================================================================

class CacheInterface(ABC):
    """Abstract cache interface."""

    @abstractmethod
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache."""
        pass

    @abstractmethod
    def set(self, key: str, value: Any, ttl_hours: int = 24) -> None:
        """Set value in cache with TTL."""
        pass

    @abstractmethod
    def delete(self, key: str) -> None:
        """Delete value from cache."""
        pass

    @abstractmethod
    def clear(self) -> None:
        """Clear all cache entries."""
        pass


# =============================================================================
# SQLITE CACHE IMPLEMENTATION
# =============================================================================

class SQLiteCache(CacheInterface):
    """
    SQLite-based cache with TTL support.

    Thread-safe singleton implementation.
    Supports different cache types with configurable TTLs.
    """

    _instances: Dict[str, 'SQLiteCache'] = {}
    _lock = Lock()

    # Default TTLs by cache type (in hours)
    DEFAULT_TTLS = {
        'evaluation': 24,      # AI evaluation responses
        'classification': 168, # 7 days for classifications
        'applicability': 168,  # 7 days for applicability
        'compatibility': 72,   # 3 days for compatibility
        'scrape': 168,         # 7 days for web scrapes
        'api_response': 1,     # 1 hour for general API responses
    }

    def __new__(cls, cache_name: str = 'default'):
        """Singleton per cache_name."""
        if cache_name not in cls._instances:
            with cls._lock:
                if cache_name not in cls._instances:
                    instance = super().__new__(cls)
                    instance._initialized = False
                    cls._instances[cache_name] = instance
        return cls._instances[cache_name]

    def __init__(self, cache_name: str = 'default'):
        if getattr(self, '_initialized', False):
            return

        self.cache_name = cache_name
        self._db_lock = Lock()

        # Metrics
        self.hits = 0
        self.misses = 0

        # Cache database path
        cache_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'cache')
        os.makedirs(cache_dir, exist_ok=True)
        self.db_path = os.path.join(cache_dir, f'{cache_name}_cache.db')

        self._init_db()

        # Mark as initialized AFTER all setup is complete
        self._initialized = True

    def _init_db(self):
        """Initialize SQLite database schema."""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                CREATE TABLE IF NOT EXISTS cache (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL,
                    cache_type TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    expires_at TIMESTAMP
                )
            ''')
            conn.execute('CREATE INDEX IF NOT EXISTS idx_expires ON cache(expires_at)')

            # Metrics table
            conn.execute('''
                CREATE TABLE IF NOT EXISTS metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    operation TEXT,
                    cache_type TEXT,
                    latency_ms INTEGER,
                    hit BOOLEAN,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            conn.commit()

    @staticmethod
    def _hash_key(key: str) -> str:
        """Generate hash for cache key."""
        return hashlib.sha256(key.encode('utf-8')).hexdigest()[:32]

    def get(self, key: str, cache_type: str = 'default') -> Optional[Any]:
        """
        Get value from cache if exists and not expired.

        Args:
            key: Cache key (will be hashed)
            cache_type: Type for TTL lookup

        Returns:
            Cached value or None
        """
        key_hash = self._hash_key(key)

        with self._db_lock:
            try:
                with sqlite3.connect(self.db_path) as conn:
                    cursor = conn.execute(
                        'SELECT value FROM cache WHERE key = ? AND expires_at > datetime("now")',
                        (key_hash,)
                    )
                    row = cursor.fetchone()
                    if row:
                        self.hits += 1
                        try:
                            return json.loads(row[0])
                        except json.JSONDecodeError:
                            return row[0]
            except sqlite3.Error as e:
                print(f"[Cache] Error reading: {e}")

        self.misses += 1
        return None

    def set(
        self,
        key: str,
        value: Any,
        ttl_hours: int = None,
        cache_type: str = 'default'
    ) -> None:
        """
        Set value in cache with TTL.

        Args:
            key: Cache key (will be hashed)
            value: Value to cache (will be JSON serialized)
            ttl_hours: TTL in hours (defaults by cache_type)
            cache_type: Type for default TTL lookup
        """
        key_hash = self._hash_key(key)

        # Determine TTL
        if ttl_hours is None:
            ttl_hours = self.DEFAULT_TTLS.get(cache_type, 24)

        expires_at = datetime.now() + timedelta(hours=ttl_hours)

        # Serialize value
        try:
            value_str = json.dumps(value) if not isinstance(value, str) else value
        except (TypeError, ValueError):
            value_str = str(value)

        with self._db_lock:
            try:
                with sqlite3.connect(self.db_path) as conn:
                    conn.execute('''
                        INSERT OR REPLACE INTO cache (key, value, cache_type, expires_at)
                        VALUES (?, ?, ?, ?)
                    ''', (key_hash, value_str, cache_type, expires_at))
                    conn.commit()
            except sqlite3.Error as e:
                print(f"[Cache] Error writing: {e}")

    def delete(self, key: str) -> None:
        """Delete value from cache."""
        key_hash = self._hash_key(key)

        with self._db_lock:
            try:
                with sqlite3.connect(self.db_path) as conn:
                    conn.execute('DELETE FROM cache WHERE key = ?', (key_hash,))
                    conn.commit()
            except sqlite3.Error:
                pass

    def clear(self) -> None:
        """Clear all cache entries."""
        with self._db_lock:
            try:
                with sqlite3.connect(self.db_path) as conn:
                    conn.execute('DELETE FROM cache')
                    conn.commit()
            except sqlite3.Error:
                pass

    def cleanup_expired(self) -> int:
        """Remove expired cache entries. Returns count of deleted entries."""
        with self._db_lock:
            try:
                with sqlite3.connect(self.db_path) as conn:
                    cursor = conn.execute(
                        'DELETE FROM cache WHERE expires_at < datetime("now")'
                    )
                    conn.commit()
                    return cursor.rowcount
            except sqlite3.Error:
                return 0

    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        total = self.hits + self.misses
        hit_rate = (self.hits / total * 100) if total > 0 else 0

        stats = {
            'name': self.cache_name,
            'hits': self.hits,
            'misses': self.misses,
            'hit_rate': f"{hit_rate:.1f}%",
        }

        with self._db_lock:
            try:
                with sqlite3.connect(self.db_path) as conn:
                    # Cache size
                    cursor = conn.execute(
                        'SELECT COUNT(*) FROM cache WHERE expires_at > datetime("now")'
                    )
                    stats['active_entries'] = cursor.fetchone()[0]

                    # Size by type
                    cursor = conn.execute('''
                        SELECT cache_type, COUNT(*)
                        FROM cache
                        WHERE expires_at > datetime("now")
                        GROUP BY cache_type
                    ''')
                    stats['entries_by_type'] = dict(cursor.fetchall())
            except sqlite3.Error:
                pass

        return stats


# =============================================================================
# SPECIALIZED CACHES
# =============================================================================

class ResponseCache(SQLiteCache):
    """Cache for AI API responses with metrics tracking."""

    def __new__(cls):
        return super().__new__(cls, 'ai_responses')

    def __init__(self):
        # Track if this specific init has run (not parent's _initialized)
        if getattr(self, '_metrics_initialized', False):
            return
        super().__init__('ai_responses')
        self._ensure_metrics_table()
        self._metrics_initialized = True

    def _ensure_metrics_table(self):
        """Ensure metrics table exists with correct schema."""
        # Safety check: ensure db_path exists
        if not hasattr(self, 'db_path') or not self.db_path:
            return
        with self._db_lock:
            try:
                with sqlite3.connect(self.db_path) as conn:
                    conn.execute('''
                        CREATE TABLE IF NOT EXISTS api_metrics (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            model TEXT,
                            call_type TEXT,
                            latency_ms INTEGER,
                            tokens_used INTEGER,
                            success BOOLEAN,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                        )
                    ''')
                    conn.commit()
            except sqlite3.Error:
                pass

    def get_response(self, prompt: str, model: str = '', cache_type: str = 'evaluation') -> Optional[str]:
        """Get cached AI response."""
        key = f"{model}:{prompt}"
        return super().get(key, cache_type)

    def set_response(
        self,
        prompt: str,
        response: str,
        model: str = '',
        cache_type: str = 'evaluation'
    ) -> None:
        """Cache AI response."""
        key = f"{model}:{prompt}"
        super().set(key, response, cache_type=cache_type)

    # Backwards compatible methods (match original api_provider.py ResponseCache signature)
    def get(self, prompt: str, model: str = '', cache_type: str = 'evaluation') -> Optional[str]:
        """Backwards compatible get - matches original api_provider.ResponseCache signature."""
        return self.get_response(prompt, model, cache_type)

    def set(self, prompt: str, response: str, model: str = '', cache_type: str = 'evaluation') -> None:
        """Backwards compatible set - matches original api_provider.ResponseCache signature."""
        self.set_response(prompt, response, model, cache_type)

    def record_metric(
        self,
        model: str,
        call_type: str,
        latency_ms: int,
        tokens_used: int = 0,
        success: bool = True
    ) -> None:
        """Record API call metrics for performance analysis."""
        with self._db_lock:
            try:
                with sqlite3.connect(self.db_path) as conn:
                    conn.execute('''
                        INSERT INTO api_metrics (model, call_type, latency_ms, tokens_used, success)
                        VALUES (?, ?, ?, ?, ?)
                    ''', (model, call_type, latency_ms, tokens_used, success))
                    conn.commit()
            except sqlite3.Error:
                pass

    def get_stats(self) -> Dict[str, Any]:
        """Get cache and metrics statistics."""
        stats = super().get_stats()

        with self._db_lock:
            try:
                with sqlite3.connect(self.db_path) as conn:
                    # Average latency by model (last 24h)
                    cursor = conn.execute('''
                        SELECT model, AVG(latency_ms), COUNT(*)
                        FROM api_metrics
                        WHERE created_at > datetime("now", "-1 day")
                        GROUP BY model
                    ''')
                    stats['latency_by_model'] = {
                        row[0]: {'avg_ms': int(row[1]) if row[1] else 0, 'calls': row[2]}
                        for row in cursor.fetchall()
                    }
            except sqlite3.Error:
                stats['latency_by_model'] = {}

        return stats


class ScrapingCache(SQLiteCache):
    """Cache for web scraping results."""

    def __new__(cls):
        return super().__new__(cls, 'scraping')

    def __init__(self):
        super().__init__('scraping')

    def get_page(self, url: str) -> Optional[str]:
        """Get cached page content."""
        return self.get(url, 'scrape')

    def set_page(self, url: str, content: str, ttl_days: int = 7) -> None:
        """Cache page content."""
        self.set(url, content, ttl_hours=ttl_days * 24, cache_type='scrape')


# =============================================================================
# GLOBAL INSTANCES
# =============================================================================

_response_cache: Optional[ResponseCache] = None
_scraping_cache: Optional[ScrapingCache] = None


def get_response_cache() -> ResponseCache:
    """Get or create the global response cache."""
    global _response_cache
    if _response_cache is None:
        _response_cache = ResponseCache()
    return _response_cache


def get_scraping_cache() -> ScrapingCache:
    """Get or create the global scraping cache."""
    global _scraping_cache
    if _scraping_cache is None:
        _scraping_cache = ScrapingCache()
    return _scraping_cache


def get_cache(name: str = 'default') -> SQLiteCache:
    """Get or create a named cache instance."""
    return SQLiteCache(name)
