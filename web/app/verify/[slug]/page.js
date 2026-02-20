/**
 * Public Certification Verification Page
 *
 * Allows anyone to verify the authenticity of a SafeScoring certification.
 * Shows certificate details, current score, and evaluation history.
 */

import { Suspense } from "react";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { notFound } from "next/navigation";
import Link from "next/link";

export async function generateMetadata({ params }) {
  const { slug } = await params;

  if (!isSupabaseConfigured()) {
    return { title: "Verify Certification - SafeScoring" };
  }

  const { data: product } = await supabase
    .from("products")
    .select("name")
    .eq("slug", slug)
    .single();

  if (!product) {
    return { title: "Certificate Not Found - SafeScoring" };
  }

  return {
    title: `Verify ${product.name} Certification - SafeScoring`,
    description: `Verify the authenticity of ${product.name}'s SafeScoring certification and view current security scores.`,
  };
}

export default async function VerifyPage({ params }) {
  const { slug } = await params;

  if (!isSupabaseConfigured()) {
    return <VerificationError message="Service temporarily unavailable" />;
  }

  // Get product
  const { data: product } = await supabase
    .from("products")
    .select("id, name, slug, logo_url, product_type")
    .eq("slug", slug)
    .single();

  if (!product) {
    notFound();
  }

  // Get certification
  const { data: certification } = await supabase
    .from("certification_applications")
    .select(`
      id,
      tier,
      status,
      certificate_number,
      certificate_issued_at,
      certificate_expires_at,
      final_score,
      pillar_scores,
      company_name,
      last_evaluated_at
    `)
    .eq("product_id", product.id)
    .in("status", ["approved", "revoked"])
    .order("certificate_issued_at", { ascending: false })
    .limit(1)
    .single();

  // Get evaluation history
  const { data: evaluations } = await supabase
    .from("certification_evaluations")
    .select("score, pillar_scores, evaluated_at, evaluation_type")
    .eq("certification_id", certification?.id)
    .order("evaluated_at", { ascending: false })
    .limit(10);

  // Get current score
  const { data: currentScore } = await supabase
    .from("safe_scoring_results")
    .select("note_finale, score_s, score_a, score_f, score_e, calculated_at")
    .eq("product_id", product.id)
    .order("calculated_at", { ascending: false })
    .limit(1)
    .single();

  const isValid = certification?.status === "approved" &&
    new Date(certification.certificate_expires_at) > new Date();

  return (
    <main className="min-h-screen bg-base-200 py-12">
      <div className="container mx-auto px-4 max-w-3xl">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Certificate Verification</h1>
          <p className="text-base-content/70">
            Verify the authenticity of SafeScoring certifications
          </p>
        </div>

        {/* Verification Result */}
        <div className={`card shadow-xl mb-8 ${isValid ? 'bg-success/10 border-2 border-success' : 'bg-error/10 border-2 border-error'}`}>
          <div className="card-body">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${isValid ? 'bg-success text-success-content' : 'bg-error text-error-content'}`}>
                {isValid ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
              <div>
                <h2 className={`text-2xl font-bold ${isValid ? 'text-success' : 'text-error'}`}>
                  {isValid ? 'VALID CERTIFICATE' : 'INVALID CERTIFICATE'}
                </h2>
                <p className="text-base-content/70">
                  {isValid
                    ? 'This certification is authentic and currently active'
                    : certification?.status === 'revoked'
                      ? 'This certification has been revoked'
                      : 'No active certification found for this product'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Product Info */}
        <div className="card bg-base-100 shadow-xl mb-8">
          <div className="card-body">
            <div className="flex items-center gap-4 mb-4">
              {product.logo_url ? (
                <img
                  src={product.logo_url}
                  alt={product.name}
                  className="w-16 h-16 rounded-lg object-contain bg-base-200 p-2"
                />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-base-200 flex items-center justify-center">
                  <span className="text-2xl font-bold text-base-content/30">
                    {product.name.charAt(0)}
                  </span>
                </div>
              )}
              <div>
                <h3 className="text-xl font-bold">{product.name}</h3>
                <p className="text-base-content/70 capitalize">{product.product_type?.replace(/_/g, ' ')}</p>
              </div>
            </div>

            {certification && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div className="stat bg-base-200 rounded-lg p-4">
                  <div className="stat-title text-xs">Certificate #</div>
                  <div className="stat-value text-lg font-mono">
                    {certification.certificate_number || 'N/A'}
                  </div>
                </div>
                <div className="stat bg-base-200 rounded-lg p-4">
                  <div className="stat-title text-xs">Tier</div>
                  <div className="stat-value text-lg capitalize">
                    <TierBadge tier={certification.tier} />
                  </div>
                </div>
                <div className="stat bg-base-200 rounded-lg p-4">
                  <div className="stat-title text-xs">Issued</div>
                  <div className="stat-value text-lg">
                    {new Date(certification.certificate_issued_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="stat bg-base-200 rounded-lg p-4">
                  <div className="stat-title text-xs">Expires</div>
                  <div className="stat-value text-lg">
                    {new Date(certification.certificate_expires_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Current Score */}
        {currentScore && (
          <div className="card bg-base-100 shadow-xl mb-8">
            <div className="card-body">
              <h3 className="card-title">Current SafeScore</h3>
              <p className="text-sm text-base-content/70 mb-4">
                Last updated: {new Date(currentScore.calculated_at).toLocaleString()}
              </p>

              <div className="flex items-center justify-center mb-6">
                <div className="radial-progress text-primary" style={{"--value": currentScore.note_finale, "--size": "8rem", "--thickness": "8px"}} role="progressbar">
                  <span className="text-3xl font-bold">{Math.round(currentScore.note_finale)}</span>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <PillarScore label="Security" value={currentScore.score_s} color="error" />
                <PillarScore label="Accessibility" value={currentScore.score_a} color="warning" />
                <PillarScore label="Fidelity" value={currentScore.score_f} color="info" />
                <PillarScore label="Ecosystem" value={currentScore.score_e} color="success" />
              </div>
            </div>
          </div>
        )}

        {/* Evaluation History */}
        {evaluations && evaluations.length > 0 && (
          <div className="card bg-base-100 shadow-xl mb-8">
            <div className="card-body">
              <h3 className="card-title">Evaluation History</h3>
              <div className="overflow-x-auto">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Score</th>
                      <th>Type</th>
                      <th>S</th>
                      <th>A</th>
                      <th>F</th>
                      <th>E</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evaluations.map((eval_, idx) => (
                      <tr key={idx}>
                        <td>{new Date(eval_.evaluated_at).toLocaleDateString()}</td>
                        <td className="font-bold">{Math.round(eval_.score)}</td>
                        <td className="capitalize">{eval_.evaluation_type}</td>
                        <td>{eval_.pillar_scores?.S || '-'}</td>
                        <td>{eval_.pillar_scores?.A || '-'}</td>
                        <td>{eval_.pillar_scores?.F || '-'}</td>
                        <td>{eval_.pillar_scores?.E || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-center gap-4">
          <Link href={`/products/${product.slug}`} className="btn btn-primary">
            View Full Product Page
          </Link>
          <Link href="/certification" className="btn btn-outline">
            Get Certified
          </Link>
        </div>

        {/* Verification Info */}
        <div className="mt-8 text-center text-sm text-base-content/50">
          <p>Verification performed on {new Date().toLocaleString()}</p>
          <p className="mt-1">
            Questions? Contact{' '}
            <a href="mailto:certification@safescoring.io" className="link">
              certification@safescoring.io
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}

function TierBadge({ tier }) {
  const colors = {
    starter: 'badge-info',
    verified: 'badge-secondary',
    enterprise: 'badge-warning',
  };

  const icons = {
    starter: '★',
    verified: '★★',
    enterprise: '★★★',
  };

  return (
    <span className={`badge ${colors[tier] || 'badge-ghost'} gap-1`}>
      <span>{icons[tier] || ''}</span>
      <span className="capitalize">{tier}</span>
    </span>
  );
}

function PillarScore({ label, value, color }) {
  return (
    <div className="text-center">
      <div className={`text-2xl font-bold text-${color}`}>
        {value ? Math.round(value) : '-'}
      </div>
      <div className="text-xs text-base-content/70">{label}</div>
    </div>
  );
}

function VerificationError({ message }) {
  return (
    <main className="min-h-screen bg-base-200 flex items-center justify-center">
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body text-center">
          <h2 className="text-xl font-bold text-error">Verification Error</h2>
          <p>{message}</p>
          <Link href="/" className="btn btn-primary mt-4">
            Return Home
          </Link>
        </div>
      </div>
    </main>
  );
}
