"use client";

import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useState, useEffect } from "react";

// Types de preuves disponibles
const EVIDENCE_TYPES = [
  { value: "official_doc", label: "Documentation officielle" },
  { value: "github", label: "GitHub / Code source" },
  { value: "whitepaper", label: "Whitepaper" },
  { value: "audit_report", label: "Rapport d'audit" },
  { value: "article", label: "Article / Blog" },
  { value: "other", label: "Autre" },
];

/**
 * JustificationModal - Modal pour justifier un vote VRAI ou FAUX
 *
 * @param {boolean} isOpen - État d'ouverture du modal
 * @param {function} onClose - Callback pour fermer le modal
 * @param {function} onSubmit - Callback avec { justification, evidenceUrl, evidenceType }
 * @param {Object} evaluation - Évaluation concernée
 * @param {boolean} isSubmitting - Soumission en cours
 * @param {boolean} isAgree - true = VRAI, false = FAUX
 */
export default function JustificationModal({ isOpen, onClose, onSubmit, evaluation, isSubmitting = false, isAgree = false }) {
  const [justification, setJustification] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [evidenceType, setEvidenceType] = useState("other");
  const [error, setError] = useState(null);

  // Reset form quand le modal s'ouvre
  useEffect(() => {
    if (isOpen) {
      setJustification("");
      setEvidenceUrl("");
      setEvidenceType("other");
      setError(null);
    }
  }, [isOpen]);

  // Pour FAUX: justification obligatoire (10 chars min)
  // Pour VRAI: justification optionnelle, mais requise si source fournie
  const needsJustification = !isAgree || evidenceUrl;
  const hasValidJustification = justification.trim().length >= 10;
  const canSubmit = isAgree ? (!evidenceUrl || hasValidJustification) : hasValidJustification;

  const handleSubmit = () => {
    if (needsJustification && !hasValidJustification) {
      setError("Justification requise (minimum 10 caractères)");
      return;
    }

    // Valider URL si fournie
    if (evidenceUrl && !isValidUrl(evidenceUrl)) {
      setError("URL invalide");
      return;
    }

    setError(null);
    onSubmit({
      justification: justification.trim() || null,
      evidenceUrl: evidenceUrl.trim() || null,
      evidenceType: evidenceUrl ? evidenceType : null,
    });
  };

  // Quick submit pour VRAI sans justification
  const handleQuickSubmit = () => {
    if (!isAgree) return;
    setError(null);
    onSubmit({
      justification: null,
      evidenceUrl: null,
      evidenceType: null,
    });
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
        </Transition.Child>

        {/* Modal container - slide up from bottom on mobile */}
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-end sm:items-center justify-center p-0 sm:p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-full sm:translate-y-4 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0"
              leaveTo="opacity-0 translate-y-full sm:translate-y-4"
            >
              <Dialog.Panel className="w-full sm:max-w-md bg-base-100 rounded-t-2xl sm:rounded-2xl shadow-xl transform transition-all">
                {/* Header */}
                <div className="flex items-center gap-3 p-4 sm:p-6 border-b border-base-300">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isAgree ? "bg-green-500/20" : "bg-red-500/20"}`}>
                    <span className="text-xl">{isAgree ? "✓" : "🤔"}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <Dialog.Title as="h3" className="font-semibold text-lg">
                      {isAgree ? "Confirmer cette évaluation" : "Contester cette évaluation"}
                    </Dialog.Title>
                    <p className="text-sm text-base-content/60 truncate">
                      {evaluation?.norm_code} - {evaluation?.ai_result}
                    </p>
                  </div>
                  <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle" disabled={isSubmitting}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Content */}
                <div className="p-4 sm:p-6 space-y-4">
                  {/* Quick submit for VRAI */}
                  {isAgree && (
                    <button
                      onClick={handleQuickSubmit}
                      disabled={isSubmitting}
                      className="btn btn-success w-full mb-2"
                    >
                      {isSubmitting ? (
                        <span className="loading loading-spinner loading-sm"></span>
                      ) : (
                        <>Confirmer rapidement (+1 $SAFE)</>
                      )}
                    </button>
                  )}

                  {/* Separator for VRAI */}
                  {isAgree && (
                    <div className="divider text-xs text-base-content/50">ou ajouter une justification</div>
                  )}

                  {/* Justification textarea */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      {isAgree ? (
                        <>Justification <span className="text-base-content/50">(optionnel, +2 $SAFE avec source)</span></>
                      ) : (
                        <>Pourquoi n'êtes-vous pas d'accord ? <span className="text-error">*</span></>
                      )}
                    </label>
                    <textarea
                      value={justification}
                      onChange={(e) => setJustification(e.target.value)}
                      placeholder={isAgree
                        ? "Expliquez pourquoi vous confirmez cette évaluation..."
                        : "Expliquez pourquoi cette évaluation IA est incorrecte..."}
                      className="textarea textarea-bordered w-full min-h-[100px]"
                      rows={3}
                      maxLength={2000}
                      disabled={isSubmitting}
                    />
                    <div className="flex justify-between text-xs mt-1">
                      <span className={needsJustification && justification.length < 10 ? "text-error" : "text-base-content/50"}>
                        {needsJustification && justification.length < 10 ? `Minimum 10 caractères` : ""}
                      </span>
                      <span className="text-base-content/50">{justification.length}/2000</span>
                    </div>
                  </div>

                  {/* Evidence URL (optional) */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Source/Preuve <span className="text-green-400 text-xs">(+2 $SAFE)</span>
                    </label>
                    <input
                      type="url"
                      value={evidenceUrl}
                      onChange={(e) => setEvidenceUrl(e.target.value)}
                      placeholder="https://..."
                      className="input input-bordered w-full"
                      disabled={isSubmitting}
                    />
                  </div>

                  {/* Evidence type (shown if URL provided) */}
                  {evidenceUrl && (
                    <div>
                      <label className="block text-sm font-medium mb-2">Type de source</label>
                      <select
                        value={evidenceType}
                        onChange={(e) => setEvidenceType(e.target.value)}
                        className="select select-bordered w-full"
                        disabled={isSubmitting}
                      >
                        {EVIDENCE_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Error message */}
                  {error && (
                    <div className="bg-error/10 border border-error/30 rounded-lg p-3">
                      <p className="text-sm text-error">{error}</p>
                    </div>
                  )}

                  {/* Reward info */}
                  <div className="bg-base-200 rounded-lg p-3">
                    {isAgree ? (
                      <>
                        <p className="text-sm text-base-content/70">
                          <span className="font-medium text-primary">+1 $SAFE</span> pour ce vote VRAI
                          {evidenceUrl && (
                            <span>
                              {" "}
                              + <span className="font-medium text-green-400">+2 $SAFE</span> pour la source
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-base-content/50 mt-1">
                          Ajoutez une source pour gagner plus de tokens !
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-base-content/70">
                          <span className="font-medium text-primary">+2 $SAFE</span> pour ce vote FAUX
                          {evidenceUrl && (
                            <span>
                              {" "}
                              + <span className="font-medium text-green-400">+2 $SAFE</span> pour la source
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-base-content/50 mt-1">
                          Si votre challenge est validé par la communauté: <span className="text-amber-400">+10 $SAFE</span>
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 p-4 sm:p-6 border-t border-base-300 safe-padding-bottom">
                  <button onClick={onClose} className="btn btn-ghost flex-1" disabled={isSubmitting}>
                    Annuler
                  </button>
                  <button
                    onClick={handleSubmit}
                    className={`btn flex-1 ${canSubmit ? (isAgree ? "btn-success" : "btn-error") : "btn-disabled"}`}
                    disabled={!canSubmit || isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="loading loading-spinner loading-sm"></span>
                        Envoi...
                      </>
                    ) : (
                      <>{isAgree ? "Confirmer avec source" : "Contester"}</>
                    )}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

// Helper pour valider les URLs
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}
