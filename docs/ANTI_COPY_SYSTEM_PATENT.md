# Anti-Copy Protection System - Patent Documentation
## Steganographic Fingerprinting and Honeypot Detection for API Data Protection

**Document Classification:** Confidential - Patent Preparation
**Version:** 1.0
**Date:** January 2026
**Inventor(s):** SafeScoring.io Team

---

## 1. TITLE OF THE INVENTION

**System and Method for Detecting Unauthorized Copying of API Data Using Steganographic Fingerprinting and Honeypot Injection**

---

## 2. FIELD OF THE INVENTION

The present invention relates to computer-implemented systems and methods for protecting proprietary data served through APIs (Application Programming Interfaces) by embedding invisible fingerprints and injecting detectable fake data, enabling identification and proof of unauthorized copying.

---

## 3. BACKGROUND OF THE INVENTION

### 3.1 Problem Statement

Data providers face significant challenges in protecting proprietary data:

1. **Undetectable copying** - Scrapers can extract API data without leaving traces
2. **Proof difficulties** - Even when copying is suspected, proving origin is challenging
3. **Watermark removal** - Visible watermarks can be easily stripped
4. **Legal enforcement** - Without irrefutable proof, legal action is ineffective

### 3.2 Prior Art Limitations

- **Visible watermarks**: Easily removed, degrade user experience
- **Rate limiting**: Slows scrapers but doesn't prevent copying
- **API keys**: Can be shared or stolen
- **Legal notices**: Unenforceable without technical proof

---

## 4. SUMMARY OF THE INVENTION

The Anti-Copy Protection System comprises two complementary mechanisms:

1. **Steganographic Fingerprinting** - Embeds invisible, client-specific variations in API responses
2. **Honeypot Injection** - Injects fake but realistic data that can be traced if republished

Together, these mechanisms provide:
- Traceability of data origin
- Identification of which client copied data
- Irrefutable proof for legal proceedings
- Zero impact on legitimate user experience

---

## 5. DETAILED DESCRIPTION - STEGANOGRAPHIC FINGERPRINTING

### 5.1 System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│              STEGANOGRAPHIC FINGERPRINTING SYSTEM               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐                                               │
│  │   API        │                                               │
│  │   Request    │                                               │
│  └──────┬───────┘                                               │
│         │                                                       │
│         ▼                                                       │
│  ┌──────────────────────────────────────────────────────┐      │
│  │         CLIENT IDENTIFICATION                         │      │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │      │
│  │  │ IP Address  │  │ User Agent  │  │ Session ID  │  │      │
│  │  │    Hash     │  │    Hash     │  │             │  │      │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  │      │
│  │                   │                                   │      │
│  │                   ▼                                   │      │
│  │         ┌─────────────────┐                          │      │
│  │         │   Client ID     │                          │      │
│  │         │   (SHA-256)     │                          │      │
│  │         └─────────────────┘                          │      │
│  └──────────────────────────────────────────────────────┘      │
│                           │                                     │
│                           ▼                                     │
│  ┌──────────────────────────────────────────────────────┐      │
│  │         FINGERPRINT GENERATION                        │      │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │      │
│  │  │ Score Seed  │  │ Text Seed   │  │ Order Seed  │  │      │
│  │  │ (8 chars)   │  │ (8 chars)   │  │ (8 chars)   │  │      │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  │      │
│  │         │               │               │            │      │
│  │         ▼               ▼               ▼            │      │
│  │  HMAC-SHA256(SECRET, clientId + timestamp)          │      │
│  └──────────────────────────────────────────────────────┘      │
│                           │                                     │
│                           ▼                                     │
│  ┌──────────────────────────────────────────────────────┐      │
│  │         FINGERPRINT APPLICATION                       │      │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │      │
│  │  │ Score       │  │ Text        │  │ Array       │  │      │
│  │  │ Variation   │  │ Homoglyphs  │  │ Ordering    │  │      │
│  │  │ (±0.05)     │  │ (Unicode)   │  │ (Swaps)     │  │      │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  │      │
│  └──────────────────────────────────────────────────────┘      │
│                           │                                     │
│                           ▼                                     │
│  ┌──────────────────────────────────────────────────────┐      │
│  │         FINGERPRINTED API RESPONSE                    │      │
│  │  - Original data with invisible variations            │      │
│  │  - Same visual appearance to users                    │      │
│  │  - Unique per client, traceable                       │      │
│  └──────────────────────────────────────────────────────┘      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Fingerprint Generation Algorithm

