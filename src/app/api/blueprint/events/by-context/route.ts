import { NextRequest, NextResponse } from 'next/server';
import { eventRepository } from '@/app/db/repositories/event.repository';
import { extractProjectId, createErrorResponse } from '../utils';
import { withObservability } from '@/lib/observability/middleware';

/**
 * GET /api/blueprint/events/by-context
 * Fetch latest events by title for each context
 * Used to show "daysAgo" indicators in context selector
 *
 * Query params:
 *   - projectId: Project ID
 *   - eventTitle: Event title (e.g., "Selectors Scan Completed")
 *
 * Note: This endpoint looks for events with matching titles and extracts
 * context_id from the event record (not from the title).
 */
async function handleGet(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { projectId, error: projectError } = extractProjectId(request);
    if (projectError) return projectError;

    const eventTitle = searchParams.get('eventTitle');
    if (!eventTitle) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing eventTitle parameter'
        },
        { status: 400 }
      );
    }

    // Fetch all events with this title pattern for this project
    const allEvents = eventRepository.getEventsByTitlePattern(projectId!, eventTitle);

    // Group events by context_id and get the most recent one for each context
    const eventsByContext: Record<string, any> = {};

    allEvents.forEach(event => {
      const contextId = event.context_id;

      // Skip events without context_id (backward compatibility)
      if (!contextId) {
        return;
      }

      // Keep only the most recent event for each context
      if (!eventsByContext[contextId] ||
          new Date(event.created_at) > new Date(eventsByContext[contextId].created_at)) {
        eventsByContext[contextId] = event;
      }
    });

    // Convert to array
    const events = Object.values(eventsByContext);

    return NextResponse.json({
      success: true,
      events
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export const GET = withObservability(handleGet, '/api/blueprint/events/by-context');
