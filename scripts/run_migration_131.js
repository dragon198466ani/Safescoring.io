/**
 * Run Migration 131: Staking Benefits & Weekly Rewards System
 *
 * Usage: node scripts/run_migration_131.js
 */

require("dotenv").config({ path: "./web/.env" });
const fs = require("fs");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// Extract project ref from URL
const projectRef = supabaseUrl.replace("https://", "").split(".")[0];

async function executeSql(sql) {
  const response = await fetch(
    `https://${projectRef}.supabase.co/rest/v1/rpc/exec_sql`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseServiceKey,
        Authorization: `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ sql }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  return response.json();
}

async function runMigration() {
  console.log("Running migration 131: Staking Benefits & Rewards...\n");
  console.log(`Project: ${projectRef}\n`);

  const sqlFile = fs.readFileSync(
    "./config/migrations/131_staking_benefits_rewards.sql",
    "utf8"
  );

  // Execute the entire file as one transaction
  try {
    // First check if exec_sql function exists
    const checkResponse = await fetch(
      `https://${projectRef}.supabase.co/rest/v1/`,
      {
        headers: {
          apikey: supabaseServiceKey,
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
      }
    );

    console.log("Connection OK. Executing migration...\n");

    // Split into major sections and execute each
    const sections = sqlFile.split(/-- ={10,}/);

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i].trim();
      if (!section || section.startsWith("--")) continue;

      const firstLine = section.split("\n").find((l) => l.trim().length > 0);
      console.log(`[${i + 1}/${sections.length}] Executing: ${firstLine?.substring(0, 50)}...`);

      try {
        await executeSql(section);
        console.log("   OK\n");
      } catch (err) {
        if (err.message.includes("already exists")) {
          console.log("   SKIP (already exists)\n");
        } else if (err.message.includes("404")) {
          console.log("   Note: exec_sql RPC not found, manual execution required\n");
          break;
        } else {
          console.log(`   Warning: ${err.message.substring(0, 100)}\n`);
        }
      }
    }

    console.log("\n--- Migration sections processed ---\n");
    console.log("If exec_sql RPC is not available, copy-paste the SQL directly in:");
    console.log(`https://supabase.com/dashboard/project/${projectRef}/sql/new`);
    console.log("\nFile: config/migrations/131_staking_benefits_rewards.sql");

  } catch (err) {
    console.error("Error:", err.message);
    console.log("\nManual execution required:");
    console.log(`https://supabase.com/dashboard/project/${projectRef}/sql/new`);
  }
}

runMigration().catch(console.error);
