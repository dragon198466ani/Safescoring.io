"use client";

import { useState } from "react";
import { useTranslation } from "@/libs/i18n/LanguageProvider";

// Bottom section showing all product type categories with expandable definitions
export default function ProductTypesOverview({
  productTypes,
  categories,
  setCategory,
  setSelectedType,
}) {
  const { t } = useTranslation();
  const [expandedType, setExpandedType] = useState(null);

  if (productTypes.length === 0) return null;

  return (
    <div className="mt-16">
      <h2 className="text-2xl font-bold mb-2">{t("productsPage.typesOverview")}</h2>
      <p className="text-base-content/60 mb-6">{t("productsPage.typesOverviewDesc")}</p>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((cat) => {
          const catTypes = productTypes.filter((t) => t.category === cat && t.productCount > 0);
          if (catTypes.length === 0) return null;
          return (
            <div key={cat} className="rounded-xl bg-base-200 border border-base-300 overflow-hidden">
              <div className="px-4 py-3 bg-primary/10 border-b border-base-300">
                <h3 className="font-semibold text-primary">{cat}</h3>
                <span className="text-xs text-base-content/50">{t("productsPage.nTypes", { count: catTypes.length })}</span>
              </div>
              <div className="p-3 space-y-1">
                {catTypes.map((type) => {
                  const isExpanded = expandedType === type.code;
                  return (
                    <div
                      key={type.code}
                      className={`rounded-lg transition-all duration-200 ${isExpanded ? 'bg-base-300 ring-1 ring-primary/30' : 'bg-base-300/30 hover:bg-base-300/60'}`}
                    >
                      <div className="flex items-center gap-2 p-3">
                        {/* Expand button */}
                        {type.definition && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedType(isExpanded ? null : type.code);
                            }}
                            className="flex-shrink-0 w-6 h-6 rounded-md bg-base-100/50 hover:bg-base-100 flex items-center justify-center transition-colors"
                            title={isExpanded ? t("productsPage.collapse") : t("productsPage.showDefinition")}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={2}
                              stroke="currentColor"
                              className={`w-3.5 h-3.5 text-base-content/60 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                            </svg>
                          </button>
                        )}
                        {!type.definition && <div className="w-6" />}

                        {/* Type name - clickable to filter */}
                        <button
                          onClick={() => {
                            setCategory(cat);
                            setSelectedType(type.code);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className="flex-1 text-left group"
                        >
                          <span className="text-sm font-medium group-hover:text-primary transition-colors">
                            {type.name}
                          </span>
                        </button>

                        {/* Product count badge */}
                        <span className="badge badge-sm bg-base-100/80 border-0 text-base-content/70">
                          {type.productCount}
                        </span>
                      </div>

                      {/* Expanded definition */}
                      {type.definition && isExpanded && (
                        <div className="px-3 pb-3 pt-0">
                          <div className="pl-8 pr-2">
                            <p className="text-xs text-base-content/70 leading-relaxed">
                              {type.definition}
                            </p>
                            <button
                              onClick={() => {
                                setCategory(cat);
                                setSelectedType(type.code);
                                window.scrollTo({ top: 0, behavior: "smooth" });
                              }}
                              className="mt-2 text-xs text-primary hover:underline flex items-center gap-1"
                            >
                              {t("productsPage.viewNProducts", { count: type.productCount })}
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
