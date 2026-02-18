"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

/**
 * API Dashboard - Analytics and Key Management
 *
 * Features:
 * - API usage statistics
 * - API key management
 * - Alert subscriptions
 * - Rate limit status
 */

export default function APIDashboardPage() {
  const { data: session, status } = useSession();
  const [apiKeys, setApiKeys] = useState([]);
  const [usage, setUsage] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState("");
  const [showNewKey, setShowNewKey] = useState(null);

  useEffect(() => {
    if (session?.user) {
      fetchData();
    }
  }, [session]);

  async function fetchData() {
    setLoading(true);
    try {
      // Fetch API keys
      const keysRes = await fetch("/api/user/api-keys");
      if (keysRes.ok) {
        const keysData = await keysRes.json();
        setApiKeys(keysData.keys || []);
      }

      // Fetch usage stats
      const usageRes = await fetch("/api/user/api-usage");
      if (usageRes.ok) {
        const usageData = await usageRes.json();
        setUsage(usageData);
      }

      // Fetch alerts
      const alertsRes = await fetch("/api/user/alerts");
      if (alertsRes.ok) {
        const alertsData = await alertsRes.json();
        setAlerts(alertsData.alerts || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
    setLoading(false);
  }

  async function createApiKey() {
    if (!newKeyName.trim()) return;

    try {
      const res = await fetch("/api/user/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName }),
      });

      if (res.ok) {
        const data = await res.json();
        setShowNewKey(data.key);
        setNewKeyName("");
        fetchData();
      }
    } catch (error) {
      console.error("Error creating API key:", error);
    }
  }

  async function deleteApiKey(keyId) {
    if (!confirm("Are you sure you want to delete this API key?")) return;

    try {
      const res = await fetch(`/api/user/api-keys?id=${keyId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error("Error deleting API key:", error);
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-base-200 py-8">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Header skeleton */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="skeleton h-8 w-48 mb-2"></div>
              <div className="skeleton h-4 w-64"></div>
            </div>
            <div className="skeleton h-10 w-28"></div>
          </div>

          {/* Stats skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="stat bg-base-100 rounded-lg shadow">
                <div className="skeleton h-4 w-24 mb-2"></div>
                <div className="skeleton h-8 w-20 mb-2"></div>
                <div className="skeleton h-3 w-16"></div>
              </div>
            ))}
          </div>

          {/* Cards skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* API Keys skeleton */}
            <div className="card bg-base-100 shadow-lg">
              <div className="card-body">
                <div className="skeleton h-6 w-24 mb-2"></div>
                <div className="skeleton h-4 w-48 mb-4"></div>
                <div className="flex gap-2 mb-4">
                  <div className="skeleton h-12 flex-1"></div>
                  <div className="skeleton h-12 w-28"></div>
                </div>
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="skeleton h-20 w-full rounded-lg"></div>
                  ))}
                </div>
              </div>
            </div>

            {/* Usage chart skeleton */}
            <div className="card bg-base-100 shadow-lg">
              <div className="card-body">
                <div className="skeleton h-6 w-36 mb-2"></div>
                <div className="skeleton h-4 w-56 mb-4"></div>
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i}>
                      <div className="flex justify-between mb-1">
                        <div className="skeleton h-4 w-32"></div>
                        <div className="skeleton h-4 w-12"></div>
                      </div>
                      <div className="skeleton h-2 w-full"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
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
              Please sign in to access the API dashboard.
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

  return (
    <div className="min-h-screen bg-base-200 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">API Dashboard</h1>
            <p className="text-base-content/70">Manage your API access and monitor usage</p>
          </div>
          <Link href="/api-docs" className="btn btn-outline h-10 min-h-0 touch-manipulation active:scale-[0.97] transition-transform">
            View API Docs
          </Link>
        </div>

        {/* New Key Modal */}
        {showNewKey && (
          <div className="alert alert-success mb-6">
            <div>
              <h3 className="font-bold">API Key Created!</h3>
              <p className="text-sm">Copy this key now - you won&apos;t see it again:</p>
              <code className="bg-success-content/20 px-3 py-1 rounded block mt-2 break-all">
                {showNewKey}
              </code>
              <button
                className="btn btn-ghost h-10 min-h-0 mt-2 touch-manipulation active:scale-[0.97] transition-transform"
                onClick={() => {
                  navigator.clipboard.writeText(showNewKey);
                  setShowNewKey(null);
                }}
              >
                Copy & Close
              </button>
            </div>
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="stat bg-base-100 rounded-lg shadow">
            <div className="stat-title">Total Requests</div>
            <div className="stat-value text-primary">{usage?.totalRequests?.toLocaleString() || 0}</div>
            <div className="stat-desc">Last 30 days</div>
          </div>
          <div className="stat bg-base-100 rounded-lg shadow">
            <div className="stat-title">Today&apos;s Requests</div>
            <div className="stat-value">{usage?.todayRequests?.toLocaleString() || 0}</div>
            <div className="stat-desc">Since midnight UTC</div>
          </div>
          <div className="stat bg-base-100 rounded-lg shadow">
            <div className="stat-title">Active API Keys</div>
            <div className="stat-value">{apiKeys.length}</div>
            <div className="stat-desc">{apiKeys.filter(k => k.isActive).length} active</div>
          </div>
          <div className="stat bg-base-100 rounded-lg shadow">
            <div className="stat-title">Alert Subscriptions</div>
            <div className="stat-value">{alerts.length}</div>
            <div className="stat-desc">{alerts.filter(a => a.isActive).length} active</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* API Keys */}
          <div className="card bg-base-100 shadow-lg">
            <div className="card-body">
              <h2 className="card-title">API Keys</h2>
              <p className="text-sm text-base-content/70 mb-4">
                Create and manage your API keys for programmatic access.
              </p>

              {/* Create New Key */}
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Key name (e.g., 'Production')"
                  className="input input-bordered flex-1"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createApiKey()}
                />
                <button className="btn btn-primary h-12 min-h-0 touch-manipulation active:scale-[0.97] transition-transform" onClick={createApiKey}>
                  Create Key
                </button>
              </div>

              {/* Keys List */}
              <div className="space-y-3">
                {apiKeys.length === 0 ? (
                  <p className="text-center text-base-content/50 py-4">
                    No API keys yet. Create one to get started.
                  </p>
                ) : (
                  apiKeys.map((key) => (
                    <div
                      key={key.id}
                      className="flex items-center justify-between p-3 bg-base-200 rounded-lg"
                    >
                      <div>
                        <div className="font-medium">{key.name}</div>
                        <div className="text-sm text-base-content/70">
                          <code>{key.prefix}...</code>
                          <span className="mx-2">-</span>
                          <span className="badge badge-sm badge-ghost">{key.tier}</span>
                          {!key.isActive && (
                            <span className="badge badge-sm badge-error ml-2">Inactive</span>
                          )}
                        </div>
                        <div className="text-xs text-base-content/50">
                          Created: {new Date(key.createdAt).toLocaleDateString()}
                          {key.lastUsedAt && ` - Last used: ${new Date(key.lastUsedAt).toLocaleDateString()}`}
                        </div>
                      </div>
                      <button
                        className="btn btn-ghost h-10 min-h-0 text-error touch-manipulation active:scale-[0.97] transition-transform"
                        onClick={() => deleteApiKey(key.id)}
                      >
                        Delete
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Usage Chart */}
          <div className="card bg-base-100 shadow-lg">
            <div className="card-body">
              <h2 className="card-title">Usage by Endpoint</h2>
              <p className="text-sm text-base-content/70 mb-4">
                Request distribution across API endpoints.
              </p>

              {usage?.byEndpoint ? (
                <div className="space-y-3">
                  {Object.entries(usage.byEndpoint)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 10)
                    .map(([endpoint, count]) => (
                      <div key={endpoint}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-mono truncate">{endpoint}</span>
                          <span>{count.toLocaleString()}</span>
                        </div>
                        <progress
                          className="progress progress-primary w-full"
                          value={count}
                          max={Math.max(...Object.values(usage.byEndpoint))}
                        />
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8 text-base-content/50">
                  No usage data available yet.
                </div>
              )}
            </div>
          </div>

          {/* Alert Subscriptions */}
          <div className="card bg-base-100 shadow-lg lg:col-span-2">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <h2 className="card-title">Alert Subscriptions</h2>
                <Link href="/dashboard/alerts" className="btn btn-primary h-10 min-h-0 touch-manipulation active:scale-[0.97] transition-transform">
                  Manage Alerts
                </Link>
              </div>
              <p className="text-sm text-base-content/70 mb-4">
                Get notified when scores change or new incidents occur.
              </p>

              {alerts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-base-content/50 mb-4">No alert subscriptions yet.</p>
                  <Link href="/dashboard/alerts" className="btn btn-outline h-10 min-h-0 touch-manipulation active:scale-[0.97] transition-transform">
                    Create Your First Alert
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Target</th>
                        <th>Channel</th>
                        <th>Triggers</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {alerts.map((alert) => (
                        <tr key={alert.id}>
                          <td>
                            <span className="badge badge-outline">{alert.type}</span>
                          </td>
                          <td>{alert.productName || "All Products"}</td>
                          <td>
                            {alert.webhookUrl && <span className="badge badge-ghost mr-1">Webhook</span>}
                            {alert.email && <span className="badge badge-ghost">Email</span>}
                          </td>
                          <td>{alert.triggerCount || 0}</td>
                          <td>
                            {alert.isActive ? (
                              <span className="badge badge-success badge-sm">Active</span>
                            ) : (
                              <span className="badge badge-ghost badge-sm">Paused</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Rate Limits Info */}
        <div className="card bg-base-100 shadow-lg mt-6">
          <div className="card-body">
            <h2 className="card-title">Rate Limits</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="p-4 bg-base-200 rounded-lg">
                <h3 className="font-semibold text-success">Free Tier</h3>
                <p className="text-2xl font-bold">100</p>
                <p className="text-sm text-base-content/70">requests/minute</p>
              </div>
              <div className="p-4 bg-base-200 rounded-lg border-2 border-primary">
                <h3 className="font-semibold text-primary">Pro Tier</h3>
                <p className="text-2xl font-bold">1,000</p>
                <p className="text-sm text-base-content/70">requests/minute</p>
              </div>
              <div className="p-4 bg-base-200 rounded-lg">
                <h3 className="font-semibold text-secondary">Enterprise</h3>
                <p className="text-2xl font-bold">10,000+</p>
                <p className="text-sm text-base-content/70">requests/minute</p>
              </div>
            </div>
            <p className="text-sm text-base-content/70 mt-4">
              Need higher limits?{" "}
              <a href="mailto:api@safescoring.io" className="link link-primary">
                Contact us for enterprise pricing
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
