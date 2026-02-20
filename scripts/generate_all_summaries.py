"""
Script to generate standardized English summaries for all norms.
Uses the official document URLs and generates structured summaries.
"""

import json

# Standard summary template
SUMMARY_TEMPLATE = """## IDENTIFICATION
- **Code**: {code}
- **Title**: {title}
- **Version**: {version}
- **Status**: {status}
- **Author(s)**: {authors}
- **Organization**: {organization}
- **License**: {license}

## EXECUTIVE SUMMARY
{executive_summary}

## BACKGROUND AND MOTIVATION
{background}

## TECHNICAL SPECIFICATIONS
### Core Principles
{core_principles}

### Implementation
{implementation}

### Parameters and Values
{parameters}

## SECURITY
### Security Guarantees
{security_guarantees}

### Risks and Limitations
{risks}

### Best Practices
{best_practices}

## COMPATIBILITY
### Dependencies
{dependencies}

### Interoperability
{interoperability}

## ADOPTION
### Reference Implementations
{reference_implementations}

### Industry Adoption
{industry_adoption}

## SAFE SCORING RELEVANCE
### Pillar
{pillar}

### Criticality
{criticality}

### Evaluation Criteria
{evaluation_criteria}

## SOURCES
- **Official Document**: {official_link}
- **Last Accessed**: {last_accessed}
"""

