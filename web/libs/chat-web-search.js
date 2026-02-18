/**
 * Web search integration using Tavily API
 * Used as backup when information is not in Supabase
 */

const TAVILY_API_URL = "https://api.tavily.com/search";
const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

// Crypto-focused domains to prioritize
const CRYPTO_DOMAINS = [
  "coindesk.com",
  "theblock.co",
  "decrypt.co",
  "cointelegraph.com",
  "bitcoinmagazine.com",
  "github.com",
  "ledger.com",
  "trezor.io",
  "binance.com",
  "coinbase.com",
  "kraken.com",
  "defillama.com",
  "dune.com",
  "etherscan.io",
  "blockchair.com",
];

// Domains to exclude (low quality or spam)
const EXCLUDED_DOMAINS = [
  "medium.com", // Too much low-quality content
  "reddit.com", // Unreliable for facts
  "twitter.com",
  "x.com",
  "facebook.com",
  "tiktok.com",
];

/**
 * Search the web using Tavily API
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @returns {Promise<Object>} Search results
 */
export async function searchWeb(query, options = {}) {
  if (!TAVILY_API_KEY) {
    console.warn("Tavily API key not configured");
    return { results: [], answer: null, error: "API not configured" };
  }

  const {
    searchDepth = "basic", // "basic" or "advanced"
    maxResults = 5,
    includeDomains = [],
    excludeDomains = EXCLUDED_DOMAINS,
    includeAnswer = true,
    topic = "general", // "general" or "news"
  } = options;

  try {
    const response = await fetch(TAVILY_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query,
        search_depth: searchDepth,
        max_results: maxResults,
        include_domains: includeDomains.length > 0 ? includeDomains : undefined,
        exclude_domains: excludeDomains,
        include_answer: includeAnswer,
        topic,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Tavily API error:", response.status, error);
      return { results: [], answer: null, error: `API error: ${response.status}` };
    }

    const data = await response.json();

    return {
      results: (data.results || []).map((r) => ({
        title: r.title,
        url: r.url,
        content: r.content,
        score: r.score,
        publishedDate: r.published_date,
      })),
      answer: data.answer || null,
      query: data.query,
    };
  } catch (error) {
    console.error("Tavily search failed:", error);
    return { results: [], answer: null, error: error.message };
  }
}

/**
 * Search for crypto-specific information
 * @param {string} query - Search query
 * @returns {Promise<Object>} Search results
 */
export async function searchCrypto(query) {
  return searchWeb(query, {
    includeDomains: CRYPTO_DOMAINS,
    searchDepth: "basic",
    maxResults: 5,
    includeAnswer: true,
  });
}

/**
 * Search for recent news about a topic
 * @param {string} query - Search query
 * @returns {Promise<Object>} News results
 */
export async function searchCryptoNews(query) {
  return searchWeb(query, {
    includeDomains: CRYPTO_DOMAINS.slice(0, 5), // News sites
    searchDepth: "basic",
    maxResults: 5,
    includeAnswer: true,
    topic: "news",
  });
}

/**
 * Search for security incidents
 * @param {string} productName - Product name (optional)
 * @returns {Promise<Object>} Incident search results
 */
export async function searchSecurityIncidents(productName = null) {
  const baseQuery = "crypto security hack breach incident 2024 2025";
  const query = productName
    ? `${productName} ${baseQuery}`
    : baseQuery;

  return searchWeb(query, {
    includeDomains: CRYPTO_DOMAINS,
    searchDepth: "advanced",
    maxResults: 8,
    includeAnswer: true,
    topic: "news",
  });
}

/**
 * Verify a fact using web search
 * @param {string} claim - The claim to verify
 * @returns {Promise<Object>} Verification result
 */
export async function verifyFact(claim) {
  const result = await searchWeb(claim, {
    searchDepth: "advanced",
    maxResults: 3,
    includeAnswer: true,
  });

  // Determine confidence based on number of supporting sources
  const supportingResults = result.results.filter((r) =>
    r.content?.toLowerCase().includes(claim.toLowerCase().split(" ").slice(0, 3).join(" "))
  );

  return {
    claim,
    verified: supportingResults.length > 0,
    confidence: supportingResults.length / Math.max(result.results.length, 1),
    sources: supportingResults.map((r) => ({ title: r.title, url: r.url })),
    answer: result.answer,
  };
}

/**
 * Search for product-specific information
 * @param {string} productName - Product name
 * @param {string} aspect - What to search for (security, features, price, etc.)
 * @returns {Promise<Object>} Search results
 */
export async function searchProductInfo(productName, aspect = "security") {
  const query = `${productName} ${aspect} crypto wallet review 2024 2025`;

  return searchWeb(query, {
    searchDepth: "basic",
    maxResults: 5,
    includeAnswer: true,
  });
}

/**
 * Format search results for AI context
 * @param {Object} searchResult - Tavily search result
 * @returns {string} Formatted context
 */
export function formatSearchResultsForAI(searchResult) {
  if (!searchResult || !searchResult.results || searchResult.results.length === 0) {
    return "No web search results available.";
  }

  let context = "";

  // Add the AI-generated answer if available
  if (searchResult.answer) {
    context += `Web Search Summary: ${searchResult.answer}\n\n`;
  }

  // Add individual results
  context += "Sources:\n";
  searchResult.results.forEach((r, idx) => {
    context += `${idx + 1}. ${r.title} (${r.url})\n`;
    if (r.content) {
      // Truncate content to avoid token limits
      const truncatedContent = r.content.substring(0, 300);
      context += `   ${truncatedContent}${r.content.length > 300 ? "..." : ""}\n`;
    }
  });

  return context;
}

/**
 * Check if web search should be triggered
 * @param {string} intent - Detected intent
 * @param {boolean} supabaseHasData - Whether Supabase returned data
 * @returns {boolean} Whether to search the web
 */
export function shouldSearchWeb(intent, supabaseHasData) {
  // Always search for incidents and general crypto questions
  const alwaysSearchIntents = ["INCIDENT_QUERY", "GENERAL_CRYPTO"];
  if (alwaysSearchIntents.includes(intent)) {
    return true;
  }

  // Search if Supabase doesn't have the data
  if (!supabaseHasData) {
    return true;
  }

  return false;
}

export default {
  searchWeb,
  searchCrypto,
  searchCryptoNews,
  searchSecurityIncidents,
  verifyFact,
  searchProductInfo,
  formatSearchResultsForAI,
  shouldSearchWeb,
};
