"use client";

import { useCallback } from "react";
import toast from "react-hot-toast";

/**
 * useNotification - Unified notification hook
 *
 * Provides consistent toast notifications across the app.
 * Centralizes notification styling and behavior.
 *
 * @example
 * const { notify, success, error, loading } = useNotification();
 *
 * success("Changes saved!");
 * error("Something went wrong");
 * const toastId = loading("Saving...");
 * notify.dismiss(toastId);
 */
export function useNotification() {
  // Success notification
  const success = useCallback((message, options = {}) => {
    return toast.success(message, {
      duration: 4000,
      position: "bottom-right",
      ...options,
    });
  }, []);

  // Error notification
  const error = useCallback((message, options = {}) => {
    return toast.error(message, {
      duration: 5000,
      position: "bottom-right",
      ...options,
    });
  }, []);

  // Loading notification (returns ID for dismissal)
  const loading = useCallback((message, options = {}) => {
    return toast.loading(message, {
      position: "bottom-right",
      ...options,
    });
  }, []);

  // Info notification (custom styled)
  const info = useCallback((message, options = {}) => {
    return toast(message, {
      duration: 4000,
      position: "bottom-right",
      icon: "ℹ️",
      ...options,
    });
  }, []);

  // Warning notification (custom styled)
  const warning = useCallback((message, options = {}) => {
    return toast(message, {
      duration: 5000,
      position: "bottom-right",
      icon: "⚠️",
      style: {
        background: "#fef3c7",
        color: "#92400e",
      },
      ...options,
    });
  }, []);

  // Promise-based notification (loading → success/error)
  const promise = useCallback((promiseOrFn, messages = {}, options = {}) => {
    const defaultMessages = {
      loading: "Chargement...",
      success: "Opération réussie",
      error: (err) => err?.message || "Une erreur est survenue",
    };

    return toast.promise(
      typeof promiseOrFn === "function" ? promiseOrFn() : promiseOrFn,
      { ...defaultMessages, ...messages },
      {
        position: "bottom-right",
        ...options,
      }
    );
  }, []);

  // Dismiss notification(s)
  const dismiss = useCallback((toastId) => {
    if (toastId) {
      toast.dismiss(toastId);
    } else {
      toast.dismiss();
    }
  }, []);

  // Custom notification (full control)
  const custom = useCallback((render, options = {}) => {
    return toast.custom(render, {
      position: "bottom-right",
      ...options,
    });
  }, []);

  return {
    success,
    error,
    loading,
    info,
    warning,
    promise,
    dismiss,
    custom,
    // Also expose raw toast for edge cases
    notify: toast,
  };
}

/**
 * Notification presets for common actions
 */
export const notificationPresets = {
  // CRUD operations
  created: (item = "Élément") => `${item} créé avec succès`,
  updated: (item = "Élément") => `${item} mis à jour`,
  deleted: (item = "Élément") => `${item} supprimé`,
  saved: "Modifications enregistrées",

  // Auth
  signedIn: "Connexion réussie",
  signedOut: "Déconnexion réussie",
  sessionExpired: "Session expirée, veuillez vous reconnecter",

  // Errors
  networkError: "Erreur de connexion. Vérifiez votre connexion internet.",
  serverError: "Une erreur serveur est survenue. Réessayez plus tard.",
  validationError: "Veuillez vérifier les champs du formulaire",
  unauthorized: "Vous devez être connecté pour effectuer cette action",
  forbidden: "Vous n'avez pas les permissions nécessaires",

  // Clipboard
  copied: "Copié dans le presse-papier",
  copyFailed: "Impossible de copier",

  // Form
  formSubmitted: "Formulaire envoyé",
  formError: "Erreur lors de l'envoi du formulaire",

  // File
  uploadSuccess: "Fichier téléchargé avec succès",
  uploadError: "Erreur lors du téléchargement",
  downloadStarted: "Téléchargement en cours...",
};

export default useNotification;
