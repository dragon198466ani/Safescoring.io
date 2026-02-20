"use client";

import { useState, useEffect, useRef } from "react";
import ProductLogo from "@/components/ProductLogo";

/**
 * SetupCompatibilityGraph - Network visualization of product compatibility
 * Uses SVG for rendering nodes (products) and edges (compatibility links)
 */

const EDGE_COLORS = {
  high: "#22c55e",    // Green for >80%
  medium: "#f59e0b",  // Amber for 50-80%
  low: "#ef4444",     // Red for <50%
};

function getEdgeColor(score) {
  if (score >= 80) return EDGE_COLORS.high;
  if (score >= 50) return EDGE_COLORS.medium;
  return EDGE_COLORS.low;
}

function getEdgeLabel(score) {
  if (score >= 80) return "Excellente";
  if (score >= 60) return "Bonne";
  if (score >= 40) return "Moyenne";
  return "Faible";
}

/**
 * Calculate node positions in a circular layout
 */
function calculateNodePositions(products, width, height) {
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2 - 50;

  return products.map((product, index) => {
    const angle = (2 * Math.PI * index) / products.length - Math.PI / 2;
    return {
      ...product,
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    };
  });
}

/**
 * Edge component - line between two nodes
 * Touch-friendly: Large invisible hit area + always visible badge on mobile
 */
function Edge({ x1, y1, x2, y2, score, onClick, isSelected, isMobile }) {
  const color = getEdgeColor(score);
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;

  return (
    <g
      className="cursor-pointer touch-manipulation"
      onClick={onClick}
      style={{ touchAction: 'manipulation' }}
    >
      {/* Invisible wider hit area for touch (20px wide) */}
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="transparent"
        strokeWidth="20"
        strokeLinecap="round"
      />
      {/* Visible line */}
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={color}
        strokeWidth={isSelected ? 4 : 2}
        strokeOpacity={isSelected ? 1 : 0.6}
        className="transition-all duration-200 pointer-events-none"
      />
      {/* Score badge - always visible on mobile, hover on desktop */}
      <g className={`transition-opacity duration-200 ${isSelected || isMobile ? 'opacity-100' : 'opacity-0 hover:opacity-100'}`}>
        <circle
          cx={midX}
          cy={midY}
          r={isMobile ? 18 : 14}
          fill="#1f2937"
          stroke={color}
          strokeWidth="2"
        />
        <text
          x={midX}
          y={midY + (isMobile ? 5 : 4)}
          textAnchor="middle"
          fill="white"
          fontSize={isMobile ? "12" : "10"}
          fontWeight="bold"
          className="pointer-events-none"
        >
          {score}%
        </text>
      </g>
    </g>
  );
}

/**
 * Node component - product circle
 * Touch-friendly: Larger touch target (48px minimum for accessibility)
 */
function Node({ product, x, y, isSelected, onClick, isMobile }) {
  // 48px minimum touch target for accessibility, 40px on desktop
  const nodeSize = isMobile ? 48 : 40;

  return (
    <g
      className="cursor-pointer touch-manipulation"
      onClick={() => onClick(product)}
      onTouchEnd={(e) => {
        e.preventDefault();
        onClick(product);
      }}
      transform={`translate(${x - nodeSize / 2}, ${y - nodeSize / 2})`}
      style={{ touchAction: 'manipulation' }}
    >
      {/* Selection ring */}
      {isSelected && (
        <circle
          cx={nodeSize / 2}
          cy={nodeSize / 2}
          r={nodeSize / 2 + 4}
          fill="none"
          stroke="#8b5cf6"
          strokeWidth="3"
          className="animate-pulse"
        />
      )}
      {/* Background circle */}
      <circle
        cx={nodeSize / 2}
        cy={nodeSize / 2}
        r={nodeSize / 2}
        fill="#1f2937"
        stroke={isSelected ? "#8b5cf6" : "#374151"}
        strokeWidth="2"
        className="transition-colors active:stroke-primary"
      />
      {/* Product initial */}
      <text
        x={nodeSize / 2}
        y={nodeSize / 2 + (isMobile ? 6 : 5)}
        textAnchor="middle"
        fill="white"
        fontSize={isMobile ? "16" : "14"}
        fontWeight="bold"
        className="pointer-events-none select-none"
      >
        {product.name?.charAt(0).toUpperCase()}
      </text>
      {/* Label below */}
      <text
        x={nodeSize / 2}
        y={nodeSize + (isMobile ? 16 : 14)}
        textAnchor="middle"
        fill="#9ca3af"
        fontSize={isMobile ? "11" : "10"}
        className="pointer-events-none select-none"
      >
        {product.name?.substring(0, 10)}{product.name?.length > 10 ? '...' : ''}
      </text>
    </g>
  );
}