#### 5.2.1 Client Identification

```javascript
function getClientId(request) {
  const ip = request.headers.get("x-forwarded-for") ||
             request.headers.get("x-real-ip") ||
             "unknown";
  const userAgent = request.headers.get("user-agent") || "";

  return crypto
    .createHash("sha256")
    .update(`${ip}:${userAgent}`)
    .digest("hex");
}
```

#### 5.2.2 Fingerprint Seed Generation

```javascript
function generateClientFingerprint(clientId, timestamp) {
  // HMAC ensures unpredictability without secret knowledge
  const hash = crypto
    .createHmac("sha256", FINGERPRINT_SECRET)
    .update(`${clientId}:${timestamp}`)
    .digest("hex");

  return {
    scoreSeed: parseInt(hash.substring(0, 8), 16),   // Score variations
    textSeed: parseInt(hash.substring(8, 16), 16),   // Text modifications
    orderSeed: parseInt(hash.substring(16, 24), 16), // Array ordering
    fullHash: hash,
  };
}
```

**Key Properties:**
- **Deterministic**: Same client always gets same fingerprint for same day
- **Daily rotation**: Timestamp uses day granularity (prevents pattern analysis)
- **Secret-dependent**: Unpredictable without FINGERPRINT_SECRET

### 5.3 Score Fingerprinting

#### 5.3.1 Algorithm

```javascript
function fingerprintScore(score, clientFingerprint, productId) {
  // Generate variation specific to this score + client + product
  const variationHash = crypto
    .createHmac("sha256", FINGERPRINT_SECRET)
    .update(`${clientFingerprint.scoreSeed}:${productId}:${score}`)
    .digest("hex");

  // Convert to small variation: -0.05 to +0.05
  const variationFactor = (parseInt(variationHash.substring(0, 4), 16) / 65535) - 0.5;
  const variation = variationFactor * 0.1;

  // Apply variation (2 decimal places)
  return Math.round((score + variation) * 100) / 100;
}
```

#### 5.3.2 Example

| Client | Original Score | Fingerprinted Score |
|--------|---------------|---------------------|
| Client A | 87.50 | 87.52 |
| Client B | 87.50 | 87.48 |
| Client C | 87.50 | 87.53 |

**Properties:**
- Maximum variation: ±0.05 (imperceptible to users)
- Deterministic per client-product pair
- Reversible with secret knowledge

### 5.4 Text Fingerprinting (Homoglyphs)

#### 5.4.1 Homoglyph Map

```javascript
const HOMOGLYPH_MAP = {
  // Latin -> Cyrillic/Greek lookalikes (visually identical)
  'a': ['a', 'а'],  // Latin 'a', Cyrillic 'а' (U+0430)
  'e': ['e', 'е'],  // Latin 'e', Cyrillic 'е' (U+0435)
  'o': ['o', 'о'],  // Latin 'o', Cyrillic 'о' (U+043E)
  'p': ['p', 'р'],  // Latin 'p', Cyrillic 'р' (U+0440)
  'c': ['c', 'с'],  // Latin 'c', Cyrillic 'с' (U+0441)
  'x': ['x', 'х'],  // Latin 'x', Cyrillic 'х' (U+0445)
  'y': ['y', 'у'],  // Latin 'y', Cyrillic 'у' (U+0443)
  ' ': [' ', '\u200B'],  // Space, zero-width space
};
```

#### 5.4.2 Algorithm

```javascript
function fingerprintText(text, clientFingerprint, fieldName) {
  // Generate pattern for this text + client
  const patternHash = crypto
    .createHmac("sha256", FINGERPRINT_SECRET)
    .update(`${clientFingerprint.textSeed}:${fieldName}:${text.substring(0, 20)}`)
    .digest("hex");

  // Select 1-3 positions to modify
  const positions = [];
  for (let i = 0; i < Math.min(3, text.length); i++) {
    const pos = parseInt(patternHash.substring(i * 2, i * 2 + 2), 16) % text.length;
    positions.push(pos);
  }

  // Apply homoglyph substitutions
  const chars = [...text];
  for (const pos of positions) {
    const char = chars[pos].toLowerCase();
    if (HOMOGLYPH_MAP[char]) {
      const variants = HOMOGLYPH_MAP[char];
      const variantIndex = parseInt(patternHash.substring(6, 8), 16) % variants.length;
      chars[pos] = chars[pos] === chars[pos].toUpperCase()
        ? variants[variantIndex].toUpperCase()
        : variants[variantIndex];
    }
  }

  return chars.join("");
}
```

