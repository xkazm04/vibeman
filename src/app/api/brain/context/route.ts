/**
 * Brain Context API
 * Returns computed behavioral context for a project
 * Includes 60-second in-memory cache per project with event-driven invalidation
 */

import { NextRequest, NextResponse } from 'next/server';
import { withObservability } from '@/lib/observability/middleware';
import { getBehavioralContext } from '@/lib/brain/behavioralContext';

export const dynamic = 'force-dynamic';

// In-memory cache: cacheKey -> { data, expiry }
const contextCache = new Map<string, { data: unknown; expiry: number }>();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

/**
 * Invalidate cached context for a project.
 * Called by signals routes when signals are recorded, deleted, or decayed.
 */
export function invalidateContextCache(projectId: string): void {
  for (const key of contextCache.keys()) {
    if (key.startsWith(`${projectId}:`)) {
      contextCache.delete(key);
    }
  }
}

async function handleGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const windowDays = parseInt(searchParams.get('windowDays') || '7', 10);
    const noCache = searchParams.get('noCache') === 'true';

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    const cacheKey = `${projectId}:${windowDays}`;

    // Check cache
    if (!noCache) {
      const cached = contextCache.get(cacheKey);
      if (cached && Date.now() < cached.expiry) {
        return NextResponse.json({
          success: true,
          context: cached.data,
          cached: true,
        });
      }
    }

    // Clean up expired entries on every miss
    const now = Date.now();
    for (const [key, value] of contextCache.entries()) {
      if (now > value.expiry) contextCache.delete(key);
    }

    const context = getBehavioralContext(projectId, windowDays);

    // Store in cache
    contextCache.set(cacheKey, {
      data: context,
      expiry: Date.now() + CACHE_TTL_MS,
    });

    return NextResponse.json({
      success: true,
      context,
    });
  } catch (error) {
    console.error('Failed to get behavioral context:', error);
    return NextResponse.json(
      { error: 'Failed to get behavioral context' },
      { status: 500 }
    );
  }
}

export const GET = withObservability(handleGET, '/api/brain/context');
