#!/usr/bin/env python3
"""
Test Rate-Limiting on /api/user/* routes

This script:
1. Hits /api/user/settings multiple times
2. Verifies we get 429 responses after hitting the limit
3. Checks rate-limit headers
"""

import requests
import time
import sys
from datetime import datetime

API_URL = "http://localhost:3000/api/user/settings"
RATE_LIMIT = 100  # 100 requests per 10 minutes
TEST_REQUESTS = 105  # Test with more than the limit

def test_rate_limiting(auth_cookie=None):
    """Test rate-limiting by sending multiple requests"""

    print("=" * 70)
    print("Rate-Limiting Test for /api/user/settings")
    print("=" * 70)
    print(f"\nLimit: {RATE_LIMIT} requests per 10 minutes per user")
    print(f"Test: Sending {TEST_REQUESTS} requests to trigger rate-limiting\n")

    headers = {}
    if auth_cookie:
        headers["Cookie"] = auth_cookie

    success_count = 0
    rate_limited_count = 0
    first_429_response = None

    print("Starting requests...")
    print()

    for i in range(1, TEST_REQUESTS + 1):
        try:
            response = requests.get(API_URL, headers=headers, timeout=5)
            status = response.status_code

            if status == 200:
                success_count += 1
                print(".", end="", flush=True)
            elif status == 429:
                rate_limited_count += 1
                print("X", end="", flush=True)

                # Capture first 429 response
                if rate_limited_count == 1:
                    first_429_response = response
                    print("\n")
                    print("=" * 70)
                    print("RATE LIMIT TRIGGERED!")
                    print("=" * 70)
                    print(f"Status: {response.status_code}")
                    print(f"Headers:")
                    for key, value in response.headers.items():
                        if 'rate' in key.lower() or 'retry' in key.lower():
                            print(f"  {key}: {value}")
                    print(f"\nResponse body:")
                    print(f"  {response.text}")
                    print("=" * 70)
                    print()
            elif status == 401:
                print("\n")
                print("[ERROR] 401 Unauthorized - Authentication required!")
                print("\nTo test with authentication:")
                print("  1. Get your auth cookie from browser DevTools")
                print("  2. Run: python scripts/test_rate_limiting.py 'your-cookie-here'")
                print()
                return False
            else:
                print("?", end="", flush=True)

            # Small delay
            time.sleep(0.05)

        except requests.exceptions.RequestException as e:
            print(f"\n[ERROR] Request failed: {e}")
            return False

    print("\n")
    print("=" * 70)
    print("TEST RESULTS")
    print("=" * 70)
    print(f"Total requests: {TEST_REQUESTS}")
    print(f"Successful (200): {success_count}")
    print(f"Rate limited (429): {rate_limited_count}")
    print()

    if rate_limited_count > 0:
        print("[OK] Rate limiting is working!")
        print()
        print("Expected behavior:")
        print(f"  - First ~{RATE_LIMIT} requests: 200 OK")
        print(f"  - After {RATE_LIMIT} requests: 429 Too Many Requests")

        # Show rate limit headers if available
        if first_429_response:
            retry_after = first_429_response.headers.get('Retry-After', 'N/A')
            limit = first_429_response.headers.get('X-RateLimit-Limit', 'N/A')
            remaining = first_429_response.headers.get('X-RateLimit-Remaining', 'N/A')
            reset = first_429_response.headers.get('X-RateLimit-Reset', 'N/A')

            print()
            print("Rate limit info:")
            print(f"  Limit: {limit}")
            print(f"  Remaining: {remaining}")
            print(f"  Retry after: {retry_after} seconds")
            if reset != 'N/A':
                reset_time = datetime.fromtimestamp(int(reset))
                print(f"  Resets at: {reset_time}")

        return True
    else:
        print("[WARNING] No rate limiting detected!")
        print()
        print("Possible reasons:")
        print("  - Not authenticated (rate-limiting requires auth)")
        print("  - Server not running (curl http://localhost:3000)")
        print("  - Redis not configured (using in-memory fallback)")
        print("  - Rate limit very high or disabled")
        return False

def main():
    print()

    # Check if auth cookie provided
    auth_cookie = sys.argv[1] if len(sys.argv) > 1 else None

    if not auth_cookie:
        print("[INFO] No auth cookie provided, testing without authentication")
        print("[INFO] You may need to provide auth cookie for full test")
        print()

    # Test rate-limiting
    success = test_rate_limiting(auth_cookie)

    print()
    print("=" * 70)
    print()

    if success:
        print("Next steps:")
        print("  1. Verify rate limits in production with Upstash Redis")
        print("  2. Monitor rate-limit logs")
        print("  3. Test other /api/user/* routes")
        sys.exit(0)
    else:
        print("Next steps:")
        print("  1. Start the dev server: npm run dev")
        print("  2. Authenticate in browser and get your cookie")
        print("  3. Run this script with auth cookie")
        sys.exit(1)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n[INTERRUPTED] Test stopped by user")
        sys.exit(1)
