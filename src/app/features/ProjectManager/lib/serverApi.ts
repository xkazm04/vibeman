/**
 * Server management API functions
 */

/**
 * Stop server with optional force flag
 */
export const stopServerApi = async (projectId: string, force: boolean = false): Promise<void> => {
  const response = await fetch('/api/server/stop', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId, force }),
  });
  
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to stop server');
  }
};

/**
 * Get server status information
 */
export const getServerStatus = (
  projectId: string, 
  processes: Record<string, any>, 
  serverLoading: Record<string, boolean>
) => {
  const status = processes[projectId];
  const isRunning = status?.status === 'running';
  const hasError = status?.status === 'error';
  const isStopping = status?.status === 'stopping';
  const isLoading = serverLoading[projectId];
  
  return { isRunning, hasError, isStopping, isLoading, status };
};