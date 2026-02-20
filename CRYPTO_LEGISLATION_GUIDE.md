# 📚 Guide: Crypto Legislation & Stack Builder

## Overview

This system allows users to:
1. **Build their crypto stack** (product selection)
2. **Verify legality** in their country
3. **Analyze regulatory risks**
4. **Get personalized recommendations**
5. **Visualize global legislation** on the interactive map

---

## 🗄️ Database Structure

### Tables Created

#### 1. `crypto_legislation`
Complete tracking of all crypto laws by country.

**Key fields:**
- `country_code` - 2-letter ISO code
- `legislation_id` - Unique ID (ex: "US-2022-SAB121")
- `title`, `short_title`, `description`
- `category` - ban, restriction, regulation, taxation, licensing, etc.
- `status` - proposed, in_effect, repealed, etc.
- `severity` - critical, high, medium, low, positive
- `effective_date`, `expiry_date`
- `kyc_required`, `aml_required`, `license_required`
- `restrictions` - JSONB flexible for specific details
- `regulatory_body` - Ex: SEC, FINMA, FCA

**Legislation example:**
```sql
-- USA - SAB 121 (Custody Accounting)
INSERT INTO crypto_legislation (
    country_code, legislation_id, title, category, status, severity,
    effective_date, affects_products, regulatory_body
) VALUES (
    'US', 'US-2022-SAB121', 'Staff Accounting Bulletin No. 121',
    'custody', 'in_effect', 'high',
    '2022-03-31', true, 'SEC'
);
```

#### 2. `product_country_compliance`
Product availability and restrictions by country.

**Key fields:**
- `product_id`, `country_code`
- `status` - available, banned, restricted, license_required, etc.
- `kyc_required`, `kyc_threshold_usd`
- `withdrawal_limit_daily_usd`, `withdrawal_limit_monthly_usd`
- `features_disabled[]` - Ex: ['staking', 'margin_trading']
- `regulatory_risk` - very_low, low, medium, high, very_high, critical
- `legislation_ids[]` - Laws affecting this product

**Example:**
```sql
-- Binance banned in China
INSERT INTO product_country_compliance (
    product_id, country_code, status, regulatory_risk,
    compliance_notes
) VALUES (
    123, 'CN', 'banned', 'critical',
    'All crypto exchanges banned since 2021'
);
```

#### 3. `country_crypto_profiles`
Overall regulatory profile by country.

**Key fields:**
- `crypto_stance` - very_friendly, friendly, neutral, restrictive, hostile, very_hostile
- `overall_score` - 0-100 (100 = very crypto-friendly)
- `regulatory_clarity_score`, `compliance_difficulty_score`, `innovation_score`
- `crypto_legal`, `trading_allowed`, `mining_allowed`
- `crypto_taxed`, `capital_gains_tax_rate`
- `cbdc_status`, `cbdc_name`

**Countries with the best scores:**
- 🇨🇭 Switzerland: 90/100 (very_friendly)
- 🇸🇻 El Salvador: 92/100 (very_friendly)
- 🇸🇬 Singapore: 88/100 (very_friendly)
- 🇦🇪 UAE: 85/100 (very_friendly)
- 🇵🇹 Portugal: 83/100 (very_friendly)

---

## 🚀 Installation & Setup

### 1. Run the Migration

```bash
# Via psql
psql -U postgres -d safescoring -f config/migrations/010_crypto_legislation.sql

# OR via Supabase Dashboard
# Copy-paste the content into SQL Editor
```

### 2. Seed the Legislative Data

```bash
psql -U postgres -d safescoring -f config/seed_crypto_legislation.sql
```

This adds:
- **20+ country profiles** (USA, EU, China, etc.)
- **10+ major legislations** (MiCA, SAB 121, China Ban, etc.)
- Product compliance examples

### 3. Verify Installation

```sql
-- Number of countries with profile
SELECT COUNT(*) FROM country_crypto_profiles;
-- Should return 20+

-- Active legislations
SELECT COUNT(*) FROM crypto_legislation WHERE status = 'in_effect';

-- Countries by stance
SELECT crypto_stance, COUNT(*)
FROM country_crypto_profiles
GROUP BY crypto_stance;
```

---

## 🎯 Stack Builder Usage

### Web Page: `/stack-builder`

**Features:**
1. **Country selection** - Dropdown with 20+ countries
2. **Product selection** - Checkbox list with all products
3. **Instant verification** - "Check Compliance" button
4. **Detailed report:**
   - ✅ Overall Status (compliant, restricted, risky, illegal)
   - ⚠️ Blockers (banned products)
   - 💡 Warnings (restrictions)
   - 📋 Recommendations
   - 💰 Tax implications
   - 📜 Relevant legislation

