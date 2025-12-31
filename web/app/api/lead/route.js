import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/libs/supabase";

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// This route is used to store the leads that are generated from the landing page.
// The API call is initiated by <ButtonLead /> component
// Duplicate emails just return 200 OK (using upsert to avoid race conditions)
export async function POST(req) {
  const body = await req.json();

  if (!body.email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  // Validate email format
  if (!EMAIL_REGEX.test(body.email)) {
    return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
  }

  try {
    if (supabaseAdmin) {
      // Use upsert to avoid race conditions - atomically insert or do nothing
      const { error } = await supabaseAdmin
        .from("leads")
        .upsert(
          { email: body.email },
          { onConflict: "email", ignoreDuplicates: true }
        );

      if (error) {
        throw error;
      }
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    // Don't expose internal error details to clients
    return NextResponse.json({ error: "Failed to save lead" }, { status: 500 });
  }
}
