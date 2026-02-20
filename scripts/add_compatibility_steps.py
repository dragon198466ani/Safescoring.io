#!/usr/bin/env python3
"""
Add steps_count and todo_steps to product_compatibility table
"""
import os
import sys
import json
import requests
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8')
load_dotenv('c:/Users/alexa/Desktop/SafeScoring/.env')
load_dotenv('c:/Users/alexa/Desktop/SafeScoring/web/.env.local')

# Load MCP config for Supabase Management API
with open('c:/Users/alexa/Desktop/SafeScoring/.claude/settings.local.json', 'r', encoding='utf-8') as f:
    config = json.load(f)

# Get access token from MCP server config
mcp_servers = config.get('mcpServers', {})
supabase_config = mcp_servers.get('supabase', {})
args = supabase_config.get('args', [])

# Find the access token in args
access_token = None
for i, arg in enumerate(args):
    if arg == '--access-token' and i + 1 < len(args):
        access_token = args[i + 1]
        break

# Project ID from Supabase URL
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
        print(f"Error: {r.status_code} - {r.text}")
        return None

# Step 1: Add new columns
print("Adding steps_count and todo_steps columns...")

sql_add_columns = """
ALTER TABLE product_compatibility
ADD COLUMN IF NOT EXISTS steps_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS todo_steps JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS compatibility_explanation TEXT;
"""

result = execute_sql(sql_add_columns)
print(f"Columns added: {result}")

