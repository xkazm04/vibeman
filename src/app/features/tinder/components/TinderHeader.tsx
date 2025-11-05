'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, CloudDownload, RefreshCw, Trash2 } from 'lucide-react';
import { UniversalSelect } from '@/components/ui/UniversalSelect';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import { TinderStats } from '../lib/tinderHooks';
import { TINDER_ANIMATIONS } from '../lib/tinderUtils';

interface TinderHeaderProps {
  selectedProjectId: string;
  onProjectChange: (projectId: string) => void;
  remainingCount: number;
  stats: TinderStats;
  loading?: boolean;
  processing?: boolean;
  onSyncComplete?: () => void; // Callback to refresh ideas after sync
  onFlushComplete?: () => void; // Callback to refresh ideas after flush
}

export default function TinderHeader({
  selectedProjectId,
  onProjectChange,
  remainingCount,
  stats,
  loading = false,
  processing = false,
  onSyncComplete,
  onFlushComplete,
}: TinderHeaderProps) {
  const { projects } = useProjectConfigStore();
  const [isSupabaseConfigured, setIsSupabaseConfigured] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [flushing, setFlushing] = useState(false);
  const [flushError, setFlushError] = useState<string | null>(null);
  const [flushSuccess, setFlushSuccess] = useState(false);

  // Check if Supabase is configured on mount
  useEffect(() => {
    checkSupabaseConfig();
  }, []);

  const checkSupabaseConfig = async () => {
    try {
      const response = await fetch('/api/db-sync/status');
      const data = await response.json();
      setIsSupabaseConfigured(data.configured && data.connected);
    } catch (error) {
      console.error('Failed to check Supabase config:', error);
      setIsSupabaseConfigured(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      setSyncError(null);
      setSyncSuccess(false);

      const response = await fetch('/api/db-sync/pull-ideas', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to sync ideas');
      }

      console.log(`Synced ${data.recordCount} ideas from Supabase`);
      setSyncSuccess(true);

      // Call the callback to refresh the ideas list
      if (onSyncComplete) {
        onSyncComplete();
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSyncSuccess(false), 3000);
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncError(error instanceof Error ? error.message : 'Sync failed');

      // Clear error message after 5 seconds
      setTimeout(() => setSyncError(null), 5000);
    } finally {
      setSyncing(false);
    }
  };

  const handleFlush = async () => {
    // Confirmation dialog
    const projectName = selectedProjectId === 'all'
      ? 'all projects'
      : projects.find(p => p.id === selectedProjectId)?.name || 'this project';

    const confirmed = window.confirm(
      `Are you sure you want to permanently delete all ideas from ${projectName}?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setFlushing(true);
      setFlushError(null);
      setFlushSuccess(false);

      const response = await fetch('/api/ideas/tinder/flush', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: selectedProjectId }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to flush ideas');
      }

      console.log(`Flushed ${data.deletedCount} ideas`);
      setFlushSuccess(true);

      // Call the callback to refresh the ideas list
      if (onFlushComplete) {
        onFlushComplete();
      }

      // Clear success message after 3 seconds
      setTimeout(() => setFlushSuccess(false), 3000);
    } catch (error) {
      console.error('Flush failed:', error);
      setFlushError(error instanceof Error ? error.message : 'Flush failed');

      // Clear error message after 5 seconds
      setTimeout(() => setFlushError(null), 5000);
    } finally {
      setFlushing(false);
    }
  };

  const projectOptions = [
    { value: 'all', label: 'All Projects' },
    ...projects.map(project => ({
      value: project.id,
      label: project.name,
    })),
  ];

  return (
    <div className="border-b border-gray-700/40 bg-gray-900/60 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between">
          {/* Left: Title */}
          <div className="flex items-center space-x-4">
            <motion.div
              className="p-3 bg-gradient-to-br from-pink-500/20 to-purple-500/30 rounded-xl border border-pink-500/40"
              animate={{ rotate: TINDER_ANIMATIONS.HEART_ROTATION.rotate }}
              transition={TINDER_ANIMATIONS.HEART_ROTATION.transition}
            >
              <Heart className="w-6 h-6 text-pink-400" />
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                Idea Tinder
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                Swipe right to accept, left to reject
              </p>
            </div>
          </div>

          {/* Center: Sync Button + Project Filter */}
          <div className="flex items-center gap-3">
            {/* Supabase Sync Button */}
            {isSupabaseConfigured && (
              <div className="relative">
                <motion.button
                  onClick={handleSync}
                  disabled={syncing || loading || processing}
                  className={`p-2.5 rounded-lg border transition-all duration-200 ${
                    syncing
                      ? 'bg-gray-700/50 border-gray-600/50 cursor-not-allowed'
                      : syncSuccess
                      ? 'bg-green-500/20 border-green-500/40 text-green-400'
                      : syncError
                      ? 'bg-red-500/20 border-red-500/40 text-red-400'
                      : 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20 hover:border-blue-500/50 text-blue-400'
                  }`}
                  whileHover={syncing ? {} : { scale: 1.05 }}
                  whileTap={syncing ? {} : { scale: 0.95 }}
                  title={
                    syncing
                      ? 'Syncing from Supabase...'
                      : syncSuccess
                      ? 'Sync completed!'
                      : syncError
                      ? syncError
                      : 'Pull ideas from Supabase'
                  }
                >
                  {syncing ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <RefreshCw className="w-4 h-4" />
                    </motion.div>
                  ) : (
                    <CloudDownload className="w-4 h-4" />
                  )}
                </motion.button>

                {/* Error/Success Tooltip */}
                {(syncError || syncSuccess) && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`absolute top-full mt-2 left-1/2 -translate-x-1/2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap z-50 shadow-lg ${
                      syncSuccess
                        ? 'bg-green-500/90 text-white'
                        : 'bg-red-500/90 text-white'
                    }`}
                  >
                    {syncSuccess ? 'Ideas synced!' : syncError}
                  </motion.div>
                )}
              </div>
            )}

            <UniversalSelect
              value={selectedProjectId}
              onChange={onProjectChange}
              options={projectOptions}
              disabled={loading || processing}
              className="min-w-[200px]"
            />
          </div>

          {/* Right: Stats + Flush Button */}
          <div className="flex items-center space-x-6">
            <div className="text-sm">
              <span className="text-gray-500">Remaining:</span>{' '}
              <span className="text-white font-mono font-semibold">{remainingCount}</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Accepted:</span>{' '}
              <span className="text-green-400 font-mono font-semibold">{stats.accepted}</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Rejected:</span>{' '}
              <span className="text-red-400 font-mono font-semibold">{stats.rejected}</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Deleted:</span>{' '}
              <span className="text-gray-400 font-mono font-semibold">{stats.deleted}</span>
            </div>

            {/* Flush Button */}
            <div className="relative ml-2">
              <motion.button
                onClick={handleFlush}
                disabled={flushing || loading || processing}
                className={`p-2.5 rounded-lg border transition-all duration-200 ${
                  flushing
                    ? 'bg-gray-700/50 border-gray-600/50 cursor-not-allowed'
                    : flushSuccess
                    ? 'bg-green-500/20 border-green-500/40 text-green-400'
                    : flushError
                    ? 'bg-red-500/20 border-red-500/40 text-red-400'
                    : 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20 hover:border-red-500/50 text-red-400'
                }`}
                whileHover={flushing ? {} : { scale: 1.05 }}
                whileTap={flushing ? {} : { scale: 0.95, rotate: -5 }}
                title={
                  flushing
                    ? 'Flushing ideas...'
                    : flushSuccess
                    ? 'Ideas flushed!'
                    : flushError
                    ? flushError
                    : 'Flush all ideas (permanent delete)'
                }
                data-testid="flush-ideas-btn"
              >
                {flushing ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <RefreshCw className="w-4 h-4" />
                  </motion.div>
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </motion.button>

              {/* Error/Success Tooltip */}
              {(flushError || flushSuccess) && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`absolute top-full mt-2 left-1/2 -translate-x-1/2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap z-50 shadow-lg ${
                    flushSuccess
                      ? 'bg-green-500/90 text-white'
                      : 'bg-red-500/90 text-white'
                  }`}
                >
                  {flushSuccess ? 'Ideas flushed!' : flushError}
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}