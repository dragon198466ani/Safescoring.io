"use client";

import { useState, useEffect, useCallback, memo } from "react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useApi } from "@/hooks/useApi";

/**
 * Telegram linking section
 */
const TelegramSection = memo(function TelegramSection({
  isLinked,
  username,
  botLink,
  onUnlink,
  isLoading,
}) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = useCallback(() => {
    if (botLink) {
      navigator.clipboard.writeText(botLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [botLink]);

  if (isLinked) {
    return (
      <div className="flex items-center justify-between p-4 bg-base-300/50 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
            </svg>
          </div>
          <div>
            <p className="font-medium text-sm">Telegram Connected</p>
            {username && (
              <p className="text-xs text-base-content/60">@{username}</p>
            )}
          </div>
        </div>
        <button
          onClick={onUnlink}
          disabled={isLoading}
          className="btn btn-sm btn-ghost text-red-400 hover:bg-red-500/10"
        >
          {isLoading ? (
            <span className="loading loading-spinner loading-xs" />
          ) : (
            "Unlink"
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 bg-base-300/50 rounded-lg">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-base-content/10 flex items-center justify-center">
          <svg className="w-5 h-5 text-base-content/40" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
          </svg>
        </div>
        <div>
          <p className="font-medium text-sm">Connect Telegram</p>
          <p className="text-xs text-base-content/60">
            Receive instant alerts on Telegram
          </p>
        </div>
      </div>

      {botLink ? (
        <div className="space-y-2">
          <p className="text-xs text-base-content/60">
            Click the button below to open Telegram and link your account:
          </p>
          <div className="flex gap-2">
            <a
              href={botLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm btn-primary flex-1"
            >
              Open Telegram Bot
            </a>
            <button
              onClick={handleCopyLink}
              className="btn btn-sm btn-ghost"
              title="Copy link"
            >
              {copied ? (
                <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-base-content/40">
          Loading Telegram bot link...
        </p>
      )}
    </div>
  );
});

/**
 * Push notifications section
 */
const PushNotificationSection = memo(function PushNotificationSection() {
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
  } = usePushNotifications();

  if (!isSupported) {
    return (
      <div className="p-4 bg-base-300/50 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-base-content/10 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-base-content/40">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-sm text-base-content/40">Push Notifications</p>
            <p className="text-xs text-base-content/40">
              Not supported in this browser
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isSubscribed) {
    return (
      <div className="flex items-center justify-between p-4 bg-base-300/50 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-green-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-sm">Push Notifications Enabled</p>
            <p className="text-xs text-base-content/60">
              Instant browser alerts
            </p>
          </div>
        </div>
        <button
          onClick={unsubscribe}
          disabled={isLoading}
          className="btn btn-sm btn-ghost text-red-400 hover:bg-red-500/10"
        >
          {isLoading ? (
            <span className="loading loading-spinner loading-xs" />
          ) : (
            "Disable"
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 bg-base-300/50 rounded-lg">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-primary">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
          </svg>
        </div>
        <div>
          <p className="font-medium text-sm">Enable Push Notifications</p>
          <p className="text-xs text-base-content/60">
            Get instant alerts in your browser
          </p>
        </div>
      </div>

      <button
        onClick={subscribe}
        disabled={isLoading || permission === "denied"}
        className="btn btn-sm btn-primary w-full"
      >
        {isLoading ? (
          <>
            <span className="loading loading-spinner loading-xs" />
            Enabling...
          </>
        ) : permission === "denied" ? (
          "Blocked by browser"
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
            Enable Push Notifications
          </>
        )}
      </button>

      {permission === "denied" && (
        <p className="text-xs text-red-400 mt-2 text-center">
          Push notifications are blocked. Please enable them in your browser settings.
        </p>
      )}
    </div>
  );
});

/**
 * Notification settings component
 */
function NotificationSettings() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Use useApi hooks for preferences and telegram status (1 minute cache)
  const {
    data: prefsData,
    isLoading: loadingPrefs,
    invalidate: invalidatePrefs
  } = useApi("/api/user/notifications/preferences", {
    ttl: 60 * 1000
  });

  const {
    data: telegramData,
    isLoading: loadingTelegram,
    invalidate: invalidateTelegram
  } = useApi("/api/user/notifications/telegram", {
    ttl: 60 * 1000
  });

  // Extract data from API responses
  const prefs = prefsData?.preferences || null;
  const telegramStatus = telegramData || null;
  const loading = loadingPrefs || loadingTelegram;

  // Save preferences
  const savePreferences = useCallback(async (updates) => {
    try {
      setSaving(true);
      const response = await fetch("/api/user/notifications/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        // Invalidate cache to fetch fresh data
        await invalidatePrefs();
      } else {
        throw new Error("Failed to save");
      }
    } catch (err) {
      setError("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  }, [invalidatePrefs]);

  // Handle toggle change
  const handleToggle = useCallback(
    (field) => {
      const newValue = !prefs[field];
      setPrefs((prev) => ({ ...prev, [field]: newValue }));
      savePreferences({ [field]: newValue });
    },
    [prefs, savePreferences]
  );

  // Handle select change
  const handleSelect = useCallback(
    (field, value) => {
      setPrefs((prev) => ({ ...prev, [field]: value }));
      savePreferences({ [field]: value });
    },
    [savePreferences]
  );

  // Unlink Telegram
  const handleUnlinkTelegram = useCallback(async () => {
    try {
      setSaving(true);
      const response = await fetch("/api/user/notifications/telegram", {
        method: "DELETE",
      });

      if (response.ok) {
        // Invalidate cache to fetch fresh telegram status
        await invalidateTelegram();
      }
    } catch (err) {
      setError("Failed to unlink Telegram");
    } finally {
      setSaving(false);
    }
  }, [invalidateTelegram]);

  if (loading) {
    return (
      <div className="bg-base-200 rounded-xl border border-base-300 p-6">
        <div className="flex items-center justify-center">
          <span className="loading loading-spinner loading-md text-primary" />
        </div>
      </div>
    );
  }

  if (error && !prefs) {
    return (
      <div className="bg-base-200 rounded-xl border border-base-300 p-6 text-center">
        <p className="text-red-400">{error}</p>
        <button onClick={fetchPreferences} className="btn btn-sm btn-ghost mt-2">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-base-200 rounded-xl border border-base-300 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-base-300">
        <h3 className="font-semibold flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-primary">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
          </svg>
          Notification Settings
        </h3>
      </div>

      <div className="p-4 space-y-6">
        {/* Email notifications */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-base-content/60">Email</h4>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Email Notifications</p>
              <p className="text-xs text-base-content/50">
                Receive alerts via email
              </p>
            </div>
            <input
              type="checkbox"
              className="toggle toggle-primary toggle-sm"
              checked={prefs?.email_enabled ?? true}
              onChange={() => handleToggle("email_enabled")}
              disabled={saving}
            />
          </div>

          {prefs?.email_enabled && (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Email Frequency</p>
                <p className="text-xs text-base-content/50">
                  How often to receive emails
                </p>
              </div>
              <select
                className="select select-sm select-bordered"
                value={prefs?.email_digest || "instant"}
                onChange={(e) => handleSelect("email_digest", e.target.value)}
                disabled={saving}
              >
                <option value="instant">Instant</option>
                <option value="daily">Daily digest</option>
                <option value="weekly">Weekly digest</option>
              </select>
            </div>
          )}
        </div>

        {/* Push Notifications */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-base-content/60">Browser Push</h4>
          <PushNotificationSection />
        </div>

        {/* Telegram */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-base-content/60">Telegram</h4>
          <TelegramSection
            isLinked={telegramStatus?.isLinked}
            username={telegramStatus?.username}
            botLink={telegramStatus?.botLink}
            onUnlink={handleUnlinkTelegram}
            isLoading={saving}
          />
        </div>

        {/* Notification types */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-base-content/60">
            Alert Types
          </h4>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Security Incidents</p>
              <p className="text-xs text-base-content/50">
                Alerts when incidents affect your stack
              </p>
            </div>
            <input
              type="checkbox"
              className="toggle toggle-primary toggle-sm"
              checked={prefs?.notify_incidents ?? true}
              onChange={() => handleToggle("notify_incidents")}
              disabled={saving}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Score Changes</p>
              <p className="text-xs text-base-content/50">
                Alerts when your stack score changes
              </p>
            </div>
            <input
              type="checkbox"
              className="toggle toggle-primary toggle-sm"
              checked={prefs?.notify_score_changes ?? true}
              onChange={() => handleToggle("notify_score_changes")}
              disabled={saving}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Product Updates</p>
              <p className="text-xs text-base-content/50">
                Alerts when products are added/removed
              </p>
            </div>
            <input
              type="checkbox"
              className="toggle toggle-primary toggle-sm"
              checked={prefs?.notify_product_updates ?? true}
              onChange={() => handleToggle("notify_product_updates")}
              disabled={saving}
            />
          </div>
        </div>

        {/* Thresholds */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-base-content/60">
            Thresholds
          </h4>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Incident Severity</p>
              <p className="text-xs text-base-content/50">
                Minimum severity to trigger alerts
              </p>
            </div>
            <select
              className="select select-sm select-bordered"
              value={prefs?.severity_threshold || "high"}
              onChange={(e) => handleSelect("severity_threshold", e.target.value)}
              disabled={saving}
            >
              <option value="critical">Critical only</option>
              <option value="high">High and above</option>
              <option value="medium">Medium and above</option>
              <option value="low">All incidents</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Score Change Threshold</p>
              <p className="text-xs text-base-content/50">
                Minimum points change to notify
              </p>
            </div>
            <select
              className="select select-sm select-bordered"
              value={prefs?.score_change_threshold || 5}
              onChange={(e) =>
                handleSelect("score_change_threshold", parseInt(e.target.value, 10))
              }
              disabled={saving}
            >
              <option value={1}>1+ points</option>
              <option value={3}>3+ points</option>
              <option value={5}>5+ points</option>
              <option value={10}>10+ points</option>
            </select>
          </div>
        </div>

        {/* Saving indicator */}
        {saving && (
          <div className="text-center text-xs text-base-content/50">
            <span className="loading loading-spinner loading-xs" /> Saving...
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(NotificationSettings);
export { TelegramSection };
