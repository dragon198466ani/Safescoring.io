/**
 * Tests for /api/health route (basic suite)
 *
 * The health endpoint returns a comprehensive checks object:
 * { status, checks: { supabase, environment, runtime, crons }, timestamp }
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase — simulate configured + connectable
vi.mock("@/libs/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => Promise.resolve({ count: 1547, error: null })),
    })),
  },
  isSupabaseConfigured: vi.fn(() => true),
}));

const { GET } = await import("@/app/api/health/route");

describe("/api/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns health status with expected shape", async () => {
    const response = await GET();
    const body = await response.json();

    expect(body.status).toBeDefined();
    expect(body.timestamp).toBeDefined();
    expect(body.checks).toBeDefined();
    expect(body.checks.supabase).toBeDefined();
    expect(body.checks.environment).toBeDefined();
    expect(body.checks.runtime).toBeDefined();
    expect(body.checks.crons).toBeDefined();
  });

  it("includes valid ISO timestamp", async () => {
    const response = await GET();
    const body = await response.json();

    const parsed = new Date(body.timestamp);
    expect(parsed.getTime()).not.toBeNaN();
  });
});
