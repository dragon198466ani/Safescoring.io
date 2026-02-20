# SafeScoring Python SDK

Official Python SDK for the SafeScoring API - Security ratings for crypto products.

## Installation

```bash
pip install safescoring
```

## Quick Start

```python
from safescoring import SafeScoring

# Initialize client (API key optional for public endpoints)
client = SafeScoring(api_key="sk_live_xxx")

# Get a product's SafeScore
product = client.products.get("ledger-nano-x")
print(f"{product['data']['name']}: {product['data']['score']}/100")

# Quick score lookup
score = client.get_score("trezor-model-t")
print(f"Score: {score}")
```

## Features

- Full type hints support
- Automatic error handling
- Rate limit handling with retry info
- All API endpoints covered

## API Reference

### Products

```python
# List products with filtering
products = client.products.list(
    page=1,
    limit=20,
    type="hardware-wallet",
    min_score=70,
    sort="score",
    order="desc",
)

# Get single product with history
product = client.products.get(
    "ledger-nano-x",
    include_history=True,
    include_incidents=True,
)

# Search products
results = client.products.search("ledger")
```

### Incidents

```python
# List security incidents
incidents = client.incidents.list(
    severity="critical",
    product_slug="some-product",
    limit=10,
)

# Get recent incidents
recent = client.incidents.recent(5)
```

### Statistics

```python
# Get global stats
stats = client.stats.get()
print(f"Total products: {stats['totalProducts']}")

# Get product types
types = client.stats.get_types()
```

### Quick Methods

```python
# Get score directly
score = client.get_score("ledger-nano-x")

# Compare two products
comparison = client.compare("ledger-nano-x", "trezor-model-t")
print(f"Winner: {comparison['winner']}")

# Get leaderboard
top10 = client.leaderboard(10)
```

## Error Handling

```python
from safescoring import (
    SafeScoring,
    SafeScoringError,
    RateLimitError,
    AuthenticationError,
    NotFoundError,
)

try:
    product = client.products.get("unknown-product")
except NotFoundError:
    print("Product not found")
except RateLimitError as e:
    print(f"Rate limited. Retry after {e.retry_after} seconds")
except AuthenticationError:
    print("Invalid API key")
except SafeScoringError as e:
    print(f"API Error: {e.message} ({e.status_code})")
```

## Rate Limits

- **Free tier**: 100 requests/minute
- **Pro tier**: 1,000 requests/minute
- **Enterprise**: Unlimited

## Support

- Documentation: https://safescoring.io/methodology
- Email: api@safescoring.io

## License

MIT
