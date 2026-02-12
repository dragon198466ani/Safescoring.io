import Link from "next/link";
import { auth } from "@/libs/auth";
import { supabaseAdmin } from "@/libs/supabase";
import SetupDetailClient from "@/components/SetupDetailClient";

export const dynamic = "force-dynamic";

async function getSetupData(setupId, userId) {
  if (!supabaseAdmin) return null;

  // Fetch setup
  const { data: setup, error } = await supabaseAdmin
    .from("user_setups")
    .select("*")
    .eq("id", setupId)
    .eq("user_id", userId)
    .single();

  if (error || !setup) return null;

  // Extract product IDs
  const productIds = (setup.products || [])
    .map((p) => (typeof p === "object" ? p.id || p.product_id : p))
    .filter(Boolean);

  // Fetch product details and scores in parallel
  const [productsResult, scoresResult] = await Promise.all([
    supabaseAdmin
      .from("products")
      .select("id, name, slug, product_types:type_id (name, code)")
      .in("id", productIds),
    supabaseAdmin
      .from("safe_scoring_results")
      .select("product_id, note_finale, score_s, score_a, score_f, score_e")
      .in("product_id", productIds),
  ]);

  // Build product map
  const scoreMap = {};
  (scoresResult.data || []).forEach((s) => {
    scoreMap[s.product_id] = s;
  });

  const products = (productsResult.data || []).map((p) => {
    const scores = scoreMap[p.id] || {};
    const setupProduct = (setup.products || []).find(
      (sp) => (typeof sp === "object" ? sp.id || sp.product_id : sp) === p.id
    );
    return {
      ...p,
      role: typeof setupProduct === "object" ? setupProduct.role : "other",
      score: Math.round(scores.note_finale || 0),
      score_s: Math.round(scores.score_s || 0),
      score_a: Math.round(scores.score_a || 0),
      score_f: Math.round(scores.score_f || 0),
      score_e: Math.round(scores.score_e || 0),
    };
  });

  // Calculate combined score
  let totalWeight = 0;
  let weightedScore = 0;
  let pillarWeighted = { S: 0, A: 0, F: 0, E: 0 };

  products.forEach((p) => {
    const weight = p.role === "wallet" ? 2 : 1;
    totalWeight += weight;
    weightedScore += p.score * weight;
    pillarWeighted.S += p.score_s * weight;
    pillarWeighted.A += p.score_a * weight;
    pillarWeighted.F += p.score_f * weight;
    pillarWeighted.E += p.score_e * weight;
  });

  const combinedScore = totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0;
  const pillarScores = totalWeight > 0
    ? {
        S: Math.round(pillarWeighted.S / totalWeight),
        A: Math.round(pillarWeighted.A / totalWeight),
        F: Math.round(pillarWeighted.F / totalWeight),
        E: Math.round(pillarWeighted.E / totalWeight),
      }
    : { S: 0, A: 0, F: 0, E: 0 };

  return {
    setup: {
      id: setup.id,
      name: setup.name || "My Setup",
      description: setup.description,
      created_at: setup.created_at,
      is_public: setup.is_public || false,
    },
    products,
    combinedScore,
    pillarScores,
  };
}

export default async function SetupDetailPage({ params }) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user?.id) {
    return (
      <div className="text-center py-12">
        <p className="text-base-content/60">Please sign in to view your setup.</p>
        <Link href="/api/auth/signin" className="btn btn-primary mt-4">Sign In</Link>
      </div>
    );
  }

  const data = await getSetupData(id, session.user.id);

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-base-content/60 text-lg">Setup not found</p>
        <Link href="/dashboard/setups" className="btn btn-primary mt-4">Back to Setups</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="text-sm breadcrumbs">
        <ul>
          <li><Link href="/dashboard">Dashboard</Link></li>
          <li><Link href="/dashboard/setups">Setups</Link></li>
          <li className="text-base-content/60">{data.setup.name}</li>
        </ul>
      </div>

      {/* Pass data to client component for interactivity */}
      <SetupDetailClient
        setup={data.setup}
        products={data.products}
        combinedScore={data.combinedScore}
        pillarScores={data.pillarScores}
      />
    </div>
  );
}
