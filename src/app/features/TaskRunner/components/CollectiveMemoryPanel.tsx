'use client';

import React, { useState, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize2, X } from 'lucide-react';
import { useCollectiveMemoryStore } from '@/stores/collectiveMemoryStore';

const CollectiveMemoryDashboard = lazy(() => import('./CollectiveMemoryDashboard'));

interface Props {
  projectId: string;
  isOpen: boolean;
  onToggle: () => void;
}

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  pattern: { label: 'Pattern', color: 'text-blue-400', icon: '\u25C7' },
  error_fix: { label: 'Fix', color: 'text-red-400', icon: '\u2726' },
  approach: { label: 'Approach', color: 'text-green-400', icon: '\u2192' },
  optimization: { label: 'Optim', color: 'text-yellow-400', icon: '\u26A1' },
  conflict_resolution: { label: 'Resolve', color: 'text-purple-400', icon: '\u27E1' },
};

export function CollectiveMemoryPanel({ projectId, isOpen, onToggle }: Props) {
  const { memories, stats, isLoading, fetchMemories, fetchStats } = useCollectiveMemoryStore();
  const [showDashboard, setShowDashboard] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchMemories(projectId);
      fetchStats(projectId);
    }
  }, [isOpen, projectId, fetchMemories, fetchStats]);

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-cyan-400 border border-gray-700/50"
        title="Collective Memory"
      >
        <span className="text-cyan-500">{'\u2B21'}</span>
        <span>Memory</span>
        {stats && stats.total > 0 && (
          <span className="ml-1 px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 text-[10px] font-semibold">
            {stats.total}
          </span>
        )}
      </button>

      {/* Inline Panel */}
      <AnimatePresence>
        {isOpen && !showDashboard && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="mt-2 rounded-lg border border-gray-700/50 bg-gray-800/80 backdrop-blur-sm">
              {/* Header */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700/30">
                <div className="flex items-center gap-2">
                  <span className="text-cyan-400 text-sm">{'\u2B21'}</span>
                  <span className="text-xs font-semibold text-gray-200">Collective Memory</span>
                </div>
                <div className="flex items-center gap-2">
                  {stats && (
                    <div className="flex items-center gap-2 text-[10px] text-gray-500">
                      <span>{stats.total} memories</span>
                      <span className="text-gray-600">|</span>
                      <span className="text-cyan-500">{Math.round(stats.avgEffectiveness * 100)}% effective</span>
                    </div>
                  )}
                  <button
                    onClick={() => setShowDashboard(true)}
                    className="relative p-2 rounded hover:bg-gray-700/50 text-gray-500 hover:text-cyan-400 transition-colors before:absolute before:inset-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:w-11 before:h-11 before:content-['']"
                    title="Open full dashboard"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Loading */}
              {isLoading && (
                <div className="px-3 py-4 text-center text-xs text-gray-500">
                  Loading memories...
                </div>
              )}

              {/* Stats Bar */}
              {stats && !isLoading && stats.total > 0 && (
                <div className="px-3 py-2 border-b border-gray-700/20">
                  <div className="flex gap-2 flex-wrap">
                    {Object.entries(stats.byType).map(([type, count]) => {
                      const cfg = TYPE_CONFIG[type];
                      if (!cfg || count === 0) return null;
                      return (
                        <span
                          key={type}
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-gray-700/50 ${cfg.color}`}
                        >
                          {cfg.icon} {cfg.label}: {count}
                        </span>
                      );
                    })}
                    {stats.recentCount > 0 && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-green-500/10 text-green-400">
                        +{stats.recentCount} this week
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Memory List */}
              {!isLoading && (
                <div className="max-h-64 overflow-y-auto">
                  {memories.length === 0 ? (
                    <div className="px-3 py-6 text-center">
                      <p className="text-xs text-gray-500">No memories yet.</p>
                      <p className="text-[10px] text-gray-600 mt-1">
                        Memories are captured as tasks complete.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-700/20">
                      {memories.slice(0, 10).map((mem, i) => {
                        const cfg = TYPE_CONFIG[mem.memory_type] || TYPE_CONFIG.pattern;
                        const score = Math.round(mem.effectiveness_score * 100);
                        return (
                          <motion.div
                            key={mem.id}
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className="px-3 py-2 hover:bg-gray-700/20 transition-colors group"
                          >
                            <div className="flex items-start gap-2">
                              <span className={`text-xs mt-0.5 ${cfg.color}`}>{cfg.icon}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs text-gray-200 font-medium truncate">
                                    {mem.title}
                                  </span>
                                  <span className={`text-[9px] px-1 py-px rounded ${
                                    score >= 70 ? 'bg-green-500/10 text-green-400' :
                                    score >= 40 ? 'bg-yellow-500/10 text-yellow-400' :
                                    'bg-gray-700/50 text-gray-500'
                                  }`}>
                                    {score}%
                                  </span>
                                </div>
                                <p className="text-[10px] text-gray-500 truncate mt-0.5">
                                  {mem.description}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5 text-[9px] text-gray-600">
                                  <span>{mem.success_count}{'\u2713'} {mem.failure_count}{'\u2717'}</span>
                                  {mem.last_applied_at && (
                                    <span>Last: {new Date(mem.last_applied_at).toLocaleDateString()}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full Dashboard Modal */}
      <AnimatePresence>
        {showDashboard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowDashboard(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="w-[90vw] max-w-5xl h-[80vh] bg-zinc-900 border border-zinc-700/50 rounded-xl shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/50">
                <div className="flex items-center gap-2">
                  <span className="text-cyan-400 text-lg">{'\u2B21'}</span>
                  <h2 className="text-sm font-semibold text-zinc-200">Collective Memory Dashboard</h2>
                  {stats && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400">
                      {stats.total} memories | {Math.round(stats.avgEffectiveness * 100)}% effective
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setShowDashboard(false)}
                  className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Dashboard Content */}
              <div className="flex-1 overflow-hidden">
                <Suspense fallback={
                  <div className="flex items-center justify-center h-full">
                    <div className="w-6 h-6 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
                  </div>
                }>
                  <CollectiveMemoryDashboard projectId={projectId} />
                </Suspense>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
