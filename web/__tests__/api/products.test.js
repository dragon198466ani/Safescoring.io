/**
 * Tests for /api/products route
 *
 * Covers:
 *  - Supabase not configured (500)
 *  - Invalid query parameters (400 via Zod validation)
 *  - Successful products listing shape
 *  - Unauthenticated access limits
 *  - Authenticated / paid access limits
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockRequest, parseResponse } from "./helpers";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/libs/auth", () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/libs/user-protection", () => ({
  protectAuthenticatedRequest: vi.fn().mockResolvedValue({ allowed: true, delay: 0 }),
  getDataLimitForUser: vi.fn(() => ({ products: 500 })),
  sleep: vi.fn(),
  calculatePublicDelay: vi.fn(() => 0),
}));

vi.mock("@/libs/api-protection", () => ({
  quickProtect: vi.fn().mockResolvedValue({ blocked: false, clientId: "test-client" }),
  getClientId: vi.fn(() => "test-client-id-12"),
}));

const sampleProducts = [
  {
    id: "p1",
    name: "Ledger Nano X",
    slug: "ledger-nano-x",
    url: "https://ledger.com",
    type_id: "t1",
    media: [],
    product_types: {
      code: "hardware-wallet",
      name: "Hardware Wallet",
      category: "hardware",
      is_hardware: true,
      is_custodial: false,
    },
    product_type_mapping: [],
    safe_scoring_results: {
      note_finale: 85,
      score_s: 90,
      score_a: 80,
      score_f: 82,
      score_e: 88,
      note_consumer: 78,
      s_consumer: 80,
      a_consumer: 75,
      f_consumer: 77,
      e_consumer: 80,
      note_essential: 72,
      s_essential: 75,
      a_essential: 70,
      f_essential: 72,
      e_essential: 71,
      total_norms_evaluated: 200,
      total_yes: 170,
      total_no: 20,
      total_na: 10,
      calculated_at: "2025-06-01T00:00:00Z",
    },
  },
  {
    id: "p2",
    name: "Trezor Model T",
    slug: "trezor-model-t",
    url: "https://trezor.io",
    type_id: "t1",
    media: [],
    product_types: {
      code: "hardware-wallet",
      name: "Hardware Wallet",
      category: "hardware",
      is_hardware: true,
      is_custodial: false,
    },
    product_type_mapping: [],
    safe_scoring_results: {
      note_finale: 72,
      score_s: 75,
      score_a: 70,
      score_f: 73,
      score_e: 70,
      note_consumer: 65,
      s_consumer: 67,
      a_consumer: 63,
      f_consumer: 65,
      e_consumer: 65,
      note_essential: 60,
      s_essential: 62,
      a_essential: 58,
      f_essential: 60,
      e_essential: 60,
      total_norms_evaluated: 200,
      total_yes: 140,
      total_no: 40,
      total_na: 20,
      calculated_at: "2025-05-15T00:00:00Z",
    },
  },
];

// Chainable supabase mock
function buildSupabaseChain(products) {
  const chain = {};
  const methods = [
    "from", "select", "eq", "neq", "ilike", "order", "range",
    "limit", "in", "not", "or", "filter",
  ];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  // The final await resolves the chain
  chain.then = (resolve) =>
    resolve({ data: products, error: null, count: products.length });
  return chain;
}

let supabaseChain = buildSupabaseChain(sampleProducts);

vi.mock("@/libs/supabase", () => ({
  supabase: new Proxy(
    {},
    {
      get(_, prop) {
        return supabaseChain[prop];
      },
    }
  ),
  isSupabaseConfigured: vi.fn(() => true),
}));

// Dynamic import after mocks
const { GET } = await import("@/app/api/products/route");
const { auth } = await import("@/libs/auth");
const { isSupabaseConfigured } = await import("@/libs/supabase");

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("/api/products", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.mockResolvedValue(null);
    isSupabaseConfigured.mockReturnValue(true);
    supabaseChain = buildSupabaseChain(sampleProducts);
  });

  // -------------------------------------------------------------------------
  // Error states
  // -------------------------------------------------------------------------

  it("returns 500 when Supabase is not configured", async () => {
    isSupabaseConfigured.mockReturnValue(false);

    const req = createMockRequest({ url: "http://localhost:3000/api/products" });
    const res = await GET(req);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(500);
    expect(body.error).toContain("Supabase");
  });

  it("returns 400 for invalid sort parameter", async () => {
    const req = createMockRequest({
      url: "http://localhost:3000/api/products?sort=invalid",
    });

    const res = await GET(req);
    const { status } = await parseResponse(res);

    expect(status).toBe(400);
  });

  // -------------------------------------------------------------------------
  // Successful listing
  // -------------------------------------------------------------------------

  it("returns 200 with products array for unauthenticated request", async () => {
    const req = createMockRequest({ url: "http://localhost:3000/api/products" });
    const res = await GET(req);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(200);
    expect(body.products).toBeDefined();
    expect(Array.isArray(body.products)).toBe(true);
    expect(body.total).toBeDefined();
  });

  it("transforms product data correctly", async () => {
    const req = createMockRequest({ url: "http://localhost:3000/api/products" });
    const res = await GET(req);
    const { body } = await parseResponse(res);

    const product = body.products[0];
    expect(product.slug).toBe("ledger-nano-x");
    expect(product.name).toBe("Ledger Nano X");
    expect(product.scores).toBeDefined();
    expect(product.scores.total).toBe(85);
    expect(product.scores.s).toBe(90);
    expect(product.consumerScores).toBeDefined();
    expect(product.essentialScores).toBeDefined();
    expect(product.stats).toBeDefined();
    expect(product.verified).toBe(true);
    expect(product.category).toBe("hardware");
  });

  it("includes upgrade message for unauthenticated users", async () => {
    const req = createMockRequest({ url: "http://localhost:3000/api/products" });
    const res = await GET(req);
    const { body } = await parseResponse(res);

    expect(body._upgrade).toBeDefined();
    expect(body._upgrade).toContain("free account");
  });

  it("includes watermark in response", async () => {
    const req = createMockRequest({ url: "http://localhost:3000/api/products" });
    const res = await GET(req);
    const { body } = await parseResponse(res);

    expect(body._ss).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // Authenticated user
  // -------------------------------------------------------------------------

  it("returns different upgrade message for authenticated non-paid user", async () => {
    auth.mockResolvedValueOnce({
      user: { id: "user-1", hasAccess: false },
    });

    const req = createMockRequest({ url: "http://localhost:3000/api/products" });
    const res = await GET(req);
    const { body } = await parseResponse(res);

    expect(body._upgrade).toContain("Professional");
  });

  it("omits upgrade message for paid user", async () => {
    auth.mockResolvedValueOnce({
      user: { id: "user-1", hasAccess: true },
    });

    const req = createMockRequest({ url: "http://localhost:3000/api/products" });
    const res = await GET(req);
    const { body } = await parseResponse(res);

    expect(body._upgrade).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // Empty results
  // -------------------------------------------------------------------------

  it("returns empty array when no products match", async () => {
    supabaseChain = buildSupabaseChain([]);
    // Re-wire the proxy
    supabaseChain.then = (resolve) =>
      resolve({ data: [], error: null, count: 0 });

    const req = createMockRequest({
      url: "http://localhost:3000/api/products?category=nonexistent",
    });

    const res = await GET(req);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(200);
    expect(body.products).toEqual([]);
    expect(body.total).toBe(0);
  });
});
