/**
 * Monitoring & Error Tracking
 *
 * Centralized error reporting that supports multiple backends:
 * 1. Sentry (if NEXT_PUBLIC_SENTRY_DSN is set)
 * 2. Console logging (always, as fallback)
 * 3. Custom API endpoint for server-side aggregation
 *
 * Setup:
 * 1. Create a Sentry project at https://sentry.io
 * 2. Set NEXT_PUBLIC_SENTRY_DSN in your .env
 * 3. Optionally set SENTRY_AUTH_TOKEN for source maps
 *
 * This module provides a lightweight wrapper that works without
 * installing @sentry/nextjs — uses the Sentry browser SDK loader.
 * For full Sentry integration, install @sentry/nextjs and use
 * their official Next.js setup wizard.
 */

let sentryInitialized = false;

/**
 * Initialize monitoring (call once in app layout or _app)
 */
export function initMonitoring() {
  if (typeof window === "undefined") return;
  if (sentryInitialized) return;

  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    console.info("[MONITORING] No SENTRY_DSN configured — using console logging only");
    return;
  }

  // Lazy-load Sentry browser SDK via CDN loader (avoids bundle bloat)
  const script = document.createElement("script");
  script.src = `https://js.sentry-cdn.com/${extractSentryKey(dsn)}.min.js`;
  script.crossOrigin = "anonymous";
  script.onload = () => {
    if (window.Sentry) {
      window.Sentry.init({
        dsn,
        environment: process.env.NODE_ENV,
        release: process.env.NEXT_PUBLIC_APP_VERSION || "unknown",
        tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,
        // Don't send PII
        sendDefaultPii: false,
        // Ignore common non-actionable errors
        ignoreErrors: [
          "ResizeObserver loop",
          "Non-Error promise rejection",
          "Load failed",
          "ChunkLoadError",
          "Loading chunk",
          "Network request failed",
          /^AbortError/,
        ],
        beforeSend(event) {
          // Strip sensitive data from URLs
          if (event.request?.url) {
            try {
              const url = new URL(event.request.url);
              url.searchParams.delete("token");
              url.searchParams.delete("key");
              url.searchParams.delete("secret");
              url.searchParams.delete("email");
              url.searchParams.delete("password");
              url.searchParams.delete("api_key");
              event.request.url = url.toString();
            } catch {
              // URL parsing failed, keep as-is
            }
          }
          // Strip user PII — only keep anonymous ID
          if (event.user) {
            delete event.user.email;
            delete event.user.username;
            delete event.user.ip_address;
          }
          // Strip PII from breadcrumbs (form inputs, etc.)
          if (event.breadcrumbs?.values) {
            event.breadcrumbs.values = event.breadcrumbs.values.map((bc) => {
              if (bc.data) {
                delete bc.data.email;
                delete bc.data.password;
                delete bc.data.token;
              }
              return bc;
            });
          }
          return event;
        },
      });
      sentryInitialized = true;
      console.info("[MONITORING] Sentry initialized");
    }
  };
  script.onerror = () => {
    console.warn("[MONITORING] Failed to load Sentry SDK");
  };
  document.head.appendChild(script);
}

/**
 * Extract the Sentry public key from DSN for CDN loader
 */
function extractSentryKey(dsn) {
  try {
    const url = new URL(dsn);
    return url.username; // The public key is the username in the DSN
  } catch {
    return "";
  }
}

/**
 * Capture an error with optional context
 */
export function captureError(error, context = {}) {
  // Always log to console
  console.error("[ERROR]", error, context);

  // Send to Sentry if available
  if (typeof window !== "undefined" && window.Sentry) {
    window.Sentry.withScope((scope) => {
      if (context.tags) {
        Object.entries(context.tags).forEach(([k, v]) => scope.setTag(k, v));
      }
      if (context.extra) {
        Object.entries(context.extra).forEach(([k, v]) => scope.setExtra(k, v));
      }
      if (context.user) {
        // Only pass anonymous ID — never email or PII
        const { id } = context.user;
        scope.setUser(id ? { id } : undefined);
      }
      window.Sentry.captureException(error);
    });
  }
}

/**
 * Capture a message (non-error event)
 */
export function captureMessage(message, level = "info", context = {}) {
  const logFn = level === "error" ? console.error : level === "warning" ? console.warn : console.info;
  logFn("[MONITOR]", message, context);

  if (typeof window !== "undefined" && window.Sentry) {
    window.Sentry.withScope((scope) => {
      if (context.tags) {
        Object.entries(context.tags).forEach(([k, v]) => scope.setTag(k, v));
      }
      if (context.extra) {
        Object.entries(context.extra).forEach(([k, v]) => scope.setExtra(k, v));
      }
      window.Sentry.captureMessage(message, level);
    });
  }
}

/**
 * Server-side error capture (for API routes)
 * Uses console.error and optionally posts to Sentry via Node SDK
 */
export function captureServerError(error, context = {}) {
  const { endpoint, method, clientId, ...extra } = context;

  console.error(`[API ERROR] ${method || "?"} ${endpoint || "?"}:`, error.message || error);

  // In production, you could send this to a logging service
  // For now, structured console output is sufficient for Docker logs
  if (process.env.NODE_ENV === "production") {
    console.error(JSON.stringify({
      level: "error",
      timestamp: new Date().toISOString(),
      message: error.message || String(error),
      stack: error.stack,
      endpoint,
      method,
      clientId,
      ...extra,
    }));
  }
}
