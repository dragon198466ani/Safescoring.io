"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useAccount } from "wagmi";
import Link from "next/link";

export default function AgentApiDashboard() {
  const { data: session } = useSession();
  const { address, isConnected } = useAccount();
  const [credits, setCredits] = useState(null);
  const [loading, setLoading] = useState(false);
  const [depositAmount, setDepositAmount] = useState(10);

  // Fetch agent credits when wallet is connected
  useEffect(() => {
    if (!isConnected || !address) return;

    const fetchCredits = async () => {
      setLoading(true);
      try {
        const timestamp = Date.now().toString();
        const res = await fetch(`/api/agent/credits`, {
          headers: {
            "X-Agent-Wallet": address,
            "X-Agent-Signature": "dashboard-session", // Dashboard uses session auth
            "X-Agent-Timestamp": timestamp,
          },
        });
        if (res.ok) {
          const data = await res.json();
          setCredits(data.data);
        }
      } catch (err) {
        console.error("Failed to fetch credits:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCredits();
  }, [isConnected, address]);

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Agent API Dashboard</h1>
        <p className="text-base-content/60">
          Manage your agent wallet, USDC credits, and API usage
        </p>
      </div>

      {/* Wallet Status */}
      <div className="card bg-base-200 border border-base-300 mb-8">
        <div className="card-body">
          <h2 className="card-title text-lg">Wallet Connection</h2>
          {isConnected ? (
            <div className="flex items-center gap-3">
              <span className="badge badge-success badge-sm">Connected</span>
              <code className="text-sm bg-base-300 px-3 py-1 rounded">{address}</code>
            </div>
          ) : (
            <div>
              <p className="text-base-content/60 mb-3">
                Connect your wallet to access the Agent API
              </p>
              <w3m-button />
            </div>
          )}
        </div>
      </div>

      {isConnected && (
        <>
          {/* Balance & Stats */}
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            <div className="stat bg-base-200 rounded-xl border border-base-300">
              <div className="stat-title">USDC Balance</div>
              <div className="stat-value text-primary text-2xl">
                ${credits?.balance?.toFixed(2) || "0.00"}
              </div>
              <div className="stat-desc">Available for queries</div>
            </div>
            <div className="stat bg-base-200 rounded-xl border border-base-300">
              <div className="stat-title">Total Queries</div>
              <div className="stat-value text-2xl">{credits?.totalQueries || 0}</div>
              <div className="stat-desc">All time</div>
            </div>
            <div className="stat bg-base-200 rounded-xl border border-base-300">
              <div className="stat-title">Total Spent</div>
              <div className="stat-value text-2xl">
                ${credits?.totalSpent?.toFixed(2) || "0.00"}
              </div>
              <div className="stat-desc">USDC</div>
            </div>
            <div className="stat bg-base-200 rounded-xl border border-base-300">
              <div className="stat-title">Stream Status</div>
              <div className="stat-value text-2xl">
                {credits?.hasActiveStream ? (
                  <span className="text-success">Active</span>
                ) : (
                  <span className="text-base-content/40">Inactive</span>
                )}
              </div>
              <div className="stat-desc">Superfluid</div>
            </div>
          </div>

          {/* Deposit Section */}
          <div className="card bg-base-200 border border-base-300 mb-8">
            <div className="card-body">
              <h2 className="card-title text-lg">Deposit USDC</h2>
              <p className="text-sm text-base-content/60 mb-4">
                Add USDC credits to your agent wallet. Payments are processed via NowPayments on Polygon.
              </p>
              <div className="flex items-center gap-4">
                <div className="flex gap-2">
                  {[5, 10, 50, 100].map((amt) => (
                    <button
                      key={amt}
                      className={`btn btn-sm ${depositAmount === amt ? "btn-primary" : "btn-outline"}`}
                      onClick={() => setDepositAmount(amt)}
                    >
                      ${amt}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(parseInt(e.target.value) || 1)}
                  className="input input-bordered input-sm w-24"
                  min={1}
                  max={10000}
                />
                <span className="text-sm text-base-content/60">USDC</span>
              </div>
              <div className="mt-4">
                <button className="btn btn-primary btn-sm">
                  Deposit ${depositAmount} USDC
                </button>
              </div>
            </div>
          </div>

          {/* Pricing Reference */}
          <div className="card bg-base-200 border border-base-300 mb-8">
            <div className="card-body">
              <h2 className="card-title text-lg">API Pricing</h2>
              <div className="overflow-x-auto">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Endpoint</th>
                      <th>Cost</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><code className="text-xs">/api/agent/score</code></td>
                      <td className="font-medium">$0.01</td>
                      <td className="text-base-content/60">Full SAFE score (S/A/F/E)</td>
                    </tr>
                    <tr>
                      <td><code className="text-xs">/api/agent/batch</code></td>
                      <td className="font-medium">$0.005/product</td>
                      <td className="text-base-content/60">Batch scores (max 50)</td>
                    </tr>
                    <tr>
                      <td><code className="text-xs">/api/agent/analysis</code></td>
                      <td className="font-medium">$0.10</td>
                      <td className="text-base-content/60">Deep analysis with risk assessment</td>
                    </tr>
                    <tr>
                      <td><code className="text-xs">/api/agent/credits</code></td>
                      <td className="font-medium">Free</td>
                      <td className="text-base-content/60">Check balance & history</td>
                    </tr>
                    <tr>
                      <td><code className="text-xs">/api/agent/verify</code></td>
                      <td className="font-medium">Free</td>
                      <td className="text-base-content/60">Verify wallet & get nonce</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Transaction History */}
          <div className="card bg-base-200 border border-base-300">
            <div className="card-body">
              <h2 className="card-title text-lg">Recent Transactions</h2>
              {credits?.transactions?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Amount</th>
                        <th>Endpoint</th>
                        <th>Product</th>
                      </tr>
                    </thead>
                    <tbody>
                      {credits.transactions.map((tx) => (
                        <tr key={tx.id}>
                          <td className="text-xs">
                            {new Date(tx.date).toLocaleString()}
                          </td>
                          <td>
                            <span className={`badge badge-sm ${
                              tx.type === "deposit" ? "badge-success" : "badge-ghost"
                            }`}>
                              {tx.type}
                            </span>
                          </td>
                          <td className={tx.type === "deposit" ? "text-success" : ""}>
                            {tx.type === "deposit" ? "+" : "-"}${tx.amount.toFixed(3)}
                          </td>
                          <td className="text-xs font-mono">{tx.endpoint || "-"}</td>
                          <td>{tx.productSlug || (tx.productsCount ? `${tx.productsCount} products` : "-")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-base-content/60 text-sm py-4">
                  No transactions yet. Start by depositing USDC and querying the API.
                </p>
              )}
            </div>
          </div>

          {/* Quick Start */}
          <div className="mt-8 text-center">
            <Link href="/agents#code" className="btn btn-outline btn-sm">
              View Integration Guide
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
