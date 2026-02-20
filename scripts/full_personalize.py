#!/usr/bin/env python3
"""
FULL personalization - ALL fields with product names
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
    return r.status_code == 201

# STEP 1: Create a function in PostgreSQL to personalize todo_steps
print("1. Creating personalization function...")

sql_func = """
CREATE OR REPLACE FUNCTION personalize_todo_steps(
    steps jsonb,
    prod_a text,
    prod_b text,
    type_a text,
    type_b text
) RETURNS jsonb AS $$
DECLARE
    result jsonb := '[]'::jsonb;
    step text;
    new_step text;
BEGIN
    FOR step IN SELECT jsonb_array_elements_text(steps)
    LOOP
        new_step := step;
        -- Replace generic terms with product names
        new_step := REPLACE(new_step, 'hardware wallet', prod_a);
        new_step := REPLACE(new_step, 'hardware', prod_a);
        new_step := REPLACE(new_step, 'Hardware', prod_a);
        new_step := REPLACE(new_step, 'browser wallet', prod_b);
        new_step := REPLACE(new_step, 'browser extension', prod_b);
        new_step := REPLACE(new_step, 'mobile wallet', prod_b);
        new_step := REPLACE(new_step, 'CEX', prod_b);
        new_step := REPLACE(new_step, 'exchange', prod_b);
        new_step := REPLACE(new_step, 'Exchange', prod_b);
        new_step := REPLACE(new_step, 'DEX', prod_b);
        new_step := REPLACE(new_step, 'metal backup', prod_b);
        new_step := REPLACE(new_step, 'card', prod_b);

        result := result || to_jsonb(new_step);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;
