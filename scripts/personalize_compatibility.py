#!/usr/bin/env python3
"""
Personalize product_compatibility with specific product names
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

SUPABASE_URL = 'https://ajdncttomdqojlozxjxu.supabase.co'
SUPABASE_KEY = 'REVOKED_ROTATE_ON_DASHBOARD'
SUPABASE_HEADERS = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'}

def execute_sql(sql):
    r = requests.post(MGMT_API_URL, headers=MGMT_HEADERS, json={'query': sql})
    return r.status_code == 201, r.json() if r.status_code == 201 else r.text

# Templates with placeholders {A} and {B} for product names
TYPE_STEPS_PERSONALIZED = {
    ("Hardware Wallet Cold", "Browser Extension Wallet"): [
        "Install {B} browser extension",
        "In {B} settings, select 'Connect Hardware Wallet'",
        "Connect {A} via USB or Bluetooth",
        "Approve connection on {A} screen"
    ],
    ("Hardware Wallet Cold", "Mobile Wallet"): [
        "Enable Bluetooth on {A}",
        "Open {B} > Settings > Hardware Wallet",
        "Scan and select {A}",
        "Confirm pairing on both devices"
    ],
    ("Hardware Wallet Cold", "Centralized Exchange"): [
        "Open {A} companion app, generate receive address",
        "VERIFY address on {A} screen",
        "On {B}: Withdraw > Paste {A} address",
        "Select correct network on {B}",
        "Complete {B} 2FA verification",
        "Wait for confirmation on {A}"
    ],
    ("Hardware Wallet Cold", "Physical Backup (Metal)"): [
        "During {A} setup, write 24-word seed",
        "Engrave seed onto {B}",
        "Verify each word matches {A}",
        "Store {B} in secure location (NOT with {A})"
    ],
    ("Hardware Wallet Cold", "Decentralized Exchange"): [
        "Connect {A} to browser wallet",
        "Go to {B} and connect wallet",
        "Select trade pair on {B}",
        "Review transaction on {A} screen",
        "Sign on {A}"
    ],

    ("Centralized Exchange", "Browser Extension Wallet"): [
        "Open {B}, copy your receive address",
        "On {A}: Withdraw > Select crypto",
        "Paste {B} address (VERIFY NETWORK!)",
        "Complete {A} 2FA",
        "Wait for blockchain confirmation in {B}"
    ],
    ("Centralized Exchange", "Mobile Wallet"): [
        "In {B}: tap Receive, copy address",
        "On {A}: Withdraw > Select asset",
        "Paste {B} address or scan QR",
        "Confirm network matches on {A}",
        "Wait for confirmation in {B}"
    ],
    ("Centralized Exchange", "Hardware Wallet Cold"): [
        "Open {B} companion app, generate address",
        "VERIFY address on {B} screen",
        "On {A}: Withdraw > Paste {B} address",
        "Select correct network on {A}",
        "Complete {A} 2FA",
        "Confirm receipt on {B}"
    ],
    ("Centralized Exchange", "Crypto Card (Custodial)"): [
        "Order {B} from {A} (KYC required)",
        "Activate {B} in {A} app",
        "Fund {B} from {A} spot wallet"
    ],
    ("Centralized Exchange", "Centralized Exchange"): [
        "On {B}: get deposit address",
        "On {A}: Withdraw > Select asset",
        "Paste {B} address (verify network!)",
        "Complete 2FA on {A} and {B}"
    ],
    ("Centralized Exchange", "Decentralized Exchange"): [
        "Withdraw from {A} to self-custody wallet",
        "Wait for blockchain confirmation",
        "Connect wallet to {B}",
        "Approve token on {B} if needed",
        "Execute swap on {B}",
        "Verify tokens received"
    ],

    ("Physical Backup (Metal)", "Hardware Wallet Cold"): [
        "During {B} setup, write 24-word seed",
        "Engrave seed onto {A}",
        "Verify each word matches {B}",
        "Store {A} separately from {B}"
    ],
    ("Physical Backup (Metal)", "Browser Extension Wallet"): [
        "In {B}: Settings > Export seed phrase",
        "Engrave seed onto {A}",
        "Verify each word is correct",
        "Store {A} in secure location"
    ],
    ("Physical Backup (Metal)", "Mobile Wallet"): [
        "In {B}: Settings > Backup > Show seed",
        "Engrave seed onto {A}",
        "Verify each word",
        "Store {A} in fireproof safe"
    ],
    ("Physical Backup (Metal)", "Physical Backup (Metal)"): [
        "Choose: duplicate entire seed OR split (1-12 / 13-24)",
        "Engrave on {A} and {B}",
        "Store {A} and {B} in DIFFERENT locations"
    ],
    ("Physical Backup (Metal)", "Centralized Exchange"): [
        "Record {B} 2FA recovery codes",
        "Note {B} backup email/phone",
        "Engrave on {A}",
        "Store {A} securely"
    ],

    ("Crypto Card (Custodial)", "Mobile Wallet"): [
        "Add {A} to {B} (Apple/Google Pay)",
        "Set spending limits on {A}",
        "Ready to tap-to-pay with {A}"
    ],
    ("Crypto Card (Custodial)", "Centralized Exchange"): [
        "Order {A} from {B}",
        "Activate {A} in {B} app",
        "Fund {A} from {B} balance"
    ],
    ("Crypto Card (Custodial)", "Hardware Wallet Cold"): [
        "Generate address in {A} provider app",
        "On {B}: create transaction to {A}",
        "Sign on {B} device",
        "Wait for {A} balance update"
    ],

    ("Mobile Wallet", "Browser Extension Wallet"): [
        "In {A}: Settings > Export seed",
        "In {B}: Import wallet > Enter seed",
        "Both {A} and {B} now share addresses",
        "Use {A} on mobile, {B} on desktop"
    ],
    ("Mobile Wallet", "Hardware Wallet Cold"): [
        "Enable Bluetooth on {B}",
        "In {A}: Settings > Connect Hardware",
        "Select {B} from device list",
        "Confirm pairing on {B} screen"
    ],
    ("Mobile Wallet", "Centralized Exchange"): [
        "In {A}: Receive > Copy address",
        "On {B}: Withdraw > Paste address",
        "Verify network on {B}",
        "Complete {B} 2FA",
        "Wait for confirmation in {A}"
    ],

    ("Decentralized Exchange", "Browser Extension Wallet"): [
        "Open {A} website",
        "Click Connect Wallet > Select {B}",
        "Approve connection in {B}",
        "Ready to trade on {A}"
    ],
    ("Decentralized Exchange", "Mobile Wallet"): [
        "In {B}: open built-in browser",
        "Navigate to {A}",
        "{B} auto-connects to {A}",
        "Approve trades in {B}"
    ],
    ("Decentralized Exchange", "Hardware Wallet Cold"): [
        "Connect {B} to browser wallet",
        "Open {A} and connect",
        "Select trade on {A}",
        "Review on {B} screen",
        "Sign on {B}"
    ],

    ("Staking", "Browser Extension Wallet"): [
        "Connect {B} to {A}",
        "Select validator/pool on {A}",
        "Enter stake amount",
        "Approve in {B}",
        "Receive staking receipt"
    ],
    ("Staking", "Hardware Wallet Cold"): [
        "Connect {B} to browser wallet",
        "Open {A} protocol",
        "Select validator on {A}",
        "Review stake on {B}",
        "Sign on {B} device"
    ],
    ("Staking", "Centralized Exchange"): [
        "On {B}: go to Staking/Earn",
        "Select {A} asset and duration",
        "Confirm stake on {B}"
    ],
}

# WHY templates personalized
WHY_PERSONALIZED = {
    ("Hardware Wallet Cold", "Browser Extension Wallet"): "{A} signs transactions securely while {B} provides dApp access. Best security + usability.",
    ("Hardware Wallet Cold", "Mobile Wallet"): "Control crypto on-the-go with {B}, secured by {A} hardware signing.",
    ("Hardware Wallet Cold", "Centralized Exchange"): "Buy on {B}, secure long-term on {A}. Not your keys = not your coins.",
    ("Hardware Wallet Cold", "Physical Backup (Metal)"): "{A} is only as safe as its backup. {B} survives fire, flood, corrosion.",
    ("Hardware Wallet Cold", "Decentralized Exchange"): "Trade on {B} with {A} security. Keys never exposed to internet.",

    ("Centralized Exchange", "Browser Extension Wallet"): "Move from {A} to self-custody on {B}. Take control of your keys.",
    ("Centralized Exchange", "Mobile Wallet"): "Buy on {A}, use daily with {B}. Best of both worlds.",
    ("Centralized Exchange", "Hardware Wallet Cold"): "{A} for trading, {B} for secure storage. Standard security practice.",
    ("Centralized Exchange", "Crypto Card (Custodial)"): "Spend {A} balance with {B}. No need to sell crypto.",
    ("Centralized Exchange", "Centralized Exchange"): "Arbitrage between {A} and {B}, or access different pairs.",
    ("Centralized Exchange", "Decentralized Exchange"): "Access DeFi on {B} with funds from {A}. More trading options.",

    ("Physical Backup (Metal)", "Hardware Wallet Cold"): "{A} is insurance for {B}. Disaster recovery guaranteed.",
    ("Physical Backup (Metal)", "Browser Extension Wallet"): "{B} is vulnerable online. {A} ensures you can always recover.",
    ("Physical Backup (Metal)", "Mobile Wallet"): "Phones get lost/stolen. {A} guarantees {B} recovery.",
    ("Physical Backup (Metal)", "Physical Backup (Metal)"): "Geographic redundancy. If {A} location compromised, {B} remains safe.",
    ("Physical Backup (Metal)", "Centralized Exchange"): "Backup {B} 2FA/recovery on {A}. Never lose account access.",

    ("Crypto Card (Custodial)", "Mobile Wallet"): "Tap-to-pay with {A} via {B}. Spend crypto like fiat.",
    ("Crypto Card (Custodial)", "Centralized Exchange"): "{A} spends directly from {B} balance. Seamless.",

    ("Mobile Wallet", "Browser Extension Wallet"): "Same wallet everywhere. {A} for mobile, {B} for desktop dApps.",
    ("Mobile Wallet", "Hardware Wallet Cold"): "{A} convenience + {B} security. Sign safely via Bluetooth.",
    ("Mobile Wallet", "Centralized Exchange"): "Quick transfers between {A} and {B}. Flexibility when needed.",

    ("Decentralized Exchange", "Browser Extension Wallet"): "Direct {B}-to-{A} trading. No intermediary, full control.",
    ("Decentralized Exchange", "Mobile Wallet"): "Trade on {A} anywhere with {B}. DeFi in your pocket.",
    ("Decentralized Exchange", "Hardware Wallet Cold"): "{A} access with {B} security. Hardware signs every swap.",

    ("Staking", "Browser Extension Wallet"): "Earn {A} rewards from {B}. Passive income on your crypto.",
    ("Staking", "Hardware Wallet Cold"): "Stake on {A} with {B} security. Maximum protection + yield.",
    ("Staking", "Centralized Exchange"): "Easy {A} via {B}. No technical setup required.",
}

# SAFE warnings personalized
SAFE_WARNINGS_PERSONALIZED = {
    ("Hardware Wallet Cold", "Browser Extension Wallet"): {
        "s": "ALWAYS verify on {A} screen. {B} can be compromised, {A} cannot.",
        "a": "{A} protects against {B} browser attacks. Keep {A} firmware updated.",
        "f": "{A} + {B} is standard combo. Wide dApp compatibility.",
        "e": "Adds {A} signing step. 10-30 sec per transaction."
    },
    ("Hardware Wallet Cold", "Centralized Exchange"): {
        "s": "VERIFY {A} address before sending from {B}. Address poisoning is real.",
        "a": "If {B} is hacked, funds on {A} are safe. Never keep all on {B}.",
        "f": "{B} supports {A} withdrawal. Check network fees first.",
        "e": "6 steps but maximum security. Worth it for large amounts."
    },
    ("Hardware Wallet Cold", "Physical Backup (Metal)"): {
        "s": "Store {B} separately from {A}. If thief gets both, game over.",
        "a": "{B} survives disasters that destroy {A}. Fire/flood insurance.",
        "f": "{A} uses BIP39. {B} stores standard 24 words.",
        "e": "One-time setup. {B} needs no maintenance."
    },
    ("Centralized Exchange", "Browser Extension Wallet"): {
        "s": "Whitelist {B} address on {A} to prevent phishing attacks.",
        "a": "If {A} freezes account, funds in {B} are safe. Diversify.",
        "f": "{A} and {B} must support same network. Check before sending.",
        "e": "5 steps. Wait time depends on {A} processing + blockchain."
    },
    ("Physical Backup (Metal)", "Physical Backup (Metal)"): {
        "s": "NEVER store {A} and {B} together. Different locations = safety.",
        "a": "Both {A} and {B} survive fire/flood. Test readability yearly.",
        "f": "Use same BIP39 on {A} and {B}. Verify word-by-word.",
        "e": "One-time setup. Create {A} and {B}, then forget."
    },
    ("Crypto Card (Custodial)", "Mobile Wallet"): {
        "s": "Set {A} daily limit. If {B} phone stolen, loss is capped.",
        "a": "{A} provider can freeze anytime. Have backup payment method.",
        "f": "Enable {A} notifications in {B}. Dispute charges within 24h.",
        "e": "3 steps. Instant setup. Tap-to-pay ready."
    },
}

print("Fetching all compatibilities with product info...")

# Get all compatibilities with product names and types
offset = 0
all_data = []
while True:
    sql = f"""
    SELECT
        pc.id,
        p1.name as product_a,
        pt1.name as type_a,
        p2.name as product_b,
        pt2.name as type_b
    FROM product_compatibility pc
    JOIN products p1 ON pc.product_a_id = p1.id
    JOIN products p2 ON pc.product_b_id = p2.id
    LEFT JOIN product_types pt1 ON p1.type_id = pt1.id
    LEFT JOIN product_types pt2 ON p2.type_id = pt2.id
    ORDER BY pc.id
    LIMIT 1000 OFFSET {offset};
    """
    ok, result = execute_sql(sql)
    if not ok or not result:
        break
    all_data.extend(result)
    offset += 1000
    print(f"  Loaded {len(all_data)}...")

print(f"Total: {len(all_data)} compatibilities to personalize")

# Process in batches
batch_size = 100
updated = 0

for i in range(0, len(all_data), batch_size):
    batch = all_data[i:i+batch_size]

    for row in batch:
        id_ = row['id']
        prod_a = row['product_a']
        prod_b = row['product_b']
        type_a = row['type_a'] or 'Unknown'
        type_b = row['type_b'] or 'Unknown'

        # Find matching template
        key = (type_a, type_b)
        key_rev = (type_b, type_a)

        steps_template = TYPE_STEPS_PERSONALIZED.get(key) or TYPE_STEPS_PERSONALIZED.get(key_rev)
        why_template = WHY_PERSONALIZED.get(key) or WHY_PERSONALIZED.get(key_rev)
        safe_template = SAFE_WARNINGS_PERSONALIZED.get(key) or SAFE_WARNINGS_PERSONALIZED.get(key_rev)

        if steps_template:
            # Personalize steps
            steps = [s.replace('{A}', prod_a).replace('{B}', prod_b) for s in steps_template]
            steps_json = json.dumps(steps).replace("'", "''")

            # Personalize why
            why = why_template.replace('{A}', prod_a).replace('{B}', prod_b) if why_template else None

            # Personalize SAFE warnings
            safe_s = safe_template['s'].replace('{A}', prod_a).replace('{B}', prod_b) if safe_template else None
            safe_a = safe_template['a'].replace('{A}', prod_a).replace('{B}', prod_b) if safe_template else None
            safe_f = safe_template['f'].replace('{A}', prod_a).replace('{B}', prod_b) if safe_template else None
            safe_e = safe_template['e'].replace('{A}', prod_a).replace('{B}', prod_b) if safe_template else None

            # Build update
            updates = [f"todo_steps = '{steps_json}'::jsonb"]
            updates.append(f"steps_count = {len(steps)}")
            updates.append(f"compatibility_explanation = $${prod_a} + {prod_b}: Use together for enhanced security and functionality.$$")

            if why:
                updates.append(f"why_use_together = $${why}$$")
            if safe_s:
                updates.append(f"safe_warning_s = $${safe_s}$$")
            if safe_a:
                updates.append(f"safe_warning_a = $${safe_a}$$")
            if safe_f:
                updates.append(f"safe_warning_f = $${safe_f}$$")
            if safe_e:
                updates.append(f"safe_warning_e = $${safe_e}$$")

            sql = f"UPDATE product_compatibility SET {', '.join(updates)} WHERE id = {id_};"
            execute_sql(sql)
            updated += 1

    print(f"  Updated {updated}/{len(all_data)}...")

print(f"\nDone! Personalized {updated} compatibilities")

# Show examples
print("\n" + "="*60)
print("EXAMPLES:")
sql = """
SELECT p1.name as a, p2.name as b, pc.why_use_together, pc.todo_steps, pc.safe_warning_s
FROM product_compatibility pc
JOIN products p1 ON pc.product_a_id = p1.id
JOIN products p2 ON pc.product_b_id = p2.id
WHERE pc.why_use_together LIKE '%Ledger%' OR pc.why_use_together LIKE '%Binance%'
LIMIT 2;
"""
ok, result = execute_sql(sql)
if ok and result:
    for r in result:
        print(f"\n{r['a']} + {r['b']}")
        print(f"WHY: {r['why_use_together']}")
        steps = r['todo_steps']
        if isinstance(steps, str):
            steps = json.loads(steps)
        print("STEPS:")
        for s in steps:
            print(f"  - {s}")
        print(f"SAFE S: {r['safe_warning_s']}")
