/**
 * AI/Bot Behavior Detection System
 *
 * Detects patterns consistent with AI scraping or automated browsing:
 * - Sequential page access without interaction
 * - Too-regular timing between requests
 * - Lack of human interaction signals (mouse, scroll, click)
 * - Excessive page views in short time
 *
 * Actions:
 * - Score 0-30: Normal user
 * - Score 30-60: Suspicious, inject more honeypots
 * - Score 60-80: Likely bot, show CAPTCHA
 * - Score 80+: Block or heavily degrade content
 */

// Behavior tracking state
const STORAGE_KEY = 'ss_behavior';
const SESSION_KEY = 'ss_session_behavior';

/**
 * Get or initialize behavior tracking data
 */
function getBehaviorData() {
  if (typeof window === 'undefined') return null;

  try {
    // Persistent data (across sessions)
    const persistent = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');

    // Session data (current session only)
    const session = JSON.parse(sessionStorage.getItem(SESSION_KEY) || '{}');

    return {
      // Persistent metrics
      totalPageViews: persistent.totalPageViews || 0,
      totalSessions: persistent.totalSessions || 0,
      firstSeen: persistent.firstSeen || Date.now(),
      lastSeen: persistent.lastSeen || Date.now(),
      pagesPerSession: persistent.pagesPerSession || [],

      // Session metrics
      sessionStart: session.sessionStart || Date.now(),
      sessionPageViews: session.sessionPageViews || 0,
      pageHistory: session.pageHistory || [],
      interactionCount: session.interactionCount || 0,
      hasMouseMovement: session.hasMouseMovement || false,
      hasScroll: session.hasScroll || false,
      hasClick: session.hasClick || false,
      hasKeypress: session.hasKeypress || false,
      timeBetweenPages: session.timeBetweenPages || [],
      suspiciousFlags: session.suspiciousFlags || [],
    };
  } catch {
    return null;
  }
}

/**
 * Save behavior data
 */
function saveBehaviorData(data) {
  if (typeof window === 'undefined' || !data) return;

  try {
    // Save persistent data
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      totalPageViews: data.totalPageViews,
      totalSessions: data.totalSessions,
      firstSeen: data.firstSeen,
      lastSeen: Date.now(),
      pagesPerSession: data.pagesPerSession.slice(-10), // Keep last 10 sessions
    }));

    // Save session data
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      sessionStart: data.sessionStart,
      sessionPageViews: data.sessionPageViews,
      pageHistory: data.pageHistory.slice(-50), // Keep last 50 pages
      interactionCount: data.interactionCount,
      hasMouseMovement: data.hasMouseMovement,
      hasScroll: data.hasScroll,
      hasClick: data.hasClick,
      hasKeypress: data.hasKeypress,
      timeBetweenPages: data.timeBetweenPages.slice(-20),
      suspiciousFlags: data.suspiciousFlags,
    }));
  } catch {
    // Storage full or disabled
  }
}

/**
 * Record a page view
 */
export function recordPageView(path) {
  const data = getBehaviorData();
  if (!data) return;

  const now = Date.now();
  const lastPage = data.pageHistory[data.pageHistory.length - 1];

  // Calculate time since last page
  if (lastPage) {
    const timeSinceLastPage = now - lastPage.timestamp;
    data.timeBetweenPages.push(timeSinceLastPage);
  }

  // Record this page
  data.pageHistory.push({
    path,
    timestamp: now,
  });

  data.sessionPageViews++;
  data.totalPageViews++;
  data.lastSeen = now;

  saveBehaviorData(data);
}

/**
 * Record user interaction
 */
export function recordInteraction(type) {
  const data = getBehaviorData();
  if (!data) return;

  data.interactionCount++;

  switch (type) {
    case 'mousemove':
      data.hasMouseMovement = true;
      break;
    case 'scroll':
      data.hasScroll = true;
      break;
    case 'click':
      data.hasClick = true;
      break;
    case 'keypress':
      data.hasKeypress = true;
      break;
  }

  saveBehaviorData(data);
}

/**
 * Calculate bot/AI probability score (0-100)
 */
export function calculateBotScore() {
  const data = getBehaviorData();
  if (!data) return { score: 0, factors: [], level: 'unknown' };

  let score = 0;
  const factors = [];

  // Factor 1: Too many pages in session without interaction
  if (data.sessionPageViews > 10 && data.interactionCount < 5) {
    score += 20;
    factors.push('low_interaction_ratio');
  }

  if (data.sessionPageViews > 30 && data.interactionCount < 10) {
    score += 20;
    factors.push('very_low_interaction');
  }

  // Factor 2: No mouse movement after multiple pages
  if (data.sessionPageViews > 5 && !data.hasMouseMovement) {
    score += 15;
    factors.push('no_mouse_movement');
  }

  // Factor 3: No scroll after multiple pages
  if (data.sessionPageViews > 3 && !data.hasScroll) {
    score += 10;
    factors.push('no_scroll');
  }

  // Factor 4: Sequential product page access
  const productPages = data.pageHistory.filter(p =>
    p.path.includes('/products/') && !p.path.includes('/products/page')
  );
  if (productPages.length > 20) {
    score += 25;
    factors.push('mass_product_access');
  }

  // Factor 5: Too regular timing between pages
  if (data.timeBetweenPages.length >= 5) {
    const avgTime = data.timeBetweenPages.reduce((a, b) => a + b, 0) / data.timeBetweenPages.length;
    const variance = data.timeBetweenPages.reduce((sum, t) =>
      sum + Math.pow(t - avgTime, 2), 0) / data.timeBetweenPages.length;
    const stdDev = Math.sqrt(variance);

    // Very consistent timing = bot-like
    if (stdDev < 500 && avgTime < 3000) {
      score += 20;
      factors.push('regular_timing');
    }
  }

  // Factor 6: Extremely fast page navigation
  const fastPageLoads = data.timeBetweenPages.filter(t => t < 1000).length;
  if (fastPageLoads > 5) {
    score += 15;
    factors.push('fast_navigation');
  }

  // Factor 7: High total page views with low session count
  if (data.totalPageViews > 100 && data.totalSessions < 3) {
    score += 15;
    factors.push('mass_scraping_pattern');
  }

  // Factor 8: API endpoint access patterns (if tracked)
  const apiPages = data.pageHistory.filter(p => p.path.includes('/api/'));
  if (apiPages.length > 10) {
    score += 20;
    factors.push('direct_api_access');
  }

  // Cap at 100
  score = Math.min(100, score);

  // Determine threat level
  let level = 'normal';
  if (score >= 80) level = 'critical';
  else if (score >= 60) level = 'high';
  else if (score >= 30) level = 'medium';

  return { score, factors, level };
}

