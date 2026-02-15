"use client";

const AIChat = ({ products, isOpen, onToggle }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 w-96 max-h-[500px] bg-base-100 border border-base-300 rounded-2xl shadow-2xl z-50 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-base-300">
        <span className="font-semibold text-sm">AI Assistant</span>
        <button onClick={onToggle} className="btn btn-ghost btn-xs btn-circle">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>
      </div>
      <div className="flex-1 p-4 text-sm text-base-content/60">
        <p>AI chat coming soon. {products?.length || 0} products available for analysis.</p>
      </div>
    </div>
  );
};

export default AIChat;
