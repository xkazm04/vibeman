/**
 * Integration Registry API
 * Provides information about available integrations
 */

import { NextResponse } from 'next/server';
import {
  getAllIntegrations,
  getIntegrationInfo,
  ALL_EVENT_TYPES,
  EVENT_TYPE_LABELS,
} from '@/lib/integrations/registry';
import type { IntegrationProvider } from '@/app/db/models/integration.types';

/**
 * GET /api/integrations/registry
 * Get available integrations and their configuration schemas
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider') as IntegrationProvider | null;

    if (provider) {
      // Get specific provider info
      const info = getIntegrationInfo(provider);
      return NextResponse.json({
        success: true,
        provider: info,
      });
    }

    // Get all available integrations
    const integrations = getAllIntegrations();

    return NextResponse.json({
      success: true,
      integrations,
      eventTypes: ALL_EVENT_TYPES,
      eventTypeLabels: EVENT_TYPE_LABELS,
    });
  } catch (error) {
    console.error('Error fetching integration registry:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch registry' },
      { status: 500 }
    );
  }
}
