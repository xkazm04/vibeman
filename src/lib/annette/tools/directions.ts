/**
 * Direction Tools - Implementation for Annette's direction-related tool calls
 */

import { directionDb, contextDb } from '@/app/db';
import { logger } from '@/lib/logger';

export async function executeDirectionTools(
  name: string,
  input: Record<string, unknown>,
  projectId: string,
  projectPath?: string
): Promise<string> {
  switch (name) {
    case 'generate_directions': {
      // Direction generation requires the full pipeline - delegate to API
      const contextId = input.context_id as string | undefined;
      const count = parseInt(String(input.count || '3'), 10);

      try {
        const response = await fetch(`http://localhost:3000/api/directions/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            projectPath,
            contextId,
            count,
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          return JSON.stringify({ success: false, error: `Generation failed: ${error}` });
        }

        const data = await response.json();
        return JSON.stringify({
          success: true,
          directionsGenerated: data.directions?.length || 0,
          directions: (data.directions || []).map((d: { id: string; title: string; description: string; context_name?: string }) => ({
            id: d.id,
            title: d.title,
            description: d.description,
            context: d.context_name,
          })),
        });
      } catch (error) {
        return JSON.stringify({ success: false, error: 'Failed to call direction generation API' });
      }
    }

    case 'list_directions': {
      const status = input.status as string | undefined;
      const limit = parseInt(String(input.limit || '10'), 10);

      const directions = directionDb.getDirectionsByProject(projectId);
      let filtered = directions;

      if (status) {
        filtered = directions.filter(d => d.status === status);
      }

      const results = filtered.slice(0, limit).map(d => ({
        id: d.id,
        title: d.summary,
        content: d.direction?.substring(0, 100),
        status: d.status,
        contextId: d.context_id,
        contextName: d.context_name,
        createdAt: d.created_at,
      }));

      return JSON.stringify({
        total: filtered.length,
        showing: results.length,
        directions: results,
      });
    }

    case 'get_direction_detail': {
      const directionId = input.direction_id as string;
      if (!directionId) {
        return JSON.stringify({ error: 'direction_id is required' });
      }

      const direction = directionDb.getDirectionById(directionId);
      if (!direction) {
        return JSON.stringify({ error: `Direction ${directionId} not found` });
      }

      let contextName: string | undefined;
      if (direction.context_id) {
        const ctx = contextDb.getContextById(direction.context_id);
        contextName = ctx?.name;
      }

      return JSON.stringify({
        id: direction.id,
        title: direction.summary,
        content: direction.direction,
        status: direction.status,
        contextId: direction.context_id,
        contextName,
        createdAt: direction.created_at,
      });
    }

    case 'accept_direction': {
      const directionId = input.direction_id as string;
      if (!directionId) {
        return JSON.stringify({ error: 'direction_id is required' });
      }

      try {
        const response = await fetch(`http://localhost:3000/api/directions/${directionId}/accept`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId, projectPath }),
        });

        if (!response.ok) {
          const error = await response.text();
          return JSON.stringify({ success: false, error });
        }

        const data = await response.json();
        return JSON.stringify({
          success: true,
          message: `Direction accepted and queued for implementation.`,
          requirementId: data.requirementId,
        });
      } catch (error) {
        return JSON.stringify({ success: false, error: 'Failed to accept direction' });
      }
    }

    case 'reject_direction': {
      const directionId = input.direction_id as string;
      if (!directionId) {
        return JSON.stringify({ error: 'direction_id is required' });
      }

      try {
        const direction = directionDb.getDirectionById(directionId);
        if (!direction) {
          return JSON.stringify({ error: `Direction ${directionId} not found` });
        }

        directionDb.deleteDirection(directionId);
        return JSON.stringify({
          success: true,
          message: `Direction "${direction.summary}" has been rejected and removed.`,
        });
      } catch (error) {
        return JSON.stringify({ success: false, error: 'Failed to reject direction' });
      }
    }

    default:
      return JSON.stringify({ error: `Unknown direction tool: ${name}` });
  }
}
