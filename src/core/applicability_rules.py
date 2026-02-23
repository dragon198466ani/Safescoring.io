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
    'Biométrie',      # S176-S179: Fingerprint, face recognition
    'Firmware',       # S73-S77: Firmware updates, secure boot
    'Boot',           # S191-S193: Secure boot, verified boot
    'SE',             # S50-S54: Secure Element
    'Secure Element', # S262-S272: Secure Element certifications
    'TEE',            # S116-S120: Trusted Execution Environment
    'Anti-Tamper',    # S194-S197: Tamper detection, tamper response
    'Batterie',       # E54-E58: Battery life, charging (hardware only)
    'Ergo',           # E43-E47: Ergonomics, form factor (physical)
    'Méca',           # F16-F20: Mechanical durability
    'Environ',        # F01-F05: Environmental resistance (IP rating, temperature)
    'Matériaux',      # F57-F61: Material quality
    'Chimique',       # F36-F40: Chemical resistance
    'Feu',            # F28-F32: Fire resistance
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
    'Chimique',       # Chemical resistance
    'Feu',            # Fire resistance
    'Durée vie',      # Long-term durability
]

