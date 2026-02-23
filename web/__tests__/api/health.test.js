/**
 * Tests for /api/health route
 *
 * Covers:
 *  - Healthy response with supabase connected
 *  - Response shape (status, timestamp, services)
 *  - Supabase not configured scenario
 *
 * NOTE: This file replaces the previous __tests__/health.test.js and lives
 *       alongside the other API tests under __tests__/api/.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseResponse } from "./helpers";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/libs/supabase", () => ({
  supabase: {},
  isSupabaseConfigured: vi.fn(() => true),
}));

const { GET } = await import("@/app/api/health/route");
const { isSupabaseConfigured } = await import("@/libs/supabase");

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("/api/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isSupabaseConfigured.mockReturnValue(true);
  });

  it("returns 200 with health status", async () => {
    const res = await GET();
    const { status, body } = await parseResponse(res);

    expect(status).toBe(200);
    expect(body.status).toBe("ok");
  });

  it("includes a valid ISO timestamp", async () => {
    const res = await GET();
    const { body } = await parseResponse(res);

    expect(body.timestamp).toBeDefined();
    // Verify it parses as a valid date
    const parsed = new Date(body.timestamp);
    expect(parsed.getTime()).not.toBeNaN();
  });

  it("reports supabase as connected when configured", async () => {
    const res = await GET();
    const { body } = await parseResponse(res);

    expect(body.services).toBeDefined();
    expect(body.services.supabase).toBe("connected");
  });

  it("reports supabase as not_configured when unavailable", async () => {
    isSupabaseConfigured.mockReturnValue(false);

    const res = await GET();
    const { body } = await parseResponse(res);

    expect(body.services.supabase).toBe("not_configured");
  });

  it("always returns status ok regardless of supabase state", async () => {
    isSupabaseConfigured.mockReturnValue(false);

    const res = await GET();
    const { body } = await parseResponse(res);

    // The health endpoint itself should always be ok
    expect(body.status).toBe("ok");
  });

  it("response shape matches expected contract", async () => {
    const res = await GET();
    const { body } = await parseResponse(res);

    // Verify the full shape
    expect(body).toEqual(
      expect.objectContaining({
        status: expect.any(String),
        timestamp: expect.any(String),
        services: expect.objectContaining({
          supabase: expect.any(String),
        }),
      })
    );
  });
});
