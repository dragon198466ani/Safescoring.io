"use client";

import { useState, useEffect, useCallback, memo } from "react";
import { useSetupHistorySubscription } from "@/hooks/useSupabaseSubscription";

/**
 * Icon components for different history actions
 */
const HistoryIcons = {
  "plus-circle": (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="w-4 h-4"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  plus: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className="w-4 h-4"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  ),
  minus: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className="w-4 h-4"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
    </svg>
  ),
  pencil: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="w-4 h-4"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
      />
    </svg>
  ),
  chart: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="w-4 h-4"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
      />
    </svg>
  ),
  arrows: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="w-4 h-4"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
      />
    </svg>
  ),
  trash: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="w-4 h-4"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
      />
    </svg>
  ),
  info: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="w-4 h-4"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
      />
    </svg>
  ),
};

/**
 * Color classes for different action types
 */
const colorClasses = {
  green: "bg-green-500/20 text-green-400 border-green-500/30",
  red: "bg-red-500/20 text-red-400 border-red-500/30",
  blue: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  amber: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  gray: "bg-base-300 text-base-content/60 border-base-content/10",
};

/**
 * Single history entry component
 */
const HistoryEntry = memo(function HistoryEntry({ entry, isNew = false }) {
  const icon = HistoryIcons[entry.icon] || HistoryIcons.info;
  const color = colorClasses[entry.color] || colorClasses.gray;

  // Format date
  const date = new Date(entry.createdAt);
  const timeAgo = getTimeAgo(date);

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg transition-all duration-500 ${
        isNew ? "bg-primary/10 animate-pulse" : ""
      }`}
    >
      {/* Icon */}
      <div className={`p-2 rounded-lg border ${color}`}>{icon}</div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{entry.description}</p>
        <p className="text-xs text-base-content/40 mt-0.5">{timeAgo}</p>

        {/* Score change details */}
        {entry.action === "score_changed" && entry.oldValue && entry.newValue && (
          <div className="flex gap-4 mt-2 text-xs">
            <div className="flex items-center gap-1">
              <span className="text-base-content/40">Before:</span>
              <span className="font-medium">{entry.oldValue.note_finale}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-base-content/40">After:</span>
              <span className="font-medium">{entry.newValue.note_finale}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

/**
 * Get relative time string
 */
function getTimeAgo(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? "s" : ""} ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? "s" : ""} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? "s" : ""} ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

/**
 * Setup history component with real-time updates
 */
function SetupHistory({ setupId, maxItems = 10, showLoadMore = true }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [newEntryIds, setNewEntryIds] = useState(new Set());

  // Fetch history from API
  const fetchHistory = useCallback(
    async (pageNum = 1, append = false) => {
      if (!setupId) return;

      try {
        setLoading(true);
        const response = await fetch(
          `/api/setups/${setupId}/history?page=${pageNum}&limit=${maxItems}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch history");
        }

        const data = await response.json();

        if (append) {
          setHistory((prev) => [...prev, ...data.history]);
        } else {
          setHistory(data.history);
        }

        setHasMore(data.pagination.hasMore);
        setPage(pageNum);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [setupId, maxItems]
  );

  // Real-time subscription handler
  const handleRealtimeUpdate = useCallback(
    (payload) => {
      // Refetch to get the new entry
      fetchHistory(1, false).then(() => {
        // Mark new entries for highlighting
        if (payload.new?.id) {
          setNewEntryIds((prev) => new Set([...prev, payload.new.id]));
          // Remove highlight after animation
          setTimeout(() => {
            setNewEntryIds((prev) => {
              const next = new Set(prev);
              next.delete(payload.new.id);
              return next;
            });
          }, 3000);
        }
      });
    },
    [fetchHistory]
  );

  // Subscribe to real-time updates
  useSetupHistorySubscription({
    setupId,
    onUpdate: handleRealtimeUpdate,
    enabled: !!setupId,
  });

  // Initial load
  useEffect(() => {
    fetchHistory(1, false);
  }, [fetchHistory]);

  // Load more handler
  const handleLoadMore = useCallback(() => {
    fetchHistory(page + 1, true);
  }, [fetchHistory, page]);

  if (error) {
    return (
      <div className="bg-base-200 rounded-xl p-4 border border-base-300 text-center">
        <p className="text-sm text-red-400">Failed to load history</p>
        <button
          onClick={() => fetchHistory(1, false)}
          className="btn btn-xs btn-ghost mt-2"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-base-200 rounded-xl border border-base-300 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-base-300 flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-5 h-5 text-primary"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Change History
        </h3>
        {loading && (
          <span className="loading loading-spinner loading-xs text-primary" />
        )}
      </div>

      {/* History list */}
      <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
        {history.length === 0 && !loading ? (
          <div className="text-center py-6 text-base-content/40">
            <p className="text-sm">No history yet</p>
            <p className="text-xs mt-1">Changes will appear here</p>
          </div>
        ) : (
          history.map((entry) => (
            <HistoryEntry
              key={entry.id}
              entry={entry}
              isNew={newEntryIds.has(entry.id)}
            />
          ))
        )}

        {loading && history.length === 0 && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3 p-3 animate-pulse">
                <div className="w-8 h-8 rounded-lg bg-base-300" />
                <div className="flex-1">
                  <div className="h-4 bg-base-300 rounded w-3/4" />
                  <div className="h-3 bg-base-300 rounded w-1/4 mt-2" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Load more */}
      {showLoadMore && hasMore && (
        <div className="px-4 py-2 border-t border-base-content/5 text-center">
          <button
            onClick={handleLoadMore}
            disabled={loading}
            className="btn btn-xs btn-ghost"
          >
            {loading ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              "Load more"
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export default memo(SetupHistory);
export { HistoryEntry, HistoryIcons };
