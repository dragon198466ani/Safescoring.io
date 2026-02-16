import Image from "next/image";

// ==================================================================================================================================================================
// BLOG CATEGORIES 🏷️
// ==================================================================================================================================================================

// These slugs are used to generate pages in the /blog/category/[categoryI].js. It's a way to group articles by category.
const categorySlugs = {
  securityResearch: "security-research",
  productUpdates: "product-updates",
  methodology: "methodology",
  industryNews: "industry-news",
};

// All the blog categories data display in the /blog/category/[categoryI].js pages.
export const categories = [
  {
    // The slug to use in the URL, from the categorySlugs object above.
    slug: categorySlugs.securityResearch,
    // The title to display the category title (h1), the category badge, the category filter, and more. Less than 60 characters.
    title: "Security Research",
    // A short version of the title above, display in small components like badges. 1 or 2 words
    titleShort: "Research",
    // The description of the category to display in the category page. Up to 160 characters.
    description:
      "Deep dives into crypto security vulnerabilities, attack vectors, and protocol analysis from the SafeScoring research team.",
    // A short version of the description above, only displayed in the <Header /> on mobile. Up to 60 characters.
    descriptionShort: "Crypto security research and analysis.",
  },
  {
    slug: categorySlugs.productUpdates,
    title: "Product Updates",
    titleShort: "Updates",
    description:
      "The latest improvements to SafeScoring, including new scoring features, platform enhancements, and integration updates.",
    descriptionShort:
      "Latest features and improvements to SafeScoring.",
  },
  {
    slug: categorySlugs.methodology,
    title: "Methodology",
    titleShort: "Methodology",
    description:
      "Learn how SafeScoring evaluates crypto projects using the SAFE methodology across Security, Adversity, Fidelity, and Efficiency.",
    descriptionShort:
      "How we evaluate and score crypto projects.",
  },
  {
    slug: categorySlugs.industryNews,
    title: "Industry News",
    titleShort: "News",
    description:
      "Coverage of the latest developments in crypto security, regulatory changes, and notable incidents in the blockchain ecosystem.",
    descriptionShort:
      "Latest news in crypto security and regulation.",
  },
];

// ==================================================================================================================================================================
// BLOG AUTHORS 📝
// ==================================================================================================================================================================

// All the blog authors data display in the /blog/author/[authorId].js pages.
export const authors = [
  {
    // The slug to use in the URL, from the defined authorSlugs object above.
    slug: "safescoring-team",
    // The name to display in the author's bio page and in articles.
    name: "SafeScoring Team",
    // The job title of the author.
    job: "Crypto Security Research",
    // A short description of the author, displayed in the author's bio page.
    description:
      "The SafeScoring team builds transparent, data-driven security ratings for crypto projects using the SAFE methodology.",
    // The avatar of the author, displayed in the author's bio page and in article cards.
    avatar: null,
    // A link to the author's social media or website.
    socials: [],
  },
];

// ==================================================================================================================================================================
// BLOG ARTICLES 📚
// ==================================================================================================================================================================

// These styles are used in the content of the articles. When you update them, all articles will be updated.
const styles = {
  h2: "text-2xl lg:text-4xl font-bold tracking-tight mb-4 text-base-content",
  h3: "text-xl lg:text-2xl font-bold tracking-tight mb-2 text-base-content",
  p: "text-base-content/90 leading-relaxed",
  ul: "list-inside list-disc text-base-content/90 leading-relaxed",
  li: "list-item",
  // Altnernatively, you can use the library react-syntax-highlighter to display code snippets.
  code: "text-sm font-mono bg-neutral text-neutral-content p-6 rounded-box my-4 overflow-x-scroll select-all",
  codeInline:
    "text-sm font-mono bg-base-300 px-1 py-0.5 rounded-box select-all",
};

