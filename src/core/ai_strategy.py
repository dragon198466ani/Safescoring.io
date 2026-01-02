#!/usr/bin/env python3
"""
SAFESCORING.IO - AI Model Strategy Configuration
Strategic model selection for optimal cost/quality balance.

Three main strategies:
1. NORM EVALUATION: Which AI model for each norm (YES/NO/N/A/TBD)
2. APPLICABILITY: Which AI model for determining norm applicability by type
3. COMPATIBILITY: Which AI model for product compatibility analysis

Cost targets:
- 90%+ evaluations: FREE (Groq, Gemini Flash)
- Critical evaluations: Gemini Pro (free quota)
- Fallback: DeepSeek ($0.14/1M tokens)
"""

from enum import Enum
from typing import Dict, List, Optional, Tuple
import re


class AIModel(Enum):
    """Available AI models with their characteristics"""
    GROQ_LLAMA = "groq"           # FREE 14,400 req/day, fast, good quality
    GEMINI_FLASH = "gemini_flash" # FREE high quota, fast, good quality
    GEMINI_PRO = "gemini_pro"     # FREE limited quota, expert, slower
    DEEPSEEK = "deepseek"         # $0.14/1M tokens, excellent quality
    CLAUDE_SONNET = "claude"      # $3/1M tokens, best reasoning
    OLLAMA = "ollama"             # FREE local, variable quality
    OLLAMA_DEEPSEEK = "ollama_deepseek"  # FREE local, DeepSeek reasoning model


class TaskComplexity(Enum):
    """Task complexity levels"""
    TRIVIAL = 1      # Simple factual checks (Groq)
    SIMPLE = 2       # Standard evaluations (Groq/Gemini Flash)
    MODERATE = 3     # Technical analysis (Gemini Flash)
    COMPLEX = 4      # Deep technical reasoning (Gemini Pro)
    CRITICAL = 5     # Security-critical analysis (Gemini Pro + review)


# =============================================================================
# 1. NORM EVALUATION STRATEGY
# =============================================================================
# Maps norm code ranges to optimal AI model based on evaluation complexity

