/**
 * Tests for rate-limit.js
 * Covers: checkRateLimit, getClientId, isClientBlocked, logSuspiciousActivity
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock the module-level setInterval to prevent it from running in tests
vi.useFakeTimers();

// We need to import after mocking
const { checkRateLimit, getClientId, logSuspiciousActivity, isClientBlocked, RATE_LIMITS } =
  await import("@/libs/rate-limit");

describe("rate-limit", () => {
  beforeEach(() => {
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));
  });

  describe("getClientId", () => {
    it("extracts IP from x-forwarded-for header", () => {
      const request = {
        headers: new Map([
          ["x-forwarded-for", "1.2.3.4, 5.6.7.8"],
          ["user-agent", "Mozilla/5.0 TestBrowser"],
        ]),
      };
      request.headers.get = (key) => request.headers.get(key);
      // Mock headers.get properly
      const mockHeaders = {
        get: (key) => {
          const map = {
            "x-forwarded-for": "1.2.3.4, 5.6.7.8",
            "x-real-ip": null,
            "cf-connecting-ip": null,
            "user-agent": "Mozilla/5.0 TestBrowser",
          };
          return map[key] || null;
        },
      };
      const id = getClientId({ headers: mockHeaders });
      expect(id).toContain("1.2.3.4");
    });

    it("prefers cf-connecting-ip over other headers", () => {
      const mockHeaders = {
        get: (key) => {
          const map = {
            "cf-connecting-ip": "10.0.0.1",
            "x-forwarded-for": "1.2.3.4",
            "x-real-ip": "5.6.7.8",
            "user-agent": "TestUA",
          };
          return map[key] || null;
        },
      };
      const id = getClientId({ headers: mockHeaders });
      expect(id).toContain("10.0.0.1");
    });

    it("returns unknown IP when no headers present", () => {
      const mockHeaders = {
        get: () => null,
      };
      const id = getClientId({ headers: mockHeaders });
      expect(id).toContain("unknown");
    });
  });

  describe("checkRateLimit", () => {
    it("allows requests within limit", () => {
      const clientId = `test-allow-${Date.now()}`;
      const result = checkRateLimit(clientId, "public");
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThan(0);
      expect(result.blocked).toBe(false);
    });

    it("denies requests exceeding limit", () => {
      const clientId = `test-deny-${Date.now()}`;
      const maxReqs = RATE_LIMITS.public.maxRequests;

      // Exhaust all requests
      for (let i = 0; i < maxReqs; i++) {
        checkRateLimit(clientId, "public");
      }

      // Next request should be denied
      const result = checkRateLimit(clientId, "public");
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it("resets after window expires", () => {
      const clientId = `test-reset-${Date.now()}`;
      const maxReqs = RATE_LIMITS.public.maxRequests;

      // Exhaust all requests
      for (let i = 0; i < maxReqs + 1; i++) {
        checkRateLimit(clientId, "public");
      }

      // Advance time past the window
      vi.advanceTimersByTime(RATE_LIMITS.public.windowMs + 1);

      // Should be allowed again
      const result = checkRateLimit(clientId, "public");
      expect(result.allowed).toBe(true);
    });

    it("uses correct limits for different types", () => {
      const clientId = `test-types-${Date.now()}`;

      const publicResult = checkRateLimit(clientId, "public");
      expect(publicResult.total).toBe(RATE_LIMITS.public.maxRequests);

      const adminResult = checkRateLimit(`${clientId}-admin`, "admin");
      expect(adminResult.total).toBe(RATE_LIMITS.admin.maxRequests);
    });

    it("falls back to public limits for unknown type", () => {
      const clientId = `test-fallback-${Date.now()}`;
      const result = checkRateLimit(clientId, "nonexistent");
      expect(result.total).toBe(RATE_LIMITS.public.maxRequests);
    });
  });

  describe("logSuspiciousActivity", () => {
    it("logs and tracks suspicious events", () => {
      const clientId = `suspicious-${Date.now()}`;
      const count = logSuspiciousActivity(clientId, "/api/test", "test-reason");
      expect(count).toBe(1);

      const count2 = logSuspiciousActivity(clientId, "/api/test", "test-reason-2");
      expect(count2).toBe(2);
    });
  });

  describe("isClientBlocked", () => {
    it("returns false for unknown clients", () => {
      expect(isClientBlocked(`unknown-${Date.now()}`)).toBe(false);
    });

    it("blocks client after 50+ violations in an hour", () => {
      const clientId = `block-test-${Date.now()}`;

      // Log 51 violations
      for (let i = 0; i < 51; i++) {
        logSuspiciousActivity(clientId, "/api/test", `violation-${i}`);
      }

      expect(isClientBlocked(clientId)).toBe(true);
    });
  });
});
