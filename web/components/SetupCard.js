"use client";

import Link from "next/link";
import ProductLogo from "@/components/ProductLogo";

/**
 * SetupCard - Displays a single crypto setup with combined SAFE score
 */

const getScoreColor = (score) => {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-amber-400";
  return "text-red-400";
};

const getScoreBg = (score) => {
  if (score >= 80) return "bg-green-500/15 border-green-500/30";
  if (score >= 60) return "bg-amber-500/15 border-amber-500/30";
  return "bg-red-500/15 border-red-500/30";
};

const getRoleLabel = (role) => {
  const roles = {
    wallet: { label: "Wallet", color: "bg-purple-500/20 text-purple-400" },
    exchange: { label: "Exchange", color: "bg-blue-500/20 text-blue-400" },
    defi: { label: "DeFi", color: "bg-green-500/20 text-green-400" },
    other: { label: "Other", color: "bg-base-300 text-base-content/60" },
  };
  return roles[role] || roles.other;
};

export default function SetupCard({ setup, onDelete, onEdit }) {
  const { name, description, productDetails, combinedScore, created_at } = setup;

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="bg-base-200 rounded-xl border border-base-300 overflow-hidden hover:border-primary/30 transition-all">
      {/* Header */}
      <div className="p-5 border-b border-base-300">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate">{name}</h3>
            {description && (
              <p className="text-sm text-base-content/60 mt-1 line-clamp-1">{description}</p>
            )}
          </div>

          {/* Combined Score */}
          {combinedScore ? (
            <div className={`px-3 py-2 rounded-lg border ${getScoreBg(combinedScore.note_finale)}`}>
              <div className={`text-2xl font-bold ${getScoreColor(combinedScore.note_finale)}`}>
                {combinedScore.note_finale}
              </div>
              <div className="text-xs text-base-content/50 text-center">SAFE</div>
            </div>
          ) : (
            <div className="px-3 py-2 rounded-lg bg-base-300 border border-base-content/10">
              <div className="text-2xl font-bold text-base-content/40">—</div>
              <div className="text-xs text-base-content/50 text-center">SAFE</div>
            </div>
          )}
        </div>
      </div>

      {/* Products List */}
      <div className="p-5">
        {productDetails && productDetails.length > 0 ? (
          <div className="space-y-3">
            {productDetails.slice(0, 4).map((product) => {
              const roleInfo = getRoleLabel(product.role);
              return (
                <div key={product.id} className="flex items-center gap-3">
                  <ProductLogo
                    logoUrl={product.slug ? `https://www.google.com/s2/favicons?domain=${product.slug}.com&sz=128` : null}
                    name={product.name}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/products/${product.slug}`}
                      className="font-medium text-sm hover:text-primary transition-colors truncate block"
                    >
                      {product.name}
                    </Link>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${roleInfo.color}`}>
                        {roleInfo.label}
                      </span>
                      <span className="text-xs text-base-content/50">
                        {product.product_types?.name || "Product"}
                      </span>
                    </div>
                  </div>
                  {product.scores?.note_finale && (
                    <div className={`text-sm font-semibold ${getScoreColor(product.scores.note_finale)}`}>
                      {product.scores.note_finale}
                    </div>
                  )}
                </div>
              );
            })}
            {productDetails.length > 4 && (
              <div className="text-xs text-base-content/50 text-center pt-2">
                +{productDetails.length - 4} more products
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-6 text-base-content/50">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 mx-auto mb-2 opacity-50">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
            <p className="text-sm">No products added yet</p>
          </div>
        )}
      </div>

      {/* SAFE Breakdown (if has combined score) */}
      {combinedScore && (
        <div className="px-5 pb-4">
          <div className="grid grid-cols-4 gap-2">
            {['S', 'A', 'F', 'E'].map((pillar) => {
              const score = combinedScore[`score_${pillar.toLowerCase()}`];
              return (
                <div key={pillar} className="text-center p-2 rounded-lg bg-base-300/50">
                  <div className="text-xs font-bold text-base-content/60">{pillar}</div>
                  <div className={`text-sm font-semibold ${getScoreColor(score)}`}>
                    {score || '—'}
                  </div>
                </div>
              );
            })}
          </div>
          {combinedScore.weakest_pillar && (
            <div className="mt-3 text-xs text-amber-400/80 flex items-center gap-1 justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              Weakest: {combinedScore.weakest_pillar.name}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="px-5 py-3 bg-base-100/50 border-t border-base-content/5 flex items-center justify-between">
        <span className="text-xs text-base-content/40">
          Created {formatDate(created_at)}
        </span>
        <div className="flex items-center gap-2">
          {onEdit && (
            <button
              onClick={() => onEdit(setup)}
              className="btn btn-ghost btn-xs gap-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(setup.id)}
              className="btn btn-ghost btn-xs text-red-400 hover:bg-red-500/10"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
