"use client";

import { useState } from "react";
import { useTranslation } from "@/libs/i18n/LanguageProvider";
import config from "@/config";

/**
 * SECURITY: Escape HTML entities to prevent XSS attacks
 * @param {string} str - String to escape
 * @returns {string} Escaped string safe for HTML insertion
 */
function escapeHtml(str) {
  if (typeof str !== "string") return String(str);
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

/**
 * SECURITY: Validate and sanitize URL to prevent javascript: and data: XSS
 * @param {string} url - URL to validate
 * @returns {string} Safe URL or fallback
 */
function sanitizeUrl(url) {
  if (!url || typeof url !== "string") return "#";
  const trimmed = url.trim().toLowerCase();
  // Block dangerous protocols
  if (
    trimmed.startsWith("javascript:") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("vbscript:")
  ) {
    return "#";
  }
  // Only allow http/https
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://") && !trimmed.startsWith("/")) {
    return "#";
  }
  return url;
}

/**
 * ScoreSignature - Generate shareable signature for email/forum
 *
 * Creates embeddable text/HTML signatures showing stack security score
 */
const ScoreSignature = ({
  stackScore,
  productCount = 0,
  userName = "",
  stackUrl = "",
  className = "",
}) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [format, setFormat] = useState("html"); // 'html' | 'text' | 'markdown'

  const baseUrl = `https://${config.domainName}`;
  // SECURITY: Sanitize URL to prevent XSS via javascript: or data: URLs
  const fullStackUrl = sanitizeUrl(stackUrl) || `${baseUrl}/dashboard/setups`;

  // SECURITY: Ensure score values are valid numbers
  const safeScore = Math.max(0, Math.min(100, parseInt(stackScore, 10) || 0));
  const safeProductCount = Math.max(0, parseInt(productCount, 10) || 0);

  // Get score emoji/indicator
  const getScoreIndicator = (score) => {
    if (score >= 90) return { emoji: "🛡️", level: "Expert", color: "#22c55e" };
    if (score >= 80) return { emoji: "✅", level: "Excellent", color: "#22c55e" };
    if (score >= 70) return { emoji: "👍", level: "Good", color: "#84cc16" };
    if (score >= 60) return { emoji: "⚠️", level: "Fair", color: "#f59e0b" };
    return { emoji: "❌", level: "At Risk", color: "#ef4444" };
  };

  const indicator = getScoreIndicator(safeScore);

  // Generate signature in different formats
  // SECURITY: All dynamic values are sanitized before insertion
  const generateSignature = (fmt) => {
    // Pre-escape all values for HTML context
    const escapedUrl = escapeHtml(fullStackUrl);
    const escapedLevel = escapeHtml(indicator.level);

    switch (fmt) {
      case "html":
        return `
<table cellpadding="0" cellspacing="0" border="0" style="font-family: Arial, sans-serif; font-size: 12px;">
  <tr>
    <td style="padding-right: 12px; border-right: 2px solid #6366f1;">
      <strong style="font-size: 24px; color: ${escapeHtml(indicator.color)};">${safeScore}</strong>
      <span style="font-size: 10px; color: #666;">/100</span>
    </td>
    <td style="padding-left: 12px;">
      <div style="color: #333; font-weight: bold;">My Crypto Stack Security</div>
      <div style="color: #666; font-size: 11px;">${escapedLevel} • ${safeProductCount} products</div>
      <a href="${escapedUrl}" style="color: #6366f1; text-decoration: none; font-size: 11px;">Verified by SafeScoring</a>
    </td>
  </tr>
</table>`.trim();

      case "markdown":
        return `
**My Crypto Stack Security: ${safeScore}/100** ${indicator.emoji}

${indicator.level} • ${safeProductCount} products

[Verified by SafeScoring](${fullStackUrl})
`.trim();

      case "text":
      default:
        return `
${indicator.emoji} My Crypto Stack Security: ${safeScore}/100
${indicator.level} • ${safeProductCount} products
Verified by SafeScoring - ${fullStackUrl}
`.trim();
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generateSignature(format));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Live preview component
  const SignaturePreview = () => {
    if (format === "html") {
      return (
        <div
          className="p-4 bg-white rounded border text-black"
          dangerouslySetInnerHTML={{ __html: generateSignature("html") }}
        />
      );
    }

    return (
      <pre className="p-4 bg-base-200 rounded text-sm whitespace-pre-wrap overflow-x-auto">
        {generateSignature(format)}
      </pre>
    );
  };

  return (
    <div className={`rounded-xl border border-base-300 bg-base-200/50 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
          </svg>
        </div>
        <div>
          <h3 className="font-bold">{t("signature.title") || "Score Signature"}</h3>
          <p className="text-sm text-base-content/60">
            {t("signature.subtitle") || "Add to your email or forum signature"}
          </p>
        </div>
      </div>

      {/* Format selector */}
      <div className="flex gap-2 mb-4">
        {[
          { id: "html", label: "HTML" },
          { id: "markdown", label: "Markdown" },
          { id: "text", label: "Plain Text" },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFormat(f.id)}
            className={`btn btn-sm ${format === f.id ? "btn-primary" : "btn-ghost"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Preview */}
      <div className="mb-4">
        <div className="text-xs text-base-content/60 mb-2 uppercase tracking-wide">
          {t("signature.preview") || "Preview"}
        </div>
        <SignaturePreview />
      </div>

      {/* Code */}
      <div className="mb-4">
        <div className="text-xs text-base-content/60 mb-2 uppercase tracking-wide">
          {t("signature.code") || "Code"}
        </div>
        <div className="relative">
          <pre className="p-3 bg-base-300 rounded text-xs overflow-x-auto max-h-32">
            {generateSignature(format)}
          </pre>
        </div>
      </div>

      {/* Copy button */}
      <button
        onClick={handleCopy}
        className={`btn w-full ${copied ? "btn-success" : "btn-primary"}`}
      >
        {copied ? (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
            </svg>
            {t("share.copied") || "Copied!"}
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
            </svg>
            {t("signature.copy") || "Copy Signature"}
          </>
        )}
      </button>

      {/* Tips */}
      <div className="mt-4 text-xs text-base-content/50">
        <p className="flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
            <path fillRule="evenodd" d="M15 8A7 7 0 111 8a7 7 0 0114 0zM9 5a1 1 0 11-2 0 1 1 0 012 0zM6.75 8a.75.75 0 000 1.5h.75v1.75a.75.75 0 001.5 0v-2.5A.75.75 0 008.25 8h-1.5z" clipRule="evenodd" />
          </svg>
          {t("signature.tip") || "Use HTML for email clients, Markdown for forums like Reddit"}
        </p>
      </div>
    </div>
  );
};

/**
 * MiniSignature - Inline badge for quick display
 */
export const MiniSignature = ({ stackScore, className = "" }) => {
  // SECURITY: Ensure score is a valid number within range
  const safeScore = Math.max(0, Math.min(100, parseInt(stackScore, 10) || 0));
  const indicator = safeScore >= 80 ? "🛡️" : safeScore >= 60 ? "⚠️" : "❌";

  return (
    <span className={`inline-flex items-center gap-1 text-sm ${className}`}>
      <span>{indicator}</span>
      <span className="font-bold">{safeScore}</span>
      <span className="text-base-content/60">/100</span>
      <span className="text-xs text-base-content/40">SafeScore</span>
    </span>
  );
};

export default ScoreSignature;
