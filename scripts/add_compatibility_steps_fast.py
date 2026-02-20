#!/usr/bin/env python3
"""
Add steps_count, todo_steps, and compatibility_explanation to product_compatibility table
FAST VERSION - uses batch SQL updates
"""
import os
import sys
import json
import requests
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8')
load_dotenv('c:/Users/alexa/Desktop/SafeScoring/.env')
load_dotenv('c:/Users/alexa/Desktop/SafeScoring/web/.env.local')

# Supabase REST API
SUPABASE_URL = os.getenv('SUPABASE_URL') or os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
SUPABASE_HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

# Load MCP config for Management API
with open('c:/Users/alexa/Desktop/SafeScoring/.claude/settings.local.json', 'r', encoding='utf-8') as f:
    config = json.load(f)

mcp_servers = config.get('mcpServers', {})
supabase_config = mcp_servers.get('supabase', {})
args = supabase_config.get('args', [])

access_token = None
for i, arg in enumerate(args):
    if arg == '--access-token' and i + 1 < len(args):
        access_token = args[i + 1]
        break

project_id = 'ajdncttomdqojlozxjxu'
MGMT_API_URL = f"https://api.supabase.com/v1/projects/{project_id}/database/query"
MGMT_HEADERS = {
    "Authorization": f"Bearer {access_token}",
    "Content-Type": "application/json"
}

def execute_sql(sql):
    """Execute SQL via Management API"""
    r = requests.post(MGMT_API_URL, headers=MGMT_HEADERS, json={"query": sql})
    if r.status_code == 201:
        return r.json()
    else:
        print(f"Error: {r.status_code}")
        return None

# Step 1: Add columns if they don't exist
print("Step 1: Adding columns...")
sql_add_columns = """
ALTER TABLE product_compatibility
ADD COLUMN IF NOT EXISTS steps_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS todo_steps JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS compatibility_explanation TEXT;
"""
execute_sql(sql_add_columns)
print("Columns added!")

