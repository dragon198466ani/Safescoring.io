#!/usr/bin/env python3
"""
STRATEGIC ANALYSES FROM REAL JUSTIFICATIONS v9
==============================================
NATURAL LANGUAGE VERSION - Reads like expert advice, not templates.

Changes in v9:
- Natural language intros that vary by score and context
- Tone adapts: reassuring for high scores, direct for low scores
- Empty sections omitted (no warnings = no warning section)
- Flowing prose instead of rigid numbered lists
- Randomized phrasings to avoid repetition

For each product × pillar:
1. Collects ALL evaluations with their justifications
2. Groups failures by theme (extracts keywords from justifications)
3. Considers PRODUCT TYPE context (wallet vs exchange vs DeFi vs backup)
4. Generates NATURAL advice that sounds like an expert wrote it
"""
import sys
sys.path.insert(0, 'src')
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)) + '/..')

import requests
import json
import re
import random
from collections import defaultdict, Counter
from datetime import datetime, timezone
from core.config import SUPABASE_URL, get_supabase_headers

print("=" * 70)
print("CONTEXT-AWARE STRATEGIC ANALYSES v9 - NATURAL LANGUAGE")
print("Expert-quality advice that reads naturally")
print("=" * 70)

# =============================================================================
# NATURAL LANGUAGE VARIATIONS
# =============================================================================

def pick(variants):
    """Pick a random variant from a list."""
    return random.choice(variants)

# Intro phrases that vary by score level
SCORE_INTROS = {
    'excellent': [  # >= 85%
        "{product} handles {pillar_name} very well.",
        "Good news: {product} scores high on {pillar_name}.",
        "{product}'s {pillar_name} is solid.",
        "When it comes to {pillar_name}, {product} has you covered."
    ],
    'good': [  # >= 70%
        "{product} does reasonably well on {pillar_name}, with a few gaps.",
        "{product}'s {pillar_name} is decent but could be stronger.",
        "For {pillar_name}, {product} is above average but not perfect."
    ],
    'concerning': [  # >= 50%
        "{product} has notable {pillar_name} gaps you should know about.",
        "Heads up: {product}'s {pillar_name} needs attention.",
        "{product}'s {pillar_name} score reveals some concerns."
    ],
    'critical': [  # < 50%
        "{product} has serious {pillar_name} issues. Read carefully.",
        "Warning: {product} scores poorly on {pillar_name}.",
        "{product}'s {pillar_name} is weak. Here's what to do about it."
    ]
}

# Transition phrases for natural flow
TRANSITIONS = {
    'but': ["However, ", "That said, ", "On the flip side, ", "But ", "Keep in mind: "],
    'and': ["Also, ", "Plus, ", "Additionally, ", "And ", "What's more, "],
    'because': ["This matters because ", "Why? ", "Here's why: ", "The reason: "],
    'action': ["Here's what to do: ", "Your action plan: ", "To stay safe: ", "Protect yourself: "]
}

# Warning intros (only shown if warnings exist)
WARNING_INTROS = [
    "Specific concerns for {product}:",
    "Watch out for these issues:",
    "Based on the evaluation, be aware of:",
    "Key risks identified:"
]

# No-warning phrases (for high scores)
NO_ISSUES_PHRASES = [
    "No major concerns detected in this area.",
    "This pillar looks solid for {product}.",
    "You can focus your attention elsewhere - this area is covered."
]

headers = get_supabase_headers()

PILLARS = ['S', 'A', 'F', 'E']
PILLAR_NAMES = {'S': 'Security', 'A': 'Adversity', 'F': 'Fidelity', 'E': 'Ecosystem'}

# =============================================================================
# PILLAR-SPECIFIC HOW TO PROTECT (Concrete advice per pillar)
# =============================================================================
PILLAR_HOW_TO_PROTECT = {
    'S': {
        'title': 'HOW TO PROTECT - Security',
        'intro': 'Security protects your crypto from hackers, malware, and technical exploits.',
        'steps': [
            "1. USE STRONG AUTHENTICATION: Enable 2FA with Google Authenticator or Authy (NOT SMS). Use a unique 16+ character password.",
            "2. PROTECT YOUR DEVICE: Keep your phone/computer updated. Run antivirus weekly (Windows). Never jailbreak/root devices used for crypto.",
            "3. SECURE YOUR NETWORK: Never use public WiFi for crypto. Use a VPN (ProtonVPN, Mullvad) when outside home network.",
            "4. VERIFY EVERYTHING: Always verify wallet addresses character by character. Send small test amount first.",
            "5. LIMIT EXPOSURE: Use hardware wallet for savings (>$1000). Software wallet for daily spending only."
        ],
        'emergency': "IF COMPROMISED: 1) Transfer funds to NEW wallet immediately. 2) Revoke all token approvals at revoke.cash. 3) Check all connected accounts."
    },
    'A': {
        'title': 'HOW TO PROTECT - Adversity (Physical Threats)',
        'intro': 'Adversity protects you from PHYSICAL attacks: robbery, home invasion, kidnapping, coercion ($5 wrench attack), and targeted violence.',
        'steps': [
            "1. STAY DISCREET: NEVER tell anyone how much crypto you have. If asked, say 'I have a little'. No crypto stickers, no merch, no license plates.",
            "2. CREATE DECOY WALLET NOW: Set up a wallet with $50-200 visible. Memorize its PIN. If threatened, give THIS wallet. Practice your story: 'This is all I have.'",
            "3. HIDE YOUR MAIN WALLET: Use hidden apps (iOS: hide from home screen), secondary device stored elsewhere, or hardware wallet at another location (not your home).",
            "4. USE TIME-LOCKS/DELAYS: Enable 24-72h withdrawal delays. Under coercion, you physically CANNOT send funds immediately - this protects you.",
            "5. GEOGRAPHIC DISTRIBUTION: Keep funds in multiple locations. Safe deposit box, family member's house, buried backup. No single point of access."
        ],
        'emergency': "IF PHYSICALLY THREATENED: Your life > your crypto. Give the decoy wallet. Stay calm. Do NOT resist. Report to police AFTER you are safe. Your real funds are hidden."
    },
    'F': {
        'title': 'HOW TO PROTECT - Fidelity',
        'intro': 'Fidelity ensures your crypto survives disasters, company failures, and the passage of time.',
        'steps': [
            "1. BACKUP YOUR SEED PHRASE: Write 12/24 words on paper (pen, not pencil). Make 2 copies. NEVER digital/photo.",
            "2. STORE SECURELY: One copy at home in fireproof safe. Second copy at trusted family member's or bank deposit box.",
            "3. USE METAL BACKUP: For long-term storage, engrave on steel plate (Cryptosteel, Billfodl). Paper degrades.",
            "4. TEST YOUR BACKUP: Every 6 months, verify you can still read it. Test recovery on spare device.",
            "5. PLAN FOR INHERITANCE: Document how heirs can access funds. Consider dead man's switch services."
        ],
        'emergency': "IF BACKUP LOST: Transfer ALL funds to NEW wallet with new backup IMMEDIATELY. Old backup could be found by others."
    },
    'E': {
        'title': 'HOW TO PROTECT - Ecosystem',
        'intro': 'Ecosystem ensures your tools work well together and you can access all features.',
        'steps': [
            "1. CHECK COMPATIBILITY FIRST: Before buying tokens, verify your wallet supports that network/token standard.",
            "2. USE OFFICIAL SOURCES: Bookmark official URLs. Never Google 'metamask download' - use metamask.io directly.",
            "3. START SMALL: When trying new DeFi/dApps, test with $5-10 first. Wait 24h. Then increase.",
            "4. REVOKE UNUSED APPROVALS: Monthly, go to revoke.cash and remove token approvals you no longer need.",
            "5. DIVERSIFY TOOLS: Don't rely on one wallet/exchange. Have backup options ready."
        ],
        'emergency': "IF TOKENS STUCK: Don't panic - check block explorer (Etherscan). Tokens are on-chain, not in wallet app. Import token manually or use different wallet."
    }
}

# =============================================================================
# THEME EXTRACTION FROM JUSTIFICATIONS
# =============================================================================

