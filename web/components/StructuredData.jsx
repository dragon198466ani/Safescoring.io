/**
 * JSON-LD Structured Data Components for SEO
 *
 * These components add structured data to pages for better search engine visibility.
 * Supports:
 * - Organization
 * - Product (for crypto product pages)
 * - Review/Rating
 * - Article (for blog posts)
 * - FAQ
 * - BreadcrumbList
 */

// Organization schema for the main site
export function OrganizationSchema() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "SafeScoring",
    "alternateName": "SafeScoring.io",
    "url": "https://safescoring.io",
    "logo": "https://safescoring.io/logo.png",
    "description": "Open-source security rating system for cryptocurrency products using the SAFE methodology",
    "sameAs": [
      "https://twitter.com/safescoring",
      "https://github.com/safescoring",
    ],
    "contactPoint": {
      "@type": "ContactPoint",
      "email": "contact@safescoring.io",
      "contactType": "customer service"
    }
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

// Product schema for individual product pages
export function ProductSchema({ product, score, scores }) {
  if (!product) return null;

  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.name,
    "description": product.description || `Security rating and evaluation for ${product.name}`,
    "url": `https://safescoring.io/products/${product.slug}`,
    "image": product.logo || `https://safescoring.io/api/og/${product.slug}`,
    "brand": {
      "@type": "Brand",
      "name": product.brand || product.name
    },
    "category": product.type || "Cryptocurrency Product",
    "aggregateRating": score ? {
      "@type": "AggregateRating",
      "ratingValue": score,
      "bestRating": 100,
      "worstRating": 0,
      "ratingCount": 1,
      "reviewCount": 1
    } : undefined,
    "review": score ? {
      "@type": "Review",
      "author": {
        "@type": "Organization",
        "name": "SafeScoring"
      },
      "datePublished": new Date().toISOString().split('T')[0],
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": score,
        "bestRating": 100,
        "worstRating": 0
      },
      "reviewBody": `SafeScore security evaluation: ${score}/100. Security: ${scores?.s || 'N/A'}, Adversity: ${scores?.a || 'N/A'}, Fidelity: ${scores?.f || 'N/A'}, Efficiency: ${scores?.e || 'N/A'}.`
    } : undefined,
    "additionalProperty": scores ? [
      {
        "@type": "PropertyValue",
        "name": "Security Score",
        "value": scores.s
      },
      {
        "@type": "PropertyValue",
        "name": "Adversity Score",
        "value": scores.a
      },
      {
        "@type": "PropertyValue",
        "name": "Fidelity Score",
        "value": scores.f
      },
      {
        "@type": "PropertyValue",
        "name": "Efficiency Score",
        "value": scores.e
      }
    ] : undefined
  };

  // Remove undefined properties
  const cleanData = JSON.parse(JSON.stringify(data));

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(cleanData) }}
    />
  );
}

// Article schema for blog posts
export function ArticleSchema({ article }) {
  if (!article) return null;

  const data = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": article.title,
    "description": article.excerpt || article.description,
    "image": article.image || article.coverImage,
    "datePublished": article.publishedAt || article.createdAt,
    "dateModified": article.updatedAt || article.publishedAt,
    "author": {
      "@type": "Person",
      "name": article.author?.name || "SafeScoring Team",
      "url": article.author?.url || "https://safescoring.io/about"
    },
    "publisher": {
      "@type": "Organization",
      "name": "SafeScoring",
      "logo": {
        "@type": "ImageObject",
        "url": "https://safescoring.io/logo.png"
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `https://safescoring.io/blog/${article.slug}`
    }
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

// FAQ schema for FAQ pages or sections
export function FAQSchema({ faqs }) {
  if (!faqs || faqs.length === 0) return null;

  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

// Breadcrumb schema for navigation
export function BreadcrumbSchema({ items }) {
  if (!items || items.length === 0) return null;

  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url ? `https://safescoring.io${item.url}` : undefined
    }))
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

// Software Application schema (for the platform itself)
export function SoftwareApplicationSchema() {
  const data = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "SafeScoring",
    "applicationCategory": "SecurityApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "ratingCount": "100"
    },
    "description": "Open-source security rating platform for cryptocurrency products"
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

// WebSite schema with search
export function WebSiteSchema() {
  const data = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "SafeScoring",
    "url": "https://safescoring.io",
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": "https://safescoring.io/products?q={search_term_string}"
      },
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

// Comparison page schema
export function ComparisonSchema({ products }) {
  if (!products || products.length < 2) return null;

  const data = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": `Security Comparison: ${products.map(p => p.name).join(' vs ')}`,
    "description": `Compare security ratings of ${products.map(p => p.name).join(', ')}`,
    "numberOfItems": products.length,
    "itemListElement": products.map((product, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "item": {
        "@type": "Product",
        "name": product.name,
        "url": `https://safescoring.io/products/${product.slug}`,
        "aggregateRating": product.score ? {
          "@type": "AggregateRating",
          "ratingValue": product.score,
          "bestRating": 100,
          "worstRating": 0,
          "ratingCount": 1
        } : undefined
      }
    }))
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

// Export a combined component for main layout
export function GlobalStructuredData() {
  return (
    <>
      <OrganizationSchema />
      <WebSiteSchema />
    </>
  );
}

export default {
  OrganizationSchema,
  ProductSchema,
  ArticleSchema,
  FAQSchema,
  BreadcrumbSchema,
  SoftwareApplicationSchema,
  WebSiteSchema,
  ComparisonSchema,
  GlobalStructuredData,
};
