/**
 * API client for context groups
 */

export interface ContextGroup {
  id: string;
  projectId: string;
  name: string;
  color: string;
  position: number;
}

/**
 * Fetch context groups for a project
 */
export async function fetchContextGroups(projectId: string): Promise<ContextGroup[]> {
  try {
    const response = await fetch(`/api/context-groups?projectId=${projectId}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch context groups: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.success || !result.data) {
      throw new Error('Invalid response from context groups API');
    }

    return result.data;
  } catch (error) {
    console.error('[contextGroupApi] Error fetching context groups:', error);
    throw error;
  }
}
