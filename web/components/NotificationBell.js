"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

const typeIcons = {
  score_change: { icon: "\u2191\u2193", color: "text-amber-400" },
  security_incident: { icon: "\u26A0", color: "text-red-400" },
  weekly_digest: { icon: "\u2709", color: "text-blue-400" },
  monthly_report: { icon: "\u2606", color: "text-purple-400" },
  achievement: { icon: "\u2605", color: "text-green-400" },
  streak: { icon: "\u26A1", color: "text-orange-400" },
};

export default function NotificationBell() {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      const res = await fetch("/api/notifications?limit=10");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnread(data.unread || 0);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    fetchNotifications();
    // Poll every 60 seconds
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAllRead = async () => {
    setLoading(true);
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      setUnread(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error("Failed to mark all read:", err);
    } finally {
      setLoading(false);
    }
  };

  const markOneRead = async (id) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnread((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark notification read:", err);
    }
  };

  const getTimeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  if (!session?.user?.id) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn btn-ghost btn-sm btn-circle relative"
        aria-label="Notifications"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-5 h-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
          />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 w-80 max-h-[28rem] bg-base-200 border border-base-300 rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-base-300">
            <h3 className="font-semibold text-sm">Notifications</h3>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                disabled={loading}
                className="text-xs text-primary hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="overflow-y-auto max-h-80">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-base-content/50">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-8 h-8 mx-auto mb-2 opacity-50"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
                  />
                </svg>
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notif) => {
                const typeInfo = typeIcons[notif.type] || { icon: "?", color: "text-base-content/50" };
                return (
                  <button
                    key={notif.id}
                    onClick={() => {
                      if (!notif.is_read) markOneRead(notif.id);
                      // Navigate if data has a link
                      if (notif.data?.link) {
                        window.location.href = notif.data.link;
                      }
                    }}
                    className={`w-full text-left p-4 hover:bg-base-300/50 transition-colors border-b border-base-300/50 ${
                      !notif.is_read ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className="flex gap-3">
                      <span className={`text-lg ${typeInfo.color}`}>{typeInfo.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-medium line-clamp-1 ${!notif.is_read ? "text-base-content" : "text-base-content/70"}`}>
                            {notif.title}
                          </p>
                          {!notif.is_read && (
                            <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1.5" />
                          )}
                        </div>
                        <p className="text-xs text-base-content/50 line-clamp-2 mt-0.5">
                          {notif.message}
                        </p>
                        <p className="text-xs text-base-content/40 mt-1">
                          {getTimeAgo(notif.created_at)}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-base-300 text-center">
            <Link
              href="/dashboard/notifications"
              className="text-xs text-primary hover:underline"
              onClick={() => setIsOpen(false)}
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
