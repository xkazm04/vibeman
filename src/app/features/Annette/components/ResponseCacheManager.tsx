/**
 * Response Cache Manager Component
 * UI for managing voicebot response cache settings and viewing statistics
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  getResponseCacheStats,
  clearResponseCache,
  ResponseCacheConfig
} from '../lib/voicebotResponseCache';
import { ResponseCacheStats } from '../lib/voicebotTypes';

interface ResponseCacheManagerProps {
  config: ResponseCacheConfig;
  onConfigChange: (config: ResponseCacheConfig) => void;
}

export default function ResponseCacheManager({
  config,
  onConfigChange
}: ResponseCacheManagerProps) {
  const [stats, setStats] = useState<ResponseCacheStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      const cacheStats = await getResponseCacheStats();
      setStats(cacheStats);
    } catch (error) {
      console.error('Failed to load cache stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearCache = async () => {
    if (!confirm('Clear all cached voicebot responses?')) {
      return;
    }

    setIsLoading(true);
    try {
      await clearResponseCache();
      await loadStats();
    } catch (error) {
      console.error('Failed to clear cache:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleCache = () => {
    onConfigChange({ ...config, enabled: !config.enabled });
  };

  const handleTTLChange = (ttlMinutes: number) => {
    const ttlMs = ttlMinutes * 60 * 1000;
    onConfigChange({ ...config, ttl: ttlMs });
  };

  const handleMaxEntriesChange = (maxEntries: number) => {
    onConfigChange({ ...config, maxEntries: maxEntries || undefined });
  };

  useEffect(() => {
    loadStats();
  }, []);

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (timestamp: number | null): string => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  };

  const ttlMinutes = config.ttl ? config.ttl / (60 * 1000) : 60;

  return (
    <div className="space-y-4 p-4 bg-gradient-to-br from-slate-900/90 to-slate-800/90 rounded-lg border border-cyan-500/30">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-cyan-400">Response Cache</h3>
        <button
          onClick={loadStats}
          disabled={isLoading}
          className="px-3 py-1 text-sm bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 rounded border border-cyan-500/30 transition-colors disabled:opacity-50"
          data-testid="refresh-cache-stats-btn"
        >
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Cache Toggle */}
      <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded border border-slate-700/50">
        <div>
          <div className="text-sm font-medium text-slate-300">Enable Cache</div>
          <div className="text-xs text-slate-500">
            Cache LLM responses to reduce latency
          </div>
        </div>
        <button
          onClick={handleToggleCache}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            config.enabled !== false ? 'bg-cyan-600' : 'bg-slate-600'
          }`}
          data-testid="toggle-response-cache-btn"
        >
          <div
            className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
              config.enabled !== false ? 'translate-x-7' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* TTL Configuration */}
      <div className="p-3 bg-slate-800/50 rounded border border-slate-700/50">
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Cache TTL (minutes)
        </label>
        <input
          type="number"
          min="1"
          max="1440"
          value={ttlMinutes}
          onChange={(e) => handleTTLChange(Number(e.target.value))}
          className="w-full px-3 py-2 bg-slate-900/50 text-slate-200 border border-slate-700 rounded focus:outline-none focus:border-cyan-500"
          data-testid="cache-ttl-input"
        />
        <div className="text-xs text-slate-500 mt-1">
          Cached responses expire after this duration
        </div>
      </div>

      {/* Max Entries Configuration */}
      <div className="p-3 bg-slate-800/50 rounded border border-slate-700/50">
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Max Entries (0 = unlimited)
        </label>
        <input
          type="number"
          min="0"
          max="1000"
          value={config.maxEntries || 0}
          onChange={(e) => handleMaxEntriesChange(Number(e.target.value))}
          className="w-full px-3 py-2 bg-slate-900/50 text-slate-200 border border-slate-700 rounded focus:outline-none focus:border-cyan-500"
          data-testid="cache-max-entries-input"
        />
        <div className="text-xs text-slate-500 mt-1">
          Oldest entries are evicted when limit is reached
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="space-y-2 p-3 bg-slate-800/50 rounded border border-slate-700/50">
          <div className="text-sm font-medium text-slate-300 mb-2">Statistics</div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-slate-500">Total Entries</div>
              <div className="text-cyan-400 font-mono">{stats.totalEntries}</div>
            </div>
            <div>
              <div className="text-slate-500">Size Estimate</div>
              <div className="text-cyan-400 font-mono">
                {formatBytes(stats.totalSizeEstimate)}
              </div>
            </div>
            <div>
              <div className="text-slate-500">Oldest Entry</div>
              <div className="text-cyan-400 font-mono text-xs">
                {formatDate(stats.oldestEntry)}
              </div>
            </div>
            <div>
              <div className="text-slate-500">Newest Entry</div>
              <div className="text-cyan-400 font-mono text-xs">
                {formatDate(stats.newestEntry)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clear Cache Button */}
      <button
        onClick={handleClearCache}
        disabled={isLoading || !stats || stats.totalEntries === 0}
        className="w-full px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded border border-red-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        data-testid="clear-response-cache-btn"
      >
        Clear Cache
      </button>
    </div>
  );
}
