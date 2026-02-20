"use client";

import React, { forwardRef } from "react";

/**
 * Unified Button Component
 *
 * Single source of truth for all button implementations.
 * Uses DaisyUI classes with consistent loading states.
 *
 * @example
 * <Button variant="primary" loading={isSubmitting}>
 *   Save Changes
 * </Button>
 *
 * @example
 * <Button variant="outline" icon={<PlusIcon />} iconPosition="left">
 *   Add Item
 * </Button>
 */
const Button = forwardRef(function Button(
  {
    children,
    variant = "primary",
    size = "md",
    loading = false,
    loadingText = null, // Optional text to show while loading (default: show children)
    disabled = false,
    icon = null,
    iconPosition = "left",
    fullWidth = false,
    className = "",
    type = "button",
    ...props
  },
  ref
) {
  // Variant classes
  const variantClasses = {
    primary: "btn-primary",
    secondary: "btn-secondary",
    accent: "btn-accent",
    success: "btn-success",
    warning: "btn-warning",
    error: "btn-error",
    info: "btn-info",
    outline: "btn-outline",
    ghost: "btn-ghost",
    link: "btn-link",
    neutral: "btn-neutral",
  };

  // Size classes
  const sizeClasses = {
    xs: "btn-xs",
    sm: "btn-sm",
    md: "",
    lg: "btn-lg",
  };

  // Spinner size based on button size
  const spinnerSizes = {
    xs: "loading-xs",
    sm: "loading-xs",
    md: "loading-sm",
    lg: "loading-md",
  };

  const variantClass = variantClasses[variant] || variantClasses.primary;
  const sizeClass = sizeClasses[size] || "";
  const spinnerSize = spinnerSizes[size] || "loading-sm";
  const widthClass = fullWidth ? "w-full" : "";

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={`btn ${variantClass} ${sizeClass} ${widthClass} ${className}`.trim()}
      {...props}
    >
      {loading ? (
        <>
          <span className={`loading loading-spinner ${spinnerSize}`} />
          {loadingText || children}
        </>
      ) : (
        <>
          {icon && iconPosition === "left" && (
            <span className="shrink-0">{icon}</span>
          )}
          {children}
          {icon && iconPosition === "right" && (
            <span className="shrink-0">{icon}</span>
          )}
        </>
      )}
    </button>
  );
});

/**
 * IconButton - Square icon-only button
 *
 * @example
 * <IconButton variant="ghost" aria-label="Close">
 *   <XIcon className="w-5 h-5" />
 * </IconButton>
 */
export function IconButton({
  children,
  variant = "ghost",
  size = "md",
  loading = false,
  disabled = false,
  className = "",
  ...props
}) {
  const variantClasses = {
    primary: "btn-primary",
    secondary: "btn-secondary",
    ghost: "btn-ghost",
    outline: "btn-outline",
    error: "btn-error",
    warning: "btn-warning",
    success: "btn-success",
    info: "btn-info",
  };

  const sizeClasses = {
    xs: "btn-xs",
    sm: "btn-sm",
    md: "",
    lg: "btn-lg",
  };

  const spinnerSizes = {
    xs: "loading-xs",
    sm: "loading-xs",
    md: "loading-sm",
    lg: "loading-md",
  };

  return (
    <button
      disabled={disabled || loading}
      className={`btn btn-square ${variantClasses[variant] || ""} ${sizeClasses[size] || ""} ${className}`.trim()}
      {...props}
    >
      {loading ? (
        <span className={`loading loading-spinner ${spinnerSizes[size]}`} />
      ) : (
        children
      )}
    </button>
  );
}

/**
 * CircleButton - Circular button (for floating actions, etc.)
 */
export function CircleButton({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  className = "",
  ...props
}) {
  const variantClasses = {
    primary: "btn-primary",
    secondary: "btn-secondary",
    ghost: "btn-ghost",
    outline: "btn-outline",
    error: "btn-error",
  };

  const sizeClasses = {
    sm: "btn-sm",
    md: "",
    lg: "btn-lg",
  };

  const spinnerSizes = {
    sm: "loading-xs",
    md: "loading-sm",
    lg: "loading-md",
  };

  return (
    <button
      disabled={disabled || loading}
      className={`btn btn-circle ${variantClasses[variant] || ""} ${sizeClasses[size] || ""} ${className}`.trim()}
      {...props}
    >
      {loading ? (
        <span className={`loading loading-spinner ${spinnerSizes[size]}`} />
      ) : (
        children
      )}
    </button>
  );
}

/**
 * ButtonGroup - Group of buttons with joined borders
 */
export function ButtonGroup({ children, className = "" }) {
  return (
    <div className={`join ${className}`}>
      {children}
    </div>
  );
}

/**
 * LinkButton - Button styled as a link (inline text action)
 */
export function LinkButton({
  children,
  loading = false,
  disabled = false,
  className = "",
  ...props
}) {
  return (
    <button
      disabled={disabled || loading}
      className={`btn btn-link ${className}`.trim()}
      {...props}
    >
      {loading ? (
        <>
          <span className="loading loading-spinner loading-xs" />
          {children}
        </>
      ) : (
        children
      )}
    </button>
  );
}

/**
 * AsyncButton - Button with built-in async handling
 *
 * Automatically handles loading state during async onClick operations
 *
 * @example
 * <AsyncButton onClick={async () => await saveData()}>
 *   Save
 * </AsyncButton>
 */
export function AsyncButton({
  children,
  onClick,
  loadingText = null,
  ...props
}) {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleClick = async (e) => {
    if (!onClick) return;
    setIsLoading(true);
    try {
      await onClick(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      {...props}
      loading={isLoading}
      loadingText={loadingText}
      onClick={handleClick}
    >
      {children}
    </Button>
  );
}

export default Button;
