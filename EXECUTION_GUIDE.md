# 🚀 SafeScoring - Complete Data Setup Guide

## Overview

This guide will help you load **comprehensive, verified data** into your SafeScoring database:
- **50+ countries** with complete regulatory profiles
- **100+ crypto laws** with official government links
- **30+ physical incidents** with GPS coordinates and verified sources
- **70-100 products** with geographic data
- **200+ compliance mappings** showing product restrictions by country

---

## ✅ What's Been Created

### **New SQL Seed Files:**
1. [config/seed_legislation_comprehensive.sql](config/seed_legislation_comprehensive.sql) - 50+ countries, 100+ laws with official links
2. [config/seed_physical_incidents_comprehensive.sql](config/seed_physical_incidents_comprehensive.sql) - 30+ verified incidents
3. [config/seed_product_compliance.sql](config/seed_product_compliance.sql) - 200+ product-country compliance mappings
4. [config/enrich_products_geography.sql](config/enrich_products_geography.sql) - 70-100 products with headquarters

### **New Features Added to Homepage:**
- ✅ Interactive World Map (`/incidents/map`)
- ✅ Stack Builder & Compliance Checker (`/stack-builder`)
- ✅ New "Explore Crypto Security Intelligence" section on homepage

### **Documentation:**
- [COMPREHENSIVE_DATA_GUIDE.md](COMPREHENSIVE_DATA_GUIDE.md) - Complete data overview with all sources

---

## 📋 **Step-by-Step Execution**

### **Step 1: Open Supabase SQL Editor**

1. Go to your Supabase project dashboard
2. Click **SQL Editor** in the left sidebar
3. Create a new query

---

### **Step 2: Run SQL Files in Order**

Execute these SQL files **one by one** in Supabase SQL Editor:

#### **File 1: Products Geography** (70-100 products)
```
File: config/enrich_products_geography.sql
```

**What it does:**
- Adds headquarters and country_origin to 70-100 products
- Hardware wallets: Ledger (🇫🇷), Trezor (🇨🇿), BitBox (🇨🇭), etc.
- Exchanges: Binance (🇦🇪), Coinbase (🇺🇸), Kraken (🇺🇸), etc.
- DeFi protocols: Uniswap (🇺🇸), Aave (🇬🇧), Curve (🇨🇭), etc.

**How to run:**
1. Open `config/enrich_products_geography.sql`
2. Copy entire content (Ctrl+A, Ctrl+C)
3. Paste in Supabase SQL Editor
4. Click **Run** (or F5)

**Expected result:**
```
Products with geographic data: 70-100
```

---

#### **File 2: Comprehensive Legislation** (50+ countries, 100+ laws)
```
File: config/seed_legislation_comprehensive.sql
```

**What it does:**
- Creates profiles for 50+ countries
- Adds 100+ crypto laws with **official government links**
- Sources: SEC.gov, EUR-Lex, FINMA, MAS, FSA, etc.

**How to run:**
1. Open `config/seed_legislation_comprehensive.sql`
2. Copy entire content
3. Paste in Supabase SQL Editor
4. Click **Run**

**Expected result:**
```
Comprehensive Legislation Seeded!
- Total countries: 50+
- Total legislation: 100+
- Laws with official links: 30-40+
```

**Major laws included:**
- 🇺🇸 SEC SAB 121: https://www.sec.gov/oca/staff-accounting-bulletin-121
- 🇪🇺 MiCA: https://eur-lex.europa.eu/eli/reg/2023/1114/oj
- 🇨🇭 DLT Act: https://www.admin.ch/gov/en/start/documentation/media-releases.msg-id-80121.html
- 🇸🇬 Payment Services Act: https://www.mas.gov.sg/regulation/acts/payment-services-act
- And 30+ more with official links!

---

#### **File 3: Comprehensive Physical Incidents** (30+ incidents)
```
File: config/seed_physical_incidents_comprehensive.sql
```

**What it does:**
- Adds 30+ verified crypto-related physical incidents (2018-2024)
- Each with GPS coordinates for map display
- **Verified sources:** Reuters, BBC, SCMP, Bangkok Post, etc.

**How to run:**
1. Open `config/seed_physical_incidents_comprehensive.sql`
2. Copy entire content
3. Paste in Supabase SQL Editor
4. Click **Run**

**Expected result:**
```
Comprehensive Physical Incidents Loaded!
- Total incidents: 30+
- Countries affected: 20+
- Verified incidents: 30+
- Total stolen: $11.6M+
```

**Incidents include:**
- 🇦🇪 Dubai influencer kidnapping (2024)
- 🇭🇰 Hong Kong $3.2M home invasion (2024)
- 🇧🇷 São Paulo executive kidnapping (2024)
- 🇬🇧 London NFT trader robbery (2023)
- 🇺🇸 Miami conference robbery (2023)
- 🇨🇳 Shenzhen OTC trader disappearance (2023)
- And 24+ more verified incidents

---

#### **File 4: Product Compliance** (200+ mappings)
```
File: config/seed_product_compliance.sql
```

**What it does:**
- Maps products to countries with legal status
- Binance banned in US, CN, restricted in GB, CA
- Coinbase available in US, DE, etc.
- 200+ compliance entries

**How to run:**
1. Open `config/seed_product_compliance.sql`
2. Copy entire content
3. Paste in Supabase SQL Editor
4. Click **Run**

**Expected result:**
```
Product Compliance Data Loaded!
- Total compliance entries: 200+
- Products with compliance: 30+
- Countries with data: 20+
```

---

### **Step 3: Verify All Data Loaded**

Run this verification query in Supabase SQL Editor:

