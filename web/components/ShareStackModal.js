"use client";

import { useState } from "react";

export default function ShareStackModal({ setupId, setupName, isOpen, onClose }) {
  const [shareUrl, setShareUrl] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  const generateShareLink = async () => {
    if (!setupId) {
      setError("Setup must be saved first");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const res = await fetch(`/api/setups/${setupId}/share`, {
        method: "POST",
      });

      if (!res.ok) {
        throw new Error("Failed to generate share link");
      }

      const data = await res.json();
      setShareUrl(data.shareUrl);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleClose = () => {
    setShareUrl(null);
    setError(null);
    setCopied(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-lg">
        <h3 className="font-bold text-lg mb-4">Share Your Stack</h3>

        {!shareUrl ? (
          <div>
            <p className="text-base-content/70 mb-4">
              Generate a shareable link for "{setupName}". Anyone with the link can view your stack (read-only).
            </p>

            {error && (
              <div className="alert alert-error mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={generateShareLink}
              disabled={isGenerating}
              className="btn btn-primary w-full gap-2"
            >
              {isGenerating ? (
                <>
                  <span className="loading loading-spinner loading-sm" />
                  Generating...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                  </svg>
                  Generate Share Link
                </>
              )}
            </button>
          </div>
        ) : (
          <div>
            <p className="text-base-content/70 mb-4">
              Your stack is ready to share! Copy the link below:
            </p>

            {/* Shareable Link */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="input input-bordered flex-1 font-mono text-sm"
                onClick={(e) => e.target.select()}
              />
              <button
                onClick={copyToClipboard}
                className={`btn ${copied ? 'btn-success' : 'btn-primary'}`}
              >
                {copied ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                    </svg>
                    Copy
                  </>
                )}
              </button>
            </div>

            {/* QR Code */}
            <div className="text-center mb-4">
              <p className="text-xs text-base-content/60 mb-2">Or scan this QR code:</p>
              <div className="flex justify-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}`}
                  alt="QR Code"
                  className="rounded-lg border-4 border-base-300"
                  width={200}
                  height={200}
                />
              </div>
            </div>

            {/* Info */}
            <div className="alert alert-info">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
              <div className="text-xs">
                <p>This link is permanent and can be shared publicly.</p>
                <p>Others can view your stack but cannot modify it.</p>
              </div>
            </div>
          </div>
        )}

        <div className="modal-action">
          <button onClick={handleClose} className="btn">
            Close
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={handleClose} />
    </div>
  );
}
