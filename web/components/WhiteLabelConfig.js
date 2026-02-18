"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

/**
 * WhiteLabelConfig Component
 *
 * Allows Enterprise users to configure their white-label branding
 * for PDF reports.
 */
export default function WhiteLabelConfig({ className = "" }) {
  const { data: session } = useSession();
  const [branding, setBranding] = useState({
    companyName: "",
    logoBase64: null,
    primaryColor: "#3B82F6",
    secondaryColor: "#8B5CF6",
    headerColor: "#1F2937",
    footerText: "",
    websiteUrl: "",
    reportTitle: "Security Stack Report",
    hideSafeScoring: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const fileInputRef = useRef(null);

  // Fetch current branding config
  useEffect(() => {
    if (!session?.user) return;

    const fetchBranding = async () => {
      try {
        const res = await fetch("/api/reports/white-label");
        const data = await res.json();

        if (data.upgrade) {
          setHasAccess(false);
        } else {
          setHasAccess(true);
          if (data.branding) {
            setBranding(data.branding);
          }
        }
      } catch (err) {
        console.error("Failed to fetch branding:", err);
        setError("Failed to load branding configuration");
      } finally {
        setLoading(false);
      }
    };

    fetchBranding();
  }, [session?.user]);

  // Handle logo upload
  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file (PNG or JPEG)");
      return;
    }

    // Validate file size (500KB max)
    if (file.size > 500 * 1024) {
      setError("Logo must be 500KB or less");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setBranding((prev) => ({
        ...prev,
        logoBase64: event.target.result,
      }));
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  // Remove logo
  const removeLogo = () => {
    setBranding((prev) => ({ ...prev, logoBase64: null }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Save branding
  const saveBranding = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/reports/white-label", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateBranding",
          branding: {
            companyName: branding.companyName,
            logoBase64: branding.logoBase64,
            primaryColor: branding.primaryColor,
            secondaryColor: branding.secondaryColor,
            headerColor: branding.headerColor,
            footerText: branding.footerText,
            websiteUrl: branding.websiteUrl,
            headerText: branding.reportTitle,
            showSafeScoring: !branding.hideSafeScoring,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save branding");
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Reset to defaults
  const resetToDefaults = () => {
    setBranding({
      companyName: "",
      logoBase64: null,
      primaryColor: "#3B82F6",
      secondaryColor: "#8B5CF6",
      headerColor: "#1F2937",
      footerText: "",
      websiteUrl: "",
      reportTitle: "Security Stack Report",
      hideSafeScoring: false,
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (!session) return null;

  if (loading) {
    return (
      <div className={`flex justify-center p-8 ${className}`}>
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className={`card bg-base-200 ${className}`}>
        <div className="card-body text-center">
          <h3 className="text-xl font-bold">Enterprise Feature</h3>
          <p className="text-base-content/70">
            White-label reports require an Enterprise plan.
          </p>
          <p className="text-sm text-base-content/50 mt-2">
            Generate branded PDF reports with your company logo, colors, and custom text.
          </p>
          <div className="card-actions justify-center mt-4">
            <a href="/pricing" className="btn btn-primary">
              Upgrade to Enterprise
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">White-Label Branding</h2>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setPreviewMode(!previewMode)}
        >
          {previewMode ? "Edit" : "Preview"}
        </button>
      </div>

      {error && (
        <div className="alert alert-error mb-4">
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="alert alert-success mb-4">
          <span>Branding saved successfully!</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Panel */}
        <div className="space-y-4">
          {/* Company Name */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Company Name</span>
            </label>
            <input
              type="text"
              className="input input-bordered"
              placeholder="Your Company"
              value={branding.companyName}
              onChange={(e) =>
                setBranding((prev) => ({ ...prev, companyName: e.target.value }))
              }
              maxLength={100}
            />
          </div>

          {/* Logo Upload */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Company Logo</span>
              <span className="label-text-alt">PNG or JPEG, max 500KB</span>
            </label>
            <div className="flex items-center gap-4">
              {branding.logoBase64 ? (
                <div className="relative">
                  <img
                    src={branding.logoBase64}
                    alt="Logo preview"
                    className="h-12 object-contain bg-base-200 rounded p-1"
                  />
                  <button
                    className="btn btn-circle btn-xs btn-error absolute -top-2 -right-2"
                    onClick={removeLogo}
                  >
                    x
                  </button>
                </div>
              ) : (
                <div className="w-12 h-12 bg-base-200 rounded flex items-center justify-center">
                  <span className="text-xs text-base-content/50">No logo</span>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg"
                className="file-input file-input-bordered file-input-sm flex-1"
                onChange={handleLogoUpload}
              />
            </div>
          </div>

          {/* Colors */}
          <div className="grid grid-cols-3 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Primary</span>
              </label>
              <input
                type="color"
                className="w-full h-10 rounded cursor-pointer"
                value={branding.primaryColor}
                onChange={(e) =>
                  setBranding((prev) => ({ ...prev, primaryColor: e.target.value }))
                }
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Secondary</span>
              </label>
              <input
                type="color"
                className="w-full h-10 rounded cursor-pointer"
                value={branding.secondaryColor}
                onChange={(e) =>
                  setBranding((prev) => ({ ...prev, secondaryColor: e.target.value }))
                }
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Header</span>
              </label>
              <input
                type="color"
                className="w-full h-10 rounded cursor-pointer"
                value={branding.headerColor}
                onChange={(e) =>
                  setBranding((prev) => ({ ...prev, headerColor: e.target.value }))
                }
              />
            </div>
          </div>

          {/* Report Title */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Report Title</span>
            </label>
            <input
              type="text"
              className="input input-bordered"
              placeholder="Security Stack Report"
              value={branding.reportTitle}
              onChange={(e) =>
                setBranding((prev) => ({ ...prev, reportTitle: e.target.value }))
              }
              maxLength={100}
            />
          </div>

          {/* Footer Text */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Footer Text</span>
            </label>
            <textarea
              className="textarea textarea-bordered"
              placeholder="Custom footer text for your reports"
              value={branding.footerText}
              onChange={(e) =>
                setBranding((prev) => ({ ...prev, footerText: e.target.value }))
              }
              maxLength={200}
              rows={2}
            />
          </div>

          {/* Website URL */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Website URL</span>
            </label>
            <input
              type="url"
              className="input input-bordered"
              placeholder="https://yourcompany.com"
              value={branding.websiteUrl}
              onChange={(e) =>
                setBranding((prev) => ({ ...prev, websiteUrl: e.target.value }))
              }
            />
          </div>

          {/* Hide SafeScoring */}
          <div className="form-control">
            <label className="label cursor-pointer justify-start gap-4">
              <input
                type="checkbox"
                className="checkbox checkbox-primary"
                checked={branding.hideSafeScoring}
                onChange={(e) =>
                  setBranding((prev) => ({
                    ...prev,
                    hideSafeScoring: e.target.checked,
                  }))
                }
              />
              <div>
                <span className="label-text font-medium">
                  Hide SafeScoring branding
                </span>
                <p className="text-xs text-base-content/50">
                  Remove "Powered by SafeScoring" from reports
                </p>
              </div>
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <button
              className={`btn btn-primary flex-1 ${saving ? "loading" : ""}`}
              onClick={saveBranding}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Branding"}
            </button>
            <button
              className="btn btn-ghost"
              onClick={resetToDefaults}
              disabled={saving}
            >
              Reset
            </button>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="card bg-base-200">
          <div className="card-body">
            <h3 className="card-title text-sm">PDF Preview</h3>
            <div
              className="bg-white rounded-lg shadow-inner p-4 min-h-[400px]"
              style={{
                fontFamily: "system-ui, sans-serif",
              }}
            >
              {/* Preview Header */}
              <div
                className="p-4 rounded-t-lg"
                style={{ backgroundColor: branding.headerColor }}
              >
                <div className="flex justify-between items-center">
                  {branding.logoBase64 ? (
                    <img
                      src={branding.logoBase64}
                      alt="Logo"
                      className="h-8 object-contain"
                    />
                  ) : (
                    <span
                      className="text-white font-bold text-lg"
                      style={{ color: "#fff" }}
                    >
                      {branding.companyName || "SafeScoring"}
                    </span>
                  )}
                  <div
                    className="text-white text-2xl font-bold"
                    style={{ color: branding.primaryColor }}
                  >
                    85
                  </div>
                </div>
                {!branding.hideSafeScoring && branding.companyName && (
                  <p className="text-xs text-gray-300 mt-1">
                    Powered by SafeScoring
                  </p>
                )}
              </div>

              {/* Preview Content */}
              <div className="p-4">
                <h2
                  className="text-lg font-bold mb-4"
                  style={{ color: branding.primaryColor }}
                >
                  {branding.reportTitle || "Security Stack Report"}
                </h2>

                {/* Sample Pillars */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {["S", "A", "F", "E"].map((pillar, i) => (
                    <div
                      key={pillar}
                      className="text-center p-2 rounded"
                      style={{ backgroundColor: `${branding.secondaryColor}15` }}
                    >
                      <div
                        className="text-xs font-bold"
                        style={{ color: branding.secondaryColor }}
                      >
                        {pillar}
                      </div>
                      <div className="text-sm">{80 + i * 3}</div>
                    </div>
                  ))}
                </div>

                {/* Sample Product */}
                <div className="border border-gray-200 rounded p-3">
                  <div className="flex justify-between">
                    <span className="font-medium text-sm">Ledger Nano X</span>
                    <span
                      className="font-bold"
                      style={{ color: branding.primaryColor }}
                    >
                      88
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">Hardware Wallet</span>
                </div>
              </div>

              {/* Preview Footer */}
              <div className="border-t border-gray-200 p-3 mt-4">
                <p className="text-xs text-gray-400 text-center">
                  {branding.footerText ||
                    "This report is for informational purposes only."}
                </p>
                {branding.websiteUrl && (
                  <p className="text-xs text-gray-400 text-center mt-1">
                    {branding.websiteUrl}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
