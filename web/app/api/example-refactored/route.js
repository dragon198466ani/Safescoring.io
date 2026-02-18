/**
 * Example Refactored API Route
 *
 * This demonstrates how to use the new route-wrapper.js to eliminate
 * boilerplate code. Compare this with the old pattern.
 *
 * OLD PATTERN (repeated in every route):
 * ```
 * export async function GET(request) {
 *   try {
 *     if (!isSupabaseConfigured()) {
 *       return NextResponse.json({ error: "Database not configured" }, { status: 500 });
 *     }
 *
 *     const protection = await quickProtect(request, "public");
 *     if (protection.blocked) {
 *       return protection.response;
 *     }
 *
 *     const session = await auth();
 *     if (!session?.user?.id) {
 *       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 *     }
 *
 *     // Actual logic here...
 *
 *     return NextResponse.json({ data });
 *   } catch (error) {
 *     return NextResponse.json({ error: "Internal error" }, { status: 500 });
 *   }
 * }
 * ```
 *
 * NEW PATTERN (clean, declarative):
 * ```
 * export const GET = authRoute(async (req, { user }) => {
 *   const data = await fetchData(user.id);
 *   return success(data);
 * });
 * ```
 */

import { getSupabaseServer } from "@/libs/supabase";
import {
  publicRoute,
  authRoute,
  adminRoute,
  success,
  error,
  paginated,
} from "@/libs/route-wrapper";

/**
 * GET /api/example-refactored
 *
 * Public endpoint - anyone can access
 * Automatic: rate limiting, error handling, DB check
 */
export const GET = publicRoute(async (request, ctx) => {
  const supabase = getSupabaseServer();

  // Get pagination from context helper
  const { page, limit, offset } = ctx.getPagination({ limit: 20 });

  // Fetch data
  const { data, error: dbError, count } = await supabase
    .from("products")
    .select("id, name, slug, note_finale", { count: "exact" })
    .order("note_finale", { ascending: false })
    .range(offset, offset + limit - 1);

  if (dbError) {
    return error("Failed to fetch products", 500, "DB_ERROR");
  }

  // Return paginated response
  return paginated(data, count || 0, page, limit);
});

/**
 * POST /api/example-refactored
 *
 * Authenticated endpoint - user must be logged in
 * Automatic: auth check, CSRF validation, rate limiting
 */
export const POST = authRoute(async (request, ctx) => {
  const { user, body } = ctx;

  // Validate body
  if (!body?.name) {
    return error("Name is required", 400, "VALIDATION_ERROR");
  }

  const supabase = getSupabaseServer();

  // Create record with user ID
  const { data, error: dbError } = await supabase
    .from("user_data")
    .insert({
      user_id: user.id,
      name: body.name,
      description: body.description || "",
    })
    .select()
    .single();

  if (dbError) {
    return error("Failed to create record", 500, "DB_ERROR");
  }

  return success(data, 201);
});

/**
 * DELETE /api/example-refactored
 *
 * Admin-only endpoint
 * Automatic: admin check, stricter rate limiting
 */
export const DELETE = adminRoute(async (request, ctx) => {
  const { searchParams } = ctx;
  const id = searchParams.get("id");

  if (!id) {
    return error("ID is required", 400, "VALIDATION_ERROR");
  }

  const supabase = getSupabaseServer();

  const { error: dbError } = await supabase
    .from("products")
    .delete()
    .eq("id", id);

  if (dbError) {
    return error("Failed to delete", 500, "DB_ERROR");
  }

  return success({ deleted: true });
});