# Step 2: Define step templates by type combination
TYPE_STEPS = {
    # HW Cold + SW (Browser/Mobile/Desktop)
    ("HW Cold", "SW Browser"): {
        "steps_count": 4,
        "explanation": "Connect your hardware wallet to your browser wallet for maximum security.",
        "todo_steps": [
            "1. Install the browser extension wallet (MetaMask, Rabby, etc.)",
            "2. In wallet settings, select 'Connect Hardware Wallet'",
            "3. Connect your hardware device via USB/Bluetooth",
            "4. Approve the connection on your hardware device screen"
        ]
    },
    ("HW Cold", "SW Mobile"): {
        "steps_count": 4,
        "explanation": "Pair your hardware wallet with your mobile wallet via Bluetooth.",
        "todo_steps": [
            "1. Enable Bluetooth on your hardware wallet",
            "2. Open mobile wallet and go to Settings > Hardware",
            "3. Scan for available devices and select your hardware wallet",
            "4. Confirm pairing on both devices"
        ]
    },
    ("HW Cold", "SW Desktop"): {
        "steps_count": 3,
        "explanation": "Connect your hardware wallet to desktop software for full control.",
        "todo_steps": [
            "1. Install the hardware wallet's companion app (Ledger Live, Trezor Suite)",
            "2. Connect device via USB cable",
            "3. Unlock device and authorize connection"
        ]
    },

    # CEX + SW (Withdraw flow)
    ("CEX", "SW Browser"): {
        "steps_count": 5,
        "explanation": "Withdraw from exchange to your self-custody browser wallet.",
        "todo_steps": [
            "1. Copy your browser wallet receive address",
            "2. Go to CEX > Withdraw > Select crypto",
            "3. Paste your wallet address (VERIFY NETWORK!)",
            "4. Enter amount and complete 2FA verification",
            "5. Wait for blockchain confirmation (check wallet)"
        ]
    },
    ("CEX", "SW Mobile"): {
        "steps_count": 5,
        "explanation": "Withdraw from exchange to your mobile wallet.",
        "todo_steps": [
            "1. Open mobile wallet, tap Receive, copy address",
            "2. In CEX app: Withdraw > Select asset",
            "3. Paste address or scan QR code",
            "4. Confirm network matches (ERC20, BEP20, etc.)",
            "5. Approve with 2FA and wait for confirmation"
        ]
    },
    ("CEX", "HW Cold"): {
        "steps_count": 6,
        "explanation": "Secure your exchange funds by withdrawing to hardware wallet.",
        "todo_steps": [
            "1. Connect hardware wallet to companion app",
            "2. Generate receive address on hardware device",
            "3. VERIFY address matches on device screen",
            "4. In CEX: Withdraw > Paste hardware wallet address",
            "5. Double-check network selection",
            "6. Complete 2FA and wait for blockchain confirmation"
        ]
    },

    # CEX + Card
    ("CEX", "Card"): {
        "steps_count": 3,
        "explanation": "Link your exchange account to a crypto card for spending.",
        "todo_steps": [
            "1. Order card from exchange (KYC required)",
            "2. Activate card in the exchange app",
            "3. Fund card balance or enable auto-top-up from spot wallet"
        ]
    },

    # CEX + CEX (Transfer between exchanges)
    ("CEX", "CEX"): {
        "steps_count": 4,
        "explanation": "Transfer funds between two exchanges.",
        "todo_steps": [
            "1. Get deposit address from destination CEX",
            "2. On source CEX: Withdraw > Select asset & network",
            "3. Paste destination address (verify network compatibility!)",
            "4. Complete 2FA and wait for both confirmations"
        ]
    },

    # DEX + SW
    ("DEX", "SW Browser"): {
        "steps_count": 4,
        "explanation": "Connect your browser wallet to trade on DEX.",
        "todo_steps": [
            "1. Go to DEX website (Uniswap, SushiSwap, etc.)",
            "2. Click 'Connect Wallet'",
            "3. Select your wallet and approve connection",
            "4. You can now swap tokens directly from your wallet"
        ]
    },
    ("DEX", "SW Mobile"): {
        "steps_count": 4,
        "explanation": "Access DEX through your mobile wallet's browser.",
        "todo_steps": [
            "1. Open mobile wallet's built-in browser (dApp browser)",
            "2. Navigate to DEX URL",
            "3. Wallet auto-connects (or tap Connect)",
            "4. Approve transactions on your phone"
        ]
    },
    ("DEX", "HW Cold"): {
        "steps_count": 5,
        "explanation": "Trade on DEX with hardware wallet security.",
        "todo_steps": [
            "1. Connect hardware wallet to browser extension",
            "2. Go to DEX and connect wallet",
            "3. Select trade pair and amount",
            "4. Review transaction on hardware screen",
            "5. Sign transaction on hardware device"
        ]
    },

    # Lending + SW/CEX
    ("Lending", "SW Browser"): {
        "steps_count": 6,
        "explanation": "Deposit to DeFi lending protocol from your wallet.",
        "todo_steps": [
            "1. Connect wallet to lending protocol (Aave, Compound)",
            "2. Navigate to 'Supply' or 'Deposit'",
            "3. Select asset and amount",
            "4. Approve token spending (first time only)",
            "5. Confirm deposit transaction",
            "6. Receive interest-bearing tokens (aTokens, cTokens)"
        ]
    },
    ("Lending", "CEX"): {
        "steps_count": 6,
        "explanation": "Move from CEX to DeFi lending for better yields.",
        "todo_steps": [
            "1. Withdraw from CEX to your self-custody wallet",
            "2. Ensure you have ETH/gas for transactions",
            "3. Connect wallet to lending protocol",
            "4. Approve token for deposit",
            "5. Deposit desired amount",
            "6. Monitor position and interest accrual"
        ]
    },

    # Staking
    ("Staking", "CEX"): {
        "steps_count": 3,
        "explanation": "Stake directly from your exchange account.",
        "todo_steps": [
            "1. Go to CEX Staking/Earn section",
            "2. Select asset and staking duration",
            "3. Confirm stake amount (may have lock period)"
        ]
    },
    ("Staking", "SW Browser"): {
        "steps_count": 5,
        "explanation": "Stake through a DeFi protocol from your wallet.",
        "todo_steps": [
            "1. Connect wallet to staking protocol",
            "2. Select validator or staking pool",
            "3. Enter stake amount",
            "4. Approve and confirm transaction",
            "5. Receive staking receipt token (if liquid staking)"
        ]
    },

    # Backup + HW/SW
    ("Bkp Physical", "HW Cold"): {
        "steps_count": 5,
        "explanation": "Backup your hardware wallet seed phrase securely.",
        "todo_steps": [
            "1. During HW setup, write down 24-word seed phrase",
            "2. Engrave/stamp words onto metal backup device",
            "3. Verify backup by checking each word",
            "4. Store metal backup in secure location (fireproof safe)",
            "5. NEVER store digitally or photograph seed phrase"
        ]
    },
    ("Bkp Physical", "SW Browser"): {
        "steps_count": 4,
        "explanation": "Backup your browser wallet seed phrase to metal.",
        "todo_steps": [
            "1. Export seed phrase from wallet settings",
            "2. Engrave onto metal backup device",
            "3. Verify backup accuracy",
            "4. Store securely and delete any digital copies"
        ]
    },
    ("Bkp Digital", "SW Browser"): {
        "steps_count": 4,
        "explanation": "Create encrypted digital backup of your wallet.",
        "todo_steps": [
            "1. Export wallet backup file or seed phrase",
            "2. Encrypt using strong password (use password manager)",
            "3. Store encrypted backup in secure cloud or offline",
            "4. Test recovery process with small amount first"
        ]
    },

    # Bridge operations
    ("Bridge", "SW Browser"): {
        "steps_count": 6,
        "explanation": "Bridge tokens between blockchains using your wallet.",
        "todo_steps": [
            "1. Connect wallet to bridge protocol",
            "2. Select source chain and destination chain",
            "3. Choose token and amount to bridge",
            "4. Approve token spending",
            "5. Confirm bridge transaction",
            "6. Wait for confirmation on both chains (may take 10-30min)"
        ]
    },
    ("Bridge", "CEX"): {
        "steps_count": 4,
        "explanation": "Use exchange as bridge by depositing on one chain, withdrawing on another.",
        "todo_steps": [
            "1. Deposit asset to CEX on source chain",
            "2. Wait for deposit confirmation",
            "3. Withdraw same asset on destination chain",
            "4. Verify destination wallet received funds"
        ]
    },

    # Privacy tools
    ("Privacy", "SW Browser"): {
        "steps_count": 5,
        "explanation": "Enhance transaction privacy using privacy protocols.",
        "todo_steps": [
            "1. Connect wallet to privacy protocol",
            "2. Deposit funds into privacy pool",
            "3. Wait recommended time for anonymity set",
            "4. Generate withdrawal proof",
            "5. Withdraw to fresh wallet address"
        ]
    }
}

