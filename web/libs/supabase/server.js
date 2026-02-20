/**
 * Server-side Supabase client
 * Used by API routes that import from '@/libs/supabase/server'
 */
import { supabase, supabaseAdmin } from "@/libs/supabase";

export function createClient() {
  return supabaseAdmin || supabase;
}
