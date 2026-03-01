#!/usr/bin/env python3
"""
SAFESCORING.IO - Applicability Rules
Business rules for determining norm applicability per product type.

These rules are based on the analysis of SAFE_SCORING_V7_FINAL.xlsx
and reproduce the logic used by Claude during the complete analysis.

Product type characteristics (is_hardware, is_wallet, is_defi, is_protocol)
are stored in Supabase product_types table.
"""

# =============================================================================
# NORM CATEGORIES AND THEIR APPLICABILITY RULES
# =============================================================================

# Norm categories that ONLY apply to PHYSICAL DEVICES (Hardware)
HARDWARE_ONLY_CATEGORIES = [
    'Auth',           # S80-S84: PIN, wipe after failures, exponential delay
    'Biometrics',     # S176-S179: Fingerprint, face recognition
    'Firmware',       # S73-S77: Firmware updates, secure boot
    'Boot',           # S191-S193: Secure boot, verified boot
    'SE',             # S50-S54: Secure Element
    'Secure Element', # S262-S272: Secure Element certifications
    'TEE',            # S116-S120: Trusted Execution Environment
    'Anti-Tamper',    # S194-S197: Tamper detection, tamper response
    'Battery',        # E54-E58: Battery life, charging (hardware only)
    'Ergonomics',     # E43-E47: Ergonomics, form factor (physical)
    'Mechanical',     # F16-F20: Mechanical durability
    'Environmental',  # F01-F05: Environmental resistance (IP rating, temperature)
    'Materials',      # F57-F61: Material quality
    'Chemical',       # F36-F40: Chemical resistance
    'Fire',           # F28-F32: Fire resistance
    'EM',             # F42-F46: Electromagnetic compatibility
    'MIL',            # F112-F115: Military standards
    'Space',          # F116-F118: Space-grade durability
    'Transport',      # F97-F101: Transportation durability
]

# Norm categories that ONLY apply to DEFI PROTOCOLS
DEFI_ONLY_CATEGORIES = [
    'DeFi',           # E100-E104: DeFi features (lending, staking, yield)
    'Gas',            # E172-E176: Gas optimization
    'L2',             # E131-E135: Layer 2 support
    'Cross-chain',    # E142-E146: Cross-chain bridges
    'SC Audit',       # S161-S165: Smart contract audits
    'Blockchain',     # S220-S224: Blockchain-specific security
]

# Norm categories that ONLY apply to WALLETS (software or hardware)
WALLET_ONLY_CATEGORIES = [
    'BIP',            # S16-S20: BIP-32, BIP-39, BIP-44
    'Key Mgmt',       # S187-S190: Key management
    'Recovery',       # A99-A103: Recovery mechanisms
    'Deniability',    # A11-A15: Plausible deniability
    'Decoy',          # A168-A171: Decoy wallets
]

# Norm categories that ONLY apply to KYC-COLLECTING SERVICES
# (exchanges, custodial wallets, custody services, payment services, neobanks)
KYC_COLLECTING_CATEGORIES = [
    'KYCPROT',        # KYCPROT01-KYCPROT10: KYC data protection
    'BREACH',         # BREACH01-BREACH07: Data incident response
    'IDPROT',         # IDPROT01-IDPROT05: Identity protection UX
]

# Norm categories that ONLY apply to PHYSICAL BACKUPS (metal plates)
BACKUP_PHYSICAL_ONLY = [
    'Chemical',       # Chemical resistance
    'Fire',           # Fire resistance
    'Longevity',      # Long-term durability
]

# =============================================================================
# NORM CODE SETS - Individual norm codes derived from categories above
# Used by evaluation_validator.py for product-norm compatibility checks
# =============================================================================

# Hardware-only norm codes (Secure Element, Firmware, Materials, etc.)
HARDWARE_NORM_CODES = set()
# SE: S50-S54
HARDWARE_NORM_CODES.update(f'S{i}' for i in range(50, 55))
# Secure Element certs: S262-S272
HARDWARE_NORM_CODES.update(f'S{i}' for i in range(262, 273))
# Firmware: S70-S77
HARDWARE_NORM_CODES.update(f'S{i}' for i in range(70, 78))
# Auth (PIN/wipe): S80-S84
HARDWARE_NORM_CODES.update(f'S{i}' for i in range(80, 85))
# TEE: S116-S120
HARDWARE_NORM_CODES.update(f'S{i}' for i in range(116, 121))
# Biometrics: S176-S179
HARDWARE_NORM_CODES.update(f'S{i}' for i in range(176, 180))
# Boot: S191-S193
HARDWARE_NORM_CODES.update(f'S{i}' for i in range(191, 194))
# Anti-Tamper: S194-S197
HARDWARE_NORM_CODES.update(f'S{i}' for i in range(194, 198))
# Environmental (IP rating, temp): F01-F05
HARDWARE_NORM_CODES.update(f'F{i:02d}' for i in range(1, 6))
# F06-F15 (environmental extended: temperature, humidity, etc.)
HARDWARE_NORM_CODES.update(f'F{i:02d}' for i in range(6, 16))
# Mechanical: F16-F20
HARDWARE_NORM_CODES.update(f'F{i}' for i in range(16, 21))
# Feu: F28-F32
HARDWARE_NORM_CODES.update(f'F{i}' for i in range(28, 33))
# Chemical: F36-F40
HARDWARE_NORM_CODES.update(f'F{i}' for i in range(36, 41))
# EM: F42-F46
HARDWARE_NORM_CODES.update(f'F{i}' for i in range(42, 47))
# Materials: F57-F61
HARDWARE_NORM_CODES.update(f'F{i}' for i in range(57, 62))
# Transport: F97-F101
HARDWARE_NORM_CODES.update(f'F{i}' for i in range(97, 102))
# MIL: F112-F115
HARDWARE_NORM_CODES.update(f'F{i}' for i in range(112, 116))
# Space: F116-F118
HARDWARE_NORM_CODES.update(f'F{i}' for i in range(116, 119))
# Inconel/alloy: F126
HARDWARE_NORM_CODES.add('F126')
# Battery (hardware): E54-E58
HARDWARE_NORM_CODES.update(f'E{i}' for i in range(54, 59))
# Ergonomics (physical): E43-E47
HARDWARE_NORM_CODES.update(f'E{i}' for i in range(43, 48))