NORM_MODEL_STRATEGY: Dict[str, Dict] = {
    # =========================================================================
    # PILLAR S - SECURITY (Cryptographic Security)
    # =========================================================================

    # S01-S10: Symmetric algorithms (AES, ChaCha20) - CRITICAL
    "S01-S10": {
        "model": AIModel.GEMINI_PRO,
        "complexity": TaskComplexity.CRITICAL,
        "pass2_review": True,
        "fallback_local": AIModel.OLLAMA_DEEPSEEK,
        "fallback": AIModel.DEEPSEEK,
        "reason": "Cryptographic algorithm verification requires expert analysis"
    },

    # S11-S20: Asymmetric algorithms (RSA, ECDSA, EdDSA) - CRITICAL
    "S11-S20": {
        "model": AIModel.GEMINI_PRO,
        "complexity": TaskComplexity.CRITICAL,
        "pass2_review": True,
        "fallback_local": AIModel.OLLAMA_DEEPSEEK,
        "fallback": AIModel.DEEPSEEK,
        "reason": "Public key cryptography requires deep understanding"
    },

    # S21-S30: Hash functions (SHA-256, Keccak) - COMPLEX
    "S21-S30": {
        "model": AIModel.GEMINI_FLASH,
        "complexity": TaskComplexity.COMPLEX,
        "pass2_review": False,
        "fallback": AIModel.DEEPSEEK,
        "reason": "Hash function standards are well-documented"
    },

    # S31-S40: Elliptic curves (secp256k1, Ed25519) - CRITICAL
    "S31-S40": {
        "model": AIModel.GEMINI_PRO,
        "complexity": TaskComplexity.CRITICAL,
        "pass2_review": True,
        "fallback_local": AIModel.OLLAMA_DEEPSEEK,
        "fallback": AIModel.DEEPSEEK,
        "reason": "Curve selection is security-critical for blockchain"
    },

    # S41-S50: Random number generation (CSPRNG) - COMPLEX
    "S41-S50": {
        "model": AIModel.GEMINI_PRO,
        "complexity": TaskComplexity.COMPLEX,
        "pass2_review": True,
        "fallback_local": AIModel.OLLAMA_DEEPSEEK,
        "fallback": AIModel.DEEPSEEK,
        "reason": "RNG quality is critical for key generation"
    },

    # S51-S70: BIP Standards (BIP-32/39/44) - MODERATE
    "S51-S70": {
        "model": AIModel.GEMINI_FLASH,
        "complexity": TaskComplexity.MODERATE,
        "pass2_review": False,
        "fallback": AIModel.GROQ_LLAMA,
        "reason": "Well-documented standards, mostly YESp for wallets"
    },

    # S71-S90: Multi-signature & MPC - COMPLEX
    "S71-S90": {
        "model": AIModel.GEMINI_PRO,
        "complexity": TaskComplexity.COMPLEX,
        "pass2_review": True,
        "fallback_local": AIModel.OLLAMA_DEEPSEEK,
        "fallback": AIModel.DEEPSEEK,
        "reason": "Threshold cryptography requires expert analysis"
    },

    # S91-S100: 2FA/MFA, Biometrics - SIMPLE
    "S91-S100": {
        "model": AIModel.GROQ_LLAMA,
        "complexity": TaskComplexity.SIMPLE,
        "pass2_review": False,
        "fallback": AIModel.GEMINI_FLASH,
        "reason": "Feature verification, mostly factual"
    },

    # S101-S120: Secure Element, HSM, TEE - CRITICAL
    "S101-S120": {
        "model": AIModel.GEMINI_PRO,
        "complexity": TaskComplexity.CRITICAL,
        "pass2_review": True,
        "fallback": AIModel.DEEPSEEK,
        "reason": "Hardware security requires certification verification"
    },

    # S121-S150: EIP Standards (EIP-712, EIP-1559) - MODERATE
    "S121-S150": {
        "model": AIModel.DEEPSEEK,
        "complexity": TaskComplexity.MODERATE,
        "pass2_review": False,
        "fallback": AIModel.GEMINI_FLASH,
        "fallback_local": AIModel.OLLAMA_DEEPSEEK,
        "reason": "DeepSeek excellent on Ethereum standards"
    },

    # S151-S180: BIP Standards for Bitcoin - MODERATE
    "S151-S180": {
        "model": AIModel.GEMINI_FLASH,
        "complexity": TaskComplexity.MODERATE,
        "pass2_review": False,
        "fallback": AIModel.DEEPSEEK,
        "reason": "Bitcoin standards well-documented"
    },

    # S181-S220: Communication security (TLS, E2EE) - SIMPLE
    "S181-S220": {
        "model": AIModel.GROQ_LLAMA,
        "complexity": TaskComplexity.SIMPLE,
        "pass2_review": False,
        "fallback": AIModel.GEMINI_FLASH,
        "reason": "Standard protocols, mostly factual verification"
    },

    # S221-S260: Smart contract security patterns - COMPLEX
    # DeepSeek excels at code analysis, use it as primary for smart contracts
    "S221-S260": {
        "model": AIModel.DEEPSEEK,
        "complexity": TaskComplexity.COMPLEX,
        "pass2_review": True,
        "fallback": AIModel.GEMINI_PRO,
        "fallback_local": AIModel.OLLAMA_DEEPSEEK,
        "reason": "DeepSeek excellent for smart contract code analysis (reentrancy, overflow)"
    },

    # S261-S300: Audit & bug bounty - SIMPLE
    "S261-S300": {
        "model": AIModel.GROQ_LLAMA,
        "complexity": TaskComplexity.SIMPLE,
        "pass2_review": False,
        "fallback": AIModel.GEMINI_FLASH,
        "reason": "Factual verification of audit reports"
    },

    # =========================================================================
    # PILLAR A - ADVERSITY (Attack Resistance)
    # =========================================================================

    # A01-A15: Duress PIN, Panic features - CRITICAL
    "A01-A15": {
        "model": AIModel.GEMINI_PRO,
        "complexity": TaskComplexity.CRITICAL,
        "pass2_review": True,
        "fallback": AIModel.DEEPSEEK,
        "reason": "Anti-coercion requires nuanced security reasoning"
    },

    # A16-A30: Hidden wallets, Plausible deniability - CRITICAL
    "A16-A30": {
        "model": AIModel.GEMINI_PRO,
        "complexity": TaskComplexity.CRITICAL,
        "pass2_review": True,
        "fallback": AIModel.DEEPSEEK,
        "reason": "Complex security scenarios require expert analysis"
    },

    # A31-A50: Seed phrase backup (BIP-39, SLIP39) - MODERATE
    "A31-A50": {
        "model": AIModel.GEMINI_FLASH,
        "complexity": TaskComplexity.MODERATE,
        "pass2_review": False,
        "fallback": AIModel.GROQ_LLAMA,
        "reason": "Well-documented standards"
    },

    # A51-A70: Social recovery, Multi-share - COMPLEX
    "A51-A70": {
        "model": AIModel.GEMINI_PRO,
        "complexity": TaskComplexity.COMPLEX,
        "pass2_review": False,
        "fallback": AIModel.DEEPSEEK,
        "reason": "Recovery mechanisms need careful analysis"
    },

    # A71-A90: Physical protection (tamper-evident) - MODERATE
    "A71-A90": {
        "model": AIModel.GEMINI_FLASH,
        "complexity": TaskComplexity.MODERATE,
        "pass2_review": False,
        "fallback": AIModel.GROQ_LLAMA,
        "reason": "Physical specs verification"
    },

    # A91-A110: Self-destruct, Auto-wipe - COMPLEX
    "A91-A110": {
        "model": AIModel.GEMINI_PRO,
        "complexity": TaskComplexity.COMPLEX,
        "pass2_review": True,
        "fallback": AIModel.DEEPSEEK,
        "reason": "Critical security feature verification"
    },

    # A111-A130: Privacy (Tor, VPN, Mixing) - COMPLEX
    "A111-A130": {
        "model": AIModel.DEEPSEEK,
        "complexity": TaskComplexity.COMPLEX,
        "pass2_review": False,
        "fallback": AIModel.GEMINI_PRO,
        "fallback_local": AIModel.OLLAMA_DEEPSEEK,
        "reason": "DeepSeek excellent on privacy tech (Tor, ZK proofs)"
    },

    # A131-A150: Legal, Jurisdiction, ZK proofs - COMPLEX
    "A131-A150": {
        "model": AIModel.GEMINI_PRO,
        "complexity": TaskComplexity.COMPLEX,
        "pass2_review": False,
        "fallback": AIModel.DEEPSEEK,
        "reason": "ZK proofs need expert analysis"
    },

    # =========================================================================
    # PILLAR F - FIDELITY (Reliability & Quality)
    # =========================================================================

    # F01-F30: Hardware quality (IP rating, materials) - TRIVIAL
    "F01-F30": {
        "model": AIModel.GROQ_LLAMA,
        "complexity": TaskComplexity.TRIVIAL,
        "pass2_review": False,
        "fallback": AIModel.GEMINI_FLASH,
        "reason": "Factual spec verification"
    },

    # F31-F60: Certifications (CE, FCC, MIL-STD) - TRIVIAL
    "F31-F60": {
        "model": AIModel.GROQ_LLAMA,
        "complexity": TaskComplexity.TRIVIAL,
        "pass2_review": False,
        "fallback": AIModel.GEMINI_FLASH,
        "reason": "Simple certification check"
    },

    # F61-F90: Software quality (uptime, test coverage) - SIMPLE
    "F61-F90": {
        "model": AIModel.GROQ_LLAMA,
        "complexity": TaskComplexity.SIMPLE,
        "pass2_review": False,
        "fallback": AIModel.GEMINI_FLASH,
        "reason": "Metrics verification"
    },

    # F91-F120: Open source, Audit history - SIMPLE
    "F91-F120": {
        "model": AIModel.GROQ_LLAMA,
        "complexity": TaskComplexity.SIMPLE,
        "pass2_review": False,
        "fallback": AIModel.GEMINI_FLASH,
        "reason": "GitHub and audit report verification"
    },

    # F121-F150: Company track record, Warranty - SIMPLE
    "F121-F150": {
        "model": AIModel.GROQ_LLAMA,
        "complexity": TaskComplexity.SIMPLE,
        "pass2_review": False,
        "fallback": AIModel.GEMINI_FLASH,
        "reason": "Factual company info"
    },

    # F151-F200: Documentation, Support - TRIVIAL
    "F151-F200": {
        "model": AIModel.GROQ_LLAMA,
        "complexity": TaskComplexity.TRIVIAL,
        "pass2_review": False,
        "fallback": AIModel.GEMINI_FLASH,
        "reason": "Documentation availability check"
    },

    # =========================================================================
    # PILLAR E - EFFICIENCY (Performance & Usability)
    # =========================================================================

    # E01-E30: Blockchain support (ETH, BTC, L2s) - TRIVIAL
    "E01-E30": {
        "model": AIModel.GROQ_LLAMA,
        "complexity": TaskComplexity.TRIVIAL,
        "pass2_review": False,
        "fallback": AIModel.GEMINI_FLASH,
        "reason": "Simple chain list verification"
    },

    # E31-E60: Token support (ERC-20, NFTs) - TRIVIAL
    "E31-E60": {
        "model": AIModel.GROQ_LLAMA,
        "complexity": TaskComplexity.TRIVIAL,
        "pass2_review": False,
        "fallback": AIModel.GEMINI_FLASH,
        "reason": "Token standard verification"
    },

    # E61-E90: DeFi features (swaps, staking) - SIMPLE
    "E61-E90": {
        "model": AIModel.GROQ_LLAMA,
        "complexity": TaskComplexity.SIMPLE,
        "pass2_review": False,
        "fallback": AIModel.GEMINI_FLASH,
        "reason": "Feature availability check"
    },

    # E91-E120: Platform support (iOS, Android, Desktop) - TRIVIAL
    "E91-E120": {
        "model": AIModel.GROQ_LLAMA,
        "complexity": TaskComplexity.TRIVIAL,
        "pass2_review": False,
        "fallback": AIModel.GEMINI_FLASH,
        "reason": "App store verification"
    },

    # E121-E150: Performance (latency, TPS) - SIMPLE
    "E121-E150": {
        "model": AIModel.GROQ_LLAMA,
        "complexity": TaskComplexity.SIMPLE,
        "pass2_review": False,
        "fallback": AIModel.GEMINI_FLASH,
        "reason": "Performance metrics"
    },

    # E151-E180: UX (onboarding, accessibility) - SIMPLE
    "E151-E180": {
        "model": AIModel.GROQ_LLAMA,
        "complexity": TaskComplexity.SIMPLE,
        "pass2_review": False,
        "fallback": AIModel.GEMINI_FLASH,
        "reason": "User experience assessment"
    },

    # E181-E200: Price, Support channels - TRIVIAL
    "E181-E200": {
        "model": AIModel.GROQ_LLAMA,
        "complexity": TaskComplexity.TRIVIAL,
        "pass2_review": False,
        "fallback": AIModel.GEMINI_FLASH,
        "reason": "Factual info verification"
    },
}