def extract_themes_from_failures(failures):
    """
    Extract real themes/issues from failure justifications.
    Returns dict of theme -> list of specific issues found.
    """
    themes = defaultdict(list)

    for f in failures:
        why = (f.get('why', '') or '').strip()
        title = f.get('title', '')
        code = f.get('code', '')

        if not why or len(why) < 10:
            continue

        # Skip N/A or "no evidence" marked as NO - these are not real security failures
        why_lower = why.lower()
        if any(skip in why_lower for skip in [
            'not applicable', 'n/a', 'does not apply', 'not relevant',
            'hardware norm', 'software wallet', 'physical norm',
            'no evidence of', 'no support for', 'does not support',
            'not supported', 'chain not', 'network not'
        ]):
            continue

        # Categorize by detected themes in the justification
        categorized = False

        # Encryption/cryptography issues
        if any(kw in why_lower for kw in ['encrypt', 'cryptograph', 'aes', 'cipher', 'hash']):
            themes['encryption'].append({
                'norm': f"{code}: {title}",
                'issue': why[:200]
            })
            categorized = True

        # Key management issues
        if any(kw in why_lower for kw in ['key', 'seed', 'private', 'mnemonic', 'derivation']):
            themes['key_management'].append({
                'norm': f"{code}: {title}",
                'issue': why[:200]
            })
            categorized = True

        # Authentication issues
        if any(kw in why_lower for kw in ['2fa', 'two-factor', 'authenticat', 'password', 'biometric', 'pin']):
            themes['authentication'].append({
                'norm': f"{code}: {title}",
                'issue': why[:200]
            })
            categorized = True

        # Backup/recovery issues
        if any(kw in why_lower for kw in ['backup', 'recovery', 'restore', 'phrase']):
            themes['backup'].append({
                'norm': f"{code}: {title}",
                'issue': why[:200]
            })
            categorized = True

        # Privacy issues
        if any(kw in why_lower for kw in ['privacy', 'kyc', 'identit', 'anonym', 'track', 'data collect']):
            themes['privacy'].append({
                'norm': f"{code}: {title}",
                'issue': why[:200]
            })
            categorized = True

        # Hardware security (check FIRST - "physical secure element" is hardware, not physical attack)
        if any(kw in why_lower for kw in ['secure element', 'hardware security', 'hardware wallet', 'tamper', 'chip', 'hsm', 'trng', 'root of trust']):
            themes['hardware_security'].append({
                'norm': f"{code}: {title}",
                'issue': why[:200]
            })
            categorized = True

        # Physical/duress protection (ADVERSITY - actual physical attacks, NOT hardware security)
        # Exclude "physical secure element" which is hardware security
        elif 'physical secure element' not in why_lower and any(kw in why_lower for kw in [
            'duress', 'coercion', 'physical attack', 'hidden', 'panic', 'wipe',
            'plausible deniability', 'decoy', 'time-lock', 'time lock', 'delay',
            'passphrase wallet', 'hidden wallet', 'robbery', 'wrench', 'threat',
            'kidnap', 'extortion', 'force', 'violence'
        ]):
            themes['physical_protection'].append({
                'norm': f"{code}: {title}",
                'issue': why[:200]
            })
            categorized = True

        # Smart contract/audit issues
        if any(kw in why_lower for kw in ['audit', 'contract', 'vulnerability', 'exploit', 'bug bounty']):
            themes['audit'].append({
                'norm': f"{code}: {title}",
                'issue': why[:200]
            })
            categorized = True

        # Network/chain support
        if any(kw in why_lower for kw in ['chain', 'network', 'blockchain', 'layer', 'evm']):
            themes['network_support'].append({
                'norm': f"{code}: {title}",
                'issue': why[:200]
            })
            categorized = True

        # DeFi/integration
        if any(kw in why_lower for kw in ['defi', 'dapp', 'connect', 'swap', 'stake', 'lend']):
            themes['defi_integration'].append({
                'norm': f"{code}: {title}",
                'issue': why[:200]
            })
            categorized = True

        # Token support
        if any(kw in why_lower for kw in ['token', 'erc', 'nft', 'standard']):
            themes['token_support'].append({
                'norm': f"{code}: {title}",
                'issue': why[:200]
            })
            categorized = True

        # Company/reliability
        if any(kw in why_lower for kw in ['company', 'support', 'update', 'maintain', 'open source', 'transparenc']):
            themes['reliability'].append({
                'norm': f"{code}: {title}",
                'issue': why[:200]
            })
            categorized = True

        # Insurance/protection
        if any(kw in why_lower for kw in ['insurance', 'protect', 'custod', 'compensation']):
            themes['insurance'].append({
                'norm': f"{code}: {title}",
                'issue': why[:200]
            })
            categorized = True

        # If not categorized, put in general
        if not categorized:
            themes['other'].append({
                'norm': f"{code}: {title}",
                'issue': why[:200]
            })

    return themes


def extract_themes_from_strengths(strengths):
    """Extract real themes from passed evaluations."""
    themes = defaultdict(list)

    for s in strengths:
        why = (s.get('why', '') or '').strip()
        title = s.get('title', '')
        code = s.get('code', '')
        is_essential = s.get('is_essential', False)

        # Prioritize essential norms
        entry = {
            'norm': f"{code}: {title}",
            'reason': why[:150] if why else 'Compliant',
            'essential': is_essential
        }

        why_lower = (why + ' ' + title).lower()

        if any(kw in why_lower for kw in ['encrypt', 'cryptograph', 'secure']):
            themes['security'].append(entry)
        elif any(kw in why_lower for kw in ['backup', 'recovery', 'seed']):
            themes['backup'].append(entry)
        elif any(kw in why_lower for kw in ['privacy', 'anonym']):
            themes['privacy'].append(entry)
        elif any(kw in why_lower for kw in ['audit', 'verified', 'tested']):
            themes['audit'].append(entry)
        elif any(kw in why_lower for kw in ['chain', 'network', 'token']):
            themes['compatibility'].append(entry)
        elif any(kw in why_lower for kw in ['2fa', 'auth', 'biometric']):
            themes['authentication'].append(entry)
        else:
            themes['general'].append(entry)

    return themes


# =============================================================================
# SCENARIO GENERATORS FROM REAL DATA
# =============================================================================

# =============================================================================
# PRODUCT TYPE CONTEXT - Different advice based on product category
# =============================================================================

PRODUCT_TYPE_CATEGORIES = {
    # Hardware wallets - physical security matters
    'hardware': ['HW Cold', 'HW Air-Gap', 'HW Signing'],
    # Software wallets - convenience but less secure
    'software_wallet': ['SW Browser', 'SW Mobile', 'SW Desktop', 'MPC Wallet', 'MultiSig', 'Smart Wallet'],
    # Custodial - they hold your keys
    'custodial': ['CEX', 'Crypto Bank', 'Custody', 'Card', 'Staking Service'],
    # DeFi - smart contract risks
    'defi': ['DEX', 'DEX Agg', 'AMM', 'Lending', 'Yield', 'Liq Staking', 'Derivatives', 'Bridges',
             'Perps', 'Options', 'Synthetics', 'Index', 'Restaking', 'CrossAgg', 'Intent'],
    # Backup solutions
    'backup': ['Bkp Digital', 'Bkp Physical'],
    # Stablecoins and tokens
    'token': ['Stablecoin', 'Wrapped', 'LST', 'LRT'],
    # Layer 1/2 networks
    'network': ['L1 EVM', 'L1 Non-EVM', 'L2 Rollup', 'L2 Sidechain', 'L2 Validium', 'Cosmos', 'Polkadot']
}

def get_product_category(type_code):
    """Get the category of a product based on its type code."""
    for category, codes in PRODUCT_TYPE_CATEGORIES.items():
        if type_code in codes:
            return category
    return 'other'

