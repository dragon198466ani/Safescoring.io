"use client";

import Link from "next/link";

/**
 * EmptyState - Unified empty state component
 *
 * Single source of truth for all empty state displays.
 * Provides consistent icon + message + CTA pattern.
 *
 * @example
 * <EmptyState
 *   icon="folder"
 *   title="No stacks yet"
 *   description="Create your first stack to start evaluating your crypto setup"
 *   actionLabel="Create Stack"
 *   actionHref="/dashboard/setups/new"
 * />
 */

// Pre-built icons for common empty states
const ICONS = {
  folder: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
    </svg>
  ),
  search: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  ),
  document: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  ),
  inbox: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z" />
    </svg>
  ),
  star: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
  ),
  shield: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  ),
  wallet: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
    </svg>
  ),
  chart: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  ),
  bell: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  ),
  error: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  ),
};

export default function EmptyState({
  icon = "folder",
  customIcon = null,
  title,
  description,
  actionLabel = null,
  actionHref = null,
  onAction = null,
  secondaryLabel = null,
  secondaryHref = null,
  onSecondaryAction = null,
  variant = "default", // default, compact, centered
  className = "",
}) {
  const IconComponent = customIcon || ICONS[icon] || ICONS.folder;

  const variants = {
    default: "py-12 px-6",
    compact: "py-6 px-4",
    centered: "py-16 px-6",
  };

  return (
    <div className={`flex flex-col items-center justify-center text-center ${variants[variant]} ${className}`}>
      {/* Icon */}
      <div className="text-base-content/30 mb-4">
        {customIcon || IconComponent}
      </div>

      {/* Title */}
      {title && (
        <h3 className="text-lg font-semibold text-base-content mb-2">
          {title}
        </h3>
      )}

      {/* Description */}
      {description && (
        <p className="text-base-content/60 max-w-sm mb-6">
          {description}
        </p>
      )}

      {/* Actions */}
      {(actionLabel || secondaryLabel) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {actionLabel && actionHref && (
            <Link href={actionHref} className="btn btn-primary">
              {actionLabel}
            </Link>
          )}
          {actionLabel && onAction && !actionHref && (
            <button onClick={onAction} className="btn btn-primary">
              {actionLabel}
            </button>
          )}
          {secondaryLabel && secondaryHref && (
            <Link href={secondaryHref} className="btn btn-ghost">
              {secondaryLabel}
            </Link>
          )}
          {secondaryLabel && onSecondaryAction && !secondaryHref && (
            <button onClick={onSecondaryAction} className="btn btn-ghost">
              {secondaryLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * SearchEmptyState - Specialized empty state for search results
 */
export function SearchEmptyState({
  query,
  onClear,
  suggestions = [],
}) {
  return (
    <EmptyState
      icon="search"
      title={`Aucun résultat pour "${query}"`}
      description="Essayez de modifier votre recherche ou d'utiliser des termes différents"
      actionLabel="Effacer la recherche"
      onAction={onClear}
    >
      {suggestions.length > 0 && (
        <div className="mt-4">
          <p className="text-sm text-base-content/50 mb-2">Suggestions :</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {suggestions.map((suggestion, i) => (
              <span key={i} className="badge badge-ghost">{suggestion}</span>
            ))}
          </div>
        </div>
      )}
    </EmptyState>
  );
}

/**
 * ErrorState - Specialized empty state for errors
 */
export function ErrorState({
  title = "Une erreur est survenue",
  description = "Impossible de charger les données. Veuillez réessayer.",
  onRetry,
  retryLabel = "Réessayer",
}) {
  return (
    <EmptyState
      icon="error"
      title={title}
      description={description}
      actionLabel={retryLabel}
      onAction={onRetry}
      className="text-error/80"
    />
  );
}

/**
 * LoadingState - Skeleton placeholder while loading
 */
export function LoadingState({ lines = 3, className = "" }) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-6 ${className}`}>
      <div className="loading loading-spinner loading-lg text-primary mb-4" />
      <div className="space-y-2 w-full max-w-xs">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="h-4 bg-base-300 rounded animate-pulse"
            style={{ width: `${100 - i * 20}%`, marginLeft: "auto", marginRight: "auto" }}
          />
        ))}
      </div>
    </div>
  );
}
