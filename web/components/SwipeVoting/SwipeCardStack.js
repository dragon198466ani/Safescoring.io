"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import SwipeCard from "./SwipeCard";

// Configuration du swipe
const SWIPE_CONFIG = {
  TRIGGER_THRESHOLD: 100, // px pour déclencher le swipe
  VELOCITY_THRESHOLD: 0.5, // px/ms pour flick rapide
  MAX_VISIBLE_CARDS: 3, // Nombre de cartes visibles dans la pile
};

/**
 * SwipeCardStack - Gestionnaire de la pile de cartes swipeable
 *
 * @param {Array} evaluations - Liste des évaluations à afficher
 * @param {number} currentIndex - Index de la carte actuelle
 * @param {function} onSwipe - Callback quand un swipe est complété (direction: 'left' | 'right')
 * @param {boolean} disabled - Désactive les interactions
 * @param {boolean} blindMode - Mode aveugle: cacher l'évaluation IA (fouloscopie)
 */
export default function SwipeCardStack({ evaluations = [], currentIndex = 0, onSwipe, disabled = false, blindMode = true }) {
  const containerRef = useRef(null);
  const [gesture, setGesture] = useState({
    isDragging: false,
    startX: 0,
    startY: 0,
    startTime: 0,
    deltaX: 0,
    deltaY: 0,
    direction: null,
    progress: 0,
  });
  const [flyingOut, setFlyingOut] = useState(false);
  const [flyDirection, setFlyDirection] = useState(null);

  // Reset l'état de vol quand l'index change
  useEffect(() => {
    setFlyingOut(false);
    setFlyDirection(null);
    setGesture({
      isDragging: false,
      startX: 0,
      startY: 0,
      startTime: 0,
      deltaX: 0,
      deltaY: 0,
      direction: null,
      progress: 0,
    });
  }, [currentIndex]);

  // Déclencher le swipe
  const triggerSwipe = useCallback(
    (direction) => {
      if (disabled || flyingOut) return;

      setFlyDirection(direction);
      setFlyingOut(true);

      // Notifier le parent après l'animation
      setTimeout(() => {
        onSwipe?.(direction);
      }, 300);
    },
    [disabled, flyingOut, onSwipe]
  );

  // Spring back (annuler le swipe)
  const springBack = useCallback(() => {
    setGesture((prev) => ({
      ...prev,
      isDragging: false,
      deltaX: 0,
      deltaY: 0,
      direction: null,
      progress: 0,
    }));
  }, []);

  // Gérer la fin du geste
  const handleGestureEnd = useCallback(() => {
    if (!gesture.isDragging) return;

    const velocity = gesture.deltaX / (Date.now() - gesture.startTime);
    const shouldTrigger =
      Math.abs(gesture.deltaX) > SWIPE_CONFIG.TRIGGER_THRESHOLD ||
      Math.abs(velocity) > SWIPE_CONFIG.VELOCITY_THRESHOLD;

    if (shouldTrigger && gesture.direction) {
      triggerSwipe(gesture.direction);
    } else {
      springBack();
    }
  }, [gesture, triggerSwipe, springBack]);

  // Touch handlers
  const handleTouchStart = useCallback(
    (e) => {
      if (disabled || flyingOut) return;
      const touch = e.touches[0];
      setGesture({
        isDragging: true,
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: Date.now(),
        deltaX: 0,
        deltaY: 0,
        direction: null,
        progress: 0,
      });
    },
    [disabled, flyingOut]
  );

  const handleTouchMove = useCallback(
    (e) => {
      if (!gesture.isDragging || disabled) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - gesture.startX;
      const deltaY = touch.clientY - gesture.startY;

      // Seulement swipe horizontal
      if (Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
        e.preventDefault();
        const direction = deltaX > 0 ? "right" : "left";
        const progress = Math.min(1, Math.abs(deltaX) / SWIPE_CONFIG.TRIGGER_THRESHOLD);

        setGesture((prev) => ({
          ...prev,
          deltaX,
          deltaY,
          direction,
          progress,
        }));
      }
    },
    [gesture.isDragging, gesture.startX, gesture.startY, disabled]
  );

  const handleTouchEnd = useCallback(() => {
    handleGestureEnd();
  }, [handleGestureEnd]);

  // Mouse handlers (pour desktop)
  const handleMouseDown = useCallback(
    (e) => {
      if (disabled || flyingOut) return;
      e.preventDefault();
      setGesture({
        isDragging: true,
        startX: e.clientX,
        startY: e.clientY,
        startTime: Date.now(),
        deltaX: 0,
        deltaY: 0,
        direction: null,
        progress: 0,
      });
    },
    [disabled, flyingOut]
  );

  const handleMouseMove = useCallback(
    (e) => {
      if (!gesture.isDragging || disabled) return;

      const deltaX = e.clientX - gesture.startX;
      const deltaY = e.clientY - gesture.startY;

      if (Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
        const direction = deltaX > 0 ? "right" : "left";
        const progress = Math.min(1, Math.abs(deltaX) / SWIPE_CONFIG.TRIGGER_THRESHOLD);

        setGesture((prev) => ({
          ...prev,
          deltaX,
          deltaY,
          direction,
          progress,
        }));
      }
    },
    [gesture.isDragging, gesture.startX, gesture.startY, disabled]
  );

  const handleMouseUp = useCallback(() => {
    handleGestureEnd();
  }, [handleGestureEnd]);

  const handleMouseLeave = useCallback(() => {
    if (gesture.isDragging) {
      springBack();
    }
  }, [gesture.isDragging, springBack]);

  // Listeners globaux pour mouseup
  useEffect(() => {
    if (gesture.isDragging) {
      const handleGlobalMouseUp = () => handleGestureEnd();
      document.addEventListener("mouseup", handleGlobalMouseUp);
      return () => document.removeEventListener("mouseup", handleGlobalMouseUp);
    }
  }, [gesture.isDragging, handleGestureEnd]);

  // Cartes visibles (carte actuelle + 2 derrière)
  const visibleCards = evaluations.slice(currentIndex, currentIndex + SWIPE_CONFIG.MAX_VISIBLE_CARDS);

  // Swipe programmatique (pour les boutons)
  const swipeLeft = useCallback(() => triggerSwipe("left"), [triggerSwipe]);
  const swipeRight = useCallback(() => triggerSwipe("right"), [triggerSwipe]);

  // Exposer les méthodes de swipe
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.swipeLeft = swipeLeft;
      containerRef.current.swipeRight = swipeRight;
    }
  }, [swipeLeft, swipeRight]);

  if (visibleCards.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-[3/4] max-w-xs sm:max-w-sm mx-auto touch-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      {/* Render cards in reverse order for proper z-index stacking */}
      {visibleCards
        .map((evaluation, idx) => (
          <SwipeCard
            key={evaluation.id}
            evaluation={evaluation}
            isTop={idx === 0}
            stackPosition={idx}
            gesture={idx === 0 ? gesture : { isDragging: false, deltaX: 0, progress: 0, direction: null }}
            flyingOut={idx === 0 && flyingOut}
            flyDirection={idx === 0 ? flyDirection : null}
            blindMode={blindMode}
          />
        ))
        .reverse()}

      {/* Exposer les méthodes de swipe via data attributes */}
      <div
        data-swipe-left={() => swipeLeft()}
        data-swipe-right={() => swipeRight()}
        className="hidden"
      />
    </div>
  );
}

// Exposer la configuration pour les composants parents
SwipeCardStack.CONFIG = SWIPE_CONFIG;
