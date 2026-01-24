/**
 * Context Mapper Utility for Observability
 * Maps API paths to contexts for X-Ray visualization and traffic analysis
 */

import { contextApiRouteDb, contextDb, contextGroupDb } from '@/app/db';
import type { DbContextApiRoute, DbContext, DbContextGroup } from '@/app/db';

/**
 * Context mapping result with full context details
 */
export interface ContextMapping {
  contextId: string;
  contextName: string | null;
  contextGroupId: string | null;
  contextGroupName: string | null;
  layer: 'pages' | 'client' | 'server' | 'external';
  category: 'ui' | 'lib' | 'api' | 'data' | null;
  businessFeature: string | null;
}

/**
 * Determines the source layer based on request headers and origin
 */
export function determineSourceLayer(
  request: Request | { headers: Headers }
): 'pages' | 'client' | 'server' | null {
  // Check for common indicators of request origin
  const userAgent = request.headers.get('user-agent') || '';
  const referer = request.headers.get('referer') || '';
  const xRequestedWith = request.headers.get('x-requested-with') || '';
  const contentType = request.headers.get('content-type') || '';

  // Server-side requests (Next.js server components, API routes calling other APIs)
  if (userAgent.toLowerCase().includes('node') || userAgent === '') {
    return 'server';
  }

  // Client-side fetch/XHR requests
  if (xRequestedWith.toLowerCase() === 'xmlhttprequest' ||
      contentType.includes('application/json')) {
    return 'client';
  }

  // Page navigation (browser requests with referer)
  if (referer && !referer.includes('/api/')) {
    return 'pages';
  }

  // Default to client for browser requests
  if (userAgent.toLowerCase().includes('mozilla') ||
      userAgent.toLowerCase().includes('chrome') ||
      userAgent.toLowerCase().includes('safari')) {
    return 'client';
  }

  return null;
}

/**
 * Cache for context mappings to avoid repeated DB lookups
 * Uses LRU-style eviction with 5-minute TTL
 */
const contextCache = new Map<string, { mapping: ContextMapping | null; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 500;

/**
 * Clears expired cache entries and enforces max size
 */
function cleanCache(): void {
  const now = Date.now();
  const expiredKeys: string[] = [];

  for (const [key, value] of contextCache.entries()) {
    if (now - value.timestamp > CACHE_TTL_MS) {
      expiredKeys.push(key);
    }
  }

  for (const key of expiredKeys) {
    contextCache.delete(key);
  }

  // If still over max size, remove oldest entries
  if (contextCache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(contextCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);

    const toRemove = entries.slice(0, contextCache.size - MAX_CACHE_SIZE);
    for (const [key] of toRemove) {
      contextCache.delete(key);
    }
  }
}

/**
 * Normalizes API path for matching
 * Handles dynamic route segments like [id], [slug], etc.
 */
function normalizePath(path: string): string {
  return path
    // Remove trailing slash
    .replace(/\/$/, '')
    // Normalize dynamic segments for comparison
    .toLowerCase();
}

/**
 * Matches a request path against stored API route patterns
 * Supports exact matches and pattern matching with dynamic segments
 */
function matchApiRoute(requestPath: string): DbContextApiRoute | null {
  const normalizedRequest = normalizePath(requestPath);

  // First try exact match
  const exactMatch = contextApiRouteDb.findByPath(normalizedRequest);
  if (exactMatch) {
    return exactMatch;
  }

  // Try pattern matching for dynamic routes
  const allRoutes = contextApiRouteDb.getAll();

  for (const route of allRoutes) {
    const pattern = route.api_path;

    // Convert pattern with [param] to regex
    // e.g., /api/users/[id] -> /api/users/[^/]+
    const regexPattern = pattern
      .replace(/\[[\w]+\]/g, '[^/]+')
      .replace(/\//g, '\\/');

    const regex = new RegExp(`^${regexPattern}$`, 'i');
    if (regex.test(normalizedRequest)) {
      return route;
    }
  }

  return null;
}

/**
 * Maps an API path to its context information
 * Uses caching for performance
 */
export function mapPathToContext(apiPath: string): ContextMapping | null {
  const cacheKey = normalizePath(apiPath);

  // Check cache first
  const cached = contextCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.mapping;
  }

  // Perform lookup
  const route = matchApiRoute(apiPath);

  if (!route) {
    // Cache negative result too
    contextCache.set(cacheKey, { mapping: null, timestamp: Date.now() });
    cleanCache();
    return null;
  }

  // Get full context and group details
  const context = contextDb.getContextById(route.context_id);
  let contextGroup: DbContextGroup | null = null;

  if (context?.group_id) {
    contextGroup = contextGroupDb.getGroupById(context.group_id);
  }

  const mapping: ContextMapping = {
    contextId: route.context_id,
    contextName: context?.name || null,
    contextGroupId: context?.group_id || null,
    contextGroupName: contextGroup?.name || null,
    layer: route.layer as 'pages' | 'client' | 'server' | 'external',
    category: (context?.category as 'ui' | 'lib' | 'api' | 'data' | null) || null,
    businessFeature: context?.business_feature || null,
  };

  // Cache result
  contextCache.set(cacheKey, { mapping, timestamp: Date.now() });
  cleanCache();

  return mapping;
}

/**
 * Clears the context mapping cache
 * Useful when context_api_routes are updated
 */
export function clearContextCache(): void {
  contextCache.clear();
}

/**
 * Gets all mapped API routes with their context details
 * Useful for debugging and admin views
 */
export function getAllMappedRoutes(): Array<{
  apiPath: string;
  httpMethods: string;
  contextId: string;
  contextName: string | null;
  layer: string;
}> {
  const routes = contextApiRouteDb.getAll();

  return routes.map(route => {
    const context = contextDb.getContextById(route.context_id);
    return {
      apiPath: route.api_path,
      httpMethods: route.http_methods,
      contextId: route.context_id,
      contextName: context?.name || null,
      layer: route.layer,
    };
  });
}

/**
 * Auto-discovers API routes from the codebase
 * Returns suggested mappings that need to be linked to contexts
 */
export function discoverUnmappedRoutes(existingRoutes: string[]): string[] {
  // This would scan src/app/api/ directory
  // For now, return empty - will be implemented in auto-populate API
  return [];
}

/**
 * Suggests context for an unmapped API route based on path patterns
 */
export function suggestContextForRoute(apiPath: string): {
  suggestedLayer: 'pages' | 'client' | 'server' | 'external';
  suggestedCategory: 'ui' | 'lib' | 'api' | 'data';
  pathSegments: string[];
} {
  const segments = apiPath.split('/').filter(Boolean);

  // Determine layer based on path
  let suggestedLayer: 'pages' | 'client' | 'server' | 'external' = 'server';

  if (apiPath.includes('/external/') || apiPath.includes('/webhook/')) {
    suggestedLayer = 'external';
  } else if (apiPath.startsWith('/api/')) {
    suggestedLayer = 'server';
  }

  // Determine category based on path patterns
  let suggestedCategory: 'ui' | 'lib' | 'api' | 'data' = 'api';

  if (apiPath.includes('/db/') || apiPath.includes('/data/') || apiPath.includes('/storage/')) {
    suggestedCategory = 'data';
  } else if (apiPath.includes('/lib/') || apiPath.includes('/util/')) {
    suggestedCategory = 'lib';
  } else if (apiPath.includes('/component/') || apiPath.includes('/ui/')) {
    suggestedCategory = 'ui';
  }

  return {
    suggestedLayer,
    suggestedCategory,
    pathSegments: segments,
  };
}
