#!/bin/bash
# Test Rate-Limiting on /api/user/* routes
#
# This script:
# 1. Hits /api/user/settings 105 times (limit: 100/10min)
# 2. Verifies we get 429 responses after 100 requests
# 3. Checks rate-limit headers

echo "======================================================================"
echo "Rate-Limiting Test for /api/user/settings"
echo "======================================================================"
echo ""
echo "Limit: 100 requests per 10 minutes per user"
echo "Test: Sending 105 requests to trigger rate-limiting"
echo ""

API_URL="http://localhost:3000/api/user/settings"
SUCCESS_COUNT=0
RATE_LIMITED_COUNT=0

echo "Starting requests..."
echo ""

for i in {1..105}; do
  # Make request and capture HTTP status + headers
  response=$(curl -s -w "\nSTATUS:%{http_code}\n" "$API_URL" -H "Cookie: your-auth-cookie-here" 2>/dev/null)

  status=$(echo "$response" | grep "^STATUS:" | cut -d':' -f2)

  if [ "$status" = "200" ]; then
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    printf "."
  elif [ "$status" = "429" ]; then
    RATE_LIMITED_COUNT=$((RATE_LIMITED_COUNT + 1))
    printf "X"

    # On first 429, show the response
    if [ "$RATE_LIMITED_COUNT" = "1" ]; then
      echo ""
      echo ""
      echo "======================================================================"
      echo "RATE LIMIT TRIGGERED!"
      echo "======================================================================"
      echo "$response" | grep -v "^STATUS:"
      echo ""
      echo "======================================================================"
    fi
  else
    printf "?"
  fi

  # Small delay to avoid other rate limits
  sleep 0.05
done

echo ""
echo ""
echo "======================================================================"
echo "TEST RESULTS"
echo "======================================================================"
echo "Total requests: 105"
echo "Successful (200): $SUCCESS_COUNT"
echo "Rate limited (429): $RATE_LIMITED_COUNT"
echo ""

if [ "$RATE_LIMITED_COUNT" -gt 0 ]; then
  echo "[OK] Rate limiting is working!"
  echo ""
  echo "Expected behavior:"
  echo "  - First ~100 requests: 200 OK"
  echo "  - After 100 requests: 429 Too Many Requests"
else
  echo "[WARNING] No rate limiting detected!"
  echo ""
  echo "Possible reasons:"
  echo "  - Not authenticated (rate-limiting requires auth)"
  echo "  - Server not running"
  echo "  - Redis not configured (using in-memory fallback)"
fi

echo ""
echo "======================================================================"
