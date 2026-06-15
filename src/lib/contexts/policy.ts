/**
 * Context Granularity Policy — machine-readable targets for how contexts and
 * groups should be sized as a project grows.
 *
 * Single source of truth for the generation prompt and the balance audit,
 * replacing the contradicting prose thresholds that used to live only in
 * markdown (skill said 5-15 files; the minimal fallback said 10-25).
 */

export interface SizePolicy {
  /** File-count guidance for a single context. */
  filesPerContext: { min: number; ideal: number; max: number; hardMax: number };
  /** How many contexts a group should contain. */
  contextsPerGroup: { min: number; max: number };
  /** How many groups the whole project should have (scaled by size). */
  groupsPerProject: { min: number; max: number };
  /** Approximate total contexts for the project. */
  targetContexts: { min: number; max: number };
}

export type ProjectSizeTier = 'small' | 'medium' | 'large';

// Per-context and per-group sizing is constant across tiers; only the COUNTS
// of groups/contexts scale with project size.
const FILES_PER_CONTEXT = { min: 5, ideal: 10, max: 15, hardMax: 20 };
const CONTEXTS_PER_GROUP = { min: 3, max: 6 };

export const SIZE_POLICY: Record<ProjectSizeTier, SizePolicy> = {
  small: {
    filesPerContext: FILES_PER_CONTEXT,
    contextsPerGroup: CONTEXTS_PER_GROUP,
    groupsPerProject: { min: 3, max: 4 },
    targetContexts: { min: 8, max: 12 },
  },
  medium: {
    filesPerContext: FILES_PER_CONTEXT,
    contextsPerGroup: CONTEXTS_PER_GROUP,
    groupsPerProject: { min: 5, max: 8 },
    targetContexts: { min: 15, max: 30 },
  },
  large: {
    filesPerContext: FILES_PER_CONTEXT,
    contextsPerGroup: CONTEXTS_PER_GROUP,
    groupsPerProject: { min: 8, max: 12 },
    targetContexts: { min: 30, max: 50 },
  },
};

/** Hard cap enforced by the DB layer regardless of tier. */
export const MAX_GROUPS_PER_PROJECT = 20;

/** Classify a project by its source-file count. */
export function classifyProjectSize(sourceFileCount: number): ProjectSizeTier {
  if (sourceFileCount < 50) return 'small';
  if (sourceFileCount <= 200) return 'medium';
  return 'large';
}

export function getPolicy(sourceFileCount: number): { tier: ProjectSizeTier; policy: SizePolicy } {
  const tier = classifyProjectSize(sourceFileCount);
  return { tier, policy: SIZE_POLICY[tier] };
}

/**
 * Render the policy as a compact human/LLM-readable block for embedding in the
 * generation prompt, so the prompt and the audit grade against identical numbers.
 */
export function renderPolicyForPrompt(tier: ProjectSizeTier): string {
  const p = SIZE_POLICY[tier];
  return [
    `Project size tier: ${tier.toUpperCase()}`,
    `- Files per context: ${p.filesPerContext.min}-${p.filesPerContext.max} (ideal ~${p.filesPerContext.ideal}, never exceed ${p.filesPerContext.hardMax})`,
    `- Contexts per group: ${p.contextsPerGroup.min}-${p.contextsPerGroup.max}`,
    `- Groups in this project: ${p.groupsPerProject.min}-${p.groupsPerProject.max} (hard cap ${MAX_GROUPS_PER_PROJECT})`,
    `- Total contexts target: ${p.targetContexts.min}-${p.targetContexts.max}`,
  ].join('\n');
}
