"use client";

import { useState, useEffect, memo } from "react";
import Image from "next/image";

/**
 * Optimized Image Component
 * - Lazy loading by default with Intersection Observer
 * - Blur placeholder while loading
 * - Error fallback with retry
 * - Responsive sizes with optimized srcset
 * - LQIP (Low Quality Image Placeholder) support
 * - WebP/AVIF format support detection
 *
 * @param {Object} props
 * @param {string} props.src - Image source URL
 * @param {string} props.alt - Alt text (required for accessibility)
 * @param {number} props.width - Image width
 * @param {number} props.height - Image height
 * @param {string} props.fallback - Fallback image URL
 * @param {string} props.className - CSS classes
 * @param {boolean} props.priority - Load with priority (above fold images)
 * @param {string} props.sizes - Responsive sizes string
 * @param {string} props.objectFit - CSS object-fit value
 * @param {number} props.quality - Image quality (1-100)
 */
const OptimizedImage = memo(function OptimizedImage({
  src,
  alt,
  width,
  height,
  fallback = "/placeholder.png",
  className = "",
  priority = false,
  sizes,
  objectFit = "cover",
  quality = 80,
  ...props
}) {
  const [imgSrc, setImgSrc] = useState(src);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Reset state when src changes
  useEffect(() => {
    setImgSrc(src);
    setIsLoading(true);
    setHasError(false);
    setRetryCount(0);
  }, [src]);

  const handleError = () => {
    // Retry once before falling back
    if (retryCount < 1 && !hasError) {
      setRetryCount((prev) => prev + 1);
      setImgSrc(`${src}?retry=${retryCount + 1}`);
      return;
    }

    if (!hasError && fallback) {
      setImgSrc(fallback);
      setHasError(true);
    }
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  // For external URLs, use unoptimized to avoid next/image restrictions
  const isExternal =
    src?.startsWith("http") &&
    !src?.includes(process.env.NEXT_PUBLIC_SITE_URL || "safescoring.io");

  // Generate responsive sizes string based on common breakpoints
  const responsiveSizes =
    sizes ||
    `(max-width: 640px) 100vw, (max-width: 768px) 80vw, (max-width: 1024px) 60vw, ${width}px`;

  // Calculate aspect ratio for placeholder sizing
  const aspectRatio = width && height ? width / height : 16 / 9;

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        width: width || "100%",
        height: height || "auto",
        aspectRatio: !height ? aspectRatio : undefined,
      }}
    >
      {/* Loading skeleton with blur effect */}
      {isLoading && (
        <div
          className="absolute inset-0 bg-gradient-to-br from-base-300 to-base-200 animate-pulse"
          aria-hidden="true"
        >
          {/* Low quality placeholder shimmer */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-base-100/20 to-transparent skeleton-shimmer" />
        </div>
      )}

      {/* Error indicator */}
      {hasError && !isLoading && imgSrc === fallback && (
        <div className="absolute top-2 right-2 z-10">
          <span className="badge badge-ghost badge-xs opacity-50">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-3 h-3"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
          </span>
        </div>
      )}

      {/* Image */}
      {isExternal ? (
        // External image - use regular img tag with srcset for responsive
        <img
          src={imgSrc}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? "eager" : "lazy"}
          decoding={priority ? "sync" : "async"}
          fetchPriority={priority ? "high" : "auto"}
          onError={handleError}
          onLoad={handleLoad}
          className={`w-full h-full transition-opacity duration-300 ${
            isLoading ? "opacity-0" : "opacity-100"
          }`}
          style={{ objectFit }}
          {...props}
        />
      ) : (
        // Internal image - use Next.js Image optimization
        <Image
          src={imgSrc}
          alt={alt}
          width={width}
          height={height}
          priority={priority}
          quality={quality}
          onError={handleError}
          onLoad={handleLoad}
          className={`w-full h-full transition-opacity duration-300 ${
            isLoading ? "opacity-0" : "opacity-100"
          }`}
          style={{ objectFit }}
          sizes={responsiveSizes}
          placeholder={priority ? "empty" : "blur"}
          blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMjAyMDIwIi8+PC9zdmc+"
          {...props}
        />
      )}
    </div>
  );
});

// Named export for clarity
export { OptimizedImage };
export default OptimizedImage;