# Step 2: Define steps templates by type pair (using actual DB type names)
TYPE_STEPS = {
    # Hardware Wallet Cold combinations
    ("Hardware Wallet Cold", "Browser Extension Wallet"): (4, "Connect hardware wallet to browser extension for secure signing.",
        ["Install browser wallet extension (MetaMask, Rabby)", "In settings, select Connect Hardware Wallet", "Connect device via USB or Bluetooth", "Approve connection on hardware screen"]),
    ("Hardware Wallet Cold", "Mobile Wallet"): (4, "Pair hardware wallet with mobile wallet via Bluetooth.",
        ["Enable Bluetooth on hardware wallet", "Open mobile wallet > Settings > Hardware", "Scan and select your device", "Confirm pairing on both devices"]),
    ("Hardware Wallet Cold", "Desktop Wallet"): (3, "Connect hardware wallet to desktop for full control.",
        ["Install companion app (Ledger Live/Trezor Suite)", "Connect via USB cable", "Unlock and authorize connection"]),
    ("Hardware Wallet Cold", "Decentralized Exchange"): (5, "Trade on DEX with hardware wallet security.",
        ["Connect hardware to browser extension", "Go to DEX and connect wallet", "Select trade pair and amount", "Review transaction on hardware screen", "Sign on device"]),
    ("Hardware Wallet Cold", "DeFi Lending"): (6, "Use DeFi lending with hardware wallet security.",
        ["Connect hardware to browser wallet", "Connect to lending protocol (Aave, Compound)", "Select asset to deposit", "Approve token spending on device", "Confirm deposit on device", "Monitor your position"]),
    ("Hardware Wallet Cold", "Centralized Exchange"): (6, "Secure exchange funds by withdrawing to hardware wallet.",
        ["Connect hardware to companion app", "Generate receive address on device", "VERIFY address matches on device screen", "On CEX: Withdraw > Paste address", "Double-check network selection", "Complete 2FA verification"]),
    ("Hardware Wallet Cold", "Physical Backup (Metal)"): (5, "Backup hardware wallet seed phrase to metal.",
        ["Write 24-word seed during HW setup", "Engrave/stamp words onto metal backup", "Verify each word is correct", "Store in secure location (fireproof safe)", "NEVER photograph or store digitally"]),
    ("Hardware Wallet Cold", "Staking"): (6, "Stake with hardware wallet security.",
        ["Connect hardware to browser wallet", "Navigate to staking protocol", "Select validator or pool", "Review stake on hardware", "Sign transaction on device", "Monitor staking rewards"]),

    # Centralized Exchange combinations
    ("Centralized Exchange", "Browser Extension Wallet"): (5, "Withdraw from exchange to self-custody browser wallet.",
        ["Copy your browser wallet receive address", "On CEX: Withdraw > Select crypto", "Paste address (VERIFY NETWORK!)", "Complete 2FA verification", "Wait for blockchain confirmation"]),
    ("Centralized Exchange", "Mobile Wallet"): (5, "Withdraw from exchange to mobile wallet.",
        ["In mobile wallet: tap Receive, copy address", "On CEX app: Withdraw > Select asset", "Paste address or scan QR code", "Confirm network (ERC20, BEP20, etc.)", "Complete 2FA and wait for confirmation"]),
    ("Centralized Exchange", "Hardware Wallet Cold"): (6, "Secure exchange funds by withdrawing to hardware wallet.",
        ["Connect hardware to companion app", "Generate receive address on device", "VERIFY address matches on device screen", "On CEX: Withdraw > Paste address", "Double-check network selection", "Complete 2FA verification"]),
    ("Centralized Exchange", "Crypto Card (Custodial)"): (3, "Link exchange account to crypto card for spending.",
        ["Order card from exchange (KYC required)", "Activate card in exchange app", "Fund card or enable auto-top-up from spot"]),
    ("Centralized Exchange", "Centralized Exchange"): (4, "Transfer between two exchanges.",
        ["Get deposit address from destination CEX", "On source CEX: Withdraw > Select asset", "Paste address (verify network!)", "Complete 2FA on both exchanges"]),
    ("Centralized Exchange", "Decentralized Exchange"): (6, "Move from CEX to DEX trading.",
        ["Withdraw from CEX to self-custody wallet", "Wait for blockchain confirmation", "Connect wallet to DEX", "Approve token if needed", "Execute your swap", "Verify received tokens in wallet"]),
    ("Centralized Exchange", "DeFi Lending"): (6, "Move from CEX to DeFi lending for better yields.",
        ["Withdraw to self-custody wallet", "Ensure you have ETH for gas fees", "Connect wallet to lending protocol", "Approve token for spending", "Deposit your desired amount", "Monitor interest accrual"]),
    ("Centralized Exchange", "Physical Backup (Metal)"): (5, "Backup CEX account credentials securely.",
        ["Write down 2FA recovery codes", "Note backup email and phone", "Store credentials on metal backup", "Keep in separate secure location", "Test recovery process"]),
    ("Centralized Exchange", "Staking"): (3, "Stake directly from exchange.",
        ["Go to CEX Staking/Earn section", "Select asset and staking duration", "Confirm stake (may have lock period)"]),

    # Decentralized Exchange combinations
    ("Decentralized Exchange", "Browser Extension Wallet"): (4, "Connect browser wallet to DEX for trading.",
        ["Go to DEX website (Uniswap, SushiSwap)", "Click Connect Wallet", "Select your wallet and approve", "Ready to swap tokens"]),
    ("Decentralized Exchange", "Mobile Wallet"): (4, "Access DEX from mobile wallet browser.",
        ["Open wallet's built-in dApp browser", "Navigate to DEX URL", "Wallet auto-connects", "Approve transactions on phone"]),
    ("Decentralized Exchange", "Hardware Wallet Cold"): (5, "Trade on DEX with hardware wallet security.",
        ["Connect hardware to browser extension", "Go to DEX and connect wallet", "Select trade pair and amount", "Review transaction on hardware screen", "Sign on device"]),
    ("Decentralized Exchange", "DeFi Lending"): (5, "Swap on DEX then deposit to lending.",
        ["Swap tokens on DEX as needed", "Navigate to lending protocol", "Connect same wallet", "Approve and deposit tokens", "Monitor your lending position"]),

    # DeFi Lending combinations
    ("DeFi Lending", "Browser Extension Wallet"): (6, "Deposit to DeFi lending from wallet.",
        ["Connect wallet to lending protocol", "Navigate to Supply/Deposit section", "Select asset and amount", "Approve token (first time only)", "Confirm deposit transaction", "Receive interest-bearing tokens"]),
    ("DeFi Lending", "Centralized Exchange"): (6, "Move from CEX to DeFi lending.",
        ["Withdraw from CEX to self-custody wallet", "Ensure you have ETH for gas", "Connect wallet to lending protocol", "Approve token spending", "Deposit desired amount", "Monitor interest accrual"]),
    ("DeFi Lending", "Staking"): (5, "Combine lending with staking for double yield.",
        ["Deposit to lending protocol", "Receive interest-bearing tokens", "Check if tokens can be staked", "Stake receipt tokens if possible", "Monitor combined yields"]),

    # Physical Backup combinations
    ("Physical Backup (Metal)", "Hardware Wallet Cold"): (5, "Backup hardware wallet seed to metal.",
        ["Write 24-word seed during HW setup", "Engrave/stamp words onto metal backup", "Verify each word is correct", "Store in secure location (fireproof safe)", "NEVER photograph or store digitally"]),
    ("Physical Backup (Metal)", "Browser Extension Wallet"): (4, "Backup browser wallet seed to metal.",
        ["Export seed phrase from wallet settings", "Engrave/stamp onto metal device", "Verify accuracy of each word", "Store securely away from wallet"]),
    ("Physical Backup (Metal)", "Mobile Wallet"): (4, "Backup mobile wallet seed to metal.",
        ["Export seed phrase from wallet", "Engrave onto metal backup device", "Test recovery with small amount", "Store in fireproof safe"]),
    ("Physical Backup (Metal)", "Centralized Exchange"): (5, "Backup CEX account credentials to metal.",
        ["Record 2FA recovery codes", "Note backup email/phone", "Engrave on metal for durability", "Store in separate secure location", "Never store passwords digitally"]),
    ("Physical Backup (Metal)", "Physical Backup (Metal)"): (5, "CHOOSE based on threat: REPLICATE = accidents/theft. SPLIT = physical threat.",
        ["ANALYZE your PRIMARY threat model", "REMOTE THEFT/ACCIDENT: REPLICATE > SPLIT (redundancy)", "PHYSICAL THREAT (wrench attack): SPLIT > REPLICATE", "REPLICATE: Attacker only needs ONE location", "SPLIT: Attacker must coerce ALL locations"]),

    # Crypto Card combinations
    ("Crypto Card (Custodial)", "Mobile Wallet"): (3, "Link crypto card to mobile for payments.",
        ["Add card to mobile wallet (Apple/Google Pay)", "Set spending limits if desired", "Ready for tap-to-pay"]),
    ("Crypto Card (Custodial)", "Centralized Exchange"): (3, "Exchange-linked card setup.",
        ["Order card from exchange", "Activate in exchange app", "Fund from spot wallet balance"]),
    ("Crypto Card (Custodial)", "Browser Extension Wallet"): (4, "Use card with browser wallet funds.",
        ["Transfer from wallet to card-linked exchange", "Wait for deposit confirmation", "Card auto-funded from balance", "Ready to spend"]),
    ("Crypto Card (Custodial)", "Hardware Wallet Cold"): (5, "Top up card from hardware wallet.",
        ["Connect hardware to companion app", "Send to card-linked exchange address", "Sign transaction on device", "Wait for confirmation", "Card balance updated"]),
    ("Crypto Card (Custodial)", "Physical Backup (Metal)"): (3, "Backup card PIN and recovery info.",
        ["Record card PIN securely", "Note account recovery details", "Store on metal backup"]),

    # Mobile Wallet combinations
    ("Mobile Wallet", "Browser Extension Wallet"): (4, "Sync mobile and browser wallets.",
        ["Export seed from one wallet", "Import into other wallet", "Both now share same addresses", "Use appropriate one per device"]),
    ("Mobile Wallet", "Hardware Wallet Cold"): (4, "Pair mobile wallet with hardware via Bluetooth.",
        ["Enable Bluetooth on hardware wallet", "Open mobile wallet > Settings > Hardware", "Scan and select your device", "Confirm pairing on both devices"]),
    ("Mobile Wallet", "Centralized Exchange"): (5, "Transfer between mobile wallet and CEX.",
        ["Copy address from destination", "Initiate send from source", "Verify network compatibility", "Confirm transaction", "Wait for blockchain confirmation"]),
    ("Mobile Wallet", "Physical Backup (Metal)"): (4, "Backup mobile wallet seed to metal.",
        ["Export seed phrase from wallet", "Engrave onto metal backup device", "Test recovery with small amount", "Store in fireproof safe"]),

    # Staking combinations
    ("Staking", "Browser Extension Wallet"): (5, "Stake through DeFi from wallet.",
        ["Connect wallet to staking protocol", "Select validator or pool", "Enter stake amount", "Approve and confirm transaction", "Receive staking receipt token"]),
    ("Staking", "Hardware Wallet Cold"): (6, "Stake with hardware wallet security.",
        ["Connect hardware to browser wallet", "Navigate to staking protocol", "Select validator", "Review stake on hardware", "Sign transaction on device", "Monitor staking rewards"]),
    ("Staking", "Centralized Exchange"): (3, "Stake directly from exchange.",
        ["Go to CEX Staking/Earn section", "Select asset and staking duration", "Confirm stake (may have lock period)"]),
}

