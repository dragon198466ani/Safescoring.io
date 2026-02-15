"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";

/**
 * CorrectionForm - Allows users to submit corrections
 * This creates CLOSED-LOOP DATA that improves our evaluations
 */
export default function CorrectionForm({
  productId,
  productSlug,
  productName,
  normId = null,
  normCode = null,
  currentValue = null,
  onSuccess = () => {},
  onClose = () => {},
}) {
  const { data: session } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    fieldCorrected: normId ? "evaluation" : "product_info",
    suggestedValue: "",
    correctionReason: "",
    evidenceUrls: "",
    evidenceDescription: "",
  });

  const fieldOptions = [
    { value: "evaluation", label: "Evaluation Result (YES/NO/N/A)" },
    { value: "product_info", label: "Product Information" },
    { value: "incident", label: "Security Incident" },
    { value: "methodology", label: "Methodology Suggestion" },
    { value: "other", label: "Other" },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/corrections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          productSlug,
          normId,
          fieldCorrected: formData.fieldCorrected,
          originalValue: currentValue,
          suggestedValue: formData.suggestedValue,
          correctionReason: formData.correctionReason,
          evidenceUrls: formData.evidenceUrls
            ? formData.evidenceUrls.split("\n").filter(Boolean)
            : [],
          evidenceDescription: formData.evidenceDescription,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit correction");
      }

      setSuccess(true);
      onSuccess(data);

      // Reset form after 2 seconds
      setTimeout(() => {
        setFormData({
          fieldCorrected: "product_info",
          suggestedValue: "",
          correctionReason: "",
          evidenceUrls: "",
          evidenceDescription: "",
        });
        setSuccess(false);
      }, 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!session) {
    return (
      <div className="card bg-base-200 p-4">
        <p className="text-center text-base-content/70">
          Please{" "}
          <a href="/signin" className="link link-primary">
            sign in
          </a>{" "}
          to submit corrections and help improve our evaluations.
        </p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="card bg-success/10 border border-success p-6">
        <div className="flex items-center gap-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8 text-success"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <h4 className="font-semibold text-success">Correction Submitted!</h4>
            <p className="text-sm text-base-content/70">
              Thank you for helping improve SafeScoring. Your correction is pending review.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-200 p-4">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 text-primary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
        Suggest a Correction
        {productName && (
          <span className="text-base-content/50 font-normal">
            for {productName}
          </span>
        )}
      </h3>

      {normCode && (
        <div className="mb-4 p-2 bg-base-300 rounded text-sm">
          <span className="text-base-content/50">Norm:</span>{" "}
          <span className="font-mono">{normCode}</span>
          {currentValue && (
            <>
              <span className="text-base-content/50 ml-2">Current:</span>{" "}
              <span
                className={`badge badge-sm ${
                  currentValue === "YES"
                    ? "badge-success"
                    : currentValue === "NO"
                    ? "badge-error"
                    : "badge-warning"
                }`}
              >
                {currentValue}
              </span>
            </>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Field Type */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">What are you correcting?</span>
          </label>
          <select
            className="select select-bordered w-full"
            value={formData.fieldCorrected}
            onChange={(e) =>
              setFormData({ ...formData, fieldCorrected: e.target.value })
            }
            disabled={normId}
          >
            {fieldOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Suggested Value */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">
              {formData.fieldCorrected === "evaluation"
                ? "Correct Value (YES, NO, or N/A)"
                : "Your Suggestion"}
            </span>
          </label>
          {formData.fieldCorrected === "evaluation" ? (
            <select
              className="select select-bordered w-full"
              value={formData.suggestedValue}
              onChange={(e) =>
                setFormData({ ...formData, suggestedValue: e.target.value })
              }
              required
            >
              <option value="">Select correct value...</option>
              <option value="YES">YES - Product implements this</option>
              <option value="YESp">YESp - Implied by design</option>
              <option value="NO">NO - Product does NOT implement this</option>
              <option value="N/A">N/A - Not applicable to this product</option>
            </select>
          ) : (
            <textarea
              className="textarea textarea-bordered w-full"
              placeholder="Describe the correct information..."
              rows={3}
              value={formData.suggestedValue}
              onChange={(e) =>
                setFormData({ ...formData, suggestedValue: e.target.value })
              }
              required
            />
          )}
        </div>

        {/* Reason */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">Why is this incorrect?</span>
          </label>
          <textarea
            className="textarea textarea-bordered w-full"
            placeholder="Explain why the current value is wrong..."
            rows={2}
            value={formData.correctionReason}
            onChange={(e) =>
              setFormData({ ...formData, correctionReason: e.target.value })
            }
          />
        </div>

        {/* Evidence URLs */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">Evidence URLs (one per line)</span>
            <span className="label-text-alt text-base-content/50">Optional</span>
          </label>
          <textarea
            className="textarea textarea-bordered w-full font-mono text-sm"
            placeholder="https://docs.example.com/security&#10;https://github.com/..."
            rows={2}
            value={formData.evidenceUrls}
            onChange={(e) =>
              setFormData({ ...formData, evidenceUrls: e.target.value })
            }
          />
        </div>

        {/* Error Display */}
        {error && (
          <div className="alert alert-error">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting || !formData.suggestedValue}
          >
            {isSubmitting ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              "Submit Correction"
            )}
          </button>
        </div>

        <p className="text-xs text-base-content/50 text-center">
          Approved corrections earn reputation points. High-reputation users get
          priority review.
        </p>
      </form>
    </div>
  );
}
