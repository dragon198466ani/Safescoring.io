/**
 * SafeScoring Embed Script v1.0
 *
 * Include this script on any website to display SafeScore badges.
 *
 * Usage:
 * <script src="https://safescoring.io/embed.js"></script>
 * <div data-safescore="ledger-nano-x"></div>
 *
 * Options (data attributes):
 * - data-safescore: Product slug (required)
 * - data-theme: "dark" | "light" (default: "dark")
 * - data-size: "small" | "medium" | "large" (default: "medium")
 * - data-style: "card" | "badge" | "minimal" (default: "card")
 * - data-link: "true" | "false" - make clickable (default: "true")
 */

(function() {
  'use strict';

  const API_BASE = 'https://safescoring.io';
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // Simple cache
  const cache = {};

  // Styles for different sizes
  const SIZES = {
    small: { width: 180, height: 60, fontSize: 12 },
    medium: { width: 280, height: 100, fontSize: 14 },
    large: { width: 360, height: 140, fontSize: 16 },
  };

  // Color scheme
  const THEMES = {
    dark: {
      bg: '#1e293b',
      bgSecondary: '#334155',
      text: '#f8fafc',
      textMuted: '#94a3b8',
      border: '#475569',
    },
    light: {
      bg: '#ffffff',
      bgSecondary: '#f1f5f9',
      text: '#1e293b',
      textMuted: '#64748b',
      border: '#e2e8f0',
    }
  };

  // Get score color
  function getScoreColor(score) {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#f59e0b';
    if (score >= 40) return '#f97316';
    return '#ef4444';
  }

  // Get score label
  function getScoreLabel(score) {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  }

  // Fetch score from API
  async function fetchScore(slug) {
    const cacheKey = `score_${slug}`;

    // Check cache
    if (cache[cacheKey] && Date.now() - cache[cacheKey].timestamp < CACHE_TTL) {
      return cache[cacheKey].data;
    }

    try {
      const response = await fetch(`${API_BASE}/api/products/${slug}/score`);
      if (!response.ok) throw new Error('Product not found');

      const data = await response.json();

      // Cache result
      cache[cacheKey] = { data, timestamp: Date.now() };

      return data;
    } catch (error) {
      console.error('[SafeScore] Error fetching score:', error);
      return null;
    }
  }

  // Create card style widget
  function createCardWidget(data, options) {
    const theme = THEMES[options.theme];
    const size = SIZES[options.size];
    const score = data.score || 0;
    const scoreColor = getScoreColor(score);

    const container = document.createElement('div');
    container.className = 'safescore-widget';
    container.style.cssText = `
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      width: ${size.width}px;
      background: ${theme.bg};
      border: 1px solid ${theme.border};
      border-radius: 12px;
      padding: 16px;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: 12px;
    `;

    // Header
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
    `;

    const logo = document.createElement('div');
    logo.style.cssText = `
      width: 32px;
      height: 32px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 10px;
    `;
    logo.textContent = 'SAFE';

    const titleContainer = document.createElement('div');
    titleContainer.style.cssText = 'flex: 1; overflow: hidden;';

    const productName = document.createElement('div');
    productName.style.cssText = `
      color: ${theme.text};
      font-size: ${size.fontSize}px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    `;
    productName.textContent = data.name || 'Unknown Product';

    const productType = document.createElement('div');
    productType.style.cssText = `
      color: ${theme.textMuted};
      font-size: ${size.fontSize - 2}px;
    `;
    productType.textContent = data.type || 'Crypto Product';

    titleContainer.appendChild(productName);
    titleContainer.appendChild(productType);

    header.appendChild(logo);
    header.appendChild(titleContainer);

    // Score display
    const scoreContainer = document.createElement('div');
    scoreContainer.style.cssText = `
      display: flex;
      align-items: center;
      gap: 16px;
      background: ${theme.bgSecondary};
      border-radius: 8px;
      padding: 12px;
    `;

    const scoreCircle = document.createElement('div');
    scoreCircle.style.cssText = `
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: conic-gradient(${scoreColor} ${score * 3.6}deg, ${theme.border} 0deg);
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    `;

    const scoreInner = document.createElement('div');
    scoreInner.style.cssText = `
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: ${theme.bgSecondary};
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: bold;
      color: ${scoreColor};
    `;
    scoreInner.textContent = score;
    scoreCircle.appendChild(scoreInner);

    const pillarsContainer = document.createElement('div');
    pillarsContainer.style.cssText = `
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 4px;
      flex: 1;
    `;

    const pillars = [
      { label: 'Security', value: data.scores?.s || 0 },
      { label: 'Adversity', value: data.scores?.a || 0 },
      { label: 'Fidelity', value: data.scores?.f || 0 },
      { label: 'Efficiency', value: data.scores?.e || 0 },
    ];

    pillars.forEach(p => {
      const pillar = document.createElement('div');
      pillar.style.cssText = `
        display: flex;
        justify-content: space-between;
        font-size: ${size.fontSize - 4}px;
      `;

      const label = document.createElement('span');
      label.style.color = theme.textMuted;
      label.textContent = p.label.charAt(0);

      const value = document.createElement('span');
      value.style.cssText = `
        color: ${getScoreColor(p.value)};
        font-weight: 600;
      `;
      value.textContent = p.value;

      pillar.appendChild(label);
      pillar.appendChild(value);
      pillarsContainer.appendChild(pillar);
    });

    scoreContainer.appendChild(scoreCircle);
    scoreContainer.appendChild(pillarsContainer);

    // Footer
    const footer = document.createElement('div');
    footer.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: ${size.fontSize - 4}px;
    `;

    const poweredBy = document.createElement('span');
    poweredBy.style.color = theme.textMuted;
    poweredBy.textContent = 'Powered by SafeScoring';

    const viewDetails = document.createElement('a');
    viewDetails.href = data.detailsUrl || `${API_BASE}/products/${data.slug}`;
    viewDetails.target = '_blank';
    viewDetails.rel = 'noopener noreferrer';
    viewDetails.style.cssText = `
      color: #6366f1;
      text-decoration: none;
      font-weight: 500;
    `;
    viewDetails.textContent = 'View Details';

    footer.appendChild(poweredBy);
    footer.appendChild(viewDetails);

    container.appendChild(header);
    container.appendChild(scoreContainer);
    if (options.size !== 'small') {
      container.appendChild(footer);
    }

    return container;
  }

  // Create badge style widget
  function createBadgeWidget(data, options) {
    const theme = THEMES[options.theme];
    const score = data.score || 0;
    const scoreColor = getScoreColor(score);

    const container = document.createElement('div');
    container.className = 'safescore-badge';
    container.style.cssText = `
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: ${theme.bg};
      border: 1px solid ${theme.border};
      border-radius: 20px;
      padding: 6px 12px;
    `;

    const logo = document.createElement('span');
    logo.style.cssText = `
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: white;
      font-size: 8px;
      font-weight: bold;
      padding: 2px 4px;
      border-radius: 3px;
    `;
    logo.textContent = 'SAFE';

    const name = document.createElement('span');
    name.style.cssText = `
      color: ${theme.text};
      font-size: 12px;
      font-weight: 500;
    `;
    name.textContent = data.name || 'Unknown';

    const scoreEl = document.createElement('span');
    scoreEl.style.cssText = `
      color: ${scoreColor};
      font-size: 14px;
      font-weight: bold;
    `;
    scoreEl.textContent = score;

    container.appendChild(logo);
    container.appendChild(name);
    container.appendChild(scoreEl);

    return container;
  }

  // Create verified partner badge
  function createVerifiedBadge(data, options) {
    const theme = THEMES[options.theme];
    const score = data.score || 0;
    const scoreColor = getScoreColor(score);
    const isVerified = data.verified || score >= 70;

    const container = document.createElement('div');
    container.className = 'safescore-verified-badge';
    container.style.cssText = `
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      background: ${theme.bg};
      border: 2px solid ${isVerified ? '#22c55e' : theme.border};
      border-radius: 16px;
      padding: 16px 24px;
      min-width: 200px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    `;

    // Verified shield
    const shield = document.createElement('div');
    shield.style.cssText = `
      width: 48px;
      height: 48px;
      background: ${isVerified ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)'};
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 24px;
    `;
    shield.innerHTML = isVerified ? '&#10003;' : '&#128274;';

    // Title
    const title = document.createElement('div');
    title.style.cssText = `
      color: ${theme.text};
      font-size: 14px;
      font-weight: 600;
      text-align: center;
    `;
    title.textContent = data.name || 'Unknown';

    // Verified status
    const status = document.createElement('div');
    status.style.cssText = `
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: ${isVerified ? '#22c55e' : theme.textMuted};
      font-weight: 500;
    `;
    status.innerHTML = isVerified
      ? '<span style="font-size:14px;">&#10003;</span> Verified by SafeScoring'
      : '<span style="font-size:14px;">&#128274;</span> Scored by SafeScoring';

    // Score display
    const scoreContainer = document.createElement('div');
    scoreContainer.style.cssText = `
      display: flex;
      align-items: baseline;
      gap: 4px;
      margin-top: 4px;
    `;

    const scoreValue = document.createElement('span');
    scoreValue.style.cssText = `
      color: ${scoreColor};
      font-size: 28px;
      font-weight: bold;
    `;
    scoreValue.textContent = score;

    const scoreMax = document.createElement('span');
    scoreMax.style.cssText = `
      color: ${theme.textMuted};
      font-size: 14px;
    `;
    scoreMax.textContent = '/100';

    scoreContainer.appendChild(scoreValue);
    scoreContainer.appendChild(scoreMax);

    // Footer
    const footer = document.createElement('a');
    footer.href = data.detailsUrl || `${API_BASE}/products/${data.slug}`;
    footer.target = '_blank';
    footer.rel = 'noopener noreferrer';
    footer.style.cssText = `
      color: #6366f1;
      font-size: 11px;
      text-decoration: none;
      margin-top: 4px;
    `;
    footer.textContent = 'View Full Report';

    container.appendChild(shield);
    container.appendChild(title);
    container.appendChild(status);
    container.appendChild(scoreContainer);
    container.appendChild(footer);

    return container;
  }

  // Create trust seal (for footer/sidebar)
  function createTrustSeal(data, options) {
    const theme = THEMES[options.theme];
    const score = data.score || 0;
    const scoreColor = getScoreColor(score);

    const container = document.createElement('div');
    container.className = 'safescore-trust-seal';
    container.style.cssText = `
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: inline-flex;
      align-items: center;
      gap: 12px;
      background: ${theme.bg};
      border: 1px solid ${theme.border};
      border-radius: 8px;
      padding: 12px 16px;
    `;

    // Shield icon
    const shield = document.createElement('div');
    shield.style.cssText = `
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 10px;
    `;
    shield.textContent = 'SAFE';

    // Info
    const info = document.createElement('div');
    info.style.cssText = 'display: flex; flex-direction: column; gap: 2px;';

    const label = document.createElement('div');
    label.style.cssText = `color: ${theme.textMuted}; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px;`;
    label.textContent = 'Security Verified';

    const scoreRow = document.createElement('div');
    scoreRow.style.cssText = 'display: flex; align-items: center; gap: 8px;';

    const scoreBadge = document.createElement('span');
    scoreBadge.style.cssText = `
      background: ${scoreColor};
      color: white;
      font-size: 12px;
      font-weight: bold;
      padding: 2px 8px;
      border-radius: 10px;
    `;
    scoreBadge.textContent = `${score}/100`;

    const productName = document.createElement('span');
    productName.style.cssText = `color: ${theme.text}; font-size: 13px; font-weight: 500;`;
    productName.textContent = data.name || 'Unknown';

    scoreRow.appendChild(scoreBadge);
    scoreRow.appendChild(productName);

    info.appendChild(label);
    info.appendChild(scoreRow);

    container.appendChild(shield);
    container.appendChild(info);

    return container;
  }

  // Create minimal style widget
  function createMinimalWidget(data, options) {
    const score = data.score || 0;
    const scoreColor = getScoreColor(score);

    const container = document.createElement('span');
    container.className = 'safescore-minimal';
    container.style.cssText = `
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    `;

    const label = document.createElement('span');
    label.style.cssText = 'color: #64748b; font-size: 11px;';
    label.textContent = 'SafeScore:';

    const scoreEl = document.createElement('span');
    scoreEl.style.cssText = `
      color: ${scoreColor};
      font-size: 12px;
      font-weight: bold;
    `;
    scoreEl.textContent = score;

    container.appendChild(label);
    container.appendChild(scoreEl);

    return container;
  }

  // Create loading state
  function createLoading(options) {
    const theme = THEMES[options.theme];
    const container = document.createElement('div');
    container.style.cssText = `
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 16px;
      color: ${theme.textMuted};
      font-size: 12px;
    `;
    container.textContent = 'Loading SafeScore...';
    return container;
  }

  // Create error state
  function createError(message, options) {
    const theme = THEMES[options.theme];
    const container = document.createElement('div');
    container.style.cssText = `
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 12px;
      background: ${theme.bgSecondary};
      border-radius: 8px;
      color: ${theme.textMuted};
      font-size: 12px;
    `;
    container.textContent = message;
    return container;
  }

  // Initialize widgets
  async function init() {
    const elements = document.querySelectorAll('[data-safescore]');

    for (const el of elements) {
      const slug = el.getAttribute('data-safescore');
      if (!slug) continue;

      const options = {
        theme: el.getAttribute('data-theme') || 'dark',
        size: el.getAttribute('data-size') || 'medium',
        style: el.getAttribute('data-style') || 'card',
        link: el.getAttribute('data-link') !== 'false',
      };

      // Show loading
      el.innerHTML = '';
      el.appendChild(createLoading(options));

      // Fetch data
      const data = await fetchScore(slug);

      // Clear loading
      el.innerHTML = '';

      if (!data) {
        el.appendChild(createError('Product not found', options));
        continue;
      }

      // Create widget
      let widget;
      switch (options.style) {
        case 'badge':
          widget = createBadgeWidget(data, options);
          break;
        case 'verified':
          widget = createVerifiedBadge(data, options);
          break;
        case 'seal':
        case 'trust-seal':
          widget = createTrustSeal(data, options);
          break;
        case 'minimal':
          widget = createMinimalWidget(data, options);
          break;
        default:
          widget = createCardWidget(data, options);
      }

      // Make clickable
      if (options.link && options.style !== 'minimal') {
        widget.style.cursor = 'pointer';
        widget.addEventListener('click', () => {
          window.open(data.detailsUrl || `${API_BASE}/products/${slug}`, '_blank');
        });
      }

      el.appendChild(widget);
    }
  }

  // Fetch leaderboard data
  async function fetchLeaderboard(category = 'all', limit = 5) {
    const cacheKey = `leaderboard_${category}_${limit}`;

    if (cache[cacheKey] && Date.now() - cache[cacheKey].timestamp < CACHE_TTL) {
      return cache[cacheKey].data;
    }

    try {
      const url = new URL(`${API_BASE}/api/rankings`);
      if (category !== 'all') url.searchParams.set('type', category);
      url.searchParams.set('limit', limit);

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch leaderboard');

      const data = await response.json();
      cache[cacheKey] = { data: data.products || [], timestamp: Date.now() };
      return data.products || [];
    } catch (error) {
      console.error('[SafeScore] Error fetching leaderboard:', error);
      return [];
    }
  }

  // Create leaderboard widget
  function createLeaderboardWidget(products, options) {
    const theme = THEMES[options.theme];

    const container = document.createElement('div');
    container.className = 'safescore-leaderboard';
    container.style.cssText = `
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: ${theme.bg};
      border: 1px solid ${theme.border};
      border-radius: 12px;
      padding: 16px;
      min-width: 280px;
    `;

    // Header
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid ${theme.border};
    `;

    const title = document.createElement('div');
    title.style.cssText = 'display: flex; align-items: center; gap: 8px;';

    const logo = document.createElement('span');
    logo.style.cssText = `
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: white;
      font-size: 10px;
      font-weight: bold;
      padding: 4px 6px;
      border-radius: 4px;
    `;
    logo.textContent = 'SAFE';

    const titleText = document.createElement('span');
    titleText.style.cssText = `color: ${theme.text}; font-size: 14px; font-weight: 600;`;
    titleText.textContent = 'Security Leaderboard';

    title.appendChild(logo);
    title.appendChild(titleText);

    const viewAll = document.createElement('a');
    viewAll.href = `${API_BASE}/products`;
    viewAll.target = '_blank';
    viewAll.rel = 'noopener noreferrer';
    viewAll.style.cssText = 'color: #6366f1; font-size: 12px; text-decoration: none;';
    viewAll.textContent = 'View All →';

    header.appendChild(title);
    header.appendChild(viewAll);
    container.appendChild(header);

    // Product list
    const list = document.createElement('div');
    list.style.cssText = 'display: flex; flex-direction: column; gap: 8px;';

    products.forEach((product, index) => {
      const row = document.createElement('div');
      row.style.cssText = `
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px;
        background: ${theme.bgSecondary};
        border-radius: 8px;
        cursor: pointer;
        transition: opacity 0.2s;
      `;
      row.addEventListener('mouseenter', () => row.style.opacity = '0.8');
      row.addEventListener('mouseleave', () => row.style.opacity = '1');
      row.addEventListener('click', () => {
        window.open(`${API_BASE}/products/${product.slug}`, '_blank');
      });

      const rank = document.createElement('span');
      const rankColors = ['#fbbf24', '#94a3b8', '#cd7f32'];
      rank.style.cssText = `
        width: 24px; height: 24px;
        display: flex; align-items: center; justify-content: center;
        background: ${index < 3 ? rankColors[index] : theme.border};
        color: ${index < 3 ? '#1e293b' : theme.textMuted};
        font-size: 12px; font-weight: bold; border-radius: 50%;
      `;
      rank.textContent = index + 1;

      const name = document.createElement('span');
      name.style.cssText = `
        flex: 1; color: ${theme.text}; font-size: 13px; font-weight: 500;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      `;
      name.textContent = product.name;

      const score = product.score || product.note_finale || 0;
      const scoreEl = document.createElement('span');
      scoreEl.style.cssText = `color: ${getScoreColor(score)}; font-size: 14px; font-weight: bold;`;
      scoreEl.textContent = Math.round(score);

      row.appendChild(rank);
      row.appendChild(name);
      row.appendChild(scoreEl);
      list.appendChild(row);
    });

    container.appendChild(list);

    const footer = document.createElement('div');
    footer.style.cssText = `
      margin-top: 12px; padding-top: 12px; border-top: 1px solid ${theme.border};
      text-align: center; color: ${theme.textMuted}; font-size: 10px;
    `;
    footer.textContent = 'Powered by SafeScoring.io';
    container.appendChild(footer);

    return container;
  }

  // Initialize leaderboard widgets
  async function initLeaderboards() {
    const elements = document.querySelectorAll('[data-safescore-leaderboard]');

    for (const el of elements) {
      const category = el.getAttribute('data-safescore-leaderboard') || 'all';
      const limit = parseInt(el.getAttribute('data-limit')) || 5;
      const theme = el.getAttribute('data-theme') || 'dark';

      el.innerHTML = '';
      el.appendChild(createLoading({ theme }));

      const products = await fetchLeaderboard(category, limit);
      el.innerHTML = '';

      if (!products || products.length === 0) {
        el.appendChild(createError('No products found', { theme }));
        continue;
      }

      el.appendChild(createLeaderboardWidget(products, { theme }));
    }
  }

  // Initialize all widgets
  async function initAll() {
    await Promise.all([init(), initLeaderboards()]);
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  // Expose API for manual usage
  window.SafeScore = {
    init: initAll,
    fetchScore,
    fetchLeaderboard,
    createWidget: async (slug, container, options = {}) => {
      const data = await fetchScore(slug);
      if (!data) return null;

      const opts = { theme: 'dark', size: 'medium', ...options };
      let widget;
      switch (options.style) {
        case 'badge':
          widget = createBadgeWidget(data, opts);
          break;
        case 'verified':
          widget = createVerifiedBadge(data, opts);
          break;
        case 'seal':
        case 'trust-seal':
          widget = createTrustSeal(data, opts);
          break;
        case 'minimal':
          widget = createMinimalWidget(data, opts);
          break;
        default:
          widget = createCardWidget(data, opts);
      }

      if (container) {
        container.innerHTML = '';
        container.appendChild(widget);
      }

      return widget;
    },
    createLeaderboard: async (container, options = {}) => {
      const products = await fetchLeaderboard(options.category || 'all', options.limit || 5);
      if (!products || products.length === 0) return null;

      const widget = createLeaderboardWidget(products, { theme: options.theme || 'dark' });
      if (container) {
        container.innerHTML = '';
        container.appendChild(widget);
      }
      return widget;
    }
  };
})();
