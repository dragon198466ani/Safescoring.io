#!/usr/bin/env python3
"""Fix all 21 remaining product issues found in line-by-line audit."""
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
import requests
from src.core.config import SUPABASE_URL, get_supabase_headers

headers = get_supabase_headers(use_service_key=True)

def fix(pid, updates):
    r = requests.patch(
        f"{SUPABASE_URL}/rest/v1/products?id=eq.{pid}",
        headers={**headers, "Prefer": "return=representation"},
        json=updates
    )
    return r.status_code in (200, 204)

def fix_map(pid, tid):
    requests.patch(
        f"{SUPABASE_URL}/rest/v1/product_type_mapping?product_id=eq.{pid}&is_primary=eq.true",
        headers={**headers, "Prefer": "return=representation"},
        json={"type_id": tid}
    )

count = 0

fixes = [
    (67, {"description": "A liquid staking derivative token representing staked Ethereum on the Frax protocol. Users deposit ETH and receive frxETH, which can be staked as sfrxETH to earn validator rewards while maintaining DeFi liquidity."}, None, "Frax Ether desc"),
    (71, {"description": "A crypto rewards credit card by Gemini exchange that earns up to 3% back in Bitcoin or other cryptocurrencies on everyday purchases. No annual fee, works with Mastercard network at merchants worldwide."}, None, "Gemini Card desc"),
    (112, {"description": "A crypto debit card by MetaMask and Mastercard enabling users to spend their self-custodial crypto assets at any Mastercard merchant. Converts crypto to fiat at point-of-sale."}, None, "MetaMask Card desc"),
    (147, {"description": "A Visa prepaid card by Shakepay enabling Canadian users to spend crypto at merchants. Offers Bitcoin cashback rewards on purchases and integrates with the Shakepay exchange for instant funding."}, None, "Shakepay Card desc"),
    (279, {"description": "A decentralized liquid staking protocol enabling users to stake ETH while retaining custody of their keys. Issues eETH as a liquid staking token. Also operates a restaking service on EigenLayer for additional yield."}, None, "Ether.fi desc"),
    (619, {"description": "A crypto debit card by hi.com enabling users to spend cryptocurrencies at merchants worldwide via Mastercard network. Offers cashback rewards in HI tokens and supports multiple fiat currency spending."}, None, "Hi Card desc"),
    (629, {"description": "A corporate crypto debit card by Rain Financial enabling businesses in the Middle East to make payments with crypto-funded Visa cards. Supports fiat off-ramp and expense management."}, None, "Rain Card desc"),
    (739, {"type_id": 18, "description": "A liquid staking derivative token on the Frax protocol. Users mint frxETH by depositing ETH, then stake as sfrxETH to earn Ethereum validator rewards while maintaining DeFi liquidity."}, 18, "Frax Ether (frxETH) type+desc"),
    (815, {"description": "A Euro-pegged stablecoin issued by Tether (iFinex). Maintains a 1:1 peg to the Euro through reserves. Available on Ethereum and other blockchains for Euro-denominated trading and transfers."}, None, "EURT desc"),
    (825, {"description": "A US dollar-pegged stablecoin (PYUSD) issued by PayPal and managed by Paxos Trust. Fully backed by USD deposits and US Treasuries, available on Ethereum and Solana for payments and DeFi."}, None, "PayPal USD desc"),
    (829, {"description": "The largest USD-pegged stablecoin by market capitalization, issued by Tether (iFinex). Maintains a 1:1 peg to the US dollar through reserves including cash, treasuries, and other assets. Available on 10+ blockchains."}, None, "Tether USDT desc"),
    (1021, {"description": "A Solana liquid staking protocol that distributes staked SOL across 400+ validators for decentralization. Issues mSOL as a liquid staking token that accrues staking rewards and can be used in Solana DeFi."}, None, "Marinade desc"),
    (1090, {"description": "A cloud-based crypto trading bot platform offering automated strategies, copy trading, and AI-powered signals across 17+ exchanges. Features backtesting, paper trading, and a strategy marketplace."}, None, "Cryptohopper desc"),
    (1103, {"type_id": 50, "description": "A smart contract operations platform by OpenZeppelin providing automated monitoring, transaction management, access control, and deployment tools for Web3 developers and security teams."}, 50, "OpenZeppelin Defender type+desc"),
    (1110, {"type_id": 76, "description": "A decentralized AI marketplace enabling developers to publish, monetize, and access AI services on blockchain. Uses the AGIX token for transactions in an open AI services ecosystem."}, 76, "SingularityNET type+desc"),
    (1130, {"type_id": 53, "description": "A cryptocurrency media platform providing news analysis, research reports, podcasts, and educational content focused on DeFi, Ethereum, and the broader crypto ecosystem."}, 53, "Bankless type+desc"),
    (1146, {"type_id": 53, "description": "A crypto research and investment firm publishing in-depth technical papers on blockchain protocols, cryptography, MEV, and DeFi mechanism design. One of the largest crypto venture capital firms."}, 53, "Paradigm Research type+desc"),
    (347, {"description": "A non-custodial Bitcoin-only exchange and payment platform based in Canada. Enables users to buy, sell, and pay with Bitcoin without the exchange holding custody of funds. Also offers the Bull Bitcoin Wallet."}, None, "Bull Bitcoin desc"),
    (982, {"type_id": 11}, 11, "SideShift type CEX->DEX"),
    (984, {"description": "A centralized instant cryptocurrency exchange service offering fixed-rate and floating-rate swaps across 500+ coins. No registration required for basic swaps with competitive rates."}, None, "Exolix desc"),
    (1400, {"type_id": 21, "description": "A multi-exchange crypto trading platform for active traders. Consolidates access to 18+ centralized exchanges with portfolio tracking, advanced charting, automated bots, and real-time alerts."}, 21, "Altrady type+desc"),
]

for pid, updates, map_tid, label in fixes:
    if fix(pid, updates):
        if map_tid:
            fix_map(pid, map_tid)
        print(f"FIXED [{pid}] {label}")
        count += 1
    else:
        print(f"ERROR [{pid}] {label}")

print(f"\n=== Total: {count}/21 fixed ===")
