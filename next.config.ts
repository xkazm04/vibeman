import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
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
              // Media sources - allow self and blob URIs
              "media-src 'self' blob:",
              // Connect sources - allow self and localhost (for remotes)
              "connect-src 'self' http://localhost:*",
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
  webpack(config, options) {
    const { isServer } = options;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const NextFederationPlugin = require('@module-federation/nextjs-mf');

    config.plugins.push(
      new NextFederationPlugin({
        name: 'vibeman',
        filename: 'static/chunks/remoteEntry.js',
        remotes: {
          // Remotes will be loaded dynamically, but we can define static ones here if needed
        },
        shared: {
          // react: { singleton: true, eager: true, requiredVersion: false },
          // 'react-dom': { singleton: true, eager: true, requiredVersion: false },
        },
        extraOptions: {
          automaticAsyncBoundary: true,
        },
      })
    );

    return config;
  },
};

export default nextConfig;