### Example Workflow

```
1. User selects "France" (FR)
2. Adds to stack:
   - Ledger Nano X
   - MetaMask
   - Binance
3. Clicks "Check Compliance"
4. Receives report:
   - ✅ Status: COMPLIANT
   - ⚠️ Risk: MEDIUM
   - 💰 Tax: 30% capital gains
   - 📋 Requires KYC above €1000
   - ✅ Recommendation: "Your stack is legal!"
```

---

## 📡 API Endpoints

### `POST /api/stack/compliance`

Verifies the legality of a stack in a country.

**Request:**
```json
{
  "productIds": [1, 2, 3],
  "countryCode": "US"
}
```

**Response:**
```json
{
  "success": true,
  "country": {
    "code": "US",
    "name": "United States",
    "cryptoStance": "restrictive",
    "overallScore": 65
  },
  "stackAnalysis": {
    "overallStatus": "restricted",
    "overallRisk": "medium",
    "canUseStack": true,
    "blockers": [],
    "warnings": ["2 products have usage restrictions"],
    "recommendations": ["Review withdrawal limits and KYC requirements"]
  },
  "productReports": [
    {
      "productId": 1,
      "productName": "Ledger Nano X",
      "legalStatus": "legal",
      "regulatoryRisk": "low",
      "requirements": [],
      "restrictions": []
    }
  ],
  "taxInfo": {
    "isTaxable": true,
    "capitalGainsTaxRate": 37.0,
    "reportingRequired": true
  },
  "relevantLaws": [...]
}
```

### `GET /api/stack/compliance`

Lists all countries with regulatory profiles.

**Response:**
```json
{
  "success": true,
  "countries": [
    {
      "code": "CH",
      "name": "Switzerland",
      "stance": "very_friendly",
      "overallScore": 90,
      "tradingAllowed": true,
      "miningAllowed": true
    },
    ...
  ]
}
```

### `GET /api/stack/compliance?country=US`

Detailed profile of a specific country.

---

## 🗺️ Integration with the World Map

### Legislation Overlay (Coming soon)

The `/incidents/map` map will be able to display:
- **Colors by stance:**
  - 🟢 Green = Very Friendly (CH, SG, SV)
  - 🟡 Yellow = Neutral (BR, KR)
  - 🔴 Red = Hostile (CN, DZ, BD)
- **Popups with:**
  - Regulatory score
  - Number of active laws
  - Main restrictions
  - Link to detailed legislation

---

## 📊 Use Cases

### 1. User Wants to Use Binance

```javascript
// API Call
POST /api/stack/compliance
{
  "productIds": [binance_id],
  "countryCode": "CN"
}

// Response
{
  "stackAnalysis": {
    "overallStatus": "illegal",
    "canUseStack": false,
    "blockers": ["Binance is banned in China"]
  }
}
```

### 2. Multi-Country Setup

A user traveling between France, Switzerland, USA:

```javascript
// Check for each country
["FR", "CH", "US"].forEach(country => {
  checkCompliance(myStack, country)
})

// Find the most permissive country
const bestCountry = results.sort((a, b) =>
  b.country.overallScore - a.country.overallScore
)[0]
```

### 3. Product Recommendations

```sql
-- Products available in China despite the ban
SELECT p.name
FROM products p
JOIN product_country_compliance pcc ON pcc.product_id = p.id
WHERE pcc.country_code = 'CN'
  AND pcc.status IN ('available', 'available_restricted')
ORDER BY pcc.regulatory_risk ASC;

-- Hardware wallets often work even in hostile countries
```

---

## 🔒 Compliance & Legality

### Legal Disclaimer

**IMPORTANT:** This tool is provided for informational purposes only and does not constitute:
- Legal advice
- Investment recommendation
- Compliance guarantee

**Users must:**
- Consult with a local crypto-specialized attorney
- Verify the most recent laws
- Comply with all tax obligations
- Understand that laws change frequently

### Data Sources

Legislative data comes from:
- Official regulatory publications
- Public legal databases
- Product compliance reports
- Manual regulatory monitoring

**Update frequency:**
- Major legislations: Real-time
- Country profiles: Monthly
- Product compliance: Quarterly

---

## 🛠️ Add New Legislation

### SQL Template

