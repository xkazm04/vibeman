/**
 * Goal Tools - Implementation for Annette's goal-related tool calls
 */

import { goalDb } from '@/app/db';

export async function executeGoalTools(
  name: string,
  input: Record<string, unknown>,
  projectId: string,
  projectPath?: string
): Promise<string> {
  switch (name) {
    case 'list_goals': {
      const status = input.status as string | undefined;
      const goals = goalDb.getGoalsByProject(projectId);

      let filtered = goals;
      if (status) {
        filtered = goals.filter(g => g.status === status);
      }

      return JSON.stringify({
        total: filtered.length,
        goals: filtered.map(g => ({
          id: g.id,
          title: g.title,
          description: g.description?.substring(0, 100),
          status: g.status,
          contextId: g.context_id,
          createdAt: g.created_at,
        })),
      });
    }

    case 'create_goal': {
      const title = input.title as string;
      const description = input.description as string | undefined;
      const contextId = input.context_id as string | undefined;

      if (!title) {
        return JSON.stringify({ error: 'title is required' });
      }

      try {
        const response = await fetch('http://localhost:3000/api/goals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            title,
            description,
            contextId,
            projectPath,
            createAnalysis: true,
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          return JSON.stringify({ success: false, error });
        }

        const data = await response.json();
        return JSON.stringify({
          success: true,
          message: `Goal "${title}" created.`,
          goalId: data.goal?.id,
        });
      } catch (error) {
        return JSON.stringify({ success: false, error: 'Failed to create goal' });
      }
    }

    case 'update_goal': {
      const goalId = input.goal_id as string;
      if (!goalId) {
        return JSON.stringify({ error: 'goal_id is required' });
      }

      const updateData: Record<string, unknown> = { id: goalId };
      if (input.status) updateData.status = input.status;
      if (input.title) updateData.title = input.title;
      if (input.description) updateData.description = input.description;

      try {
        const response = await fetch('http://localhost:3000/api/goals', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        });

        if (!response.ok) {
          const error = await response.text();
          return JSON.stringify({ success: false, error });
        }

        const data = await response.json();
        return JSON.stringify({
          success: true,
          message: `Goal updated.`,
          goal: {
            id: data.goal?.id,
            title: data.goal?.title,
            status: data.goal?.status,
          },
        });
      } catch (error) {
        return JSON.stringify({ success: false, error: 'Failed to update goal' });
      }
    }

    case 'generate_goal_candidates': {
      const count = parseInt(String(input.count || '3'), 10);

      try {
        const response = await fetch('http://localhost:3000/api/goals/generate-candidates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId, projectPath, count }),
        });

        if (!response.ok) {
          const error = await response.text();
          return JSON.stringify({ success: false, error });
        }

        const data = await response.json();
        return JSON.stringify({
          success: true,
          candidates: data.candidates || [],
        });
      } catch (error) {
        return JSON.stringify({ success: false, error: 'Failed to generate goal candidates' });
      }
    }

    default:
      return JSON.stringify({ error: `Unknown goal tool: ${name}` });
  }
}
