/**
 * Cache Management API
 * Provides endpoints for cache statistics, cleanup, and invalidation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getGlobalCache } from '@/lib/api-cache';
import { getGitHubCacheStats, cleanupGitHubCache, invalidateAllGitHubCache } from '@/lib/github';
import { getTaskCleanupService } from '@/lib/api-cache';
import { handleApiError } from '@/lib/api-errors';

/**
 * GET /api/cache
 * Returns cache statistics for all cache layers
 */
export async function GET() {
  try {
    const globalCache = getGlobalCache();
    const taskCleanupService = getTaskCleanupService();

    const stats = {
      global: globalCache.getStats(),
      github: getGitHubCacheStats(),
      taskCleanup: {
        ...taskCleanupService.getStats(),
        config: taskCleanupService.getConfig(),
        activeTaskCount: taskCleanupService.getActiveTaskCount(),
        totalTasks: taskCleanupService.getTasks().length,
      },
    };

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    return handleApiError(error, 'Fetch cache stats');
  }
}

/**
 * POST /api/cache
 * Perform cache operations: cleanup, invalidate
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, target } = body;

    if (!action) {
      return NextResponse.json(
        { success: false, error: 'Action is required' },
        { status: 400 }
      );
    }

    let result: Record<string, unknown> = {};

    switch (action) {
      case 'cleanup': {
        // Clean up expired entries
        const globalCache = getGlobalCache();
        const taskCleanupService = getTaskCleanupService();

        const globalCleaned = globalCache.cleanupExpired();
        const githubCleaned = cleanupGitHubCache();
        const taskCleanupResult = taskCleanupService.runCleanup();

        result = {
          globalEntriesRemoved: globalCleaned,
          githubEntriesRemoved: githubCleaned,
          taskCleanup: taskCleanupResult,
        };
        break;
      }

      case 'invalidate': {
        // Invalidate cache entries
        const globalCache = getGlobalCache();

        if (target === 'github') {
          invalidateAllGitHubCache();
          result = { message: 'GitHub cache invalidated' };
        } else if (target === 'all') {
          globalCache.clear();
          invalidateAllGitHubCache();
          result = { message: 'All caches invalidated' };
        } else if (target && typeof target === 'string') {
          // Invalidate by prefix
          const count = globalCache.invalidatePrefix(target);
          result = { message: `Invalidated ${count} entries with prefix: ${target}` };
        } else {
          return NextResponse.json(
            { success: false, error: 'Target is required for invalidate action' },
            { status: 400 }
          );
        }
        break;
      }

      case 'reset-stats': {
        const globalCache = getGlobalCache();
        globalCache.resetStats();
        result = { message: 'Cache statistics reset' };
        break;
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return handleApiError(error, 'Cache operation');
  }
}