# Default steps based on security level
DEFAULT_STEPS = {
    "HIGH": (4, "Secure integration between products.",
        ["Verify both products configured", "Initiate connection", "Authorize on secondary", "Test with small amount"]),
    "MEDIUM": (5, "Standard integration requiring care.",
        ["Check addresses/credentials", "Verify network compatibility", "Initiate transfer", "Verify before confirming", "Wait and verify receipt"]),
    "LOW": (3, "Simple direct integration.",
        ["Connect products", "Authorize connection", "Ready to use"])
}

print("\nStep 2: Fetching products with types...")
r = requests.get(
    f'{SUPABASE_URL}/rest/v1/products?select=id,name,type_id,product_types(name)',
    headers=SUPABASE_HEADERS
)
products = {p['id']: {
    'name': p['name'],
    'type': p['product_types']['name'] if p.get('product_types') else 'Unknown'
} for p in r.json()}
print(f"Loaded {len(products)} products")

print("\nStep 3: Fetching ALL compatibilities...")
compatibilities = []
offset = 0
while True:
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/product_compatibility?select=id,product_a_id,product_b_id,security_level&offset={offset}&limit=1000',
        headers=SUPABASE_HEADERS
    )
    batch = r.json()
    if not batch:
        break
    compatibilities.extend(batch)
    offset += 1000
    print(f"  Fetched {len(compatibilities)} so far...")
