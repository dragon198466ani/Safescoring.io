"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

export default function AntiCopyDashboard() {
  const { data: session } = useSession();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientDetails, setClientDetails] = useState(null);
  const [detectForm, setDetectForm] = useState({ name: "", slug: "", score: "" });
  const [detectResult, setDetectResult] = useState(null);

  // Fetch dashboard data
  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/anti-copy?action=dashboard");
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);
      setDashboardData(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchClientDetails = async (clientId) => {
    try {
      setSelectedClient(clientId);
      setClientDetails(null);

      const res = await fetch(`/api/admin/anti-copy?action=client-details&clientId=${clientId}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);
      setClientDetails(data.data);
    } catch (err) {
      setError(err.message);
    }
  };

  const detectCopy = async () => {
    try {
      const res = await fetch("/api/admin/anti-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "detect-copy",
          productName: detectForm.name,
          productSlug: detectForm.slug,
          productScore: parseFloat(detectForm.score) || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDetectResult(data.data);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-base-100 p-8">
        <div className="alert alert-error">
          <span>Error: {error}</span>
          <button className="btn btn-sm" onClick={() => { setError(null); fetchDashboard(); }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-100 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Anti-Copy Protection Dashboard</h1>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="stat bg-base-200 rounded-box p-6">
            <div className="stat-title">Suspicious (24h)</div>
            <div className="stat-value text-warning">
              {dashboardData?.suspicious24h?.length || 0}
            </div>
            <div className="stat-desc">Clients with 50+ accesses</div>
          </div>

          <div className="stat bg-base-200 rounded-box p-6">
            <div className="stat-title">Suspicious (7 days)</div>
            <div className="stat-value text-error">
              {dashboardData?.suspicious7d?.length || 0}
            </div>
            <div className="stat-desc">Clients with 200+ accesses</div>
          </div>

          <div className="stat bg-base-200 rounded-box p-6">
            <div className="stat-title">Honeypot Recipients</div>
            <div className="stat-value text-info">
              {dashboardData?.honeypotClients?.length || 0}
            </div>
            <div className="stat-desc">Clients who received honeypots</div>
          </div>
        </div>

        {/* Detect Copy Form */}
        <div className="card bg-base-200 mb-8">
          <div className="card-body">
            <h2 className="card-title">Detect Copied Honeypot</h2>
            <p className="text-sm opacity-70 mb-4">
              Enter details of a product found on a competitor site to check if it's our honeypot.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                placeholder="Product Name"
                className="input input-bordered"
                value={detectForm.name}
                onChange={(e) => setDetectForm({ ...detectForm, name: e.target.value })}
              />
              <input
                type="text"
                placeholder="Product Slug"
                className="input input-bordered"
                value={detectForm.slug}
                onChange={(e) => setDetectForm({ ...detectForm, slug: e.target.value })}
              />
              <input
                type="number"
                placeholder="Score (optional)"
                className="input input-bordered"
                value={detectForm.score}
                onChange={(e) => setDetectForm({ ...detectForm, score: e.target.value })}
              />
            </div>

            <button className="btn btn-primary mt-4" onClick={detectCopy}>
              Check for Honeypot
            </button>

            {detectResult && (
              <div className={`mt-4 p-4 rounded-box ${detectResult.isHoneypot ? 'bg-error text-error-content' : 'bg-success text-success-content'}`}>
                {detectResult.isHoneypot ? (
                  <>
                    <h3 className="font-bold text-lg">HONEYPOT DETECTED!</h3>
                    <p>Confidence: {(detectResult.confidence * 100).toFixed(0)}%</p>
                    <p>Matched Seed: {detectResult.matchedSeed}</p>
                    <p>Client Fingerprint: {detectResult.matchedFingerprint}</p>
                    {detectResult.evidence && (
                      <details className="mt-2">
                        <summary className="cursor-pointer">View Evidence</summary>
                        <pre className="text-xs mt-2 overflow-auto max-h-60">
                          {JSON.stringify(detectResult.evidence, null, 2)}
                        </pre>
                      </details>
                    )}
                  </>
                ) : (
                  <p>Not a honeypot. Product appears to be legitimate.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Suspicious Clients Table */}
        <div className="card bg-base-200 mb-8">
          <div className="card-body">
            <h2 className="card-title">Suspicious Clients (24h)</h2>

            {dashboardData?.suspicious24h?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="table table-zebra">
                  <thead>
                    <tr>
                      <th>Client ID</th>
                      <th>Fingerprint</th>
                      <th>Accesses</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.suspicious24h.map((client, i) => (
                      <tr key={i}>
                        <td className="font-mono text-sm">{client.client_id?.substring(0, 16)}...</td>
                        <td className="font-mono text-sm">{client.client_fingerprint?.substring(0, 12)}...</td>
                        <td>{client.count}</td>
                        <td>
                          <button
                            className="btn btn-xs btn-outline"
                            onClick={() => fetchClientDetails(client.client_id)}
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="opacity-70">No suspicious activity detected in the last 24 hours.</p>
            )}
          </div>
        </div>

        {/* Client Details Modal */}
        {selectedClient && (
          <div className="card bg-base-200 mb-8">
            <div className="card-body">
              <div className="flex justify-between items-center">
                <h2 className="card-title">Client Details</h2>
                <button className="btn btn-sm btn-ghost" onClick={() => setSelectedClient(null)}>
                  Close
                </button>
              </div>

              {clientDetails ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <h3 className="font-semibold mb-2">Statistics</h3>
                    <ul className="list-disc list-inside">
                      <li>Total Accesses: {clientDetails.stats?.totalAccesses || 0}</li>
                      <li>Honeypots Received: {clientDetails.stats?.honeypotsReceived || 0}</li>
                      <li>First Seen: {clientDetails.stats?.firstSeen || "N/A"}</li>
                      <li>Last Seen: {clientDetails.stats?.lastSeen || "N/A"}</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Endpoints Accessed</h3>
                    {clientDetails.stats?.endpoints && (
                      <ul className="list-disc list-inside text-sm">
                        {Object.entries(clientDetails.stats.endpoints).map(([endpoint, count]) => (
                          <li key={endpoint}>{endpoint}: {count}</li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {clientDetails.honeypots?.length > 0 && (
                    <div className="md:col-span-2">
                      <h3 className="font-semibold mb-2 text-warning">Honeypots Sent to This Client</h3>
                      <div className="flex flex-wrap gap-2">
                        {clientDetails.honeypots.map((id, i) => (
                          <span key={i} className="badge badge-warning font-mono">{id}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <span className="loading loading-spinner"></span>
              )}
            </div>
          </div>
        )}

        {/* Honeypot Recipients */}
        <div className="card bg-base-200">
          <div className="card-body">
            <h2 className="card-title">Honeypot Recipients (7 days)</h2>

            {dashboardData?.honeypotClients?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="table table-zebra">
                  <thead>
                    <tr>
                      <th>Client ID</th>
                      <th>Times Received</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.honeypotClients.map((client, i) => (
                      <tr key={i}>
                        <td className="font-mono text-sm">{client.client_id?.substring(0, 16)}...</td>
                        <td>{client.count}</td>
                        <td>
                          <button
                            className="btn btn-xs btn-outline"
                            onClick={() => fetchClientDetails(client.client_id)}
                          >
                            View Honeypots
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="opacity-70">No honeypots served in the last 7 days.</p>
            )}
          </div>
        </div>

        {/* Last Updated */}
        <p className="text-sm opacity-50 mt-4 text-center">
          Last updated: {dashboardData?.timestamp || "N/A"}
        </p>
      </div>
    </div>
  );
}
