# SafeScoring — Prior Art Register

**Purpose:** This document formally establishes the dates of first publication for SafeScoring's key innovations. These publications constitute **defensive prior art** under patent law, preventing third parties from obtaining patents on these methods.

**Last Updated:** March 15, 2026

---

## How to Verify Dates

All dates listed below can be independently verified through:

1. **Git commit history:** `git log --all --oneline --date=short -- <file_path>`
2. **GitHub commit timestamps:** Each commit is cryptographically signed with its timestamp
3. **Internet Archive snapshots:** https://web.archive.org/web/*/safescoring.com
4. **Public methodology page:** https://safescoring.com/methodology

---

## Prior Art Entries

### PA-001: SAFE Pillar-Based Security Scoring Framework

**First Published:** December 31, 2025
**Git Reference:** `d21ab31` (Initial commit - SafeScoring MVP1)
**Related Patent Doc:** `docs/patents/PATENT_001_SAFE_METHODOLOGY.md`

**Description:**
A four-pillar evaluation framework for digital asset products using the dimensions: Security (S), Accessibility (A), Fidelity (F), and Ecosystem (E). Each pillar is scored independently using weighted norm evaluations, then combined into a composite score.

**Key Technical Elements:**
- Four-pillar (S-A-F-E) scoring model with configurable pillar weights
- Composite score formula: `SAFE_score = (alpha * S) + (beta * A) + (gamma * F) + (delta * E)`
- Default weights: S=0.35, A=0.20, F=0.25, E=0.20
- Score normalization to 0-100 scale with tier classification (S/A/B/C/D)

**Files Establishing Prior Art:**
- `src/core/score_calculator.py` — Score computation engine
- `src/core/smart_evaluator.py` — AI-powered evaluation logic
- `web/app/methodology/` — Public methodology documentation

---

### PA-002: Norm-to-Product-Type Applicability Matrix

**First Published:** December 31, 2025
**Git Reference:** `d21ab31` (Initial commit - SafeScoring MVP1)
**Related Patent Doc:** `docs/patents/PATENT_001_SAFE_METHODOLOGY.md`

**Description:**
A structured mapping system that determines which evaluation norms apply to which product types (hardware wallets, software wallets, CEX, DEX, DeFi protocols, custody solutions, etc.). This ensures fair comparison by only evaluating products on relevant criteria.

**Key Technical Elements:**
- 2354+ norms with per-product-type applicability rules
- Binary applicability (applicable/not-applicable) per norm per product type
- 21 product type categories
- Applicability rules defined programmatically

**Files Establishing Prior Art:**
- `src/core/norm_applicability_complete.py` — Complete norm-product type matrix (2354+ norms)
- `config/_MASTER_MIGRATION.sql` — Database schema including applicability tables

---

### PA-003: Steganographic Fingerprinting for Structured API Data

**First Published:** December 31, 2025
**Git Reference:** `d21ab31` (Initial commit - SafeScoring MVP1)
**Enhanced:** February 20, 2026 (`0f4536c`)
**Related Patent Doc:** `docs/patents/PATENT_002_ANTI_COPY_SYSTEM.md`

**Description:**
A multi-layered content protection system that embeds invisible, client-specific identifiers into structured API responses (JSON data). Techniques include score micro-variations, Unicode homoglyph substitution, array element ordering, and synthetic honeypot data injection.

**Key Technical Elements:**
- Score micro-variations: imperceptible numerical changes (±0.01) encoding client identity
- Unicode homoglyph substitution: visually identical character replacements encoding fingerprints
- Array ordering: client-specific element ordering in list responses
- Honeypot injection: synthetic but plausible products inserted into API responses
- Automated competitor monitoring and evidence package generation

**Files Establishing Prior Art:**
- `web/libs/anti-copy-logger.js` — Copy detection and logging
- `web/libs/canary-traps.js` — Honeypot generation and tracking
- `web/libs/api-protection.js` — API response fingerprinting and watermarking

---

