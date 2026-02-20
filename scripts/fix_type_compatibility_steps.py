#!/usr/bin/env python3
"""Fix missing compatibility_steps in type_compatibility (all 3081 records)."""

import requests
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))
from core.config import CONFIG

TOKEN = 'sbp_e4b8b78cd32053ff0436cea95ec5adb21a9db936'
PROJECT_REF = 'ajdncttomdqojlozxjxu'

SUPABASE_URL = CONFIG.get('SUPABASE_URL', 'https://ajdncttomdqojlozxjxu.supabase.co')
SERVICE_ROLE_KEY = CONFIG.get('SUPABASE_SERVICE_ROLE_KEY', '')
HEADERS = {
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': f'Bearer {SERVICE_ROLE_KEY}',
    'Content-Type': 'application/json',
}

def execute_sql(query):
    r = requests.post(
        f'https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query',
        headers={'Authorization': f'Bearer {TOKEN}', 'Content-Type': 'application/json'},
        json={'query': query}
    )
    return r.status_code == 201, r.text

def format_pg_array(arr):
    """Format Python list as PostgreSQL array literal."""
    if not arr:
        return "ARRAY[]::TEXT[]"
    escaped = [s.replace("'", "''") for s in arr]
    return "ARRAY[" + ",".join([f"'{s}'" for s in escaped]) + "]"

