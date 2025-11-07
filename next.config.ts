import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Apply headers to all routes
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              // Default source - self only
              "default-src 'self'",
              // Script sources - allow self and inline scripts (needed for Next.js)
              // unsafe-inline is required for React hydration
              // unsafe-eval is required for Next.js dev mode
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              // Style sources - allow self and inline styles (needed for styled-components/CSS-in-JS)
              "style-src 'self' 'unsafe-inline'",
              // Image sources - allow self, data URIs, and blob URIs
              "img-src 'self' data: blob: https:",
              // Font sources - allow self and data URIs
              "font-src 'self' data:",
              // Media sources - allow self and blob URIs (for audio/video playback)
              "media-src 'self' blob:",
              // Connect sources - allow self (for API calls)
              "connect-src 'self'",
              // Frame sources - disallow all frames
              "frame-src 'none'",
              // Object sources - disallow plugins
              "object-src 'none'",
              // Base URI - restrict to self
              "base-uri 'self'",
              // Form action - restrict to self
              "form-action 'self'",
              // Frame ancestors - disallow embedding
              "frame-ancestors 'none'",
              // Upgrade insecure requests
              "upgrade-insecure-requests",
            ].join('; '),
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
