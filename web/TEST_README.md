# SafeScoring Community Voting API Tests

Automated tests for the community voting system including:
- Leaderboard API
- Voting submission API
- Strategic analyses API
- Rewards system
- User stats

## Setup

1. Install test dependencies:

```bash
npm install --save-dev jest @jest/globals
```

2. Add test script to package.json:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run specific test file
```bash
npm test community.test.js
```

### Run tests in watch mode (auto-rerun on changes)
```bash
npm run test:watch
```

### Run tests with coverage report
```bash
npm run test:coverage
```

## Test Environment

By default, tests run against `http://localhost:3000`.

To test against a different URL:

```bash
TEST_BASE_URL=https://safescoring.com npm test
```

## Test Categories

### 1. Leaderboard Tests
- GET /api/community/leaderboard
- Timeframe filtering (all, week, month)
- Pagination (limit)
- Stats aggregation
- Entry structure validation

### 2. Evaluations to Vote
- GET /api/products/[slug]/evaluations-to-vote
- Pillar filtering (S, A, F, E)
- User vote exclusion
- Vote count aggregation

### 3. Strategic Analyses
- GET /api/products/[slug]/strategic-analyses
- Pillar scores (0-100)
- Confidence scores (0-1)
- Community corrections
- Strengths, weaknesses, risks, recommendations

### 4. Vote Submission (Auth Required)
- POST /api/community/vote
- Authentication validation
- Input validation
- Justification requirement for DISAGREE votes
- Token reward calculation

### 5. Community Stats
- GET /api/products/[slug]/community-stats
- Vote aggregation
- AI accuracy calculation
- Challenge validation tracking

### 6. Rewards (Auth Required)
- GET /api/community/rewards
- Token balance
- Transaction history
- Wallet linking

### 7. User Stats (Auth Required)
- GET /api/user/voting-stats
- Total votes
- Challenges won
- Daily streak

## Test Results

All tests should pass with:
- ✓ 200 OK for valid requests
- ✓ 401 Unauthorized for auth-required endpoints without auth
- ✓ 400 Bad Request for invalid input
- ✓ 404 Not Found for invalid product slugs
- ✓ Response times < 2-3 seconds
- ✓ Correct data structure
- ✓ Valid score ranges (0-100, 0-1)

## Authentication Tests

Currently, authentication tests check for proper 401 responses.

To add authenticated test flows:

1. Create test user in Supabase
2. Get auth token via NextAuth
3. Pass token in request headers
4. Test full voting workflow

## Integration Tests

The test suite includes integration tests that verify:
- Complete voting workflow
- Data consistency across endpoints
- Performance benchmarks
- Error handling

## Continuous Integration

Add to GitHub Actions:

```yaml
name: API Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - name: Upload coverage
        uses: codecov/codecov-action@v2
```

## Troubleshooting

### Tests timing out
- Increase timeout in jest.config.js
- Check network connectivity
- Verify API server is running

### Authentication failures
- Tests requiring auth will return 401
- This is expected behavior
- Add auth tokens for full integration tests

### Invalid product slug
- Default test uses 'ledger-nano-s-plus'
- Change testProductSlug in test file if needed

## Next Steps

1. Add authenticated test flows
2. Test vote submission with valid auth
3. Test reward claiming
4. Test wallet linking
5. Add load testing for high-volume scenarios
6. Test WebSocket real-time updates (if implemented)

## Coverage Goals

- API Routes: 80%+ coverage
- Critical paths (voting, rewards): 95%+ coverage
- Error handling: 100% coverage
