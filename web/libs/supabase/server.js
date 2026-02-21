import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Creates a server-side Supabase client using the service role key.
 * Used in API routes where elevated permissions are needed.
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase environment variables not configured");
  }

  return createSupabaseClient(supabaseUrl, supabaseServiceKey);
}
