# 🗺️ Interactive World Map Configuration

This guide explains how to populate the world map with your data.

## Overview

The interactive map displays:
- 🔴 **Physical Incidents** - Real attacks (kidnappings, robberies) with exact GPS coordinates
- 🟠 **Crypto Incidents** - Hacks, exploits (via affected products)
- 🔵 **Products** - All wallets, exchanges, etc. by headquarters location

## 📋 Configuration Steps

### 1. Enrich Products with Geography

Run the SQL script to add `headquarters` and `country_origin` to products:

```bash
# Via psql
psql -U postgres -d safescoring -f config/enrich_products_geography.sql

# OR via Supabase Dashboard
# Copy and paste the content of config/enrich_products_geography.sql
# into Supabase's SQL Editor
```

This script automatically adds geographic data for:
- ✅ **Hardware Wallets**: Ledger, Trezor, BitBox, Coldcard, etc.
- ✅ **Software Wallets**: MetaMask, Trust Wallet, Exodus, etc.
- ✅ **Exchanges**: Binance, Coinbase, Kraken, etc.
- ✅ **Multisig**: Gnosis Safe, Casa, Fireblocks, etc.
- ✅ **Layer 2**: Polygon, Arbitrum, Optimism, etc.
- ✅ **DeFi**: Uniswap, Aave, Curve, etc.

### 2. Add Physical Incidents

Use the provided seed data:

```bash
psql -U postgres -d safescoring -f config/seed_physical_incidents.sql
```

This adds **9 real incidents** with GPS coordinates:
- Dubai Crypto Influencer Kidnapping (2024-12)
- Hong Kong Bitcoin Trader Home Invasion (2024-09)
- Thailand Crypto Trader Extortion (2024-07)
- Brazil Exchange Executive Kidnapping (2024-05)
- Russia Mining Operation Robbery (2024-03)
- UK NFT Trader Home Invasion (2023-11)
- US Crypto Conference Robbery (2023-06)
- China OTC Trader Disappearance (2023-04)
- Indonesia Crypto Investor Home Invasion (2022-08)

### 3. Scrape Crypto Incidents

Launch the automatic scraper to collect recent hacks:

```bash
cd src/automation
python incident_scraper.py --source all
```

**Sources used** (all free):
- DefiLlama Hacks API
- Rekt.news
- SlowMist Hacked
- Web3 is Going Great
- Chainabuse
- RSS Feeds (The Block, Decrypt, CoinTelegraph)

The scraper will:
1. Collect incidents from 6+ sources
2. Automatically deduplicate
3. Match with your products (fuzzy matching)
4. Insert into `security_incidents`
5. Create links in `incident_product_impact`

### 4. Automate Scraping (Optional)

The GitHub Actions workflow is already configured to scrape **every 6 hours**:

```yaml
# .github/workflows/incident-scraper.yml
schedule:
  - cron: '0 */6 * * *'  # Every 6 hours
```

You can also run it manually:
- Go to **Actions** on GitHub
- Select "Incident Scraper"
- Click "Run workflow"

### 5. Verify Data

```sql
-- Number of products with geolocation
SELECT COUNT(*) FROM products WHERE country_origin IS NOT NULL;

-- Products by country
SELECT country_origin, COUNT(*) as count
FROM products
WHERE country_origin IS NOT NULL
GROUP BY country_origin
ORDER BY count DESC;

-- Physical incidents with GPS
SELECT COUNT(*) FROM physical_incidents WHERE location_coordinates IS NOT NULL;

-- Crypto incidents with affected products
SELECT COUNT(*) FROM security_incidents WHERE affected_product_ids IS NOT NULL;
```

### 6. Access the Map

Start the server and visit:

```
http://localhost:3000/incidents/map
```

## 🎯 Map Features

### Interactive Filters
- ☑️ **Physical Incidents** - Show/hide physical attacks
- ☑️ **Crypto Incidents** - Show/hide hacks
- ☑️ **Products HQ** - Show/hide products

### Clickable Markers
Each marker opens a popup with:
- **Physical**: Title, type, date, location, amount stolen, severity, link to details
- **Crypto**: List of incidents, total lost, links to details
- **Products**: List of products, clickable links, founding year

### Navigation
- Free zoom/pan
- Click popup → full details
- Real-time filters

