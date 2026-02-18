"use client";

import Image from 'next/image';
import { useState, useEffect } from 'react';

/**
 * Optimized image component with lazy loading and blur placeholder
 */
export default function LazyImage({
  src,
  alt,
  priority = false,
  quality = 75,
  placeholder = 'blur',
  blurDataURL,
  className = '',
  containerClassName = '',
  onLoad,
  sizes,
  fill,
  width,
  height,
  ...props
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  // Generate a simple blur placeholder if not provided
  const defaultBlurDataURL = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=';

  // Reset loading state when src changes
  useEffect(() => {
    setIsLoading(true);
    setError(false);
  }, [src]);

  const handleLoadingComplete = (result) => {
    setIsLoading(false);
    if (onLoad) {
      onLoad(result);
    }
  };

  const handleError = () => {
    setIsLoading(false);
    setError(true);
  };

  // Calculate responsive sizes for mobile optimization
  const responsiveSizes = sizes || `
    (max-width: 640px) 100vw,
    (max-width: 768px) 80vw,
    (max-width: 1024px) 50vw,
    33vw
  `;

  if (error) {
    return (
      <div className={`relative bg-base-300 rounded-lg flex items-center justify-center ${containerClassName}`}>
        <div className="text-center p-4">
          <svg className="w-12 h-12 mx-auto text-base-content/30 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="text-xs text-base-content/50">Failed to load image</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-base-300/20 rounded-lg ${containerClassName}`}>
      {/* Loading skeleton */}
      {isLoading && (
        <div className="absolute inset-0 z-10">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-base-100/10 to-transparent -skew-x-12 animate-shimmer" />
          <div className="absolute inset-0 bg-base-300/30 animate-pulse" />
        </div>
      )}

      <Image
        src={src}
        alt={alt}
        sizes={responsiveSizes}
        quality={quality}
        priority={priority}
        placeholder={placeholder}
        blurDataURL={blurDataURL || defaultBlurDataURL}
        onLoadingComplete={handleLoadingComplete}
        onError={handleError}
        className={`
          transition-all duration-700 ease-out
          ${isLoading ? 'scale-110 blur-sm opacity-0' : 'scale-100 blur-0 opacity-100'}
          ${className}
        `}
        fill={fill}
        width={!fill ? width : undefined}
        height={!fill ? height : undefined}
        {...props}
      />
    </div>
  );
}

/**
 * Optimized Product Logo component
 */
export function ProductLogo({
  product,
  size = 'md',
  className = '',
  containerClassName = '',
}) {
  const sizes = {
    xs: { width: 24, height: 24 },
    sm: { width: 32, height: 32 },
    md: { width: 48, height: 48 },
    lg: { width: 64, height: 64 },
    xl: { width: 96, height: 96 },
  };

  const { width, height } = sizes[size] || sizes.md;

  // Fallback to first letter if no logo
  if (!product.logo_url) {
    return (
      <div
        className={`
          flex items-center justify-center rounded-lg
          bg-gradient-to-br from-primary/20 to-secondary/20
          ${containerClassName}
        `}
        style={{ width, height }}
      >
        <span className={`font-bold text-${size} text-primary ${className}`}>
          {product.name?.[0] || '?'}
        </span>
      </div>
    );
  }

  return (
    <LazyImage
      src={product.logo_url}
      alt={`${product.name} logo`}
      width={width}
      height={height}
      className={`rounded-lg object-contain ${className}`}
      containerClassName={`w-[${width}px] h-[${height}px] ${containerClassName}`}
      priority={false}
      quality={85}
    />
  );
}

/**
 * Hero Background Image with lazy loading
 */
export function HeroBackground({
  src,
  alt = "Background",
  className = '',
  overlay = true,
}) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <LazyImage
        src={src}
        alt={alt}
        fill
        priority
        quality={60}
        className={`object-cover object-center ${className}`}
        containerClassName="absolute inset-0"
        sizes="100vw"
      />
      {overlay && (
        <div className="absolute inset-0 bg-gradient-to-b from-base-100/50 via-base-100/70 to-base-100/90" />
      )}
    </div>
  );
}

// Export shimmer animation for reuse
export const shimmerAnimation = `
  @keyframes shimmer {
    0% {
      transform: translateX(-100%) skewX(-12deg);
    }
    100% {
      transform: translateX(200%) skewX(-12deg);
    }
  }

  .animate-shimmer {
    animation: shimmer 2s infinite;
  }
`;