TYPE_CONTEXT = {
    'hardware': {
        'context': "As a hardware wallet, physical security and backup procedures are critical.",
        'priority_themes': ['physical_protection', 'backup', 'key_management'],
        'specific_advice': {
            'S': "Hardware wallets excel at key isolation. Your main risk is physical theft or damage.",
            'A': "PHYSICAL THREAT: If someone finds your device, can you deny its contents? Use passphrase for hidden wallet. Store device outside home.",
            'F': "Hardware can fail. Metal backup is essential for long-term security.",
            'E': "Hardware wallets may have limited app support. Check compatibility before buying tokens."
        }
    },
    'software_wallet': {
        'context': "As a software wallet, your security depends on your device and habits.",
        'priority_themes': ['encryption', 'authentication', 'key_management'],
        'specific_advice': {
            'S': "Software wallets are only as secure as your device. Keep your phone/computer malware-free.",
            'A': "PHYSICAL THREAT: App is visible on your phone. Hide the app, or use a secondary device. Under coercion, you can't hide a visible app.",
            'F': "Cloud backups can be risky. Prefer offline backup of your recovery phrase.",
            'E': "Software wallets usually have good DeFi support. Verify URLs before connecting."
        }
    },
    'custodial': {
        'context': "As a custodial service, you don't control your keys - the company does.",
        'priority_themes': ['insurance', 'reliability', 'physical_protection'],
        'specific_advice': {
            'S': "Your funds depend on the platform's security. Check their track record and insurance.",
            'A': "PHYSICAL THREAT: Under coercion, you CAN transfer funds immediately. Enable whitelist delays (24-48h). Keep minimal amounts here.",
            'F': "If the company fails, you may lose access. Keep only trading amounts here.",
            'E': "Custodial platforms often have the best fiat on/off ramps and trading features."
        }
    },
    'defi': {
        'context': "As a DeFi protocol, smart contract security is paramount.",
        'priority_themes': ['audit', 'insurance', 'reliability'],
        'specific_advice': {
            'S': "Smart contracts can have bugs. Check for audits and start with small amounts.",
            'A': "PHYSICAL THREAT: DeFi has NO protection against coercion. If someone forces you, funds are gone. Use hardware wallet with time-locks.",
            'F': "Protocols can change or fail. Don't over-allocate to any single protocol.",
            'E': "Verify you're using the real protocol website. Phishing sites are common."
        }
    },
    'backup': {
        'context': "As a backup solution, durability and recoverability are key.",
        'priority_themes': ['backup', 'physical_protection', 'reliability'],
        'specific_advice': {
            'S': "Backups must be protected from theft. Consider fireproof storage.",
            'A': "PHYSICAL THREAT: If your backup is found, attacker has FULL access. Hide it well. Consider splitting (Shamir). Store outside home.",
            'F': "Test your backup periodically. Ensure it's still readable.",
            'E': "Backup solutions are passive. Ensure compatibility with your wallet."
        }
    },
    'token': {
        'context': "As a token/stablecoin, issuer reliability and peg stability are critical.",
        'priority_themes': ['reliability', 'audit', 'insurance'],
        'specific_advice': {
            'S': "Token security depends on the issuing protocol. Check their reserves.",
            'A': "PHYSICAL THREAT: Tokens in a hot wallet can be stolen under coercion. Store in hardware wallet with passphrase protection.",
            'F': "Tokens can depeg or fail. Don't hold 100% of your portfolio in one stablecoin.",
            'E': "Check token support before transfers. Some networks may not support certain tokens."
        }
    },
    'network': {
        'context': "As a blockchain network, consensus security and decentralization matter.",
        'priority_themes': ['audit', 'reliability', 'network_support'],
        'specific_advice': {
            'S': "Network security depends on validators/miners. Check decentralization level.",
            'A': "PHYSICAL THREAT: Network-level has no coercion protection. Your wallet choice determines your physical security.",
            'F': "Chain can face outages or attacks. Have funds on multiple networks.",
            'E': "Each network has its own ecosystem. Verify tool/wallet support before bridging."
        }
    }
}

# =============================================================================
# THEME SCENARIOS WITH CONCRETE "HOW TO" SOLUTIONS
# Each scenario includes: what can happen, how to protect yourself step-by-step
# =============================================================================

# =============================================================================
# SHORT SOLUTIONS BY THEME - Used for quick warnings
# =============================================================================

THEME_QUICK_SOLUTIONS = {
    'encryption': "Use VPN on public networks. Never access crypto on untrusted WiFi.",
    'key_management': "Write seed phrase on paper, store in 2 locations. NEVER digital.",
    'authentication': "Enable 2FA with Authenticator app (not SMS). Use unique password.",
    'backup': "Test your recovery phrase NOW on a spare device. Store offline.",
    'privacy': "Never share wallet address publicly. Don't reveal your holdings.",
    'physical_protection': "Create decoy wallet with $100. Enable withdrawal delays.",
    'audit': "Check for audit reports. Start with small amounts only.",
    'hardware_security': "Use hardware wallet for savings. This is for spending only.",
    'network_support': "Verify chain support BEFORE buying tokens.",
    'defi_integration': "Use separate hot wallet for DeFi. Keep savings separate.",
    'token_support': "Check block explorer if tokens don't appear. Import manually.",
    'reliability': "Keep recovery phrase - it works even if company dies.",
    'insurance': "Never put more than you can lose. Split across platforms."
}

