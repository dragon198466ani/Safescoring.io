"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import PortfolioRiskScore from "@/components/PortfolioRiskScore";

export default function PortfolioRiskPage() {
  const [setups, setSetups] = useState([]);
  const [selectedSetup, setSelectedSetup] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSetups();
  }, []);

  const fetchSetups = async () => {
    try {
      const res = await fetch("/api/setups");
      const data = await res.json();

      if (res.ok && data.setups) {
        setSetups(data.setups);
        if (data.setups.length > 0) {
          setSelectedSetup(data.setups[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch setups:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Portfolio Risk Analysis</h1>
          <p className="text-base-content/60 text-sm mt-1">
            Calculate your weighted security score based on your crypto stack
          </p>
        </div>
      </div>

      {/* Setup selector or empty state */}
      {setups.length === 0 ? (
        <div className="rounded-xl bg-base-200 border border-base-300 p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-500/20 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-purple-400">
              <path fillRule="evenodd" d="M12 1.5a.75.75 0 01.75.75V4.5a.75.75 0 01-1.5 0V2.25A.75.75 0 0112 1.5zM5.636 4.136a.75.75 0 011.06 0l1.592 1.591a.75.75 0 01-1.061 1.06l-1.591-1.59a.75.75 0 010-1.061zm12.728 0a.75.75 0 010 1.06l-1.591 1.592a.75.75 0 01-1.06-1.061l1.59-1.591a.75.75 0 011.061 0zm-6.816 4.496a.75.75 0 01.82.311l5.228 7.917a.75.75 0 01-.777 1.148l-2.097-.43 1.045 3.9a.75.75 0 01-1.45.388l-1.044-3.899-1.601 1.42a.75.75 0 01-1.247-.606l.569-9.47a.75.75 0 01.554-.68zM3 10.5a.75.75 0 01.75-.75H6a.75.75 0 010 1.5H3.75A.75.75 0 013 10.5zm14.25 0a.75.75 0 01.75-.75h2.25a.75.75 0 010 1.5H18a.75.75 0 01-.75-.75zm-8.962 3.712a.75.75 0 010 1.061l-1.591 1.591a.75.75 0 11-1.061-1.06l1.591-1.592a.75.75 0 011.06 0z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="font-semibold text-lg mb-2">No setups yet</h3>
          <p className="text-base-content/60 mb-6 max-w-md mx-auto">
            Create a setup with your crypto products to analyze your portfolio's security risk score.
          </p>
          <Link href="/dashboard/setups" className="btn btn-primary">
            Create Setup
          </Link>
        </div>
      ) : (
        <>
          {/* Setup selector */}
          <div className="rounded-xl bg-base-200 border border-base-300 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <label className="text-sm font-medium">Select Setup:</label>
              <select
                value={selectedSetup || ""}
                onChange={(e) => setSelectedSetup(e.target.value)}
                className="select select-bordered select-sm flex-1 max-w-xs"
              >
                {setups.map((setup) => (
                  <option key={setup.id} value={setup.id}>
                    {setup.name} ({setup.products?.length || 0} products)
                  </option>
                ))}
              </select>
              <Link
                href="/dashboard/setups"
                className="btn btn-ghost btn-sm gap-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                </svg>
                New Setup
              </Link>
            </div>
          </div>

          {/* Portfolio Risk Score */}
          {selectedSetup && (
            <PortfolioRiskScore key={selectedSetup} setupId={selectedSetup} />
          )}
        </>
      )}

      {/* Manual analysis */}
      <div className="rounded-xl bg-base-200 border border-base-300 p-6">
        <h3 className="font-semibold mb-2">Manual Analysis</h3>
        <p className="text-sm text-base-content/60 mb-4">
          Don't have a setup? Enter products manually to calculate risk.
        </p>
        <PortfolioRiskScore />
      </div>

      {/* Info cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="rounded-xl bg-base-200 border border-base-300 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-green-400">
                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="font-medium text-sm">80-100</span>
          </div>
          <div className="text-xs text-base-content/60">
            Low risk portfolio with strong security across all products
          </div>
        </div>

        <div className="rounded-xl bg-base-200 border border-base-300 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-amber-400">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="font-medium text-sm">40-79</span>
          </div>
          <div className="text-xs text-base-content/60">
            Medium to high risk - some products need attention
          </div>
        </div>

        <div className="rounded-xl bg-base-200 border border-base-300 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-red-400">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="font-medium text-sm">0-39</span>
          </div>
          <div className="text-xs text-base-content/60">
            Critical risk - immediate security improvements needed
          </div>
        </div>
      </div>
    </div>
  );
}
