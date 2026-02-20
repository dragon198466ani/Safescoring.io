"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

/**
 * Tooltip Component - Touch & Tablet Friendly
 * 
 * Supports hover (desktop) and tap (touch devices).
 * Automatically positions to stay within viewport.
 * 
 * @example
 * <Tooltip content="This is helpful info">
 *   <button>Hover or tap me</button>
 * </Tooltip>
 * 
 * @example
 * <Tooltip 
 *   content={<div>Rich <strong>HTML</strong> content</div>}
 *   position="top"
 *   delay={200}
 * >
 *   <span>Info icon</span>
 * </Tooltip>
 */
export default function Tooltip({
  children,
  content,
  position = "top",
  delay = 100,
  className = "",
  touchable = true,
  disabled = false,
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const padding = 8;

    let x, y;

    switch (position) {
      case "top":
        x = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
        y = triggerRect.top - tooltipRect.height - padding;
        break;
      case "bottom":
        x = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
        y = triggerRect.bottom + padding;
        break;
      case "left":
        x = triggerRect.left - tooltipRect.width - padding;
        y = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
        break;
      case "right":
        x = triggerRect.right + padding;
        y = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
        break;
      default:
        x = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
        y = triggerRect.top - tooltipRect.height - padding;
    }

    // Keep within viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (x < padding) x = padding;
    if (x + tooltipRect.width > viewportWidth - padding) {
      x = viewportWidth - tooltipRect.width - padding;
    }
    if (y < padding) {
      // Flip to bottom if not enough space on top
      y = triggerRect.bottom + padding;
    }
    if (y + tooltipRect.height > viewportHeight - padding) {
      y = viewportHeight - tooltipRect.height - padding;
    }

    setCoords({ x, y });
  }, [position]);

  const showTooltip = useCallback(() => {
    if (disabled) return;
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  }, [delay, disabled]);

  const hideTooltip = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  }, []);

  // Handle touch events for tablets
  const handleTouch = useCallback((e) => {
    if (!touchable || disabled) return;
    e.preventDefault();
    if (isVisible) {
      hideTooltip();
    } else {
      setIsVisible(true);
    }
  }, [touchable, disabled, isVisible, hideTooltip]);

  // Recalculate position when visible
  useEffect(() => {
    if (isVisible) {
      // Small delay to ensure tooltip is rendered
      requestAnimationFrame(calculatePosition);
    }
  }, [isVisible, calculatePosition]);

  // Close on scroll or resize
  useEffect(() => {
    if (!isVisible) return;

    const handleScroll = () => hideTooltip();
    const handleResize = () => calculatePosition();

    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [isVisible, hideTooltip, calculatePosition]);

  // Close on outside click (for touch)
  useEffect(() => {
    if (!isVisible || !touchable) return;

    const handleClickOutside = (e) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target) &&
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target)
      ) {
        hideTooltip();
      }
    };

    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isVisible, touchable, hideTooltip]);

  if (!content) return children;

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onTouchStart={handleTouch}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        className="inline-flex"
        role="button"
        tabIndex={0}
        aria-describedby={isVisible ? "tooltip" : undefined}
      >
        {children}
      </span>

      {mounted && isVisible && createPortal(
        <div
          ref={tooltipRef}
          id="tooltip"
          role="tooltip"
          className={`
            fixed z-[9999] px-3 py-2 text-sm
            bg-base-300 text-base-content
            rounded-lg shadow-xl border border-base-content/10
            animate-in fade-in zoom-in-95 duration-150
            max-w-xs break-words
            ${className}
          `}
          style={{
            left: coords.x,
            top: coords.y,
          }}
        >
          {content}
          {/* Arrow indicator */}
          <div
            className={`
              absolute w-2 h-2 bg-base-300 border-base-content/10 rotate-45
              ${position === "top" ? "bottom-[-5px] left-1/2 -translate-x-1/2 border-r border-b" : ""}
              ${position === "bottom" ? "top-[-5px] left-1/2 -translate-x-1/2 border-l border-t" : ""}
              ${position === "left" ? "right-[-5px] top-1/2 -translate-y-1/2 border-t border-r" : ""}
              ${position === "right" ? "left-[-5px] top-1/2 -translate-y-1/2 border-b border-l" : ""}
            `}
          />
        </div>,
        document.body
      )}
    </>
  );
}

/**
 * InfoTooltip - Quick info icon with tooltip
 * 
 * @example
 * <InfoTooltip content="This explains the feature" />
 */
export function InfoTooltip({ content, size = "md", className = "" }) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  return (
    <Tooltip content={content}>
      <span className={`inline-flex items-center justify-center text-base-content/50 hover:text-primary transition-colors cursor-help ${className}`}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className={sizeClasses[size] || sizeClasses.md}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
          />
        </svg>
      </span>
    </Tooltip>
  );
}

/**
 * HelpBubble - Floating help bubble for onboarding/guidance
 * 
 * @example
 * <HelpBubble 
 *   title="Getting Started"
 *   content="Click here to create your first setup"
 *   position="bottom-right"
 *   onDismiss={() => setShowHelp(false)}
 * />
 */
export function HelpBubble({
  title,
  content,
  position = "bottom-right",
  onDismiss,
  show = true,
  pulse = true,
  className = "",
}) {
  if (!show) return null;

  const positionClasses = {
    "top-left": "top-4 left-4",
    "top-right": "top-4 right-4",
    "bottom-left": "bottom-4 left-4",
    "bottom-right": "bottom-4 right-4",
    "top-center": "top-4 left-1/2 -translate-x-1/2",
    "bottom-center": "bottom-4 left-1/2 -translate-x-1/2",
  };

  return (
    <div
      className={`
        fixed z-50 max-w-sm p-4
        bg-primary text-primary-content
        rounded-2xl shadow-2xl
        animate-in slide-in-from-bottom-4 fade-in duration-300
        ${positionClasses[position] || positionClasses["bottom-right"]}
        ${pulse ? "animate-pulse-subtle" : ""}
        ${className}
      `}
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 p-2 bg-primary-content/20 rounded-xl">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-5 h-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"
            />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          {title && (
            <h4 className="font-semibold text-sm mb-1">{title}</h4>
          )}
          <p className="text-sm opacity-90">{content}</p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="shrink-0 p-1 hover:bg-primary-content/20 rounded-lg transition-colors"
            aria-label="Dismiss"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-4 h-4"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
