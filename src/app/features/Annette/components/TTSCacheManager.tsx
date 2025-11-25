'use client';

/**
 * TTS Cache Management Component
 * Toggleable panel styled like Session History
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, Trash2, RefreshCw } from 'lucide-react';
import { getCacheStats, clearCache } from '../lib/ttsCache';
import { AnnetteTheme } from '../sub_VoiceInterface/AnnetteThemeSwitcher';
import { useThemeStore } from '@/stores/themeStore';

interface CacheStats {
  entryCount: number;
  totalSizeMB: number;
  oldestEntry: number | null;
  mostAccessed: number;
}

interface TTSCacheManagerProps {
  theme: AnnetteTheme;
}

export default function TTSCacheManager({ theme }: TTSCacheManagerProps) {
  const [showCache, setShowCache] = useState(false);
  const [stats, setStats] = useState<CacheStats>({
    entryCount: 0,
    totalSizeMB: 0,
    oldestEntry: null,
    mostAccessed: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const { getThemeColors } = useThemeStore();
  const colors = getThemeColors();

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
    <>
      {/* Toggle Button */}
      <motion.button
        onClick={() => {
          setShowCache(!showCache);
          if (!showCache) loadStats();  // Load stats when opening
        }}
        whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.1)' }}
        whileTap={{ scale: 0.95 }}
        className={`
          relative p-3 rounded-xl transition-all duration-300
          ${showCache ? `bg-white/10 ${colors.text}` : 'text-gray-400 hover:text-white'}
        `}
        title="TTS Cache Manager"
      >
        <Database className="w-5 h-5" />
        {stats.entryCount > 0 && (
          <span className={`absolute top-2 right-2 w-2 h-2 ${colors.accent} rounded-full`} />
        )}
      </motion.button>

      {/* Cache Panel */}
      <AnimatePresence>
        {showCache && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="absolute left-0 right-0 top-full mt-2 z-50"
          >
            <div className={`mx-4 p-4 bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-xl rounded-lg border ${colors.border} shadow-2xl`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Database className={`w-5 h-5 ${colors.text}`} />
                  <h3 className={`text-sm font-semibold ${colors.text} font-mono uppercase tracking-wide`}>TTS Cache</h3>
                </div>

                <div className="flex gap-2">
                  <motion.button
                    onClick={loadStats}
                    disabled={isLoading}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`px-3 py-1.5 ${colors.bg} hover:${colors.bgHover} ${colors.text} rounded-lg transition-all duration-200 flex items-center gap-2 disabled:opacity-50 text-xs font-mono`}
                    data-testid="refresh-cache-stats-btn"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </motion.button>

                  <motion.button
                    onClick={handleClearCache}
                    disabled={isClearing || stats.entryCount === 0}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-all duration-200 flex items-center gap-2 disabled:opacity-50 text-xs font-mono"
                    data-testid="clear-cache-btn"
                  >
                    <Trash2 className="w-3 h-3" />
                    Clear
                  </motion.button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className={`bg-slate-800/50 p-3 rounded-lg border ${colors.borderLight}`}>
                  <div className="text-[10px] text-slate-400 mb-1 font-mono uppercase tracking-wide">Cached Entries</div>
                  <div className={`text-xl font-bold ${colors.text} font-mono`}>
                    {isLoading ? '...' : stats.entryCount}
                  </div>
                </div>

                <div className={`bg-slate-800/50 p-3 rounded-lg border ${colors.borderLight}`}>
                  <div className="text-[10px] text-slate-400 mb-1 font-mono uppercase tracking-wide">Total Size</div>
                  <div className={`text-xl font-bold ${colors.text} font-mono`}>
                    {isLoading ? '...' : `${stats.totalSizeMB.toFixed(2)} MB`}
                  </div>
                </div>

                <div className={`bg-slate-800/50 p-3 rounded-lg border ${colors.borderLight} col-span-2`}>
                  <div className="text-[10px] text-slate-400 mb-1 font-mono uppercase tracking-wide">Oldest Entry</div>
                  <div className="text-xs font-medium text-slate-300 font-mono">
                    {isLoading ? '...' : formatDate(stats.oldestEntry)}
                  </div>
                </div>
              </div>

              <div className={`mt-3 text-[10px] text-slate-400 bg-slate-800/30 p-2 rounded border ${colors.borderLight} font-mono leading-relaxed`}>
                <p>
                  <strong className={colors.text}>Benefits:</strong> Instant playback for repeated phrases, reduced bandwidth.
                </p>
                <p className="mt-1">
                  <strong className={colors.text}>Limits:</strong> Max 50 MB or 100 entries (auto-evicted).
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
