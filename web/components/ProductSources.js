"use client";

import { useState, useEffect, memo, useMemo } from "react";
import { useApi } from "@/hooks/useApi";

/**
 * ProductSources - Enhanced sources and social links component
 * 
 * Displays:
 * - Official channels (Website, Discord, Twitter, Telegram, etc.)
 * - Documentation and technical resources
 * - Community links (Reddit, forums)
 * - News and updates
 * - External data sources (DefiLlama, CoinGecko, GitHub)
 */

const SOURCE_ICONS = {
  twitter: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  ),
  discord: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>
  ),
  telegram: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
    </svg>
  ),
  reddit: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701z"/>
    </svg>
  ),
  github: (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
    </svg>
  ),
  documentation: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
    </svg>
  ),
  blog: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
    </svg>
  ),
  youtube: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  ),
  medium: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M13.54 12a6.8 6.8 0 01-6.77 6.82A6.8 6.8 0 010 12a6.8 6.8 0 016.77-6.82A6.8 6.8 0 0113.54 12zM20.96 12c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z"/>
    </svg>
  ),
  official_website: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
  ),
  audit_report: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
    </svg>
  ),
  whitepaper: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  ),
  news: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25M16.5 7.5V18a2.25 2.25 0 0 0 2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 0 0 2.25 2.25h13.5M6 7.5h3v3H6v-3Z" />
    </svg>
  ),
  forum: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
    </svg>
  ),
  other: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
    </svg>
  ),
};

const SOURCE_STYLES = {
  twitter: "bg-sky-500/20 text-sky-400 hover:bg-sky-500 hover:text-white",
  discord: "bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-white",
  telegram: "bg-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white",
  reddit: "bg-orange-500/20 text-orange-500 hover:bg-orange-500 hover:text-white",
  github: "bg-gray-500/20 text-gray-300 hover:bg-gray-600 hover:text-white",
  youtube: "bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white",
  medium: "bg-gray-500/20 text-gray-300 hover:bg-gray-700 hover:text-white",
  documentation: "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white",
  blog: "bg-purple-500/20 text-purple-400 hover:bg-purple-500 hover:text-white",
  official_website: "bg-primary/20 text-primary hover:bg-primary hover:text-primary-content",
  audit_report: "bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-white",
  whitepaper: "bg-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-white",
  news: "bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500 hover:text-white",
  forum: "bg-teal-500/20 text-teal-400 hover:bg-teal-500 hover:text-white",
  other: "bg-base-300 text-base-content/70 hover:bg-base-content/20",
};

const SOURCE_LABELS = {
  twitter: "Twitter/X",
  discord: "Discord",
  telegram: "Telegram",
  reddit: "Reddit",
  github: "GitHub",
  youtube: "YouTube",
  medium: "Medium",
  documentation: "Docs",
  blog: "Blog",
  official_website: "Website",
  audit_report: "Audit",
  whitepaper: "Whitepaper",
  news: "News",
  forum: "Forum",
  other: "Link",
};

