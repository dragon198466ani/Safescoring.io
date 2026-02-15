import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";

export const revalidate = 3600;

export const metadata = {
  title: "Timestamped Predictions | SafeScoring",
  description:
    "Blockchain-timestamped security assessments. Predictions are committed to blockchain for transparency and methodology validation purposes.",
  keywords: [
    "crypto predictions",
    "security predictions",
    "blockchain verified",
    "methodology validation",
    "defi risk assessment",
  ],
};

async function getPredictions() {
  if (!isSupabaseConfigured()) {
    return { predictions: [], stats: null };
  }

  try {
    const { data: predictions } = await supabase
      .from("predictions")
      .select(`
        *,
        products (id, name, slug)
      `)
      .order("prediction_date", { ascending: false })
      .limit(50);

    const { data: stats } = await supabase
      .from("prediction_accuracy_stats")
      .select("*")
      .single();

    return {
      predictions: predictions || [],
      stats: stats || null,
    };
  } catch {
    return { predictions: [], stats: null };
  }
}


function getRiskColor(risk) {
  const colors = {
    CRITICAL: "text-error bg-error/20 border-error/30",
    HIGH: "text-orange-400 bg-orange-500/20 border-orange-500/30",
    MEDIUM: "text-warning bg-warning/20 border-warning/30",
    LOW: "text-success bg-success/20 border-success/30",
    MINIMAL: "text-success bg-success/20 border-success/30",
  };
  return colors[risk] || "text-base-content bg-base-200";
}

function getAccuracyBadge(accuracy) {
  const badges = {
    correct_positive: { text: "Correct", color: "badge-success" },
    correct_negative: { text: "Correct", color: "badge-success" },
    false_positive: { text: "False Positive", color: "badge-warning" },
    false_negative: { text: "Missed", color: "badge-error" },
  };
  return badges[accuracy] || { text: "Pending", color: "badge-ghost" };
}

