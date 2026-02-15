"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function ApiKeysPage() {
  const { data: session, status } = useSession();
  const [keys, setKeys] = useState([]);
  const [limit, setLimit] = useState(0);
  const [planType, setPlanType] = useState("free");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKey, setNewKey] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      window.location.href = "/signin";
      return;
    }
    if (status !== "authenticated") return;
    fetchKeys();
  }, [status]);

  async function fetchKeys() {
    try {
      const res = await fetch("/api/api-keys");
      if (res.ok) {
        const data = await res.json();
        setKeys(data.keys || []);
        setLimit(data.limit || 0);
        setPlanType(data.planType || "free");
      }
    } catch {
      // Silently fail
    }
    setLoading(false);
  }

  async function createKey() {
    setCreating(true);
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName || "Default" }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewKey(data);
        setNewKeyName("");
        await fetchKeys();
      } else {
        alert(data.error || "Failed to create key");
      }
    } catch {
      alert("Network error");
    }
    setCreating(false);
  }

  async function revokeKey(keyId) {
    if (!confirm("Revoke this API key? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/api-keys?id=${keyId}`, { method: "DELETE" });
      if (res.ok) {
        await fetchKeys();
      }
    } catch {
      alert("Failed to revoke key");
    }
  }

  const copyKey = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const isPro = planType === "professional" || planType === "enterprise";
  const activeKeys = keys.filter((k) => k.is_active);
  const totalRequests = keys.reduce((sum, k) => sum + (k.total_requests || 0), 0);

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  // Plan gate for non-Pro users
  if (!isPro) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold">API Keys</h1>
          <p className="text-base-content/60 mt-1">
            Manage API keys for programmatic access to SafeScoring data.
          </p>
        </div>
        <div className="rounded-xl bg-base-200 border border-base-300 p-12 text-center">
          <div className="text-4xl mb-4">🔑</div>
          <h2 className="text-xl font-bold mb-2">API Keys Require Professional Plan</h2>
          <p className="text-base-content/60 mb-6 max-w-md mx-auto">
            Upgrade to Professional to create API keys and integrate SafeScoring data
            into your applications with up to 1,000 requests/hour.
          </p>
          <Link href="/#pricing" className="btn btn-primary">
            View Plans
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold">API Keys</h1>
          <p className="text-base-content/60 mt-1">
            Manage API keys for programmatic access.
          </p>
        </div>
        <button
          onClick={() => { setShowCreateModal(true); setNewKey(null); }}
          disabled={activeKeys.length >= limit}
          className="btn btn-primary min-h-[44px] w-full sm:w-auto"
        >
          Create New Key
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="rounded-xl bg-base-200 border border-base-300 p-4">
          <div className="text-2xl font-bold">{activeKeys.length} / {limit}</div>
          <div className="text-xs text-base-content/60">Active Keys</div>
        </div>
        <div className="rounded-xl bg-base-200 border border-base-300 p-4">
          <div className="text-2xl font-bold">{totalRequests.toLocaleString()}</div>
          <div className="text-xs text-base-content/60">Total Requests</div>
        </div>
        <div className="rounded-xl bg-base-200 border border-base-300 p-4">
          <div className="text-2xl font-bold">
            {planType === "enterprise" ? "10,000" : "1,000"}/hr
          </div>
          <div className="text-xs text-base-content/60">Rate Limit</div>
        </div>
      </div>

      {/* Keys Table */}
      <div className="rounded-xl bg-base-200 border border-base-300 p-6 mb-8">
        <h2 className="text-lg font-bold mb-4">Your API Keys</h2>
        {keys.length === 0 ? (
          <div className="text-center py-8 text-base-content/50">
            No API keys yet. Create one to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Key</th>
                  <th className="hidden md:table-cell">Created</th>
                  <th className="hidden md:table-cell">Last Used</th>
                  <th className="text-right">Requests</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {keys.map((key) => (
                  <tr key={key.id} className={!key.is_active ? "opacity-50" : ""}>
                    <td className="font-medium">{key.name}</td>
                    <td>
                      <code className="text-xs bg-base-300 px-2 py-1 rounded">
                        sk_live_{key.key_prefix}...
                      </code>
                    </td>
                    <td className="hidden md:table-cell text-sm text-base-content/60">
                      {new Date(key.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="hidden md:table-cell text-sm text-base-content/60">
                      {key.last_used_at
                        ? new Date(key.last_used_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })
                        : "Never"}
                    </td>
                    <td className="text-right font-medium">
                      {(key.total_requests || 0).toLocaleString()}
                    </td>
                    <td>
                      <span
                        className={`badge badge-sm ${
                          key.is_active ? "badge-success" : "badge-ghost"
                        }`}
                      >
                        {key.is_active ? "Active" : "Revoked"}
                      </span>
                    </td>
                    <td>
                      {key.is_active && (
                        <button
                          onClick={() => revokeKey(key.id)}
                          className="btn btn-ghost btn-xs min-h-[44px] text-error"
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Start */}
      <div className="rounded-xl bg-base-200 border border-base-300 p-6">
        <h2 className="text-lg font-bold mb-4">Quick Start</h2>
        <p className="text-sm text-base-content/60 mb-4">
          Use your API key in the <code className="bg-base-300 px-1 rounded">x-api-key</code> header:
        </p>
        <pre className="bg-base-300 p-4 rounded-lg overflow-x-auto text-sm">
          <code>{`curl -H "x-api-key: YOUR_API_KEY" \\
  https://safescoring.io/api/products/ledger-nano-x/score`}</code>
        </pre>
        <div className="mt-4">
          <Link href="/api-docs" className="text-primary hover:underline text-sm">
            View full API documentation →
          </Link>
        </div>
      </div>

      {/* Create Key Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-base-100 rounded-xl p-6 max-w-md w-full mx-4 border border-base-300">
            {newKey ? (
              /* Show the new key */
              <>
                <h3 className="text-lg font-bold mb-4">API Key Created</h3>
                <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 mb-4">
                  <p className="text-sm text-warning font-medium mb-2">
                    Save this key now — it won&apos;t be shown again!
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-base-200 p-2 rounded break-all select-all">
                      {newKey.key}
                    </code>
                    <button
                      onClick={() => copyKey(newKey.key)}
                      className="btn btn-sm btn-ghost"
                    >
                      {copied ? "✓" : "Copy"}
                    </button>
                  </div>
                </div>
                <div className="text-sm text-base-content/60 mb-4">
                  <p><strong>Name:</strong> {newKey.name}</p>
                  <p><strong>Rate Limit:</strong> {newKey.rateLimit} requests/hour</p>
                </div>
                <button
                  onClick={() => { setShowCreateModal(false); setNewKey(null); }}
                  className="btn btn-primary w-full"
                >
                  Done
                </button>
              </>
            ) : (
              /* Create form */
              <>
                <h3 className="text-lg font-bold mb-4">Create New API Key</h3>
                <div className="form-control mb-4">
                  <label className="label">
                    <span className="label-text">Key Name</span>
                  </label>
                  <input
                    type="text"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="e.g., Production, Development"
                    className="input input-bordered"
                    maxLength={100}
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="btn btn-ghost flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createKey}
                    disabled={creating}
                    className="btn btn-primary flex-1"
                  >
                    {creating ? (
                      <span className="loading loading-spinner loading-sm"></span>
                    ) : (
                      "Create Key"
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