# Compatibility steps mapping (same as update_specific_warnings.py)
COMPATIBILITY_STEPS = {
    # Hardware Wallet combinations
    ('HW Cold', 'SW Browser'): [
        'Install the official browser extension from your hardware wallet manufacturer.',
        'Connect your hardware wallet via USB and verify the connection on the device screen.',
        'Always confirm transaction details on the hardware wallet screen before signing.'
    ],
    ('HW Cold', 'SW Mobile'): [
        'Enable Bluetooth on your hardware wallet if required for mobile connection.',
        'Pair your hardware wallet with the official mobile app following security prompts.',
        'Verify each transaction on the hardware device before approving on mobile.'
    ],
    ('HW Cold', 'SW Desktop'): [
        'Download and install the official desktop application from the manufacturer.',
        'Connect your hardware wallet via USB and unlock it with your PIN.',
        'Use the desktop app to manage accounts while signing transactions on the device.'
    ],
    ('HW Cold', 'DEX'): [
        'Connect your hardware wallet to a compatible browser extension first.',
        'Navigate to the DEX and connect your wallet, approving the connection on device.',
        'Review and confirm each swap transaction on your hardware wallet screen.'
    ],
    ('HW Cold', 'Lending'): [
        'Connect your hardware wallet to access the lending protocol interface.',
        'Approve token spending limits on your hardware device before depositing.',
        'Monitor your health factor and confirm any collateral adjustments on device.'
    ],
    ('HW Cold', 'Liq Staking'): [
        'Access the liquid staking protocol through your hardware wallet connection.',
        'Confirm the staking transaction and amount on your hardware device.',
        'Receive LST tokens in your hardware wallet for use in other DeFi protocols.'
    ],
    ('HW Cold', 'Bridges'): [
        'Connect your hardware wallet to the bridge interface.',
        'Approve the bridge transaction on your hardware device after verifying details.',
        'Wait for confirmations on both chains before considering the transfer complete.'
    ],
    ('HW Cold', 'CEX'): [
        'Generate a fresh deposit address from your CEX account for the specific asset.',
        'Initiate the transfer from your hardware wallet, verifying the address on device.',
        'Wait for network confirmations before the funds appear in your exchange account.'
    ],
    ('HW Cold', 'Card'): [
        'Send crypto from your hardware wallet to your card provider address.',
        'Confirm the transfer on your hardware device screen.',
        'Wait for the funds to be credited to your card balance.'
    ],
    ('HW Cold', 'Yield'): [
        'Connect hardware wallet to the yield protocol interface.',
        'Approve token access and deposit transaction on device.',
        'Regularly claim or compound rewards using your hardware wallet.'
    ],

    # Software Wallet combinations
    ('SW Browser', 'SW Mobile'): [
        'Import your seed phrase into the mobile wallet from the browser extension.',
        'Verify that both wallets show the same addresses and balances.',
        'Use whichever wallet is more convenient while keeping both updated.'
    ],
    ('SW Browser', 'DEX'): [
        'Navigate to the DEX website and click connect wallet.',
        'Approve the connection request in your browser extension.',
        'Confirm swaps and approvals directly in the extension popup.'
    ],
    ('SW Browser', 'Lending'): [
        'Connect your browser wallet to the lending protocol.',
        'Approve token spending and deposit your collateral.',
        'Monitor your position regularly through the protocol dashboard.'
    ],
    ('SW Browser', 'CEX'): [
        'Copy your exchange deposit address for the specific network.',
        'Paste the address in your browser wallet and verify it matches.',
        'Confirm the transaction and wait for exchange confirmation.'
    ],
    ('SW Browser', 'Bridges'): [
        'Connect your browser wallet to the bridge interface.',
        'Select source and destination chains, then approve the transaction.',
        'Switch networks in your wallet to claim tokens on the destination chain.'
    ],
    ('SW Mobile', 'DEX'): [
        'Scan the WalletConnect QR code from the DEX website.',
        'Approve the connection in your mobile wallet app.',
        'Confirm swap transactions when prompted on your mobile device.'
    ],
    ('SW Mobile', 'Card'): [
        'Link your mobile wallet to your crypto card provider.',
        'Transfer funds from your wallet to the card account.',
        'Use the card for purchases while managing funds from the mobile app.'
    ],
    ('SW Mobile', 'CEX'): [
        'Open the exchange app and navigate to the deposit section.',
        'Scan the deposit QR code with your mobile wallet.',
        'Confirm the transfer and wait for the funds to arrive.'
    ],

    # CEX combinations
    ('CEX', 'CEX'): [
        'Withdraw from the first exchange to a whitelisted address.',
        'Deposit to the second exchange using the correct network.',
        'Wait for both exchanges to confirm the transfer.'
    ],
    ('CEX', 'DEX'): [
        'Withdraw funds from CEX to your self-custody wallet.',
        'Connect your wallet to the DEX and perform your swap.',
        'Optionally deposit back to CEX if needed.'
    ],
    ('CEX', 'Card'): [
        'Link your exchange account to the card if same provider.',
        'Transfer funds to card balance or spend directly.',
        'Monitor transactions through the exchange app.'
    ],
    ('CEX', 'Lending'): [
        'Withdraw from exchange to your DeFi wallet.',
        'Connect to the lending protocol and deposit collateral.',
        'Track positions separately from exchange holdings.'
    ],
    ('CEX', 'Bridges'): [
        'Check if CEX supports direct withdrawal to your target chain first.',
        'If not, withdraw to wallet and use bridge.',
        'Consider CEX native multi-chain support before bridging.'
    ],

    # DeFi combinations
    ('DEX', 'DEX'): [
        'Use a DEX aggregator to find the best rates across DEXs.',
        'Approve tokens once for the aggregator contract.',
        'Execute the swap through the aggregator interface.'
    ],
    ('DEX', 'Lending'): [
        'Swap tokens on DEX if needed for collateral.',
        'Deposit swapped tokens to lending protocol.',
        'Manage both positions through your wallet.'
    ],
    ('DEX', 'Yield'): [
        'Swap to get the required token pair for yield farming.',
        'Add liquidity to receive LP tokens.',
        'Stake LP tokens in the yield farm.'
    ],
    ('DEX', 'Bridges'): [
        'Bridge tokens to the destination chain first.',
        'Connect to DEX on the destination chain.',
        'Swap bridged tokens as needed.'
    ],
    ('Lending', 'Lending'): [
        'Be extremely careful when using multiple lending positions.',
        'Monitor health factors on both protocols separately.',
        'Never use borrowed funds as collateral for another loan.'
    ],
    ('Lending', 'Liq Staking'): [
        'Stake ETH to receive LST tokens.',
        'Deposit LST as collateral in lending protocol.',
        'Borrow against your staked position.'
    ],
    ('Lending', 'Yield'): [
        'Deposit collateral and borrow desired tokens.',
        'Use borrowed tokens in yield farms.',
        'Ensure yield exceeds borrow rate after all costs.'
    ],
    ('Lending', 'Stablecoin'): [
        'Deposit collateral to the lending protocol.',
        'Borrow stablecoins against your collateral.',
        'Use stablecoins while monitoring health factor.'
    ],

    # Liquid Staking combinations
    ('Liq Staking', 'Liq Staking'): [
        'Stake your LST tokens in a restaking protocol.',
        'Understand the compounded slashing risks.',
        'Track withdrawal queues for both layers.'
    ],
    ('Liq Staking', 'DEX'): [
        'Use specialized pools like Curve for LST swaps.',
        'Check liquidity depth before large trades.',
        'Compare pool rates with native unstaking.'
    ],
    ('Liq Staking', 'Yield'): [
        'Deposit LST tokens into compatible yield pools.',
        'Track both staking and farming rewards.',
        'Understand the layered risks involved.'
    ],

    # Bridges combinations
    ('Bridges', 'Bridges'): [
        'Avoid chaining multiple bridges when possible.',
        'Look for direct routes to your destination chain.',
        'Accept higher fees for single-hop safety.'
    ],
    ('Bridges', 'Lending'): [
        'Bridge tokens to the destination chain.',
        'Verify bridged tokens are accepted as collateral.',
        'Ensure you have gas on the destination chain.'
    ],

    # Backup combinations
    ('Bkp Physical', 'HW Cold'): [
        'Store your metal backup in a separate location from your device.',
        'Test recovery with a fresh device before storing large amounts.',
        'Consider geographic distribution for disaster protection.'
    ],
    ('Bkp Physical', 'Bkp Physical'): [
        'Create multiple backups using different methods.',
        'Store each backup in a different secure location.',
        'Consider Shamir splitting for enhanced security.'
    ],
    ('Bkp Digital', 'HW Cold'): [
        'Encrypt your digital backup with a strong password.',
        'Store on offline USB, never on cloud services.',
        'Test decryption and recovery before relying on it.'
    ],

    # Stablecoin combinations
    ('Stablecoin', 'Stablecoin'): [
        'Use Curve pools for minimal slippage between stablecoins.',
        'Verify contract addresses before swapping.',
        'Monitor for any depeg warnings.'
    ],
    ('Stablecoin', 'DEX'): [
        'Check stablecoin contract address matches official one.',
        'Use specialized stable pools for best rates.',
        'Be cautious of off-peg stablecoins.'
    ],
    ('Stablecoin', 'Lending'): [
        'Deposit stablecoins as collateral or supply.',
        'Borrow against stable collateral for lower risk.',
        'Monitor rates which can spike during volatility.'
    ],
    ('Stablecoin', 'Yield'): [
        'Deposit stablecoins to earn yield.',
        'Use stable-stable pairs to minimize IL.',
        'Check if rewards are paid in stable or volatile tokens.'
    ],

    # Card combinations
    ('Card', 'SW Mobile'): [
        'Send crypto from mobile wallet to card address.',
        'Wait for confirmation and card balance update.',
        'Use card for purchases like any debit card.'
    ],
    ('Card', 'CEX'): [
        'Card may spend directly from exchange balance.',
        'No manual top-up needed if integrated.',
        'Monitor exchange balance for spending.'
    ],

    # CeFi combinations
    ('Crypto Bank', 'CEX'): [
        'Initiate transfer from one platform to the other.',
        'Verify network compatibility.',
        'Wait for processing which may take days.'
    ],
    ('Crypto Bank', 'Card'): [
        'Use integrated card with crypto bank account.',
        'Spend directly from your bank balance.',
        'Track transactions in the bank app.'
    ],
    ('CeFi Lending', 'CEX'): [
        'Transfer from exchange to CeFi lending platform.',
        'Enable earn or lending feature.',
        'Understand counterparty risks involved.'
    ],

    # Custody / MultiSig combinations
    ('Custody', 'HW Cold'): [
        'Custodian holds separate keys from your hardware wallet.',
        'Request withdrawals through custodian interface.',
        'Test withdrawal process before storing large amounts.'
    ],
    ('MultiSig', 'HW Cold'): [
        'Each signer uses their own hardware wallet.',
        'Create transaction proposal and share with signers.',
        'Collect required signatures and execute.'
    ],
    ('MultiSig', 'DEX'): [
        'Propose DEX transaction through Safe or similar.',
        'Each signer reviews and signs on their device.',
        'Execute once threshold is reached.'
    ],

    # MPC combinations
    ('MPC Wallet', 'DEX'): [
        'Connect MPC wallet like a regular wallet.',
        'Sign transactions using MPC provider interface.',
        'Confirm actions via biometrics or password.'
    ],
    ('MPC Wallet', 'HW Cold'): [
        'Use MPC for daily transactions needing convenience.',
        'Keep larger amounts on hardware wallet.',
        'Transfer between based on security needs.'
    ],

    # DEX Aggregator combinations
    ('DEX Agg', 'DEX'): [
        'Aggregator automatically routes through best DEXs.',
        'Approve tokens for the aggregator contract.',
        'Execute swap with optimized routing.'
    ],
    ('DEX Agg', 'SW Browser'): [
        'Connect browser wallet to aggregator.',
        'Select tokens and amounts for swap.',
        'Confirm transaction in wallet extension.'
    ],

    # Perps/Options combinations
    ('Perps', 'SW Browser'): [
        'Connect wallet to perps DEX.',
        'Deposit margin and set leverage.',
        'Open position with stop-loss.'
    ],
    ('Options', 'SW Browser'): [
        'Connect to options protocol.',
        'Select expiry, strike, and type.',
        'Pay premium and receive option.'
    ],

    # RWA combinations
    ('RWA', 'Lending'): [
        'Purchase RWA tokens through official issuer.',
        'Deposit as collateral if accepted.',
        'Understand real-world counterparty risks.'
    ],
    ('RWA', 'DEX'): [
        'Find pools with RWA token liquidity.',
        'Complete any required KYC first.',
        'Trade with awareness of transfer restrictions.'
    ],

    # Fiat Gateway combinations
    ('Fiat Gateway', 'SW Browser'): [
        'Connect wallet to fiat gateway.',
        'Complete KYC verification.',
        'Pay with card or bank transfer.'
    ],
    ('Fiat Gateway', 'SW Mobile'): [
        'Open mobile gateway app.',
        'Verify identity with photos.',
        'Purchase crypto to your wallet.'
    ],
    ('Fiat Gateway', 'CEX'): [
        'Use exchange built-in gateway.',
        'Complete payment method verification.',
        'Buy crypto directly on exchange.'
    ],

    # L2 combinations
    ('L2', 'DEX'): [
        'Ensure wallet is on correct L2 network.',
        'Connect to DEX operating on that L2.',
        'Enjoy lower fees for swaps.'
    ],
    ('L2', 'Bridges'): [
        'Choose native bridge for security or third-party for speed.',
        'Approve and initiate bridge transaction.',
        'Wait for confirmation on both chains.'
    ],
    ('L2', 'Lending'): [
        'Connect to lending protocol on L2.',
        'Deposit and borrow with lower gas costs.',
        'Monitor positions same as L1.'
    ],
    ('L2', 'SW Browser'): [
        'Add L2 network to your wallet manually.',
        'Bridge some ETH for gas.',
        'Switch networks as needed.'
    ],

    # Insurance combinations
    ('Insurance', 'Lending'): [
        'Select lending protocol to cover.',
        'Choose coverage amount and pay premium.',
        'File claim if exploit occurs.'
    ],
    ('Insurance', 'DEX'): [
        'Purchase coverage for LP positions.',
        'Understand what is and is not covered.',
        'Keep proof of positions for claims.'
    ],
}

