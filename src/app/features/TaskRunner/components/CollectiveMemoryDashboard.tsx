'use client';

import React, { useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database,
  Search,
  Trash2,
  ChevronRight,
  Bug,
  Route,
  Gauge,
  GitMerge,
  AlertCircle,
  BarChart3,
} from 'lucide-react';
import { useCollectiveMemoryStore } from '@/stores/collectiveMemoryStore';
import type { CollectiveMemoryType, DbCollectiveMemoryEntry } from '@/app/db/models/collective-memory.types';

interface Props {
  projectId: string;
}

const TYPE_META: Record<CollectiveMemoryType, { label: string; color: string; bg: string; icon: React.ComponentType<{ className?: string }> }> = {
  pattern: { label: 'Pattern', color: 'text-blue-400', bg: 'bg-blue-500/10', icon: Database },
  error_fix: { label: 'Error Fix', color: 'text-red-400', bg: 'bg-red-500/10', icon: Bug },
  approach: { label: 'Approach', color: 'text-green-400', bg: 'bg-green-500/10', icon: Route },
  optimization: { label: 'Optimization', color: 'text-yellow-400', bg: 'bg-yellow-500/10', icon: Gauge },
  conflict_resolution: { label: 'Conflict', color: 'text-purple-400', bg: 'bg-purple-500/10', icon: GitMerge },
};

function ScoreBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-zinc-600';
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-[10px] font-mono ${pct >= 70 ? 'text-green-400' : pct >= 40 ? 'text-yellow-400' : 'text-zinc-500'}`}>
        {pct}%
      </span>
    </div>
  );
}

function TrendChart({ trends }: { trends: { date: string; score: number; memoryCount: number }[] }) {
  if (trends.length < 2) {
    return (
      <div className="flex items-center justify-center h-24 text-xs text-zinc-600">
        Need more data for trends
      </div>
    );
  }

  const maxScore = Math.max(...trends.map(t => t.score), 0.01);
  const maxCount = Math.max(...trends.map(t => t.memoryCount), 1);
  const barWidth = Math.min(32, Math.floor(280 / trends.length));

  return (
    <div className="flex items-end gap-px h-24 px-1">
      {trends.map((t, i) => {
        const scoreHeight = (t.score / maxScore) * 80;
        const countOpacity = 0.3 + (t.memoryCount / maxCount) * 0.7;
        return (
          <div key={t.date} className="flex flex-col items-center gap-0.5 group relative" style={{ width: barWidth }}>
            <div
              className="w-full rounded-t bg-cyan-500 transition-all group-hover:bg-cyan-400"
              style={{ height: scoreHeight, opacity: countOpacity }}
            />
            {i % Math.max(1, Math.floor(trends.length / 5)) === 0 && (
              <span className="text-[8px] text-zinc-600 truncate w-full text-center">
                {t.date.slice(5)}
              </span>
            )}
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5 text-[9px] text-zinc-300 whitespace-nowrap z-10">
              {Math.round(t.score * 100)}% ({t.memoryCount} new)
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MemoryRow({
  memory,
  isSelected,
  onSelect,
  onDelete,
}: {
  memory: DbCollectiveMemoryEntry;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const meta = TYPE_META[memory.memory_type] || TYPE_META.pattern;
  const Icon = meta.icon;
  const tags: string[] = memory.tags ? JSON.parse(memory.tags) : [];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      onClick={onSelect}
      className={`px-3 py-2.5 cursor-pointer transition-colors border-l-2 ${
        isSelected
          ? 'bg-cyan-500/5 border-l-cyan-500'
          : 'border-l-transparent hover:bg-zinc-800/30'
      }`}
    >
      <div className="flex items-start gap-2">
        <div className={`p-1 rounded ${meta.bg} mt-0.5`}>
          <Icon className={`w-3 h-3 ${meta.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-200 font-medium truncate flex-1">
              {memory.title}
            </span>
            <ScoreBar score={memory.effectiveness_score} />
          </div>
          <p className="text-[10px] text-zinc-500 truncate mt-0.5">{memory.description}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-[9px] px-1 py-px rounded ${meta.bg} ${meta.color}`}>
              {meta.label}
            </span>
            <span className="text-[9px] text-zinc-600">
              {memory.success_count}OK {memory.failure_count}FAIL
            </span>
            {tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-[9px] px-1 py-px rounded bg-zinc-800 text-zinc-500">
                {tag}
              </span>
            ))}
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 text-zinc-600 hover:text-red-400 transition-all"
          title="Delete memory"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </motion.div>
  );
}

function MemoryDetail({ memory }: { memory: DbCollectiveMemoryEntry }) {
  const meta = TYPE_META[memory.memory_type] || TYPE_META.pattern;
  const Icon = meta.icon;
  const tags: string[] = memory.tags ? JSON.parse(memory.tags) : [];
  const filePatterns: string[] = memory.file_patterns ? JSON.parse(memory.file_patterns) : [];

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      className="p-4 space-y-4"
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${meta.bg}`}>
          <Icon className={`w-5 h-5 ${meta.color}`} />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-zinc-200">{memory.title}</h3>
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${meta.bg} ${meta.color}`}>
            {meta.label}
          </span>
        </div>
      </div>

      {/* Description */}
      <div>
        <h4 className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Description</h4>
        <p className="text-xs text-zinc-400 leading-relaxed">{memory.description}</p>
      </div>

      {/* Code Pattern */}
      {memory.code_pattern && (
        <div>
          <h4 className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Pattern Detected</h4>
          <code className="block text-xs text-cyan-400 bg-zinc-900 rounded px-2 py-1 font-mono">
            {memory.code_pattern}
          </code>
        </div>
      )}

      {/* Effectiveness */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-zinc-800/50 rounded-lg p-2">
          <div className="text-[10px] text-zinc-500">Score</div>
          <div className="text-lg font-bold text-cyan-400">{Math.round(memory.effectiveness_score * 100)}%</div>
        </div>
        <div className="bg-zinc-800/50 rounded-lg p-2">
          <div className="text-[10px] text-zinc-500">Successes</div>
          <div className="text-lg font-bold text-green-400">{memory.success_count}</div>
        </div>
        <div className="bg-zinc-800/50 rounded-lg p-2">
          <div className="text-[10px] text-zinc-500">Failures</div>
          <div className="text-lg font-bold text-red-400">{memory.failure_count}</div>
        </div>
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div>
          <h4 className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Tags</h4>
          <div className="flex flex-wrap gap-1">
            {tags.map(tag => (
              <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/50">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* File Patterns */}
      {filePatterns.length > 0 && (
        <div>
          <h4 className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">File Patterns</h4>
          <div className="flex flex-wrap gap-1">
            {filePatterns.map(fp => (
              <span key={fp} className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-500 font-mono">
                {fp}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Timestamps */}
      <div className="text-[9px] text-zinc-600 space-y-0.5 pt-2 border-t border-zinc-800/50">
        <div>Created: {new Date(memory.created_at).toLocaleString()}</div>
        {memory.last_applied_at && (
          <div>Last applied: {new Date(memory.last_applied_at).toLocaleString()}</div>
        )}
      </div>
    </motion.div>
  );
}

export default function CollectiveMemoryDashboard({ projectId }: Props) {
  const {
    memories,
    stats,
    trends,
    selectedMemoryId,
    activeTypeFilter,
    searchQuery,
    isLoading,
    error,
    fetchMemories,
    fetchStats,
    fetchTrends,
    setTypeFilter,
    setSearchQuery,
    setSelectedMemory,
    deleteMemory,
    clearError,
  } = useCollectiveMemoryStore();

  useEffect(() => {
    fetchMemories(projectId);
    fetchStats(projectId);
    fetchTrends(projectId);
  }, [projectId, fetchMemories, fetchStats, fetchTrends]);

  useEffect(() => {
    fetchMemories(projectId);
  }, [projectId, activeTypeFilter, searchQuery, fetchMemories]);

  const selectedMemory = useMemo(
    () => memories.find(m => m.id === selectedMemoryId) || null,
    [memories, selectedMemoryId]
  );

  const typeFilters: (CollectiveMemoryType | null)[] = [null, 'pattern', 'error_fix', 'approach', 'optimization', 'conflict_resolution'];

  return (
    <div className="flex flex-col h-full">
      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-2 bg-red-500/10 border-b border-red-500/20 flex items-center gap-2"
          >
            <AlertCircle className="w-3.5 h-3.5 text-red-400" />
            <span className="text-xs text-red-300 flex-1">{error}</span>
            <button onClick={clearError} className="text-xs text-red-400 hover:text-red-300">x</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Row */}
      {stats && (
        <div className="px-4 py-3 border-b border-zinc-800/50 flex-shrink-0">
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-zinc-800/40 rounded-lg px-3 py-2">
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Total Memories</div>
              <div className="text-xl font-bold text-zinc-200">{stats.total}</div>
            </div>
            <div className="bg-zinc-800/40 rounded-lg px-3 py-2">
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Avg. Effectiveness</div>
              <div className="text-xl font-bold text-cyan-400">{Math.round(stats.avgEffectiveness * 100)}%</div>
            </div>
            <div className="bg-zinc-800/40 rounded-lg px-3 py-2">
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider">This Week</div>
              <div className="text-xl font-bold text-green-400">+{stats.recentCount}</div>
            </div>
            <div className="bg-zinc-800/40 rounded-lg px-3 py-2">
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Applications</div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-green-400">{stats.recentApplications.success}OK</span>
                <span className="text-sm font-bold text-red-400">{stats.recentApplications.failure}F</span>
                <span className="text-sm font-bold text-zinc-500">{stats.recentApplications.pending}P</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trend Chart */}
      {trends.length > 0 && (
        <div className="px-4 py-3 border-b border-zinc-800/50 flex-shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-[10px] uppercase tracking-wider text-zinc-500">Effectiveness Trend (30d)</span>
          </div>
          <TrendChart trends={trends} />
        </div>
      )}

      {/* Search + Filters */}
      <div className="px-4 py-2 border-b border-zinc-800/50 flex-shrink-0 space-y-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
          <input
            type="text"
            placeholder="Search memories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-7 pr-3 py-1.5 text-xs bg-zinc-900/50 border border-zinc-800 rounded-md text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-cyan-500/30"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {typeFilters.map((type) => {
            const isActive = activeTypeFilter === type;
            const meta = type ? TYPE_META[type] : null;
            return (
              <button
                key={type || 'all'}
                onClick={() => setTypeFilter(type)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    : 'text-zinc-500 hover:text-zinc-300 bg-zinc-800/30 hover:bg-zinc-800/60'
                }`}
              >
                {meta ? meta.label : 'All'}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content: List + Detail */}
      <div className="flex-1 flex overflow-hidden">
        {/* Memory List */}
        <div className="w-1/2 border-r border-zinc-800/50 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-xs text-zinc-500">Loading...</div>
          ) : memories.length === 0 ? (
            <div className="p-8 text-center">
              <Database className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
              <p className="text-xs text-zinc-500">No memories yet.</p>
              <p className="text-[10px] text-zinc-600 mt-1">
                Memories are captured automatically as tasks complete.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/30">
              <AnimatePresence mode="popLayout">
                {memories.map(mem => (
                  <MemoryRow
                    key={mem.id}
                    memory={mem}
                    isSelected={selectedMemoryId === mem.id}
                    onSelect={() => setSelectedMemory(mem.id)}
                    onDelete={() => deleteMemory(projectId, mem.id)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <div className="w-1/2 overflow-y-auto">
          {selectedMemory ? (
            <MemoryDetail memory={selectedMemory} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <ChevronRight className="w-6 h-6 text-zinc-700 mb-2" />
              <p className="text-xs text-zinc-500">Select a memory to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
