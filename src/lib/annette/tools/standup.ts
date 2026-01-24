/**
 * Standup/Reporting Tools - Implementation for Annette's standup-related tool calls
 */

import { standupDb } from '@/app/db';

export async function executeStandupTools(
  name: string,
  input: Record<string, unknown>,
  projectId: string
): Promise<string> {
  switch (name) {
    case 'generate_standup': {
      try {
        const response = await fetch('http://localhost:3000/api/standup/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId }),
        });

        if (!response.ok) {
          const error = await response.text();
          return JSON.stringify({ success: false, error });
        }

        const data = await response.json();
        return JSON.stringify({
          success: true,
          standup: data.standup || data,
        });
      } catch (error) {
        return JSON.stringify({ success: false, error: 'Failed to generate standup' });
      }
    }

    case 'get_standup_history': {
      const limit = parseInt(String(input.limit || '5'), 10);

      try {
        const standups = standupDb.getSummariesByProject(projectId, limit);
        return JSON.stringify({
          total: standups.length,
          standups: standups.map(s => ({
            id: s.id,
            title: s.title,
            summary: s.summary?.substring(0, 200),
            createdAt: s.created_at,
          })),
        });
      } catch (error) {
        return JSON.stringify({ standups: [], error: 'Failed to fetch standup history' });
      }
    }

    case 'run_automation': {
      try {
        const response = await fetch('http://localhost:3000/api/standup/automation/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId }),
        });

        if (!response.ok) {
          const error = await response.text();
          return JSON.stringify({ success: false, error });
        }

        const data = await response.json();
        return JSON.stringify({
          success: true,
          message: 'Standup automation completed.',
          results: data,
        });
      } catch (error) {
        return JSON.stringify({ success: false, error: 'Failed to run automation' });
      }
    }

    default:
      return JSON.stringify({ error: `Unknown standup tool: ${name}` });
  }
}