function ProductSources({ productSlug, productName, socialLinks = {}, sources = [] }) {
  const [activeTab, setActiveTab] = useState("official");

  // Use useApi to fetch sources if not provided (5-minute cache)
  const shouldFetch = sources.length === 0 && productSlug;
  const { data: sourcesData, isLoading: loading } = useApi(
    shouldFetch ? `/api/products/${productSlug}/sources` : null,
    { ttl: 5 * 60 * 1000 }
  );

  // Use provided sources or fetched sources
  const loadedSources = sources.length > 0 ? sources : (sourcesData?.sources || []);

  // Merge socialLinks with loaded sources
  const allSources = useMemo(() => {
    const merged = [...loadedSources];
    
    // Add social links if not already in sources
    Object.entries(socialLinks || {}).forEach(([key, url]) => {
      if (url && !merged.some((s) => s.url === url)) {
        const sourceType = key === "x" ? "twitter" : key;
        merged.push({
          source_type: sourceType,
          url,
          is_official: true,
          is_verified: true,
        });
      }
    });

    return merged;
  }, [loadedSources, socialLinks]);

  // Group sources by category
  const groupedSources = useMemo(() => {
    const official = allSources.filter((s) => s.is_official);
    const technical = allSources.filter((s) => 
      ["github", "documentation", "whitepaper", "audit_report"].includes(s.source_type)
    );
    const community = allSources.filter((s) => 
      ["reddit", "forum", "discord", "telegram"].includes(s.source_type) && !s.is_official
    );
    const news = allSources.filter((s) => 
      ["news", "blog", "medium", "youtube"].includes(s.source_type)
    );

    return { official, technical, community, news };
  }, [allSources]);

  // Generate search URLs
  const searchUrls = useMemo(() => ({
    trustpilot: `https://www.trustpilot.com/search?query=${encodeURIComponent(productName)}`,
    reddit: `https://www.reddit.com/search/?q=${encodeURIComponent(productName)}&type=link&sort=new`,
    twitter: `https://twitter.com/search?q=${encodeURIComponent(productName)}&src=typed_query&f=live`,
    google_news: `https://news.google.com/search?q=${encodeURIComponent(productName)}`,
  }), [productName]);

  // Rule: Don't display if no sources exist
  const hasSources = allSources.length > 0 || Object.keys(socialLinks || {}).length > 0;
  
  // Only show tabs that have content
  const tabs = [
    { id: "official", label: "Official", count: groupedSources.official.length },
    { id: "technical", label: "Technical", count: groupedSources.technical.length },
    { id: "community", label: "Community", count: groupedSources.community.length },
    { id: "news", label: "News", count: groupedSources.news.length },
  ].filter(tab => tab.count > 0 || tab.id === "community"); // Always show community for search links

  const renderSourceButton = (source, idx) => {
    const type = source.source_type || "other";
    const icon = SOURCE_ICONS[type] || SOURCE_ICONS.other;
    const style = SOURCE_STYLES[type] || SOURCE_STYLES.other;
    const label = source.title || SOURCE_LABELS[type] || type;

    return (
      <a
        key={`${source.url}-${idx}`}
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`btn btn-sm gap-2 border-0 transition-all ${style}`}
        title={source.description || source.url}
      >
        {icon}
        <span className="truncate max-w-[120px]">{label}</span>
        {source.is_verified && (
          <svg className="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.403 12.652a3 3 0 0 0 0-5.304 3 3 0 0 0-3.75-3.751 3 3 0 0 0-5.305 0 3 3 0 0 0-3.751 3.75 3 3 0 0 0 0 5.305 3 3 0 0 0 3.75 3.751 3 3 0 0 0 5.305 0 3 3 0 0 0 3.751-3.75Zm-2.546-4.46a.75.75 0 0 0-1.214-.883l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
          </svg>
        )}
      </a>
    );
  };

  return (
    <div className="rounded-xl bg-base-200 border border-base-300 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-base-300 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-primary">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold">Sources & Links</h2>
            <p className="text-sm text-base-content/60">{allSources.length} verified sources</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-5 py-2 border-b border-base-300 flex gap-1 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-primary text-primary-content"
                : "text-base-content/60 hover:text-base-content hover:bg-base-300"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`ml-1.5 text-xs ${activeTab === tab.id ? "opacity-80" : "opacity-50"}`}>
                ({tab.count})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-5">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <span className="loading loading-spinner loading-md text-primary"></span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Active tab sources */}
            {groupedSources[activeTab]?.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {groupedSources[activeTab].map((source, idx) => renderSourceButton(source, idx))}
              </div>
            ) : (
              <p className="text-sm text-base-content/50 text-center py-4">
                No {activeTab} sources available yet
              </p>
            )}

            {/* Quick search links */}
            {activeTab === "community" && (
              <div className="pt-4 border-t border-base-300">
                <p className="text-xs text-base-content/50 mb-3">Search for discussions:</p>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={searchUrls.reddit}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-sm gap-2 bg-orange-500/20 text-orange-500 hover:bg-orange-500 hover:text-white border-0"
                  >
                    {SOURCE_ICONS.reddit}
                    Search Reddit
                  </a>
                  <a
                    href={searchUrls.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-sm gap-2 bg-sky-500/20 text-sky-400 hover:bg-sky-500 hover:text-white border-0"
                  >
                    {SOURCE_ICONS.twitter}
                    Search Twitter
                  </a>
                  <a
                    href={searchUrls.trustpilot}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-sm gap-2 bg-green-500/20 text-green-500 hover:bg-green-500 hover:text-white border-0"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                    </svg>
                    Trustpilot
                  </a>
                </div>
              </div>
            )}

            {activeTab === "news" && (
              <div className="pt-4 border-t border-base-300">
                <p className="text-xs text-base-content/50 mb-3">Latest news:</p>
                <a
                  href={searchUrls.google_news}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm gap-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white border-0"
                >
                  {SOURCE_ICONS.news}
                  Google News
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 bg-base-300/50 border-t border-base-300 flex items-center justify-between text-xs text-base-content/50">
        <span>Links verified by SafeScoring</span>
        <a
          href={`/claim?product=${productSlug}`}
          className="text-primary hover:underline flex items-center gap-1"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add missing link
        </a>
      </div>
    </div>
  );
}

export default memo(ProductSources);
