"use client";

import { forwardRef } from 'react';
import Link from 'next/link';

/**
 * Touch-optimized button with proper sizing and feedback
 */
export const TouchButton = forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  icon,
  iconPosition = 'left',
  className = '',
  ...props
}, ref) => {
  const sizes = {
    sm: 'min-h-[40px] px-4 text-sm gap-2',
    md: 'min-h-[48px] px-6 text-base gap-2',
    lg: 'min-h-[56px] px-8 text-lg gap-3'
  };

  const variants = {
    primary: 'bg-primary text-primary-content hover:bg-primary/90',
    secondary: 'bg-secondary text-secondary-content hover:bg-secondary/90',
    outline: 'border-2 border-current hover:bg-base-200',
    ghost: 'hover:bg-base-200',
    danger: 'bg-error text-error-content hover:bg-error/90'
  };

  return (
    <button
      ref={ref}
      className={`
        ${sizes[size]}
        ${variants[variant]}
        ${fullWidth ? 'w-full' : ''}
        inline-flex items-center justify-center
        touch-manipulation select-none
        active:scale-[0.97] transition-all duration-150
        rounded-xl font-medium
        disabled:opacity-50 disabled:cursor-not-allowed
        focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-base-100
        ${className}
      `}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && (
        <span className="loading loading-spinner loading-sm" />
      )}
      {!loading && icon && iconPosition === 'left' && (
        <span className="flex-shrink-0">{icon}</span>
      )}
      <span>{children}</span>
      {!loading && icon && iconPosition === 'right' && (
        <span className="flex-shrink-0">{icon}</span>
      )}
    </button>
  );
});

TouchButton.displayName = 'TouchButton';

/**
 * Touch-optimized link button
 */
export const TouchLink = forwardRef(({
  children,
  href,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  icon,
  iconPosition = 'left',
  className = '',
  external = false,
  ...props
}, ref) => {
  const sizes = {
    sm: 'min-h-[40px] px-4 text-sm gap-2',
    md: 'min-h-[48px] px-6 text-base gap-2',
    lg: 'min-h-[56px] px-8 text-lg gap-3'
  };

  const variants = {
    primary: 'bg-primary text-primary-content hover:bg-primary/90',
    secondary: 'bg-secondary text-secondary-content hover:bg-secondary/90',
    outline: 'border-2 border-current hover:bg-base-200',
    ghost: 'hover:bg-base-200',
  };

  const linkProps = external ? {
    target: "_blank",
    rel: "noopener noreferrer"
  } : {};

  const content = (
    <>
      {icon && iconPosition === 'left' && (
        <span className="flex-shrink-0">{icon}</span>
      )}
      <span>{children}</span>
      {icon && iconPosition === 'right' && (
        <span className="flex-shrink-0">{icon}</span>
      )}
      {external && (
        <svg className="w-4 h-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
          />
        </svg>
      )}
    </>
  );

  const classNames = `
    ${sizes[size]}
    ${variants[variant]}
    ${fullWidth ? 'w-full' : ''}
    inline-flex items-center justify-center
    touch-manipulation select-none no-underline
    active:scale-[0.97] transition-all duration-150
    rounded-xl font-medium
    focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-base-100
    ${className}
  `;

  if (external || href?.startsWith('http')) {
    return (
      <a
        ref={ref}
        href={href}
        className={classNames}
        {...linkProps}
        {...props}
      >
        {content}
      </a>
    );
  }

  return (
    <Link
      ref={ref}
      href={href}
      className={classNames}
      {...props}
    >
      {content}
    </Link>
  );
});

TouchLink.displayName = 'TouchLink';

/**
 * Touch-optimized card with interaction feedback
 */
export const TouchCard = forwardRef(({
  children,
  onClick,
  href,
  padding = 'md',
  hover = true,
  className = '',
  ...props
}, ref) => {
  const paddings = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  };

  const baseClasses = `
    relative block
    ${paddings[padding]}
    rounded-2xl
    bg-base-200/30 border border-base-300
    transition-all duration-200
    touch-manipulation
    ${hover && (onClick || href) ? `
      cursor-pointer
      hover:border-primary/30 hover:bg-base-200/50 hover:shadow-lg
      active:scale-[0.99] active:shadow-md
    ` : ''}
    ${className}
  `;

  if (href) {
    return (
      <Link ref={ref} href={href} className={baseClasses} {...props}>
        {children}
      </Link>
    );
  }

  return (
    <div
      ref={ref}
      onClick={onClick}
      className={baseClasses}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(e);
        }
      } : undefined}
      {...props}
    >
      {children}
    </div>
  );
});

