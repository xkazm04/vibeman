import { ReflectionStats } from './types';

export async function fetchReflectionStats(
  projectId?: string | null,
  contextId?: string | null
): Promise<ReflectionStats> {
  const params = new URLSearchParams();

  if (projectId) {
    params.append('projectId', projectId);
  }

  if (contextId) {
    params.append('contextId', contextId);
  }

  const url = `/api/ideas/stats${params.toString() ? `?${params.toString()}` : ''}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Failed to fetch reflection stats');
  }

  return response.json();
}