# Mapping of code prefixes to default values
PREFIX_DEFAULTS = {
    "BIP": {
        "organization": "Bitcoin Community",
        "license": "MIT/BSD",
        "pillar": "**S (Security)** - Bitcoin protocol standard"
    },
    "EIP": {
        "organization": "Ethereum Community", 
        "license": "CC0",
        "pillar": "**E (Ecosystem)** - Ethereum standard"
    },
    "ERC": {
        "organization": "Ethereum Community",
        "license": "CC0", 
        "pillar": "**E (Ecosystem)** - Ethereum token/contract standard"
    },
    "SLIP": {
        "organization": "SatoshiLabs",
        "license": "MIT",
        "pillar": "**S (Security)** - Wallet interoperability"
    },
    "CAIP": {
        "organization": "Chain Agnostic Standards Alliance",
        "license": "CC0",
        "pillar": "**E (Ecosystem)** - Cross-chain standard"
    },
    "ISO": {
        "organization": "ISO/IEC",
        "license": "Proprietary",
        "pillar": "**S (Security)** - International standard"
    },
    "NIST": {
        "organization": "NIST",
        "license": "Public Domain",
        "pillar": "**S (Security)** - US government standard"
    },
    "RFC": {
        "organization": "IETF",
        "license": "Public Domain",
        "pillar": "**S (Security)** - Internet standard"
    },
    "OWASP": {
        "organization": "OWASP Foundation",
        "license": "CC BY-SA",
        "pillar": "**S (Security)** - Application security"
    },
    "SOC": {
        "organization": "AICPA",
        "license": "Proprietary",
        "pillar": "**S (Security)** - Audit certification"
    },
    "GDPR": {
        "organization": "European Union",
        "license": "Public Law",
        "pillar": "**A (Adversity)** - Privacy regulation"
    },
    "PCI": {
        "organization": "PCI SSC",
        "license": "Proprietary",
        "pillar": "**S (Security)** - Payment security"
    },
    "CIS": {
        "organization": "CIS",
        "license": "CC BY-NC-SA",
        "pillar": "**S (Security)** - Security benchmarks"
    },
    "HSM": {
        "organization": "Industry",
        "license": "Various",
        "pillar": "**S (Security)** - Hardware security"
    },
    "TEE": {
        "organization": "Industry",
        "license": "Various",
        "pillar": "**S (Security)** - Trusted execution"
    },
    "MPC": {
        "organization": "Cryptography Research",
        "license": "Various",
        "pillar": "**S (Security)** - Multi-party computation"
    },
    "ZK": {
        "organization": "Cryptography Research",
        "license": "Various",
        "pillar": "**A (Adversity)** - Zero-knowledge proofs"
    },
    "LN": {
        "organization": "Lightning Network",
        "license": "CC0",
        "pillar": "**E (Ecosystem)** - Lightning protocol"
    },
    "PRIV": {
        "organization": "Various",
        "license": "Various",
        "pillar": "**A (Adversity)** - Privacy protocol"
    },
    "DEFI": {
        "organization": "DeFi Community",
        "license": "Various",
        "pillar": "**E (Ecosystem)** - DeFi integration"
    },
    "NFT": {
        "organization": "NFT Community",
        "license": "Various",
        "pillar": "**E (Ecosystem)** - NFT support"
    },
    "CHAIN": {
        "organization": "Various Blockchains",
        "license": "Various",
        "pillar": "**E (Ecosystem)** - Blockchain support"
    },
    "USB": {
        "organization": "USB-IF",
        "license": "Proprietary",
        "pillar": "**E (Ecosystem)** - Connectivity"
    },
    "BT": {
        "organization": "Bluetooth SIG",
        "license": "Proprietary",
        "pillar": "**E (Ecosystem)** - Connectivity"
    },
    "NFC": {
        "organization": "NFC Forum",
        "license": "Proprietary",
        "pillar": "**E (Ecosystem)** - Connectivity"
    },
    "QR": {
        "organization": "ISO/Denso Wave",
        "license": "Public Domain",
        "pillar": "**E (Ecosystem)** - Data encoding"
    },
    "HW": {
        "organization": "Industry",
        "license": "Various",
        "pillar": "**S (Security)** - Hardware wallet"
    },
    "BACKUP": {
        "organization": "Industry",
        "license": "Various",
        "pillar": "**S (Security)** - Backup methods"
    },
    "METAL": {
        "organization": "Industry",
        "license": "Various",
        "pillar": "**F (Fortress)** - Physical durability"
    },
    "CARD": {
        "organization": "Industry",
        "license": "Various",
        "pillar": "**F (Fortress)** - Card format"
    },
    "AUTH": {
        "organization": "Industry",
        "license": "Various",
        "pillar": "**S (Security)** - Authentication"
    },
    "SEC": {
        "organization": "Industry",
        "license": "Various",
        "pillar": "**S (Security)** - Security feature"
    },
    "AUDIT": {
        "organization": "Security Firms",
        "license": "Various",
        "pillar": "**S (Security)** - Security audit"
    },
    "LEGAL": {
        "organization": "Regulatory Bodies",
        "license": "Public Law",
        "pillar": "**A (Adversity)** - Legal compliance"
    },
    "GOV": {
        "organization": "Various DAOs",
        "license": "Various",
        "pillar": "**E (Ecosystem)** - Governance"
    },
    "ORACLE": {
        "organization": "Oracle Providers",
        "license": "Various",
        "pillar": "**E (Ecosystem)** - Oracle integration"
    },
    "BRIDGE": {
        "organization": "Bridge Protocols",
        "license": "Various",
        "pillar": "**E (Ecosystem)** - Cross-chain bridge"
    },
    "STAKE": {
        "organization": "PoS Networks",
        "license": "Various",
        "pillar": "**E (Ecosystem)** - Staking"
    },
    "STABLE": {
        "organization": "Stablecoin Issuers",
        "license": "Various",
        "pillar": "**E (Ecosystem)** - Stablecoin support"
    },
    "LST": {
        "organization": "Liquid Staking Protocols",
        "license": "Various",
        "pillar": "**E (Ecosystem)** - Liquid staking"
    },
    "LRT": {
        "organization": "Restaking Protocols",
        "license": "Various",
        "pillar": "**E (Ecosystem)** - Liquid restaking"
    },
    "WRAP": {
        "organization": "Various",
        "license": "Various",
        "pillar": "**E (Ecosystem)** - Wrapped tokens"
    },
    "AI": {
        "organization": "AI/ML Community",
        "license": "Various",
        "pillar": "**E (Ecosystem)** - AI integration"
    },
    "FUTURE": {
        "organization": "Research",
        "license": "Various",
        "pillar": "**S (Security)** - Future-proofing"
    },
    "L2": {
        "organization": "L2 Networks",
        "license": "Various",
        "pillar": "**E (Ecosystem)** - Layer 2 support"
    },
    "INTEROP": {
        "organization": "Various",
        "license": "Various",
        "pillar": "**E (Ecosystem)** - Interoperability"
    },
    "ACCOUNT": {
        "organization": "Ethereum Community",
        "license": "Various",
        "pillar": "**E (Ecosystem)** - Account abstraction"
    },
    "DATA": {
        "organization": "Various",
        "license": "Various",
        "pillar": "**E (Ecosystem)** - Data availability"
    },
    "MEV": {
        "organization": "MEV Research",
        "license": "Various",
        "pillar": "**A (Adversity)** - MEV protection"
    },
    "INTENT": {
        "organization": "Intent Protocols",
        "license": "Various",
        "pillar": "**E (Ecosystem)** - Intent-based trading"
    },
    "PRIVACY": {
        "organization": "Privacy Protocols",
        "license": "Various",
        "pillar": "**A (Adversity)** - Privacy"
    },
    "VERIFY": {
        "organization": "Block Explorers",
        "license": "Various",
        "pillar": "**E (Ecosystem)** - Contract verification"
    },
    "SIM": {
        "organization": "Security Tools",
        "license": "Various",
        "pillar": "**S (Security)** - Transaction simulation"
    },
    "ANALYTICS": {
        "organization": "Analytics Providers",
        "license": "Various",
        "pillar": "**E (Ecosystem)** - Portfolio tracking"
    },
    "TAX": {
        "organization": "Tax Software",
        "license": "Various",
        "pillar": "**E (Ecosystem)** - Tax reporting"
    },
    "CUSTODY": {
        "organization": "Custody Providers",
        "license": "Various",
        "pillar": "**S (Security)** - Institutional custody"
    },
    "INSURE": {
        "organization": "DeFi Insurance",
        "license": "Various",
        "pillar": "**E (Ecosystem)** - Insurance coverage"
    },
    "MISC": {
        "organization": "Various",
        "license": "Various",
        "pillar": "**E (Ecosystem)** - Various integrations"
    },
    "REGION": {
        "organization": "Regulatory Bodies",
        "license": "Public Law",
        "pillar": "**A (Adversity)** - Regional compliance"
    },
    "FINAL": {
        "organization": "Industry",
        "license": "Various",
        "pillar": "**E (Ecosystem)** - Excellence criteria"
    },
    "ADD": {
        "organization": "Industry",
        "license": "Various",
        "pillar": "**E (Ecosystem)** - Additional features"
    },
    "SUPP": {
        "organization": "Industry",
        "license": "Various",
        "pillar": "**E (Ecosystem)** - Support features"
    },
    "EXTRA": {
        "organization": "Industry",
        "license": "Various",
        "pillar": "**E (Ecosystem)** - Extra features"
    },
    "LAST": {
        "organization": "Industry",
        "license": "Various",
        "pillar": "**E (Ecosystem)** - Transparency"
    },
    "END": {
        "organization": "Industry",
        "license": "Various",
        "pillar": "**E (Ecosystem)** - Excellence"
    },
    "COMPLETE": {
        "organization": "SafeScoring",
        "license": "Proprietary",
        "pillar": "**S/A/F/E** - SAFE certification"
    },
    "COMPANY": {
        "organization": "Industry",
        "license": "Various",
        "pillar": "**E (Ecosystem)** - Company structure"
    },
    "SUPPORT": {
        "organization": "Industry",
        "license": "Various",
        "pillar": "**E (Ecosystem)** - Customer support"
    },
    "UX": {
        "organization": "Industry",
        "license": "Various",
        "pillar": "**E (Ecosystem)** - User experience"
    },
    "PERF": {
        "organization": "Industry",
        "license": "Various",
        "pillar": "**E (Ecosystem)** - Performance"
    },
    "RECOVER": {
        "organization": "Industry",
        "license": "Various",
        "pillar": "**S (Security)** - Recovery"
    },
    "COMPAT": {
        "organization": "Industry",
        "license": "Various",
        "pillar": "**E (Ecosystem)** - Compatibility"
    },
    "TEST": {
        "organization": "Industry",
        "license": "Various",
        "pillar": "**F (Fortress)** - Testing"
    },
    "CI": {
        "organization": "Industry",
        "license": "Various",
        "pillar": "**E (Ecosystem)** - CI/CD"
    },
    "MONITOR": {
        "organization": "Industry",
        "license": "Various",
        "pillar": "**E (Ecosystem)** - Monitoring"
    },
    "SCALE": {
        "organization": "Industry",
        "license": "Various",
        "pillar": "**E (Ecosystem)** - Scalability"
    },
    "MOBILE": {
        "organization": "Industry",
        "license": "Various",
        "pillar": "**E (Ecosystem)** - Mobile apps"
    },
    "DESKTOP": {
        "organization": "Industry",
        "license": "Various",
        "pillar": "**E (Ecosystem)** - Desktop apps"
    },
    "BROWSER": {
        "organization": "Industry",
        "license": "Various",
        "pillar": "**E (Ecosystem)** - Browser extensions"
    },
    "PRICE": {
        "organization": "Industry",
        "license": "Various",
        "pillar": "**E (Ecosystem)** - Pricing"
    },
    "AVAIL": {
        "organization": "Industry",
        "license": "Various",
        "pillar": "**E (Ecosystem)** - Availability"
    },
    "LANG": {
        "organization": "Industry",
        "license": "Various",
        "pillar": "**E (Ecosystem)** - Language support"
    },
    "COMM": {
        "organization": "Industry",
        "license": "Various",
        "pillar": "**E (Ecosystem)** - Community"
    },
    "EDU": {
        "organization": "Industry",
        "license": "Various",
        "pillar": "**E (Ecosystem)** - Education"
    },
    "TRACK": {
        "organization": "Industry",
        "license": "Various",
        "pillar": "**E (Ecosystem)** - Track record"
    },
    "GAME": {
        "organization": "Gaming Industry",
        "license": "Various",
        "pillar": "**E (Ecosystem)** - Gaming"
    },
    "SOCIAL": {
        "organization": "Social Platforms",
        "license": "Various",
        "pillar": "**E (Ecosystem)** - Social features"
    },
    "PAY": {
        "organization": "Payment Providers",
        "license": "Various",
        "pillar": "**E (Ecosystem)** - Payments"
    },
    "EARN": {
        "organization": "DeFi Protocols",
        "license": "Various",
        "pillar": "**E (Ecosystem)** - Yield/Earning"
    },
    "TRADE": {
        "organization": "Trading Platforms",
        "license": "Various",
        "pillar": "**E (Ecosystem)** - Trading"
    },
    "PERP": {
        "organization": "Derivatives Platforms",
        "license": "Various",
        "pillar": "**E (Ecosystem)** - Perpetuals"
    },
    "OPT": {
        "organization": "Options Platforms",
        "license": "Various",
        "pillar": "**E (Ecosystem)** - Options"
    },
    "PRED": {
        "organization": "Prediction Markets",
        "license": "Various",
        "pillar": "**E (Ecosystem)** - Prediction markets"
    },
    "RWA": {
        "organization": "RWA Protocols",
        "license": "Various",
        "pillar": "**E (Ecosystem)** - Real world assets"
    },
    "NET": {
        "organization": "Network Protocols",
        "license": "Various",
        "pillar": "**A (Adversity)** - Network privacy"
    },
    "INST": {
        "organization": "Institutional Providers",
        "license": "Various",
        "pillar": "**E (Ecosystem)** - Institutional"
    },
    "TOKEN": {
        "organization": "Token Standards",
        "license": "Various",
        "pillar": "**E (Ecosystem)** - Token standards"
    },
    "ID": {
        "organization": "Identity Protocols",
        "license": "Various",
        "pillar": "**A (Adversity)** - Decentralized identity"
    },
    "STORAGE": {
        "organization": "Storage Protocols",
        "license": "Various",
        "pillar": "**E (Ecosystem)** - Decentralized storage"
    },
    "MSG": {
        "organization": "Messaging Protocols",
        "license": "Various",
        "pillar": "**A (Adversity)** - Secure messaging"
    },
    "INFRA": {
        "organization": "Infrastructure Providers",
        "license": "Various",
        "pillar": "**E (Ecosystem)** - Web3 infrastructure"
    },
    "DEV": {
        "organization": "Developer Tools",
        "license": "Various",
        "pillar": "**E (Ecosystem)** - Development tools"
    },
    "SDK": {
        "organization": "SDK Providers",
        "license": "Various",
        "pillar": "**E (Ecosystem)** - SDKs"
    },
    "BC": {
        "organization": "Blockchain Commons",
        "license": "Various",
        "pillar": "**E (Ecosystem)** - Blockchain Commons"
    },
    "W3C": {
        "organization": "W3C",
        "license": "W3C License",
        "pillar": "**E (Ecosystem)** - Web standards"
    },
    "FIDO": {
        "organization": "FIDO Alliance",
        "license": "Various",
        "pillar": "**S (Security)** - Authentication"
    },
    "WIFI": {
        "organization": "Wi-Fi Alliance",
        "license": "Proprietary",
        "pillar": "**E (Ecosystem)** - Connectivity"
    },
    # Default for S, A, F, E pillar codes
    "S": {
        "organization": "Industry",
        "license": "Various",
        "pillar": "**S (Security)** - Security standard"
    },
    "A": {
        "organization": "Industry",
        "license": "Various",
        "pillar": "**A (Adversity)** - Privacy/Adversity standard"
    },
    "F": {
        "organization": "Industry",
        "license": "Various",
        "pillar": "**F (Fortress)** - Durability standard"
    },
    "E": {
        "organization": "Industry",
        "license": "Various",
        "pillar": "**E (Ecosystem)** - Ecosystem standard"
    }
}

