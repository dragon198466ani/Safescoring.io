#!/usr/bin/env python3
"""
Calculate SAFE scores for product combinations
Based on individual product scores
"""
import sys
import json
import requests
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8')
load_dotenv('c:/Users/alexa/Desktop/SafeScoring/.env')
load_dotenv('c:/Users/alexa/Desktop/SafeScoring/web/.env.local')

with open('c:/Users/alexa/Desktop/SafeScoring/.claude/settings.local.json', 'r', encoding='utf-8') as f:
    config = json.load(f)

args = config.get('mcpServers', {}).get('supabase', {}).get('args', [])
access_token = None
for i, arg in enumerate(args):
    if arg == '--access-token' and i + 1 < len(args):
        access_token = args[i + 1]
        break

MGMT_API_URL = 'https://api.supabase.com/v1/projects/ajdncttomdqojlozxjxu/database/query'
MGMT_HEADERS = {'Authorization': f'Bearer {access_token}', 'Content-Type': 'application/json'}

def execute_sql(sql):
    r = requests.post(MGMT_API_URL, headers=MGMT_HEADERS, json={'query': sql})
    return r.status_code == 201, r.json() if r.status_code == 201 else r.text

# STEP 1: Add score columns to product_compatibility
print("1. Adding SAFE score columns to product_compatibility...")

sql_cols = """
ALTER TABLE product_compatibility
ADD COLUMN IF NOT EXISTS combo_score_s NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS combo_score_a NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS combo_score_f NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS combo_score_e NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS combo_score_total NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS score_methodology TEXT;
"""
execute_sql(sql_cols)
print("  Columns added!")

# STEP 2: Calculate combination scores
print("2. Calculating SAFE scores for all combinations...")

# Scoring methodology:
# S (Security): MIN of both products - weakest link principle
# A (Adversity): Average - combined resilience
# F (Fidelity): MIN - reliability depends on least reliable
# E (Efficiency): Based on steps and products efficiency, penalize complexity

sql_calc = """
UPDATE product_compatibility pc
SET
    -- S: Weakest link (MIN) - combo is only as secure as weakest product
    combo_score_s = LEAST(
        COALESCE(ssr_a.score_s, 50),
        COALESCE(ssr_b.score_s, 50)
    ),

    -- A: Average - combined resilience
    combo_score_a = (
        COALESCE(ssr_a.score_a, 50) + COALESCE(ssr_b.score_a, 50)
    ) / 2,

    -- F: Weakest link (MIN) - only as reliable as least reliable
    combo_score_f = LEAST(
        COALESCE(ssr_a.score_f, 50),
        COALESCE(ssr_b.score_f, 50)
    ),

    -- E: Efficiency formula
    -- Start with average of both products
    -- Penalty based on number of steps (more steps = less efficient)
    -- 3 steps = -5, 4 steps = -10, 5 steps = -15, 6 steps = -20
    combo_score_e = GREATEST(0, (
        (COALESCE(ssr_a.score_e, 50) + COALESCE(ssr_b.score_e, 50)) / 2
        - (COALESCE(pc.steps_count, 4) - 3) * 5
    )),

    score_methodology = 'S=MIN(weakest link), A=AVG(combined), F=MIN(reliability), E=AVG-steps_penalty'

FROM safe_scoring_results ssr_a, safe_scoring_results ssr_b
WHERE pc.product_a_id = ssr_a.product_id
  AND pc.product_b_id = ssr_b.product_id;
"""

ok, result = execute_sql(sql_calc)
print(f"  Scores calculated: {ok}")

# Calculate total score
print("3. Calculating total combo scores...")

sql_total = """
UPDATE product_compatibility
SET combo_score_total = (
    COALESCE(combo_score_s, 0) * 0.30 +  -- Security 30%
    COALESCE(combo_score_a, 0) * 0.25 +  -- Adversity 25%
    COALESCE(combo_score_f, 0) * 0.25 +  -- Fidelity 25%
    COALESCE(combo_score_e, 0) * 0.20    -- Efficiency 20%
)
WHERE combo_score_s IS NOT NULL;
"""
execute_sql(sql_total)
print("  Total scores calculated!")

# Update security_level based on total score
print("4. Updating security_level based on scores...")

sql_level = """
UPDATE product_compatibility
SET security_level = CASE
    WHEN combo_score_total >= 70 THEN 'HIGH'
    WHEN combo_score_total >= 50 THEN 'MEDIUM'
    ELSE 'LOW'
END
WHERE combo_score_total IS NOT NULL;
"""
execute_sql(sql_level)
print("  Security levels updated!")

# Show examples
print("\n" + "="*70)
print("EXAMPLES WITH CALCULATED SCORES:")

sql_ex = """
SELECT
    p1.name as product_a,
    p2.name as product_b,
    pc.combo_score_s,
    pc.combo_score_a,
    pc.combo_score_f,
    pc.combo_score_e,
    pc.combo_score_total,
    pc.security_level,
    pc.steps_count
FROM product_compatibility pc
JOIN products p1 ON pc.product_a_id = p1.id
JOIN products p2 ON pc.product_b_id = p2.id
WHERE pc.combo_score_total IS NOT NULL
ORDER BY pc.combo_score_total DESC
LIMIT 5;
"""

ok, result = execute_sql(sql_ex)
if ok and result:
    for row in result:
        print(f"\n{row['product_a']} + {row['product_b']}")
        print(f"  S: {row['combo_score_s']:.1f} | A: {row['combo_score_a']:.1f} | F: {row['combo_score_f']:.1f} | E: {row['combo_score_e']:.1f}")
        print(f"  TOTAL: {row['combo_score_total']:.1f} | Level: {row['security_level']} | Steps: {row['steps_count']}")

# Stats
print("\n" + "="*70)
print("STATISTICS:")

sql_stats = """
SELECT
    security_level,
    COUNT(*) as count,
    ROUND(AVG(combo_score_total), 1) as avg_score,
    ROUND(MIN(combo_score_total), 1) as min_score,
    ROUND(MAX(combo_score_total), 1) as max_score
FROM product_compatibility
WHERE combo_score_total IS NOT NULL
GROUP BY security_level
ORDER BY avg_score DESC;
"""

ok, result = execute_sql(sql_stats)
if ok and result:
    print("\nBy Security Level:")
    for row in result:
        print(f"  {row['security_level']}: {row['count']} combos | Avg: {row['avg_score']} | Range: {row['min_score']}-{row['max_score']}")

sql_count = """
SELECT
    COUNT(*) as total,
    COUNT(CASE WHEN combo_score_total IS NOT NULL THEN 1 END) as scored
FROM product_compatibility;
"""

ok, result = execute_sql(sql_count)
if ok and result:
    row = result[0]
    print(f"\nTotal: {row['scored']}/{row['total']} combinations have SAFE scores")
