import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { validateRequestOrigin } from "@/libs/security";
import { applyUserRateLimit } from "@/libs/rate-limiters";

export const dynamic = "force-dynamic";

function requireValidOrigin(request) {
  const check = validateRequestOrigin(request);
  if (!check.valid) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  return null;
}

// GET /api/user/conversations - List user conversations
export async function GET(request) {
  // SECURITY: Rate limiting (100 req/10min per user)
  const rateLimitResult = await applyUserRateLimit(request);
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response;
  }

  
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const assistantType = searchParams.get("assistant_type");
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    let query = supabase
      .from("user_conversations")
      .select("*", { count: "exact" })
      .eq("user_id", session.user.id)
      .eq("is_deleted", false)
      .order("last_message_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    if (assistantType) {
      query = query.eq("assistant_type", assistantType);
    }

    query = query.range(offset, offset + limit - 1);

    const { data: conversations, error, count } = await query;

    if (error) {
      console.error("Error fetching conversations:", error);
      return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      conversations: conversations || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error in GET /api/user/conversations:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/user/conversations - Create a new conversation
export async function POST(request) {
  // SECURITY: Rate limiting (100 req/10min per user)
  const rateLimitResult = await applyUserRateLimit(request);
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response;
  }

  
  try {
    const originError = requireValidOrigin(request);
    if (originError) return originError;

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, assistant_type = "chat" } = body;

    const validTypes = ["chat", "setup_assistant", "support"];
    if (!validTypes.includes(assistant_type)) {
      return NextResponse.json(
        { error: `Invalid assistant_type. Must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    const { data: conversation, error } = await supabase
      .from("user_conversations")
      .insert({
        user_id: session.user.id,
        title: title || "New conversation",
        assistant_type,
        status: "active",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating conversation:", error);
      return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      conversation,
    });
  } catch (error) {
    console.error("Error in POST /api/user/conversations:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/user/conversations - Bulk delete conversations
export async function DELETE(request) {
  // SECURITY: Rate limiting (100 req/10min per user)
  const rateLimitResult = await applyUserRateLimit(request);
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response;
  }

  
  try {
    const originError = requireValidOrigin(request);
    if (originError) return originError;

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { deleteAll = false, ids = [] } = body;

    if (deleteAll) {
      const { error } = await supabase
        .from("user_conversations")
        .update({ is_deleted: true, deleted_at: new Date().toISOString() })
        .eq("user_id", session.user.id)
        .eq("is_deleted", false);

      if (error) {
        console.error("Error deleting all conversations:", error);
        return NextResponse.json({ error: "Failed to delete conversations" }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: "All conversations deleted",
      });
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No conversation IDs provided" }, { status: 400 });
    }

    const { error } = await supabase
      .from("user_conversations")
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq("user_id", session.user.id)
      .in("id", ids);

    if (error) {
      console.error("Error deleting conversations:", error);
      return NextResponse.json({ error: "Failed to delete conversations" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `${ids.length} conversations deleted`,
    });
  } catch (error) {
    console.error("Error in DELETE /api/user/conversations:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
