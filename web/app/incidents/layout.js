import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Crypto Security Incidents Database | SafeScoring",
  description: "Track cryptocurrency hacks, exploits, and security breaches. Comprehensive database of crypto security incidents with $50B+ in tracked losses. Stay informed to protect your assets.",
  keywords: [
    "crypto hack",
    "cryptocurrency exploit",
    "defi hack",
    "blockchain security incident",
    "crypto theft",
    "exchange hack",
    "smart contract exploit",
    "rug pull",
    "crypto scam database",
  ],
  openGraph: {
    title: "Crypto Security Incidents Database",
    description: "Track cryptocurrency hacks, exploits, and security breaches. Learn from $50B+ in tracked losses.",
    url: "https://safescoring.io/incidents",
    siteName: "SafeScoring",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Crypto Security Incidents Database",
    description: "Track cryptocurrency hacks, exploits, and security breaches.",
  },
  alternates: {
    canonical: "https://safescoring.io/incidents",
  },
};

// JSON-LD for incidents page
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Crypto Security Incidents Database",
  "description": "Comprehensive database tracking cryptocurrency hacks, exploits, and security breaches",
  "url": "https://safescoring.io/incidents",
  "isPartOf": {
    "@type": "WebSite",
    "name": "SafeScoring",
    "url": "https://safescoring.io"
  },
  "about": {
    "@type": "Thing",
    "name": "Cryptocurrency Security Incidents"
  },
  "mainEntity": {
    "@type": "Dataset",
    "name": "Crypto Security Incidents Database",
    "description": "Database of cryptocurrency hacks, exploits, rug pulls, and security breaches",
    "keywords": ["crypto", "hack", "exploit", "security", "incident", "defi", "blockchain"],
    "creator": {
      "@type": "Organization",
      "name": "SafeScoring"
    }
  }
};

export default function IncidentsLayout({ children }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />
      {children}
      <Footer />
    </>
  );
}
