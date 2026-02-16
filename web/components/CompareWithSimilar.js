import Link from "next/link";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import ProductLogo from "@/components/ProductLogo";
import { getFaviconUrl } from "@/libs/logo-utils";

const getScoreColor = (score) => {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-amber-400";
  return "text-red-400";
};

async function getSimilarProducts(typeId, currentSlug) {
  if (!isSupabaseConfigured() || !typeId) return [];

  try {
    // Get products of the same type with scores
    const { data: mappings } = await supabase
      .from("product_type_mapping")
      .select("product_id")
      .eq("type_id", typeId)
      .limit(20);

    if (!mappings || mappings.length === 0) return [];

    const productIds = mappings.map((m) => m.product_id);

    const { data: products } = await supabase
      .from("products")
      .select(`
        id, name, slug, url,
        safe_scoring_results!inner(note_finale)
      `)
      .in("id", productIds)
      .neq("slug", currentSlug)
      .not("safe_scoring_results.note_finale", "is", null)
      .limit(6);

    if (!products) return [];

    return products.map((p) => ({
      name: p.name,
      slug: p.slug,
      logoUrl: getFaviconUrl(p.url),
      score: Math.round(p.safe_scoring_results?.[0]?.note_finale || 0),
    }));
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error("Error fetching similar products:", error);
    return [];
  }
}

export default async function CompareWithSimilar({
  currentSlug,
  currentName,
  currentScore,
  typeId,
}) {
  const similar = await getSimilarProducts(typeId, currentSlug);

  if (similar.length === 0) return null;

  return (
    <div className="mb-12">
      <h2 className="text-xl font-bold mb-6">Compare with Similar Products</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {similar.slice(0, 6).map((product) => (
          <Link
            key={product.slug}
            href={`/compare/${currentSlug}/${product.slug}`}
            className="flex items-center gap-4 p-4 rounded-xl bg-base-200 border border-base-300 hover:border-primary/50 transition-all group"
          >
            <ProductLogo
              logoUrl={product.logoUrl}
              name={product.name}
              size="sm"
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                {currentName} vs {product.name}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs font-bold ${getScoreColor(currentScore)}`}>
                  {currentScore}
                </span>
                <span className="text-xs text-base-content/40">vs</span>
                <span className={`text-xs font-bold ${getScoreColor(product.score)}`}>
                  {product.score}
                </span>
              </div>
            </div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-4 h-4 text-base-content/30 group-hover:text-primary transition-colors"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.25 4.5l7.5 7.5-7.5 7.5"
              />
            </svg>
          </Link>
        ))}
      </div>
    </div>
  );
}
