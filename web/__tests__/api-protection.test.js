/**
 * Tests for api-protection.js
 * Covers: filterResponseData
 */
import { describe, it, expect, vi } from "vitest";

// Mock dependencies
vi.mock("@/libs/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/libs/rate-limit", () => ({
  checkRateLimit: vi.fn(() => ({ allowed: true, remaining: 100, resetIn: 60000, total: 100 })),
  getClientId: vi.fn(() => "test-client-id"),
  logSuspiciousActivity: vi.fn(),
  isClientBlocked: vi.fn(() => false),
}));

const { filterResponseData } = await import("@/libs/api-protection");

describe("api-protection", () => {
  describe("filterResponseData", () => {
    it("limits array items for unauthenticated users", () => {
      const data = {
        items: Array.from({ length: 100 }, (_, i) => ({ id: i })),
      };
      const context = {
        isAuthenticated: false,
        maxLimit: 10,
        sensitiveFields: [],
      };

      const result = filterResponseData(data, context);
      expect(result.items).toHaveLength(10);
      expect(result._limited).toBe(true);
      expect(result._maxItems).toBe(10);
    });

    it("allows more items for authenticated users", () => {
      const data = {
        items: Array.from({ length: 100 }, (_, i) => ({ id: i })),
      };
      const context = {
        isAuthenticated: true,
        maxLimit: 500,
        sensitiveFields: [],
      };

      const result = filterResponseData(data, context);
      expect(result.items).toHaveLength(100);
    });

    it("removes sensitive fields for unauthenticated users", () => {
      const data = {
        name: "Test Product",
        secretKey: "abc123",
        internalScore: 42,
      };
      const context = {
        isAuthenticated: false,
        maxLimit: 50,
        sensitiveFields: ["secretKey", "internalScore"],
      };

      const result = filterResponseData(data, context);
      expect(result.name).toBe("Test Product");
      expect(result.secretKey).toBeUndefined();
      expect(result.internalScore).toBeUndefined();
    });

    it("preserves sensitive fields for authenticated users", () => {
      const data = {
        name: "Test Product",
        secretKey: "abc123",
      };
      const context = {
        isAuthenticated: true,
        maxLimit: 500,
        sensitiveFields: ["secretKey"],
      };

      const result = filterResponseData(data, context);
      expect(result.secretKey).toBe("abc123");
    });

    it("removes sensitive top-level fields from data object", () => {
      const data = {
        items: [
          { id: 1, name: "A" },
        ],
        internalMetric: 42,
        debugInfo: "sensitive",
      };
      const context = {
        isAuthenticated: false,
        maxLimit: 50,
        sensitiveFields: ["internalMetric", "debugInfo"],
      };

      const result = filterResponseData(data, context);
      expect(result.internalMetric).toBeUndefined();
      expect(result.debugInfo).toBeUndefined();
      expect(result.items[0].name).toBe("A");
    });

    it("supports custom itemsKey", () => {
      const data = {
        products: Array.from({ length: 20 }, (_, i) => ({ id: i })),
      };
      const context = {
        isAuthenticated: false,
        maxLimit: 5,
        sensitiveFields: [],
      };

      const result = filterResponseData(data, context, { itemsKey: "products" });
      expect(result.products).toHaveLength(5);
    });
  });
});
