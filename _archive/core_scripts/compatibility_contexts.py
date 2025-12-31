#!/usr/bin/env python3
"""
SAFESCORING.IO - Compatibility Contexts Reference
Product × Product compatibility contexts reference
"""

# ═══════════════════════════════════════════════════════════════════════════
# MAIN COMPATIBILITY CONTEXTS
# ═══════════════════════════════════════════════════════════════════════════

COMPATIBILITY_CONTEXTS = {
    # ─────────────────────────────────────────────────────────────────────────
    # 🔐 SECURITY & STORAGE
    # ─────────────────────────────────────────────────────────────────────────
    "security_storage": {
        "name": "Security & Storage",
        "icon": "🔐",
        "contexts": {
            "tx_signing": {
                "name": "Transaction Signing",
                "description": "Sign transactions securely",
                "example": "Hardware Wallet → DEX/DApp",
                "typical_pairs": [
                    ("HW_COLD", "DEX"),
                    ("HW_COLD", "SW_BROWSER"),
                    ("HW_COLD", "LENDING"),
                ]
            },
            "backup_recovery": {
                "name": "Backup & Recovery",
                "description": "Key backup and recovery",
                "example": "Seed Phrase Backup → Hardware Wallet",
                "typical_pairs": [
                    ("BACKUP_PHYSICAL", "HW_COLD"),
                    ("BACKUP_PHYSICAL", "SW_MOBILE"),
                    ("BACKUP_DIGITAL", "HW_COLD"),
                ]
            },
            "cold_to_hot": {
                "name": "Cold → Hot Transfer",
                "description": "Secure transfer between cold and hot storage",
                "example": "Cold Wallet → Hot Wallet",
                "typical_pairs": [
                    ("HW_COLD", "SW_MOBILE"),
                    ("HW_COLD", "SW_DESKTOP"),
                    ("HW_COLD", "CEX"),
                ]
            },
            "multisig": {
                "name": "Multi-signature",
                "description": "Multi-sig management for enhanced security",
                "example": "Multiple Wallets → Safe/Gnosis",
                "typical_pairs": [
                    ("HW_COLD", "MULTISIG"),
                    ("SW_BROWSER", "MULTISIG"),
                    ("SW_MOBILE", "MULTISIG"),
                ]
            },
        }
    },
    
    # ─────────────────────────────────────────────────────────────────────────
    # 🔗 CONNECTION & ACCESS
    # ─────────────────────────────────────────────────────────────────────────
    "connection_access": {
        "name": "Connection & Access",
        "icon": "🔗",
        "contexts": {
            "web3_interface": {
                "name": "Web3 Interface",
                "description": "Connection to decentralized applications",
                "example": "Browser Extension → DApp/DEX",
                "typical_pairs": [
                    ("SW_BROWSER", "DEX"),
                    ("SW_BROWSER", "LENDING"),
                    ("SW_BROWSER", "NFT_MARKET"),
                ]
            },
            "walletconnect": {
                "name": "WalletConnect",
                "description": "Mobile connection via QR code",
                "example": "Mobile Wallet → WalletConnect → DApp",
                "typical_pairs": [
                    ("SW_MOBILE", "DEX"),
                    ("SW_MOBILE", "LENDING"),
                    ("SW_MOBILE", "NFT_MARKET"),
                ]
            },
            "cross_chain_bridge": {
                "name": "Cross-Chain Bridge",
                "description": "Asset transfer between blockchains",
                "example": "Wallet → Bridge → Other network",
                "typical_pairs": [
                    ("SW_BROWSER", "BRIDGE"),
                    ("SW_MOBILE", "BRIDGE"),
                    ("HW_COLD", "BRIDGE"),
                ]
            },
            "hardware_connect": {
                "name": "Hardware Connection",
                "description": "USB/Bluetooth hardware wallet connection",
                "example": "Ledger → MetaMask via USB",
                "typical_pairs": [
                    ("HW_COLD", "SW_BROWSER"),
                    ("HW_COLD", "SW_DESKTOP"),
                    ("HW_COLD", "SW_MOBILE"),
                ]
            },
        }
    },
    
    # ─────────────────────────────────────────────────────────────────────────
    # 💰 DEFI & TRADING
    # ─────────────────────────────────────────────────────────────────────────
    "defi_trading": {
        "name": "DeFi & Trading",
        "icon": "💰",
        "contexts": {
            "defi_composability": {
                "name": "DeFi Composability",
                "description": "DeFi protocol chaining",
                "example": "DEX → Lending → Yield Aggregator",
                "typical_pairs": [
                    ("DEX", "LENDING"),
                    ("DEX", "YIELD_AGG"),
                    ("LENDING", "YIELD_AGG"),
                ]
            },
            "liquidity_provision": {
                "name": "Liquidity Provision",
                "description": "Adding liquidity to pools",
                "example": "Wallet → DEX → LP Pool",
                "typical_pairs": [
                    ("SW_BROWSER", "DEX"),
                    ("SW_MOBILE", "DEX"),
                    ("DEX", "YIELD_AGG"),
                ]
            },
            "collateral_mint": {
                "name": "Collateral & Mint",
                "description": "Using as collateral for minting",
                "example": "Lending → Stablecoin mint",
                "typical_pairs": [
                    ("LENDING", "STABLECOIN"),
                    ("LENDING", "SYNTHETIC"),
                ]
            },
            "swap_aggregation": {
                "name": "Swap Aggregation",
                "description": "Optimizing swaps via aggregators",
                "example": "Wallet → 1inch → Best DEX",
                "typical_pairs": [
                    ("SW_BROWSER", "DEX_AGG"),
                    ("DEX_AGG", "DEX"),
                ]
            },
            "staking": {
                "name": "Staking",
                "description": "Asset staking",
                "example": "Wallet → Staking Protocol",
                "typical_pairs": [
                    ("SW_BROWSER", "STAKING"),
                    ("HW_COLD", "STAKING"),
                    ("CEX", "STAKING"),
                ]
            },
        }
    },
    
    # ─────────────────────────────────────────────────────────────────────────
    # 🏦 FIAT & EXCHANGE
    # ─────────────────────────────────────────────────────────────────────────
    "fiat_exchange": {
        "name": "Fiat & Exchange",
        "icon": "🏦",
        "contexts": {
            "onramp": {
                "name": "On-Ramp (Fiat → Crypto)",
                "description": "Buying crypto with fiat",
                "example": "Credit Card → CEX → Crypto",
                "typical_pairs": [
                    ("FIAT_ONRAMP", "CEX"),
                    ("FIAT_ONRAMP", "SW_BROWSER"),
                    ("CEX", "SW_BROWSER"),
                ]
            },
            "offramp": {
                "name": "Off-Ramp (Crypto → Fiat)",
                "description": "Selling crypto to fiat",
                "example": "Wallet → CEX → Bank",
                "typical_pairs": [
                    ("SW_BROWSER", "CEX"),
                    ("SW_MOBILE", "CEX"),
                    ("CEX", "FIAT_OFFRAMP"),
                ]
            },
            "cex_withdrawal": {
                "name": "CEX Withdrawal",
                "description": "Withdrawal from centralized exchange",
                "example": "Binance → Hardware Wallet",
                "typical_pairs": [
                    ("CEX", "HW_COLD"),
                    ("CEX", "SW_BROWSER"),
                    ("CEX", "SW_MOBILE"),
                ]
            },
            "p2p_trading": {
                "name": "P2P Trading",
                "description": "Peer-to-peer exchange",
                "example": "Wallet → P2P Platform → Other user",
                "typical_pairs": [
                    ("SW_BROWSER", "P2P"),
                    ("SW_MOBILE", "P2P"),
                ]
            },
        }
    },
    
    # ─────────────────────────────────────────────────────────────────────────
    # 🛡️ MANAGEMENT & MONITORING
    # ─────────────────────────────────────────────────────────────────────────
    "management_monitoring": {
        "name": "Management & Monitoring",
        "icon": "🛡️",
        "contexts": {
            "portfolio_tracking": {
                "name": "Portfolio Tracking",
                "description": "Asset and performance tracking",
                "example": "Wallet → Portfolio Tracker (Zapper, DeBank)",
                "typical_pairs": [
                    ("SW_BROWSER", "PORTFOLIO"),
                    ("HW_COLD", "PORTFOLIO"),
                    ("CEX", "PORTFOLIO"),
                ]
            },
            "security_monitoring": {
                "name": "Security Monitoring",
                "description": "Risk monitoring and alerts",
                "example": "Wallet → Security Monitor",
                "typical_pairs": [
                    ("SW_BROWSER", "SECURITY_TOOL"),
                    ("LENDING", "SECURITY_TOOL"),
                    ("DEX", "SECURITY_TOOL"),
                ]
            },
            "tax_reporting": {
                "name": "Tax Reporting",
                "description": "Tax calculation and export",
                "example": "Wallet/CEX → Tax Tool (Koinly)",
                "typical_pairs": [
                    ("SW_BROWSER", "TAX_TOOL"),
                    ("CEX", "TAX_TOOL"),
                    ("DEX", "TAX_TOOL"),
                ]
            },
            "notification_alerts": {
                "name": "Notifications & Alerts",
                "description": "Price, transaction, security alerts",
                "example": "Wallet → Alert Service",
                "typical_pairs": [
                    ("SW_BROWSER", "ALERT_SERVICE"),
                    ("DEX", "ALERT_SERVICE"),
                ]
            },
        }
    },
    
    # ─────────────────────────────────────────────────────────────────────────
    # 🎨 NFT & GAMING
    # ─────────────────────────────────────────────────────────────────────────
    "nft_gaming": {
        "name": "NFT & Gaming",
        "icon": "🎨",
        "contexts": {
            "nft_minting": {
                "name": "NFT Minting",
                "description": "Creating and minting NFTs",
                "example": "Wallet → NFT Platform → Mint",
                "typical_pairs": [
                    ("SW_BROWSER", "NFT_MARKET"),
                    ("SW_MOBILE", "NFT_MARKET"),
                ]
            },
            "nft_trading": {
                "name": "NFT Trading",
                "description": "Buying/selling NFTs",
                "example": "Wallet → OpenSea/Blur",
                "typical_pairs": [
                    ("SW_BROWSER", "NFT_MARKET"),
                    ("HW_COLD", "NFT_MARKET"),
                ]
            },
            "gaming_play": {
                "name": "Gaming Play-to-Earn",
                "description": "Blockchain games and rewards",
                "example": "Wallet → Game → Rewards",
                "typical_pairs": [
                    ("SW_BROWSER", "GAMING"),
                    ("SW_MOBILE", "GAMING"),
                ]
            },
        }
    },
}