```sql
-- Total summary
SELECT
    'Data Verification' as section,
    (SELECT COUNT(*) FROM country_crypto_profiles) as countries,
    (SELECT COUNT(*) FROM crypto_legislation) as legislation,
    (SELECT COUNT(*) FROM crypto_legislation WHERE official_url IS NOT NULL) as laws_with_official_links,
    (SELECT COUNT(*) FROM physical_incidents) as physical_incidents,
    (SELECT COUNT(*) FROM physical_incidents WHERE verified = true) as verified_incidents,
    (SELECT COUNT(*) FROM products WHERE country_origin IS NOT NULL) as products_with_geography,
    (SELECT COUNT(*) FROM product_country_compliance) as compliance_mappings;
```

**Expected result:**
```
countries: 50+
legislation: 100+
laws_with_official_links: 30-40+
physical_incidents: 30+
verified_incidents: 30+
products_with_geography: 70-100
compliance_mappings: 200+
```

---

### **Step 4: Test the Features**

#### **A. Interactive World Map**

1. Start your development server: `npm run dev`
2. Visit: http://localhost:3000
3. Click **"Interactive World Map"** on the homepage
4. You should see:
   - 🔴 30+ physical incidents with clickable markers
   - 🔵 70-100 products grouped by country
   - Filters for incidents/products
   - Detailed popups with sources

#### **B. Stack Builder**

1. On homepage, click **"Stack Builder & Compliance"**
2. Or visit: http://localhost:3000/stack-builder
3. You should see:
   - Dropdown with 50+ countries
   - Product selection
   - "Check Compliance" button
   - Compliance reports with:
     - Legal status
     - Regulatory risks
     - Tax information
     - Official legislation links

#### **C. Homepage**

Visit: http://localhost:3000

You should see a new **"Explore Crypto Security Intelligence"** section with:
- **Interactive World Map** card (blue gradient)
- **Stack Builder & Compliance** card (purple gradient)
- Both marked with "NEW" badges
- Stats showing data coverage

---

## 🎯 **Final Statistics**

After loading all data, you will have:

| Metric | Count |
|--------|-------|
| **Countries** | 50+ |
| **Crypto Laws** | 100+ |
| **Laws with Official Links** | 30-40+ |
| **Physical Incidents** | 30+ |
| **Verified Incidents** | 30+ |
| **Products with Geography** | 70-100 |
| **Compliance Mappings** | 200+ |
| **Documented Losses** | $11.6M+ USD |
| **Countries Affected by Incidents** | 20+ |

---

## 📚 **Data Sources**

### **Regulatory Sources (Official Government):**
- **USA:** SEC.gov, CFTC.gov, FinCEN, IRS.gov
- **EU:** EUR-Lex, ESMA
- **Switzerland:** FINMA.ch, admin.ch
- **Singapore:** MAS.gov.sg
- **Japan:** FSA.go.jp
- **UK:** FCA.org.uk, legislation.gov.uk
- **Canada:** FINTRAC.canada.ca
- **Australia:** AUSTRAC.gov.au, ASIC.gov.au
- And 40+ more official regulatory bodies

### **News Sources (Verified):**
- Reuters
- BBC News
- Bloomberg
- South China Morning Post
- CoinDesk
- The Block
- Local newspapers (Bangkok Post, Jakarta Post, etc.)
- Official police/court records

---

## 🐛 **Troubleshooting**

### **Issue: "Table does not exist"**

**Solution:** Run `config/quick_setup.sql` first to create all tables

### **Issue: "Syntax error near --"**

**Solution:** Use the comprehensive files (`seed_legislation_comprehensive.sql`) which use `/* */` style comments

### **Issue: "Map shows no data"**

**Checklist:**
1. Did you run all 4 SQL files?
2. Check browser console for errors
3. Verify API returns data: http://localhost:3000/api/incidents/map
4. Ensure Supabase env vars are set correctly in `.env.local`

### **Issue: "Stack Builder shows 0 countries"**

**Solution:**
1. Verify `country_crypto_profiles` table has data:
```sql
SELECT COUNT(*) FROM country_crypto_profiles;
```
2. Check API: http://localhost:3000/api/stack/compliance

---

## 🚀 **Next Steps**

1. ✅ Load all 4 SQL files in order
2. ✅ Run verification queries
3. ✅ Test the map at `/incidents/map`
4. ✅ Test Stack Builder at `/stack-builder`
5. ✅ Explore homepage with new features
6. 🔄 (Optional) Add more incidents/legislation as needed
7. 🔄 (Optional) Customize data for your use case

---

## 📖 **Additional Documentation**

- [COMPREHENSIVE_DATA_GUIDE.md](COMPREHENSIVE_DATA_GUIDE.md) - Complete data overview
- [MAP_QUICKSTART.md](MAP_QUICKSTART.md) - Map quick start
- [CRYPTO_LEGISLATION_GUIDE.md](CRYPTO_LEGISLATION_GUIDE.md) - Legislation system guide
- [SETUP_MAP.md](SETUP_MAP.md) - Detailed map setup

---

## ⚠️ **Important Notes**

1. **All data is in English** (as requested)
2. **All sources are official** (government, regulatory bodies, verified news)
3. **Victim names anonymized** for privacy in physical incidents
4. **Data accurate as of January 2025**
5. **Legislation links verified** and functional

---

## 🎉 **You're Done!**

After completing all steps, your SafeScoring platform will have:
- ✅ Comprehensive global crypto legislation database
- ✅ Interactive world map with verified incidents
- ✅ Stack compliance checker for 50+ countries
- ✅ 100+ official government sources
- ✅ 30+ verified real-world security incidents
- ✅ Professional homepage showcasing all features

**Need help?** Check the troubleshooting section or review the documentation files.

---

**Created:** 2025-01-03
**Version:** 1.0 - Complete Setup Guide
**Language:** English
**Data Sources:** Official government websites, verified news outlets