export default async function PredictionsPage() {
  const { predictions, stats } = await getPredictions();

  const hasPredictions = predictions.length > 0 && stats;
  const accuracy = stats?.overall_accuracy_percent || 0;

  return (
    <>
      <Header />
      <main className="min-h-screen pt-24 pb-16 px-6 hero-bg">
        <div className="max-w-7xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-black mb-4">
              Methodology <span className="text-primary">Validation</span>
            </h1>
            <p className="text-xl text-base-content/70 max-w-2xl mx-auto mb-4">
              Every assessment is cryptographically committed to blockchain BEFORE events happen.
              These blockchain-committed assessments serve as methodology validation.
            </p>

            {/* Legal disclaimer — displayed BEFORE metrics */}
            <div className="max-w-2xl mx-auto mb-8 p-3 rounded-lg bg-warning/10 border border-warning/20">
              <p className="text-xs text-base-content/60">
                <strong>Disclaimer:</strong> For educational and research purposes only. Assessments do not constitute investment, financial, or security advice. Past validation rates do not guarantee future accuracy. Blockchain timestamps verify publication date only, not prediction accuracy. Always conduct your own research.
              </p>
            </div>

            {/* Accuracy Hero Stat — only show with real data */}
            {hasPredictions && (
              <div className="inline-flex items-center gap-6 bg-base-200 rounded-2xl p-6 border border-base-300">
                <div>
                  <div className="text-5xl font-black text-success">{accuracy.toFixed(1)}%</div>
                  <div className="text-sm text-base-content/60">Methodology Validation Rate</div>
                </div>
                <div className="h-16 w-px bg-base-300" />
                <div className="text-left">
                  <div className="text-2xl font-bold">{stats.completed_predictions || 0}</div>
                  <div className="text-sm text-base-content/60">Validated Predictions</div>
                </div>
              </div>
            )}
          </div>

          {/* How It Works */}
          <div className="bg-base-200 rounded-xl p-6 mb-10 border border-base-300">
            <h2 className="font-bold text-lg mb-4">How Timestamped Predictions Work</h2>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-3xl mb-2">1</div>
                <div className="font-semibold">Analyze</div>
                <div className="text-sm text-base-content/60">
                  We evaluate products across comprehensive security criteria
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-2">2</div>
                <div className="font-semibold">Predict</div>
                <div className="text-sm text-base-content/60">
                  Generate risk assessment with probability
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-2">3</div>
                <div className="font-semibold">Commit</div>
                <div className="text-sm text-base-content/60">
                  Hash published to blockchain BEFORE event
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-2">4</div>
                <div className="font-semibold">Verify</div>
                <div className="text-sm text-base-content/60">
                  Anyone can verify prediction was made in advance
                </div>
              </div>
            </div>
          </div>

          {/* Real data: show stats + predictions list */}
          {hasPredictions ? (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
                <div className="bg-base-200 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold">{stats.total_predictions || 0}</div>
                  <div className="text-xs text-base-content/60">Total Predictions</div>
                </div>
                <div className="bg-base-200 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-success">{stats.correct_positive || 0}</div>
                  <div className="text-xs text-base-content/60">Correct (High Risk)</div>
                </div>
                <div className="bg-base-200 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-success">{stats.correct_negative || 0}</div>
                  <div className="text-xs text-base-content/60">Correct (Low Risk)</div>
                </div>
                <div className="bg-base-200 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-warning">{stats.false_positive || 0}</div>
                  <div className="text-xs text-base-content/60">False Positives</div>
                </div>
                <div className="bg-base-200 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-error">{stats.false_negative || 0}</div>
                  <div className="text-xs text-base-content/60">Missed</div>
                </div>
              </div>

              {/* Predictions List */}
              <div className="space-y-4">
                <h2 className="text-2xl font-bold">Recent Predictions</h2>

                {predictions.map((pred) => {
                  const badge = getAccuracyBadge(pred.accuracy);
                  const isActive = pred.status === "active";

                  return (
                    <div
                      key={pred.id}
                      className="bg-base-200 rounded-xl p-6 border border-base-300 hover:border-primary/30 transition-colors"
                    >
                      <div className="flex flex-col md:flex-row md:items-center gap-4">
                        {/* Product & Risk */}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Link
                              href={`/products/${pred.products?.slug || ""}`}
                              className="text-lg font-bold hover:text-primary transition-colors"
                            >
                              {pred.products?.name || "Unknown Product"}
                            </Link>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold border ${getRiskColor(
                                pred.risk_level
                              )}`}
                            >
                              {pred.risk_level}
                            </span>
                            {!isActive && (
                              <span className={`badge ${badge.color}`}>{badge.text}</span>
                            )}
                          </div>

                          <div className="text-sm text-base-content/60 space-x-4">
                            <span>
                              Predicted:{" "}
                              {new Date(pred.prediction_date).toLocaleDateString(undefined, {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                            <span>SafeScore: {pred.safe_score_at_prediction}</span>
                            <span>Probability: {(pred.incident_probability * 100).toFixed(0)}%</span>
                          </div>
                        </div>

                        {/* Outcome */}
                        <div className="flex items-center gap-4">
                          {pred.incident_occurred !== null && (
                            <div className="text-center">
                              <div
                                className={`text-lg font-bold ${
                                  pred.incident_occurred ? "text-error" : "text-success"
                                }`}
                              >
                                {pred.incident_occurred ? "Incident" : "No Incident"}
                              </div>
                              <div className="text-xs text-base-content/50">Outcome</div>
                            </div>
                          )}

                          {isActive && (
                            <div className="text-center px-4 py-2 bg-primary/10 rounded-lg">
                              <div className="text-sm font-semibold text-primary">Active</div>
                              <div className="text-xs text-base-content/50">
                                Expires{" "}
                                {new Date(pred.expires_at).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </div>
                            </div>
                          )}

                          {/* Blockchain Proof */}
                          {pred.blockchain_tx_hash && (
                            <a
                              href={`https://polygonscan.com/tx/${pred.blockchain_tx_hash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-sm btn-outline"
                              title="View on blockchain"
                            >
                              Verify
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Commitment Hash */}
                      {pred.commitment_hash && (
                        <div className="mt-3 pt-3 border-t border-base-300">
                          <div className="text-xs text-base-content/40 font-mono">
                            Commitment: {pred.commitment_hash}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            /* No data: Coming Soon state */
            <div className="bg-base-200 rounded-2xl border border-base-300 p-12 text-center mb-10">
              <div className="text-6xl mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 mx-auto text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold mb-3">Launching Soon</h2>
              <p className="text-base-content/60 max-w-lg mx-auto mb-6">
                We are finalizing our first batch of cryptographically verified predictions.
                Each prediction will be committed to blockchain before events happen, providing
                transparent methodology validation.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link href="/methodology" className="btn btn-primary">
                  Learn Our Methodology
                </Link>
                <Link href="/products" className="btn btn-outline">
                  Browse Products
                </Link>
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="mt-12 rounded-xl bg-gradient-to-br from-primary/20 to-base-200 border border-base-300 p-8 text-center">
            <h2 className="text-2xl font-bold mb-3">Predictions You Can Verify</h2>
            <p className="text-base-content/70 mb-6 max-w-lg mx-auto">
              Our predictions will be committed to blockchain before outcomes are known.
              Verifiable, immutable, and transparent — helping validate SafeScoring&apos;s methodology over time.
            </p>
            <p className="text-xs text-base-content/40 max-w-lg mx-auto mb-4">
              For educational and research purposes only. Past methodology performance does not predict future results. Not financial or investment advice.
            </p>
            <Link href="/methodology" className="btn btn-primary">
              Learn Our Methodology
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
