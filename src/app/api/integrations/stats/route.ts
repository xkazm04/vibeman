/**
 * Integration Stats API
 * Provides statistics about integration usage
 */

import { NextResponse } from 'next/server';
import { integrationDb, integrationEventDb } from '@/app/db';

/**
 * GET /api/integrations/stats
 * Get integration statistics
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const integrationId = searchParams.get('integrationId');

    if (integrationId) {
      // Get stats for specific integration
      const integration = integrationDb.getById(integrationId);
      if (!integration) {
        return NextResponse.json(
          { success: false, error: 'Integration not found' },
          { status: 404 }
        );
      }

      const eventStats = integrationEventDb.getStats(integrationId);

      return NextResponse.json({
        success: true,
        stats: {
          integration: {
            id: integration.id,
            name: integration.name,
            provider: integration.provider,
            status: integration.status,
            lastSyncAt: integration.last_sync_at,
            lastError: integration.last_error,
            errorCount: integration.error_count,
          },
          events: eventStats,
        },
      });
    }

    if (projectId) {
      // Get stats for all integrations in project
      const integrations = integrationDb.getByProject(projectId);

      const stats = {
        total: integrations.length,
        active: integrations.filter((i) => i.status === 'active').length,
        error: integrations.filter((i) => i.status === 'error').length,
        pending: integrations.filter((i) => i.status === 'pending').length,
        byProvider: {} as Record<string, number>,
        integrations: integrations.map((integration) => ({
          id: integration.id,
          name: integration.name,
          provider: integration.provider,
          status: integration.status,
          lastSyncAt: integration.last_sync_at,
          errorCount: integration.error_count,
        })),
      };

      for (const integration of integrations) {
        stats.byProvider[integration.provider] = (stats.byProvider[integration.provider] || 0) + 1;
      }

      return NextResponse.json({ success: true, stats });
    }

    return NextResponse.json(
      { success: false, error: 'projectId or integrationId is required' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error fetching integration stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
