"use client";

import { useState } from "react";
/* eslint-disable @next/next/no-img-element */

export default function ProductMedia({ media = [], productName = "Product" }) {
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [mediaErrors, setMediaErrors] = useState({});

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

  return (
    <>
      {/* Gallery Section */}
      <div className="mb-12">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-primary">
            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
          </svg>
          Photos & Videos
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {media.map((item, index) => (
            !mediaErrors[index] && (
              <button
                key={index}
                onClick={() => setSelectedMedia(item)}
                className="relative aspect-video rounded-xl overflow-hidden bg-base-200 border border-base-300 hover:border-primary/50 transition-all hover:shadow-lg group"
              >
                {isVideo(item) ? (
                  <>
                    <div className="absolute inset-0 bg-base-300 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-12 h-12 text-primary">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                    <div className="absolute bottom-2 left-2 badge badge-sm badge-primary">Video</div>
                  </>
                ) : (
                  <img
                    src={item.url}
                    alt={item.caption || `${productName} photo ${index + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={() => handleError(index)}
                  />
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607ZM10.5 7.5v6m3-3h-6" />
                  </svg>
                </div>
              </button>
            )
          ))}
        </div>
      </div>

      {/* Lightbox Modal */}
      {selectedMedia && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
          onClick={() => setSelectedMedia(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh] w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedMedia(null)}
              className="absolute -top-12 right-0 text-white hover:text-primary transition-colors z-10"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="relative w-full h-[80vh] flex items-center justify-center">
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
                  alt={selectedMedia.caption || `${productName} photo`}
                  className="max-w-full max-h-full object-contain rounded-xl"
                />
              )}
            </div>

            {selectedMedia.caption && (
              <p className="text-center text-white/80 mt-4">{selectedMedia.caption}</p>
            )}

            {/* Navigation dots */}
            {validMedia.length > 1 && (
              <div className="flex justify-center gap-2 mt-4">
                {media.map((item, index) => (
                  !mediaErrors[index] && (
                    <button
                      key={index}
                      onClick={() => setSelectedMedia(item)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        selectedMedia === item ? "bg-primary" : "bg-white/50 hover:bg-white"
                      }`}
                    />
                  )
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