/**
 * Security level badge colors
 */
const SECURITY_COLORS = {
  HIGH: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  MEDIUM: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
  LOW: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
};

/**
 * SAFE pillar icons and colors
 */
const SAFE_PILLARS = {
  S: { label: 'Security', icon: '🛡️', color: 'text-blue-400' },
  A: { label: 'Adversity', icon: '⚔️', color: 'text-purple-400' },
  F: { label: 'Fidelity', icon: '🤝', color: 'text-green-400' },
  E: { label: 'Efficiency', icon: '⚡', color: 'text-amber-400' },
};

/**
 * Tooltip component for edge details with SAFE warnings
 * Responsive: Full-screen modal on mobile, positioned tooltip on desktop
 */
function EdgeTooltip({ compatibility, onClose }) {
  if (!compatibility) return null;

  const { product_a, product_b, score, explanation, security_level, safe_warnings } = compatibility;
  const securityColors = SECURITY_COLORS[security_level] || SECURITY_COLORS.MEDIUM;

  return (
    <>
      {/* Mobile: Full-screen overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40 md:hidden"
        onClick={onClose}
      />

      {/* Tooltip/Modal */}
      <div className="fixed inset-x-0 bottom-0 md:absolute md:bottom-4 md:left-4 md:right-4 bg-base-200 rounded-t-2xl md:rounded-xl border border-base-300 p-4 shadow-xl z-50 max-h-[80vh] md:max-h-[60vh] overflow-y-auto">
        {/* Drag handle for mobile */}
        <div className="w-10 h-1 bg-base-content/20 rounded-full mx-auto mb-3 md:hidden" />

        <button
          onClick={onClose}
          className="absolute top-3 right-3 md:top-2 md:right-2 btn btn-ghost btn-sm btn-circle"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 md:w-4 md:h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header with products */}
        <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-3 pr-8">
          <span className="font-medium text-sm md:text-base">{product_a?.name}</span>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-base-content/40 flex-shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
          </svg>
          <span className="font-medium text-sm md:text-base">{product_b?.name}</span>
        </div>

        {/* Score and Security Level */}
        <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-3">
          <div
            className="text-xl md:text-lg font-bold"
            style={{ color: getEdgeColor(score) }}
          >
            {score}%
          </div>
          <span className="text-sm text-base-content/60">
            {getEdgeLabel(score)} compatibility
          </span>
          {security_level && (
            <span className={`px-2 py-1 md:py-0.5 rounded text-xs font-medium ${securityColors.bg} ${securityColors.text} border ${securityColors.border}`}>
              {security_level}
            </span>
          )}
        </div>

        {explanation && (
          <p className="text-sm text-base-content/70 mb-3">{explanation}</p>
        )}

        {/* SAFE Pillar Warnings */}
        {safe_warnings && Object.values(safe_warnings).some(w => w) && (
          <div className="border-t border-base-300 pt-3 mt-3">
            <h4 className="text-xs font-semibold text-base-content/50 uppercase mb-3">SAFE Attention Points</h4>
            <div className="space-y-3 md:space-y-2">
              {Object.entries(SAFE_PILLARS).map(([key, pillar]) => {
                const warning = safe_warnings[key];
                if (!warning) return null;
                return (
                  <div key={key} className="flex gap-3 md:gap-2">
                    <span className={`${pillar.color} flex-shrink-0 text-lg md:text-base`} title={pillar.label}>
                      {pillar.icon}
                    </span>
                    <div className="flex-1">
                      <span className="text-xs text-base-content/50 uppercase hidden md:inline">{pillar.label}: </span>
                      <span className="text-sm text-base-content/80">{warning}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default function SetupCompatibilityGraph({ products = [], compatibility = [], isPaid = false, onUpgradeClick }) {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 400, height: 300 });
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile/touch device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(
        window.innerWidth < 768 ||
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0
      );
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width } = containerRef.current.getBoundingClientRect();
        // Taller on mobile for better touch targets
        const height = isMobile ? Math.min(350, width * 0.85) : Math.min(300, width * 0.75);
        setDimensions({ width, height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [isMobile]);

  // Calculate node positions
  const nodes = calculateNodePositions(products, dimensions.width, dimensions.height);

  // Create edges from compatibility data
  const edges = compatibility.map(comp => {
    const nodeA = nodes.find(n => n.id === comp.product_a_id || n.id === comp.product_a?.id);
    const nodeB = nodes.find(n => n.id === comp.product_b_id || n.id === comp.product_b?.id);

    if (!nodeA || !nodeB) return null;

    return {
      ...comp,
      x1: nodeA.x,
      y1: nodeA.y,
      x2: nodeB.x,
      y2: nodeB.y,
      product_a: nodeA,
      product_b: nodeB,
    };
  }).filter(Boolean);

  // Handle edge click
  const handleEdgeClick = (edge) => {
    setSelectedEdge(selectedEdge?.product_a_id === edge.product_a_id &&
                    selectedEdge?.product_b_id === edge.product_b_id ? null : edge);
    setSelectedNode(null);
  };

  // Handle node click
  const handleNodeClick = (product) => {
    setSelectedNode(selectedNode?.id === product.id ? null : product);
    setSelectedEdge(null);
  };

  if (products.length < 2) {
    return (
      <div className="bg-base-200 rounded-xl p-6 border border-base-300 text-center">
        <div className="w-12 h-12 rounded-full bg-base-300 flex items-center justify-center mx-auto mb-3">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-base-content/40">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
          </svg>
        </div>
        <p className="text-sm text-base-content/60">Graphe de compatibilité</p>
        <p className="text-xs text-base-content/40 mt-1">Ajoutez au moins 2 produits pour voir les liaisons</p>
      </div>
    );
  }

  return (
    <div className="bg-base-200 rounded-xl border border-base-300 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-base-300 flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-primary">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
          </svg>
          Compatibilité
          {!isPaid && <span className="badge badge-xs bg-purple-500 text-white border-0">Pro</span>}
        </h3>
        <div className="flex gap-2 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500"></span> &gt;80%
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span> 50-80%
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500"></span> &lt;50%
          </span>
        </div>
      </div>

      {/* Graph */}
      <div ref={containerRef} className="relative p-4">
        {/* Blur overlay for free users */}
        {!isPaid && products.length >= 2 && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-base-200/60 backdrop-blur-sm rounded-lg">
            <div className="text-center p-6">
              <div className="w-14 h-14 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7 text-purple-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
              <h4 className="font-semibold mb-2">Analyse de compatibilité</h4>
              <p className="text-sm text-base-content/60 mb-4 max-w-xs">
                Visualisez comment vos produits fonctionnent ensemble et identifiez les incompatibilités.
              </p>
              <button
                onClick={onUpgradeClick}
                className="btn btn-sm bg-purple-500 hover:bg-purple-600 text-white border-0 gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                Débloquer avec Pro
              </button>
            </div>
          </div>
        )}

        <svg
          width={dimensions.width}
          height={dimensions.height}
          className={`overflow-visible ${!isPaid ? 'opacity-30' : ''}`}
        >
          {/* Edges */}
          {edges.map((edge, idx) => (
            <Edge
              key={`edge-${idx}`}
              x1={edge.x1}
              y1={edge.y1}
              x2={edge.x2}
              y2={edge.y2}
              score={edge.score}
              onClick={() => isPaid && handleEdgeClick(edge)}
              isSelected={isPaid && selectedEdge?.product_a_id === edge.product_a_id &&
                         selectedEdge?.product_b_id === edge.product_b_id}
            />
          ))}

          {/* Nodes */}
          {nodes.map((node) => (
            <Node
              key={node.id}
              product={node}
              x={node.x}
              y={node.y}
              isSelected={isPaid && selectedNode?.id === node.id}
              onClick={(product) => isPaid && handleNodeClick(product)}
            />
          ))}
        </svg>

        {/* Edge tooltip - only for paid users */}
        {isPaid && (
          <EdgeTooltip
            compatibility={selectedEdge}
            onClose={() => setSelectedEdge(null)}
          />
        )}
      </div>

      {/* No compatibility data */}
      {edges.length === 0 && products.length >= 2 && isPaid && (
        <div className="px-4 pb-4 text-center">
          <p className="text-xs text-base-content/40">
            Données de compatibilité non disponibles pour ces produits
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-2 bg-base-100/50 border-t border-base-content/5 text-xs text-base-content/40">
        {isPaid ? "Cliquez sur une liaison pour voir les détails" : "Passez à Pro pour voir l'analyse de compatibilité"}
      </div>
    </div>
  );
}
