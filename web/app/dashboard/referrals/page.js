"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import config from "@/config";

export default function ReferralsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/signin");
      return;
    }
    if (status === "authenticated") {
      fetch("/api/referral")
        .then((res) => res.json())
        .then((d) => {
          setData(d);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [status, router]);

  const handleCopy = async () => {
    if (!data?.shareUrl) return;
    try {
      await navigator.clipboard.writeText(data.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (!data || data.error) {
    return (
      <div className="text-center py-12">
        <p className="text-base-content/60">Unable to load referral data.</p>
      </div>
    );
  }

  const progressPercent = data.nextTier
    ? Math.min(100, (data.referralCount / data.nextTier.min) * 100)
    : 100;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Invite Friends</h1>
      <p className="text-base-content/60 mb-8">
        Share SafeScoring and earn rewards. Community channels are in English.
      </p>

      {/* Share URL Card */}
      <div className="rounded-xl bg-base-200 border border-base-300 p-6 mb-8">
        <label className="text-sm font-medium text-base-content/70 mb-2 block">
          Your referral link
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={data.shareUrl}
            className="input input-bordered flex-1 text-sm font-mono"
          />
          <button onClick={handleCopy} className="btn btn-primary btn-sm">
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <p className="text-xs text-base-content/40 mt-2">
          Code: <span className="font-mono font-bold">{data.referralCode}</span>
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="rounded-xl bg-base-200 border border-base-300 p-5 text-center">
          <div className="text-3xl font-bold text-primary">{data.referralCount}</div>
          <div className="text-sm text-base-content/60 mt-1">Friends invited</div>
        </div>
        <div className="rounded-xl bg-base-200 border border-base-300 p-5 text-center">
          <div className="text-3xl font-bold text-secondary">
            {data.currentTier || "—"}
          </div>
          <div className="text-sm text-base-content/60 mt-1">Current tier</div>
        </div>
      </div>

      {/* Progress to next tier */}
      {data.nextTier && (
        <div className="rounded-xl bg-base-200 border border-base-300 p-6 mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              Next: {data.nextTier.name}
            </span>
            <span className="text-sm text-base-content/60">
              {data.referralCount}/{data.nextTier.min} referrals
            </span>
          </div>
          <div className="w-full h-2 bg-base-300 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {data.nextTier.reward && (
            <p className="text-xs text-base-content/50 mt-2">
              Reward: {data.nextTier.reward}
            </p>
          )}
        </div>
      )}

      {/* Tiers Table */}
      <div className="rounded-xl bg-base-200 border border-base-300 overflow-hidden">
        <div className="px-6 py-4 border-b border-base-300">
          <h2 className="font-semibold">Reward Tiers</h2>
        </div>
        <div className="divide-y divide-base-300">
          {(data.tiers || []).map((tier) => (
            <div
              key={tier.name}
              className={`px-6 py-4 flex items-center justify-between ${
                data.currentTier === tier.name ? "bg-primary/5" : ""
              }`}
            >
              <div>
                <span className="font-medium">{tier.name}</span>
                <span className="text-sm text-base-content/50 ml-2">
                  {tier.min}+ referrals
                </span>
              </div>
              <span className="text-sm text-base-content/70">
                {tier.reward || "—"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
