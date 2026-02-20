"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useApi } from "@/hooks/useApi";

/**
 * WatchlistButton - Add/remove products from watchlist
 * Can be used on product pages or in product lists
 */
export default function WatchlistButton({
  productSlug,
  productName,
  variant = "default", // "default" | "icon" | "compact"
  className = "",
  onAdd,
  onRemove,
}) {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);

  // Use useApi to fetch watchlist with caching (1 minute TTL)
  const shouldFetch = status !== "loading" && !!session?.user;
  const { data: watchlistData, isLoading: checking, invalidate } = useApi(
    shouldFetch ? "/api/user/watchlist" : null,
    { ttl: 60 * 1000 } // Cache for 1 minute
  );

  // Check if current product is in watchlist
  const isInWatchlist = useMemo(() => {
    if (!watchlistData?.watchlist) return false;
    return watchlistData.watchlist.some(w => w.product?.slug === productSlug);
  }, [watchlistData, productSlug]);

  const handleToggle = async () => {
    if (!session?.user) {
      // Redirect to sign in
      window.location.href = `/signin?callbackUrl=/products/${productSlug}`;
      return;
    }

    setLoading(true);

    try {
      if (isInWatchlist) {
        // Remove from watchlist
        const res = await fetch(`/api/user/watchlist?productSlug=${productSlug}`, {
          method: "DELETE",
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to remove");
        }

        // Invalidate cache to refresh watchlist
        await invalidate();
        onRemove?.();
      } else {
        // Add to watchlist
        const res = await fetch("/api/user/watchlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productSlug,
            alertOnChange: true,
            alertThreshold: 5,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          if (data.upgrade) {
            // Show upgrade prompt
            alert(`Watchlist limit reached. ${data.error}`);
            return;
          }
          throw new Error(data.error || "Failed to add");
        }

        // Invalidate cache to refresh watchlist
        await invalidate();
        onAdd?.();
      }
    } catch (err) {
      console.error("Watchlist error:", err);
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Loading session state - show skeleton briefly then default to sign-in prompt
  if (status === "loading") {
    // Show sign in prompt immediately instead of loading state
    // This prevents the "Loading..." from showing indefinitely
    if (variant === "icon") {
      return (
        <Link
          href={`/signin?callbackUrl=/products/${productSlug}`}
          className={`btn btn-ghost btn-sm btn-square ${className}`}
          title="Sign in to add to watchlist"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
          </svg>
        </Link>
      );
    }
    return (
      <Link
        href={`/signin?callbackUrl=/products/${productSlug}`}
        className={`inline-flex items-center gap-1.5 text-base-content/60 hover:text-primary transition-colors ${className}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
        </svg>
        Add to Watchlist
      </Link>
    );
  }

  // Not logged in - show sign in prompt
  if (!session?.user) {
    if (variant === "icon") {
      return (
        <Link
          href={`/signin?callbackUrl=/products/${productSlug}`}
          className={`btn btn-ghost btn-sm btn-square ${className}`}
          title="Sign in to add to watchlist"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
          </svg>
        </Link>
      );
    }

    return (
      <Link
        href={`/signin?callbackUrl=/products/${productSlug}`}
        className={`inline-flex items-center gap-1.5 text-base-content/60 hover:text-primary transition-colors ${className}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
        </svg>
        Add to Watchlist
      </Link>
    );
  }

  // Checking watchlist status for logged-in user
  if (checking) {
    if (variant === "icon") {
      return (
        <button className={`btn btn-ghost btn-sm btn-square ${className}`} disabled>
          <span className="loading loading-spinner loading-xs"></span>
        </button>
      );
    }
    return (
      <span className={`inline-flex items-center gap-1.5 text-base-content/40 ${className}`}>
        <span className="loading loading-spinner loading-xs"></span>
      </span>
    );
  }

  // Icon variant
  if (variant === "icon") {
    return (
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`btn btn-ghost btn-sm btn-square ${isInWatchlist ? "text-amber-400" : ""} ${className}`}
        title={isInWatchlist ? "Remove from watchlist" : "Add to watchlist"}
      >
        {loading ? (
          <span className="loading loading-spinner loading-xs"></span>
        ) : isInWatchlist ? (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
          </svg>
        )}
      </button>
    );
  }

  // Compact variant
  if (variant === "compact") {
    return (
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`btn btn-sm ${isInWatchlist ? "btn-warning" : "btn-ghost"} gap-1 ${className}`}
      >
        {loading ? (
          <span className="loading loading-spinner loading-xs"></span>
        ) : isInWatchlist ? (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z" clipRule="evenodd" />
            </svg>
            Watching
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            Watch
          </>
        )}
      </button>
    );
  }

  // Default variant - inline text style
  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 transition-colors ${
        isInWatchlist
          ? "text-amber-400 hover:text-amber-300"
          : "text-base-content/60 hover:text-primary"
      } ${className}`}
    >
      {loading ? (
        <span className="loading loading-spinner loading-xs"></span>
      ) : isInWatchlist ? (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
          <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
        </svg>
      )}
      {isInWatchlist ? "In Watchlist" : "Add to Watchlist"}
    </button>
  );
}
