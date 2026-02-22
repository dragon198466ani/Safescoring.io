/**
 * Automated API Tests for Community Voting System
 * Tests all endpoints related to migration 136 (evaluation_votes, token_rewards)
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const TEST_USER_EMAIL = 'test@safescoring.com';
const TEST_USER_PASSWORD = 'TestPassword123!';

let authToken = null;
let testEvaluationId = null;
let testProductSlug = 'ledger-nano-s-plus';

describe('Community Voting API Tests', () => {

  // Setup: Login and get auth token
  beforeAll(async () => {
    // In a real test, you'd authenticate here
    // For now, we'll test public endpoints and authenticated ones separately
    console.log('Setting up tests...');
  });

  afterAll(async () => {
    console.log('Cleaning up tests...');
  });

  /**
   * Test: GET /api/community/leaderboard
   */
  describe('Leaderboard API', () => {
    test('should fetch leaderboard with default params', async () => {
      const response = await fetch(`${BASE_URL}/api/community/leaderboard`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('leaderboard');
      expect(data).toHaveProperty('stats');
      expect(Array.isArray(data.leaderboard)).toBe(true);
    });

    test('should filter by timeframe', async () => {
      const response = await fetch(`${BASE_URL}/api/community/leaderboard?timeframe=week`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.leaderboard).toBeDefined();
    });

    test('should limit results', async () => {
      const limit = 5;
      const response = await fetch(`${BASE_URL}/api/community/leaderboard?limit=${limit}`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.leaderboard.length).toBeLessThanOrEqual(limit);
    });

    test('should include stats', async () => {
      const response = await fetch(`${BASE_URL}/api/community/leaderboard`);
      const data = await response.json();

      expect(data.stats).toBeDefined();
      expect(data.stats).toHaveProperty('totalVoters');
      expect(data.stats).toHaveProperty('totalVotes');
      expect(data.stats).toHaveProperty('totalTokensAwarded');
    });

    test('should return entries with correct structure', async () => {
      const response = await fetch(`${BASE_URL}/api/community/leaderboard`);
      const data = await response.json();

      if (data.leaderboard.length > 0) {
        const entry = data.leaderboard[0];
        expect(entry).toHaveProperty('rank');
        expect(entry).toHaveProperty('tokensEarned');
        expect(entry).toHaveProperty('votesSubmitted');
        expect(entry).toHaveProperty('challengesWon');
      }
    });
  });

  /**
   * Test: GET /api/products/[slug]/evaluations-to-vote
   */
  describe('Evaluations to Vote API', () => {
    test('should fetch evaluations for a product', async () => {
      const response = await fetch(
        `${BASE_URL}/api/products/${testProductSlug}/evaluations-to-vote`
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    });

    test('should filter by pillar', async () => {
      const response = await fetch(
        `${BASE_URL}/api/products/${testProductSlug}/evaluations-to-vote?pillar=S`
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      if (data.length > 0) {
        data.forEach(item => {
          expect(item.pillar).toBe('S');
        });
      }
    });

    test('should limit results', async () => {
      const limit = 10;
      const response = await fetch(
        `${BASE_URL}/api/products/${testProductSlug}/evaluations-to-vote?limit=${limit}`
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.length).toBeLessThanOrEqual(limit);
    });

    test('should return evaluations with correct structure', async () => {
      const response = await fetch(
        `${BASE_URL}/api/products/${testProductSlug}/evaluations-to-vote`
      );
      const data = await response.json();

      if (data.length > 0) {
        const evaluation = data[0];
        expect(evaluation).toHaveProperty('id');
        expect(evaluation).toHaveProperty('ai_result');
        expect(evaluation).toHaveProperty('norm_code');
        expect(evaluation).toHaveProperty('norm_title');
        expect(evaluation).toHaveProperty('pillar');
        expect(evaluation).toHaveProperty('agree_count');
        expect(evaluation).toHaveProperty('disagree_count');

        // Store for voting test
        testEvaluationId = evaluation.id;
      }
    });

    test('should return 404 for invalid product slug', async () => {
      const response = await fetch(
        `${BASE_URL}/api/products/invalid-product-slug-xyz/evaluations-to-vote`
      );

      expect(response.status).toBe(404);
    });
  });

  /**
   * Test: GET /api/products/[slug]/strategic-analyses
   */
  describe('Strategic Analyses API', () => {
    test('should fetch strategic analyses for a product', async () => {
      const response = await fetch(
        `${BASE_URL}/api/products/${testProductSlug}/strategic-analyses`
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('S');
      expect(data).toHaveProperty('A');
      expect(data).toHaveProperty('F');
      expect(data).toHaveProperty('E');
    });

    test('should include pillar scores', async () => {
      const response = await fetch(
        `${BASE_URL}/api/products/${testProductSlug}/strategic-analyses`
      );
      const data = await response.json();

      Object.keys(data).forEach(pillar => {
        expect(data[pillar]).toHaveProperty('pillar_score');
        expect(data[pillar]).toHaveProperty('confidence_score');
        expect(typeof data[pillar].pillar_score).toBe('number');
      });
    });

    test('should include strategic conclusions', async () => {
      const response = await fetch(
        `${BASE_URL}/api/products/${testProductSlug}/strategic-analyses`
      );
      const data = await response.json();

      Object.keys(data).forEach(pillar => {
        expect(data[pillar]).toHaveProperty('strategic_conclusion');
        expect(data[pillar].strategic_conclusion).toBeTruthy();
      });
    });

    test('should include strengths, weaknesses, risks', async () => {
      const response = await fetch(
        `${BASE_URL}/api/products/${testProductSlug}/strategic-analyses`
      );
      const data = await response.json();

      Object.keys(data).forEach(pillar => {
        expect(data[pillar]).toHaveProperty('key_strengths');
        expect(data[pillar]).toHaveProperty('key_weaknesses');
        expect(data[pillar]).toHaveProperty('critical_risks');
        expect(data[pillar]).toHaveProperty('recommendations');
        expect(Array.isArray(data[pillar].key_strengths)).toBe(true);
      });
    });

    test('should include community corrections', async () => {
      const response = await fetch(
        `${BASE_URL}/api/products/${testProductSlug}/strategic-analyses`
      );
      const data = await response.json();

      Object.keys(data).forEach(pillar => {
        expect(data[pillar]).toHaveProperty('community_corrections');
        expect(typeof data[pillar].community_corrections).toBe('number');
      });
    });
  });

  /**
   * Test: POST /api/community/vote (requires authentication)
   */
  describe('Vote Submission API (Auth Required)', () => {
    test('should reject unauthenticated vote', async () => {
      const response = await fetch(`${BASE_URL}/api/community/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evaluation_id: 1,
          vote_agrees: true
        })
      });

      expect(response.status).toBe(401);
    });

    test('should reject invalid vote data', async () => {
      const response = await fetch(`${BASE_URL}/api/community/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Missing evaluation_id
          vote_agrees: true
        })
      });

      expect(response.status).toBe(400);
    });

    test('should reject disagree vote without justification', async () => {
      const response = await fetch(`${BASE_URL}/api/community/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evaluation_id: 1,
          vote_agrees: false,
          justification: 'short' // Less than 10 chars
        })
      });

      // Should fail with 401 (no auth) or 400 (invalid justification)
      expect([400, 401]).toContain(response.status);
    });
  });

  /**
   * Test: GET /api/products/[slug]/community-stats
   */
  describe('Community Stats API', () => {
    test('should fetch community stats for a product', async () => {
      const response = await fetch(
        `${BASE_URL}/api/products/${testProductSlug}/community-stats`
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('total_votes');
      expect(data).toHaveProperty('total_agrees');
      expect(data).toHaveProperty('total_challenges');
      expect(data).toHaveProperty('validated_challenges');
    });

    test('should calculate AI accuracy', async () => {
      const response = await fetch(
        `${BASE_URL}/api/products/${testProductSlug}/community-stats`
      );
      const data = await response.json();

      expect(data).toHaveProperty('ai_accuracy');
      expect(data.ai_accuracy).toBeGreaterThanOrEqual(0);
      expect(data.ai_accuracy).toBeLessThanOrEqual(100);
    });
  });

  /**
   * Test: GET /api/community/rewards (requires authentication)
   */
  describe('Rewards API (Auth Required)', () => {
    test('should reject unauthenticated request', async () => {
      const response = await fetch(`${BASE_URL}/api/community/rewards`);

      // May return 401 or redirect to login
      expect([401, 302, 307]).toContain(response.status);
    });
  });

  /**
   * Test: GET /api/user/voting-stats (requires authentication)
   */
  describe('User Voting Stats API (Auth Required)', () => {
    test('should reject unauthenticated request', async () => {
      const response = await fetch(`${BASE_URL}/api/user/voting-stats`);

      expect([401, 302, 307]).toContain(response.status);
    });
  });

  /**
   * Integration Test: Full voting flow
   */
  describe('Integration: Full Voting Flow', () => {
    test('should handle complete voting workflow', async () => {
      // 1. Get evaluations to vote
      const evalsResponse = await fetch(
        `${BASE_URL}/api/products/${testProductSlug}/evaluations-to-vote?limit=1`
      );
      expect(evalsResponse.status).toBe(200);
      const evaluations = await evalsResponse.json();

      if (evaluations.length === 0) {
        console.warn('No evaluations available for voting test');
        return;
      }

      const evaluation = evaluations[0];

      // 2. Check community stats before vote
      const statsBefore = await fetch(
        `${BASE_URL}/api/products/${testProductSlug}/community-stats`
      );
      expect(statsBefore.status).toBe(200);

      // 3. Submit vote (will fail without auth, but tests the endpoint)
      const voteResponse = await fetch(`${BASE_URL}/api/community/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evaluation_id: evaluation.id,
          vote_agrees: true
        })
      });

      // Expect 401 because we're not authenticated
      expect(voteResponse.status).toBe(401);

      // 4. Check strategic analyses
      const analysesResponse = await fetch(
        `${BASE_URL}/api/products/${testProductSlug}/strategic-analyses`
      );
      expect(analysesResponse.status).toBe(200);
      const analyses = await analysesResponse.json();
      expect(Object.keys(analyses).length).toBe(4); // S, A, F, E
    });
  });

  /**
   * Performance Tests
   */
  describe('Performance Tests', () => {
    test('leaderboard should respond within 2 seconds', async () => {
      const start = Date.now();
      const response = await fetch(`${BASE_URL}/api/community/leaderboard`);
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(2000);
    }, 5000);

    test('evaluations-to-vote should respond within 2 seconds', async () => {
      const start = Date.now();
      const response = await fetch(
        `${BASE_URL}/api/products/${testProductSlug}/evaluations-to-vote`
      );
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(2000);
    }, 5000);

    test('strategic-analyses should respond within 3 seconds', async () => {
      const start = Date.now();
      const response = await fetch(
        `${BASE_URL}/api/products/${testProductSlug}/strategic-analyses`
      );
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(3000);
    }, 5000);
  });

  /**
   * Data Validation Tests
   */
  describe('Data Validation', () => {
    test('leaderboard entries should have valid token counts', async () => {
      const response = await fetch(`${BASE_URL}/api/community/leaderboard`);
      const data = await response.json();

      data.leaderboard.forEach(entry => {
        expect(entry.tokensEarned).toBeGreaterThanOrEqual(0);
        expect(Number.isInteger(entry.tokensEarned)).toBe(true);
      });
    });

    test('strategic analyses scores should be 0-100', async () => {
      const response = await fetch(
        `${BASE_URL}/api/products/${testProductSlug}/strategic-analyses`
      );
      const data = await response.json();

      Object.keys(data).forEach(pillar => {
        const score = data[pillar].pillar_score;
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      });
    });

    test('confidence scores should be 0-1', async () => {
      const response = await fetch(
        `${BASE_URL}/api/products/${testProductSlug}/strategic-analyses`
      );
      const data = await response.json();

      Object.keys(data).forEach(pillar => {
        const confidence = data[pillar].confidence_score;
        expect(confidence).toBeGreaterThanOrEqual(0);
        expect(confidence).toBeLessThanOrEqual(1);
      });
    });
  });

  /**
   * Error Handling Tests
   */
  describe('Error Handling', () => {
    test('should handle invalid product slug', async () => {
      const response = await fetch(
        `${BASE_URL}/api/products/invalid-slug-xyz/strategic-analyses`
      );

      expect(response.status).toBe(404);
    });

    test('should handle invalid pillar filter', async () => {
      const response = await fetch(
        `${BASE_URL}/api/products/${testProductSlug}/evaluations-to-vote?pillar=X`
      );

      // Should either ignore invalid pillar or return 400
      expect([200, 400]).toContain(response.status);
    });

    test('should handle malformed vote request', async () => {
      const response = await fetch(`${BASE_URL}/api/community/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json'
      });

      expect([400, 401]).toContain(response.status);
    });
  });
});

/**
 * Run tests with: npm test -- community.test.js
 * Or: jest community.test.js
 */