"""
execute_sql(sql_func)
print("  Function created!")

# STEP 2: Get all compatibilities and update with personalized steps
print("2. Fetching compatibilities...")

SUPABASE_URL = 'https://ajdncttomdqojlozxjxu.supabase.co'
SUPABASE_KEY = 'REVOKED_ROTATE_ON_DASHBOARD'
SUPABASE_HEADERS = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'}

# Personalized TODO templates by type pair
TODO_TEMPLATES = {
    ("Hardware Wallet Cold", "Browser Extension Wallet"): [
        "Install {B} browser extension",
        "In {B}, go to Settings > Connect Hardware Wallet",
        "Connect your {A} via USB or Bluetooth",
        "On {A} screen, approve the connection to {B}"
    ],
    ("Hardware Wallet Cold", "Centralized Exchange"): [
        "Open {A} companion app and generate receive address",
        "VERIFY the address displayed on {A} screen matches",
        "On {B}: go to Withdraw > Select your crypto",
        "Paste your {A} address in {B} withdrawal form",
        "Double-check the network selection on {B}",
        "Complete {B} 2FA and wait for confirmation on {A}"
    ],
    ("Hardware Wallet Cold", "Mobile Wallet"): [
        "Enable Bluetooth on your {A}",
        "Open {B} > Settings > Hardware Wallet",
        "Scan for devices and select your {A}",
        "Confirm pairing on both {A} and {B}"
    ],
    ("Hardware Wallet Cold", "Physical Backup (Metal)"): [
        "During {A} initial setup, write down your 24-word seed",
        "Using {B}, engrave each word carefully",
        "Verify every word on {B} matches your {A} seed",
        "Store {B} in a fireproof safe, SEPARATE from {A}"
    ],
    ("Hardware Wallet Cold", "Decentralized Exchange"): [
        "Connect {A} to your browser wallet extension",
        "Navigate to {B} website",
        "Click Connect Wallet and select your {A}-connected wallet",
        "Choose your trade pair on {B}",
        "Review transaction details on {A} screen before signing"
    ],

    ("Centralized Exchange", "Browser Extension Wallet"): [
        "Open {B} and copy your receive address",
        "On {A}: go to Withdraw > Select crypto",
        "Paste your {B} address (VERIFY THE NETWORK!)",
        "Complete {A} 2FA verification",
        "Wait for blockchain confirmation, check {B} balance"
    ],
    ("Centralized Exchange", "Mobile Wallet"): [
        "In {B}: tap Receive and copy your address",
        "On {A} app: go to Withdraw",
        "Paste your {B} address or scan QR code",
        "Confirm the network matches (ERC20, BEP20, etc.)",
        "Complete {A} 2FA and wait for {B} to show balance"
    ],
    ("Centralized Exchange", "Hardware Wallet Cold"): [
        "Connect {B} to its companion app",
        "Generate a receive address, VERIFY it on {B} screen",
        "On {A}: go to Withdraw",
        "Paste your {B} address",
        "Select the correct network on {A}",
        "Complete {A} 2FA, confirm receipt on {B}"
    ],
    ("Centralized Exchange", "Crypto Card (Custodial)"): [
        "Order {B} from {A} (complete KYC if needed)",
        "Once received, activate {B} in {A} app",
        "Fund {B} from your {A} spot wallet or enable auto-top-up"
    ],
    ("Centralized Exchange", "Centralized Exchange"): [
        "On {B}: go to Deposit and copy the address",
        "On {A}: go to Withdraw > Select asset",
        "Paste {B} deposit address (verify network!)",
        "Complete 2FA on both {A} and {B}"
    ],
    ("Centralized Exchange", "Decentralized Exchange"): [
        "Withdraw from {A} to your self-custody wallet",
        "Wait for blockchain confirmation",
        "Connect your wallet to {B}",
        "Approve token spending on {B} if required",
        "Execute your swap on {B}",
        "Verify tokens received in your wallet"
    ],

    ("Physical Backup (Metal)", "Hardware Wallet Cold"): [
        "During {B} setup, carefully write your 24-word seed",
        "Engrave each word onto {A}",
        "Double-check every word on {A} matches {B}",
        "Store {A} in a secure location AWAY from {B}"
    ],
    ("Physical Backup (Metal)", "Browser Extension Wallet"): [
        "In {B}: Settings > Security > Export Seed Phrase",
        "Engrave each word onto {A}",
        "Verify all 12/24 words are correct on {A}",
        "Store {A} securely, away from your computer"
    ],
    ("Physical Backup (Metal)", "Mobile Wallet"): [
        "In {B}: Settings > Backup > Show Seed Phrase",
        "Engrave each word onto {A}",
        "Test recovery with a small amount",
        "Store {A} in a fireproof safe"
    ],
    ("Physical Backup (Metal)", "Physical Backup (Metal)"): [
        "Choose: duplicate entire seed OR split (words 1-12 on {A}, 13-24 on {B})",
        "Engrave words carefully on both {A} and {B}",
        "Store {A} and {B} in DIFFERENT geographic locations"
    ],
    ("Physical Backup (Metal)", "Centralized Exchange"): [
        "Write down your {B} 2FA recovery codes",
        "Note your {B} backup email and phone number",
        "Engrave this recovery info on {A}",
        "Store {A} in a secure location separate from your devices"
    ],

    ("Crypto Card (Custodial)", "Mobile Wallet"): [
        "Add {A} to {B} (Apple Pay / Google Pay)",
        "Set your preferred spending limits on {A}",
        "Ready! Tap to pay using {A} via {B}"
    ],
    ("Crypto Card (Custodial)", "Centralized Exchange"): [
        "Order {A} through {B}",
        "Activate {A} in the {B} app",
        "Fund {A} from your {B} spot balance"
    ],
    ("Crypto Card (Custodial)", "Hardware Wallet Cold"): [
        "Get the deposit address for {A} from its provider",
        "On {B}: create a transaction to fund {A}",
        "Sign the transaction on your {B} device",
        "Wait for {A} balance to update"
    ],

    ("Mobile Wallet", "Browser Extension Wallet"): [
        "In {A}: Settings > Export Seed Phrase",
        "In {B}: Import Wallet > Enter Seed",
        "Now {A} and {B} share the same addresses",
        "Use {A} on mobile, {B} on desktop"
    ],
    ("Mobile Wallet", "Hardware Wallet Cold"): [
        "Enable Bluetooth on {B}",
        "In {A}: Settings > Connect Hardware Wallet",
        "Select {B} from the device list",
        "Confirm connection on {B} screen"
    ],
    ("Mobile Wallet", "Centralized Exchange"): [
        "In {A}: tap Receive and copy address",
        "On {B}: go to Withdraw",
        "Paste {A} address",
        "Complete {B} 2FA",
        "Wait for balance in {A}"
    ],

    ("Decentralized Exchange", "Browser Extension Wallet"): [
        "Open {A} website",
        "Click Connect Wallet",
        "Select {B} and approve the connection",
        "You can now trade on {A} using {B}"
    ],
    ("Decentralized Exchange", "Mobile Wallet"): [
        "In {B}, open the built-in dApp browser",
        "Navigate to {A}",
        "{B} will auto-connect to {A}",
        "Approve transactions in {B}"
    ],
    ("Decentralized Exchange", "Hardware Wallet Cold"): [
        "Connect {B} to your browser wallet",
        "Go to {A} and connect wallet",
        "Select your trade on {A}",
        "Review transaction on {B} screen",
        "Sign on {B} device"
    ],

    ("Staking", "Browser Extension Wallet"): [
        "Connect {B} to {A} protocol",
        "Select your preferred validator or pool",
        "Enter the amount you want to stake",
        "Approve and confirm in {B}",
        "Receive your staking receipt token"
    ],
    ("Staking", "Centralized Exchange"): [
        "On {B}: go to Staking or Earn section",
        "Select {A} asset and staking duration",
        "Confirm your stake on {B}"
    ],
}

# Fetch all compatibilities with product names
all_compat = []
offset = 0
while True:
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/product_compatibility?select=id,product_a_id,product_b_id,products!product_compatibility_product_a_id_fkey(name,product_types(name)),products!product_compatibility_product_b_id_fkey(name,product_types(name))&offset={offset}&limit=1000',
        headers=SUPABASE_HEADERS
    )
    data = r.json()
    if not data:
        break
    all_compat.extend(data)
    offset += 1000
    print(f"  Fetched {len(all_compat)}...")

print(f"  Total: {len(all_compat)} compatibilities")

# Process in batches
print("3. Personalizing TODO steps, warnings, and descriptions...")
updated = 0

for compat in all_compat:
    try:
        prod_a_data = compat.get('products', {})
        prod_b_data = compat.get('products', {})

        # Handle nested structure
        if isinstance(compat.get('products!product_compatibility_product_a_id_fkey'), dict):
            prod_a_name = compat['products!product_compatibility_product_a_id_fkey'].get('name', 'Product A')
            type_a = compat['products!product_compatibility_product_a_id_fkey'].get('product_types', {}).get('name', 'Unknown')
        else:
            prod_a_name = 'Product A'
            type_a = 'Unknown'

        if isinstance(compat.get('products!product_compatibility_product_b_id_fkey'), dict):
            prod_b_name = compat['products!product_compatibility_product_b_id_fkey'].get('name', 'Product B')
            type_b = compat['products!product_compatibility_product_b_id_fkey'].get('product_types', {}).get('name', 'Unknown')
        else:
            prod_b_name = 'Product B'
            type_b = 'Unknown'

        # Find matching template
        key = (type_a, type_b)
        key_rev = (type_b, type_a)

        template = TODO_TEMPLATES.get(key) or TODO_TEMPLATES.get(key_rev)

        if template:
            # Personalize steps
            if key in TODO_TEMPLATES:
                steps = [s.replace('{A}', prod_a_name).replace('{B}', prod_b_name) for s in template]
            else:
                steps = [s.replace('{A}', prod_b_name).replace('{B}', prod_a_name) for s in template]

            steps_json = json.dumps(steps).replace("'", "''")

            sql = f"""
            UPDATE product_compatibility
            SET
                todo_steps = '{steps_json}'::jsonb,
                steps_count = {len(steps)}
            WHERE id = {compat['id']};
            """
            execute_sql(sql)
            updated += 1

            if updated % 500 == 0:
                print(f"  Updated {updated}/{len(all_compat)}...")

    except Exception as e:
        pass

print(f"\nDone! Updated {updated} TODO steps")

# Show examples
print("\n" + "="*60)
print("EXAMPLES:")

sql_ex = """
SELECT p1.name as a, p2.name as b, pc.todo_steps, pc.why_use_together,
       pc.safe_warning_s, pc.safe_warning_f
FROM product_compatibility pc
JOIN products p1 ON pc.product_a_id = p1.id
JOIN products p2 ON pc.product_b_id = p2.id
JOIN product_types pt1 ON p1.type_id = pt1.id
WHERE pt1.name = 'Hardware Wallet Cold'
LIMIT 2;
"""
r = requests.post(MGMT_API_URL, headers=MGMT_HEADERS, json={'query': sql_ex})
if r.status_code == 201 and r.json():
    for row in r.json():
        print(f"\n{row['a']} + {row['b']}")
        print(f"Why: {row['why_use_together']}")
        print("TODO:")
        steps = row['todo_steps']
        if isinstance(steps, str):
            steps = json.loads(steps)
        for i, s in enumerate(steps, 1):
            print(f"  {i}. {s}")
        print(f"Safe S: {row['safe_warning_s']}")
        print(f"Safe F: {row['safe_warning_f']}")
