# @safescoring/sdk

Official TypeScript/JavaScript SDK for the SafeScoring API - Security ratings for crypto products.

## Installation

```bash
npm install @safescoring/sdk
# or
yarn add @safescoring/sdk
# or
pnpm add @safescoring/sdk
```

## Quick Start

```typescript
import { SafeScoring } from '@safescoring/sdk';

// Initialize client (API key optional for public endpoints)
const client = new SafeScoring({
  apiKey: 'sk_live_xxx', // Optional
});

// Get a product's SafeScore
const product = await client.products.get('ledger-nano-x');
console.log(`${product.name}: ${product.score}/100`);

// Quick score lookup
const score = await client.getScore('trezor-model-t');
console.log(`Score: ${score}`);
```

## Features

- Full TypeScript support
- Promise-based API
- Automatic error handling
- Rate limit handling
- Webhook signature verification

## API Reference

### Products

```typescript
// List products with filtering
const products = await client.products.list({
  page: 1,
  limit: 20,
  type: 'hardware-wallet',
  minScore: 70,
  sort: 'score',
  order: 'desc',
});

// Get single product with history
const product = await client.products.get('ledger-nano-x', {
  includeHistory: true,
  includeIncidents: true,
});

// Search products
const results = await client.products.search('ledger');

// Get score history
const history = await client.products.getHistory('ledger-nano-x', 30);
```

### Incidents

```typescript
// List security incidents
const incidents = await client.incidents.list({
  severity: 'critical',
  productSlug: 'some-product',
  limit: 10,
});

// Get recent incidents
const recent = await client.incidents.recent(5);
```

### Alerts

```typescript
// Create webhook alert
const alert = await client.alerts.create({
  type: 'score_change',
  productSlug: 'ledger-nano-x',
  webhookUrl: 'https://your-server.com/webhook',
});

// Create email alert for threshold
const emailAlert = await client.alerts.create({
  type: 'threshold',
  productSlug: 'any-product',
  threshold: 50,
  email: 'alerts@example.com',
});

// List your alerts
const alerts = await client.alerts.list();

// Delete an alert
await client.alerts.delete('alert-id');
```

### Statistics

```typescript
// Get global stats
const stats = await client.stats.get();
console.log(`Total products: ${stats.totalProducts}`);
console.log(`Average score: ${stats.avgScore}`);

// Get product types
const types = await client.stats.getTypes();
```

### Quick Methods

```typescript
// Get score directly
const score = await client.getScore('ledger-nano-x');

// Compare two products
const comparison = await client.compare('ledger-nano-x', 'trezor-model-t');
console.log(`Winner: ${comparison.winner}`);
console.log(`Score difference: ${comparison.scoreDiff}`);

// Get leaderboard
const top10 = await client.leaderboard(10);
const topWallets = await client.leaderboard(10, 'hardware-wallet');
```

## Webhook Verification

```typescript
import { WebhookUtils } from '@safescoring/sdk';

// In your webhook handler
app.post('/webhook', async (req, res) => {
  const signature = req.headers['x-safescoring-signature'];
  const payload = JSON.stringify(req.body);

  const isValid = await WebhookUtils.verifySignature(
    payload,
    signature,
    process.env.WEBHOOK_SECRET
  );

  if (!isValid) {
    return res.status(401).send('Invalid signature');
  }

  const event = WebhookUtils.parsePayload(payload);

  switch (event.event) {
    case 'score.changed':
      console.log('Score changed:', event.data);
      break;
    case 'incident.created':
      console.log('New incident:', event.data);
      break;
  }

  res.status(200).send('OK');
});
```

## Error Handling

```typescript
import {
  SafeScoring,
  SafeScoringError,
  RateLimitError,
  AuthenticationError
} from '@safescoring/sdk';

try {
  const product = await client.products.get('unknown-product');
} catch (error) {
  if (error instanceof RateLimitError) {
    console.log(`Rate limited. Retry after ${error.retryAfter} seconds`);
  } else if (error instanceof AuthenticationError) {
    console.log('Invalid API key');
  } else if (error instanceof SafeScoringError) {
    console.log(`API Error: ${error.message} (${error.statusCode})`);
  }
}
```

## Configuration

```typescript
const client = new SafeScoring({
  apiKey: 'sk_live_xxx',    // Your API key (optional for public endpoints)
  baseUrl: 'https://safescoring.io', // API base URL (default)
  timeout: 30000,           // Request timeout in ms (default: 30000)
});
```

## TypeScript

Full TypeScript support with exported types:

```typescript
import type {
  Product,
  ProductListItem,
  Incident,
  AlertSubscription,
  Stats,
  ScoreHistoryEntry,
} from '@safescoring/sdk';
```

## Rate Limits

- **Free tier**: 100 requests/minute
- **Pro tier**: 1,000 requests/minute
- **Enterprise**: 10,000+ requests/minute

The SDK automatically handles rate limit errors with the `RateLimitError` class.

## Examples

### React Hook

```typescript
import { useState, useEffect } from 'react';
import { SafeScoring } from '@safescoring/sdk';

const client = new SafeScoring();

function useProductScore(slug: string) {
  const [score, setScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    client.getScore(slug)
      .then(setScore)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [slug]);

  return { score, loading, error };
}
```

### Node.js Script

```typescript
import { SafeScoring } from '@safescoring/sdk';

async function main() {
  const client = new SafeScoring({ apiKey: process.env.SAFESCORING_API_KEY });

  // Get top 10 products
  const leaderboard = await client.leaderboard(10);

  console.log('Top 10 SafeScores:');
  leaderboard.forEach((p, i) => {
    console.log(`${i + 1}. ${p.name}: ${p.score}/100`);
  });

  // Check for recent critical incidents
  const incidents = await client.incidents.list({ severity: 'critical', limit: 5 });

  if (incidents.data.length > 0) {
    console.log('\n⚠️ Recent Critical Incidents:');
    incidents.data.forEach(inc => {
      console.log(`- ${inc.title} (${inc.date})`);
    });
  }
}

main();
```

## Support

- Documentation: https://safescoring.io/api-docs
- Issues: https://github.com/safescoring/sdk/issues
- Email: api@safescoring.io

## License

MIT