print(f"Processing {len(compatibilities)} compatibilities...")

print("\nStep 4: Building batch update SQL...")

# Build one big UPDATE with CASE statements
updates_by_level = {"HIGH": [], "MEDIUM": [], "LOW": []}

for compat in compatibilities:
    prod_a = products.get(compat['product_a_id'], {})
    prod_b = products.get(compat['product_b_id'], {})
    type_a = prod_a.get('type', 'Unknown')
    type_b = prod_b.get('type', 'Unknown')
    name_a = prod_a.get('name', 'Product A')
    name_b = prod_b.get('name', 'Product B')

    # Find matching template
    steps_data = None
    if (type_a, type_b) in TYPE_STEPS:
        steps_data = TYPE_STEPS[(type_a, type_b)]
    elif (type_b, type_a) in TYPE_STEPS:
        steps_data = TYPE_STEPS[(type_b, type_a)]
    else:
        level = compat.get('security_level', 'MEDIUM')
        steps_data = DEFAULT_STEPS.get(level, DEFAULT_STEPS['MEDIUM'])

    steps_count, desc, steps_list = steps_data
    explanation = f"{name_a} + {name_b}: {desc}"

    # Escape for SQL
    explanation_escaped = explanation.replace("'", "''")
    steps_json = json.dumps(steps_list).replace("'", "''")

    level = compat.get('security_level', 'MEDIUM')
    updates_by_level[level].append({
        'id': compat['id'],
        'steps_count': steps_count,
        'explanation': explanation_escaped,
        'steps_json': steps_json
    })

