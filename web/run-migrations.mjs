/**
 * Execute migrations using Supabase client
 * Run from web folder: node run-migrations.mjs
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

async function runMigration(filePath, name) {
  console.log(`\n${"=".repeat(50)}`);
  console.log(`Running: ${name}`);
  console.log("=".repeat(50));

  const sql = fs.readFileSync(filePath, 'utf8');

  // Split into individual statements
  const statements = sql
    .split(/;(?=\s*(?:--|CREATE|INSERT|ALTER|DROP|$))/gi)
    .map(s => s.trim())
    .filter(s => s.length > 5 && !s.startsWith('--'));

  let success = 0;
  let skipped = 0;
  let errors = 0;

  for (const stmt of statements) {
    if (!stmt.trim()) continue;

    const preview = stmt.split('\n').find(l => l.trim())?.substring(0, 50) || 'SQL';

    try {
      const { data, error } = await supabase.rpc('exec_sql', { sql: stmt });

      if (error) {
        if (error.message.includes('already exists') || error.message.includes('duplicate')) {
          console.log(`  SKIP: ${preview}...`);
          skipped++;
        } else if (error.code === 'PGRST202') {
          // Function not found - try raw query
          throw new Error('exec_sql not found');
        } else {
          console.log(`  WARN: ${preview}... - ${error.message.substring(0, 50)}`);
          errors++;
        }
      } else {
        console.log(`  OK: ${preview}...`);
        success++;
      }
    } catch (err) {
      if (err.message.includes('exec_sql not found')) {
        console.log(`\n  ERROR: exec_sql RPC function not available.`);
        console.log(`  Please run the SQL manually in Supabase Dashboard.`);
        return false;
      }
      console.log(`  ERR: ${preview}... - ${err.message.substring(0, 50)}`);
      errors++;
    }
  }

  console.log(`\nResults: ${success} OK, ${skipped} skipped, ${errors} errors`);
  return true;
}

async function main() {
  console.log("\n$SAFE POINTS & SHOP SYSTEM MIGRATION\n");

  const migrations = [
    { path: '../config/migrations/125_safe_points.sql', name: '125: $SAFE Points System' },
    { path: '../config/migrations/126_safe_shop.sql', name: '126: $SAFE Shop' },
  ];

  for (const m of migrations) {
    const fullPath = path.join(__dirname, m.path);
    if (fs.existsSync(fullPath)) {
      const ok = await runMigration(fullPath, m.name);
      if (!ok) break;
    } else {
      console.log(`File not found: ${fullPath}`);
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log("Done! If errors occurred, run manually at:");
  console.log("https://supabase.com/dashboard/project/ajdncttomdqojlozxjxu/sql/new");
}

main().catch(console.error);
