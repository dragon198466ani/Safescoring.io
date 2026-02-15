/**
 * Tests for admin-auth.js
 * Covers: isAdminEmail, getUserRole, logAdminAction, unauthorizedResponse, forbiddenResponse
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the auth module
vi.mock("@/libs/auth", () => ({
  auth: vi.fn(),
}));

const { isAdminEmail, getUserRole, ROLES, logAdminAction, unauthorizedResponse, forbiddenResponse } =
  await import("@/libs/admin-auth");

describe("admin-auth", () => {
  describe("isAdminEmail", () => {
    it("returns true for admin email", () => {
      expect(isAdminEmail("admin@safescoring.io")).toBe(true);
    });

    it("is case insensitive", () => {
      expect(isAdminEmail("ADMIN@SAFESCORING.IO")).toBe(true);
      expect(isAdminEmail("Admin@SafeScoring.io")).toBe(true);
    });

    it("returns false for non-admin email", () => {
      expect(isAdminEmail("user@example.com")).toBe(false);
    });

    it("returns false for null/undefined", () => {
      expect(isAdminEmail(null)).toBe(false);
      expect(isAdminEmail(undefined)).toBe(false);
      expect(isAdminEmail("")).toBe(false);
    });
  });

  describe("getUserRole", () => {
    it("returns SUPER_ADMIN for first admin in list", () => {
      expect(getUserRole("admin@safescoring.io")).toBe(ROLES.SUPER_ADMIN);
    });

    it("returns USER for non-admin email", () => {
      expect(getUserRole("user@example.com")).toBe(ROLES.USER);
    });

    it("returns USER for null/undefined", () => {
      expect(getUserRole(null)).toBe(ROLES.USER);
      expect(getUserRole(undefined)).toBe(ROLES.USER);
    });
  });

  describe("ROLES", () => {
    it("has expected role values", () => {
      expect(ROLES.USER).toBe("user");
      expect(ROLES.ADMIN).toBe("admin");
      expect(ROLES.SUPER_ADMIN).toBe("super_admin");
    });
  });

  describe("logAdminAction", () => {
    it("returns structured log entry", async () => {
      const entry = await logAdminAction({
        adminEmail: "admin@safescoring.io",
        action: "test_action",
        resource: "test_resource",
        details: { key: "value" },
      });

      expect(entry).toHaveProperty("timestamp");
      expect(entry.admin_email).toBe("admin@safescoring.io");
      expect(entry.action).toBe("test_action");
      expect(entry.resource).toBe("test_resource");
      expect(entry.details).toEqual({ key: "value" });
    });

    it("handles empty details", async () => {
      const entry = await logAdminAction({
        adminEmail: "admin@safescoring.io",
        action: "test",
        resource: "test",
      });
      expect(entry.details).toEqual({});
    });
  });

  describe("unauthorizedResponse", () => {
    it("returns 401 response", async () => {
      const response = unauthorizedResponse();
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe("Unauthorized");
    });

    it("supports custom message", async () => {
      const response = unauthorizedResponse("Custom message");
      const body = await response.json();
      expect(body.error).toBe("Custom message");
    });
  });

  describe("forbiddenResponse", () => {
    it("returns 403 response", async () => {
      const response = forbiddenResponse();
      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toBe("Forbidden");
    });
  });
});
