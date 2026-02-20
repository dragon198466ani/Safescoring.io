import { NextResponse } from "next/server";
import { supabase } from "@/libs/supabase";
import { auth } from "@/libs/auth";

export async function GET(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const setupId = params.id;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);
    const offset = (page - 1) * limit;

    const { data: setup, error: setupError } = await supabase
      .from("user_setups")
      .select("id, user_id")
      .eq("id", setupId)
      .single();

    if (setupError || !setup) {
      return NextResponse.json({ error: "Setup not found" }, { status: 404 });
    }

    if (setup.user_id !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: historyRaw, error: historyError, count } = await supabase
      .from("setup_history")
      .select("*", { count: "exact" })
      .eq("setup_id", setupId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (historyError) {
      console.error("Error fetching history:", historyError);
      return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
    }

    const history = (historyRaw || []).map((entry) => {
      const config = getActionConfig(entry.action, entry);
      return {
        id: entry.id,
        action: entry.action,
        description: config.description,
        icon: config.icon,
        color: config.color,
        productId: entry.product_id,
        productName: entry.product_name,
        oldValue: entry.old_value,
        newValue: entry.new_value,
        metadata: entry.metadata,
        createdAt: entry.created_at,
      };
    });

    return NextResponse.json({
      history,
      pagination: { page, limit, total: count || 0, hasMore: (count || 0) > offset + limit },
    });
  } catch (error) {
    console.error("History API error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

function getActionConfig(action, entry) {
  const configs = {
    created: { description: "Setup created", icon: "plus-circle", color: "green" },
    product_added: { description: "Added " + (entry.product_name || "a product"), icon: "plus", color: "green" },
    product_removed: { description: "Removed " + (entry.product_name || "a product"), icon: "minus", color: "red" },
    products_changed: { description: "Products list updated", icon: "arrows", color: "blue" },
    renamed: { description: "Renamed to \"" + (entry.new_value?.name || "new name") + "\"", icon: "pencil", color: "amber" },
    score_changed: { description: getScoreChangeDescription(entry), icon: "chart", color: getScoreChangeColor(entry) },
    deleted: { description: "Setup deleted", icon: "trash", color: "red" },
  };
  return configs[action] || { description: action.replace(/_/g, " "), icon: "info", color: "gray" };
}

function getScoreChangeDescription(entry) {
  if (!entry.old_value?.note_finale || !entry.new_value?.note_finale) return "Score updated";
  const diff = entry.new_value.note_finale - entry.old_value.note_finale;
  return "Score " + (diff > 0 ? "increased" : "decreased") + " by " + Math.abs(diff) + " points";
}

function getScoreChangeColor(entry) {
  if (!entry.old_value?.note_finale || !entry.new_value?.note_finale) return "blue";
  const diff = entry.new_value.note_finale - entry.old_value.note_finale;
  return diff > 0 ? "green" : diff < 0 ? "red" : "gray";
}
