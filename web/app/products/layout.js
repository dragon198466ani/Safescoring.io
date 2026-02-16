// SEO Metadata for products section
export const metadata = {
  title: "Crypto Products Security Database | SafeScoring",
  description: "Browse security scores for 100+ crypto products. Each product is evaluated against thousands of security norms across Security, Adversity, Fidelity & Efficiency pillars. Compare wallets, exchanges, DeFi protocols and more.",
  keywords: [
    "crypto security",
    "hardware wallet security",
    "software wallet security",
    "exchange security rating",
    "DeFi security audit",
    "crypto product comparison",
    "SAFE score",
    "blockchain security",
    "wallet security rating",
    "crypto security database",
    "is ledger safe",
    "is trezor safe",
    "best crypto wallet",
    "secure crypto exchange",
  ],
  openGraph: {
    title: "Crypto Products Security Database | SafeScoring",
    description: "Browse and compare security scores for 100+ crypto products. Find the safest wallets, exchanges, and DeFi protocols.",
    url: "https://safescoring.io/products",
    siteName: "SafeScoring",
    type: "website",
    images: [
      {
        url: "/og-products.png",
        width: 1200,
        height: 630,
        alt: "SafeScoring Products Database",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Crypto Products Security Database | SafeScoring",
    description: "Browse and compare security scores for 100+ crypto products.",
    images: ["/og-products.png"],
  },
  alternates: {
    canonical: "https://safescoring.io/products",
  },
};

export default function ProductsLayout({ children }) {
  return children;
}
