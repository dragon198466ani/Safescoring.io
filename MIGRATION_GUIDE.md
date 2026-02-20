# 🚀 SQL Migration Guide - Map & Legislation

**Estimated time: 10 minutes**

---

## 📋 Overview

You will execute **5 SQL scripts** in order to activate:
- ✅ Interactive world map
- ✅ Crypto legislation system
- ✅ Stack Builder

---

## 🎯 Step 1: Access Supabase SQL Editor

1. Open [app.supabase.com](https://app.supabase.com)
2. Select your **SafeScoring** project
3. In the left menu, click **SQL Editor**
4. Click **New Query** (top right)

---

## 📝 Step 2: Execute Migrations (in order)

### **MIGRATION 1/5: Physical Incidents** ⏱️ ~10 seconds

**File:** `config/migrations/008_physical_incidents.sql`

**Steps:**
1. Open file `config/migrations/008_physical_incidents.sql` in VS Code
2. **Select all** (Ctrl+A / Cmd+A)
3. **Copy** (Ctrl+C / Cmd+C)
4. Return to Supabase SQL Editor
5. **Paste** in the query window
6. Click **Run** (or F5)

**Expected result:**
```
✅ Physical Incidents Tracking System Created!
   incidents_count: 1
   product_impacts_count: 0
```

---

### **MIGRATION 2/5: Enrich Products with Geography** ⏱️ ~5 seconds

**File:** `config/enrich_products_geography.sql`

**Steps:**
1. Open `config/enrich_products_geography.sql`
2. Copy all content
3. In Supabase, click **New Query**
4. Paste and click **Run**

**Expected result:**
```
✅ UPDATE XX (number of products updated)
```

---

### **MIGRATION 3/5: Seed Physical Incidents** ⏱️ ~15 seconds

**File:** `config/seed_physical_incidents.sql`

**Steps:**
1. Open `config/seed_physical_incidents.sql`
2. Copy all
3. New query in Supabase
4. Paste and Run

**Expected result:**
```
✅ INSERT 0 9 (9 incidents added)
```

---

### **MIGRATION 4/5: Crypto Legislation** ⏱️ ~15 seconds

**File:** `config/migrations/010_crypto_legislation.sql`

**Steps:**
1. Open `config/migrations/010_crypto_legislation.sql`
2. Copy all
3. New Supabase query
4. Paste and Run

**Expected result:**
```
✅ Crypto Legislation System Created!
   next_step: "Use country_crypto_profiles and crypto_legislation tables"
```

---

### **MIGRATION 5/5: Seed Crypto Legislation** ⏱️ ~20 seconds

**File:** `config/seed_crypto_legislation.sql`

**Steps:**
1. Open `config/seed_crypto_legislation.sql`
2. Copy all
3. New Supabase query
4. Paste and Run

**Expected result:**
```
✅ INSERT 0 20 (20+ countries added)
✅ INSERT 0 10 (legislation entries added)
```

---

## ✅ Step 3: Verification

Execute this verification query in Supabase:

```sql
-- Complete verification
SELECT
    'Physical Incidents' as table_name,
    COUNT(*) as count
FROM physical_incidents
WHERE verified = true

UNION ALL

SELECT
    'Products with Geography' as table_name,
    COUNT(*) as count
FROM products
WHERE country_origin IS NOT NULL

UNION ALL

SELECT
    'Country Profiles' as table_name,
    COUNT(*) as count
FROM country_crypto_profiles

UNION ALL

SELECT
    'Crypto Legislation' as table_name,
    COUNT(*) as count
FROM crypto_legislation
WHERE status = 'in_effect';
```

**Expected results:**
| table_name | count |
|-----------|-------|
| Physical Incidents | 9+ |
| Products with Geography | 50+ |
| Country Profiles | 20+ |
| Crypto Legislation | 10+ |

---

## 🎉 Step 4: Test Features

### **Test 1: Interactive Map**

```bash
cd web
npm run dev
```

Visit: **http://localhost:3000/incidents/map**

**You should see:**
- 🔴 Red markers (physical incidents)
- 🔵 Blue markers (products by country)
- Functional filters
- Clickable popups

---

### **Test 2: Stack Builder**

Visit: **http://localhost:3000/stack-builder**

**You should be able to:**
- Select a country (dropdown)
- Add products to your stack
- Click "Check Compliance"
- View compliance report

---

### **Test 3: API Endpoints**

```bash
# Test Map API
curl http://localhost:3000/api/incidents/map?physical=true&products=true

# Test Stack Compliance API
curl http://localhost:3000/api/stack/compliance
```

---

## 🐛 Troubleshooting

### Error: "table already exists"

**Solution:** All good! The migration uses `CREATE TABLE IF NOT EXISTS`, so it skips existing tables.

---

### Error: "relation 'products' does not exist"

**Problem:** The `products` table doesn't exist yet.

**Solution:**
```sql
-- Check if table exists
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'products';
```

If the table doesn't exist, you need to run your project's base migrations first.

---

### Map is empty

**Check 1:** Do products have coordinates?
```sql
SELECT slug, name, country_origin, headquarters
FROM products
WHERE country_origin IS NOT NULL
LIMIT 5;
```

**Check 2:** Do physical incidents have GPS?
```sql
SELECT title, location_city, location_country
FROM physical_incidents
WHERE location_coordinates IS NOT NULL;
```

---

### Stack Builder returns nothing

**Check:**
```sql
SELECT country_code, country_name, crypto_stance, overall_score
FROM country_crypto_profiles
ORDER BY overall_score DESC
LIMIT 5;
```

If empty, re-run `seed_crypto_legislation.sql`

---

## 📊 Expected Statistics

After all migrations:

```sql
-- Complete stats
SELECT
    (SELECT COUNT(*) FROM physical_incidents) as physical_incidents,
    (SELECT COUNT(*) FROM products WHERE country_origin IS NOT NULL) as products_geolocated,
    (SELECT COUNT(*) FROM country_crypto_profiles) as countries_tracked,
    (SELECT COUNT(*) FROM crypto_legislation) as total_laws,
    (SELECT SUM(amount_stolen_usd) FROM physical_incidents) as total_stolen_usd;
```

**Typical values:**
- Physical incidents: 9-10
- Products geolocated: 50-100
- Countries tracked: 20-25
- Total laws: 10-15
- Total stolen: Millions USD

---

## 🚀 Next Steps

### **Optional 1: Scrape crypto incidents**

```bash
cd src/automation
python incident_scraper.py --source all
```

This will add **100+ crypto incidents** from DefiLlama, Rekt.news, etc.

---

### **Optional 2: Automate scraping**

The GitHub Actions workflow `.github/workflows/incident-scraper.yml` is already configured to scrape every 6 hours.

To activate:
1. Go to **GitHub** → **Actions**
2. Click "Incident Scraper"
3. Click "Enable workflow"

---

### **Optional 3: Add more countries**

Edit `config/seed_crypto_legislation.sql` to add more country profiles, then re-run the script.

---

## 📚 Documentation

- [MAP_QUICKSTART.md](./MAP_QUICKSTART.md) - Map quick start guide
- [SETUP_MAP.md](./SETUP_MAP.md) - Detailed map setup
- [CRYPTO_LEGISLATION_GUIDE.md](./CRYPTO_LEGISLATION_GUIDE.md) - Complete legislation guide

---

## ✅ Final Checklist

- [ ] Migration 1 executed (physical_incidents)
- [ ] Migration 2 executed (enrich_products_geography)
- [ ] Migration 3 executed (seed_physical_incidents)
- [ ] Migration 4 executed (crypto_legislation)
- [ ] Migration 5 executed (seed_crypto_legislation)
- [ ] Verification query OK
- [ ] Interactive map works
- [ ] Stack Builder works
- [ ] APIs respond correctly

---

**🎉 Congratulations!** Your world map and crypto legislation system is now operational!

**Questions?** Check the guides or open a GitHub issue.