# Default steps for combinations not in the mapping
DEFAULT_STEPS = [
    'Verify the compatibility between both products before starting.',
    'Always double-check addresses and transaction details.',
    'Start with a small test transaction to confirm the flow works correctly.'
]

def get_steps(type_a, type_b):
    """Get compatibility steps for a type combination."""
    key1 = (type_a, type_b)
    key2 = (type_b, type_a)

    if key1 in COMPATIBILITY_STEPS:
        return COMPATIBILITY_STEPS[key1]
    if key2 in COMPATIBILITY_STEPS:
        return COMPATIBILITY_STEPS[key2]

    # Generate contextual defaults
    hw_types = ['HW Cold', 'HW Wallet', 'Bkp Physical', 'MultiSig']
    sw_types = ['SW Browser', 'SW Mobile', 'SW Desktop']
    custodial = ['CEX', 'Crypto Bank', 'CeFi Lending', 'Custody', 'Card']
    defi_types = ['DEX', 'Lending', 'Yield', 'Liq Staking', 'Bridges']

    if type_a in hw_types or type_b in hw_types:
        return [
            'Connect your hardware wallet to interact with ' + type_b + ' securely.',
            'Verify all transaction details on the hardware device screen before signing.',
            'Keep your firmware updated and store recovery phrase safely.'
        ]
    elif type_a in sw_types and type_b in sw_types:
        return [
            'Import your seed phrase carefully if syncing between wallets.',
            'Verify addresses match across both wallet applications.',
            'Keep backup of recovery phrase in secure location.'
        ]
    elif type_a in custodial and type_b in custodial:
        return [
            'Initiate transfer from one platform following their withdrawal process.',
            'Use the correct network and address format for the destination.',
            'Keep records of all transfers for tax and tracking purposes.'
        ]
    elif type_a in defi_types or type_b in defi_types:
        return [
            'Connect ' + type_a + ' with ' + type_b + ' using the appropriate interface or bridge.',
            'Verify addresses and transaction details before confirming.',
            'Start with a small test transaction to confirm the flow works correctly.'
        ]
    elif type_a in custodial or type_b in custodial:
        return [
            'Generate the appropriate deposit or withdrawal address for ' + type_a + '.',
            'Verify the network type matches between both platforms.',
            'Wait for required confirmations before considering transfer complete.'
        ]
    else:
        return DEFAULT_STEPS

