#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SAFESCORING - Update Product Compatibility with Official Sources
================================================================
Updates product compatibility matrix with verified information from
official documentation (Ledger, Trezor, MetaMask, etc.)

Run: python scripts/update_compat_official.py
"""

import os
import sys
import requests
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.core.config import SUPABASE_URL, get_supabase_headers


def get_headers():
    return get_supabase_headers()


def upsert_compatibility(product_a_id, product_b_id, data):
    """Insert or update a product compatibility record"""
    headers = get_headers()

    # Ensure correct order (a < b)
    if product_a_id > product_b_id:
        product_a_id, product_b_id = product_b_id, product_a_id

    record = {
        'product_a_id': product_a_id,
        'product_b_id': product_b_id,
        'type_compatible': data.get('type_compatible', True),
        'ai_compatible': data.get('compatible', True),
        'ai_confidence': data.get('confidence', 0.85),
        'ai_confidence_factors': data.get('confidence_factors', '')[:300],
        'ai_method': data.get('method', '')[:500],
        'ai_steps': data.get('steps', '')[:1000],
        'ai_limitations': data.get('limitations', '')[:500] if data.get('limitations') else None,
        'ai_justification': data.get('justification', '')[:500],
        'analyzed_at': datetime.now().isoformat(),
        'analyzed_by': 'claude_opus_official_sources'
    }

    # Try insert
    r = requests.post(
        f"{SUPABASE_URL}/rest/v1/product_compatibility",
        headers=headers,
        json=record
    )

    # If duplicate, update
    if r.status_code not in [200, 201]:
        r = requests.patch(
            f"{SUPABASE_URL}/rest/v1/product_compatibility?product_a_id=eq.{product_a_id}&product_b_id=eq.{product_b_id}",
            headers=headers,
            json=record
        )

    return r.status_code in [200, 201, 204]


# Product IDs (from database)
PRODUCTS = {
    # Hardware Wallets
    'ledger_nano_x': 99,
    'ledger_nano_s_plus': 98,
    'ledger_nano_s': 97,
    'ledger_nano_gen5': 488,
    'ledger_stax': 100,  # If exists
    'ledger_flex': 489,  # If exists
    'trezor_model_t': 169,
    'trezor_safe_5': 171,
    'trezor_safe_3': 170,
    'trezor_model_one': 168,
    'keystone_pro': 87,
    'keystone_3_pro': 84,
    'keystone_essential': 85,
    'onekey_pro': 124,
    'onekey_classic': 123,
    'onekey_classic_1s': 490,

    # Software Wallets
    'metamask': 111,
    'phantom': 521,
    'rabby': 132,
    'ledger_live': 96,

    # DeFi
    'uniswap': 176,
    'aave': 4,
    'aave_v3': 700,
    'lido': 103,
    'lido_finance': 744,
    'sushiswap': 159,
    'curve': None,  # Need to find
    'compound': None,  # Need to find

    # Physical Backups
    'trezor_keep_metal': 167,
    'keystone_tablet': 88,
}


# Official compatibility data based on web research
COMPATIBILITIES = [
    # ============================================
    # LEDGER NANO X + SOFTWARE WALLETS
    # ============================================
    {
        'product_a': 'ledger_nano_x',
        'product_b': 'metamask',
        'compatible': True,
        'confidence': 0.95,
        'confidence_factors': '+official_ledger_docs +official_metamask_docs +native_integration +usb_bluetooth +widely_used',
        'method': 'Connect via USB cable or Bluetooth to MetaMask browser extension or mobile app',
        'steps': '1. Install MetaMask extension 2. Click account icon > Connect Hardware Wallet 3. Select Ledger 4. Connect Ledger via USB 5. Approve on device',
        'limitations': 'Bluetooth only on mobile; Firefox may have issues since v112; EVM chains only',
        'justification': 'You can connect your Ledger Nano X directly to MetaMask via USB or Bluetooth. Every transaction is signed on your Ledger, keeping your private keys secure. Official integration supported by both Ledger and MetaMask.',
        'sources': 'https://support.ledger.com/article/4404366864657-zd, https://support.metamask.io/more-web3/wallets/hardware-wallet-hub'
    },
    {
        'product_a': 'ledger_nano_x',
        'product_b': 'phantom',
        'compatible': True,
        'confidence': 0.92,
        'confidence_factors': '+official_phantom_docs +official_ledger_docs +native_integration +usb_bluetooth +multichain',
        'method': 'Connect via USB (browser extension) or Bluetooth (mobile app)',
        'steps': '1. Open Phantom 2. Click avatar > Add Account > Connect Hardware Wallet 3. Connect Ledger 4. Select accounts to import',
        'limitations': 'Chrome/Brave/Edge only (no Firefox); Bluetooth requires Nano X or Stax',
        'justification': 'You can connect your Ledger Nano X to Phantom for secure signing on Solana, Ethereum, Polygon, and Bitcoin. Phantom officially supports all Ledger devices with Bluetooth capability.',
        'sources': 'https://help.phantom.com/hc/en-us/articles/4406388670483'
    },
    {
        'product_a': 'ledger_nano_x',
        'product_b': 'rabby',
        'compatible': True,
        'confidence': 0.90,
        'confidence_factors': '+official_rabby_docs +official_ledger_docs +native_integration +usb +evm_chains',
        'method': 'Connect via USB to Rabby browser extension',
        'steps': '1. Open Rabby extension 2. Add Account > Connect Hardware Wallet 3. Select Ledger 4. Approve connection on Ledger',
        'limitations': 'USB only (no Bluetooth); EVM chains only (no BTC)',
        'justification': 'You can connect your Ledger Nano X to Rabby Wallet via USB for enhanced security on Ethereum and EVM chains. Rabby offers streamlined Ledger signing with fewer errors.',
        'sources': 'https://support.ledger.com/article/4409801559569-zd, https://support.rabby.io/hc/en-us/articles/11477583548303'
    },

    # ============================================
    # LEDGER NANO S PLUS + SOFTWARE WALLETS
    # ============================================
    {
        'product_a': 'ledger_nano_s_plus',
        'product_b': 'metamask',
        'compatible': True,
        'confidence': 0.93,
        'confidence_factors': '+official_docs +native_integration +usb +widely_used',
        'method': 'Connect via USB cable to MetaMask browser extension',
        'steps': '1. Install MetaMask extension 2. Click account icon > Connect Hardware Wallet 3. Select Ledger 4. Connect via USB 5. Approve on device',
        'limitations': 'No Bluetooth (USB only); Not compatible with MetaMask mobile; EVM chains only',
        'justification': 'You can connect your Ledger Nano S Plus to MetaMask via USB for secure transaction signing. Your private keys never leave the device.',
        'sources': 'https://support.ledger.com/article/4404366864657-zd'
    },
    {
        'product_a': 'ledger_nano_s_plus',
        'product_b': 'phantom',
        'compatible': True,
        'confidence': 0.90,
        'confidence_factors': '+official_docs +native_integration +usb +multichain',
        'method': 'Connect via USB to Phantom browser extension',
        'steps': '1. Open Phantom extension 2. Click avatar > Add Account > Connect Hardware Wallet 3. Connect Ledger via USB',
        'limitations': 'USB only (no mobile app support); Chrome/Brave/Edge only',
        'justification': 'You can connect your Ledger Nano S Plus to Phantom browser extension via USB for secure signing on Solana, Ethereum, and other chains.',
        'sources': 'https://help.phantom.com/hc/en-us/articles/4406388670483'
    },
    {
        'product_a': 'ledger_nano_s_plus',
        'product_b': 'rabby',
        'compatible': True,
        'confidence': 0.90,
        'confidence_factors': '+official_docs +native_integration +usb +evm_chains',
        'method': 'Connect via USB to Rabby browser extension',
        'steps': '1. Open Rabby 2. Add Account > Connect Hardware Wallet > Ledger 3. Connect via USB',
        'limitations': 'USB only; EVM chains only',
        'justification': 'You can connect your Ledger Nano S Plus to Rabby Wallet via USB for secure EVM chain transactions.',
        'sources': 'https://support.rabby.io/hc/en-us/articles/11477583548303'
    },

    # ============================================
    # TREZOR + SOFTWARE WALLETS
    # ============================================
    {
        'product_a': 'trezor_model_t',
        'product_b': 'metamask',
        'compatible': True,
        'confidence': 0.93,
        'confidence_factors': '+official_trezor_docs +official_metamask_docs +native_integration +usb +touchscreen',
        'method': 'Connect via USB to MetaMask browser extension using Trezor Connect',
        'steps': '1. Install MetaMask 2. Click account icon > Connect Hardware Wallet > Trezor 3. Approve in Trezor Connect popup 4. Select account',
        'limitations': 'USB only; Chrome/Firefox supported; Never enter seed in MetaMask',
        'justification': 'You can connect your Trezor Model T to MetaMask via USB. Your keys stay secure on the Trezor while you interact with DeFi and dApps through MetaMask.',
        'sources': 'https://trezor.io/guides/third-party-wallet-apps/ethereum-evm-apps/metamask-and-trezor'
    },
    {
        'product_a': 'trezor_safe_5',
        'product_b': 'metamask',
        'compatible': True,
        'confidence': 0.93,
        'confidence_factors': '+official_docs +native_integration +usb +latest_model',
        'method': 'Connect via USB to MetaMask using Trezor Connect',
        'steps': '1. Install MetaMask 2. Connect Hardware Wallet > Trezor 3. Approve connection 4. Select accounts',
        'limitations': 'USB only; Ensure latest firmware',
        'justification': 'You can connect your Trezor Safe 5 to MetaMask for secure DeFi access. All transactions are verified and signed on your Trezor touchscreen.',
        'sources': 'https://trezor.io/guides/third-party-wallet-apps/ethereum-evm-apps/metamask-and-trezor'
    },
    {
        'product_a': 'trezor_safe_3',
        'product_b': 'metamask',
        'compatible': True,
        'confidence': 0.93,
        'confidence_factors': '+official_docs +native_integration +usb',
        'method': 'Connect via USB to MetaMask using Trezor Connect',
        'steps': '1. Install MetaMask 2. Connect Hardware Wallet > Trezor 3. Approve on Trezor 4. Select accounts',
        'limitations': 'USB only',
        'justification': 'You can connect your Trezor Safe 3 to MetaMask via USB for secure transaction signing on EVM chains.',
        'sources': 'https://trezor.io/guides/third-party-wallet-apps/ethereum-evm-apps/metamask-and-trezor'
    },
    {
        'product_a': 'trezor_model_t',
        'product_b': 'rabby',
        'compatible': True,
        'confidence': 0.90,
        'confidence_factors': '+official_trezor_docs +official_rabby_docs +native_integration +usb',
        'method': 'Connect via USB to Rabby browser extension',
        'steps': '1. Open Rabby 2. Add Account > Connect Hardware Wallet > Trezor 3. Approve in Trezor Connect',
        'limitations': 'USB only; EVM chains only; Install Trezor Suite first',
        'justification': 'You can connect your Trezor Model T to Rabby Wallet for secure EVM transactions. Rabby supports both standard and hidden wallets with passphrases.',
        'sources': 'https://trezor.io/guides/third-party-wallet-apps/ethereum-evm-apps/rabby-wallet-and-trezor'
    },
    {
        'product_a': 'trezor_safe_5',
        'product_b': 'rabby',
        'compatible': True,
        'confidence': 0.90,
        'confidence_factors': '+official_docs +native_integration +usb',
        'method': 'Connect via USB to Rabby',
        'steps': '1. Open Rabby 2. Add Account > Trezor 3. Approve connection',
        'limitations': 'USB only; EVM chains only',
        'justification': 'You can connect your Trezor Safe 5 to Rabby Wallet via USB for enhanced security on Ethereum and EVM chains.',
        'sources': 'https://trezor.io/guides/third-party-wallet-apps/ethereum-evm-apps/rabby-wallet-and-trezor'
    },

    # ============================================
    # KEYSTONE + SOFTWARE WALLETS (Air-gapped QR)
    # ============================================
    {
        'product_a': 'keystone_pro',
        'product_b': 'metamask',
        'compatible': True,
        'confidence': 0.92,
        'confidence_factors': '+official_keystone_docs +official_metamask_docs +native_integration +air_gapped +qr_codes',
        'method': 'Air-gapped connection via QR codes (no USB/Bluetooth required)',
        'steps': '1. On Keystone select MetaMask 2. QR code displays 3. In MetaMask click Connect Hardware Wallet 4. Scan QR code 5. Select accounts',
        'limitations': 'Requires firmware M-5.0+; EVM chains only; Sign transactions by scanning QR codes',
        'justification': 'You can connect your Keystone Pro to MetaMask using air-gapped QR codes. Your device never connects to the internet, providing maximum security. MetaMask and Keystone co-authored EIP-4527 for this standard.',
        'sources': 'https://guide.keyst.one/docs/metamask-extension, https://consensys.io/blog/metamask-mobile-launches-first-hardware-wallet-integration-with-keystone'
    },
    {
        'product_a': 'keystone_3_pro',
        'product_b': 'metamask',
        'compatible': True,
        'confidence': 0.92,
        'confidence_factors': '+official_docs +native_integration +air_gapped +qr_codes +latest_model',
        'method': 'Air-gapped QR code connection',
        'steps': '1. Select MetaMask on Keystone 2. Scan QR with MetaMask 3. Import accounts',
        'limitations': 'QR scanning required for each transaction',
        'justification': 'You can connect your Keystone 3 Pro to MetaMask via QR codes for completely air-gapped security. Your private keys never touch any connected device.',
        'sources': 'https://guide.keyst.one/docs/metamask-extension'
    },

    # ============================================
    # ONEKEY + SOFTWARE WALLETS
    # ============================================
    {
        'product_a': 'onekey_pro',
        'product_b': 'metamask',
        'compatible': True,
        'confidence': 0.92,
        'confidence_factors': '+official_onekey_docs +official_metamask_docs +native_integration +usb_qr',
        'method': 'Connect via USB or air-gapped QR codes',
        'steps': '1. In MetaMask click Connect Hardware Wallet 2. Select OneKey 3. Connect via USB or scan QR code 4. Select accounts',
        'limitations': 'Air-gapped mode requires QR scanning',
        'justification': 'You can connect your OneKey Pro to MetaMask via USB or QR codes. MetaMask now has native OneKey support for seamless hardware wallet security.',
        'sources': 'https://help.onekey.so/en/articles/11461106-how-to-use-metamask-wallet-with-onekey-hardware-wallets'
    },
    {
        'product_a': 'onekey_classic',
        'product_b': 'metamask',
        'compatible': True,
        'confidence': 0.90,
        'confidence_factors': '+official_docs +native_integration +usb',
        'method': 'Connect via USB to MetaMask',
        'steps': '1. Connect OneKey via USB 2. In MetaMask select Connect Hardware Wallet > OneKey 3. Select accounts',
        'limitations': 'USB only (no air-gapped on Classic)',
        'justification': 'You can connect your OneKey Classic to MetaMask via USB for secure transaction signing on EVM chains.',
        'sources': 'https://help.onekey.so/en/articles/11461106-how-to-use-metamask-wallet-with-onekey-hardware-wallets'
    },

    # ============================================
    # HARDWARE WALLETS + DEFI PROTOCOLS
    # ============================================
    {
        'product_a': 'ledger_nano_x',
        'product_b': 'uniswap',
        'compatible': True,
        'confidence': 0.88,
        'confidence_factors': '+via_metamask +via_rabby +walletconnect +evm_native',
        'method': 'Connect Ledger to MetaMask/Rabby, then use Uniswap dApp',
        'steps': '1. Connect Ledger to MetaMask 2. Go to app.uniswap.org 3. Connect wallet 4. Approve transactions on Ledger',
        'limitations': 'Requires software wallet as intermediary; Sign each swap on device',
        'justification': 'You can use Uniswap with your Ledger Nano X by connecting through MetaMask or Rabby. Every swap is signed securely on your hardware wallet.',
        'sources': 'https://support.ledger.com/article/4404366864657-zd'
    },
    {
        'product_a': 'ledger_nano_x',
        'product_b': 'aave',
        'compatible': True,
        'confidence': 0.88,
        'confidence_factors': '+via_metamask +via_rabby +walletconnect +defi',
        'method': 'Connect Ledger to MetaMask/Rabby, then use Aave',
        'steps': '1. Connect Ledger to MetaMask 2. Go to app.aave.com 3. Connect wallet 4. Approve deposits/borrows on Ledger',
        'limitations': 'Requires software wallet; Multiple signatures for complex operations',
        'justification': 'You can use Aave lending protocol with your Ledger Nano X through MetaMask. Your funds are protected by hardware wallet security even when using DeFi.',
        'sources': 'https://aave.com'
    },
    {
        'product_a': 'ledger_nano_x',
        'product_b': 'lido',
        'compatible': True,
        'confidence': 0.88,
        'confidence_factors': '+via_metamask +via_rabby +liquid_staking +eth',
        'method': 'Connect Ledger to MetaMask, then stake ETH on Lido',
        'steps': '1. Connect Ledger to MetaMask 2. Go to stake.lido.fi 3. Connect wallet 4. Stake ETH and approve on Ledger',
        'limitations': 'Requires software wallet; ETH staking only',
        'justification': 'You can stake your ETH on Lido using your Ledger Nano X through MetaMask. Your staking transaction is signed securely on your hardware wallet.',
        'sources': 'https://lido.fi'
    },
    {
        'product_a': 'trezor_model_t',
        'product_b': 'uniswap',
        'compatible': True,
        'confidence': 0.88,
        'confidence_factors': '+via_metamask +via_rabby +walletconnect +evm',
        'method': 'Connect Trezor to MetaMask/Rabby, then use Uniswap',
        'steps': '1. Connect Trezor to MetaMask 2. Visit app.uniswap.org 3. Connect wallet 4. Sign swaps on Trezor',
        'limitations': 'Requires software wallet as bridge',
        'justification': 'You can swap tokens on Uniswap with your Trezor Model T by connecting through MetaMask. All transactions are verified on your Trezor screen.',
        'sources': 'https://trezor.io'
    },

    # ============================================
    # PHYSICAL BACKUPS + WALLETS (BIP39)
    # ============================================
    {
        'product_a': 'trezor_keep_metal',
        'product_b': 'ledger_nano_x',
        'compatible': True,
        'confidence': 0.95,
        'confidence_factors': '+bip39_standard +universal_seed +metal_backup',
        'method': 'Write 12/24-word seed phrase on metal backup',
        'steps': '1. Set up Ledger Nano X 2. Write 24-word recovery phrase on Trezor Keep Metal 3. Store securely offline',
        'limitations': 'Verify all words are correct; Store in secure location',
        'justification': 'You can back up your Ledger Nano X seed phrase on Trezor Keep Metal for fireproof and waterproof protection. The BIP39 standard ensures universal compatibility.',
        'sources': 'https://trezor.io/trezor-keep-metal'
    },
    {
        'product_a': 'trezor_keep_metal',
        'product_b': 'trezor_model_t',
        'compatible': True,
        'confidence': 0.95,
        'confidence_factors': '+bip39_standard +same_manufacturer +metal_backup',
        'method': 'Write 12/24-word seed phrase on metal backup',
        'steps': '1. Set up Trezor Model T 2. Write recovery phrase on Trezor Keep Metal 3. Store securely',
        'limitations': 'Double-check all words',
        'justification': 'You can back up your Trezor Model T seed phrase on Trezor Keep Metal. Both products are designed to work together for ultimate security.',
        'sources': 'https://trezor.io/trezor-keep-metal'
    },
    {
        'product_a': 'trezor_keep_metal',
        'product_b': 'metamask',
        'compatible': True,
        'confidence': 0.90,
        'confidence_factors': '+bip39_standard +universal_seed',
        'method': 'Back up MetaMask seed phrase on metal plate',
        'steps': '1. Get MetaMask recovery phrase from Settings > Security 2. Write 12 words on Trezor Keep Metal 3. Store offline',
        'limitations': 'MetaMask uses 12 words; Never store digitally',
        'justification': 'You can protect your MetaMask wallet by backing up its 12-word seed phrase on Trezor Keep Metal for durable, offline storage.',
        'sources': 'https://trezor.io/trezor-keep-metal'
    },
    {
        'product_a': 'keystone_tablet',
        'product_b': 'onekey_pro',
        'compatible': True,
        'confidence': 0.95,
        'confidence_factors': '+bip39_standard +universal_seed +metal_backup',
        'method': 'Write seed phrase on Keystone Tablet',
        'steps': '1. Set up OneKey Pro 2. Write 24-word recovery phrase on Keystone Tablet 3. Store securely',
        'limitations': 'Verify all words',
        'justification': 'You can back up your OneKey Pro seed phrase on Keystone Tablet for fireproof and corrosion-resistant protection.',
        'sources': 'https://keyst.one/keystone-tablet'
    },
]


def main():
    print("""
╔══════════════════════════════════════════════════════════════════╗
║  SAFESCORING - Update Compatibility with Official Sources        ║
║  Using verified information from official documentation          ║
╚══════════════════════════════════════════════════════════════════╝
""")

    success = 0
    errors = 0

    for compat in COMPATIBILITIES:
        product_a_key = compat['product_a']
        product_b_key = compat['product_b']

        product_a_id = PRODUCTS.get(product_a_key)
        product_b_id = PRODUCTS.get(product_b_key)

        if not product_a_id or not product_b_id:
            print(f"[SKIP] Missing product ID: {product_a_key} or {product_b_key}")
            errors += 1
            continue

        print(f"[UPDATE] {product_a_key} x {product_b_key}...", end=' ')

        if upsert_compatibility(product_a_id, product_b_id, compat):
            print("OK")
            success += 1
        else:
            print("FAILED")
            errors += 1

    print(f"""
╔══════════════════════════════════════════════════════════════════╗
║                        COMPLETED                                 ║
╠══════════════════════════════════════════════════════════════════╣
║  Success: {success:4}                                               ║
║  Errors:  {errors:4}                                               ║
╚══════════════════════════════════════════════════════════════════╝
""")


if __name__ == "__main__":
    main()
