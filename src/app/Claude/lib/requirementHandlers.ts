/**
 * Requirement Handlers
 * Centralized handlers for requirement operations
 */

import {
  loadRequirements as apiLoadRequirements,
  deleteRequirement as apiDeleteRequirement,
  generateRequirements as apiGenerateRequirements,
  Requirement,
} from './requirementApi';

/** Result type for operations that can fail with a message. */
export interface RequirementOpResult {
  success: boolean;
  error?: string;
}

/**
 * Load requirements from API
 */
export async function loadRequirements(
  projectPath: string,
  setRequirements: (reqs: Requirement[]) => void,
  setIsLoading: (loading: boolean) => void
): Promise<RequirementOpResult> {
  setIsLoading(true);
  try {
    const requirementNames = await apiLoadRequirements(projectPath);
    // Filter out scan-contexts and structure scan files from the regular list
    const filteredNames = requirementNames.filter(
      (name) => !name.startsWith('scan-contexts') && !name.startsWith('refactor-structure')
    );
    const reqs = filteredNames.map((name) => ({
      name,
      status: 'idle' as const,
    }));
    setRequirements(reqs);
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load requirements';
    console.error('[requirementHandlers] loadRequirements failed:', message);
    return { success: false, error: message };
  } finally {
    setIsLoading(false);
  }
}

/**
 * Delete a requirement
 */
export async function deleteRequirement(
  projectPath: string,
  name: string,
  requirements: Requirement[],
  setRequirements: (reqs: Requirement[]) => void
): Promise<RequirementOpResult> {
  const req = requirements.find((r) => r.name === name);
  if (req?.status === 'queued') {
    return { success: false, error: 'Cannot delete queued requirement' };
  }

  try {
    const success = await apiDeleteRequirement(projectPath, name);
    if (success) {
      setRequirements(requirements.filter((r) => r.name !== name));
    }
    return { success };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete requirement';
    console.error(`[requirementHandlers] deleteRequirement '${name}' failed:`, message);
    return { success: false, error: message };
  }
}

/**
 * Generate requirements from goals
 */
export async function generateRequirements(
  projectPath: string,
  projectId: string,
  setIsGenerating: (generating: boolean) => void,
  onComplete: () => Promise<void>
): Promise<RequirementOpResult> {
  setIsGenerating(true);
  try {
    await apiGenerateRequirements(projectPath, projectId);
    await onComplete();
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to generate requirements';
    console.error('[requirementHandlers] generateRequirements failed:', message);
    return { success: false, error: message };
  } finally {
    setIsGenerating(false);
  }
}