THEME_SCENARIOS = {
    'encryption': {
        'scenario': "Your data isn't properly encrypted. A hacker on the same WiFi network could intercept your connection and steal your private keys.",
        'protection': "HOW TO PROTECT: 1) Never use public WiFi (coffee shops, airports) when accessing crypto. 2) At home, use WPA3 WiFi password. 3) Install a VPN like ProtonVPN or Mullvad ($5/month) - turn it ON before opening any crypto app. 4) If you MUST use public WiFi: only check balances, never send transactions."
    },
    'key_management': {
        'scenario': "Your private keys could be stolen if someone accesses your device - a thief, a repair technician, or malware.",
        'protection': "HOW TO PROTECT: 1) Write your 12/24 words on paper with a pen (never type them). 2) Make 2 copies. 3) Store one at home in a fireproof safe or hidden spot (not bedside drawer). 4) Store second copy at a trusted family member's house or bank safe deposit box. 5) NEVER: take a photo, save in notes app, email to yourself, or store in cloud."
    },
    'authentication': {
        'scenario': "Without 2FA, anyone who discovers your password can immediately empty your account - an ex-partner, a coworker who saw you type it, or a hacker.",
        'protection': "HOW TO PROTECT: 1) Enable 2FA TODAY using Google Authenticator or Authy app (NOT SMS - SIM swap attacks exist). 2) Use a unique 16+ character password you don't use anywhere else. 3) Consider a password manager like Bitwarden (free). 4) If 2FA isn't available: treat this like a hot wallet for small amounts only."
    },
    'backup': {
        'scenario': "If your phone breaks, gets stolen, or you accidentally delete the app, you lose ALL your crypto forever. No customer support can help you.",
        'protection': "HOW TO PROTECT: 1) BEFORE depositing any crypto, write down your recovery phrase. 2) TEST IT: try recovering on a different device or reinstall the app. 3) Only after successful test, transfer small amount first. 4) Set calendar reminder every 6 months to verify backup is still readable. 5) Store backup away from the device (if phone is stolen, backup shouldn't be in same bag)."
    },
    'privacy': {
        'scenario': "Your identity is linked to your wallet. Criminals can track your wealth on-chain and target you for robbery, extortion, or kidnapping.",
        'protection': "HOW TO PROTECT: 1) NEVER share your wallet address on social media. 2) NEVER tell anyone how much crypto you have - not friends, not dates, not colleagues. 3) If asked, say 'I have a little Bitcoin' even if you have more. 4) Use different wallets for different purposes: one for public donations/payments, one private for savings. 5) Consider using new addresses for each transaction."
    },
    'physical_protection': {
        'scenario': "PHYSICAL ATTACK SCENARIO: A robber breaks into your home. Criminals follow you from a crypto meetup. Someone sees your portfolio on your phone. They threaten you or your family with violence unless you transfer ALL crypto NOW. This is the '$5 wrench attack' - and it happens more than you think.",
        'protection': "HOW TO PROTECT FROM PHYSICAL ATTACKS: 1) CREATE A DECOY WALLET TODAY: $50-200 visible, memorize PIN, practice saying 'This is all I have'. 2) HIDE YOUR REAL WALLET: Different device stored OUTSIDE your home (safe deposit, family). 3) ENABLE TIME-LOCKS: 48-72h withdrawal delays mean you CANNOT comply even under torture. 4) PASSPHRASE WALLET (Ledger/Trezor): Main PIN shows decoy, passphrase shows real funds. 5) GEOGRAPHIC DISTRIBUTION: No single location has access to everything. 6) ABSOLUTE RULE: NEVER tell anyone your holdings. Not friends, not dates, not colleagues. If asked: 'I have a little Bitcoin, nothing serious.'"
    },
    'audit': {
        'scenario': "The code has never been professionally audited. Hidden bugs or backdoors could let hackers drain all user funds - it's happened many times in DeFi.",
        'protection': "HOW TO PROTECT: 1) Google '[protocol name] audit' - look for reports from Trail of Bits, OpenZeppelin, Consensys Diligence. 2) Check if they have a bug bounty program (sign of confidence). 3) Start with MAX 5% of your portfolio until trust is established. 4) Follow their Twitter/Discord for security announcements. 5) If no audit exists: treat it as high-risk gambling, not investment."
    },
    'hardware_security': {
        'scenario': "Without a secure chip, a sophisticated attacker could extract your private keys through physical access or malware - your phone's secure enclave isn't enough for large amounts.",
        'protection': "HOW TO PROTECT: 1) Use this product for 'spending money' only (max 1-2 months expenses). 2) Keep your SAVINGS on a hardware wallet with secure element (Ledger, Trezor, etc.). 3) Think of it like: this wallet = physical wallet in pocket, hardware wallet = bank vault. 4) Never store more here than you'd carry in cash."
    },
    'network_support': {
        'scenario': "You buy a token on a network this wallet doesn't support. The tokens arrive but you can't see or send them - they're stuck until you find another solution.",
        'protection': "HOW TO PROTECT: 1) BEFORE buying any token, check the wallet's supported networks list. 2) If unsure, send a tiny test amount ($1) first. 3) Keep a list of which wallet supports which chains. 4) Common setup: MetaMask for EVM chains, Phantom for Solana, Keplr for Cosmos. 5) Use a portfolio tracker (DeBank, Zapper) to see all assets across wallets."
    },
    'defi_integration': {
        'scenario': "You can't connect to DeFi apps. While others earn 5-15% APY, your crypto sits idle. When you try to swap tokens, you must transfer to another wallet first (paying fees twice).",
        'protection': "HOW TO PROTECT: 1) Accept this wallet's role: it's for secure STORAGE, not active DeFi use. 2) For DeFi activities, use a dedicated 'hot wallet' with good WalletConnect support. 3) Transfer only what you need for DeFi, keep main savings separate. 4) Workflow: Savings wallet → Hot wallet → DeFi → Hot wallet → Savings wallet."
    },
    'token_support': {
        'scenario': "You receive an NFT or new token but it doesn't show up in your wallet. You panic thinking it's lost - or worse, you can't sell it when the price is right.",
        'protection': "HOW TO PROTECT: 1) Don't panic - tokens are on blockchain, not in the wallet app. 2) Check your address on a block explorer (Etherscan, Solscan) - if it's there, it's safe. 3) For NFTs, use OpenSea or the NFT marketplace directly. 4) You can always import the token manually (find contract address on CoinGecko). 5) Consider a specialized NFT wallet if you're active in NFTs."
    },
    'reliability': {
        'scenario': "The company goes bankrupt, gets hacked, or abandons the project. Customer support disappears. Security updates stop. You're on your own.",
        'protection': "HOW TO PROTECT: 1) Your recovery phrase is your TRUE ownership - the app is just a viewer. 2) Test that your phrase works with another compatible wallet (most use BIP39 standard). 3) Keep the recovery phrase - it works forever, even if company dies. 4) Check: Is the wallet open-source? If yes, community can maintain it. 5) Have a backup wallet app ready that supports the same standard."
    },
    'insurance': {
        'scenario': "The platform gets hacked and loses all funds. Unlike your bank, there's NO insurance, NO refund, NO customer protection. You lose everything.",
        'protection': "HOW TO PROTECT: 1) NEVER store more than you can afford to lose completely on any single platform. 2) Split large holdings: 33% hardware wallet (you control), 33% major exchange with insurance (Coinbase, Kraken), 33% other. 3) Check if platform has insurance fund or proof of reserves. 4) For DeFi: consider protocols with built-in insurance (Nexus Mutual, InsurAce). 5) Mental rule: imagine this platform disappears tomorrow - would you be OK?"
    }
}


def generate_scenarios_from_themes(failure_themes, pillar, product_name, product_category, type_code):
    """Generate specific scenarios based on actual failure themes found and product context."""
    scenarios = []
    protections = []

    # Get product type context
    type_context = TYPE_CONTEXT.get(product_category, {})
    priority_themes = type_context.get('priority_themes', [])

    # Sort themes: prioritize themes relevant to this product type
    def theme_priority(item):
        theme, issues = item
        count = len(issues)
        # Boost priority themes for this product category
        if theme in priority_themes:
            count += 100  # Prioritize themes relevant to product type
        return count

    sorted_themes = sorted(failure_themes.items(), key=theme_priority, reverse=True)

    for theme, issues in sorted_themes[:5]:  # Top 5 themes
        if theme == 'other' or len(issues) == 0:
            continue

        if theme in THEME_SCENARIOS:
            base = THEME_SCENARIOS[theme]

            # Personalize with specific details from the justifications
            specific_issues = [i['issue'][:80] for i in issues[:2]]

            scenario = base['scenario']
            protection = base['protection']

            # Add specific details if we have them
            if specific_issues and len(specific_issues[0]) > 20:
                scenario = f"{scenario} Specifically: {specific_issues[0]}..."

            scenarios.append(scenario)
            protections.append(protection)

    return scenarios, protections


def generate_strengths_summary(strength_themes, pillar, total_passed):
    """Generate strengths summary from actual passed evaluations."""
    strengths = []

    # Add overall count
    if total_passed >= 10:
        strengths.append(f"Passed {total_passed} {PILLAR_NAMES[pillar].lower()} standards")

    # Add specific strengths from themes
    for theme, items in strength_themes.items():
        if theme == 'general' or len(items) == 0:
            continue

        # Prioritize essential items
        essential_items = [i for i in items if i.get('essential')]

        if essential_items:
            for item in essential_items[:2]:
                strengths.append(f"[ESSENTIAL] {item['norm'][:60]}")
        elif len(items) >= 3:
            # Theme has multiple strengths
            theme_name = theme.replace('_', ' ').title()
            strengths.append(f"Strong {theme_name}: {len(items)} standards met")

    return strengths[:5]


def generate_conclusion(product_name, pillar, score, failure_themes, strength_themes, total_failures, total_passed, product_category, type_name):
    """Generate personalized conclusion based on actual data and product context."""
    pillar_name = PILLAR_NAMES[pillar]

    # Count real issues (not N/A)
    real_issue_count = sum(len(v) for k, v in failure_themes.items() if k != 'other')

    # Determine assessment
    if score >= 90:
        assessment = f"excellent {pillar_name.lower()}"
        risk = "minimal"
    elif score >= 80:
        assessment = f"strong {pillar_name.lower()}"
        risk = "low"
    elif score >= 70:
        assessment = f"decent {pillar_name.lower()}"
        risk = "moderate"
    elif score >= 60:
        assessment = f"acceptable {pillar_name.lower()}"
        risk = "elevated"
    elif score >= 50:
        assessment = f"concerning {pillar_name.lower()}"
        risk = "significant"
    else:
        assessment = f"weak {pillar_name.lower()}"
        risk = "high"

    # Start with product type context
    type_context = TYPE_CONTEXT.get(product_category, {})
    type_specific = type_context.get('specific_advice', {}).get(pillar, '')

    conclusion = f"{product_name} ({type_name}) demonstrates {assessment} ({score:.1f}% compliance). "

    # Add type-specific context
    if type_specific:
        conclusion += f"{type_specific} "

    # Add specific insights based on what we found
    if real_issue_count > 0:
        # Find top issue themes
        top_themes = sorted(
            [(k, len(v)) for k, v in failure_themes.items() if k != 'other' and len(v) > 0],
            key=lambda x: x[1],
            reverse=True
        )[:2]

        if top_themes:
            theme_names = [t[0].replace('_', ' ') for t in top_themes]
            conclusion += f"Main concerns: {', '.join(theme_names)}. "

    if total_passed > 0:
        conclusion += f"Protected by {total_passed} validated standards. "

    conclusion += f"Overall {pillar_name.lower()} risk: {risk}."

    return conclusion