def main():
    print("\n" + "=" * 60)
    print("  FIXING TYPE_COMPATIBILITY STEPS (ALL 3081 RECORDS)")
    print("=" * 60)

    # Get all types
    r = requests.get(f'{SUPABASE_URL}/rest/v1/product_types?select=id,code', headers=HEADERS)
    types = r.json() if r.status_code == 200 else []
    types_by_id = {t['id']: t['code'] for t in types}
    print(f"\n📦 {len(types)} types loaded")

    # Get ALL type_compatibility records (with higher limit)
    print("\n🔍 Fetching all type_compatibility records...")

    all_tc = []
    offset = 0
    limit = 1000

    while True:
        r = requests.get(
            f'{SUPABASE_URL}/rest/v1/type_compatibility?select=id,type_a_id,type_b_id&offset={offset}&limit={limit}',
            headers=HEADERS
        )

        if r.status_code != 200:
            print(f"   Error: {r.status_code}")
            break

        batch = r.json()
        if not batch:
            break

        all_tc.extend(batch)
        offset += limit
        print(f"   Fetched {len(all_tc)} records...")

        if len(batch) < limit:
            break

    print(f"   Total: {len(all_tc)} type_compatibility records")

    # Update all with steps
    print("\n📝 Updating all records with compatibility_steps...")

    batch_size = 100
    updated = 0

    for i in range(0, len(all_tc), batch_size):
        batch = all_tc[i:i+batch_size]
        cases = []
        ids = []

        for tc in batch:
            type_a = types_by_id.get(tc['type_a_id'], '')
            type_b = types_by_id.get(tc['type_b_id'], '')
            steps = get_steps(type_a, type_b)
            cases.append(f"WHEN {tc['id']} THEN {format_pg_array(steps)}")
            ids.append(str(tc['id']))

        sql = f"""
        UPDATE type_compatibility
        SET compatibility_steps = CASE id {' '.join(cases)} END
        WHERE id IN ({','.join(ids)})
        """

        ok, _ = execute_sql(sql)
        if ok:
            updated += len(batch)

        if (i + batch_size) % 500 == 0:
            print(f"   Processed {min(i + batch_size, len(all_tc))}...")

    print(f"   ✅ {updated}/{len(all_tc)} records updated")

    # Verify
    print("\n🔍 Verifying via SQL...")
    ok, result = execute_sql("SELECT COUNT(*) as total, COUNT(compatibility_steps) as with_steps FROM type_compatibility")
    print(f"   Result: {result}")

    print("\n" + "=" * 60)
    print("  ✅ DONE")
    print("=" * 60)

if __name__ == "__main__":
    main()
