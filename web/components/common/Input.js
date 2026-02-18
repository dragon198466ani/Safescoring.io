"use client";

import { forwardRef, memo } from "react";

/**
 * Unified Input Components
 *
 * Single source of truth for all form input implementations.
 * Uses DaisyUI classes with consistent styling.
 */

/**
 * Input - Text input with label and error handling
 */
export const Input = forwardRef(function Input(
  {
    label,
    error,
    hint,
    leftIcon,
    rightIcon,
    size = "md",
    variant = "bordered",
    fullWidth = true,
    className = "",
    ...props
  },
  ref
) {
  const sizeClasses = {
    sm: "input-sm",
    md: "",
    lg: "input-lg",
  };

  const variantClasses = {
    bordered: "input-bordered",
    ghost: "input-ghost",
    primary: "input-bordered input-primary",
    error: "input-bordered input-error",
  };

  const inputClass = `input ${variantClasses[error ? "error" : variant]} ${sizeClasses[size]} ${fullWidth ? "w-full" : ""} ${leftIcon ? "pl-10" : ""} ${rightIcon ? "pr-10" : ""} ${className}`;

  return (
    <div className={fullWidth ? "w-full" : ""}>
      {label && (
        <label className="label">
          <span className="label-text">{label}</span>
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50">
            {leftIcon}
          </span>
        )}
        <input ref={ref} className={inputClass} {...props} />
        {rightIcon && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/50">
            {rightIcon}
          </span>
        )}
      </div>
      {(error || hint) && (
        <label className="label">
          <span className={`label-text-alt ${error ? "text-error" : ""}`}>
            {error || hint}
          </span>
        </label>
      )}
    </div>
  );
});

/**
 * Textarea - Multi-line text input
 */
export const Textarea = forwardRef(function Textarea(
  {
    label,
    error,
    hint,
    size = "md",
    variant = "bordered",
    fullWidth = true,
    className = "",
    rows = 4,
    ...props
  },
  ref
) {
  const sizeClasses = {
    sm: "textarea-sm",
    md: "",
    lg: "textarea-lg",
  };

  const variantClasses = {
    bordered: "textarea-bordered",
    ghost: "textarea-ghost",
    primary: "textarea-bordered textarea-primary",
    error: "textarea-bordered textarea-error",
  };

  const textareaClass = `textarea ${variantClasses[error ? "error" : variant]} ${sizeClasses[size]} ${fullWidth ? "w-full" : ""} ${className}`;

  return (
    <div className={fullWidth ? "w-full" : ""}>
      {label && (
        <label className="label">
          <span className="label-text">{label}</span>
        </label>
      )}
      <textarea ref={ref} className={textareaClass} rows={rows} {...props} />
      {(error || hint) && (
        <label className="label">
          <span className={`label-text-alt ${error ? "text-error" : ""}`}>
            {error || hint}
          </span>
        </label>
      )}
    </div>
  );
});

/**
 * Select - Dropdown select input
 */
export const Select = forwardRef(function Select(
  {
    label,
    error,
    hint,
    options = [],
    placeholder = "Select an option",
    size = "md",
    variant = "bordered",
    fullWidth = true,
    className = "",
    ...props
  },
  ref
) {
  const sizeClasses = {
    sm: "select-sm",
    md: "",
    lg: "select-lg",
  };

  const variantClasses = {
    bordered: "select-bordered",
    ghost: "select-ghost",
    primary: "select-bordered select-primary",
    error: "select-bordered select-error",
  };

  const selectClass = `select ${variantClasses[error ? "error" : variant]} ${sizeClasses[size]} ${fullWidth ? "w-full" : ""} ${className}`;

  return (
    <div className={fullWidth ? "w-full" : ""}>
      {label && (
        <label className="label">
          <span className="label-text">{label}</span>
        </label>
      )}
      <select ref={ref} className={selectClass} {...props}>
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
      {(error || hint) && (
        <label className="label">
          <span className={`label-text-alt ${error ? "text-error" : ""}`}>
            {error || hint}
          </span>
        </label>
      )}
    </div>
  );
});

/**
 * Checkbox - Single checkbox input
 */
export const Checkbox = memo(forwardRef(function Checkbox(
  {
    label,
    error,
    size = "md",
    variant = "primary",
    className = "",
    ...props
  },
  ref
) {
  const sizeClasses = {
    sm: "checkbox-sm",
    md: "",
    lg: "checkbox-lg",
  };

  const variantClasses = {
    primary: "checkbox-primary",
    secondary: "checkbox-secondary",
    accent: "checkbox-accent",
    success: "checkbox-success",
    warning: "checkbox-warning",
    error: "checkbox-error",
  };

  return (
    <label className={`flex items-center gap-2 cursor-pointer ${className}`}>
      <input
        ref={ref}
        type="checkbox"
        className={`checkbox ${variantClasses[variant]} ${sizeClasses[size]}`}
        {...props}
      />
      {label && <span className="label-text">{label}</span>}
    </label>
  );
}));

/**
 * Toggle - Switch toggle input
 */
export const Toggle = memo(forwardRef(function Toggle(
  {
    label,
    labelPosition = "right",
    size = "md",
    variant = "primary",
    className = "",
    ...props
  },
  ref
) {
  const sizeClasses = {
    sm: "toggle-sm",
    md: "",
    lg: "toggle-lg",
  };

  const variantClasses = {
    primary: "toggle-primary",
    secondary: "toggle-secondary",
    accent: "toggle-accent",
    success: "toggle-success",
    warning: "toggle-warning",
    error: "toggle-error",
  };

  return (
    <label className={`flex items-center gap-2 cursor-pointer ${className}`}>
      {label && labelPosition === "left" && (
        <span className="label-text">{label}</span>
      )}
      <input
        ref={ref}
        type="checkbox"
        className={`toggle ${variantClasses[variant]} ${sizeClasses[size]}`}
        {...props}
      />
      {label && labelPosition === "right" && (
        <span className="label-text">{label}</span>
      )}
    </label>
  );
}));

/**
 * SearchInput - Specialized search input with icon
 */
export const SearchInput = forwardRef(function SearchInput(
  { placeholder = "Search...", onClear, value, className = "", ...props },
  ref
) {
  return (
    <Input
      ref={ref}
      type="search"
      placeholder={placeholder}
      value={value}
      leftIcon={
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-5 h-5"
        >
          <path
            fillRule="evenodd"
            d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
            clipRule="evenodd"
          />
        </svg>
      }
      rightIcon={
        value && onClear ? (
          <button
            type="button"
            onClick={onClear}
            className="btn btn-ghost btn-xs btn-circle"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4"
            >
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        ) : null
      }
      className={className}
      {...props}
    />
  );
});

/**
 * FormGroup - Group multiple inputs together
 */
export function FormGroup({ children, label, error, hint, className = "" }) {
  return (
    <div className={`space-y-4 ${className}`}>
      {label && <h4 className="font-medium text-base-content">{label}</h4>}
      {children}
      {(error || hint) && (
        <p className={`text-sm ${error ? "text-error" : "text-base-content/60"}`}>
          {error || hint}
        </p>
      )}
    </div>
  );
}

export default Input;