# Default steps for combinations not specifically defined
DEFAULT_STEPS = {
    "HIGH": {
        "steps_count": 4,
        "explanation": "Secure integration between these products.",
        "todo_steps": [
            "1. Verify both products are properly configured",
            "2. Initiate connection from the primary product",
            "3. Authorize access on the secondary product",
            "4. Test with a small transaction first"
        ]
    },
    "MEDIUM": {
        "steps_count": 5,
        "explanation": "Standard integration requiring attention to detail.",
        "todo_steps": [
            "1. Ensure you have the correct addresses/credentials",
            "2. Check network compatibility between products",
            "3. Initiate transfer or connection",
            "4. Verify transaction details before confirming",
            "5. Wait for confirmation and verify receipt"
        ]
    },
    "LOW": {
        "steps_count": 3,
        "explanation": "Simple integration with minimal steps.",
        "todo_steps": [
            "1. Connect products directly",
            "2. Authorize the connection",
            "3. Ready to use"
        ]
    }
}

print("\nUpdating product compatibilities with steps...")

# Get product compatibilities with type info
SUPABASE_URL = os.getenv('SUPABASE_URL') or os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
SUPABASE_HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

# Get all products with their types
print("Fetching products with types...")
r = requests.get(
    f'{SUPABASE_URL}/rest/v1/products?select=id,name,type_id,product_types(name)',
    headers=SUPABASE_HEADERS
)
products = {p['id']: {
    'name': p['name'],
    'type': p['product_types']['name'] if p.get('product_types') else 'Unknown'
} for p in r.json()}

print(f"Loaded {len(products)} products")

# Get compatibilities
print("Fetching compatibilities...")
r = requests.get(
    f'{SUPABASE_URL}/rest/v1/product_compatibility?select=id,product_a_id,product_b_id,security_level',
    headers=SUPABASE_HEADERS
)
compatibilities = r.json()
print(f"Processing {len(compatibilities)} compatibilities...")

# Batch update
batch_size = 100
updated = 0

for i in range(0, len(compatibilities), batch_size):
    batch = compatibilities[i:i+batch_size]
    updates = []

    for compat in batch:
        prod_a = products.get(compat['product_a_id'], {})
        prod_b = products.get(compat['product_b_id'], {})
        type_a = prod_a.get('type', 'Unknown')
        type_b = prod_b.get('type', 'Unknown')

        # Find matching steps template
        steps_data = None

        # Try both orderings
        if (type_a, type_b) in TYPE_STEPS:
            steps_data = TYPE_STEPS[(type_a, type_b)]
        elif (type_b, type_a) in TYPE_STEPS:
            steps_data = TYPE_STEPS[(type_b, type_a)]
        else:
            # Use default based on security level
            steps_data = DEFAULT_STEPS.get(compat['security_level'], DEFAULT_STEPS['MEDIUM'])

        # Personalize the explanation
        explanation = f"{prod_a.get('name', 'Product A')} + {prod_b.get('name', 'Product B')}: {steps_data['explanation']}"

        updates.append({
            "id": compat['id'],
            "steps_count": steps_data['steps_count'],
            "todo_steps": steps_data['todo_steps'],
            "compatibility_explanation": explanation
        })

    # Update via SQL batch
    for upd in updates:
        sql = f"""
        UPDATE product_compatibility
        SET steps_count = {upd['steps_count']},
            todo_steps = '{json.dumps(upd['todo_steps'])}'::jsonb,
            compatibility_explanation = $${upd['compatibility_explanation']}$$
        WHERE id = {upd['id']};
        """
        execute_sql(sql)
        updated += 1

    print(f"Updated {updated}/{len(compatibilities)} compatibilities...")

print(f"\n✅ Done! Updated {updated} compatibilities with steps and TODO lists")

# Show examples
print("\n" + "="*60)
print("EXAMPLES WITH TODO STEPS:")
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
LIMIT 5;
"""

result = execute_sql(sql_example)
if result:
    with open('temp_specific.txt', 'w', encoding='utf-8') as f:
        for row in result:
            f.write(f"\n{'='*50}\n")
            f.write(f"🔗 {row['product_a']} + {row['product_b']}\n")
            f.write(f"Security: {row['security_level']} | Steps: {row['steps_count']}\n")
            f.write(f"\n📋 {row['compatibility_explanation']}\n")
            f.write(f"\n✅ TODO LIST:\n")
            for step in row['todo_steps']:
                f.write(f"   {step}\n")
    print("Examples written to temp_specific.txt")
