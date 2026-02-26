'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  ChevronUp,
  ChevronDown,
  X,
  Database,
  Network,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { useAnnetteStore } from '@/stores/annetteStore';

interface MemoryItem {
  id: string;
  type: string;
  content: string;
  importance: number;
}

interface KnowledgeItem {
  id: string;
  type: string;
  name: string;
  importance: number;
}

interface ContextSummary {
  memories: {
    total: number;
    byType: Record<string, number>;
    topItems: MemoryItem[];
  };
  knowledge: {
    totalNodes: number;
    totalEdges: number;
    nodesByType: Record<string, number>;
    topNodes: KnowledgeItem[];
  };
}

const MEMORY_TYPE_LABELS: Record<string, string> = {
  conversation: 'Conv',
  decision: 'Decision',
  fact: 'Fact',
  preference: 'Pref',
  event: 'Event',
  insight: 'Insight',
};

const NODE_TYPE_LABELS: Record<string, string> = {
  entity: 'Entity',
  concept: 'Concept',
  file: 'File',
  function: 'Function',
  component: 'Component',
  api: 'API',
  decision: 'Decision',
  person: 'Person',
  technology: 'Tech',
};

function ImportanceDot({ score }: { score: number }) {
  const color = score >= 0.8
    ? 'bg-green-400'
    : score >= 0.5
    ? 'bg-amber-400'
    : 'bg-slate-500';
  return <div className={`w-1.5 h-1.5 rounded-full ${color} shrink-0`} title={`Importance: ${(score * 100).toFixed(0)}%`} />;
}

interface ContextIndicatorBarProps {
  projectId: string | null;
  onDismissMemory?: (id: string) => void;
  onDismissNode?: (id: string) => void;
}

