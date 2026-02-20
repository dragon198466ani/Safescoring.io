"use client";

import { useState, useMemo, useCallback } from "react";

/**
 * BlockchainTimeline - Interactive timeline showing the evolution of blockchain and AI
 * From Bitcoin genesis (2009) to present day
 */

// Major historical events in blockchain and AI
const TIMELINE_EVENTS = [
  // 2009 - Bitcoin Era
  { year: 2009, month: 1, day: 3, title: "Bitcoin Genesis Block", emoji: "₿", category: "blockchain", description: "Satoshi Nakamoto mines the first Bitcoin block" },
  
  // 2010
  { year: 2010, month: 5, day: 22, title: "Bitcoin Pizza Day", emoji: "🍕", category: "blockchain", description: "10,000 BTC for 2 pizzas - first real-world transaction" },
  
  // 2011
  { year: 2011, month: 4, day: 18, title: "Namecoin Launch", emoji: "🔗", category: "blockchain", description: "First altcoin and first fork of Bitcoin" },
  { year: 2011, month: 10, day: 7, title: "Litecoin Launch", emoji: "Ł", category: "blockchain", description: "Silver to Bitcoin's gold" },
  
  // 2012
  { year: 2012, month: 11, day: 28, title: "First Bitcoin Halving", emoji: "✂️", category: "blockchain", description: "Block reward reduced from 50 to 25 BTC" },
  { year: 2012, month: 6, day: 1, title: "AlexNet Revolution", emoji: "🧠", category: "ai", description: "Deep learning breakthrough in image recognition" },
  
  // 2013
  { year: 2013, month: 12, day: 1, title: "Ethereum Whitepaper", emoji: "⟠", category: "blockchain", description: "Vitalik Buterin proposes smart contracts platform" },
  
  // 2014
  { year: 2014, month: 2, day: 7, title: "Mt. Gox Hack", emoji: "💀", category: "incident", description: "850,000 BTC stolen - largest hack in history" },
  { year: 2014, month: 7, day: 22, title: "Ethereum ICO", emoji: "🚀", category: "blockchain", description: "Ethereum raises $18M in crowdsale" },
  
  // 2015
  { year: 2015, month: 7, day: 30, title: "Ethereum Mainnet", emoji: "⟠", category: "blockchain", description: "Ethereum goes live with Frontier release" },
  
  // 2016
  { year: 2016, month: 6, day: 17, title: "The DAO Hack", emoji: "⚠️", category: "incident", description: "$60M stolen, leads to Ethereum hard fork" },
  { year: 2016, month: 7, day: 9, title: "Second Bitcoin Halving", emoji: "✂️", category: "blockchain", description: "Block reward reduced to 12.5 BTC" },
  { year: 2016, month: 3, day: 15, title: "AlphaGo Beats Lee Sedol", emoji: "🎮", category: "ai", description: "AI defeats world Go champion 4-1" },
  
  // 2017
  { year: 2017, month: 8, day: 1, title: "Bitcoin Cash Fork", emoji: "🔀", category: "blockchain", description: "Bitcoin splits over block size debate" },
  { year: 2017, month: 12, day: 17, title: "Bitcoin ATH $20K", emoji: "📈", category: "blockchain", description: "Bitcoin reaches $19,783 - first major bull run peak" },
  { year: 2017, month: 6, day: 1, title: "Transformer Architecture", emoji: "🤖", category: "ai", description: "Google introduces 'Attention Is All You Need'" },
  
  // 2018
  { year: 2018, month: 1, day: 26, title: "Coincheck Hack", emoji: "💀", category: "incident", description: "$530M in NEM stolen from Japanese exchange" },
  { year: 2018, month: 6, day: 1, title: "GPT-1 Released", emoji: "🧠", category: "ai", description: "OpenAI releases first GPT language model" },
  
  // 2019
  { year: 2019, month: 6, day: 18, title: "Facebook Libra", emoji: "📱", category: "blockchain", description: "Facebook announces Libra (later Diem) stablecoin" },
  { year: 2019, month: 2, day: 1, title: "GPT-2 Released", emoji: "🧠", category: "ai", description: "OpenAI releases GPT-2 with 1.5B parameters" },
  
  // 2020
  { year: 2020, month: 5, day: 11, title: "Third Bitcoin Halving", emoji: "✂️", category: "blockchain", description: "Block reward reduced to 6.25 BTC" },
  { year: 2020, month: 12, day: 1, title: "Ethereum 2.0 Beacon Chain", emoji: "⟠", category: "blockchain", description: "Ethereum begins transition to Proof of Stake" },
  { year: 2020, month: 6, day: 1, title: "GPT-3 Released", emoji: "🧠", category: "ai", description: "175B parameter model revolutionizes NLP" },
  { year: 2020, month: 8, day: 1, title: "DeFi Summer", emoji: "🌾", category: "blockchain", description: "Yield farming explosion - TVL reaches $10B" },
  
  // 2021
  { year: 2021, month: 3, day: 11, title: "Beeple NFT $69M", emoji: "🎨", category: "blockchain", description: "NFT art sells at Christie's for record price" },
  { year: 2021, month: 4, day: 14, title: "Coinbase IPO", emoji: "📊", category: "blockchain", description: "First major crypto exchange goes public" },
  { year: 2021, month: 9, day: 7, title: "El Salvador Bitcoin", emoji: "🇸🇻", category: "blockchain", description: "First country adopts Bitcoin as legal tender" },
  { year: 2021, month: 11, day: 10, title: "Bitcoin ATH $69K", emoji: "📈", category: "blockchain", description: "Bitcoin reaches all-time high of $68,789" },
  { year: 2021, month: 8, day: 10, title: "Poly Network Hack", emoji: "💀", category: "incident", description: "$611M stolen in largest DeFi hack" },
  
  // 2022
  { year: 2022, month: 5, day: 9, title: "Terra/Luna Collapse", emoji: "💥", category: "incident", description: "$40B wiped out in algorithmic stablecoin failure" },
  { year: 2022, month: 9, day: 15, title: "Ethereum Merge", emoji: "⟠", category: "blockchain", description: "Ethereum transitions to Proof of Stake" },
  { year: 2022, month: 11, day: 11, title: "FTX Collapse", emoji: "💀", category: "incident", description: "$8B customer funds missing, SBF arrested" },
  { year: 2022, month: 11, day: 30, title: "ChatGPT Launch", emoji: "💬", category: "ai", description: "OpenAI releases ChatGPT, AI goes mainstream" },
  { year: 2022, month: 8, day: 22, title: "Stable Diffusion", emoji: "🎨", category: "ai", description: "Open-source AI image generation released" },
  
  // 2023
  { year: 2023, month: 3, day: 14, title: "GPT-4 Released", emoji: "🧠", category: "ai", description: "Multimodal AI with advanced reasoning" },
  { year: 2023, month: 6, day: 5, title: "SEC vs Binance/Coinbase", emoji: "⚖️", category: "blockchain", description: "SEC sues major exchanges for securities violations" },
  { year: 2023, month: 1, day: 10, title: "Bitcoin Ordinals", emoji: "📜", category: "blockchain", description: "NFTs come to Bitcoin via inscriptions" },
  { year: 2023, month: 7, day: 1, title: "Claude 2 Released", emoji: "🤖", category: "ai", description: "Anthropic releases Claude 2 with 100K context" },
  { year: 2023, month: 11, day: 6, title: "OpenAI Drama", emoji: "🎭", category: "ai", description: "Sam Altman fired and rehired in 5 days" },
  
  // 2024
  { year: 2024, month: 1, day: 10, title: "Bitcoin ETF Approved", emoji: "📊", category: "blockchain", description: "SEC approves spot Bitcoin ETFs" },
  { year: 2024, month: 3, day: 14, title: "Bitcoin ATH $73K", emoji: "📈", category: "blockchain", description: "Bitcoin reaches new all-time high" },
  { year: 2024, month: 4, day: 20, title: "Fourth Bitcoin Halving", emoji: "✂️", category: "blockchain", description: "Block reward reduced to 3.125 BTC" },
  { year: 2024, month: 5, day: 23, title: "Ethereum ETF Approved", emoji: "📊", category: "blockchain", description: "SEC approves spot Ethereum ETFs" },
  { year: 2024, month: 2, day: 15, title: "Sora Announced", emoji: "🎬", category: "ai", description: "OpenAI reveals text-to-video AI model" },
  { year: 2024, month: 3, day: 4, title: "Claude 3 Released", emoji: "🤖", category: "ai", description: "Anthropic releases Claude 3 Opus" },
  { year: 2024, month: 5, day: 13, title: "GPT-4o Released", emoji: "🧠", category: "ai", description: "OpenAI releases multimodal GPT-4o" },
  { year: 2024, month: 12, day: 5, title: "Bitcoin $100K", emoji: "🎉", category: "blockchain", description: "Bitcoin breaks $100,000 milestone" },
  
  // 2025
  { year: 2025, month: 1, day: 1, title: "AI Agents Era", emoji: "🤖", category: "ai", description: "Autonomous AI agents become mainstream" },
];

