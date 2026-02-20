"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

/**
 * TokenWallet - Display user's $SAFE token balance and spending options
 */
export default function TokenWallet({ onUnlock, compact = false }) {
  const { data: session } = useSession();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [spending, setSpending] = useState(null);

  useEffect(() => {
    if (session?.user) {
      fetchTokenData();
    } else {
      setLoading(false);
    }
  }, [session]);

  const fetchTokenData = async () => {
    try {
      const res = await fetch("/api/tokens");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (error) {
      console.error("Error fetching tokens:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSpend = async (itemCode, referenceId = null) => {
    setSpending(itemCode);
    try {
      const res = await fetch("/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemCode, referenceId }),
      });

      const result = await res.json();

      if (result.success) {
        // Refresh data
        await fetchTokenData();
        if (onUnlock) {
          onUnlock(itemCode, referenceId);
        }
      } else {
        alert(result.error || "Erreur lors de l'achat");
      }
    } catch (error) {
      console.error("Error spending tokens:", error);
    } finally {
      setSpending(null);
    }
  };

  if (!session?.user) {
    return null;
  }

  if (loading) {
    return (
      <div className="animate-pulse bg-base-200 rounded-xl p-4">
        <div className="h-6 bg-base-300 rounded w-24 mb-2"></div>
        <div className="h-10 bg-base-300 rounded w-32"></div>
      </div>
    );
  }

  const balance = data?.balance?.available || 0;
  const economics = data?.economics;

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-lg border border-amber-500/20">
        <span className="text-lg">🪙</span>
        <span className="font-bold">{balance}</span>
        <span className="text-xs opacity-60">$SAFE</span>
      </div>
    );
  }

  return (
    <div className="bg-base-100 rounded-2xl border border-base-300 overflow-hidden">
      {/* Header - Balance */}
      <div className="p-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-b border-amber-500/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-70">Ton solde</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{balance}</span>
              <span className="text-lg opacity-60">$SAFE</span>
            </div>
          </div>
          <div className="text-4xl">🪙</div>
        </div>

        {/* Stats */}
        <div className="flex gap-4 mt-3 text-sm">
          <div>
            <span className="opacity-60">Gagné: </span>
            <span className="text-green-400">+{data?.balance?.lifetimeEarned || 0}</span>
          </div>
          <div>
            <span className="opacity-60">Dépensé: </span>
            <span className="text-orange-400">-{data?.balance?.lifetimeSpent || 0}</span>
          </div>
        </div>
      </div>

      {/* How to earn */}
      <div className="p-4 border-b border-base-300">
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <span className="text-green-400">+</span> Comment gagner
        </h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {data?.earnRules?.slice(0, 4).map((rule) => (
            <div key={rule.action_code} className="flex justify-between">
              <span className="opacity-70 truncate">{rule.description?.split(" ").slice(0, 3).join(" ")}</span>
              <span className="text-green-400 font-medium">+{rule.tokens}</span>
            </div>
          ))}
        </div>
      </div>

      {/* What to spend on */}
      <div className="p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <span className="text-orange-400">-</span> Débloquer avec tes tokens
        </h3>
        <div className="space-y-2">
          {data?.items?.map((item) => {
            const canAfford = balance >= item.tokens_cost;
            const isUnlocked = data?.unlocks?.some(
              (u) => u.item_code === item.item_code
            );

            return (
              <div
                key={item.item_code}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  isUnlocked
                    ? "bg-green-500/10 border-green-500/30"
                    : canAfford
                    ? "bg-base-200 border-base-300 hover:border-amber-500/50"
                    : "bg-base-200/50 border-base-300 opacity-50"
                }`}
              >
                <div className="flex-1">
                  <p className="font-medium text-sm">{item.description}</p>
                  {item.equivalent_plan && (
                    <p className="text-xs opacity-50">
                      Normalement {item.equivalent_plan}+
                    </p>
                  )}
                </div>

                {isUnlocked ? (
                  <span className="badge badge-success badge-sm">Débloqué</span>
                ) : (
                  <button
                    onClick={() => handleSpend(item.item_code)}
                    disabled={!canAfford || spending === item.item_code}
                    className={`btn btn-sm ${
                      canAfford ? "btn-warning" : "btn-disabled"
                    }`}
                  >
                    {spending === item.item_code ? (
                      <span className="loading loading-spinner loading-xs"></span>
                    ) : (
                      <>{item.tokens_cost} 🪙</>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Token economics - deflationary */}
      {economics && (
        <div className="p-4 bg-base-200/50 border-t border-base-300">
          <div className="flex items-center justify-between text-xs">
            <span className="opacity-60">Supply: {(economics.total_supply / 1000000).toFixed(0)}M</span>
            <span className="text-red-400">🔥 {economics.burn_percentage}% brûlé</span>
          </div>
          <div className="mt-1 h-1.5 bg-base-300 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-red-500"
              style={{ width: `${100 - (economics.total_circulating / economics.total_supply) * 100}%` }}
            />
          </div>
          <p className="text-xs opacity-40 mt-1 text-center">
            50% des tokens dépensés sont brûlés = plus rare
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Compact token balance for header/navbar
 */
export function TokenBalance() {
  return <TokenWallet compact />;
}

/**
 * Unlock button - shows price and handles unlock flow
 */
export function TokenUnlockButton({
  itemCode,
  referenceId,
  children,
  onUnlock,
  className = "",
}) {
  const { data: session } = useSession();
  const [access, setAccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(false);

  useEffect(() => {
    checkAccess();
  }, [session, itemCode, referenceId]);

  const checkAccess = async () => {
    if (!session?.user) {
      setAccess({ hasAccess: false });
      setLoading(false);
      return;
    }

    try {
      const params = new URLSearchParams({ item: itemCode });
      if (referenceId) params.append("ref", referenceId);

      const res = await fetch(`/api/tokens/check-access?${params}`);
      if (res.ok) {
        const data = await res.json();
        setAccess(data);
      }
    } catch (error) {
      console.error("Error checking access:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = async () => {
    setUnlocking(true);
    try {
      const res = await fetch("/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemCode, referenceId }),
      });

      const result = await res.json();
      if (result.success) {
        await checkAccess();
        if (onUnlock) onUnlock();
      } else {
        alert(result.error || "Erreur");
      }
    } catch (error) {
      console.error("Error unlocking:", error);
    } finally {
      setUnlocking(false);
    }
  };

  if (loading) {
    return <div className="loading loading-spinner loading-sm" />;
  }

  // Has access (via subscription or token)
  if (access?.hasAccess) {
    return <>{children}</>;
  }

  // Can unlock with tokens
  if (access?.canUnlock) {
    return (
      <div className={`${className}`}>
        <button
          onClick={handleUnlock}
          disabled={unlocking}
          className="btn btn-warning btn-sm gap-2"
        >
          {unlocking ? (
            <span className="loading loading-spinner loading-xs" />
          ) : (
            <>
              🔓 Débloquer ({access.tokenCost} 🪙)
            </>
          )}
        </button>
      </div>
    );
  }

  // Can't unlock - needs more tokens or subscription
  return (
    <div className={`${className} text-center`}>
      <p className="text-sm opacity-60 mb-2">
        Réservé aux abonnés {access?.requiredPlan}+
      </p>
      <div className="flex gap-2 justify-center">
        <a href="/pricing" className="btn btn-primary btn-sm">
          S'abonner
        </a>
        <span className="text-xs opacity-40 self-center">ou</span>
        <span className="text-xs opacity-60 self-center">
          {access?.tokenCost} 🪙 (tu as {access?.userBalance})
        </span>
      </div>
    </div>
  );
}