### PA-004: Portfolio ("Stack") Security Scoring with Synergy/Vulnerability Detection

**First Published:** December 31, 2025
**Git Reference:** `d21ab31` (Initial commit - SafeScoring MVP1)
**Enhanced:** February 17, 2026 (`dce317d`)
**Related Patent Doc:** `docs/patents/PATENT_003_STACK_ALGORITHM.md`

**Description:**
A system for evaluating the combined security posture of a portfolio of digital asset products ("stack"). Unlike single-product assessments, this system considers inter-product relationships, identifies synergies from beneficial combinations, detects vulnerabilities from risky configurations, analyzes redundancy, and provides personalized recommendations.

**Key Technical Elements:**
- Weighted stack scoring by product allocation and role
- Synergy rules: hardware+software wallet combo (+5), multi-jurisdiction diversity (+3), self-custody DeFi (+4), institutional setup (+7)
- Vulnerability rules: single point of failure (-15), custodial concentration (-8), no hardware security (-10), same seed risk (-12)
- Personalized scoring based on risk tolerance, use case, asset value, and technical level
- Gap analysis and recommendation engine

**Files Establishing Prior Art:**
- `web/app/api/setups/` — Setup (stack) API endpoints
- `web/components/SetupSAFEAnalysis.js` — Stack SAFE analysis UI
- `web/components/SetupRecommendations.js` — Recommendation engine UI
- `web/components/SetupCompatibilityGraph.js` — Product compatibility analysis

---

### PA-005: AI-Powered Multi-Model Security Evaluation with Fallback Strategy

**First Published:** December 31, 2025
**Git Reference:** `d21ab31` (Initial commit - SafeScoring MVP1)
**Related Patent Doc:** N/A (not separately patented)

**Description:**
An evaluation system that uses multiple AI models (DeepSeek, Gemini, Mistral, Groq, Cerebras, Ollama) with intelligent routing and fallback strategies to evaluate security norms. The system selects the optimal model based on task complexity, cost, and availability.

**Key Technical Elements:**
- Multi-provider AI routing with automatic failover
- Model selection strategies based on evaluation complexity
- API key rotation across multiple keys per provider (25+ Google keys, 15+ Groq keys)
- Confidence scoring based on evaluation quality
- Cost optimization (cheapest provider first, premium for complex evaluations)

**Files Establishing Prior Art:**
- `src/core/api_provider.py` — Multi-provider API routing
- `src/core/ai_strategy.py` — Model selection strategies
- `src/core/smart_evaluator.py` — Evaluation orchestration

---

### PA-006: Community Consensus Evaluation ("Fouloscopie") with Blind Voting

**First Published:** February 20, 2026
**Git Reference:** `0f4536c`
**Related Patent Doc:** N/A (not separately patented)

**Description:**
A community-driven evaluation system where users vote on individual security norms. The system uses blind voting (results hidden until user votes), weighted voting (expertise affects vote weight), stratified consensus (diverse voter profiles), and anonymous voter hashing.

**Key Technical Elements:**
- Blind voting: evaluation results not shown until user submits their vote
- Weighted voting: user expertise level affects vote weight
- SHA-256 anonymous voter hashing to prevent duplicate voting
- Stratified consensus requiring diverse voter profiles
- Agree/disagree tracking with weighted aggregation

**Files Establishing Prior Art:**
- `web/app/api/community/evaluations/` — Community evaluation API
- `web/components/EvaluationVoting.js` — Voting UI component

---

## Instructions for Maintaining This Register

When adding new innovations:

1. Create a new PA-XXX entry with the next sequential number
2. Include the exact git commit hash and date of first publication
3. Describe the innovation in sufficient technical detail to serve as prior art
4. List all relevant source files
5. If a corresponding patent document exists, reference it
6. Commit this update to the repository

**To verify any entry:**
```bash
git log --all --oneline --date=short -- <file_path>
git show <commit_hash>:<file_path>
```

---

**This document is part of the SafeScoring project and is licensed under the same terms as the project (see LICENSE).**
