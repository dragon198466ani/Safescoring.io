import { createClient as supabaseCreateClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Creates a server-side Supabase client.
 * Uses service role key if available, otherwise falls back to anon key.
 */
export function createClient() {
  const key = supabaseServiceKey || supabaseAnonKey;
  if (!supabaseUrl || !key) {
    // Return a mock client that returns empty results when Supabase is not configured
    return {
      from: () => ({
        select: () => ({ data: [], error: null }),
        insert: () => ({ data: null, error: null }),
        update: () => ({ data: null, error: null }),
        delete: () => ({ data: null, error: null }),
        upsert: () => ({ data: null, error: null }),
      }),
      rpc: () => ({ data: null, error: null }),
    };
  }
  return supabaseCreateClient(supabaseUrl, key);
}
