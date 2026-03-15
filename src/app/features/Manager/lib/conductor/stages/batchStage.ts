/**
 * Batch Stage — Group accepted ideas into execution batches
 *
 * Creates requirement files from accepted ideas, builds DAG for
 * dependency-aware execution, and assigns models based on routing rules.
 */

import { v4 as uuidv4 } from 'uuid';
import type { CLIProvider } from '@/lib/claude-terminal/types';
import type { BalancingConfig, BatchDescriptor } from '../types';
import type { CompositeGroup } from './plannerStage.types';
import { routeModel } from '../balancingEngine';

interface AcceptedIdea {
  id: string;
  title: string;
  description: string;
  effort: number;
  impact: number;
  risk: number;
  category: string;
  reasoning?: string | null;
  scan_type?: string | null;
  context_id?: string | null;
  context_name?: string | null;
  context_file_paths?: string | null; // JSON array of related file paths
  requirementName?: string;
}

interface BatchInput {
  acceptedIdeas: AcceptedIdea[];
  config: BalancingConfig;
  projectId: string;
  projectPath: string;
  projectName: string;
  /** Composite groups from the Planner stage (G4 task aggregation) */
  compositeGroups?: CompositeGroup[];
}

/**
 * Execute the Batch stage: create requirement files and build execution plan.
 */
export async function executeBatchStage(input: BatchInput): Promise<BatchDescriptor> {
  const { acceptedIdeas, config, projectPath, compositeGroups } = input;

  // Merge composite groups into single ideas before batching
  const batch = mergeCompositeGroups(
    acceptedIdeas.slice(0, config.maxBatchSize),
    compositeGroups
  );

  const requirementNames: string[] = [];
  const modelAssignments: Record<string, { provider: CLIProvider; model: string }> = {};
  const dagDependencies: Record<string, string[]> = {};

  for (const idea of batch) {
    // Use existing requirement name if idea was already accepted via tinder
    const reqName = idea.requirementName || `conductor-${idea.id.slice(0, 8)}`;

    // Only create requirement if not already created by tinder accept
    if (!idea.requirementName) {
      try {
        await createRequirementFile(projectPath, reqName, idea);
      } catch (error) {
        console.error(`[batch] Failed to create requirement for ${idea.id}:`, error);
        continue;
      }
    }

    requirementNames.push(reqName);

    // Assign model based on routing rules
    const routing = routeModel(
      { effort: idea.effort, category: idea.category },
      config
    );
    modelAssignments[reqName] = routing;

    // DAG: all tasks are independent by default
    // Future: detect file overlap and add sequential dependencies
    dagDependencies[reqName] = [];
  }

  // If DAG strategy, try to detect dependencies
  if (config.batchStrategy === 'dag' && requirementNames.length > 1) {
    // Simple heuristic: group by category to reduce conflicts
    const byCategory = new Map<string, string[]>();
    for (const idea of batch) {
      const reqName = idea.requirementName || `conductor-${idea.id.slice(0, 8)}`;
      if (!requirementNames.includes(reqName)) continue;
      const cat = idea.category || 'default';
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat)!.push(reqName);
    }

    // Within same category, make them sequential to avoid conflicts
    for (const [, reqs] of byCategory) {
      for (let i = 1; i < reqs.length; i++) {
        dagDependencies[reqs[i]] = [reqs[i - 1]];
      }
    }
  }

  return {
    id: uuidv4(),
    requirementNames,
    modelAssignments,
    dagDependencies,
  };
}

async function createRequirementFile(
  projectPath: string,
  requirementName: string,
  idea: AcceptedIdea
): Promise<void> {
  const content = buildRequirementContent(idea);

  const response = await fetch(`${getBaseUrl()}/api/claude-code/requirement`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectPath,
      requirementName,
      content,
      overwrite: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`Requirement creation failed: ${response.status}`);
  }
}

