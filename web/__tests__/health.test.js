/**
 * Tests for /api/health route
 */
import { describe, it, expect, vi } from "vitest";

// Mock supabase
vi.mock("@/libs/supabase", () => ({
  supabase: {},
  isSupabaseConfigured: vi.fn(() => true),
}));

const { GET } = await import("@/app/api/health/route");

describe("/api/health", () => {
  it("returns 200 with health status", async () => {
    const response = await GET();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.status).toBe("ok");
    expect(body.timestamp).toBeDefined();
    expect(body.services.supabase).toBe("connected");
  });

  it("reports supabase as not_configured when unavailable", async () => {
    const { isSupabaseConfigured } = await import("@/libs/supabase");
    isSupabaseConfigured.mockReturnValueOnce(false);

    const response = await GET();
    const body = await response.json();
    expect(body.services.supabase).toBe("not_configured");
  });
});
