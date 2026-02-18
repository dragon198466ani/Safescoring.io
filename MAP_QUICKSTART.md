# 🗺️ Quick Start - World Map

## Quick Start (5 minutes)

### 1. Install dependencies (already done ✓)
```bash
cd web
npm install  # Leaflet and react-leaflet are already installed
```

### 2. Populate the database

**Via Supabase Dashboard** (Recommended):

1. Go to [app.supabase.com](https://app.supabase.com)
2. Select your SafeScoring project
3. Go to **SQL Editor**
4. Execute these 2 scripts in order:

**Script 1 - Enrich Products**:
```sql
-- Copy-paste the content from:
-- config/enrich_products_geography.sql
```

**Script 2 - Add Physical Incidents**:
```sql
-- Copy-paste the content from:
-- config/seed_physical_incidents.sql
```

**Via psql** (Alternative):
```bash
psql -U postgres -d safescoring -f config/enrich_products_geography.sql
psql -U postgres -d safescoring -f config/seed_physical_incidents.sql
```

### 3. Start the server
```bash
cd web
npm run dev
```

### 4. Visit the map
```
http://localhost:3000/incidents/map
```

## 🎯 What you'll see

✅ **~50-100 products** geolocated (Ledger, Trezor, MetaMask, Binance, etc.)
✅ **9 physical incidents** real cases with GPS coordinates
✅ **Interactive map** with filters and clickable popups

## 🔄 Add Crypto Incidents (Optional)

To automatically scrape recent hacks:

```bash
cd src/automation
python incident_scraper.py --source all
```

This will add **100+ crypto incidents** from sources:
- DefiLlama, Rekt.news, SlowMist, Web3isGoingGreat, etc.

## 📱 Usage

### Filters
- ☑️ **Physical Incidents** (red) - Physical attacks
- ☑️ **Crypto Incidents** (orange) - Hacks & exploits
- ☑️ **Products HQ** (blue) - Products by country

### Interactions
- **Click on marker** → Popup with details
- **Zoom/pan** → Explore regions
- **Click in popup** → View detailed page

## 📂 Files Created

```
web/
├── app/
│   ├── incidents/
│   │   ├── page.js              ✅ Crypto incidents list
│   │   ├── physical/page.js     ✅ Physical incidents list
│   │   └── map/page.js          ✅ Interactive map
│   └── api/
│       └── incidents/
│           └── map/route.js     ✅ Geographic data API
├── components/
│   └── WorldMap.jsx             ✅ Leaflet component
└── libs/
    └── country-coordinates.js   ✅ 100+ countries

config/
├── enrich_products_geography.sql    ✅ Enrichment script
└── seed_physical_incidents.sql      ✅ Seed real incidents
```

## 🆘 Problem?

**Map is empty?**
→ Check that you executed both SQL scripts

**Products don't appear?**
→ Check in Supabase:
```sql
SELECT COUNT(*) FROM products WHERE country_origin IS NOT NULL;
-- Should return > 0
```

**Leaflet error?**
→ Check that you're in development mode (`npm run dev`)

## 📚 Complete Documentation

For more details, see [SETUP_MAP.md](./SETUP_MAP.md)

---

**You're ready!** Visit `/incidents/map` to see your interactive world map.
