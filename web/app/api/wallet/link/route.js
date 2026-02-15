import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { createClient } from "@supabase/supabase-js";
import { verifyMessage } from "viem";

// Lazy initialization to avoid build-time errors
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

/**
 * POST /api/wallet/link
 * Link a wallet address to user account (with signature verification)
 */
export async function POST(req) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { walletAddress, signature, message } = await req.json();

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet address required" },
        { status: 400 }
      );
    }

    // Verify signature to prove wallet ownership
    if (signature && message) {
      try {
        const isValid = await verifyMessage({
          address: walletAddress,
          message,
          signature,
        });

        if (!isValid) {
          return NextResponse.json(
            { error: "Invalid signature" },
            { status: 400 }
          );
        }
      } catch (_e) {
        return NextResponse.json(
          { error: "Signature verification failed" },
          { status: 400 }
        );
      }
    }

    // Check if wallet is already linked to another account
    const { data: existingUser } = await getSupabase()
      .from("users")
      .select("id")
      .eq("wallet_address", walletAddress.toLowerCase())
      .neq("id", session.user.id)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: "Wallet already linked to another account" },
        { status: 409 }
      );
    }

    // Link wallet to user
    const { error } = await getSupabase()
      .from("users")
      .update({ wallet_address: walletAddress.toLowerCase() })
      .eq("id", session.user.id);

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        { error: "Failed to link wallet" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      walletAddress: walletAddress.toLowerCase(),
    });
  } catch (error) {
    console.error("Wallet link error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/wallet/link
 * Unlink wallet from user account
 */
export async function DELETE(_req) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { error } = await getSupabase()
      .from("users")
      .update({ wallet_address: null })
      .eq("id", session.user.id);

    if (error) {
      return NextResponse.json(
        { error: "Failed to unlink wallet" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Wallet unlink error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
