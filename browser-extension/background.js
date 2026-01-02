/**
 * SafeScoring Chrome Extension - Background Service Worker
 * Handles background tasks and caching
 */

// Cache for scores to reduce API calls
const scoreCache = new Map();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_SCORE') {
    getScore(request.productSlug).then(sendResponse);
    return true; // Keep the message channel open for async response
  }

  if (request.type === 'CLEAR_CACHE') {
    scoreCache.clear();
    sendResponse({ success: true });
    return true;
  }
});

// Get score with caching
async function getScore(productSlug) {
  // Check cache
  const cached = scoreCache.get(productSlug);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  // Fetch from API
  try {
    const response = await fetch(`https://safescoring.io/api/products/${productSlug}/score`);
    if (response.ok) {
      const data = await response.json();
      // Cache the result
      scoreCache.set(productSlug, {
        data,
        timestamp: Date.now()
      });
      return data;
    }
  } catch (error) {
    console.error('SafeScoring: Error fetching score', error);
  }

  return null;
}

// Update badge icon based on score when navigating to crypto sites
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete' || !tab.url) return;

  try {
    const url = new URL(tab.url);
    const domain = url.hostname.replace('www.', '');

    // Known crypto domains
    const cryptoDomains = [
      'ledger.com', 'trezor.io', 'metamask.io', 'trustwallet.com',
      'coinbase.com', 'binance.com', 'kraken.com', 'uniswap.org',
      'aave.com', 'compound.finance', 'opensea.io', 'phantom.app'
    ];

    const isCrypto = cryptoDomains.some(d => domain.includes(d.split('.')[0]));

    if (isCrypto) {
      // Could update badge icon here based on score
      // For now, just ensure popup shows correct info
    }
  } catch {
    // Invalid URL, ignore
  }
});

// Log installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('SafeScoring extension installed');
    // Open welcome page
    chrome.tabs.create({
      url: 'https://safescoring.io/extension-installed'
    });
  }
});
