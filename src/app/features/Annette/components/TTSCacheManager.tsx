'use client';

/**
 * TTS Cache Management Component
 * Displays cache statistics and provides controls to manage cached audio
 */

import React, { useState, useEffect } from 'react';
import { Database, Trash2, RefreshCw } from 'lucide-react';
import { getCacheStats, clearCache } from '../lib/ttsCache';

interface CacheStats {
  entryCount: number;
  totalSizeMB: number;
  oldestEntry: number | null;
  mostAccessed: number;
}

export function TTSCacheManager() {
  const [stats, setStats] = useState<CacheStats>({
    entryCount: 0,
    totalSizeMB: 0,
    oldestEntry: null,
    mostAccessed: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      const cacheStats = await getCacheStats();
      setStats(cacheStats);
    } catch (error) {
      console.error('Failed to load cache stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearCache = async () => {
    if (!confirm('Are you sure you want to clear all cached TTS audio?')) {
      return;
    }

    setIsClearing(true);
    try {
      await clearCache();
      await loadStats();
    } catch (error) {
      console.error('Failed to clear cache:', error);
      alert('Failed to clear cache. Check console for details.');
    } finally {
      setIsClearing(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="p-4 bg-gradient-to-br from-slate-900/90 to-slate-800/90 rounded-lg border border-cyan-500/20 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-cyan-400" />
          <h3 className="text-lg font-semibold text-cyan-300">TTS Cache</h3>
        </div>

        <div className="flex gap-2">
          <button
            onClick={loadStats}
            disabled={isLoading}
            className="px-3 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded-md transition-all duration-200 flex items-center gap-2 disabled:opacity-50"
            data-testid="refresh-cache-stats-btn"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={handleClearCache}
            disabled={isClearing || stats.entryCount === 0}
            className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-md transition-all duration-200 flex items-center gap-2 disabled:opacity-50"
            data-testid="clear-cache-btn"
          >
            <Trash2 className="w-4 h-4" />
            Clear Cache
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-800/50 p-3 rounded-md border border-slate-700/50">
          <div className="text-xs text-slate-400 mb-1">Cached Entries</div>
          <div className="text-2xl font-bold text-cyan-300">
            {isLoading ? '...' : stats.entryCount}
          </div>
        </div>

        <div className="bg-slate-800/50 p-3 rounded-md border border-slate-700/50">
          <div className="text-xs text-slate-400 mb-1">Total Size</div>
          <div className="text-2xl font-bold text-cyan-300">
            {isLoading ? '...' : `${stats.totalSizeMB.toFixed(2)} MB`}
          </div>
        </div>

        <div className="bg-slate-800/50 p-3 rounded-md border border-slate-700/50">
          <div className="text-xs text-slate-400 mb-1">Oldest Entry</div>
          <div className="text-sm font-medium text-slate-300">
            {isLoading ? '...' : formatDate(stats.oldestEntry)}
          </div>
        </div>

        <div className="bg-slate-800/50 p-3 rounded-md border border-slate-700/50">
          <div className="text-xs text-slate-400 mb-1">Most Accessed</div>
          <div className="text-2xl font-bold text-cyan-300">
            {isLoading ? '...' : `${stats.mostAccessed}x`}
          </div>
        </div>
      </div>

      <div className="mt-3 text-xs text-slate-400 bg-slate-800/30 p-2 rounded border border-slate-700/30">
        <p>
          <strong className="text-cyan-400">Cache Benefits:</strong> Instant playback
          for repeated phrases, reduced bandwidth usage, and ~50% latency reduction.
        </p>
        <p className="mt-1">
          <strong className="text-cyan-400">Limits:</strong> Max 50 MB or 100 entries
          (oldest/least-used evicted automatically)
        </p>
      </div>
    </div>
  );
}