/**
 * Check if user should see CAPTCHA
 */
export function shouldShowCaptcha() {
  const { score } = calculateBotScore();
  return score >= 60;
}

/**
 * Check if content should be degraded
 */
export function shouldDegradeContent() {
  const { score } = calculateBotScore();
  return score >= 30;
}

/**
 * Get honeypot injection rate based on bot score
 */
export function getHoneypotRate() {
  const { score } = calculateBotScore();

  if (score >= 80) return 1.0;    // 100% honeypots
  if (score >= 60) return 0.9;    // 90% honeypots
  if (score >= 30) return 0.8;    // 80% honeypots
  return 0.7;                      // Default 70%
}

/**
 * Setup automatic behavior tracking
 */
export function initBehaviorTracking(options = {}) {
  if (typeof window === 'undefined') return;

  const {
    onSuspiciousDetected = null,
    onCaptchaRequired = null,
    trackingInterval = 5000,
  } = options;

  // Record initial page view
  recordPageView(window.location.pathname);

  // Track interactions
  const interactionHandler = (type) => () => recordInteraction(type);

  window.addEventListener('mousemove', interactionHandler('mousemove'), { passive: true, once: true });
  window.addEventListener('scroll', interactionHandler('scroll'), { passive: true, once: true });
  window.addEventListener('click', interactionHandler('click'), { passive: true });
  window.addEventListener('keydown', interactionHandler('keypress'), { passive: true, once: true });

  // Track page navigation
  const originalPushState = history.pushState;
  history.pushState = function (...args) {
    originalPushState.apply(this, args);
    recordPageView(window.location.pathname);
  };

  window.addEventListener('popstate', () => {
    recordPageView(window.location.pathname);
  });

  // Periodic check for suspicious behavior
  const checkInterval = setInterval(() => {
    const result = calculateBotScore();

    if (result.level === 'critical' || result.level === 'high') {
      onSuspiciousDetected?.(result);

      if (result.score >= 60) {
        onCaptchaRequired?.(result);
      }
    }
  }, trackingInterval);

  // Return cleanup function
  return () => {
    clearInterval(checkInterval);
    history.pushState = originalPushState;
  };
}

/**
 * React hook for behavior detection
 */
export function useBehaviorDetection() {
  if (typeof window === 'undefined') {
    return {
      botScore: 0,
      threatLevel: 'unknown',
      shouldShowCaptcha: false,
      shouldDegradeContent: false,
    };
  }

  const result = calculateBotScore();

  return {
    botScore: result.score,
    threatLevel: result.level,
    factors: result.factors,
    shouldShowCaptcha: result.score >= 60,
    shouldDegradeContent: result.score >= 30,
    honeypotRate: getHoneypotRate(),
  };
}

/**
 * Server-side: Analyze request patterns from headers/cookies
 */
export function analyzeRequestPattern(headers, cookies) {
  const signals = [];
  let score = 0;

  // Check for missing common headers
  const userAgent = headers?.get?.('user-agent') || '';
  const acceptLanguage = headers?.get?.('accept-language') || '';

  if (!acceptLanguage) {
    score += 15;
    signals.push('no_accept_language');
  }

  if (!userAgent) {
    score += 25;
    signals.push('no_user_agent');
  }

  // Check for known bot user agents
  const botPatterns = [
    /bot/i, /crawler/i, /spider/i, /scraper/i,
    /python/i, /curl/i, /wget/i, /axios/i, /node-fetch/i,
    /headless/i, /phantom/i, /selenium/i, /puppeteer/i,
  ];

  for (const pattern of botPatterns) {
    if (pattern.test(userAgent)) {
      score += 30;
      signals.push('bot_user_agent');
      break;
    }
  }

  // Check behavior cookie
  try {
    const behaviorCookie = cookies?.get?.('ss_behavior')?.value;
    if (behaviorCookie) {
      const behavior = JSON.parse(behaviorCookie);
      if (behavior.score >= 60) {
        score += behavior.score / 2;
        signals.push('high_client_score');
      }
    }
  } catch {
    // No cookie or invalid
  }

  return {
    score: Math.min(100, score),
    signals,
    isLikelyBot: score >= 50,
  };
}

export default {
  recordPageView,
  recordInteraction,
  calculateBotScore,
  shouldShowCaptcha,
  shouldDegradeContent,
  getHoneypotRate,
  initBehaviorTracking,
  useBehaviorDetection,
  analyzeRequestPattern,
};
