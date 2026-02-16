import Header from "@/components/Header";
import Footer from "@/components/Footer";
import config from "@/config";

export const metadata = {
  title: `Accessibility Statement | ${config.appName}`,
  description: "SafeScoring's commitment to web accessibility and WCAG compliance.",
};

export default function AccessibilityPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen pt-24 pb-16 px-6 hero-bg">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Accessibility Statement</h1>

          <div className="prose prose-sm max-w-none text-base-content/80 space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3">Our Commitment</h2>
              <p>
                {config.appName} is committed to ensuring digital accessibility for people with disabilities.
                We are continually improving the user experience for everyone and applying relevant accessibility standards.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Conformance Status</h2>
              <p>
                We aim to conform to the <strong>Web Content Accessibility Guidelines (WCAG) 2.1 Level AA</strong> as
                published by the World Wide Web Consortium (W3C). We are working toward full compliance and regularly
                audit our platform to identify and address accessibility barriers.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Current Measures</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>Semantic HTML structure throughout the application</li>
                <li>ARIA labels on interactive elements and navigation</li>
                <li>Keyboard-navigable interface with visible focus indicators</li>
                <li>Skip-to-content link for keyboard users</li>
                <li>Text alternatives for images and icons</li>
                <li>Responsive design supporting zoom up to 200%</li>
                <li>Color is not the sole means of conveying information (text labels accompany color indicators)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Known Limitations</h2>
              <p>
                Despite our efforts, some areas may not yet be fully accessible. We are actively working to address:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Some data visualizations (charts, score circles) may need enhanced screen reader descriptions</li>
                <li>Third-party embedded content may have its own accessibility limitations</li>
                <li>PDF reports may not be fully accessible to screen readers</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Applicable Standards</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>WCAG 2.1 Level AA (target)</li>
                <li>EU Directive 2016/2102 (Web Accessibility Directive)</li>
                <li>European Accessibility Act (Directive 2019/882)</li>
                <li>Section 508 of the Rehabilitation Act (US)</li>
                <li>EN 301 549 (European standard)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Feedback & Contact</h2>
              <p>
                If you encounter accessibility barriers on {config.appName}, please contact us:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Email: <a href="mailto:support@safescoring.io" className="text-primary hover:underline">support@safescoring.io</a></li>
              </ul>
              <p className="mt-2">
                We aim to respond to accessibility feedback within 5 business days and to resolve issues within 30 business days.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Enforcement</h2>
              <p>
                If you are not satisfied with our response, you may contact your national enforcement body.
                In France: the <a href="https://www.defenseurdesdroits.fr" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">D&eacute;fenseur des droits</a>.
                In the EU: your national body under Directive 2016/2102.
              </p>
            </section>

            <p className="text-xs text-base-content/40 mt-8">
              This statement was last updated on {new Date().toISOString().slice(0, 10)}.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
