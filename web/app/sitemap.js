import { supabase, isSupabaseConfigured } from "@/libs/supabase";

export default async function sitemap() {
  const baseUrl = "https://safescoring.io";

  // Static pages
  const staticPages = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: `${baseUrl}/products`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/methodology`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/certification`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/claim`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/blog`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/privacy-policy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/tos`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    // New marketing pages
    { url: `${baseUrl}/compare`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/leaderboard`, lastModified: new Date(), changeFrequency: "daily", priority: 0.7 },
    { url: `${baseUrl}/badge`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/api-docs`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/partners`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/press`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
  ];

  // Dynamic product pages
  let productPages = [];
  let comparisonPages = [];
  let categoryPages = [];

  if (isSupabaseConfigured()) {
    try {
      const { data: products } = await supabase
        .from("products")
        .select("slug, updated_at")
        .not("slug", "is", null);

      if (products) {
        // Product detail pages
        productPages = products.map((product) => ({
          url: `${baseUrl}/products/${product.slug}`,
          lastModified: product.updated_at ? new Date(product.updated_at) : new Date(),
          changeFrequency: "weekly",
          priority: 0.8,
        }));

        // Generate comparison pages for top products
        const topProducts = products.slice(0, 20);
        for (let i = 0; i < Math.min(topProducts.length, 10); i++) {
          for (let j = i + 1; j < Math.min(topProducts.length, 10); j++) {
            comparisonPages.push({
              url: `${baseUrl}/compare/${topProducts[i].slug}/${topProducts[j].slug}`,
              lastModified: new Date(),
              changeFrequency: "weekly",
              priority: 0.6,
            });
          }
        }
      }

      // Category pages
      const { data: types } = await supabase
        .from("product_types")
        .select("slug");

      if (types) {
        categoryPages = types.map((type) => ({
          url: `${baseUrl}/products?type=${type.slug}`,
          lastModified: new Date(),
          changeFrequency: "daily",
          priority: 0.7,
        }));
      }
    } catch (error) {
      console.error("Error fetching products for sitemap:", error);
    }
  }

  return [...staticPages, ...productPages, ...comparisonPages, ...categoryPages];
}
