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
          keywords: (() => { try { return JSON.parse(c.keywords || '[]'); } catch { return []; } })(),
          entryPoints: (() => { try { return JSON.parse(c.entry_points || '[]'); } catch { return []; } })(),
          apiSurface: (() => { try { return JSON.parse(c.api_surface || '[]'); } catch { return []; } })(),
          dbTables: (() => { try { return JSON.parse(c.db_tables || '[]'); } catch { return []; } })(),
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

    case 'find_context_by_query': {
      const query = (input.query as string || '').toLowerCase().trim();
      if (!query) {
        return JSON.stringify({ error: 'query is required' });
      }

      const allContexts = contextDb.getContextsByProject(projectId);

      // Score each context by keyword match + name match + description match
      const scored = allContexts.map(c => {
        let score = 0;
        const nameLower = (c.name || '').toLowerCase();
        const descLower = (c.description || '').toLowerCase();

        // Name match (highest weight)
        if (nameLower.includes(query)) score += 10;
        for (const word of query.split(/\s+/)) {
          if (word.length > 2 && nameLower.includes(word)) score += 5;
        }

        // Description match
        if (descLower.includes(query)) score += 5;
        for (const word of query.split(/\s+/)) {
          if (word.length > 2 && descLower.includes(word)) score += 2;
        }

        // Keyword match (high weight)
        try {
          const keywords: string[] = JSON.parse(c.keywords || '[]');
          for (const kw of keywords) {
            if (kw.toLowerCase().includes(query) || query.includes(kw.toLowerCase())) score += 8;
            for (const word of query.split(/\s+/)) {
              if (word.length > 2 && kw.toLowerCase().includes(word)) score += 4;
            }
          }
        } catch {}

        // API surface match
        try {
          const surface: Array<{ path: string; description?: string }> = JSON.parse(c.api_surface || '[]');
          for (const ep of surface) {
            if (ep.path.toLowerCase().includes(query)) score += 3;
            if (ep.description && ep.description.toLowerCase().includes(query)) score += 2;
          }
        } catch {}

        return { context: c, score };
      });

      // Sort by score desc, take top 3
      const top = scored
        .filter(s => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

      if (top.length === 0) {
        return JSON.stringify({ results: [], message: `No contexts matched query "${query}"` });
      }

      return JSON.stringify({
        query,
        results: top.map(({ context: c, score }) => {
          let entryPoints: unknown[] = [];
          let filePaths: string[] = [];
          let keywords: string[] = [];
          try { entryPoints = JSON.parse(c.entry_points || '[]'); } catch {}
          try { filePaths = JSON.parse(c.file_paths || '[]'); } catch {}
          try { keywords = JSON.parse(c.keywords || '[]'); } catch {}

          return {
            id: c.id,
            name: c.name,
            description: c.description?.substring(0, 120),
            groupId: c.group_id,
            score,
            keywords,
            entryPoints,
            fileCount: filePaths.length,
          };
        }),
      });
    }

    default:
      return JSON.stringify({ error: `Unknown context tool: ${name}` });
  }
}
