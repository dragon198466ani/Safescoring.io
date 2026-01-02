/**
 * SafeScoring Chrome Extension - Content Script
 * Injects security badge on known crypto sites
 */

// Known crypto domain mappings (same as popup.js)
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
};

const API_BASE = 'https://safescoring.io/api';

// Check if current site is a known crypto site
function getCurrentProductSlug() {
  const domain = window.location.hostname.replace('www.', '');

  // Exact match
  if (DOMAIN_TO_PRODUCT[domain]) {
    return DOMAIN_TO_PRODUCT[domain];
  }

  // Partial match
  for (const [knownDomain, slug] of Object.entries(DOMAIN_TO_PRODUCT)) {
    if (domain.includes(knownDomain.split('.')[0])) {
      return slug;
    }
  }

  return null;
}

// Create and inject the floating badge
function injectBadge(score, productSlug) {
  // Don't inject if already exists
  if (document.getElementById('safescoring-badge')) return;

  const scoreClass = score >= 80 ? 'good' : score >= 60 ? 'medium' : 'bad';
  const scoreColor = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444';

  const badge = document.createElement('div');
  badge.id = 'safescoring-badge';
  badge.innerHTML = `
    <div class="ss-badge-inner">
      <div class="ss-badge-score" style="color: ${scoreColor}">${score}</div>
      <div class="ss-badge-label">SafeScore</div>
    </div>
    <a href="https://safescoring.io/products/${productSlug}" target="_blank" class="ss-badge-link">
      View Report →
    </a>
  `;

  // Add warning for low scores
  if (score < 60) {
    const warning = document.createElement('div');
    warning.className = 'ss-badge-warning';
    warning.textContent = '⚠️ Elevated Risk';
    badge.querySelector('.ss-badge-inner').appendChild(warning);
  }

  document.body.appendChild(badge);

  // Add close button
  const closeBtn = document.createElement('button');
  closeBtn.className = 'ss-badge-close';
  closeBtn.textContent = '×';
  closeBtn.onclick = () => {
    badge.remove();
    // Remember dismissal for this session
    sessionStorage.setItem('safescoring-dismissed', 'true');
  };
  badge.appendChild(closeBtn);
}

// Fetch score and inject badge
async function init() {
  // Check if dismissed this session
  if (sessionStorage.getItem('safescoring-dismissed')) return;

  const productSlug = getCurrentProductSlug();
  if (!productSlug) return;

  try {
    const response = await fetch(`${API_BASE}/products/${productSlug}/score`);
    if (response.ok) {
      const data = await response.json();
      if (data && data.score !== undefined) {
        // Small delay to not interfere with page load
        setTimeout(() => injectBadge(data.score, productSlug), 2000);
      }
    }
  } catch (error) {
    console.log('SafeScoring: Could not fetch score');
  }
}

// Run when page is ready
if (document.readyState === 'complete') {
  init();
} else {
  window.addEventListener('load', init);
}