#### 5.4.3 Example

| Text | Visual | Unicode (hex) |
|------|--------|---------------|
| Original: "Ledger" | Ledger | 4C 65 64 67 65 72 |
| Client A: "Lеdger" | Ledger | 4C **0435** 64 67 65 72 |
| Client B: "Ledgеr" | Ledger | 4C 65 64 67 **0435** 72 |

**Properties:**
- Visually identical to human readers
- Detectable via Unicode analysis
- Case-preserving substitutions

### 5.5 Array Order Fingerprinting

#### 5.5.1 Algorithm

```javascript
function fingerprintArrayOrder(items, clientFingerprint, listName) {
  if (items.length < 3) return items;

  const swapHash = crypto
    .createHmac("sha256", FINGERPRINT_SECRET)
    .update(`${clientFingerprint.orderSeed}:${listName}:${items.length}`)
    .digest("hex");

  const result = [...items];

  // Perform 1-2 adjacent swaps
  const numSwaps = (parseInt(swapHash.substring(0, 2), 16) % 2) + 1;

  for (let i = 0; i < numSwaps; i++) {
    const pos = parseInt(swapHash.substring(i * 4 + 2, i * 4 + 6), 16) % (result.length - 1);
    // Only swap items with same score (preserves visual sorting)
    if (result[pos].score === result[pos + 1]?.score) {
      [result[pos], result[pos + 1]] = [result[pos + 1], result[pos]];
    }
  }

  return result;
}
```

**Properties:**
- Only swaps items with identical scores
- Maintains apparent sort order
- Creates unique ordering per client

---

## 6. DETAILED DESCRIPTION - HONEYPOT INJECTION

### 6.1 System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    HONEYPOT INJECTION SYSTEM                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────┐      │
│  │              HONEYPOT GENERATION                      │      │
│  │  ┌───────────────────────────────────────────────┐   │      │
│  │  │  Templates × Seed × Client = Unique Honeypot  │   │      │
│  │  └───────────────────────────────────────────────┘   │      │
│  │                                                       │      │
│  │  Templates:                                           │      │
│  │  ├── Hardware Wallet (SecureVault, CryptoGuard...)   │      │
│  │  ├── Software Wallet (CryptexWallet, Vaulta...)      │      │
│  │  └── DeFi Protocol (Nexus Finance, Helix Swap...)    │      │
│  │                                                       │      │
│  │  Generated Data:                                      │      │
│  │  ├── Realistic name and slug                         │      │
│  │  ├── Plausible company name                          │      │
│  │  ├── Realistic scores (60-85 range)                  │      │
│  │  ├── Believable pillar breakdown                     │      │
│  │  ├── Fake but valid-looking URL                      │      │
│  │  └── Realistic dates (created/updated)               │      │
│  └──────────────────────────────────────────────────────┘      │
│                           │                                     │
│                           ▼                                     │
│  ┌──────────────────────────────────────────────────────┐      │
│  │              INJECTION DECISION                       │      │
│  │                                                       │      │
│  │  if (shouldInject(clientFingerprint)) {              │      │
│  │    // 30% of clients receive honeypots               │      │
│  │    injectHoneypots(products, maxHoneypots=2);        │      │
│  │  }                                                    │      │
│  └──────────────────────────────────────────────────────┘      │
│                           │                                     │
│                           ▼                                     │
│  ┌──────────────────────────────────────────────────────┐      │
│  │              DETECTION & EVIDENCE                     │      │
│  │                                                       │      │
│  │  When suspected copy is found:                        │      │
│  │  1. Check if name/slug matches any honeypot seed     │      │
│  │  2. If match → prove data was copied from SafeScoring│      │
│  │  3. Generate legal evidence document                  │      │
│  │  4. Identify which client scraped (via seed+fingerprint) │  │
│  └──────────────────────────────────────────────────────┘      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Honeypot Generation Algorithm

#### 6.2.1 Template Structure

```javascript
const HONEYPOT_TEMPLATES = [
  {
    type: "hardware_wallet",
    namePatterns: [
      "SecureVault {version}",
      "CryptoGuard {adjective}",
      "BlockShield {edition}",
      "SafeKey {model}",
    ],
    companyPatterns: ["{name} Technologies", "{name} Labs"],
    versions: ["Pro", "Elite", "X1", "Max", "Nano"],
    adjectives: ["Ultra", "Quantum", "Fortress", "Titan"],
    companyNames: ["Cipher", "Nexus", "Vault", "Haven"],
  },
  // ... software_wallet, defi_protocol templates
];
```

