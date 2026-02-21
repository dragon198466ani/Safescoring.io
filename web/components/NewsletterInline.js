"use client";

import { useState } from "react";

/**
 * NewsletterInline - Compact newsletter signup CTA for embedding in pages.
 * Used on product pages, blog articles, and other content pages.
 *
 * Props:
 * - context: "product" | "blog" | "general" (adjusts messaging)
 * - productName: optional product name for personalized messaging
 * - className: optional additional CSS classes
 */
export default function NewsletterInline({
  context = "general",
  productName,
  className = "",
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle, loading, success, error

  const messages = {
    product: {
      title: "Get security alerts",
      subtitle: productName
        ? `Be notified when ${productName}'s score changes or new incidents are reported.`
        : "Get notified about score changes, new hacks, and security updates.",
      cta: "Subscribe",
    },
    blog: {
      title: "Stay safe in crypto",
      subtitle:
        "Weekly security digest — new ratings, hack analysis, and practical guides.",
      cta: "Subscribe",
    },
    general: {
      title: "Security alerts in your inbox",
      subtitle:
        "Score changes, hack alerts, and weekly security insights. No spam.",
      cta: "Subscribe",
    },
  };

  const msg = messages[context] || messages.general;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || status === "loading") return;

    setStatus("loading");

    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setStatus("success");
        if (typeof window !== "undefined") {
          localStorage.setItem("newsletter_subscribed", "true");
        }
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  // Don't render if already subscribed (checked client-side)
  if (
    typeof window !== "undefined" &&
    localStorage.getItem("newsletter_subscribed")
  ) {
    return null;
  }

  if (status === "success") {
    return (
      <div
        className={`rounded-xl bg-success/10 border border-success/20 p-4 text-center ${className}`}
      >
        <p className="text-sm font-medium text-success">
          ✓ Subscribed! Check your inbox.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl bg-base-200/50 border border-base-content/10 p-4 ${className}`}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-base-content">
            {msg.title}
          </p>
          <p className="text-xs text-base-content/60 mt-0.5">
            {msg.subtitle}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 w-full sm:w-auto"
        >
          <input
            type="email"
            placeholder="your@email.com"
            className="input input-bordered input-sm flex-1 sm:w-48"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button
            type="submit"
            className={`btn btn-primary btn-sm ${status === "loading" ? "loading" : ""}`}
            disabled={status === "loading"}
          >
            {status === "loading" ? "..." : msg.cta}
          </button>
        </form>
      </div>

      {status === "error" && (
        <p className="text-xs text-error mt-2">
          Something went wrong. Please try again.
        </p>
      )}
    </div>
  );
}
