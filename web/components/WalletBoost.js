/**
 * WalletBoost - Connexion wallet optionnelle pour boost de vote
 *
 * Permet aux utilisateurs de connecter leur wallet pour:
 * - Augmenter leur poids de vote (jusqu'à 1.5x)
 * - Être éligible à l'airdrop $SAFE
 * - Afficher un badge "Crypto Verified"
 *
 * 100% optionnel - fonctionne aussi sans wallet
 */

"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useApi } from "@/hooks/useApi";

export default function WalletBoost({ onWalletConnected }) {
  const { data: session } = useSession();
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);

  // Local state for overrides after connect/disconnect actions
  const [localWalletData, setLocalWalletData] = useState(null);
  const [wasDisconnected, setWasDisconnected] = useState(false);

  // Fetch existing wallet with useApi (2-minute cache, only when session exists)
  const { data: walletData, isLoading: loadingWallet, invalidate } = useApi(
    session ? "/api/user/wallets" : null,
    { ttl: 2 * 60 * 1000 }
  );

  // Use local overrides or API data
  const walletAddress = useMemo(() => {
    if (wasDisconnected) return null;
    if (localWalletData) return localWalletData.address;
    return walletData?.wallet?.address || null;
  }, [walletData, localWalletData, wasDisconnected]);

  const walletStats = useMemo(() => {
    if (wasDisconnected) return null;
    if (localWalletData) return localWalletData.stats;
    return walletData?.wallet?.stats || null;
  }, [walletData, localWalletData, wasDisconnected]);

  // Vote weight is always 1.0 - neutral scoring (1 person = 1 vote)
  const voteWeight = 1.0;

  const connectWallet = async () => {
    if (!window.ethereum) {
      setError("Installez MetaMask ou un wallet compatible");
      return;
    }

    setConnecting(true);
    setError(null);

    try {
      // Demander connexion
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts"
      });

      if (!accounts?.[0]) {
        throw new Error("Aucun compte sélectionné");
      }

      const address = accounts[0];

      // Signer un message pour prouver la propriété
      const message = `SafeScoring Verification\nTimestamp: ${Date.now()}`;
      const signature = await window.ethereum.request({
        method: "personal_sign",
        params: [message, address]
      });

      // Envoyer au serveur pour vérification
      const res = await fetch("/api/user/wallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, message, signature })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erreur de vérification");
      }

      // Update local state immediately and invalidate cache
      setLocalWalletData({ address, stats: data.stats, voteWeight: data.voteWeight });
      setWasDisconnected(false);
      invalidate();

      if (onWalletConnected) {
        onWalletConnected(address, data.voteWeight);
      }
    } catch (err) {
      console.error("Wallet connection error:", err);
      setError(err.message || "Erreur de connexion");
    } finally {
      setConnecting(false);
    }
  };

  const disconnectWallet = async () => {
    try {
      await fetch("/api/user/wallets", { method: "DELETE" });
      // Clear local state and invalidate cache
      setLocalWalletData(null);
      setWasDisconnected(true);
      invalidate();
    } catch (e) {
      console.error("Error disconnecting:", e);
    }
  };

  if (!session) {
    return null; // Connectez-vous d'abord
  }

  // Wallet déjà connecté
  if (walletAddress) {
    return (
      <div className="p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🦊</span>
            <span className="font-medium">Wallet connecté</span>
            <span className="px-2 py-0.5 bg-green-500/20 text-green-600 text-xs rounded-full">
              Vérifié
            </span>
          </div>
          <button
            onClick={disconnectWallet}
            className="text-xs text-base-content/60 hover:text-error"
          >
            Déconnecter
          </button>
        </div>

        <div className="font-mono text-sm text-base-content/70 mb-3">
          {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
        </div>

        {/* Stats du wallet */}
        <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
          <div className="text-center p-2 bg-base-200 rounded">
            <div className="font-bold text-primary">
              {walletStats?.walletAgeDays || 0}j
            </div>
            <div className="text-base-content/60">Âge</div>
          </div>
          <div className="text-center p-2 bg-base-200 rounded">
            <div className="font-bold text-primary">
              {walletStats?.totalTxCount || 0}
            </div>
            <div className="text-base-content/60">Transactions</div>
          </div>
          <div className="text-center p-2 bg-base-200 rounded">
            <div className="font-bold text-primary">
              {walletStats?.hasDefiActivity ? "✓" : "—"}
            </div>
            <div className="text-base-content/60">DeFi</div>
          </div>
        </div>

        {/* Neutral voting */}
        <div className="flex items-center justify-between p-2 bg-base-200 rounded">
          <span className="text-sm">Vote</span>
          <span className="font-bold text-sm text-base-content/70">
            1 personne = 1 vote
          </span>
        </div>
      </div>
    );
  }

  // Pas encore connecté
  return (
    <div className="p-4 bg-base-200/50 border border-base-300 rounded-lg">
      <div className="flex items-start gap-3 mb-4">
        <span className="text-2xl">🦊</span>
        <div>
          <h4 className="font-medium mb-1">Boostez votre vote</h4>
          <p className="text-sm text-base-content/70">
            Connectez votre wallet pour multiplier votre poids de vote jusqu'à 1.5x
          </p>
        </div>
      </div>

      {/* Avantages */}
      <ul className="text-sm space-y-1 mb-4 text-base-content/70">
        <li className="flex items-center gap-2">
          <span className="text-green-500">✓</span>
          Poids de vote augmenté
        </li>
        <li className="flex items-center gap-2">
          <span className="text-green-500">✓</span>
          Badge "Crypto Verified"
        </li>
        <li className="flex items-center gap-2">
          <span className="text-green-500">✓</span>
          Éligible airdrop $SAFE
        </li>
        <li className="flex items-center gap-2">
          <span className="text-blue-500">ℹ</span>
          100% optionnel
        </li>
      </ul>

      {error && (
        <div className="p-2 mb-3 bg-error/10 text-error text-sm rounded">
          {error}
        </div>
      )}

      <button
        onClick={connectWallet}
        disabled={connecting}
        className={`w-full btn btn-primary ${connecting ? "loading" : ""}`}
      >
        {connecting ? "Connexion..." : "Connecter Wallet"}
      </button>

      <p className="mt-3 text-xs text-base-content/50 text-center">
        Aucune donnée personnelle collectée.
        <br />
        Signature gratuite, pas de transaction.
      </p>
    </div>
  );
}
