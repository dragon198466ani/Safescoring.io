"use client";

import { useState, useRef } from "react";

/**
 * SetupBackup - Export/Import functionality for user setups
 * - Export all setups as JSON file
 * - Import setups from JSON file
 * - Auto-backup to localStorage
 */

// Backup key in localStorage
const BACKUP_KEY = "safescoring_setups_backup";
const BACKUP_TIMESTAMP_KEY = "safescoring_backup_timestamp";

// Auto-save backup to localStorage
export function autoBackupSetups(setups) {
  if (typeof window === "undefined" || !setups?.length) return;
  try {
    localStorage.setItem(BACKUP_KEY, JSON.stringify(setups));
    localStorage.setItem(BACKUP_TIMESTAMP_KEY, new Date().toISOString());
  } catch (err) {
    console.warn("Auto-backup failed:", err);
  }
}

// Get last backup info
export function getBackupInfo() {
  if (typeof window === "undefined") return null;
  try {
    const timestamp = localStorage.getItem(BACKUP_TIMESTAMP_KEY);
    const backup = localStorage.getItem(BACKUP_KEY);
    if (timestamp && backup) {
      const setups = JSON.parse(backup);
      return {
        timestamp: new Date(timestamp),
        count: setups.length,
      };
    }
  } catch {
    return null;
  }
  return null;
}

// Restore from localStorage backup
export function restoreFromBackup() {
  if (typeof window === "undefined") return null;
  try {
    const backup = localStorage.getItem(BACKUP_KEY);
    if (backup) {
      return JSON.parse(backup);
    }
  } catch {
    return null;
  }
  return null;
}

export default function SetupBackup({ setups, onImport }) {
  const [showMenu, setShowMenu] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState(null);
  const fileInputRef = useRef(null);

  // Export setups as JSON file
  const handleExport = () => {
    if (!setups?.length) {
      setMessage({ type: "error", text: "Aucun setup à exporter" });
      return;
    }

    try {
      const exportData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        setups: setups.map(s => ({
          name: s.name,
          description: s.description,
          products: s.products,
          productDetails: s.productDetails?.map(p => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            role: p.role,
          })),
          combinedScore: s.combinedScore,
          created_at: s.created_at,
        })),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `safescoring-backup-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMessage({ type: "success", text: `${setups.length} setup(s) exporté(s)` });
      setShowMenu(false);
    } catch (err) {
      setMessage({ type: "error", text: "Erreur lors de l'export" });
    }

    setTimeout(() => setMessage(null), 3000);
  };

  // Handle file selection for import
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Validate structure
      if (!data.setups || !Array.isArray(data.setups)) {
        throw new Error("Format de fichier invalide");
      }

      // Validate each setup
      const validSetups = data.setups.filter(s => s.name && s.products);
      if (validSetups.length === 0) {
        throw new Error("Aucun setup valide trouvé");
      }

      // Call import handler
      if (onImport) {
        await onImport(validSetups);
      }

      setMessage({ type: "success", text: `${validSetups.length} setup(s) importé(s)` });
      setShowMenu(false);
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Erreur lors de l'import" });
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }

    setTimeout(() => setMessage(null), 3000);
  };

  // Restore from auto-backup
  const handleRestoreBackup = async () => {
    const backup = restoreFromBackup();
    if (!backup?.length) {
      setMessage({ type: "error", text: "Aucune sauvegarde locale trouvée" });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    if (onImport) {
      await onImport(backup);
      setMessage({ type: "success", text: `${backup.length} setup(s) restauré(s)` });
      setShowMenu(false);
    }

    setTimeout(() => setMessage(null), 3000);
  };

  const backupInfo = getBackupInfo();

  return (
    <div className="relative inline-block">
      {/* Toggle button */}
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="btn btn-outline h-10 min-h-0 gap-2 border-base-300 hover:border-primary hover:bg-primary/10 touch-manipulation active:scale-[0.97] transition-transform"
        title="Sauvegarder vos stacks"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
        </svg>
        <span className="hidden sm:inline">Sauvegarde</span>
      </button>

      {/* Dropdown menu */}
      {showMenu && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
            onClick={() => setShowMenu(false)}
          />

          {/* Menu - centered on mobile, anchored on desktop */}
          <div className="fixed sm:absolute left-1/2 sm:left-auto sm:right-0 top-1/2 sm:top-full -translate-x-1/2 sm:translate-x-0 -translate-y-1/2 sm:translate-y-0 sm:mt-2 w-[calc(100vw-2rem)] sm:w-72 max-w-sm bg-base-100 rounded-2xl border border-base-300 shadow-2xl z-50 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-base-300 bg-base-200/50">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Sauvegarde</h3>
                <button
                  onClick={() => setShowMenu(false)}
                  className="btn btn-ghost btn-xs btn-circle sm:hidden"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-xs text-base-content/60 mt-0.5">Exportez ou importez vos stacks</p>
            </div>

            <div className="p-3 space-y-2">
              {/* Export */}
              <button
                onClick={handleExport}
                disabled={!setups?.length}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-success/10 hover:bg-success/20 border border-success/20 transition-all text-left disabled:opacity-40 disabled:cursor-not-allowed group"
              >
                <div className="p-2.5 rounded-xl bg-success/20 text-success group-hover:scale-110 transition-transform">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">Exporter</div>
                  <div className="text-xs text-base-content/60 truncate">
                    {setups?.length ? `${setups.length} stack${setups.length > 1 ? 's' : ''} vers JSON` : 'Aucune stack'}
                  </div>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-base-content/30 group-hover:text-success transition-colors">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>

              {/* Import */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-info/10 hover:bg-info/20 border border-info/20 transition-all text-left group"
              >
                <div className="p-2.5 rounded-xl bg-info/20 text-info group-hover:scale-110 transition-transform">
                  {importing ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">Importer</div>
                  <div className="text-xs text-base-content/60">
                    Depuis un fichier JSON
                  </div>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-base-content/30 group-hover:text-info transition-colors">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>

              {/* Restore from auto-backup */}
              {backupInfo && (
                <>
                  <div className="divider my-1 text-xs text-base-content/40">Sauvegarde automatique</div>
                  <button
                    onClick={handleRestoreBackup}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-warning/10 hover:bg-warning/20 border border-warning/20 transition-all text-left group"
                  >
                    <div className="p-2.5 rounded-xl bg-warning/20 text-warning group-hover:scale-110 transition-transform">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">Restaurer</div>
                      <div className="text-xs text-base-content/60">
                        {backupInfo.count} stack{backupInfo.count > 1 ? 's' : ''} du {backupInfo.timestamp.toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-base-content/30 group-hover:text-warning transition-colors">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </button>
                </>
              )}
            </div>

            {/* Footer info */}
            <div className="px-4 py-2.5 bg-base-200/50 border-t border-base-300">
              <div className="flex items-center gap-2 text-xs text-base-content/50">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 flex-shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
                <span>Sauvegarde locale automatique active</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Toast message */}
      {message && (
        <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg ${
          message.type === "success"
            ? "bg-green-500/90 text-white"
            : "bg-red-500/90 text-white"
        }`}>
          <div className="flex items-center gap-2">
            {message.type === "success" ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            )}
            <span className="font-medium">{message.text}</span>
          </div>
        </div>
      )}
    </div>
  );
}
