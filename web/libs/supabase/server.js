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
 */
export function createClient() {
  const key = supabaseServiceKey || supabaseAnonKey;

  if (!supabaseUrl || !key) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)."
    );
  }

  return supabaseCreateClient(supabaseUrl, key);
}
