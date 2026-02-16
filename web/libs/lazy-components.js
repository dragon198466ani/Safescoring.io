"use client";

import dynamic from "next/dynamic";

/**
 * Lazy Loading Components Registry
 * Components below the fold or heavy components are loaded on demand
 * This reduces initial bundle size and improves First Contentful Paint
 */

// Loading skeleton components
const LoadingSkeleton = ({ height = "200px", className = "" }) => (
  <div
    className={`animate-pulse bg-base-200 rounded-lg ${className}`}
    style={{ height }}
    aria-hidden="true"
  />
);

// Below-the-fold homepage components (lazy loaded)
export const LazyFAQ = dynamic(() => import("@/components/FAQ"), {
  loading: () => <LoadingSkeleton height="400px" />,
  ssr: true,
});

export const LazyCTA = dynamic(() => import("@/components/CTA"), {
  loading: () => <LoadingSkeleton height="200px" />,
  ssr: true,
});

export const LazyPricing = dynamic(() => import("@/components/Pricing"), {
  loading: () => <LoadingSkeleton height="500px" />,
  ssr: true,
});

export const LazyProductsPreview = dynamic(
  () => import("@/components/ProductsPreview"),
  {
    loading: () => (
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="animate-pulse p-6 rounded-xl bg-base-200 border border-base-300"
          >
            <div className="h-6 bg-base-300 rounded w-1/3 mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-base-300 rounded w-full"></div>
              <div className="h-4 bg-base-300 rounded w-2/3"></div>
            </div>
          </div>
        ))}
      </div>
    ),
    ssr: true,
  }
);

// Heavy interactive components (client-side only)
export const LazySecurityIncidents = dynamic(
  () => import("@/components/SecurityIncidents"),
  {
    loading: () => (
      <div className="bg-base-200 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-base-300 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-4 gap-3 mb-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-base-300 rounded"></div>
            ))}
          </div>
          <div className="space-y-3">
            <div className="h-20 bg-base-300 rounded"></div>
            <div className="h-20 bg-base-300 rounded"></div>
          </div>
        </div>
      </div>
    ),
    ssr: false,
  }
);

export const LazyCorrectionSection = dynamic(
  () => import("@/components/CorrectionSection"),
  {
    loading: () => <LoadingSkeleton height="200px" />,
    ssr: false,
  }
);

// Product page heavy sections
export const LazyProductHeroGallery = dynamic(
  () => import("@/components/ProductHeroGallery"),
  {
    loading: () => (
      <div className="grid grid-cols-4 gap-2 animate-pulse">
        <div className="col-span-2 row-span-2 h-64 bg-base-300 rounded-lg"></div>
        <div className="h-32 bg-base-300 rounded-lg"></div>
        <div className="h-32 bg-base-300 rounded-lg"></div>
      </div>
    ),
    ssr: true,
  }
);
