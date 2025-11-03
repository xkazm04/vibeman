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

/**
 * Load requirements from API
 */
export async function loadRequirements(
  projectPath: string,
  setRequirements: (reqs: Requirement[]) => void,
  setIsLoading: (loading: boolean) => void
): Promise<void> {
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
  } catch (err) {  } finally {
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
): Promise<boolean> {
  const req = requirements.find((r) => r.name === name);
  if (req?.status === 'queued') {
    return false; // Cannot delete queued items
  }

  try {
    const success = await apiDeleteRequirement(projectPath, name);
    if (success) {
      setRequirements(requirements.filter((r) => r.name !== name));
    }
    return success;
  } catch (err) {    return false;
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
): Promise<void> {
  setIsGenerating(true);
  try {
    await apiGenerateRequirements(projectPath, projectId);
    await onComplete();
  } catch (err) {  } finally {
    setIsGenerating(false);
  }
}
