/**
 * Check if migration 136 tables exist
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../web/.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.log('Missing env vars. URL:', !!url, 'KEY:', !!key);
  process.exit(1);
}

const supabase = createClient(url, key);

async function checkTables() {
  console.log('Checking migration 136 tables...\n');

  const tables = ['evaluation_votes', 'token_rewards', 'token_transactions', 'reward_config'];

  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(1);

    if (error && error.code === '42P01') {
      console.log(`❌ ${table}: NOT EXISTS`);
    } else if (error) {
      console.log(`⚠️ ${table}: Error - ${error.message}`);
    } else {
      console.log(`✅ ${table}: EXISTS (${data?.length || 0} sample rows)`);
    }
  }

  console.log('\n--- Status ---');
  console.log('If tables are missing, run migration 136 in Supabase SQL Editor:');
  console.log('File: config/migrations/136_evaluation_community_votes.sql');
}

checkTables();
