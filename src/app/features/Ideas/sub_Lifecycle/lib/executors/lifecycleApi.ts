/**
 * Lifecycle executor HTTP helper.
 *
 * Phase executors run SERVER-SIDE (imported by /api/lifecycle/route.ts), where
 * Node's `fetch` throws on relative URLs ("Failed to parse URL"). Every executor
 * must therefore build an ABSOLUTE URL the same way the sibling routes do —
 * via `env.baseUrl()` (see e.g. /api/lifecycle/scan/route.ts). Centralising the
 * join here keeps all executors consistent and gives one testable seam.
 */

import { env } from '@/lib/config/envConfig';

/**
 * Build an absolute URL for an internal lifecycle/ideas API path.
 * @param path A root-relative path beginning with '/', e.g. '/api/lifecycle/scan'.
 */
export function lifecycleUrl(path: string): string {
  const base = env.baseUrl().replace(/\/$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
}
