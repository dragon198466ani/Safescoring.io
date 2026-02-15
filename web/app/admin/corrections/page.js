"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Header from "@/components/Header";

export default function AdminCorrectionsPage() {
  const { data: session, status } = useSession();
  const [corrections, setCorrections] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [processing, setProcessing] = useState(null);

  const fetchCorrections = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/corrections?status=${filter}`);
      const data = await res.json();
      if (!data.error) {
        setCorrections(data.corrections || []);
        setStats(data.stats || {});
      }
    } catch (error) {
      console.error("Error fetching corrections:", error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (session?.user) {
      fetchCorrections();
    }
  }, [session, filter, fetchCorrections]);

  const handleReview = async (correctionId, newStatus, applyCorrection = false) => {
    setProcessing(correctionId);
    try {
      const res = await fetch("/api/admin/corrections", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          correctionId,
          status: newStatus,
          applyCorrection,
          reviewNotes: `Reviewed by admin on ${new Date().toLocaleDateString()}`,
        }),
      });

      if (res.ok) {
        fetchCorrections();
      }
    } catch (error) {
      console.error("Error reviewing correction:", error);
    } finally {
      setProcessing(null);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Admin Access Required</h1>
          <Link href="/signin" className="btn btn-primary">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  const statusColors = {
    pending: "badge-warning",
    reviewing: "badge-info",
    approved: "badge-success",
    rejected: "badge-error",
    partial: "badge-secondary",
  };

  return (
    <>
      <Header />
      <main className="min-h-screen pt-24 pb-16 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">User Corrections</h1>
              <p className="text-base-content/60 mt-1">
                Review and approve community feedback
              </p>
            </div>
            <Link href="/admin" className="btn btn-ghost">
              Back to Admin
            </Link>
          </div>

          {/* Stats */}
          <div className="stats stats-vertical lg:stats-horizontal shadow bg-base-200 w-full mb-8">
            <div
              className={`stat cursor-pointer hover:bg-base-300 ${
                filter === "pending" ? "bg-base-300" : ""
              }`}
              onClick={() => setFilter("pending")}
            >
              <div className="stat-title">Pending</div>
              <div className="stat-value text-warning">
                {stats.pending || 0}
              </div>
              <div className="stat-desc">Awaiting review</div>
            </div>
            <div
              className={`stat cursor-pointer hover:bg-base-300 ${
                filter === "approved" ? "bg-base-300" : ""
              }`}
              onClick={() => setFilter("approved")}
            >
              <div className="stat-title">Approved</div>
              <div className="stat-value text-success">
                {stats.approved || 0}
              </div>
              <div className="stat-desc">Applied to data</div>
            </div>
            <div
              className={`stat cursor-pointer hover:bg-base-300 ${
                filter === "rejected" ? "bg-base-300" : ""
              }`}
              onClick={() => setFilter("rejected")}
            >
              <div className="stat-title">Rejected</div>
              <div className="stat-value text-error">
                {stats.rejected || 0}
              </div>
              <div className="stat-desc">Invalid corrections</div>
            </div>
            <div
              className={`stat cursor-pointer hover:bg-base-300 ${
                filter === "all" ? "bg-base-300" : ""
              }`}
              onClick={() => setFilter("all")}
            >
              <div className="stat-title">Total</div>
              <div className="stat-value">
                {(stats.pending || 0) +
                  (stats.approved || 0) +
                  (stats.rejected || 0)}
              </div>
              <div className="stat-desc">All corrections</div>
            </div>
          </div>

          {/* Corrections List */}
          {loading ? (
            <div className="flex justify-center p-12">
              <span className="loading loading-spinner loading-lg" />
            </div>
          ) : corrections.length === 0 ? (
            <div className="card bg-base-200 p-12 text-center">
              <h3 className="text-xl font-semibold mb-2">No corrections found</h3>
              <p className="text-base-content/60">
                {filter === "pending"
                  ? "All caught up! No pending corrections."
                  : `No ${filter} corrections.`}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {corrections.map((correction) => (
                <div
                  key={correction.id}
                  className="card bg-base-200 border border-base-300"
                >
                  <div className="card-body">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`badge ${statusColors[correction.status]}`}>
                            {correction.status}
                          </span>
                          <span className="badge badge-outline">
                            {correction.field_corrected}
                          </span>
                        </div>
                        <h3 className="font-semibold">
                          {correction.products?.name || "Unknown Product"}
                        </h3>
                        {correction.norms && (
                          <p className="text-sm text-base-content/50">
                            Norm: {correction.norms.code} - {correction.norms.title}
                          </p>
                        )}
                      </div>
                      <div className="text-sm text-base-content/50">
                        {new Date(correction.created_at).toLocaleDateString()}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="grid md:grid-cols-2 gap-4 mt-4">
                      <div className="p-3 bg-base-300/50 rounded-lg">
                        <div className="text-xs text-base-content/50 mb-1">
                          Original Value
                        </div>
                        <div className="font-mono text-sm">
                          {correction.original_value || "N/A"}
                        </div>
                      </div>
                      <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                        <div className="text-xs text-primary mb-1">
                          Suggested Value
                        </div>
                        <div className="font-mono text-sm">
                          {correction.suggested_value}
                        </div>
                      </div>
                    </div>

                    {/* Reason */}
                    {correction.correction_reason && (
                      <div className="mt-4">
                        <div className="text-xs text-base-content/50 mb-1">
                          Reason
                        </div>
                        <p className="text-sm">{correction.correction_reason}</p>
                      </div>
                    )}

                    {/* Evidence */}
                    {correction.evidence_urls?.length > 0 && (
                      <div className="mt-4">
                        <div className="text-xs text-base-content/50 mb-1">
                          Evidence URLs
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {correction.evidence_urls.map((url, i) => (
                            <a
                              key={i}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="link link-primary text-sm"
                            >
                              Source {i + 1}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Submission info (anonymized) */}
                    <div className="mt-4 pt-4 border-t border-base-300 flex items-center justify-between">
                      <div className="text-sm text-base-content/50">
                        Submitted: {new Date(correction.created_at).toLocaleDateString()}
                      </div>

                      {/* Actions */}
                      {correction.status === "pending" && (
                        <div className="flex gap-2">
                          <button
                            className="btn btn-sm btn-error btn-outline"
                            onClick={() => handleReview(correction.id, "rejected")}
                            disabled={processing === correction.id}
                          >
                            {processing === correction.id ? (
                              <span className="loading loading-spinner loading-xs" />
                            ) : (
                              "Reject"
                            )}
                          </button>
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => handleReview(correction.id, "approved", true)}
                            disabled={processing === correction.id}
                          >
                            {processing === correction.id ? (
                              <span className="loading loading-spinner loading-xs" />
                            ) : (
                              "Approve & Apply"
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
