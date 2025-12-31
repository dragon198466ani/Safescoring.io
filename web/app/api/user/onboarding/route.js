import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { supabaseAdmin } from "@/libs/supabase";

// GET - Retrieve onboarding state
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const { data: user, error } = await supabaseAdmin
      .from("users")
      .select("onboarding_completed, onboarding_step, name, user_type, interests")
      .eq("id", session.user.id)
      .single();

    if (error) {
      console.error("Error fetching onboarding state:", error);
      return NextResponse.json({ error: "Failed to fetch onboarding state" }, { status: 500 });
    }

    return NextResponse.json({
      onboardingCompleted: user?.onboarding_completed ?? false,
      currentStep: user?.onboarding_step ?? 0,
      name: user?.name,
      userType: user?.user_type,
      interests: user?.interests,
    });
  } catch (error) {
    console.error("Onboarding GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Save onboarding progress
export async function POST(req) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const body = await req.json();
    const { step, data, complete } = body;

    // Build update object based on what's provided
    const updateData = {};

    if (typeof step === "number") {
      updateData.onboarding_step = step;
    }

    if (data?.name) {
      updateData.name = data.name;
    }

    if (data?.userType) {
      updateData.user_type = data.userType;
    }

    if (data?.interests) {
      updateData.interests = data.interests;
    }

    if (data?.firstProduct) {
      updateData.first_product_id = data.firstProduct;
    }

    if (complete) {
      updateData.onboarding_completed = true;
    }

    const { error } = await supabaseAdmin
      .from("users")
      .update(updateData)
      .eq("id", session.user.id);

    if (error) {
      console.error("Error updating onboarding:", error);
      return NextResponse.json({ error: "Failed to save onboarding progress" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Onboarding POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
