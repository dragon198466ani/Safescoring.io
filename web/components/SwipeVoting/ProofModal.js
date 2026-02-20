"use client";

import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useState } from "react";

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
 * ProofModal - Modal simple pour ajouter une preuve après un vote
 *
 * @param {boolean} isOpen - État d'ouverture du modal
 * @param {function} onClose - Callback pour fermer le modal
 * @param {function} onSubmit - Callback avec { evidenceUrl, evidenceType }
 * @param {Object} evaluation - Évaluation concernée
 */
export default function ProofModal({ isOpen, onClose, onSubmit, evaluation }) {
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [evidenceType, setEvidenceType] = useState("other");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    if (!evidenceUrl.trim()) {
      setError("URL requise");
      return;
    }

    // Valider URL
    try {
      new URL(evidenceUrl);
    } catch {
      setError("URL invalide");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        evidenceUrl: evidenceUrl.trim(),
        evidenceType,
      });
      setEvidenceUrl("");
      setEvidenceType("other");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
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

        {/* Modal container */}
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
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                    <span className="text-xl">🔗</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <Dialog.Title as="h3" className="font-semibold text-lg">
                      Ajouter une source
                    </Dialog.Title>
                    <p className="text-sm text-base-content/60 truncate">
                      {evaluation?.norm_code} • +2 $SAFE bonus
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
                  {/* Evidence URL */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      URL de la source
                    </label>
                    <input
                      type="url"
                      value={evidenceUrl}
                      onChange={(e) => setEvidenceUrl(e.target.value)}
                      placeholder="https://..."
                      className="input input-bordered w-full"
                      disabled={isSubmitting}
                      autoFocus
                    />
                  </div>

                  {/* Evidence type */}
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

                  {/* Error message */}
                  {error && (
                    <div className="bg-error/10 border border-error/30 rounded-lg p-3">
                      <p className="text-sm text-error">{error}</p>
                    </div>
                  )}

                  {/* Info */}
                  <div className="bg-primary/10 rounded-lg p-3">
                    <p className="text-sm text-base-content/70">
                      Fournir une source valide vous rapporte <span className="font-bold text-primary">+2 $SAFE</span> bonus
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 p-4 sm:p-6 border-t border-base-300 safe-padding-bottom">
                  <button onClick={onClose} className="btn btn-ghost flex-1" disabled={isSubmitting}>
                    Passer
                  </button>
                  <button
                    onClick={handleSubmit}
                    className="btn btn-primary flex-1"
                    disabled={!evidenceUrl.trim() || isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="loading loading-spinner loading-sm"></span>
                        Envoi...
                      </>
                    ) : (
                      "Ajouter (+2 $SAFE)"
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