## 📊 Data Structure

### Physical Incidents
```sql
physical_incidents (
  location_coordinates POINT,    -- Exact GPS (latitude, longitude)
  location_city VARCHAR(100),    -- City
  location_country VARCHAR(2),   -- ISO code (US, FR, etc.)
  severity_score INTEGER,        -- 1-10
  amount_stolen_usd BIGINT,
  opsec_failures TEXT[]
)
```

### Security Incidents (Crypto)
```sql
security_incidents (
  affected_product_ids INTEGER[], -- Affected products
  funds_lost_usd DECIMAL,
  incident_type VARCHAR,          -- hack, exploit, rug_pull, etc.
  severity VARCHAR                -- critical, high, medium, low
)
```

### Products
```sql
products (
  headquarters VARCHAR(100),     -- "Paris, France"
  country_origin VARCHAR(2),     -- "FR"
  year_founded INTEGER
)
```

## 🔧 Add Products Manually

If you have products not in the enrichment script:

```sql
UPDATE products SET
    headquarters = 'City, Country',
    country_origin = 'XX'  -- ISO 2-letter code
WHERE slug = 'your-product-slug';
```

**Important ISO codes**:
- US (USA), FR (France), GB (UK), DE (Germany)
- CH (Switzerland), SG (Singapore), HK (Hong Kong)
- JP (Japan), CN (China), KR (South Korea)
- AU (Australia), CA (Canada), AE (UAE)

Complete list: [ISO 3166-1 alpha-2](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2)

## 🌍 Country Coordinates

The file `web/libs/country-coordinates.js` contains **80+ countries** with their capital coordinates.

To add a new country:

```javascript
// web/libs/country-coordinates.js
export const COUNTRY_COORDINATES = {
  XX: { lat: 0.0000, lng: 0.0000, name: "Country Name" },
  // ...
};
```

## 📈 Performance

### API Cache
- **1 hour** of cache for `/api/incidents/map`
- Reduces DB load
- Fresh data every hour

### DB Optimizations
- GIST index on `location_coordinates` (fast geospatial queries)
- GIN index on arrays (`affected_product_ids`, `products_compromised`)
- Grouping by country to reduce markers

### Current Limits
- 200 products max in the API
- 100 crypto incidents max
- Physical incidents: unlimited (low volume)

To increase limits, modify `/web/app/api/incidents/map/route.js`:

```javascript
.limit(100)  // Change this value
```

## 🐛 Troubleshooting

### Products don't appear on the map

Check that `country_origin` is set:
```sql
SELECT slug, name, country_origin, headquarters
FROM products
WHERE slug = 'your-product';
```

If `country_origin` is NULL, update it:
```sql
UPDATE products SET country_origin = 'US', headquarters = 'San Francisco, USA'
WHERE slug = 'your-product';
```

### Error "Cannot read property 'lat' of null"

The country doesn't exist in `country-coordinates.js`. Add it:
```javascript
XX: { lat: latitude, lng: longitude, name: "Country Name" }
```

### Physical incidents don't have coordinates

Check the POINT format:
```sql
SELECT location_coordinates FROM physical_incidents WHERE id = 1;
-- Should return: (longitude,latitude)
```

To add/fix:
```sql
UPDATE physical_incidents
SET location_coordinates = POINT(longitude, latitude)
WHERE id = X;
```

### The map won't load

1. Check that Leaflet is installed:
```bash
npm list leaflet react-leaflet
```

2. Check browser console for errors

3. Make sure the component is loaded client-side only (dynamic import with `ssr: false`)

## 🚀 Next Steps

1. **Run the SQL scripts** to enrich your data
2. **Launch the scraper** to collect crypto incidents
3. **Visit `/incidents/map`** to see the result
4. **Configure GitHub Actions** for automatic scraping

## 📚 Documentation

- [Leaflet.js](https://leafletjs.com/)
- [React Leaflet](https://react-leaflet.js.org/)
- [OpenStreetMap](https://www.openstreetmap.org/)
- [ISO Country Codes](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2)

---

**Questions?** Open an issue or check the files:
- `/web/app/incidents/map/page.js` - Main page
- `/web/components/WorldMap.jsx` - Map component
- `/web/app/api/incidents/map/route.js` - API endpoint
- `/config/enrich_products_geography.sql` - Enrichment script
