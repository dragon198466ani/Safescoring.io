#!/usr/bin/env python3
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
    print(f"  Status: {r.status_code}")
    return r.status_code == 201

# 1. Personalize compatibility_explanation
print('1. Updating compatibility_explanation with product names...')
sql1 = """
UPDATE product_compatibility pc
SET compatibility_explanation = p1.name || ' + ' || p2.name || ': ' ||
    CASE
        WHEN pt1.name = 'Hardware Wallet Cold' AND pt2.name = 'Browser Extension Wallet'
            THEN 'Connect ' || p1.name || ' to ' || p2.name || ' for secure dApp transactions.'
        WHEN pt1.name = 'Hardware Wallet Cold' AND pt2.name = 'Centralized Exchange'
            THEN 'Secure your ' || p2.name || ' funds by withdrawing to ' || p1.name || '.'
        WHEN pt1.name = 'Hardware Wallet Cold' AND pt2.name = 'Mobile Wallet'
            THEN 'Pair ' || p1.name || ' with ' || p2.name || ' via Bluetooth for mobile security.'
        WHEN pt1.name = 'Hardware Wallet Cold' AND pt2.name = 'Physical Backup (Metal)'
            THEN 'Backup your ' || p1.name || ' seed phrase on ' || p2.name || '.'
        WHEN pt1.name = 'Centralized Exchange' AND pt2.name = 'Browser Extension Wallet'
            THEN 'Withdraw from ' || p1.name || ' to ' || p2.name || ' for self-custody.'
        WHEN pt1.name = 'Centralized Exchange' AND pt2.name = 'Mobile Wallet'
            THEN 'Move funds from ' || p1.name || ' to ' || p2.name || ' for daily use.'
        WHEN pt1.name = 'Centralized Exchange' AND pt2.name = 'Hardware Wallet Cold'
            THEN 'Secure ' || p1.name || ' funds on ' || p2.name || ' for long-term storage.'
        WHEN pt1.name = 'Centralized Exchange' AND pt2.name = 'Crypto Card (Custodial)'
            THEN 'Link ' || p2.name || ' to ' || p1.name || ' for crypto spending.'
        WHEN pt1.name = 'Physical Backup (Metal)' AND pt2.name = 'Hardware Wallet Cold'
            THEN 'Use ' || p1.name || ' to backup ' || p2.name || ' seed phrase.'
        WHEN pt1.name = 'Physical Backup (Metal)' AND pt2.name = 'Physical Backup (Metal)'
            THEN 'Create redundant backups with ' || p1.name || ' and ' || p2.name || '.'
        WHEN pt1.name = 'Crypto Card (Custodial)' AND pt2.name = 'Mobile Wallet'
            THEN 'Add ' || p1.name || ' to ' || p2.name || ' for tap-to-pay.'
        WHEN pt1.name = 'Mobile Wallet' AND pt2.name = 'Browser Extension Wallet'
            THEN 'Sync ' || p1.name || ' with ' || p2.name || ' using same seed.'
        WHEN pt1.name = 'Decentralized Exchange' AND pt2.name = 'Browser Extension Wallet'
            THEN 'Connect ' || p2.name || ' to trade on ' || p1.name || '.'
        ELSE 'Use ' || p1.name || ' with ' || p2.name || ' for enhanced functionality.'
    END
FROM products p1, products p2, product_types pt1, product_types pt2
WHERE pc.product_a_id = p1.id
  AND pc.product_b_id = p2.id
  AND p1.type_id = pt1.id
  AND p2.type_id = pt2.id;
"""
execute_sql(sql1)

# 2. Personalize why_use_together
print('2. Updating why_use_together...')
sql2 = """
UPDATE product_compatibility pc
SET why_use_together =
    CASE
        WHEN pt1.name = 'Hardware Wallet Cold' AND pt2.name = 'Browser Extension Wallet'
            THEN p1.name || ' signs securely while ' || p2.name || ' provides dApp access.'
        WHEN pt1.name = 'Hardware Wallet Cold' AND pt2.name = 'Centralized Exchange'
            THEN 'Buy on ' || p2.name || ', store long-term on ' || p1.name || '. Not your keys = not your coins.'
        WHEN pt1.name = 'Hardware Wallet Cold' AND pt2.name = 'Mobile Wallet'
            THEN p2.name || ' convenience + ' || p1.name || ' security via Bluetooth.'
        WHEN pt1.name = 'Hardware Wallet Cold' AND pt2.name = 'Physical Backup (Metal)'
            THEN p1.name || ' is only as safe as its backup. ' || p2.name || ' survives fire/flood.'
        WHEN pt1.name = 'Centralized Exchange' AND pt2.name = 'Browser Extension Wallet'
            THEN 'Move from ' || p1.name || ' to ' || p2.name || '. Take control of your keys.'
        WHEN pt1.name = 'Centralized Exchange' AND pt2.name = 'Mobile Wallet'
            THEN 'Buy on ' || p1.name || ', use daily with ' || p2.name || '.'
        WHEN pt1.name = 'Centralized Exchange' AND pt2.name = 'Hardware Wallet Cold'
            THEN p1.name || ' for trading, ' || p2.name || ' for secure storage.'
        WHEN pt1.name = 'Physical Backup (Metal)' AND pt2.name = 'Hardware Wallet Cold'
            THEN p1.name || ' is disaster insurance for ' || p2.name || '.'
        WHEN pt1.name = 'Physical Backup (Metal)' AND pt2.name = 'Physical Backup (Metal)'
            THEN 'Geographic redundancy. If ' || p1.name || ' compromised, ' || p2.name || ' remains safe.'
        WHEN pt1.name = 'Crypto Card (Custodial)' AND pt2.name = 'Mobile Wallet'
            THEN 'Tap-to-pay with ' || p1.name || ' via ' || p2.name || '.'
        WHEN pt1.name = 'Mobile Wallet' AND pt2.name = 'Browser Extension Wallet'
            THEN 'Same wallet everywhere. ' || p1.name || ' for mobile, ' || p2.name || ' for desktop.'
        ELSE p1.name || ' + ' || p2.name || ': Combine for better security and usability.'
    END
FROM products p1, products p2, product_types pt1, product_types pt2
WHERE pc.product_a_id = p1.id
  AND pc.product_b_id = p2.id
  AND p1.type_id = pt1.id
  AND p2.type_id = pt2.id;
"""
execute_sql(sql2)

