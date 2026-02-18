"use client";

import { useState } from "react";
import DonationModal from "./DonationModal";

/**
 * ProductDownloadButton - Client component for downloading product PDF reports
 * Shows a donation modal before download to request support
 *
 * @param {string} slug - Product slug for API call
 * @param {string} productName - Product name for filename
 * @param {string} className - Optional additional CSS classes
 * @param {boolean} compact - If true, shows only icon (no text)
 */
export default function ProductDownloadButton({
  slug,
  productName = "product",
  className = "",
  compact = false,
}) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);
  const [showDonationModal, setShowDonationModal] = useState(false);

  const performDownload = async () => {
    if (downloading) return;

    setDownloading(true);
    setError(null);

    try {
      const res = await fetch(`/api/products/${slug}/pdf`);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to generate report");
      }

      // Download blob
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `safescore-${productName.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download PDF:", err);
      setError(err.message || "Download failed");
      // Clear error after 3 seconds
      setTimeout(() => setError(null), 3000);
    } finally {
      setDownloading(false);
    }
  };

  const handleClick = () => {
    // Show donation modal before download
    setShowDonationModal(true);
  };

  const handleDownload = () => {
    setShowDonationModal(false);
    performDownload();
  };

  if (compact) {
    return (
      <>
        <button
          onClick={handleClick}
          disabled={downloading}
          className={`btn btn-ghost btn-sm btn-circle ${className}`}
          title="Telecharger le rapport PDF"
        >
          {downloading ? (
            <span className="loading loading-spinner loading-xs"></span>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
              />
            </svg>
          )}
        </button>

        <DonationModal
          isOpen={showDonationModal}
          onClose={() => setShowDonationModal(false)}
          onDownload={handleDownload}
          productName={productName}
        />
      </>
    );
  }

  return (
    <>
      <div className="relative">
        <button
          onClick={handleClick}
          disabled={downloading}
          className={`inline-flex items-center gap-2 text-base-content/70 hover:text-primary transition-colors disabled:opacity-50 ${className}`}
        >
          {downloading ? (
            <span className="loading loading-spinner loading-xs"></span>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-4 h-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
              />
            </svg>
          )}
          <span className="text-sm">
            {downloading ? "Generation..." : "Rapport PDF"}
          </span>
        </button>

        {/* Error tooltip */}
        {error && (
          <div className="absolute top-full left-0 mt-1 px-2 py-1 bg-error text-error-content text-xs rounded shadow-lg whitespace-nowrap z-10">
            {error}
          </div>
        )}
      </div>

      <DonationModal
        isOpen={showDonationModal}
        onClose={() => setShowDonationModal(false)}
        onDownload={handleDownload}
        productName={productName}
      />
    </>
  );
}
