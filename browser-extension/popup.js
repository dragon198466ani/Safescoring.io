/**
 * SafeScoring Chrome Extension - Popup Script
 * Fetches and displays security score for the current website
 */

// Known crypto domain mappings
const DOMAIN_TO_PRODUCT = {
  'ledger.com': 'ledger-nano-x',
  'trezor.io': 'trezor-model-t',
  'metamask.io': 'metamask',
  'trustwallet.com': 'trust-wallet',
  'phantom.app': 'phantom',
  'coinbase.com': 'coinbase',
  'binance.com': 'binance',
  'kraken.com': 'kraken',
  'uniswap.org': 'uniswap',
  'aave.com': 'aave',
  'compound.finance': 'compound',
  'curve.fi': 'curve',
  'opensea.io': 'opensea',
  'lido.fi': 'lido',
  'makerdao.com': 'makerdao',
  // Add more mappings as needed
};

// API endpoint
const API_BASE = 'https://safescoring.io/api';

// Get current tab's domain
async function getCurrentDomain() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return null;

  try {
    const url = new URL(tab.url);
    return url.hostname.replace('www.', '');
  } catch {
    return null;
  }
}

// Fetch product score from SafeScoring API
async function fetchScore(productSlug) {
  try {
    const response = await fetch(`${API_BASE}/products/${productSlug}/score`);
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Error fetching score:', error);
  }
  return null;
}

// Find product slug from domain
function getProductSlug(domain) {
  // Check exact match
  if (DOMAIN_TO_PRODUCT[domain]) {
    return DOMAIN_TO_PRODUCT[domain];
  }

  // Check partial match
  for (const [knownDomain, slug] of Object.entries(DOMAIN_TO_PRODUCT)) {
    if (domain.includes(knownDomain) || knownDomain.includes(domain)) {
      return slug;
    }
  }

  // Generate slug from domain (for API lookup)
  return domain.split('.')[0].toLowerCase();
}

// Get score color class
function getScoreClass(score) {
  if (score >= 80) return 'good';
  if (score >= 60) return 'medium';
  return 'bad';
}

// Render score card
function renderScoreCard(product) {
  const scoreClass = getScoreClass(product.score);

  return `
    <div class="score-card">
      <div class="product-name">${product.name}</div>
      <div class="product-type">${product.type}</div>

      <div class="score-display">
        <div class="score-circle ${scoreClass}">
          ${product.score}
        </div>
        <div class="score-details">
          <div class="score-label">SAFE Score</div>
          <div class="pillars">
            <div class="pillar">
              <span class="pillar-code" style="color: #00d4aa">S</span>
              <span class="pillar-score">${product.scores?.s || '--'}</span>
            </div>
            <div class="pillar">
              <span class="pillar-code" style="color: #8b5cf6">A</span>
              <span class="pillar-score">${product.scores?.a || '--'}</span>
            </div>
            <div class="pillar">
              <span class="pillar-code" style="color: #f59e0b">F</span>
              <span class="pillar-score">${product.scores?.f || '--'}</span>
            </div>
            <div class="pillar">
              <span class="pillar-code" style="color: #06b6d4">E</span>
              <span class="pillar-score">${product.scores?.e || '--'}</span>
            </div>
          </div>
        </div>
      </div>

      ${product.score < 60 ?
        '<span class="warning-badge">⚠️ Elevated Risk</span>' :
        product.score >= 80 ?
        '<span class="safe-badge">✓ Well Secured</span>' : ''
      }

      <a href="https://safescoring.io/products/${product.slug}" target="_blank" class="cta-button">
        View Full Report →
      </a>
    </div>
  `;
}

// Render not found card
function renderNotFound(domain) {
  return `
    <div class="score-card not-found">
      <p><strong>${domain}</strong></p>
      <p style="margin-top: 8px; font-size: 12px;">
        This site is not in our database yet.
      </p>
      <a href="https://safescoring.io/submit?domain=${encodeURIComponent(domain)}" target="_blank" class="cta-button">
        Request Evaluation
      </a>
    </div>
    <div class="score-card">
      <p style="font-size: 12px; color: #888;">
        <strong>Tip:</strong> Browse our database of 100+ evaluated crypto products.
      </p>
      <a href="https://safescoring.io/products" target="_blank" class="cta-button" style="background: #333; color: #fff;">
        Browse All Products
      </a>
    </div>
  `;
}

// Render non-crypto site message
function renderNonCrypto(domain) {
  return `
    <div class="score-card not-found">
      <p style="font-size: 13px;">
        <strong>${domain}</strong> doesn't appear to be a crypto site.
      </p>
      <p style="margin-top: 8px; font-size: 12px; color: #888;">
        SafeScoring evaluates crypto wallets, exchanges, and DeFi protocols.
      </p>
      <a href="https://safescoring.io/products" target="_blank" class="cta-button">
        Browse Crypto Products
      </a>
    </div>
  `;
}

// Main initialization
async function init() {
  const contentDiv = document.getElementById('content');

  const domain = await getCurrentDomain();

  if (!domain) {
    contentDiv.innerHTML = renderNonCrypto('this page');
    return;
  }

  const productSlug = getProductSlug(domain);

  // Try to fetch from API
  const scoreData = await fetchScore(productSlug);

  if (scoreData && scoreData.score !== undefined) {
    contentDiv.innerHTML = renderScoreCard({
      name: scoreData.name || domain,
      type: scoreData.type || 'Crypto Product',
      slug: productSlug,
      score: scoreData.score,
      scores: scoreData.scores
    });
  } else {
    // Check if it looks like a crypto site
    const cryptoKeywords = ['wallet', 'exchange', 'defi', 'swap', 'stake', 'yield', 'nft', 'dao', 'token', 'coin', 'crypto'];
    const isCryptoLikely = cryptoKeywords.some(kw => domain.includes(kw)) ||
                           Object.keys(DOMAIN_TO_PRODUCT).some(d => domain.includes(d.split('.')[0]));

    if (isCryptoLikely) {
      contentDiv.innerHTML = renderNotFound(domain);
    } else {
      contentDiv.innerHTML = renderNonCrypto(domain);
    }
  }
}

// Run on load
document.addEventListener('DOMContentLoaded', init);