# 3. Personalize SAFE warnings
print('3. Updating SAFE warnings...')
sql3 = """
UPDATE product_compatibility pc
SET
    safe_warning_s = CASE
        WHEN pt1.name = 'Hardware Wallet Cold' THEN 'ALWAYS verify on ' || p1.name || ' screen before signing. Never trust ' || p2.name || ' alone.'
        WHEN pt2.name = 'Hardware Wallet Cold' THEN 'ALWAYS verify on ' || p2.name || ' screen before signing.'
        WHEN pt1.name = 'Centralized Exchange' THEN 'Whitelist ' || p2.name || ' address on ' || p1.name || ' to prevent phishing.'
        WHEN pt1.name = 'Physical Backup (Metal)' THEN 'Store ' || p1.name || ' separately from ' || p2.name || '. Different locations = safety.'
        ELSE 'Verify all addresses and amounts before confirming transactions between ' || p1.name || ' and ' || p2.name || '.'
    END,
    safe_warning_a = CASE
        WHEN pt1.name = 'Hardware Wallet Cold' THEN p1.name || ' protects against ' || p2.name || ' compromises. Keep firmware updated.'
        WHEN pt2.name = 'Hardware Wallet Cold' THEN p2.name || ' protects against remote attacks on ' || p1.name || '.'
        WHEN pt1.name = 'Physical Backup (Metal)' THEN p1.name || ' survives fire/flood that would destroy ' || p2.name || '.'
        WHEN pt1.name = 'Centralized Exchange' THEN 'If ' || p1.name || ' freezes account, funds in ' || p2.name || ' are safe.'
        ELSE 'Understand risks of both ' || p1.name || ' and ' || p2.name || ' before combining.'
    END,
    safe_warning_f = CASE
        WHEN pt1.name = 'Hardware Wallet Cold' AND pt2.name = 'Browser Extension Wallet' THEN p1.name || ' + ' || p2.name || ' is industry standard. Wide dApp compatibility.'
        WHEN pt1.name = 'Physical Backup (Metal)' THEN p2.name || ' uses BIP39 standard. ' || p1.name || ' stores standard 24 words.'
        WHEN pt1.name = 'Centralized Exchange' THEN p1.name || ' and ' || p2.name || ' must support same network. Check before sending.'
        ELSE 'Verify compatibility between ' || p1.name || ' and ' || p2.name || ' before use.'
    END,
    safe_warning_e = CASE
        WHEN pt1.name = 'Hardware Wallet Cold' THEN 'Adds ' || p1.name || ' signing step. 10-30 seconds extra per transaction.'
        WHEN pt1.name = 'Physical Backup (Metal)' THEN 'One-time setup with ' || p1.name || '. No ongoing maintenance needed.'
        WHEN pc.steps_count = 3 THEN '3 simple steps. Quick setup for ' || p1.name || ' + ' || p2.name || '.'
        WHEN pc.steps_count <= 4 THEN '4 steps. Standard process for ' || p1.name || ' + ' || p2.name || '.'
        WHEN pc.steps_count <= 5 THEN '5 steps. Moderate complexity for ' || p1.name || ' + ' || p2.name || '.'
        ELSE '6 steps with ' || p1.name || ' + ' || p2.name || '. Worth it for maximum security.'
    END
FROM products p1, products p2, product_types pt1, product_types pt2
WHERE pc.product_a_id = p1.id
  AND pc.product_b_id = p2.id
  AND p1.type_id = pt1.id
  AND p2.type_id = pt2.id;
"""
execute_sql(sql3)

print('\nDone! Showing example...')

# Show example
sql_ex = """
SELECT p1.name as a, p2.name as b, pc.compatibility_explanation, pc.why_use_together,
       pc.safe_warning_s, pc.safe_warning_a, pc.safe_warning_e, pc.steps_count
FROM product_compatibility pc
JOIN products p1 ON pc.product_a_id = p1.id
JOIN products p2 ON pc.product_b_id = p2.id
JOIN product_types pt1 ON p1.type_id = pt1.id
JOIN product_types pt2 ON p2.type_id = pt2.id
WHERE pt1.name = 'Hardware Wallet Cold' AND pt2.name = 'Centralized Exchange'
LIMIT 2;
"""
r = requests.post(MGMT_API_URL, headers=MGMT_HEADERS, json={'query': sql_ex})
if r.status_code == 201 and r.json():
    for row in r.json():
        print('\n' + '='*60)
        print(f"{row['a']} + {row['b']}")
        print(f"Steps: {row['steps_count']}")
        print(f"\nDescription: {row['compatibility_explanation']}")
        print(f"\nWhy: {row['why_use_together']}")
        print(f"\nSafe S: {row['safe_warning_s']}")
        print(f"Safe A: {row['safe_warning_a']}")
        print(f"Safe E: {row['safe_warning_e']}")
