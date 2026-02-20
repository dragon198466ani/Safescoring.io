"use client";

import { memo } from "react";

/**
 * LoadingSkeleton - Unified skeleton loading components
 *
 * Single source of truth for all loading states.
 * Memoized components for performance in lists.
 */

/**
 * Generic skeleton block
 */
export const Skeleton = memo(function Skeleton({ className = "", children }) {
  return (
    <div className={`animate-pulse bg-base-300 rounded ${className}`}>
      {children}
    </div>
  );
});

/**
 * Text line skeleton
 */
export function SkeletonText({ width = "w-full", height = "h-4", className = "" }) {
  return <div className={`animate-pulse bg-base-300 rounded ${height} ${width} ${className}`} />;
}

/**
 * Avatar/circle skeleton
 */
export function SkeletonAvatar({ size = "w-12 h-12", className = "" }) {
  return <div className={`animate-pulse bg-base-300 rounded-full ${size} ${className}`} />;
}

/**
 * Card skeleton - commonly used for product cards, setup cards, etc.
 */
export function SkeletonCard({ className = "" }) {
  return (
    <div className={`animate-pulse rounded-xl bg-base-200 border border-base-300 p-6 ${className}`}>
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 bg-base-300 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-base-300 rounded w-3/4" />
          <div className="h-3 bg-base-300 rounded w-1/2" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-base-300 rounded w-full" />
        <div className="h-3 bg-base-300 rounded w-5/6" />
        <div className="h-3 bg-base-300 rounded w-4/6" />
      </div>
    </div>
  );
}

/**
 * Table row skeleton
 */
export function SkeletonTableRow({ columns = 4, className = "" }) {
  return (
    <tr className={`animate-pulse ${className}`}>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-base-300 rounded w-full" />
        </td>
      ))}
    </tr>
  );
}

/**
 * Score skeleton - for score displays
 */
export function SkeletonScore({ className = "" }) {
  return (
    <div className={`animate-pulse ${className}`}>
      <div className="w-16 h-16 bg-base-300 rounded-full mx-auto mb-2" />
      <div className="h-3 bg-base-300 rounded w-16 mx-auto" />
    </div>
  );
}

/**
 * Pillar scores skeleton - for SAFE pillar breakdown
 */
export function SkeletonPillars({ className = "" }) {
  return (
    <div className={`grid grid-cols-4 gap-4 ${className}`}>
      {["S", "A", "F", "E"].map((pillar) => (
        <div key={pillar} className="animate-pulse text-center">
          <div className="w-10 h-10 bg-base-300 rounded-full mx-auto mb-2" />
          <div className="h-3 bg-base-300 rounded w-8 mx-auto" />
        </div>
      ))}
    </div>
  );
}

/**
 * Chart skeleton - for graphs and charts
 */
export function SkeletonChart({ height = "h-64", className = "" }) {
  return (
    <div className={`animate-pulse rounded-xl bg-base-200 border border-base-300 p-4 ${height} ${className}`}>
      <div className="h-full flex items-end gap-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 bg-base-300 rounded-t"
            style={{ height: `${30 + Math.random() * 60}%` }}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * List skeleton - for lists of items
 */
export function SkeletonList({ count = 5, className = "" }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse flex items-center gap-3">
          <div className="w-10 h-10 bg-base-300 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-base-300 rounded w-3/4" />
            <div className="h-3 bg-base-300 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Product card skeleton - specific for product displays
 * Memoized for performance in lists
 */
export const SkeletonProductCard = memo(function SkeletonProductCard({ className = "" }) {
  return (
    <div className={`animate-pulse rounded-xl bg-base-200 border border-base-300 p-4 ${className}`}>
      {/* Logo */}
      <div className="w-16 h-16 bg-base-300 rounded-xl mx-auto mb-4" />

      {/* Name */}
      <div className="h-5 bg-base-300 rounded w-3/4 mx-auto mb-2" />

      {/* Type */}
      <div className="h-3 bg-base-300 rounded w-1/2 mx-auto mb-4" />

      {/* Score */}
      <div className="w-20 h-20 bg-base-300 rounded-full mx-auto mb-4" />

      {/* Pillars */}
      <div className="grid grid-cols-4 gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="text-center">
            <div className="w-8 h-8 bg-base-300 rounded-full mx-auto mb-1" />
            <div className="h-2 bg-base-300 rounded w-6 mx-auto" />
          </div>
        ))}
      </div>
    </div>
  );
});

/**
 * Full page skeleton - for full page loading states
 */
export function SkeletonPage({ className = "" }) {
  return (
    <div className={`animate-pulse space-y-8 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-8 bg-base-300 rounded w-64" />
        <div className="h-10 bg-base-300 rounded w-32" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-base-200 rounded-xl border border-base-300" />
        ))}
      </div>

      {/* Main content */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 h-96 bg-base-200 rounded-xl border border-base-300" />
        <div className="h-96 bg-base-200 rounded-xl border border-base-300" />
      </div>
    </div>
  );
}

// Default export with all variants
export default {
  Skeleton,
  SkeletonText,
  SkeletonAvatar,
  SkeletonCard,
  SkeletonTableRow,
  SkeletonScore,
  SkeletonPillars,
  SkeletonChart,
  SkeletonList,
  SkeletonProductCard,
  SkeletonPage,
};
