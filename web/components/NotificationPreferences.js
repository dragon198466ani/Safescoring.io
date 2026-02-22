"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

export default function NotificationPreferences() {
  const { data: session } = useSession();
  const [prefs, setPrefs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function fetchPrefs() {
      if (!session?.user?.id) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch("/api/notifications/preferences");
        if (res.ok) {
          const data = await res.json();
          setPrefs(data);
        }
      } catch (err) {
        console.error("Failed to fetch preferences:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchPrefs();
  }, [session?.user?.id]);

  const updatePref = async (key, value) => {
    const newPrefs = { ...prefs, [key]: value };
    setPrefs(newPrefs);
    setSaving(true);
    setSaved(false);

    try {
      const res = await fetch("/api/notifications/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (err) {
      console.error("Failed to update preference:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl bg-base-200 border border-base-300 p-6 animate-pulse">
        <div className="h-6 bg-base-300 rounded w-1/3 mb-4" />
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 bg-base-300 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!prefs) return null;

  const toggles = [
    {
      key: "email_score_changes",
      label: "Score change alerts",
      description: "Get notified when a product in your setup changes score",
    },
    {
      key: "email_security_incidents",
      label: "Security incident alerts",
      description: "Immediate alerts for critical security events",
    },
    {
      key: "email_weekly_digest",
      label: "Weekly digest",
      description: "Weekly summary of your security status and changes",
    },
    {
      key: "email_monthly_report",
      label: "Monthly security report",
      description: "Detailed monthly report with trends and recommendations",
    },
    {
      key: "email_streak_reminder",
      label: "Streak reminder",
      description: "Get reminded when your streak is about to break",
    },
  ];

  return (
    <div className="rounded-2xl bg-base-200 border border-base-300 overflow-hidden">
      <div className="p-6 border-b border-base-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-blue-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h2 className="font-semibold">Notification Preferences</h2>
              <p className="text-sm text-base-content/60">Control what alerts you receive</p>
            </div>
          </div>
          {saved && (
            <span className="text-xs text-green-400 flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              Saved
            </span>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Email toggles */}
        {toggles.map((toggle) => (
          <div key={toggle.key} className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">{toggle.label}</p>
              <p className="text-xs text-base-content/50">{toggle.description}</p>
            </div>
            <input
              type="checkbox"
              className="toggle toggle-primary toggle-sm"
              checked={prefs[toggle.key] ?? true}
              onChange={(e) => updatePref(toggle.key, e.target.checked)}
              disabled={saving}
            />
          </div>
        ))}

        <div className="divider" />

        {/* Alert frequency */}
        <div>
          <label className="text-sm font-medium block mb-2">Alert frequency</label>
          <p className="text-xs text-base-content/50 mb-3">How often should we send score change alerts?</p>
          <div className="flex gap-2">
            {["immediate", "daily", "weekly"].map((freq) => (
              <button
                key={freq}
                onClick={() => updatePref("alert_frequency", freq)}
                className={`btn btn-sm capitalize ${
                  prefs.alert_frequency === freq ? "btn-primary" : "btn-ghost"
                }`}
                disabled={saving}
              >
                {freq}
              </button>
            ))}
          </div>
        </div>

        {/* Min score change */}
        <div>
          <label className="text-sm font-medium block mb-2">
            Minimum score change: {prefs.min_score_change || 5} points
          </label>
          <p className="text-xs text-base-content/50 mb-3">
            Only alert when a product score changes by at least this many points
          </p>
          <input
            type="range"
            min="1"
            max="20"
            value={prefs.min_score_change || 5}
            onChange={(e) => updatePref("min_score_change", parseInt(e.target.value))}
            className="range range-primary range-sm"
            disabled={saving}
          />
          <div className="flex justify-between text-xs text-base-content/40 mt-1">
            <span>1 (sensitive)</span>
            <span>20 (only major)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
