/**
 * Admin Authentication & RBAC System
 * Provides role-based access control for admin routes
 */

import { auth } from "@/libs/auth";
import { supabaseAdmin } from "@/libs/supabase";

// Get admin emails from environment variable (comma-separated)
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "admin@safescoring.io")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

/**
 * User roles
 */
export const ROLES = {
  USER: "user",
  ADMIN: "admin",
  SUPER_ADMIN: "super_admin",
};

/**
 * Check if an email is an admin
 * @param {string} email
 * @returns {boolean}
 */
export function isAdminEmail(email) {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

/**
 * Get the user's role based on their email
 * @param {string} email
 * @returns {string}
 */
export function getUserRole(email) {
  if (!email) return ROLES.USER;

  const normalizedEmail = email.toLowerCase();

  // First admin in the list is super admin
  if (ADMIN_EMAILS[0] === normalizedEmail) {
    return ROLES.SUPER_ADMIN;
  }

  if (ADMIN_EMAILS.includes(normalizedEmail)) {
    return ROLES.ADMIN;
  }

  return ROLES.USER;
}

/**
 * Require admin authentication for a route
 * Returns the user if authenticated as admin, null otherwise
 *
 * @param {Object} options
 * @param {boolean} options.requireSuperAdmin - If true, requires super admin role
 * @returns {Promise<Object|null>} User object or null
 */
export async function requireAdmin(options = {}) {
  const { requireSuperAdmin = false } = options;

  try {
    const session = await auth();

    if (!session?.user?.email) {
      console.warn("[ADMIN AUTH] No session or email found");
      return null;
    }

    const email = session.user.email.toLowerCase();
    const role = getUserRole(email);

    // Check if user has required role
    if (requireSuperAdmin && role !== ROLES.SUPER_ADMIN) {
      console.warn(`[ADMIN AUTH] Super admin required, user has role: ${role}`);
      return null;
    }

    if (!requireSuperAdmin && role === ROLES.USER) {
      console.warn(`[ADMIN AUTH] Admin required, user has role: ${role}`);
      return null;
    }

    // Log successful admin access
    console.log(`[ADMIN AUTH] Access granted to ${email} (${role})`);

    return {
      ...session.user,
      role,
      isSuperAdmin: role === ROLES.SUPER_ADMIN,
    };
  } catch (error) {
    console.error("[ADMIN AUTH] Error checking admin status:", error);
    return null;
  }
}

/**
 * Log admin action for audit trail
 * @param {Object} params
 * @param {string} params.adminEmail - Admin's email
 * @param {string} params.action - Action performed
 * @param {string} params.resource - Resource affected
 * @param {Object} params.details - Additional details
 */
export async function logAdminAction({ adminEmail, action, resource, details = {} }) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    admin_email: adminEmail,
    action,
    resource,
    details,
  };

  // Log admin action (structured for log aggregation)
  if (process.env.NODE_ENV === "production") {
    console.log(JSON.stringify({ level: "info", type: "admin_audit", ...logEntry }));
  } else {
    console.log("[ADMIN AUDIT]", JSON.stringify(logEntry));
  }

  // Persist to database if available (non-blocking)
  if (supabaseAdmin) {
    try {
      await supabaseAdmin.from("admin_audit_logs").insert(logEntry);
    } catch (err) {
      console.error("[ADMIN AUDIT] Failed to persist log:", err.message);
    }
  }

  return logEntry;
}

/**
 * Create unauthorized response
 * @param {string} message
 * @returns {Response}
 */
export function unauthorizedResponse(message = "Unauthorized") {
  return new Response(JSON.stringify({ error: message }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Create forbidden response
 * @param {string} message
 * @returns {Response}
 */
export function forbiddenResponse(message = "Forbidden") {
  return new Response(JSON.stringify({ error: message }), {
    status: 403,
    headers: { "Content-Type": "application/json" },
  });
}