#### 6.2.2 Generation Algorithm

```javascript
function generateHoneypotProduct(seed, type = "hardware_wallet") {
  const hash = crypto
    .createHmac("sha256", HONEYPOT_SECRET)
    .update(`product:${seed}:${type}`)
    .digest("hex");

  // Deterministic selection from templates
  const getFromArray = (arr, offset) => {
    const index = parseInt(hash.substring(offset, offset + 2), 16) % arr.length;
    return arr[index];
  };

  // Generate realistic product data
  return {
    id: generateHoneypotId(seed),
    name: generateName(template, hash),
    slug: generateSlug(name),
    company: generateCompany(template, hash),
    type,
    is_honeypot: true,        // INTERNAL ONLY - stripped before sending
    honeypot_seed: seed,      // INTERNAL ONLY - stripped before sending

    // Realistic scores
    safe_score: 60 + (parseInt(hash.substring(18, 20), 16) % 26),
    pillar_scores: generatePillarScores(hash),

    // Realistic metadata
    website: `https://${slug}.io`,
    created_at: generatePastDate(hash),
    updated_at: generateRecentDate(hash),
  };
}
```

### 6.3 Injection Logic

```javascript
function injectHoneypots(products, clientFingerprint, options = {}) {
  const { maxHoneypots = 2, probability = 0.3 } = options;

  // Deterministic injection decision based on fingerprint
  const shouldInject = parseInt(clientFingerprint.substring(0, 4), 16) / 65535 < probability;

  if (!shouldInject) return products;

  // Generate honeypots with client-specific seeds
  const honeypots = [];
  const seeds = getActiveHoneypotSeeds(); // Monthly rotation

  for (let i = 0; i < maxHoneypots; i++) {
    const clientSeed = `${seeds[i]}:${clientFingerprint.substring(0, 8)}`;
    const honeypot = generateHoneypotProduct(clientSeed);

    // Remove internal fields
    const { is_honeypot, honeypot_seed, ...publicHoneypot } = honeypot;
    honeypots.push(publicHoneypot);
  }

  // Insert at deterministic positions
  return insertAtPositions(products, honeypots, clientFingerprint);
}
```

### 6.4 Detection Algorithm

```javascript
function detectHoneypotCopy(suspectedProduct) {
  const { name, slug, description, safe_score } = suspectedProduct;

  // Check against all possible honeypot variations
  const seeds = getActiveHoneypotSeeds();

  for (const baseSeed of seeds) {
    // Check with logged client fingerprints
    for (const clientFingerprint of getLoggedFingerprints()) {
      const clientSeed = `${baseSeed}:${clientFingerprint}`;
      const honeypot = generateHoneypotProduct(clientSeed);

      // Check for matches
      if (
        honeypot.name === name ||
        honeypot.slug === slug ||
        (honeypot.description === description &&
         Math.abs(honeypot.safe_score - safe_score) < 0.5)
      ) {
        return {
          isHoneypot: true,
          matchedSeed: clientSeed,
          matchedFingerprint: clientFingerprint,
          confidence: 1.0,
          evidence: { ourProduct: honeypot, theirProduct: suspectedProduct },
        };
      }
    }
  }

  return { isHoneypot: false };
}
```

### 6.5 Evidence Generation

```javascript
function generateHoneypotEvidence(detection) {
  return {
    title: "Evidence of Data Theft - Honeypot Detection",
    generated_at: new Date().toISOString(),

    summary: {
      finding: "Copied honeypot product detected",
      confidence: detection.confidence,
      legal_implication: "Proves unauthorized copying of SafeScoring data",
    },

    technical_evidence: {
      honeypot_seed: detection.matchedSeed,
      client_fingerprint: detection.matchedFingerprint,
      our_generated_product: detection.evidence.ourProduct,
      their_published_product: detection.evidence.theirProduct,
    },

    verification_steps: [
      "1. Run generateHoneypotProduct() with the seed above",
      "2. Compare output with competitor's product",
      "3. Exact match proves data was copied from SafeScoring",
      "4. Client fingerprint identifies which account scraped the data",
    ],
  };
}
```

---

## 7. CLAIMS

### Claim 1 - Steganographic Fingerprinting
A computer-implemented method for detecting unauthorized copying of API data, comprising:
- Generating a unique client identifier from request metadata
- Computing a deterministic fingerprint using HMAC with a secret key
- Applying invisible score variations (±0.05) based on the fingerprint
- Applying Unicode homoglyph substitutions in text fields
- Modifying array ordering while preserving apparent sort order
- Storing fingerprint patterns for later detection

### Claim 2 - Score Fingerprinting
The method of Claim 1, wherein score fingerprinting comprises:
- Computing HMAC-SHA256 of (secret, scoreSeed, productId, score)
- Converting hash to variation factor in range [-0.05, +0.05]
- Applying variation with 2 decimal precision
- Ensuring deterministic same output for same client-product pair

### Claim 3 - Homoglyph Fingerprinting
The method of Claim 1, wherein text fingerprinting comprises:
- Mapping Latin characters to visually identical Unicode alternatives
- Selecting 1-3 character positions based on client fingerprint
- Substituting characters with homoglyphs
- Preserving original case of substituted characters

### Claim 4 - Honeypot Injection
A computer-implemented method for proving unauthorized data copying, comprising:
- Generating fake but realistic product data using templates and seeds
- Combining base seed with client fingerprint for traceability
- Injecting honeypots into API responses with configurable probability
- Removing internal identification fields before transmission
- Detecting republished honeypots by regenerating and comparing
- Generating legal evidence documents upon detection

### Claim 5 - Detection System
A system for detecting unauthorized data copying, comprising:
- An API server applying fingerprinting to all responses
- A logging module storing client access patterns with fingerprint data
- A detection module comparing suspected copies against known patterns
- An alerting module notifying administrators of detected copying
- An evidence generation module producing legal documentation

---

## 8. ABSTRACT

A computer-implemented system and method for detecting unauthorized copying of API data using dual protection mechanisms. The steganographic fingerprinting system embeds invisible, client-specific variations in numerical scores (±0.05), text fields (Unicode homoglyphs), and array ordering. The honeypot injection system inserts realistic-looking fake data that can be traced to specific clients if republished. Combined, these mechanisms provide irrefutable proof of data origin, identification of the copying client, and automatically generated legal evidence, while maintaining zero impact on legitimate user experience.

---

## 9. DIAGRAMS

### Diagram 1: Fingerprint Application Flow

```
API Request
     │
     ▼
