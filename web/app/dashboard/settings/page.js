"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import GlobeVisibilitySettings from "@/components/GlobeVisibilitySettings";

/**
 * User Settings Dashboard
 * Complete Web2 & Web3 settings management
 * RGPD compliant with privacy controls
 */

const TABS = [
  { id: "profile", label: "Profile", icon: "user" },
  { id: "notifications", label: "Notifications", icon: "bell" },
  { id: "display", label: "Display", icon: "palette" },
  { id: "memory", label: "AI Memory", icon: "sparkles", href: "/dashboard/settings/memory" },
  { id: "web3", label: "Web3 & Wallets", icon: "wallet" },
  { id: "privacy", label: "Privacy", icon: "shield" },
  { id: "data", label: "My Data", icon: "database" },
];

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("profile");
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/api/auth/signin");
    }
  }, [status, router]);

  // Fetch all settings
  useEffect(() => {
    if (session?.user) {
      fetchSettings();
    }
  }, [session]);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/user/settings");
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (endpoint, updates) => {
    setSaving(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Settings saved");
        fetchSettings();
      } else {
        toast.error(data.error || "Failed to save");
      }
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Settings</h1>
      <p className="text-base-content/60 mb-8">Manage your account preferences</p>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <div className="lg:w-64 flex-shrink-0">
          <ul className="menu bg-base-200 rounded-lg p-2">
            {TABS.map((tab) => (
              <li key={tab.id}>
                {tab.href ? (
                  <Link href={tab.href} className="flex items-center gap-2">
                    <TabIcon icon={tab.icon} />
                    {tab.label}
                  </Link>
                ) : (
                  <button
                    onClick={() => setActiveTab(tab.id)}
                    className={activeTab === tab.id ? "active" : ""}
                  >
                    <TabIcon icon={tab.icon} />
                    {tab.label}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Content */}
        <div className="flex-1 bg-base-200 rounded-lg p-6">
          {activeTab === "profile" && (
            <ProfileTab settings={settings} onSave={updateSettings} saving={saving} />
          )}
          {activeTab === "notifications" && (
            <NotificationsTab settings={settings} onSave={updateSettings} saving={saving} />
          )}
          {activeTab === "display" && (
            <DisplayTab settings={settings} onSave={updateSettings} saving={saving} />
          )}
          {activeTab === "web3" && (
            <Web3Tab settings={settings} onSave={updateSettings} saving={saving} onRefresh={fetchSettings} />
          )}
          {activeTab === "privacy" && (
            <PrivacyTab settings={settings} onSave={updateSettings} saving={saving} />
          )}
          {activeTab === "data" && (
            <DataTab settings={settings} />
          )}
        </div>
      </div>
    </div>
  );
}

// Tab Icon Component
function TabIcon({ icon }) {
  const icons = {
    user: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />,
    bell: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />,
    palette: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />,
    sparkles: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />,
    wallet: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />,
    shield: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />,
    database: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />,
  };

  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      {icons[icon]}
    </svg>
  );
}

// Profile Tab
function ProfileTab({ settings, onSave, saving }) {
  const [form, setForm] = useState({
    name: settings?.profile?.name || "",
    country: settings?.profile?.country || "",
  });

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Profile Information</h2>

      <div className="space-y-4">
        <div className="form-control">
          <label className="label"><span className="label-text">Email</span></label>
          <input
            type="email"
            value={settings?.profile?.email || ""}
            disabled
            className="input input-bordered bg-base-300"
          />
          <label className="label"><span className="label-text-alt">Email cannot be changed</span></label>
        </div>

        <div className="form-control">
          <label className="label"><span className="label-text">Display Name</span></label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="input input-bordered"
            placeholder="Your name"
          />
        </div>

        <div className="form-control">
          <label className="label"><span className="label-text">Country</span></label>
          <select
            value={form.country}
            onChange={(e) => setForm({ ...form, country: e.target.value })}
            className="select select-bordered"
          >
            <option value="">Select country</option>
            <option value="FR">France</option>
            <option value="US">United States</option>
            <option value="GB">United Kingdom</option>
            <option value="DE">Germany</option>
            <option value="CH">Switzerland</option>
            <option value="SG">Singapore</option>
          </select>
        </div>

        <div className="form-control">
          <label className="label"><span className="label-text">Account Type</span></label>
          <div className="badge badge-primary">{settings?.profile?.plan_type || "free"}</div>
        </div>

        <div className="form-control">
          <label className="label"><span className="label-text">Member Since</span></label>
          <p className="text-base-content/60">
            {settings?.profile?.created_at ? new Date(settings.profile.created_at).toLocaleDateString() : "N/A"}
          </p>
        </div>
      </div>
    </div>
  );
}

// Notifications Tab
function NotificationsTab({ settings, onSave, saving }) {
  const [form, setForm] = useState({
    alert_emails_enabled: settings?.email?.alert_emails_enabled ?? true,
    alert_digest_frequency: settings?.email?.alert_digest_frequency || "instant",
    product_updates_enabled: settings?.email?.product_updates_enabled ?? true,
    newsletter_enabled: settings?.email?.newsletter_enabled ?? false,
    marketing_emails_enabled: settings?.email?.marketing_emails_enabled ?? false,
    security_alerts_enabled: settings?.email?.security_alerts_enabled ?? true,
  });

  const handleSave = () => {
    onSave("/api/user/email-preferences", form);
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Email Notifications</h2>

      <div className="space-y-6">
        <div className="form-control">
          <label className="label cursor-pointer justify-start gap-4">
            <input
              type="checkbox"
              checked={form.alert_emails_enabled}
              onChange={(e) => setForm({ ...form, alert_emails_enabled: e.target.checked })}
              className="toggle toggle-primary"
            />
            <div>
              <span className="label-text font-medium">Alert Emails</span>
              <p className="text-sm text-base-content/60">Receive emails when your alerts trigger</p>
            </div>
          </label>
        </div>

        {form.alert_emails_enabled && (
          <div className="form-control ml-14">
            <label className="label"><span className="label-text">Frequency</span></label>
            <select
              value={form.alert_digest_frequency}
              onChange={(e) => setForm({ ...form, alert_digest_frequency: e.target.value })}
              className="select select-bordered select-sm"
            >
              <option value="instant">Instant</option>
              <option value="daily">Daily Digest</option>
              <option value="weekly">Weekly Digest</option>
            </select>
          </div>
        )}

        <div className="form-control">
          <label className="label cursor-pointer justify-start gap-4">
            <input
              type="checkbox"
              checked={form.product_updates_enabled}
              onChange={(e) => setForm({ ...form, product_updates_enabled: e.target.checked })}
              className="toggle toggle-primary"
            />
            <div>
              <span className="label-text font-medium">Product Updates</span>
              <p className="text-sm text-base-content/60">Score changes for products you follow</p>
            </div>
          </label>
        </div>

        <div className="form-control">
          <label className="label cursor-pointer justify-start gap-4">
            <input
              type="checkbox"
              checked={form.security_alerts_enabled}
              onChange={(e) => setForm({ ...form, security_alerts_enabled: e.target.checked })}
              className="toggle toggle-primary"
            />
            <div>
              <span className="label-text font-medium">Security Alerts</span>
              <p className="text-sm text-base-content/60">Login notifications and security updates</p>
            </div>
          </label>
        </div>

        <div className="divider">Marketing</div>

        <div className="form-control">
          <label className="label cursor-pointer justify-start gap-4">
            <input
              type="checkbox"
              checked={form.newsletter_enabled}
              onChange={(e) => setForm({ ...form, newsletter_enabled: e.target.checked })}
              className="toggle toggle-primary"
            />
            <div>
              <span className="label-text font-medium">Newsletter</span>
              <p className="text-sm text-base-content/60">Monthly security insights and tips</p>
            </div>
          </label>
        </div>

        <div className="form-control">
          <label className="label cursor-pointer justify-start gap-4">
            <input
              type="checkbox"
              checked={form.marketing_emails_enabled}
              onChange={(e) => setForm({ ...form, marketing_emails_enabled: e.target.checked })}
              className="toggle toggle-primary"
            />
            <div>
              <span className="label-text font-medium">Marketing Emails</span>
              <p className="text-sm text-base-content/60">Promotions and special offers</p>
            </div>
          </label>
        </div>

        <button onClick={handleSave} disabled={saving} className="btn btn-primary h-12 min-h-0 touch-manipulation active:scale-[0.97] transition-transform">
          {saving ? <span className="loading loading-spinner loading-sm"></span> : "Save Preferences"}
        </button>
      </div>
    </div>
  );
}

// Display Tab
function DisplayTab({ settings, onSave, saving }) {
  const [form, setForm] = useState({
    theme: settings?.display?.theme || "dark",
    language: settings?.display?.language || "en",
    compact_view: settings?.display?.compact_view ?? false,
    show_score_colors: settings?.display?.show_score_colors ?? true,
    reduce_animations: settings?.display?.reduce_animations ?? false,
  });

  const handleSave = () => {
    onSave("/api/user/display-settings", form);
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Display Settings</h2>

      <div className="space-y-6">
        <div className="form-control">
          <label className="label"><span className="label-text">Theme</span></label>
          <select
            value={form.theme}
            onChange={(e) => setForm({ ...form, theme: e.target.value })}
            className="select select-bordered"
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="auto">System</option>
          </select>
        </div>

        <div className="form-control">
          <label className="label"><span className="label-text">Language</span></label>
          <select
            value={form.language}
            onChange={(e) => setForm({ ...form, language: e.target.value })}
            className="select select-bordered"
          >
            <option value="en">English</option>
            <option value="fr">Francais</option>
            <option value="de">Deutsch</option>
            <option value="es">Espanol</option>
          </select>
        </div>

        <div className="form-control">
          <label className="label cursor-pointer justify-start gap-4">
            <input
              type="checkbox"
              checked={form.compact_view}
              onChange={(e) => setForm({ ...form, compact_view: e.target.checked })}
              className="toggle toggle-primary"
            />
            <span className="label-text">Compact View</span>
          </label>
        </div>

        <div className="form-control">
          <label className="label cursor-pointer justify-start gap-4">
            <input
              type="checkbox"
              checked={form.show_score_colors}
              onChange={(e) => setForm({ ...form, show_score_colors: e.target.checked })}
              className="toggle toggle-primary"
            />
            <span className="label-text">Show Score Colors</span>
          </label>
        </div>

        <div className="form-control">
          <label className="label cursor-pointer justify-start gap-4">
            <input
              type="checkbox"
              checked={form.reduce_animations}
              onChange={(e) => setForm({ ...form, reduce_animations: e.target.checked })}
              className="toggle toggle-primary"
            />
            <span className="label-text">Reduce Animations</span>
          </label>
        </div>

        <button onClick={handleSave} disabled={saving} className="btn btn-primary h-12 min-h-0 touch-manipulation active:scale-[0.97] transition-transform">
          {saving ? <span className="loading loading-spinner loading-sm"></span> : "Save Settings"}
        </button>
      </div>
    </div>
  );
}

// Web3 Tab
function Web3Tab({ settings, onSave, saving, onRefresh }) {
  const [form, setForm] = useState({
    preferred_chain_id: settings?.web3?.preferred_chain_id || 137,
    preferred_payment_currency: settings?.web3?.preferred_payment_currency || "usdc",
    gas_preference: settings?.web3?.gas_preference || "standard",
    show_wallet_balance: settings?.web3?.show_wallet_balance ?? true,
  });

  const chains = { 1: "Ethereum", 137: "Polygon", 56: "BSC", 42161: "Arbitrum" };

  const handleSave = () => {
    onSave("/api/user/web3-settings", form);
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Web3 Settings</h2>

      <div className="space-y-6">
        {/* Wallets Section */}
        <div className="bg-base-300 rounded-lg p-4">
          <h3 className="font-medium mb-3">Connected Wallets</h3>
          {settings?.wallets?.length > 0 ? (
            <div className="space-y-2">
              {settings.wallets.map((wallet) => (
                <div key={wallet.id} className="flex items-center justify-between p-2 bg-base-200 rounded">
                  <div>
                    <span className="font-mono text-sm">
                      {wallet.wallet_address.slice(0, 6)}...{wallet.wallet_address.slice(-4)}
                    </span>
                    {wallet.is_primary && <span className="badge badge-primary badge-sm ml-2">Primary</span>}
                    {wallet.label && <span className="text-sm text-base-content/60 ml-2">({wallet.label})</span>}
                  </div>
                  <span className="text-sm text-base-content/60">{chains[wallet.chain_id] || `Chain ${wallet.chain_id}`}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-base-content/60">No wallets connected</p>
          )}
        </div>

        <div className="form-control">
          <label className="label"><span className="label-text">Preferred Chain</span></label>
          <select
            value={form.preferred_chain_id}
            onChange={(e) => setForm({ ...form, preferred_chain_id: parseInt(e.target.value) })}
            className="select select-bordered"
          >
            {Object.entries(chains).map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        </div>

        <div className="form-control">
          <label className="label"><span className="label-text">Payment Currency</span></label>
          <select
            value={form.preferred_payment_currency}
            onChange={(e) => setForm({ ...form, preferred_payment_currency: e.target.value })}
            className="select select-bordered"
          >
            <option value="usdc">USDC</option>
            <option value="eth">ETH</option>
            <option value="matic">MATIC</option>
            <option value="btc">BTC</option>
          </select>
        </div>

        <div className="form-control">
          <label className="label"><span className="label-text">Gas Preference</span></label>
          <select
            value={form.gas_preference}
            onChange={(e) => setForm({ ...form, gas_preference: e.target.value })}
            className="select select-bordered"
          >
            <option value="slow">Slow (Cheaper)</option>
            <option value="standard">Standard</option>
            <option value="fast">Fast</option>
            <option value="instant">Instant (Expensive)</option>
          </select>
        </div>

        <div className="form-control">
          <label className="label cursor-pointer justify-start gap-4">
            <input
              type="checkbox"
              checked={form.show_wallet_balance}
              onChange={(e) => setForm({ ...form, show_wallet_balance: e.target.checked })}
              className="toggle toggle-primary"
            />
            <span className="label-text">Show Wallet Balances</span>
          </label>
        </div>

        <button onClick={handleSave} disabled={saving} className="btn btn-primary h-12 min-h-0 touch-manipulation active:scale-[0.97] transition-transform">
          {saving ? <span className="loading loading-spinner loading-sm"></span> : "Save Settings"}
        </button>
      </div>
    </div>
  );
}

// Privacy Tab
function PrivacyTab({ settings, onSave, saving }) {
  const [form, setForm] = useState({
    analytics_consent: settings?.privacy?.analytics_consent ?? false,
    marketing_consent: settings?.privacy?.marketing_consent ?? false,
    profile_visibility: settings?.privacy?.profile_visibility || "private",
    anonymize_usage_data: settings?.privacy?.anonymize_usage_data ?? true,
    track_product_views: settings?.privacy?.track_product_views ?? true,
  });

  const handleSave = () => {
    onSave("/api/user/privacy-settings", form);
  };

  const handleGlobeSave = async (globeSettings) => {
    await onSave("/api/user/privacy-settings", globeSettings);
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Privacy & Data</h2>
      <p className="text-sm text-base-content/60 mb-6">
        Manage how your data is collected and used. See our{" "}
        <a href="/privacy" className="link link-primary">Privacy Policy</a>.
      </p>

      <div className="space-y-6">
        {/* Globe Visibility Section */}
        <div className="mb-8">
          <GlobeVisibilitySettings
            settings={settings?.privacy}
            onSave={handleGlobeSave}
            isLoading={saving}
          />
        </div>

        <div className="divider">Profile Settings</div>

        <div className="form-control">
          <label className="label"><span className="label-text">Profile Visibility</span></label>
          <select
            value={form.profile_visibility}
            onChange={(e) => setForm({ ...form, profile_visibility: e.target.value })}
            className="select select-bordered"
          >
            <option value="private">Private</option>
            <option value="public">Public</option>
          </select>
        </div>

        <div className="divider">Consent (RGPD)</div>

        <div className="form-control">
          <label className="label cursor-pointer justify-start gap-4">
            <input
              type="checkbox"
              checked={form.analytics_consent}
              onChange={(e) => setForm({ ...form, analytics_consent: e.target.checked })}
              className="toggle toggle-primary"
            />
            <div>
              <span className="label-text font-medium">Analytics</span>
              <p className="text-sm text-base-content/60">Help us improve with anonymous usage data</p>
            </div>
          </label>
        </div>

        <div className="form-control">
          <label className="label cursor-pointer justify-start gap-4">
            <input
              type="checkbox"
              checked={form.marketing_consent}
              onChange={(e) => setForm({ ...form, marketing_consent: e.target.checked })}
              className="toggle toggle-primary"
            />
            <div>
              <span className="label-text font-medium">Marketing</span>
              <p className="text-sm text-base-content/60">Receive personalized recommendations</p>
            </div>
          </label>
        </div>

        <div className="form-control">
          <label className="label cursor-pointer justify-start gap-4">
            <input
              type="checkbox"
              checked={form.anonymize_usage_data}
              onChange={(e) => setForm({ ...form, anonymize_usage_data: e.target.checked })}
              className="toggle toggle-primary"
            />
            <div>
              <span className="label-text font-medium">Anonymize Data</span>
              <p className="text-sm text-base-content/60">Remove identifying information from logs</p>
            </div>
          </label>
        </div>

        <div className="form-control">
          <label className="label cursor-pointer justify-start gap-4">
            <input
              type="checkbox"
              checked={form.track_product_views}
              onChange={(e) => setForm({ ...form, track_product_views: e.target.checked })}
              className="toggle toggle-primary"
            />
            <div>
              <span className="label-text font-medium">Track Views</span>
              <p className="text-sm text-base-content/60">Remember products you viewed for recommendations</p>
            </div>
          </label>
        </div>

        <button onClick={handleSave} disabled={saving} className="btn btn-primary h-12 min-h-0 touch-manipulation active:scale-[0.97] transition-transform">
          {saving ? <span className="loading loading-spinner loading-sm"></span> : "Save Privacy Settings"}
        </button>
      </div>
    </div>
  );
}

// Data Tab (RGPD)
function DataTab({ settings }) {
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState("");

  const handleExport = async (format) => {
    setExporting(true);
    try {
      const res = await fetch(`/api/user/export?format=${format}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `safescoring-data.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Data exported");
    } catch (error) {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    if (confirmDelete !== "DELETE_MY_ACCOUNT") {
      toast.error("Please type DELETE_MY_ACCOUNT to confirm");
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch("/api/user/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: confirmDelete }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Account deleted");
        window.location.href = "/";
      } else {
        toast.error(data.error || "Deletion failed");
      }
    } catch (error) {
      toast.error("Deletion failed");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Your Data (RGPD)</h2>

      <div className="space-y-8">
        {/* Export Data */}
        <div className="bg-base-300 rounded-lg p-4">
          <h3 className="font-medium mb-2">Export Your Data</h3>
          <p className="text-sm text-base-content/60 mb-4">
            Download a copy of all your data (Art. 20 RGPD - Right to Portability)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handleExport("json")}
              disabled={exporting}
              className="btn btn-outline h-10 min-h-0 touch-manipulation active:scale-[0.97] transition-transform"
            >
              {exporting ? <span className="loading loading-spinner loading-xs"></span> : "Export JSON"}
            </button>
            <button
              onClick={() => handleExport("csv")}
              disabled={exporting}
              className="btn btn-outline h-10 min-h-0 touch-manipulation active:scale-[0.97] transition-transform"
            >
              {exporting ? <span className="loading loading-spinner loading-xs"></span> : "Export CSV"}
            </button>
          </div>
        </div>

        {/* Delete Account */}
        <div className="bg-error/10 border border-error/30 rounded-lg p-4">
          <h3 className="font-medium text-error mb-2">Delete Account</h3>
          <p className="text-sm text-base-content/60 mb-4">
            Permanently delete your account and all data (Art. 17 RGPD - Right to Erasure).
            This action cannot be undone.
          </p>
          <div className="form-control mb-4">
            <input
              type="text"
              value={confirmDelete}
              onChange={(e) => setConfirmDelete(e.target.value)}
              placeholder="Type DELETE_MY_ACCOUNT to confirm"
              className="input input-bordered input-error"
            />
          </div>
          <button
            onClick={handleDelete}
            disabled={deleting || confirmDelete !== "DELETE_MY_ACCOUNT"}
            className="btn btn-error h-10 min-h-0 touch-manipulation active:scale-[0.97] transition-transform"
          >
            {deleting ? <span className="loading loading-spinner loading-xs"></span> : "Delete Account"}
          </button>
        </div>

        {/* Contact */}
        <div className="text-sm text-base-content/60">
          <p>For data requests, contact: <a href="mailto:privacy@safescoring.io" className="link">privacy@safescoring.io</a></p>
          <p>Response time: Within 30 days (RGPD requirement)</p>
        </div>
      </div>
    </div>
  );
}
