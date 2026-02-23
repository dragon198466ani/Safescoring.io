#!/usr/bin/env node

/**
 * Auto-Migration Script for SafeScoring
 *
 * Runs automatically on `npm install` (postinstall) and on manual `npm run migrate`.
 * Connects to Supabase, reads SQL migration files, applies pending ones.
 * Gracefully skips if env vars are missing (CI/dev without DB).
 */

import { readFileSync, readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, "..", "..", "config", "migrations");

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.log("[migrate] Skipping — SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set");
    process.exit(0);
  }

  if (!existsSync(MIGRATIONS_DIR)) {
    console.log("[migrate] Skipping — migrations directory not found");
    process.exit(0);
  }

  console.log("[migrate] Connecting to Supabase...");

  // Dynamic import to avoid issues when supabase-js is not installed
  let createClient;
  try {
    const supabaseModule = await import("@supabase/supabase-js");
    createClient = supabaseModule.createClient;
  } catch {
    console.log("[migrate] Skipping — @supabase/supabase-js not available");
    process.exit(0);
  }

  const supabase = createClient(url, key);

  // Ensure _migration_log table exists
  const { error: tableCheckError } = await supabase
    .from("_migration_log")
    .select("id")
    .limit(1);

  if (tableCheckError?.code === "PGRST116" || tableCheckError?.message?.includes("does not exist")) {
    console.log("[migrate] Creating _migration_log table...");
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS _migration_log (
        id SERIAL PRIMARY KEY,
        filename TEXT UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ DEFAULT NOW(),
        checksum TEXT,
        execution_time_ms INTEGER
      );
    `;
    const { error: createError } = await supabase.rpc("exec_sql", { sql: createTableSQL }).catch(() => ({ error: { message: "RPC not available" } }));
    if (createError) {
      console.warn("[migrate] Could not create _migration_log (may need manual setup):", createError.message);
      process.exit(0);
    }
  }

  // Get applied migrations
  const { data: applied } = await supabase
    .from("_migration_log")
    .select("filename")
    .order("filename");

  const appliedSet = new Set((applied || []).map((r) => r.filename));

  // Read migration files
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const pending = files.filter((f) => !appliedSet.has(f));

  if (pending.length === 0) {
    console.log(`[migrate] All ${files.length} migrations already applied`);
    process.exit(0);
  }

  console.log(`[migrate] ${pending.length} pending migrations (of ${files.length} total)`);

  let applied_count = 0;
  let failed_count = 0;

  for (const file of pending) {
    const start = Date.now();
    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf-8");

    // Generate checksum
    const { createHash } = await import("crypto");
    const checksum = createHash("sha256").update(sql).digest("hex").slice(0, 16);

    console.log(`[migrate] Applying ${file}...`);

    try {
      // Execute via REST API (Supabase doesn't have raw SQL exec by default)
      // We use the rpc approach or skip if not available
      const { error } = await supabase.rpc("exec_sql", { sql });

      if (error) {
        console.error(`[migrate] FAILED ${file}:`, error.message);
        failed_count++;
        continue;
      }

      const duration = Date.now() - start;

      // Record in migration log
      await supabase.from("_migration_log").insert({
        filename: file,
        checksum,
        execution_time_ms: duration,
      });

      applied_count++;
      console.log(`[migrate] OK ${file} (${duration}ms)`);
    } catch (err) {
      console.error(`[migrate] ERROR ${file}:`, err.message);
      failed_count++;
    }
  }

  console.log(`[migrate] Done: ${applied_count} applied, ${failed_count} failed`);
  process.exit(failed_count > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("[migrate] Fatal error:", err);
  process.exit(1);
});