```sql
INSERT INTO crypto_legislation (
    country_code,
    legislation_id,
    slug,
    title,
    short_title,
    description,
    category,      -- ban, regulation, taxation, etc.
    status,        -- proposed, in_effect, etc.
    severity,      -- critical, high, medium, low
    proposed_date,
    passed_date,
    effective_date,
    expiry_date,   -- NULL if permanent
    affects_products,
    affects_exchanges,
    affected_product_types,  -- ARRAY['EXCHANGE', 'WALLET']
    kyc_required,
    aml_required,
    license_required,
    regulatory_body,
    official_url
) VALUES (
    'FR',
    'FR-2024-MICA',
    'france-mica-implementation',
    'MiCA Implementation Decree',
    'MiCA France',
    'French implementation of EU MiCA regulation',
    'regulation',
    'in_effect',
    'medium',
    '2024-01-01',
    '2024-06-15',
    '2024-12-30',
    NULL,
    true,
    true,
    ARRAY['EXCHANGE', 'CUSTODY'],
    true,
    true,
    true,
    'AMF',
    'https://www.amf-france.org/mica'
);
```

### Update Country Profile

```sql
UPDATE country_crypto_profiles
SET
    active_legislation_count = active_legislation_count + 1,
    last_major_legislation_date = '2024-12-30',
    last_updated = NOW()
WHERE country_code = 'FR';
```

---

## 📈 Analytics & Reporting

### Useful Queries

```sql
-- Top 10 crypto-friendly countries
SELECT country_name, crypto_stance, overall_score
FROM country_crypto_profiles
ORDER BY overall_score DESC
LIMIT 10;

-- Legislations by severity
SELECT severity, COUNT(*)
FROM crypto_legislation
WHERE status = 'in_effect'
GROUP BY severity;

-- Products with the most restrictions
SELECT p.name, COUNT(DISTINCT pcc.country_code) as banned_countries
FROM products p
JOIN product_country_compliance pcc ON pcc.product_id = p.id
WHERE pcc.status = 'banned'
GROUP BY p.name
ORDER BY banned_countries DESC;

-- Countries with the most active laws
SELECT ccp.country_name, COUNT(cl.id) as law_count
FROM country_crypto_profiles ccp
LEFT JOIN crypto_legislation cl ON cl.country_code = ccp.country_code
WHERE cl.status IN ('in_effect', 'passed')
GROUP BY ccp.country_name
ORDER BY law_count DESC;
```

---

## 🌍 Geographic Coverage

### Countries with Complete Profiles

**Very Crypto-Friendly (90+):**
- 🇨🇭 Switzerland (90)
- 🇸🇻 El Salvador (92)
- 🇸🇬 Singapore (88)

**Friendly (70-89):**
- 🇩🇪 Germany (78)
- 🇯🇵 Japan (75)
- 🇨🇦 Canada (73)
- 🇬🇧 UK (70)

**Neutral/Restrictive (50-69):**
- 🇺🇸 USA (65)
- 🇧🇷 Brazil (65)
- 🇮🇳 India (55)

**Hostile (< 30):**
- 🇪🇬 Egypt (20)
- 🇨🇳 China (15)
- 🇧🇩 Bangladesh (10)

---

## 🔄 Maintenance & Updates

### Monthly Checklist

- [ ] Check new legislations (US, EU, CN)
- [ ] Update country profiles if major changes
- [ ] Check product compliance (bans, new restrictions)
- [ ] Update tax rates
- [ ] Check CBDC status

### Sources to Monitor

- **USA:** SEC.gov, CFTC.gov, FinCEN
- **EU:** ESMA, MiCA implementation
- **Asia:** MAS (SG), FSA (JP), PBOC (CN)
- **Crypto News:** CoinDesk, The Block (regulatory sections)

---

## 📞 Support & Contribution

### Add a Country

1. Create the profile in `country_crypto_profiles`
2. Add main legislations in `crypto_legislation`
3. Update `country-coordinates.js` if missing
4. Test with Stack Builder

### Report a Legislative Bug

If a law is incorrect or outdated:
1. Open a GitHub issue
2. Provide the official source
3. Indicate the country and legislation concerned

---

**System created:** 2025-01-03
**Version:** 1.0
**Upcoming features:**
- Legislation overlay on the world map
- Legislative change notifications
- Export compliance reports as PDF
- Public API for developers

---

Also see:
- [MAP_QUICKSTART.md](./MAP_QUICKSTART.md) - World map guide
- [SETUP_MAP.md](./SETUP_MAP.md) - Complete map setup