def generate_daily_habits(pillar, score, failure_themes, product_category):
    """Generate CONCRETE daily habits based on actual weaknesses found and product type."""
    habits = []

    # Type-specific CONCRETE habits first
    type_habits = {
        'hardware': {
            'S': [
                "DAILY: Store device in a locked drawer or safe when not in use - not on your desk",
                "BEFORE EACH USE: Verify computer is malware-free (run antivirus if Windows)"
            ],
            'A': [
                "NEVER tell anyone you own a hardware wallet - even friends",
                "TODAY: Create a decoy software wallet with $100 visible - memorize its PIN"
            ],
            'F': [
                "MONTHLY: Check manufacturer website for firmware updates",
                "YEARLY: Take out your metal backup and verify you can still read all 24 words"
            ],
            'E': ["BEFORE BUYING: Check supported coins at [product].com/supported-assets"]
        },
        'software_wallet': {
            'S': [
                "WEEKLY: Run full antivirus scan on your phone/computer",
                "RULE: Never install apps from outside official app stores"
            ],
            'A': ["TODAY: Move wallet app to a hidden folder or use app locker (AppLock, etc.)"],
            'F': ["TODAY: Write recovery phrase on paper, store away from phone"],
            'E': ["EVERY TIME: Type URLs manually or use bookmarks - never click links from emails/Discord"]
        },
        'custodial': {
            'S': [
                "TODAY: Enable 2FA with authenticator app (not SMS), set withdrawal whitelist",
                "WEEKLY: Check account activity and login history"
            ],
            'A': ["REMEMBER: They have your ID - your holdings can be traced to you"],
            'F': ["RULE: Keep only funds needed for trading; move rest to self-custody"],
            'E': ["EVERY WITHDRAWAL: Triple-check the address, send test amount first"]
        },
        'defi': {
            'S': [
                "MONTHLY: Go to revoke.cash and remove approvals you no longer need",
                "EVERY TIME: Verify contract address on official docs before interacting"
            ],
            'A': ["FOR LARGE AMOUNTS: Use a fresh wallet that's never been linked to your identity"],
            'F': ["WEEKLY: Check protocol's Twitter/Discord for governance changes"],
            'E': ["TODAY: Bookmark official protocol URL; never use Google search to find it"]
        },
        'backup': {
            'S': ["STORAGE: Keep in fireproof safe or waterproof container, not regular drawer"],
            'A': ["RULE: Only you should know where backups are stored - not spouse, not kids"],
            'F': ["EVERY 6 MONTHS: Check that backup is still readable and hasn't degraded"],
            'E': ["BEFORE BUYING: Confirm your wallet generates standard BIP39 phrases"]
        },
        'token': {
            'S': ["WEEKLY: Check token issuer's Twitter for security announcements"],
            'A': ["KNOW THIS: Your on-chain balance is PUBLIC - act accordingly"],
            'F': ["RULE: Never hold >30% portfolio in single stablecoin - they can depeg"],
            'E': ["BEFORE TRANSFER: Verify contract address on CoinGecko or official site"]
        },
        'network': {
            'S': ["IF STAKING: Only use validators with proven track record and slashing insurance"],
            'A': ["FOR PRIVACY: Consider using Aztec, Railgun, or other privacy layers"],
            'F': ["RULE: Keep funds on at least 2-3 different chains for resilience"],
            'E': ["BEFORE BRIDGING: Check bridge's TVL, audit status, and recent incidents"]
        }
    }

    # Add type-specific habits
    category_habits = type_habits.get(product_category, {})
    if pillar in category_habits:
        habits.extend(category_habits[pillar])

    # Generic CONCRETE habits by pillar
    pillar_habits = {
        'S': [
            "DAILY: Open app and check balance - unusual activity means immediate action",
            "WHEN UPDATE AVAILABLE: Install within 48 hours - delays = vulnerability window",
            "GOLDEN RULE: Anyone asking for your seed phrase is a scammer - NO exceptions"
        ],
        'A': [
            "SOCIAL RULE: If someone asks about crypto, say 'I have a little' - never amounts",
            "TODAY: Decide what you'd do if someone threatened you for crypto - have a plan",
            "IN PUBLIC: Never open wallet app where others can see screen"
        ],
        'F': [
            "EVERY 6 MONTHS: Take out backup and verify you can still read it",
            "BACKUP RULE: Store in 2+ locations - fire/flood can destroy one",
            "MONTHLY: Check product's Twitter/blog for updates that might affect you"
        ],
        'E': [
            "BEFORE TRYING NEW FEATURE: Test with $5 first, then wait 24h, then try with more",
            "BEFORE BUYING NEW TOKEN: Verify this wallet supports that chain",
            "TODAY: Bookmark official docs/tutorials - you'll need them eventually"
        ]
    }

    # Add specific habits based on actual weaknesses found
    if 'encryption' in failure_themes and len(failure_themes['encryption']) > 0:
        habits.insert(0, "CRITICAL: Never use this product on public WiFi - only secure home/work network")

    if 'authentication' in failure_themes and len(failure_themes['authentication']) > 0:
        habits.insert(0, "EVERY SESSION: Log out when done; MONTHLY: Change your password")

    if 'backup' in failure_themes and len(failure_themes['backup']) > 0:
        habits.insert(0, "BEFORE DEPOSITING: Test recovery on different device first")

    if 'privacy' in failure_themes and len(failure_themes['privacy']) > 0:
        habits.insert(0, "PRIVACY WEAK: Assume all your transactions are tracked - be discreet about holdings")

    if 'physical_protection' in failure_themes and len(failure_themes['physical_protection']) > 0:
        habits.insert(0, "PHYSICAL THREAT PREP: Create decoy wallet TODAY. Practice your story. Hide main wallet outside home.")

    # Fill with base habits
    base_habits = pillar_habits.get(pillar, pillar_habits['S'])
    habits.extend(base_habits)

    # Remove duplicates while preserving order
    seen = set()
    unique_habits = []
    for h in habits:
        if h not in seen:
            seen.add(h)
            unique_habits.append(h)

    return unique_habits[:5]


