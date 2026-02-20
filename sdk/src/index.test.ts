import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SafeScoring, SafeScoringError, RateLimitError, AuthenticationError } from './index';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('SafeScoring SDK', () => {
  let client: SafeScoring;

  beforeEach(() => {
    mockFetch.mockReset();
    client = new SafeScoring({ apiKey: 'sk_test_xxx' });
  });

  describe('Products API', () => {
    it('should list products', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          products: [
            { slug: 'ledger', name: 'Ledger', score: 85 },
            { slug: 'trezor', name: 'Trezor', score: 82 },
          ],
          total: 100,
          page: 1,
          limit: 10,
          hasMore: true,
        }),
      });

      const result = await client.products.list({ page: 1, limit: 10 });

      expect(result.products).toHaveLength(2);
      expect(result.products[0].slug).toBe('ledger');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/products'),
        expect.any(Object)
      );
    });

    it('should get single product', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          slug: 'ledger-nano-x',
          name: 'Ledger Nano X',
          score: 85,
          scores: { s: 90, a: 80, f: 85, e: 85 },
        }),
      });

      const product = await client.products.get('ledger-nano-x');

      expect(product.name).toBe('Ledger Nano X');
      expect(product.score).toBe(85);
    });

    it('should search products', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [{ slug: 'ledger', name: 'Ledger', score: 85 }],
        }),
      });

      const results = await client.products.search('ledger');

      expect(results).toHaveLength(1);
      expect(results[0].slug).toBe('ledger');
    });
  });

  describe('Incidents API', () => {
    it('should list incidents', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            { id: '1', title: 'Incident 1', severity: 'high' },
            { id: '2', title: 'Incident 2', severity: 'medium' },
          ],
          total: 50,
          page: 1,
          limit: 10,
        }),
      });

      const result = await client.incidents.list();

      expect(result.data).toHaveLength(2);
    });

    it('should get recent incidents', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ id: '1', title: 'Recent', severity: 'critical' }],
          total: 1,
          page: 1,
          limit: 5,
        }),
      });

      const recent = await client.incidents.recent(5);

      expect(recent).toHaveLength(1);
      expect(recent[0].severity).toBe('critical');
    });
  });

  describe('Quick Methods', () => {
    it('should get score directly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ slug: 'test', score: 75 }),
      });

      const score = await client.getScore('test');

      expect(score).toBe(75);
    });

    it('should compare products', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ slug: 'a', name: 'Product A', score: 90 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ slug: 'b', name: 'Product B', score: 80 }),
        });

      const comparison = await client.compare('a', 'b');

      expect(comparison.winner).toBe('a');
      expect(comparison.scoreDiff).toBe(10);
    });

    it('should get leaderboard', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          products: [
            { slug: 'top1', score: 95 },
            { slug: 'top2', score: 90 },
          ],
          total: 100,
          page: 1,
          limit: 10,
          hasMore: true,
        }),
      });

      const leaderboard = await client.leaderboard(10);

      expect(leaderboard).toHaveLength(2);
      expect(leaderboard[0].score).toBe(95);
    });
  });

  describe('Error Handling', () => {
    it('should throw RateLimitError on 429', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers({ 'Retry-After': '60' }),
        json: async () => ({ error: 'Rate limit exceeded' }),
      });

      await expect(client.products.list()).rejects.toThrow(RateLimitError);
    });

    it('should throw AuthenticationError on 401', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Invalid API key' }),
      });

      await expect(client.products.list()).rejects.toThrow(AuthenticationError);
    });

    it('should throw SafeScoringError on other errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' }),
      });

      await expect(client.products.list()).rejects.toThrow(SafeScoringError);
    });
  });

  describe('Configuration', () => {
    it('should use custom base URL', () => {
      const customClient = new SafeScoring({
        baseUrl: 'https://api.custom.com',
      });

      expect(customClient).toBeDefined();
    });

    it('should work without API key for public endpoints', async () => {
      const publicClient = new SafeScoring();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ products: [], total: 0, page: 1, limit: 10, hasMore: false }),
      });

      const result = await publicClient.products.list();

      expect(result.products).toEqual([]);
    });
  });
});
