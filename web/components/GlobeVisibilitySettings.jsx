"use client";

import { useState, useEffect } from "react";

/**
 * GlobeVisibilitySettings - Component for users to control their visibility on the 3D globe
 * Allows setting emoji, anonymous name, and whether to show their setup
 */

// Available emojis organized by category
const EMOJI_OPTIONS = {
  security: [
    { emoji: "🛡️", label: "Shield" },
    { emoji: "🔒", label: "Lock" },
    { emoji: "🔐", label: "Locked Key" },
    { emoji: "🔑", label: "Key" },
    { emoji: "🗝️", label: "Old Key" },
  ],
  crypto: [
    { emoji: "₿", label: "Bitcoin" },
    { emoji: "⟠", label: "Ethereum" },
    { emoji: "💎", label: "Diamond" },
    { emoji: "🪙", label: "Coin" },
    { emoji: "💰", label: "Money Bag" },
  ],
  tech: [
    { emoji: "🤖", label: "Robot" },
    { emoji: "👾", label: "Alien" },
    { emoji: "🎮", label: "Gaming" },
    { emoji: "💻", label: "Laptop" },
    { emoji: "📱", label: "Phone" },
  ],
  nature: [
    { emoji: "🦊", label: "Fox" },
    { emoji: "🐺", label: "Wolf" },
    { emoji: "🦁", label: "Lion" },
    { emoji: "🐉", label: "Dragon" },
    { emoji: "🦅", label: "Eagle" },
  ],
  fun: [
    { emoji: "🚀", label: "Rocket" },
    { emoji: "⚡", label: "Lightning" },
    { emoji: "🌟", label: "Star" },
    { emoji: "🔥", label: "Fire" },
    { emoji: "✨", label: "Sparkles" },
    { emoji: "🎯", label: "Target" },
    { emoji: "🏆", label: "Trophy" },
    { emoji: "👑", label: "Crown" },
  ],
};

