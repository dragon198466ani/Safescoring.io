"use client";

import { useEffect, useRef, useState } from "react";

/**
 * ScrollReveal - Progressive content reveal on scroll
 * Wraps children and reveals them when they enter the viewport
 */
export default function ScrollReveal({
  children,
  className = "",
  direction = "up", // up, down, left, right, scale
  delay = 0,
  threshold = 0.1,
  once = true // only animate once
}) {
  const ref = useRef(null);
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Add delay before revealing
          setTimeout(() => {
            setIsRevealed(true);
          }, delay);

          // Unobserve if only animating once
          if (once) {
            observer.unobserve(element);
          }
        } else if (!once) {
          setIsRevealed(false);
        }
      },
      { threshold, rootMargin: "0px 0px -50px 0px" }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [delay, threshold, once]);

  const getAnimationClass = () => {
    switch (direction) {
      case "left":
        return "scroll-reveal-left";
      case "right":
        return "scroll-reveal-right";
      case "scale":
        return "scroll-reveal-scale";
      default:
        return "scroll-reveal";
    }
  };

  return (
    <div
      ref={ref}
      className={`${getAnimationClass()} ${isRevealed ? "revealed" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * ScrollProgress - Shows scroll progress indicator
 */
export function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = (scrollTop / docHeight) * 100;
      setProgress(scrollPercent);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 h-1 z-50 bg-base-300/50">
      <div
        className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-150 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
