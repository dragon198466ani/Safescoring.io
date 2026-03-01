"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { PILLARS } from "@/libs/config-constants";
import { useScoringSetup } from "@/libs/ScoringSetupProvider";

const PILLAR_ORDER = ["s", "a", "f", "e"];
const PILLAR_META = {
  s: { code: "S", label: "Security", icon: "\u{1F6E1}", ...PILLARS.S },
  a: { code: "A", label: "Adversity", icon: "\u{26A0}", ...PILLARS.A },
  f: { code: "F", label: "Fidelity", icon: "\u{1F3AF}", ...PILLARS.F },
  e: { code: "E", label: "Efficiency", icon: "\u{26A1}", ...PILLARS.E },
};

// ============================================
// PRESETS — Quick-start templates
// ============================================
const PRESETS = [
  { name: "Balanced", s: 25, a: 25, f: 25, e: 25, desc: "Equal weight on all pillars" },
  { name: "Security First", s: 40, a: 25, f: 10, e: 25, desc: "For high-risk environments" },
  { name: "User Experience", s: 20, a: 15, f: 15, e: 50, desc: "Prioritize usability" },
  { name: "Hardware Focus", s: 25, a: 20, f: 35, e: 20, desc: "Physical durability matters" },
];

// ============================================
// Score color helpers
// ============================================
function getScoreColor(score) {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#f59e0b";
  return "#ef4444";
}

function getScoreLabel(score) {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  return "At Risk";
}

// ============================================
// Adjust weights to always sum to 100
// ============================================
function adjustWeights(current, changedKey, newValue) {
  const clamped = Math.max(0, Math.min(100, Math.round(newValue)));
  const others = PILLAR_ORDER.filter((k) => k !== changedKey);
  const remaining = 100 - clamped;
  const othersSum = others.reduce((sum, k) => sum + current[k], 0);

  const result = { ...current, [changedKey]: clamped };

  if (othersSum === 0) {
    const each = Math.floor(remaining / others.length);
    others.forEach((k, i) => {
      result[k] = i === others.length - 1 ? remaining - each * (others.length - 1) : each;
    });
  } else {
    let distributed = 0;
    others.forEach((k, i) => {
      if (i === others.length - 1) {
        result[k] = remaining - distributed;
      } else {
        result[k] = Math.round((current[k] / othersSum) * remaining);
        distributed += result[k];
      }
    });
  }
  return result;
}

// ============================================
// Weight Distribution Bar — visual summary
// ============================================
function WeightBar({ weights }) {
  return (
    <div className="flex h-2.5 rounded-full overflow-hidden bg-base-300">
      {PILLAR_ORDER.map((key) => (
        <div
          key={key}
          style={{
            width: `${weights[key]}%`,
            backgroundColor: PILLAR_META[key].color,
            transition: "width 0.3s ease",
          }}
        />
      ))}
    </div>
  );
}

// ============================================
// Mini Score Circle — preview
// ============================================
function MiniScoreCircle({ score, size = 64 }) {
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;
  const color = getScoreColor(score);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-base-300"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          stroke={color}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 0.4s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold" style={{ color }}>{score}</span>
      </div>
    </div>
  );
}

