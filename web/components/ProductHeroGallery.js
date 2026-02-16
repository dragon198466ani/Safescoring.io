"use client";

import { useState, useRef } from "react";
/* eslint-disable @next/next/no-img-element */
import { useTranslation } from "@/libs/i18n/LanguageProvider";

/**
 * ProductHeroGallery - Galerie intégrée au hero de la page produit
 * Design immersif avec thumbnails et lightbox
 */
export default function ProductHeroGallery({ media = [], productName = "Product" }) {
  const { t } = useTranslation();
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mediaErrors, setMediaErrors] = useState({});
  const scrollRef = useRef(null);

  if (!media || media.length === 0) {
    return null;
  }

  const handleError = (index) => {
    setMediaErrors((prev) => ({ ...prev, [index]: true }));
  };

  const validMedia = media.filter((_, index) => !mediaErrors[index]);

  if (validMedia.length === 0) {
    return null;
  }

  const isVideo = (item) => {
    return item.type === "video" ||
           item.url?.includes("youtube") ||
           item.url?.includes("vimeo") ||
           item.url?.endsWith(".mp4");
  };

  const getYoutubeEmbedUrl = (url) => {
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^&?/]+)/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : url;
  };

  const getYoutubeThumbnail = (url) => {
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^&?/]+)/);
    return match ? `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg` : null;
  };

  const openLightbox = (item, index) => {
    setSelectedMedia(item);
    setSelectedIndex(index);
  };

  const navigate = (direction) => {
    const newIndex = selectedIndex + direction;
    if (newIndex >= 0 && newIndex < validMedia.length) {
      setSelectedIndex(newIndex);
      setSelectedMedia(validMedia[newIndex]);
    }
  };

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 200;
      scrollRef.current.scrollBy({
        left: direction * scrollAmount,
        behavior: "smooth"
      });
    }
  };

  // Style: Featured image + thumbnails strip
  const featuredMedia = validMedia[0];
  const _thumbnails = validMedia.slice(0, 5); // Max 5 thumbnails visibles

  return (
    <>
      {/* Hero Gallery - Integrated Design */}
      <div className="relative rounded-2xl overflow-hidden bg-base-200/50 border border-base-content/10">
        {/* Featured Image/Video */}
        <button
          onClick={() => openLightbox(featuredMedia, 0)}
          className="relative w-full aspect-[16/9] md:aspect-[21/9] overflow-hidden group"
        >
          {isVideo(featuredMedia) ? (
            <>
              <img
                src={getYoutubeThumbnail(featuredMedia.url) || "/placeholder-video.jpg"}
                alt={`${productName} video`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-primary/90 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-8 h-8 md:w-10 md:h-10 text-white ml-1">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </div>
              </div>
            </>
          ) : (
            <img
              src={featuredMedia.url}
              alt={featuredMedia.caption || `${productName}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              onError={() => handleError(0)}
            />
          )}

          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

          {/* Expand icon */}
          <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2 flex items-center gap-2 text-white text-sm">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9m11.25-5.25v4.5m0-4.5h-4.5m4.5 0L15 9m-11.25 11.25v-4.5m0 4.5h4.5m-4.5 0L9 15m11.25 5.25v-4.5m0 4.5h-4.5m4.5 0L15 15" />
              </svg>
              {t("productGallery.view")}
            </div>
          </div>

          {/* Media count badge */}
          {validMedia.length > 1 && (
            <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1 text-white text-sm font-medium">
              {validMedia.length} {validMedia.some(m => isVideo(m)) ? t("productGallery.media") : t("productGallery.photos")}
            </div>
          )}
        </button>

        {/* Thumbnails Strip - Only if more than 1 media */}
        {validMedia.length > 1 && (
          <div className="relative bg-base-300/50 p-2">
            {/* Scroll buttons */}
            {validMedia.length > 4 && (
              <>
                <button
                  onClick={() => scroll(-1)}
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-base-100/90 rounded-full flex items-center justify-center shadow-lg hover:bg-base-100 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                  </svg>
                </button>
                <button
                  onClick={() => scroll(1)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-base-100/90 rounded-full flex items-center justify-center shadow-lg hover:bg-base-100 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              </>
            )}

            {/* Thumbnails scroll container */}
            <div
              ref={scrollRef}
              className="flex gap-2 overflow-x-auto scrollbar-hide scroll-smooth px-1"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {validMedia.map((item, index) => (
                <button
                  key={index}
                  onClick={() => openLightbox(item, index)}
                  className={`relative flex-shrink-0 w-20 h-14 md:w-24 md:h-16 rounded-lg overflow-hidden border-2 transition-all ${
                    selectedMedia === item ? "border-primary" : "border-transparent hover:border-base-content/30"
                  }`}
                >
                  {isVideo(item) ? (
                    <>
                      <img
                        src={getYoutubeThumbnail(item.url) || "/placeholder-video.jpg"}
                        alt={`${productName} video ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-5 h-5 text-white">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      </div>
                    </>
                  ) : (
                    <img
                      src={item.url}
                      alt={item.caption || `${productName} ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={() => handleError(index)}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {selectedMedia && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm"
          onClick={() => setSelectedMedia(null)}
        >
          {/* Close button */}
          <button
            onClick={() => setSelectedMedia(null)}
            className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-white">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Navigation arrows */}
          {validMedia.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); navigate(-1); }}
                disabled={selectedIndex === 0}
                className={`absolute left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors ${
                  selectedIndex === 0 ? "opacity-30 cursor-not-allowed" : ""
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-white">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                </svg>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); navigate(1); }}
                disabled={selectedIndex === validMedia.length - 1}
                className={`absolute right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors ${
                  selectedIndex === validMedia.length - 1 ? "opacity-30 cursor-not-allowed" : ""
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-white">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </>
          )}

          {/* Media content */}
          <div className="relative w-full max-w-5xl max-h-[85vh] px-4" onClick={(e) => e.stopPropagation()}>
            <div className="relative w-full h-[70vh] flex items-center justify-center">
              {isVideo(selectedMedia) ? (
                <iframe
                  src={getYoutubeEmbedUrl(selectedMedia.url)}
                  className="w-full h-full rounded-xl"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <img
                  src={selectedMedia.url}
                  alt={selectedMedia.caption || `${productName}`}
                  className="max-w-full max-h-full object-contain rounded-xl"
                />
              )}
            </div>

            {/* Caption */}
            {selectedMedia.caption && (
              <p className="text-center text-white/80 mt-4 text-sm md:text-base">
                {selectedMedia.caption}
              </p>
            )}

            {/* Counter */}
            <div className="text-center text-white/50 mt-2 text-sm">
              {selectedIndex + 1} / {validMedia.length}
            </div>

            {/* Thumbnail strip in lightbox */}
            {validMedia.length > 1 && (
              <div className="flex justify-center gap-2 mt-4 overflow-x-auto pb-2">
                {validMedia.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => { setSelectedMedia(item); setSelectedIndex(index); }}
                    className={`relative flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                      selectedIndex === index ? "border-primary" : "border-white/20 hover:border-white/50"
                    }`}
                  >
                    {isVideo(item) ? (
                      <img
                        src={getYoutubeThumbnail(item.url) || "/placeholder-video.jpg"}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img
                        src={item.url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