# Software/DeFi-only norm codes (Smart contracts, DeFi, Gas, etc.)
SOFTWARE_NORM_CODES = set()
# SC Audit: S161-S165
SOFTWARE_NORM_CODES.update(f'S{i}' for i in range(161, 166))
# Blockchain: S220-S224
SOFTWARE_NORM_CODES.update(f'S{i}' for i in range(220, 225))
# DeFi: E100-E104
SOFTWARE_NORM_CODES.update(f'E{i}' for i in range(100, 105))
# L2: E131-E135
SOFTWARE_NORM_CODES.update(f'E{i}' for i in range(131, 136))
# Cross-chain: E142-E146
SOFTWARE_NORM_CODES.update(f'E{i}' for i in range(142, 147))
# Gas: E172-E176
SOFTWARE_NORM_CODES.update(f'E{i}' for i in range(172, 177))

# Wallet-only norm codes (BIP standards, key management, seed phrases)
WALLET_NORM_CODES = set()
# BIP: S16-S20
WALLET_NORM_CODES.update(f'S{i}' for i in range(16, 21))
# Key management: S187-S190
WALLET_NORM_CODES.update(f'S{i}' for i in range(187, 191))
# Recovery: A99-A103
WALLET_NORM_CODES.update(f'A{i}' for i in range(99, 104))
# Deniability: A11-A15
WALLET_NORM_CODES.update(f'A{i}' for i in range(11, 16))
# Decoy wallets: A168-A171
WALLET_NORM_CODES.update(f'A{i}' for i in range(168, 172))

# =============================================================================
# NORM PREFIX RULES - prefix-based pre-filtering for norm code families
# Maps norm code prefixes to the category they belong to.
# Used in evaluate_batch for fast rule-based pre-filtering.
# =============================================================================
HARDWARE_NORM_PREFIXES = {'MIL', 'FIPS-140'}  # Military standards, FIPS-140 (crypto hardware)
DEFI_NORM_PREFIXES = {'DEFI', 'ERC', 'EIP'}   # DeFi standards, ERC/EIP (smart contract standards)
WALLET_NORM_PREFIXES = {'BIP'}                  # Bitcoin Improvement Proposals (wallet standards)

# =============================================================================
# CHAIN SUPPORT CONSTANTS
# =============================================================================

# Norm code -> chain name mapping (based on E-pillar chain norms)
CHAIN_NORMS = {
    'E01': 'bitcoin',
    'E02': 'ethereum',
    'E03': 'evm',
    'E04': 'polygon',
    'E05': 'arbitrum',
    'E06': 'optimism',
    'E07': 'base',
    'E08': 'bnb',
    'E09': 'avalanche',
    'E10': 'solana',
    'E11': 'cosmos',
    'E12': 'polkadot',
    'E13': 'cardano',
    'E14': 'tron',
    'E15': 'near',
    'E16': 'aptos',
    'E17': 'sui',
}

# EVM-compatible chains
EVM_CHAINS = {
    'ethereum', 'polygon', 'arbitrum', 'optimism', 'base',
    'bnb', 'avalanche', 'fantom', 'gnosis', 'celo',
    'moonbeam', 'moonriver', 'aurora', 'zksync', 'scroll',
    'linea', 'mantle', 'blast', 'mode', 'manta',
}

# Non-EVM chains
NON_EVM_CHAINS = {
    'bitcoin', 'solana', 'cosmos', 'polkadot', 'cardano',
    'tron', 'near', 'aptos', 'sui', 'algorand',
    'tezos', 'stellar', 'hedera', 'iota', 'ripple',
    'ton', 'kaspa', 'ergo', 'monero', 'zcash',
}

# =============================================================================
# PRODUCT TYPE CLASSIFICATIONS
# =============================================================================

# Product types that only work on EVM chains
EVM_ONLY_PRODUCT_TYPES = {
    'DEX', 'DEFI', 'LENDING', 'YIELD', 'STAKING_EVM',
    'SMART_CONTRACT', 'AMM', 'PERPS', 'OPTIONS',
    'DERIVATIVES', 'SYNTHETICS', 'NFT_MARKET',
    'BRIDGE_EVM', 'L2',
}

# Product types that support multiple chains (including non-EVM)
MULTI_CHAIN_PRODUCT_TYPES = {
    'HW_WALLET', 'SW_WALLET', 'EXCHANGE', 'CUSTODY',
    'BRIDGE', 'ORACLE', 'PROTOCOL', 'PAYMENT',
}

# Software product types (no hardware norms apply)
SOFTWARE_PRODUCT_TYPES = {
    'DEX', 'DEFI', 'LENDING', 'YIELD', 'STAKING',
    'BRIDGE', 'PROTOCOL', 'ORACLE', 'NFT_MARKET',
    'SW_WALLET', 'SMART_CONTRACT', 'AMM',
}

# Hardware product types (hardware norms apply)
HARDWARE_PRODUCT_TYPES = {
    'HW_WALLET', 'HARDWARE', 'HW_COLD',
}

