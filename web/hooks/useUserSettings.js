/**
 * useUserSettings Hook
 * Unified hook for managing all user settings in one place
 *
 * Replaces multiple individual hooks/fetches:
 * - fetch('/api/user/settings')
 * - fetch('/api/user/display-settings')
 * - fetch('/api/user/email-preferences')
 * - fetch('/api/user/web3-settings')
 * - fetch('/api/user/privacy-settings')
 *
 * @example
 * const { settings, loading, error, updateSettings } = useUserSettings();
 *
 * // Access specific settings
 * console.log(settings.profile.name);
 * console.log(settings.displaySettings.theme);
 *
 * // Update settings
 * await updateSettings('display', { theme: 'light' });
 */

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

export function useUserSettings() {
  const { data: session, status: sessionStatus } = useSession();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all settings
  const fetchSettings = useCallback(async () => {
    if (sessionStatus === 'loading') {
      return;
    }

    if (!session?.user?.id) {
      setLoading(false);
      setError(null);
      setSettings(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/user/settings', {
        method: 'GET',
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      setSettings(data);
    } catch (err) {
      console.error('[useUserSettings] Fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [session, sessionStatus]);

  // Initial fetch
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  /**
   * Update specific settings section
   *
   * @param {string} section - 'display' | 'email' | 'web3' | 'privacy' | 'profile'
   * @param {object} updates - Partial updates for that section
   * @returns {Promise<void>}
   *
   * @example
   * await updateSettings('display', { theme: 'light', language: 'fr' });
   * await updateSettings('email', { newsletter_enabled: false });
   */
  const updateSettings = useCallback(async (section, updates) => {
    if (!session?.user?.id) {
      throw new Error('User not authenticated');
    }

    try {
      const endpoint = getSectionEndpoint(section);

      const res = await fetch(endpoint, {
        method: section === 'profile' ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Failed to update ${section}`);
      }

      // Optimistic update - refresh settings after successful update
      await fetchSettings();

      return await res.json();
    } catch (err) {
      console.error(`[useUserSettings] Update ${section} error:`, err);
      throw err;
    }
  }, [session, fetchSettings]);

  /**
   * Refresh settings manually
   */
  const refresh = useCallback(() => {
    return fetchSettings();
  }, [fetchSettings]);

  return {
    // Data
    settings,
    profile: settings?.profile || null,
    emailPreferences: settings?.emailPreferences || getDefaultEmailPrefs(),
    displaySettings: settings?.displaySettings || getDefaultDisplaySettings(),
    web3Settings: settings?.web3Settings || getDefaultWeb3Settings(),
    privacySettings: settings?.privacySettings || getDefaultPrivacySettings(),
    wallets: settings?.wallets || [],

    // State
    loading,
    error,
    isAuthenticated: !!session?.user?.id,

    // Actions
    updateSettings,
    refresh,
  };
}

/**
 * Get API endpoint for specific settings section
 */
function getSectionEndpoint(section) {
  const endpoints = {
    display: '/api/user/display-settings',
    email: '/api/user/email-preferences',
    web3: '/api/user/web3-settings',
    privacy: '/api/user/privacy-settings',
    profile: '/api/user/settings',  // Uses main settings endpoint for profile
  };

  return endpoints[section] || '/api/user/settings';
}

/**
 * Default email preferences
 */
function getDefaultEmailPrefs() {
  return {
    alert_emails_enabled: true,
    alert_digest_frequency: 'instant',
    product_updates_enabled: true,
    newsletter_enabled: false,
    marketing_emails_enabled: false,
    security_alerts_enabled: true,
  };
}

/**
 * Default display settings
 */
function getDefaultDisplaySettings() {
  return {
    theme: 'dark',
    language: 'en',
    timezone: 'UTC',
    compact_view: false,
    show_score_colors: true,
  };
}

/**
 * Default web3 settings
 */
function getDefaultWeb3Settings() {
  return {
    preferred_chain_id: 137,  // Polygon
    preferred_payment_currency: 'usdc',
    gas_preference: 'standard',
    show_wallet_balance: true,
  };
}

/**
 * Default privacy settings
 */
function getDefaultPrivacySettings() {
  return {
    profile_visibility: 'public',
    show_email: false,
    show_wallets: false,
    show_activity: true,
    allow_indexing: true,
    anonymous_mode: false,
  };
}

/**
 * Hook for specific settings section only
 * Optimized for components that only need one section
 *
 * @example
 * const { settings, loading, update } = useSettingsSection('display');
 */
export function useSettingsSection(section) {
  const {
    settings,
    loading,
    error,
    updateSettings,
    refresh,
  } = useUserSettings();

  const sectionData = settings?.[`${section}Settings`] ||
    settings?.[section] ||
    getDefaultForSection(section);

  const updateSection = useCallback((updates) => {
    return updateSettings(section, updates);
  }, [section, updateSettings]);

  return {
    settings: sectionData,
    loading,
    error,
    update: updateSection,
    refresh,
  };
}

function getDefaultForSection(section) {
  switch (section) {
    case 'display':
      return getDefaultDisplaySettings();
    case 'email':
      return getDefaultEmailPrefs();
    case 'web3':
      return getDefaultWeb3Settings();
    case 'privacy':
      return getDefaultPrivacySettings();
    default:
      return {};
  }
}

/**
 * Hook for theme (most commonly used setting)
 *
 * @example
 * const { theme, setTheme } = useTheme();
 */
export function useTheme() {
  const { displaySettings, updateSettings, loading } = useUserSettings();

  const setTheme = useCallback(async (newTheme) => {
    await updateSettings('display', { theme: newTheme });
  }, [updateSettings]);

  return {
    theme: displaySettings?.theme || 'dark',
    setTheme,
    loading,
  };
}

/**
 * Hook for language
 *
 * @example
 * const { language, setLanguage } = useLanguage();
 */
export function useLanguage() {
  const { displaySettings, updateSettings, loading } = useUserSettings();

  const setLanguage = useCallback(async (newLanguage) => {
    await updateSettings('display', { language: newLanguage });
  }, [updateSettings]);

  return {
    language: displaySettings?.language || 'en',
    setLanguage,
    loading,
  };
}
