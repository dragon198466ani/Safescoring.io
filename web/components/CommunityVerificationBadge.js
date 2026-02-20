"use client";

import { useState, useEffect } from "react";

/**
 * CommunityVerificationBadge - Badge montrant les vérifications communautaires
 * Affiche: X normes vérifiées par Y membres
 */
export default function CommunityVerificationBadge({ productId, productSlug }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (productId) {
      fetchStats();
    }
  }, [productId]);

  const fetchStats = async () => {
    try {
      const res = await fetch(`/api/verify?productId=${productId}`);
      const data = await res.json();
      setStats(data.stats);
    } catch (err) {
      console.error("Error fetching verification stats:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="h-6 w-32 bg-base-300 animate-pulse rounded" />;
  }

  const verifications = stats?.total_verifications || 0;
  const verifiers = stats?.unique_verifiers || 0;
  const normsVerified = stats?.norms_verified || 0;
  const totalNorms = stats?.total_norms || 450;
  const agreementRate = stats?.agreement_rate || 0;
  const percentVerified = stats?.percent_verified || 0;

  // Pas de vérifications encore
  if (verifications === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-base-content/50">
        <span>👥</span>
        <span>Pas encore vérifié par la communauté</span>
        <a href="#verify" className="link link-primary text-xs">
          Être le premier →
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Badge principal */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 border border-primary/30 rounded-full">
          <span className="text-primary">✓</span>
          <span className="text-sm font-medium">
            {normsVerified}/{totalNorms} normes vérifiées
          </span>
        </div>
        <span className="text-sm text-base-content/60">
          par {verifiers} membre{verifiers > 1 ? "s" : ""}
        </span>
      </div>

      {/* Barre de progression */}
      <div className="flex items-center gap-2">
        <progress
          className="progress progress-primary w-32 h-2"
          value={percentVerified}
          max="100"
        />
        <span className="text-xs text-base-content/50">
          {percentVerified}% vérifié
        </span>
        {agreementRate > 0 && (
          <span className={`text-xs ${agreementRate >= 80 ? "text-success" : "text-warning"}`}>
            • {agreementRate}% d'accord
          </span>
        )}
      </div>
    </div>
  );
}
