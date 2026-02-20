"""
Script to update norm summaries with real content from official sources.
Uses Supabase API to update the norms table.

Run with: python scripts/update_norm_summaries.py
Requires: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
"""

import os
import requests
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env")
    exit(1)

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

# Real summaries from official sources
REAL_SUMMARIES = {
    "BIP-84": {
        "match_titles": ["BIP-84", "BIP84", "P2WPKH", "Native SegWit"],
        "summary": """## IDENTIFICATION
- **Code**: BIP-84
- **Title**: Derivation scheme for P2WPKH based accounts
- **Version**: 2017-12-28
- **Status**: Deployed
- **Author(s)**: Pavol Rusnak (stick@satoshilabs.com)
- **Organization**: Bitcoin Community
- **License**: CC0-1.0

## EXECUTIVE SUMMARY
BIP-84 defines the derivation scheme for HD wallets using P2WPKH (Pay-to-Witness-Public-Key-Hash) serialization format for native SegWit transactions. It allows users to use different HD wallets with the same master seed seamlessly for native SegWit addresses (bc1q...).

## BACKGROUND AND MOTIVATION
With P2WPKH transactions, a common derivation scheme is necessary. Users need dedicated segregated witness accounts ensuring only compatible wallets detect and handle them appropriately. This enables lower transaction fees compared to legacy addresses.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Uses BIP-44 account structure with purpose 84'
- Native SegWit (bech32) addresses
- Lower fees than P2SH-wrapped SegWit (BIP-49)

### Implementation
**Derivation Path:**
m / 84' / coin_type' / account' / change / address_index

**Address Format:**
- witness: <signature> <pubkey>
- scriptSig: (empty)
- scriptPubKey: 0 <20-byte-key-hash>

**Extended Key Versions:**
- Mainnet: zpub (0x04b24746), zprv (0x04b2430c)
- Testnet: vpub (0x045f1cf6), vprv (0x045f18bc)

### Parameters and Values
Example (standard test mnemonic):
- Path: m/84'/0'/0'/0/0
- Address: bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu

## SECURITY
### Security Guarantees
- Same security as BIP-44 with SegWit benefits
- Hardened derivation for purpose/coin/account
- Incompatible wallets will not discover accounts (by design)

### Risks and Limitations
- Not backwards compatible with legacy wallets
- Requires SegWit support

### Best Practices
- Use for all new Bitcoin addresses
- Verify wallet supports native SegWit
- Backup includes all derivation paths

## COMPATIBILITY
### Dependencies
- BIP-32, BIP-43, BIP-44
- BIP-141 (SegWit)
- BIP-173 (Bech32)

### Interoperability
- All modern wallets support BIP-84
- Standard for native SegWit

## ADOPTION
### Reference Implementations
- Trezor, Ledger, all hardware wallets
- Electrum, Bitcoin Core

### Industry Adoption
- De facto standard for native SegWit
- Recommended for lowest fees

## SAFE SCORING RELEVANCE
### Pillar
**S (Security)** - Modern address derivation

### Criticality
**Essential** - Required for native SegWit support

### Evaluation Criteria
- BIP-84 support: YES/NO
- Native SegWit addresses: YES/NO

## SOURCES
- **Official Document**: https://github.com/bitcoin/bips/blob/master/bip-0084.mediawiki
- **Last Accessed**: 2026-01-19""",
        "official_link": "https://github.com/bitcoin/bips/blob/master/bip-0084.mediawiki"
    },
    
    "ERC-721": {
        "match_titles": ["ERC-721", "ERC721", "NFT Standard", "Non-Fungible"],
        "summary": """## IDENTIFICATION
- **Code**: ERC-721
- **Title**: Non-Fungible Token Standard
- **Version**: 2018-01-24
- **Status**: Final
- **Author(s)**: William Entriken, Dieter Shirley, Jacob Evans, Nastassia Sachs
- **Organization**: Ethereum Community
- **License**: CC0

## EXECUTIVE SUMMARY
ERC-721 defines a standard interface for non-fungible tokens (NFTs). It provides basic functionality to track and transfer NFTs where each token is unique. NFTs can represent ownership over digital or physical assets including artwork, collectibles, real estate.

## BACKGROUND AND MOTIVATION
A standard interface allows wallet/broker/auction applications to work with any NFT on Ethereum. Inspired by ERC-20 but designed for non-fungible assets where each token is distinct.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Each token has unique tokenId
- Ownership tracked per token
- Approval mechanism for operators

### Implementation
**Core Functions:**
- balanceOf(owner), ownerOf(tokenId)
- safeTransferFrom, transferFrom
- approve, setApprovalForAll
- getApproved, isApprovedForAll

**Events:** Transfer, Approval, ApprovalForAll

## SECURITY
### Security Guarantees
- Safe transfer prevents tokens sent to non-compatible contracts
- Explicit approval required for transfers

### Best Practices
- Use safeTransferFrom over transferFrom
- Use IPFS for immutable metadata

## ADOPTION
- OpenZeppelin ERC721, Solmate
- Universal standard for NFTs
- All major NFT platforms

## SAFE SCORING RELEVANCE
### Pillar
**E (Ecosystem)** - NFT support

### Evaluation Criteria
- ERC-721 support: YES/NO
- NFT display/transfer: YES/NO

## SOURCES
- **Official Document**: https://eips.ethereum.org/EIPS/eip-721
- **Last Accessed**: 2026-01-19""",
        "official_link": "https://eips.ethereum.org/EIPS/eip-721"
    },

    "ERC-1155": {
        "match_titles": ["ERC-1155", "ERC1155", "Multi Token"],
        "summary": """## IDENTIFICATION
- **Code**: ERC-1155
- **Title**: Multi Token Standard
- **Version**: 2018-06-17
- **Status**: Final
- **Author(s)**: Witek Radomski, Andrew Cooke, Philippe Castonguay, James Therien, Eric Binet, Ronan Sandford
- **Organization**: Ethereum Community
- **License**: CC0

## EXECUTIVE SUMMARY
ERC-1155 is a multi-token standard that allows a single contract to manage multiple token types (both fungible and non-fungible). It enables batch transfers and reduces gas costs significantly compared to deploying separate ERC-20 and ERC-721 contracts.

## BACKGROUND AND MOTIVATION
Games and applications often need both fungible tokens (currencies, resources) and non-fungible tokens (unique items). ERC-1155 provides a unified interface for both, with batch operations that dramatically reduce transaction costs.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Single contract for multiple token types
- Batch transfers in one transaction
- Supports both fungible and non-fungible tokens
- Reduced gas costs

### Implementation
**Core Functions:**
- balanceOf(account, id), balanceOfBatch(accounts, ids)
- safeTransferFrom(from, to, id, amount, data)
- safeBatchTransferFrom(from, to, ids, amounts, data)
- setApprovalForAll(operator, approved)
- isApprovedForAll(account, operator)

**Events:** TransferSingle, TransferBatch, ApprovalForAll, URI

### Parameters and Values
- Token ID: uint256
- Amount: uint256 (1 for NFTs, >1 for fungible)

## SECURITY
### Security Guarantees
- Safe transfer checks receiver compatibility
- Batch operations are atomic

### Best Practices
- Implement ERC1155Receiver for receiving contracts
- Use metadata URI for token information

## ADOPTION
- OpenZeppelin ERC1155
- Gaming platforms (Enjin, The Sandbox)
- Multi-asset protocols

## SAFE SCORING RELEVANCE
### Pillar
**E (Ecosystem)** - Multi-token support

### Evaluation Criteria
- ERC-1155 support: YES/NO
- Batch operations: YES/NO

## SOURCES
- **Official Document**: https://eips.ethereum.org/EIPS/eip-1155
- **Last Accessed**: 2026-01-19""",
        "official_link": "https://eips.ethereum.org/EIPS/eip-1155"
    },

    "BIP-141": {
        "match_titles": ["BIP-141", "BIP141", "SegWit", "Segregated Witness"],
        "summary": """## IDENTIFICATION
- **Code**: BIP-141
- **Title**: Segregated Witness (Consensus layer)
- **Version**: 2015-12-21
- **Status**: Final
- **Author(s)**: Eric Lombrozo, Johnson Lau, Pieter Wuille
- **Organization**: Bitcoin Community
- **License**: PD

## EXECUTIVE SUMMARY
BIP-141 defines Segregated Witness (SegWit), a soft fork that separates signature data (witness) from transaction data. This fixes transaction malleability, enables second-layer solutions like Lightning Network, and increases effective block capacity.

## BACKGROUND AND MOTIVATION
Transaction malleability allowed third parties to modify transaction IDs without invalidating signatures, breaking protocols that relied on txid stability. SegWit fixes this by moving signatures outside the transaction hash calculation.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Witness data stored separately from transaction
- New transaction serialization format
- Backward compatible soft fork
- Block weight replaces block size

### Implementation
**Witness Program:**
- Version byte (0x00 for P2WPKH/P2WSH)
- Witness program (20 or 32 bytes)

**Block Weight:**
- Base size × 3 + Total size
- Maximum: 4,000,000 weight units
- Effective ~2MB blocks

### Parameters and Values
- P2WPKH: version 0, 20-byte program
- P2WSH: version 0, 32-byte program
- Witness discount: 75% for witness data

## SECURITY
### Security Guarantees
- Fixes transaction malleability
- Enables secure second-layer protocols
- Maintains backward compatibility

### Risks and Limitations
- Requires wallet upgrades for full benefits
- Old nodes see SegWit outputs as anyone-can-spend

## ADOPTION
- Activated August 2017 (block 481,824)
- ~80% of Bitcoin transactions use SegWit
- Required for Lightning Network

## SAFE SCORING RELEVANCE
### Pillar
**S (Security)** - Transaction malleability fix

### Evaluation Criteria
- SegWit support: YES/NO
- Native SegWit (bech32): YES/NO

## SOURCES
- **Official Document**: https://github.com/bitcoin/bips/blob/master/bip-0141.mediawiki
- **Last Accessed**: 2026-01-19""",
        "official_link": "https://github.com/bitcoin/bips/blob/master/bip-0141.mediawiki"
    },

    "BIP-340": {
        "match_titles": ["BIP-340", "BIP340", "Schnorr", "Schnorr Signatures"],
        "summary": """## IDENTIFICATION
- **Code**: BIP-340
- **Title**: Schnorr Signatures for secp256k1
- **Version**: 2020-01-19
- **Status**: Final
- **Author(s)**: Pieter Wuille, Jonas Nick, Tim Ruffing
- **Organization**: Bitcoin Community
- **License**: BSD-2-Clause

## EXECUTIVE SUMMARY
BIP-340 specifies Schnorr signatures over the secp256k1 curve for Bitcoin. Schnorr signatures are more efficient than ECDSA, enable signature aggregation (key and signature aggregation for multisig), and provide provable security under standard assumptions.

## BACKGROUND AND MOTIVATION
ECDSA was chosen for Bitcoin due to patent concerns with Schnorr (expired 2008). Schnorr offers mathematical simplicity, provable security, linearity (enabling aggregation), and smaller signatures for multisig transactions.

## TECHNICAL SPECIFICATIONS
### Core Principles
- 64-byte signatures (vs 71-72 for ECDSA)
- x-only public keys (32 bytes)
- Batch verification possible
- Linear signature scheme

### Implementation
**Signature:** (r, s) where r is x-coordinate of R = kG
**Verification:** sG = R + e×P where e = hash(r || P || m)

**Tagged Hashes:**
- BIP0340/challenge, BIP0340/aux, BIP0340/nonce

### Parameters and Values
- Public key: 32 bytes (x-only)
- Signature: 64 bytes
- Message: 32 bytes (typically a hash)

## SECURITY
### Security Guarantees
- Provably secure under DL assumption
- No signature malleability
- Supports MuSig2 for secure multisig

### Best Practices
- Use deterministic nonce generation
- Implement batch verification when possible

## ADOPTION
- Activated with Taproot (November 2021)
- Required for BIP-341 (Taproot)
- MuSig2 implementations

## SAFE SCORING RELEVANCE
### Pillar
**S (Security)** - Modern signature scheme

### Evaluation Criteria
- Schnorr signature support: YES/NO
- Taproot support: YES/NO

## SOURCES
- **Official Document**: https://github.com/bitcoin/bips/blob/master/bip-0340.mediawiki
- **Last Accessed**: 2026-01-19""",
        "official_link": "https://github.com/bitcoin/bips/blob/master/bip-0340.mediawiki"
    },

    "BIP-341": {
        "match_titles": ["BIP-341", "BIP341", "Taproot"],
        "summary": """## IDENTIFICATION
- **Code**: BIP-341
- **Title**: Taproot: SegWit version 1 spending rules
- **Version**: 2020-01-19
- **Status**: Final
- **Author(s)**: Pieter Wuille, Jonas Nick, Anthony Towns
- **Organization**: Bitcoin Community
- **License**: BSD-3-Clause

## EXECUTIVE SUMMARY
BIP-341 defines Taproot, a SegWit version 1 output type that improves privacy, efficiency, and flexibility. It allows complex spending conditions to appear as simple single-key spends when the cooperative path is used, hiding the complexity of multisig or timelocked scripts.

## BACKGROUND AND MOTIVATION
Complex Bitcoin scripts reveal their full structure on-chain, reducing privacy and increasing fees. Taproot uses Schnorr signatures and Merkle trees to hide unused script paths, making all spends look identical when using the key path.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Key path: spend with single Schnorr signature
- Script path: reveal only the used script branch
- MAST (Merkelized Alternative Script Trees)
- Improved privacy for complex transactions

### Implementation
**Output:** OP_1 <32-byte-tweaked-pubkey>
**Key Path Spend:** 64-byte Schnorr signature
**Script Path Spend:** Control block + script + witness

**Tweak:** Q = P + hash(P || script_root)×G

### Parameters and Values
- Address prefix: bc1p (bech32m)
- Witness version: 1
- Output: 34 bytes

## SECURITY
### Security Guarantees
- Privacy: complex scripts look like single-sig
- Efficiency: smaller witnesses for multisig
- Flexibility: arbitrary script trees

### Best Practices
- Use key path for cooperative spends
- Design script trees with common paths near root

## ADOPTION
- Activated November 2021 (block 709,632)
- Growing adoption for multisig, Lightning
- Ordinals/Inscriptions use Taproot

## SAFE SCORING RELEVANCE
### Pillar
**S (Security)** - Advanced Bitcoin scripting

### Evaluation Criteria
- Taproot support: YES/NO
- bc1p addresses: YES/NO

## SOURCES
- **Official Document**: https://github.com/bitcoin/bips/blob/master/bip-0341.mediawiki
- **Last Accessed**: 2026-01-19""",
        "official_link": "https://github.com/bitcoin/bips/blob/master/bip-0341.mediawiki"
    },

    "EIP-1559": {
        "match_titles": ["EIP-1559", "EIP1559", "Fee Market"],
        "summary": """## IDENTIFICATION
- **Code**: EIP-1559
- **Title**: Fee market change for ETH 1.0 chain
- **Version**: 2019-04-13
- **Status**: Final
- **Author(s)**: Vitalik Buterin, Eric Conner, Rick Dudley, Matthew Slipper, Ian Norden, Abdelhamid Bakhta
- **Organization**: Ethereum Community
- **License**: CC0

## EXECUTIVE SUMMARY
EIP-1559 introduces a new transaction pricing mechanism with a base fee that is burned and a priority fee (tip) for miners/validators. It improves fee predictability, reduces fee volatility, and introduces ETH burning which can make ETH deflationary.

## BACKGROUND AND MOTIVATION
First-price auction fee markets lead to inefficient fee estimation, overpayment, and high volatility. EIP-1559 creates a more predictable fee market where the base fee adjusts algorithmically based on network congestion.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Base fee: algorithmically determined, burned
- Priority fee (tip): goes to validator
- Max fee: user's maximum willingness to pay
- Target block size: 15M gas (elastic to 30M)

### Implementation
**Transaction Fields:**
- max_fee_per_gas: maximum total fee
- max_priority_fee_per_gas: tip to validator
- Effective fee = min(max_fee, base_fee + priority_fee)

**Base Fee Adjustment:**
- Increases when blocks > 50% full
- Decreases when blocks < 50% full
- Max change: 12.5% per block

### Parameters and Values
- Target gas: 15,000,000
- Max gas: 30,000,000
- Base fee change denominator: 8 (12.5%)

## SECURITY
### Security Guarantees
- Predictable fees for users
- Reduced miner extractable value (MEV) from fee manipulation
- ETH supply reduction through burning

### Risks and Limitations
- Does not eliminate high fees during congestion
- Priority fee still subject to competition

## ADOPTION
- Activated August 2021 (London upgrade)
- Over 3M ETH burned since activation
- Standard for all Ethereum transactions

## SAFE SCORING RELEVANCE
### Pillar
**E (Ecosystem)** - Transaction fee handling

### Evaluation Criteria
- EIP-1559 support: YES/NO
- Fee estimation: ACCURATE/BASIC

## SOURCES
- **Official Document**: https://eips.ethereum.org/EIPS/eip-1559
- **Last Accessed**: 2026-01-19""",
        "official_link": "https://eips.ethereum.org/EIPS/eip-1559"
    },

    "EIP-4337": {
        "match_titles": ["EIP-4337", "EIP4337", "Account Abstraction"],
        "summary": """## IDENTIFICATION
- **Code**: EIP-4337
- **Title**: Account Abstraction Using Alt Mempool
- **Version**: 2021-09-29
- **Status**: Final
- **Author(s)**: Vitalik Buterin, Yoav Weiss, Dror Tirosh, Shahaf Nacson, Alex Forshtat, Kristof Gazso, Tjaden Hess
- **Organization**: Ethereum Community
- **License**: CC0

## EXECUTIVE SUMMARY
EIP-4337 enables account abstraction without protocol changes by introducing UserOperations, Bundlers, and an EntryPoint contract. It allows smart contract wallets with features like social recovery, multisig, gas sponsorship, and batched transactions without requiring users to hold ETH for gas.

## BACKGROUND AND MOTIVATION
EOAs (Externally Owned Accounts) have limitations: single key, no recovery, must hold ETH for gas. Smart contract wallets solve these but require complex infrastructure. EIP-4337 standardizes this with a decentralized mempool for UserOperations.

## TECHNICAL SPECIFICATIONS
### Core Principles
- UserOperation: pseudo-transaction signed by user
- Bundler: collects UserOps, submits to EntryPoint
- EntryPoint: singleton contract validating/executing UserOps
- Paymaster: optional gas sponsorship

### Implementation
**UserOperation Fields:**
- sender, nonce, initCode, callData
- callGasLimit, verificationGasLimit, preVerificationGas
- maxFeePerGas, maxPriorityFeePerGas
- paymasterAndData, signature

**Validation:**
1. Bundler simulates UserOp
2. EntryPoint calls wallet.validateUserOp()
3. If valid, executes callData

### Parameters and Values
- EntryPoint v0.6: 0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789
- EntryPoint v0.7: 0x0000000071727De22E5E9d8BAf0edAc6f37da032

## SECURITY
### Security Guarantees
- Decentralized bundler network
- Signature abstraction (any verification logic)
- Replay protection via nonces

### Best Practices
- Use audited wallet implementations
- Implement proper signature validation
- Consider Paymaster security

## ADOPTION
- Live on mainnet and L2s
- Safe, Biconomy, ZeroDev, Alchemy
- Growing ecosystem of bundlers and paymasters

## SAFE SCORING RELEVANCE
### Pillar
**E (Ecosystem)** - Smart wallet infrastructure

### Evaluation Criteria
- EIP-4337 support: YES/NO
- Smart wallet features: SOCIAL_RECOVERY/MULTISIG/GAS_SPONSORSHIP

## SOURCES
- **Official Document**: https://eips.ethereum.org/EIPS/eip-4337
- **Last Accessed**: 2026-01-19""",
        "official_link": "https://eips.ethereum.org/EIPS/eip-4337"
    },

    "EIP-2981": {
        "match_titles": ["EIP-2981", "EIP2981", "NFT Royalty"],
        "summary": """## IDENTIFICATION
- **Code**: EIP-2981
- **Title**: NFT Royalty Standard
- **Version**: 2020-09-15
- **Status**: Final
- **Author(s)**: Zach Burks, James Morgan, Blaine Malone, James Seibel
- **Organization**: Ethereum Community
- **License**: CC0

## EXECUTIVE SUMMARY
EIP-2981 defines a standardized way to retrieve royalty payment information for NFTs. It allows NFT contracts to signal a royalty amount to be paid to the creator on secondary sales, enabling marketplaces to honor creator royalties consistently.

## BACKGROUND AND MOTIVATION
NFT creators often want ongoing royalties from secondary sales. Without a standard, each marketplace implemented proprietary solutions. EIP-2981 provides a universal interface that any marketplace can query.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Single function to query royalty info
- Returns receiver address and royalty amount
- Percentage-based calculation
- Optional - marketplaces choose to honor

### Implementation
**Interface:**
```solidity
function royaltyInfo(uint256 tokenId, uint256 salePrice) 
    external view returns (address receiver, uint256 royaltyAmount);
```

### Parameters and Values
- Royalty typically 2.5% - 10%
- Calculated per-sale, not cumulative
- Can vary per tokenId

## SECURITY
### Security Guarantees
- Read-only function, no state changes
- Marketplaces control enforcement

### Risks and Limitations
- Not enforceable on-chain
- Marketplaces can ignore royalties
- No standard for multiple recipients

## ADOPTION
- OpenSea, Rarible, LooksRare (historically)
- OpenZeppelin implementation
- Declining enforcement by marketplaces

## SAFE SCORING RELEVANCE
### Pillar
**E (Ecosystem)** - NFT royalty support

### Evaluation Criteria
- EIP-2981 display: YES/NO
- Royalty honoring: YES/NO/OPTIONAL

## SOURCES
- **Official Document**: https://eips.ethereum.org/EIPS/eip-2981
- **Last Accessed**: 2026-01-19""",
        "official_link": "https://eips.ethereum.org/EIPS/eip-2981"
    },

    "CAIP-2": {
        "match_titles": ["CAIP-2", "CAIP2", "Chain ID"],
        "summary": """## IDENTIFICATION
- **Code**: CAIP-2
- **Title**: Blockchain ID Specification
- **Version**: 2019-12-05
- **Status**: Final
- **Author(s)**: Simon Warta, ligi, Pedro Gomes
- **Organization**: Chain Agnostic Standards Alliance
- **License**: CC0

## EXECUTIVE SUMMARY
CAIP-2 defines a way to identify a blockchain in a human-readable, machine-friendly, and chain-agnostic manner. It uses the format namespace:reference (e.g., eip155:1 for Ethereum mainnet) enabling wallets and dApps to work across multiple chains.

## BACKGROUND AND MOTIVATION
Multi-chain applications need a standard way to identify blockchains. Chain IDs alone are not unique across ecosystems. CAIP-2 provides a universal identifier that works across Bitcoin, Ethereum, Cosmos, and other ecosystems.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Format: namespace:reference
- Namespace: identifies the ecosystem
- Reference: chain-specific identifier

### Implementation
**Common Examples:**
- eip155:1 (Ethereum Mainnet)
- eip155:137 (Polygon)
- bip122:000000000019d6689c085ae165831e93 (Bitcoin)
- cosmos:cosmoshub-4 (Cosmos Hub)

### Parameters and Values
- Namespace: 3-8 lowercase alphanumeric
- Reference: 1-32 characters
- Total max: 41 characters

## SECURITY
### Security Guarantees
- Unambiguous chain identification
- Prevents cross-chain replay confusion

## ADOPTION
- WalletConnect, MetaMask
- Multi-chain dApps
- Chain Agnostic Improvement Proposals

## SAFE SCORING RELEVANCE
### Pillar
**E (Ecosystem)** - Multi-chain support

### Evaluation Criteria
- CAIP-2 chain identification: YES/NO
- Multi-chain support: YES/NO

## SOURCES
- **Official Document**: https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-2.md
- **Last Accessed**: 2026-01-19""",
        "official_link": "https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-2.md"
    },

    "RFC-6979": {
        "match_titles": ["RFC-6979", "RFC6979", "Deterministic DSA"],
        "summary": """## IDENTIFICATION
- **Code**: RFC 6979
- **Title**: Deterministic Usage of DSA and ECDSA
- **Version**: August 2013
- **Status**: Informational
- **Author(s)**: Thomas Pornin
- **Organization**: IETF
- **License**: IETF Trust

## EXECUTIVE SUMMARY
RFC 6979 specifies a deterministic method for generating the "random" k value in DSA and ECDSA signatures. This eliminates the risk of k-value reuse which would leak the private key, and enables reproducible signatures for testing.

## BACKGROUND AND MOTIVATION
ECDSA requires a random k value for each signature. If k is reused or predictable, the private key can be computed. The PlayStation 3 hack exploited this. RFC 6979 derives k deterministically from the private key and message, ensuring uniqueness without randomness.

## TECHNICAL SPECIFICATIONS
### Core Principles
- k derived from HMAC-DRBG
- Input: private key + message hash
- Deterministic but unpredictable to attackers
- Same message + key = same signature

### Implementation
1. h1 = H(m) (hash of message)
2. Initialize HMAC_DRBG with private key and h1
3. Generate k candidates until valid
4. Use k for ECDSA signature

### Parameters and Values
- Uses HMAC with hash function matching curve
- secp256k1: use SHA-256
- Produces k in range [1, n-1]

## SECURITY
### Security Guarantees
- Eliminates k-reuse vulnerability
- No dependency on RNG quality
- Provably secure if HMAC is secure

### Best Practices
- Always use RFC 6979 for ECDSA
- Verify implementation against test vectors

## ADOPTION
- Bitcoin Core, libsecp256k1
- Most cryptocurrency libraries
- OpenSSL (optional mode)

## SAFE SCORING RELEVANCE
### Pillar
**S (Security)** - Secure signature generation

### Evaluation Criteria
- RFC 6979 deterministic signatures: YES/NO

## SOURCES
- **Official Document**: https://tools.ietf.org/html/rfc6979
- **Last Accessed**: 2026-01-19""",
        "official_link": "https://tools.ietf.org/html/rfc6979"
    },

    "PBKDF2": {
        "match_titles": ["PBKDF2", "RFC-2898", "Key Derivation"],
        "summary": """## IDENTIFICATION
- **Code**: RFC 2898 / PBKDF2
- **Title**: Password-Based Key Derivation Function 2
- **Version**: September 2000
- **Status**: Informational
- **Author(s)**: B. Kaliski (RSA Laboratories)
- **Organization**: IETF
- **License**: IETF Trust

## EXECUTIVE SUMMARY
PBKDF2 (Password-Based Key Derivation Function 2) derives cryptographic keys from passwords. It applies a pseudorandom function (typically HMAC) iteratively to make brute-force attacks computationally expensive. Used in BIP-39 for seed derivation.

## BACKGROUND AND MOTIVATION
Passwords have low entropy compared to cryptographic keys. PBKDF2 stretches passwords by applying many iterations of a hash function, making each guess expensive for attackers while remaining practical for legitimate users.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Iterative application of PRF (HMAC)
- Salt prevents rainbow table attacks
- Iteration count adjustable for security/performance
- Produces key of any desired length

### Implementation
DK = PBKDF2(PRF, Password, Salt, c, dkLen)
- PRF: Pseudorandom function (HMAC-SHA256/512)
- c: Iteration count
- dkLen: Desired key length

**BIP-39 Usage:**
- PRF: HMAC-SHA512
- Password: mnemonic words
- Salt: "mnemonic" + passphrase
- Iterations: 2048
- dkLen: 64 bytes

### Parameters and Values
- Minimum iterations: 10,000 (NIST recommendation)
- BIP-39: 2048 iterations
- Modern recommendation: 600,000+ for passwords

## SECURITY
### Security Guarantees
- Slows brute-force attacks
- Salt prevents precomputation
- Adjustable work factor

### Risks and Limitations
- GPU/ASIC acceleration possible
- Consider Argon2 for new applications
- Iteration count should increase over time

## ADOPTION
- BIP-39 seed derivation
- WPA2 WiFi security
- Many password storage systems

## SAFE SCORING RELEVANCE
### Pillar
**S (Security)** - Key derivation security

### Evaluation Criteria
- PBKDF2 for key derivation: YES/NO
- Iteration count: NUMBER

## SOURCES
- **Official Document**: https://tools.ietf.org/html/rfc2898
- **Last Accessed**: 2026-01-19""",
        "official_link": "https://tools.ietf.org/html/rfc2898"
    },

    "SOC2": {
        "match_titles": ["SOC 2", "SOC2", "SOC-2"],
        "summary": """## IDENTIFICATION
- **Code**: SOC 2
- **Title**: System and Organization Controls 2
- **Version**: Current (updated periodically)
- **Status**: Active
- **Author(s)**: AICPA
- **Organization**: American Institute of Certified Public Accountants
- **License**: Proprietary

## EXECUTIVE SUMMARY
SOC 2 is an auditing framework that evaluates an organization's controls related to security, availability, processing integrity, confidentiality, and privacy (Trust Services Criteria). It's essential for service organizations handling customer data, including cryptocurrency custodians.

## BACKGROUND AND MOTIVATION
Organizations need to demonstrate their security practices to customers and partners. SOC 2 provides an independent third-party assessment of controls, building trust and meeting compliance requirements.

## TECHNICAL SPECIFICATIONS
### Core Principles - Trust Services Criteria
1. **Security**: Protection against unauthorized access
2. **Availability**: System accessible as agreed
3. **Processing Integrity**: Processing is complete and accurate
4. **Confidentiality**: Information designated confidential is protected
5. **Privacy**: Personal information handled appropriately

### Implementation
**Report Types:**
- Type I: Controls at a point in time
- Type II: Controls over a period (6-12 months)

**Common Controls:**
- Access management
- Encryption
- Monitoring and logging
- Incident response
- Change management

### Parameters and Values
- Audit period: typically 6-12 months for Type II
- Annual renewal recommended
- Report validity: typically 12 months

## SECURITY
### Security Guarantees
- Independent verification of controls
- Covers operational security practices
- Regular reassessment required

### Risks and Limitations
- Point-in-time or period assessment
- Does not guarantee zero breaches
- Scope can be limited

## ADOPTION
- Required by enterprise customers
- Standard for SaaS/cloud providers
- Cryptocurrency exchanges and custodians

## SAFE SCORING RELEVANCE
### Pillar
**S (Security)** - Organizational security compliance

### Evaluation Criteria
- SOC 2 Type II certified: YES/NO
- Report date: DATE
- Scope includes custody: YES/NO

## SOURCES
- **Official Document**: https://www.aicpa.org/soc2
- **Last Accessed**: 2026-01-19""",
        "official_link": "https://www.aicpa.org/interestareas/frc/assuranceadvisoryservices/sorhome"
    },

    "CC-EAL": {
        "match_titles": ["Common Criteria", "CC EAL", "EAL5", "EAL6"],
        "summary": """## IDENTIFICATION
- **Code**: ISO/IEC 15408 / Common Criteria
- **Title**: Common Criteria for IT Security Evaluation
- **Version**: 3.1 Revision 5
- **Status**: Active
- **Author(s)**: Common Criteria Recognition Arrangement
- **Organization**: ISO/IEC
- **License**: Proprietary

## EXECUTIVE SUMMARY
Common Criteria (CC) is an international standard for computer security certification. Products are evaluated against Protection Profiles and assigned an Evaluation Assurance Level (EAL1-7). Hardware wallets typically target EAL5+ for their secure elements.

## BACKGROUND AND MOTIVATION
Organizations need assurance that security products meet claimed security requirements. CC provides a framework for specifying security requirements (Protection Profiles) and evaluating products against them with varying levels of rigor.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Protection Profile (PP): security requirements
- Security Target (ST): product-specific claims
- Evaluation Assurance Level (EAL): rigor of evaluation

### Implementation
**Evaluation Assurance Levels:**
- EAL1: Functionally tested
- EAL2: Structurally tested
- EAL3: Methodically tested and checked
- EAL4: Methodically designed, tested, reviewed
- EAL5: Semiformally designed and tested
- EAL6: Semiformally verified design and tested
- EAL7: Formally verified design and tested

**Hardware Wallet Relevant:**
- Secure Element: typically EAL5+ or EAL6+
- Smart card chips: often EAL5+/EAL6+

### Parameters and Values
- Certification valid until product changes
- Mutual recognition among 31 countries
- Evaluation takes 6-18 months typically

## SECURITY
### Security Guarantees
- Independent third-party evaluation
- Standardized security requirements
- Internationally recognized

### Risks and Limitations
- Evaluates design, not implementation bugs
- Expensive and time-consuming
- Higher EAL ≠ more secure, just more assurance

## ADOPTION
- Infineon, STMicroelectronics secure elements
- Ledger, Trezor Safe, Coldcard secure elements
- Government and financial sector requirement

## SAFE SCORING RELEVANCE
### Pillar
**S (Security)** - Hardware security certification

### Evaluation Criteria
- Secure Element certified: YES/NO
- EAL level: EAL5/EAL5+/EAL6/EAL6+
- Certification ID: NUMBER

## SOURCES
- **Official Document**: https://www.commoncriteriaportal.org/
- **Last Accessed**: 2026-01-19""",
        "official_link": "https://www.commoncriteriaportal.org/"
    },

    "FIDO2": {
        "match_titles": ["FIDO2", "WebAuthn", "FIDO"],
        "summary": """## IDENTIFICATION
- **Code**: FIDO2 / WebAuthn
- **Title**: Fast Identity Online 2 / Web Authentication
- **Version**: 2019
- **Status**: W3C Recommendation
- **Author(s)**: FIDO Alliance, W3C
- **Organization**: FIDO Alliance / W3C
- **License**: W3C License

## EXECUTIVE SUMMARY
FIDO2 is a passwordless authentication standard combining WebAuthn (browser API) and CTAP (Client to Authenticator Protocol). It enables strong authentication using hardware security keys, biometrics, or platform authenticators, eliminating password-related vulnerabilities.

## BACKGROUND AND MOTIVATION
Passwords are the weakest link in security - reused, phished, and breached. FIDO2 provides phishing-resistant authentication using public key cryptography where the private key never leaves the authenticator device.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Public key cryptography (no shared secrets)
- Origin-bound credentials (phishing resistant)
- User verification (PIN, biometric, presence)
- Hardware-backed key storage

### Implementation
**Components:**
- WebAuthn: Browser JavaScript API
- CTAP2: Protocol between client and authenticator
- Authenticator: Hardware key, platform (TPM/Secure Enclave)

**Registration Flow:**
1. Server sends challenge
2. Authenticator creates key pair
3. Public key sent to server
4. Private key stored in authenticator

**Authentication Flow:**
1. Server sends challenge
2. Authenticator signs with private key
3. Server verifies signature

### Parameters and Values
- Credential ID: unique per site
- User verification: required/preferred/discouraged
- Attestation: none/indirect/direct

## SECURITY
### Security Guarantees
- Phishing resistant (origin binding)
- No password database to breach
- Hardware-protected private keys
- Replay attack protection

### Best Practices
- Require user verification for sensitive operations
- Support multiple authenticators per account
- Implement account recovery procedures

## ADOPTION
- YubiKey, Google Titan, SoloKeys
- Windows Hello, Apple Touch/Face ID
- Major websites: Google, Microsoft, GitHub

## SAFE SCORING RELEVANCE
### Pillar
**S (Security)** - Strong authentication

### Evaluation Criteria
- FIDO2/WebAuthn support: YES/NO
- Hardware key support: YES/NO

## SOURCES
- **Official Document**: https://fidoalliance.org/fido2/
- **WebAuthn Spec**: https://www.w3.org/TR/webauthn/
- **Last Accessed**: 2026-01-19""",
        "official_link": "https://fidoalliance.org/fido2/"
    },

    "PSBT": {
        "match_titles": ["PSBT", "BIP-174", "Partially Signed"],
        "summary": """## IDENTIFICATION
- **Code**: BIP-174
- **Title**: Partially Signed Bitcoin Transaction Format
- **Version**: 2017-07-12
- **Status**: Proposed
- **Author(s)**: Andrew Chow
- **Organization**: Bitcoin Community
- **License**: BSD-2-Clause

## EXECUTIVE SUMMARY
PSBT (Partially Signed Bitcoin Transaction) is a format for passing around unsigned or partially signed transactions. It enables multi-party signing workflows, hardware wallet integration, and CoinJoin coordination without exposing private keys.

## BACKGROUND AND MOTIVATION
Complex signing workflows (multisig, hardware wallets, CoinJoin) require passing transaction data between parties/devices. PSBT provides a standardized format containing all information needed to sign, without requiring access to the UTXO set or private keys.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Self-contained transaction data
- Extensible key-value format
- Supports multiple signers
- Separates creation, signing, finalization

### Implementation
**Roles:**
- Creator: Creates unsigned PSBT
- Updater: Adds UTXO info, scripts, derivation paths
- Signer: Adds signatures
- Combiner: Merges multiple PSBTs
- Finalizer: Creates final scriptSig/witness
- Extractor: Extracts signed transaction

**Key Fields:**
- PSBT_GLOBAL_UNSIGNED_TX
- PSBT_IN_WITNESS_UTXO / PSBT_IN_NON_WITNESS_UTXO
- PSBT_IN_BIP32_DERIVATION
- PSBT_IN_PARTIAL_SIG

### Parameters and Values
- Magic bytes: 0x70736274 ("psbt")
- Version: 0 or 2 (BIP-370)
- Base64 encoding for text transport

## SECURITY
### Security Guarantees
- Private keys never leave signing device
- All signing info self-contained
- Verifiable before signing

### Best Practices
- Verify transaction details on hardware wallet
- Use PSBT v2 for new implementations
- Validate UTXOs before signing

## ADOPTION
- All hardware wallets (Ledger, Trezor, Coldcard)
- Bitcoin Core, Electrum, Sparrow
- CoinJoin implementations (Wasabi, JoinMarket)

## SAFE SCORING RELEVANCE
### Pillar
**S (Security)** - Secure transaction signing

### Evaluation Criteria
- PSBT support: YES/NO
- PSBT version: v0/v2

## SOURCES
- **Official Document**: https://github.com/bitcoin/bips/blob/master/bip-0174.mediawiki
- **Last Accessed**: 2026-01-19""",
        "official_link": "https://github.com/bitcoin/bips/blob/master/bip-0174.mediawiki"
    },

    "MPC": {
        "match_titles": ["MPC", "Multi-Party Computation", "TSS"],
        "summary": """## IDENTIFICATION
- **Code**: MPC / TSS
- **Title**: Multi-Party Computation / Threshold Signature Scheme
- **Version**: Various implementations
- **Status**: Active research and deployment
- **Author(s)**: Various (Gennaro-Goldfeder, FROST, etc.)
- **Organization**: Academic/Industry
- **License**: Various

## EXECUTIVE SUMMARY
MPC (Multi-Party Computation) enables multiple parties to jointly compute a function without revealing their inputs. In crypto custody, TSS (Threshold Signature Schemes) allow t-of-n parties to sign transactions without reconstructing the full private key, eliminating single points of failure.

## BACKGROUND AND MOTIVATION
Traditional multisig reveals the signing structure on-chain and requires all signers to use the same protocol. MPC/TSS produces standard signatures indistinguishable from single-signer, provides key resharing without changing addresses, and works across different blockchains.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Distributed key generation (DKG)
- Threshold signing (t-of-n)
- No single party holds complete key
- Standard signature output

### Implementation
**Popular Protocols:**
- GG18/GG20: ECDSA threshold signatures
- FROST: Schnorr threshold signatures
- Lindell17: Two-party ECDSA

**Phases:**
1. Key Generation: Parties generate key shares
2. Signing: t parties collaborate to sign
3. Resharing: Update shares without changing key

### Parameters and Values
- Threshold: typically 2-of-3, 3-of-5
- Communication rounds: 2-4 for signing
- Supports ECDSA and Schnorr

## SECURITY
### Security Guarantees
- No single point of compromise
- Proactive security via resharing
- Privacy of signing structure

### Risks and Limitations
- Complex implementation
- Communication overhead
- Requires secure channels between parties

### Best Practices
- Use audited implementations
- Implement proper key backup
- Regular key resharing

## ADOPTION
- Fireblocks, Coinbase, BitGo
- ZenGo, Qredo
- Institutional custody solutions

## SAFE SCORING RELEVANCE
### Pillar
**S (Security)** - Advanced key management

### Evaluation Criteria
- MPC/TSS support: YES/NO
- Threshold configuration: t-of-n
- Key resharing: YES/NO

## SOURCES
- **GG20 Paper**: https://eprint.iacr.org/2020/540
- **FROST**: https://eprint.iacr.org/2020/852
- **Last Accessed**: 2026-01-19""",
        "official_link": "https://eprint.iacr.org/2020/540"
    },

    "Duress": {
        "match_titles": ["Duress", "Panic PIN", "Decoy"],
        "summary": """## IDENTIFICATION
- **Code**: Duress PIN / Panic Wallet
- **Title**: Duress Protection Feature
- **Version**: Implementation-specific
- **Status**: Active
- **Author(s)**: Various wallet manufacturers
- **Organization**: Industry
- **License**: Various

## EXECUTIVE SUMMARY
A Duress PIN (or Panic PIN) is a secondary PIN that opens a decoy wallet with limited funds when entered under coercion. This provides plausible deniability and protects the main wallet from physical attacks or $5 wrench attacks.

## BACKGROUND AND MOTIVATION
Physical security threats (robbery, kidnapping, extortion) cannot be solved by cryptography alone. A duress feature allows users to comply with attackers while protecting their main holdings, potentially saving lives and assets.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Secondary PIN opens different wallet
- Decoy wallet appears legitimate
- Main wallet remains hidden
- Plausible deniability

### Implementation
**Approaches:**
1. **Separate Derivation Path**: Different BIP-39 passphrase
2. **Dedicated Duress PIN**: Opens pre-configured decoy
3. **Hidden Volumes**: Similar to VeraCrypt hidden volumes

**Best Implementation:**
- Decoy should have transaction history
- Small but believable balance
- Regular activity to appear real

### Parameters and Values
- Duress PIN: different from main PIN
- Decoy balance: enough to be believable
- Separate seed or derivation path

## SECURITY
### Security Guarantees
- Protects against physical coercion
- Provides plausible deniability
- Attacker cannot prove hidden wallet exists

### Risks and Limitations
- Sophisticated attackers may know about feature
- Requires maintaining decoy wallet
- User must remember both PINs under stress

### Best Practices
- Keep believable balance in decoy
- Practice using duress PIN
- Consider multiple decoy levels
- Never reveal duress feature existence

## ADOPTION
- Coldcard (BIP-39 passphrase + duress PIN)
- Trezor (passphrase-based)
- Some software wallets

## SAFE SCORING RELEVANCE
### Pillar
**A (Adversity)** - Physical attack protection

### Evaluation Criteria
- Duress PIN support: YES/NO
- Decoy wallet: YES/NO
- Plausible deniability: YES/NO

## SOURCES
- **Coldcard Docs**: https://coldcard.com/docs/
- **Last Accessed**: 2026-01-19""",
        "official_link": "https://coldcard.com/docs/passphrase"
    },

    "Airgap": {
        "match_titles": ["Air-gap", "Airgap", "Air gap"],
        "summary": """## IDENTIFICATION
- **Code**: Air-Gap Security
- **Title**: Air-Gapped Operation
- **Version**: Security practice
- **Status**: Active
- **Author(s)**: Security community
- **Organization**: Industry best practice
- **License**: N/A

## EXECUTIVE SUMMARY
Air-gapped operation means the signing device never connects to the internet or any network. Transaction data is transferred via QR codes, SD cards, or NFC, eliminating remote attack vectors and providing the highest level of security for cold storage.

## BACKGROUND AND MOTIVATION
Internet-connected devices are vulnerable to remote attacks, malware, and supply chain compromises. Air-gapping physically isolates the signing environment, making remote exploitation impossible.

## TECHNICAL SPECIFICATIONS
### Core Principles
- No network connectivity (WiFi, Bluetooth, cellular)
- Data transfer via physical medium
- Signing occurs offline
- Verification before broadcast

### Implementation
**Data Transfer Methods:**
1. **QR Codes**: Visual, verifiable, no physical contact
2. **SD Card**: Higher bandwidth, requires physical handling
3. **NFC**: Convenient but requires proximity

**Workflow:**
1. Create unsigned transaction on online device
2. Transfer to air-gapped signer (QR/SD)
3. Verify and sign on air-gapped device
4. Transfer signed transaction back
5. Broadcast from online device

### Parameters and Values
- QR capacity: ~3KB per code (animated for larger)
- SD card: unlimited capacity
- PSBT format typically used

## SECURITY
### Security Guarantees
- Immune to remote attacks
- Malware cannot exfiltrate keys
- Physical verification of transactions

### Risks and Limitations
- Supply chain attacks still possible
- Physical access attacks
- User error in verification

### Best Practices
- Verify transaction details on device screen
- Use dedicated air-gapped device
- Secure physical storage
- Consider Faraday bag for transport

## ADOPTION
- Coldcard, Keystone, Passport
- Airgap Vault
- DIY solutions (Raspberry Pi + Specter)

## SAFE SCORING RELEVANCE
### Pillar
**S (Security)** - Maximum isolation security

### Evaluation Criteria
- Air-gapped operation: YES/NO
- Data transfer method: QR/SD/NFC
- No wireless radios: YES/NO

## SOURCES
- **Security Best Practices**: Industry standard
- **Last Accessed**: 2026-01-19""",
        "official_link": "https://en.wikipedia.org/wiki/Air_gap_(networking)"
    },

    "SHA256": {
        "match_titles": ["SHA-256", "SHA256", "SHA-2"],
        "summary": """## IDENTIFICATION
- **Code**: FIPS 180-4 / SHA-256
- **Title**: Secure Hash Algorithm 256-bit
- **Version**: 2015
- **Status**: Current
- **Author(s)**: NSA
- **Organization**: NIST
- **License**: Public Domain

## EXECUTIVE SUMMARY
SHA-256 is a cryptographic hash function producing a 256-bit (32-byte) digest. It is the backbone of Bitcoin's proof-of-work and is used throughout cryptocurrency for transaction hashing, address generation, and Merkle trees.

## BACKGROUND AND MOTIVATION
Cryptographic hash functions provide data integrity and are essential for digital signatures, proof-of-work, and data structures like Merkle trees. SHA-256 offers strong collision resistance and is widely trusted.

## TECHNICAL SPECIFICATIONS
### Core Principles
- 256-bit output (64 hex characters)
- Deterministic: same input = same output
- One-way: cannot reverse to find input
- Collision resistant: infeasible to find two inputs with same hash

### Implementation
- Block size: 512 bits
- Word size: 32 bits
- Rounds: 64
- Operations: AND, XOR, OR, addition, rotation

### Parameters and Values
- Output: 256 bits (32 bytes)
- Bitcoin uses double SHA-256: SHA256(SHA256(data))

## SECURITY
### Security Guarantees
- 2^128 operations for collision attack
- No practical attacks known

### Best Practices
- Use for integrity, not encryption
- Combine with HMAC for authentication

## ADOPTION
- Bitcoin, Ethereum (partially), most cryptocurrencies
- TLS, SSH, PGP
- Universal standard

## SAFE SCORING RELEVANCE
### Pillar
**S (Security)** - Cryptographic foundation

### Evaluation Criteria
- SHA-256 used: YES/NO

## SOURCES
- **Official Document**: https://csrc.nist.gov/publications/detail/fips/180/4/final
- **Last Accessed**: 2026-01-19""",
        "official_link": "https://csrc.nist.gov/publications/detail/fips/180/4/final"
    },

    "secp256k1": {
        "match_titles": ["secp256k1", "Elliptic Curve"],
        "summary": """## IDENTIFICATION
- **Code**: secp256k1
- **Title**: Elliptic Curve secp256k1
- **Version**: SEC 2 (2010)
- **Status**: Active
- **Author(s)**: Certicom Research
- **Organization**: SECG (Standards for Efficient Cryptography Group)
- **License**: Public

## EXECUTIVE SUMMARY
secp256k1 is the elliptic curve used by Bitcoin and Ethereum for digital signatures. It defines the mathematical parameters for ECDSA and Schnorr signatures, providing the cryptographic foundation for cryptocurrency ownership and transactions.

## BACKGROUND AND MOTIVATION
Elliptic curve cryptography provides equivalent security to RSA with much smaller key sizes. secp256k1 was chosen by Satoshi Nakamoto for Bitcoin, likely due to its efficiency and the fact it was not designed by NSA (unlike NIST curves).

## TECHNICAL SPECIFICATIONS
### Core Principles
- Koblitz curve over prime field
- 256-bit key size
- Used for ECDSA and Schnorr signatures

### Implementation
**Curve Parameters:**
- p = 2^256 - 2^32 - 977 (field prime)
- a = 0, b = 7 (curve: y² = x³ + 7)
- G = generator point
- n = curve order (number of points)
- h = 1 (cofactor)

**Key Generation:**
- Private key: random 256-bit integer < n
- Public key: private_key × G (point multiplication)

### Parameters and Values
- Private key: 32 bytes
- Public key (uncompressed): 65 bytes (04 || x || y)
- Public key (compressed): 33 bytes (02/03 || x)

## SECURITY
### Security Guarantees
- ~128 bits of security
- Discrete log problem assumed hard

### Risks and Limitations
- Vulnerable to quantum computers (Shor's algorithm)
- Implementation errors can leak keys

## ADOPTION
- Bitcoin, Ethereum, and most cryptocurrencies
- libsecp256k1 (optimized implementation)

## SAFE SCORING RELEVANCE
### Pillar
**S (Security)** - Cryptographic curve

### Evaluation Criteria
- secp256k1 support: YES/NO

## SOURCES
- **Official Document**: https://www.secg.org/sec2-v2.pdf
- **Last Accessed**: 2026-01-19""",
        "official_link": "https://www.secg.org/sec2-v2.pdf"
    },

    "Multisig": {
        "match_titles": ["Multisig", "Multi-sig", "Multi-signature"],
        "summary": """## IDENTIFICATION
- **Code**: Multisig / P2SH / P2WSH
- **Title**: Multi-Signature Transactions
- **Version**: Various (BIP-11, BIP-16, etc.)
- **Status**: Active
- **Author(s)**: Bitcoin Community
- **Organization**: Bitcoin Community
- **License**: MIT

## EXECUTIVE SUMMARY
Multisig (multi-signature) requires multiple private keys to authorize a transaction. Common configurations like 2-of-3 or 3-of-5 provide security against single key compromise and enable shared custody arrangements.

## BACKGROUND AND MOTIVATION
Single-key wallets have a single point of failure. Multisig distributes trust among multiple keys, enabling corporate treasury management, escrow services, and personal security through geographic distribution of keys.

## TECHNICAL SPECIFICATIONS
### Core Principles
- m-of-n threshold: m signatures required from n possible keys
- On-chain verification of all signatures
- Script-based implementation

### Implementation
**Bitcoin Script Types:**
- P2SH (BIP-16): Pay to Script Hash
- P2WSH (BIP-141): Pay to Witness Script Hash
- P2TR (BIP-341): Taproot with MAST

**Common Configurations:**
- 2-of-3: Personal security, small business
- 3-of-5: Corporate treasury
- 2-of-2: Joint accounts, escrow

### Parameters and Values
- Maximum: 15-of-15 (Bitcoin standard)
- Typical: 2-of-3, 3-of-5

## SECURITY
### Security Guarantees
- No single point of failure
- Survives loss of (n-m) keys
- Requires compromise of m keys

### Risks and Limitations
- Reveals signing structure on-chain
- Higher transaction fees
- Coordination required for signing

### Best Practices
- Distribute keys geographically
- Use different hardware for each key
- Document recovery procedures

## ADOPTION
- All hardware wallets support multisig
- Exchanges use for cold storage
- Corporate treasury standard

## SAFE SCORING RELEVANCE
### Pillar
**S (Security)** - Key management

### Evaluation Criteria
- Multisig support: YES/NO
- Configurations: 2-of-3, 3-of-5, custom

## SOURCES
- **BIP-11**: https://github.com/bitcoin/bips/blob/master/bip-0011.mediawiki
- **Last Accessed**: 2026-01-19""",
        "official_link": "https://github.com/bitcoin/bips/blob/master/bip-0011.mediawiki"
    },

    "2FA": {
        "match_titles": ["2FA", "Two-Factor", "TOTP", "OTP"],
        "summary": """## IDENTIFICATION
- **Code**: RFC 6238 / TOTP
- **Title**: Time-Based One-Time Password
- **Version**: 2011
- **Status**: Proposed Standard
- **Author(s)**: D. M'Raihi, S. Machani, M. Pei, J. Rydell
- **Organization**: IETF
- **License**: IETF Trust

## EXECUTIVE SUMMARY
TOTP (Time-based One-Time Password) generates temporary codes that change every 30 seconds, providing a second authentication factor. Combined with passwords, it significantly reduces account compromise risk.

## BACKGROUND AND MOTIVATION
Passwords alone are insufficient - they can be phished, leaked, or guessed. 2FA adds a second factor (something you have) that changes frequently, making stolen credentials useless without the authenticator device.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Shared secret between server and authenticator
- Time-synchronized code generation
- Short validity window (typically 30 seconds)

### Implementation
TOTP = HOTP(K, T)
- K: shared secret key
- T: floor((Current Unix time) / 30)
- HOTP: HMAC-based OTP (RFC 4226)

**Code Generation:**
1. HMAC-SHA1(secret, time_counter)
2. Dynamic truncation to 6-8 digits

### Parameters and Values
- Code length: 6 digits (standard)
- Time step: 30 seconds
- Algorithm: HMAC-SHA1 (or SHA256/SHA512)

## SECURITY
### Security Guarantees
- Codes expire quickly
- Requires physical access to authenticator
- Protects against password-only attacks

### Risks and Limitations
- Phishable in real-time attacks
- SIM swap attacks (SMS 2FA)
- Backup codes can be compromised

### Best Practices
- Use authenticator app over SMS
- Enable on all accounts
- Secure backup codes
- Consider hardware keys (FIDO2) for high-value accounts

## ADOPTION
- Google Authenticator, Authy, 1Password
- All major exchanges and services
- Universal standard for 2FA

## SAFE SCORING RELEVANCE
### Pillar
**S (Security)** - Account protection

### Evaluation Criteria
- 2FA support: YES/NO
- Methods: TOTP/SMS/HARDWARE_KEY

## SOURCES
- **Official Document**: https://tools.ietf.org/html/rfc6238
- **Last Accessed**: 2026-01-19""",
        "official_link": "https://tools.ietf.org/html/rfc6238"
    },

    "Passphrase": {
        "match_titles": ["Passphrase", "BIP-39 Passphrase", "25th word"],
        "summary": """## IDENTIFICATION
- **Code**: BIP-39 Passphrase
- **Title**: Optional Passphrase (25th Word)
- **Version**: Part of BIP-39
- **Status**: Deployed
- **Author(s)**: BIP-39 Authors
- **Organization**: Bitcoin Community
- **License**: MIT

## EXECUTIVE SUMMARY
The BIP-39 passphrase is an optional extension to the mnemonic seed that creates entirely different wallets from the same seed words. It provides plausible deniability, additional security, and enables multiple wallets from one backup.

## BACKGROUND AND MOTIVATION
A stolen seed phrase compromises all funds. The passphrase adds a layer that attackers cannot know exists. Different passphrases generate completely different wallets, enabling hidden wallets and plausible deniability.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Passphrase is NOT a password (no wrong passphrase)
- Any passphrase generates a valid wallet
- Empty passphrase = standard wallet
- Different passphrase = different wallet

### Implementation
Seed = PBKDF2(mnemonic, "mnemonic" + passphrase, 2048, HMAC-SHA512)

**Key Points:**
- Passphrase is case-sensitive
- Spaces and special characters matter
- No checksum - any input works
- Unicode normalization (NFKD) applied

### Parameters and Values
- No length limit (practical: memorable)
- Recommended: 12+ characters
- Can be words, sentence, or random

## SECURITY
### Security Guarantees
- Seed alone cannot access funds
- Plausible deniability (multiple wallets)
- Protects against seed-only theft

### Risks and Limitations
- Forgotten passphrase = lost funds forever
- No way to verify correct passphrase
- Must backup passphrase separately from seed

### Best Practices
- Use memorable but unique passphrase
- Store passphrase backup separately from seed
- Test recovery before depositing funds
- Consider multiple passphrases for different security levels

## ADOPTION
- All BIP-39 compatible wallets
- Ledger, Trezor, Coldcard
- Standard feature

## SAFE SCORING RELEVANCE
### Pillar
**A (Adversity)** - Plausible deniability

### Evaluation Criteria
- Passphrase support: YES/NO
- Hidden wallet creation: YES/NO

## SOURCES
- **Official Document**: https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki
- **Last Accessed**: 2026-01-19""",
        "official_link": "https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki"
    },

    "WalletConnect": {
        "match_titles": ["WalletConnect", "Wallet Connect"],
        "summary": """## IDENTIFICATION
- **Code**: WalletConnect
- **Title**: WalletConnect Protocol
- **Version**: v2.0
- **Status**: Active
- **Author(s)**: WalletConnect Foundation
- **Organization**: WalletConnect Foundation
- **License**: Apache 2.0

## EXECUTIVE SUMMARY
WalletConnect is an open protocol for connecting wallets to dApps using end-to-end encryption. It enables users to interact with decentralized applications from any wallet without exposing private keys.

## BACKGROUND AND MOTIVATION
Users want to use dApps from their preferred wallet without installing browser extensions or trusting websites with keys. WalletConnect provides a secure bridge between wallets and dApps across devices.

## TECHNICAL SPECIFICATIONS
### Core Principles
- End-to-end encryption
- QR code or deep link pairing
- Chain agnostic
- No private key exposure

### Implementation
**v2.0 Features:**
- Multi-chain support
- Session management
- Pairing and authentication
- Push notifications

**Connection Flow:**
1. dApp generates pairing URI
2. User scans QR or clicks deep link
3. Wallet approves connection
4. Encrypted communication established

### Parameters and Values
- Relay servers: wss://relay.walletconnect.com
- Encryption: X25519 + ChaCha20-Poly1305
- Session expiry: configurable

## SECURITY
### Security Guarantees
- Private keys never leave wallet
- End-to-end encrypted messages
- User approval for each action

### Risks and Limitations
- Phishing via malicious dApps
- Relay server availability
- Session hijacking if pairing exposed

### Best Practices
- Verify dApp URL before connecting
- Review transaction details in wallet
- Disconnect unused sessions

## ADOPTION
- MetaMask, Trust Wallet, Rainbow
- Uniswap, OpenSea, Aave
- Standard for mobile wallet connectivity

## SAFE SCORING RELEVANCE
### Pillar
**E (Ecosystem)** - dApp connectivity

### Evaluation Criteria
- WalletConnect v2 support: YES/NO
- Multi-chain sessions: YES/NO

## SOURCES
- **Official Document**: https://docs.walletconnect.com/
- **Last Accessed**: 2026-01-19""",
        "official_link": "https://docs.walletconnect.com/"
    },

    "GDPR": {
        "match_titles": ["GDPR", "General Data Protection"],
        "summary": """## IDENTIFICATION
- **Code**: GDPR
- **Title**: General Data Protection Regulation
- **Version**: 2016/679
- **Status**: Active (since May 25, 2018)
- **Author(s)**: European Parliament and Council
- **Organization**: European Union
- **License**: EU Law

## EXECUTIVE SUMMARY
GDPR is the EU's comprehensive data protection regulation governing how organizations collect, process, store, and transfer personal data of EU residents. It applies to any organization handling EU citizen data, regardless of location, with significant fines for non-compliance.

## BACKGROUND AND MOTIVATION
Digital services collect vast amounts of personal data. GDPR gives individuals control over their data and establishes consistent rules across the EU. For crypto services, this affects KYC data, transaction history, and user analytics.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Lawfulness, fairness, transparency
- Purpose limitation
- Data minimization
- Accuracy
- Storage limitation
- Integrity and confidentiality
- Accountability

### Implementation
**Key Rights:**
- Right to access
- Right to rectification
- Right to erasure ("right to be forgotten")
- Right to data portability
- Right to object
- Rights related to automated decision-making

**Requirements:**
- Privacy by design
- Data Protection Impact Assessments
- Data breach notification (72 hours)
- Data Protection Officer (for large-scale processing)

### Parameters and Values
- Fines: up to €20M or 4% of global revenue
- Breach notification: 72 hours
- Applies to: any EU resident data

## SECURITY
### Security Guarantees
- Mandatory security measures
- Breach notification requirements
- Regular audits and assessments

### Risks and Limitations
- Blockchain immutability conflicts with right to erasure
- Pseudonymous addresses may still be personal data
- Cross-border data transfers restricted

### Best Practices
- Minimize data collection
- Implement privacy by design
- Document all processing activities
- Regular compliance audits

## ADOPTION
- Mandatory for EU operations
- Global standard influence (CCPA, LGPD)
- All major exchanges comply

## SAFE SCORING RELEVANCE
### Pillar
**S (Security)** - Data protection compliance

### Evaluation Criteria
- GDPR compliant: YES/NO
- Privacy policy: YES/NO
- Data deletion available: YES/NO

## SOURCES
- **Official Document**: https://gdpr.eu/
- **Last Accessed**: 2026-01-19""",
        "official_link": "https://gdpr.eu/"
    },

    "PCI-DSS": {
        "match_titles": ["PCI-DSS", "PCI DSS", "Payment Card"],
        "summary": """## IDENTIFICATION
- **Code**: PCI DSS v4.0
- **Title**: Payment Card Industry Data Security Standard
- **Version**: 4.0 (March 2022)
- **Status**: Active
- **Author(s)**: PCI Security Standards Council
- **Organization**: PCI SSC (Visa, Mastercard, Amex, Discover, JCB)
- **License**: Proprietary

## EXECUTIVE SUMMARY
PCI DSS is a security standard for organizations handling payment card data. It defines requirements for secure networks, data protection, vulnerability management, access control, monitoring, and security policies. Relevant for crypto services accepting card payments.

## BACKGROUND AND MOTIVATION
Payment card fraud costs billions annually. PCI DSS establishes baseline security requirements to protect cardholder data throughout the transaction lifecycle, from merchants to processors to acquirers.

## TECHNICAL SPECIFICATIONS
### Core Principles - 12 Requirements
1. Install and maintain network security controls
2. Apply secure configurations
3. Protect stored account data
4. Protect cardholder data during transmission
5. Protect systems from malicious software
6. Develop secure systems and software
7. Restrict access by business need-to-know
8. Identify users and authenticate access
9. Restrict physical access to cardholder data
10. Log and monitor access
11. Test security regularly
12. Support information security with policies

### Implementation
**Compliance Levels:**
- Level 1: >6M transactions/year (annual audit)
- Level 2: 1-6M transactions/year
- Level 3: 20K-1M e-commerce transactions
- Level 4: <20K e-commerce or <1M other

### Parameters and Values
- SAQ (Self-Assessment Questionnaire) for smaller merchants
- QSA (Qualified Security Assessor) for Level 1
- Annual validation required

## SECURITY
### Security Guarantees
- Baseline security controls
- Regular vulnerability scanning
- Penetration testing requirements

### Best Practices
- Minimize cardholder data storage
- Encrypt data at rest and in transit
- Segment cardholder data environment

## ADOPTION
- Required for card payment acceptance
- Major exchanges (fiat on-ramps)
- Payment processors

## SAFE SCORING RELEVANCE
### Pillar
**S (Security)** - Payment security compliance

### Evaluation Criteria
- PCI DSS compliant: YES/NO/N/A
- Compliance level: 1/2/3/4

## SOURCES
- **Official Document**: https://www.pcisecuritystandards.org/
- **Last Accessed**: 2026-01-19""",
        "official_link": "https://www.pcisecuritystandards.org/"
    },

    "Lightning": {
        "match_titles": ["Lightning", "BOLT", "Lightning Network"],
        "summary": """## IDENTIFICATION
- **Code**: BOLT (Basis of Lightning Technology)
- **Title**: Lightning Network Protocol
- **Version**: Various BOLTs
- **Status**: Active
- **Author(s)**: Lightning Labs, ACINQ, Blockstream
- **Organization**: Lightning Network Community
- **License**: Various (MIT, Apache)

## EXECUTIVE SUMMARY
The Lightning Network is a Layer 2 payment protocol built on Bitcoin enabling instant, low-cost transactions through payment channels. It uses HTLCs (Hash Time-Locked Contracts) to route payments across a network of channels without on-chain transactions.

## BACKGROUND AND MOTIVATION
Bitcoin's base layer is limited to ~7 transactions per second. Lightning enables millions of transactions per second off-chain, with final settlement on Bitcoin. This makes micropayments practical and reduces fees.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Payment channels between two parties
- Multi-hop routing via HTLCs
- On-chain settlement only for open/close/disputes
- Instant finality within network

### Implementation
**Key BOLTs:**
- BOLT 1: Base Protocol
- BOLT 2: Peer Protocol for Channel Management
- BOLT 3: Bitcoin Transaction and Script Formats
- BOLT 4: Onion Routing Protocol
- BOLT 7: P2P Node and Channel Discovery
- BOLT 11: Invoice Protocol

**Channel Lifecycle:**
1. Open: funding transaction on-chain
2. Update: off-chain commitment transactions
3. Close: cooperative or unilateral on-chain

### Parameters and Values
- Channel capacity: variable (typically 0.001-0.1 BTC)
- Routing fees: typically 1 sat base + 0.001% proportional
- HTLC timeout: configurable (default ~1 day)

## SECURITY
### Security Guarantees
- Trustless (can always close unilaterally)
- Funds secured by Bitcoin blockchain
- Privacy via onion routing

### Risks and Limitations
- Requires online node for receiving
- Channel liquidity management
- Watchtower needed for offline security

### Best Practices
- Run own node for sovereignty
- Use watchtowers for channel monitoring
- Maintain balanced channels

## ADOPTION
- Phoenix, Breez, Muun wallets
- Strike, Cash App
- Growing merchant adoption

## SAFE SCORING RELEVANCE
### Pillar
**E (Ecosystem)** - Layer 2 scaling

### Evaluation Criteria
- Lightning support: YES/NO
- Send/Receive: BOTH/SEND_ONLY/RECEIVE_ONLY
- Own node or custodial: SELF/CUSTODIAL

## SOURCES
- **Official Document**: https://github.com/lightning/bolts
- **Last Accessed**: 2026-01-19""",
        "official_link": "https://github.com/lightning/bolts"
    },

    "BIP85": {
        "match_titles": ["BIP-85", "BIP85", "Deterministic Entropy"],
        "summary": """## IDENTIFICATION
- **Code**: BIP-85
- **Title**: Deterministic Entropy From BIP32 Keychains
- **Version**: 2020
- **Status**: Draft
- **Author(s)**: Ethan Kosakovsky
- **Organization**: Bitcoin Community
- **License**: BSD-2-Clause

## EXECUTIVE SUMMARY
BIP-85 allows deriving multiple independent seeds/entropy from a single master BIP-32 seed. This enables one master backup to generate unlimited child seeds for different wallets, applications, or purposes while maintaining cryptographic independence.

## BACKGROUND AND MOTIVATION
Users need multiple seeds for different purposes (hardware wallets, software wallets, specific applications). Managing multiple backups is risky. BIP-85 derives independent entropy from one master seed, requiring only one secure backup.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Derive entropy from BIP-32 path
- Output is cryptographically independent
- One master seed → unlimited child seeds
- Child compromise doesn't affect master

### Implementation
**Derivation Path:**
m/83696968'/{app}'/{index}'

**Applications:**
- 39': BIP-39 mnemonic (12-24 words)
- 2': WIF (Wallet Import Format)
- 32': BIP-32 HD seed
- 128169': RSA key

**Process:**
1. Derive key at BIP-85 path
2. HMAC-SHA512 with "bip-entropy-from-k"
3. Use output as entropy for target application

### Parameters and Values
- 12 words: 16 bytes entropy
- 24 words: 32 bytes entropy
- Index allows unlimited derivations

## SECURITY
### Security Guarantees
- Child seeds cryptographically independent
- Master seed required for derivation
- One backup protects all derived seeds

### Risks and Limitations
- Master seed compromise = all derived seeds compromised
- Not all wallets support BIP-85
- Must track which indices are used

### Best Practices
- Secure master seed with highest security
- Document derivation paths used
- Test derived seeds before use

## ADOPTION
- Coldcard (native support)
- Passport, SeedSigner
- Some software wallets

## SAFE SCORING RELEVANCE
### Pillar
**S (Security)** - Seed management

### Evaluation Criteria
- BIP-85 support: YES/NO
- Derivation options: MNEMONIC/WIF/HD_SEED

## SOURCES
- **Official Document**: https://github.com/bitcoin/bips/blob/master/bip-0085.mediawiki
- **Last Accessed**: 2026-01-19""",
        "official_link": "https://github.com/bitcoin/bips/blob/master/bip-0085.mediawiki"
    },

    "EIP155": {
        "match_titles": ["EIP-155", "EIP155", "Chain ID", "Replay Protection"],
        "summary": """## IDENTIFICATION
- **Code**: EIP-155
- **Title**: Simple replay attack protection
- **Version**: 2016-10-14
- **Status**: Final
- **Author(s)**: Vitalik Buterin
- **Organization**: Ethereum Community
- **License**: CC0

## EXECUTIVE SUMMARY
EIP-155 adds replay attack protection to Ethereum transactions by including the chain ID in the transaction signature. This prevents transactions signed for one chain (e.g., mainnet) from being replayed on another chain (e.g., a fork or testnet).

## BACKGROUND AND MOTIVATION
Before EIP-155, the same transaction could be valid on multiple Ethereum chains. After the Ethereum/Ethereum Classic split, this allowed replay attacks where transactions could be executed on both chains unintentionally.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Chain ID included in signature hash
- Different chains have different IDs
- Backward compatible with legacy transactions

### Implementation
**Signature includes:**
- v = chain_id * 2 + 35 + recovery_id
- Instead of v = 27 + recovery_id

**Common Chain IDs:**
- 1: Ethereum Mainnet
- 5: Goerli Testnet
- 137: Polygon
- 42161: Arbitrum One
- 10: Optimism

### Parameters and Values
- v value indicates chain ID
- Legacy v: 27 or 28
- EIP-155 v: chain_id * 2 + 35 or 36

## SECURITY
### Security Guarantees
- Prevents cross-chain replay attacks
- Transaction bound to specific chain
- Backward compatible

### Best Practices
- Always use EIP-155 for new transactions
- Verify chain ID before signing
- Wallets should display chain ID

## ADOPTION
- All Ethereum clients since 2016
- All EVM-compatible chains
- Universal standard

## SAFE SCORING RELEVANCE
### Pillar
**S (Security)** - Transaction security

### Evaluation Criteria
- EIP-155 support: YES/NO
- Chain ID verification: YES/NO

## SOURCES
- **Official Document**: https://eips.ethereum.org/EIPS/eip-155
- **Last Accessed**: 2026-01-19""",
        "official_link": "https://eips.ethereum.org/EIPS/eip-155"
    },

    "EIP191": {
        "match_titles": ["EIP-191", "EIP191", "Signed Data"],
        "summary": """## IDENTIFICATION
- **Code**: EIP-191
- **Title**: Signed Data Standard
- **Version**: 2016-01-20
- **Status**: Final
- **Author(s)**: Martin Holst Swende, Nick Johnson
- **Organization**: Ethereum Community
- **License**: CC0

## EXECUTIVE SUMMARY
EIP-191 defines a standard for signing arbitrary data in Ethereum, preventing signed messages from being mistaken for transactions. It prefixes messages with "\\x19Ethereum Signed Message:\\n" followed by the message length.

## BACKGROUND AND MOTIVATION
Without a standard prefix, a signed message could potentially be a valid transaction, leading to security vulnerabilities. EIP-191 ensures signed data cannot be confused with transaction data.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Prefix prevents transaction confusion
- Version byte for different signing schemes
- Human-readable for personal_sign

### Implementation
**Format:**
0x19 <version byte> <version specific data> <data to sign>

**Version Bytes:**
- 0x00: Data with intended validator
- 0x01: Structured data (EIP-712)
- 0x45: personal_sign messages

**personal_sign:**
"\\x19Ethereum Signed Message:\\n" + len(message) + message

### Parameters and Values
- Prefix: 0x19 (not valid RLP)
- personal_sign prefix: 26 bytes + length

## SECURITY
### Security Guarantees
- Signed messages cannot be transactions
- Clear separation of concerns
- Standardized verification

### Best Practices
- Always use EIP-191 for message signing
- Display message content before signing
- Verify signatures properly

## ADOPTION
- All Ethereum wallets
- MetaMask personal_sign
- Foundation for EIP-712

## SAFE SCORING RELEVANCE
### Pillar
**S (Security)** - Message signing security

### Evaluation Criteria
- EIP-191 support: YES/NO
- Message display: YES/NO

## SOURCES
- **Official Document**: https://eips.ethereum.org/EIPS/eip-191
- **Last Accessed**: 2026-01-19""",
        "official_link": "https://eips.ethereum.org/EIPS/eip-191"
    },

    "EIP2612": {
        "match_titles": ["EIP-2612", "EIP2612", "Permit"],
        "summary": """## IDENTIFICATION
- **Code**: EIP-2612
- **Title**: Permit Extension for EIP-20 Signed Approvals
- **Version**: 2020-04-13
- **Status**: Final
- **Author(s)**: Martin Lundfall
- **Organization**: Ethereum Community
- **License**: CC0

## EXECUTIVE SUMMARY
EIP-2612 adds a permit function to ERC-20 tokens allowing approvals via signatures instead of transactions. Users can authorize token spending with a signature, enabling gasless approvals and better UX for token interactions.

## BACKGROUND AND MOTIVATION
ERC-20 approve requires a separate transaction, costing gas and requiring ETH. Permit allows approvals via off-chain signatures, enabling gasless token approvals and single-transaction token swaps.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Off-chain signature for approval
- Nonce prevents replay
- Deadline for time-limited permits
- EIP-712 typed data signing

### Implementation
**permit function:**
```solidity
function permit(
    address owner,
    address spender,
    uint256 value,
    uint256 deadline,
    uint8 v, bytes32 r, bytes32 s
) external;
```

**Signature Domain:**
- name: token name
- version: "1"
- chainId: EIP-155 chain ID
- verifyingContract: token address

### Parameters and Values
- Nonce: increments per owner
- Deadline: Unix timestamp
- Value: approval amount (type(uint256).max for infinite)

## SECURITY
### Security Guarantees
- Replay protection via nonces
- Time-limited via deadline
- Domain separation via EIP-712

### Risks and Limitations
- Phishing risk (users may sign without understanding)
- Infinite approvals still risky
- Not all tokens support permit

### Best Practices
- Set reasonable deadlines
- Avoid infinite approvals
- Display permit details clearly

## ADOPTION
- USDC, DAI, most new tokens
- Uniswap Permit2
- Standard for modern DeFi

## SAFE SCORING RELEVANCE
### Pillar
**E (Ecosystem)** - Gasless approvals

### Evaluation Criteria
- EIP-2612 permit support: YES/NO
- Permit signing UI: YES/NO

## SOURCES
- **Official Document**: https://eips.ethereum.org/EIPS/eip-2612
- **Last Accessed**: 2026-01-19""",
        "official_link": "https://eips.ethereum.org/EIPS/eip-2612"
    },

    "SecureElement": {
        "match_titles": ["Secure Element", "SE", "Secure Enclave"],
        "summary": """## IDENTIFICATION
- **Code**: Secure Element (SE)
- **Title**: Secure Element / Secure Enclave
- **Version**: Various
- **Status**: Active
- **Author(s)**: Various (Infineon, STMicroelectronics, NXP, Apple)
- **Organization**: Chip manufacturers
- **License**: Proprietary

## EXECUTIVE SUMMARY
A Secure Element is a tamper-resistant hardware component designed to securely store cryptographic keys and perform sensitive operations. It provides physical protection against extraction attacks, making it essential for hardware wallet security.

## BACKGROUND AND MOTIVATION
Software-based key storage is vulnerable to malware and physical attacks. Secure Elements provide hardware-level protection, ensuring private keys cannot be extracted even with physical access to the device.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Tamper-resistant hardware
- Isolated execution environment
- Secure key storage
- Side-channel attack resistance

### Implementation
**Types:**
- Smartcard chips (ST31, ST33)
- Secure Enclaves (Apple T2, ARM TrustZone)
- TPM (Trusted Platform Module)
- HSM (Hardware Security Module)

**Common Chips:**
- ST31H320 (Ledger Nano S)
- ST33J2M0 (Ledger Nano X)
- ATECC608A (various)
- Infineon SLE78 (various)

### Parameters and Values
- Certification: Common Criteria EAL5+/EAL6+
- Key storage: typically 256-bit keys
- Operations: ECDSA, AES, SHA

## SECURITY
### Security Guarantees
- Physical tamper resistance
- Side-channel protection
- Secure boot
- Key never leaves SE

### Risks and Limitations
- Supply chain attacks possible
- Firmware vulnerabilities
- Not all SEs are equal quality

### Best Practices
- Verify SE certification
- Check for security audits
- Prefer CC EAL5+ certified chips

## ADOPTION
- Ledger, Trezor Safe, Coldcard
- All banking cards
- Smartphones (Apple, Samsung)

## SAFE SCORING RELEVANCE
### Pillar
**S (Security)** - Hardware key protection

### Evaluation Criteria
- Secure Element: YES/NO
- SE model: MODEL_NAME
- Certification: EAL5/EAL5+/EAL6/EAL6+

## SOURCES
- **Common Criteria Portal**: https://www.commoncriteriaportal.org/
- **Last Accessed**: 2026-01-19""",
        "official_link": "https://www.commoncriteriaportal.org/"
    },

    "OpenSource": {
        "match_titles": ["Open Source", "Open-source", "FOSS"],
        "summary": """## IDENTIFICATION
- **Code**: Open Source
- **Title**: Open Source Software/Hardware
- **Version**: Various licenses
- **Status**: Active
- **Author(s)**: Various
- **Organization**: OSI, FSF, OSHWA
- **License**: Various (MIT, GPL, Apache, CERN OHL)

## EXECUTIVE SUMMARY
Open source means the source code (software) or design files (hardware) are publicly available for inspection, modification, and distribution. For cryptocurrency wallets, this enables security audits, community review, and trust through transparency.

## BACKGROUND AND MOTIVATION
Closed-source security relies on "security through obscurity" which is considered weak. Open source allows anyone to verify there are no backdoors, vulnerabilities are found faster, and users don't have to trust the vendor blindly.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Source code publicly available
- Right to modify and distribute
- Community review and contributions
- Transparency over obscurity

### Implementation
**Software Licenses:**
- MIT: Permissive, minimal restrictions
- GPL: Copyleft, derivatives must be open
- Apache 2.0: Permissive with patent grant

**Hardware Licenses:**
- CERN OHL: Open Hardware License
- TAPR OHL: Amateur radio focused
- Solderpad: Permissive hardware license

### Parameters and Values
- Full open source: code + hardware designs
- Partial: only firmware or only hardware
- Reproducible builds: verify binary matches source

## SECURITY
### Security Guarantees
- Public audit capability
- No hidden backdoors (verifiable)
- Faster vulnerability discovery
- Community security review

### Risks and Limitations
- Open source ≠ audited
- Maintenance depends on community
- Forks can introduce vulnerabilities

### Best Practices
- Verify reproducible builds
- Check for security audits
- Review commit history and contributors
- Prefer actively maintained projects

## ADOPTION
- Trezor (full open source)
- Coldcard (firmware open)
- Bitcoin Core, Electrum
- Most cryptocurrency software

## SAFE SCORING RELEVANCE
### Pillar
**S (Security)** - Transparency and auditability

### Evaluation Criteria
- Firmware open source: YES/NO
- Hardware open source: YES/NO
- Reproducible builds: YES/NO
- Security audits: YES/NO

## SOURCES
- **OSI**: https://opensource.org/
- **OSHWA**: https://www.oshwa.org/
- **Last Accessed**: 2026-01-19""",
        "official_link": "https://opensource.org/"
    },

    "Miniscript": {
        "match_titles": ["Miniscript", "Mini script", "Policy Language"],
        "summary": """## IDENTIFICATION
- **Code**: Miniscript
- **Title**: Miniscript - A structured representation of Bitcoin Script
- **Version**: 2019
- **Status**: Active
- **Author(s)**: Pieter Wuille, Andrew Poelstra, Sanket Kanjalkar
- **Organization**: Blockstream / Bitcoin Community
- **License**: CC0

## EXECUTIVE SUMMARY
Miniscript is a language for writing Bitcoin Scripts in a structured, analyzable way. It enables composition of spending conditions, automatic script optimization, and formal analysis of spending policies without the complexity of raw Bitcoin Script.

## BACKGROUND AND MOTIVATION
Bitcoin Script is powerful but complex and error-prone. Miniscript provides a subset that is composable, analyzable, and can be automatically optimized. It enables complex custody setups like "2-of-3 OR (1-of-3 after 1 year)".

## TECHNICAL SPECIFICATIONS
### Core Principles
- Structured subset of Bitcoin Script
- Composable spending conditions
- Analyzable (max witness size, spending conditions)
- Automatic optimization

### Implementation
**Policy Language:**
- and(A, B): both conditions
- or(A, B): either condition
- thresh(k, A, B, ...): k-of-n threshold
- after(N): timelock (block height)
- older(N): relative timelock

**Example Policy:**
or(99@pk(A), and(pk(B), after(1000)))
= "A can spend, OR B can spend after block 1000"

### Parameters and Values
- Compiles to valid Bitcoin Script
- Supports P2WSH and P2TR
- Automatic witness size calculation

## SECURITY
### Security Guarantees
- Formally analyzable
- No hidden spending paths
- Predictable witness sizes

### Best Practices
- Use for complex custody setups
- Verify compiled script
- Test all spending paths

## ADOPTION
- Liana wallet
- Bitcoin Core (descriptor wallets)
- Blockstream Green

## SAFE SCORING RELEVANCE
### Pillar
**S (Security)** - Advanced scripting

### Evaluation Criteria
- Miniscript support: YES/NO
- Policy composition: YES/NO

## SOURCES
- **Official Document**: https://bitcoin.sipa.be/miniscript/
- **Last Accessed**: 2026-01-19""",
        "official_link": "https://bitcoin.sipa.be/miniscript/"
    },

    "CoinJoin": {
        "match_titles": ["CoinJoin", "Coinjoin", "Coin Join"],
        "summary": """## IDENTIFICATION
- **Code**: CoinJoin
- **Title**: CoinJoin Privacy Protocol
- **Version**: 2013 (concept)
- **Status**: Active
- **Author(s)**: Gregory Maxwell
- **Organization**: Bitcoin Community
- **License**: Various

## EXECUTIVE SUMMARY
CoinJoin is a privacy technique that combines multiple Bitcoin transactions into one, making it difficult to determine which inputs correspond to which outputs. It breaks the transaction graph analysis used to trace Bitcoin flows.

## BACKGROUND AND MOTIVATION
Bitcoin transactions are public and traceable. Chain analysis companies can link addresses and deanonymize users. CoinJoin provides privacy by mixing transactions from multiple users, breaking the deterministic link between inputs and outputs.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Multiple users combine inputs in one transaction
- Equal output amounts (for privacy)
- No trusted coordinator (ideally)
- Plausible deniability

### Implementation
**Protocols:**
- Wasabi Wallet: WabiSabi protocol
- JoinMarket: Maker/Taker model
- Whirlpool (Samourai): Tx0 + mixing pools

**Process:**
1. Users register inputs
2. Coordinator builds transaction
3. Users sign their inputs
4. Transaction broadcast

### Parameters and Values
- Typical pool sizes: 5-100+ participants
- Equal outputs: 0.001, 0.01, 0.05, 0.1 BTC
- Anonymity set: number of equal outputs

## SECURITY
### Security Guarantees
- Breaks transaction graph
- Plausible deniability
- No trust in other participants

### Risks and Limitations
- Coordinator can see inputs (some protocols)
- Timing analysis possible
- Regulatory concerns in some jurisdictions

### Best Practices
- Multiple rounds for better privacy
- Use Tor for network privacy
- Don't merge mixed outputs

## ADOPTION
- Wasabi Wallet, JoinMarket
- Samourai Whirlpool (discontinued)
- Growing privacy awareness

## SAFE SCORING RELEVANCE
### Pillar
**A (Adversity)** - Transaction privacy

### Evaluation Criteria
- CoinJoin support: YES/NO
- Protocol: WASABI/JOINMARKET/OTHER

## SOURCES
- **Original Proposal**: https://bitcointalk.org/index.php?topic=279249
- **Last Accessed**: 2026-01-19""",
        "official_link": "https://en.bitcoin.it/wiki/CoinJoin"
    },

    "Staking": {
        "match_titles": ["Staking", "Proof of Stake", "PoS"],
        "summary": """## IDENTIFICATION
- **Code**: Staking / PoS
- **Title**: Proof of Stake Consensus
- **Version**: Various
- **Status**: Active
- **Author(s)**: Various (Ethereum, Cardano, Solana, etc.)
- **Organization**: Various blockchain projects
- **License**: Various

## EXECUTIVE SUMMARY
Staking is the process of locking cryptocurrency to participate in Proof of Stake consensus, earning rewards for validating transactions. It replaces energy-intensive mining with economic stake as the security mechanism.

## BACKGROUND AND MOTIVATION
Proof of Work consumes massive energy. Proof of Stake achieves consensus through economic incentives - validators stake tokens and lose them if they misbehave. This is more energy-efficient and enables faster finality.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Validators stake tokens as collateral
- Selection based on stake amount (+ randomness)
- Slashing for misbehavior
- Rewards for honest validation

### Implementation
**Types:**
- Direct staking: Run validator node
- Delegated staking: Delegate to validator
- Liquid staking: Receive derivative token (stETH, etc.)
- Pooled staking: Join staking pool

**Major PoS Chains:**
- Ethereum: 32 ETH minimum
- Cardano: Delegated PoS
- Solana: Delegated PoS
- Cosmos: Tendermint BFT

### Parameters and Values
- APY: typically 3-15%
- Lock-up periods: varies by chain
- Slashing: 0.5-100% of stake

## SECURITY
### Security Guarantees
- Economic security (stake at risk)
- Decentralized validation
- Slashing deters attacks

### Risks and Limitations
- Centralization risk (large stakers)
- Liquid staking smart contract risk
- Slashing risk for validators

### Best Practices
- Research validator reputation
- Understand unbonding periods
- Diversify across validators

## ADOPTION
- Ethereum (since 2022)
- Most new L1 blockchains
- Growing institutional adoption

## SAFE SCORING RELEVANCE
### Pillar
**E (Ecosystem)** - Staking support

### Evaluation Criteria
- Staking support: YES/NO
- Staking type: NATIVE/LIQUID/DELEGATED
- Chains supported: LIST

## SOURCES
- **Ethereum Staking**: https://ethereum.org/staking
- **Last Accessed**: 2026-01-19""",
        "official_link": "https://ethereum.org/staking"
    },

    "DeFi": {
        "match_titles": ["DeFi", "Decentralized Finance", "DEX"],
        "summary": """## IDENTIFICATION
- **Code**: DeFi
- **Title**: Decentralized Finance
- **Version**: Various protocols
- **Status**: Active
- **Author(s)**: Various (Uniswap, Aave, Compound, etc.)
- **Organization**: Various DAOs and teams
- **License**: Various (mostly open source)

## EXECUTIVE SUMMARY
DeFi (Decentralized Finance) refers to financial services built on blockchain without traditional intermediaries. It includes decentralized exchanges (DEXs), lending protocols, yield farming, and more, all accessible through smart contracts.

## BACKGROUND AND MOTIVATION
Traditional finance requires trusted intermediaries (banks, brokers). DeFi enables permissionless, transparent financial services where code replaces trust. Anyone can access these services with just a wallet.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Non-custodial (users control funds)
- Permissionless (no KYC required)
- Transparent (on-chain transactions)
- Composable (protocols interact)

### Implementation
**Protocol Types:**
- DEX: Uniswap, SushiSwap, Curve
- Lending: Aave, Compound, MakerDAO
- Derivatives: dYdX, GMX, Synthetix
- Yield: Yearn, Convex

**Interaction Methods:**
- Direct smart contract calls
- Aggregators (1inch, Paraswap)
- Wallet integrations

### Parameters and Values
- TVL (Total Value Locked): billions USD
- Gas costs: variable by network
- Slippage: typically 0.1-1%

## SECURITY
### Security Guarantees
- Non-custodial (user controls keys)
- Audited smart contracts (ideally)
- Transparent on-chain logic

### Risks and Limitations
- Smart contract bugs/exploits
- Oracle manipulation
- Impermanent loss (LPs)
- Regulatory uncertainty

### Best Practices
- Use audited protocols
- Start with small amounts
- Understand the risks
- Revoke unused approvals

## ADOPTION
- Billions in TVL
- Major protocols on multiple chains
- Growing institutional interest

## SAFE SCORING RELEVANCE
### Pillar
**E (Ecosystem)** - DeFi integration

### Evaluation Criteria
- DeFi access: YES/NO
- Supported protocols: LIST
- Built-in swap: YES/NO

## SOURCES
- **DeFi Llama**: https://defillama.com/
- **Last Accessed**: 2026-01-19""",
        "official_link": "https://defillama.com/"
    },

    "NFT": {
        "match_titles": ["NFT", "Non-Fungible Token"],
        "summary": """## IDENTIFICATION
- **Code**: NFT
- **Title**: Non-Fungible Tokens
- **Version**: ERC-721, ERC-1155, etc.
- **Status**: Active
- **Author(s)**: Various
- **Organization**: Ethereum Community / Various
- **License**: Various

## EXECUTIVE SUMMARY
NFTs (Non-Fungible Tokens) are unique digital assets on blockchain representing ownership of digital or physical items. Unlike fungible tokens (where each unit is identical), each NFT is unique and cannot be exchanged 1:1 with another.

## BACKGROUND AND MOTIVATION
Digital content is easily copied. NFTs provide verifiable ownership and provenance for digital art, collectibles, gaming items, and more. They enable creators to monetize digital work and buyers to prove ownership.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Unique token ID per item
- Ownership tracked on-chain
- Metadata (often off-chain)
- Transferable and tradeable

### Implementation
**Standards:**
- ERC-721: Single NFT per contract call
- ERC-1155: Multi-token (fungible + non-fungible)
- Ordinals: Bitcoin-native inscriptions

**Metadata Storage:**
- IPFS: Decentralized, content-addressed
- Arweave: Permanent storage
- Centralized servers: Risk of loss

### Parameters and Values
- Token ID: uint256
- Metadata: JSON with image, attributes
- Royalties: typically 2.5-10%

## SECURITY
### Security Guarantees
- Ownership verifiable on-chain
- Transfer requires owner signature
- Provenance traceable

### Risks and Limitations
- Metadata can be mutable
- Phishing/scams common
- Market manipulation
- Copyright doesn't transfer automatically

### Best Practices
- Verify contract before minting
- Check metadata storage method
- Be wary of too-good-to-be-true offers
- Use hardware wallet for valuable NFTs

## ADOPTION
- OpenSea, Blur, Magic Eden
- Gaming: Axie, Gods Unchained
- Art: Art Blocks, Foundation

## SAFE SCORING RELEVANCE
### Pillar
**E (Ecosystem)** - NFT support

### Evaluation Criteria
- NFT support: YES/NO
- Standards: ERC-721/ERC-1155/ORDINALS
- Display: YES/NO

## SOURCES
- **ERC-721**: https://eips.ethereum.org/EIPS/eip-721
- **Last Accessed**: 2026-01-19""",
        "official_link": "https://eips.ethereum.org/EIPS/eip-721"
    },

    "Backup": {
        "match_titles": ["Backup", "Seed Backup", "Recovery"],
        "summary": """## IDENTIFICATION
- **Code**: Seed Backup
- **Title**: Cryptocurrency Backup Methods
- **Version**: Various
- **Status**: Active
- **Author(s)**: Industry
- **Organization**: Various
- **License**: N/A

## EXECUTIVE SUMMARY
Backup refers to methods of preserving the ability to recover cryptocurrency access if the primary device is lost, stolen, or damaged. The most common method is backing up the BIP-39 seed phrase, but various physical and digital methods exist.

## BACKGROUND AND MOTIVATION
Cryptocurrency is bearer asset - if you lose access, funds are gone forever. Proper backup is essential for long-term security. The challenge is balancing security (protection from theft) with availability (ability to recover).

## TECHNICAL SPECIFICATIONS
### Core Principles
- Seed phrase is master backup
- Physical backups resist digital attacks
- Redundancy protects against loss
- Security protects against theft

### Implementation
**Backup Methods:**
- Paper: Simple but fragile
- Metal: Fire/water resistant (Cryptosteel, Billfodl)
- Split backup: Shamir's Secret Sharing (SLIP-39)
- Encrypted digital: With strong passphrase

**Storage Locations:**
- Home safe
- Bank safe deposit box
- Trusted family member
- Geographic distribution

### Parameters and Values
- Seed phrase: 12-24 words
- Metal backup: withstands 1000°C+
- SLIP-39: 2-of-3, 3-of-5, etc.

## SECURITY
### Security Guarantees
- Seed enables full recovery
- Metal resists fire/flood
- Split backup resists single theft

### Risks and Limitations
- Paper degrades over time
- Single location = single point of failure
- Digital backups vulnerable to hacking

### Best Practices
- Use metal backup for durability
- Store in multiple locations
- Consider SLIP-39 for high values
- Test recovery before depositing
- Never store seed digitally unencrypted

## ADOPTION
- All hardware wallets include backup
- Metal backup products widely available
- SLIP-39 growing adoption

## SAFE SCORING RELEVANCE
### Pillar
**S (Security)** - Backup and recovery

### Evaluation Criteria
- Backup method: PAPER/METAL/SLIP39
- Multiple locations: YES/NO
- Tested recovery: YES/NO

## SOURCES
- **BIP-39**: https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki
- **Last Accessed**: 2026-01-19""",
        "official_link": "https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki"
    },

    "PIN": {
        "match_titles": ["PIN", "PIN Code", "Device PIN"],
        "summary": """## IDENTIFICATION
- **Code**: PIN Protection
- **Title**: Personal Identification Number
- **Version**: Implementation-specific
- **Status**: Active
- **Author(s)**: Various
- **Organization**: Industry standard
- **License**: N/A

## EXECUTIVE SUMMARY
A PIN (Personal Identification Number) is a numeric code used to authenticate access to a hardware wallet or application. It protects against unauthorized physical access and provides a first line of defense if the device is stolen.

## BACKGROUND AND MOTIVATION
Hardware wallets store valuable private keys. Without PIN protection, anyone with physical access could use the device. PINs add authentication that must be passed before the device will sign transactions.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Knowledge-based authentication
- Brute-force protection (delays/wipes)
- Entered on device (not computer)
- Combined with physical possession

### Implementation
**PIN Features:**
- Length: typically 4-8 digits
- Attempt limits: 3-10 before wipe/delay
- Exponential backoff: increasing delays
- Wipe after max attempts (optional)

**Entry Methods:**
- Physical buttons
- Touchscreen (randomized layout)
- Scrambled keypad display

### Parameters and Values
- Minimum length: 4 digits (10,000 combinations)
- Recommended: 6-8 digits
- Wipe threshold: typically 3-10 attempts

## SECURITY
### Security Guarantees
- Protects against casual theft
- Brute-force protection
- Device-side verification

### Risks and Limitations
- Shoulder surfing
- Weak PINs (1234, 0000)
- Social engineering

### Best Practices
- Use 6+ digit PIN
- Avoid obvious patterns
- Don't reuse PINs
- Enable wipe after failed attempts
- Use scrambled keypad if available

## ADOPTION
- All hardware wallets
- Banking apps
- Universal standard

## SAFE SCORING RELEVANCE
### Pillar
**S (Security)** - Device access control

### Evaluation Criteria
- PIN protection: YES/NO
- Minimum length: NUMBER
- Brute-force protection: YES/NO
- Wipe option: YES/NO

## SOURCES
- **Industry Standard**: Various implementations
- **Last Accessed**: 2026-01-19""",
        "official_link": "https://en.wikipedia.org/wiki/Personal_identification_number"
    },

    "Biometric": {
        "match_titles": ["Biometric", "Fingerprint", "Face ID"],
        "summary": """## IDENTIFICATION
- **Code**: Biometric Authentication
- **Title**: Biometric Security
- **Version**: Various
- **Status**: Active
- **Author(s)**: Various (Apple, Samsung, etc.)
- **Organization**: Device manufacturers
- **License**: Proprietary

## EXECUTIVE SUMMARY
Biometric authentication uses unique physical characteristics (fingerprint, face, iris) to verify identity. In cryptocurrency, it provides convenient device unlock and transaction confirmation while maintaining security through hardware-backed storage.

## BACKGROUND AND MOTIVATION
PINs can be forgotten or observed. Biometrics provide convenient authentication that's harder to steal or replicate. Modern implementations store biometric data in secure enclaves, never exposing raw biometric information.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Unique physical characteristics
- Hardware-backed secure storage
- Template matching (not image storage)
- Fallback to PIN/password

### Implementation
**Types:**
- Fingerprint: Capacitive, ultrasonic, optical
- Face: 2D (less secure), 3D (Face ID)
- Iris: High security, less common

**Security Levels:**
- Convenience unlock: Lower security
- Transaction confirmation: Higher security
- Should always have PIN fallback

### Parameters and Values
- False acceptance rate: <1:50,000 (fingerprint)
- Face ID: <1:1,000,000
- Liveness detection: Required for security

## SECURITY
### Security Guarantees
- Difficult to replicate
- Convenient for frequent use
- Hardware-protected templates

### Risks and Limitations
- Can be bypassed while sleeping (some)
- Forced authentication possible
- Biometrics can't be changed if compromised
- Not all implementations equal

### Best Practices
- Use as convenience, not sole security
- Enable liveness detection
- Have strong PIN fallback
- Consider duress scenarios

## ADOPTION
- Most smartphones
- Some hardware wallets (Ledger Stax)
- Banking apps

## SAFE SCORING RELEVANCE
### Pillar
**S (Security)** - Authentication method

### Evaluation Criteria
- Biometric support: YES/NO
- Type: FINGERPRINT/FACE/IRIS
- Hardware-backed: YES/NO

## SOURCES
- **Apple Face ID**: https://support.apple.com/face-id
- **Last Accessed**: 2026-01-19""",
        "official_link": "https://support.apple.com/face-id"
    },

    "RBF": {
        "match_titles": ["RBF", "Replace-by-Fee", "Replace by Fee"],
        "summary": """## IDENTIFICATION
- **Code**: BIP-125
- **Title**: Opt-in Full Replace-by-Fee Signaling
- **Version**: 2015
- **Status**: Final
- **Author(s)**: David A. Harding, Peter Todd
- **Organization**: Bitcoin Community
- **License**: PD

## EXECUTIVE SUMMARY
RBF (Replace-by-Fee) allows unconfirmed Bitcoin transactions to be replaced with a new version paying higher fees. This enables fee bumping when transactions are stuck due to low fees, improving user experience during network congestion.

## BACKGROUND AND MOTIVATION
Bitcoin transactions can get stuck in the mempool if fees are too low. Before RBF, users had no way to speed up pending transactions. RBF allows replacing the transaction with a higher-fee version, ensuring timely confirmation.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Transaction signals RBF via nSequence < 0xfffffffe
- Replacement must pay higher fee
- Must include same outputs (or more)
- Prevents double-spend abuse

### Implementation
**Signaling:**
- nSequence < 0xfffffffe on any input
- Explicit opt-in required

**Replacement Rules:**
1. Higher absolute fee
2. Higher fee rate
3. No new unconfirmed inputs
4. Replaces all conflicting transactions

### Parameters and Values
- nSequence threshold: 0xfffffffe - 1
- Fee increase: must exceed original + relay fee

## SECURITY
### Security Guarantees
- Only unconfirmed transactions replaceable
- Higher fee required (no free replacement)
- Opt-in prevents unwanted replacement

### Risks and Limitations
- Merchants should wait for confirmation
- Can be used for double-spend attempts (0-conf)
- Not all wallets support

### Best Practices
- Always enable RBF for flexibility
- Wait for confirmations before considering final
- Monitor mempool for replacements

## ADOPTION
- Bitcoin Core default since 0.12
- Most modern wallets support
- Standard practice

## SAFE SCORING RELEVANCE
### Pillar
**E (Ecosystem)** - Transaction management

### Evaluation Criteria
- RBF support: YES/NO
- Fee bumping UI: YES/NO

## SOURCES
- **Official Document**: https://github.com/bitcoin/bips/blob/master/bip-0125.mediawiki
- **Last Accessed**: 2026-01-20""",
        "official_link": "https://github.com/bitcoin/bips/blob/master/bip-0125.mediawiki"
    },

    "CPFP": {
        "match_titles": ["CPFP", "Child Pays for Parent"],
        "summary": """## IDENTIFICATION
- **Code**: CPFP
- **Title**: Child Pays for Parent
- **Version**: Bitcoin Core 0.13.0 (2016)
- **Status**: Active
- **Author(s)**: Bitcoin Core developers
- **Organization**: Bitcoin Community
- **License**: MIT

## EXECUTIVE SUMMARY
CPFP (Child Pays for Parent) is a fee-bumping technique where a new transaction spending an unconfirmed output pays enough fees to incentivize miners to confirm both transactions together. It's an alternative to RBF when the original transaction didn't signal replaceability.

## BACKGROUND AND MOTIVATION
When a received transaction is stuck with low fees, the recipient can't use RBF (only sender can). CPFP allows the recipient to create a child transaction with high fees, making the package attractive to miners.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Child transaction spends unconfirmed parent output
- Miners consider package fee rate
- Works for recipient (unlike RBF)
- No special signaling required

### Implementation
**Process:**
1. Identify stuck parent transaction
2. Create child spending parent's output
3. Set child fee high enough for both
4. Miners include package for combined fee

**Fee Calculation:**
Child fee = (desired_rate × (parent_size + child_size)) - parent_fee

### Parameters and Values
- Package size limit: 101 kvB (Bitcoin Core)
- Ancestor limit: 25 transactions
- Descendant limit: 25 transactions

## SECURITY
### Security Guarantees
- Works without sender cooperation
- No protocol changes needed
- Standard Bitcoin behavior

### Risks and Limitations
- Requires spendable output
- Uses more block space
- Higher total fees than RBF

### Best Practices
- Calculate required fee carefully
- Consider RBF first if available
- Useful for receiving stuck payments

## ADOPTION
- All Bitcoin nodes support
- Many wallets implement
- Standard technique

## SAFE SCORING RELEVANCE
### Pillar
**E (Ecosystem)** - Transaction management

### Evaluation Criteria
- CPFP support: YES/NO
- Package fee calculation: YES/NO

## SOURCES
- **Bitcoin Core**: https://bitcoincore.org/en/faq/optin_rbf/
- **Last Accessed**: 2026-01-20""",
        "official_link": "https://bitcoincore.org/en/faq/optin_rbf/"
    },

    "Timelock": {
        "match_titles": ["Timelock", "Time Lock", "CLTV", "CSV", "nLockTime"],
        "summary": """## IDENTIFICATION
- **Code**: BIP-65 (CLTV), BIP-112 (CSV), BIP-68
- **Title**: Bitcoin Timelocks
- **Version**: 2015-2016
- **Status**: Final
- **Author(s)**: Peter Todd, BtcDrak, Mark Friedenbach
- **Organization**: Bitcoin Community
- **License**: PD

## EXECUTIVE SUMMARY
Timelocks are Bitcoin script features that prevent spending until a certain time or block height. They enable time-based conditions for transactions, used in Lightning Network, atomic swaps, and inheritance planning.

## BACKGROUND AND MOTIVATION
Some use cases require funds to be locked until a future time: escrow, vesting, inheritance, payment channels. Timelocks provide trustless time-based conditions enforced by the Bitcoin protocol.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Absolute timelocks: specific time/block
- Relative timelocks: time since confirmation
- Script-level (CLTV, CSV) or transaction-level (nLockTime)

### Implementation
**Types:**
- **nLockTime**: Transaction-level, absolute
- **CLTV (OP_CHECKLOCKTIMEVERIFY)**: Script-level, absolute (BIP-65)
- **CSV (OP_CHECKSEQUENCEVERIFY)**: Script-level, relative (BIP-112)
- **nSequence**: Input-level, relative (BIP-68)

**Time Formats:**
- Block height: < 500,000,000
- Unix timestamp: ≥ 500,000,000

### Parameters and Values
- Block time: ~10 minutes average
- CSV max: ~1 year (65535 blocks)
- Granularity: 512 seconds (CSV time-based)

## SECURITY
### Security Guarantees
- Enforced by consensus
- Cannot be bypassed
- Trustless time conditions

### Risks and Limitations
- Block times vary
- Funds inaccessible until unlock
- Lost keys = permanent loss after unlock

### Best Practices
- Add buffer for block time variance
- Test timelock transactions on testnet
- Document unlock conditions

## ADOPTION
- Lightning Network (HTLCs)
- Atomic swaps
- Inheritance solutions (Liana)
- Vesting contracts

## SAFE SCORING RELEVANCE
### Pillar
**S (Security)** - Time-based security

### Evaluation Criteria
- Timelock support: YES/NO
- Types: CLTV/CSV/BOTH

## SOURCES
- **BIP-65**: https://github.com/bitcoin/bips/blob/master/bip-0065.mediawiki
- **BIP-112**: https://github.com/bitcoin/bips/blob/master/bip-0112.mediawiki
- **Last Accessed**: 2026-01-20""",
        "official_link": "https://github.com/bitcoin/bips/blob/master/bip-0065.mediawiki"
    },

    "AddressTypes": {
        "match_titles": ["Address", "P2PKH", "P2SH", "P2WPKH", "P2WSH", "P2TR", "Bech32", "bc1"],
        "summary": """## IDENTIFICATION
- **Code**: Various BIPs
- **Title**: Bitcoin Address Types
- **Version**: Various
- **Status**: Active
- **Author(s)**: Bitcoin Community
- **Organization**: Bitcoin Community
- **License**: Various

## EXECUTIVE SUMMARY
Bitcoin has evolved through multiple address formats, each with different features and fee efficiency. Modern wallets should support all types for compatibility while preferring newer formats for lower fees.

## BACKGROUND AND MOTIVATION
Original Bitcoin addresses (P2PKH) were inefficient. SegWit introduced new formats with lower fees. Taproot (P2TR) provides the best privacy and efficiency. Wallets must support multiple formats for compatibility.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Address encodes spending conditions
- Different formats = different script types
- Newer formats = lower fees, better privacy

### Implementation
**Address Types:**
| Type | Prefix | BIP | Example |
|------|--------|-----|---------|
| P2PKH | 1 | - | 1BvBMSE... |
| P2SH | 3 | 16 | 3J98t1W... |
| P2WPKH | bc1q | 84 | bc1qar0... |
| P2WSH | bc1q | 141 | bc1qrp3... |
| P2TR | bc1p | 86 | bc1p5cy... |

**Fee Efficiency (relative):**
- P2PKH: 100% (baseline)
- P2SH-P2WPKH: ~75%
- P2WPKH: ~62%
- P2TR: ~58%

### Parameters and Values
- Bech32 (SegWit v0): bc1q...
- Bech32m (Taproot): bc1p...
- Testnet: tb1...

## SECURITY
### Security Guarantees
- All types equally secure
- Taproot improves privacy
- Checksum prevents typos

### Best Practices
- Default to Taproot (bc1p) for new wallets
- Support all types for receiving
- Verify address before sending

## ADOPTION
- All modern wallets support SegWit
- Taproot adoption growing
- Legacy still needed for compatibility

## SAFE SCORING RELEVANCE
### Pillar
**E (Ecosystem)** - Address compatibility

### Evaluation Criteria
- Address types: P2PKH/P2SH/P2WPKH/P2WSH/P2TR
- Default type: LEGACY/SEGWIT/TAPROOT

## SOURCES
- **BIP-84**: https://github.com/bitcoin/bips/blob/master/bip-0084.mediawiki
- **BIP-86**: https://github.com/bitcoin/bips/blob/master/bip-0086.mediawiki
- **Last Accessed**: 2026-01-20""",
        "official_link": "https://github.com/bitcoin/bips/blob/master/bip-0084.mediawiki"
    },

    "Coin": {
        "match_titles": ["Bitcoin", "BTC", "Ethereum", "ETH", "Coin Support"],
        "summary": """## IDENTIFICATION
- **Code**: Multi-coin Support
- **Title**: Cryptocurrency Support
- **Version**: Various
- **Status**: Active
- **Author(s)**: Various
- **Organization**: Various blockchain projects
- **License**: Various

## EXECUTIVE SUMMARY
Multi-coin support refers to a wallet's ability to manage multiple cryptocurrencies. This includes native coins (BTC, ETH), tokens (ERC-20, SPL), and assets across different blockchain networks.

## BACKGROUND AND MOTIVATION
Users often hold multiple cryptocurrencies. Managing separate wallets for each is inconvenient and increases security risks. Multi-coin wallets provide unified management while maintaining security through proper key derivation.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Single seed, multiple coins (BIP-44)
- Chain-specific derivation paths
- Native coin vs token support
- Network-specific features

### Implementation
**Major Coins:**
- Bitcoin (BTC): UTXO model, SegWit, Taproot
- Ethereum (ETH): Account model, EVM, tokens
- Solana (SOL): Account model, SPL tokens
- Cardano (ADA): UTXO extended, native tokens

**Derivation Paths (BIP-44):**
- BTC: m/44'/0'/0'
- ETH: m/44'/60'/0'
- SOL: m/44'/501'/0'

### Parameters and Values
- Coin type: registered in SLIP-44
- Thousands of coins/tokens exist
- Quality varies significantly

## SECURITY
### Security Guarantees
- Same seed secures all coins
- Proper derivation isolates keys
- Hardware wallet support varies

### Risks and Limitations
- Not all coins equally secure
- Token contracts can be malicious
- Chain-specific risks (bridges, etc.)

### Best Practices
- Research before adding new coins
- Verify token contracts
- Use hardware wallet for significant value

## ADOPTION
- Ledger: 5000+ coins/tokens
- Trezor: 1000+ coins/tokens
- Software wallets: varies widely

## SAFE SCORING RELEVANCE
### Pillar
**E (Ecosystem)** - Asset support

### Evaluation Criteria
- Coins supported: NUMBER
- Major coins: BTC/ETH/SOL/etc.
- Token support: ERC-20/SPL/etc.

## SOURCES
- **SLIP-44**: https://github.com/satoshilabs/slips/blob/master/slip-0044.md
- **Last Accessed**: 2026-01-20""",
        "official_link": "https://github.com/satoshilabs/slips/blob/master/slip-0044.md"
    },

    "QRCode": {
        "match_titles": ["QR Code", "QR", "QR Scan"],
        "summary": """## IDENTIFICATION
- **Code**: ISO/IEC 18004
- **Title**: QR Code
- **Version**: 2015
- **Status**: Active
- **Author(s)**: Denso Wave
- **Organization**: ISO/IEC
- **License**: Patent-free

## EXECUTIVE SUMMARY
QR codes are 2D barcodes used in cryptocurrency for address sharing, transaction signing (PSBT), and air-gapped communication. They enable secure data transfer without network connectivity.

## BACKGROUND AND MOTIVATION
Typing cryptocurrency addresses is error-prone. QR codes enable quick, accurate address sharing. For air-gapped wallets, animated QR codes transfer signed transactions without any electronic connection.

## TECHNICAL SPECIFICATIONS
### Core Principles
- 2D barcode with error correction
- Multiple data capacities
- Camera-based scanning
- Works offline

### Implementation
**Crypto Uses:**
- Address sharing (BIP-21 URI)
- PSBT transfer (animated for large data)
- WalletConnect pairing
- 2FA setup (TOTP secrets)

**Capacity:**
- Version 1: 17 alphanumeric chars
- Version 40: 4,296 alphanumeric chars
- Animated QR: unlimited (multiple frames)

### Parameters and Values
- Error correction: L (7%), M (15%), Q (25%), H (30%)
- Crypto addresses: typically Version 2-4
- PSBT: often requires animated QR

## SECURITY
### Security Guarantees
- No network required
- Visual verification possible
- Air-gap maintained

### Risks and Limitations
- QR code substitution attacks
- Screen quality affects scanning
- Large data requires animation

### Best Practices
- Verify address after scanning
- Use high error correction
- Ensure good lighting for scanning

## ADOPTION
- All wallets support QR scanning
- Air-gapped wallets rely on QR
- Universal standard

## SAFE SCORING RELEVANCE
### Pillar
**F (Functionality)** - User interface

### Evaluation Criteria
- QR scanning: YES/NO
- QR display: YES/NO
- Animated QR: YES/NO

## SOURCES
- **ISO Standard**: https://www.iso.org/standard/62021.html
- **Last Accessed**: 2026-01-20""",
        "official_link": "https://www.iso.org/standard/62021.html"
    },

    "Firmware": {
        "match_titles": ["Firmware", "Firmware Update", "OTA"],
        "summary": """## IDENTIFICATION
- **Code**: Firmware Security
- **Title**: Hardware Wallet Firmware
- **Version**: Device-specific
- **Status**: Active
- **Author(s)**: Device manufacturers
- **Organization**: Various
- **License**: Various

## EXECUTIVE SUMMARY
Firmware is the software running on hardware wallets that controls all security-critical operations. Secure firmware updates are essential for patching vulnerabilities while preventing malicious firmware installation.

## BACKGROUND AND MOTIVATION
Hardware wallets need updates to fix bugs, add features, and patch security vulnerabilities. However, firmware updates are also an attack vector - malicious firmware could steal keys. Secure update mechanisms balance these concerns.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Signed firmware only
- Verification before installation
- Rollback protection
- Secure boot chain

### Implementation
**Security Features:**
- Cryptographic signatures (vendor key)
- Hash verification
- Anti-rollback (version checks)
- Secure boot (verified chain)

**Update Methods:**
- USB connection
- Bluetooth (some devices)
- SD card (air-gapped)

### Parameters and Values
- Signature algorithm: ECDSA, Ed25519
- Update frequency: varies by vendor
- Changelog: should be public

## SECURITY
### Security Guarantees
- Only vendor-signed firmware accepted
- Tampering detected
- Secure boot prevents modifications

### Risks and Limitations
- Supply chain attacks
- Vendor key compromise
- Forced updates may have issues

### Best Practices
- Verify update source
- Read changelog before updating
- Wait for community feedback on new versions
- Keep firmware updated for security patches

## ADOPTION
- All hardware wallets
- Mandatory for security
- Varying transparency levels

## SAFE SCORING RELEVANCE
### Pillar
**S (Security)** - Device security

### Evaluation Criteria
- Signed firmware: YES/NO
- Open source firmware: YES/NO
- Secure boot: YES/NO
- Anti-rollback: YES/NO

## SOURCES
- **Industry Best Practices**: Various vendors
- **Last Accessed**: 2026-01-20""",
        "official_link": "https://en.wikipedia.org/wiki/Firmware"
    },

    "Entropy": {
        "match_titles": ["Entropy", "Random", "RNG", "TRNG", "Dice"],
        "summary": """## IDENTIFICATION
- **Code**: Entropy Generation
- **Title**: Cryptographic Randomness
- **Version**: Various standards
- **Status**: Active
- **Author(s)**: Various
- **Organization**: NIST, hardware manufacturers
- **License**: Various

## EXECUTIVE SUMMARY
Entropy is randomness used to generate cryptographic keys. High-quality entropy is critical for security - predictable randomness leads to compromised keys. Hardware wallets use various sources including hardware RNGs and user-provided entropy.

## BACKGROUND AND MOTIVATION
Private keys must be unpredictable. Poor entropy has caused massive losses (Android SecureRandom bug, blockchain.info incident). Hardware wallets should use multiple entropy sources and allow user verification.

## TECHNICAL SPECIFICATIONS
### Core Principles
- True randomness required
- Multiple entropy sources preferred
- User-verifiable entropy optional
- CSPRNG for expansion

### Implementation
**Entropy Sources:**
- Hardware RNG (TRNG chip)
- Environmental noise
- User input (dice, coin flips)
- Host computer (mixed in)

**Standards:**
- NIST SP 800-90A/B/C
- AIS 31 (German BSI)
- Common Criteria requirements

### Parameters and Values
- BIP-39 12 words: 128 bits entropy
- BIP-39 24 words: 256 bits entropy
- Minimum recommended: 128 bits

## SECURITY
### Security Guarantees
- Unpredictable key generation
- Multiple sources reduce single point of failure
- User entropy adds protection against compromised hardware

### Risks and Limitations
- Hardware RNG failures
- Biased user entropy (dice, coins)
- Software bugs in entropy collection

### Best Practices
- Use hardware wallet's RNG
- Add dice rolls for paranoid security
- Verify entropy quality if possible
- Never reuse entropy

## ADOPTION
- All hardware wallets use hardware RNG
- Some allow dice roll input (Coldcard, SeedSigner)
- Critical security feature

## SAFE SCORING RELEVANCE
### Pillar
**S (Security)** - Key generation

### Evaluation Criteria
- Hardware RNG: YES/NO
- User entropy input: YES/NO
- Entropy verification: YES/NO

## SOURCES
- **NIST SP 800-90**: https://csrc.nist.gov/publications/detail/sp/800-90a/rev-1/final
- **Last Accessed**: 2026-01-20""",
        "official_link": "https://csrc.nist.gov/publications/detail/sp/800-90a/rev-1/final"
    },

    "Tor": {
        "match_titles": ["Tor", "Onion", "Privacy Network"],
        "summary": """## IDENTIFICATION
- **Code**: Tor
- **Title**: The Onion Router
- **Version**: Various
- **Status**: Active
- **Author(s)**: Tor Project
- **Organization**: The Tor Project, Inc.
- **License**: BSD

## EXECUTIVE SUMMARY
Tor is an anonymity network that routes internet traffic through multiple relays, hiding the user's IP address. For cryptocurrency, Tor protects network-level privacy, preventing observers from linking transactions to IP addresses.

## BACKGROUND AND MOTIVATION
Bitcoin transactions are broadcast from IP addresses. Without Tor, observers can link transactions to locations. Tor provides network-level privacy, complementing on-chain privacy techniques like CoinJoin.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Onion routing (multiple encryption layers)
- Volunteer relay network
- Hidden services (.onion addresses)
- Traffic analysis resistance

### Implementation
**Crypto Integration:**
- Wallet connects via Tor
- Node runs as hidden service
- Broadcast transactions anonymously
- Access .onion block explorers

**Connection Methods:**
- Built-in Tor (Wasabi, Sparrow)
- System Tor proxy
- Tor Browser for web wallets

### Parameters and Values
- Circuit length: 3 relays (default)
- Latency: higher than clearnet
- Bandwidth: limited by relay capacity

## SECURITY
### Security Guarantees
- IP address hidden from destination
- Traffic encrypted between relays
- Resistant to network surveillance

### Risks and Limitations
- Exit node can see unencrypted traffic
- Timing attacks possible
- Some services block Tor
- Slower than direct connection

### Best Practices
- Use Tor for all crypto network activity
- Run own node as hidden service
- Don't mix Tor and non-Tor usage
- Keep Tor updated

## ADOPTION
- Wasabi Wallet (built-in)
- Sparrow Wallet (built-in)
- Bitcoin Core (optional)
- Growing privacy awareness

## SAFE SCORING RELEVANCE
### Pillar
**A (Adversity)** - Network privacy

### Evaluation Criteria
- Tor support: YES/NO
- Built-in Tor: YES/NO
- .onion node support: YES/NO

## SOURCES
- **Official Site**: https://www.torproject.org/
- **Last Accessed**: 2026-01-20""",
        "official_link": "https://www.torproject.org/"
    },

    "FullNode": {
        "match_titles": ["Full Node", "Node", "Bitcoin Core", "Own Node"],
        "summary": """## IDENTIFICATION
- **Code**: Full Node
- **Title**: Bitcoin Full Node
- **Version**: Various
- **Status**: Active
- **Author(s)**: Bitcoin Core developers
- **Organization**: Bitcoin Community
- **License**: MIT

## EXECUTIVE SUMMARY
A full node is software that fully validates all Bitcoin transactions and blocks, enforcing consensus rules without trusting third parties. Running your own node provides maximum security and privacy for Bitcoin usage.

## BACKGROUND AND MOTIVATION
Light wallets trust external servers for transaction data. This reveals addresses to third parties and trusts their validation. Full nodes verify everything independently, providing trustless operation and maximum privacy.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Downloads and validates entire blockchain
- Enforces all consensus rules
- No trust in third parties
- Provides data to light clients

### Implementation
**Node Software:**
- Bitcoin Core (reference)
- btcd (Go implementation)
- Libbitcoin
- Bitcoin Knots

**Requirements:**
- Storage: ~500GB+ (pruned: ~5GB)
- Bandwidth: ~200GB/month
- RAM: 2GB+ recommended
- Always-on connection (ideal)

### Parameters and Values
- Initial sync: hours to days
- Block verification: ~10 minutes
- Mempool: configurable size

## SECURITY
### Security Guarantees
- Trustless verification
- Privacy (no address leakage)
- Censorship resistance
- Consensus enforcement

### Risks and Limitations
- Resource requirements
- Initial sync time
- Maintenance needed
- Network exposure

### Best Practices
- Run behind Tor
- Use with hardware wallet
- Keep updated
- Enable pruning if storage limited

## ADOPTION
- Thousands of public nodes
- Many private nodes
- Essential for network health

## SAFE SCORING RELEVANCE
### Pillar
**S (Security)** - Trustless verification

### Evaluation Criteria
- Own node support: YES/NO
- Node connection: ELECTRUM/CORE_RPC/CUSTOM
- Tor support: YES/NO

## SOURCES
- **Bitcoin Core**: https://bitcoincore.org/
- **Last Accessed**: 2026-01-20""",
        "official_link": "https://bitcoincore.org/"
    },

    "Electrum": {
        "match_titles": ["Electrum", "SPV", "Light Client"],
        "summary": """## IDENTIFICATION
- **Code**: Electrum Protocol
- **Title**: Electrum Server Protocol
- **Version**: Various
- **Status**: Active
- **Author(s)**: Thomas Voegtlin
- **Organization**: Electrum Technologies GmbH
- **License**: MIT

## EXECUTIVE SUMMARY
Electrum is a lightweight Bitcoin wallet protocol that uses SPV (Simplified Payment Verification) to verify transactions without downloading the full blockchain. It connects to Electrum servers that index the blockchain and respond to queries.

## BACKGROUND AND MOTIVATION
Full nodes require significant resources. Electrum enables lightweight wallets by outsourcing blockchain queries to servers. Users can run their own Electrum server for privacy or use public servers for convenience.

## TECHNICAL SPECIFICATIONS
### Core Principles
- SPV verification (block headers only)
- Server queries for address history
- Merkle proofs for transaction inclusion
- No full blockchain download required

### Implementation
**Server Software:**
- ElectrumX (Python)
- Electrs (Rust, efficient)
- Fulcrum (C++, fast)

**Protocol:**
- JSON-RPC over TCP/SSL
- Subscription-based updates
- Batched queries

### Parameters and Values
- Block headers: ~80 bytes each
- Merkle proof: ~1KB per transaction
- Server connection: SSL recommended

## SECURITY
### Security Guarantees
- SPV security (trusts longest chain)
- Merkle proofs verify inclusion
- Can verify own server

### Risks and Limitations
- Trusts server for address history
- Privacy leak to server (addresses)
- Eclipse attacks possible

### Best Practices
- Run own Electrum server
- Connect via Tor
- Use with hardware wallet

## ADOPTION
- Electrum wallet (original)
- Sparrow, BlueWallet, many others
- Standard for light wallets

## SAFE SCORING RELEVANCE
### Pillar
**E (Ecosystem)** - Backend connectivity

### Evaluation Criteria
- Electrum support: YES/NO
- Custom server: YES/NO
- SSL/Tor: YES/NO

## SOURCES
- **Electrum**: https://electrum.org/
- **Last Accessed**: 2026-01-20""",
        "official_link": "https://electrum.org/"
    },

    "Watch": {
        "match_titles": ["Watch-only", "Watch Only", "View Only"],
        "summary": """## IDENTIFICATION
- **Code**: Watch-Only Wallet
- **Title**: Watch-Only / View-Only Wallet
- **Version**: Standard feature
- **Status**: Active
- **Author(s)**: Various
- **Organization**: Industry standard
- **License**: N/A

## EXECUTIVE SUMMARY
A watch-only wallet can view balances and transaction history without the ability to spend. It contains only public keys (xpub), enabling balance monitoring and address generation without exposing private keys.

## BACKGROUND AND MOTIVATION
Users want to monitor their cold storage without exposing private keys. Watch-only wallets enable checking balances, generating receive addresses, and preparing unsigned transactions - all without risk of theft.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Contains only public keys (xpub/zpub)
- Can view all addresses and balances
- Can generate new receive addresses
- Cannot sign transactions

### Implementation
**Setup Methods:**
- Import xpub/zpub from hardware wallet
- Scan QR code from cold storage
- Enter master public key manually

**Capabilities:**
- View balance and history
- Generate receive addresses
- Create unsigned transactions (PSBT)
- Export for signing on cold device

### Parameters and Values
- xpub: BIP-44 extended public key
- zpub: BIP-84 (native SegWit)
- No private key material

## SECURITY
### Security Guarantees
- Cannot spend funds
- Safe on compromised device
- Enables cold storage workflow

### Risks and Limitations
- Privacy: xpub reveals all addresses
- Cannot recover funds (no private keys)
- Must protect xpub from exposure

### Best Practices
- Use for monitoring cold storage
- Don't share xpub publicly
- Combine with hardware wallet for signing

## ADOPTION
- All major wallets support
- Essential for cold storage
- Standard practice

## SAFE SCORING RELEVANCE
### Pillar
**S (Security)** - Cold storage workflow

### Evaluation Criteria
- Watch-only support: YES/NO
- PSBT creation: YES/NO
- xpub import: YES/NO

## SOURCES
- **BIP-32**: https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki
- **Last Accessed**: 2026-01-20""",
        "official_link": "https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki"
    },

    "Inheritance": {
        "match_titles": ["Inheritance", "Dead Man", "Estate", "Recovery Plan"],
        "summary": """## IDENTIFICATION
- **Code**: Inheritance Planning
- **Title**: Cryptocurrency Inheritance Solutions
- **Version**: Various
- **Status**: Active
- **Author(s)**: Various
- **Organization**: Industry
- **License**: N/A

## EXECUTIVE SUMMARY
Inheritance planning ensures cryptocurrency can be passed to heirs after death. Solutions range from simple seed phrase instructions to sophisticated timelocked multisig setups that automatically enable heir access after inactivity.

## BACKGROUND AND MOTIVATION
Cryptocurrency is bearer asset - if keys are lost, funds are gone. Proper inheritance planning ensures heirs can access funds while preventing premature access. This is a critical but often overlooked aspect of self-custody.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Balance security vs accessibility
- Time-delayed access for heirs
- Proof of life mechanisms
- Clear instructions for non-technical heirs

### Implementation
**Methods:**
- Seed phrase in safe deposit box
- Shamir's Secret Sharing (SLIP-39)
- Timelocked multisig (Miniscript)
- Dead man's switch services
- Legal trusts with crypto provisions

**Technical Solutions:**
- Liana wallet (timelocked recovery)
- Casa inheritance protocol
- Unchained inheritance

### Parameters and Values
- Timelock: typically 6-12 months
- Multisig: 2-of-3 with heir key
- Instructions: detailed, tested

## SECURITY
### Security Guarantees
- Heirs can access after death
- Owner retains full control while alive
- Timelocks prevent premature access

### Risks and Limitations
- Complexity for non-technical heirs
- Timelock requires periodic refresh
- Legal uncertainty in some jurisdictions

### Best Practices
- Document everything clearly
- Test recovery with heirs
- Use timelocks for automatic access
- Consider professional services for large amounts

## ADOPTION
- Growing awareness
- Specialized services emerging
- Critical for long-term holders

## SAFE SCORING RELEVANCE
### Pillar
**A (Adversity)** - Long-term planning

### Evaluation Criteria
- Inheritance features: YES/NO
- Timelock recovery: YES/NO
- Documentation: YES/NO

## SOURCES
- **Liana Wallet**: https://wizardsardine.com/liana/
- **Last Accessed**: 2026-01-20""",
        "official_link": "https://wizardsardine.com/liana/"
    },

    "SocialRecovery": {
        "match_titles": ["Social Recovery", "Guardian", "Trusted Contact"],
        "summary": """## IDENTIFICATION
- **Code**: Social Recovery
- **Title**: Social Recovery Wallets
- **Version**: Various (EIP-2429 draft)
- **Status**: Active
- **Author(s)**: Vitalik Buterin, Argent, others
- **Organization**: Ethereum Community
- **License**: Various

## EXECUTIVE SUMMARY
Social recovery allows wallet recovery through trusted contacts (guardians) without seed phrases. If access is lost, a threshold of guardians can authorize recovery to a new key, combining security with usability.

## BACKGROUND AND MOTIVATION
Seed phrases are hard to secure and easy to lose. Social recovery distributes trust among people you know, enabling recovery without single points of failure. It's particularly popular in smart contract wallets.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Guardians can recover wallet
- Threshold required (e.g., 3-of-5)
- Time delay for security
- No single guardian can steal

### Implementation
**Smart Contract Wallets:**
- Argent (Ethereum)
- Loopring (L2)
- Safe (formerly Gnosis Safe)

**Process:**
1. User loses access
2. Contacts guardians
3. Guardians sign recovery
4. Time delay passes
5. New key activated

### Parameters and Values
- Typical threshold: 3-of-5 guardians
- Recovery delay: 24-48 hours
- Guardian types: EOA, hardware wallet, institution

## SECURITY
### Security Guarantees
- No single point of failure
- Time delay prevents instant theft
- Owner can cancel during delay

### Risks and Limitations
- Guardians must be available
- Collusion risk if guardians know each other
- Smart contract risk
- Not available for Bitcoin (natively)

### Best Practices
- Choose diverse guardians
- Include institutional guardian
- Test recovery process
- Keep guardian list updated

## ADOPTION
- Argent wallet
- Loopring wallet
- Growing in smart contract wallets

## SAFE SCORING RELEVANCE
### Pillar
**A (Adversity)** - Recovery options

### Evaluation Criteria
- Social recovery: YES/NO
- Guardian management: YES/NO
- Recovery delay: HOURS

## SOURCES
- **Vitalik's Blog**: https://vitalik.ca/general/2021/01/11/recovery.html
- **Last Accessed**: 2026-01-20""",
        "official_link": "https://vitalik.ca/general/2021/01/11/recovery.html"
    },

    "Audit": {
        "match_titles": ["Audit", "Security Audit", "Penetration Test"],
        "summary": """## IDENTIFICATION
- **Code**: Security Audit
- **Title**: Third-Party Security Audits
- **Version**: Ongoing
- **Status**: Active
- **Author(s)**: Various security firms
- **Organization**: Ledger Donjon, Trail of Bits, NCC Group, etc.
- **License**: N/A

## EXECUTIVE SUMMARY
Security audits are independent reviews of code, hardware, and processes by specialized firms. For cryptocurrency products, audits verify that security claims are accurate and identify vulnerabilities before attackers do.

## BACKGROUND AND MOTIVATION
Users cannot verify security claims themselves. Third-party audits provide independent verification. Published audit reports build trust and demonstrate commitment to security.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Independent third-party review
- Code, hardware, and process analysis
- Vulnerability identification
- Remediation verification

### Implementation
**Audit Types:**
- Source code review
- Penetration testing
- Hardware security analysis
- Cryptographic review
- Process/operational audit

**Major Auditors:**
- Ledger Donjon (hardware)
- Trail of Bits (smart contracts)
- NCC Group (general)
- Cure53 (web/mobile)
- Least Authority (crypto)

### Parameters and Values
- Duration: weeks to months
- Cost: $50K-$500K+
- Scope: defined per engagement

## SECURITY
### Security Guarantees
- Independent verification
- Professional expertise
- Documented findings

### Risks and Limitations
- Point-in-time assessment
- Scope limitations
- Not a guarantee of security
- Auditors can miss issues

### Best Practices
- Regular audits (annually+)
- Publish reports publicly
- Address all findings
- Re-audit after major changes

## ADOPTION
- All major hardware wallets
- DeFi protocols (mandatory)
- Growing expectation

## SAFE SCORING RELEVANCE
### Pillar
**S (Security)** - Verification

### Evaluation Criteria
- Security audit: YES/NO
- Audit public: YES/NO
- Auditor reputation: NAME
- Last audit date: DATE

## SOURCES
- **Trail of Bits**: https://www.trailofbits.com/
- **Last Accessed**: 2026-01-20""",
        "official_link": "https://www.trailofbits.com/"
    },

    "BugBounty": {
        "match_titles": ["Bug Bounty", "Vulnerability", "Responsible Disclosure"],
        "summary": """## IDENTIFICATION
- **Code**: Bug Bounty Program
- **Title**: Vulnerability Reward Program
- **Version**: Ongoing
- **Status**: Active
- **Author(s)**: Various organizations
- **Organization**: HackerOne, Immunefi, etc.
- **License**: N/A

## EXECUTIVE SUMMARY
Bug bounty programs reward security researchers for responsibly disclosing vulnerabilities. They incentivize finding bugs before malicious actors do, providing continuous security testing beyond periodic audits.

## BACKGROUND AND MOTIVATION
No audit catches everything. Bug bounties create ongoing incentive for researchers to find and report vulnerabilities. The cost of bounties is far less than the cost of exploits.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Reward for responsible disclosure
- Defined scope and rules
- Safe harbor for researchers
- Tiered rewards by severity

### Implementation
**Platforms:**
- Immunefi (crypto-focused)
- HackerOne (general)
- Bugcrowd (general)
- Self-hosted programs

**Severity Tiers:**
- Critical: $10K-$1M+
- High: $5K-$50K
- Medium: $1K-$10K
- Low: $100-$1K

### Parameters and Values
- Response time: 24-72 hours
- Fix timeline: 30-90 days
- Disclosure: coordinated

## SECURITY
### Security Guarantees
- Continuous testing
- Diverse researcher perspectives
- Economic incentive alignment

### Risks and Limitations
- Researchers may sell to attackers
- Scope disputes
- Duplicate reports
- Triage overhead

### Best Practices
- Clear scope and rules
- Competitive rewards
- Fast response times
- Public acknowledgment

## ADOPTION
- All major crypto projects
- Immunefi: $100M+ paid out
- Industry standard

## SAFE SCORING RELEVANCE
### Pillar
**S (Security)** - Ongoing security

### Evaluation Criteria
- Bug bounty: YES/NO
- Platform: IMMUNEFI/HACKERONE/SELF
- Max reward: AMOUNT

## SOURCES
- **Immunefi**: https://immunefi.com/
- **Last Accessed**: 2026-01-20""",
        "official_link": "https://immunefi.com/"
    },

    "SupplyChain": {
        "match_titles": ["Supply Chain", "Tamper", "Sealed", "Hologram"],
        "summary": """## IDENTIFICATION
- **Code**: Supply Chain Security
- **Title**: Hardware Supply Chain Integrity
- **Version**: Various
- **Status**: Active
- **Author(s)**: Hardware manufacturers
- **Organization**: Various
- **License**: N/A

## EXECUTIVE SUMMARY
Supply chain security ensures hardware wallets haven't been tampered with between manufacturing and delivery. This includes tamper-evident packaging, device attestation, and secure manufacturing processes.

## BACKGROUND AND MOTIVATION
Hardware wallets are high-value targets. Attackers could intercept devices, install malicious firmware, and resell them. Supply chain security measures help users verify they received genuine, unmodified devices.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Tamper-evident packaging
- Device attestation
- Secure manufacturing
- Direct-from-manufacturer purchase

### Implementation
**Physical Security:**
- Holographic seals
- Shrink wrap
- Unique serial numbers
- Tamper-evident bags

**Digital Verification:**
- Firmware signature check
- Device attestation certificates
- Secure boot verification
- Factory reset on first use

### Parameters and Values
- Attestation: cryptographic proof
- Seals: unique, non-reproducible
- Verification: app-based or manual

## SECURITY
### Security Guarantees
- Tamper evidence (not prevention)
- Cryptographic device verification
- Manufacturing traceability

### Risks and Limitations
- Sophisticated attacks can bypass seals
- Attestation requires trust in manufacturer
- Reseller risk

### Best Practices
- Buy direct from manufacturer
- Verify all seals intact
- Run device attestation
- Factory reset before use
- Generate new seed (don't use pre-loaded)

## ADOPTION
- All major hardware wallets
- Varying sophistication
- Critical for trust

## SAFE SCORING RELEVANCE
### Pillar
**S (Security)** - Physical security

### Evaluation Criteria
- Tamper-evident packaging: YES/NO
- Device attestation: YES/NO
- Direct sales: YES/NO

## SOURCES
- **Industry Best Practices**: Various vendors
- **Last Accessed**: 2026-01-20""",
        "official_link": "https://en.wikipedia.org/wiki/Supply_chain_security"
    },

    "AccountAbstraction": {
        "match_titles": ["Account Abstraction", "ERC-4337", "Smart Account", "AA"],
        "summary": """## IDENTIFICATION
- **Code**: ERC-4337
- **Title**: Account Abstraction Using Alt Mempool
- **Version**: 2023
- **Status**: Final
- **Author(s)**: Vitalik Buterin, Yoav Weiss, Dror Tirosh, et al.
- **Organization**: Ethereum Foundation
- **License**: CC0

## EXECUTIVE SUMMARY
Account Abstraction (AA) enables smart contract wallets with programmable validation logic, replacing traditional EOA (Externally Owned Account) limitations. It allows gasless transactions, social recovery, batched operations, and custom authentication methods.

## BACKGROUND AND MOTIVATION
Traditional Ethereum accounts require ETH for gas and use fixed ECDSA signatures. AA enables flexible authentication (biometrics, multisig), sponsored transactions, and better UX without protocol changes.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Smart contract as wallet
- Custom validation logic
- Bundlers submit UserOperations
- Paymasters sponsor gas

### Implementation
**Components:**
- EntryPoint contract (singleton)
- UserOperation (pseudo-transaction)
- Bundler (submits to chain)
- Paymaster (gas sponsorship)

**Features:**
- Batched transactions
- Gas abstraction
- Session keys
- Social recovery

### Parameters and Values
- EntryPoint: 0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789
- UserOp gas: varies by operation
- Bundler fee: market-based

## SECURITY
### Security Guarantees
- Programmable security policies
- No single key compromise
- Upgradeable security

### Risks and Limitations
- Smart contract risk
- Bundler centralization
- Higher gas costs
- Complexity

### Best Practices
- Use audited wallet implementations
- Enable recovery mechanisms
- Monitor for suspicious activity

## ADOPTION
- Safe, Argent, Biconomy
- Growing ecosystem
- Major chains support

## SAFE SCORING RELEVANCE
### Pillar
**E (Ecosystem)** - Wallet technology

### Evaluation Criteria
- ERC-4337 support: YES/NO
- Paymaster: YES/NO
- Social recovery: YES/NO

## SOURCES
- **EIP-4337**: https://eips.ethereum.org/EIPS/eip-4337
- **Last Accessed**: 2026-01-20""",
        "official_link": "https://eips.ethereum.org/EIPS/eip-4337"
    },

    "Layer2": {
        "match_titles": ["Layer 2", "L2", "Rollup", "Optimism", "Arbitrum", "zkSync", "Polygon"],
        "summary": """## IDENTIFICATION
- **Code**: Layer 2 Scaling
- **Title**: Ethereum Layer 2 Solutions
- **Version**: Various
- **Status**: Active
- **Author(s)**: Various teams
- **Organization**: Various
- **License**: Various

## EXECUTIVE SUMMARY
Layer 2 (L2) solutions scale Ethereum by processing transactions off the main chain while inheriting its security. Major types include Optimistic Rollups (Arbitrum, Optimism) and ZK Rollups (zkSync, StarkNet).

## BACKGROUND AND MOTIVATION
Ethereum mainnet has limited throughput (~15 TPS) and high fees during congestion. L2s batch transactions and post proofs to L1, achieving higher throughput and lower fees while maintaining security.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Transactions processed off-chain
- Data/proofs posted to L1
- Security inherited from Ethereum
- Native bridging

### Implementation
**Optimistic Rollups:**
- Arbitrum One
- Optimism (OP Mainnet)
- Base
- Fraud proofs, 7-day withdrawal

**ZK Rollups:**
- zkSync Era
- StarkNet
- Polygon zkEVM
- Validity proofs, fast withdrawal

### Parameters and Values
- TPS: 100-4000+ depending on L2
- Fees: 10-100x cheaper than L1
- Finality: varies (instant to 7 days)

## SECURITY
### Security Guarantees
- L1 security inheritance
- Funds recoverable via L1
- Censorship resistance (escape hatch)

### Risks and Limitations
- Bridge risks
- Sequencer centralization
- Withdrawal delays (Optimistic)
- New technology

### Best Practices
- Use official bridges
- Understand withdrawal times
- Monitor sequencer status
- Diversify across L2s

## ADOPTION
- Billions in TVL
- Major DeFi protocols
- Growing rapidly

## SAFE SCORING RELEVANCE
### Pillar
**E (Ecosystem)** - Network support

### Evaluation Criteria
- L2 support: LIST
- Native bridging: YES/NO
- L2 tokens: YES/NO

## SOURCES
- **L2Beat**: https://l2beat.com/
- **Last Accessed**: 2026-01-20""",
        "official_link": "https://l2beat.com/"
    },

    "Bridge": {
        "match_titles": ["Bridge", "Cross-chain", "Interoperability"],
        "summary": """## IDENTIFICATION
- **Code**: Cross-chain Bridge
- **Title**: Blockchain Bridges
- **Version**: Various
- **Status**: Active
- **Author(s)**: Various
- **Organization**: Various
- **License**: Various

## EXECUTIVE SUMMARY
Bridges enable asset transfers between different blockchains. They lock assets on one chain and mint/release equivalent assets on another. Security varies significantly between bridge designs.

## BACKGROUND AND MOTIVATION
Users need to move assets between chains (Ethereum to Arbitrum, Bitcoin to Ethereum, etc.). Bridges provide this functionality but introduce additional trust assumptions and risks.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Lock on source chain
- Mint/release on destination
- Various trust models
- Liquidity requirements

### Implementation
**Bridge Types:**
- Native/Canonical (L2 official bridges)
- Trusted (centralized validators)
- Trustless (light client proofs)
- Liquidity networks (atomic swaps)

**Major Bridges:**
- Arbitrum Bridge (native)
- Optimism Bridge (native)
- Wormhole (validator set)
- LayerZero (oracle + relayer)
- Across (liquidity network)

### Parameters and Values
- Transfer time: minutes to days
- Fees: 0.1%-1%+ of amount
- Limits: varies by bridge

## SECURITY
### Security Guarantees
- Native bridges: L1 security
- Others: varies significantly

### Risks and Limitations
- Bridge hacks: billions lost
- Validator collusion
- Smart contract bugs
- Liquidity risks

### Best Practices
- Use native/canonical bridges
- Small amounts first
- Verify bridge security model
- Monitor for exploits

## ADOPTION
- Essential for multi-chain
- Major DeFi integration
- Growing but risky

## SAFE SCORING RELEVANCE
### Pillar
**E (Ecosystem)** - Cross-chain

### Evaluation Criteria
- Bridge support: YES/NO
- Native bridges: YES/NO
- Bridge types: LIST

## SOURCES
- **DefiLlama Bridges**: https://defillama.com/bridges
- **Last Accessed**: 2026-01-20""",
        "official_link": "https://defillama.com/bridges"
    },

    "ENS": {
        "match_titles": ["ENS", "Ethereum Name Service", ".eth"],
        "summary": """## IDENTIFICATION
- **Code**: ENS
- **Title**: Ethereum Name Service
- **Version**: Various
- **Status**: Active
- **Author(s)**: Nick Johnson, et al.
- **Organization**: ENS Labs
- **License**: MIT

## EXECUTIVE SUMMARY
ENS is a decentralized naming system on Ethereum that maps human-readable names (like vitalik.eth) to addresses, content hashes, and metadata. It improves UX by replacing long hex addresses with memorable names.

## BACKGROUND AND MOTIVATION
Ethereum addresses are 42-character hex strings, error-prone and unmemorable. ENS provides human-readable names that resolve to addresses, making crypto more accessible.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Decentralized registry
- Hierarchical names
- Resolver architecture
- Multi-chain support

### Implementation
**Components:**
- Registry (name ownership)
- Resolver (name → data)
- Registrar (registration logic)
- Reverse resolver (address → name)

**Features:**
- Primary name (reverse resolution)
- Subdomains
- Text records (social, avatar)
- Multi-coin addresses

### Parameters and Values
- Registration: yearly fee ($5+ for 5+ chars)
- Gas: varies by operation
- Renewal: same as registration

## SECURITY
### Security Guarantees
- Decentralized ownership
- Immutable registry
- DNS integration (DNSSEC)

### Risks and Limitations
- Phishing (similar names)
- Expiration risks
- Gas costs for updates
- Centralized frontend risks

### Best Practices
- Verify names carefully
- Set primary name
- Keep registration current
- Use official interfaces

## ADOPTION
- Millions of names registered
- Major wallet support
- Industry standard

## SAFE SCORING RELEVANCE
### Pillar
**F (Functionality)** - User experience

### Evaluation Criteria
- ENS support: YES/NO
- ENS resolution: YES/NO
- ENS registration: YES/NO

## SOURCES
- **ENS Docs**: https://docs.ens.domains/
- **Last Accessed**: 2026-01-20""",
        "official_link": "https://docs.ens.domains/"
    },

    "Swap": {
        "match_titles": ["Swap", "Exchange", "DEX", "Trade"],
        "summary": """## IDENTIFICATION
- **Code**: Token Swap
- **Title**: Decentralized Exchange / Swap
- **Version**: Various
- **Status**: Active
- **Author(s)**: Various
- **Organization**: Uniswap, 1inch, etc.
- **License**: Various

## EXECUTIVE SUMMARY
Token swaps enable exchanging one cryptocurrency for another without centralized intermediaries. DEXs use automated market makers (AMMs) or order books to facilitate trustless trading directly from user wallets.

## BACKGROUND AND MOTIVATION
Centralized exchanges require deposits and trust. DEXs enable non-custodial trading where users maintain control of their assets until the swap executes atomically.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Non-custodial trading
- Atomic execution
- Liquidity pools or order books
- Slippage protection

### Implementation
**DEX Types:**
- AMM (Uniswap, Curve)
- Order book (dYdX, Serum)
- Aggregators (1inch, Paraswap)
- RFQ (Hashflow, Bebop)

**Swap Process:**
1. Connect wallet
2. Select tokens and amount
3. Review price/slippage
4. Approve token (if needed)
5. Execute swap

### Parameters and Values
- Slippage: 0.1%-5% typical
- Fees: 0.01%-1%
- Gas: varies by chain

## SECURITY
### Security Guarantees
- Non-custodial
- Atomic execution
- Transparent pricing

### Risks and Limitations
- Slippage on large trades
- MEV (sandwich attacks)
- Smart contract risk
- Impermanent loss (LPs)

### Best Practices
- Set slippage limits
- Use aggregators for best price
- Check token contracts
- Use private mempools if available

## ADOPTION
- Billions in daily volume
- All major wallets integrate
- Essential DeFi primitive

## SAFE SCORING RELEVANCE
### Pillar
**E (Ecosystem)** - Trading features

### Evaluation Criteria
- In-app swap: YES/NO
- DEX aggregation: YES/NO
- Slippage protection: YES/NO

## SOURCES
- **Uniswap Docs**: https://docs.uniswap.org/
- **Last Accessed**: 2026-01-20""",
        "official_link": "https://docs.uniswap.org/"
    },

    "Hardware": {
        "match_titles": ["Hardware Wallet", "Cold Storage", "Hardware Security"],
        "summary": """## IDENTIFICATION
- **Code**: Hardware Wallet
- **Title**: Hardware Security Module for Cryptocurrency
- **Version**: Various
- **Status**: Active
- **Author(s)**: Ledger, Trezor, Coldcard, etc.
- **Organization**: Various manufacturers
- **License**: Various

## EXECUTIVE SUMMARY
Hardware wallets are dedicated devices that store private keys offline and sign transactions in a secure environment. They protect against malware, phishing, and remote attacks by keeping keys isolated from internet-connected devices.

## BACKGROUND AND MOTIVATION
Software wallets on computers/phones are vulnerable to malware. Hardware wallets provide physical isolation - private keys never leave the device, and transactions must be physically confirmed.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Offline key storage
- Secure element or MCU
- Physical confirmation
- Air-gapped operation (some)

### Implementation
**Device Types:**
- USB devices (Ledger, Trezor)
- Air-gapped (Coldcard, Keystone)
- Card form factor (Tangem)
- DIY (SeedSigner)

**Security Features:**
- Secure element (tamper-resistant)
- PIN protection
- Passphrase support
- Firmware verification

### Parameters and Values
- Price: $50-$500+
- Supported coins: varies widely
- Battery: some have, some don't

## SECURITY
### Security Guarantees
- Keys never exposed to internet
- Physical confirmation required
- Tamper-evident/resistant

### Risks and Limitations
- Physical theft
- Supply chain attacks
- Firmware vulnerabilities
- User error (seed exposure)

### Best Practices
- Buy direct from manufacturer
- Verify device authenticity
- Use passphrase for extra security
- Test recovery before large deposits

## ADOPTION
- Millions of devices sold
- Industry standard for security
- Essential for significant holdings

## SAFE SCORING RELEVANCE
### Pillar
**S (Security)** - Key protection

### Evaluation Criteria
- Hardware wallet: YES/NO
- Secure element: YES/NO
- Air-gapped: YES/NO
- Open source: YES/NO

## SOURCES
- **Industry Overview**: Various manufacturers
- **Last Accessed**: 2026-01-20""",
        "official_link": "https://en.wikipedia.org/wiki/Hardware_wallet"
    },

    "Bluetooth": {
        "match_titles": ["Bluetooth", "BLE", "Wireless"],
        "summary": """## IDENTIFICATION
- **Code**: Bluetooth / BLE
- **Title**: Bluetooth Low Energy Connectivity
- **Version**: BLE 4.0+
- **Status**: Active
- **Author(s)**: Bluetooth SIG
- **Organization**: Bluetooth Special Interest Group
- **License**: Proprietary

## EXECUTIVE SUMMARY
Bluetooth enables wireless connectivity between hardware wallets and mobile devices. While convenient, it introduces potential attack surface. BLE (Bluetooth Low Energy) is commonly used for its power efficiency.

## BACKGROUND AND MOTIVATION
USB connectivity limits mobile use. Bluetooth enables hardware wallet use with smartphones, improving accessibility. However, wireless communication requires careful security implementation.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Wireless short-range communication
- Encrypted pairing
- Low power consumption (BLE)
- Mobile device compatibility

### Implementation
**Security Measures:**
- Encrypted communication
- Secure pairing process
- Limited range (~10m)
- User confirmation required

**Devices Using Bluetooth:**
- Ledger Nano X
- Keystone Pro
- CoolWallet
- BitBox02

### Parameters and Values
- Range: ~10 meters
- Power: low (BLE)
- Pairing: secure with confirmation

## SECURITY
### Security Guarantees
- Encrypted channel
- Pairing verification
- Keys stay on device

### Risks and Limitations
- Wireless attack surface
- Bluetooth vulnerabilities
- Pairing attacks
- Battery requirement

### Best Practices
- Disable when not in use
- Pair in private location
- Keep firmware updated
- Verify pairing codes

## ADOPTION
- Many hardware wallets
- Essential for mobile use
- Controversial in security community

## SAFE SCORING RELEVANCE
### Pillar
**F (Functionality)** - Connectivity

### Evaluation Criteria
- Bluetooth support: YES/NO
- BLE version: VERSION
- Disable option: YES/NO

## SOURCES
- **Bluetooth SIG**: https://www.bluetooth.com/
- **Last Accessed**: 2026-01-20""",
        "official_link": "https://www.bluetooth.com/"
    },

    "USB": {
        "match_titles": ["USB", "USB-C", "USB Connection"],
        "summary": """## IDENTIFICATION
- **Code**: USB
- **Title**: Universal Serial Bus
- **Version**: USB 2.0/3.0/C
- **Status**: Active
- **Author(s)**: USB-IF
- **Organization**: USB Implementers Forum
- **License**: Royalty-free

## EXECUTIVE SUMMARY
USB is the standard wired connection for hardware wallets, providing both data communication and power. USB-C is becoming the standard connector, offering reversible design and faster data transfer.

## BACKGROUND AND MOTIVATION
Wired connections are more secure than wireless - no radio signals to intercept. USB provides reliable, fast communication and powers the device, eliminating battery concerns.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Wired data transfer
- Device power supply
- Universal compatibility
- No wireless attack surface

### Implementation
**Connection Types:**
- USB-A (legacy)
- USB-C (modern)
- Micro-USB (older devices)

**Communication:**
- HID (Human Interface Device)
- WebUSB (browser access)
- Custom protocols

### Parameters and Values
- USB 2.0: 480 Mbps
- USB 3.0: 5 Gbps
- USB-C: reversible connector

## SECURITY
### Security Guarantees
- No wireless interception
- Physical connection required
- Simpler attack surface

### Risks and Limitations
- Malicious USB devices
- Cable quality issues
- Computer malware
- Physical access required

### Best Practices
- Use official cables
- Verify device on screen
- Don't use untrusted computers
- Check for BadUSB attacks

## ADOPTION
- All hardware wallets
- Universal standard
- Preferred for security

## SAFE SCORING RELEVANCE
### Pillar
**F (Functionality)** - Connectivity

### Evaluation Criteria
- USB support: YES/NO
- USB-C: YES/NO
- Cable included: YES/NO

## SOURCES
- **USB-IF**: https://www.usb.org/
- **Last Accessed**: 2026-01-20""",
        "official_link": "https://www.usb.org/"
    },

    "SDCard": {
        "match_titles": ["SD Card", "MicroSD", "SD"],
        "summary": """## IDENTIFICATION
- **Code**: SD Card
- **Title**: Secure Digital Memory Card
- **Version**: Various
- **Status**: Active
- **Author(s)**: SD Association
- **Organization**: SD Association
- **License**: Licensed

## EXECUTIVE SUMMARY
SD cards in hardware wallets enable air-gapped data transfer - PSBTs, firmware updates, and backups can be transferred without any electronic connection. This provides maximum isolation from potentially compromised computers.

## BACKGROUND AND MOTIVATION
Air-gapped operation requires a way to transfer data. SD cards provide a simple, widely available medium for moving unsigned transactions to the signing device and signed transactions back.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Physical data transfer
- No electronic connection
- Air-gap maintenance
- Universal availability

### Implementation
**Use Cases:**
- PSBT transfer (unsigned → signed)
- Firmware updates
- Seed backup (encrypted)
- Configuration export

**Devices Using SD:**
- Coldcard
- Keystone
- Passport
- SeedSigner

### Parameters and Values
- Capacity: typically 4-32GB sufficient
- Format: FAT32 usually
- Speed: not critical for crypto

## SECURITY
### Security Guarantees
- Complete air-gap
- No network exposure
- Physical verification possible

### Risks and Limitations
- SD card malware (theoretical)
- Physical handling required
- Card failure risk
- Less convenient than USB

### Best Practices
- Use dedicated SD cards
- Format before use
- Verify file integrity
- Store cards securely

## ADOPTION
- Air-gapped wallets
- Growing preference
- Security-focused users

## SAFE SCORING RELEVANCE
### Pillar
**S (Security)** - Air-gap capability

### Evaluation Criteria
- SD card support: YES/NO
- PSBT via SD: YES/NO
- Firmware via SD: YES/NO

## SOURCES
- **SD Association**: https://www.sdcard.org/
- **Last Accessed**: 2026-01-20""",
        "official_link": "https://www.sdcard.org/"
    },

    "NFC": {
        "match_titles": ["NFC", "Near Field", "Tap"],
        "summary": """## IDENTIFICATION
- **Code**: NFC
- **Title**: Near Field Communication
- **Version**: Various
- **Status**: Active
- **Author(s)**: NFC Forum
- **Organization**: NFC Forum
- **License**: Various

## EXECUTIVE SUMMARY
NFC enables very short-range wireless communication (~4cm) for quick interactions like tapping a card wallet to a phone. The extremely short range provides inherent security against remote attacks.

## BACKGROUND AND MOTIVATION
NFC provides convenient tap-to-sign functionality. The short range means an attacker would need physical proximity, making remote attacks impossible. It's commonly used in card-format hardware wallets.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Very short range (~4cm)
- Tap-based interaction
- Passive or active modes
- Mobile device compatible

### Implementation
**Use Cases:**
- Transaction signing
- Wallet pairing
- Address sharing
- Authentication

**Devices Using NFC:**
- Tangem
- CoolWallet
- Satochip
- Various card wallets

### Parameters and Values
- Range: ~4cm maximum
- Frequency: 13.56 MHz
- Data rate: 106-424 kbps

## SECURITY
### Security Guarantees
- Physical proximity required
- No remote attacks
- Quick interaction

### Risks and Limitations
- Relay attacks (theoretical)
- Skimming in crowds
- Limited data bandwidth
- Phone compatibility varies

### Best Practices
- Tap in private
- Verify transaction on phone
- Keep card secure
- Use with PIN/biometric

## ADOPTION
- Card-format wallets
- Growing popularity
- Convenient for mobile

## SAFE SCORING RELEVANCE
### Pillar
**F (Functionality)** - Connectivity

### Evaluation Criteria
- NFC support: YES/NO
- NFC signing: YES/NO
- NFC pairing: YES/NO

## SOURCES
- **NFC Forum**: https://nfc-forum.org/
- **Last Accessed**: 2026-01-20""",
        "official_link": "https://nfc-forum.org/"
    },

    "Screen": {
        "match_titles": ["Screen", "Display", "OLED", "E-ink", "Touchscreen"],
        "summary": """## IDENTIFICATION
- **Code**: Display Technology
- **Title**: Hardware Wallet Display
- **Version**: Various
- **Status**: Active
- **Author(s)**: Various manufacturers
- **Organization**: Various
- **License**: N/A

## EXECUTIVE SUMMARY
The display on a hardware wallet is critical for transaction verification. Users must verify transaction details on the device screen before signing. Display types include OLED, LCD, E-ink, and touchscreens.

## BACKGROUND AND MOTIVATION
A compromised computer could display incorrect transaction details. The hardware wallet's screen shows the actual transaction being signed, enabling users to verify before confirming. This is a fundamental security feature.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Independent verification
- Clear transaction display
- Address verification
- Amount confirmation

### Implementation
**Display Types:**
- OLED: high contrast, power efficient
- LCD: color, larger screens
- E-ink: low power, always visible
- Touchscreen: easier navigation

**Information Displayed:**
- Recipient address
- Amount
- Fee
- Token/coin type
- Contract interactions

### Parameters and Values
- Resolution: varies widely
- Size: 0.9" to 4"+
- Color: mono or full color

## SECURITY
### Security Guarantees
- Independent from host computer
- Shows actual transaction
- Physical verification required

### Risks and Limitations
- Small screens hard to verify
- Address truncation
- Complex transactions hard to display

### Best Practices
- Always verify full address
- Check amount and fee
- Understand what you're signing
- Use larger screens for complex transactions

## ADOPTION
- All hardware wallets have screens
- Varying quality and size
- Essential security feature

## SAFE SCORING RELEVANCE
### Pillar
**F (Functionality)** - User interface

### Evaluation Criteria
- Screen type: OLED/LCD/E-INK
- Screen size: INCHES
- Touchscreen: YES/NO
- Color: YES/NO

## SOURCES
- **Industry Standard**: Various manufacturers
- **Last Accessed**: 2026-01-20""",
        "official_link": "https://en.wikipedia.org/wiki/Display_device"
    },

    "Battery": {
        "match_titles": ["Battery", "Rechargeable", "Power"],
        "summary": """## IDENTIFICATION
- **Code**: Battery Power
- **Title**: Hardware Wallet Battery
- **Version**: Various
- **Status**: Active
- **Author(s)**: Various manufacturers
- **Organization**: Various
- **License**: N/A

## EXECUTIVE SUMMARY
Some hardware wallets include batteries for portable, wireless operation. This enables Bluetooth connectivity and air-gapped use without USB connection. Battery life and charging methods vary by device.

## BACKGROUND AND MOTIVATION
USB-powered devices require a computer connection. Batteries enable mobile use with smartphones via Bluetooth and fully air-gapped operation. However, batteries add complexity and potential failure points.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Portable operation
- Wireless connectivity
- Air-gapped capability
- Rechargeable

### Implementation
**Battery Types:**
- Lithium-ion (most common)
- Lithium-polymer
- Coin cell (some cards)

**Charging:**
- USB-C charging
- Wireless charging (rare)
- Solar (experimental)

### Parameters and Values
- Capacity: 100-1000+ mAh
- Life: months to years standby
- Cycles: 500+ charge cycles

## SECURITY
### Security Guarantees
- Enables air-gapped operation
- No computer dependency
- Mobile signing

### Risks and Limitations
- Battery degradation
- Charging required
- Potential fire risk (rare)
- Additional failure point

### Best Practices
- Keep charged for emergencies
- Store at 50% for long-term
- Replace if swelling
- Use original charger

## ADOPTION
- Ledger Nano X, Keystone, etc.
- Growing for mobile use
- Optional on some devices

## SAFE SCORING RELEVANCE
### Pillar
**F (Functionality)** - Hardware features

### Evaluation Criteria
- Battery: YES/NO
- Battery life: HOURS/DAYS
- Replaceable: YES/NO

## SOURCES
- **Industry Standard**: Various manufacturers
- **Last Accessed**: 2026-01-20""",
        "official_link": "https://en.wikipedia.org/wiki/Lithium-ion_battery"
    },

    "OpenSource": {
        "match_titles": ["Open Source", "Open-source", "FOSS", "Source Code"],
        "summary": """## IDENTIFICATION
- **Code**: Open Source
- **Title**: Open Source Software/Hardware
- **Version**: Various licenses
- **Status**: Active
- **Author(s)**: Various
- **Organization**: OSI, FSF, OSHWA
- **License**: MIT, GPL, Apache, etc.

## EXECUTIVE SUMMARY
Open source means the source code (and sometimes hardware designs) are publicly available for review, modification, and distribution. For cryptocurrency wallets, open source enables independent security verification.

## BACKGROUND AND MOTIVATION
Closed-source software requires trusting the vendor. Open source allows anyone to verify there are no backdoors, hidden vulnerabilities, or malicious code. This is especially important for security-critical applications like wallets.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Source code publicly available
- Community review possible
- Modifications allowed
- Transparency

### Implementation
**License Types:**
- MIT: permissive, minimal restrictions
- GPL: copyleft, derivatives must be open
- Apache 2.0: permissive with patent grant
- BSD: permissive

**Open Source Levels:**
- Firmware only
- Companion app
- Hardware design
- Full stack

### Parameters and Values
- Repository: GitHub, GitLab, etc.
- License: specified in repo
- Reproducible builds: verifiable

## SECURITY
### Security Guarantees
- Independent verification
- Community auditing
- No hidden backdoors (verifiable)
- Transparency

### Risks and Limitations
- Open to attackers too
- Requires expertise to review
- Forks may have issues
- Maintenance burden

### Best Practices
- Verify builds are reproducible
- Check commit history
- Review security audits
- Use official releases

## ADOPTION
- Trezor: fully open source
- Coldcard: open source
- Ledger: partial (app open, OS closed)
- Growing expectation

## SAFE SCORING RELEVANCE
### Pillar
**S (Security)** - Transparency

### Evaluation Criteria
- Open source firmware: YES/NO
- Open source app: YES/NO
- Open source hardware: YES/NO
- Reproducible builds: YES/NO

## SOURCES
- **OSI**: https://opensource.org/
- **Last Accessed**: 2026-01-20""",
        "official_link": "https://opensource.org/"
    },

    "Privacy": {
        "match_titles": ["Privacy", "Anonymous", "Confidential"],
        "summary": """## IDENTIFICATION
- **Code**: Privacy Features
- **Title**: Cryptocurrency Privacy
- **Version**: Various
- **Status**: Active
- **Author(s)**: Various
- **Organization**: Various
- **License**: Various

## EXECUTIVE SUMMARY
Privacy in cryptocurrency involves hiding transaction details (sender, receiver, amount) from public view. Techniques include CoinJoin, stealth addresses, zero-knowledge proofs, and network-level privacy (Tor).

## BACKGROUND AND MOTIVATION
Bitcoin and most cryptocurrencies have transparent blockchains - all transactions are public. Privacy features help protect financial information from surveillance, competitors, and criminals.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Transaction privacy
- Address unlinkability
- Amount hiding
- Network privacy

### Implementation
**Privacy Techniques:**
- CoinJoin (mixing transactions)
- Stealth addresses (one-time addresses)
- Confidential transactions (hidden amounts)
- Zero-knowledge proofs (ZK)
- Tor/I2P (network privacy)

**Privacy Coins:**
- Monero (RingCT, stealth addresses)
- Zcash (zk-SNARKs)
- Grin/Beam (MimbleWimble)

### Parameters and Values
- Anonymity set: varies by technique
- Privacy level: varies
- Trade-offs: fees, complexity

## SECURITY
### Security Guarantees
- Financial privacy
- Protection from surveillance
- Reduced targeting risk

### Risks and Limitations
- Regulatory concerns
- Complexity
- Reduced liquidity
- Potential bugs in privacy tech

### Best Practices
- Use privacy by default
- Avoid address reuse
- Use Tor for network privacy
- Understand limitations

## ADOPTION
- Growing awareness
- Regulatory pressure
- Essential for some users

## SAFE SCORING RELEVANCE
### Pillar
**A (Adversity)** - Privacy protection

### Evaluation Criteria
- CoinJoin: YES/NO
- Tor support: YES/NO
- Address reuse prevention: YES/NO
- Privacy coins: LIST

## SOURCES
- **Bitcoin Privacy Guide**: https://bitcoin.org/en/protect-your-privacy
- **Last Accessed**: 2026-01-20""",
        "official_link": "https://bitcoin.org/en/protect-your-privacy"
    },

    "Testnet": {
        "match_titles": ["Testnet", "Signet", "Test Network"],
        "summary": """## IDENTIFICATION
- **Code**: Test Networks
- **Title**: Cryptocurrency Test Networks
- **Version**: Various
- **Status**: Active
- **Author(s)**: Various
- **Organization**: Various blockchain projects
- **License**: Various

## EXECUTIVE SUMMARY
Testnets are separate blockchain networks for testing without risking real funds. They use worthless test coins, allowing developers and users to experiment safely. Bitcoin has Testnet and Signet; Ethereum has Sepolia and Goerli.

## BACKGROUND AND MOTIVATION
Testing on mainnet risks real money. Testnets provide identical functionality with worthless coins, enabling safe development, wallet testing, and learning without financial risk.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Identical to mainnet functionality
- Worthless test coins
- Free from faucets
- Safe experimentation

### Implementation
**Bitcoin Test Networks:**
- Testnet3: public, sometimes unstable
- Signet: more controlled, stable
- Regtest: local, instant blocks

**Ethereum Test Networks:**
- Sepolia: recommended for dApps
- Goerli: being deprecated
- Holesky: validator testing

### Parameters and Values
- Coins: free from faucets
- Block time: same as mainnet
- Address format: different prefix

## SECURITY
### Security Guarantees
- No financial risk
- Safe testing environment
- Identical security model

### Risks and Limitations
- Not identical to mainnet
- Faucet availability varies
- Less mining/validation
- May have different behavior

### Best Practices
- Always test on testnet first
- Use signet for stability
- Verify on testnet before mainnet
- Don't confuse testnet/mainnet addresses

## ADOPTION
- All serious wallets support
- Essential for development
- Recommended for learning

## SAFE SCORING RELEVANCE
### Pillar
**E (Ecosystem)** - Development support

### Evaluation Criteria
- Testnet support: YES/NO
- Networks: TESTNET/SIGNET/BOTH
- Easy switching: YES/NO

## SOURCES
- **Bitcoin Testnet**: https://en.bitcoin.it/wiki/Testnet
- **Last Accessed**: 2026-01-20""",
        "official_link": "https://en.bitcoin.it/wiki/Testnet"
    },

    "Labels": {
        "match_titles": ["Label", "Tag", "Annotation", "Note"],
        "summary": """## IDENTIFICATION
- **Code**: Transaction Labels
- **Title**: Wallet Labeling / Tagging
- **Version**: BIP-329 (proposed)
- **Status**: Draft/Active
- **Author(s)**: Craig Raw
- **Organization**: Bitcoin Community
- **License**: Various

## EXECUTIVE SUMMARY
Labels allow users to annotate addresses, transactions, and UTXOs with custom notes. This helps with organization, tax reporting, and privacy (knowing which coins came from where). BIP-329 proposes a standard export format.

## BACKGROUND AND MOTIVATION
Without labels, users lose context about their transactions. Labels help remember who sent/received funds, purpose of transactions, and enable proper coin control for privacy.

## TECHNICAL SPECIFICATIONS
### Core Principles
- User-defined annotations
- Address labels
- Transaction labels
- UTXO labels

### Implementation
**Label Types:**
- Address labels (who/what)
- Transaction labels (purpose)
- UTXO labels (coin control)
- Output labels (specific outputs)

**BIP-329 Format:**
- JSON export/import
- Standardized fields
- Wallet interoperability

### Parameters and Values
- Storage: local wallet
- Export: JSON (BIP-329)
- Encryption: recommended

## SECURITY
### Security Guarantees
- Better coin control
- Privacy through organization
- Tax compliance

### Risks and Limitations
- Labels reveal information
- Backup needed
- Not all wallets support
- Sync issues

### Best Practices
- Label all transactions
- Use consistent naming
- Export/backup labels
- Encrypt label backups

## ADOPTION
- Sparrow, Electrum, others
- Growing with BIP-329
- Essential for power users

## SAFE SCORING RELEVANCE
### Pillar
**F (Functionality)** - Organization

### Evaluation Criteria
- Address labels: YES/NO
- Transaction labels: YES/NO
- UTXO labels: YES/NO
- BIP-329 export: YES/NO

## SOURCES
- **BIP-329**: https://github.com/bitcoin/bips/blob/master/bip-0329.mediawiki
- **Last Accessed**: 2026-01-20""",
        "official_link": "https://github.com/bitcoin/bips/blob/master/bip-0329.mediawiki"
    },

    "CoinControl": {
        "match_titles": ["Coin Control", "UTXO", "Coin Selection"],
        "summary": """## IDENTIFICATION
- **Code**: Coin Control
- **Title**: UTXO Selection / Coin Control
- **Version**: Standard feature
- **Status**: Active
- **Author(s)**: Various
- **Organization**: Bitcoin Community
- **License**: N/A

## EXECUTIVE SUMMARY
Coin control allows users to manually select which UTXOs (unspent transaction outputs) to use when sending Bitcoin. This enables privacy optimization, fee management, and avoiding mixing coins from different sources.

## BACKGROUND AND MOTIVATION
Bitcoin uses the UTXO model - each "coin" is a separate output. Automatic coin selection may link addresses or use inappropriate coins. Manual control enables privacy-conscious spending.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Manual UTXO selection
- Privacy optimization
- Fee management
- Source separation

### Implementation
**Features:**
- View all UTXOs
- Select specific coins
- Freeze/lock coins
- Label UTXOs

**Privacy Benefits:**
- Avoid linking addresses
- Separate KYC/non-KYC coins
- Control change addresses
- Minimize fingerprinting

### Parameters and Values
- UTXO: individual spendable output
- Selection: manual or automatic
- Freeze: exclude from auto-selection

## SECURITY
### Security Guarantees
- Privacy control
- Source separation
- Intentional spending

### Risks and Limitations
- Complexity for beginners
- Can create dust
- Requires understanding
- Time-consuming

### Best Practices
- Label all UTXOs
- Separate coin sources
- Use for privacy-sensitive transactions
- Consolidate during low fees

## ADOPTION
- Sparrow, Electrum, Wasabi
- Power user feature
- Growing awareness

## SAFE SCORING RELEVANCE
### Pillar
**A (Adversity)** - Privacy control

### Evaluation Criteria
- Coin control: YES/NO
- UTXO view: YES/NO
- Freeze coins: YES/NO
- UTXO labels: YES/NO

## SOURCES
- **Bitcoin Wiki**: https://en.bitcoin.it/wiki/Coin_control
- **Last Accessed**: 2026-01-20""",
        "official_link": "https://en.bitcoin.it/wiki/Coin_control"
    },

    "Fee": {
        "match_titles": ["Fee", "Gas", "Transaction Fee", "Fee Estimation"],
        "summary": """## IDENTIFICATION
- **Code**: Transaction Fees
- **Title**: Cryptocurrency Transaction Fees
- **Version**: Various
- **Status**: Active
- **Author(s)**: Various
- **Organization**: Various blockchains
- **License**: N/A

## EXECUTIVE SUMMARY
Transaction fees compensate miners/validators for including transactions in blocks. Fee estimation helps users pay appropriate fees - too low means slow confirmation, too high wastes money. Good wallets provide accurate fee estimation.

## BACKGROUND AND MOTIVATION
Block space is limited. Fees create a market for inclusion. Users need accurate fee estimation to balance speed and cost. Wallets should provide multiple fee options and real-time estimates.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Market-based pricing
- Priority by fee rate
- Estimation algorithms
- User choice

### Implementation
**Fee Models:**
- Bitcoin: sat/vB (fee rate)
- Ethereum: gas price × gas used
- EIP-1559: base fee + priority fee

**Estimation Sources:**
- Mempool analysis
- Historical data
- API services (mempool.space)

### Parameters and Values
- Bitcoin: sat/vB (satoshis per virtual byte)
- Ethereum: gwei (10^-9 ETH)
- Confirmation target: blocks/time

## SECURITY
### Security Guarantees
- Predictable confirmation
- Cost control
- RBF for stuck transactions

### Risks and Limitations
- Fee spikes during congestion
- Estimation can be wrong
- Overpaying common
- Underpaying causes delays

### Best Practices
- Use RBF for flexibility
- Check mempool before sending
- Use appropriate priority
- Batch transactions when possible

## ADOPTION
- All wallets estimate fees
- Quality varies widely
- Critical UX feature

## SAFE SCORING RELEVANCE
### Pillar
**F (Functionality)** - Transaction management

### Evaluation Criteria
- Fee estimation: YES/NO
- Custom fees: YES/NO
- Fee levels: LOW/MEDIUM/HIGH/CUSTOM
- Real-time updates: YES/NO

## SOURCES
- **Mempool.space**: https://mempool.space/
- **Last Accessed**: 2026-01-20""",
        "official_link": "https://mempool.space/"
    },

    "Descriptors": {
        "match_titles": ["Descriptor", "Output Descriptor", "BIP-380", "BIP-381", "BIP-382"],
        "summary": """## IDENTIFICATION
- **Code**: BIP-380, BIP-381, BIP-382, BIP-383, BIP-384, BIP-385, BIP-386
- **Title**: Output Script Descriptors
- **Version**: 2021
- **Status**: Final
- **Author(s)**: Pieter Wuille, Andrew Chow
- **Organization**: Bitcoin Community
- **License**: BSD-2-Clause

## EXECUTIVE SUMMARY
Output descriptors are a language for describing collections of output scripts. They provide a complete, self-contained description of how to derive addresses and scripts, replacing the ambiguous xpub format with precise derivation information.

## BACKGROUND AND MOTIVATION
Extended public keys (xpubs) don't specify script type or derivation path. Descriptors solve this by encoding complete information: key origin, derivation path, script type, and checksum. This enables unambiguous wallet import/export.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Complete derivation information
- Script type specification
- Checksum for error detection
- Composable expressions

### Implementation
**Descriptor Types:**
- pkh(): P2PKH (legacy)
- wpkh(): P2WPKH (native SegWit)
- sh(wpkh()): P2SH-P2WPKH (wrapped SegWit)
- tr(): Taproot
- multi(): Multisig
- sortedmulti(): Sorted multisig

**Example:**
wpkh([d34db33f/84'/0'/0']xpub.../0/*)#checksum

### Parameters and Values
- Checksum: 8 characters
- Wildcards: * for derivation
- Key origin: [fingerprint/path]

## SECURITY
### Security Guarantees
- Unambiguous wallet recovery
- Checksum prevents typos
- Complete information preserved

### Best Practices
- Always use descriptors for backup
- Verify checksum
- Include key origin

## ADOPTION
- Bitcoin Core native
- Sparrow, Specter, others
- Growing standard

## SAFE SCORING RELEVANCE
### Pillar
**S (Security)** - Wallet backup

### Evaluation Criteria
- Descriptor support: YES/NO
- Descriptor export: YES/NO
- Descriptor import: YES/NO

## SOURCES
- **BIP-380**: https://github.com/bitcoin/bips/blob/master/bip-0380.mediawiki
- **Last Accessed**: 2026-01-20""",
        "official_link": "https://github.com/bitcoin/bips/blob/master/bip-0380.mediawiki"
    },

    "SilentPayments": {
        "match_titles": ["Silent Payment", "BIP-352"],
        "summary": """## IDENTIFICATION
- **Code**: BIP-352
- **Title**: Silent Payments
- **Version**: 2024
- **Status**: Draft
- **Author(s)**: Ruben Somsen, Josie Baker
- **Organization**: Bitcoin Community
- **License**: BSD-2-Clause

## EXECUTIVE SUMMARY
Silent Payments enable receiving Bitcoin to a static address without creating a link between payments. Each sender generates a unique address for the recipient, providing privacy without requiring interaction or address reuse.

## BACKGROUND AND MOTIVATION
Address reuse harms privacy. Generating new addresses requires interaction. Silent Payments solve both: a single static address that generates unique on-chain addresses for each payment, unlinkable to each other.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Static receiving address
- Unique on-chain addresses per payment
- No sender-receiver interaction
- ECDH-based derivation

### Implementation
**Process:**
1. Recipient publishes silent payment address
2. Sender uses ECDH with recipient's key
3. Unique address generated per payment
4. Recipient scans blockchain for payments

**Address Format:**
- sp1q... (mainnet)
- Encodes scan and spend keys

### Parameters and Values
- Scanning: requires full blockchain scan
- Light client: challenging
- Privacy: high

## SECURITY
### Security Guarantees
- No address reuse
- Payments unlinkable
- Static address safe to publish

### Risks and Limitations
- Scanning overhead
- Light client support limited
- New technology

### Best Practices
- Use for donation addresses
- Run full node for scanning
- Combine with other privacy techniques

## ADOPTION
- Early adoption phase
- Cake Wallet, others implementing
- Growing interest

## SAFE SCORING RELEVANCE
### Pillar
**A (Adversity)** - Privacy

### Evaluation Criteria
- Silent Payments: YES/NO
- Scanning support: YES/NO

## SOURCES
- **BIP-352**: https://github.com/bitcoin/bips/blob/master/bip-0352.mediawiki
- **Last Accessed**: 2026-01-20""",
        "official_link": "https://github.com/bitcoin/bips/blob/master/bip-0352.mediawiki"
    },

    "Ordinals": {
        "match_titles": ["Ordinal", "Inscription", "BRC-20", "Rune"],
        "summary": """## IDENTIFICATION
- **Code**: Ordinals Protocol
- **Title**: Bitcoin Ordinals & Inscriptions
- **Version**: 2023
- **Status**: Active
- **Author(s)**: Casey Rodarmor
- **Organization**: Ordinals Community
- **License**: CC0

## EXECUTIVE SUMMARY
Ordinals is a protocol for numbering and tracking individual satoshis on Bitcoin. Inscriptions allow attaching arbitrary data (images, text, code) to satoshis, enabling NFT-like functionality on Bitcoin without requiring changes to the protocol.

## BACKGROUND AND MOTIVATION
Bitcoin lacked native NFT support. Ordinals assigns unique identifiers to each satoshi based on mining order. Inscriptions embed data in witness space, creating immutable on-chain digital artifacts.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Satoshi numbering (ordinal theory)
- Data inscription in witness
- No protocol changes required
- Immutable on-chain storage

### Implementation
**Ordinal Numbers:**
- Based on mining order
- Transferred with satoshis
- Trackable across transactions

**Inscriptions:**
- Data in witness (SegWit)
- MIME types supported
- Size limited by block space

**Related Protocols:**
- BRC-20: fungible tokens
- Runes: improved fungible tokens

### Parameters and Values
- Max inscription: ~400KB
- Fees: varies with size
- Storage: permanent on-chain

## SECURITY
### Security Guarantees
- Immutable storage
- Bitcoin security model
- Censorship resistant

### Risks and Limitations
- High fees for large inscriptions
- Controversial in community
- Wallet support varies
- UTXO management complex

### Best Practices
- Use specialized wallets
- Understand UTXO handling
- Verify inscription content

## ADOPTION
- Significant activity
- Specialized marketplaces
- Growing ecosystem

## SAFE SCORING RELEVANCE
### Pillar
**E (Ecosystem)** - Bitcoin features

### Evaluation Criteria
- Ordinals support: YES/NO
- Inscription viewing: YES/NO
- BRC-20 support: YES/NO
- Runes support: YES/NO

## SOURCES
- **Ordinals Docs**: https://docs.ordinals.com/
- **Last Accessed**: 2026-01-20""",
        "official_link": "https://docs.ordinals.com/"
    },

    "Nostr": {
        "match_titles": ["Nostr", "NIP", "Zap"],
        "summary": """## IDENTIFICATION
- **Code**: Nostr Protocol
- **Title**: Notes and Other Stuff Transmitted by Relays
- **Version**: Various NIPs
- **Status**: Active
- **Author(s)**: fiatjaf
- **Organization**: Nostr Community
- **License**: Public Domain

## EXECUTIVE SUMMARY
Nostr is a decentralized social protocol using cryptographic keys for identity. It integrates with Bitcoin via Lightning for payments (zaps). Wallet integration enables seamless social payments and identity verification.

## BACKGROUND AND MOTIVATION
Centralized social media can censor and deplatform. Nostr provides censorship-resistant social networking using public key cryptography. Lightning integration enables native micropayments.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Public key identity
- Relay-based message distribution
- Cryptographic signatures
- Lightning integration (zaps)

### Implementation
**Components:**
- Keys: secp256k1 (same as Bitcoin)
- Relays: message servers
- Clients: user interfaces
- NIPs: protocol specifications

**Wallet Integration:**
- NIP-47: Nostr Wallet Connect
- Zaps: Lightning payments
- Identity: key-based

### Parameters and Values
- Key format: npub/nsec (bech32)
- Events: JSON signed messages
- Relays: user-selected

## SECURITY
### Security Guarantees
- Self-sovereign identity
- Cryptographic verification
- Censorship resistance

### Risks and Limitations
- Key management critical
- Relay availability
- Metadata exposure
- New ecosystem

### Best Practices
- Secure key storage
- Use multiple relays
- Backup keys properly

## ADOPTION
- Growing rapidly
- Multiple clients
- Lightning integration

## SAFE SCORING RELEVANCE
### Pillar
**E (Ecosystem)** - Social integration

### Evaluation Criteria
- Nostr support: YES/NO
- Zaps: YES/NO
- NWC: YES/NO

## SOURCES
- **Nostr Protocol**: https://github.com/nostr-protocol/nostr
- **Last Accessed**: 2026-01-20""",
        "official_link": "https://github.com/nostr-protocol/nostr"
    },

    "Payjoin": {
        "match_titles": ["Payjoin", "P2EP", "BIP-78"],
        "summary": """## IDENTIFICATION
- **Code**: BIP-78
- **Title**: Payjoin (Pay-to-EndPoint)
- **Version**: 2020
- **Status**: Proposed
- **Author(s)**: Nicolas Dorier
- **Organization**: Bitcoin Community
- **License**: BSD-2-Clause

## EXECUTIVE SUMMARY
Payjoin is a privacy technique where both sender and receiver contribute inputs to a transaction. This breaks the common-input-ownership heuristic used by chain analysis, improving privacy for both parties.

## BACKGROUND AND MOTIVATION
Chain analysis assumes all inputs in a transaction belong to one entity. Payjoin breaks this assumption by having the receiver add their own inputs, making analysis unreliable and improving privacy ecosystem-wide.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Receiver contributes inputs
- Breaks common-input heuristic
- Interactive protocol
- Looks like normal transaction

### Implementation
**Process:**
1. Sender creates initial PSBT
2. Sends to receiver's Payjoin endpoint
3. Receiver adds inputs, adjusts outputs
4. Returns modified PSBT
5. Sender signs and broadcasts

**BIP-78 Endpoint:**
- HTTPS endpoint
- Receives PSBT
- Returns modified PSBT

### Parameters and Values
- Requires receiver online
- HTTPS endpoint needed
- Additional fees possible

## SECURITY
### Security Guarantees
- Privacy improvement
- Breaks chain analysis
- No trust required

### Risks and Limitations
- Requires receiver endpoint
- Interactive (both online)
- Limited adoption
- Complexity

### Best Practices
- Use when available
- Combine with other privacy
- Run own Payjoin server

## ADOPTION
- BTCPay Server
- Sparrow Wallet
- Growing slowly

## SAFE SCORING RELEVANCE
### Pillar
**A (Adversity)** - Privacy

### Evaluation Criteria
- Payjoin send: YES/NO
- Payjoin receive: YES/NO

## SOURCES
- **BIP-78**: https://github.com/bitcoin/bips/blob/master/bip-0078.mediawiki
- **Last Accessed**: 2026-01-20""",
        "official_link": "https://github.com/bitcoin/bips/blob/master/bip-0078.mediawiki"
    },

    "Schnorr": {
        "match_titles": ["Schnorr", "BIP-340", "Signature Aggregation"],
        "summary": """## IDENTIFICATION
- **Code**: BIP-340
- **Title**: Schnorr Signatures for secp256k1
- **Version**: 2020
- **Status**: Final
- **Author(s)**: Pieter Wuille, Jonas Nick, Tim Ruffing
- **Organization**: Bitcoin Community
- **License**: BSD-2-Clause

## EXECUTIVE SUMMARY
Schnorr signatures are a digital signature scheme activated with Taproot (BIP-341). They offer smaller signatures, batch verification, and enable advanced features like signature aggregation and adaptor signatures.

## BACKGROUND AND MOTIVATION
ECDSA was chosen for Bitcoin due to patent concerns. Schnorr patents expired, enabling adoption. Schnorr offers mathematical simplicity, provable security, and enables MuSig and other advanced protocols.

## TECHNICAL SPECIFICATIONS
### Core Principles
- 64-byte signatures (vs 71-72 ECDSA)
- Linear signature aggregation
- Batch verification
- Provably secure

### Implementation
**Signature Format:**
- 64 bytes: (r, s)
- No DER encoding needed
- X-only public keys (32 bytes)

**Advanced Features:**
- MuSig2: n-of-n aggregation
- Adaptor signatures
- Threshold signatures
- Blind signatures

### Parameters and Values
- Curve: secp256k1
- Signature: 64 bytes
- Public key: 32 bytes (x-only)

## SECURITY
### Security Guarantees
- Provably secure (ROM)
- Non-malleable
- Batch verification

### Best Practices
- Use with Taproot
- Implement MuSig2 for multisig
- Leverage batch verification

## ADOPTION
- Bitcoin (Taproot)
- Growing wallet support
- Foundation for future features

## SAFE SCORING RELEVANCE
### Pillar
**S (Security)** - Cryptography

### Evaluation Criteria
- Schnorr support: YES/NO
- Taproot: YES/NO
- MuSig2: YES/NO

## SOURCES
- **BIP-340**: https://github.com/bitcoin/bips/blob/master/bip-0340.mediawiki
- **Last Accessed**: 2026-01-20""",
        "official_link": "https://github.com/bitcoin/bips/blob/master/bip-0340.mediawiki"
    },

    "Taproot": {
        "match_titles": ["Taproot", "BIP-341", "BIP-342"],
        "summary": """## IDENTIFICATION
- **Code**: BIP-341, BIP-342
- **Title**: Taproot: SegWit version 1 spending rules
- **Version**: 2020
- **Status**: Final (Activated Nov 2021)
- **Author(s)**: Pieter Wuille, Jonas Nick, Anthony Towns
- **Organization**: Bitcoin Community
- **License**: BSD-3-Clause

## EXECUTIVE SUMMARY
Taproot is Bitcoin's most significant upgrade since SegWit. It combines Schnorr signatures with MAST (Merkelized Alternative Script Trees) to improve privacy, efficiency, and smart contract capabilities while making complex transactions indistinguishable from simple ones.

## BACKGROUND AND MOTIVATION
Complex Bitcoin scripts (multisig, timelocks) are visible on-chain, reducing privacy and increasing fees. Taproot hides complexity: all spends look identical on-chain, revealing only the executed path.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Key path: single signature spend
- Script path: reveal only used script
- MAST: commit to multiple scripts
- Privacy: all spends look same

### Implementation
**Address Format:**
- bc1p... (Bech32m)
- 62 characters

**Spending Paths:**
- Key path: Schnorr signature
- Script path: reveal script + proof

**Tapscript (BIP-342):**
- Updated script rules
- OP_CHECKSIGADD
- Signature-based multisig

### Parameters and Values
- Witness version: 1
- Key: 32 bytes (x-only)
- Activation: block 709,632

## SECURITY
### Security Guarantees
- Enhanced privacy
- Smaller transactions
- Future extensibility

### Best Practices
- Default to Taproot addresses
- Use key path when possible
- Leverage for multisig privacy

## ADOPTION
- Growing wallet support
- Recommended for new wallets
- Foundation for future upgrades

## SAFE SCORING RELEVANCE
### Pillar
**S (Security)** - Protocol support

### Evaluation Criteria
- Taproot send: YES/NO
- Taproot receive: YES/NO
- Default address: YES/NO

## SOURCES
- **BIP-341**: https://github.com/bitcoin/bips/blob/master/bip-0341.mediawiki
- **Last Accessed**: 2026-01-20""",
        "official_link": "https://github.com/bitcoin/bips/blob/master/bip-0341.mediawiki"
    },

    "SegWit": {
        "match_titles": ["SegWit", "Segregated Witness", "BIP-141", "BIP-143", "BIP-144"],
        "summary": """## IDENTIFICATION
- **Code**: BIP-141, BIP-143, BIP-144
- **Title**: Segregated Witness
- **Version**: 2017
- **Status**: Final (Activated Aug 2017)
- **Author(s)**: Eric Lombrozo, Johnson Lau, Pieter Wuille
- **Organization**: Bitcoin Community
- **License**: PD

## EXECUTIVE SUMMARY
Segregated Witness (SegWit) separates signature data from transaction data, fixing transaction malleability and enabling ~40% fee savings. It's a prerequisite for Lightning Network and Taproot.

## BACKGROUND AND MOTIVATION
Transaction malleability allowed changing txids before confirmation, breaking payment channels. SegWit fixes this by moving signatures to a separate "witness" structure, also increasing effective block capacity.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Signatures in witness (separate)
- Transaction malleability fix
- Block weight (not size)
- Backward compatible (soft fork)

### Implementation
**Address Types:**
- P2WPKH: bc1q... (native)
- P2WSH: bc1q... (native script)
- P2SH-P2WPKH: 3... (wrapped)

**Weight Calculation:**
- Base data: 4 weight units per byte
- Witness data: 1 weight unit per byte
- Max block: 4M weight units

### Parameters and Values
- Activation: block 481,824
- Discount: 75% on witness data
- Typical savings: ~40%

## SECURITY
### Security Guarantees
- Malleability fix
- Enables Lightning
- Foundation for Taproot

### Best Practices
- Always use SegWit addresses
- Prefer native (bc1q) over wrapped
- Upgrade to Taproot when ready

## ADOPTION
- ~80%+ of transactions
- All major wallets
- Industry standard

## SAFE SCORING RELEVANCE
### Pillar
**S (Security)** - Protocol support

### Evaluation Criteria
- SegWit support: YES/NO
- Native SegWit: YES/NO
- Default address: LEGACY/SEGWIT/TAPROOT

## SOURCES
- **BIP-141**: https://github.com/bitcoin/bips/blob/master/bip-0141.mediawiki
- **Last Accessed**: 2026-01-20""",
        "official_link": "https://github.com/bitcoin/bips/blob/master/bip-0141.mediawiki"
    },

    "AtomicSwap": {
        "match_titles": ["Atomic Swap", "Cross-chain Swap", "HTLC"],
        "summary": """## IDENTIFICATION
- **Code**: Atomic Swap / HTLC
- **Title**: Hash Time-Locked Contracts
- **Version**: Various
- **Status**: Active
- **Author(s)**: Tier Nolan (original concept)
- **Organization**: Bitcoin Community
- **License**: Various

## EXECUTIVE SUMMARY
Atomic swaps enable trustless exchange of cryptocurrencies across different blockchains without intermediaries. Using Hash Time-Locked Contracts (HTLCs), either both parties receive their coins or neither does - the swap is "atomic."

## BACKGROUND AND MOTIVATION
Exchanging between blockchains traditionally requires trusted third parties. Atomic swaps use cryptographic locks to ensure trustless exchange: reveal a secret to claim coins, or wait for timeout to refund.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Hash locks: same secret on both chains
- Time locks: refund after timeout
- Atomic: all or nothing
- Trustless: no intermediary

### Implementation
**HTLC Structure:**
1. Alice locks BTC with hash(secret)
2. Bob locks LTC with same hash
3. Alice claims LTC (reveals secret)
4. Bob uses secret to claim BTC
5. Timeouts enable refunds

**Requirements:**
- Both chains support timelocks
- Both chains support hash locks
- Compatible hash functions

### Parameters and Values
- Timelock: hours to days
- Hash: SHA-256 typically
- Secret: 32 bytes

## SECURITY
### Security Guarantees
- Trustless exchange
- No counterparty risk
- Atomic execution

### Risks and Limitations
- Both parties must be online
- Timelock coordination
- Limited liquidity
- Complexity

### Best Practices
- Use established protocols
- Understand timelocks
- Test with small amounts

## ADOPTION
- Lightning Network (internal)
- Specialized DEXs
- Growing interest

## SAFE SCORING RELEVANCE
### Pillar
**E (Ecosystem)** - Cross-chain

### Evaluation Criteria
- Atomic swap: YES/NO
- Chains supported: LIST

## SOURCES
- **Bitcoin Wiki**: https://en.bitcoin.it/wiki/Atomic_swap
- **Last Accessed**: 2026-01-20""",
        "official_link": "https://en.bitcoin.it/wiki/Atomic_swap"
    },

    "DiceRoll": {
        "match_titles": ["Dice", "Dice Roll", "Manual Entropy"],
        "summary": """## IDENTIFICATION
- **Code**: Manual Entropy
- **Title**: Dice Roll Seed Generation
- **Version**: Standard practice
- **Status**: Active
- **Author(s)**: Various
- **Organization**: Bitcoin Community
- **License**: N/A

## EXECUTIVE SUMMARY
Dice roll seed generation allows users to create their own entropy for seed phrases using physical dice. This eliminates trust in hardware random number generators and provides verifiable randomness for the most security-conscious users.

## BACKGROUND AND MOTIVATION
Hardware RNGs could be compromised or backdoored. Dice provide verifiable physical randomness. Users can generate their own entropy without trusting any electronic device, achieving maximum security for seed generation.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Physical randomness source
- User-controlled entropy
- Verifiable process
- No electronic trust

### Implementation
**Process:**
1. Roll dice 99 times (for 256 bits)
2. Record each roll
3. Convert to binary/seed
4. Calculate checksum
5. Derive mnemonic words

**Dice Types:**
- Standard 6-sided (base 6)
- Casino-grade recommended
- Multiple dice for speed

### Parameters and Values
- Rolls needed: ~99 for 256 bits
- Entropy: log2(6) ≈ 2.58 bits per roll
- Checksum: SHA-256 based

## SECURITY
### Security Guarantees
- No electronic trust required
- Verifiable randomness
- User-controlled process

### Risks and Limitations
- Human error in recording
- Biased dice possible
- Time-consuming
- Requires understanding

### Best Practices
- Use casino-grade dice
- Roll on flat surface
- Double-check recordings
- Verify checksum calculation

## ADOPTION
- Coldcard native support
- SeedSigner support
- Power user feature

## SAFE SCORING RELEVANCE
### Pillar
**S (Security)** - Entropy generation

### Evaluation Criteria
- Dice roll support: YES/NO
- Manual entropy: YES/NO

## SOURCES
- **Coldcard Docs**: https://coldcard.com/docs/
- **Last Accessed**: 2026-01-20""",
        "official_link": "https://coldcard.com/docs/"
    },

    "SeedXOR": {
        "match_titles": ["Seed XOR", "SeedXOR", "Seed Split"],
        "summary": """## IDENTIFICATION
- **Code**: Seed XOR
- **Title**: Seed XOR Splitting
- **Version**: 2020
- **Status**: Active
- **Author(s)**: Coinkite
- **Organization**: Coinkite
- **License**: MIT

## EXECUTIVE SUMMARY
Seed XOR allows splitting a seed phrase into multiple parts using XOR operations. Each part looks like a valid seed phrase, and all parts are needed to reconstruct the original. This provides plausible deniability and distributed backup.

## BACKGROUND AND MOTIVATION
Storing a single seed phrase is risky - if found, funds are compromised. Seed XOR splits the seed into parts that individually look valid but produce different (empty) wallets. Only combining all parts reveals the real seed.

## TECHNICAL SPECIFICATIONS
### Core Principles
- XOR-based splitting
- Each part is valid seed
- All parts needed to restore
- Plausible deniability

### Implementation
**Process:**
1. Generate random seed(s) as parts
2. XOR all parts with original
3. Result is final part
4. Each part is valid mnemonic

**Reconstruction:**
- XOR all parts together
- Order doesn't matter
- Missing any part = wrong seed

### Parameters and Values
- Parts: 2 or more
- Each part: 12/24 words
- Security: all-or-nothing

## SECURITY
### Security Guarantees
- Distributed backup
- Plausible deniability
- No single point of failure

### Risks and Limitations
- All parts needed
- Lose one = lose all
- Complexity
- Limited wallet support

### Best Practices
- Store parts in different locations
- Document the scheme securely
- Test reconstruction
- Consider redundancy

## ADOPTION
- Coldcard native
- Growing awareness
- Alternative to Shamir

## SAFE SCORING RELEVANCE
### Pillar
**S (Security)** - Backup methods

### Evaluation Criteria
- Seed XOR: YES/NO
- Split count: NUMBER

## SOURCES
- **Coldcard Seed XOR**: https://coldcard.com/docs/seed-xor
- **Last Accessed**: 2026-01-20""",
        "official_link": "https://coldcard.com/docs/seed-xor"
    },

    "Shamir": {
        "match_titles": ["Shamir", "SLIP-39", "SSS", "Secret Sharing"],
        "summary": """## IDENTIFICATION
- **Code**: SLIP-39
- **Title**: Shamir's Secret Sharing for Mnemonic Codes
- **Version**: 2019
- **Status**: Final
- **Author(s)**: Pavol Rusnak, et al.
- **Organization**: SatoshiLabs
- **License**: MIT

## EXECUTIVE SUMMARY
SLIP-39 implements Shamir's Secret Sharing for seed backup. It splits a seed into multiple shares where a threshold (e.g., 3-of-5) is needed to reconstruct. This provides redundancy - losing some shares doesn't lose access.

## BACKGROUND AND MOTIVATION
Single seed backup is fragile. Shamir allows M-of-N schemes: create N shares, need M to recover. This provides redundancy (can lose N-M shares) while maintaining security (need M shares to access).

## TECHNICAL SPECIFICATIONS
### Core Principles
- Threshold scheme (M-of-N)
- Polynomial interpolation
- Redundant backup
- 20-word shares

### Implementation
**SLIP-39 Features:**
- 20 words per share (vs 24 BIP-39)
- Groups support (2-level)
- Checksum per share
- Passphrase support

**Example Schemes:**
- 2-of-3: simple redundancy
- 3-of-5: more redundancy
- 2-of-3 groups of 3-of-5: complex

### Parameters and Values
- Share size: 20 words
- Threshold: configurable
- Groups: optional
- Iteration exponent: 1 (default)

## SECURITY
### Security Guarantees
- Redundant backup
- Threshold security
- No single point of failure

### Risks and Limitations
- Not BIP-39 compatible
- Limited wallet support
- Complexity
- Share management

### Best Practices
- Choose appropriate threshold
- Distribute shares geographically
- Document scheme securely
- Test recovery

## ADOPTION
- Trezor native
- Growing support
- Alternative to Seed XOR

## SAFE SCORING RELEVANCE
### Pillar
**S (Security)** - Backup methods

### Evaluation Criteria
- SLIP-39: YES/NO
- Shamir backup: YES/NO

## SOURCES
- **SLIP-39**: https://github.com/satoshilabs/slips/blob/master/slip-0039.md
- **Last Accessed**: 2026-01-20""",
        "official_link": "https://github.com/satoshilabs/slips/blob/master/slip-0039.md"
    },

    "Derivation": {
        "match_titles": ["Derivation", "Derivation Path", "BIP-44", "Account"],
        "summary": """## IDENTIFICATION
- **Code**: BIP-32, BIP-43, BIP-44, BIP-49, BIP-84, BIP-86
- **Title**: HD Wallet Derivation Paths
- **Version**: Various
- **Status**: Final
- **Author(s)**: Various
- **Organization**: Bitcoin Community
- **License**: Various

## EXECUTIVE SUMMARY
Derivation paths define how keys are derived from a master seed in HD wallets. Standard paths (BIP-44/49/84/86) ensure wallet interoperability - the same seed produces the same addresses across different wallets.

## BACKGROUND AND MOTIVATION
HD wallets derive infinite keys from one seed. Without standard paths, different wallets would derive different addresses from the same seed. BIP-44 and successors standardize this for interoperability.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Hierarchical derivation
- Standard path structure
- Purpose/coin/account/change/index
- Hardened vs normal derivation

### Implementation
**Path Format:**
m / purpose' / coin_type' / account' / change / address_index

**Standard Purposes:**
- 44': Legacy (P2PKH)
- 49': SegWit wrapped (P2SH-P2WPKH)
- 84': Native SegWit (P2WPKH)
- 86': Taproot (P2TR)

**Coin Types:**
- 0': Bitcoin mainnet
- 1': Bitcoin testnet
- 60': Ethereum

### Parameters and Values
- Hardened: ' or h suffix
- Account: starts at 0
- Change: 0 (receive), 1 (change)

## SECURITY
### Security Guarantees
- Deterministic derivation
- Wallet interoperability
- Account separation

### Best Practices
- Use standard paths
- Document custom paths
- Backup derivation info with seed

## ADOPTION
- Universal standard
- All HD wallets
- Essential for recovery

## SAFE SCORING RELEVANCE
### Pillar
**S (Security)** - Key management

### Evaluation Criteria
- BIP-44: YES/NO
- BIP-84: YES/NO
- BIP-86: YES/NO
- Custom paths: YES/NO

## SOURCES
- **BIP-44**: https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki
- **Last Accessed**: 2026-01-20""",
        "official_link": "https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki"
    },

    "MessageSigning": {
        "match_titles": ["Message Sign", "Signed Message", "Proof of Ownership"],
        "summary": """## IDENTIFICATION
- **Code**: BIP-137, BIP-322
- **Title**: Message Signing
- **Version**: Various
- **Status**: Active
- **Author(s)**: Various
- **Organization**: Bitcoin Community
- **License**: Various

## EXECUTIVE SUMMARY
Message signing allows proving ownership of a Bitcoin address without moving funds. Users sign a message with their private key, and anyone can verify the signature matches the address. Used for proof of reserves and authentication.

## BACKGROUND AND MOTIVATION
Sometimes you need to prove you control an address without spending. Message signing provides cryptographic proof of ownership. Used for proof of reserves, authentication, and dispute resolution.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Sign arbitrary message
- Prove address ownership
- No on-chain transaction
- Verifiable by anyone

### Implementation
**Legacy (BIP-137):**
- Works with P2PKH addresses
- Base64 encoded signature
- Recovery ID included

**Generic (BIP-322):**
- Works with any address type
- Virtual transaction format
- SegWit/Taproot compatible

### Parameters and Values
- Message: arbitrary text
- Signature: base64 encoded
- Address: signing address

## SECURITY
### Security Guarantees
- Cryptographic proof
- No fund movement
- Publicly verifiable

### Risks and Limitations
- Legacy format limited
- BIP-322 adoption growing
- Phishing risk (sign carefully)

### Best Practices
- Verify message content before signing
- Use for legitimate purposes only
- Prefer BIP-322 for new addresses

## ADOPTION
- All major wallets
- Proof of reserves
- Authentication systems

## SAFE SCORING RELEVANCE
### Pillar
**F (Functionality)** - Features

### Evaluation Criteria
- Message signing: YES/NO
- BIP-322: YES/NO
- Verify signatures: YES/NO

## SOURCES
- **BIP-322**: https://github.com/bitcoin/bips/blob/master/bip-0322.mediawiki
- **Last Accessed**: 2026-01-20""",
        "official_link": "https://github.com/bitcoin/bips/blob/master/bip-0322.mediawiki"
    },

    "AddressVerification": {
        "match_titles": ["Address Verification", "Address Check", "Verify Address"],
        "summary": """## IDENTIFICATION
- **Code**: Address Verification
- **Title**: On-Device Address Verification
- **Version**: Standard feature
- **Status**: Active
- **Author(s)**: Various
- **Organization**: Hardware wallet manufacturers
- **License**: N/A

## EXECUTIVE SUMMARY
Address verification on hardware wallets displays the receiving address on the device screen for user confirmation. This prevents clipboard hijacking attacks where malware replaces addresses. Essential security feature for all hardware wallets.

## BACKGROUND AND MOTIVATION
Malware can replace clipboard addresses with attacker addresses. If users only verify on computer screen, they may send to wrong address. Hardware wallet verification shows the true address on a trusted display.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Display on trusted screen
- User visual verification
- Prevent clipboard attacks
- Confirm before sharing

### Implementation
**Process:**
1. Request address from wallet
2. Wallet displays on device
3. User verifies matches
4. Confirm on device
5. Safe to share address

**Verification Points:**
- First/last characters
- Full address comparison
- QR code verification

### Parameters and Values
- Display: full address
- Confirmation: button press
- Timeout: varies

## SECURITY
### Security Guarantees
- Prevents clipboard hijacking
- Trusted display verification
- User confirmation required

### Risks and Limitations
- User must actually verify
- Small screens challenging
- Address fatigue

### Best Practices
- Always verify on device
- Check full address
- Verify for every transaction
- Use QR codes when possible

## ADOPTION
- All hardware wallets
- Essential feature
- Industry standard

## SAFE SCORING RELEVANCE
### Pillar
**S (Security)** - Transaction security

### Evaluation Criteria
- Address verification: YES/NO
- On-device display: YES/NO

## SOURCES
- **Industry Standard**: Various manufacturers
- **Last Accessed**: 2026-01-20""",
        "official_link": "https://en.bitcoin.it/wiki/Address"
    },

    "Mempool": {
        "match_titles": ["Mempool", "Unconfirmed", "Pending Transaction"],
        "summary": """## IDENTIFICATION
- **Code**: Mempool
- **Title**: Bitcoin Memory Pool
- **Version**: Core feature
- **Status**: Active
- **Author(s)**: Bitcoin Core
- **Organization**: Bitcoin Community
- **License**: MIT

## EXECUTIVE SUMMARY
The mempool is where unconfirmed transactions wait before being included in a block. Wallets that display mempool status help users understand transaction state, estimate fees, and use RBF effectively.

## BACKGROUND AND MOTIVATION
After broadcasting, transactions enter the mempool. Miners select transactions based on fee rate. Understanding mempool state helps users set appropriate fees and monitor pending transactions.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Unconfirmed transaction pool
- Fee-based prioritization
- Node-specific (not consensus)
- Dynamic size

### Implementation
**Mempool Features:**
- Transaction queue
- Fee rate sorting
- Size limits
- Eviction policies

**Wallet Integration:**
- Show pending transactions
- Display mempool position
- Fee estimation
- RBF support

### Parameters and Values
- Default size: 300 MB
- Min relay fee: 1 sat/vB
- Expiry: 2 weeks default

## SECURITY
### Security Guarantees
- Transaction visibility
- Fee market transparency
- RBF capability

### Risks and Limitations
- Not guaranteed inclusion
- Can be evicted
- Node-specific view
- Privacy considerations

### Best Practices
- Monitor mempool for fees
- Use RBF for flexibility
- Don't trust 0-conf
- Check mempool.space

## ADOPTION
- All Bitcoin nodes
- Mempool.space visualization
- Wallet integration growing

## SAFE SCORING RELEVANCE
### Pillar
**F (Functionality)** - Transaction management

### Evaluation Criteria
- Mempool display: YES/NO
- Fee estimation: YES/NO
- RBF support: YES/NO

## SOURCES
- **Mempool.space**: https://mempool.space/
- **Last Accessed**: 2026-01-20""",
        "official_link": "https://mempool.space/"
    },

    "Batching": {
        "match_titles": ["Batch", "Batching", "Batch Transaction"],
        "summary": """## IDENTIFICATION
- **Code**: Transaction Batching
- **Title**: Payment Batching
- **Version**: Standard practice
- **Status**: Active
- **Author(s)**: Various
- **Organization**: Bitcoin Community
- **License**: N/A

## EXECUTIVE SUMMARY
Transaction batching combines multiple payments into a single transaction with multiple outputs. This significantly reduces fees by sharing the transaction overhead across all payments. Essential for exchanges and businesses.

## BACKGROUND AND MOTIVATION
Each Bitcoin transaction has fixed overhead (inputs, change). Sending payments individually wastes block space. Batching combines payments, reducing total fees by 50-80% for high-volume senders.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Multiple outputs per transaction
- Shared input overhead
- Fee savings
- Delayed settlement

### Implementation
**Process:**
1. Collect pending payments
2. Combine into single transaction
3. Multiple outputs to recipients
4. Single change output
5. Broadcast once

**Savings Calculation:**
- Single payment: ~140 vB
- Batched (10 outputs): ~400 vB
- Savings: ~75%

### Parameters and Values
- Max outputs: hundreds possible
- Optimal batch: 10-50 outputs
- Delay: minutes to hours

## SECURITY
### Security Guarantees
- Same security as single tx
- All outputs confirmed together
- Atomic (all or nothing)

### Risks and Limitations
- Delayed settlement
- Privacy reduction (linked outputs)
- Complexity
- Failure affects all

### Best Practices
- Batch during low-fee periods
- Balance delay vs savings
- Consider privacy implications
- Test with small batches

## ADOPTION
- Exchanges standard practice
- Business wallets
- Growing awareness

## SAFE SCORING RELEVANCE
### Pillar
**F (Functionality)** - Transaction efficiency

### Evaluation Criteria
- Batching support: YES/NO
- Auto-batching: YES/NO

## SOURCES
- **Bitcoin Wiki**: https://en.bitcoin.it/wiki/Techniques_to_reduce_transaction_fees
- **Last Accessed**: 2026-01-20""",
        "official_link": "https://en.bitcoin.it/wiki/Techniques_to_reduce_transaction_fees"
    },

    "Consolidation": {
        "match_titles": ["Consolidat", "UTXO Consolidation", "Dust"],
        "summary": """## IDENTIFICATION
- **Code**: UTXO Consolidation
- **Title**: Consolidating UTXOs
- **Version**: Standard practice
- **Status**: Active
- **Author(s)**: Various
- **Organization**: Bitcoin Community
- **License**: N/A

## EXECUTIVE SUMMARY
UTXO consolidation combines many small UTXOs into fewer larger ones during low-fee periods. This reduces future transaction costs and prevents dust accumulation. Essential maintenance for active wallets.

## BACKGROUND AND MOTIVATION
Many small UTXOs increase transaction size (more inputs). During high fees, small UTXOs may cost more to spend than their value (dust). Consolidating during low fees prepares for future high-fee periods.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Combine small UTXOs
- Reduce future tx size
- Low-fee timing
- Dust prevention

### Implementation
**Process:**
1. Identify small UTXOs
2. Wait for low fees
3. Send all to self
4. Single larger UTXO result

**Dust Threshold:**
- Typically < 546 sats
- Depends on fee environment
- May be unspendable

### Parameters and Values
- Target: 1-3 UTXOs
- Timing: < 5 sat/vB ideal
- Frequency: as needed

## SECURITY
### Security Guarantees
- Reduced future costs
- Dust elimination
- Wallet maintenance

### Risks and Limitations
- Privacy reduction (links UTXOs)
- Immediate fee cost
- Timing important
- Over-consolidation risky

### Best Practices
- Consolidate during low fees
- Keep some UTXO diversity
- Consider privacy implications
- Don't consolidate everything

## ADOPTION
- Power user practice
- Wallet support varies
- Growing awareness

## SAFE SCORING RELEVANCE
### Pillar
**F (Functionality)** - UTXO management

### Evaluation Criteria
- Consolidation tool: YES/NO
- Dust alerts: YES/NO

## SOURCES
- **Bitcoin Wiki**: https://en.bitcoin.it/wiki/Techniques_to_reduce_transaction_fees
- **Last Accessed**: 2026-01-20""",
        "official_link": "https://en.bitcoin.it/wiki/Techniques_to_reduce_transaction_fees"
    },

    "Xpub": {
        "match_titles": ["Xpub", "Extended Public Key", "Watch-only", "XPUB"],
        "summary": """## IDENTIFICATION
- **Code**: BIP-32
- **Title**: Extended Public Keys
- **Version**: 2012
- **Status**: Final
- **Author(s)**: Pieter Wuille
- **Organization**: Bitcoin Community
- **License**: PD

## EXECUTIVE SUMMARY
Extended public keys (xpubs) allow generating all public keys and addresses from a wallet without access to private keys. This enables watch-only wallets, account monitoring, and receiving addresses without spending capability.

## BACKGROUND AND MOTIVATION
Businesses need to generate receiving addresses without exposing private keys. Xpubs enable this by allowing derivation of child public keys. Watch-only wallets can monitor balances and generate addresses safely.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Derive child public keys
- No private key exposure
- Watch-only capability
- Hierarchical structure

### Implementation
**Key Types:**
- xpub: Legacy (P2PKH)
- ypub: SegWit wrapped (P2SH-P2WPKH)
- zpub: Native SegWit (P2WPKH)
- Vpub: Taproot (P2TR)

**Structure:**
- 78 bytes encoded
- Chain code + public key
- Depth and parent info

### Parameters and Values
- Encoding: Base58Check
- Length: 111 characters
- Prefix: varies by type

## SECURITY
### Security Guarantees
- No spending capability
- Safe for monitoring
- Address generation

### Risks and Limitations
- Privacy leak if shared
- Reveals all addresses
- Gap limit issues

### Best Practices
- Never share xpub publicly
- Use for watch-only only
- Prefer descriptors

## ADOPTION
- Universal standard
- All HD wallets
- Business essential

## SAFE SCORING RELEVANCE
### Pillar
**S (Security)** - Key management

### Evaluation Criteria
- Xpub export: YES/NO
- Watch-only: YES/NO

## SOURCES
- **BIP-32**: https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki
- **Last Accessed**: 2026-01-20""",
        "official_link": "https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki"
    },

    "Bech32": {
        "match_titles": ["Bech32", "bc1", "Native Address"],
        "summary": """## IDENTIFICATION
- **Code**: BIP-173, BIP-350
- **Title**: Bech32/Bech32m Address Encoding
- **Version**: 2017, 2020
- **Status**: Final
- **Author(s)**: Pieter Wuille, Greg Maxwell
- **Organization**: Bitcoin Community
- **License**: PD

## EXECUTIVE SUMMARY
Bech32 is the address encoding for native SegWit addresses (bc1q...). Bech32m (BIP-350) is an improved version for Taproot addresses (bc1p...). These formats offer better error detection and are case-insensitive.

## BACKGROUND AND MOTIVATION
Base58Check addresses have poor error detection and are case-sensitive. Bech32 uses a BCH code for better error detection, is lowercase-only (easier to read/type), and is more efficient in QR codes.

## TECHNICAL SPECIFICATIONS
### Core Principles
- BCH error detection
- Case-insensitive (lowercase)
- Human-readable prefix
- QR code efficient

### Implementation
**Address Types:**
- bc1q...: SegWit v0 (Bech32)
- bc1p...: SegWit v1/Taproot (Bech32m)
- tb1...: Testnet

**Structure:**
- HRP: bc (mainnet), tb (testnet)
- Separator: 1
- Data: witness version + program
- Checksum: 6 characters

### Parameters and Values
- Length: 42-62 characters
- Charset: qpzry9x8gf2tvdw0s3jn54khce6mua7l
- Checksum: BCH code

## SECURITY
### Security Guarantees
- Better error detection
- Detects up to 4 errors
- Locates up to 2 errors

### Best Practices
- Use native SegWit (bc1q)
- Upgrade to Taproot (bc1p)
- Verify checksum

## ADOPTION
- Standard for SegWit/Taproot
- All modern wallets
- Recommended format

## SAFE SCORING RELEVANCE
### Pillar
**S (Security)** - Address format

### Evaluation Criteria
- Bech32 support: YES/NO
- Bech32m support: YES/NO
- Default format: LEGACY/BECH32/BECH32M

## SOURCES
- **BIP-173**: https://github.com/bitcoin/bips/blob/master/bip-0173.mediawiki
- **Last Accessed**: 2026-01-20""",
        "official_link": "https://github.com/bitcoin/bips/blob/master/bip-0173.mediawiki"
    },

    "MultiChain": {
        "match_titles": ["Multi-chain", "Multi-coin", "Multiple Blockchain", "Cross-chain"],
        "summary": """## IDENTIFICATION
- **Code**: Multi-chain Support
- **Title**: Multi-blockchain Wallet Support
- **Version**: Various
- **Status**: Active
- **Author(s)**: Various
- **Organization**: Various
- **License**: Various

## EXECUTIVE SUMMARY
Multi-chain wallets support multiple blockchain networks (Bitcoin, Ethereum, Solana, etc.) in a single application. This provides convenience but may introduce complexity and security trade-offs compared to single-chain wallets.

## BACKGROUND AND MOTIVATION
Users often hold assets on multiple blockchains. Managing separate wallets is inconvenient. Multi-chain wallets consolidate management while maintaining separate keys/addresses per chain.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Multiple blockchain support
- Unified interface
- Separate key derivation per chain
- Cross-chain features

### Implementation
**Derivation:**
- BIP-44 coin types
- Chain-specific paths
- Shared master seed

**Common Chains:**
- Bitcoin (BIP-44 coin 0)
- Ethereum (BIP-44 coin 60)
- Solana, Cosmos, etc.

### Parameters and Values
- Coin types: per SLIP-44
- Derivation: chain-specific
- Address formats: vary

## SECURITY
### Security Guarantees
- Single seed backup
- Unified management
- Chain isolation

### Risks and Limitations
- Larger attack surface
- Complexity
- Chain-specific bugs
- Update frequency

### Best Practices
- Verify chain support quality
- Test each chain separately
- Consider dedicated wallets for large holdings

## ADOPTION
- Most software wallets
- Growing hardware support
- User convenience

## SAFE SCORING RELEVANCE
### Pillar
**E (Ecosystem)** - Chain support

### Evaluation Criteria
- Chains supported: LIST
- Native integration: YES/NO
- Cross-chain features: YES/NO

## SOURCES
- **SLIP-44**: https://github.com/satoshilabs/slips/blob/master/slip-0044.md
- **Last Accessed**: 2026-01-20""",
        "official_link": "https://github.com/satoshilabs/slips/blob/master/slip-0044.md"
    },

    "Recovery": {
        "match_titles": ["Recovery", "Restore", "Wallet Recovery"],
        "summary": """## IDENTIFICATION
- **Code**: Wallet Recovery
- **Title**: Seed Phrase Recovery
- **Version**: Standard practice
- **Status**: Active
- **Author(s)**: Various
- **Organization**: Bitcoin Community
- **License**: N/A

## EXECUTIVE SUMMARY
Wallet recovery is the process of restoring access to funds using a backup seed phrase. Proper recovery requires the correct seed words, passphrase (if used), and derivation paths. Testing recovery is essential.

## BACKGROUND AND MOTIVATION
Hardware can fail, be lost, or stolen. Seed phrase backup enables recovery on any compatible wallet. Understanding recovery process is critical for self-custody.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Seed phrase restoration
- Derivation path matching
- Passphrase inclusion
- Wallet compatibility

### Implementation
**Recovery Requirements:**
1. Correct seed words (order matters)
2. Passphrase (if used)
3. Derivation paths
4. Compatible wallet software

**Common Issues:**
- Wrong word order
- Missing passphrase
- Wrong derivation path
- Incompatible wallet

### Parameters and Values
- Words: 12, 18, or 24
- Passphrase: optional
- Paths: BIP-44/49/84/86

## SECURITY
### Security Guarantees
- Full fund recovery
- Hardware independence
- Self-sovereignty

### Risks and Limitations
- Seed exposure during recovery
- Phishing recovery tools
- Forgotten passphrase

### Best Practices
- Test recovery before funding
- Use offline recovery
- Verify addresses match
- Document derivation paths

## ADOPTION
- Universal requirement
- All self-custody wallets
- Critical skill

## SAFE SCORING RELEVANCE
### Pillar
**S (Security)** - Backup/recovery

### Evaluation Criteria
- Recovery support: YES/NO
- Recovery testing: YES/NO
- Clear instructions: YES/NO

## SOURCES
- **BIP-39**: https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki
- **Last Accessed**: 2026-01-20""",
        "official_link": "https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki"
    },

    "Verification": {
        "match_titles": ["Verification", "Verify", "Authenticity"],
        "summary": """## IDENTIFICATION
- **Code**: Device Verification
- **Title**: Hardware Wallet Authenticity Verification
- **Version**: Various
- **Status**: Active
- **Author(s)**: Various manufacturers
- **Organization**: Various
- **License**: N/A

## EXECUTIVE SUMMARY
Device verification confirms a hardware wallet is genuine and hasn't been tampered with. Methods include secure boot, attestation certificates, and physical security features. Essential to prevent supply chain attacks.

## BACKGROUND AND MOTIVATION
Counterfeit or tampered hardware wallets can steal funds. Verification ensures the device is genuine, running authentic firmware, and hasn't been compromised during shipping or storage.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Authenticity verification
- Firmware integrity
- Supply chain security
- Tamper detection

### Implementation
**Verification Methods:**
- Secure element attestation
- Firmware signatures
- Physical seals
- Companion app verification

**Checks:**
- Device certificate
- Firmware hash
- Bootloader integrity
- Physical inspection

### Parameters and Values
- Certificate: manufacturer signed
- Firmware: version verified
- Seals: intact/broken

## SECURITY
### Security Guarantees
- Genuine device confirmation
- Firmware integrity
- Tamper evidence

### Risks and Limitations
- Sophisticated counterfeits
- Seal bypass possible
- Trust in manufacturer

### Best Practices
- Buy from official sources
- Verify on first use
- Check firmware version
- Inspect physical seals

## ADOPTION
- All major manufacturers
- Industry standard
- Essential security

## SAFE SCORING RELEVANCE
### Pillar
**S (Security)** - Supply chain

### Evaluation Criteria
- Device verification: YES/NO
- Attestation: YES/NO
- Tamper seals: YES/NO

## SOURCES
- **Industry Standard**: Various manufacturers
- **Last Accessed**: 2026-01-20""",
        "official_link": "https://en.wikipedia.org/wiki/Hardware_security_module"
    },

    "Stablecoin": {
        "match_titles": ["Stablecoin", "USDT", "USDC", "DAI", "Stable"],
        "summary": """## IDENTIFICATION
- **Code**: Stablecoins
- **Title**: Price-Stable Cryptocurrencies
- **Version**: Various
- **Status**: Active
- **Author(s)**: Various
- **Organization**: Various (Tether, Circle, MakerDAO)
- **License**: Various

## EXECUTIVE SUMMARY
Stablecoins are cryptocurrencies designed to maintain a stable value, typically pegged to fiat currencies like USD. Types include fiat-backed (USDT, USDC), crypto-backed (DAI), and algorithmic. Essential for trading and DeFi.

## BACKGROUND AND MOTIVATION
Cryptocurrency volatility limits use for payments and savings. Stablecoins provide price stability while maintaining blockchain benefits: fast transfers, programmability, and global access.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Price stability (usually $1)
- Various backing mechanisms
- Blockchain-native
- Redeemable (some)

### Implementation
**Types:**
- Fiat-backed: USDT, USDC (reserves)
- Crypto-backed: DAI (overcollateralized)
- Algorithmic: (various mechanisms)

**Major Stablecoins:**
- USDT (Tether): largest, multi-chain
- USDC (Circle): regulated, audited
- DAI (MakerDAO): decentralized
- BUSD, TUSD, etc.

### Parameters and Values
- Peg: typically $1.00
- Chains: Ethereum, Tron, others
- Market cap: billions USD

## SECURITY
### Security Guarantees
- Price stability (design goal)
- Blockchain security
- Audit trails (some)

### Risks and Limitations
- Counterparty risk (fiat-backed)
- Depegging events
- Regulatory risk
- Smart contract risk

### Best Practices
- Diversify stablecoin holdings
- Prefer audited/regulated
- Monitor peg stability
- Understand backing

## ADOPTION
- Essential for trading
- DeFi cornerstone
- Growing payments use

## SAFE SCORING RELEVANCE
### Pillar
**E (Ecosystem)** - Token support

### Evaluation Criteria
- USDT support: YES/NO
- USDC support: YES/NO
- DAI support: YES/NO
- Chains: LIST

## SOURCES
- **Various**: Tether, Circle, MakerDAO
- **Last Accessed**: 2026-01-20""",
        "official_link": "https://www.circle.com/en/usdc"
    },

    "DeFiProtocol": {
        "match_titles": ["DeFi", "Decentralized Finance", "Lending", "Yield"],
        "summary": """## IDENTIFICATION
- **Code**: DeFi Protocols
- **Title**: Decentralized Finance
- **Version**: Various
- **Status**: Active
- **Author(s)**: Various
- **Organization**: Various
- **License**: Various (mostly open source)

## EXECUTIVE SUMMARY
DeFi (Decentralized Finance) protocols provide financial services without intermediaries using smart contracts. Categories include lending (Aave, Compound), trading (Uniswap), and yield farming. Wallet integration enables direct protocol interaction.

## BACKGROUND AND MOTIVATION
Traditional finance requires intermediaries. DeFi uses smart contracts for trustless financial services: lending, borrowing, trading, and yield generation. Accessible to anyone with a wallet.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Smart contract-based
- Non-custodial
- Permissionless
- Composable

### Implementation
**Protocol Types:**
- Lending: Aave, Compound
- DEX: Uniswap, Curve
- Yield: Yearn, Convex
- Derivatives: dYdX, GMX

**Wallet Integration:**
- Direct contract interaction
- Approval management
- Position tracking
- Yield display

### Parameters and Values
- TVL: billions USD
- APY: varies widely
- Gas: transaction dependent

## SECURITY
### Security Guarantees
- Non-custodial
- Transparent code
- Audited (usually)

### Risks and Limitations
- Smart contract bugs
- Economic exploits
- Impermanent loss
- Liquidation risk

### Best Practices
- Start small
- Understand risks
- Check audits
- Monitor positions

## ADOPTION
- Billions in TVL
- Growing integration
- Essential for Ethereum users

## SAFE SCORING RELEVANCE
### Pillar
**E (Ecosystem)** - DeFi integration

### Evaluation Criteria
- DeFi support: YES/NO
- Protocols: LIST
- Position tracking: YES/NO

## SOURCES
- **DeFi Llama**: https://defillama.com/
- **Last Accessed**: 2026-01-20""",
        "official_link": "https://defillama.com/"
    },

    "GasOptimization": {
        "match_titles": ["Gas", "Gas Optimization", "Gas Limit", "Gas Price"],
        "summary": """## IDENTIFICATION
- **Code**: Gas Optimization
- **Title**: Ethereum Gas Management
- **Version**: EIP-1559 (2021)
- **Status**: Active
- **Author(s)**: Vitalik Buterin, et al.
- **Organization**: Ethereum Community
- **License**: Various

## EXECUTIVE SUMMARY
Gas is the unit measuring computational effort on Ethereum. Gas optimization in wallets helps users pay appropriate fees, avoid failed transactions, and save money. EIP-1559 introduced base fee + priority fee model.

## BACKGROUND AND MOTIVATION
Ethereum transactions require gas. Overpaying wastes money; underpaying causes failures. Good wallets estimate gas accurately, suggest appropriate fees, and allow customization.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Gas limit estimation
- Gas price optimization
- EIP-1559 support
- Failed transaction prevention

### Implementation
**EIP-1559 Model:**
- Base fee: algorithmically set
- Priority fee: tip to validators
- Max fee: user's maximum

**Wallet Features:**
- Gas estimation
- Fee suggestions
- Speed options
- Custom settings

### Parameters and Values
- Gas unit: gwei (10^-9 ETH)
- Base fee: varies by demand
- Priority: 1-2 gwei typical

## SECURITY
### Security Guarantees
- Predictable fees
- Reduced overpayment
- Failed tx prevention

### Risks and Limitations
- Estimation errors
- Network congestion
- Complex transactions

### Best Practices
- Use EIP-1559
- Check gas before confirming
- Set reasonable max fee
- Avoid peak times

## ADOPTION
- All Ethereum wallets
- EIP-1559 standard
- Essential feature

## SAFE SCORING RELEVANCE
### Pillar
**F (Functionality)** - Transaction management

### Evaluation Criteria
- Gas estimation: YES/NO
- EIP-1559: YES/NO
- Custom gas: YES/NO

## SOURCES
- **EIP-1559**: https://eips.ethereum.org/EIPS/eip-1559
- **Last Accessed**: 2026-01-20""",
        "official_link": "https://eips.ethereum.org/EIPS/eip-1559"
    },

    "Mobile": {
        "match_titles": ["Mobile", "iOS", "Android", "App Store", "Play Store"],
        "summary": """## IDENTIFICATION
- **Code**: Mobile Wallet
- **Title**: Mobile Cryptocurrency Wallet
- **Version**: Various
- **Status**: Active
- **Author(s)**: Various
- **Organization**: Various
- **License**: Various

## EXECUTIVE SUMMARY
Mobile wallets are smartphone applications for managing cryptocurrencies. They offer convenience and portability but rely on phone security. Categories include hot wallets (keys on phone) and companion apps (keys on hardware wallet).

## BACKGROUND AND MOTIVATION
Smartphones are ubiquitous. Mobile wallets enable everyday crypto use: payments, checking balances, and quick transactions. Hardware wallet companion apps provide security while maintaining mobile convenience.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Smartphone-based
- Touch interface
- Biometric security
- Push notifications

### Implementation
**Types:**
- Hot wallet: keys on device
- Companion app: connects to hardware
- Watch-only: monitoring only

**Platforms:**
- iOS (App Store)
- Android (Play Store)
- Cross-platform

### Parameters and Values
- OS requirements: vary
- Storage: varies
- Permissions: camera, network

## SECURITY
### Security Guarantees
- Biometric protection
- Secure enclave (iOS)
- Encryption at rest

### Risks and Limitations
- Phone theft/loss
- Malware risk
- OS vulnerabilities
- App store risks

### Best Practices
- Use hardware wallet for large amounts
- Enable biometrics
- Keep OS updated
- Download from official stores

## ADOPTION
- Most popular wallet type
- Essential for daily use
- Growing features

## SAFE SCORING RELEVANCE
### Pillar
**F (Functionality)** - Platform support

### Evaluation Criteria
- iOS app: YES/NO
- Android app: YES/NO
- App store rating: SCORE
- Biometric support: YES/NO

## SOURCES
- **Various**: App Store, Play Store
- **Last Accessed**: 2026-01-20""",
        "official_link": "https://www.apple.com/app-store/"
    },

    "Desktop": {
        "match_titles": ["Desktop", "Windows", "macOS", "Linux", "PC"],
        "summary": """## IDENTIFICATION
- **Code**: Desktop Wallet
- **Title**: Desktop Cryptocurrency Wallet
- **Version**: Various
- **Status**: Active
- **Author(s)**: Various
- **Organization**: Various
- **License**: Various

## EXECUTIVE SUMMARY
Desktop wallets are computer applications for managing cryptocurrencies. They typically offer more features than mobile wallets and are essential for hardware wallet management. Available for Windows, macOS, and Linux.

## BACKGROUND AND MOTIVATION
Computers provide larger screens, more storage, and better processing for complex operations. Desktop wallets excel at advanced features: coin control, PSBT handling, and hardware wallet integration.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Computer-based
- Full feature set
- Hardware wallet integration
- Advanced options

### Implementation
**Types:**
- Full node: downloads blockchain
- Light client: SPV/Electrum
- Companion app: hardware wallet

**Platforms:**
- Windows
- macOS
- Linux

### Parameters and Values
- Storage: varies (full node: 500GB+)
- RAM: varies
- Network: required

## SECURITY
### Security Guarantees
- More control than mobile
- Full node option
- Hardware wallet support

### Risks and Limitations
- Computer malware
- Physical access
- Backup complexity

### Best Practices
- Use dedicated computer
- Keep OS updated
- Use hardware wallet
- Regular backups

## ADOPTION
- Essential for power users
- Hardware wallet required
- Full feature access

## SAFE SCORING RELEVANCE
### Pillar
**F (Functionality)** - Platform support

### Evaluation Criteria
- Windows: YES/NO
- macOS: YES/NO
- Linux: YES/NO
- Full node option: YES/NO

## SOURCES
- **Various**: Software websites
- **Last Accessed**: 2026-01-20""",
        "official_link": "https://bitcoin.org/en/choose-your-wallet"
    },

    "Web3": {
        "match_titles": ["Web3", "dApp", "Decentralized App", "Browser Wallet"],
        "summary": """## IDENTIFICATION
- **Code**: Web3 Wallet
- **Title**: Web3 Browser Wallet
- **Version**: Various
- **Status**: Active
- **Author(s)**: Various
- **Organization**: Various
- **License**: Various

## EXECUTIVE SUMMARY
Web3 wallets are browser extensions or integrated wallets that enable interaction with decentralized applications (dApps). They inject a provider into web pages, allowing websites to request transactions and signatures.

## BACKGROUND AND MOTIVATION
DeFi, NFTs, and dApps require wallet connectivity. Web3 wallets bridge users and applications, handling transaction signing, network switching, and account management seamlessly within the browser.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Browser integration
- dApp connectivity
- Transaction signing
- Network management

### Implementation
**Types:**
- Browser extension (MetaMask)
- Integrated browser (Brave)
- Hardware wallet bridge

**Standards:**
- EIP-1193: Provider API
- EIP-6963: Multi-wallet
- WalletConnect

### Parameters and Values
- Networks: multiple
- Permissions: per-site
- Signing: user approval

## SECURITY
### Security Guarantees
- Per-site permissions
- Transaction preview
- User approval required

### Risks and Limitations
- Phishing sites
- Malicious contracts
- Approval exploits
- Extension vulnerabilities

### Best Practices
- Verify site URLs
- Review transactions carefully
- Revoke unused approvals
- Use hardware wallet

## ADOPTION
- Essential for Ethereum
- Growing multi-chain
- dApp requirement

## SAFE SCORING RELEVANCE
### Pillar
**E (Ecosystem)** - dApp integration

### Evaluation Criteria
- Browser extension: YES/NO
- WalletConnect: YES/NO
- Hardware support: YES/NO
- Multi-chain: YES/NO

## SOURCES
- **EIP-1193**: https://eips.ethereum.org/EIPS/eip-1193
- **Last Accessed**: 2026-01-20""",
        "official_link": "https://eips.ethereum.org/EIPS/eip-1193"
    },

    "Compliance": {
        "match_titles": ["Compliance", "KYC", "AML", "Regulatory", "OFAC"],
        "summary": """## IDENTIFICATION
- **Code**: Regulatory Compliance
- **Title**: Cryptocurrency Compliance
- **Version**: Various jurisdictions
- **Status**: Active/Evolving
- **Author(s)**: Various regulators
- **Organization**: FATF, FinCEN, etc.
- **License**: N/A

## EXECUTIVE SUMMARY
Cryptocurrency compliance involves adhering to regulations like KYC (Know Your Customer), AML (Anti-Money Laundering), and sanctions screening. Self-custody wallets generally don't require KYC, but exchanges and some services do.

## BACKGROUND AND MOTIVATION
Regulators require financial services to prevent money laundering and terrorism financing. Cryptocurrency businesses must implement compliance programs. Self-custody remains largely unregulated but faces increasing scrutiny.

## TECHNICAL SPECIFICATIONS
### Core Principles
- KYC: identity verification
- AML: transaction monitoring
- Sanctions: OFAC screening
- Travel Rule: information sharing

### Implementation
**Requirements:**
- Identity verification
- Transaction monitoring
- Suspicious activity reporting
- Record keeping

**Wallet Implications:**
- Exchange integration
- Address screening
- Compliance features

### Parameters and Values
- Thresholds: vary by jurisdiction
- Reporting: varies
- Retention: years

## SECURITY
### Security Guarantees
- Legal compliance
- Reduced legal risk
- Access to services

### Risks and Limitations
- Privacy reduction
- Data breaches
- Regulatory changes
- Jurisdiction complexity

### Best Practices
- Understand local laws
- Use compliant services
- Keep records
- Seek legal advice

## ADOPTION
- Required for businesses
- Growing regulation
- Self-custody protected (mostly)

## SAFE SCORING RELEVANCE
### Pillar
**A (Adversity)** - Regulatory

### Evaluation Criteria
- KYC required: YES/NO
- Jurisdiction: LIST
- Sanctions screening: YES/NO

## SOURCES
- **FATF**: https://www.fatf-gafi.org/
- **Last Accessed**: 2026-01-20""",
        "official_link": "https://www.fatf-gafi.org/"
    },

    "Insurance": {
        "match_titles": ["Insurance", "Insured", "Coverage", "Protection"],
        "summary": """## IDENTIFICATION
- **Code**: Crypto Insurance
- **Title**: Cryptocurrency Insurance
- **Version**: Various
- **Status**: Emerging
- **Author(s)**: Various insurers
- **Organization**: Various
- **License**: N/A

## EXECUTIVE SUMMARY
Cryptocurrency insurance provides coverage against losses from hacks, theft, or operational failures. Available for custodians and increasingly for DeFi through protocols like Nexus Mutual. Self-custody typically isn't insurable.

## BACKGROUND AND MOTIVATION
Traditional finance has deposit insurance (FDIC). Crypto lacks this, creating demand for private insurance. Custodians insure holdings; DeFi protocols offer smart contract coverage.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Loss coverage
- Risk assessment
- Premium payment
- Claims process

### Implementation
**Types:**
- Custodial insurance (exchanges)
- Smart contract coverage (DeFi)
- Crime insurance (businesses)
- Personal coverage (limited)

**Providers:**
- Traditional insurers (Lloyd's)
- DeFi protocols (Nexus Mutual)
- Specialized crypto insurers

### Parameters and Values
- Coverage: varies widely
- Premiums: risk-based
- Deductibles: varies

## SECURITY
### Security Guarantees
- Loss recovery (covered events)
- Risk mitigation
- Peace of mind

### Risks and Limitations
- Limited coverage
- Exclusions
- Claims disputes
- Self-custody not covered

### Best Practices
- Understand coverage limits
- Read exclusions carefully
- Consider DeFi coverage
- Don't rely solely on insurance

## ADOPTION
- Growing for custodians
- DeFi coverage emerging
- Limited for individuals

## SAFE SCORING RELEVANCE
### Pillar
**A (Adversity)** - Risk mitigation

### Evaluation Criteria
- Insurance: YES/NO
- Coverage amount: USD
- Provider: NAME

## SOURCES
- **Nexus Mutual**: https://nexusmutual.io/
- **Last Accessed**: 2026-01-20""",
        "official_link": "https://nexusmutual.io/"
    },

    "Support": {
        "match_titles": ["Support", "Customer Service", "Help", "Documentation"],
        "summary": """## IDENTIFICATION
- **Code**: Customer Support
- **Title**: Wallet Support Services
- **Version**: Various
- **Status**: Active
- **Author(s)**: Various
- **Organization**: Various
- **License**: N/A

## EXECUTIVE SUMMARY
Customer support for cryptocurrency wallets includes documentation, FAQs, email support, live chat, and community forums. Quality support is essential for user safety and adoption. Beware of scam support impersonators.

## BACKGROUND AND MOTIVATION
Cryptocurrency is complex. Users need help with setup, recovery, and troubleshooting. Good support prevents user errors that could lead to fund loss. However, scammers impersonate support to steal funds.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Documentation
- Responsive help
- Security awareness
- Scam prevention

### Implementation
**Support Channels:**
- Documentation/FAQs
- Email support
- Live chat
- Community forums
- Social media

**Quality Indicators:**
- Response time
- Resolution rate
- Documentation quality
- Community activity

### Parameters and Values
- Response time: hours to days
- Availability: varies
- Languages: varies

## SECURITY
### Security Guarantees
- Official channels only
- Never asks for seed
- Verified accounts

### Risks and Limitations
- Scam impersonators
- Slow response
- Limited hours
- Language barriers

### Best Practices
- Use official channels only
- Never share seed phrase
- Verify support identity
- Check documentation first

## ADOPTION
- All reputable wallets
- Quality varies widely
- Essential for adoption

## SAFE SCORING RELEVANCE
### Pillar
**F (Functionality)** - User experience

### Evaluation Criteria
- Documentation: YES/NO
- Email support: YES/NO
- Live chat: YES/NO
- Response time: HOURS/DAYS

## SOURCES
- **Industry Standard**: Various
- **Last Accessed**: 2026-01-20""",
        "official_link": "https://support.ledger.com/"
    },

    "Localization": {
        "match_titles": ["Language", "Localization", "Translation", "i18n"],
        "summary": """## IDENTIFICATION
- **Code**: Localization
- **Title**: Wallet Localization/i18n
- **Version**: Various
- **Status**: Active
- **Author(s)**: Various
- **Organization**: Various
- **License**: Various

## EXECUTIVE SUMMARY
Localization (i18n) is the adaptation of wallet software for different languages and regions. Good localization includes translated UI, documentation, and support. Essential for global adoption.

## BACKGROUND AND MOTIVATION
Cryptocurrency is global. Users prefer interfaces in their native language. Localization reduces errors and improves accessibility. Poor translations can cause confusion and mistakes.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Language translation
- Regional adaptation
- Cultural sensitivity
- Consistent terminology

### Implementation
**Components:**
- UI translation
- Documentation
- Support materials
- Error messages

**Common Languages:**
- English (base)
- Chinese, Japanese, Korean
- Spanish, Portuguese
- German, French
- Russian, Arabic

### Parameters and Values
- Languages: count varies
- Coverage: partial to full
- Quality: varies

## SECURITY
### Security Guarantees
- Reduced user errors
- Better understanding
- Clearer warnings

### Risks and Limitations
- Translation errors
- Inconsistent terms
- Delayed updates
- Incomplete coverage

### Best Practices
- Verify critical terms
- Report translation errors
- Use English for technical
- Check multiple sources

## ADOPTION
- Major wallets: 10+ languages
- Growing coverage
- Community contributions

## SAFE SCORING RELEVANCE
### Pillar
**F (Functionality)** - Accessibility

### Evaluation Criteria
- Languages: COUNT
- Documentation: LANGUAGES
- Support: LANGUAGES

## SOURCES
- **Industry Standard**: Various
- **Last Accessed**: 2026-01-20""",
        "official_link": "https://en.wikipedia.org/wiki/Internationalization_and_localization"
    },

    "Accessibility": {
        "match_titles": ["Accessibility", "A11y", "Screen Reader", "WCAG"],
        "summary": """## IDENTIFICATION
- **Code**: WCAG 2.1
- **Title**: Web Content Accessibility Guidelines
- **Version**: 2.1 (2018)
- **Status**: Active
- **Author(s)**: W3C
- **Organization**: World Wide Web Consortium
- **License**: W3C Document License

## EXECUTIVE SUMMARY
Accessibility (a11y) ensures wallet software is usable by people with disabilities. This includes screen reader support, keyboard navigation, color contrast, and other accommodations. WCAG provides standards.

## BACKGROUND AND MOTIVATION
Cryptocurrency should be accessible to everyone. Users with visual, motor, or cognitive disabilities need accommodations. Accessibility also benefits all users through better design.

## TECHNICAL SPECIFICATIONS
### Core Principles
- Perceivable
- Operable
- Understandable
- Robust

### Implementation
**Features:**
- Screen reader support
- Keyboard navigation
- High contrast mode
- Font size options
- Alternative text

**Standards:**
- WCAG 2.1 Level A/AA/AAA
- Section 508
- EN 301 549

### Parameters and Values
- Conformance: A/AA/AAA
- Screen readers: NVDA, VoiceOver
- Contrast ratio: 4.5:1 minimum

## SECURITY
### Security Guarantees
- Inclusive access
- Error prevention
- Clear communication

### Risks and Limitations
- Implementation gaps
- Testing challenges
- Assistive tech compatibility

### Best Practices
- Test with screen readers
- Provide keyboard navigation
- Use sufficient contrast
- Include alt text

## ADOPTION
- Growing awareness
- Legal requirements (some)
- Improving coverage

## SAFE SCORING RELEVANCE
### Pillar
**F (Functionality)** - Accessibility

### Evaluation Criteria
- Screen reader: YES/NO
- Keyboard nav: YES/NO
- WCAG level: A/AA/AAA

## SOURCES
- **WCAG 2.1**: https://www.w3.org/WAI/WCAG21/quickref/
- **Last Accessed**: 2026-01-20""",
        "official_link": "https://www.w3.org/WAI/WCAG21/quickref/"
    },

    "IP67": {
        "match_titles": ["IP67", "IP68", "Ingress Protection"],
        "summary": """## IDENTIFICATION
- **Code**: IEC 60529 / IP Code
- **Title**: Ingress Protection Rating
- **Version**: Edition 2.2 (2013)
- **Status**: Active
- **Author(s)**: IEC
- **Organization**: International Electrotechnical Commission
- **License**: Proprietary

## EXECUTIVE SUMMARY
The IP (Ingress Protection) code classifies the degree of protection provided by enclosures against intrusion of solid objects and water. IP67 means dust-tight and protected against water immersion up to 1 meter for 30 minutes - important for hardware wallet durability.

## BACKGROUND AND MOTIVATION
Electronic devices need protection from environmental hazards. The IP rating provides a standardized way to communicate the level of protection, helping users understand device durability and appropriate use conditions.

## TECHNICAL SPECIFICATIONS
### Core Principles
- First digit: Solid particle protection (0-6)
- Second digit: Liquid ingress protection (0-9)
- Higher numbers = better protection

### Implementation
**First Digit (Solids):**
- 0: No protection
- 1: >50mm objects
- 2: >12.5mm objects
- 3: >2.5mm objects
- 4: >1mm objects
- 5: Dust protected
- 6: Dust-tight

**Second Digit (Liquids):**
- 0: No protection
- 1: Vertical dripping
- 2: Dripping (15° tilt)
- 3: Spraying water
- 4: Splashing water
- 5: Water jets
- 6: Powerful water jets
- 7: Immersion up to 1m
- 8: Immersion beyond 1m
- 9: High pressure/steam

### Parameters and Values
- IP67: Dust-tight + 1m immersion 30min
- IP68: Dust-tight + deeper immersion (manufacturer specified)

## SECURITY
### Security Guarantees
- Physical protection of electronics
- Environmental durability
- Standardized testing

### Risks and Limitations
- Does not cover drop/impact
- Seals can degrade over time
- Fresh water testing (salt water may differ)

## ADOPTION
- Ledger Stax (IP67 claimed)
- Many smartphones (IP67/IP68)
- Industrial electronics

## SAFE SCORING RELEVANCE
### Pillar
**F (Fortress)** - Physical durability

### Evaluation Criteria
- IP rating: IP65/IP67/IP68/NONE
- Dust protection: YES/NO
- Water resistance: SPLASH/IMMERSION/NONE

## SOURCES
- **Official Document**: https://www.iec.ch/ip-ratings
- **Last Accessed**: 2026-01-19""",
        "official_link": "https://webstore.iec.ch/publication/2452"
    }
}


