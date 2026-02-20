"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * useOnlineStatus - Hook to track browser online/offline status
 *
 * Returns:
 * - isOnline: boolean indicating current status
 * - wasOffline: boolean indicating if user was recently offline (for showing reconnection message)
 *
 * @example
 * const { isOnline, wasOffline } = useOnlineStatus();
 *
 * if (!isOnline) {
 *   return <OfflineBanner />;
 * }
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    // Set initial state from browser
    if (typeof navigator !== "undefined") {
      setIsOnline(navigator.onLine);
    }

    const handleOnline = () => {
      setIsOnline(true);
      // Track that we were offline for reconnection message
      setWasOffline(true);
      // Clear the "was offline" flag after 5 seconds
      setTimeout(() => setWasOffline(false), 5000);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return { isOnline, wasOffline };
}

/**
 * ConnectionIndicator - Visual indicator for online/offline status
 *
 * Displays in the header when offline, and briefly when reconnecting
 */
export function ConnectionIndicator() {
  const { isOnline, wasOffline } = useOnlineStatus();

  // Don't render anything if online and not recently offline
  if (isOnline && !wasOffline) {
    return null;
  }

  if (!isOnline) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-error/15 text-error text-xs font-medium animate-pulse">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-4 h-4"
        >
          <path
            fillRule="evenodd"
            d="M4.606 12.97a.75.75 0 01-.134 1.051 2.494 2.494 0 00-.93 2.437 2.494 2.494 0 002.437-.93.75.75 0 111.186.918 3.995 3.995 0 01-4.482 1.332.75.75 0 01-.461-.461 3.994 3.994 0 011.332-4.482.75.75 0 011.052.135z"
            clipRule="evenodd"
          />
          <path
            fillRule="evenodd"
            d="M13.703 4.469a.75.75 0 01.918 1.186c-.425.33-.766.798-.939 1.34a2.5 2.5 0 00.939 2.82.75.75 0 01-.918 1.186 4.002 4.002 0 01-.486-6.532.75.75 0 01.486 0zm-7.406 0a.75.75 0 01.486 0 4.002 4.002 0 01-.486 6.532.75.75 0 01-.918-1.186 2.5 2.5 0 00.939-2.82c-.173-.542-.514-1.01-.939-1.34a.75.75 0 01.918-1.186z"
            clipRule="evenodd"
          />
          <path d="M10 4.268a2 2 0 100 4 2 2 0 000-4z" />
          <path
            fillRule="evenodd"
            d="M10 1.5a8.5 8.5 0 100 17 8.5 8.5 0 000-17zM3.5 10a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0z"
            clipRule="evenodd"
          />
        </svg>
        Hors ligne
      </div>
    );
  }

  // Show "back online" message briefly
  if (wasOffline) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/15 text-success text-xs font-medium">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-4 h-4"
        >
          <path
            fillRule="evenodd"
            d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
            clipRule="evenodd"
          />
        </svg>
        Reconnecté
      </div>
    );
  }

  return null;
}

export default useOnlineStatus;
