/**
 * Tests for /api/agent/score route
 *
 * Covers:
 *  - Authentication gating (missing headers, invalid wallet)
 *  - Rate limiting
 *  - Balance / payment checks (402)
 *  - Missing product param (400)
 *  - Product not found (404)
 *  - Successful score response shape
 *  - CORS / OPTIONS preflight
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createMockRequest,
  parseResponse,
} from "./helpers";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockAuthResult = {
  authenticated: true,
  wallet: "0xaabbccddee0011223344aabbccddee0011223344",
  rateLimited: false,
  rateLimit: { allowed: true, remaining: 59, resetIn: 60000, total: 60 },
  access: {
    exists: true,
    balance: 10,
    hasStream: false,
  },
};

vi.mock("@/libs/agent-auth", () => ({
  authenticateAgent: vi.fn().mockResolvedValue({ ...mockAuthResult }),
  debitAgentCredits: vi.fn().mockResolvedValue({ success: true, newBalance: 9.99 }),
  AGENT_CORS_HEADERS: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, X-Agent-Wallet, X-Agent-Signature, X-Agent-Timestamp",
  },
}));

vi.mock("@/libs/config-constants", () => ({
  API_TIERS: {
    agent: { queryPriceUSDC: 0.01, ratePerMinute: 60 },
  },
}));

const mockProduct = {
  id: "prod-001",
  name: "Ledger Nano X",
  slug: "ledger-nano-x",
  url: "https://ledger.com",
  product_types: { name: "Hardware Wallet", slug: "hardware-wallet" },
};

const mockScore = {
  note_finale: 78.5,
  score_s: 82,
  score_a: 74,
  score_f: 80,
  score_e: 76,
  note_consumer: 70,
  note_essential: 65,
  total_norms_evaluated: 200,
  total_yes: 150,
  total_no: 30,
  total_na: 15,
  total_tbd: 5,
  calculated_at: "2025-06-01T00:00:00Z",
};

// Chainable mock supabase
function createChain(finalData) {
  const chain = {};
  const methods = ["from", "select", "eq", "order", "limit", "maybeSingle"];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  // maybeSingle resolves the chain
  chain.maybeSingle = vi.fn().mockResolvedValue({ data: finalData, error: null });
  return chain;
}

let supabaseChain;

vi.mock("@/libs/supabase", () => {
  const chain = createChain(mockProduct);
  supabaseChain = chain;
  return {
    supabase: chain,
    isSupabaseConfigured: vi.fn(() => true),
  };
});

// Dynamic import AFTER mocks are registered
const { GET, OPTIONS } = await import("@/app/api/agent/score/route");
const { authenticateAgent, debitAgentCredits } = await import("@/libs/agent-auth");

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("/api/agent/score", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset default mock implementations
    authenticateAgent.mockResolvedValue({ ...mockAuthResult });
    debitAgentCredits.mockResolvedValue({ success: true, newBalance: 9.99 });

    // Reset supabase chain — first call returns product, second returns score
    let callCount = 0;
    supabaseChain.from.mockImplementation(() => {
      callCount++;
      // Reset chain for each from() call
      supabaseChain.maybeSingle.mockResolvedValue({
        data: callCount === 1 ? mockProduct : mockScore,
        error: null,
      });
      return supabaseChain;
    });
  });

  // -------------------------------------------------------------------------
  // Authentication
  // -------------------------------------------------------------------------

  it("returns 401 when agent is not authenticated", async () => {
    authenticateAgent.mockResolvedValueOnce({
      authenticated: false,
      error: "Missing X-Agent-Wallet header",
    });

    const req = createMockRequest({
      url: "http://localhost:3000/api/agent/score?product=ledger-nano-x",
    });

    const res = await GET(req);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(401);
    expect(body.error).toContain("Missing");
  });

  it("returns 429 when rate limited", async () => {
    authenticateAgent.mockResolvedValueOnce({
      authenticated: true,
      wallet: mockAuthResult.wallet,
      rateLimited: true,
      rateLimit: { allowed: false, remaining: 0, resetIn: 30000, total: 60 },
    });

    const req = createMockRequest({
      url: "http://localhost:3000/api/agent/score?product=ledger-nano-x",
    });

    const res = await GET(req);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(429);
    expect(body.error).toBe("Rate limit exceeded");
    expect(body.retryAfter).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // Balance / payment
  // -------------------------------------------------------------------------

  it("returns 402 when wallet is not registered", async () => {
    authenticateAgent.mockResolvedValueOnce({
      ...mockAuthResult,
      access: { exists: false, balance: 0, hasStream: false },
    });

    const req = createMockRequest({
      url: "http://localhost:3000/api/agent/score?product=ledger-nano-x",
    });

    const res = await GET(req);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(402);
    expect(body.error).toContain("not registered");
  });

  it("returns 402 when balance is insufficient", async () => {
    authenticateAgent.mockResolvedValueOnce({
      ...mockAuthResult,
      access: { exists: true, balance: 0.001, hasStream: false },
    });

    const req = createMockRequest({
      url: "http://localhost:3000/api/agent/score?product=ledger-nano-x",
    });

    const res = await GET(req);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(402);
    expect(body.error).toContain("Insufficient");
  });

  // -------------------------------------------------------------------------
  // Validation
  // -------------------------------------------------------------------------

  it("returns 400 when product param is missing", async () => {
    const req = createMockRequest({
      url: "http://localhost:3000/api/agent/score",
    });

    const res = await GET(req);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(400);
    expect(body.error).toContain("product");
  });

  // -------------------------------------------------------------------------
  // Product not found
  // -------------------------------------------------------------------------

  it("returns 404 when product does not exist", async () => {
    supabaseChain.from.mockImplementation(() => {
      supabaseChain.maybeSingle.mockResolvedValue({ data: null, error: null });
      return supabaseChain;
    });

    const req = createMockRequest({
      url: "http://localhost:3000/api/agent/score?product=nonexistent",
    });

    const res = await GET(req);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(404);
    expect(body.error).toContain("not found");
  });

  // -------------------------------------------------------------------------
  // Successful response
  // -------------------------------------------------------------------------

  it("returns 200 with full score data on success", async () => {
    const req = createMockRequest({
      url: "http://localhost:3000/api/agent/score?product=ledger-nano-x",
    });

    const res = await GET(req);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(body.data.slug).toBe("ledger-nano-x");
    expect(body.data.scores).toBeDefined();
    expect(body.data.scores).toHaveProperty("s");
    expect(body.data.scores).toHaveProperty("a");
    expect(body.data.scores).toHaveProperty("f");
    expect(body.data.scores).toHaveProperty("e");
    expect(body.data.evaluation).toBeDefined();
    expect(body.payment).toBeDefined();
    expect(body.meta).toBeDefined();
    expect(body.meta.apiVersion).toBe("agent-1.0");
  });

  it("skips credit debit for streaming agents", async () => {
    authenticateAgent.mockResolvedValueOnce({
      ...mockAuthResult,
      access: { exists: true, balance: 0, hasStream: true },
    });

    const req = createMockRequest({
      url: "http://localhost:3000/api/agent/score?product=ledger-nano-x",
    });

    const res = await GET(req);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(200);
    expect(body.payment.method).toBe("stream");
    expect(body.payment.cost).toBe(0);
    expect(debitAgentCredits).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // CORS preflight
  // -------------------------------------------------------------------------

  it("OPTIONS returns CORS headers", async () => {
    const res = await OPTIONS();
    expect(res.status).toBe(200);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});
