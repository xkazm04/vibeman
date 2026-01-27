'use client';

/**
 * SyncButton Component
 * Manual sync button for pushing pending directions and requirements to Supabase
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Check, AlertCircle, Cloud } from 'lucide-react';
import { toast } from '@/stores/toastStore';

interface SyncButtonProps {
  projectId: string;
  disabled?: boolean;
  className?: string;
}

interface SyncResponse {
  success: boolean;
  data?: {
    success: boolean;
    directions: { count: number; error?: string };
    requirements: { count: number; error?: string };
  };
  message?: string;
  error?: string;
}

export function SyncButton({
  projectId,
  disabled = false,
  className = '',
}: SyncButtonProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<'success' | 'error' | null>(null);

  const handleSync = async () => {
    if (isSyncing || disabled || !projectId) return;

    setIsSyncing(true);
    setLastResult(null);

    try {
      const response = await fetch('/api/remote/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });

      const result: SyncResponse = await response.json();

      if (result.success && result.data) {
        const { directions, requirements } = result.data;
        const totalCount = directions.count + requirements.count;

        if (totalCount === 0) {
          toast.info('Nothing to sync', 'No pending directions or requirements found');
        } else {
          toast.success(
            'Sync complete',
            `Synced ${directions.count} directions, ${requirements.count} requirements`
          );
        }

        // Show warnings if any partial errors
        if (directions.error) {
          toast.warning('Direction sync issue', directions.error);
        }
        if (requirements.error) {
          toast.warning('Requirement sync issue', requirements.error);
        }

        setLastResult('success');
      } else {
        toast.error('Sync failed', result.error || 'Unknown error occurred');
        setLastResult('error');
      }
    } catch (error) {
      console.error('[SyncButton] Error:', error);
      toast.error(
        'Sync failed',
        error instanceof Error ? error.message : 'Network error'
      );
      setLastResult('error');
    } finally {
      setIsSyncing(false);

      // Clear result indicator after 3 seconds
      setTimeout(() => setLastResult(null), 3000);
    }
  };

  // Determine icon to show
  const Icon = isSyncing
    ? Loader2
    : lastResult === 'success'
    ? Check
    : lastResult === 'error'
    ? AlertCircle
    : Cloud;

  // Determine button colors
  const buttonColors = lastResult === 'success'
    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30'
    : lastResult === 'error'
    ? 'bg-red-500/20 text-red-300 border-red-500/30 hover:bg-red-500/30'
    : 'bg-purple-500/20 text-purple-300 border-purple-500/30 hover:bg-purple-500/30';

  return (
    <motion.button
      onClick={handleSync}
      disabled={isSyncing || disabled || !projectId}
      whileHover={{ scale: isSyncing ? 1 : 1.02 }}
      whileTap={{ scale: isSyncing ? 1 : 0.98 }}
      className={`
        flex items-center gap-2 px-4 py-2
        rounded-lg border transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${buttonColors}
        ${className}
      `}
      data-testid="sync-to-butler-btn"
    >
      <Icon
        className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`}
      />
      <span className="text-sm font-medium">
        {isSyncing ? 'Syncing...' : 'Sync to Butler'}
      </span>
    </motion.button>
  );
}
