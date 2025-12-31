import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/libs/supabase";

export async function GET() {
  const health = {
    status: "ok",
    timestamp: new Date().toISOString(),
    services: {
      supabase: isSupabaseConfigured() ? "connected" : "not_configured",
    },
  };

  return NextResponse.json(health);
}
