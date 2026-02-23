/**
 * Tests for /api/health route
 *
 * Covers:
 *  - Healthy response with supabase connected
 *  - Response shape (status, timestamp, checks)
 *  - Supabase not configured scenario
 *  - Degraded state when env vars missing
 *
 * The health route was rewritten to return a comprehensive checks object:
 * { status, checks: { supabase, environment, runtime, crons }, timestamp }
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseResponse } from "./helpers";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/libs/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => Promise.resolve({ count: 1547, error: null })),
    })),
  },
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

  it("returns response with health status", async () => {
    const res = await GET();
    const { body } = await parseResponse(res);

    expect(body.status).toBeDefined();
    expect(["ok", "degraded"]).toContain(body.status);
  });

  it("includes a valid ISO timestamp", async () => {
    const res = await GET();
    const { body } = await parseResponse(res);

    expect(body.timestamp).toBeDefined();
    const parsed = new Date(body.timestamp);
    expect(parsed.getTime()).not.toBeNaN();
  });

  it("reports supabase status in checks when configured", async () => {
    const res = await GET();
    const { body } = await parseResponse(res);

    expect(body.checks).toBeDefined();
    expect(body.checks.supabase).toBeDefined();
    expect(body.checks.supabase.status).toBe("connected");
  });

  it("reports supabase as not_configured when unavailable", async () => {
    isSupabaseConfigured.mockReturnValue(false);

    const res = await GET();
    const { body } = await parseResponse(res);

    expect(body.checks.supabase.status).toBe("not_configured");
  });

  it("returns degraded when supabase not configured", async () => {
    isSupabaseConfigured.mockReturnValue(false);

    const res = await GET();
    const { body } = await parseResponse(res);

    expect(body.status).toBe("degraded");
  });

  it("response shape matches expected contract", async () => {
    const res = await GET();
    const { body } = await parseResponse(res);

    expect(body).toEqual(
      expect.objectContaining({
        status: expect.any(String),
        timestamp: expect.any(String),
        checks: expect.objectContaining({
          supabase: expect.any(Object),
          environment: expect.any(Object),
          runtime: expect.any(Object),
          crons: expect.any(Object),
        }),
      })
    );
  });
});