# ═══════════════════════════════════════════════════════════════════════════
# UTILITY FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════

def get_all_contexts_flat():
    """Returns all contexts as a flat list"""
    contexts = []
    for category_key, category in COMPATIBILITY_CONTEXTS.items():
        for ctx_key, ctx in category["contexts"].items():
            contexts.append({
                "category": category_key,
                "category_name": category["name"],
                "category_icon": category["icon"],
                "context_key": ctx_key,
                "context_name": ctx["name"],
                "description": ctx["description"],
                "example": ctx["example"],
                "typical_pairs": ctx["typical_pairs"],
            })
    return contexts


def find_context_for_pair(type_a_code, type_b_code):
    """Finds the most likely context for a pair of types"""
    matches = []
    for category_key, category in COMPATIBILITY_CONTEXTS.items():
        for ctx_key, ctx in category["contexts"].items():
            for pair in ctx["typical_pairs"]:
                if (pair[0] == type_a_code and pair[1] == type_b_code) or \
                   (pair[0] == type_b_code and pair[1] == type_a_code):
                    matches.append({
                        "category": category["name"],
                        "context": ctx["name"],
                        "description": ctx["description"],
                    })
    return matches


def print_tree():
    """Displays the context tree in ASCII format"""
    print("""
╔══════════════════════════════════════════════════════════════════════════════╗
║           🌳 PRODUCT × PRODUCT COMPATIBILITY CONTEXTS TREE                   ║
╚══════════════════════════════════════════════════════════════════════════════╝
""")
    
    categories = list(COMPATIBILITY_CONTEXTS.items())
    
    for i, (cat_key, category) in enumerate(categories):
        is_last_cat = (i == len(categories) - 1)
        cat_prefix = "└── " if is_last_cat else "├── "
        cat_line = "    " if is_last_cat else "│   "
        
        print(f"{cat_prefix}{category['icon']} {category['name'].upper()}")
        
        contexts = list(category["contexts"].items())
        for j, (ctx_key, ctx) in enumerate(contexts):
            is_last_ctx = (j == len(contexts) - 1)
            ctx_prefix = "└── " if is_last_ctx else "├── "
            ctx_line = "    " if is_last_ctx else "│   "
            
            print(f"{cat_line}{ctx_prefix}📌 {ctx['name']}")
            print(f"{cat_line}{ctx_line}   └─ {ctx['description']}")
            print(f"{cat_line}{ctx_line}      Ex: {ctx['example']}")
        
        if not is_last_cat:
            print(f"│")


def generate_mermaid_diagram():
    """Generates a Mermaid diagram for visualization"""
    lines = ["graph TD"]
    lines.append("    ROOT[🌳 Compatibility Contexts]")
    
    for cat_key, category in COMPATIBILITY_CONTEXTS.items():
        cat_id = cat_key.upper()
        lines.append(f"    ROOT --> {cat_id}[{category['icon']} {category['name']}]")
        
        for ctx_key, ctx in category["contexts"].items():
            ctx_id = f"{cat_key}_{ctx_key}".upper()
            lines.append(f"    {cat_id} --> {ctx_id}[📌 {ctx['name']}]")
    
    return "\n".join(lines)


# ═══════════════════════════════════════════════════════════════════════════
# MAIN - Display tree
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print_tree()
    
    print("\n" + "=" * 80)
    print("📊 MERMAID DIAGRAM (copy to https://mermaid.live)")
    print("=" * 80)
    print(generate_mermaid_diagram())