TouchCard.displayName = 'TouchCard';

/**
 * Touch-optimized input field
 */
export const TouchInput = forwardRef(({
  label,
  error,
  hint,
  icon,
  size = 'md',
  fullWidth = true,
  className = '',
  ...props
}, ref) => {
  const sizes = {
    sm: 'min-h-[40px] px-3 text-sm',
    md: 'min-h-[48px] px-4 text-base',
    lg: 'min-h-[56px] px-5 text-lg'
  };

  return (
    <div className={`${fullWidth ? 'w-full' : ''} ${className}`}>
      {label && (
        <label className="block mb-2 text-sm font-medium text-base-content/80">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-base-content/50 pointer-events-none">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          className={`
            ${sizes[size]}
            ${icon ? 'pl-12' : ''}
            ${error ? 'border-error focus:ring-error/50' : 'border-base-300 focus:ring-primary/50'}
            w-full
            bg-base-100 border rounded-xl
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-base-100
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-150
            touch-manipulation
          `}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1 text-sm text-error">{error}</p>
      )}
      {hint && !error && (
        <p className="mt-1 text-sm text-base-content/60">{hint}</p>
      )}
    </div>
  );
});

TouchInput.displayName = 'TouchInput';

/**
 * Touch-optimized select dropdown
 */
export const TouchSelect = forwardRef(({
  label,
  error,
  hint,
  options = [],
  size = 'md',
  fullWidth = true,
  className = '',
  ...props
}, ref) => {
  const sizes = {
    sm: 'min-h-[40px] px-3 pr-10 text-sm',
    md: 'min-h-[48px] px-4 pr-10 text-base',
    lg: 'min-h-[56px] px-5 pr-12 text-lg'
  };

  return (
    <div className={`${fullWidth ? 'w-full' : ''} ${className}`}>
      {label && (
        <label className="block mb-2 text-sm font-medium text-base-content/80">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          className={`
            ${sizes[size]}
            ${error ? 'border-error focus:ring-error/50' : 'border-base-300 focus:ring-primary/50'}
            w-full appearance-none
            bg-base-100 border rounded-xl
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-base-100
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-150
            touch-manipulation
          `}
          {...props}
        >
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg className="w-5 h-5 text-base-content/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      {error && (
        <p className="mt-1 text-sm text-error">{error}</p>
      )}
      {hint && !error && (
        <p className="mt-1 text-sm text-base-content/60">{hint}</p>
      )}
    </div>
  );
});

TouchSelect.displayName = 'TouchSelect';

/**
 * Touch-optimized toggle switch
 */
export const TouchToggle = forwardRef(({
  label,
  checked,
  onChange,
  size = 'md',
  className = '',
  ...props
}, ref) => {
  const sizes = {
    sm: 'w-10 h-6',
    md: 'w-12 h-7',
    lg: 'w-14 h-8'
  };

  const dotSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  return (
    <label className={`inline-flex items-center gap-3 cursor-pointer touch-manipulation ${className}`}>
      <div className="relative">
        <input
          ref={ref}
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={onChange}
          {...props}
        />
        <div className={`
          ${sizes[size]}
          ${checked ? 'bg-primary' : 'bg-base-300'}
          relative inline-block rounded-full transition-colors duration-200
        `}>
          <div className={`
            ${dotSizes[size]}
            ${checked ? 'translate-x-full' : 'translate-x-0.5'}
            absolute top-1/2 -translate-y-1/2
            bg-white rounded-full shadow-sm
            transition-transform duration-200
          `} />
        </div>
      </div>
      {label && (
        <span className="text-base-content/80 select-none">
          {label}
        </span>
      )}
    </label>
  );
});

TouchToggle.displayName = 'TouchToggle';