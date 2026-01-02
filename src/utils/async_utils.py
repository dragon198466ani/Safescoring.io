"""
Async Utilities for SafeScoring Backend
Provides async helpers for concurrent operations, rate limiting, and caching
"""

import asyncio
import time
import hashlib
import json
from functools import wraps
from typing import Any, Callable, Dict, List, Optional, TypeVar, Coroutine
from collections import OrderedDict
import aiohttp
import logging

logger = logging.getLogger(__name__)

T = TypeVar("T")


class AsyncRateLimiter:
    """
    Async rate limiter using token bucket algorithm.
    Thread-safe and suitable for concurrent async operations.
    """

    def __init__(self, rate: float, burst: int = 1):
        """
        Args:
            rate: Requests per second
            burst: Maximum burst size (tokens)
        """
        self.rate = rate
        self.burst = burst
        self.tokens = burst
        self.last_update = time.monotonic()
        self._lock = asyncio.Lock()

    async def acquire(self, tokens: int = 1) -> float:
        """
        Acquire tokens, waiting if necessary.
        Returns the wait time in seconds.
        """
        async with self._lock:
            now = time.monotonic()
            elapsed = now - self.last_update
            self.tokens = min(self.burst, self.tokens + elapsed * self.rate)
            self.last_update = now

            if self.tokens >= tokens:
                self.tokens -= tokens
                return 0.0

            wait_time = (tokens - self.tokens) / self.rate
            await asyncio.sleep(wait_time)
            self.tokens = 0
            self.last_update = time.monotonic()
            return wait_time


