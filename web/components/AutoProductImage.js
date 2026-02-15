"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect } from "react";

export default function AutoProductImage({ websiteUrl, productName = "Product" }) {
  const [imageUrl, setImageUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!websiteUrl || websiteUrl === "#") {
      setIsLoading(false);
      return;
    }

    const fetchOgImage = async () => {
      try {
        const response = await fetch(`/api/og-image?url=${encodeURIComponent(websiteUrl)}`);
        const data = await response.json();

        // Priorité: og:image > screenshot
        const image = data.ogImage || data.screenshot;

        if (image) {
          setImageUrl(image);
        } else {
          setHasError(true);
        }
      } catch {
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOgImage();
  }, [websiteUrl]);

  if (hasError || (!isLoading && !imageUrl)) {
    return null;
  }

  return (
    <>
      <div className="mb-12">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-primary">
            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
          </svg>
          Product Preview
        </h2>

        <button
          onClick={() => setIsExpanded(true)}
          className="relative w-full max-w-2xl rounded-xl overflow-hidden bg-base-200 border border-base-300 hover:border-primary/50 transition-all hover:shadow-lg group"
        >
          {isLoading ? (
            <div className="aspect-video flex items-center justify-center">
              <span className="loading loading-spinner loading-lg text-primary"></span>
            </div>
          ) : (
            <>
              <img
                src={imageUrl}
                alt={`${productName} preview`}
                className="w-full h-auto max-h-[400px] object-cover object-top"
                onError={() => setHasError(true)}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-10 h-10 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607ZM10.5 7.5v6m3-3h-6" />
                </svg>
              </div>
            </>
          )}
        </button>
      </div>

      {/* Lightbox */}
      {isExpanded && imageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
          onClick={() => setIsExpanded(false)}
        >
          <button
            onClick={() => setIsExpanded(false)}
            className="absolute top-4 right-4 text-white hover:text-primary transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={imageUrl}
            alt={`${productName} preview`}
            className="max-w-full max-h-[90vh] object-contain rounded-xl"
          />
        </div>
      )}
    </>
  );
}
