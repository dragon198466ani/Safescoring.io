"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * Confetti celebration effect for achievements
 * Lightweight canvas-based implementation
 */
export function useConfetti() {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const particlesRef = useRef([]);

  const colors = [
    "#6366f1", // primary indigo
    "#22c55e", // green
    "#f59e0b", // amber
    "#ec4899", // pink
    "#8b5cf6", // purple
    "#06b6d4", // cyan
  ];

  const createParticle = useCallback((x, y) => {
    return {
      x,
      y,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      velocityX: (Math.random() - 0.5) * 15,
      velocityY: Math.random() * -15 - 5,
      gravity: 0.5,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
      opacity: 1,
      decay: 0.015,
    };
  }, []);

  const fire = useCallback(
    (originX, originY, particleCount = 50) => {
      if (!canvasRef.current) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      // Set canvas size
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      // Create particles
      for (let i = 0; i < particleCount; i++) {
        particlesRef.current.push(
          createParticle(
            originX || canvas.width / 2,
            originY || canvas.height / 2
          )
        );
      }

      // Animation loop
      const animate = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        particlesRef.current = particlesRef.current.filter((p) => {
          // Update physics
          p.x += p.velocityX;
          p.y += p.velocityY;
          p.velocityY += p.gravity;
          p.rotation += p.rotationSpeed;
          p.opacity -= p.decay;

          if (p.opacity <= 0) return false;

          // Draw particle
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.globalAlpha = p.opacity;
          ctx.fillStyle = p.color;

          // Draw confetti shape (rectangle)
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);

          ctx.restore();

          return true;
        });

        if (particlesRef.current.length > 0) {
          animationRef.current = requestAnimationFrame(animate);
        }
      };

      // Cancel existing animation
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }

      animate();
    },
    [createParticle]
  );

  // Burst from multiple points
  const burst = useCallback(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;

    // Fire from multiple positions
    fire(canvas.width * 0.25, canvas.height * 0.5, 30);
    setTimeout(() => fire(canvas.width * 0.75, canvas.height * 0.5, 30), 100);
    setTimeout(() => fire(canvas.width * 0.5, canvas.height * 0.3, 40), 200);
  }, [fire]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return { canvasRef, fire, burst };
}

/**
 * Confetti Canvas Component
 * Place this at the root of your app or page
 */
export function ConfettiCanvas({ confettiRef }) {
  return (
    <canvas
      ref={confettiRef}
      className="fixed inset-0 pointer-events-none z-[9999]"
      style={{ width: "100vw", height: "100vh" }}
    />
  );
}

/**
 * Achievement Confetti Wrapper
 * Automatically triggers confetti when an achievement is unlocked
 */
export function AchievementConfetti({ trigger, children }) {
  const { canvasRef, burst } = useConfetti();

  useEffect(() => {
    if (trigger) {
      burst();
    }
  }, [trigger, burst]);

  return (
    <>
      <ConfettiCanvas confettiRef={canvasRef} />
      {children}
    </>
  );
}

export default useConfetti;
