/**
 * Triage Tools - Manage idea/direction triage (the tinder/swipe flow)
 *
 * Tools:
 * - get_pending_triage: Get pending ideas/directions for triage
 * - triage_item: Accept or reject a single triage item
 * - bulk_triage: Accept/reject multiple items at once
 * - get_triage_stats: Get triage statistics
 */

import { directionRepository } from '@/app/db/repositories/direction.repository';
import { ideaRepository } from '@/app/db/repositories/idea.repository';

export async function executeTriageTools(
  name: string,
  input: Record<string, unknown>,
  projectId: string,
  projectPath?: string
): Promise<string> {
  switch (name) {
    case 'get_pending_triage': {
      const itemType = (input.itemType as string) || 'all';
      const limit = parseInt(String(input.limit || '20'), 10);
      const category = input.category as string | undefined;

      const result: {
        ideas?: Array<Record<string, unknown>>;
        directions?: Array<Record<string, unknown>>;
        totalPending: number;
      } = { totalPending: 0 };

      if (itemType === 'idea' || itemType === 'all') {
        const allIdeas = ideaRepository.getIdeasByProject(projectId);
        let pending = allIdeas.filter(i => i.status === 'pending');
        if (category) {
          pending = pending.filter(i => i.category === category);
        }
        result.ideas = pending.slice(0, limit).map(i => ({
          id: i.id,
          title: i.title,
          description: i.description,
          scanType: i.scan_type,
          category: i.category,
          contextId: i.context_id,
          effort: i.effort,
          impact: i.impact,
          risk: i.risk,
          createdAt: i.created_at,
        }));
        result.totalPending += pending.length;
      }

      if (itemType === 'direction' || itemType === 'all') {
        const pendingDirections = directionRepository.getPendingDirections(projectId);
        result.directions = pendingDirections.slice(0, limit).map(d => ({
          id: d.id,
          title: d.summary,
          content: d.direction?.substring(0, 200),
          contextId: d.context_id,
          contextName: d.context_name,
          effort: d.effort,
          impact: d.impact,
          createdAt: d.created_at,
        }));
        result.totalPending += pendingDirections.length;
      }

      return JSON.stringify(result);
    }

    case 'triage_item': {
      const itemId = input.itemId as string;
      const itemType = input.itemType as string;
      const action = input.action as string;
      const reason = input.reason as string | undefined;

      if (!itemId || !itemType || !action) {
        return JSON.stringify({ error: 'itemId, itemType, and action are required' });
      }

      if (!['accept', 'reject'].includes(action)) {
        return JSON.stringify({ error: 'action must be "accept" or "reject"' });
      }

      if (!['idea', 'direction'].includes(itemType)) {
        return JSON.stringify({ error: 'itemType must be "idea" or "direction"' });
      }

      try {
        if (itemType === 'idea') {
          if (action === 'accept') {
            const response = await fetch('http://localhost:3000/api/tinder/actions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                itemType: 'idea',
                itemId,
                action: 'accept',
                projectPath,
              }),
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
          } else {
            ideaRepository.updateIdea(itemId, {
              status: 'rejected',
              user_feedback: reason || undefined,
            });
            return JSON.stringify({
              success: true,
              message: 'Idea rejected.',
            });
          }
        } else {
          // direction
          if (action === 'accept') {
            const response = await fetch(`http://localhost:3000/api/directions/${itemId}/accept`, {
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
              message: 'Direction accepted and queued for implementation.',
              requirementId: data.requirementId,
            });
          } else {
            directionRepository.rejectDirection(itemId);
            return JSON.stringify({
              success: true,
              message: 'Direction rejected.',
            });
          }
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Triage action failed';
        return JSON.stringify({ success: false, error: msg });
      }
    }

    case 'bulk_triage': {
      let items: Array<{ id: string; type: string; action: string }> | undefined;

      // Accept both raw array and JSON string (tool schemas use string type)
      const rawItems = input.items;
      if (typeof rawItems === 'string') {
        try {
          items = JSON.parse(rawItems);
        } catch {
          return JSON.stringify({ error: 'items must be a valid JSON array string' });
        }
      } else if (Array.isArray(rawItems)) {
        items = rawItems as Array<{ id: string; type: string; action: string }>;
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        return JSON.stringify({ error: 'items array is required and must not be empty' });
      }

      const results: Array<{ id: string; type: string; action: string; success: boolean; error?: string }> = [];
      let accepted = 0;
      let rejected = 0;
      let failed = 0;

      for (const item of items) {
        try {
          if (item.type === 'idea') {
            if (item.action === 'accept') {
              const response = await fetch('http://localhost:3000/api/tinder/actions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  itemType: 'idea',
                  itemId: item.id,
                  action: 'accept',
                  projectPath,
                }),
              });
              if (response.ok) {
                accepted++;
                results.push({ ...item, success: true });
              } else {
                failed++;
                results.push({ ...item, success: false, error: await response.text() });
              }
            } else {
              ideaRepository.updateIdea(item.id, { status: 'rejected' });
              rejected++;
              results.push({ ...item, success: true });
            }
          } else if (item.type === 'direction') {
            if (item.action === 'accept') {
              const response = await fetch(`http://localhost:3000/api/directions/${item.id}/accept`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId, projectPath }),
              });
              if (response.ok) {
                accepted++;
                results.push({ ...item, success: true });
              } else {
                failed++;
                results.push({ ...item, success: false, error: await response.text() });
              }
            } else {
              directionRepository.rejectDirection(item.id);
              rejected++;
              results.push({ ...item, success: true });
            }
          } else {
            failed++;
            results.push({ ...item, success: false, error: `Unknown item type: ${item.type}` });
          }
        } catch (error) {
          failed++;
          const msg = error instanceof Error ? error.message : 'Action failed';
          results.push({ ...item, success: false, error: msg });
        }
      }

      return JSON.stringify({
        total: items.length,
        accepted,
        rejected,
        failed,
        results,
      });
    }

    case 'get_triage_stats': {
      const ideas = ideaRepository.getIdeasByProject(projectId);
      const ideaStats = {
        total: ideas.length,
        pending: ideas.filter(i => i.status === 'pending').length,
        accepted: ideas.filter(i => i.status === 'accepted').length,
        rejected: ideas.filter(i => i.status === 'rejected').length,
        implemented: ideas.filter(i => i.status === 'implemented').length,
      };

      const directionCounts = directionRepository.getDirectionCounts(projectId);

      return JSON.stringify({
        ideas: ideaStats,
        directions: {
          total: directionCounts.total,
          pending: directionCounts.pending,
          accepted: directionCounts.accepted,
          rejected: directionCounts.rejected,
        },
        totalPending: ideaStats.pending + directionCounts.pending,
        totalDecided: (ideaStats.accepted + ideaStats.rejected) + (directionCounts.accepted + directionCounts.rejected),
      });
    }

    default:
      return JSON.stringify({ error: `Unknown triage tool: ${name}` });
  }
}
