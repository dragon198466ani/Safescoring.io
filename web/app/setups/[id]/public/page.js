import { supabaseAdmin } from "@/libs/supabase";
import Link from "next/link";

export const revalidate = 60;

const PILLAR_COLORS = { S: "#22c55e", A: "#f59e0b", F: "#3b82f6", E: "#8b5cf6" };

const getScoreColor = (score) => {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-amber-400";
  return "text-red-400";
};

async function getPublicSetup(setupId) {
  if (!supabaseAdmin) return null;

  const { data: setup } = await supabaseAdmin
    .from("user_setups")
    .select("id, name, products, combined_score, is_public, created_at")
    .eq("id", setupId)
    .eq("is_public", true)
    .single();

  if (!setup) return null;

  // Get product details
  const productIds = (setup.products || [])
    .map((p) => (typeof p === "object" ? p.id || p.product_id : p))
    .filter(Boolean);

  if (productIds.length === 0) return { setup, products: [] };

  const [productsRes, scoresRes] = await Promise.all([
    supabaseAdmin
      .from("products")
      .select("id, name, slug, product_types:type_id (name)")
      .in("id", productIds),
    supabaseAdmin
      .from("safe_scoring_results")
      .select("product_id, note_finale")
      .in("product_id", productIds),
  ]);

  const scoreMap = {};
  (scoresRes.data || []).forEach((s) => {
    scoreMap[s.product_id] = Math.round(s.note_finale || 0);
  });

  const products = (productsRes.data || []).map((p) => ({
    ...p,
    score: scoreMap[p.id] || 0,
  }));

  return { setup, products };
}

export default async function PublicSetupPage({ params }) {
  const { id } = await params;
  const data = await getPublicSetup(id);

  if (!data) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Setup Not Found</h1>
          <p className="text-base-content/60 mb-4">This setup doesn&apos;t exist or is not public.</p>
          <Link href="/" className="btn btn-primary">Go Home</Link>
        </div>
      </div>
    );
  }

  const { setup, products } = data;
  const score = setup.combined_score?.total || 0;

  return (
    <div className="min-h-screen bg-base-100">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Brand header */}
        <div className="text-center mb-8">
          <Link href="/" className="text-sm font-bold text-primary">SafeScoring.io</Link>
          <p className="text-xs text-base-content/40 mt-1">Crypto Security Scoring Platform</p>
        </div>

        {/* Setup card */}
        <div className="rounded-2xl bg-base-200 border border-base-300 overflow-hidden">
          {/* Score header */}
          <div className="p-8 text-center border-b border-base-300 bg-gradient-to-b from-base-200 to-base-300/30">
            <h1 className="text-2xl font-bold mb-4">{setup.name || "Security Setup"}</h1>

            {/* Score gauge */}
            <div className="relative w-32 h-32 mx-auto">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="6" className="text-base-300" />
                <circle
                  cx="50" cy="50" r="42" fill="none" strokeWidth="6" strokeLinecap="round"
                  stroke={score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444"}
                  strokeDasharray={`${(score / 100) * 264} 264`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-3xl font-black ${getScoreColor(score)}`}>{score}</span>
                <span className="text-xs text-base-content/50">SAFE Score</span>
              </div>
            </div>

            {/* Pillar scores */}
            {setup.combined_score?.S && (
              <div className="flex justify-center gap-4 mt-6">
                {["S", "A", "F", "E"].map((key) => (
                  <div key={key} className="text-center">
                    <div className="text-lg font-bold" style={{ color: PILLAR_COLORS[key] }}>
                      {setup.combined_score[key] || 0}
                    </div>
                    <div className="text-xs text-base-content/40">{key}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Products list */}
          <div className="p-6">
            <h3 className="font-semibold text-sm text-base-content/60 mb-3">
              {products.length} Product{products.length !== 1 ? "s" : ""} in Setup
            </h3>
            <div className="space-y-2">
              {products.map((p) => (
                <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg bg-base-300/30">
                  <div className="w-8 h-8 rounded-lg bg-base-300 flex items-center justify-center text-xs font-bold text-primary">
                    {p.name?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{p.name}</p>
                    <p className="text-xs text-base-content/50">{p.product_types?.name || "Product"}</p>
                  </div>
                  <span className={`font-bold text-sm ${getScoreColor(p.score)}`}>{p.score}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="p-6 border-t border-base-300 text-center bg-gradient-to-b from-transparent to-primary/5">
            <p className="text-sm text-base-content/60 mb-3">
              Build your own secure crypto setup
            </p>
            <Link href="/dashboard/setups" className="btn btn-primary btn-sm">
              Create Your Setup
            </Link>
          </div>
        </div>

        <div className="text-center mt-6">
          <p className="text-xs text-base-content/30">
            Powered by SafeScoring.io &bull; 916 norms, 0 opinion, 1 score
          </p>
        </div>
      </div>
    </div>
  );
}
