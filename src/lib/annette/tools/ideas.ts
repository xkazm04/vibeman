/**
 * Idea Tools - Implementation for Annette's idea-related tool calls
 */

import { ideaDb } from '@/app/db';

export async function executeIdeaTools(
  name: string,
  input: Record<string, unknown>,
  projectId: string,
  projectPath?: string
): Promise<string> {
  switch (name) {
    case 'browse_ideas': {
      const contextId = input.context_id as string | undefined;

      // Get next pending idea
      const ideas = ideaDb.getIdeasByProject(projectId);
      const pending = ideas.filter(i => i.status === 'pending');

      let filtered = pending;
      if (contextId) {
        filtered = pending.filter(i => i.context_id === contextId);
      }

      if (filtered.length === 0) {
        return JSON.stringify({
          hasIdeas: false,
          message: contextId
            ? 'No pending ideas for this context. Try generating new ideas.'
            : 'No pending ideas. Try generating new ideas for a context.',
          totalPending: pending.length,
        });
      }

      const next = filtered[0];
      return JSON.stringify({
        hasIdeas: true,
        totalPending: filtered.length,
        idea: {
          id: next.id,
          title: next.title,
          description: next.description,
          scanType: next.scan_type,
          category: next.category,
          contextId: next.context_id,
          effort: next.effort,
          impact: next.impact,
        },
      });
    }

    case 'accept_idea': {
      const ideaId = input.idea_id as string;
      if (!ideaId) {
        return JSON.stringify({ error: 'idea_id is required' });
      }

      try {
        const response = await fetch('http://localhost:3000/api/ideas/tinder/accept', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ideaId, projectPath }),
        });

        if (!response.ok) {
          const error = await response.text();
          return JSON.stringify({ success: false, error });
        }

        const data = await response.json();
        return JSON.stringify({
          success: true,
          message: 'Idea accepted and requirement created.',
          requirementId: data.requirementId,
        });
      } catch (error) {
        return JSON.stringify({ success: false, error: 'Failed to accept idea' });
      }
    }

    case 'reject_idea': {
      const ideaId = input.idea_id as string;
      if (!ideaId) {
        return JSON.stringify({ error: 'idea_id is required' });
      }

      try {
        const response = await fetch('http://localhost:3000/api/ideas/tinder/reject', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ideaId, projectPath }),
        });

        if (!response.ok) {
          const error = await response.text();
          return JSON.stringify({ success: false, error });
        }

        return JSON.stringify({ success: true, message: 'Idea rejected.' });
      } catch (error) {
        return JSON.stringify({ success: false, error: 'Failed to reject idea' });
      }
    }

    case 'generate_ideas': {
      const contextId = input.context_id as string;
      if (!contextId) {
        return JSON.stringify({ error: 'context_id is required' });
      }

      try {
        const response = await fetch('http://localhost:3000/api/ideas/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId, contextId, projectPath }),
        });

        if (!response.ok) {
          const error = await response.text();
          return JSON.stringify({ success: false, error });
        }

        const data = await response.json();
        return JSON.stringify({
          success: true,
          message: `Generated ${data.ideas?.length || 0} new ideas.`,
          ideasGenerated: data.ideas?.length || 0,
        });
      } catch (error) {
        return JSON.stringify({ success: false, error: 'Failed to generate ideas' });
      }
    }

    case 'get_idea_stats': {
      const ideas = ideaDb.getIdeasByProject(projectId);
      const stats = {
        total: ideas.length,
        pending: ideas.filter(i => i.status === 'pending').length,
        accepted: ideas.filter(i => i.status === 'accepted').length,
        rejected: ideas.filter(i => i.status === 'rejected').length,
        implemented: ideas.filter(i => i.status === 'implemented').length,
      };

      return JSON.stringify(stats);
    }

    default:
      return JSON.stringify({ error: `Unknown idea tool: ${name}` });
  }
}
