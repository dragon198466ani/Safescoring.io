import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the auth module before importing admin-auth
vi.mock("@/libs/auth", () => ({
  auth: vi.fn(),
}));

// Mock the supabase module before importing admin-auth
vi.mock("@/libs/supabase", () => ({
  supabaseAdmin: null,
}));

import {
  isAdminEmail,
  getUserRole,
  requireAdmin,
  ROLES,
} from "@/libs/admin-auth";
import { auth } from "@/libs/auth";

describe("admin-auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("isAdminEmail", () => {
    it("returns true for admin email", () => {
      // Default ADMIN_EMAILS includes "admin@safescoring.io"
      expect(isAdminEmail("admin@safescoring.io")).toBe(true);
    });

    it("returns true for admin email regardless of case", () => {
      expect(isAdminEmail("ADMIN@SAFESCORING.IO")).toBe(true);
    });

    it("returns false for non-admin email", () => {
      expect(isAdminEmail("user@example.com")).toBe(false);
    });

    it("returns false for null or undefined", () => {
      expect(isAdminEmail(null)).toBe(false);
      expect(isAdminEmail(undefined)).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(isAdminEmail("")).toBe(false);
    });
  });

  describe("getUserRole", () => {
    it("returns SUPER_ADMIN for the first admin email", () => {
      // The first email in ADMIN_EMAILS is super admin
      expect(getUserRole("admin@safescoring.io")).toBe(ROLES.SUPER_ADMIN);
    });

    it("returns USER for non-admin email", () => {
      expect(getUserRole("user@example.com")).toBe(ROLES.USER);
    });

    it("returns USER for null or undefined", () => {
      expect(getUserRole(null)).toBe(ROLES.USER);
      expect(getUserRole(undefined)).toBe(ROLES.USER);
    });

    it("is case-insensitive", () => {
      expect(getUserRole("ADMIN@SAFESCORING.IO")).toBe(ROLES.SUPER_ADMIN);
    });
  });

  describe("requireAdmin", () => {
    it("returns null for unauthenticated requests (no session)", async () => {
      auth.mockResolvedValue(null);

      const result = await requireAdmin();
      expect(result).toBeNull();
    });

    it("returns null when session has no user", async () => {
      auth.mockResolvedValue({ user: null });

      const result = await requireAdmin();
      expect(result).toBeNull();
    });

    it("returns null when session user has no email", async () => {
      auth.mockResolvedValue({ user: { name: "Test" } });

      const result = await requireAdmin();
      expect(result).toBeNull();
    });

    it("returns null for non-admin user", async () => {
      auth.mockResolvedValue({
        user: { email: "user@example.com", name: "Regular User" },
      });

      const result = await requireAdmin();
      expect(result).toBeNull();
    });

    it("returns user object for admin email", async () => {
      auth.mockResolvedValue({
        user: { email: "admin@safescoring.io", name: "Admin" },
      });

      const result = await requireAdmin();
      expect(result).not.toBeNull();
      expect(result.email).toBe("admin@safescoring.io");
      expect(result.role).toBe(ROLES.SUPER_ADMIN);
      expect(result.isSuperAdmin).toBe(true);
    });

    it("returns null when auth throws an error", async () => {
      auth.mockRejectedValue(new Error("Auth error"));

      const result = await requireAdmin();
      expect(result).toBeNull();
    });
  });
});
