import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { validateRequestOrigin } from "@/libs/security";
import { applyUserRateLimit } from "@/libs/rate-limiters";

export const dynamic = "force-dynamic";

/**
 * SECURITY: Validate origin for state-changing requests
 */
function requireValidOrigin(request) {
  const check = validateRequestOrigin(request);
  if (!check.valid) {
    console.warn(`[SECURITY] CSRF attempt blocked on memory: ${check.reason}`);
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  return null;
}

// GET /api/user/memory - Fetch user's memories with optional filters
export async function GET(request) {
  // SECURITY: Rate limiting (100 req/10min per user)
  const rateLimitResult = await applyUserRateLimit(request);
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response;
  }

  
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 500 }
      );
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const type = searchParams.get("type");
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Build query
    let query = supabase
      .from("user_memories")
      .select("*", { count: "exact" })
      .eq("user_id", session.user.id)
      .eq("is_deleted", false)
      .order("importance", { ascending: false })
      .order("created_at", { ascending: false });

    // Apply filters
    if (category && category !== "all") {
      query = query.eq("category", category);
    }
    if (type && type !== "all") {
      query = query.eq("memory_type", type);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: memories, error, count } = await query;

    if (error) {
      console.error("Error fetching memories:", error);
      return NextResponse.json(
        { error: "Failed to fetch memories" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      memories: memories || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error in GET /api/user/memory:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/user/memory - Create a new memory
export async function POST(request) {
  // SECURITY: Rate limiting (100 req/10min per user)
  const rateLimitResult = await applyUserRateLimit(request);
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response;
  }

  
  try {
    // SECURITY: Validate origin to prevent CSRF
    const originError = requireValidOrigin(request);
    if (originError) return originError;

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 500 }
      );
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      memory_type,
      category,
      content,
      source_type = "manual",
      source_conversation_id,
      confidence = 0.8,
      importance = 5,
      metadata = {},
    } = body;

    // Validation
    const validTypes = ["fact", "preference", "goal", "context"];
    const validCategories = ["personal", "crypto_goals", "risk_profile", "product_preferences", "holdings"];
    const validSources = ["conversation", "quiz", "onboarding", "manual"];

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    if (!validTypes.includes(memory_type)) {
      return NextResponse.json(
        { error: `Invalid memory_type. Must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    if (category && !validCategories.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${validCategories.join(", ")}` },
        { status: 400 }
      );
    }

    if (!validSources.includes(source_type)) {
      return NextResponse.json(
        { error: `Invalid source_type. Must be one of: ${validSources.join(", ")}` },
        { status: 400 }
      );
    }

    // Check if memory feature is enabled
    const { data: settings } = await supabase
      .from("user_memory_settings")
      .select("memory_enabled")
      .eq("user_id", session.user.id)
      .single();

    if (settings && !settings.memory_enabled) {
      return NextResponse.json(
        { error: "Memory feature is disabled. Enable it in settings first." },
        { status: 403 }
      );
    }

    // Insert memory
    const { data: memory, error } = await supabase
      .from("user_memories")
      .insert({
        user_id: session.user.id,
        memory_type,
        category,
        content: content.trim(),
        source_type,
        source_conversation_id,
        confidence: Math.max(0, Math.min(1, confidence)),
        importance: Math.max(1, Math.min(10, importance)),
        metadata,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating memory:", error);
      return NextResponse.json(
        { error: "Failed to create memory" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      memory,
    });
  } catch (error) {
    console.error("Error in POST /api/user/memory:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/user/memory - Bulk delete memories
export async function DELETE(request) {
  // SECURITY: Rate limiting (100 req/10min per user)
  const rateLimitResult = await applyUserRateLimit(request);
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response;
  }

  
  try {
    // SECURITY: Validate origin to prevent CSRF
    const originError = requireValidOrigin(request);
    if (originError) return originError;

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 500 }
      );
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { deleteAll = false, ids = [], hardDelete = false } = body;

    if (deleteAll) {
      // Delete all user memories
      if (hardDelete) {
        const { error } = await supabase
          .from("user_memories")
          .delete()
          .eq("user_id", session.user.id);

        if (error) {
          console.error("Error hard deleting all memories:", error);
          return NextResponse.json(
            { error: "Failed to delete memories" },
            { status: 500 }
          );
        }
      } else {
        // Soft delete
        const { error } = await supabase
          .from("user_memories")
          .update({ is_deleted: true, deleted_at: new Date().toISOString() })
          .eq("user_id", session.user.id)
          .eq("is_deleted", false);

        if (error) {
          console.error("Error soft deleting all memories:", error);
          return NextResponse.json(
            { error: "Failed to delete memories" },
            { status: 500 }
          );
        }
      }

      return NextResponse.json({
        success: true,
        message: "All memories deleted successfully",
      });
    }

    // Delete specific memories by IDs
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "No memory IDs provided" },
        { status: 400 }
      );
    }

    if (hardDelete) {
      const { error } = await supabase
        .from("user_memories")
        .delete()
        .eq("user_id", session.user.id)
        .in("id", ids);

      if (error) {
        console.error("Error hard deleting memories:", error);
        return NextResponse.json(
          { error: "Failed to delete memories" },
          { status: 500 }
        );
      }
    } else {
      const { error } = await supabase
        .from("user_memories")
        .update({ is_deleted: true, deleted_at: new Date().toISOString() })
        .eq("user_id", session.user.id)
        .in("id", ids);

      if (error) {
        console.error("Error soft deleting memories:", error);
        return NextResponse.json(
          { error: "Failed to delete memories" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: `${ids.length} memories deleted successfully`,
    });
  } catch (error) {
    console.error("Error in DELETE /api/user/memory:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
