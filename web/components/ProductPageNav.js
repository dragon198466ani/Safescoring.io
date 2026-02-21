"use client";

import { useState, useEffect } from "react";

/**
 * ProductPageNav - Sticky navigation for product page sections
 *
 * Provides quick navigation between:
 * - SAFE Analysis (unified breakdown + priority)
 * - Analytics & Charts
 * - Sources & Links
 * - Security Incidents
 *
 * Rule: Only shows sections that exist in the DOM (generic/adaptive)
 */

const ALL_SECTIONS = [
  { id: "overview", label: "Overview", icon: "📋" },
  { id: "safe-analysis", label: "Analysis", icon: "🛡️" },
  { id: "protection", label: "Protection", icon: "🔒" },
  { id: "security-panel", label: "Security", icon: "📊" },
  { id: "community", label: "Community", icon: "👥" },
  { id: "contribute", label: "Contribute", icon: "✏️" },
];

export default function ProductPageNav() {
  const [activeSection, setActiveSection] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [visibleSections, setVisibleSections] = useState([]);

  useEffect(() => {
    // Check which sections actually exist in the DOM
    const checkSections = () => {
      const existing = ALL_SECTIONS.filter((s) => {
        const el = document.getElementById(s.id);
        // Section exists and has content (not empty)
        return el && el.children.length > 0;
      });
      setVisibleSections(existing);
    };

    // Initial check after render
    const timer = setTimeout(checkSections, 500);

    const handleScroll = () => {
      // Show nav after scrolling past hero
      setIsVisible(window.scrollY > 400);

      // Determine active section from visible sections only
      const sections = visibleSections.map((s) => ({
        id: s.id,
        element: document.getElementById(s.id),
      })).filter((s) => s.element);

      const scrollPosition = window.scrollY + 150;

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        if (section.element.offsetTop <= scrollPosition) {
          setActiveSection(section.id);
          break;
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [visibleSections]);

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const offset = 100;
      const top = element.offsetTop - offset;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  // Don't show if not visible or no sections to display
  if (!isVisible || visibleSections.length === 0) return null;

  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-fade-in">
      <div className="flex items-center gap-1 px-2 py-2 rounded-full bg-base-200/95 backdrop-blur-lg border border-base-content/10 shadow-xl">
        {visibleSections.map((section) => (
          <button
            key={section.id}
            onClick={() => scrollToSection(section.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all ${
              activeSection === section.id
                ? "bg-primary text-primary-content"
                : "text-base-content/60 hover:text-base-content hover:bg-base-content/10"
            }`}
            title={section.label}
          >
            <span className="text-base">{section.icon}</span>
            <span className="hidden sm:inline">{section.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
