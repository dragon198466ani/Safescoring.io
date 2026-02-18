import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/libs/supabase";
import { quickProtect } from "@/libs/api-protection";
import { applyUserRateLimit } from "@/libs/rate-limiters";
import {
  generateLinkingCode,
  generateBotLink,
  sendTelegramMessage,
} from "@/libs/telegram-notifications";

/**
 * GET /api/user/notifications/telegram
 * Get Telegram linking status and generate link code
 */
export async function GET(request) {
  // SECURITY: Rate limiting (100 req/10min per user)
  const rateLimitResult = await applyUserRateLimit(request);
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response;
  }

  
  // Rate limiting
  const protection = await quickProtect(request, "authenticated");
  if (protection.blocked) return protection.response;

  const supabase = getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch current preferences
    const { data: prefs } = await supabase
      .from("user_notification_preferences")
      .select("telegram_enabled, telegram_chat_id, telegram_username, telegram_linked_at")
      .eq("user_id", user.id)
      .single();

    const isLinked = !!prefs?.telegram_chat_id;

    // Generate linking code if not linked
    let linkingCode = null;
    let botLink = null;

    if (!isLinked) {
      linkingCode = generateLinkingCode(user.id);
      botLink = await generateBotLink(linkingCode);
    }

    return NextResponse.json({
      isLinked,
      username: prefs?.telegram_username || null,
      linkedAt: prefs?.telegram_linked_at || null,
      linkingCode: isLinked ? null : linkingCode,
      botLink: isLinked ? null : botLink,
    });
  } catch (error) {
    console.error("Error in Telegram status API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/notifications/telegram
 * Link Telegram account (called after user starts bot)
 */
export async function POST(request) {
  // SECURITY: Rate limiting (100 req/10min per user)
  const rateLimitResult = await applyUserRateLimit(request);
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response;
  }

  
  // Rate limiting
  const protection = await quickProtect(request, "authenticated");
  if (protection.blocked) return protection.response;

  const supabase = getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { chatId, username } = body;

    if (!chatId) {
      return NextResponse.json(
        { error: "Chat ID is required" },
        { status: 400 }
      );
    }

    // Update preferences with Telegram info
    const { error } = await supabase
      .from("user_notification_preferences")
      .upsert(
        {
          user_id: user.id,
          telegram_enabled: true,
          telegram_chat_id: chatId,
          telegram_username: username || null,
          telegram_linked_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      );

    if (error) {
      console.error("Error linking Telegram:", error);
      return NextResponse.json(
        { error: "Failed to link Telegram" },
        { status: 500 }
      );
    }

    // Send confirmation message to user
    await sendTelegramMessage(
      chatId,
      "\u{2705} <b>Successfully linked to SafeScoring!</b>\n\nYou will now receive notifications about:\n\u2022 Security incidents affecting your stacks\n\u2022 Score changes\n\u2022 Product updates\n\nManage your preferences at safescoring.io/dashboard/settings"
    );

    return NextResponse.json({
      success: true,
      message: "Telegram account linked successfully",
    });
  } catch (error) {
    console.error("Error in Telegram link API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/user/notifications/telegram
 * Unlink Telegram account
 */
export async function DELETE(request) {
  // SECURITY: Rate limiting (100 req/10min per user)
  const rateLimitResult = await applyUserRateLimit(request);
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response;
  }

  
  // Rate limiting
  const protection = await quickProtect(request, "authenticated");
  if (protection.blocked) return protection.response;

  const supabase = getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get current chat ID to send goodbye message
    const { data: prefs } = await supabase
      .from("user_notification_preferences")
      .select("telegram_chat_id")
      .eq("user_id", user.id)
      .single();

    // Send goodbye message if linked
    if (prefs?.telegram_chat_id) {
      await sendTelegramMessage(
        prefs.telegram_chat_id,
        "\u{1F44B} Your Telegram account has been unlinked from SafeScoring.\n\nYou will no longer receive notifications here."
      );
    }

    // Update preferences
    const { error } = await supabase
      .from("user_notification_preferences")
      .update({
        telegram_enabled: false,
        telegram_chat_id: null,
        telegram_username: null,
        telegram_linked_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (error) {
      console.error("Error unlinking Telegram:", error);
      return NextResponse.json(
        { error: "Failed to unlink Telegram" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Telegram account unlinked successfully",
    });
  } catch (error) {
    console.error("Error in Telegram unlink API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