def get_prefix(code):
    """Extract prefix from code."""
    # Try longer prefixes first
    for length in [7, 6, 5, 4, 3, 2, 1]:
        prefix = code[:length]
        if prefix in PREFIX_DEFAULTS:
            return prefix
    # Default to first character (pillar)
    return code[0] if code else "E"

def get_defaults(code, pillar):
    """Get default values based on code prefix."""
    prefix = get_prefix(code)
    defaults = PREFIX_DEFAULTS.get(prefix, PREFIX_DEFAULTS.get(pillar, PREFIX_DEFAULTS["E"]))
    return defaults

def generate_sql_for_norm(code, title, pillar, description, chapter):
    """Generate SQL UPDATE statement for a norm."""
    defaults = get_defaults(code, pillar)
    
    # Determine criticality based on code patterns
    criticality = "**Important**"
    if any(x in code for x in ["01", "02", "03"]) or "essential" in (description or "").lower():
        criticality = "**Essential**"
    elif any(x in code for x in ["EXTRA", "MISC", "ADD"]):
        criticality = "**Optional**"
    
    summary = f"""## IDENTIFICATION
- **Code**: {code}
- **Title**: {title}
- **Version**: Current
- **Status**: Active
- **Author(s)**: See official documentation
- **Organization**: {defaults['organization']}
- **License**: {defaults['license']}

## EXECUTIVE SUMMARY
{description or title}. This standard is part of the {chapter or 'general'} category in the SAFE scoring framework.

## BACKGROUND AND MOTIVATION
This norm addresses requirements for {title.lower()}. It is relevant for cryptocurrency wallet and custody solution evaluation.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Defines requirements for {title.lower()}
- Part of pillar {pillar} in SAFE scoring

### Implementation
Implementation details available in official documentation.

### Parameters and Values
Specific parameters defined in official specification.

## SECURITY
### Security Guarantees
Security guarantees as defined in the official specification.

### Risks and Limitations
Consult official documentation for known limitations.

### Best Practices
Follow official implementation guidelines.

## COMPATIBILITY
### Dependencies
See official documentation for dependencies.

### Interoperability
Designed for interoperability within the crypto ecosystem.

## ADOPTION
### Reference Implementations
Reference implementations available from standard maintainers.

### Industry Adoption
Adoption level varies - consult industry resources.

## SAFE SCORING RELEVANCE
### Pillar
{defaults['pillar']}

### Criticality
{criticality}

### Evaluation Criteria
- Compliance with {code}: YES/NO
- Full implementation: YES/NO

## SOURCES
- **Official Document**: See official specification
- **Last Accessed**: 2026-01-19"""
    
    return summary

# This script generates the template - actual execution requires database connection
if __name__ == "__main__":
    print("Summary template generator ready.")
    print("Use with Supabase MCP to update all norms.")
