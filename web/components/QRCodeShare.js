"use client";

import { useState, useEffect, useRef } from "react";

/**
 * QR Code generator for sharing setups
 * Uses QR Server API for generation (no npm dependency)
 */
export default function QRCodeShare({
  url,
  size = 200,
  title = "Scan to view",
  className = "",
  showDownload = true,
}) {
  const [qrUrl, setQrUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!url) return;

    // Use QR Server API (free, no signup required)
    const encodedUrl = encodeURIComponent(url);
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedUrl}&bgcolor=1d1d1d&color=ffffff&margin=10`;

    setQrUrl(qrApiUrl);
    setIsLoading(false);
  }, [url, size]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = qrUrl;
    link.download = `safescoring-qr-${Date.now()}.png`;
    link.click();
  };

  if (!url) return null;

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      {/* QR Code */}
      <div className="relative bg-base-200 rounded-2xl p-4 border border-base-content/10">
        {isLoading ? (
          <div
            className="animate-pulse bg-base-300 rounded-lg"
            style={{ width: size, height: size }}
          />
        ) : (
          <img
            src={qrUrl}
            alt="QR Code"
            width={size}
            height={size}
            className="rounded-lg"
          />
        )}

        {/* Logo overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-12 h-12 bg-base-100 rounded-xl flex items-center justify-center shadow-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-6 h-6 text-primary"
            >
              <path
                fillRule="evenodd"
                d="M12.516 2.17a.75.75 0 00-1.032 0 11.209 11.209 0 01-7.877 3.08.75.75 0 00-.722.515A12.74 12.74 0 002.25 9.75c0 5.942 4.064 10.933 9.563 12.348a.749.749 0 00.374 0c5.499-1.415 9.563-6.406 9.563-12.348 0-1.39-.223-2.73-.635-3.985a.75.75 0 00-.722-.516 11.209 11.209 0 01-7.877-3.08z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Title */}
      <p className="text-sm text-base-content/60 font-medium">{title}</p>

      {/* Actions */}
      <div className="flex gap-2">
        {/* Copy URL button */}
        <button
          onClick={handleCopy}
          className={`btn btn-sm gap-2 ${copied ? "btn-success" : "btn-ghost"}`}
        >
          {copied ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M7 3.5A1.5 1.5 0 018.5 2h3.879a1.5 1.5 0 011.06.44l3.122 3.12A1.5 1.5 0 0117 6.622V12.5a1.5 1.5 0 01-1.5 1.5h-1v-3.379a3 3 0 00-.879-2.121L10.5 5.379A3 3 0 008.379 4.5H7v-1z" />
                <path d="M4.5 6A1.5 1.5 0 003 7.5v9A1.5 1.5 0 004.5 18h7a1.5 1.5 0 001.5-1.5v-5.879a1.5 1.5 0 00-.44-1.06L9.44 6.439A1.5 1.5 0 008.378 6H4.5z" />
              </svg>
              Copy URL
            </>
          )}
        </button>

        {/* Download button */}
        {showDownload && (
          <button
            onClick={handleDownload}
            className="btn btn-sm btn-ghost gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
              <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
            </svg>
            Download
          </button>
        )}
      </div>

      {/* URL display */}
      <div className="w-full max-w-xs">
        <input
          type="text"
          value={url}
          readOnly
          className="input input-sm input-bordered w-full text-xs text-center bg-base-200 font-mono"
          onClick={(e) => e.target.select()}
        />
      </div>
    </div>
  );
}

/**
 * Compact QR Code for inline display
 */
export function QRCodeMini({ url, size = 80 }) {
  if (!url) return null;

  const encodedUrl = encodeURIComponent(url);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedUrl}&bgcolor=1d1d1d&color=ffffff&margin=5`;

  return (
    <div className="tooltip" data-tip="Scan to share">
      <img
        src={qrUrl}
        alt="QR"
        width={size}
        height={size}
        className="rounded-lg border border-base-content/10"
      />
    </div>
  );
}