// Category colors and icons
const CATEGORY_CONFIG = {
  blockchain: { color: "text-orange-400", bg: "bg-orange-500/20", border: "border-orange-500/30", icon: "⛓️" },
  ai: { color: "text-purple-400", bg: "bg-purple-500/20", border: "border-purple-500/30", icon: "🧠" },
  incident: { color: "text-red-400", bg: "bg-red-500/20", border: "border-red-500/30", icon: "⚠️" },
};

export default function BlockchainTimeline({
  currentDate,
  onEventClick,
  compact = false,
  showCategories = ["blockchain", "ai", "incident"],
}) {
  const [hoveredEvent, setHoveredEvent] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Filter events based on current date and categories
  const visibleEvents = useMemo(() => {
    let filtered = TIMELINE_EVENTS;
    
    // Filter by date if provided
    if (currentDate) {
      const cutoff = new Date(currentDate);
      filtered = filtered.filter(event => {
        const eventDate = new Date(event.year, event.month - 1, event.day);
        return eventDate <= cutoff;
      });
    }
    
    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(event => event.category === selectedCategory);
    } else {
      filtered = filtered.filter(event => showCategories.includes(event.category));
    }
    
    return filtered.sort((a, b) => {
      const dateA = new Date(a.year, a.month - 1, a.day);
      const dateB = new Date(b.year, b.month - 1, b.day);
      return dateB - dateA; // Most recent first
    });
  }, [currentDate, selectedCategory, showCategories]);

  // Get recent events for compact view
  const recentEvents = useMemo(() => {
    return visibleEvents.slice(0, compact ? 5 : 10);
  }, [visibleEvents, compact]);

  // Stats
  const stats = useMemo(() => ({
    total: visibleEvents.length,
    blockchain: visibleEvents.filter(e => e.category === "blockchain").length,
    ai: visibleEvents.filter(e => e.category === "ai").length,
    incidents: visibleEvents.filter(e => e.category === "incident").length,
  }), [visibleEvents]);

  const handleEventClick = useCallback((event) => {
    onEventClick?.(event);
  }, [onEventClick]);

  if (compact) {
    return (
      <div className="space-y-2">
        {/* Category filters */}
        <div className="flex items-center gap-1 mb-3">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-all ${
              !selectedCategory ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "text-slate-500 hover:text-white"
            }`}
          >
            All ({stats.total})
          </button>
          <button
            onClick={() => setSelectedCategory(selectedCategory === "blockchain" ? null : "blockchain")}
            className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-all ${
              selectedCategory === "blockchain" ? "bg-orange-500/20 text-orange-400 border border-orange-500/30" : "text-slate-500 hover:text-orange-400"
            }`}
          >
            ⛓️ {stats.blockchain}
          </button>
          <button
            onClick={() => setSelectedCategory(selectedCategory === "ai" ? null : "ai")}
            className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-all ${
              selectedCategory === "ai" ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" : "text-slate-500 hover:text-purple-400"
            }`}
          >
            🧠 {stats.ai}
          </button>
          <button
            onClick={() => setSelectedCategory(selectedCategory === "incident" ? null : "incident")}
            className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-all ${
              selectedCategory === "incident" ? "bg-red-500/20 text-red-400 border border-red-500/30" : "text-slate-500 hover:text-red-400"
            }`}
          >
            ⚠️ {stats.incidents}
          </button>
        </div>

        {/* Events list */}
        <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-700">
          {recentEvents.map((event, idx) => {
            const config = CATEGORY_CONFIG[event.category];
            return (
              <button
                key={`${event.year}-${event.month}-${event.title}`}
                onClick={() => handleEventClick(event)}
                onMouseEnter={() => setHoveredEvent(event)}
                onMouseLeave={() => setHoveredEvent(null)}
                className={`w-full p-2 rounded-lg ${config.bg} border ${config.border} hover:scale-[1.02] transition-all text-left group`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{event.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className={`text-xs font-medium ${config.color} truncate`}>
                      {event.title}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {event.month}/{event.year}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Tooltip for hovered event */}
        {hoveredEvent && (
          <div className="fixed z-50 pointer-events-none" style={{ 
            top: "50%", 
            left: "50%", 
            transform: "translate(-50%, -50%)" 
          }}>
            <div className={`p-3 rounded-xl ${CATEGORY_CONFIG[hoveredEvent.category].bg} border ${CATEGORY_CONFIG[hoveredEvent.category].border} backdrop-blur-xl shadow-2xl max-w-xs`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{hoveredEvent.emoji}</span>
                <div>
                  <div className={`font-bold ${CATEGORY_CONFIG[hoveredEvent.category].color}`}>
                    {hoveredEvent.title}
                  </div>
                  <div className="text-xs text-slate-400">
                    {hoveredEvent.day}/{hoveredEvent.month}/{hoveredEvent.year}
                  </div>
                </div>
              </div>
              <p className="text-sm text-slate-300">{hoveredEvent.description}</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full timeline view
  return (
    <div className="bg-slate-950/90 backdrop-blur-xl rounded-2xl border border-slate-800/50 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-white flex items-center gap-2">
          <span>📅</span>
          Blockchain & AI Evolution
        </h3>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-orange-400">⛓️ {stats.blockchain}</span>
          <span className="text-purple-400">🧠 {stats.ai}</span>
          <span className="text-red-400">⚠️ {stats.incidents}</span>
        </div>
      </div>

      {/* Category filters */}
      <div className="flex items-center gap-2 mb-4">
        {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
          <button
            key={key}
            onClick={() => setSelectedCategory(selectedCategory === key ? null : key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              selectedCategory === key 
                ? `${config.bg} ${config.color} border ${config.border}` 
                : "bg-slate-800/50 text-slate-400 hover:text-white"
            }`}
          >
            {config.icon} {key.charAt(0).toUpperCase() + key.slice(1)}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-orange-500 via-purple-500 to-cyan-500" />

        {/* Events */}
        <div className="space-y-3 max-h-[400px] overflow-y-auto pl-10 pr-2">
          {visibleEvents.map((event, idx) => {
            const config = CATEGORY_CONFIG[event.category];
            return (
              <div
                key={`${event.year}-${event.month}-${event.title}`}
                className={`relative p-3 rounded-xl ${config.bg} border ${config.border} hover:scale-[1.01] transition-all cursor-pointer`}
                onClick={() => handleEventClick(event)}
              >
                {/* Timeline dot */}
                <div className={`absolute -left-[26px] top-4 w-3 h-3 rounded-full ${config.bg} border-2 ${config.border}`} />

                <div className="flex items-start gap-3">
                  <span className="text-2xl">{event.emoji}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className={`font-bold ${config.color}`}>{event.title}</h4>
                      <span className="text-xs text-slate-500">
                        {event.day}/{event.month}/{event.year}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 mt-1">{event.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Export events for use in other components
export { TIMELINE_EVENTS, CATEGORY_CONFIG };
