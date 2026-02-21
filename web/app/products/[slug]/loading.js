import { SkeletonCard } from "@/components/common/LoadingSkeleton";

/**
 * Product page loading skeleton - shown during SSR streaming.
 * Matches the product page layout for a smooth loading experience.
 */
export default function ProductLoading() {
  return (
    <div className="min-h-screen pt-24 pb-16 px-6 hero-bg">
      <div className="max-w-5xl mx-auto animate-pulse">
        {/* Breadcrumb skeleton */}
        <div className="flex items-center gap-2 mb-8">
          <div className="h-4 bg-base-300 rounded w-12" />
          <span className="text-base-content/30">/</span>
          <div className="h-4 bg-base-300 rounded w-16" />
          <span className="text-base-content/30">/</span>
          <div className="h-4 bg-base-300 rounded w-24" />
        </div>

        {/* Product header skeleton */}
        <div className="flex flex-col lg:flex-row gap-8 mb-12">
          {/* Left: Product info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 bg-base-300 rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="h-7 bg-base-300 rounded w-48" />
                <div className="h-4 bg-base-300 rounded w-32" />
              </div>
            </div>
            <div className="space-y-2 mb-4">
              <div className="h-4 bg-base-300 rounded w-full max-w-2xl" />
              <div className="h-4 bg-base-300 rounded w-3/4 max-w-xl" />
            </div>
            <div className="flex gap-4">
              <div className="h-4 bg-base-300 rounded w-24" />
              <div className="h-4 bg-base-300 rounded w-28" />
            </div>
          </div>

          {/* Right: Score circle skeleton */}
          <div className="shrink-0">
            <div className="flex flex-col items-center p-6 rounded-2xl bg-base-200/50 border border-base-content/10">
              <div className="w-[140px] h-[140px] bg-base-300 rounded-full" />
              <div className="mt-4 space-y-2 text-center">
                <div className="h-3 bg-base-300 rounded w-20 mx-auto" />
                <div className="h-4 bg-base-300 rounded w-16 mx-auto" />
              </div>
            </div>
          </div>
        </div>

        {/* Gallery + Pillar Scores skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
          <div className="lg:col-span-2">
            <div className="aspect-[16/9] rounded-2xl bg-base-200/50 border border-base-content/10" />
          </div>
          <div className="lg:col-span-1 flex flex-col gap-3">
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
              {["S", "A", "F", "E"].map((code) => (
                <div key={code} className="p-3 rounded-xl bg-base-200 border border-base-300">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="h-5 bg-base-300 rounded w-16" />
                    <div className="h-5 bg-base-300 rounded w-8" />
                  </div>
                  <div className="w-full h-1.5 bg-base-300 rounded-full" />
                </div>
              ))}
            </div>
            <div className="rounded-xl bg-base-200/50 border border-base-content/10 p-3">
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="text-center space-y-1">
                    <div className="h-5 bg-base-300 rounded w-8 mx-auto" />
                    <div className="h-2 bg-base-300 rounded w-10 mx-auto" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Insights skeleton */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <div className="rounded-xl bg-base-200/50 border border-base-content/10 p-5 h-28" />
          <div className="rounded-xl bg-base-200/50 border border-base-content/10 p-5 h-28" />
        </div>

        {/* Sections skeleton */}
        <div className="space-y-8">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    </div>
  );
}
