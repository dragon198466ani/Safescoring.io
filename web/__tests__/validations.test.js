/**
 * Tests for validations.js (Zod schemas)
 */
import { describe, it, expect } from "vitest";
import {
  searchQuerySchema,
  productsQuerySchema,
  newsletterSchema,
  claimSchema,
  leadSchema,
  userCorrectionSchema,
  slugSchema,
  validateSearchParams,
  validateBody,
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

    it("accepts all valid sort values", () => {
      for (const sort of ["score-desc", "score-asc", "name-asc", "name-desc", "recent"]) {
        const result = productsQuerySchema.safeParse({ sort });
        expect(result.success).toBe(true);
      }
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

    it("accepts optional category and type", () => {
      const result = productsQuerySchema.safeParse({ category: "hardware", type: "cold-wallet" });
      expect(result.success).toBe(true);
      expect(result.data.category).toBe("hardware");
      expect(result.data.type).toBe("cold-wallet");
    });
  });

  describe("newsletterSchema", () => {
    it("accepts valid email with default source", () => {
      const result = newsletterSchema.safeParse({ email: "user@example.com" });
      expect(result.success).toBe(true);
      expect(result.data.source).toBe("website");
    });

    it("accepts email with custom source", () => {
      const result = newsletterSchema.safeParse({ email: "user@example.com", source: "footer" });
      expect(result.success).toBe(true);
      expect(result.data.source).toBe("footer");
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

  describe("leadSchema", () => {
    it("accepts valid email", () => {
      const result = leadSchema.safeParse({ email: "lead@company.com" });
      expect(result.success).toBe(true);
    });

    it("rejects invalid email", () => {
      const result = leadSchema.safeParse({ email: "bad" });
      expect(result.success).toBe(false);
    });

    it("rejects missing email", () => {
      const result = leadSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("claimSchema", () => {
    it("accepts valid claim with all required fields", () => {
      const result = claimSchema.safeParse({
        companyName: "Test Corp",
        contactName: "John Doe",
        email: "admin@test.com",
        role: "CEO",
        captchaToken: "token123",
      });
      expect(result.success).toBe(true);
      expect(result.data.dnsVerified).toBe(false); // default
    });

    it("accepts claim with all optional fields", () => {
      const result = claimSchema.safeParse({
        productSlug: "ledger-nano-x",
        companyName: "Ledger",
        contactName: "Jane",
        email: "jane@ledger.com",
        website: "https://ledger.com",
        role: "CTO",
        message: "We want to claim this product",
        discord: "ledger#1234",
        twitter: "@ledger",
        telegram: "@ledger_official",
        captchaToken: "xyz789",
        dnsVerified: true,
        dnsToken: "abc-dns-token",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing companyName", () => {
      const result = claimSchema.safeParse({
        contactName: "John",
        email: "a@b.com",
        role: "CEO",
        captchaToken: "token",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing contactName", () => {
      const result = claimSchema.safeParse({
        companyName: "Test",
        email: "a@b.com",
        role: "CEO",
        captchaToken: "token",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid email", () => {
      const result = claimSchema.safeParse({
        companyName: "Test",
        contactName: "John",
        email: "not-email",
        role: "CEO",
        captchaToken: "token",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing captcha token", () => {
      const result = claimSchema.safeParse({
        companyName: "Test",
        contactName: "John",
        email: "a@b.com",
        role: "CEO",
        captchaToken: "",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("userCorrectionSchema", () => {
    it("accepts valid correction with productId", () => {
      const result = userCorrectionSchema.safeParse({
        productId: "123e4567-e89b-12d3-a456-426614174000",
        fieldCorrected: "evaluation",
        suggestedValue: "YES",
      });
      expect(result.success).toBe(true);
      expect(result.data.evidenceUrls).toEqual([]);
    });

    it("accepts valid correction with productSlug", () => {
      const result = userCorrectionSchema.safeParse({
        productSlug: "ledger-nano-x",
        fieldCorrected: "product_info",
        suggestedValue: '{"url":"https://ledger.com"}',
      });
      expect(result.success).toBe(true);
    });

    it("accepts all valid field types", () => {
      for (const field of ["evaluation", "product_info", "incident", "methodology", "other"]) {
        const result = userCorrectionSchema.safeParse({
          productId: "123e4567-e89b-12d3-a456-426614174000",
          fieldCorrected: field,
          suggestedValue: "test",
        });
        expect(result.success).toBe(true);
      }
    });

    it("rejects invalid field type", () => {
      const result = userCorrectionSchema.safeParse({
        productId: "123e4567-e89b-12d3-a456-426614174000",
        fieldCorrected: "invalid_field",
        suggestedValue: "test",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing both productId and productSlug", () => {
      const result = userCorrectionSchema.safeParse({
        fieldCorrected: "evaluation",
        suggestedValue: "YES",
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty suggestedValue", () => {
      const result = userCorrectionSchema.safeParse({
        productId: "123e4567-e89b-12d3-a456-426614174000",
        fieldCorrected: "evaluation",
        suggestedValue: "",
      });
      expect(result.success).toBe(false);
    });

    it("accepts evidence URLs", () => {
      const result = userCorrectionSchema.safeParse({
        productId: "123e4567-e89b-12d3-a456-426614174000",
        fieldCorrected: "incident",
        suggestedValue: "Updated info",
        evidenceUrls: ["https://example.com/proof1", "https://example.com/proof2"],
        evidenceDescription: "See attached links",
      });
      expect(result.success).toBe(true);
      expect(result.data.evidenceUrls).toHaveLength(2);
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

    it("applies defaults for missing params", () => {
      const params = new URLSearchParams("");
      const result = validateSearchParams(params, productsQuerySchema);
      expect(result.success).toBe(true);
      expect(result.data.sort).toBe("score-desc");
      expect(result.data.limit).toBe(100);
    });
  });

  describe("validateBody", () => {
    it("validates JSON body correctly", async () => {
      const mockRequest = {
        json: async () => ({ email: "user@example.com" }),
      };
      const result = await validateBody(mockRequest, leadSchema);
      expect(result.success).toBe(true);
      expect(result.data.email).toBe("user@example.com");
    });

    it("returns error for invalid body", async () => {
      const mockRequest = {
        json: async () => ({ email: "bad" }),
      };
      const result = await validateBody(mockRequest, leadSchema);
      expect(result.success).toBe(false);
      expect(result.error).toContain("email");
    });

    it("handles JSON parse errors", async () => {
      const mockRequest = {
        json: async () => { throw new Error("Invalid JSON"); },
      };
      const result = await validateBody(mockRequest, leadSchema);
      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid JSON body");
    });
  });
});
