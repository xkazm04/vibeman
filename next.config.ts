import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  experimental: {
    // Cap Turbopack's dev compiler memory (bytes). Without this, a large/long-lived
    // persistent dev cache (.next/dev/cache) can balloon idle RAM to multiple GB and
    // peg a CPU core on RocksDB compaction at startup. Pair with `npm run clean` when
    // .next grows large on disk (the memory limit bounds RAM, not the on-disk cache).
    //
    // Measured 2026-06-07 (A/B, clean cache, root page + 4 API routes):
    //  - persistent dev cache ON vs OFF: identical in-session RSS (~3.0 GB idle
    //    after compiling `/`); cache makes warm restarts 11x faster (`/` 1.2s vs
    //    14s) and post-restart RSS ~1.1 GB vs ~3 GB -> KEEP the cache ON.
    //  - limit 1 GB vs 2 GB: identical RSS and compile times -> the limit does
    //    not bound in-session compile state; keep 2 GB as the cache-compaction
    //    guard. In-session RSS is driven by module-graph size (see A2/D10).
    turbopackMemoryLimit: 2 * 1024 * 1024 * 1024, // 2 GB
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.simpleicons.org' },
    ],
  },
  // Externalize server-only packages that shouldn't be bundled
  serverExternalPackages: [
    'ts-morph',
    '@ts-morph/common',
  ],
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
              // Script sources - allow self, inline scripts, and localhost (for remotes)
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:*",
              // Style sources - allow self and inline styles
              "style-src 'self' 'unsafe-inline'",
              // Image sources - allow self, data URIs, and blob URIs
              "img-src 'self' data: blob: https:",
              // Font sources - allow self and data URIs
              "font-src 'self' data:",
              // Media sources - allow self, blob URIs, and data URIs (for TTS audio playback)
              "media-src 'self' blob: data:",
              // Connect sources - allow self, localhost (for remotes), and Supabase
              "connect-src 'self' http://localhost:* https://*.supabase.co wss://*.supabase.co",
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
            value: 'camera=(), microphone=(self), geolocation=(), interest-cohort=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
