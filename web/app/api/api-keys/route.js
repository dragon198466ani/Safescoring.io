import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { supabaseAdmin } from "@/libs/supabase";
import { quickProtect } from "@/libs/api-protection";
import { generateApiKey } from "@/libs/api-key-auth";
import config from "@/config";

export const dynamic = "force-dynamic";

// Plan limits for API keys
function getApiKeyLimit(planType) {
  const plan = (planType || "free").toLowerCase();
  if (plan === "enterprise") return 10;
  if (plan === "professional") return 3;
  return 0; // Free and Explorer cannot create API keys
}

function getRateLimit(planType) {
  const plan = (planType || "free").toLowerCase();
  if (plan === "enterprise") return 10000;
  if (plan === "professional") return 1000;
  return 100;
}

// GET /api/api-keys - List user's API keys
export async function GET(request) {
  try {
    const protection = await quickProtect(request, "standard");
    if (protection.blocked) return protection.response;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const { data: keys, error } = await supabaseAdmin
      .from("api_keys")
      .select("id, name, key_prefix, permissions, rate_limit_per_hour, is_active, last_used_at, total_requests, created_at, expires_at")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      // Table might not exist yet
      return NextResponse.json({ keys: [], limit: getApiKeyLimit(session.user.planType) });
    }

    return NextResponse.json({
      keys: keys || [],
      limit: getApiKeyLimit(session.user.planType),
      planType: session.user.planType || "free",
    });
  } catch (error) {
    console.error("API Keys GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/api-keys - Create a new API key
export async function POST(request) {
  try {
    const protection = await quickProtect(request, "standard");
    if (protection.blocked) return protection.response;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    // Plan check - Pro+ only
    const planType = (session.user.planType || "free").toLowerCase();
    if (planType !== "professional" && planType !== "enterprise") {
      return NextResponse.json(
        { error: "API keys require a Professional or Enterprise plan" },
        { status: 403 }
      );
    }

    // Check limit
    const maxKeys = getApiKeyLimit(planType);
    const { count } = await supabaseAdmin
      .from("api_keys")
      .select("*", { count: "exact", head: true })
      .eq("user_id", session.user.id)
      .eq("is_active", true);

    if (count >= maxKeys) {
      return NextResponse.json(
        { error: `Maximum ${maxKeys} active API keys allowed on your plan` },
        { status: 403 }
      );
    }

    // Parse body
    const body = await request.json().catch(() => ({}));
    const name = (body.name || "Default").substring(0, 100);

    // Generate key
    const { fullKey, prefix, hash } = generateApiKey();
    const rateLimit = getRateLimit(planType);

    // Store key
    const { error } = await supabaseAdmin.from("api_keys").insert({
      user_id: session.user.id,
      name,
      key_prefix: prefix,
      key_hash: hash,
      permissions: ["read"],
      rate_limit_per_hour: rateLimit,
      is_active: true,
    });

    if (error) {
      console.error("API key insert error:", error);
      return NextResponse.json({ error: "Failed to create API key" }, { status: 500 });
    }

    // Return the full key ONCE — it cannot be retrieved again
    return NextResponse.json({
      key: fullKey,
      prefix,
      name,
      rateLimit,
      message: "Save this key now — it won't be shown again.",
    });
  } catch (error) {
    console.error("API Keys POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/api-keys?id=... - Revoke an API key
export async function DELETE(request) {
  try {
    const protection = await quickProtect(request, "sensitive");
    if (protection.blocked) return protection.response;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get("id");

    if (!keyId) {
      return NextResponse.json({ error: "Key ID required" }, { status: 400 });
    }

    // Soft-delete: set is_active = false (preserves audit trail)
    const { error } = await supabaseAdmin
      .from("api_keys")
      .update({ is_active: false })
      .eq("id", keyId)
      .eq("user_id", session.user.id);

    if (error) {
      return NextResponse.json({ error: "Failed to revoke key" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "API key revoked" });
  } catch (error) {
    console.error("API Keys DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
