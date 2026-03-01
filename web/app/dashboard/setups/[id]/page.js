"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

// Components
import SetupProductsList from "@/components/SetupProductsList";
import SetupStats from "@/components/SetupStats";
import SetupVigilance from "@/components/SetupVigilance";
import SetupCompatibilityGraph from "@/components/SetupCompatibilityGraph";
import SetupCatalogSidebar from "@/components/SetupCatalogSidebar";
import SetupAssistant from "@/components/SetupAssistant";
import ShareStackModal from "@/components/ShareStackModal";
import UpgradeModal from "@/components/UpgradeModal";
import FreeLimitsExhausted from "@/components/FreeLimitsExhausted";
import SetupHistory from "@/components/SetupHistory";
import SetupRecommendations from "@/components/SetupRecommendations";
import SetupScoreEvolution from "@/components/SetupScoreEvolution";
import NotificationSettings from "@/components/NotificationSettings";
import SetupSAFEAnalysis from "@/components/SetupSAFEAnalysis";
import KycExposureCard from "@/components/KycExposureCard";
import { getScoreColor } from "@/components/ScoreCircle";
import { useScoringSetup } from "@/libs/ScoringSetupProvider";

// Hooks
import { useSetupSubscription, useSetupHistorySubscription } from "@/hooks/useSupabaseSubscription";
import { useSetupScores, useScoreChange } from "@/hooks/useSetupScores";
import { useRealtimeSetup } from "@/hooks/useRealtimeStack";

/**
 * Setup Detail Page
 * - Detailed view of a setup with all components
 * - Split-view layout: left (products, stats, vigilance) / right (catalog, graph)
 * - Real-time updates, history, recommendations, and notifications
 */