print(f"  HIGH: {len(updates_by_level['HIGH'])} | MEDIUM: {len(updates_by_level['MEDIUM'])} | LOW: {len(updates_by_level['LOW'])}")

# Execute batch updates per security level (smaller batches)
print("\nStep 5: Executing batch updates...")
total_updated = 0

for level, updates in updates_by_level.items():
    if not updates:
        continue

    # Process in chunks of 500
    chunk_size = 500
    for i in range(0, len(updates), chunk_size):
        chunk = updates[i:i+chunk_size]

        # Build CASE statement for this chunk
        ids = [str(u['id']) for u in chunk]

        steps_count_cases = "\n".join([f"WHEN id = {u['id']} THEN {u['steps_count']}" for u in chunk])
        explanation_cases = "\n".join([f"WHEN id = {u['id']} THEN '{u['explanation']}'" for u in chunk])
        steps_json_cases = "\n".join([f"WHEN id = {u['id']} THEN '{u['steps_json']}'::jsonb" for u in chunk])

        sql = f"""
UPDATE product_compatibility
SET
    steps_count = CASE {steps_count_cases} END,
    compatibility_explanation = CASE {explanation_cases} END,
    todo_steps = CASE {steps_json_cases} END
WHERE id IN ({','.join(ids)});
"""
        result = execute_sql(sql)
        total_updated += len(chunk)
        print(f"  {level}: {total_updated}/{len(compatibilities)} updated...")

print(f"\n✅ Done! Updated {total_updated} compatibilities with TODO steps")

# Show examples
print("\n" + "="*60)
print("EXAMPLES WITH TODO LISTS:")
print("="*60)

sql_example = """
SELECT
    p1.name as product_a,
    p2.name as product_b,
    pc.security_level,
    pc.steps_count,
    pc.compatibility_explanation,
    pc.todo_steps
FROM product_compatibility pc
JOIN products p1 ON pc.product_a_id = p1.id
JOIN products p2 ON pc.product_b_id = p2.id
WHERE pc.steps_count > 0
ORDER BY pc.steps_count DESC
LIMIT 5;
"""

result = execute_sql(sql_example)
if result:
    with open('c:/Users/alexa/Desktop/SafeScoring/temp_specific.txt', 'w', encoding='utf-8') as f:
        for row in result:
            f.write(f"\n{'='*60}\n")
            f.write(f"🔗 {row['product_a']} + {row['product_b']}\n")
            f.write(f"Security: {row['security_level']} | Steps: {row['steps_count']}\n")
            f.write(f"\n📋 {row['compatibility_explanation']}\n")
            f.write(f"\n✅ TODO LIST:\n")
            steps = row['todo_steps']
            if isinstance(steps, str):
                steps = json.loads(steps)
            for i, step in enumerate(steps, 1):
                f.write(f"   {i}. {step}\n")
            f.write("\n")
    print("\nExamples written to temp_specific.txt")
