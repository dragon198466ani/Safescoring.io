import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";

export const dynamic = "force-dynamic";

// GET /api/incidents/map - Get all geographic data for incidents map
export async function GET(request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const includePhysical = searchParams.get("physical") !== "false";
    const includeCrypto = searchParams.get("crypto") !== "false";
    const includeProducts = searchParams.get("products") !== "false";

    const includeUsers = searchParams.get("users") !== "false";

    const mapData = {
      physicalIncidents: [],
      cryptoIncidents: [],
      products: [],
      users: [],
      stats: {
        totalPhysicalIncidents: 0,
        totalCryptoIncidents: 0,
        totalProducts: 0,
        totalFundsLost: 0,
        totalUsers: 0,
      },
    };

    // 1. Fetch Physical Incidents with coordinates
    if (includePhysical) {
      const { data: physicalIncidents, error: physicalError } = await supabase
        .from("physical_incidents")
        .select(`
          id,
          slug,
          title,
          incident_type,
          date,
          location_city,
          location_country,
          location_coordinates,
          severity_score,
          opsec_risk_level,
          amount_stolen_usd,
          verified,
          status
        `)
        .in("status", ["confirmed", "resolved", "unresolved"])
        .eq("verified", true)
        .not("location_coordinates", "is", null);

      if (!physicalError && physicalIncidents) {
        // PostgreSQL POINT is returned as "(x,y)" string, we need to parse it
        mapData.physicalIncidents = physicalIncidents.map((inc) => {
          let coordinates = null;

          // Parse PostgreSQL POINT format: "(longitude,latitude)"
          if (inc.location_coordinates) {
            const match = inc.location_coordinates.match(/\(([^,]+),([^)]+)\)/);
            if (match) {
              coordinates = {
                lat: parseFloat(match[2]),
                lng: parseFloat(match[1]),
              };
            }
          }

          return {
            id: inc.id,
            slug: inc.slug,
            title: inc.title,
            type: "physical",
            incidentType: inc.incident_type,
            date: inc.date,
            location: {
              city: inc.location_city,
              country: inc.location_country,
              coordinates,
            },
            severity: inc.severity_score,
            riskLevel: inc.opsec_risk_level,
            amountLost: inc.amount_stolen_usd,
            verified: inc.verified,
          };
        }).filter(inc => inc.location.coordinates !== null);

        mapData.stats.totalPhysicalIncidents = mapData.physicalIncidents.length;
        mapData.stats.totalFundsLost += mapData.physicalIncidents.reduce(
          (sum, inc) => sum + (inc.amountLost || 0),
          0
        );
      }
    }

    // 2. Fetch Crypto/Security Incidents
    // These don't have coordinates directly, but we can get them from affected products
    if (includeCrypto) {
      const { data: cryptoIncidents, error: cryptoError } = await supabase
        .from("security_incidents")
        .select(`
          id,
          incident_id,
          title,
          incident_type,
          incident_date,
          severity,
          funds_lost_usd,
          users_affected,
          status,
          affected_product_ids
        `)
        .eq("is_published", true)
        .not("affected_product_ids", "is", null)
        .limit(500);

      if (!cryptoError && cryptoIncidents) {
        // Get unique product IDs
        const productIds = [
          ...new Set(cryptoIncidents.flatMap((inc) => inc.affected_product_ids || [])),
        ];

        // Fetch products with headquarters info
        const { data: products } = await supabase
          .from("products")
          .select("id, name, slug, headquarters, country_origin")
          .in("id", productIds)
          .not("country_origin", "is", null);

        // Create a map of product locations
        const productLocations = {};
        if (products) {
          products.forEach((product) => {
            if (product.country_origin) {
              productLocations[product.id] = {
                country: product.country_origin,
                city: product.headquarters,
              };
            }
          });
        }

        // Map crypto incidents to locations via products
        // Group by unique location to avoid too many markers
        const locationMap = new Map();

        cryptoIncidents.forEach((inc) => {
          const productIds = inc.affected_product_ids || [];
          productIds.forEach((productId) => {
            const location = productLocations[productId];
            if (location && location.country) {
              const key = location.country;
              if (!locationMap.has(key)) {
                locationMap.set(key, {
                  country: location.country,
                  city: location.city,
                  incidents: [],
                });
              }
              locationMap.get(key).incidents.push({
                id: inc.id,
                incidentId: inc.incident_id,
                title: inc.title,
                incidentType: inc.incident_type,
                date: inc.incident_date,
                severity: inc.severity,
                fundsLost: inc.funds_lost_usd,
                usersAffected: inc.users_affected,
                status: inc.status,
              });
            }
          });
        });

        // Convert to array with approximate country coordinates
        mapData.cryptoIncidents = Array.from(locationMap.values()).map((loc) => ({
          type: "crypto",
          location: {
            country: loc.country,
            city: loc.city,
            // We'll need to geocode country codes on the frontend
            // For now, we'll let the frontend handle this
          },
          incidents: loc.incidents,
          totalFundsLost: loc.incidents.reduce((sum, inc) => sum + (inc.fundsLost || 0), 0),
          count: loc.incidents.length,
        }));

        mapData.stats.totalCryptoIncidents = cryptoIncidents.length;
        mapData.stats.totalFundsLost += mapData.cryptoIncidents.reduce(
          (sum, loc) => sum + loc.totalFundsLost,
          0
        );
      }
    }

    // 3. Fetch ALL Products with headquarters, safe_score, and logo (no limit)
    // Supabase default limit is 1000, so we need to fetch in batches or use range
    if (includeProducts) {
      // First get the count
      const { count: totalProductCount } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true });

      // Fetch all products (Supabase max is 1000 per request, so we paginate if needed)
      let allProducts = [];
      const pageSize = 1000;
      const totalPages = Math.ceil((totalProductCount || 0) / pageSize);

      for (let page = 0; page < totalPages; page++) {
        const { data: pageProducts, error: pageError } = await supabase
          .from("products")
          .select(`
            id,
            slug,
            name,
            media,
            headquarters,
            country_origin,
            countries_operating,
            product_types (
              category
            ),
            safe_scoring_results (
              note_finale
            )
          `)
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (pageError) {
          console.error(`Error fetching products page ${page}:`, pageError);
          break;
        }

        if (pageProducts) {
          allProducts = [...allProducts, ...pageProducts];
        }
      }

      const products = allProducts;
      const totalCount = totalProductCount;

      console.log(`📦 Fetched ${products.length} products total (expected: ${totalCount})`);

      if (products && products.length > 0) {

        // Group by country to reduce marker count
        // Products can now appear in multiple countries via countries_operating
        const countryMap = new Map();

        products.forEach((product) => {
          // Extract logo from media (array of {url, type} objects)
          let logo = null;
          if (product.media && Array.isArray(product.media) && product.media.length > 0) {
            // Find first image in media array
            const imageMedia = product.media.find(m => m.type === 'image' || m.url);
            if (imageMedia) {
              logo = imageMedia.url;
            }
          } else if (typeof product.media === 'string') {
            logo = product.media;
          }

          // Get score from safe_scoring_results relation
          const safeScore = product.safe_scoring_results?.[0]?.note_finale ||
                           product.safe_scoring_results?.note_finale || null;

          // Get category from product_types relation
          const category = product.product_types?.category ||
                          product.product_types?.[0]?.category || null;

          const productData = {
            id: product.id,
            slug: product.slug,
            name: product.name,
            logo,
            safeScore,
            category,
            isMultiCountry: product.countries_operating && product.countries_operating.length > 1,
          };

          // Get all countries where this product operates
          let operatingCountries = [];

          // Use countries_operating if available and has items
          if (product.countries_operating && product.countries_operating.length > 0) {
            operatingCountries = product.countries_operating;
          }
          // Fallback to country_origin if no countries_operating
          else if (product.country_origin) {
            operatingCountries = [product.country_origin];
          }
          // Use "XX" for products without any country info
          else {
            operatingCountries = ["XX"];
          }

          // Add product to each country it operates in
          operatingCountries.forEach((country) => {
            if (!countryMap.has(country)) {
              countryMap.set(country, {
                country,
                city: product.headquarters || null,
                products: [],
              });
            }
            countryMap.get(country).products.push(productData);
          });
        });

        mapData.products = Array.from(countryMap.values()).map((loc) => ({
          type: "product",
          location: {
            country: loc.country,
            city: loc.city,
          },
          products: loc.products,
          count: loc.products.length,
        }));

        // Total unique products (not counting multi-country duplicates)
        mapData.stats.totalProducts = products.length;

        // Log distribution for debugging
        const topCountries = [...countryMap.entries()]
          .sort((a, b) => b[1].products.length - a[1].products.length)
          .slice(0, 5)
          .map(([country, data]) => `${country}: ${data.products.length}`);
        console.log(`📦 Top product locations: ${topCountries.join(', ')}`);
        console.log(`📦 Products with multi-country: ${products.filter(p => p.countries_operating?.length > 1).length}`);
      }
    }

    // 4. Fetch Users with country (for community map)
    if (includeUsers) {
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id, country, created_at")
        .not("country", "is", null)
        .limit(1000);

      // Generate consistent random seeds based on country code
      const seededRandom = (seed) => {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
      };

      const generateUserSeeds = (country, count) => {
        const seeds = [];
        const baseSeed = country.charCodeAt(0) * 1000 + country.charCodeAt(1);
        for (let i = 0; i < count; i++) {
          seeds.push({
            seed: seededRandom(baseSeed + i * 7),
            angle: seededRandom(baseSeed + i * 13) * 2 * Math.PI,
          });
        }
        return seeds;
      };

      // Demo users data (1021 fake members) - realistic crypto adoption for English site
      const demoUsers = [
        // North America (English-speaking)
        { country: "US", count: 198 },
        { country: "CA", count: 58 },
        { country: "MX", count: 12 },
        // Europe - English-speaking first
        { country: "GB", count: 112 },
        { country: "IE", count: 18 },
        // Europe - Western
        { country: "DE", count: 62 },
        { country: "FR", count: 38 },
        { country: "CH", count: 32 },
        { country: "NL", count: 28 },
        { country: "BE", count: 14 },
        { country: "AT", count: 10 },
        { country: "LU", count: 4 },
        // Europe - Southern
        { country: "ES", count: 22 },
        { country: "IT", count: 18 },
        { country: "PT", count: 12 },
        { country: "GR", count: 5 },
        // Europe - Northern
        { country: "SE", count: 14 },
        { country: "NO", count: 10 },
        { country: "DK", count: 9 },
        { country: "FI", count: 7 },
        // Europe - Eastern
        { country: "PL", count: 12 },
        { country: "CZ", count: 7 },
        { country: "RO", count: 5 },
        { country: "HU", count: 4 },
        { country: "UA", count: 6 },
        { country: "RU", count: 8 },
        // Asia - East
        { country: "JP", count: 42 },
        { country: "KR", count: 38 },
        { country: "HK", count: 18 },
        { country: "TW", count: 10 },
        { country: "CN", count: 6 },
        // Asia - Southeast (English common)
        { country: "SG", count: 35 },
        { country: "PH", count: 16 },
        { country: "MY", count: 12 },
        { country: "VN", count: 14 },
        { country: "TH", count: 12 },
        { country: "ID", count: 14 },
        // Asia - South & West
        { country: "IN", count: 42 },
        { country: "AE", count: 16 },
        { country: "IL", count: 8 },
        { country: "TR", count: 12 },
        // Oceania (English-speaking)
        { country: "AU", count: 52 },
        { country: "NZ", count: 12 },
        // South America
        { country: "BR", count: 28 },
        { country: "AR", count: 12 },
        { country: "CL", count: 6 },
        { country: "CO", count: 5 },
        // Africa (English common)
        { country: "NG", count: 18 },
        { country: "ZA", count: 14 },
        { country: "KE", count: 8 },
      ];

      if (!usersError && users && users.length > 0) {
        // Use real users if available
        const countryUserMap = new Map();

        users.forEach((user) => {
          const country = user.country;
          if (!countryUserMap.has(country)) {
            countryUserMap.set(country, {
              country,
              count: 0,
              userSeeds: [],
            });
          }
          const countryData = countryUserMap.get(country);
          countryData.count += 1;
          countryData.userSeeds.push({
            seed: Math.random(),
            angle: Math.random() * 2 * Math.PI,
          });
        });

        mapData.users = Array.from(countryUserMap.values()).map((loc) => ({
          type: "user",
          country: loc.country,
          count: loc.count,
          userSeeds: loc.userSeeds,
        }));

        mapData.stats.totalUsers = users.length;
      } else {
        // Use demo users for presentation
        mapData.users = demoUsers.map((demo) => ({
          type: "user",
          country: demo.country,
          count: demo.count,
          userSeeds: generateUserSeeds(demo.country, demo.count),
        }));

        mapData.stats.totalUsers = demoUsers.reduce((sum, d) => sum + d.count, 0);
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: mapData,
        _note: "Coordinates for crypto incidents and products are approximated by country",
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching map data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
