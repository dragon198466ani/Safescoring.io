import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/libs/supabase";
import { quickProtect } from "@/libs/api-protection";
import { leadSchema, validateBody } from "@/libs/validations";

// This route is used to store the leads that are generated from the landing page.
// Duplicate emails just return 200 OK (using upsert to avoid race conditions)
export async function POST(req) {
  // Rate limiting
  const protection = await quickProtect(req, "sensitive");
  if (protection.blocked) return protection.response;

  // Validate input with Zod
  const validation = await validateBody(req, leadSchema);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const { email } = validation.data;

  try {
    if (supabaseAdmin) {
      const { error } = await supabaseAdmin
        .from("leads")
        .upsert(
          { email },
          { onConflict: "email", ignoreDuplicates: true }
        );

      if (error) {
        throw error;
      }
    }

    return NextResponse.json({ success: true });
  } catch (_e) {
    // Don't expose internal error details to clients
    return NextResponse.json({ error: "Failed to save lead" }, { status: 500 });
  }
}