class AsyncCache:
    """
    Simple async LRU cache with TTL support.
    """

    def __init__(self, maxsize: int = 128, ttl: float = 300):
        """
        Args:
            maxsize: Maximum cache size
            ttl: Time to live in seconds
        """
        self.maxsize = maxsize
        self.ttl = ttl
        self.cache: OrderedDict = OrderedDict()
        self._lock = asyncio.Lock()

    def _make_key(self, *args, **kwargs) -> str:
        """Create a hashable cache key from arguments."""
        key_data = json.dumps({"args": args, "kwargs": kwargs}, sort_keys=True, default=str)
        return hashlib.md5(key_data.encode()).hexdigest()

    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache if exists and not expired."""
        async with self._lock:
            if key in self.cache:
                value, timestamp = self.cache[key]
                if time.time() - timestamp < self.ttl:
                    # Move to end (most recently used)
                    self.cache.move_to_end(key)
                    return value
                else:
                    # Expired
                    del self.cache[key]
            return None

    async def set(self, key: str, value: Any) -> None:
        """Set value in cache."""
        async with self._lock:
            if key in self.cache:
                del self.cache[key]
            elif len(self.cache) >= self.maxsize:
                # Remove oldest
                self.cache.popitem(last=False)
            self.cache[key] = (value, time.time())

    async def invalidate(self, key: str) -> None:
        """Remove key from cache."""
        async with self._lock:
            if key in self.cache:
                del self.cache[key]

    async def clear(self) -> None:
        """Clear all cache entries."""
        async with self._lock:
            self.cache.clear()


def async_cached(cache: AsyncCache):
    """
    Decorator for caching async function results.
    """
    def decorator(func: Callable[..., Coroutine[Any, Any, T]]) -> Callable[..., Coroutine[Any, Any, T]]:
        @wraps(func)
        async def wrapper(*args, **kwargs) -> T:
            key = cache._make_key(func.__name__, *args, **kwargs)
            cached = await cache.get(key)
            if cached is not None:
                return cached
            result = await func(*args, **kwargs)
            await cache.set(key, result)
            return result
        return wrapper
    return decorator


def async_retry(
    max_retries: int = 3,
    delay: float = 1.0,
    backoff: float = 2.0,
    exceptions: tuple = (Exception,),
):
    """
    Decorator for retrying async functions with exponential backoff.
    """
    def decorator(func: Callable[..., Coroutine[Any, Any, T]]) -> Callable[..., Coroutine[Any, Any, T]]:
        @wraps(func)
        async def wrapper(*args, **kwargs) -> T:
            last_exception = None
            current_delay = delay

            for attempt in range(max_retries + 1):
                try:
                    return await func(*args, **kwargs)
                except exceptions as e:
                    last_exception = e
                    if attempt < max_retries:
                        logger.warning(
                            f"{func.__name__} attempt {attempt + 1} failed: {e}. "
                            f"Retrying in {current_delay:.1f}s..."
                        )
                        await asyncio.sleep(current_delay)
                        current_delay *= backoff
                    else:
                        logger.error(f"{func.__name__} failed after {max_retries + 1} attempts: {e}")

            raise last_exception

        return wrapper
    return decorator


async def gather_with_concurrency(
    n: int,
    tasks: List[Coroutine],
    return_exceptions: bool = False,
) -> List[Any]:
    """
    Run tasks with limited concurrency.

    Args:
        n: Maximum concurrent tasks
        tasks: List of coroutines to run
        return_exceptions: If True, return exceptions instead of raising

    Returns:
        List of results in order
    """
    semaphore = asyncio.Semaphore(n)

    async def run_with_semaphore(task):
        async with semaphore:
            return await task

    return await asyncio.gather(
        *[run_with_semaphore(task) for task in tasks],
        return_exceptions=return_exceptions,
    )


async def batch_process(
    items: List[Any],
    processor: Callable[[Any], Coroutine[Any, Any, T]],
    batch_size: int = 10,
    delay_between_batches: float = 0.0,
) -> List[T]:
    """
    Process items in batches with optional delay between batches.

    Args:
        items: List of items to process
        processor: Async function to process each item
        batch_size: Number of items per batch
        delay_between_batches: Delay in seconds between batches

    Returns:
        List of results
    """
    results = []

    for i in range(0, len(items), batch_size):
        batch = items[i : i + batch_size]
        batch_results = await asyncio.gather(
            *[processor(item) for item in batch],
            return_exceptions=True,
        )
        results.extend(batch_results)

        if delay_between_batches > 0 and i + batch_size < len(items):
            await asyncio.sleep(delay_between_batches)

    return results


class AsyncHTTPClient:
    """
    Async HTTP client with rate limiting, retries, and connection pooling.
    """

    def __init__(
        self,
        rate_limit: float = 10.0,
        max_retries: int = 3,
        timeout: float = 30.0,
    ):
        self.rate_limiter = AsyncRateLimiter(rate_limit, burst=5)
        self.max_retries = max_retries
        self.timeout = aiohttp.ClientTimeout(total=timeout)
        self._session: Optional[aiohttp.ClientSession] = None

    async def _get_session(self) -> aiohttp.ClientSession:
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession(timeout=self.timeout)
        return self._session

    async def close(self):
        if self._session and not self._session.closed:
            await self._session.close()

    @async_retry(max_retries=3, exceptions=(aiohttp.ClientError, asyncio.TimeoutError))
    async def request(
        self,
        method: str,
        url: str,
        **kwargs,
    ) -> Dict[str, Any]:
        """Make an HTTP request with rate limiting and retries."""
        await self.rate_limiter.acquire()

        session = await self._get_session()
        async with session.request(method, url, **kwargs) as response:
            response.raise_for_status()

            content_type = response.headers.get("content-type", "")
            if "application/json" in content_type:
                return await response.json()
            else:
                text = await response.text()
                return {"text": text, "status": response.status}

    async def get(self, url: str, **kwargs) -> Dict[str, Any]:
        return await self.request("GET", url, **kwargs)

    async def post(self, url: str, **kwargs) -> Dict[str, Any]:
        return await self.request("POST", url, **kwargs)

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()


class TaskQueue:
    """
    Simple async task queue for background processing.
    """

    def __init__(self, max_workers: int = 5):
        self.max_workers = max_workers
        self.queue: asyncio.Queue = asyncio.Queue()
        self.workers: List[asyncio.Task] = []
        self._running = False

    async def _worker(self, worker_id: int):
        """Worker coroutine that processes tasks from the queue."""
        while self._running:
            try:
                task, args, kwargs, future = await asyncio.wait_for(
                    self.queue.get(),
                    timeout=1.0,
                )
                try:
                    result = await task(*args, **kwargs)
                    future.set_result(result)
                except Exception as e:
                    future.set_exception(e)
                finally:
                    self.queue.task_done()
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                logger.error(f"Worker {worker_id} error: {e}")

    async def start(self):
        """Start the task queue workers."""
        self._running = True
        self.workers = [
            asyncio.create_task(self._worker(i))
            for i in range(self.max_workers)
        ]

    async def stop(self):
        """Stop all workers and wait for pending tasks."""
        self._running = False
        await self.queue.join()
        for worker in self.workers:
            worker.cancel()
        await asyncio.gather(*self.workers, return_exceptions=True)

    async def submit(
        self,
        task: Callable[..., Coroutine],
        *args,
        **kwargs,
    ) -> asyncio.Future:
        """Submit a task to the queue and return a Future."""
        future = asyncio.get_event_loop().create_future()
        await self.queue.put((task, args, kwargs, future))
        return future

    async def __aenter__(self):
        await self.start()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.stop()


# Example usage and utilities

async def run_with_timeout(
    coro: Coroutine[Any, Any, T],
    timeout: float,
    default: T = None,
) -> T:
    """Run a coroutine with a timeout, returning default on timeout."""
    try:
        return await asyncio.wait_for(coro, timeout=timeout)
    except asyncio.TimeoutError:
        logger.warning(f"Coroutine timed out after {timeout}s")
        return default


def sync_wrapper(async_func: Callable[..., Coroutine[Any, Any, T]]) -> Callable[..., T]:
    """
    Wrap an async function to be callable synchronously.
    Useful for backwards compatibility.
    """
    @wraps(async_func)
    def wrapper(*args, **kwargs) -> T:
        loop = asyncio.new_event_loop()
        try:
            return loop.run_until_complete(async_func(*args, **kwargs))
        finally:
            loop.close()
    return wrapper


if __name__ == "__main__":
    # Example usage
    async def example():
        # Rate limiter example
        limiter = AsyncRateLimiter(rate=2.0, burst=3)
        for i in range(5):
            wait = await limiter.acquire()
            print(f"Request {i + 1}, waited {wait:.2f}s")

        # Cache example
        cache = AsyncCache(maxsize=100, ttl=60)

        @async_cached(cache)
        async def fetch_data(key: str):
            await asyncio.sleep(0.1)  # Simulate API call
            return f"data for {key}"

        result1 = await fetch_data("test")  # Cache miss
        result2 = await fetch_data("test")  # Cache hit
        print(f"Results: {result1}, {result2}")

        # Batch processing example
        async def process_item(item):
            await asyncio.sleep(0.1)
            return item * 2

        results = await batch_process([1, 2, 3, 4, 5], process_item, batch_size=2)
        print(f"Batch results: {results}")

    asyncio.run(example())
