/**
 * Server-side Supabase client factory
 * Used in API routes: import { createClient } from '@/libs/supabase/server'
 */
import { createClient as supabaseCreateClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Create a server-side Supabase client.
 * Uses service role key if available, otherwise falls back to anon key.
 * Returns null if Supabase is not configured (safe for build-time).
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.warn("[Supabase] Not configured — missing URL or key.");
    return null;
  }

  return supabaseCreateClient(url, key);
}
