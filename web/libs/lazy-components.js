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

const LoadingCard = () => (
  <div className="animate-pulse p-6 rounded-xl bg-base-200 border border-base-300">
    <div className="h-6 bg-base-300 rounded w-1/3 mb-4"></div>
    <div className="space-y-3">
      <div className="h-4 bg-base-300 rounded w-full"></div>
      <div className="h-4 bg-base-300 rounded w-2/3"></div>
    </div>
  </div>
);

const LoadingGrid = () => (
  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
    {[...Array(6)].map((_, i) => (
      <LoadingCard key={i} />
    ))}
  </div>
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

export const LazyTestimonials = dynamic(
  () => import("@/components/Testimonials3"),
  {
    loading: () => <LoadingSkeleton height="300px" />,
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
    ssr: false, // Client-side only - fetches data
  }
);

export const LazyScoreEvolution = dynamic(
  () => import("@/components/ScoreEvolution"),
  {
    loading: () => (
      <div className="bg-base-200 rounded-lg p-6 h-64 animate-pulse">
        <div className="h-6 bg-base-300 rounded w-1/4 mb-4"></div>
        <div className="h-40 bg-base-300 rounded"></div>
      </div>
    ),
    ssr: false,
  }
);

export const LazyCorrectionForm = dynamic(
  () => import("@/components/CorrectionForm"),
  {
    loading: () => <LoadingSkeleton height="300px" />,
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

// Dashboard components (heavy, client-side only)
export const LazySetupCreator = dynamic(
  () => import("@/components/SetupCreator"),
  {
    loading: () => <LoadingSkeleton height="400px" />,
    ssr: false,
  }
);

export const LazyLeaderboard = dynamic(
  () => import("@/components/Leaderboard"),
  {
    loading: () => <LoadingGrid />,
    ssr: false,
  }
);

export const LazyReferralDashboard = dynamic(
  () => import("@/components/ReferralDashboard"),
  {
    loading: () => <LoadingSkeleton height="300px" />,
    ssr: false,
  }
);

// Modals (loaded on demand, client-side only)
export const LazyPillarInfoModal = dynamic(
  () => import("@/components/PillarInfoModal"),
  {
    ssr: false,
  }
);

export const LazyUpgradeModal = dynamic(
  () => import("@/components/UpgradeModal"),
  {
    ssr: false,
  }
);

export const LazyModal = dynamic(() => import("@/components/Modal"), {
  ssr: false,
});

// Onboarding wizard (heavy, step-based)
export const LazyOnboardingWizard = dynamic(
  () => import("@/components/onboarding/OnboardingWizard"),
  {
    loading: () => (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="w-16 h-16 bg-base-300 rounded-full mx-auto mb-4"></div>
          <div className="h-6 bg-base-300 rounded w-48 mx-auto"></div>
        </div>
      </div>
    ),
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

// Web3 components (heavy dependencies, client-side only)
export const LazyWeb3Provider = dynamic(
  () => import("@/components/Web3Provider"),
  {
    ssr: false,
  }
);

export const LazyButtonMintNFT = dynamic(
  () => import("@/components/ButtonMintNFT"),
  {
    loading: () => (
      <button className="btn btn-primary btn-disabled animate-pulse">
        Loading...
      </button>
    ),
    ssr: false,
  }
);

// Stats component for homepage
export const LazyStats = dynamic(() => import("@/components/Stats"), {
  loading: () => (
    <div className="py-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="text-center">
              <div className="h-10 bg-base-300 rounded w-20 mx-auto mb-2"></div>
              <div className="h-4 bg-base-300 rounded w-24 mx-auto"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  ),
  ssr: true,
});

// ProductsPreview for homepage
export const LazyProductsPreview = dynamic(
  () => import("@/components/ProductsPreview"),
  {
    loading: () => <LoadingGrid />,
    ssr: true,
  }
);

// CommunityStats - heavy component with external API calls
export const LazyCommunityStats = dynamic(
  () => import("@/components/CommunityStats"),
  {
    loading: () => (
      <div className="bg-base-200 rounded-lg p-6 animate-pulse">
        <div className="h-6 bg-base-300 rounded w-1/3 mb-4"></div>
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-12 bg-base-300 rounded"></div>
          ))}
        </div>
      </div>
    ),
    ssr: false,
  }
);

// AdminDashboard - heavy admin component
export const LazyAdminDashboard = dynamic(
  () => import("@/components/AdminDashboard"),
  {
    loading: () => (
      <div className="min-h-screen p-6 animate-pulse">
        <div className="h-8 bg-base-300 rounded w-1/4 mb-6"></div>
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-base-300 rounded"></div>
          ))}
        </div>
      </div>
    ),
    ssr: false,
  }
);

// Newsletter popup - loaded after interaction
export const LazyNewsletterPopup = dynamic(
  () => import("@/components/NewsletterPopup"),
  {
    ssr: false,
  }
);

// Community voting & rewards components
export const LazyEvaluationVoting = dynamic(
  () => import("@/components/EvaluationVoting"),
  {
    loading: () => <LoadingSkeleton height="300px" />,
    ssr: false,
  }
);

export const LazyCommunityLeaderboard = dynamic(
  () => import("@/components/CommunityLeaderboard"),
  {
    loading: () => <LoadingSkeleton height="250px" />,
    ssr: false,
  }
);

export const LazyRewardsDashboard = dynamic(
  () => import("@/components/RewardsDashboard"),
  {
    loading: () => <LoadingSkeleton height="200px" />,
    ssr: false,
  }
);

// Strategic Analysis - AI-generated per-pillar narratives
export const LazySAFEStrategicAnalysis = dynamic(
  () => import("@/components/SAFEStrategicAnalysis"),
  {
    loading: () => <LoadingCard />,
    ssr: false,
  }
);

// Protection Guide - how to protect yourself with this product
export const LazySAFEProtectionGuide = dynamic(
  () => import("@/components/SAFEProtectionGuide"),
  {
    ssr: false,
  }
);

