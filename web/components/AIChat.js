"use client";

/**
 * AIChat - Placeholder for AI chat assistant
 */
export default function AIChat({ isOpen, onToggle }) {
  if (!isOpen) return null;

  return (
    <div className="fixed bottom-20 right-6 z-50 w-80 rounded-2xl bg-base-200 border border-base-300 shadow-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">AI Assistant</h3>
        <button onClick={onToggle} className="btn btn-ghost btn-xs">
          X
        </button>
      </div>
      <p className="text-sm text-base-content/60">
        AI chat coming soon. Ask questions about product security scores.
      </p>
    </div>
  );
}