# =============================================================================
# 2. APPLICABILITY STRATEGY (by Product Type)
# =============================================================================
# Determines which norms apply to which product types
# IMPORTANT: Codes must match database product_types.code exactly (with spaces!)

APPLICABILITY_STRATEGY: Dict[str, Dict] = {
    # =========================================================================
    # HARDWARE WALLETS
    # =========================================================================
    "HW Cold": {
        "model": AIModel.GEMINI_FLASH,
        "complexity": TaskComplexity.MODERATE,
        "default_applicable": True,
        "excluded_prefixes": ["E61-E90"],  # No DeFi features typically
        "reason": "Hardware has most security norms applicable"
    },

    # NOTE: "HW Hot" removed - Not standard industry terminology
    # Hardware wallets are by definition "cold storage" (offline)
    # Hot wallets are software-based (always connected to internet)

    "HW NFC Signer": {
        "model": AIModel.GEMINI_FLASH,
        "complexity": TaskComplexity.MODERATE,
        "default_applicable": True,
        "excluded_prefixes": ["F01-F30", "A71-A90", "E61-E90"],
        "reason": "NFC signing cards have limited hardware features (TAPSIGNER, Status Keycard)"
    },

    # =========================================================================
    # SOFTWARE WALLETS
    # =========================================================================
    "Wallet MultiPlatform": {
        "model": AIModel.GROQ_LLAMA,
        "complexity": TaskComplexity.SIMPLE,
        "default_applicable": True,
        "excluded_prefixes": ["F01-F60"],
        "reason": "Multi-platform wallets (MetaMask, Trust) have browser + mobile"
    },
    "SW Browser": {
        "model": AIModel.GROQ_LLAMA,
        "complexity": TaskComplexity.SIMPLE,
        "default_applicable": True,
        "excluded_prefixes": ["F01-F60", "A71-A90"],  # No hardware quality norms
        "reason": "Browser extensions have specific scope"
    },

    "SW Mobile": {
        "model": AIModel.GROQ_LLAMA,
        "complexity": TaskComplexity.SIMPLE,
        "default_applicable": True,
        "excluded_prefixes": ["F01-F60"],  # Limited hardware norms
        "reason": "Mobile apps have device-dependent features"
    },

    "SW Desktop": {
        "model": AIModel.GROQ_LLAMA,
        "complexity": TaskComplexity.SIMPLE,
        "default_applicable": True,
        "excluded_prefixes": ["F01-F60"],
        "reason": "Desktop software similar to mobile"
    },

    "Smart Wallet": {
        "model": AIModel.GEMINI_FLASH,
        "complexity": TaskComplexity.MODERATE,
        "default_applicable": True,
        "excluded_prefixes": ["F01-F60"],
        "reason": "Smart wallets have account abstraction features"
    },

    "MPC Wallet": {
        "model": AIModel.GEMINI_FLASH,
        "complexity": TaskComplexity.MODERATE,
        "default_applicable": True,
        "excluded_prefixes": ["S51-S70"],  # Different key management (no BIP39)
        "reason": "MPC has unique security model"
    },

    "MultiSig": {
        "model": AIModel.GEMINI_FLASH,
        "complexity": TaskComplexity.MODERATE,
        "default_applicable": True,
        "excluded_prefixes": ["F01-F60"],
        "reason": "Multi-signature security model"
    },

    # =========================================================================
    # EXCHANGES
    # =========================================================================
    "CEX": {
        "model": AIModel.GROQ_LLAMA,
        "complexity": TaskComplexity.SIMPLE,
        "default_applicable": True,
        "excluded_prefixes": ["A01-A30", "S91-S100"],  # No user-side anti-coercion
        "reason": "Centralized - limited user control"
    },

    "DEX": {
        "model": AIModel.GEMINI_FLASH,
        "complexity": TaskComplexity.MODERATE,
        "default_applicable": True,
        "excluded_prefixes": ["F01-F60", "A71-A90"],
        "reason": "Smart contract security focus"
    },

    "DEX Agg": {
        "model": AIModel.GEMINI_FLASH,
        "complexity": TaskComplexity.MODERATE,
        "default_applicable": True,
        "excluded_prefixes": ["F01-F60", "A71-A90"],
        "reason": "DEX aggregator routes through multiple DEXs"
    },

    "AMM": {
        "model": AIModel.GEMINI_FLASH,
        "complexity": TaskComplexity.MODERATE,
        "default_applicable": True,
        "excluded_prefixes": ["F01-F60", "A01-A30", "A71-A90"],
        "reason": "AMM liquidity pool focus"
    },

    # =========================================================================
    # DEFI PROTOCOLS
    # =========================================================================
    "Lending": {
        "model": AIModel.GEMINI_FLASH,
        "complexity": TaskComplexity.MODERATE,
        "default_applicable": True,
        "excluded_prefixes": ["F01-F60", "A01-A30", "A71-A90"],
        "reason": "Lending protocol security focus"
    },

    "Yield": {
        "model": AIModel.GEMINI_FLASH,
        "complexity": TaskComplexity.MODERATE,
        "default_applicable": True,
        "excluded_prefixes": ["F01-F60", "A01-A30", "A71-A90"],
        "reason": "Yield aggregator has composability risks"
    },

    "Liq Staking": {
        "model": AIModel.GEMINI_FLASH,
        "complexity": TaskComplexity.MODERATE,
        "default_applicable": True,
        "excluded_prefixes": ["F01-F60", "A01-A90"],
        "reason": "Liquid staking has validator risks"
    },

    "Derivatives": {
        "model": AIModel.GEMINI_PRO,
        "complexity": TaskComplexity.COMPLEX,
        "default_applicable": True,
        "excluded_prefixes": ["F01-F60", "A01-A30", "A71-A90"],
        "reason": "Derivatives are complex, need expert analysis"
    },

    "DeFi Tools": {
        "model": AIModel.GROQ_LLAMA,
        "complexity": TaskComplexity.SIMPLE,
        "default_applicable": True,
        "excluded_prefixes": ["F01-F60", "A01-A90", "S71-S90"],  # No custody, no MPC
        "reason": "DeFi tools are mostly read-only analytics"
    },

    # =========================================================================
    # BRIDGES
    # =========================================================================
    "Bridges": {
        "model": AIModel.GEMINI_PRO,
        "complexity": TaskComplexity.COMPLEX,
        "default_applicable": True,
        "excluded_prefixes": ["F01-F60", "A01-A30"],
        "fallback_local": AIModel.OLLAMA_DEEPSEEK,
        "reason": "Bridges are high-risk, need expert analysis"
    },

    # =========================================================================
    # CUSTODY & BANKING
    # =========================================================================
    "Custody": {
        "model": AIModel.GEMINI_FLASH,
        "complexity": TaskComplexity.MODERATE,
        "default_applicable": True,
        "excluded_prefixes": ["E61-E90"],  # Limited DeFi
        "reason": "Institutional custody has specific security requirements"
    },

    "Custody MPC": {
        "model": AIModel.GEMINI_FLASH,
        "complexity": TaskComplexity.MODERATE,
        "default_applicable": True,
        "excluded_prefixes": ["F01-F60", "S51-S70"],  # No hardware, different key model (no BIP39)
        "reason": "MPC custody has unique distributed key management (Fireblocks, BitGo)"
    },

    "Custody MultiSig": {
        "model": AIModel.GEMINI_FLASH,
        "complexity": TaskComplexity.MODERATE,
        "default_applicable": True,
        "excluded_prefixes": ["F01-F60"],  # No hardware
        "reason": "MultiSig custody requires threshold configuration (Unchained, Casa)"
    },

    "Enterprise Custody": {
        "model": AIModel.GEMINI_FLASH,
        "complexity": TaskComplexity.MODERATE,
        "default_applicable": True,
        "excluded_prefixes": ["E61-E90"],  # Limited DeFi
        "reason": "Enterprise custody combines MPC/MultiSig with compliance features"
    },

    "Crypto Bank": {
        "model": AIModel.GEMINI_FLASH,
        "complexity": TaskComplexity.MODERATE,
        "default_applicable": True,
        "excluded_prefixes": ["A01-A30"],  # No user anti-coercion (custodial)
        "reason": "Crypto banks are regulated custodial services"
    },

    "Neobank": {
        "model": AIModel.GROQ_LLAMA,
        "complexity": TaskComplexity.SIMPLE,
        "default_applicable": True,
        "excluded_prefixes": ["A01-A30", "S221-S260", "F01-F60"],
        "reason": "Fintech neobanks are custodial services with limited crypto features (N26, Revolut)"
    },

    # =========================================================================
    # BACKUP SOLUTIONS
    # =========================================================================
    "Bkp Physical": {
        "model": AIModel.GROQ_LLAMA,
        "complexity": TaskComplexity.TRIVIAL,
        "default_applicable": False,  # Most norms don't apply
        "included_prefixes": ["F01-F60", "A31-A50"],  # Only physical + backup
        "reason": "Physical backups have limited scope (metal plates)"
    },

    "Bkp Digital": {
        "model": AIModel.GROQ_LLAMA,
        "complexity": TaskComplexity.SIMPLE,
        "default_applicable": False,
        "included_prefixes": ["S21-S30", "A31-A70", "F61-F120"],
        "reason": "Digital backup specific scope (encrypted storage)"
    },

    "Seed Splitter": {
        "model": AIModel.GROQ_LLAMA,
        "complexity": TaskComplexity.TRIVIAL,
        "default_applicable": False,
        "included_prefixes": ["A31-A70", "F61-F120", "S21-S40"],
        "reason": "Shamir/SSS seed splitting - backup-specific scope (SeedXOR, Cypherock)"
    },

    # =========================================================================
    # CARDS
    # =========================================================================
    "Card": {
        "model": AIModel.GROQ_LLAMA,
        "complexity": TaskComplexity.SIMPLE,
        "default_applicable": True,
        "excluded_prefixes": ["S221-S260", "A16-A30"],  # Limited crypto features
        "reason": "Custodial crypto cards bridge traditional and crypto"
    },

    "Card Non-Cust": {
        "model": AIModel.GEMINI_FLASH,
        "complexity": TaskComplexity.MODERATE,
        "default_applicable": True,
        "excluded_prefixes": ["A01-A15"],  # No duress for cards
        "reason": "Non-custodial cards need smart contract security"
    },

    # =========================================================================
    # OTHER
    # =========================================================================
    "RWA": {
        "model": AIModel.GEMINI_FLASH,
        "complexity": TaskComplexity.MODERATE,
        "default_applicable": True,
        "excluded_prefixes": ["F01-F60", "A01-A30", "A71-A90"],
        "reason": "Real World Assets have regulatory focus"
    },

    "Stablecoin": {
        "model": AIModel.GEMINI_FLASH,
        "complexity": TaskComplexity.MODERATE,
        "default_applicable": True,
        "excluded_prefixes": ["F01-F60", "A01-A90"],  # No hardware, no anti-coercion
        "reason": "Stablecoins focus on peg mechanism security"
    },

    # =========================================================================
    # ADDITIONAL EXCHANGE TYPES
    # =========================================================================
    "Atomic Swap": {
        "model": AIModel.GEMINI_FLASH,
        "complexity": TaskComplexity.MODERATE,
        "default_applicable": True,
        "excluded_prefixes": ["F01-F60", "A01-A30"],
        "reason": "Cross-chain atomic swaps have complex security model"
    },

    "OTC": {
        "model": AIModel.GROQ_LLAMA,
        "complexity": TaskComplexity.SIMPLE,
        "default_applicable": True,
        "excluded_prefixes": ["F01-F60", "A01-A30", "S221-S260"],
        "reason": "OTC/P2P trading is straightforward escrow model"
    },

    "NFT Market": {
        "model": AIModel.GEMINI_FLASH,
        "complexity": TaskComplexity.MODERATE,
        "default_applicable": True,
        "excluded_prefixes": ["F01-F60", "A01-A30"],
        "reason": "NFT marketplaces have smart contract risks"
    },

    # =========================================================================
    # ADDITIONAL DEFI TYPES
    # =========================================================================
    "CeFi Lending": {
        "model": AIModel.GEMINI_FLASH,
        "complexity": TaskComplexity.MODERATE,
        "default_applicable": True,
        "excluded_prefixes": ["A01-A30", "S221-S260"],
        "reason": "Centralized lending requires regulatory/licensing verification (Celsius, BlockFi lessons)"
    },

    "CrossAgg": {
        "model": AIModel.GEMINI_FLASH,
        "complexity": TaskComplexity.MODERATE,
        "default_applicable": True,
        "excluded_prefixes": ["F01-F60", "A01-A30"],
        "reason": "Cross-chain aggregators have bridge risks"
    },

    "Index": {
        "model": AIModel.GEMINI_FLASH,
        "complexity": TaskComplexity.MODERATE,
        "default_applicable": True,
        "excluded_prefixes": ["F01-F60", "A01-A30"],
        "reason": "Index tokens have rebalancing complexity"
    },

    "Insurance": {
        "model": AIModel.GEMINI_PRO,
        "complexity": TaskComplexity.COMPLEX,
        "default_applicable": True,
        "excluded_prefixes": ["F01-F60", "A01-A30"],
        "reason": "DeFi insurance requires careful risk assessment"
    },

    "Intent": {
        "model": AIModel.GEMINI_PRO,
        "complexity": TaskComplexity.COMPLEX,
        "default_applicable": True,
        "excluded_prefixes": ["F01-F60", "A01-A30"],
        "reason": "Intent-based protocols have novel trust models"
    },

    "Launchpad": {
        "model": AIModel.GEMINI_FLASH,
        "complexity": TaskComplexity.MODERATE,
        "default_applicable": True,
        "excluded_prefixes": ["F01-F60", "A01-A30"],
        "reason": "Token launchpads have allocation and vesting mechanics"
    },

    "Locker": {
        "model": AIModel.GROQ_LLAMA,
        "complexity": TaskComplexity.SIMPLE,
        "default_applicable": True,
        "excluded_prefixes": ["F01-F60", "A01-A90"],
        "reason": "Token lockers are simple time-lock contracts"
    },

    "Options": {
        "model": AIModel.GEMINI_PRO,
        "complexity": TaskComplexity.COMPLEX,
        "default_applicable": True,
        "excluded_prefixes": ["F01-F60", "A01-A30"],
        "reason": "Options protocols have complex pricing models"
    },

    "Perps": {
        "model": AIModel.GEMINI_PRO,
        "complexity": TaskComplexity.COMPLEX,
        "default_applicable": True,
        "excluded_prefixes": ["F01-F60", "A01-A30"],
        "reason": "Perpetual futures have liquidation risks"
    },

    "Prediction": {
        "model": AIModel.GEMINI_FLASH,
        "complexity": TaskComplexity.MODERATE,
        "default_applicable": True,
        "excluded_prefixes": ["F01-F60", "A01-A30"],
        "reason": "Prediction markets have oracle dependencies"
    },

    "Prime": {
        "model": AIModel.GEMINI_FLASH,
        "complexity": TaskComplexity.MODERATE,
        "default_applicable": True,
        "excluded_prefixes": ["A01-A30"],
        "reason": "Prime brokerage services are custodial"
    },

    "Restaking": {
        "model": AIModel.GEMINI_FLASH,
        "complexity": TaskComplexity.MODERATE,
        "default_applicable": True,
        "excluded_prefixes": ["F01-F60", "A01-A30"],
        "reason": "Restaking has compounded validator risks"
    },

    "Streaming": {
        "model": AIModel.GROQ_LLAMA,
        "complexity": TaskComplexity.SIMPLE,
        "default_applicable": True,
        "excluded_prefixes": ["F01-F60", "A01-A90"],
        "reason": "Payment streaming is straightforward"
    },

    "Synthetics": {
        "model": AIModel.GEMINI_PRO,
        "complexity": TaskComplexity.COMPLEX,
        "default_applicable": True,
        "excluded_prefixes": ["F01-F60", "A01-A30"],
        "reason": "Synthetic assets have complex collateral models"
    },

    "Vesting": {
        "model": AIModel.GROQ_LLAMA,
        "complexity": TaskComplexity.SIMPLE,
        "default_applicable": True,
        "excluded_prefixes": ["F01-F60", "A01-A90"],
        "reason": "Token vesting is simple time-lock mechanism"
    },

    "Wrapped": {
        "model": AIModel.GROQ_LLAMA,
        "complexity": TaskComplexity.SIMPLE,
        "default_applicable": True,
        "excluded_prefixes": ["F01-F60", "A01-A90"],
        "reason": "Wrapped tokens are straightforward bridges"
    },

    # =========================================================================
    # ADDITIONAL FINANCIAL TYPES
    # =========================================================================
    "Fiat Gateway": {
        "model": AIModel.GEMINI_FLASH,
        "complexity": TaskComplexity.MODERATE,
        "default_applicable": True,
        "excluded_prefixes": ["A01-A30", "S221-S260"],
        "reason": "Fiat on/off ramps require KYC/AML compliance and licensing verification"
    },

    "Payment": {
        "model": AIModel.GROQ_LLAMA,
        "complexity": TaskComplexity.SIMPLE,
        "default_applicable": True,
        "excluded_prefixes": ["S221-S260", "A01-A30"],
        "reason": "Payment services focus on usability"
    },

    "Treasury": {
        "model": AIModel.GEMINI_FLASH,
        "complexity": TaskComplexity.MODERATE,
        "default_applicable": True,
        "excluded_prefixes": ["A01-A30"],
        "reason": "Treasury management has governance aspects"
    },

    # =========================================================================
    # ADDITIONAL PRIVACY TYPES
    # =========================================================================
    "Privacy": {
        "model": AIModel.GEMINI_PRO,
        "complexity": TaskComplexity.COMPLEX,
        "default_applicable": True,
        "excluded_prefixes": [],
        "reason": "Privacy protocols require comprehensive analysis"
    },

    "Private DeFi": {
        "model": AIModel.GEMINI_PRO,
        "complexity": TaskComplexity.COMPLEX,
        "default_applicable": True,
        "excluded_prefixes": [],
        "reason": "Private DeFi combines privacy + DeFi risks"
    },

    # =========================================================================
    # ADDITIONAL INFRASTRUCTURE TYPES
    # =========================================================================
    "AA": {
        "model": AIModel.GEMINI_FLASH,
        "complexity": TaskComplexity.MODERATE,
        "default_applicable": True,
        "excluded_prefixes": ["F01-F60"],
        "reason": "Account Abstraction infrastructure"
    },

    "Interop": {
        "model": AIModel.GEMINI_FLASH,
        "complexity": TaskComplexity.MODERATE,
        "default_applicable": True,
        "excluded_prefixes": ["F01-F60", "A01-A30"],
        "reason": "Interoperability protocols have bridge-like risks"
    },

    "L2": {
        "model": AIModel.GEMINI_FLASH,
        "complexity": TaskComplexity.MODERATE,
        "default_applicable": True,
        "excluded_prefixes": ["F01-F60"],
        "reason": "Layer 2 solutions have rollup security"
    },

    "Validator": {
        "model": AIModel.GEMINI_FLASH,
        "complexity": TaskComplexity.MODERATE,
        "default_applicable": True,
        "excluded_prefixes": ["F01-F60", "A01-A90"],
        "reason": "Validator services have slashing risks"
    },

    # =========================================================================
    # ADDITIONAL CONSUMER TYPES
    # =========================================================================
    "Fan Token": {
        "model": AIModel.GROQ_LLAMA,
        "complexity": TaskComplexity.SIMPLE,
        "default_applicable": True,
        "excluded_prefixes": ["F01-F60", "A01-A90", "S71-S90"],
        "reason": "Fan tokens are simple ERC-20 tokens"
    },

    "GameFi": {
        "model": AIModel.GEMINI_FLASH,
        "complexity": TaskComplexity.MODERATE,
        "default_applicable": True,
        "excluded_prefixes": ["F01-F60", "A01-A30"],
        "reason": "GameFi has in-game asset security"
    },

    "Metaverse": {
        "model": AIModel.GEMINI_FLASH,
        "complexity": TaskComplexity.MODERATE,
        "default_applicable": True,
        "excluded_prefixes": ["F01-F60", "A01-A30"],
        "reason": "Metaverse has digital asset ownership"
    },

    "NFT Tools": {
        "model": AIModel.GROQ_LLAMA,
        "complexity": TaskComplexity.SIMPLE,
        "default_applicable": True,
        "excluded_prefixes": ["F01-F60", "A01-A90"],
        "reason": "NFT tools are mostly read-only services"
    },

    # =========================================================================
    # SPECIALIZED TYPES
    # =========================================================================
    "Inheritance": {
        "model": AIModel.GEMINI_FLASH,
        "complexity": TaskComplexity.MODERATE,
        "default_applicable": True,
        "excluded_prefixes": ["F01-F60", "E61-E90"],
        "reason": "Inheritance/timelock features need careful security analysis (Liana, Dead Man's Switch)"
    },

    "Protocol": {
        "model": AIModel.GEMINI_FLASH,
        "complexity": TaskComplexity.MODERATE,
        "default_applicable": True,
        "excluded_prefixes": ["F01-F60"],
        "reason": "Base protocols for key management (Glacier Protocol)"
    },

    "Settlement": {
        "model": AIModel.GEMINI_FLASH,
        "complexity": TaskComplexity.MODERATE,
        "default_applicable": True,
        "excluded_prefixes": ["A01-A30", "F01-F60"],
        "reason": "Settlement infrastructure for institutional trading"
    },

    "Airgap Signer": {
        "model": AIModel.GEMINI_FLASH,
        "complexity": TaskComplexity.MODERATE,
        "default_applicable": True,
        "excluded_prefixes": ["E61-E90"],
        "reason": "Airgapped signing tools for maximum security (Hermit, SeedSigner)"
    },

    # =========================================================================
    # WEB3 INFRASTRUCTURE & SERVICES (from Supabase)
    # =========================================================================
    "AI Agent": {
        "model": AIModel.GEMINI_FLASH,
        "complexity": TaskComplexity.MODERATE,
        "default_applicable": True,
        "excluded_prefixes": ["F01-F60", "A01-A30"],
        "reason": "AI agents for crypto trading/management have novel trust models"
    },

    "Attestation": {
        "model": AIModel.GROQ_LLAMA,
        "complexity": TaskComplexity.SIMPLE,
        "default_applicable": True,
        "excluded_prefixes": ["F01-F60", "A01-A90"],
        "reason": "Attestation services for identity/credentials"
    },

    "Compute": {
        "model": AIModel.GROQ_LLAMA,
        "complexity": TaskComplexity.SIMPLE,
        "default_applicable": True,
        "excluded_prefixes": ["F01-F60", "A01-A90"],
        "reason": "Decentralized compute networks (Akash, Render)"
    },

    "DAO": {
        "model": AIModel.GEMINI_FLASH,
        "complexity": TaskComplexity.MODERATE,
        "default_applicable": True,
        "excluded_prefixes": ["F01-F60", "A01-A30"],
        "reason": "DAO tooling and governance platforms"
    },

    "Data Indexer": {
        "model": AIModel.GROQ_LLAMA,
        "complexity": TaskComplexity.SIMPLE,
        "default_applicable": True,
        "excluded_prefixes": ["F01-F60", "A01-A90"],
        "reason": "Blockchain data indexing services (The Graph, Dune)"
    },

    "Dev Tools": {
        "model": AIModel.GROQ_LLAMA,
        "complexity": TaskComplexity.SIMPLE,
        "default_applicable": True,
        "excluded_prefixes": ["F01-F60", "A01-A90"],
        "reason": "Developer tooling and SDKs"
    },

    "Explorer": {
        "model": AIModel.GROQ_LLAMA,
        "complexity": TaskComplexity.TRIVIAL,
        "default_applicable": True,
        "excluded_prefixes": ["F01-F60", "A01-A90", "S71-S90"],
        "reason": "Blockchain explorers are read-only services"
    },

    "Identity": {
        "model": AIModel.GEMINI_FLASH,
        "complexity": TaskComplexity.MODERATE,
        "default_applicable": True,
        "excluded_prefixes": ["F01-F60"],
        "reason": "Decentralized identity solutions (ENS, Lens, Worldcoin)"
    },

    "MEV": {
        "model": AIModel.GEMINI_PRO,
        "complexity": TaskComplexity.COMPLEX,
        "default_applicable": True,
        "excluded_prefixes": ["F01-F60", "A01-A30"],
        "reason": "MEV protection/extraction requires expert analysis"
    },

    "Messaging": {
        "model": AIModel.GROQ_LLAMA,
        "complexity": TaskComplexity.SIMPLE,
        "default_applicable": True,
        "excluded_prefixes": ["F01-F60", "A01-A90"],
        "reason": "Web3 messaging protocols (XMTP, Push)"
    },

    "Mining": {
        "model": AIModel.GROQ_LLAMA,
        "complexity": TaskComplexity.SIMPLE,
        "default_applicable": True,
        "excluded_prefixes": ["F01-F60", "A01-A90"],
        "reason": "Mining pools and services"
    },

    "Node RPC": {
        "model": AIModel.GROQ_LLAMA,
        "complexity": TaskComplexity.SIMPLE,
        "default_applicable": True,
        "excluded_prefixes": ["F01-F60", "A01-A90"],
        "reason": "RPC node providers (Alchemy, Infura, QuickNode)"
    },

    "Oracle": {
        "model": AIModel.GEMINI_FLASH,
        "complexity": TaskComplexity.MODERATE,
        "default_applicable": True,
        "excluded_prefixes": ["F01-F60"],
        "reason": "Oracle networks are critical infrastructure (Chainlink, Pyth)"
    },

    "Quest": {
        "model": AIModel.GROQ_LLAMA,
        "complexity": TaskComplexity.TRIVIAL,
        "default_applicable": True,
        "excluded_prefixes": ["F01-F60", "A01-A90", "S71-S90"],
        "reason": "Quest/airdrop platforms are simple services"
    },

    "Research": {
        "model": AIModel.GROQ_LLAMA,
        "complexity": TaskComplexity.TRIVIAL,
        "default_applicable": True,
        "excluded_prefixes": ["F01-F60", "A01-A90", "S71-S90"],
        "reason": "Research and analytics platforms"
    },

    "Security": {
        "model": AIModel.GEMINI_FLASH,
        "complexity": TaskComplexity.MODERATE,
        "default_applicable": True,
        "excluded_prefixes": ["F01-F60"],
        "reason": "Security audit and monitoring services"
    },

    "SocialFi": {
        "model": AIModel.GROQ_LLAMA,
        "complexity": TaskComplexity.SIMPLE,
        "default_applicable": True,
        "excluded_prefixes": ["F01-F60", "A01-A90"],
        "reason": "Social finance platforms (friend.tech, Farcaster)"
    },

    "Storage": {
        "model": AIModel.GROQ_LLAMA,
        "complexity": TaskComplexity.SIMPLE,
        "default_applicable": True,
        "excluded_prefixes": ["F01-F60", "A01-A90"],
        "reason": "Decentralized storage (IPFS, Arweave, Filecoin)"
    },

    "Tax": {
        "model": AIModel.GROQ_LLAMA,
        "complexity": TaskComplexity.SIMPLE,
        "default_applicable": True,
        "excluded_prefixes": ["F01-F60", "A01-A90", "S71-S90"],
        "reason": "Crypto tax calculation services"
    },

    "dVPN": {
        "model": AIModel.GROQ_LLAMA,
        "complexity": TaskComplexity.SIMPLE,
        "default_applicable": True,
        "excluded_prefixes": ["F01-F60", "A01-A90"],
        "reason": "Decentralized VPN services (Orchid, Mysterium)"
    },

    # =========================================================================
    # DEFAULT
    # =========================================================================
    "DEFAULT": {
        "model": AIModel.GEMINI_FLASH,
        "complexity": TaskComplexity.MODERATE,
        "default_applicable": True,
        "excluded_prefixes": [],
        "fallback_local": AIModel.OLLAMA_DEEPSEEK,
        "reason": "Default to comprehensive evaluation"
    },
}


