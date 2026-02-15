"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const statusConfig = {
  pending: { label: "Pending", class: "badge-warning" },
  reviewing: { label: "Reviewing", class: "badge-info" },
  approved: { label: "Approved", class: "badge-success" },
  rejected: { label: "Rejected", class: "badge-error" },
  partial: { label: "Partial", class: "badge-ghost" },
};

const reputationLevels = {
  newcomer: { label: "Newcomer", color: "text-base-content/60" },
  contributor: { label: "Contributor", color: "text-blue-400" },
  trusted: { label: "Trusted", color: "text-green-400" },
  expert: { label: "Expert", color: "text-amber-400" },
  oracle: { label: "Oracle", color: "text-purple-400" },
};

export default function CorrectionsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [corrections, setCorrections] = useState([]);
  const [reputation, setReputation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/signin");
    }
  }, [authStatus, router]);

  useEffect(() => {
    if (session?.user) {
      fetchCorrections();
    }
  }, [session]);

  const fetchCorrections = async () => {
    try {
      const res = await fetch("/api/corrections");
      if (res.ok) {
        const data = await res.json();
        setCorrections(data.corrections || []);
        setReputation(data.reputation || null);
      }
    } catch (error) {
      console.error("Error fetching corrections:", error);
    }
    setLoading(false);
  };

  if (authStatus === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  const stats = {
    total: corrections.length,
    pending: corrections.filter((c) => c.status === "pending").length,
    approved: corrections.filter((c) => c.status === "approved").length,
    rejected: corrections.filter((c) => c.status === "rejected").length,
  };

  const repLevel = reputationLevels[reputation?.reputation_level] || reputationLevels.newcomer;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">My Corrections</h1>
        {reputation && (
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold ${repLevel.color}`}>
              {repLevel.label}
            </span>
            <span className="text-xs text-base-content/40">
              {Math.round(reputation.reputation_score || 50)}/100
            </span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="rounded-xl bg-base-200 border border-base-300 p-4 text-center">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-xs text-base-content/60">Total</div>
        </div>
        <div className="rounded-xl bg-base-200 border border-base-300 p-4 text-center">
          <div className="text-2xl font-bold text-amber-400">
            {stats.pending}
          </div>
          <div className="text-xs text-base-content/60">Pending</div>
        </div>
        <div className="rounded-xl bg-base-200 border border-base-300 p-4 text-center">
          <div className="text-2xl font-bold text-green-400">
            {stats.approved}
          </div>
          <div className="text-xs text-base-content/60">Approved</div>
        </div>
        <div className="rounded-xl bg-base-200 border border-base-300 p-4 text-center">
          <div className="text-2xl font-bold text-red-400">
            {stats.rejected}
          </div>
          <div className="text-xs text-base-content/60">Rejected</div>
        </div>
      </div>

      {corrections.length === 0 ? (
        <div className="rounded-xl bg-base-200 border border-base-300 p-12 text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1}
            stroke="currentColor"
            className="w-16 h-16 mx-auto mb-4 text-base-content/30"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0118 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375m-8.25-3l1.5 1.5 3-3.75"
            />
          </svg>
          <h3 className="text-lg font-semibold mb-2">No corrections yet</h3>
          <p className="text-base-content/60 mb-6">
            Help improve product scores by submitting corrections on product
            pages. You&apos;ll earn reputation points for approved corrections.
          </p>
          <Link href="/products" className="btn btn-primary btn-sm">
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th className="hidden sm:table-cell">Field</th>
                <th className="hidden md:table-cell">Suggested</th>
                <th>Status</th>
                <th className="hidden sm:table-cell">Date</th>
              </tr>
            </thead>
            <tbody>
              {corrections.map((correction) => {
                const statusInfo = statusConfig[correction.status] || statusConfig.pending;
                return (
                  <tr key={correction.id} className="hover">
                    <td>
                      <Link
                        href={`/products/${correction.product_slug || ""}`}
                        className="font-medium hover:text-primary transition-colors"
                      >
                        {correction.product_name || "Unknown"}
                      </Link>
                    </td>
                    <td className="hidden sm:table-cell text-sm text-base-content/60">
                      {correction.field_corrected}
                    </td>
                    <td className="hidden md:table-cell text-sm max-w-[200px] truncate">
                      {correction.suggested_value}
                    </td>
                    <td>
                      <span className={`badge badge-sm ${statusInfo.class}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="hidden sm:table-cell text-sm text-base-content/50">
                      {new Date(correction.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
