"use client";

import { useState, useEffect } from "react";

export default function CustomEvaluationRequest() {
  const [isEnterprise, setIsEnterprise] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [requests, setRequests] = useState([]);
  const [quota, setQuota] = useState({ used: 0, limit: 5, remaining: 5 });
  const [formData, setFormData] = useState({
    productName: "",
    productUrl: "",
    justification: "",
  });
  const [status, setStatus] = useState(null); // null | "loading" | "success" | "error"
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await fetch("/api/enterprise/evaluation-request");
      if (res.status === 403 || res.status === 401) {
        setIsEnterprise(false);
        return;
      }
      if (res.ok) {
        setIsEnterprise(true);
        const data = await res.json();
        setRequests(data.requests || []);
        setQuota(data.quota || { used: 0, limit: 5, remaining: 5 });
      }
    } catch (e) {
      console.error("Failed to fetch evaluation requests:", e);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/enterprise/evaluation-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit request");
      }

      setStatus("success");
      setFormData({ productName: "", productUrl: "", justification: "" });
      if (data.quota) setQuota(data.quota);
      fetchRequests();

      setTimeout(() => {
        setStatus(null);
        setIsOpen(false);
      }, 2000);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err.message);
    }
  };

  if (!isEnterprise) return null;

  return (
    <div className="mb-6">
      {/* Button + Quota */}
      <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
        <div>
          <h3 className="font-bold text-sm">Custom Evaluations</h3>
          <p className="text-xs text-base-content/60">
            {quota.remaining}/{quota.limit} remaining this month
          </p>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          disabled={quota.remaining <= 0}
          className="btn btn-primary btn-sm"
        >
          {quota.remaining <= 0 ? "Limit Reached" : "Request Evaluation"}
        </button>
      </div>

      {/* Previous requests */}
      {requests.length > 0 && (
        <div className="mt-3 space-y-2">
          {requests.slice(0, 3).map((req) => (
            <div
              key={req.id}
              className="flex items-center justify-between bg-base-200 rounded-lg px-4 py-2 text-sm"
            >
              <span className="font-medium truncate mr-4">{req.product_name}</span>
              <span
                className={`badge badge-sm ${
                  req.status === "completed"
                    ? "badge-success"
                    : req.status === "in_progress"
                    ? "badge-warning"
                    : req.status === "rejected"
                    ? "badge-error"
                    : "badge-ghost"
                }`}
              >
                {req.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isOpen && (
        <div className="modal modal-open">
          <div className="modal-box max-w-md">
            <h3 className="font-bold text-lg mb-1">Request Custom Evaluation</h3>
            <p className="text-sm text-base-content/60 mb-4">
              We&apos;ll evaluate this product against our SAFE methodology within 5 business days.
            </p>

            {status === "success" ? (
              <div className="text-center py-4">
                <svg
                  className="w-12 h-12 text-success mx-auto mb-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="font-medium">Request Submitted!</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">
                    <span className="label-text text-sm font-medium">Product Name *</span>
                  </label>
                  <input
                    type="text"
                    value={formData.productName}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, productName: e.target.value }))
                    }
                    required
                    minLength={2}
                    maxLength={200}
                    className="input input-bordered input-sm w-full"
                    placeholder="e.g., Phantom Wallet"
                  />
                </div>

                <div>
                  <label className="label">
                    <span className="label-text text-sm font-medium">Product URL</span>
                  </label>
                  <input
                    type="url"
                    value={formData.productUrl}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, productUrl: e.target.value }))
                    }
                    maxLength={500}
                    className="input input-bordered input-sm w-full"
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="label">
                    <span className="label-text text-sm font-medium">
                      Why do you need this evaluation? *
                    </span>
                  </label>
                  <textarea
                    value={formData.justification}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, justification: e.target.value }))
                    }
                    required
                    minLength={10}
                    maxLength={1000}
                    rows={3}
                    className="textarea textarea-bordered textarea-sm w-full"
                    placeholder="e.g., Considering for treasury allocation..."
                  />
                </div>

                {status === "error" && (
                  <div className="alert alert-error text-sm py-2">
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="btn btn-ghost btn-sm flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={status === "loading"}
                    className="btn btn-primary btn-sm flex-1"
                  >
                    {status === "loading" ? (
                      <span className="loading loading-spinner loading-xs" />
                    ) : (
                      "Submit Request"
                    )}
                  </button>
                </div>

                <p className="text-xs text-base-content/50 text-center">
                  {quota.remaining}/{quota.limit} requests remaining this month
                </p>
              </form>
            )}
          </div>
          <div
            className="modal-backdrop bg-black/50"
            onClick={() => {
              setIsOpen(false);
              setStatus(null);
            }}
          />
        </div>
      )}
    </div>
  );
}
