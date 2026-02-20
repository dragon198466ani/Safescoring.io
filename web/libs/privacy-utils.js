/**
 * PRIVACY UTILS - Utilitaires RGPD-compliant
 *
 * Aucune donnée personnelle stockée :
 * - Emails hashés
 * - IPs hashées (supprimées après 24h)
 * - Wallets = publiques par nature
 */

import crypto from 'crypto';

// Salt secret pour les hash (à mettre en .env)
const HASH_SALT = process.env.PRIVACY_HASH_SALT || 'safescoring_privacy_2024';

/**
 * Hash un email de façon irréversible
 * On ne peut pas retrouver l'email depuis le hash
 */
export function hashEmail(email) {
  if (!email) return null;
  const normalized = email.toLowerCase().trim();
  return crypto
    .createHmac('sha256', HASH_SALT)
    .update(normalized)
    .digest('hex');
}

/**
 * Hash une adresse IP
 * Sera supprimé après 24h pour conformité RGPD
 */
export function hashIP(ip) {
  if (!ip) return null;
  return crypto
    .createHmac('sha256', HASH_SALT)
    .update(ip)
    .digest('hex')
    .slice(0, 16); // Version courte suffisante
}

/**
 * Hash un fingerprint device
 */
export function hashDevice(fingerprint) {
  if (!fingerprint) return null;
  return crypto
    .createHmac('sha256', HASH_SALT)
    .update(fingerprint)
    .digest('hex')
    .slice(0, 16);
}

/**
 * Génère un identifiant anonyme pour un utilisateur
 * Basé sur email OU wallet
 */
export function generateUserHash(identifier, type = 'email') {
  if (!identifier) return null;

  if (type === 'wallet') {
    // Wallet = déjà public, on garde tel quel (en lowercase)
    return identifier.toLowerCase();
  }

  // Email = on hash
  return hashEmail(identifier);
}

/**
 * Vérifie si un wallet a l'air légitime (format)
 */
export function isValidWalletAddress(address) {
  if (!address) return false;
  // Ethereum/Polygon format
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Extrait l'IP du request (gère les proxies)
 */
export function getClientIP(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  return 'unknown';
}

/**
 * Rate limiting simple basé sur hash
 */
const rateLimitStore = new Map();

export function checkRateLimit(userHash, action, maxPerHour = 10) {
  const key = `${userHash}:${action}`;
  const now = Date.now();
  const hourAgo = now - 60 * 60 * 1000;

  // Récupérer les actions récentes
  const actions = rateLimitStore.get(key) || [];
  const recentActions = actions.filter(t => t > hourAgo);

  if (recentActions.length >= maxPerHour) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: Math.ceil((recentActions[0] + 60 * 60 * 1000 - now) / 1000 / 60)
    };
  }

  // Ajouter cette action
  recentActions.push(now);
  rateLimitStore.set(key, recentActions);

  return {
    allowed: true,
    remaining: maxPerHour - recentActions.length,
    resetIn: 60
  };
}

/**
 * Nettoie le rate limit store (à appeler périodiquement)
 */
export function cleanupRateLimitStore() {
  const hourAgo = Date.now() - 60 * 60 * 1000;
  for (const [key, actions] of rateLimitStore.entries()) {
    const recent = actions.filter(t => t > hourAgo);
    if (recent.length === 0) {
      rateLimitStore.delete(key);
    } else {
      rateLimitStore.set(key, recent);
    }
  }
}
