'use client';
import { useState, useCallback } from 'react';
import { useServerProjectStore } from '@/stores/serverProjectStore';
import { stopServerApi } from './serverApi';

/**
 * Custom hook for managing server operations
 */
export const useServerManagement = () => {
  const { processes, startServer, stopServer } = useServerProjectStore();
  const [serverLoading, setServerLoading] = useState<Record<string, boolean>>({});

  const handleServerToggle = useCallback(async (projectId: string) => {
    const status = processes[projectId];
    const isRunning = status?.status === 'running';
    const hasError = status?.status === 'error';
    
    setServerLoading(prev => ({ ...prev, [projectId]: true }));

    try {
      if (isRunning) {
        await stopServer(projectId);
      } else if (hasError) {
        // Force stop/clear error state
        await stopServerApi(projectId, true);
      } else {
        await startServer(projectId);
      }
    } catch (error) {
      console.error('Server toggle error:', error);
    } finally {
      setServerLoading(prev => ({ ...prev, [projectId]: false }));
    }
  }, [processes, startServer, stopServer]);

  return {
    processes,
    serverLoading,
    handleServerToggle
  };
};