function buildRequirementContent(idea: AcceptedIdea): string {
  const sections: string[] = [
    `Execute this requirement immediately without asking questions.`,
    '',
    `## REQUIREMENT`,
    '',
    `# ${idea.title}`,
    '',
    `## Metadata`,
    `- **Category**: ${idea.category}`,
    `- **Effort**: ${idea.effort}/10`,
    `- **Impact**: ${idea.impact}/10`,
    `- **Risk**: ${idea.risk != null ? `${idea.risk}/10` : 'n/a'}`,
  ];

  if (idea.scan_type) {
    sections.push(`- **Scan Type**: ${idea.scan_type}`);
  }
  sections.push(`- **Generated**: ${new Date().toLocaleString()}`);

  sections.push('', `## Description`, idea.description || 'No description provided.');

  // Include reasoning when available — this is critical context for the implementing agent
  if (idea.reasoning) {
    sections.push('', `## Reasoning`, idea.reasoning);
  }

  // Include context section with related files when available
  if (idea.context_name || idea.context_file_paths) {
    sections.push('', `## Context`, '');
    sections.push(`**Note**: This section provides supporting architectural documentation and is NOT a hard requirement. Use it as guidance to understand existing code structure and maintain consistency.`);

    if (idea.context_name) {
      sections.push('', `### Context: ${idea.context_name}`);
    }

    if (idea.context_file_paths) {
      try {
        const filePaths = JSON.parse(idea.context_file_paths);
        if (Array.isArray(filePaths) && filePaths.length > 0) {
          sections.push('', '**Related Files**:');
          for (const fp of filePaths) {
            sections.push(`- \`${fp}\``);
          }
        }
      } catch {
        // Invalid JSON, skip file paths
      }
    }
  }

  // Implementation guidance
  sections.push(
    '',
    `## DURING IMPLEMENTATION`,
    '',
    `- Use \`get_memory\` MCP tool when you encounter unfamiliar code or need context about patterns/files`,
    `- Use \`report_progress\` MCP tool at each major phase (analyzing, planning, implementing, testing, validating)`,
    `- Use \`get_related_tasks\` MCP tool before modifying shared files to check for parallel task conflicts`,
    '',
    `## AFTER IMPLEMENTATION`,
    '',
    `1. Log your implementation using the \`log_implementation\` MCP tool with:`,
    `   - requirementName: the requirement filename (without .md)`,
    `   - title: 2-6 word summary`,
    `   - overview: 1-2 paragraphs describing what was done`,
    '',
    `2. Check for test scenario using \`check_test_scenario\` MCP tool`,
    `   - If hasScenario is true, call \`capture_screenshot\` tool`,
    `   - If hasScenario is false, skip screenshot`,
    '',
    `3. Verify: \`npx tsc --noEmit\` (fix any type errors)`,
    '',
    `Begin implementation now.`,
  );

  return sections.join('\n');
}

/**
 * Merge composite group items into single composite ideas.
 * Items in the same group get merged into one idea with combined description.
 * Non-grouped items pass through unchanged.
 */
function mergeCompositeGroups(
  ideas: AcceptedIdea[],
  compositeGroups?: CompositeGroup[]
): AcceptedIdea[] {
  if (!compositeGroups || compositeGroups.length === 0) return ideas;

  // Build a lookup: ideaId -> groupId (approximate match via title since
  // planner itemIds don't map 1:1 to idea DB IDs)
  const groupByTitle = new Map<string, CompositeGroup>();
  for (const group of compositeGroups) {
    for (const itemId of group.itemIds) {
      // itemIds from planner are short IDs, but we match by checking if any
      // idea title is referenced. This is a best-effort match.
      groupByTitle.set(itemId, group);
    }
  }

  // Since planner itemIds don't map to DB idea IDs directly, use index-based matching:
  // planner backlog items and ideas table entries are in the same order
  const usedGroups = new Set<string>();
  const result: AcceptedIdea[] = [];
  const ideasByGroup = new Map<string, AcceptedIdea[]>();

  for (const idea of ideas) {
    // Check if this idea belongs to a composite group by matching on idea index
    let matched = false;
    for (const group of compositeGroups) {
      if (group.itemIds.length <= 1) continue; // Skip single-item groups
      // Match by title substring (planner preserves titles from analyzer)
      const titleMatch = group.itemIds.some(itemId => {
        // itemId format is "item-N", try to match by position
        const idx = parseInt(itemId.replace('item-', ''), 10) - 1;
        return idx >= 0 && idx < ideas.length && ideas[idx].id === idea.id;
      });
      if (titleMatch) {
        if (!ideasByGroup.has(group.groupId)) ideasByGroup.set(group.groupId, []);
        ideasByGroup.get(group.groupId)!.push(idea);
        matched = true;
        break;
      }
    }
    if (!matched) {
      result.push(idea);
    }
  }

  // Merge grouped ideas into composite entries
  for (const [groupId, groupIdeas] of ideasByGroup) {
    if (usedGroups.has(groupId)) continue;
    usedGroups.add(groupId);

    const group = compositeGroups.find(g => g.groupId === groupId)!;
    const merged: AcceptedIdea = {
      id: groupIdeas[0].id,
      title: group.title,
      description: groupIdeas.map((idea, i) =>
        `### Sub-task ${i + 1}: ${idea.title}\n\n${idea.description}`
      ).join('\n\n'),
      effort: Math.max(...groupIdeas.map(i => i.effort)),
      impact: Math.max(...groupIdeas.map(i => i.impact)),
      risk: Math.max(...groupIdeas.map(i => i.risk)),
      category: groupIdeas[0].category,
      reasoning: groupIdeas.map(i => i.reasoning).filter(Boolean).join(' | '),
      scan_type: groupIdeas[0].scan_type,
      context_id: groupIdeas[0].context_id,
      context_name: groupIdeas[0].context_name,
      context_file_paths: mergeFilePaths(groupIdeas),
    };
    result.push(merged);
  }

  return result;
}

/** Merge file paths from multiple ideas into a single JSON array string */
function mergeFilePaths(ideas: AcceptedIdea[]): string | null {
  const allPaths = new Set<string>();
  for (const idea of ideas) {
    if (!idea.context_file_paths) continue;
    try {
      const paths = JSON.parse(idea.context_file_paths);
      if (Array.isArray(paths)) paths.forEach((p: string) => allPaths.add(p));
    } catch { /* skip */ }
  }
  return allPaths.size > 0 ? JSON.stringify([...allPaths]) : null;
}

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}
