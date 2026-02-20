# SafeScoring Go SDK

Official Go SDK for the SafeScoring API - Security ratings for crypto products.

## Installation

```bash
go get github.com/safescoring/go-sdk
```

## Quick Start

```go
package main

import (
    "fmt"
    "log"

    safescoring "github.com/safescoring/go-sdk"
)

func main() {
    // Initialize client (API key optional for public endpoints)
    client := safescoring.NewClient("sk_live_xxx")

    // Get a product's SafeScore
    product, err := client.Products.Get("ledger-nano-x")
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("%s: %d/100\n", product.Name, product.Score)

    // Quick score lookup
    score, _ := client.Products.GetScore("trezor-model-t")
    fmt.Printf("Score: %d\n", score)
}
```

## API Reference

### Products

```go
// List products with filtering
products, err := client.Products.List(&safescoring.ProductListOptions{
    Page:     1,
    Limit:    20,
    Type:     "hardware-wallet",
    MinScore: 70,
    Sort:     "score",
    Order:    "desc",
})

// Get single product
product, err := client.Products.Get("ledger-nano-x")

// Get just the score
score, err := client.Products.GetScore("ledger-nano-x")
```

### Incidents

```go
// List security incidents
incidents, err := client.Incidents.List(&safescoring.IncidentListOptions{
    Severity:    "critical",
    ProductSlug: "some-product",
    Limit:       10,
})
```

### Statistics

```go
// Get global stats
stats, err := client.Stats.Get()
fmt.Printf("Total products: %d\n", stats.TotalProducts)
```

### Convenience Methods

```go
// Get leaderboard
top10, err := client.Leaderboard(10, "")
topWallets, err := client.Leaderboard(10, "hardware-wallet")

// Compare two products
winner, diff, err := client.Compare("ledger-nano-x", "trezor-model-t")
fmt.Printf("Winner: %s (by %d points)\n", winner, diff)
```

## Error Handling

```go
product, err := client.Products.Get("unknown-product")
if err != nil {
    if apiErr, ok := err.(*safescoring.Error); ok {
        if apiErr.IsNotFound() {
            fmt.Println("Product not found")
        } else if apiErr.IsRateLimited() {
            fmt.Printf("Rate limited. Retry after %d seconds\n", apiErr.RetryAfter)
        } else {
            fmt.Printf("API Error: %s (%d)\n", apiErr.Message, apiErr.StatusCode)
        }
    }
}
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