def generate_pillar_how_to_protect(pillar, score, failure_themes, product_category, product_name, type_name):
    """
    Generate NATURAL HOW TO PROTECT advice for a specific pillar.
    v9: Flows like expert advice, adapts tone to score, omits empty sections.
    """
    base = PILLAR_HOW_TO_PROTECT[pillar]
    type_context = TYPE_CONTEXT.get(product_category, {})
    type_specific = type_context.get('specific_advice', {}).get(pillar, '')
    pillar_name = PILLAR_NAMES[pillar]

    # Determine score category for tone
    if score >= 85:
        score_cat = 'excellent'
        risk_level = 'LOW'
    elif score >= 70:
        score_cat = 'good'
        risk_level = 'MODERATE'
    elif score >= 50:
        score_cat = 'concerning'
        risk_level = 'HIGH'
    else:
        score_cat = 'critical'
        risk_level = 'CRITICAL'

    # Build NATURAL intro (varies by score)
    intro_template = pick(SCORE_INTROS[score_cat])
    intro = intro_template.format(product=product_name, pillar_name=pillar_name.lower())

    # Add score context naturally
    if score >= 85:
        intro += f" With {score:.0f}% compliance, you can rely on standard best practices."
    elif score >= 70:
        intro += f" At {score:.0f}%, there's room for improvement - see the specific points below."
    elif score >= 50:
        intro += f" At only {score:.0f}%, you'll need to take extra precautions."
    else:
        intro += f" At {score:.0f}%, this is a weak point. Take these steps seriously."

    # Add type context naturally (not as separate field)
    if type_specific:
        intro += f" {type_specific}"

    # Build personalized warnings FROM ACTUAL FAILURES
    # Format: [CODE] Issue + HOW TO AVOID IT
    warnings = []

    # Phrases that indicate a template/N/A justification (not user-friendly)
    template_phrases = [
        'physical norm', 'hardware norm', 'n/a for', 'not applicable',
        'without dedicated hardware', 'requires physical secure element',
        'no evidence of', 'does not require', 'custodial regulations',
        'defi standards apply', 'does not apply'
    ]

    # Track themes we've added warnings for (to add solutions per theme)
    themes_with_warnings = set()

    for theme, issues in failure_themes.items():
        if theme == 'other' or not issues:
            continue

        # Extract warning from each issue
        for issue in issues[:2]:  # Max 2 per theme
            norm_info = issue.get('norm', '')  # "CODE: Title"
            actual_issue = issue.get('issue', '')

            # Parse norm code and title
            if ':' in norm_info:
                norm_code, norm_title = norm_info.split(':', 1)
                norm_code = norm_code.strip()
                norm_title = norm_title.strip()
            else:
                norm_code = norm_info.strip()
                norm_title = ''

            # Check if justification is a template/N/A message
            issue_lower = actual_issue.lower() if actual_issue else ''
            is_template = any(phrase in issue_lower for phrase in template_phrases)

            if is_template or len(actual_issue) < 20:
                # USE NORM TITLE instead of template justification
                if norm_title and len(norm_title) > 5:
                    warning_text = f"Missing: {norm_title}"
                    if len(warning_text) > 80:
                        warning_text = warning_text[:77] + "..."
                    warnings.append({
                        'issue': f"[{norm_code}] {warning_text}",
                        'theme': theme
                    })
                    themes_with_warnings.add(theme)
            else:
                # Use actual justification (cleaned up)
                if ':' in actual_issue[:50]:
                    actual_issue = actual_issue.split(':', 1)[-1].strip()
                if len(actual_issue) > 100:
                    actual_issue = actual_issue[:97] + "..."
                warnings.append({
                    'issue': f"[{norm_code}] {actual_issue}",
                    'theme': theme
                })
                themes_with_warnings.add(theme)

    # Build final warnings: group by theme, deduplicate, add solutions
    theme_warnings = {}
    seen_codes = set()

    for w in warnings:
        theme = w['theme']
        issue_text = w['issue']

        # Extract norm code to avoid duplicates
        code = issue_text.split(']')[0].replace('[', '').strip() if ']' in issue_text else ''
        if code in seen_codes:
            continue
        seen_codes.add(code)

        if theme not in theme_warnings:
            theme_warnings[theme] = {
                'issues': [],
                'solution': THEME_QUICK_SOLUTIONS.get(theme, '')
            }

        if len(theme_warnings[theme]['issues']) < 2:  # Max 2 issues per theme
            theme_warnings[theme]['issues'].append(issue_text)

    # Build final list: issues grouped by theme + solution after each group
    final_warnings = []
    for theme, data in list(theme_warnings.items())[:3]:  # Max 3 themes
        for issue in data['issues']:
            final_warnings.append(issue)
        if data['solution']:
            final_warnings.append(f"  -> {data['solution']}")

    warnings = final_warnings

    # Build the how_to object
    how_to = {
        'title': f"{pillar_name} Protection",  # Simpler title
        'intro': intro,
        'risk_level': risk_level
    }

    # ALWAYS include warnings if there are any - even for high scores
    # A 92% score still has 8% failures that matter
    if warnings:
        if score >= 85:
            how_to['warnings_intro'] = pick([
                f"Even with a good score, {product_name} has these gaps:",
                f"Minor issues to be aware of:",
                f"Not perfect - watch out for:"
            ])
        else:
            how_to['warnings_intro'] = pick(WARNING_INTROS).format(product=product_name)
        how_to['personalized_warnings'] = warnings[:3]
    else:
        # Only show reassurance if truly NO warnings detected
        how_to['status'] = pick(NO_ISSUES_PHRASES).format(product=product_name)

    # Steps based on score - but always relevant
    if score < 70:
        # Low scores: all steps with urgency
        how_to['action_intro'] = pick(TRANSITIONS['action'])
        how_to['steps'] = base['steps'].copy()
    elif score < 85:
        # Medium scores: key steps
        how_to['tips_intro'] = "Key practices to maintain:"
        how_to['steps'] = base['steps'][:3]
    else:
        # High scores: focused on actual weaknesses if any
        if warnings:
            how_to['tips_intro'] = "Focus on these to address the gaps:"
            # Pick steps relevant to detected issues
            how_to['steps'] = base['steps'][:2]
        else:
            how_to['tips_intro'] = "Just maintain good habits:"
            how_to['steps'] = [base['steps'][0]]

    # Emergency for low scores OR if critical themes detected
    critical_themes = ['physical_protection', 'encryption', 'backup']
    has_critical = any(t in failure_themes and len(failure_themes[t]) > 0 for t in critical_themes)
    if score < 70 or has_critical:
        how_to['emergency'] = base['emergency']

    # Natural risk summary
    risk_summaries = {
        'LOW': f"Overall, {product_name} handles {pillar_name.lower()} well. Standard precautions apply.",
        'MODERATE': f"{product_name} is decent on {pillar_name.lower()}, but review the points above.",
        'HIGH': f"Take the {pillar_name.lower()} concerns seriously. Consider alternatives for large amounts.",
        'CRITICAL': f"{pillar_name} is a real weakness for {product_name}. Use only for testing or trivial amounts."
    }
    how_to['risk_summary'] = risk_summaries[risk_level]

    return how_to


def generate_global_summary(product_name, type_name, product_category, pillar_analyses):
    """
    Generate a NATURAL GLOBAL SUMMARY that synthesizes all 4 pillars.
    v9: Reads like an expert wrote it, not a template.
    """
    if not pillar_analyses:
        return None

    # Calculate overall SAFE score
    scores = {a['pillar']: a['pillar_score'] for a in pillar_analyses}
    overall_score = sum(scores.values()) / len(scores) if scores else 0

    # Determine overall rating with natural language
    if overall_score >= 85:
        rating = "EXCELLENT"
        rating_phrase = pick([
            f"{product_name} is a solid choice overall.",
            f"You can trust {product_name} for most use cases.",
            f"{product_name} checks most boxes."
        ])
    elif overall_score >= 75:
        rating = "GOOD"
        rating_phrase = pick([
            f"{product_name} is reliable, with a few areas to watch.",
            f"Overall positive - {product_name} does most things right.",
            f"{product_name} is above average, but not flawless."
        ])
    elif overall_score >= 65:
        rating = "ACCEPTABLE"
        rating_phrase = pick([
            f"{product_name} works, but proceed with awareness.",
            f"Usable, but keep an eye on {product_name}'s weak spots.",
            f"{product_name} has gaps you should compensate for."
        ])
    elif overall_score >= 50:
        rating = "CONCERNING"
        rating_phrase = pick([
            f"Think twice before using {product_name} for large amounts.",
            f"{product_name} has issues. Consider alternatives for serious holdings.",
            f"Use {product_name} cautiously - it has real weaknesses."
        ])
    else:
        rating = "RISKY"
        rating_phrase = pick([
            f"{product_name} isn't ready for serious use.",
            f"Major concerns with {product_name}. Testing only.",
            f"Avoid {product_name} for anything you can't afford to lose."
        ])

    # Find strongest and weakest pillars
    if scores:
        strongest = max(scores.items(), key=lambda x: x[1])
        weakest = min(scores.items(), key=lambda x: x[1])
    else:
        strongest = ('S', 0)
        weakest = ('S', 0)

    strongest_name = PILLAR_NAMES[strongest[0]]
    weakest_name = PILLAR_NAMES[weakest[0]]

    # Collect all critical warnings from all pillars
    all_warnings = []
    for a in pillar_analyses:
        if 'how_to_protect' in a and a['how_to_protect']:
            warnings = a['how_to_protect'].get('personalized_warnings', [])
            all_warnings.extend(warnings)

    # Build NATURAL executive summary
    exec_parts = [f"{product_name} scores {overall_score:.0f}% overall."]

    # Strengths naturally
    if strongest[1] >= 80:
        exec_parts.append(f"{strongest_name} ({strongest[1]:.0f}%) is where it shines.")
    elif strongest[1] >= 60:
        exec_parts.append(f"Best area: {strongest_name} at {strongest[1]:.0f}%.")

    # Weaknesses naturally
    if weakest[1] < 60:
        exec_parts.append(f"Watch out for {weakest_name} ({weakest[1]:.0f}%) - that's the weak spot.")
    elif weakest[1] < 75:
        exec_parts.append(f"{weakest_name} ({weakest[1]:.0f}%) could use attention.")

    exec_parts.append(rating_phrase)

    # Build NATURAL recommendations based on actual situation
    recommendations = []

    if strongest[1] >= 80:
        recommendations.append(f"{product_name} excels at {strongest_name.lower()} - leverage that.")

    if weakest[1] < 70:
        recommendations.append(f"Compensate for {weakest_name.lower()} gaps with the tips in that section.")

    if all_warnings:
        recommendations.append("Address the specific warnings listed above.")
    else:
        recommendations.append("No critical issues found - maintain standard practices.")

    recommendations.append("Re-check periodically - products evolve.")

    # Build global summary
    summary = {
        'product_name': product_name,
        'product_type': type_name,
        'product_category': product_category,
        'overall_safe_score': round(overall_score, 1),
        'rating': rating,
        'pillar_scores': {
            'S': round(scores.get('S', 0), 1),
            'A': round(scores.get('A', 0), 1),
            'F': round(scores.get('F', 0), 1),
            'E': round(scores.get('E', 0), 1)
        },
        'strongest_pillar': {
            'pillar': strongest[0],
            'name': strongest_name,
            'score': round(strongest[1], 1)
        },
        'weakest_pillar': {
            'pillar': weakest[0],
            'name': weakest_name,
            'score': round(weakest[1], 1)
        },
        'executive_summary': ' '.join(exec_parts),
        'recommendations': recommendations
    }

    # Only include concerns if there are any
    if all_warnings:
        summary['top_concerns'] = all_warnings[:5]

    # Add type-specific global advice
    type_context = TYPE_CONTEXT.get(product_category, {})
    if type_context:
        summary['type_context'] = type_context.get('context', '')

    return summary


