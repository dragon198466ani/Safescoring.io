import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/libs/supabase";
import { quickProtect } from "@/libs/api-protection";
import { isValidEmail } from "@/libs/security";

// This route is used to store the leads that are generated from the landing page.
// Duplicate emails just return 200 OK (using upsert to avoid race conditions)
export async function POST(req) {
  // Rate limiting
  const protection = await quickProtect(req, "sensitive");
  if (protection.blocked) return protection.response;

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.email || !isValidEmail(body.email)) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  try {
    if (supabaseAdmin) {
      const { error } = await supabaseAdmin
        .from("leads")
        .upsert(
          { email: body.email.toLowerCase().trim() },
          { onConflict: "email", ignoreDuplicates: true }
        );

      if (error) {
        throw error;
      }
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: "Failed to save lead" }, { status: 500 });
  }
}
