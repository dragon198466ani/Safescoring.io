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
  ];

  // Dynamic product pages
  let productPages = [];
  if (isSupabaseConfigured()) {
    try {
      const { data: products } = await supabase
        .from("products")
        .select("slug, updated_at")
        .not("slug", "is", null);

      if (products) {
        productPages = products.map((product) => ({
          url: `${baseUrl}/products/${product.slug}`,
          lastModified: product.updated_at ? new Date(product.updated_at) : new Date(),
          changeFrequency: "weekly",
          priority: 0.8,
        }));
      }
    } catch (error) {
      console.error("Error fetching products for sitemap:", error);
    }
  }

  // Dynamic blog pages (if you have them)
  // Add similar logic for blog posts

  return [...staticPages, ...productPages];
}