┌─────────────────┐
│ Extract Client  │
│ IP + User-Agent │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Hash to Client  │
│ ID (SHA-256)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ HMAC with Secret│
│ + Daily Timestamp│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Generate Seeds: │
│ - Score (8 hex) │
│ - Text (8 hex)  │
│ - Order (8 hex) │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│ Score │ │ Text  │
│ ±0.05 │ │Homoglyph│
└───────┘ └───────┘
    │         │
    └────┬────┘
         │
         ▼
┌─────────────────┐
│ Fingerprinted   │
│ API Response    │
└─────────────────┘
```

### Diagram 2: Honeypot Detection Flow

```
Suspected Copy Found
         │
         ▼
┌─────────────────────┐
│ Extract Product Info│
│ (name, slug, score) │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Get Active Seeds    │
│ (monthly rotation)  │
└──────────┬──────────┘
           │
           ▼
    ┌──────┴──────┐
    │ For each    │
    │ seed + fp   │
    └──────┬──────┘
           │
           ▼
┌─────────────────────┐
│ Regenerate Honeypot │
│ with seed           │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Compare to Suspect  │
│ (name/slug/desc)    │
└──────────┬──────────┘
           │
     ┌─────┴─────┐
     │           │
  Match?      No Match
     │           │
     ▼           ▼
┌─────────┐  ┌─────────┐
│ Generate│  │ Continue│
│ Evidence│  │ Checking│
└─────────┘  └─────────┘
```

---

## 10. SECURITY CONSIDERATIONS

### 10.1 Secret Management

- `FINGERPRINT_SECRET`: 32-byte cryptographically random value
- `HONEYPOT_SECRET`: 32-byte cryptographically random value
- Rotation schedule: Annually (requires database update)
- Storage: Environment variables, never in code

### 10.2 Attack Resistance

| Attack | Mitigation |
|--------|------------|
| Pattern analysis | Daily fingerprint rotation |
| Multiple accounts | Each account gets unique fingerprint |
| Score averaging | Variations too small to detect statistically |
| Honeypot filtering | Fake products indistinguishable from real |
| Secret extraction | HMAC prevents reverse engineering |

---

## 11. REVISION HISTORY

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Jan 2026 | SafeScoring | Initial patent documentation |

---

*This document is confidential and intended for patent preparation purposes only.*
