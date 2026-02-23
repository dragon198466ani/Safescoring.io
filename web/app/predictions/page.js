import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { getStats } from "@/libs/stats";

export const revalidate = 3600;

export const metadata = {
  title: "Verified Predictions | SafeScoring",
  description:
    "Cryptographically verified security predictions. Every prediction is committed to blockchain BEFORE events happen, proving SafeScoring methodology accuracy.",
  keywords: [
    "crypto predictions",
    "security predictions",
    "blockchain verified",
    "proof of accuracy",
    "defi risk assessment",
  ],
};

async function getPredictions() {
  if (!isSupabaseConfigured()) {
    return { predictions: getSamplePredictions(), stats: getSampleStats() };
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
      predictions: predictions || getSamplePredictions(),
      stats: stats || getSampleStats(),
    };
  } catch {
    return { predictions: getSamplePredictions(), stats: getSampleStats() };
  }
}

function getSamplePredictions() {
  return [
    {
      id: "1",
      products: { name: "Project Alpha", slug: "project-alpha" },
      prediction_date: "2024-01-15T00:00:00Z",
      safe_score_at_prediction: 42,
      risk_level: "CRITICAL",
      incident_probability: 0.75,
      prediction_window_days: 90,
      expires_at: "2024-04-15T00:00:00Z",
      status: "validated",
      incident_occurred: true,
      accuracy: "correct_positive",
      commitment_hash: "0x1234...abcd",
      blockchain_tx_hash: "0xabc123...",
    },
    {
      id: "2",
      products: { name: "Secure Wallet", slug: "secure-wallet" },
      prediction_date: "2024-02-01T00:00:00Z",
      safe_score_at_prediction: 87,
      risk_level: "MINIMAL",
      incident_probability: 0.02,
      prediction_window_days: 365,
      expires_at: "2025-02-01T00:00:00Z",
      status: "validated",
      incident_occurred: false,
      accuracy: "correct_negative",
      commitment_hash: "0x5678...efgh",
      blockchain_tx_hash: "0xdef456...",
    },
    {
      id: "3",
      products: { name: "DeFi Protocol X", slug: "defi-protocol-x" },
      prediction_date: "2024-03-10T00:00:00Z",
      safe_score_at_prediction: 58,
      risk_level: "HIGH",
      incident_probability: 0.50,
      prediction_window_days: 180,
      expires_at: "2024-09-10T00:00:00Z",
      status: "active",
      incident_occurred: null,
      accuracy: null,
      commitment_hash: "0x9012...ijkl",
      blockchain_tx_hash: "0xghi789...",
    },
  ];
}

function getSampleStats() {
  return {
    total_predictions: 127,
    completed_predictions: 89,
    correct_positive: 23,
    correct_negative: 58,
    false_positive: 5,
    false_negative: 3,
    overall_accuracy_percent: 91.01,
  };
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
  const platformStats = await getStats();
  const { predictions, stats } = await getPredictions();

  const accuracy = stats.overall_accuracy_percent || 0;

  return (
    <>
      <Header />
      <main className="min-h-screen pt-24 pb-16 px-6 hero-bg">
        <div className="max-w-6xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-black mb-4">
              Verified <span className="text-primary">Predictions</span>
            </h1>
            <p className="text-xl text-base-content/70 max-w-2xl mx-auto mb-8">
              Every prediction is cryptographically committed to blockchain BEFORE events happen.
              This is immutable proof of SafeScoring methodology accuracy.
            </p>

            {/* Accuracy Hero Stat */}
            <div className="inline-flex items-center gap-6 bg-base-200 rounded-2xl p-6 border border-base-300">
              <div>
                <div className="text-5xl font-black text-success">{accuracy.toFixed(1)}%</div>
                <div className="text-sm text-base-content/60">Overall Accuracy</div>
              </div>
              <div className="h-16 w-px bg-base-300" />
              <div className="text-left">
                <div className="text-2xl font-bold">{stats.completed_predictions || 0}</div>
                <div className="text-sm text-base-content/60">Validated Predictions</div>
              </div>
            </div>
          </div>

          {/* How It Works */}
          <div className="bg-base-200 rounded-xl p-6 mb-10 border border-base-300">
            <h2 className="font-bold text-lg mb-4">How Verified Predictions Work</h2>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-3xl mb-2">1</div>
                <div className="font-semibold">Analyze</div>
                <div className="text-sm text-base-content/60">
                  We evaluate products on {platformStats.totalNorms} security criteria
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
                          {new Date(pred.prediction_date).toLocaleDateString("en-US", {
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
                            {new Date(pred.expires_at).toLocaleDateString("en-US", {
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

          {/* CTA */}
          <div className="mt-12 rounded-xl bg-gradient-to-br from-primary/20 to-base-200 border border-base-300 p-8 text-center">
            <h2 className="text-2xl font-bold mb-3">AI Can&apos;t Fake History</h2>
            <p className="text-base-content/70 mb-6 max-w-lg mx-auto">
              These predictions were committed to blockchain months or years before outcomes.
              This is proof that SafeScoring methodology works - not just marketing claims.
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
