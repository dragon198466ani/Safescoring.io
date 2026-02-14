// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a user loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only initialize if DSN is configured
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Session Replay (only in production)
  replaysSessionSampleRate: 0.01, // 1% of sessions
  replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

  // Environment
  environment: process.env.NODE_ENV || "development",

  // Filter out noisy errors
  ignoreErrors: [
    // Browser extensions
    "top.GLOBALS",
    "originalCreateNotification",
    "canvas.contentDocument",
    // Random plugins/extensions
    "atomicFindClose",
    // Facebook borance
    "fb_xd_fragment",
    // Common network errors
    "Network request failed",
    "Failed to fetch",
    "Load failed",
    "ChunkLoadError",
    // Auth errors (expected)
    "NEXT_REDIRECT",
  ],

  // Only send errors from our domain
  allowUrls: [/https?:\/\/(www\.)?safescoring\.io/],

  beforeSend(event) {
    // Don't send events in development
    if (process.env.NODE_ENV !== "production") return null;
    return event;
  },
});
