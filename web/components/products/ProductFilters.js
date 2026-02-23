"use client";

import { useTranslation } from "@/libs/i18n/LanguageProvider";
import { sortOptions } from "./constants";

// Combined search bar, filter toggle button, desktop filters, and mobile collapsible filters
export default function ProductFilters({
  search,
  setSearch,
  category,
  setCategory,
  selectedType,
  setSelectedType,
  sort,
  setSort,
  categories,
  filteredTypes,
  activeFilterCount,
  showFilters,
  setShowFilters,
}) {
  const { t } = useTranslation();

  return (
    <>
      {/* Search + Filter Button Row */}
      <div className="flex gap-2 mb-2">
        {/* Search */}
        <div className="relative flex-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <input
            type="text"
            placeholder={t("product.searchPlaceholder")}
            className="input input-bordered input-sm w-full pl-10 bg-base-200 border-base-300 h-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Filter Toggle Button - visible on mobile */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`lg:hidden flex items-center gap-2 px-3 h-10 rounded-lg border transition-all ${
            showFilters || activeFilterCount > 0
              ? "bg-primary/10 border-primary/30 text-primary"
              : "bg-base-200 border-base-300 text-base-content/70"
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
          </svg>
          <span className="text-sm font-medium">{t("productsPage.filters")}</span>
          {activeFilterCount > 0 && (
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-content text-xs font-bold">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Desktop filters - always visible on lg+ */}
        <div className="hidden lg:flex gap-2">
          <select
            className="select select-bordered select-sm bg-base-200 border-base-300 h-10 min-h-0"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setSelectedType("all");
            }}
          >
            <option value="all">{t("productsPage.allCategories")}</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            className="select select-bordered select-sm bg-base-200 border-base-300 h-10 min-h-0"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            <option value="all">{t("productsPage.allTypes", { count: filteredTypes.length })}</option>
            {filteredTypes.map((type) => (
              <option key={type.code} value={type.code}>
                {type.name} ({type.productCount})
              </option>
            ))}
          </select>

          <select
            className="select select-bordered select-sm bg-base-200 border-base-300 h-10 min-h-0"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            {sortOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Mobile Collapsible Filters */}
      <div className={`lg:hidden overflow-hidden transition-all duration-300 ease-in-out ${
        showFilters ? "max-h-48 opacity-100 mb-4" : "max-h-0 opacity-0"
      }`}>
        <div className="flex flex-col gap-2 pt-2">
          <select
            className="select select-bordered select-sm bg-base-200 border-base-300 h-10 min-h-0 w-full"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setSelectedType("all");
            }}
          >
            <option value="all">{t("productsPage.allCategories")}</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            className="select select-bordered select-sm bg-base-200 border-base-300 h-10 min-h-0 w-full"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            <option value="all">{t("productsPage.allTypes", { count: filteredTypes.length })}</option>
            {filteredTypes.map((type) => (
              <option key={type.code} value={type.code}>
                {type.name} ({type.productCount})
              </option>
            ))}
          </select>

          <select
            className="select select-bordered select-sm bg-base-200 border-base-300 h-10 min-h-0 w-full"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            {sortOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>

          {activeFilterCount > 0 && (
            <button
              onClick={() => {
                setCategory("all");
                setSelectedType("all");
                setSort("score-desc");
              }}
              className="btn btn-ghost btn-sm text-error"
            >
              {t("productsPage.clearFilters")}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