// All the blog articles data display in the /blog/[articleId].js pages.
export const articles = [
  {
    // The unique slug to use in the URL. It's also used to generate the canonical URL.
    slug: "understanding-safe-methodology",
    // The title to display in the article page (h1). Less than 60 characters. It's also used to generate the meta title.
    title: "Understanding the SAFE Methodology: How We Rate Crypto Security",
    // The description of the article to display in the article page. Up to 160 characters. It's also used to generate the meta description.
    description:
      "Learn how SafeScoring evaluates crypto projects using four pillars: Security, Adversity, Fidelity, and Efficiency to produce transparent safety ratings.",
    // An array of categories of the article. It's used to generate the category badges, the category filter, and more.
    categories: [
      categories.find((category) => category.slug === categorySlugs.methodology),
    ],
    // The author of the article. It's used to generate a link to the author's bio page.
    author: authors.find((author) => author.slug === "safescoring-team"),
    // The date of the article. It's used to generate the meta date.
    publishedAt: "2024-01-15",
    image: {
      // The image to display in <CardArticle /> components.
      src: null,
      // The relative URL of the same image to use in the Open Graph meta tags & the Schema Markup JSON-LD.
      urlRelative: "/blog/understanding-safe-methodology/header.jpg",
      alt: "SafeScoring SAFE methodology diagram showing the four pillars",
    },
    // The actual content of the article that will be shown under the <h1> title in the article page.
    content: (
      <>
        <section>
          <h2 className={styles.h2}>Introduction</h2>
          <p className={styles.p}>
            At SafeScoring, our mission is to bring transparency and
            accountability to crypto security. We developed the SAFE
            methodology — a comprehensive framework that evaluates crypto
            projects across four critical pillars: Security, Adversity,
            Fidelity, and Efficiency. Each pillar captures a distinct
            dimension of what makes a crypto project trustworthy.
          </p>
        </section>

        <section>
          <h2 className={styles.h2}>The Four Pillars of SAFE</h2>

          <h3 className={styles.h3}>S — Security</h3>
          <p className={styles.p}>
            The Security pillar assesses the technical safeguards that
            protect a project and its users. This includes smart contract
            audit history, bug bounty programs, code quality, known
            vulnerability exposure, and the robustness of on-chain security
            mechanisms. Projects with multiple independent audits, active
            bug bounty programs, and a clean vulnerability track record
            score highest here.
          </p>
          <ul className={styles.ul}>
            <li className={styles.li}>Smart contract audit coverage and recency</li>
            <li className={styles.li}>Bug bounty program scope and payouts</li>
            <li className={styles.li}>Historical vulnerability and exploit record</li>
            <li className={styles.li}>Code quality and test coverage</li>
          </ul>
        </section>

        <section>
          <h3 className={styles.h3}>A — Adversity</h3>
          <p className={styles.p}>
            The Adversity pillar measures how well a project has weathered
            real-world challenges. Crypto markets are volatile, exploits
            happen, and regulatory landscapes shift constantly. We evaluate
            a project&apos;s incident response history, how it handled past
            exploits or crises, its resilience to market stress, and its
            ability to recover and adapt after setbacks.
          </p>
          <ul className={styles.ul}>
            <li className={styles.li}>Incident response track record</li>
            <li className={styles.li}>Crisis management and communication</li>
            <li className={styles.li}>Recovery from exploits or market downturns</li>
            <li className={styles.li}>Adaptive governance and upgrade processes</li>
          </ul>
        </section>

        <section>
          <h3 className={styles.h3}>F — Fidelity</h3>
          <p className={styles.p}>
            Fidelity evaluates the trustworthiness and integrity of the
            team and organization behind a project. This pillar examines
            team transparency, governance structure, token distribution
            fairness, regulatory compliance, and the project&apos;s track
            record of keeping promises to its community. Anonymous teams
            with concentrated token holdings and broken roadmap commitments
            score lower on this axis.
          </p>
          <ul className={styles.ul}>
            <li className={styles.li}>Team identity and background verification</li>
            <li className={styles.li}>Governance decentralization</li>
            <li className={styles.li}>Token distribution and vesting transparency</li>
            <li className={styles.li}>Roadmap delivery and community trust</li>
          </ul>
        </section>

        <section>
          <h3 className={styles.h3}>E — Efficiency</h3>
          <p className={styles.p}>
            The Efficiency pillar looks at the operational and technical
            performance of the project. This includes network uptime,
            transaction throughput, gas optimization, development activity,
            and the overall health of the protocol&apos;s infrastructure.
            A project can be secure in theory but inefficient in practice
            — and that gap matters to users.
          </p>
          <ul className={styles.ul}>
            <li className={styles.li}>Network uptime and reliability</li>
            <li className={styles.li}>Transaction performance and cost efficiency</li>
            <li className={styles.li}>Development velocity and contributor activity</li>
            <li className={styles.li}>Infrastructure health and monitoring</li>
          </ul>
        </section>

        <section>
          <h2 className={styles.h2}>How Scores Are Calculated</h2>
          <p className={styles.p}>
            Each pillar is scored independently on a normalized scale, then
            combined into an overall SAFE score. The weighting is calibrated
            to reflect real-world risk — Security and Fidelity carry
            slightly more weight because they directly impact user fund
            safety. All data sources, scoring criteria, and weightings are
            published on our Methodology page for full transparency.
          </p>
        </section>

        <section>
          <h2 className={styles.h2}>Why Transparency Matters</h2>
          <p className={styles.p}>
            Unlike opaque rating systems, SafeScoring publishes the full
            breakdown of every score. You can see exactly which factors
            contributed to a project&apos;s rating, what data sources were
            used, and how the score changed over time. We believe
            transparency is the foundation of trust — especially in an
            industry that desperately needs it.
          </p>
        </section>

        <section>
          <h2 className={styles.h2}>Get Started</h2>
          <p className={styles.p}>
            Explore our{" "}
            <a href="/leaderboard" className="link link-primary">
              Leaderboard
            </a>{" "}
            to see how top crypto projects rank, or visit the{" "}
            <a href="/methodology" className="link link-primary">
              Methodology
            </a>{" "}
            page for the full technical details behind each pillar. If you
            have questions or feedback, we&apos;d love to hear from you.
          </p>
        </section>
      </>
    ),
  },
];