# =============================================================================
# LOAD DATA (with retry logic for timeouts)
# =============================================================================
import time

def fetch_with_retry(url, headers, timeout=120, retries=3):
    """Fetch URL with retry logic for timeouts."""
    for attempt in range(retries):
        try:
            r = requests.get(url, headers=headers, timeout=timeout)
            if r.status_code in [200, 206]:
                return r
            elif r.status_code == 500 and 'timeout' in r.text.lower():
                print(f"      Timeout, retrying ({attempt+1}/{retries})...")
                time.sleep(2)
                continue
            else:
                return r
        except requests.exceptions.Timeout:
            print(f"      Timeout, retrying ({attempt+1}/{retries})...")
            time.sleep(2)
        except Exception as e:
            print(f"      Error: {e}, retrying ({attempt+1}/{retries})...")
            time.sleep(2)
    return None

print("\n[1/5] Loading norms...")
norms_map = {}
offset = 0
while True:
    h = headers.copy()
    h['Range'] = f'{offset}-{offset+999}'
    r = fetch_with_retry(f'{SUPABASE_URL}/rest/v1/norms?select=id,pillar,code,title,is_essential', h)
    if not r or r.status_code not in [200, 206] or not r.json():
        break
    for n in r.json():
        norms_map[n['id']] = n
    if len(r.json()) < 1000:
        break
    offset += 1000
print(f"   Loaded: {len(norms_map)} norms")

print("\n[2/5] Loading products...")
products = []
offset = 0
while True:
    h = headers.copy()
    h['Range'] = f'{offset}-{offset+999}'
    r = fetch_with_retry(f'{SUPABASE_URL}/rest/v1/products?select=id,name,slug,type_id', h)
    if not r or r.status_code not in [200, 206] or not r.json():
        break
    products.extend(r.json())
    if len(r.json()) < 1000:
        break
    offset += 1000
products_map = {p['id']: p for p in products}
print(f"   Loaded: {len(products)} products")

types_map = {}
r = fetch_with_retry(f'{SUPABASE_URL}/rest/v1/product_types?select=id,name,code', headers)
if r and r.status_code == 200:
    for t in r.json():
        types_map[t['id']] = t
print(f"   Loaded: {len(types_map)} types")

print("\n[3/5] Loading ALL evaluations with justifications...")
print("   This may take several minutes...")
evaluations = []
offset = 0
batch = 0
consecutive_errors = 0
while True:
    batch += 1
    if batch % 50 == 0:
        print(f"   Batch {batch}: {len(evaluations)} evaluations...")
    h = headers.copy()
    h['Range'] = f'{offset}-{offset+999}'
    r = fetch_with_retry(
        f'{SUPABASE_URL}/rest/v1/evaluations?select=product_id,norm_id,result,why_this_result',
        h, timeout=120
    )
    if not r:
        consecutive_errors += 1
        if consecutive_errors >= 3:
            print(f"   Too many errors, stopping at {len(evaluations)} evaluations")
            break
        continue
    consecutive_errors = 0
    if r.status_code not in [200, 206] or not r.json():
        break
    evaluations.extend(r.json())
    if len(r.json()) < 1000:
        break
    offset += 1000
print(f"   Total: {len(evaluations)} evaluations")

print("\n[4/5] Grouping evaluations by product x pillar...")
product_pillar_evals = defaultdict(lambda: defaultdict(list))

for e in evaluations:
    norm_id = e.get('norm_id')
    if norm_id not in norms_map:
        continue
    norm = norms_map[norm_id]
    pillar = norm.get('pillar')
    pid = e.get('product_id')
    if not pillar or not pid:
        continue

    product_pillar_evals[pid][pillar].append({
        'result': e.get('result'),
        'why': e.get('why_this_result', ''),
        'code': norm.get('code', ''),
        'title': norm.get('title', ''),
        'is_essential': norm.get('is_essential', False)
    })

print(f"   Grouped: {len(product_pillar_evals)} products with evaluations")

# =============================================================================
# GENERATE ANALYSES
# =============================================================================
print("\n[5/6] Generating analyses from real justifications...")

analyses = []
global_summaries = []
total = len(product_pillar_evals)
count = 0

for product_id, pillars_data in product_pillar_evals.items():
    count += 1

    if product_id not in products_map:
        continue

    product = products_map[product_id]
    product_name = product['name']
    type_info = types_map.get(product.get('type_id'), {})
    type_name = type_info.get('name', 'Unknown')
    type_code = type_info.get('code', '')
    product_category = get_product_category(type_code)

    if count % 100 == 0:
        print(f"   Progress: {count}/{total} ({count/total*100:.1f}%)")

    product_analyses = []  # Collect all pillar analyses for this product

    for pillar in PILLARS:
        evals = pillars_data.get(pillar, [])
        if not evals:
            continue

        # Calculate score
        yes = sum(1 for e in evals if e['result'] in ['YES', 'YESp'])
        no = sum(1 for e in evals if e['result'] == 'NO')
        tbd = sum(1 for e in evals if e['result'] == 'TBD')
        total_eval = yes + no
        score = (yes * 100.0 / total_eval) if total_eval > 0 else 0
        confidence = 0.95 if total_eval >= 50 else 0.90 if total_eval >= 20 else 0.80

        if total_eval < 5:
            continue

        # Separate failures and strengths
        failures = [e for e in evals if e['result'] == 'NO']
        strengths = [e for e in evals if e['result'] in ['YES', 'YESp']]

        # EXTRACT THEMES FROM REAL JUSTIFICATIONS
        failure_themes = extract_themes_from_failures(failures)
        strength_themes = extract_themes_from_strengths(strengths)

        # GENERATE FROM REAL DATA WITH PRODUCT TYPE CONTEXT
        scenarios, protections = generate_scenarios_from_themes(failure_themes, pillar, product_name, product_category, type_code)
        strengths_summary = generate_strengths_summary(strength_themes, pillar, yes)
        conclusion = generate_conclusion(product_name, pillar, score, failure_themes, strength_themes, no, yes, product_category, type_name)
        daily_habits = generate_daily_habits(pillar, score, failure_themes, product_category)

        # NEW: Generate pillar-specific HOW TO PROTECT
        how_to_protect = generate_pillar_how_to_protect(pillar, score, failure_themes, product_category, product_name, type_name)

        analysis = {
            'product_id': product_id,
            'pillar': pillar,
            'pillar_score': round(score, 2),
            'confidence_score': confidence,
            'strategic_conclusion': conclusion,
            'key_strengths': strengths_summary,
            'key_weaknesses': scenarios,  # Worst-case scenarios from real failures
            'critical_risks': protections,  # Specific theme-based protections
            'recommendations': daily_habits,  # Daily habits (type-specific)
            'how_to_protect': how_to_protect,  # NEW: Pillar-specific HOW TO PROTECT
            'evaluated_norms_count': len(evals),
            'passed_norms_count': yes,
            'failed_norms_count': no,
            'tbd_norms_count': tbd,
            'community_vote_count': 0,
            'generated_by': 'natural_language_v9',
            'generated_at': datetime.now(timezone.utc).isoformat()
        }

        analyses.append(analysis)
        product_analyses.append(analysis)

    # NEW: Generate GLOBAL SUMMARY for this product (after all pillars)
    if len(product_analyses) >= 2:  # At least 2 pillars evaluated
        global_summary = generate_global_summary(product_name, type_name, product_category, product_analyses)
        if global_summary:
            global_summary['product_id'] = product_id
            global_summary['generated_by'] = 'context_aware_analysis_v8'
            global_summary['generated_at'] = datetime.now(timezone.utc).isoformat()
            global_summaries.append(global_summary)

