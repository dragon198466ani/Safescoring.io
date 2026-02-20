import { notFound } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductLogo from "@/components/ProductLogo";

// Fetch shared stack data
async function getSharedStack(token) {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/stack/share/${token}`, {
      cache: "no-store", // Always get fresh data for shared stacks
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    return data.setup;
  } catch (error) {
    console.error("Error fetching shared stack:", error);
    return null;
  }
}

const getScoreColor = (score) => {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-amber-400";
  return "text-red-400";
};

const getScoreBg = (score) => {
  if (score >= 80) return "from-green-500/20 to-green-500/5 border-green-500/30";
  if (score >= 60) return "from-amber-500/20 to-amber-500/5 border-amber-500/30";
  return "from-red-500/20 to-red-500/5 border-red-500/30";
};

const getScoreLabel = (score) => {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  return "At Risk";
};

// Score circle component
function ScoreCircle({ score, size = 140 }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-base-300"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="url(#scoreGradient)"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
          />
          <defs>
            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-4xl font-bold ${getScoreColor(score)}`}>
            {score}
          </span>
          <span className="text-xs text-base-content/50">SAFE</span>
        </div>
      </div>
      <div className="mt-3 text-center">
        <div className={`text-lg font-semibold ${getScoreColor(score)}`}>
          {getScoreLabel(score)}
        </div>
        <div className="text-xs text-base-content/50">Combined Score</div>
      </div>
    </div>
  );
}

export async function generateMetadata({ params }) {
  const { token } = await params;
  const stack = await getSharedStack(token);

  if (!stack) {
    return { title: "Stack Not Found | SafeScoring" };
  }

  const title = `${stack.name} - Shared Stack | SafeScoring`;
  const description = stack.description ||
    `Check out this crypto security stack with a combined SAFE score of ${stack.combinedScore?.note_finale || 'N/A'}/100`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
  };
}

export default async function SharedStackPage({ params }) {
  const { token } = await params;
  const stack = await getSharedStack(token);

  if (!stack) {
    notFound();
  }

  const { combinedScore, productDetails } = stack;

  return (
    <>
      <Header />
      <main className="min-h-screen pt-24 pb-16 px-6 hero-bg">
        <div className="max-w-5xl mx-auto">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-base-content/60 mb-8">
            <Link href="/" className="hover:text-base-content">Home</Link>
            <span>/</span>
            <span className="text-base-content">Shared Stack</span>
          </div>

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6 text-primary">
                <path d="M10 9a3 3 0 100-6 3 3 0 000 6zM6 8a2 2 0 11-4 0 2 2 0 014 0zM1.49 15.326a.78.78 0 01-.358-.442 3 3 0 014.308-3.516 6.484 6.484 0 00-1.905 3.959c-.023.222-.014.442.025.654a4.97 4.97 0 01-2.07-.655zM16.44 15.98a4.97 4.97 0 002.07-.654.78.78 0 00.357-.442 3 3 0 00-4.308-3.517 6.484 6.484 0 011.907 3.96 2.32 2.32 0 01-.026.654zM18 8a2 2 0 11-4 0 2 2 0 014 0zM5.304 16.19a.844.844 0 01-.277-.71 5 5 0 019.947 0 .843.843 0 01-.277.71A6.975 6.975 0 0110 18a6.974 6.974 0 01-4.696-1.81z" />
              </svg>
              <h1 className="text-3xl font-bold">{stack.name}</h1>
            </div>
            {stack.description && (
              <p className="text-base-content/70">{stack.description}</p>
            )}
            <div className="flex items-center gap-4 mt-4">
              <span className="badge badge-outline">
                {productDetails.length} {productDetails.length === 1 ? 'product' : 'products'}
              </span>
              <span className="text-xs text-base-content/50">
                Shared on {new Date(stack.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Combined Score */}
          {combinedScore && (
            <div className={`rounded-2xl p-8 bg-gradient-to-br border mb-8 ${getScoreBg(combinedScore.note_finale)}`}>
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div className="flex justify-center">
                  <ScoreCircle score={combinedScore.note_finale} />
                </div>

                <div>
                  <h2 className="text-xl font-bold mb-4">SAFE Score Breakdown</h2>
                  <div className="space-y-3">
                    {[
                      { code: "S", name: "Security", score: combinedScore.score_s, color: "#22c55e" },
                      { code: "A", name: "Anonymity", score: combinedScore.score_a, color: "#f59e0b" },
                      { code: "F", name: "Fidelity", score: combinedScore.score_f, color: "#3b82f6" },
                      { code: "E", name: "Efficiency", score: combinedScore.score_e, color: "#8b5cf6" },
                    ].map(pillar => (
                      <div key={pillar.code} className="flex items-center gap-3">
                        <div className="text-lg font-black w-6" style={{ color: pillar.color }}>
                          {pillar.code}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">{pillar.name}</span>
                            <span className={`text-sm font-bold ${getScoreColor(pillar.score)}`}>
                              {pillar.score}
                            </span>
                          </div>
                          <div className="w-full h-2 bg-base-300 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${pillar.score}%`,
                                backgroundColor: pillar.color,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {combinedScore.weakest_pillar && combinedScore.weakest_pillar.score < 80 && (
                    <div className="alert alert-warning mt-4">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                        <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <h4 className="font-bold text-sm">Weakest pillar</h4>
                        <p className="text-xs">
                          {combinedScore.weakest_pillar.name} ({combinedScore.weakest_pillar.code}): {combinedScore.weakest_pillar.score}/100
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Products in Stack */}
          <div className="bg-base-200 rounded-2xl border border-base-300 p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">Products in This Stack</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {productDetails.map(product => (
                <Link
                  key={product.id}
                  href={`/products/${product.slug}`}
                  className="p-4 rounded-xl bg-base-300/50 border border-base-content/10 hover:border-primary/50 transition-all group"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <ProductLogo logoUrl={product.logo_url} name={product.name} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate group-hover:text-primary transition-colors">
                        {product.name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-base-content/60">
                        <span>{product.product_types?.name || 'Product'}</span>
                        {product.role && (
                          <>
                            <span>•</span>
                            <span className="capitalize">{product.role}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {product.scores && (
                      <div className={`text-2xl font-bold ${getScoreColor(product.scores.note_finale)}`}>
                        {Math.round(product.scores.note_finale)}
                      </div>
                    )}
                  </div>
                  {product.scores && (
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { code: "S", score: product.scores.score_s, color: "#22c55e" },
                        { code: "A", score: product.scores.score_a, color: "#f59e0b" },
                        { code: "F", score: product.scores.score_f, color: "#3b82f6" },
                        { code: "E", score: product.scores.score_e, color: "#8b5cf6" },
                      ].map(p => (
                        <div key={p.code} className="text-center">
                          <div className="text-xs text-base-content/50">{p.code}</div>
                          <div className={`text-sm font-bold ${getScoreColor(p.score)}`}>
                            {Math.round(p.score)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="rounded-xl bg-gradient-to-br from-primary/20 to-base-200 border border-base-300 p-8 text-center">
            <h2 className="text-2xl font-bold mb-2">Build Your Own Security Stack</h2>
            <p className="text-base-content/60 mb-6">
              Create and analyze your crypto security setup with real-time SAFE scores
            </p>
            <Link href="/dashboard/setups" className="btn btn-primary gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Create Your Stack
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
