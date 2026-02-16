import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/libs/supabase";
import { quickProtect } from "@/libs/api-protection";

export async function GET(request) {
  // Rate limit: prevent availability probing abuse
  const protection = await quickProtect(request, "public");
  if (protection.blocked) return protection.response;

  const health = {
    status: "ok",
    timestamp: new Date().toISOString(),
    services: {
      supabase: isSupabaseConfigured() ? "connected" : "not_configured",
    },
  };

  return NextResponse.json(health);
}
