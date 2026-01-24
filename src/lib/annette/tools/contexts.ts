/**
 * Context Tools - Implementation for Annette's context-related tool calls
 */

import { contextDb } from '@/app/db';

export async function executeContextTools(
  name: string,
  input: Record<string, unknown>,
  projectId: string
): Promise<string> {
  switch (name) {
    case 'list_contexts': {
      const contexts = contextDb.getContextsByProject(projectId);

      return JSON.stringify({
        total: contexts.length,
        contexts: contexts.map(c => ({
          id: c.id,
          name: c.name,
          description: c.description?.substring(0, 80),
          groupId: c.group_id,
          fileCount: (() => {
            try {
              return JSON.parse(c.file_paths || '[]').length;
            } catch {
              return 0;
            }
          })(),
        })),
      });
    }

    case 'get_context_detail': {
      const contextId = input.context_id as string;
      if (!contextId) {
        return JSON.stringify({ error: 'context_id is required' });
      }

      const context = contextDb.getContextById(contextId);
      if (!context) {
        return JSON.stringify({ error: `Context ${contextId} not found` });
      }

      let filePaths: string[] = [];
      try {
        filePaths = JSON.parse(context.file_paths || '[]');
      } catch {}

      return JSON.stringify({
        id: context.id,
        name: context.name,
        description: context.description,
        groupId: context.group_id,
        filePaths: filePaths.slice(0, 20), // Limit to 20 for token budget
        totalFiles: filePaths.length,
        createdAt: context.created_at,
      });
    }

    case 'scan_contexts': {
      try {
        const response = await fetch('http://localhost:3000/api/contexts/scripted-scan-and-save', {
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
          message: 'Context scan initiated.',
          contextsFound: data.contexts?.length || 0,
        });
      } catch (error) {
        return JSON.stringify({ success: false, error: 'Failed to trigger context scan' });
      }
    }

    case 'generate_description': {
      const contextId = input.context_id as string;
      if (!contextId) {
        return JSON.stringify({ error: 'context_id is required' });
      }

      try {
        const response = await fetch('http://localhost:3000/api/contexts/generate-description', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contextId }),
        });

        if (!response.ok) {
          const error = await response.text();
          return JSON.stringify({ success: false, error });
        }

        const data = await response.json();
        return JSON.stringify({
          success: true,
          description: data.description,
        });
      } catch (error) {
        return JSON.stringify({ success: false, error: 'Failed to generate description' });
      }
    }

    default:
      return JSON.stringify({ error: `Unknown context tool: ${name}` });
  }
}
