/**
 * Scanning Tools - Trigger and monitor idea scans via Annette
 *
 * Tools:
 * - trigger_idea_scan: Trigger a scan using a specific agent type
 * - list_scan_agents: List all available scan agent types with descriptions
 * - get_scan_results: Get results from recent scans
 */

import { scanDb, ideaDb } from '@/app/db';
import { AGENT_REGISTRY, type AgentCategory } from '@/app/features/Ideas/lib/agentRegistry';

export async function executeScanningTools(
  name: string,
  input: Record<string, unknown>,
  projectId: string,
  projectPath?: string
): Promise<string> {
  switch (name) {
    case 'trigger_idea_scan': {
      const scanType = input.scanType as string;
      const contextId = input.contextId as string | undefined;

      if (!scanType) {
        return JSON.stringify({ error: 'scanType is required' });
      }

      // Validate scan type exists in the registry
      if (!(scanType in AGENT_REGISTRY)) {
        return JSON.stringify({
          error: `Unknown scan type: ${scanType}`,
          availableTypes: Object.keys(AGENT_REGISTRY),
        });
      }

      try {
        const response = await fetch('http://localhost:3000/api/scan/unified', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            projectPath,
            scanType,
            contextId: contextId || undefined,
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          return JSON.stringify({ success: false, error: `Scan failed: ${error}` });
        }

        const data = await response.json();
        return JSON.stringify({
          success: true,
          message: `Scan "${scanType}" triggered successfully.`,
          scanId: data.scanId || data.id,
          ideasGenerated: data.ideas?.length || data.ideasGenerated || 0,
          summary: data.summary || null,
        });
      } catch (error) {
        return JSON.stringify({ success: false, error: 'Failed to trigger scan' });
      }
    }

    case 'list_scan_agents': {
      const category = input.category as AgentCategory | undefined;

      const agents = Object.values(AGENT_REGISTRY);
      const filtered = category
        ? agents.filter(a => a.category === category)
        : agents;

      const categories = [...new Set(agents.map(a => a.category))];

      return JSON.stringify({
        totalAgents: filtered.length,
        categories,
        agents: filtered.map(a => ({
          id: a.id,
          label: a.label,
          description: a.description,
          category: a.category,
          examples: a.examples,
        })),
      });
    }

    case 'get_scan_results': {
      const scanType = input.scanType as string | undefined;
      const limit = parseInt(String(input.limit || '10'), 10);

      const { scans, total } = scanDb.getScansByProjectFiltered(projectId, {
        scanType,
        limit,
      });

      const results = scans.map(scan => {
        const ideas = ideaDb.getIdeasByScanId(scan.id);
        return {
          scanId: scan.id,
          scanType: scan.scan_type,
          timestamp: scan.timestamp,
          summary: scan.summary,
          ideaCount: ideas.length,
          pendingIdeas: ideas.filter(i => i.status === 'pending').length,
          acceptedIdeas: ideas.filter(i => i.status === 'accepted').length,
          inputTokens: scan.input_tokens,
          outputTokens: scan.output_tokens,
        };
      });

      return JSON.stringify({
        total,
        showing: results.length,
        scans: results,
      });
    }

    default:
      return JSON.stringify({ error: `Unknown scanning tool: ${name}` });
  }
}
