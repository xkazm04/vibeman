/**
 * API client for contexts
 */

export interface Context {
  id: string;
  projectId: string;
  groupId: string | null;
  name: string;
  description?: string;
  filePaths: string[];
  preview?: string;
  testScenario?: string;
  testUpdated?: string;
  updatedAt?: string;
  createdAt?: string;
  groupName?: string;
  groupColor?: string;
}

/**
 * Fetch contexts for a group
 */
export async function fetchContextsByGroup(groupId: string): Promise<Context[]> {
  try {
    const response = await fetch(`/api/contexts?groupId=${groupId}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch contexts: ${response.statusText}`);
    }

    const result = await response.json();

    // API returns { success: true, data: Context[] }
    if (result.success && Array.isArray(result.data)) {
      return result.data;
    }

    // Fallback: return empty array if format is unexpected
    console.warn('[contextApi] Unexpected response format, returning empty array');
    return [];
  } catch (error) {
    console.error('[contextApi] Error fetching contexts:', error);
    return []; // Return empty array instead of throwing
  }
}
