"use client";

const ShareButtons = ({ url, title, type }) => {
  const fullUrl = typeof window !== "undefined" ? `${window.location.origin}${url}` : url;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-base-content/50">Share:</span>
      <a
        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(fullUrl)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-ghost btn-xs btn-circle"
        title="Share on X"
      >
        𝕏
      </a>
    </div>
  );
};

export default ShareButtons;