export default function ContextIndicatorBar({
  projectId,
  onDismissMemory,
  onDismissNode,
}: ContextIndicatorBarProps) {
  const [expanded, setExpanded] = useState(false);
  const [summary, setSummary] = useState<ContextSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dismissedMemories, setDismissedMemories] = useState<Set<string>>(new Set());
  const [dismissedNodes, setDismissedNodes] = useState<Set<string>>(new Set());

  const sessionId = useAnnetteStore((s) => s.sessionId);

  const fetchContext = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/annette/context-summary?projectId=${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch {
      // Silent fail — indicator is non-critical
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  // Fetch on mount and when session changes
  useEffect(() => {
    fetchContext();
  }, [fetchContext, sessionId]);

  const handleDismissMemory = (id: string) => {
    setDismissedMemories(prev => new Set(prev).add(id));
    onDismissMemory?.(id);
  };

  const handleDismissNode = (id: string) => {
    setDismissedNodes(prev => new Set(prev).add(id));
    onDismissNode?.(id);
  };

  // Don't render if no project
  if (!projectId) return null;

  const memoryCount = summary?.memories.total ?? 0;
  const nodeCount = summary?.knowledge.totalNodes ?? 0;
  const hasContext = memoryCount > 0 || nodeCount > 0;

  // Filter out dismissed items
  const visibleMemories = summary?.memories.topItems.filter(m => !dismissedMemories.has(m.id)) ?? [];
  const visibleNodes = summary?.knowledge.topNodes.filter(n => !dismissedNodes.has(n.id)) ?? [];

  return (
    <div className="mx-4 mb-1" data-testid="context-indicator-bar">
      {/* Collapsed pill bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-left transition-colors ${
          expanded
            ? 'bg-slate-800/60 border border-cyan-500/20'
            : 'bg-slate-800/30 border border-slate-700/20 hover:border-slate-600/30'
        }`}
        aria-expanded={expanded}
        aria-label="Toggle context details"
        data-testid="context-indicator-toggle"
      >
        <Brain className="w-3.5 h-3.5 text-cyan-400/70 shrink-0" />

        {/* Pills */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0 overflow-hidden">
          {isLoading && !summary && (
            <span className="text-[11px] text-slate-500">Loading context...</span>
          )}

          {!isLoading && !hasContext && (
            <span className="text-[11px] text-slate-500">No context loaded</span>
          )}

          {hasContext && (
            <>
              {memoryCount > 0 && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 text-[10px] font-medium shrink-0">
                  <Database className="w-2.5 h-2.5" />
                  {memoryCount} {memoryCount === 1 ? 'memory' : 'memories'}
                </span>
              )}
              {nodeCount > 0 && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 text-[10px] font-medium shrink-0">
                  <Network className="w-2.5 h-2.5" />
                  {nodeCount} {nodeCount === 1 ? 'node' : 'nodes'}
                </span>
              )}
              {dismissedMemories.size + dismissedNodes.size > 0 && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] font-medium shrink-0">
                  <X className="w-2.5 h-2.5" />
                  {dismissedMemories.size + dismissedNodes.size} hidden
                </span>
              )}
            </>
          )}
        </div>

        {/* Refresh + Chevron */}
        <div className="flex items-center gap-1 shrink-0">
          {hasContext && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); fetchContext(); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); fetchContext(); } }}
              className="p-0.5 rounded hover:bg-slate-700/40 transition-colors"
              aria-label="Refresh context"
            >
              <RefreshCw className={`w-3 h-3 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
            </span>
          )}
          {expanded ? (
            <ChevronUp className="w-3 h-3 text-slate-500" />
          ) : (
            <ChevronDown className="w-3 h-3 text-slate-500" />
          )}
        </div>
      </button>

      {/* Expanded detail view */}
      <AnimatePresence>
        {expanded && summary && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="mt-1 p-3 bg-slate-800/50 border border-slate-700/30 rounded-lg space-y-3 max-h-56 overflow-y-auto"
              data-testid="context-indicator-details"
            >
              {/* Memories section */}
              {visibleMemories.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Database className="w-3 h-3 text-purple-400" />
                    <span className="text-[11px] font-medium text-purple-300">
                      Active Memories
                    </span>
                    <span className="text-[10px] text-slate-500">
                      ({summary.memories.total} total)
                    </span>
                  </div>
                  <div className="space-y-1">
                    {visibleMemories.map((mem) => (
                      <div
                        key={mem.id}
                        className="group flex items-center gap-2 px-2 py-1 rounded bg-slate-700/20 hover:bg-slate-700/40 transition-colors"
                        data-testid={`context-memory-${mem.id}`}
                      >
                        <ImportanceDot score={mem.importance} />
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider w-12 shrink-0">
                          {MEMORY_TYPE_LABELS[mem.type] || mem.type}
                        </span>
                        <span className="text-[11px] text-slate-300 truncate flex-1 min-w-0">
                          {mem.content}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDismissMemory(mem.id); }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-500/20 transition-all"
                          aria-label={`Remove memory: ${mem.content.slice(0, 30)}`}
                          title="Remove from context"
                        >
                          <X className="w-3 h-3 text-slate-500 hover:text-red-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Knowledge nodes section */}
              {visibleNodes.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Network className="w-3 h-3 text-cyan-400" />
                    <span className="text-[11px] font-medium text-cyan-300">
                      Knowledge Graph
                    </span>
                    <span className="text-[10px] text-slate-500">
                      ({summary.knowledge.totalNodes} nodes, {summary.knowledge.totalEdges} edges)
                    </span>
                  </div>
                  <div className="space-y-1">
                    {visibleNodes.map((node) => (
                      <div
                        key={node.id}
                        className="group flex items-center gap-2 px-2 py-1 rounded bg-slate-700/20 hover:bg-slate-700/40 transition-colors"
                        data-testid={`context-node-${node.id}`}
                      >
                        <ImportanceDot score={node.importance} />
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider w-12 shrink-0">
                          {NODE_TYPE_LABELS[node.type] || node.type}
                        </span>
                        <span className="text-[11px] text-slate-300 truncate flex-1 min-w-0">
                          {node.name}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDismissNode(node.id); }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-500/20 transition-all"
                          aria-label={`Remove node: ${node.name}`}
                          title="Remove from context"
                        >
                          <X className="w-3 h-3 text-slate-500 hover:text-red-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {visibleMemories.length === 0 && visibleNodes.length === 0 && (
                <div className="flex flex-col items-center py-3 text-center">
                  <Sparkles className="w-5 h-5 text-slate-600 mb-1.5" />
                  <p className="text-[11px] text-slate-500">
                    {dismissedMemories.size + dismissedNodes.size > 0
                      ? 'All context items hidden. Annette will use fresh context.'
                      : 'No memories or knowledge yet. Start chatting to build context.'}
                  </p>
                  {dismissedMemories.size + dismissedNodes.size > 0 && (
                    <button
                      onClick={() => { setDismissedMemories(new Set()); setDismissedNodes(new Set()); }}
                      className="mt-1.5 text-[10px] text-cyan-400 hover:text-cyan-300"
                    >
                      Restore all hidden items
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
