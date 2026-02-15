"use client";

import { useState, useEffect } from "react";

/**
 * Referral Dashboard Component
 * Shows user's referral stats, link, and rewards
 */
export default function ReferralDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/referral");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error fetching referral stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    if (stats?.referralLink) {
      navigator.clipboard.writeText(stats.referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl bg-base-200 border border-base-300 p-6 animate-pulse">
        <div className="h-6 bg-base-300 rounded w-1/3 mb-4"></div>
        <div className="h-10 bg-base-300 rounded mb-4"></div>
        <div className="grid grid-cols-3 gap-4">
          <div className="h-16 bg-base-300 rounded"></div>
          <div className="h-16 bg-base-300 rounded"></div>
          <div className="h-16 bg-base-300 rounded"></div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="rounded-xl bg-gradient-to-br from-primary/10 to-base-200 border border-base-300 p-6">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <span>🎁</span>
        Invite Friends, Earn Rewards
      </h2>

      <p className="text-base-content/70 mb-6">
        Share SafeScoring with friends and earn rewards when they sign up!
      </p>

      {/* Referral Link */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Your Referral Link</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={stats.referralLink}
            readOnly
            className="input input-bordered flex-1 font-mono text-sm"
          />
          <button
            onClick={copyLink}
            className={`btn ${copied ? 'btn-success' : 'btn-primary'}`}
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
        <p className="text-xs text-base-content/50 mt-2">
          Code: <span className="font-mono font-bold">{stats.referralCode}</span>
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-base-300/50 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-primary">{stats.totalReferrals}</div>
          <div className="text-sm text-base-content/60">Total Invites</div>
        </div>
        <div className="bg-base-300/50 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-green-400">{stats.confirmedReferrals}</div>
          <div className="text-sm text-base-content/60">Confirmed</div>
        </div>
        <div className="bg-base-300/50 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-amber-400">{stats.totalRewards}</div>
          <div className="text-sm text-base-content/60">Rewards Earned</div>
        </div>
      </div>

      {/* Rewards Info */}
      <div className="bg-base-300/30 rounded-lg p-4">
        <h3 className="font-semibold mb-2">Rewards Program</h3>
        <ul className="text-sm text-base-content/70 space-y-1">
          <li>✨ <strong>1 confirmed referral</strong> = 1 month free Explorer tier</li>
          <li>✨ <strong>5 referrals</strong> = 1 month free Professional tier</li>
          <li>✨ <strong>10+ referrals</strong> = Lifetime free Professional tier</li>
        </ul>
      </div>

      {/* Share buttons */}
      <div className="mt-6 flex flex-wrap gap-2">
        <a
          href={`https://twitter.com/intent/tweet?text=Check%20your%20crypto%20wallet%27s%20security%20score%20on%20SafeScoring%20%F0%9F%94%92&url=${encodeURIComponent(stats.referralLink)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-sm btn-outline"
        >
          Share on X
        </a>
        <a
          href={`https://t.me/share/url?url=${encodeURIComponent(stats.referralLink)}&text=Check%20your%20crypto%20wallet's%20security%20score!`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-sm btn-outline"
        >
          Share on Telegram
        </a>
        <a
          href={`mailto:?subject=Check%20your%20crypto%20security&body=I've%20been%20using%20SafeScoring%20to%20verify%20my%20crypto%20wallets.%20Check%20it%20out:%20${encodeURIComponent(stats.referralLink)}`}
          className="btn btn-sm btn-outline"
        >
          Share via Email
        </a>
      </div>
    </div>
  );
}
