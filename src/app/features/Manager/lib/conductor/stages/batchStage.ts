/**
 * Batch Stage — Group accepted ideas into execution batches
 *
 * Creates requirement files from accepted ideas, builds DAG for
 * dependency-aware execution, and assigns models based on routing rules.
 */

import { v4 as uuidv4 } from 'uuid';
import type { CLIProvider } from '@/lib/claude-terminal/types';
import type { BalancingConfig, BatchDescriptor } from '../types';
import { routeModel } from '../balancingEngine';

interface AcceptedIdea {
  id: string;
  title: string;
  description: string;
  effort: number;
  impact: number;
  risk: number;
  category: string;
  requirementName?: string;
}

interface BatchInput {
  acceptedIdeas: AcceptedIdea[];
  config: BalancingConfig;
  projectId: string;
  projectPath: string;
  projectName: string;
}

/**
 * Execute the Batch stage: create requirement files and build execution plan.
 */
export async function executeBatchStage(input: BatchInput): Promise<BatchDescriptor> {
  const { acceptedIdeas, config, projectPath } = input;

  // Limit batch size
  const batch = acceptedIdeas.slice(0, config.maxBatchSize);

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
  return [
    `# ${idea.title}`,
    '',
    `## Description`,
    idea.description,
    '',
    `## Metadata`,
    `- Effort: ${idea.effort}/10`,
    `- Impact: ${idea.impact}/10`,
    `- Risk: ${idea.risk}/10`,
    `- Category: ${idea.category}`,
    '',
    `## Instructions`,
    `Implement the changes described above. Follow existing code patterns and conventions.`,
    `Create or modify tests if applicable. Document any significant changes.`,
  ].join('\n');
}

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}