print(f"\n   Generated: {len(analyses)} pillar analyses")
print(f"   Generated: {len(global_summaries)} global summaries")

# =============================================================================
# IMPORT TO DATABASE
# =============================================================================
print("\n[6/6] Importing to database...")

import_headers = get_supabase_headers(use_service_key=True, prefer='resolution=merge-duplicates')
batch_size = 50
imported = 0
errors = 0

# First, check if how_to_protect column exists by testing with first record
test_batch = [analyses[0]] if analyses else []
include_how_to_protect = True

if test_batch:
    r = requests.post(
        f'{SUPABASE_URL}/rest/v1/product_pillar_analyses?on_conflict=product_id,pillar',
        json=test_batch,
        headers=import_headers,
        timeout=30
    )
    if r.status_code == 400 and 'how_to_protect' in r.text:
        print("   [!] Column 'how_to_protect' doesn't exist yet.")
        print("   Run this SQL in Supabase Dashboard:")
        print("   ALTER TABLE product_pillar_analyses ADD COLUMN IF NOT EXISTS how_to_protect JSONB;")
        print("   ALTER TABLE products ADD COLUMN IF NOT EXISTS safe_global_summary JSONB;")
        print("")
        print("   For now, importing WITHOUT how_to_protect field...")
        include_how_to_protect = False
    elif r.status_code in [200, 201]:
        imported += 1
        print("   how_to_protect column exists, proceeding with full import...")

# Import pillar analyses
print("   Importing pillar analyses...")
for i in range(0 if include_how_to_protect else 1, len(analyses), batch_size):  # Skip first if already imported
    batch = analyses[i:i+batch_size]

    # Remove how_to_protect if column doesn't exist
    if not include_how_to_protect:
        batch = [{k: v for k, v in a.items() if k != 'how_to_protect'} for a in batch]

    try:
        r = requests.post(
            f'{SUPABASE_URL}/rest/v1/product_pillar_analyses?on_conflict=product_id,pillar',
            json=batch,
            headers=import_headers,
            timeout=60
        )
        if r.status_code in [200, 201]:
            imported += len(batch)
            if imported % 500 == 0 or imported >= len(analyses):
                print(f"   Pillar analyses: {imported}/{len(analyses)} ({imported/len(analyses)*100:.1f}%)")
        else:
            errors += 1
            if errors == 1:
                print(f"   First error: {r.status_code} - {r.text[:200]}")
    except Exception as e:
        errors += 1

# Import global summaries (to products table or separate table)
print("\n   Importing global summaries...")
summary_imported = 0
summary_errors = 0
skip_db_summary = False

# Test if safe_global_summary column exists
if global_summaries:
    test_gs = global_summaries[0]
    r = requests.patch(
        f'{SUPABASE_URL}/rest/v1/products?id=eq.{test_gs["product_id"]}',
        json={'safe_global_summary': json.dumps(test_gs, ensure_ascii=False)},
        headers=import_headers,
        timeout=30
    )
    if r.status_code == 400 and 'safe_global_summary' in r.text:
        print("   [!] Column 'safe_global_summary' doesn't exist yet.")
        print("   Skipping DB import, saving to JSON file only...")
        skip_db_summary = True
    elif r.status_code in [200, 204]:
        summary_imported += 1

if not skip_db_summary:
    for gs in global_summaries[1:]:  # Skip first if already imported
        try:
            update_data = {
                'safe_global_summary': json.dumps(gs, ensure_ascii=False)
            }
            r = requests.patch(
                f'{SUPABASE_URL}/rest/v1/products?id=eq.{gs["product_id"]}',
                json=update_data,
                headers=import_headers,
                timeout=30
            )
            if r.status_code in [200, 204]:
                summary_imported += 1
            else:
                summary_errors += 1
        except Exception as e:
            summary_errors += 1

        if summary_imported % 100 == 0 and summary_imported > 0:
            print(f"   Global summaries: {summary_imported}/{len(global_summaries)}")

print(f"   Global summaries: {summary_imported}/{len(global_summaries)}")

# Also save to JSON files for backup
print("\n   Saving to files...")
with open('data/global_summaries.json', 'w', encoding='utf-8') as f:
    json.dump(global_summaries, f, ensure_ascii=False, indent=2)
print(f"   Saved global summaries to data/global_summaries.json")

with open('data/pillar_analyses_v9.json', 'w', encoding='utf-8') as f:
    json.dump(analyses, f, ensure_ascii=False, indent=2)
print(f"   Saved pillar analyses to data/pillar_analyses_v9.json")

print("\n" + "=" * 70)
print("COMPLETE!")
print("=" * 70)
print(f"Pillar analyses: {len(analyses)} generated | {imported} imported | {errors} errors")
print(f"Global summaries: {len(global_summaries)} generated | {summary_imported} imported | {summary_errors} errors")

pillar_counts = defaultdict(int)
for a in analyses:
    pillar_counts[a['pillar']] += 1

print("\nBy pillar:")
for p in PILLARS:
    print(f"  {p} ({PILLAR_NAMES[p]}): {pillar_counts[p]}")

# Show sample PILLAR analysis
print("\n" + "-" * 70)
print("SAMPLE PILLAR ANALYSIS:")
print("-" * 70)
sample = next((a for a in analyses if len(a['key_weaknesses']) > 0), analyses[0] if analyses else None)
if sample:
    print(f"Product ID: {sample['product_id']}")
    print(f"Pillar: {sample['pillar']} ({PILLAR_NAMES[sample['pillar']]}) | Score: {sample['pillar_score']}%")
    print(f"\nConclusion: {sample['strategic_conclusion'][:200]}...")
    print(f"\nWorst-case scenarios:")
    for i, s in enumerate(sample['key_weaknesses'][:2], 1):
        print(f"  {i}. {s[:120]}...")
    print(f"\nHow to protect (scenario-specific):")
    for i, p in enumerate(sample['critical_risks'][:2], 1):
        print(f"  {i}. {p[:120]}...")

    # Show the new HOW TO PROTECT
    htp = sample.get('how_to_protect', {})
    if htp:
        print(f"\n--- HOW TO PROTECT ({htp.get('title', 'N/A')}) ---")
        print(f"Intro: {htp.get('intro', 'N/A')}")
        print(f"Context: {htp.get('product_context', 'N/A')}")
        print(f"Risk Level: {htp.get('risk_level', 'N/A')}")
        print(f"Risk Summary: {htp.get('risk_summary', 'N/A')}")
        if htp.get('personalized_warnings'):
            print("Warnings:")
            for w in htp['personalized_warnings'][:2]:
                print(f"  - {w}")
        print("Steps:")
        for s in htp.get('steps', [])[:3]:
            print(f"  - {s}")
        print(f"Emergency: {htp.get('emergency', 'N/A')[:100]}...")

# Show sample GLOBAL SUMMARY
print("\n" + "-" * 70)
print("SAMPLE GLOBAL SUMMARY:")
print("-" * 70)
if global_summaries:
    gs = global_summaries[0]
    print(f"Product: {gs['product_name']} ({gs['product_type']})")
    print(f"Category: {gs['product_category']}")
    print(f"Overall SAFE Score: {gs['overall_safe_score']}% ({gs['rating']})")
    print(f"\nPillar Scores:")
    for p, score in gs['pillar_scores'].items():
        print(f"  {p} ({PILLAR_NAMES[p]}): {score:.1f}%")
    print(f"\nStrongest: {gs['strongest_pillar']['name']} ({gs['strongest_pillar']['score']:.1f}%)")
    print(f"Weakest: {gs['weakest_pillar']['name']} ({gs['weakest_pillar']['score']:.1f}%)")
    print(f"\nExecutive Summary: {gs['executive_summary']}")
    print(f"\nTop Concerns:")
    for c in gs.get('top_concerns', [])[:3]:
        print(f"  - {c}")
    print(f"\nQuick Recommendations:")
    for r in gs.get('quick_recommendations', []):
        print(f"  - {r}")