# =============================================================================
# 3. COMPATIBILITY STRATEGY (Product to Product)
# =============================================================================
# Determines how to analyze product compatibility

COMPATIBILITY_STRATEGY: Dict[str, Dict] = {
    # Hardware + Software combinations
    "HW_SW": {
        "model": AIModel.GROQ_LLAMA,
        "complexity": TaskComplexity.SIMPLE,
        "criteria": ["connection_type", "supported_chains", "signing_protocol"],
        "reason": "Hardware-software compatibility is well-documented"
    },

    # Wallet + DEX
    "WALLET_DEX": {
        "model": AIModel.GROQ_LLAMA,
        "complexity": TaskComplexity.SIMPLE,
        "criteria": ["walletconnect", "chain_support", "token_standards"],
        "reason": "WalletConnect compatibility is straightforward"
    },

    # Wallet + DeFi
    "WALLET_DEFI": {
        "model": AIModel.GEMINI_FLASH,
        "complexity": TaskComplexity.MODERATE,
        "criteria": ["chain_support", "token_approval", "gas_estimation"],
        "reason": "DeFi integration has more nuances"
    },

    # Multi-chain compatibility
    "CROSS_CHAIN": {
        "model": AIModel.GEMINI_FLASH,
        "complexity": TaskComplexity.MODERATE,
        "criteria": ["bridge_support", "chain_coverage", "token_bridging"],
        "reason": "Cross-chain requires chain-specific knowledge"
    },

    # Backup + Wallet
    "BACKUP_WALLET": {
        "model": AIModel.GROQ_LLAMA,
        "complexity": TaskComplexity.TRIVIAL,
        "criteria": ["seed_format", "derivation_path", "encoding"],
        "reason": "Backup compatibility is binary (BIP39 or not)"
    },

    # CEX + Wallet
    "CEX_WALLET": {
        "model": AIModel.GROQ_LLAMA,
        "complexity": TaskComplexity.TRIVIAL,
        "criteria": ["withdrawal_networks", "address_formats"],
        "reason": "CEX withdrawal is chain-dependent"
    },

    # Default
    "DEFAULT": {
        "model": AIModel.GEMINI_FLASH,
        "complexity": TaskComplexity.MODERATE,
        "criteria": ["chain_support", "protocol_support", "standards"],
        "fallback_local": AIModel.OLLAMA_DEEPSEEK,
        "reason": "Default comprehensive compatibility check"
    },
}


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def get_norm_strategy(norm_code: str) -> Dict:
    """
    Get the AI strategy for a specific norm code.

    Args:
        norm_code: Norm code like 'S01', 'A150', 'F200'

    Returns:
        Strategy dict with model, complexity, pass2_review, fallback, reason
    """
    # Extract pillar and number
    match = re.match(r'([SAFE])(\d+)', norm_code.upper())
    if not match:
        return _get_default_strategy()

    pillar = match.group(1)
    number = int(match.group(2))

    # Find matching range
    for range_key, strategy in NORM_MODEL_STRATEGY.items():
        range_match = re.match(r'([SAFE])(\d+)-([SAFE])(\d+)', range_key)
        if range_match:
            range_pillar = range_match.group(1)
            range_start = int(range_match.group(2))
            range_end = int(range_match.group(4))

            if pillar == range_pillar and range_start <= number <= range_end:
                return strategy

    return _get_default_strategy()


