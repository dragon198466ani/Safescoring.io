"use client";

import { getStatusColorClasses } from "@/libs/design-tokens";

/**
 * Alert - Reusable alert/message component
 *
 * Use this for all success, error, warning, and info messages
 * instead of duplicating markup across components.
 */

/**
 * Alert component
 *
 * @param {string} type - 'success' | 'error' | 'warning' | 'info'
 * @param {string} title - Alert title (optional)
 * @param {React.ReactNode} children - Alert content
 * @param {boolean} dismissible - Show close button
 * @param {function} onDismiss - Close callback
 * @param {string} className - Additional classes
 */
export default function Alert({
  type = "info",
  title,
  children,
  dismissible = false,
  onDismiss,
  className = "",
  icon,
}) {
  const colors = getStatusColorClasses(type);

  // Default icons by type
  const defaultIcons = {
    success: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    ),
    error: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    ),
    warning: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    ),
    info: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    ),
  };

  return (
    <div
      className={`
        rounded-lg p-4 ${colors.bg} ${colors.border} border
        ${className}
      `}
      role="alert"
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <span className={`flex-shrink-0 ${colors.icon}`}>
          {icon || defaultIcons[type]}
        </span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {title && (
            <h4 className={`font-medium ${colors.text} mb-1`}>{title}</h4>
          )}
          <div className={`text-sm ${colors.text} opacity-90`}>{children}</div>
        </div>

        {/* Dismiss button */}
        {dismissible && onDismiss && (
          <button
            onClick={onDismiss}
            className={`flex-shrink-0 ${colors.text} opacity-70 hover:opacity-100 transition-opacity`}
            aria-label="Dismiss"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Success Alert
 */
export function SuccessAlert({ children, ...props }) {
  return <Alert type="success" {...props}>{children}</Alert>;
}

/**
 * Error Alert
 */
export function ErrorAlert({ children, ...props }) {
  return <Alert type="error" {...props}>{children}</Alert>;
}

/**
 * Warning Alert
 */
export function WarningAlert({ children, ...props }) {
  return <Alert type="warning" {...props}>{children}</Alert>;
}

/**
 * Info Alert
 */
export function InfoAlert({ children, ...props }) {
  return <Alert type="info" {...props}>{children}</Alert>;
}

/**
 * Inline alert (smaller, for form fields)
 */
export function InlineAlert({ type = "error", children, className = "" }) {
  const colors = getStatusColorClasses(type);

  return (
    <p className={`text-sm ${colors.text} flex items-center gap-1 ${className}`}>
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      {children}
    </p>
  );
}
