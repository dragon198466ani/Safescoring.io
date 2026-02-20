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

// GET /api/user/conversations/[id] - Fetch a single conversation with messages
export async function GET(request, { params }) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Conversation ID is required" }, { status: 400 });
    }

    // Fetch conversation
    const { data: conversation, error: convError } = await supabase
      .from("user_conversations")
      .select("*")
      .eq("id", id)
      .eq("user_id", session.user.id)
      .eq("is_deleted", false)
      .single();

    if (convError) {
      if (convError.code === "PGRST116") {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
      }
      console.error("Error fetching conversation:", convError);
      return NextResponse.json({ error: "Failed to fetch conversation" }, { status: 500 });
    }

    // Fetch messages
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const { data: messages, error: msgError } = await supabase
      .from("conversation_messages")
      .select("*")
      .eq("conversation_id", id)
      .order("sequence_number", { ascending: true })
      .range(offset, offset + limit - 1);

    if (msgError) {
      console.error("Error fetching messages:", msgError);
    }

    return NextResponse.json({
      success: true,
      conversation,
      messages: messages || [],
    });
  } catch (error) {
    console.error("Error in GET /api/user/conversations/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/user/conversations/[id] - Update conversation (title, status)
export async function PATCH(request, { params }) {
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

    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Conversation ID is required" }, { status: 400 });
    }

    const body = await request.json();
    const updates = {};

    if (body.title !== undefined) {
      updates.title = body.title;
    }

    if (body.status !== undefined) {
      const validStatuses = ["active", "ended", "archived"];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
          { status: 400 }
        );
      }
      updates.status = body.status;
      if (body.status === "ended") {
        updates.ended_at = new Date().toISOString();
      }
    }

    if (body.summary !== undefined) {
      updates.summary = body.summary;
    }

    if (body.key_topics !== undefined && Array.isArray(body.key_topics)) {
      updates.key_topics = body.key_topics;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const { data: conversation, error } = await supabase
      .from("user_conversations")
      .update(updates)
      .eq("id", id)
      .eq("user_id", session.user.id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
      }
      console.error("Error updating conversation:", error);
      return NextResponse.json({ error: "Failed to update conversation" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      conversation,
    });
  } catch (error) {
    console.error("Error in PATCH /api/user/conversations/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/user/conversations/[id] - Delete a conversation
export async function DELETE(request, { params }) {
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

    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Conversation ID is required" }, { status: 400 });
    }

    // Soft delete
    const { error } = await supabase
      .from("user_conversations")
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", session.user.id);

    if (error) {
      console.error("Error deleting conversation:", error);
      return NextResponse.json({ error: "Failed to delete conversation" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Conversation deleted",
    });
  } catch (error) {
    console.error("Error in DELETE /api/user/conversations/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