// ============================================
// Preview Panel — shows before/after comparison
// ============================================
function PreviewPanel({ weights }) {
  // Example product with varied pillar scores
  const example = { s: 85, a: 60, f: 40, e: 78 };

  const equalScore = Math.round((example.s + example.a + example.f + example.e) / 4);

  const totalW = weights.s + weights.a + weights.f + weights.e;
  const customScore = totalW > 0
    ? Math.round((example.s * weights.s + example.a * weights.a + example.f * weights.f + example.e * weights.e) / totalW)
    : 0;

  const diff = customScore - equalScore;

  return (
    <div className="p-4 rounded-xl bg-base-300/30 border border-base-content/5">
      <div className="text-[10px] uppercase tracking-wider text-base-content/40 mb-3">
        Live Preview
      </div>

      {/* Example pillar scores */}
      <div className="flex gap-3 mb-3">
        {PILLAR_ORDER.map((key) => (
          <div key={key} className="flex items-center gap-1">
            <span className="text-[10px] font-bold" style={{ color: PILLAR_META[key].color }}>
              {PILLAR_META[key].code}
            </span>
            <span className="text-xs text-base-content/60">{example[key]}</span>
          </div>
        ))}
      </div>

      {/* Before / After */}
      <div className="flex items-center gap-6">
        <div className="flex flex-col items-center">
          <div className="text-[9px] text-base-content/40 mb-1">Default</div>
          <MiniScoreCircle score={equalScore} size={52} />
        </div>

        <div className="text-base-content/20 text-lg">&rarr;</div>

        <div className="flex flex-col items-center">
          <div className="text-[9px] text-primary mb-1">Your weights</div>
          <MiniScoreCircle score={customScore} size={52} />
        </div>

        {diff !== 0 && (
          <div className={`text-sm font-bold ${diff > 0 ? "text-green-400" : "text-red-400"}`}>
            {diff > 0 ? "+" : ""}{diff}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// Setup Card
// ============================================
function SetupCard({ setup, onSave, onDelete, onActivate, isNew }) {
  const [name, setName] = useState(setup?.name || "My Setup");
  const [weights, setWeights] = useState({
    s: setup?.weight_s ?? 25,
    a: setup?.weight_a ?? 25,
    f: setup?.weight_f ?? 25,
    e: setup?.weight_e ?? 25,
  });
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(isNew);

  const handleSliderChange = (key, value) => {
    setWeights(adjustWeights(weights, key, value));
    setDirty(true);
  };

  const applyPreset = (preset) => {
    setWeights({ s: preset.s, a: preset.a, f: preset.f, e: preset.e });
    setName(preset.name);
    setDirty(true);
  };

  const handleSave = async () => {
    if (weights.s + weights.a + weights.f + weights.e !== 100) {
      toast.error("Weights must sum to 100");
      return;
    }
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        id: setup?.id,
        name: name.trim(),
        weight_s: weights.s,
        weight_a: weights.a,
        weight_f: weights.f,
        weight_e: weights.e,
      });
      setDirty(false);
    } catch (err) {
      toast.error(err.message || "Failed to save");
    }
    setSaving(false);
  };

  return (
    <div
      className={`relative p-5 rounded-2xl border transition-all ${
        setup?.is_active
          ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
          : "border-base-content/10 bg-base-200/50"
      }`}
    >
      {/* Active badge */}
      {setup?.is_active && (
        <div className="absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full bg-primary text-primary-content text-[10px] font-bold uppercase tracking-wider">
          Active
        </div>
      )}

      {/* Name input */}
      <input
        type="text"
        value={name}
        onChange={(e) => { setName(e.target.value.slice(0, 50)); setDirty(true); }}
        placeholder="Setup name"
        maxLength={50}
        className="input input-ghost input-sm w-full font-bold text-lg mb-2 px-0 focus:outline-none"
      />

      {/* Weight distribution bar */}
      <WeightBar weights={weights} />

      {/* Presets */}
      <div className="flex flex-wrap gap-1.5 mt-3">
        {PRESETS.map((preset) => (
          <button
            key={preset.name}
            onClick={() => applyPreset(preset)}
            className="px-3 py-1.5 rounded-md text-xs bg-base-300/70 hover:bg-base-300 text-base-content/60 hover:text-base-content transition-colors"
            data-tooltip-id="tooltip"
            data-tooltip-content={preset.desc}
          >
            {preset.name}
          </button>
        ))}
      </div>

      {/* Sliders */}
      <div className="space-y-2.5 mt-4">
        {PILLAR_ORDER.map((key) => {
          const p = PILLAR_META[key];
          return (
            <div key={key}>
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black" style={{ color: p.color }}>
                    {p.code}
                  </span>
                  <span className="text-[11px] text-base-content/50">{p.label}</span>
                </div>
                <span className="text-xs font-mono font-bold tabular-nums min-w-[32px] text-right" style={{ color: p.color }}>
                  {weights[key]}%
                </span>
              </div>
              <div style={{ touchAction: "none" }}>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={weights[key]}
                  onChange={(e) => handleSliderChange(key, parseInt(e.target.value, 10))}
                  className="range range-sm w-full"
                  style={{ accentColor: p.color }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Live preview */}
      <div className="mt-4">
        <PreviewPanel weights={weights} />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-4">
        <button
          onClick={handleSave}
          disabled={!dirty || saving}
          className={`btn btn-sm flex-1 ${dirty ? "btn-primary" : "btn-ghost"}`}
        >
          {saving ? <span className="loading loading-spinner loading-xs" /> : isNew ? "Create" : "Save"}
        </button>

        {!isNew && (
          <button
            onClick={() => onActivate(setup?.is_active ? null : setup.id)}
            className={`btn btn-sm btn-outline ${setup?.is_active ? "btn-warning" : "btn-success"}`}
          >
            {setup?.is_active ? "Deactivate" : "Activate"}
          </button>
        )}

        {!isNew && (
          <button
            onClick={() => onDelete(setup.id)}
            className="btn btn-sm btn-ghost text-error"
            data-tooltip-id="tooltip"
            data-tooltip-content="Delete this setup"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </button>
        )}

        {isNew && (
          <button onClick={() => onDelete(null)} className="btn btn-sm btn-ghost">
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================
// Main Page
// ============================================
export default function ScoringSetupsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { refetch } = useScoringSetup();

  const [setups, setSetups] = useState([]);
  const [limits, setLimits] = useState({ max: 1, used: 0, canCreate: true });
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  const fetchSetups = useCallback(async () => {
    try {
      const res = await fetch("/api/user/scoring-setups");
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.success) {
        setSetups(data.setups || []);
        setLimits(data.limits || { max: 1, used: 0, canCreate: true });
      }
    } catch {
      toast.error("Failed to load scoring setups");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status === "authenticated") fetchSetups();
    else if (status === "unauthenticated") setLoading(false);
  }, [status, fetchSetups]);

  const handleSave = async (payload) => {
    const isNew = !payload.id;
    const res = await fetch("/api/user/scoring-setups", {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to save");
    toast.success(isNew ? "Setup created" : "Setup saved");
    setShowNew(false);
    await fetchSetups();
    refetch();
  };

  const handleDelete = async (id) => {
    if (!id) { setShowNew(false); return; } // Cancel new
    if (!confirm("Delete this scoring setup?")) return;
    const res = await fetch(`/api/user/scoring-setups?id=${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Failed to delete"); return; }
    toast.success("Setup deleted");
    await fetchSetups();
    refetch();
  };

  const handleActivate = async (id) => {
    try {
      if (id) {
        await fetch("/api/user/scoring-setups", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, is_active: true }),
        });
        toast.success("Activated — all scores now use your custom weights");
      } else {
        const active = setups.find((s) => s.is_active);
        if (active) {
          await fetch("/api/user/scoring-setups", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: active.id, is_active: false }),
          });
        }
        toast.success("Back to default weights (25/25/25/25)");
      }
      await fetchSetups();
      refetch();
    } catch {
      toast.error("Failed to update");
    }
  };

  // Not authenticated
  if (status === "unauthenticated") {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-bold mb-2">Custom Scoring Weights</h2>
        <p className="text-base-content/60 mb-6 max-w-md mx-auto">
          What matters more to you — Security? Usability? Physical durability?
          Create your own scoring profile to see scores your way.
        </p>
        <button onClick={() => router.push("/api/auth/signin")} className="btn btn-primary">
          Sign In to Get Started
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Custom Scoring Weights</h1>
        <p className="text-base-content/60 mt-1 max-w-xl">
          Adjust how much each pillar matters to you. Your weights are applied in real-time across all product scores.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <span className="loading loading-spinner loading-lg" />
        </div>
      ) : (
        <>
          {/* Empty state */}
          {setups.length === 0 && !showNew && (
            <div className="text-center py-12 rounded-2xl border border-dashed border-base-content/10">
              <div className="text-4xl mb-3">&#x2696;&#xFE0F;</div>
              <h3 className="text-lg font-bold mb-1">No scoring setups yet</h3>
              <p className="text-sm text-base-content/50 mb-4 max-w-sm mx-auto">
                By default, all four pillars have equal weight (25% each).
                Create a setup to prioritize what matters most to you.
              </p>
              <button onClick={() => setShowNew(true)} className="btn btn-primary btn-sm">
                Create Your First Setup
              </button>
            </div>
          )}

          {/* Setup cards */}
          {(setups.length > 0 || showNew) && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {setups.map((setup) => (
                <SetupCard
                  key={setup.id}
                  setup={setup}
                  onSave={handleSave}
                  onDelete={handleDelete}
                  onActivate={handleActivate}
                />
              ))}

              {showNew && (
                <SetupCard
                  isNew
                  onSave={handleSave}
                  onDelete={() => setShowNew(false)}
                  onActivate={() => {}}
                />
              )}
            </div>
          )}

          {/* Add button */}
          {!showNew && setups.length > 0 && (
            <div className="mt-6 flex items-center justify-between">
              {limits.canCreate ? (
                <button onClick={() => setShowNew(true)} className="btn btn-outline btn-primary btn-sm gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  New Setup
                </button>
              ) : (
                <div className="text-sm text-base-content/50">
                  Limit reached ({limits.max}).{" "}
                  <button onClick={() => router.push("/#pricing")} className="text-primary underline">
                    Upgrade
                  </button>
                </div>
              )}
              <div className="text-xs text-base-content/40">
                {limits.used}/{limits.max === -1 ? "\u221E" : limits.max} setups
              </div>
            </div>
          )}

          {/* How it works — simple version */}
          <div className="mt-10 p-5 rounded-2xl bg-base-200/30 border border-base-content/5">
            <h3 className="text-sm font-bold mb-3">How it works</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-base-content/60">
              <div>
                <div className="font-bold text-base-content/80 mb-1">1. Set your priorities</div>
                Move the sliders to give more weight to pillars you care about.
                Use a preset as a starting point.
              </div>
              <div>
                <div className="font-bold text-base-content/80 mb-1">2. Activate</div>
                Hit Activate on the setup you want to use. Only one can be active at a time.
              </div>
              <div>
                <div className="font-bold text-base-content/80 mb-1">3. See your scores</div>
                Every SAFE score across the site updates instantly based on your weights.
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
