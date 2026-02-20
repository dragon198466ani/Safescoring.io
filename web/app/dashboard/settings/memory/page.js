"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

/**
 * AI Memory Settings Page
 * Manage what the AI remembers about you (like Claude's memory feature)
 */

const CATEGORY_LABELS = {
  personal: "Personal",
  crypto_goals: "Crypto Goals",
  risk_profile: "Risk Profile",
  product_preferences: "Product Preferences",
  holdings: "Holdings",
};

const TYPE_LABELS = {
  fact: "Fact",
  preference: "Preference",
  goal: "Goal",
  context: "Context",
};

export default function MemorySettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [settings, setSettings] = useState(null);
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  // Filter state
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      fetchMemoryData();
    }
  }, [session]);

  const fetchMemoryData = async () => {
    setLoading(true);
    try {
      const [settingsRes, memoriesRes] = await Promise.all([
        fetch("/api/user/memory/settings"),
        fetch("/api/user/memory?limit=100"),
      ]);

      const settingsData = await settingsRes.json();
      const memoriesData = await memoriesRes.json();

      if (settingsData.success) setSettings(settingsData.settings);
      if (memoriesData.success) setMemories(memoriesData.memories);
    } catch (error) {
      toast.error("Failed to load memory settings");
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (updates) => {
    setSaving(true);
    try {
      const res = await fetch("/api/user/memory/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
        toast.success("Settings saved");
      } else {
        toast.error(data.error || "Failed to save");
      }
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const deleteMemory = async (memoryId) => {
    setDeleting(memoryId);
    try {
      const res = await fetch(`/api/user/memory/${memoryId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setMemories(memories.filter((m) => m.id !== memoryId));
        toast.success("Memory deleted");
      } else {
        toast.error("Failed to delete memory");
      }
    } catch (error) {
      toast.error("Failed to delete memory");
    } finally {
      setDeleting(null);
    }
  };

  const clearAllMemories = async () => {
    if (
      !confirm(
        "Are you sure you want to delete ALL memories? This cannot be undone."
      )
    ) {
      return;
    }

    try {
      const res = await fetch("/api/user/memory", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deleteAll: true }),
      });
      if (res.ok) {
        setMemories([]);
        toast.success("All memories cleared");
      } else {
        toast.error("Failed to clear memories");
      }
    } catch (error) {
      toast.error("Failed to clear memories");
    }
  };

  const filteredMemories = memories.filter((m) => {
    if (categoryFilter !== "all" && m.category !== categoryFilter) return false;
    if (typeFilter !== "all" && m.memory_type !== typeFilter) return false;
    return true;
  });

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link href="/dashboard/settings" className="btn btn-ghost btn-sm btn-circle">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 19.5L8.25 12l7.5-7.5"
                />
              </svg>
            </Link>
            <h1 className="text-3xl font-bold">AI Memory</h1>
          </div>
          <p className="text-base-content/60 ml-11">
            Manage what the AI remembers about you
          </p>
        </div>
      </div>

      {/* Master Toggle */}
      <div className="card bg-base-200 mb-6">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6 text-white"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="card-title">Memory Feature</h2>
                <p className="text-sm text-base-content/60">
                  When enabled, the AI remembers facts about you to provide
                  personalized assistance
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              className="toggle toggle-primary toggle-lg"
              checked={settings?.memory_enabled ?? true}
              onChange={(e) =>
                updateSettings({ memory_enabled: e.target.checked })
              }
              disabled={saving}
            />
          </div>
        </div>
      </div>

      {settings?.memory_enabled && (
        <>
          {/* Granular Controls */}
          <div className="card bg-base-200 mb-6">
            <div className="card-body">
              <h2 className="card-title mb-4">What to Remember</h2>

              <div className="grid md:grid-cols-2 gap-4">
                {[
                  {
                    key: "remember_preferences",
                    label: "Product Preferences",
                    desc: "Wallet types and security preferences",
                    icon: "M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z",
                  },
                  {
                    key: "remember_goals",
                    label: "Crypto Goals",
                    desc: "Investment goals and timeline",
                    icon: "M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941",
                  },
                  {
                    key: "remember_risk_profile",
                    label: "Risk Profile",
                    desc: "Risk tolerance and security priorities",
                    icon: "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z",
                  },
                  {
                    key: "remember_product_interests",
                    label: "Product Interests",
                    desc: "Products you've shown interest in",
                    icon: "M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z",
                  },
                ].map(({ key, label, desc, icon }) => (
                  <div
                    key={key}
                    className="form-control p-3 bg-base-300 rounded-lg"
                  >
                    <label className="label cursor-pointer justify-start gap-3">
                      <input
                        type="checkbox"
                        className="toggle toggle-primary toggle-sm"
                        checked={settings?.[key] ?? true}
                        onChange={(e) =>
                          updateSettings({ [key]: e.target.checked })
                        }
                        disabled={saving}
                      />
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-base-100 flex items-center justify-center">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="w-4 h-4"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d={icon}
                            />
                          </svg>
                        </div>
                        <div>
                          <span className="label-text font-medium">{label}</span>
                          <p className="text-xs text-base-content/50">{desc}</p>
                        </div>
                      </div>
                    </label>
                  </div>
                ))}
              </div>

              {/* Auto-extract toggle */}
              <div className="divider"></div>

              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-4">
                  <input
                    type="checkbox"
                    className="toggle toggle-primary"
                    checked={settings?.auto_extract_facts ?? true}
                    onChange={(e) =>
                      updateSettings({ auto_extract_facts: e.target.checked })
                    }
                    disabled={saving}
                  />
                  <div>
                    <span className="label-text font-medium">
                      Auto-extract facts from conversations
                    </span>
                    <p className="text-sm text-base-content/60">
                      Automatically learn from your chat messages
                    </p>
                  </div>
                </label>
              </div>

              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-4">
                  <input
                    type="checkbox"
                    className="toggle toggle-primary"
                    checked={settings?.store_conversations ?? true}
                    onChange={(e) =>
                      updateSettings({ store_conversations: e.target.checked })
                    }
                    disabled={saving}
                  />
                  <div>
                    <span className="label-text font-medium">
                      Store conversation history
                    </span>
                    <p className="text-sm text-base-content/60">
                      Keep chat history for context
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Memory List */}
          <div className="card bg-base-200">
            <div className="card-body">
              <div className="flex items-center justify-between mb-4">
                <h2 className="card-title">
                  Your Memories
                  <span className="badge badge-primary badge-sm">
                    {memories.length}
                  </span>
                </h2>
                {memories.length > 0 && (
                  <button
                    onClick={clearAllMemories}
                    className="btn btn-error btn-sm btn-outline"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-3 mb-4">
                <select
                  className="select select-bordered select-sm"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="all">All Categories</option>
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>

                <select
                  className="select select-bordered select-sm"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <option value="all">All Types</option>
                  {Object.entries(TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>

                {(categoryFilter !== "all" || typeFilter !== "all") && (
                  <button
                    onClick={() => {
                      setCategoryFilter("all");
                      setTypeFilter("all");
                    }}
                    className="btn btn-ghost btn-sm"
                  >
                    Clear filters
                  </button>
                )}
              </div>

              {/* Memory Items */}
              {filteredMemories.length === 0 ? (
                <div className="text-center py-12 text-base-content/50">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1}
                    stroke="currentColor"
                    className="w-16 h-16 mx-auto mb-4 opacity-30"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                    />
                  </svg>
                  <p className="text-lg mb-2">No memories yet</p>
                  <p className="text-sm">
                    Chat with the AI assistant to build your profile
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {filteredMemories.map((memory) => (
                    <div
                      key={memory.id}
                      className="flex items-start justify-between p-3 bg-base-300 rounded-lg group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{memory.content}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="badge badge-sm badge-primary">
                            {CATEGORY_LABELS[memory.category] || memory.category}
                          </span>
                          <span className="badge badge-sm badge-ghost">
                            {TYPE_LABELS[memory.memory_type] || memory.memory_type}
                          </span>
                          <span className="text-xs text-base-content/40">
                            {new Date(memory.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteMemory(memory.id)}
                        disabled={deleting === memory.id}
                        className="btn btn-ghost btn-sm btn-circle opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {deleting === memory.id ? (
                          <span className="loading loading-spinner loading-xs"></span>
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="w-4 h-4"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Privacy Notice */}
      <div className="mt-6 p-4 bg-base-200/50 rounded-lg">
        <div className="flex items-start gap-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-5 h-5 mt-0.5 text-primary"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
            />
          </svg>
          <div>
            <h3 className="font-medium mb-1">Privacy Notice</h3>
            <p className="text-sm text-base-content/60">
              Your memories are stored securely and only used to personalize your
              experience. They are never shared with third parties or used for AI
              training. You can delete individual memories or all memories at any
              time. See our{" "}
              <Link href="/privacy" className="link link-primary">
                Privacy Policy
              </Link>{" "}
              for more details.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
