"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";

/**
 * VerifyNormButton - Bouton pour vérifier une norme et gagner des $SAFE
 */
export default function VerifyNormButton({
  productId,
  normId,
  normCode,
  currentResult,
  onVerified = () => {},
}) {
  const { data: session } = useSession();
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleVerify = async (agrees, suggestedValue = null, reason = "", evidenceUrl = "") => {
    setLoading(true);
    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          normId,
          agrees,
          suggestedValue,
          reason,
          evidenceUrl,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setResult(data);
        onVerified(data);
        setTimeout(() => {
          setShowModal(false);
          setResult(null);
        }, 2000);
      } else {
        alert(data.error || "Erreur");
      }
    } catch (err) {
      console.error("Verify error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return (
      <button
        onClick={() => window.location.href = "/signin"}
        className="btn btn-ghost btn-xs text-primary"
      >
        Vérifier +10 $SAFE
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="btn btn-ghost btn-xs text-primary hover:bg-primary/10"
      >
        ✓ Vérifier +10 $SAFE
      </button>

      {/* Modal de vérification */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card bg-base-100 max-w-md w-full p-6">
            {result ? (
              // Succès
              <div className="text-center">
                <div className="text-5xl mb-4">🎉</div>
                <h3 className="text-xl font-bold text-success mb-2">
                  +{result.points_earned} $SAFE
                </h3>
                <p className="text-base-content/60">
                  Nouveau solde: {result.new_balance} $SAFE
                </p>
              </div>
            ) : (
              // Formulaire
              <>
                <h3 className="font-bold text-lg mb-4">
                  Vérifier: {normCode || "cette norme"}
                </h3>

                <p className="text-sm text-base-content/70 mb-4">
                  Résultat actuel (IA): <span className={`badge ${
                    currentResult === "YES" ? "badge-success" :
                    currentResult === "NO" ? "badge-error" : "badge-warning"
                  }`}>{currentResult}</span>
                </p>

                <p className="text-sm mb-4">Ce résultat te semble correct ?</p>

                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => handleVerify(true)}
                    disabled={loading}
                    className="btn btn-success flex-1"
                  >
                    {loading ? <span className="loading loading-spinner loading-sm" /> : "✓ Oui, correct"}
                  </button>
                  <button
                    onClick={() => setShowModal("contest")}
                    disabled={loading}
                    className="btn btn-warning flex-1"
                  >
                    ✗ Non, incorrect
                  </button>
                </div>

                <div className="text-center text-sm text-base-content/50">
                  +10 $SAFE pour chaque vérification
                </div>

                <button
                  onClick={() => setShowModal(false)}
                  className="btn btn-ghost btn-sm mt-4 w-full"
                >
                  Annuler
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal contestation */}
      {showModal === "contest" && (
        <ContestModal
          onSubmit={(data) => handleVerify(false, data.suggestedValue, data.reason, data.evidenceUrl)}
          onClose={() => setShowModal(true)}
          loading={loading}
          currentResult={currentResult}
        />
      )}
    </>
  );
}

function ContestModal({ onSubmit, onClose, loading, currentResult }) {
  const [suggestedValue, setSuggestedValue] = useState("");
  const [reason, setReason] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card bg-base-100 max-w-md w-full p-6">
        <h3 className="font-bold text-lg mb-4">Proposer une correction</h3>

        <div className="space-y-4">
          <div>
            <label className="label text-sm">Quelle devrait être la bonne valeur ?</label>
            <select
              className="select select-bordered w-full"
              value={suggestedValue}
              onChange={(e) => setSuggestedValue(e.target.value)}
            >
              <option value="">Sélectionner...</option>
              {currentResult !== "YES" && <option value="YES">YES</option>}
              {currentResult !== "NO" && <option value="NO">NO</option>}
              {currentResult !== "N/A" && <option value="N/A">N/A</option>}
            </select>
          </div>

          <div>
            <label className="label text-sm">Pourquoi ? (optionnel)</label>
            <textarea
              className="textarea textarea-bordered w-full"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explique pourquoi..."
            />
          </div>

          <div>
            <label className="label text-sm">
              Lien de preuve (optionnel, +5 $SAFE)
            </label>
            <input
              type="url"
              className="input input-bordered w-full"
              value={evidenceUrl}
              onChange={(e) => setEvidenceUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button onClick={onClose} className="btn btn-ghost flex-1">
            Retour
          </button>
          <button
            onClick={() => onSubmit({ suggestedValue, reason, evidenceUrl })}
            disabled={loading || !suggestedValue}
            className="btn btn-primary flex-1"
          >
            {loading ? <span className="loading loading-spinner loading-sm" /> : "Soumettre +15 $SAFE"}
          </button>
        </div>
      </div>
    </div>
  );
}
