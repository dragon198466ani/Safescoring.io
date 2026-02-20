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

// GET /api/user/memory/[id] - Fetch a single memory
export async function GET(request, { params }) {
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

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Memory ID is required" },
        { status: 400 }
      );
    }

    const { data: memory, error } = await supabase
      .from("user_memories")
      .select("*")
      .eq("id", id)
      .eq("user_id", session.user.id)
      .eq("is_deleted", false)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Memory not found" },
          { status: 404 }
        );
      }
      console.error("Error fetching memory:", error);
      return NextResponse.json(
        { error: "Failed to fetch memory" },
        { status: 500 }
      );
    }

    // Update last_accessed_at
    await supabase
      .from("user_memories")
      .update({ last_accessed_at: new Date().toISOString() })
      .eq("id", id);

    return NextResponse.json({
      success: true,
      memory,
    });
  } catch (error) {
    console.error("Error in GET /api/user/memory/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/user/memory/[id] - Update a memory
export async function PATCH(request, { params }) {
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

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Memory ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Allowed fields to update
    const allowedFields = ["content", "category", "memory_type", "importance", "metadata"];
    const updates = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === "content") {
          if (typeof body.content !== "string" || body.content.trim().length === 0) {
            return NextResponse.json(
              { error: "Content cannot be empty" },
              { status: 400 }
            );
          }
          updates.content = body.content.trim();
        } else if (field === "importance") {
          const importance = parseInt(body.importance, 10);
          if (isNaN(importance) || importance < 1 || importance > 10) {
            return NextResponse.json(
              { error: "Importance must be between 1 and 10" },
              { status: 400 }
            );
          }
          updates.importance = importance;
        } else if (field === "category") {
          const validCategories = ["personal", "crypto_goals", "risk_profile", "product_preferences", "holdings"];
          if (!validCategories.includes(body.category)) {
            return NextResponse.json(
              { error: `Invalid category. Must be one of: ${validCategories.join(", ")}` },
              { status: 400 }
            );
          }
          updates.category = body.category;
        } else if (field === "memory_type") {
          const validTypes = ["fact", "preference", "goal", "context"];
          if (!validTypes.includes(body.memory_type)) {
            return NextResponse.json(
              { error: `Invalid memory_type. Must be one of: ${validTypes.join(", ")}` },
              { status: 400 }
            );
          }
          updates.memory_type = body.memory_type;
        } else {
          updates[field] = body[field];
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    // Verify memory exists and belongs to user
    const { data: existing, error: existingError } = await supabase
      .from("user_memories")
      .select("id")
      .eq("id", id)
      .eq("user_id", session.user.id)
      .eq("is_deleted", false)
      .single();

    if (existingError || !existing) {
      return NextResponse.json(
        { error: "Memory not found" },
        { status: 404 }
      );
    }

    // Update the memory
    const { data: memory, error } = await supabase
      .from("user_memories")
      .update(updates)
      .eq("id", id)
      .eq("user_id", session.user.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating memory:", error);
      return NextResponse.json(
        { error: "Failed to update memory" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      memory,
    });
  } catch (error) {
    console.error("Error in PATCH /api/user/memory/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/user/memory/[id] - Delete a single memory
export async function DELETE(request, { params }) {
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

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Memory ID is required" },
        { status: 400 }
      );
    }

    // Check URL params for hard delete option
    const { searchParams } = new URL(request.url);
    const hardDelete = searchParams.get("hard") === "true";

    if (hardDelete) {
      const { error } = await supabase
        .from("user_memories")
        .delete()
        .eq("id", id)
        .eq("user_id", session.user.id);

      if (error) {
        console.error("Error hard deleting memory:", error);
        return NextResponse.json(
          { error: "Failed to delete memory" },
          { status: 500 }
        );
      }
    } else {
      // Soft delete
      const { error } = await supabase
        .from("user_memories")
        .update({ is_deleted: true, deleted_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", session.user.id);

      if (error) {
        console.error("Error soft deleting memory:", error);
        return NextResponse.json(
          { error: "Failed to delete memory" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Memory deleted successfully",
    });
  } catch (error) {
    console.error("Error in DELETE /api/user/memory/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
