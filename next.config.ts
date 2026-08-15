import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

const MB = 1024 * 1024;
const DAY = 60 * 60 * 24;

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), payment=(), geolocation=(self)",
  },
];

const hstsHeader = {
  key: "Strict-Transport-Security",
  value: "max-age=63072000; includeSubDomains; preload",
};

const ticketOgCache = {
  key: "Cache-Control",
  value: "public, max-age=300, stale-while-revalidate=86400",
};

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  typedRoutes: true,
  trailingSlash: false,
  cacheMaxMemorySize: 80 * MB,

  logging: {
    fetches: { fullUrl: isDev },
  },

  onDemandEntries: {
    maxInactiveAge: 60_000,
    pagesBufferLength: 8,
  },

  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: DAY,
    remotePatterns: [
      { protocol: "https", hostname: "*.basemaps.cartocdn.com" },
      { protocol: "https", hostname: "server.arcgisonline.com" },
    ],
  },

  headers() {
    return [
      {
        source: "/:path*",
        headers: isDev ? securityHeaders : [...securityHeaders, hstsHeader],
      },
      {
        source: "/:locale/ticket-og",
        headers: [ticketOgCache],
      },
    ];
  },
};

export default nextConfig;
