"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ErrorBoundary from "@/components/ErrorBoundary";
import AIChat from "@/components/AIChat";
import FloatingStackBubble from "@/components/FloatingStackBubble";

import {
  PageHeader,
  ScoreTypeTabs,
  ProductFilters,
  StackBuilderTip,
  ProductGrid,
  ProductTypesOverview,
  ErrorRetryBanner,
} from "@/components/products";
import useProductsData from "@/components/products/useProductsData";

export default function ProductsPage() {
  const [isChatOpen, setIsChatOpen] = useState(false);

  const {
    // Data
    products,
    totalProducts,
    productTypes,
    categories,
    loading,
    hasMounted,
    error,
    realtimeUpdate,
    retryCount,
    isRefreshing,
    hasMore,
    isLoadingMore,
    // Filters
    search, setSearch,
    category, setCategory,
    selectedType, setSelectedType,
    sort, setSort,
    scoreType, setScoreType,
    showFilters, setShowFilters,
    filteredTypes,
    activeFilterCount,
    // Actions
    fetchProducts,
    loadMoreProducts,
    handleClearFilters,
    // Realtime
    forceRefresh,
    isConnected,
    connectionFailed,
    reconnect,
    // Stack
    stackProductIds,
    pendingAddProduct,
    handleQuickAddToStack,
    handleProductAddedToStack,
    handleProductRemovedFromStack,
  } = useProductsData();

  return (
    <>
      <Header />
      <ErrorBoundary message="Failed to load products. Please refresh the page.">
        <main className="min-h-screen pt-24 pb-16 px-6 hero-bg">
          <div className="max-w-7xl mx-auto">
            <PageHeader
              hasMounted={hasMounted}
              totalProducts={totalProducts}
              isConnected={isConnected}
              connectionFailed={connectionFailed}
              realtimeUpdate={realtimeUpdate}
              reconnect={reconnect}
              forceRefresh={forceRefresh}
            />

            <ScoreTypeTabs scoreType={scoreType} setScoreType={setScoreType} />

            <ProductFilters
              search={search}
              setSearch={setSearch}
              category={category}
              setCategory={setCategory}
              selectedType={selectedType}
              setSelectedType={setSelectedType}
              sort={sort}
              setSort={setSort}
              categories={categories}
              filteredTypes={filteredTypes}
              activeFilterCount={activeFilterCount}
              showFilters={showFilters}
              setShowFilters={setShowFilters}
            />

            <StackBuilderTip />

            <ErrorRetryBanner
              error={error}
              retryCount={retryCount}
              onRetry={() => fetchProducts(true)}
            />

            <ProductGrid
              products={products}
              loading={loading}
              isRefreshing={isRefreshing}
              scoreType={scoreType}
              hasMore={hasMore}
              isLoadingMore={isLoadingMore}
              totalProducts={totalProducts}
              onLoadMore={loadMoreProducts}
              onAddToStack={handleQuickAddToStack}
              stackProductIds={stackProductIds}
              onClearFilters={handleClearFilters}
            />

            {!loading && productTypes.length > 0 && (
              <ProductTypesOverview
                productTypes={productTypes}
                categories={categories}
                setCategory={setCategory}
                setSelectedType={setSelectedType}
              />
            )}
          </div>
        </main>
      </ErrorBoundary>
      <Footer />

      <AIChat
        products={products}
        isOpen={isChatOpen}
        onToggle={() => setIsChatOpen(!isChatOpen)}
      />

      <FloatingStackBubble
        products={products}
        pendingAddProduct={pendingAddProduct}
        onProductAdded={handleProductAddedToStack}
        onProductRemoved={handleProductRemovedFromStack}
      />
    </>
  );
}
