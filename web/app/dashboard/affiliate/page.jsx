"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

/**
 * Affiliate Dashboard
 *
 * Features:
 * - Apply to become an affiliate
 * - View referral link and code
 * - Track clicks and conversions
 * - View earnings and request payouts
 */

export default function AffiliateDashboardPage() {
  const { data: session, status } = useSession();
  const [affiliate, setAffiliate] = useState(null);
  const [stats, setStats] = useState(null);
  const [payouts, setPayouts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);

  // Application form
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    website: "",
    payoutMethod: "crypto",
  });

  useEffect(() => {
    if (session?.user) {
      fetchData();
    }
  }, [session]);

  async function fetchData() {
    setLoading(true);
    try {
      // Fetch affiliate account
      const affRes = await fetch("/api/affiliate");
      if (affRes.ok) {
        const affData = await affRes.json();
        setAffiliate(affData.affiliate);

        // If approved, fetch stats and payouts
        if (affData.affiliate?.status === "approved") {
          const [statsRes, payoutsRes] = await Promise.all([
            fetch("/api/affiliate/stats?days=30"),
            fetch("/api/affiliate/payouts"),
          ]);

          if (statsRes.ok) setStats(await statsRes.json());
          if (payoutsRes.ok) setPayouts(await payoutsRes.json());
        }
      }
    } catch (error) {
      console.error("Error fetching affiliate data:", error);
    }
    setLoading(false);
  }

  async function handleApply(e) {
    e.preventDefault();
    setApplying(true);

    try {
      const res = await fetch("/api/affiliate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        fetchData();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to submit application");
      }
    } catch (error) {
      console.error("Error applying:", error);
      alert("Failed to submit application");
    }

    setApplying(false);
  }

  async function requestPayout() {
    if (!confirm("Request a payout for your available balance?")) return;

    try {
      const res = await fetch("/api/affiliate/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (res.ok) {
        alert("Payout request submitted!");
        fetchData();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to request payout");
      }
    } catch (error) {
      console.error("Error requesting payout:", error);
    }
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="card bg-base-100 shadow-xl max-w-md">
          <div className="card-body text-center">
            <h2 className="card-title justify-center">Sign In Required</h2>
            <p className="text-base-content/70">
              Please sign in to access the affiliate program.
            </p>
            <div className="card-actions justify-center mt-4">
              <Link href="/api/auth/signin" className="btn btn-primary h-12 min-h-0 touch-manipulation active:scale-[0.97] transition-transform">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Not an affiliate yet - show application form
  if (!affiliate) {
    return (
      <div className="min-h-screen bg-base-200 py-8">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h1 className="card-title text-2xl">Join the Affiliate Program</h1>
              <p className="text-base-content/70 mb-6">
                Earn 20% commission on every paying customer you refer to SafeScoring.
              </p>

              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="text-center p-4 bg-base-200 rounded-lg">
                  <div className="text-2xl font-bold text-primary">20%</div>
                  <div className="text-sm text-base-content/70">Commission</div>
                </div>
                <div className="text-center p-4 bg-base-200 rounded-lg">
                  <div className="text-2xl font-bold text-primary">30</div>
                  <div className="text-sm text-base-content/70">Day Cookie</div>
                </div>
                <div className="text-center p-4 bg-base-200 rounded-lg">
                  <div className="text-2xl font-bold text-primary">$50</div>
                  <div className="text-sm text-base-content/70">Min Payout</div>
                </div>
              </div>

              <form onSubmit={handleApply} className="space-y-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Name</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={session.user.name || "Your name"}
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Email</span>
                  </label>
                  <input
                    type="email"
                    className="input input-bordered"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder={session.user.email || "your@email.com"}
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Website/Social (optional)</span>
                  </label>
                  <input
                    type="url"
                    className="input input-bordered"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://your-website.com"
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Preferred Payout Method</span>
                  </label>
                  <select
                    className="select select-bordered"
                    value={formData.payoutMethod}
                    onChange={(e) => setFormData({ ...formData, payoutMethod: e.target.value })}
                  >
                    <option value="crypto">Crypto (USDC/USDT)</option>
                    <option value="paypal">PayPal</option>
                    <option value="bank">Bank Transfer</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-full h-12 min-h-0 touch-manipulation active:scale-[0.97] transition-transform"
                  disabled={applying}
                >
                  {applying ? <span className="loading loading-spinner"></span> : "Apply Now"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Pending application
  if (affiliate.status === "pending") {
    return (
      <div className="min-h-screen bg-base-200 py-8">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body text-center">
              <div className="text-6xl mb-4">⏳</div>
              <h1 className="card-title justify-center text-2xl">Application Pending</h1>
              <p className="text-base-content/70">
                Your affiliate application is being reviewed. We&apos;ll notify you once it&apos;s approved.
              </p>
              <div className="mt-4">
                <span className="badge badge-warning badge-lg">Pending Review</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Approved affiliate dashboard
  return (
    <div className="min-h-screen bg-base-200 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Affiliate Dashboard</h1>
          <p className="text-base-content/70">Track your referrals and earnings</p>
        </div>

        {/* Referral Link */}
        <div className="card bg-primary text-primary-content mb-6">
          <div className="card-body">
            <h2 className="card-title">Your Referral Link</h2>
            <div className="flex gap-2 items-center bg-primary-focus/30 p-3 rounded-lg">
              <code className="flex-1 truncate">{affiliate.referralLink}</code>
              <button
                className="btn btn-ghost h-10 min-h-0 touch-manipulation active:scale-[0.97] transition-transform"
                onClick={() => copyToClipboard(affiliate.referralLink)}
              >
                Copy
              </button>
            </div>
            <p className="text-sm opacity-80">
              Share this link and earn {affiliate.commissionRate}% on every paying customer.
              Your code: <strong>{affiliate.code}</strong>
            </p>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="stat bg-base-100 rounded-lg shadow">
            <div className="stat-title">Total Clicks</div>
            <div className="stat-value text-primary">{affiliate.stats?.totalReferrals || 0}</div>
            <div className="stat-desc">All time</div>
          </div>
          <div className="stat bg-base-100 rounded-lg shadow">
            <div className="stat-title">Conversions</div>
            <div className="stat-value">{affiliate.stats?.totalConversions || 0}</div>
            <div className="stat-desc">
              {stats?.summary?.conversionRate || 0}% rate
            </div>
          </div>
          <div className="stat bg-base-100 rounded-lg shadow">
            <div className="stat-title">Total Earnings</div>
            <div className="stat-value text-success">
              ${(affiliate.stats?.totalEarnings || 0).toFixed(2)}
            </div>
            <div className="stat-desc">Lifetime</div>
          </div>
          <div className="stat bg-base-100 rounded-lg shadow">
            <div className="stat-title">Available</div>
            <div className="stat-value text-warning">
              ${(affiliate.stats?.pendingPayout || 0).toFixed(2)}
            </div>
            <div className="stat-desc">
              {payouts?.balance?.canRequestPayout ? (
                <button className="link link-primary" onClick={requestPayout}>
                  Request Payout
                </button>
              ) : (
                `Min: $${payouts?.balance?.minimumPayout || 50}`
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <div className="card bg-base-100 shadow-lg">
            <div className="card-body">
              <h2 className="card-title">Last 30 Days</h2>
              {stats?.daily ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {stats.daily.filter(d => d.clicks > 0 || d.conversions > 0).slice(-10).reverse().map((day) => (
                    <div key={day.date} className="flex justify-between items-center py-2 border-b border-base-200">
                      <span className="text-sm">{day.date}</span>
                      <div className="flex gap-4">
                        <span className="badge badge-ghost">{day.clicks} clicks</span>
                        {day.conversions > 0 && (
                          <span className="badge badge-success">{day.conversions} conversions</span>
                        )}
                      </div>
                    </div>
                  ))}
                  {stats.daily.filter(d => d.clicks > 0).length === 0 && (
                    <p className="text-center text-base-content/50 py-4">
                      No activity yet. Share your referral link to get started!
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-center text-base-content/50 py-4">Loading...</p>
              )}
            </div>
          </div>

          {/* Traffic Sources */}
          <div className="card bg-base-100 shadow-lg">
            <div className="card-body">
              <h2 className="card-title">Traffic Breakdown</h2>
              {stats?.breakdown ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold mb-2">By Device</h3>
                    <div className="flex gap-2 flex-wrap">
                      {Object.entries(stats.breakdown.byDevice || {}).map(([device, count]) => (
                        <span key={device} className="badge badge-outline">
                          {device}: {count}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold mb-2">By Country</h3>
                    <div className="flex gap-2 flex-wrap">
                      {Object.entries(stats.breakdown.byCountry || {}).slice(0, 5).map(([country, count]) => (
                        <span key={country} className="badge badge-outline">
                          {country}: {count}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-center text-base-content/50 py-4">No data yet</p>
              )}
            </div>
          </div>

          {/* Payout History */}
          <div className="card bg-base-100 shadow-lg lg:col-span-2">
            <div className="card-body">
              <h2 className="card-title">Payout History</h2>
              {payouts?.payouts?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Method</th>
                        <th>Status</th>
                        <th>Transaction</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payouts.payouts.map((payout) => (
                        <tr key={payout.id}>
                          <td>{new Date(payout.createdAt).toLocaleDateString()}</td>
                          <td className="font-semibold">${payout.amount.toFixed(2)}</td>
                          <td>{payout.method}</td>
                          <td>
                            <span className={`badge badge-sm ${
                              payout.status === "completed" ? "badge-success" :
                              payout.status === "processing" ? "badge-warning" :
                              payout.status === "failed" ? "badge-error" : "badge-ghost"
                            }`}>
                              {payout.status}
                            </span>
                          </td>
                          <td className="text-sm text-base-content/70">
                            {payout.transactionId || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center text-base-content/50 py-4">
                  No payouts yet. Earn at least ${payouts?.balance?.minimumPayout || 50} to request your first payout.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Promo Materials */}
        <div className="card bg-base-100 shadow-lg mt-6">
          <div className="card-body">
            <h2 className="card-title">Promotional Materials</h2>
            <p className="text-base-content/70 mb-4">
              Use these resources to promote SafeScoring:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-base-200 rounded-lg">
                <h3 className="font-semibold mb-2">Banner (300x250)</h3>
                <div className="bg-primary/10 h-32 flex items-center justify-center rounded">
                  [Banner Preview]
                </div>
                <button className="btn btn-outline h-10 min-h-0 mt-2 w-full touch-manipulation active:scale-[0.97] transition-transform">Download</button>
              </div>
              <div className="p-4 bg-base-200 rounded-lg">
                <h3 className="font-semibold mb-2">Text Links</h3>
                <code className="text-xs block p-2 bg-base-100 rounded">
                  Check your crypto security: {affiliate.referralLink}
                </code>
                <button
                  className="btn btn-outline h-10 min-h-0 mt-2 w-full touch-manipulation active:scale-[0.97] transition-transform"
                  onClick={() => copyToClipboard(`Check your crypto security: ${affiliate.referralLink}`)}
                >
                  Copy
                </button>
              </div>
              <div className="p-4 bg-base-200 rounded-lg">
                <h3 className="font-semibold mb-2">Social Post</h3>
                <code className="text-xs block p-2 bg-base-100 rounded">
                  I use @SafeScoring to check crypto security ratings. See how your favorite projects score: {affiliate.referralLink}
                </code>
                <button
                  className="btn btn-outline h-10 min-h-0 mt-2 w-full touch-manipulation active:scale-[0.97] transition-transform"
                  onClick={() => copyToClipboard(`I use @SafeScoring to check crypto security ratings. See how your favorite projects score: ${affiliate.referralLink}`)}
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
