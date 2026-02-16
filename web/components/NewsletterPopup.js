"use client";

import { useState, useEffect } from "react";

/**
 * Newsletter Popup Component
 * Shows after user scrolls 50% or spends 30s on page
 * Uses localStorage to avoid showing repeatedly
 */
export default function NewsletterPopup() {
  const [isVisible, setIsVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle, loading, success, error
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already subscribed or dismissed recently
    const lastDismissed = localStorage.getItem("newsletter_dismissed");
    const isSubscribed = localStorage.getItem("newsletter_subscribed");

    if (isSubscribed) return;

    if (lastDismissed) {
      const dismissedDate = new Date(lastDismissed);
      const daysSince = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) return; // Don't show for 7 days after dismiss
    }

    // Trigger conditions
    let hasTriggered = false;

    // Trigger 1: Time on page (60 seconds — give user time to read)
    const timeoutId = setTimeout(() => {
      if (!hasTriggered && !dismissed) {
        setIsVisible(true);
        hasTriggered = true;
      }
    }, 60000);

    // Trigger 2: Scroll depth (90% — near bottom, after reading content)
    const handleScroll = () => {
      if (hasTriggered || dismissed) return;

      const scrollPercent =
        (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;

      if (scrollPercent > 90) {
        setIsVisible(true);
        hasTriggered = true;
      }
    };

    // Trigger 3: Exit intent (mouse leaves viewport)
    const handleMouseLeave = (e) => {
      if (hasTriggered || dismissed) return;
      if (e.clientY <= 0) {
        setIsVisible(true);
        hasTriggered = true;
      }
    };

    window.addEventListener("scroll", handleScroll);
    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    setDismissed(true);
    localStorage.setItem("newsletter_dismissed", new Date().toISOString());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || status === "loading") return;

    setStatus("loading");

    try {
      // Call newsletter API
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setStatus("success");
        localStorage.setItem("newsletter_subscribed", "true");
        setTimeout(() => setIsVisible(false), 3000);
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative bg-base-100 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 btn btn-ghost btn-sm btn-circle"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>

        {/* Header gradient */}
        <div className="bg-gradient-to-r from-primary/20 to-secondary/20 p-8 text-center">
          <div className="text-4xl mb-4">🔐</div>
          <h2 className="text-2xl font-bold mb-2">
            Stay Safe in Crypto
          </h2>
          <p className="text-base-content/70">
            Get weekly security alerts, new product ratings, and expert insights.
          </p>
        </div>

        {/* Form */}
        <div className="p-6">
          {status === "success" ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-2">✅</div>
              <p className="text-lg font-semibold text-success">You&apos;re subscribed!</p>
              <p className="text-sm text-base-content/70">Check your inbox for a welcome email.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="form-control">
                <input
                  type="email"
                  placeholder="your@email.com"
                  className="input input-bordered w-full"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className={`btn btn-primary w-full ${status === "loading" ? "loading" : ""}`}
                disabled={status === "loading"}
              >
                {status === "loading" ? "Subscribing..." : "Subscribe Free"}
              </button>

              {status === "error" && (
                <p className="text-sm text-error text-center">
                  Something went wrong. Please try again.
                </p>
              )}

              <p className="text-xs text-center text-base-content/50">
                No spam. Unsubscribe anytime. We respect your privacy.
              </p>
            </form>
          )}

          {/* Social proof */}
          <div className="mt-6 pt-4 border-t border-base-300 text-center">
            <p className="text-sm text-base-content/60">
              Join crypto enthusiasts
              who trust SafeScoring for security insights.
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
