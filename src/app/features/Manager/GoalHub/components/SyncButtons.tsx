/**
 * SyncButtons Component
 * Buttons for syncing goals to Supabase and GitHub
 */

'use client';

import { useState, useCallback } from 'react';
import { Cloud, RefreshCw, Github } from 'lucide-react';

interface SyncButtonsProps {
  projectId: string;
}

type SyncStatus = 'idle' | 'success' | 'error';

export default function SyncButtons({ projectId }: SyncButtonsProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [isGitHubSyncing, setIsGitHubSyncing] = useState(false);
  const [gitHubSyncStatus, setGitHubSyncStatus] = useState<SyncStatus>('idle');

  const handleManualSync = useCallback(async () => {
    if (!projectId || isSyncing) return;

    setIsSyncing(true);
    setSyncStatus('idle');

    try {
      const response = await fetch('/api/goals/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setSyncStatus('success');
      } else {
        setSyncStatus('error');
        console.error('Sync failed:', result.errors);
      }

      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (error) {
      console.error('Sync error:', error);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } finally {
      setIsSyncing(false);
    }
  }, [projectId, isSyncing]);

  const handleGitHubSync = useCallback(async () => {
    if (!projectId || isGitHubSyncing) return;

    setIsGitHubSyncing(true);
    setGitHubSyncStatus('idle');

    try {
      const response = await fetch('/api/goals/github-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setGitHubSyncStatus('success');
      } else {
        setGitHubSyncStatus('error');
        console.error('GitHub sync failed:', result.errors);
      }

      setTimeout(() => setGitHubSyncStatus('idle'), 3000);
    } catch (error) {
      console.error('GitHub sync error:', error);
      setGitHubSyncStatus('error');
      setTimeout(() => setGitHubSyncStatus('idle'), 3000);
    } finally {
      setIsGitHubSyncing(false);
    }
  }, [projectId, isGitHubSyncing]);

  const getSyncButtonClass = (status: SyncStatus) => {
    if (status === 'success') {
      return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40';
    }
    if (status === 'error') {
      return 'bg-red-500/20 text-red-400 border border-red-500/40';
    }
    return 'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700';
  };

  return (
    <>
      <button
        onClick={handleManualSync}
        disabled={isSyncing}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all ${getSyncButtonClass(syncStatus)}`}
        title="Sync goals to Supabase"
      >
        {isSyncing ? (
          <RefreshCw className="w-4 h-4 animate-spin" />
        ) : (
          <Cloud className="w-4 h-4" />
        )}
        {isSyncing ? 'Syncing...' : 'Sync'}
      </button>

      <button
        onClick={handleGitHubSync}
        disabled={isGitHubSyncing}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all ${getSyncButtonClass(gitHubSyncStatus)}`}
        title="Sync goals to GitHub Projects"
      >
        {isGitHubSyncing ? (
          <RefreshCw className="w-4 h-4 animate-spin" />
        ) : (
          <Github className="w-4 h-4" />
        )}
        {isGitHubSyncing ? 'Syncing...' : 'GitHub'}
      </button>
    </>
  );
}
