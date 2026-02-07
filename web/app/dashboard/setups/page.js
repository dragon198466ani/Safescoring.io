"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import ProductLogo from "@/components/ProductLogo";
import SetupQuiz from "@/components/SetupQuiz";
import SetupAssistant from "@/components/SetupAssistant";
import ShareButtons from "@/components/ShareButtons";

/**
 * Setups Dashboard - Split view with catalog + setup builder
 * Features: Quiz, AI Assistant, Product Catalog, Setup Builder
 */

const PRODUCT_TYPES = [
  { id: "all", label: "All Products" },
  { id: "hardware_wallet", label: "Hardware Wallets" },
  { id: "software_wallet", label: "Software Wallets" },
  { id: "exchange", label: "Exchanges" },
  { id: "defi", label: "DeFi" },
  { id: "custody", label: "Custody" },
];

const ROLES = [
  { id: "wallet", label: "Primary Wallet", weight: "2x", color: "text-purple-400" },
  { id: "exchange", label: "Exchange", weight: "1x", color: "text-blue-400" },
  { id: "defi", label: "DeFi", weight: "1x", color: "text-green-400" },
  { id: "other", label: "Other", weight: "1x", color: "text-base-content/60" },
];

const getScoreColor = (score) => {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-amber-400";
  return "text-red-400";
};

const getScoreBg = (score) => {
  if (score >= 80) return "from-green-500/20 to-green-500/5 border-green-500/30";
  if (score >= 60) return "from-amber-500/20 to-amber-500/5 border-amber-500/30";
  return "from-red-500/20 to-red-500/5 border-red-500/30";
};

// Animated counter hook
function useAnimatedCounter(targetValue, duration = 500) {
  const [displayValue, setDisplayValue] = useState(targetValue);
  const previousValue = useRef(targetValue);

  useEffect(() => {
    if (targetValue === previousValue.current) return;

    const startValue = previousValue.current;
    const startTime = Date.now();
    const diff = targetValue - startValue;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function for smooth animation
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.round(startValue + diff * easeOut);

      setDisplayValue(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        previousValue.current = targetValue;
      }
    };

    requestAnimationFrame(animate);
  }, [targetValue, duration]);

  return displayValue;
}

