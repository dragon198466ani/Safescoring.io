/**
 * Run Migrations 125 & 126: $SAFE Points + Shop System
 *
 * Usage: node scripts/run_migration_125_126.js
 */

const fs = require("fs");
const path = require("path");

// Load .env manually
const envPath = path.join(__dirname, "..", "web", ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  envContent.split("\n").forEach(line => {
    const [key, ...valueParts] = line.split("=");
    if (key && valueParts.length > 0) {
      const value = valueParts.join("=").trim().replace(/^["']|["']$/g, "");
      process.env[key.trim()] = value;
    }
  });
}

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

async function runMigrations() {
  console.log("=".repeat(60));
  console.log("$SAFE POINTS + SHOP SYSTEM MIGRATION");
  console.log("=".repeat(60));
  console.log(`\nProject: ${projectRef}\n`);

  const migrations = [
    { name: "125_safe_points.sql", file: "./config/migrations/125_safe_points.sql" },
    { name: "126_safe_shop.sql", file: "./config/migrations/126_safe_shop.sql" },
  ];

  for (const migration of migrations) {
    console.log(`\n--- ${migration.name} ---\n`);

    const sqlFile = fs.readFileSync(migration.file, "utf8");

    // Split by CREATE or INSERT statements
    const statements = sqlFile
      .split(/(?=CREATE |INSERT |ALTER |DROP )/gi)
      .filter(s => s.trim().length > 10);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i].trim();
      if (!stmt) continue;

      const firstLine = stmt.split("\n").find(l => l.trim().length > 0);
      const preview = firstLine?.substring(0, 60) || "SQL statement";

      console.log(`[${i + 1}/${statements.length}] ${preview}...`);

      try {
        await executeSql(stmt);
        console.log("   OK");
      } catch (err) {
        if (err.message.includes("already exists") || err.message.includes("duplicate")) {
          console.log("   SKIP (already exists)");
        } else if (err.message.includes("404")) {
          console.log("\n   exec_sql RPC not found. Manual execution required.");
          console.log(`\n   Open: https://supabase.com/dashboard/project/${projectRef}/sql/new`);
          console.log(`   Paste contents of: ${migration.file}\n`);
          break;
        } else {
          console.log(`   Warning: ${err.message.substring(0, 80)}`);
        }
      }
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("MIGRATION COMPLETE");
  console.log("=".repeat(60));
  console.log("\nIf exec_sql RPC is not available, run manually:");
  console.log(`https://supabase.com/dashboard/project/${projectRef}/sql/new`);
  console.log("\nFiles to paste:");
  console.log("  1. config/migrations/125_safe_points.sql");
  console.log("  2. config/migrations/126_safe_shop.sql");
}

runMigrations().catch(console.error);
