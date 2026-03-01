"use client";

import { useTranslation } from "@/libs/i18n/LanguageProvider";
import ProductCard from "./ProductCard";

// Loading skeleton displayed while products are being fetched
function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(9)].map((_, i) => (
        <div key={i} className="animate-pulse rounded-xl bg-base-100 border border-base-300 flex flex-row overflow-hidden">
          {/* Image skeleton - Left side */}
          <div className="w-1/2 min-h-[180px] bg-base-300 relative flex-shrink-0">
            <div className="absolute top-2 right-2 w-10 h-10 rounded-lg bg-base-200"></div>
          </div>
          {/* Content skeleton - Right side */}
          <div className="flex-1 p-3 flex flex-col">
            <div className="flex items-start gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-base-300 flex-shrink-0"></div>
              <div className="flex-1">
                <div className="h-4 w-full bg-base-300 rounded mb-1"></div>
                <div className="h-3 w-2/3 bg-base-300 rounded"></div>
              </div>
            </div>
            <div className="flex gap-1 mb-2">
              <div className="h-4 w-14 bg-base-300 rounded"></div>
              <div className="h-4 w-10 bg-base-300 rounded"></div>
            </div>
            {/* Score bars skeleton */}
            <div className="space-y-1 flex-1">
              {[...Array(4)].map((_, j) => (
                <div key={j} className="flex items-center gap-1">
                  <div className="w-3 h-2 bg-base-300 rounded"></div>
                  <div className="flex-1 h-1 bg-base-300 rounded-full"></div>
                  <div className="w-5 h-2 bg-base-300 rounded"></div>
                </div>
              ))}
            </div>
            {/* Footer skeleton */}
            <div className="mt-2 pt-1.5 border-t border-base-200">
              <div className="h-2 w-16 bg-base-300 rounded"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Empty state when no products match filters
function ProductEmptyState({ onClearFilters }) {
  const { t } = useTranslation();

  return (
    <div className="text-center py-16">
      <div className="w-16 h-16 rounded-full bg-base-200 flex items-center justify-center mx-auto mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-base-content/50">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold mb-2">{t("productsPage.noProductsFound")}</h3>
      <p className="text-base-content/60 mb-4">
        {t("productsPage.adjustFilters")}
      </p>
      <button
        onClick={onClearFilters}
        className="btn btn-primary btn-sm"
      >
        {t("productsPage.clearFilters")}
      </button>
    </div>
  );
}

// "Load more" button for infinite-scroll-style pagination
function LoadMoreButton({ onClick, isLoadingMore, loadedCount, totalCount }) {
  const { t } = useTranslation();

  return (
    <div className="mt-8 text-center">
      <button
        onClick={onClick}
        disabled={isLoadingMore}
        className="btn btn-primary btn-outline gap-2"
      >
        {isLoadingMore ? (
          <>
            <span className="loading loading-spinner loading-sm"></span>
            {t("productsPage.loading")}
          </>
        ) : (
          <>
            {t("productsPage.loadMore")}
            <span className="badge badge-sm badge-ghost">
              {loadedCount} / {totalCount}
            </span>
          </>
        )}
      </button>
    </div>
  );
}

// Main ProductGrid component that orchestrates skeleton, grid, empty state, and load-more
export default function ProductGrid({
  products,
  loading,
  isRefreshing,
  scoreType,
  hasMore,
  isLoadingMore,
  totalProducts,
  onLoadMore,
  onAddToStack,
  stackProductIds,
  onClearFilters,
}) {
  const { t } = useTranslation();
  const filteredProducts = products;

  return (
    <>
      {/* Results count */}
      <div className="mb-6 flex items-center justify-between">
        <span className="text-sm text-base-content/60">
          {t("productsPage.showingProducts", { count: filteredProducts.length })}
        </span>
        {(loading || isRefreshing) && (
          <span className="flex items-center gap-2 text-sm text-base-content/50">
            <span className="loading loading-spinner loading-sm text-primary"></span>
            {isRefreshing && t("productsPage.updating")}
          </span>
        )}
      </div>

      {/* Loading state */}
      {loading && products.length === 0 && <ProductGridSkeleton />}

      {/* Products grid */}
      {(!loading || products.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              scoreType={scoreType}
              onAddToStack={onAddToStack}
              isInStack={stackProductIds.has(product.id)}
            />
          ))}
        </div>
      )}

      {/* Load More Button */}
      {!loading && hasMore && filteredProducts.length > 0 && (
        <LoadMoreButton
          onClick={onLoadMore}
          isLoadingMore={isLoadingMore}
          loadedCount={filteredProducts.length}
          totalCount={totalProducts}
        />
      )}

      {/* Empty state */}
      {!loading && !isRefreshing && filteredProducts.length === 0 && (
        <ProductEmptyState onClearFilters={onClearFilters} />
      )}
    </>
  );
}
