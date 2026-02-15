"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import CorrectionForm from "./CorrectionForm";

/**
 * CorrectionSection - Collapsible section for submitting corrections
 * Creates closed-loop data that improves evaluations
 */
export default function CorrectionSection({ productId, productSlug, productName }) {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [recentSubmission, setRecentSubmission] = useState(null);

  const handleSuccess = (data) => {
    setRecentSubmission(data);
    setTimeout(() => setRecentSubmission(null), 5000);
  };

  return (
    <div className="rounded-xl bg-base-200 border border-base-300 overflow-hidden">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-6 flex items-center justify-between hover:bg-base-300/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
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
          </div>
          <div className="text-left">
            <h3 className="font-semibold">Help Improve This Evaluation</h3>
            <p className="text-sm text-base-content/60">
              Found inaccurate data? Submit a correction and help improve this evaluation.
            </p>
          </div>
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-5 w-5 text-base-content/50 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Collapsible Content */}
      {isOpen && (
        <div className="px-6 pb-6 border-t border-base-300">
          <div className="pt-4">
            {recentSubmission ? (
              <div className="alert alert-success">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
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
                  <h4 className="font-semibold">Correction Submitted!</h4>
                  <p className="text-sm">
                    Thank you for helping improve SafeScoring. Your correction is pending review.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Info about the system */}
                <div className="mb-4 p-3 rounded-lg bg-info/10 border border-info/20">
                  <div className="flex items-start gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-info mt-0.5 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div className="text-sm">
                      <p className="font-medium text-info">How corrections work:</p>
                      <ul className="mt-1 text-base-content/70 space-y-1">
                        <li>1. Submit a correction with evidence</li>
                        <li>2. When 3 users suggest the same fix, it auto-approves</li>
                        <li>3. The evaluation updates automatically</li>
                        <li>4. The community benefits from better data</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <CorrectionForm
                  productId={productId}
                  productSlug={productSlug}
                  productName={productName}
                  onSuccess={handleSuccess}
                  onClose={() => setIsOpen(false)}
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
