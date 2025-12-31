# DEX Norm Applicability Review

## Current State Analysis (Type ID: 39)

**DEX Type Definition:**
- Code: DEX
- Category: DeFi
- Description: Non-custodial trading platform using smart contracts. Users maintain full control of their funds with no KYC requirements.

**Current Applicability Stats:**
- Total norms: 911
- Applicable: 495 (54%)
- N/A: 412 (46%)

### By Pillar:

| Pillar | Name | Applicable | N/A | Total |
|--------|------|-----------|-----|-------|
| S | Security | 143 (52%) | 127 (47%) | 270 |
| A | Adversity | 86 (45%) | 103 (54%) | 189 |
| F | Fidelity | 56 (29%) | 133 (70%) | 189 |
| E | Efficiency | 210 (81%) | 49 (18%) | 259 |

---

## Key Norms to Review

### SECURITY (S) - Norms to Consider Making APPLICABLE

#### Cryptographic Standards
Currently N/A but should be YES (inherited from EVM):

- **S01 AES-256**: ❌ N/A → ✅ APPLICABLE
  - Used in: Node encryption, TLS connections, encrypted RPC

- **S06 SHA-3/Keccak**: ❌ N/A → ✅ APPLICABLE
  - **CRITICAL**: Ethereum uses Keccak-256 for hashing (addresses, merkle trees, signatures)
  - This is a CORE Ethereum standard that DEX inherently uses

- **S10 Argon2**: ❌ N/A → ✅ APPLICABLE
  - Used in: Password hashing for admin panels, API keys
  - Modern DEXs with dashboards use this

#### Physical Security Norms
Should remain N/A:
- ✅ S111-S120 (PCI DSS, TPM, Secure Enclave, etc.) - correctly N/A (no hardware)

---

### ADVERSITY (A) - Norms to Review

#### Backup & Recovery
Currently N/A, context-dependent for DEX:

- **A100 Backup verification**: ❌ N/A → 🟡 REVIEW
  - Some DEXs offer account abstraction or smart wallet features

- **A101 Recovery drill mode**: ❌ N/A → ❌ N/A (correct)
  - DEXs don't manage user seeds

#### Privacy & Anti-Coercion
- **A01 Duress PIN**: ❌ N/A (correct - DEXs don't have PINs)
- **A07 Fake transaction history**: ❌ N/A → 🟡 REVIEW
  - Could be relevant for privacy-focused DEX interfaces

#### Compliance
- **A110 Regulatory compliance alerts**: ✅ APPLICABLE (correct)
- **A112-A119 GDPR/CCPA/LGPD**: ✅ APPLICABLE (correct - DEXs collect some data)

---

### FIDELITY (F) - Norms to Make APPLICABLE

#### Physical Resistance
Should remain N/A:
- ✅ F01-F10 (IP ratings, temperature, humidity) - correctly N/A (no hardware)
- ✅ F100-F104 (maritime transport, shock, materials) - correctly N/A

#### Testing & Quality Assurance
Currently applicable (correct):
- ✅ F134-F140 (Unit testing, integration testing, fuzz testing, code coverage)

#### Audits & Security
**CRITICAL MISSING NORMS** - Check if these exist:
- Smart contract audits (should be APPLICABLE)
- Formal verification (should be APPLICABLE)
- Bug bounty programs (should be APPLICABLE)

---

### EFFICIENCY (E) - Already Well Configured

81% applicable (good coverage)

#### Chain Support
Currently N/A but should review:

- **E01 Bitcoin BTC**: ❌ N/A → 🟡 REVIEW
  - Some DEXs support wrapped BTC (WBTC, renBTC)
  - DEXs that bridge to Bitcoin should have this applicable

- **E11 Cardano**: ❌ N/A → 🟡 REVIEW
  - DEXs that support Cardano DEXs (SundaeSwap, Minswap integration)

#### Performance
- **E153 TPS >100,000**: ❌ N/A → ✅ APPLICABLE
  - High-performance DEXs (dYdX, Serum) should be evaluated on throughput

#### Lightning Network
- **E164-E166 BOLT 11/12, LNURL**: ❌ N/A → ❌ N/A (correct - DEXs don't use LN directly)

---

## Recommendations

### IMMEDIATE UPDATES (High Priority)

1. **S06 SHA-3/Keccak** → APPLICABLE ⚠️ CRITICAL
   - This is fundamental to all Ethereum DEXs

2. **S01 AES-256** → APPLICABLE
   - Standard web/API encryption

3. **S10 Argon2** → APPLICABLE
   - Modern password hashing standard

4. **E153 TPS Performance** → APPLICABLE
   - DEXs should be evaluated on transaction throughput

### CONTEXT-DEPENDENT (Medium Priority)

5. **E01 Bitcoin/E11 Cardano** → Review based on cross-chain support

6. **A100 Backup verification** → Review if DEX offers smart wallet features

### RUN AI UPDATE

To automatically review and update all norms:

```bash
python update_dex_applicability.py
```

This will:
- Load DEX type definition
- Use AI (DeepSeek/Claude/Gemini) to review each norm
- Update norm_applicability table with corrections
- Process in batches of 25 norms for accuracy

---

## EVM/DeFi Implicit Standards

As noted in the smart_evaluator.py system prompt, DEX products **IMPLICITLY** support:

### Crypto Standards (inherited from Ethereum):
- secp256k1, **Keccak-256**, ECDSA → Core Ethereum crypto
- Curve25519, XChaCha20 → Used by Ethereum nodes
- scrypt, bcrypt, **Argon2id**, HKDF → Key derivation in wallets

### EIP Standards (all modern DEXs):
- EIP-712 (Typed Data Signing)
- EIP-1559 (Gas Fee)
- EIP-2612 (Permit)
- EIP-4337 (Account Abstraction)
- EIP-1271 (Contract Signatures)

### Web Security:
- TLS 1.3, HTTPS, HSTS
- Rate Limiting, JWT
- OWASP Top 10

### DeFi Protections:
- Reentrancy Protection
- Access Control, Pausable
- Slippage Protection
- MEV Protection

### Wallet Integrations:
- MetaMask, WalletConnect
- Ledger/Trezor via WalletConnect
- ENS Resolution

---

## Summary

**Current Issues:**
- Some fundamental EVM/Ethereum standards marked as N/A (Keccak-256!)
- Physical security norms correctly marked N/A
- Good coverage on efficiency (81%)
- Low coverage on fidelity (29%) - may need more software quality norms

**Action Items:**
1. Run `python analyze_dex_norms.py` to see current state
2. Run `python update_dex_applicability.py` to update with AI
3. Manually review critical crypto standards (S01, S06, S10)
4. Verify EIP standards are all marked applicable