def get_applicability_strategy(type_code: str) -> Dict:
    """
    Get the AI strategy for determining norm applicability for a product type.

    Args:
        type_code: Product type code like 'HW Cold', 'DEX', 'SW Mobile' (with spaces)

    Returns:
        Strategy dict with model, complexity, default_applicable, etc.
    """
    return APPLICABILITY_STRATEGY.get(type_code, APPLICABILITY_STRATEGY["DEFAULT"])


def get_compatibility_strategy(type_a: str, type_b: str) -> Dict:
    """
    Get the AI strategy for analyzing compatibility between two product types.

    Args:
        type_a: First product type (e.g., 'HW Cold', 'SW Mobile', 'DEX')
        type_b: Second product type

    Returns:
        Strategy dict with model, complexity, criteria, reason
    """
    # Check for specific combinations
    types = {type_a, type_b}

    # Hardware + Software (use correct codes with spaces)
    # NOTE: "HW Hot" removed - not standard terminology (HW = cold by definition)
    hw_types = {"HW Cold"}
    sw_types = {"SW Browser", "SW Mobile", "SW Desktop", "Smart Wallet", "MPC Wallet", "MultiSig"}
    if types & hw_types and types & sw_types:
        return COMPATIBILITY_STRATEGY["HW_SW"]

    # Wallet + DEX
    wallet_types = hw_types | sw_types
    dex_types = {"DEX", "DEX Agg", "AMM"}
    if types & wallet_types and types & dex_types:
        return COMPATIBILITY_STRATEGY["WALLET_DEX"]

    # Wallet + DeFi
    defi_types = {"Lending", "Yield", "Liq Staking", "Derivatives", "DeFi Tools"}
    if types & wallet_types and types & defi_types:
        return COMPATIBILITY_STRATEGY["WALLET_DEFI"]

    # Backup + Wallet
    backup_types = {"Bkp Physical", "Bkp Digital"}
    if types & backup_types and types & wallet_types:
        return COMPATIBILITY_STRATEGY["BACKUP_WALLET"]

    # CEX + Wallet
    if "CEX" in types and types & wallet_types:
        return COMPATIBILITY_STRATEGY["CEX_WALLET"]

    # Bridge involved
    if "Bridges" in types:
        return COMPATIBILITY_STRATEGY["CROSS_CHAIN"]

    # Card + Wallet
    card_types = {"Card", "Card Non-Cust"}
    if types & card_types and types & wallet_types:
        return COMPATIBILITY_STRATEGY["WALLET_DEX"]  # Similar to DEX integration

    # Stablecoin + DeFi
    if "Stablecoin" in types and types & defi_types:
        return COMPATIBILITY_STRATEGY["WALLET_DEFI"]

    return COMPATIBILITY_STRATEGY["DEFAULT"]


