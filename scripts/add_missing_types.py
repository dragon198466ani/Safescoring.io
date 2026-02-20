#!/usr/bin/env python3
"""Add missing product types to the applicability mapping"""
import re

# New types to add with their norm applicability profiles
# Based on what they do and which existing types they're similar to

NEW_TYPES_MAPPING = {
    # Account Abstraction - similar to SW_WALLET + DeFi
    'AA': ['SW_WALLET', 'DEFI'],

    # AI Agent - new category, similar to DeFi tools
    'AI_AGENT': ['DEFI', 'DAO'],

    # Attestation - similar to Identity
    'ATTESTATION': ['IDENTITY', 'DAO'],

    # Backups
    'BKP_DIGITAL': ['SW_WALLET', 'CUSTODY'],
    'BKP_PHYSICAL': ['HW_WALLET'],

    # Compute - infrastructure
    'COMPUTE': ['INFRASTRUCTURE'],

    # Cross-chain aggregator - similar to DEX_AGG + BRIDGE
    'CROSS_AGG': ['DEX_AGG', 'BRIDGE'],

    # Data Indexer - infrastructure/tools
    'DATA_INDEXER': ['INFRASTRUCTURE', 'DEV_TOOLS'],

    # DeFi general
    'DEFI': ['DEX', 'LENDING', 'YIELD'],

    # DeFi Tools
    'DEFI_TOOLS': ['DEX', 'YIELD'],

    # Developer Tools
    'DEV_TOOLS': ['INFRASTRUCTURE'],

    # Explorer - infrastructure
    'EXPLORER': ['INFRASTRUCTURE'],

    # Identity - new category
    'IDENTITY': ['SW_WALLET', 'DAO'],

    # Index Protocol - similar to YIELD
    'INDEX': ['YIELD', 'DEX'],

    # Inheritance - similar to CUSTODY
    'INHERITANCE': ['CUSTODY', 'SW_WALLET'],

    # Insurance - DeFi category
    'INSURANCE': ['DEFI', 'YIELD'],

    # Intent Protocol - similar to DEX_AGG
    'INTENT': ['DEX_AGG', 'SWAP'],

    # Interoperability - similar to BRIDGE
    'INTEROP': ['BRIDGE'],

    # L2 - Layer 2 solutions
    'L2': ['BRIDGE', 'INFRASTRUCTURE'],

    # Locker - DeFi tool
    'LOCKER': ['DEFI', 'VAULT'],

    # MEV Protection
    'MEV': ['DEX', 'DEX_AGG'],

    # Messaging
    'MESSAGING': ['INFRASTRUCTURE', 'IDENTITY'],

    # Mining
    'MINING': ['STAKING', 'INFRASTRUCTURE'],

    # Node/RPC
    'NODE_RPC': ['INFRASTRUCTURE'],

    # Oracle
    'ORACLE': ['DEFI', 'INFRASTRUCTURE'],

    # Prediction Market
    'PREDICTION': ['DEFI', 'PERP_DEX'],

    # Prime Brokerage
    'PRIME': ['CEX', 'CUSTODY'],

    # Privacy Protocol
    'PRIVACY': ['SW_WALLET', 'DEFI'],

    # Private DeFi
    'PRIVATE_DEFI': ['DEFI', 'PRIVACY'],

    # Protocol/Standard
    'PROTOCOL': ['INFRASTRUCTURE'],

    # Quest/Airdrop
    'QUEST': ['DEFI', 'NFT_MARKET'],

    # RWA - Real World Assets
    'RWA': ['DEFI', 'LENDING'],

    # Research
    'RESEARCH': ['INFRASTRUCTURE'],

    # Security Audit
    'SECURITY': ['INFRASTRUCTURE'],

    # Seed Splitter
    'SEED_SPLITTER': ['HW_WALLET', 'BKP_PHYSICAL'],

    # Settlement
    'SETTLEMENT': ['CEX', 'CUSTODY'],

    # SocialFi
    'SOCIALFI': ['DEFI', 'NFT_MARKET'],

    # Stablecoin
    'STABLECOIN': ['DEFI'],

    # Storage
    'STORAGE': ['INFRASTRUCTURE'],

    # Streaming Payments
    'STREAMING': ['PAYMENT', 'DEFI'],

    # Synthetics
    'SYNTHETICS': ['DEFI', 'PERP_DEX'],

    # Tax Software
    'TAX': ['INFRASTRUCTURE'],

    # Treasury
    'TREASURY': ['CUSTODY', 'DAO'],

    # Vesting
    'VESTING': ['DEFI', 'LOCKER'],

    # Wrapped Assets
    'WRAPPED': ['BRIDGE', 'DEFI'],

    # dVPN
    'DVPN': ['INFRASTRUCTURE', 'PRIVACY'],

    # Infrastructure (base type)
    'INFRASTRUCTURE': [],
}

# Read current mapping file
with open('c:/Users/alexa/Desktop/SafeScoring/src/core/norm_applicability_complete.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Get existing ALL_PRODUCT_TYPES
match = re.search(r"ALL_PRODUCT_TYPES = \[(.*?)\]", content, re.DOTALL)
if match:
    existing_types = re.findall(r"'(\w+)'", match.group(1))
    print(f'Types existants: {len(existing_types)}')
else:
    existing_types = []

# Add new types
new_types = list(NEW_TYPES_MAPPING.keys())
all_types = sorted(set(existing_types + new_types))
print(f'Nouveaux types: {len(new_types)}')
print(f'Total types: {len(all_types)}')

# Update ALL_PRODUCT_TYPES
new_types_str = ',\n'.join([f"    '{t}'" for t in all_types])
new_all_types = f"ALL_PRODUCT_TYPES = [\n{new_types_str},\n]"

content = re.sub(r"ALL_PRODUCT_TYPES = \[.*?\]", new_all_types, content, flags=re.DOTALL)

# Now update NORM_APPLICABILITY to include new types
# For each norm, if it applies to a base type, it also applies to derived types

# Get all norm mappings
norm_pattern = r"'([A-Z0-9_-]+)': \[(.*?)\],"
matches = re.findall(norm_pattern, content)

updated_norms = []
for norm_code, types_str in matches:
    # Parse existing types
    types = re.findall(r"'(\w+)'", types_str)

    # Add new types based on inheritance
    new_norm_types = set(types)
    for new_type, base_types in NEW_TYPES_MAPPING.items():
        for base in base_types:
            if base in types or base in new_norm_types:
                new_norm_types.add(new_type)

    # Sort and format
    sorted_types = sorted(new_norm_types)
    types_formatted = ', '.join([f"'{t}'" for t in sorted_types])
    updated_norms.append(f"    '{norm_code}': [{types_formatted}],")

# Rebuild NORM_APPLICABILITY section
norm_section = "NORM_APPLICABILITY = {\n" + "\n".join(updated_norms) + "\n}"

# Replace in content
content = re.sub(r"NORM_APPLICABILITY = \{.*?\}", norm_section, content, flags=re.DOTALL)

# Write updated file
with open('c:/Users/alexa/Desktop/SafeScoring/src/core/norm_applicability_complete.py', 'w', encoding='utf-8') as f:
    f.write(content)

print('\nFichier mis a jour!')
print(f'Total types: {len(all_types)}')