export default function SetupDetailPage() {
  const router = useRouter();
  const params = useParams();
  const setupId = params.id;

  // State
  const [setup, setSetup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState("products");
  const [isEditing, setIsEditing] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [activeTab, setActiveTab] = useState("overview"); // overview, history, notifications

  // Custom scoring weights
  const { computeSAFE, isCustom } = useScoringSetup();

  // Enriched data from API
  const [incidents, setIncidents] = useState([]);
  const [weaknesses, setWeaknesses] = useState([]);
  const [compatibility, setCompatibility] = useState([]);

  // User access & assistant
  const [userAccess, setUserAccess] = useState({ isPaid: false, productLimit: 3 });
  const [showAssistant, setShowAssistant] = useState(false);
  const [catalogProducts, setCatalogProducts] = useState([]);

  // Real-time subscriptions (Inception Layer 3: Setup Detail level)
  const productIds = setup?.productDetails?.map(p => p.id) || [];

  // Inception-style real-time sync for this setup
  const {
    setup: realtimeSetup,
    isConnected: realtimeConnected,
    addProduct: realtimeAddProduct,
    removeProduct: realtimeRemoveProduct,
  } = useRealtimeSetup(setupId);

  // Merge real-time data with local state when available
  useEffect(() => {
    if (realtimeSetup && realtimeSetup.id === setupId) {
      setSetup(prev => ({
        ...prev,
        ...realtimeSetup,
        // Keep local-only properties
        productDetails: realtimeSetup.productDetails || prev?.productDetails || [],
      }));
    }
  }, [realtimeSetup, setupId]);

  const { isConnected } = useSetupSubscription({
    setupId,
    productIds,
    onUpdate: useCallback((payload) => {
      console.log("Real-time update:", payload);
      // Refetch setup on any change
      fetchSetup();
    }, []),
    enabled: !!setupId && !!setup,
  });

  // Real-time scores
  const { scores: liveScores, loading: scoresLoading } = useSetupScores({
    setup,
    enabled: !!setup,
  });

  // Track score changes for animation
  const scoreChange = useScoreChange(
    liveScores || setup?.combinedScore
  );

  // Fetch setup data
  const fetchSetup = useCallback(async () => {
    try {
      const res = await fetch(`/api/setups/${setupId}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError("Setup not found");
        } else {
          setError("Error loading setup");
        }
        return;
      }

      const data = await res.json();
      setSetup(data.setup);
      setIncidents(data.incidents || []);
      setWeaknesses(data.weaknesses || []);
      setCompatibility(data.compatibility || []);
    } catch (err) {
      console.error("Failed to fetch setup:", err);
      setError("Connection error");
    }
    setLoading(false);
  }, [setupId]);

  useEffect(() => {
    if (setupId) {
      fetchSetup();
    }
  }, [setupId, fetchSetup]);

  // Fetch user access level and catalog products
  useEffect(() => {
    const fetchAccessAndCatalog = async () => {
      try {
        // Fetch user access info
        const accessRes = await fetch("/api/user/usage");
        if (accessRes.ok) {
          const accessData = await accessRes.json();
          const isPaid = accessData.plan !== "free" && accessData.plan !== "anonymous";
          // Use plan-specific limits from usage API, fallback to config-constants defaults
          const productLimit = accessData.limits?.maxProductsPerSetup
            || (isPaid ? 10 : 3);
          setUserAccess({ isPaid, productLimit, plan: accessData.plan });
        }

        // Fetch products for assistant recommendations
        const productsRes = await fetch("/api/products?limit=100");
        if (productsRes.ok) {
          const productsData = await productsRes.json();
          setCatalogProducts(productsData.products || []);
        }
      } catch (err) {
        console.error("Failed to fetch access/catalog:", err);
      }
    };

    fetchAccessAndCatalog();
  }, []);

  // Handle limit reached - show upgrade modal
  const handleLimitReached = () => {
    setUpgradeFeature("products");
    setShowUpgradeModal(true);
  };

  // Add product to setup
  const handleAddProduct = async (product, role) => {
    if (!setup) return;

    // Check product limit
    const currentCount = (setup.products || []).length;
    if (!userAccess.isPaid && currentCount >= userAccess.productLimit) {
      handleLimitReached();
      return;
    }

    const newProducts = [
      ...(setup.products || []),
      { product_id: product.id, role }
    ];

    await updateSetup({ products: newProducts });
  };

  // Remove product from setup
  const handleRemoveProduct = async (productId) => {
    if (!setup) return;

    const newProducts = (setup.products || []).filter(
      p => (p.product_id || p.product?.id) !== productId
    );

    await updateSetup({ products: newProducts });
  };

  // Change product role
  const handleRoleChange = async (productId, newRole) => {
    if (!setup) return;

    const newProducts = (setup.products || []).map(p => {
      if ((p.product_id || p.product?.id) === productId) {
        return { ...p, role: newRole };
      }
      return p;
    });

    await updateSetup({ products: newProducts });
  };

  // Reorder products in setup (drag-and-drop)
  const handleReorder = async (newOrder) => {
    if (!setup) return;
    const newProducts = newOrder.map((item) => ({
      product_id: (item.product || item).id,
      role: item.role || "other",
    }));
    await updateSetup({ products: newProducts });
  };

  // Update setup
  const updateSetup = async (updates) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/setups/${setupId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: setup?.name, ...updates }),
      });

      if (res.ok) {
        // Refetch to get updated data
        await fetchSetup();
      } else {
        const data = await res.json();
        alert(data.error || "Error saving");
      }
    } catch (err) {
      console.error("Failed to update setup:", err);
      alert("Connection error");
    }
    setSaving(false);
  };

  // Delete setup
  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this setup?")) return;

    try {
      const res = await fetch(`/api/setups/${setupId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.push("/dashboard/setups");
      } else {
        alert("Error deleting setup");
      }
    } catch (err) {
      console.error("Failed to delete setup:", err);
      alert("Connection error");
    }
  };

  // Download PDF using client-side generator
  const handleDownloadPDF = async () => {
    if (!userAccess.isPaid) {
      setUpgradeFeature("pdf");
      setShowUpgradeModal(true);
      return;
    }

    setDownloadingPDF(true);
    try {
      const { downloadSetupPDF } = await import("@/libs/pdf-generator");
      await downloadSetupPDF(setup, {
        incidents,
        weaknesses,
      });
    } catch (err) {
      console.error("Failed to generate PDF:", err);
      alert("Error generating PDF");
    }
    setDownloadingPDF(false);
  };

  // Navigate to recommendations section
  const handleRecommendationClick = (pillar) => {
    setActiveTab("overview");
    // Scroll to recommendations if on overview
    const element = document.getElementById("recommendations-section");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-12 bg-base-300/50 rounded-lg animate-pulse w-1/3" />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-48 bg-base-300/50 rounded-xl animate-pulse" />
            <div className="h-64 bg-base-300/50 rounded-xl animate-pulse" />
          </div>
          <div className="lg:col-span-3 space-y-4">
            <div className="h-96 bg-base-300/50 rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-red-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold mb-2">{error}</h2>
        <p className="text-base-content/60 mb-4">This setup does not exist or you do not have access</p>
        <Link href="/dashboard/setups" className="btn btn-primary">
          Back to Setups
        </Link>
      </div>
    );
  }

  if (!setup) return null;

  // Get product details and IDs
  const productDetails = setup.productDetails || [];
  const addedProductIds = productDetails.map(p => p.id);
  const rawCombined = liveScores || setup.combinedScore;
  const rawScore = rawCombined?.note_finale;
  // Apply custom weights if active
  const score = isCustom && rawCombined
    ? (computeSAFE({ s: rawCombined.score_s, a: rawCombined.score_a, f: rawCombined.score_f, e: rawCombined.score_e }) ?? rawScore)
    : rawScore;
  const combinedScore = rawCombined;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/setups"
            className="btn btn-ghost btn-sm btn-circle"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </Link>
          <div>
            {isEditing ? (
              <input
                type="text"
                value={setup.name}
                onChange={(e) => setSetup({ ...setup, name: e.target.value })}
                onBlur={() => {
                  updateSetup({ name: setup.name });
                  setIsEditing(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    updateSetup({ name: setup.name });
                    setIsEditing(false);
                  }
                }}
                className="input input-bordered text-2xl font-bold h-auto py-1"
                autoFocus
              />
            ) : (
              <h1
                className="text-2xl font-bold cursor-pointer hover:text-primary transition-colors flex items-center gap-2"
                onClick={() => setIsEditing(true)}
              >
                {setup.name}
                {/* Live indicator (Inception sync active) */}
                {(isConnected || realtimeConnected) && (
                  <span className="relative flex h-2 w-2" title="Real-time sync active (Inception mode)">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                )}
              </h1>
            )}
            <p className="text-sm text-base-content/60">
              {productDetails.length} product{productDetails.length > 1 ? 's' : ''} • Created on {new Date(setup.created_at).toLocaleDateString('en-US')}
              {isCustom && (
                <Link href="/dashboard/scoring-setups" className="inline-flex items-center gap-1 ml-2 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors text-xs">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
                  </svg>
                  Custom weights
                </Link>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Score badge with animation */}
          {score && (
            <div className={`px-4 py-2 rounded-lg bg-gradient-to-r ${
              score >= 80 ? 'from-green-500/20 to-green-500/5 border-green-500/30' :
              score >= 60 ? 'from-amber-500/20 to-amber-500/5 border-amber-500/30' :
              'from-red-500/20 to-red-500/5 border-red-500/30'
            } border relative`}>
              <span className={`text-2xl font-bold ${getScoreColor(score)} transition-all duration-500`}>{score}</span>
              <span className="text-xs text-base-content/50 ml-1">SAFE</span>
              {/* Score change indicator */}
              {scoreChange?.magnitude > 0 && (
                <span className={`absolute -top-1 -right-1 text-xs px-1 rounded ${
                  scoreChange.direction === 'up' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  {scoreChange.direction === 'up' ? '+' : '-'}{scoreChange.magnitude}
                </span>
              )}
            </div>
          )}

          {/* Actions */}
          <button
            onClick={() => setShowShareModal(true)}
            className="btn btn-outline btn-sm gap-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
            </svg>
            Share
          </button>
          <button
            onClick={handleDownloadPDF}
            disabled={downloadingPDF}
            className={`btn btn-sm gap-1 ${userAccess.isPaid ? 'btn-outline' : 'btn-outline border-purple-500/50 text-purple-400 hover:bg-purple-500/10'}`}
            title={userAccess.isPaid ? "Export as PDF" : "Pro feature - Click to unlock"}
          >
            {downloadingPDF ? (
              <span className="loading loading-spinner loading-xs"></span>
            ) : !userAccess.isPaid ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            )}
            PDF
            {!userAccess.isPaid && <span className="badge badge-xs bg-purple-500 text-white border-0">Pro</span>}
          </button>
          <button
            onClick={handleDelete}
            className="btn btn-ghost btn-sm text-red-400 hover:bg-red-500/10"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          </button>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="tabs tabs-boxed bg-base-200 p-1">
        <button
          className={`tab ${activeTab === 'overview' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`tab ${activeTab === 'history' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          History
        </button>
        <button
          className={`tab ${activeTab === 'notifications' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          Notifications
        </button>
      </div>

      {/* Saving indicator */}
      {saving && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2 bg-base-200 rounded-lg border border-base-300 shadow-lg">
          <span className="loading loading-spinner loading-sm"></span>
          <span className="text-sm">Saving...</span>
        </div>
      )}

      {/* Upgrade banner when at product limit (free users) */}
      {!userAccess.isPaid && productDetails.length >= userAccess.productLimit && (
        <FreeLimitsExhausted
          usedStacks={1}
          maxStacks={1}
          usedProducts={productDetails.length}
          maxProducts={userAccess.productLimit}
          onUpgradeClick={() => {
            setUpgradeFeature("products");
            setShowUpgradeModal(true);
          }}
          variant="compact"
        />
      )}

      {/* Tab content */}
      {activeTab === 'overview' && (
        <>
          {/* Main content - Split view */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {/* Left column - 40% */}
            <div className="md:col-span-2 space-y-4">
              {/* Products list */}
              <SetupProductsList
                products={productDetails.map((p, idx) => ({
                  product: p,
                  role: setup.products?.[idx]?.role || 'other'
                }))}
                onRemove={handleRemoveProduct}
                onRoleChange={handleRoleChange}
                onReorder={handleReorder}
                editable={true}
              />

              {/* Stats with live updates */}
              <SetupStats
                combinedScore={combinedScore}
                productCount={productDetails.length}
                isConnected={isConnected}
                onRecommendationClick={handleRecommendationClick}
              />

              {/* Vigilance */}
              <SetupVigilance
                incidents={incidents}
                weaknesses={weaknesses}
                isPaid={userAccess.isPaid}
                onUpgradeClick={handleLimitReached}
              />

              {/* KYC Exposure Risk */}
              <KycExposureCard
                products={productDetails}
                userAccess={userAccess}
              />
            </div>

            {/* Right column - 60% */}
            <div className="md:col-span-3 space-y-4">
              {/* Unified SAFE Analysis (coordinated with product page design) */}
              <SetupSAFEAnalysis
                setupId={setupId}
                setupName={setup.name}
                products={productDetails}
                combinedScore={combinedScore}
                compatibility={compatibility}
                onProductClick={(product) => {
                  // Navigate to product page (Inception: going deeper)
                  window.location.href = `/products/${product.slug}`;
                }}
                isPaid={userAccess.isPaid}
              />

              {/* Catalog to add products */}
              <SetupCatalogSidebar
                addedProductIds={addedProductIds}
                onAddProduct={handleAddProduct}
                maxHeight="300px"
                isPaid={userAccess.isPaid}
                productLimit={userAccess.productLimit}
                onLimitReached={handleLimitReached}
              />

              {/* Score Evolution Chart */}
              <SetupScoreEvolution setupId={setupId} days={30} />

              {/* Recommendations */}
              <div id="recommendations-section">
                <SetupRecommendations
                  setupId={setupId}
                  onAddProduct={handleAddProduct}
                  isPaid={userAccess.isPaid}
                />
              </div>

              {/* Compatibility graph */}
              <SetupCompatibilityGraph
                products={productDetails}
                compatibility={compatibility}
                isPaid={userAccess.isPaid}
                onUpgradeClick={handleLimitReached}
              />
            </div>
          </div>
        </>
      )}

      {activeTab === 'history' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SetupHistory setupId={setupId} />
          <SetupScoreEvolution setupId={setupId} days={90} />
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="max-w-xl">
          <NotificationSettings />
        </div>
      )}

      {/* Share modal */}
      <ShareStackModal
        setupId={setupId}
        setupName={setup.name}
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
      />

      {/* Upgrade modal for paid features */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature={upgradeFeature}
        remaining={upgradeFeature === "products" ? Math.max(0, userAccess.productLimit - productDetails.length) : 0}
        limit={upgradeFeature === "products" ? userAccess.productLimit : 0}
      />

      {/* AI Assistant */}
      <SetupAssistant
        products={catalogProducts}
        onAddProduct={(product) => handleAddProduct(product, "other")}
        isOpen={showAssistant}
        onToggle={() => setShowAssistant(!showAssistant)}
      />
    </div>
  );
}