export default function GlobeVisibilitySettings({
  settings,
  onSave,
  isLoading = false,
  compact = false,
}) {
  const [showOnGlobe, setShowOnGlobe] = useState(settings?.show_setup_on_globe || false);
  const [selectedEmoji, setSelectedEmoji] = useState(settings?.globe_display_emoji || "🛡️");
  const [anonymousName, setAnonymousName] = useState(settings?.globe_anonymous_name || "");
  const [showProducts, setShowProducts] = useState(settings?.globe_show_products || false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Track changes
  useEffect(() => {
    const changed =
      showOnGlobe !== (settings?.show_setup_on_globe || false) ||
      selectedEmoji !== (settings?.globe_display_emoji || "🛡️") ||
      anonymousName !== (settings?.globe_anonymous_name || "") ||
      showProducts !== (settings?.globe_show_products || false);
    setHasChanges(changed);
  }, [showOnGlobe, selectedEmoji, anonymousName, showProducts, settings]);

  // Update local state when settings prop changes
  useEffect(() => {
    if (settings) {
      setShowOnGlobe(settings.show_setup_on_globe || false);
      setSelectedEmoji(settings.globe_display_emoji || "🛡️");
      setAnonymousName(settings.globe_anonymous_name || "");
      setShowProducts(settings.globe_show_products || false);
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        show_setup_on_globe: showOnGlobe,
        globe_display_emoji: selectedEmoji,
        globe_anonymous_name: anonymousName || null,
        globe_show_products: showProducts,
      });
      setHasChanges(false);
    } catch (error) {
      console.error("Error saving globe settings:", error);
    } finally {
      setSaving(false);
    }
  };

  if (compact) {
    return (
      <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-purple-500/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌍</span>
            <span className="font-medium text-white">Globe Visibility</span>
          </div>
          <label className="cursor-pointer flex items-center gap-2">
            <input
              type="checkbox"
              className="toggle toggle-primary toggle-sm"
              checked={showOnGlobe}
              onChange={(e) => setShowOnGlobe(e.target.checked)}
            />
          </label>
        </div>

        {showOnGlobe && (
          <div className="space-y-3 pt-2 border-t border-white/10">
            {/* Emoji selector */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="w-10 h-10 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-2xl transition-colors"
              >
                {selectedEmoji}
              </button>
              <input
                type="text"
                placeholder="Anonymous name"
                value={anonymousName}
                onChange={(e) => setAnonymousName(e.target.value.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20))}
                className="flex-1 input input-sm input-bordered bg-slate-800/50"
                maxLength={20}
              />
            </div>

            {/* Emoji picker dropdown */}
            {showEmojiPicker && (
              <div className="p-2 rounded-lg bg-slate-800 border border-slate-700">
                <div className="grid grid-cols-8 gap-1">
                  {Object.values(EMOJI_OPTIONS).flat().map(({ emoji }) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        setSelectedEmoji(emoji);
                        setShowEmojiPicker(false);
                      }}
                      className={`w-8 h-8 rounded hover:bg-slate-700 flex items-center justify-center text-lg transition-colors ${
                        selectedEmoji === emoji ? "bg-primary/20 ring-1 ring-primary" : ""
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Show products toggle */}
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-slate-400">Show my setup products</span>
              <input
                type="checkbox"
                className="toggle toggle-xs toggle-secondary"
                checked={showProducts}
                onChange={(e) => setShowProducts(e.target.checked)}
              />
            </label>

            {/* Save button */}
            {hasChanges && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn btn-primary btn-sm w-full"
              >
                {saving ? <span className="loading loading-spinner loading-xs" /> : "Save Changes"}
              </button>
            )}
          </div>
        )}

        {!showOnGlobe && (
          <p className="text-xs text-slate-500 mt-2">
            Enable to appear on the community globe with your setup
          </p>
        )}
      </div>
    );
  }

  // Full settings view
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center text-2xl">
          🌍
        </div>
        <div>
          <h3 className="font-bold text-lg">Globe Visibility</h3>
          <p className="text-sm text-base-content/60">
            Control how you appear on the community 3D globe
          </p>
        </div>
      </div>

      {/* Main toggle */}
      <div className="p-4 rounded-xl bg-base-200 border border-base-300">
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <div className="font-medium">Show me on the globe</div>
            <div className="text-sm text-base-content/60">
              Your anonymous presence will be visible to other users
            </div>
          </div>
          <input
            type="checkbox"
            className="toggle toggle-primary"
            checked={showOnGlobe}
            onChange={(e) => setShowOnGlobe(e.target.checked)}
          />
        </label>
      </div>

      {/* Settings when enabled */}
      {showOnGlobe && (
        <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
          {/* Preview */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700">
            <div className="text-xs text-slate-500 mb-2">Preview on globe:</div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center text-2xl border-2 border-white/20 shadow-lg">
                {selectedEmoji}
              </div>
              <div>
                <div className="font-medium text-white">
                  {anonymousName || "Anonymous User"}
                </div>
                {showProducts && (
                  <div className="text-xs text-slate-400 flex items-center gap-1">
                    <span>📦</span>
                    <span>Setup visible</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Emoji selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Choose your emoji</label>
            <div className="space-y-3">
              {Object.entries(EMOJI_OPTIONS).map(([category, emojis]) => (
                <div key={category}>
                  <div className="text-xs text-base-content/50 mb-1 capitalize">{category}</div>
                  <div className="flex flex-wrap gap-1">
                    {emojis.map(({ emoji, label }) => (
                      <button
                        key={emoji}
                        onClick={() => setSelectedEmoji(emoji)}
                        title={label}
                        className={`w-10 h-10 rounded-lg hover:bg-base-300 flex items-center justify-center text-xl transition-all ${
                          selectedEmoji === emoji
                            ? "bg-primary/20 ring-2 ring-primary scale-110"
                            : "bg-base-200"
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Anonymous name */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Anonymous display name</label>
            <input
              type="text"
              placeholder="e.g., CryptoExplorer (optional)"
              value={anonymousName}
              onChange={(e) => setAnonymousName(e.target.value.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20))}
              className="input input-bordered w-full"
              maxLength={20}
            />
            <p className="text-xs text-base-content/50">
              Letters, numbers, and underscores only. Leave empty for auto-generated name.
            </p>
          </div>

          {/* Show products toggle */}
          <div className="p-4 rounded-xl bg-base-200 border border-base-300">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <div className="font-medium flex items-center gap-2">
                  <span>📦</span>
                  Show my setup products
                </div>
                <div className="text-sm text-base-content/60">
                  Let others see which products are in your setup for inspiration
                </div>
              </div>
              <input
                type="checkbox"
                className="toggle toggle-secondary"
                checked={showProducts}
                onChange={(e) => setShowProducts(e.target.checked)}
              />
            </label>
          </div>

          {/* Privacy notice */}
          <div className="p-3 rounded-lg bg-info/10 border border-info/20 text-sm">
            <div className="flex items-start gap-2">
              <span className="text-info">ℹ️</span>
              <div className="text-info/80">
                <strong>Privacy:</strong> Your real identity is never shown. Only your chosen emoji,
                anonymous name, and optionally your setup products are visible to others.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save button */}
      {hasChanges && (
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving || isLoading}
            className="btn btn-primary gap-2"
          >
            {saving ? (
              <>
                <span className="loading loading-spinner loading-sm" />
                Saving...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                Save Changes
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