def update_norm(code_pattern: str, summary: str, official_link: str):
    """Update a norm's summary by matching title pattern."""
    # First, find norms matching the pattern
    url = f"{SUPABASE_URL}/rest/v1/norms"
    params = {"select": "id,code,title", "or": f"(title.ilike.%{code_pattern}%,code.ilike.%{code_pattern}%)"}
    
    response = requests.get(url, headers=HEADERS, params=params)
    if response.status_code != 200:
        print(f"Error finding norms for {code_pattern}: {response.text}")
        return 0
    
    norms = response.json()
    if not norms:
        print(f"No norms found matching: {code_pattern}")
        return 0
    
    # Update each matching norm
    updated = 0
    for norm in norms:
        update_url = f"{SUPABASE_URL}/rest/v1/norms?id=eq.{norm['id']}"
        data = {"summary": summary, "official_link": official_link}
        
        response = requests.patch(update_url, headers=HEADERS, json=data)
        if response.status_code in [200, 204]:
            print(f"  ✓ Updated: {norm['code']} - {norm['title']}")
            updated += 1
        else:
            print(f"  ✗ Failed: {norm['code']} - {response.text}")
    
    return updated


def main():
    print("=" * 60)
    print("Updating norm summaries with real content from official sources")
    print("=" * 60)
    
    total_updated = 0
    
    for name, data in REAL_SUMMARIES.items():
        print(f"\n[{name}]")
        for pattern in data["match_titles"]:
            updated = update_norm(pattern, data["summary"], data["official_link"])
            total_updated += updated
            if updated > 0:
                break  # Found and updated, no need to try other patterns
    
    print("\n" + "=" * 60)
    print(f"Total norms updated: {total_updated}")
    print("=" * 60)


if __name__ == "__main__":
    main()
