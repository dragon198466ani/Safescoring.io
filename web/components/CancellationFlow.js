"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * CancellationFlow Component
 * Multi-step cancellation flow with retention offers
 */
export default function CancellationFlow({ isOpen, onClose, currentPlan }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [flowId, setFlowId] = useState(null);
  const [selectedReason, setSelectedReason] = useState(null);
  const [reasonDetail, setReasonDetail] = useState("");
  const [currentOffer, setCurrentOffer] = useState(null);
  const [downgradeOptions, setDowngradeOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const reasons = [
    { code: "too_expensive", label: "Too expensive", emoji: "💰" },
    { code: "not_using", label: "Not using it enough", emoji: "😴" },
    { code: "missing_feature", label: "Missing a feature I need", emoji: "🔧" },
    { code: "competitor", label: "Switching to another service", emoji: "🏃" },
    { code: "temporary", label: "Just need a break", emoji: "⏸️" },
    { code: "other", label: "Other reason", emoji: "💬" },
  ];

  // Step 1: Initialize flow
  const initializeFlow = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/subscription/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "initiate" }),
      });
      const data = await res.json();
      if (data.flowId) {
        setFlowId(data.flowId);
        setStep(2);
      }
    } catch (error) {
      console.error("Error initializing flow:", error);
    }
    setLoading(false);
  };

  // Step 2: Submit reason
  const submitReason = async () => {
    if (!selectedReason) return;
    setLoading(true);
    try {
      const res = await fetch("/api/subscription/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit_reason",
          flowId,
          reason: selectedReason,
          detail: reasonDetail,
        }),
      });
      const data = await res.json();
      if (data.offer) {
        setCurrentOffer(data.offer);
        setStep(3);
      }
    } catch (error) {
      console.error("Error submitting reason:", error);
    }
    setLoading(false);
  };

  // Step 3: Accept offer
  const acceptOffer = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/subscription/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept_offer", flowId }),
      });
      const data = await res.json();
      setResult(data);
      setStep(5);
    } catch (error) {
      console.error("Error accepting offer:", error);
    }
    setLoading(false);
  };

  // Step 3: Reject offer
  const rejectOffer = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/subscription/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject_offer", flowId }),
      });
      const data = await res.json();
      setDowngradeOptions(data.downgradeOptions || []);
      setStep(4);
    } catch (error) {
      console.error("Error rejecting offer:", error);
    }
    setLoading(false);
  };

  // Step 4: Downgrade
  const downgrade = async (targetPlan) => {
    setLoading(true);
    try {
      const res = await fetch("/api/subscription/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "downgrade", flowId, targetPlan }),
      });
      const data = await res.json();
      setResult(data);
      setStep(5);
    } catch (error) {
      console.error("Error downgrading:", error);
    }
    setLoading(false);
  };

  // Step 4: Pause
  const pauseSubscription = async (months) => {
    setLoading(true);
    try {
      const res = await fetch("/api/subscription/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pause", flowId, months }),
      });
      const data = await res.json();
      setResult(data);
      setStep(5);
    } catch (error) {
      console.error("Error pausing:", error);
    }
    setLoading(false);
  };

  // Step 4: Complete cancellation
  const completeCancellation = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/subscription/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete", flowId }),
      });
      const data = await res.json();
      setResult(data);
      setStep(5);
    } catch (error) {
      console.error("Error completing cancellation:", error);
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-lg">
        {/* Step 1: Confirmation */}
        {step === 1 && (
          <>
            <h3 className="font-bold text-xl mb-4">Cancel your subscription?</h3>
            <p className="text-base-content/70 mb-6">
              We&apos;re sorry to see you go. Before you cancel, we&apos;d love to help you get
              more value from SafeScoring.
            </p>
            <div className="flex gap-3">
              <button className="btn btn-outline flex-1" onClick={onClose}>
                Keep My Plan
              </button>
              <button
                className="btn btn-error flex-1"
                onClick={initializeFlow}
                disabled={loading}
              >
                {loading ? <span className="loading loading-spinner" /> : "Continue"}
              </button>
            </div>
          </>
        )}

        {/* Step 2: Reason Selection */}
        {step === 2 && (
          <>
            <h3 className="font-bold text-xl mb-4">Why are you leaving?</h3>
            <p className="text-base-content/70 mb-4">
              Your feedback helps us improve SafeScoring for everyone.
            </p>
            <div className="space-y-2 mb-4">
              {reasons.map((reason) => (
                <label
                  key={reason.code}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedReason === reason.code
                      ? "border-primary bg-primary/10"
                      : "border-base-300 hover:border-primary/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="reason"
                    className="radio radio-primary"
                    checked={selectedReason === reason.code}
                    onChange={() => setSelectedReason(reason.code)}
                  />
                  <span className="text-lg">{reason.emoji}</span>
                  <span>{reason.label}</span>
                </label>
              ))}
            </div>
            {["missing_feature", "competitor", "other"].includes(selectedReason) && (
              <textarea
                className="textarea textarea-bordered w-full mb-4"
                placeholder="Tell us more (optional)..."
                value={reasonDetail}
                onChange={(e) => setReasonDetail(e.target.value)}
                rows={3}
              />
            )}
            <div className="flex gap-3">
              <button className="btn btn-outline flex-1" onClick={() => setStep(1)}>
                Back
              </button>
              <button
                className="btn btn-primary flex-1"
                onClick={submitReason}
                disabled={!selectedReason || loading}
              >
                {loading ? <span className="loading loading-spinner" /> : "Continue"}
              </button>
            </div>
          </>
        )}

        {/* Step 3: Retention Offer */}
        {step === 3 && currentOffer && (
          <>
            <h3 className="font-bold text-xl mb-2">Wait! We have an offer for you</h3>
            <div className="bg-success/10 border border-success rounded-lg p-4 my-4">
              <p className="text-lg font-semibold text-success mb-2">
                {currentOffer.name}
              </p>
              <p className="text-base-content/80">{currentOffer.message}</p>
              {currentOffer.estimatedSavings > 0 && (
                <p className="text-success font-medium mt-2">
                  You&apos;ll save ${currentOffer.estimatedSavings.toFixed(2)}
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                className="btn btn-outline flex-1"
                onClick={rejectOffer}
                disabled={loading}
              >
                No Thanks
              </button>
              <button
                className="btn btn-success flex-1"
                onClick={acceptOffer}
                disabled={loading}
              >
                {loading ? (
                  <span className="loading loading-spinner" />
                ) : (
                  "Accept Offer"
                )}
              </button>
            </div>
          </>
        )}

        {/* Step 4: Alternatives */}
        {step === 4 && (
          <>
            <h3 className="font-bold text-xl mb-4">Consider these alternatives</h3>

            {/* Downgrade options */}
            {downgradeOptions.length > 0 && (
              <div className="mb-4">
                <p className="font-medium mb-2">Downgrade to a lower plan:</p>
                <div className="space-y-2">
                  {downgradeOptions.map((plan) => (
                    <button
                      key={plan.planCode}
                      className="btn btn-outline w-full justify-between"
                      onClick={() => downgrade(plan.planCode)}
                      disabled={loading}
                    >
                      <span>{plan.name}</span>
                      <span className="badge badge-primary">${plan.price}/mo</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Pause option */}
            <div className="mb-4">
              <p className="font-medium mb-2">Pause your subscription:</p>
              <div className="flex gap-2">
                {[1, 2, 3].map((months) => (
                  <button
                    key={months}
                    className="btn btn-outline flex-1"
                    onClick={() => pauseSubscription(months)}
                    disabled={loading}
                  >
                    {months} month{months > 1 ? "s" : ""}
                  </button>
                ))}
              </div>
              <p className="text-sm text-base-content/60 mt-2">
                Your data will be preserved during the pause.
              </p>
            </div>

            <div className="divider">OR</div>

            <button
              className="btn btn-error w-full"
              onClick={completeCancellation}
              disabled={loading}
            >
              {loading ? (
                <span className="loading loading-spinner" />
              ) : (
                "Cancel Subscription"
              )}
            </button>
          </>
        )}

        {/* Step 5: Result */}
        {step === 5 && result && (
          <>
            <div className="text-center py-4">
              {result.cancelled ? (
                <>
                  <div className="text-4xl mb-4">👋</div>
                  <h3 className="font-bold text-xl mb-2">Subscription Cancelled</h3>
                  <p className="text-base-content/70 mb-4">{result.message}</p>
                  {result.dataDeletesAt && (
                    <p className="text-sm text-warning">
                      Your data will be preserved until{" "}
                      {new Date(result.dataDeletesAt).toLocaleDateString()}
                    </p>
                  )}
                </>
              ) : result.paused ? (
                <>
                  <div className="text-4xl mb-4">⏸️</div>
                  <h3 className="font-bold text-xl mb-2">Subscription Paused</h3>
                  <p className="text-base-content/70 mb-4">{result.message}</p>
                </>
              ) : result.newPlan ? (
                <>
                  <div className="text-4xl mb-4">✅</div>
                  <h3 className="font-bold text-xl mb-2">Plan Changed</h3>
                  <p className="text-base-content/70 mb-4">{result.message}</p>
                </>
              ) : (
                <>
                  <div className="text-4xl mb-4">🎉</div>
                  <h3 className="font-bold text-xl mb-2">Thanks for staying!</h3>
                  <p className="text-base-content/70 mb-4">{result.message}</p>
                </>
              )}
            </div>
            <button
              className="btn btn-primary w-full"
              onClick={() => {
                onClose();
                router.refresh();
              }}
            >
              Done
            </button>
          </>
        )}
      </div>
      <div className="modal-backdrop bg-black/50" onClick={onClose} />
    </div>
  );
}