def _get_default_strategy() -> Dict:
    """Default strategy for unknown norms"""
    return {
        "model": AIModel.GEMINI_FLASH,
        "complexity": TaskComplexity.MODERATE,
        "pass2_review": False,
        "fallback": AIModel.GROQ_LLAMA,
        "reason": "Default strategy for unknown norm"
    }


def get_model_name(model: AIModel) -> str:
    """Convert AIModel enum to string for API provider"""
    return model.value


def estimate_cost(norm_codes: List[str], products_count: int = 100) -> Dict:
    """
    Estimate the cost of evaluating a list of norms for N products.

    Returns:
        Dict with estimated costs by model and total
    """
    model_counts = {m: 0 for m in AIModel}

    for code in norm_codes:
        strategy = get_norm_strategy(code)
        model = strategy["model"]
        model_counts[model] += products_count

        if strategy.get("pass2_review"):
            model_counts[AIModel.GEMINI_PRO] += products_count

    # Cost per 1M tokens (input + output estimated)
    COST_PER_1M = {
        AIModel.GROQ_LLAMA: 0.0,      # FREE
        AIModel.GEMINI_FLASH: 0.0,    # FREE (within quota)
        AIModel.GEMINI_PRO: 0.0,      # FREE (within quota)
        AIModel.DEEPSEEK: 0.42,       # $0.14 input + $0.28 output
        AIModel.CLAUDE_SONNET: 18.0,  # $3 input + $15 output
        AIModel.OLLAMA: 0.0,          # FREE (local)
    }

    # Estimate ~500 tokens per evaluation
    TOKENS_PER_EVAL = 500 / 1_000_000  # In millions

    costs = {}
    total = 0.0

    for model, count in model_counts.items():
        cost = count * TOKENS_PER_EVAL * COST_PER_1M[model]
        costs[model.value] = {
            "evaluations": count,
            "cost_usd": round(cost, 2)
        }
        total += cost

    return {
        "by_model": costs,
        "total_evaluations": sum(model_counts.values()),
        "total_cost_usd": round(total, 2),
        "cost_per_product": round(total / products_count, 4) if products_count > 0 else 0
    }