// Score circle component with animation
function ScoreCircle({ score, size = 120, label = "SAFE", isAnimating = false }) {
  const animatedScore = useAnimatedCounter(score, 800);
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (animatedScore / 100) * circumference;

  return (
    <div className={`relative transition-transform duration-300 ${isAnimating ? "scale-110" : ""}`} style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth="6"
          fill="none"
          className="text-base-300"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#scoreGradient)"
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          className="transition-all duration-700 ease-out"
        />
        <defs>
          <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-bold transition-colors duration-300 ${getScoreColor(animatedScore)}`}>
          {animatedScore}
        </span>
        <span className="text-xs text-base-content/50">{label}</span>
      </div>
      {/* Pulse effect ring */}
      {isAnimating && (
        <div className="absolute inset-0 rounded-full border-4 border-primary animate-ping opacity-30" />
      )}
    </div>
  );
}

// Animated pillar score
function AnimatedPillarScore({ value, code, color, delta }) {
  const animatedValue = useAnimatedCounter(value, 600);

  return (
    <div className="text-center relative group">
      <div
        className={`text-lg font-bold flex items-center justify-center gap-1 transition-all duration-300 ${delta ? "scale-110" : ""}`}
        style={{ color }}
      >
        {animatedValue}
        {delta !== 0 && delta && (
          <span className={`text-xs font-semibold animate-bounce ${
            delta > 0 ? "text-green-400" : "text-red-400"
          }`}>
            {delta > 0 ? "↑" : "↓"}
          </span>
        )}
      </div>
      <div className="text-xs text-base-content/50 font-medium">{code}</div>
      {/* Delta badge */}
      {delta !== 0 && delta && (
        <div className={`absolute -top-2 -right-2 text-[11px] font-bold px-1.5 py-0.5 rounded-full animate-pulse ${
          delta > 0 ? "bg-green-500 text-white" : "bg-red-500 text-white"
        }`}>
          {delta > 0 ? "+" : ""}{delta}
        </div>
      )}
    </div>
  );
}

// Product card in catalog
function ProductCard({ product, onAdd, isAdded }) {
  return (
    <div
      className={`p-3 rounded-xl border transition-all cursor-pointer ${
        isAdded
          ? "bg-primary/10 border-primary/30"
          : "bg-base-200 border-base-300 hover:border-primary/50"
      }`}
      onClick={() => !isAdded && onAdd(product)}
    >
      <div className="flex items-center gap-3">
        <ProductLogo logoUrl={product.logo_url} name={product.name} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{product.name}</p>
          <p className="text-xs text-base-content/50">{product.type_name}</p>
        </div>
        <div className="flex items-center gap-2">
          {product.score && (
            <span className={`text-sm font-bold ${getScoreColor(product.score)}`}>
              {product.score}
            </span>
          )}
          {isAdded ? (
            <span className="text-xs text-primary">Added</span>
          ) : (
            <button className="btn btn-ghost btn-xs btn-circle">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Setup product item
function SetupProductItem({ product, role, onRemove, onRoleChange }) {
  const _roleInfo = ROLES.find(r => r.id === role) || ROLES[3];

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-base-300/50 border border-base-300">
      <ProductLogo logoUrl={product.logo_url} name={product.name} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{product.name}</p>
        <select
          value={role}
          onChange={(e) => onRoleChange(product.id, e.target.value)}
          className="select select-ghost select-xs mt-1 -ml-2"
        >
          {ROLES.map(r => (
            <option key={r.id} value={r.id}>{r.label} ({r.weight})</option>
          ))}
        </select>
      </div>
      {product.score && (
        <span className={`text-sm font-bold ${getScoreColor(product.score)}`}>
          {product.score}
        </span>
      )}
      <button
        onClick={() => onRemove(product.id)}
        className="btn btn-ghost btn-xs btn-circle text-red-400 hover:bg-red-500/10"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export default function SetupsPage() {
  // Catalog state
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");

  // Setup state
  const [setupName, setSetupName] = useState("My Crypto Stack");
  const [setupProducts, setSetupProducts] = useState([]); // { product, role }
  const [saving, setSaving] = useState(false);

  // Auth state
  const [limits, setLimits] = useState({ isAnonymous: true, isPaid: false, max: 1, used: 0 });

  // Quiz and assistant state
  const [showQuiz, setShowQuiz] = useState(false);
  const [showAssistant, setShowAssistant] = useState(false);

  // Previous score for delta tracking
  const prevScoreRef = useRef(null);
  const [scoreDeltas, setScoreDeltas] = useState(null);
  const [isScoreAnimating, setIsScoreAnimating] = useState(false);

  // Fetch products catalog
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch("/api/products?limit=100");
        if (res.ok) {
          const data = await res.json();
          setProducts(data.products || []);
        }
      } catch (err) {
        console.error("Failed to fetch products:", err);
      }
      setLoadingProducts(false);
    };

    const fetchLimits = async () => {
      try {
        const res = await fetch("/api/setups");
        if (res.ok) {
          const data = await res.json();
          setLimits(data.limits || { isAnonymous: true, isPaid: false, max: 1, used: 0 });
        }
      } catch (err) {
        console.error("Failed to fetch limits:", err);
      }
    };

    fetchProducts();
    fetchLimits();
  }, []);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = !searchQuery ||
        product.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = selectedType === "all" ||
        product.type_code === selectedType;
      return matchesSearch && matchesType;
    });
  }, [products, searchQuery, selectedType]);

  // Add product to setup
  const handleAddProduct = (product) => {
    if (setupProducts.find(p => p.product.id === product.id)) return;

    // Determine default role based on product type
    let defaultRole = "other";
    if (product.type_code?.includes("wallet")) defaultRole = "wallet";
    else if (product.type_code === "exchange") defaultRole = "exchange";
    else if (product.type_code === "defi") defaultRole = "defi";

    setSetupProducts([...setupProducts, { product, role: defaultRole }]);
  };

  // Remove product from setup
  const handleRemoveProduct = (productId) => {
    setSetupProducts(setupProducts.filter(p => p.product.id !== productId));
  };

  // Change product role
  const handleRoleChange = (productId, role) => {
    setSetupProducts(setupProducts.map(p =>
      p.product.id === productId ? { ...p, role } : p
    ));
  };

  // Calculate combined score
  const combinedScore = useMemo(() => {
    if (setupProducts.length === 0) return null;

    let totalWeight = 0;
    let weightedSum = { S: 0, A: 0, F: 0, E: 0, total: 0 };

    setupProducts.forEach(({ product, role }) => {
      if (!product.score) return;
      const weight = role === "wallet" ? 2 : 1;
      totalWeight += weight;

      // Use overall score for now (API should return pillar scores)
      weightedSum.total += product.score * weight;
      weightedSum.S += (product.score_s || product.score) * weight;
      weightedSum.A += (product.score_a || product.score) * weight;
      weightedSum.F += (product.score_f || product.score) * weight;
      weightedSum.E += (product.score_e || product.score) * weight;
    });

    if (totalWeight === 0) return null;

    return {
      total: Math.round(weightedSum.total / totalWeight),
      S: Math.round(weightedSum.S / totalWeight),
      A: Math.round(weightedSum.A / totalWeight),
      F: Math.round(weightedSum.F / totalWeight),
      E: Math.round(weightedSum.E / totalWeight),
    };
  }, [setupProducts]);

  // Track score changes for delta display
  useEffect(() => {
    if (combinedScore && prevScoreRef.current) {
      const deltas = {
        total: combinedScore.total - prevScoreRef.current.total,
        S: combinedScore.S - prevScoreRef.current.S,
        A: combinedScore.A - prevScoreRef.current.A,
        F: combinedScore.F - prevScoreRef.current.F,
        E: combinedScore.E - prevScoreRef.current.E,
      };
      setScoreDeltas(deltas);
      setIsScoreAnimating(true);

      // Clear animation state after animation completes
      const animTimer = setTimeout(() => setIsScoreAnimating(false), 1000);
      // Clear deltas after longer display
      const deltaTimer = setTimeout(() => setScoreDeltas(null), 3000);

      return () => {
        clearTimeout(animTimer);
        clearTimeout(deltaTimer);
      };
    } else if (combinedScore && !prevScoreRef.current) {
      // First product added - trigger animation
      setIsScoreAnimating(true);
      setTimeout(() => setIsScoreAnimating(false), 1000);
    }
    prevScoreRef.current = combinedScore;
  }, [combinedScore]);

  // Save setup
  const handleSave = async () => {
    if (limits.isAnonymous) {
      window.location.href = "/signin?callbackUrl=/dashboard/setups";
      return;
    }

    if (setupProducts.length === 0) {
      alert("Add at least one product to your setup");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/setups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: setupName,
          products: setupProducts.map(p => ({
            product_id: p.product.id,
            role: p.role,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      // Reset and show success
      setSetupProducts([]);
      setSetupName("My Crypto Stack");
      alert("Setup saved successfully!");
    } catch (err) {
      alert(err.message);
    }
    setSaving(false);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-[calc(100vh-200px)]">
      {/* Left: Product Catalog */}
      <div className="lg:w-3/5 space-y-4">
        <div className="sticky top-24 space-y-4">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold">Build Your Stack</h1>
            <p className="text-base-content/60 text-sm">
              Select products to analyze your combined security score
            </p>
          </div>

          {/* Help me choose - Quiz trigger */}
          {!showQuiz && (
            <button
              onClick={() => setShowQuiz(true)}
              className="w-full p-4 rounded-xl bg-gradient-to-r from-primary/20 to-purple-500/20 border border-primary/30 hover:border-primary/50 transition-all text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-primary">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-sm">Not sure where to start?</p>
                  <p className="text-xs text-base-content/60">Take our 30-second quiz for personalized recommendations</p>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-primary ml-auto">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </div>
            </button>
          )}

          {/* Quiz component */}
          {showQuiz && (
            <SetupQuiz
              products={products}
              onComplete={(product) => {
                handleAddProduct(product);
                setShowQuiz(false);
              }}
              onSkip={() => setShowQuiz(false)}
            />
          )}

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="input input-bordered w-full pl-10 bg-base-200"
              />
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>

            {/* Type filter */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="select select-bordered bg-base-200"
            >
              {PRODUCT_TYPES.map(type => (
                <option key={type.id} value={type.id}>{type.label}</option>
              ))}
            </select>
          </div>

          {/* Product grid */}
          <div className="h-[calc(100vh-350px)] overflow-y-auto pr-2 space-y-2">
            {loadingProducts ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-16 bg-base-300 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-8 text-base-content/50">
                No products found
              </div>
            ) : (
              filteredProducts.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAdd={handleAddProduct}
                  isAdded={setupProducts.some(p => p.product.id === product.id)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Right: Setup Builder */}
      <div className="lg:w-2/5">
        <div className="sticky top-24 space-y-4">
          {/* Setup header */}
          <div className="bg-base-200 rounded-2xl border border-base-300 p-5">
            <div className="flex items-center justify-between mb-4">
              <input
                type="text"
                value={setupName}
                onChange={(e) => setSetupName(e.target.value)}
                className="input input-ghost text-lg font-semibold p-0 h-auto focus:bg-transparent"
                placeholder="Setup name..."
              />
              <span className="text-xs text-base-content/50">
                {setupProducts.length} products
              </span>
            </div>

            {/* Combined score */}
            {combinedScore ? (
              <div className={`rounded-xl p-4 bg-gradient-to-br border transition-all duration-500 ${getScoreBg(combinedScore.total)} ${isScoreAnimating ? "ring-2 ring-primary ring-opacity-50 scale-[1.02]" : ""}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-base-content/60 mb-1">Combined Score</p>
                    <div className="flex items-baseline gap-3">
                      <ScoreCircle score={combinedScore.total} size={90} isAnimating={isScoreAnimating} />
                      {scoreDeltas?.total !== 0 && scoreDeltas?.total && (
                        <div className={`flex flex-col items-center animate-bounce ${
                          scoreDeltas.total > 0 ? "text-green-400" : "text-red-400"
                        }`}>
                          <span className="text-2xl font-bold">
                            {scoreDeltas.total > 0 ? "+" : ""}{scoreDeltas.total}
                          </span>
                          <span className="text-xs opacity-80">
                            {scoreDeltas.total > 0 ? "Better!" : "Lower"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* SAFE breakdown with animated pillars */}
                <div className="grid grid-cols-4 gap-3 mt-4 pt-4 border-t border-base-content/10">
                  {[
                    { code: "S", name: "Security", color: "#22c55e" },
                    { code: "A", name: "Adversity", color: "#f59e0b" },
                    { code: "F", name: "Fidelity", color: "#3b82f6" },
                    { code: "E", name: "Efficiency", color: "#8b5cf6" },
                  ].map(pillar => (
                    <AnimatedPillarScore
                      key={pillar.code}
                      value={combinedScore[pillar.code]}
                      code={pillar.code}
                      color={pillar.color}
                      delta={scoreDeltas?.[pillar.code]}
                    />
                  ))}
                </div>

                {/* Live indicator + Share */}
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2 text-xs text-base-content/40">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    Live calculation
                  </div>
                  <ShareButtons
                    url="/dashboard/setups"
                    title={setupName}
                    type="setup"
                    score={combinedScore.total}
                    compact
                  />
                </div>
              </div>
            ) : (
              <div className="rounded-xl p-6 bg-base-300/50 border border-dashed border-base-content/20 text-center">
                <p className="text-base-content/50 text-sm">
                  Add products to calculate your combined score
                </p>
              </div>
            )}
          </div>

          {/* Selected products */}
          <div className="bg-base-200 rounded-2xl border border-base-300 p-5">
            <h3 className="font-semibold mb-3">Products in Stack</h3>

            {setupProducts.length === 0 ? (
              <div className="text-center py-6 text-base-content/50">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 mx-auto mb-2 opacity-50">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                <p className="text-sm">Click products to add them</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {setupProducts.map(({ product, role }) => (
                  <SetupProductItem
                    key={product.id}
                    product={product}
                    role={role}
                    onRemove={handleRemoveProduct}
                    onRoleChange={handleRoleChange}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving || setupProducts.length === 0}
            className="btn btn-primary w-full gap-2"
          >
            {saving ? (
              <span className="loading loading-spinner loading-sm" />
            ) : limits.isAnonymous ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
                Sign In to Save
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Save Setup
              </>
            )}
          </button>

          {/* Info */}
          <p className="text-xs text-base-content/40 text-center">
            {limits.isAnonymous
              ? "Free account includes 1 setup"
              : `${limits.used}/${limits.max} setups used`}
          </p>
        </div>
      </div>

      {/* AI Assistant */}
      <SetupAssistant
        products={products}
        onAddProduct={handleAddProduct}
        isOpen={showAssistant}
        onToggle={() => setShowAssistant(!showAssistant)}
      />
    </div>
  );
}
