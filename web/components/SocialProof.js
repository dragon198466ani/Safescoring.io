"use client";

import Link from "next/link";

/**
 * SocialProof - Landing page component showing trust signals
 *
 * Displays:
 * - Logos of well-known scored products
 */

// Top scored products to showcase (well-known crypto brands)
const FEATURED_PRODUCTS = [
  { name: "Ledger", slug: "ledger-nano-x", logo: "/logos/ledger.svg" },
  { name: "Trezor", slug: "trezor-model-t", logo: "/logos/trezor.svg" },
  { name: "MetaMask", slug: "metamask", logo: "/logos/metamask.svg" },
  { name: "Coinbase", slug: "coinbase", logo: "/logos/coinbase.svg" },
  { name: "Binance", slug: "binance", logo: "/logos/binance.svg" },
  { name: "Uniswap", slug: "uniswap", logo: "/logos/uniswap.svg" },
];

export default function SocialProof({ variant = "default", className = "" }) {
  if (variant === "compact") {
    return <SocialProofCompact className={className} />;
  }

  return (
    <section className={`py-6 sm:py-8 px-4 sm:px-6 ${className}`}>
      <div className="max-w-4xl mx-auto">
        {/* Featured products logos */}
        <div className="text-center">
          <p className="text-xs sm:text-xs text-base-content/50 mb-3 sm:mb-4 uppercase tracking-wider">
            Featured Products We Score
          </p>
          <div className="flex flex-wrap justify-center items-center gap-3 sm:gap-6 md:gap-8">
            {FEATURED_PRODUCTS.map((product) => (
              <Link
                key={product.slug}
                href={`/products/${product.slug}`}
                className="group flex items-center gap-1.5 sm:gap-2 opacity-60 hover:opacity-100 transition-opacity touch-manipulation active:scale-[0.98]"
                title={`View ${product.name} Security Score`}
              >
                {/* Placeholder logo - uses initials */}
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-base-200 flex items-center justify-center text-xs sm:text-sm font-bold text-base-content/70 group-hover:text-primary transition-colors">
                  {product.name.slice(0, 2)}
                </div>
                <span className="text-xs sm:text-sm font-medium text-base-content/70 group-hover:text-base-content transition-colors">
                  {product.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Compact version for hero section - just rating stars
 */
function SocialProofCompact({ className }) {
  return (
    <div className={`flex flex-wrap items-center justify-center gap-4 text-sm ${className}`}>
      {/* Rating */}
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <svg key={i} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
        <span className="text-base-content/70 ml-1">4.9/5</span>
      </div>
    </div>
  );
}

/**
 * Mini version for CTAs and footers
 */
export function SocialProofMini({ className = "" }) {
  return (
    <div className={`flex items-center gap-2 text-xs text-base-content/60 ${className}`}>
      <div className="flex -space-x-1.5">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="w-5 h-5 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 border border-base-100"
          />
        ))}
      </div>
      <span>Independent ratings</span>
    </div>
  );
}
