/**
 * Dutch translations - NL
 * Minimal SEO-focused translation file
 */
export default {
  // Meta
  lang: "nl",
  langName: "Nederlands",

  // SEO Meta Tags (for dynamic SEO)
  seo: {
    // Homepage
    homeTitle: "SafeScoring - Crypto Beveiligingsbeoordelingen & Wallet Vergelijking",
    homeDescription: "De eerste uniforme beveiligingsbeoordeling voor alle crypto producten. Vergelijk hardware wallets, software wallets, exchanges & DeFi protocollen. {totalNorms} normen. {totalProducts}+ producten beoordeeld.",
    
    // Products page
    productsTitle: "Crypto Producten Beveiligingsdatabase | SafeScoring",
    productsDescription: "Bekijk beveiligingsscores voor {totalProducts}+ crypto producten. Elk product beoordeeld op {totalNorms} beveiligingsnormen. Vergelijk wallets, exchanges, DeFi protocollen.",
    
    // Compare page
    compareTitle: "Vergelijk Crypto Producten - Beveiligingsvergelijking Tool | SafeScoring",
    compareDescription: "Zij-aan-zij beveiligingsvergelijking van crypto wallets, exchanges en DeFi protocollen. Vind de veiligste producten.",
    
    // Methodology page
    methodologyTitle: "SAFE Methodologie - Hoe We Crypto Beveiliging Beoordelen | SafeScoring",
    methodologyDescription: "Ontdek hoe SafeScoring crypto producten beoordeelt op 4 pijlers: Beveiliging, Tegenspoed, Betrouwbaarheid, Efficiëntie. {totalNorms} normen. Transparante methodologie.",
    
    // Best pages
    bestHardwareWallets: "Beste Hardware Wallets {year} - Beveiligingsranking | SafeScoring",
    bestSoftwareWallets: "Beste Software Wallets {year} - Beveiligingsranking | SafeScoring",
    bestExchanges: "Beste Crypto Exchanges {year} - Beveiligingsranking | SafeScoring",
    bestDefi: "Beste DeFi Protocollen {year} - Beveiligingsranking | SafeScoring",
  },

  // Common
  common: {
    back: "Terug",
    save: "Opslaan",
    cancel: "Annuleren",
    loading: "Laden...",
    error: "Fout",
    success: "Succes",
    learnMore: "Meer informatie",
    search: "Zoeken",
    filter: "Filter",
    close: "Sluiten",
  },

  // Navigation
  nav: {
    products: "Producten",
    compare: "Vergelijken",
    methodology: "Methodologie",
    pricing: "Prijzen",
    signIn: "Inloggen",
  },

  // Hero
  hero: {
    tagline: "{totalNorms} normen. {totalProducts}+ producten beoordeeld.",
    title: "Je crypto stack heeft een",
    titleHighlight: "beveiligingsblinde vlek",
    subtitle: "Hardware wallets. Software wallets. DeFi protocollen.",
    subtitleStrong: "Allemaal beoordeeld met dezelfde strenge methodologie.",
    ctaPrimary: "Analyseer Je Stack",
    ctaSecondary: "Bekijk Producten",
    trustIndicator: "Gratis · 2 min · Geen registratie nodig",
    statsNorms: "Normen",
    statsProducts: "Producten",
    statsTypes: "Types",
  },

  productDetail: {
    stats: {
      norms: "Normen",
      yes: "Ja",
      no: "Nee",
      na: "n.v.t.",
    },
    typeSeparator: "•",
    typeUnknown: "Onbekend",
    descriptionFallback: "{product} is een {type} beoordeeld door SafeScoring.",
  },

  about: {
    meta: {
      title: "Over {app} - Onze missie",
      description: "Lees hoe SafeScoring transparantie en objectiviteit brengt in crypto-beveiligingsratings.",
    },
    hero: {
      badge: "Onze missie",
      titleStart: "Crypto-beveiliging",
      titleHighlight: "meetbaar maken",
      subtitle: "Beveiliging moet objectief, transparant en toegankelijk zijn. Geen marketing. Geen betaalde endorsements. Alleen data.",
    },
    problem: {
      title: "Het probleem dat we zagen",
      body1: "Volgens rapporten waren de meeste gehackte DeFi-projecten geaudit. Miljarden gingen verloren ondanks “veiligheidscertificaten”.",
      body2: "De sector had iets anders nodig: een uniforme rating die verder gaat dan code-audits en echte veiligheid meet.",
      body3: "SafeScoring ontstond uit die behoefte.",
      stats: {
        norms: "beveiligingsnormen",
        pillars: "SAFE-pijlers",
        types: "producttypes",
        framework: "uniform framework",
      },
    },
    values: {
      title: "Onze waarden",
      subtitle: "Principes die elke score sturen",
      independence: {
        title: "Onafhankelijkheid",
        desc: "Affiliates beïnvloeden de scores niet. Alleen de methodologie telt.",
      },
      transparency: {
        title: "Transparantie",
        desc: "Open methodologie. Elke norm en elk criterium is openbaar.",
      },
      rigor: {
        title: "Strengheid",
        desc: "916 normen over 4 pijlers. Geen shortcuts, geen subjectieve meningen.",
      },
      accessibility: {
        title: "Toegankelijkheid",
        desc: "Beveiligingskennis voor iedereen, niet alleen tech-experts.",
      },
    },
    cta: {
      title: "Klaar om het verschil te zien?",
      body: "Bekijk onze productratings of leer meer over de methodologie.",
      primary: "Producten verkennen",
      secondary: "Methodologie leren",
    },
  },
  audit: {
    hero: {
      badge: "Quick Turnaround",
      title: "Get Your",
      titleHighlight: "SAFE Audit",
      subtitle: "Professional security scoring for DeFi protocols, wallets, and exchanges. Results in 24-72 hours.",
    },
    stats: {
      norms: "Norms evaluated",
      fastest: "Fastest turnaround",
      projects: "Projects audited",
      hacks: "Hacks had audits",
    },
    tiers: {
      title: "Choose Your Audit Level",
      popular: "Most Popular",
      perAudit: "/ audit",
      turnaround: "{time} turnaround",
      more: "+ {count} more",
      ideal: "Ideal for: {ideal}",
      express: {
        name: "Express",
        desc: "Quick score for marketing",
        features: {
          score: "SAFE score calculation",
          breakdown: "4-pillar breakdown (S.A.F.E)",
          pdf: "Basic PDF report",
          delivery: "Email delivery",
        },
        ideal: "Startups needing quick validation",
      },
      standard: {
        name: "Standard",
        desc: "Detailed analysis + recommendations",
        features: {
          everythingExpress: "Everything in Express",
          pillar: "Detailed pillar analysis",
          competitor: "Competitor comparison",
          roadmap: "Improvement roadmap",
          brandedPdf: "Branded PDF report",
        },
        ideal: "Projects preparing for launch",
      },
      premium: {
        name: "Premium",
        desc: "Full audit + badge + support",
        features: {
          everythingStandard: "Everything in Standard",
          review: "In-depth security review",
          architecture: "Architecture feedback",
          badge: "SAFE Verified badge (1 year)",
          priority: "Priority listing",
          press: "Press release template",
          support: "30-day support",
        },
        ideal: "Established protocols seeking trust",
      },
    },
    urgent: {
      title: "Rush delivery",
      surcharge: "(+20%)",
      note: "Priority processing, faster turnaround",
    },
    form: {
      title: "Request Your Audit",
      tierLabel: "{tier} Audit",
      projectName: "Project Name *",
      projectNamePlaceholder: "My DeFi Protocol",
      projectUrl: "Project URL *",
      projectUrlPlaceholder: "https://myprotocol.finance",
      projectType: "Project Type *",
      types: {
        defi: "DeFi Protocol",
        wallet: "Wallet",
        exchange: "Exchange",
        bridge: "Bridge",
        nft: "NFT Platform",
        other: "Other",
      },
      email: "Email *",
      emailPlaceholder: "team@protocol.finance",
      description: "Project Description",
      descriptionPlaceholder: "Brief description of your project, key features, and what you'd like us to focus on...",
      telegram: "Telegram (optional)",
      telegramPlaceholder: "@yourhandle",
      twitter: "Twitter (optional)",
      twitterPlaceholder: "@yourproject",
      submit: "Request {tier} Audit - ${price}",
      paymentNote: "Payment details will be sent after we review your request. We accept crypto (BTC, ETH, USDC) and card payments.",
      submitError: "Failed to submit request",
    },
    success: {
      title: "Request Received!",
      subtitle: "Your audit request has been submitted successfully.",
      reference: "Reference",
      tier: "Tier",
      price: "Price",
      turnaround: "Turnaround",
      nextSteps: "Next Steps:",
      cta: "Browse Existing Scores",
    },
    testimonials: {
      title: "What Projects Say",
      first: {
        quote: "Got our SAFE score in 24h. Displayed it on our homepage and saw 35% more deposits within a week.",
        author: "DeFi Founder",
        project: "Lending Protocol",
      },
      second: {
        quote: "The improvement roadmap was gold. We fixed 3 critical issues we didn't know about.",
        author: "CTO",
        project: "DEX",
      },
    },
    faq: {
      title: "Frequently Asked Questions",
      difference: {
        q: "How is a SAFE audit different from a code audit?",
        a: "Code audits check for bugs in smart contracts. SAFE audits evaluate operational security, backup procedures, incident response, team reliability, and more - 2,159 security norms total. 87% of hacked projects had code audits.",
      },
      provide: {
        q: "What do I need to provide?",
        a: "Your project URL, documentation, and any relevant links (GitHub, docs, etc.). For Premium audits, we may request access to internal documentation.",
      },
      display: {
        q: "Can I display my score publicly?",
        a: "Yes! All audit tiers include permission to display your SAFE score. Premium tier includes the official 'SAFE Verified' badge.",
      },
      disagree: {
        q: "What if I disagree with the score?",
        a: "We offer a review process. If you can provide evidence that changes our assessment, we'll update your score at no extra cost.",
      },
    },
  },

  enterprise: {
    hero: {
      badge: "For Businesses & Institutions",
      title: "Secure Your",
      titleHighlight: "Crypto Treasury",
      subtitle: "Make informed decisions before deploying capital. Evaluate {products}+ products against {norms} security standards.",
      ctaPrimary: "Talk to Sales",
      ctaSecondary: "Try Free First",
    },
    trust: {
      title: "Trusted by teams at",
      dao: "DAO Treasuries",
      family: "Family Offices",
      funds: "Crypto Funds",
    },
    problem: {
      title: "The Problem with Crypto Due Diligence",
      cards: {
        audits: "of hacked projects had audits. Audits alone are not enough.",
        losses: "lost to crypto hacks in 2024. Most were preventable.",
        diligence: "hours typical due diligence per product. We do it in minutes.",
      },
    },
    useCases: {
      title: "Built for Your Use Case",
      treasury: {
        title: "Corporate Treasury",
        desc: "Evaluate wallets, exchanges and custody solutions before allocating company funds.",
      },
      funds: {
        title: "Investment Funds",
        desc: "Due diligence on DeFi protocols, staking platforms and yield strategies before deploying capital.",
      },
      security: {
        title: "Security Teams",
        desc: "Assess operational security of crypto infrastructure used by your organization.",
      },
      compliance: {
        title: "Compliance & Risk",
        desc: "Document security assessments for regulatory requirements and internal audits.",
      },
    },
    methodology: {
      title: "The SAFE Methodology",
      subtitle: "4 pillars, {norms} security norms, complete coverage",
      securityDesc: "Cryptography, key management, smart contract security, authentication",
      adversityDesc: "Physical attacks, social engineering, regulatory risks, operational resilience",
      fidelityDesc: "Reliability, uptime, backup procedures, disaster recovery, track record",
      efficiencyDesc: "User experience, documentation, support quality, integration capabilities",
    },
    features: {
      title: "Enterprise Features",
      subtitle: "Everything you need for institutional-grade security assessment",
      items: {
        onboarding: { title: "Dedicated Onboarding", desc: "1-on-1 setup call to configure your workspace and train your team" },
        prioritySupport: { title: "Priority Support (<4h)", desc: "Fast response during business hours with a dedicated Slack channel" },
        customEval: { title: "Custom Evaluations (5/mo)", desc: "Request evaluation of any product not yet in our database" },
        complianceReports: { title: "Compliance-Ready Reports", desc: "Board-ready PDF reports with audit trail for regulatory needs" },
        teamRoles: { title: "Team Seats & Roles", desc: "Granular permissions, activity logs, and collaborative setups" },
        sso: { title: "SSO Integration (on request)", desc: "Connect with your corporate identity provider - contact us to set up" },
        unlimitedApi: { title: "Unlimited API", desc: "Integrate SAFE scores into internal tools, dashboards, and workflows" },
        unlimitedAll: { title: "Unlimited Everything", desc: "No limits on setups, products, SafeBot AI, or data exports" },
      },
    },
    pricing: {
      title: "Enterprise Plan",
      perMonth: "/month",
      note: "Billed annually. Volume discounts available.",
      showComparison: "Show plan comparison",
      hideComparison: "Hide plan comparison",
      table: {
        feature: "Feature",
        free: "Free",
        explorer: "Explorer",
        pro: "Professional",
        enterprise: "Enterprise",
      },
      features: {
        productsAnalyzed: "Products analyzed",
        setups: "Setups",
        teamMembers: "Team members",
        apiCalls: "API calls",
        pdfExports: "PDF exports",
        customEvaluations: "Custom evaluations",
        support: "Support",
        onboarding: "Onboarding",
        sso: "SSO",
      },
      ctaPrimary: "Contact Sales",
      ctaSecondary: "View All Plans",
    },
    compliance: {
      title: "Security & Compliance",
      soc2: { title: "SOC 2 Ready", desc: "Reports help document your security due diligence for compliance" },
      gdpr: { title: "GDPR Compliant", desc: "Data hosted in EU, no personal data shared with third parties" },
      audit: { title: "Audit Trail", desc: "Complete history of all assessments and changes for your records" },
    },
    cta: {
      title: "Ready to Secure Your Treasury?",
      body: "Join companies making data-driven decisions about their crypto infrastructure.",
      primary: "Schedule a Demo",
      secondary: "Explore Products",
    },
  },

  trust: {
    hero: {
      badge: "Verified Transparency",
      title: "Trust &",
      titleHighlight: "Transparency",
      subtitle: "We believe trust is earned through transparency, not claims. Here is everything you need to verify SafeScoring is legitimate.",
    },
    stats: {
      norms: "Security Norms",
      products: "Products Evaluated",
      proofs: "Blockchain Proofs",
      days: "Days Online",
    },
    sections: {
      identity: { title: "Identity & Legal" },
      methodology: { title: "Methodology Transparency" },
      blockchain: { title: "Blockchain Proofs" },
      business: { title: "Business Model" },
    },
    identity: {
      subtitle: "Legal entity and contact information",
      items: {
        companyName: "Company Name",
        legalForm: "Legal Form",
        country: "Country",
        formation: "Formation",
        contactEmail: "Contact Email",
        supportEmail: "Support Email",
        domainAge: "Domain Age",
        team: "Team",
      },
      values: {
        formation: "{year}",
        domainAge: "Registered {year}",
        team: "Pseudonymous",
      },
      pseudo: {
        title: "Why pseudonymous?",
        body: "Like Bitcoin's creator, we believe objective ratings require independence from personal relationships. Our methodology is 100% public - judge us by our work, not our identity. The LLC provides legal accountability.",
      },
    },
    methodology: {
      subtitle: "Our evaluation criteria are 100% public",
      publish: {
        title: "What We Publish",
        norms: "{count} security norms with descriptions",
        pillars: "4 evaluation pillars (SAFE framework)",
        weighting: "Weighting methodology",
        classifications: "Product type classifications",
        criteria: "All evaluation criteria",
      },
      proprietary: {
        title: "Why Code is Proprietary",
        p1Start: "Like Moody's, S&P, and Certik, we publish our",
        methodology: "methodology",
        p1Middle: "while keeping our",
        implementation: "implementation",
        p1End: "proprietary.",
        p2: "This prevents low-effort clones while ensuring full transparency on HOW we evaluate products.",
      },
      ctaPrimary: "View Full Methodology",
      ctaSecondary: "API Documentation",
    },
    blockchain: {
      subtitle: "Immutable timestamps prove when we evaluated each product",
      stats: {
        networkValue: "Polygon",
        networkLabel: "Network",
        hashValue: "SHA-256",
        hashLabel: "Hash Algorithm",
        commitValue: "Weekly",
        commitLabel: "Merkle Commits",
      },
      body: "Every evaluation is hashed and committed to the Polygon blockchain. This creates an immutable record proving when we evaluated each product.",
      ctaPrimary: "View Proof System",
      ctaSecondary: "Verify on Polygonscan",
    },
    business: {
      subtitle: "How we make money (spoiler: subscriptions)",
      revenue: {
        title: "Revenue Sources",
        items: {
          subscriptions: "SaaS subscriptions ($19-$499/month)",
          api: "API access for developers",
          enterprise: "Enterprise plans",
          affiliate: "Affiliate commissions (optional)",
        },
      },
      no: {
        title: "What We DON'T Do",
        items: {
          tokens: "No token sales or ICO",
          yield: "No yield/staking promises",
          rankings: "No paid rankings",
          fees: "No hidden fees",
        },
      },
      cta: "View Pricing",
    },
    validation: {
      title: "External Validation",
      standards: {
        title: "Standards Referenced",
        desc: "Based on NIST, ISO 27001, BIP standards",
      },
      payments: {
        title: "Payments By",
        desc: "Lemon Squeezy + NowPayments",
      },
      hosted: {
        title: "Hosted On",
        desc: "Vercel + Supabase",
      },
    },
    cta: {
      title: "Still have questions?",
      body: "We're happy to answer any questions about our methodology, business model, or transparency practices.",
      primary: "Contact Us",
      secondary: "View Methodology",
    },
  },

  certification: {
    hero: {
      badge: "SAFE Certification",
      title: "Make security",
      titleHighlight: "verifiable",
      subtitle:
        "Independent, data-driven certification that proves your product meets global security standards. No pay-to-win, no vanity badges.",
    },
    stats: {
      hacked: "of hacked projects had audits",
      norms: "security norms analyzed",
      products: "products evaluated",
      bias: "conflicts of interest",
    },
    why: {
      title: "Why SAFE Certification?",
      audits: {
        title: "Audits are not enough",
        body: "Most hacked projects were audited. Certification must measure operational security, resilience, and real-world performance.",
      },
      norms: {
        title: "Global standards, not opinions",
        body: "916 norms across Security, Adversity, Fidelity, and Efficiency. Transparent and reproducible.",
      },
      trust: {
        title: "Trust you can prove",
        body: "Public badges, verifiable methodology, and transparent scoring that anyone can validate.",
      },
    },
    pricing: {
      title: "Choose Your Certification",
      subtitle: "Start with evaluation, then upgrade as you scale.",
      monthly: "Monthly",
      annual: "Annual",
      savePercent: "Save {percent}%",
      popular: "Most Popular",
      perYear: "/ year",
      savePerYear: "Save ${amount} per year",
    },
    tiers: {
      starter: {
        name: "Starter",
        desc: "Get evaluated and publish your score",
        features: {
          evaluation: "Full SAFE evaluation",
          publicScore: "Public score page",
          badge: "SAFE Evaluated badge",
          quarterly: "Quarterly re-checks",
          roadmap: "Improvement roadmap",
        },
        cta: "Start Evaluation",
      },
      verified: {
        name: "Verified",
        desc: "Verified badge + monthly monitoring",
        features: {
          everythingStarter: "Everything in Starter",
          badge: "SAFE Verified badge",
          monthly: "Monthly monitoring",
          priority: "Priority support",
          roadmap: "Roadmap review",
          manager: "Dedicated success manager",
          press: "Press kit template",
        },
        cta: "Get Verified",
      },
      enterprise: {
        name: "Enterprise",
        desc: "Custom certification for large teams",
        features: {
          everythingVerified: "Everything in Verified",
          badge: "Enterprise badge",
          monitoring: "Real-time monitoring",
          custom: "Custom norms and weighting",
          whitelabel: "White-label reports",
          api: "API access + webhooks",
          incident: "Incident response support",
          board: "Board-ready reporting",
          discount: "Volume discounts",
        },
        cta: "Contact Sales",
      },
    },
    badges: {
      evaluated: "SAFE Evaluated",
      verified: "SAFE Verified",
      enterprise: "SAFE Enterprise",
      score: "Score: {score}",
    },
    how: {
      title: "How It Works",
      steps: {
        apply: {
          title: "Apply",
          desc: "Submit your product details and documentation.",
        },
        evaluate: {
          title: "Evaluate",
          desc: "We score your product against 916 security norms.",
        },
        review: {
          title: "Review",
          desc: "You receive a full report and improvement roadmap.",
        },
        certify: {
          title: "Certify",
          desc: "Publish your badge and share your verified score.",
        },
      },
    },
    testimonials: {
      title: "What Teams Say",
      first: {
        quote: "The SAFE badge helped us close partnerships faster.",
        author: "Head of Security",
        role: "DeFi Protocol",
      },
      second: {
        quote: "We finally had a transparent, repeatable security standard.",
        author: "COO",
        role: "Wallet Provider",
      },
    },
    cta: {
      title: "Ready to certify your product?",
      body: "Join teams worldwide using SAFE Certification to prove security with data.",
      primary: "Apply Now",
      secondary: "Talk to Sales",
    },
  },
};
