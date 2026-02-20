#!/usr/bin/env python3
"""
Add why_use_together column to product_compatibility
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

# Add column
print("Adding why_use_together column...")
execute_sql("ALTER TABLE product_compatibility ADD COLUMN IF NOT EXISTS why_use_together TEXT;")
print("Column added!")

# WHY templates by type pair
WHY_TEMPLATES = {
    ("Hardware Wallet Cold", "Browser Extension Wallet"): "Sign transactions with hardware security while enjoying browser dApp compatibility. Best of both worlds.",
    ("Hardware Wallet Cold", "Mobile Wallet"): "Control your crypto on-the-go with mobile convenience, backed by hardware-level security.",
    ("Hardware Wallet Cold", "Centralized Exchange"): "Keep long-term holdings secure on hardware. Only use CEX for trading, then withdraw.",
    ("Hardware Wallet Cold", "Physical Backup (Metal)"): "Your hardware wallet is only as safe as your seed backup. Metal survives fire/flood.",
    ("Hardware Wallet Cold", "Decentralized Exchange"): "Trade on DEX without exposing private keys. Hardware signs every transaction.",
    ("Hardware Wallet Cold", "DeFi Lending"): "Earn yield on DeFi while keeping keys secure on hardware. Never expose seed to internet.",
    ("Hardware Wallet Cold", "Staking"): "Stake and earn rewards with hardware-level security. Keys never leave device.",

    ("Centralized Exchange", "Browser Extension Wallet"): "Self-custody your crypto after buying on CEX. Not your keys, not your coins.",
    ("Centralized Exchange", "Mobile Wallet"): "Buy on CEX, withdraw to mobile wallet for daily use and dApp access.",
    ("Centralized Exchange", "Hardware Wallet Cold"): "CEX for buying/selling, hardware for long-term secure storage.",
    ("Centralized Exchange", "Crypto Card (Custodial)"): "Spend crypto directly without selling. Card links to exchange balance.",
    ("Centralized Exchange", "Centralized Exchange"): "Arbitrage opportunities or access different trading pairs/features.",
    ("Centralized Exchange", "Decentralized Exchange"): "Access DeFi tokens not listed on CEX. More trading options.",
    ("Centralized Exchange", "DeFi Lending"): "Higher yields in DeFi vs CEX earn programs. You control your funds.",
    ("Centralized Exchange", "Physical Backup (Metal)"): "Protect CEX recovery codes. Account recovery if locked out.",
    ("Centralized Exchange", "Staking"): "Easy staking without technical setup. CEX handles validator selection.",

    ("Physical Backup (Metal)", "Hardware Wallet Cold"): "Metal backup is insurance for your hardware wallet. Survives disasters.",
    ("Physical Backup (Metal)", "Browser Extension Wallet"): "Browser wallets are vulnerable. Metal backup ensures recovery.",
    ("Physical Backup (Metal)", "Mobile Wallet"): "Phones get lost/stolen. Metal backup is your recovery guarantee.",
    ("Physical Backup (Metal)", "Physical Backup (Metal)"): "Geographic redundancy. If one location is compromised, other remains safe.",
    ("Physical Backup (Metal)", "Centralized Exchange"): "Backup 2FA codes and recovery info. Never lose access to your account.",

    ("Mobile Wallet", "Browser Extension Wallet"): "Same wallet on all devices. Mobile for daily, browser for dApps.",
    ("Mobile Wallet", "Hardware Wallet Cold"): "Mobile convenience with hardware security via Bluetooth signing.",
    ("Mobile Wallet", "Centralized Exchange"): "Quick transfers between self-custody and exchange for trading.",
    ("Mobile Wallet", "Physical Backup (Metal)"): "Phones get lost/stolen. Metal backup is your recovery guarantee.",

    ("Browser Extension Wallet", "Hardware Wallet Cold"): "Sign transactions with hardware security while enjoying browser dApp compatibility.",
    ("Browser Extension Wallet", "Physical Backup (Metal)"): "Browser wallets are vulnerable. Metal backup ensures recovery.",
    ("Browser Extension Wallet", "Centralized Exchange"): "Self-custody your crypto after buying on CEX. Not your keys, not your coins.",
    ("Browser Extension Wallet", "Mobile Wallet"): "Same wallet on all devices. Mobile for daily, browser for dApps.",

    ("Decentralized Exchange", "Browser Extension Wallet"): "Direct wallet-to-DEX trading. No intermediary, full control.",
    ("Decentralized Exchange", "Mobile Wallet"): "Trade anywhere from mobile. Access to all DeFi from your phone.",
    ("Decentralized Exchange", "Hardware Wallet Cold"): "DEX access with maximum security. Hardware signs every swap.",
    ("Decentralized Exchange", "DeFi Lending"): "Swap into yield-bearing tokens, then deposit to lending for more yield.",
    ("Decentralized Exchange", "Centralized Exchange"): "Access DeFi tokens not listed on CEX. More trading options.",

    ("DeFi Lending", "Browser Extension Wallet"): "Earn passive yield on idle crypto. Better rates than banks.",
    ("DeFi Lending", "Centralized Exchange"): "Higher yields than CEX earn. You maintain custody of funds.",
    ("DeFi Lending", "Staking"): "Double yield strategy: lend to get receipt tokens, stake those for more.",
    ("DeFi Lending", "Hardware Wallet Cold"): "Earn yield on DeFi while keeping keys secure on hardware.",

    ("Crypto Card (Custodial)", "Mobile Wallet"): "Tap-to-pay with crypto. Card in Apple/Google Pay.",
    ("Crypto Card (Custodial)", "Centralized Exchange"): "Spend directly from exchange balance. No conversion needed.",
    ("Crypto Card (Custodial)", "Hardware Wallet Cold"): "Top up card from cold storage when needed for spending.",
    ("Crypto Card (Custodial)", "Physical Backup (Metal)"): "Backup card PIN and recovery info securely.",
    ("Crypto Card (Custodial)", "Browser Extension Wallet"): "Fund card from browser wallet for seamless spending.",

    ("Staking", "Browser Extension Wallet"): "Earn staking rewards directly from your wallet. Passive income.",
    ("Staking", "Hardware Wallet Cold"): "Stake with maximum security. Hardware signs delegation.",
    ("Staking", "Centralized Exchange"): "Easy staking without running validators. CEX handles complexity.",
    ("Staking", "DeFi Lending"): "Double yield strategy: stake and lend for maximum returns.",
}

print(f"\nUpdating {len(WHY_TEMPLATES)} type combinations...")
count = 0

for (type_a, type_b), why in WHY_TEMPLATES.items():
    why_escaped = why.replace("'", "''")
    sql = f"""
    UPDATE product_compatibility pc
    SET why_use_together = $${why}$$
    FROM products p1, products p2, product_types pt1, product_types pt2
    WHERE pc.product_a_id = p1.id
      AND pc.product_b_id = p2.id
      AND p1.type_id = pt1.id
      AND p2.type_id = pt2.id
      AND ((pt1.name = $${type_a}$$ AND pt2.name = $${type_b}$$)
        OR (pt1.name = $${type_b}$$ AND pt2.name = $${type_a}$$));
    """
    if execute_sql(sql):
        count += 1

print(f"Updated {count} type combinations")

# Show examples
print("\nExamples:")
sql = """
SELECT p1.name as product_a, p2.name as product_b,
       pc.why_use_together, pc.steps_count
FROM product_compatibility pc
JOIN products p1 ON pc.product_a_id = p1.id
JOIN products p2 ON pc.product_b_id = p2.id
WHERE pc.why_use_together IS NOT NULL
ORDER BY RANDOM()
LIMIT 3;
"""

r = requests.post(MGMT_API_URL, headers=MGMT_HEADERS, json={'query': sql})
if r.status_code == 201 and r.json():
    for row in r.json():
        print("="*60)
        print(f"{row['product_a']} + {row['product_b']}")
        print(f"WHY: {row['why_use_together']}")
        print(f"Steps: {row['steps_count']}")
