/** @type {import('next').NextConfig} */

// Security headers configuration
const securityHeaders = [
  // Prevent clickjacking attacks
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  // Prevent MIME type sniffing
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  // Enable XSS filtering
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  // Control referrer information
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  // Permissions Policy (formerly Feature-Policy)
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  // Force HTTPS (enable in production)
  ...(process.env.NODE_ENV === 'production' ? [{
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains',
  }] : []),
  // Content Security Policy - Sécurisé (sans unsafe-eval)
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // unsafe-inline requis pour Next.js, unsafe-eval RETIRÉ (risque XSS)
      "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://js.stripe.com https://www.googletagmanager.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https: blob:",
      "font-src 'self' https://fonts.gstatic.com data:",
      "connect-src 'self' https://*.supabase.co https://api.stripe.com https://api.microlink.io wss://*.supabase.co https://www.google-analytics.com",
      "frame-src 'self' https://challenges.cloudflare.com https://js.stripe.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join('; '),
  },
];

const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',

  // Enable gzip/brotli compression
  compress: true,

  // Optimize production builds
  swcMinify: true,

  // Generate ETags for caching
  generateEtags: true,

  // Power optimizations
  poweredByHeader: false,

  // Don't fail build on ESLint warnings (only errors)
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Experimental optimizations
  experimental: {
    optimizeCss: true,
    scrollRestoration: true,
  },

  // Add security headers to all routes
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        // API routes - add CORS headers
        source: '/api/:path*',
        headers: [
          ...securityHeaders,
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.ALLOWED_ORIGINS || 'https://safescoring.io',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Requested-With',
          },
          {
            key: 'Access-Control-Max-Age',
            value: '86400',
          },
        ],
      },
    ];
  },

  images: {
    // Image optimization settings
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    remotePatterns: [
      // NextJS <Image> component needs to whitelist domains for src={}
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "pbs.twimg.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "logos-world.net",
      },
      {
        protocol: "https",
        hostname: "**.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "safescoring.io",
      },
    ],
  },
  webpack: (config, { webpack, isServer }) => {
    // Ignore MongoDB's optional dependencies to prevent build warnings
    if (isServer) {
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^(kerberos|@mongodb-js\/zstd|@aws-sdk\/credential-providers|gcp-metadata|snappy|socks|aws4|mongodb-client-encryption)$/,
        })
      );
    }

    return config;
  },
};

module.exports = nextConfig;
