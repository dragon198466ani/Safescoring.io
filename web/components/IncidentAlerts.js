"use client";

import { useState, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useApi } from "@/hooks/useApi";

/**
 * IncidentAlerts Component
 *
 * Real-time incident notifications for user's watchlist products.
 * Key lock-in feature: users return daily to check security alerts.
 */
export default function IncidentAlerts({
  className = "",
  maxAlerts = 5,
  showBell = true,
}) {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [localUnreadCount, setLocalUnreadCount] = useState(null);

  // Use useApi for alerts with 1-minute cache (short for real-time feel)
  const { data: alertsData, isLoading: loading, invalidate } = useApi(
    session?.user?.id ? `/api/user/alerts?limit=${maxAlerts}` : null,
    { ttl: 60 * 1000 } // 1 minute cache
  );

  // Extract alerts and unread count from API response
  const alerts = useMemo(() => alertsData?.alerts || [], [alertsData]);
  const unreadCount = localUnreadCount ?? (alertsData?.unreadCount || 0);

  // Poll every 5 minutes by invalidating cache
  useEffect(() => {
    if (!session?.user?.id) return;
    const interval = setInterval(() => invalidate(), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [session?.user?.id, invalidate]);

  // Mark alerts as read
  const markAsRead = async () => {
    if (unreadCount === 0) return;

    try {
      await fetch("/api/user/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "markRead" }),
      });
      setLocalUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark alerts as read:", err);
    }
  };

  // Handle bell click
  const handleBellClick = () => {
    setIsOpen(!isOpen);
    if (!isOpen && unreadCount > 0) {
      markAsRead();
    }
  };

  // Get severity color
  const getSeverityColor = (severity) => {
    switch (severity) {
      case "critical":
        return "text-error bg-error/10 border-error";
      case "high":
        return "text-warning bg-warning/10 border-warning";
      case "medium":
        return "text-info bg-info/10 border-info";
      default:
        return "text-base-content bg-base-200 border-base-300";
    }
  };

  // Get severity icon
  const getSeverityIcon = (severity) => {
    switch (severity) {
      case "critical":
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case "high":
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  // Format time ago
  const timeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    const intervals = [
      { label: "y", seconds: 31536000 },
      { label: "mo", seconds: 2592000 },
      { label: "d", seconds: 86400 },
      { label: "h", seconds: 3600 },
      { label: "m", seconds: 60 },
    ];

    for (const interval of intervals) {
      const count = Math.floor(seconds / interval.seconds);
      if (count >= 1) {
        return `${count}${interval.label} ago`;
      }
    }
    return "just now";
  };

  if (!session) return null;

  return (
    <div className={`relative ${className}`}>
      {/* Bell Button */}
      {showBell && (
        <button
          onClick={handleBellClick}
          className="btn btn-ghost btn-circle relative"
          aria-label="Alerts"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>

          {/* Unread badge */}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-error text-error-content text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-base-100 rounded-box shadow-2xl border border-base-300 z-50">
          <div className="p-3 border-b border-base-300 flex justify-between items-center">
            <h3 className="font-semibold">Security Alerts</h3>
            <a href="/dashboard/watchlist" className="text-xs text-primary hover:underline">
              Manage Watchlist
            </a>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center">
                <span className="loading loading-spinner loading-sm"></span>
              </div>
            ) : alerts.length === 0 ? (
              <div className="p-6 text-center text-base-content/60">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-12 w-12 mx-auto mb-2 opacity-30"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-sm">No security alerts</p>
                <p className="text-xs mt-1">Your watchlist products are safe</p>
              </div>
            ) : (
              alerts.map((alert) => (
                <a
                  key={alert.id}
                  href={`/products/${alert.productSlug}`}
                  className={`block p-3 border-b border-base-200 hover:bg-base-200 transition-colors ${
                    !alert.read ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="flex gap-3">
                    <div className={`p-2 rounded-lg ${getSeverityColor(alert.severity)}`}>
                      {getSeverityIcon(alert.severity)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {alert.productName}
                        </span>
                        <span className={`badge badge-xs ${
                          alert.severity === "critical" ? "badge-error" :
                          alert.severity === "high" ? "badge-warning" : "badge-info"
                        }`}>
                          {alert.severity}
                        </span>
                      </div>
                      <p className="text-xs text-base-content/70 mt-1 line-clamp-2">
                        {alert.title}
                      </p>
                      <p className="text-xs text-base-content/50 mt-1">
                        {timeAgo(alert.createdAt)}
                      </p>
                    </div>
                  </div>
                </a>
              ))
            )}
          </div>

          {alerts.length > 0 && (
            <div className="p-2 border-t border-base-300">
              <a
                href="/dashboard/settings"
                className="btn btn-ghost btn-xs btn-block"
              >
                Alert Settings
              </a>
            </div>
          )}
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

/**
 * Inline Alert Banner for product pages
 */
export function ProductAlertBanner({ productSlug, className = "" }) {
  // Use useApi for active incidents with 2-minute cache
  const { data: alertData } = useApi(
    productSlug ? `/api/products/${productSlug}/incidents?limit=1&active=true` : null,
    { ttl: 2 * 60 * 1000 }
  );

  const alert = alertData?.incidents?.[0] || null;

  if (!alert) return null;

  return (
    <div className={`alert alert-warning ${className}`}>
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <div>
        <h3 className="font-bold">Active Security Incident</h3>
        <p className="text-sm">{alert.title}</p>
      </div>
      <a href={alert.sourceUrl} target="_blank" rel="noopener noreferrer" className="btn btn-sm">
        Details
      </a>
    </div>
  );
}
