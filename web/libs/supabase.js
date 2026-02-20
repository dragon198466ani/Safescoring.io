import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Client-side Supabase client (uses anon key)
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Server-side Supabase client (uses service role key for admin operations)
export const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

// Helper function to check if Supabase is configured
export const isSupabaseConfigured = () => {
  return !!(supabaseUrl && supabaseAnonKey);
};

// Lazy getters used by newer routes
export function getSupabase() {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return createClient(supabaseUrl, supabaseAnonKey);
}

export function getSupabaseServer() {
  const key = supabaseServiceKey || supabaseAnonKey;
  if (!supabaseUrl || !key) return null;
  return createClient(supabaseUrl, key);
}

export function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey);
}

export { createClient };

export default supabase;
