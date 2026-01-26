'use client';

/**
 * Memory Browser Component
 * Allows browsing and searching Annette's persistent memories
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { AnnetteMemoryType } from '@/app/db/models/annette.types';

interface Memory {
  id: string;
  projectId: string;
  sessionId: string | null;
  memoryType: AnnetteMemoryType;
  content: string;
  summary: string | null;
  importanceScore: number;
  decayFactor: number;
  accessCount: number;
  lastAccessedAt: string | null;
  createdAt: string;
  metadata: Record<string, unknown> | null;
}

interface MemoryBrowserProps {
  projectId: string;
  onMemorySelect?: (memory: Memory) => void;
  className?: string;
}

const MEMORY_TYPE_LABELS: Record<AnnetteMemoryType, string> = {
  conversation: 'Conversation',
  decision: 'Decision',
  fact: 'Fact',
  preference: 'Preference',
  event: 'Event',
  insight: 'Insight',
};

const MEMORY_TYPE_COLORS: Record<AnnetteMemoryType, string> = {
  conversation: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  decision: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  fact: 'bg-green-500/20 text-green-400 border-green-500/30',
  preference: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  event: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  insight: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
};

export function MemoryBrowser({ projectId, onMemorySelect, className }: MemoryBrowserProps) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<AnnetteMemoryType | 'all'>('all');
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [stats, setStats] = useState<{
    totalMemories: number;
    byType: Record<string, number>;
    tokenSavings: number;
  } | null>(null);

  const fetchMemories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ projectId });
      if (searchQuery) params.set('query', searchQuery);
      if (selectedType !== 'all') params.set('type', selectedType);

      const response = await fetch(`/api/annette/memory?${params}`);
      if (!response.ok) throw new Error('Failed to fetch memories');

      const data = await response.json();
      setMemories(data.memories || []);
      setStats(data.stats || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [projectId, searchQuery, selectedType]);

  useEffect(() => {
    fetchMemories();
  }, [fetchMemories]);

  const handleMemoryClick = (memory: Memory) => {
    setSelectedMemory(memory);
    onMemorySelect?.(memory);
  };

  const handleDeleteMemory = async (memoryId: string) => {
    try {
      const response = await fetch(`/api/annette/memory?id=${memoryId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete memory');
      setMemories(prev => prev.filter(m => m.id !== memoryId));
      if (selectedMemory?.id === memoryId) setSelectedMemory(null);
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRelevanceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-400';
    if (score >= 0.5) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div>
          <h2 className="text-lg font-semibold text-white">Memory Browser</h2>
          {stats && (
            <p className="text-sm text-white/60">
              {stats.totalMemories} memories | {stats.tokenSavings} tokens saved
            </p>
          )}
        </div>
        <button
          onClick={fetchMemories}
          className="px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="p-4 space-y-3 border-b border-white/10">
        <input
          type="text"
          placeholder="Search memories..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/30"
        />
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedType('all')}
            className={cn(
              'px-3 py-1 text-xs rounded-full border transition-colors',
              selectedType === 'all'
                ? 'bg-white/20 border-white/30 text-white'
                : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
            )}
          >
            All
          </button>
          {(Object.keys(MEMORY_TYPE_LABELS) as AnnetteMemoryType[]).map(type => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={cn(
                'px-3 py-1 text-xs rounded-full border transition-colors',
                selectedType === type
                  ? MEMORY_TYPE_COLORS[type]
                  : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
              )}
            >
              {MEMORY_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Memory List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin w-6 h-6 border-2 border-white/20 border-t-white rounded-full" />
            </div>
          ) : error ? (
            <div className="text-center text-red-400 py-8">{error}</div>
          ) : memories.length === 0 ? (
            <div className="text-center text-white/40 py-8">No memories found</div>
          ) : (
            <AnimatePresence mode="popLayout">
              {memories.map(memory => (
                <motion.div
                  key={memory.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => handleMemoryClick(memory)}
                  className={cn(
                    'p-3 rounded-lg border cursor-pointer transition-colors',
                    selectedMemory?.id === memory.id
                      ? 'bg-white/10 border-white/30'
                      : 'bg-white/5 border-white/10 hover:bg-white/[0.08]'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={cn(
                        'px-2 py-0.5 text-xs rounded border',
                        MEMORY_TYPE_COLORS[memory.memoryType]
                      )}
                    >
                      {MEMORY_TYPE_LABELS[memory.memoryType]}
                    </span>
                    <span className="text-xs text-white/40">
                      {formatDate(memory.createdAt)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-white/80 line-clamp-2">
                    {memory.summary || memory.content}
                  </p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-white/40">
                    <span className={getRelevanceColor(memory.importanceScore * memory.decayFactor)}>
                      {(memory.importanceScore * memory.decayFactor * 100).toFixed(0)}% relevance
                    </span>
                    <span>{memory.accessCount} accesses</span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Detail Panel */}
        <AnimatePresence>
          {selectedMemory && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 300, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-l border-white/10 overflow-hidden"
            >
              <div className="w-[300px] p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      'px-2 py-0.5 text-xs rounded border',
                      MEMORY_TYPE_COLORS[selectedMemory.memoryType]
                    )}
                  >
                    {MEMORY_TYPE_LABELS[selectedMemory.memoryType]}
                  </span>
                  <button
                    onClick={() => setSelectedMemory(null)}
                    className="text-white/40 hover:text-white"
                  >
                    &times;
                  </button>
                </div>

                <div>
                  <h4 className="text-xs font-medium text-white/40 uppercase mb-1">Content</h4>
                  <p className="text-sm text-white/80">{selectedMemory.content}</p>
                </div>

                {selectedMemory.summary && (
                  <div>
                    <h4 className="text-xs font-medium text-white/40 uppercase mb-1">Summary</h4>
                    <p className="text-sm text-white/60">{selectedMemory.summary}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <h4 className="text-xs font-medium text-white/40 uppercase mb-1">Importance</h4>
                    <p className="text-sm text-white/80">
                      {(selectedMemory.importanceScore * 100).toFixed(0)}%
                    </p>
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-white/40 uppercase mb-1">Decay</h4>
                    <p className="text-sm text-white/80">
                      {(selectedMemory.decayFactor * 100).toFixed(0)}%
                    </p>
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-white/40 uppercase mb-1">Accesses</h4>
                    <p className="text-sm text-white/80">{selectedMemory.accessCount}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-white/40 uppercase mb-1">Created</h4>
                    <p className="text-sm text-white/80">{formatDate(selectedMemory.createdAt)}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteMemory(selectedMemory.id)}
                  className="w-full px-3 py-2 text-sm bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors"
                >
                  Delete Memory
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
