import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { applyUserRateLimit } from "@/libs/rate-limiters";

export const dynamic = "force-dynamic";

// GET /api/user/conversations/[id]/messages - Fetch messages for a conversation
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

    // Verify conversation belongs to user
    const { data: conversation, error: convError } = await supabase
      .from("user_conversations")
      .select("id")
      .eq("id", id)
      .eq("user_id", session.user.id)
      .eq("is_deleted", false)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const order = searchParams.get("order") || "asc";

    // Fetch messages
    let query = supabase
      .from("conversation_messages")
      .select("*", { count: "exact" })
      .eq("conversation_id", id)
      .order("sequence_number", { ascending: order === "asc" });

    query = query.range(offset, offset + limit - 1);

    const { data: messages, error, count } = await query;

    if (error) {
      console.error("Error fetching messages:", error);
      return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      messages: messages || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error in GET /api/user/conversations/[id]/messages:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