def print_strategy_summary():
    """Print a summary of the AI strategy configuration"""
    print("""
+====================================================================+
|           SafeScoring AI Strategy v1.0                             |
+====================================================================+

NORM EVALUATION STRATEGY (by complexity):
-----------------------------------------
CRITICAL (Gemini Pro + Review):
  - S01-S10: Symmetric crypto (AES, ChaCha20)
  - S11-S20: Asymmetric crypto (RSA, ECDSA)
  - S31-S40: Elliptic curves (secp256k1)
  - S101-S120: Secure Element, HSM
  - A01-A30: Anti-coercion features

COMPLEX (Gemini Pro/Flash):
  - S41-S50: Random number generation
  - S71-S90: Multi-sig, MPC
  - S221-S260: Smart contract security
  - A51-A70: Social recovery
  - A91-A110: Self-destruct features

MODERATE (Gemini Flash/DeepSeek):
  - S51-S70: BIP standards
  - S121-S180: EIP/BIP blockchain standards
  - All applicability by type

SIMPLE/TRIVIAL (Groq - FREE):
  - All F pillar (Fidelity)
  - All E pillar (Efficiency)
  - S91-S100: 2FA, Biometrics
  - S261-S300: Audit verification

COST ESTIMATE (150 products, ~800 norms):
-----------------------------------------
  - FREE evaluations: ~85% (Groq + Gemini)
  - Paid evaluations: ~15% (DeepSeek fallback)
  - Estimated cost: $0-5/month

+====================================================================+
    """)


# =============================================================================
# MAIN - For testing
# =============================================================================

if __name__ == "__main__":
    print_strategy_summary()

    # Example usage
    print("\nExample norm strategies:")
    test_norms = ["S01", "S50", "S100", "A01", "A50", "F01", "F100", "E01", "E100"]
    for norm in test_norms:
        strategy = get_norm_strategy(norm)
        print(f"  {norm}: {strategy['model'].value} ({strategy['complexity'].name})")

    # Cost estimation
    print("\n\nCost estimation for 150 products:")
    all_norms = [f"{p}{n:02d}" for p in "SAFE" for n in range(1, 201)]
    estimate = estimate_cost(all_norms, 150)
    print(f"  Total evaluations: {estimate['total_evaluations']}")
    print(f"  Total cost: ${estimate['total_cost_usd']}")
    print(f"  Cost per product: ${estimate['cost_per_product']}")
