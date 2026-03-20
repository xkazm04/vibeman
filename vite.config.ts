import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Vite config for Tauri mode
// Replaces Next.js bundling with a standard React SPA build
export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      // Next.js compatibility shims — redirect next/* imports to no-op stubs
      'next/image': path.resolve(__dirname, 'src/shims/next-compat.ts'),
      'next/link': path.resolve(__dirname, 'src/shims/next-compat.ts'),
      'next/navigation': path.resolve(__dirname, 'src/shims/next-compat.ts'),
      'next/server': path.resolve(__dirname, 'src/shims/next-compat.ts'),
      'next/font/google': path.resolve(__dirname, 'src/shims/next-compat.ts'),
      'next/dynamic': path.resolve(__dirname, 'src/shims/next-compat.ts'),
    },
  },

  // Tauri expects a fixed port
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },

  build: {
    outDir: 'dist',
    target: 'esnext',
    minify: 'esbuild',
    // Exclude server-only packages from client bundle
    rollupOptions: {
      external: [
        'better-sqlite3',
        'chokidar',
        'ts-morph',
        '@ts-morph/common',
        'playwright-core',
        '@anthropic-ai/claude-agent-sdk',
        '@anthropic-ai/sdk',
        '@aws-sdk/client-bedrock-runtime',
        '@aws-sdk/credential-providers',
        '@smithy/node-http-handler',
        '@github/copilot-sdk',
        '@modelcontextprotocol/sdk',
        'fs',
        'fs/promises',
        'path',
        'child_process',
        'crypto',
        'events',
        'stream',
        'net',
        'http',
        'https',
        'os',
        'url',
        'util',
      ],
    },
  },

  // Exclude server-only files from dev server
  optimizeDeps: {
    exclude: [
      'better-sqlite3',
      'chokidar',
      'ts-morph',
      'playwright-core',
    ],
  },

  // Env prefix for client-side variables
  envPrefix: ['VITE_', 'TAURI_'],
});
