import Link from "next/link";
import { getSEOTags } from "@/libs/seo";
import config from "@/config";

export const metadata = getSEOTags({
  title: `Accessibility Statement | ${config.appName}`,
  canonicalUrlRelative: "/accessibility",
});

const Accessibility = () => {
  return (
    <main className="max-w-xl mx-auto">
      <div className="p-5">
        <Link href="/" className="btn btn-ghost">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-5 h-5"
          >
            <path
              fillRule="evenodd"
              d="M15 10a.75.75 0 01-.75.75H7.612l2.158 1.96a.75.75 0 11-1.04 1.08l-3.5-3.25a.75.75 0 010-1.08l3.5-3.25a.75.75 0 111.04 1.08L7.612 9.25h6.638A.75.75 0 0115 10z"
              clipRule="evenodd"
            />
          </svg>
          Back
        </Link>
        <h1 className="text-3xl font-extrabold pb-6">
          Accessibility Statement
        </h1>

        <pre
          className="leading-relaxed whitespace-pre-wrap"
          style={{ fontFamily: "sans-serif" }}
        >
          {`Last Updated: March 2, 2026

SafeScoring is committed to ensuring digital accessibility for people of all abilities. We are continually improving the user experience for everyone and applying the relevant accessibility standards.


1. CONFORMANCE STATUS

SafeScoring aims to conform to the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA, as well as the European Accessibility Act (Directive (EU) 2019/882) effective June 28, 2025.

Current conformance status: Partially conformant.

"Partially conformant" means that some parts of the content do not fully conform to the accessibility standard. We are actively working to achieve full conformance.


2. ACCESSIBILITY FEATURES

We have implemented the following accessibility features across SafeScoring:

2.1 Visual Accessibility
— Minimum font size of 12px across all interface elements
— Line height of 1.6 for improved readability
— Minimum contrast ratio of 4.5:1 for normal text
— No information conveyed by color alone (scores include numeric labels)
— Reduced use of uppercase text to improve readability for dyslexic users

2.2 Motion and Animation
— prefers-reduced-motion media query: All animations and transitions are disabled when the user's system preference is set to "reduce motion"
— No auto-playing videos or audio

2.3 Navigation
— Keyboard-navigable interface elements
— Semantic HTML structure with proper heading hierarchy
— ARIA labels on interactive elements (buttons, navigation, modals)
— Skip-to-content link for screen reader users
— Clear, descriptive link text

2.4 Content
— Plain language descriptions for technical crypto terms
— Built-in Crypto Glossary with 16 beginner-friendly definitions accessible from the header
— SAFE pillar tooltips explaining each security dimension
— Score scale legend (80+ Excellent, 60-79 Good, <60 At Risk)

2.5 Responsive Design
— Fully responsive layout from 320px to 2560px viewport width
— Touch-friendly tap targets (minimum 44x44px)
— Zoom support up to 200% without loss of content


3. KNOWN LIMITATIONS

Despite our efforts, some areas may have limited accessibility:

— Interactive charts (DualScoreChart, ScoreEvolution): Partially accessible via screen readers. We are working on adding text alternatives for chart data.
— Swipe voting interface (SwipeVoting): Requires touch or mouse gesture. Keyboard alternatives (arrow keys and Enter) are available.
— Third-party embedded content: Some external widgets (Crisp chat, payment forms) may not fully meet WCAG 2.1 AA standards.
— PDF export reports: May not be fully screen-reader accessible.

We are actively working to address these limitations.


4. TECHNOLOGIES

This website relies on the following technologies to work with assistive tools:
— HTML5
— CSS (Tailwind CSS)
— JavaScript (React / Next.js)
— WAI-ARIA (where applicable)


5. ASSESSMENT METHODS

SafeScoring assesses accessibility through:
— Automated testing (axe-core, Lighthouse)
— Manual keyboard navigation testing
— Screen reader testing (NVDA, VoiceOver)
— User feedback from community members


6. FEEDBACK AND CONTACT

We welcome your feedback on the accessibility of SafeScoring. If you encounter any accessibility barriers, please contact us:

Email: accessibility@safescoring.io
General support: support@safescoring.io
Response time: Within 5 business days

When contacting us about an accessibility issue, please include:
— A description of the problem
— The page URL where you encountered the issue
— The browser and assistive technology you were using
— Your preferred contact method for our response


7. ENFORCEMENT PROCEDURE

If you are not satisfied with our response, you may contact:

7.1 European Union
Your national accessibility enforcement body, or the European Commission: https://ec.europa.eu/social/main.jsp?catId=1202

7.2 France
Défenseur des droits: https://www.defenseurdesdroits.fr

7.3 United Kingdom
Equality and Human Rights Commission: https://www.equalityhumanrights.com

7.4 United States
U.S. Department of Justice, ADA Information Line: 1-800-514-0301


8. APPLICABLE STANDARDS AND REGULATIONS

This statement is prepared in accordance with:
— Web Content Accessibility Guidelines (WCAG) 2.1 (W3C Recommendation, June 2018)
— European Accessibility Act (Directive (EU) 2019/882)
— EN 301 549 (European standard for ICT accessibility)
— Section 508 of the Rehabilitation Act (United States)
— Accessibility for Ontarians with Disabilities Act (AODA, Canada)


© ${new Date().getFullYear()} SafeScoring LLC. All rights reserved.`}
        </pre>
      </div>
    </main>
  );
};

export default Accessibility;
