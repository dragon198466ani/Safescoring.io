/**
 * Tests for validations.js (Zod schemas)
 */
import { describe, it, expect } from "vitest";
import {
  searchQuerySchema,
  productsQuerySchema,
  newsletterSchema,
  claimSchema,
  slugSchema,
  validateSearchParams,
} from "@/libs/validations";

describe("validations", () => {
  describe("searchQuerySchema", () => {
    it("accepts valid search query", () => {
      const result = searchQuerySchema.safeParse({ q: "ledger", limit: "10" });
      expect(result.success).toBe(true);
      expect(result.data.q).toBe("ledger");
      expect(result.data.limit).toBe(10);
    });

    it("rejects query shorter than 2 chars", () => {
      const result = searchQuerySchema.safeParse({ q: "a" });
      expect(result.success).toBe(false);
    });

    it("rejects query longer than 200 chars", () => {
      const result = searchQuerySchema.safeParse({ q: "a".repeat(201) });
      expect(result.success).toBe(false);
    });

    it("caps limit at 50", () => {
      const result = searchQuerySchema.safeParse({ q: "test", limit: "100" });
      expect(result.success).toBe(false);
    });

    it("defaults limit to 10", () => {
      const result = searchQuerySchema.safeParse({ q: "test" });
      expect(result.success).toBe(true);
      expect(result.data.limit).toBe(10);
    });

    it("allows optional type", () => {
      const result = searchQuerySchema.safeParse({ q: "test", type: "hardware" });
      expect(result.success).toBe(true);
      expect(result.data.type).toBe("hardware");
    });
  });

  describe("productsQuerySchema", () => {
    it("accepts valid products query with defaults", () => {
      const result = productsQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      expect(result.data.sort).toBe("score-desc");
      expect(result.data.scoreType).toBe("full");
      expect(result.data.limit).toBe(100);
      expect(result.data.offset).toBe(0);
    });

    it("rejects invalid sort value", () => {
      const result = productsQuerySchema.safeParse({ sort: "invalid" });
      expect(result.success).toBe(false);
    });

    it("rejects invalid scoreType", () => {
      const result = productsQuerySchema.safeParse({ scoreType: "mega" });
      expect(result.success).toBe(false);
    });

    it("caps limit at 500", () => {
      const result = productsQuerySchema.safeParse({ limit: "1000" });
      expect(result.success).toBe(false);
    });
  });

  describe("newsletterSchema", () => {
    it("accepts valid email", () => {
      const result = newsletterSchema.safeParse({ email: "user@example.com" });
      expect(result.success).toBe(true);
    });

    it("rejects invalid email", () => {
      const result = newsletterSchema.safeParse({ email: "not-an-email" });
      expect(result.success).toBe(false);
    });

    it("rejects empty email", () => {
      const result = newsletterSchema.safeParse({ email: "" });
      expect(result.success).toBe(false);
    });
  });

  describe("claimSchema", () => {
    it("accepts valid claim", () => {
      const result = claimSchema.safeParse({
        productId: "123e4567-e89b-12d3-a456-426614174000",
        companyName: "Test Corp",
        email: "admin@test.com",
        role: "CEO",
        turnstileToken: "token123",
      });
      expect(result.success).toBe(true);
    });

    it("rejects non-UUID productId", () => {
      const result = claimSchema.safeParse({
        productId: "not-a-uuid",
        companyName: "Test",
        email: "a@b.com",
        role: "CEO",
        turnstileToken: "token",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing turnstile token", () => {
      const result = claimSchema.safeParse({
        productId: "123e4567-e89b-12d3-a456-426614174000",
        companyName: "Test",
        email: "a@b.com",
        role: "CEO",
        turnstileToken: "",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("slugSchema", () => {
    it("accepts valid slugs", () => {
      expect(slugSchema.safeParse("ledger-nano-x").success).toBe(true);
      expect(slugSchema.safeParse("trezor").success).toBe(true);
      expect(slugSchema.safeParse("safe-wallet-123").success).toBe(true);
    });

    it("rejects invalid slugs", () => {
      expect(slugSchema.safeParse("").success).toBe(false);
      expect(slugSchema.safeParse("Invalid Slug").success).toBe(false);
      expect(slugSchema.safeParse("slug_with_underscore").success).toBe(false);
    });
  });

  describe("validateSearchParams", () => {
    it("parses URLSearchParams correctly", () => {
      const params = new URLSearchParams("q=ledger&limit=5");
      const result = validateSearchParams(params, searchQuerySchema);
      expect(result.success).toBe(true);
      expect(result.data.q).toBe("ledger");
      expect(result.data.limit).toBe(5);
    });

    it("returns error for invalid params", () => {
      const params = new URLSearchParams("q=a");
      const result = validateSearchParams(params, searchQuerySchema);
      expect(result.success).toBe(false);
      expect(result.error).toContain("q");
    });
  });
});
