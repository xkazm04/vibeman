/**
 * Integration Events API
 * Handles dispatching events and viewing event logs
 */

import { NextResponse } from 'next/server';
import { integrationEventDb, integrationDb } from '@/app/db';
import { dispatchIntegrationEvent, integrationEngine } from '@/lib/integrations';
import type { IntegrationEventType } from '@/app/db/models/integration.types';
import { isTableMissingError } from '@/app/db/repositories/repository.utils';

/**
 * GET /api/integrations/events
 * Get event logs for an integration or project
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const integrationId = searchParams.get('integrationId');
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    let events;
    if (integrationId) {
      events = integrationEventDb.getByIntegration(integrationId, limit);
    } else if (projectId) {
      events = integrationEventDb.getByProject(projectId, limit);
    } else {
      return NextResponse.json(
        { success: false, error: 'projectId or integrationId is required' },
        { status: 400 }
      );
    }

    // Parse JSON fields
    const parsed = events.map((event) => ({
      ...event,
      payload: safeJsonParse(event.payload, {}),
      response: safeJsonParse(event.response, null),
    }));

    return NextResponse.json({ success: true, events: parsed });
  } catch (error) {
    if (isTableMissingError(error)) {
      return NextResponse.json(
        { success: false, error: 'Integrations feature requires database setup. Run migrations and restart the app.' },
        { status: 503 }
      );
    }
    console.error('Error fetching integration events:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/integrations/events
 * Dispatch an event to integrations
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { projectId, eventType, data, projectName, triggeredBy } = body;

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'projectId is required' },
        { status: 400 }
      );
    }
    if (!eventType) {
      return NextResponse.json(
        { success: false, error: 'eventType is required' },
        { status: 400 }
      );
    }
    if (!data) {
      return NextResponse.json(
        { success: false, error: 'data is required' },
        { status: 400 }
      );
    }

    const result = await dispatchIntegrationEvent(
      projectId,
      eventType as IntegrationEventType,
      data,
      { projectName, triggeredBy }
    );

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    if (isTableMissingError(error)) {
      return NextResponse.json(
        { success: false, error: 'Integrations feature requires database setup. Run migrations and restart the app.' },
        { status: 503 }
      );
    }
    console.error('Error dispatching event:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to dispatch event' },
      { status: 500 }
    );
  }
}

/**
 * Safely parse JSON with fallback
 */
function safeJsonParse<T>(json: string | null, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}
