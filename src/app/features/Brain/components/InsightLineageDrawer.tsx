'use client';

import { useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fullDrawer, fullDrawerTransition } from '../lib/motionPresets';
import { transition } from '@/lib/motion';
import {
  ArrowLeft,
  X,
  Loader2,
  GitBranch,
  Lightbulb,
  AlertTriangle,
  TrendingUp,
  Star,
  Zap,
  AlertOctagon,
  ExternalLink,
  Radio,
  RotateCcw,
  ArrowRight,
} from 'lucide-react';
import { useInsightLineage } from '../lib/queries';
import type { LineageNode, LineageEdge, LineageInfluence } from '../lib/queries';
import { formatRelativeTime } from '@/lib/formatDate';

interface InsightLineageDrawerProps {
  insightId: string | null;
  insightTitle?: string;
  onClose: () => void;
}

const TYPE_CONFIG: Record<string, { icon: typeof Star; label: string; color: string }> = {
  preference_learned: { icon: Star, label: 'Preference', color: 'text-cyan-400' },
  pattern_detected: { icon: TrendingUp, label: 'Pattern', color: 'text-purple-400' },
  warning: { icon: AlertTriangle, label: 'Warning', color: 'text-amber-400' },
  recommendation: { icon: Lightbulb, label: 'Recommend', color: 'text-green-400' },
  best_practice: { icon: Zap, label: 'Practice', color: 'text-emerald-400' },
};

const EDGE_COLORS: Record<string, string> = {
  evolved_into: 'border-purple-500/60',
  conflicts_with: 'border-red-500/60',
  duplicates: 'border-zinc-500/60',
  refines: 'border-blue-500/60',
  contradicts: 'border-orange-500/60',
};

const EDGE_LABELS: Record<string, string> = {
  evolved_into: 'evolved into',
  conflicts_with: 'conflicts with',
  duplicates: 'duplicates',
  refines: 'refines',
  contradicts: 'contradicts',
};

function ConfidenceBadge({ confidence, autoPruned }: { confidence: number; autoPruned: boolean }) {
  const color = confidence >= 80 ? 'bg-green-500/15 text-green-400'
    : confidence >= 50 ? 'bg-amber-500/15 text-amber-400'
    : 'bg-zinc-700/40 text-zinc-400';

  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-mono ${color} ${autoPruned ? 'opacity-50' : ''}`}>
      {confidence}%
    </span>
  );
}

function EvidenceSummary({ evidence }: { evidence: Array<{ type: string; id: string }> }) {
  if (evidence.length === 0) return null;

  const counts = { direction: 0, signal: 0, reflection: 0 };
  for (const e of evidence) {
    if (e.type in counts) counts[e.type as keyof typeof counts]++;
  }

  const icons = [
    { type: 'direction', count: counts.direction, Icon: ExternalLink, color: 'text-blue-400' },
    { type: 'signal', count: counts.signal, Icon: Radio, color: 'text-amber-400' },
    { type: 'reflection', count: counts.reflection, Icon: RotateCcw, color: 'text-purple-400' },
  ].filter(i => i.count > 0);

  return (
    <div className="flex items-center gap-2 mt-1">
      {icons.map(({ type, count, Icon, color }) => (
        <span key={type} className={`flex items-center gap-0.5 text-2xs ${color}`}>
          <Icon className="w-2.5 h-2.5" />
          {count}
        </span>
      ))}
    </div>
  );
}

function InfluenceSummary({ influences }: { influences: LineageInfluence[] }) {
  if (influences.length === 0) return null;

  const accepted = influences.filter(i => i.decision === 'accepted').length;
  const rejected = influences.length - accepted;
  const rate = influences.length > 0 ? Math.round((accepted / influences.length) * 100) : 0;

  return (
    <div className="flex items-center gap-1.5 mt-1 text-2xs">
      <span className="text-zinc-500">Influenced:</span>
      <span className="text-green-400">{accepted} accepted</span>
      {rejected > 0 && <span className="text-red-400">{rejected} rejected</span>}
      <span className="text-zinc-600">({rate}%)</span>
    </div>
  );
}

function LineageNodeCard({
  node,
  isFocus,
  influences,
  edgeLabel,
}: {
  node: LineageNode;
  isFocus: boolean;
  influences: LineageInfluence[];
  edgeLabel?: string;
}) {
  const config = TYPE_CONFIG[node.type] || TYPE_CONFIG.recommendation;
  const Icon = config.icon;

  return (
    <div className="relative">
      {edgeLabel && (
        <div className="flex items-center gap-1.5 py-1 pl-4">
          <ArrowRight className="w-3 h-3 text-zinc-600 rotate-90" />
          <span className="text-2xs text-zinc-500 italic">{edgeLabel}</span>
        </div>
      )}
      <div
        className={`relative rounded-lg border px-3 py-2.5 transition-colors ${
          isFocus
            ? 'border-purple-500/50 bg-purple-500/5 ring-1 ring-purple-500/20'
            : node.auto_pruned
            ? 'border-zinc-800/50 bg-zinc-900/30 opacity-60'
            : 'border-zinc-800/50 bg-zinc-800/20'
        }`}
      >
        {node.conflict_with_id && (
          <div className="absolute -left-px top-0 bottom-0 w-0.5 bg-red-500/50 rounded-l" />
        )}

        <div className="flex items-start gap-2">
          <span className={`mt-0.5 ${config.color}`}>
            <Icon className="w-3.5 h-3.5" />
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm text-zinc-200 truncate flex-1" title={node.title}>
                {node.title}
              </p>
              <ConfidenceBadge confidence={node.confidence} autoPruned={node.auto_pruned} />
            </div>

            <div className="flex items-center gap-2 mt-0.5 text-2xs text-zinc-500">
              <span className={config.color}>{config.label}</span>
              <span>·</span>
              <span>{formatRelativeTime(node.created_at)}</span>
              {isFocus && (
                <>
                  <span>·</span>
                  <span className="text-purple-400 font-medium">Current</span>
                </>
              )}
            </div>

            {node.conflict_with_id && node.conflict_with_title && (
              <div className="flex items-center gap-1 mt-1 text-2xs text-red-400/70">
                <AlertOctagon className="w-2.5 h-2.5" />
                <span className="truncate">Conflicts: {node.conflict_with_title}</span>
              </div>
            )}

            <EvidenceSummary evidence={node.evidence} />
            <InfluenceSummary influences={influences} />
          </div>
        </div>
      </div>
    </div>
  );
}

function buildOrderedChain(
  nodes: LineageNode[],
  edges: LineageEdge[],
  focusId: string,
): Array<{ node: LineageNode; edgeLabel?: string }> {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  // Build parent→children map from evolves_from_id
  const childrenOf = new Map<string, string[]>();
  const hasParent = new Set<string>();

  for (const node of nodes) {
    if (node.evolves_from_id && nodeMap.has(node.evolves_from_id)) {
      hasParent.add(node.id);
      const existing = childrenOf.get(node.evolves_from_id) || [];
      existing.push(node.id);
      childrenOf.set(node.evolves_from_id, existing);
    }
  }

  // Find roots (nodes with no parent in the set)
  const roots = nodes.filter(n => !hasParent.has(n.id));

  // Build edge label map from lineage edges
  const edgeLabelMap = new Map<string, string>();
  for (const edge of edges) {
    edgeLabelMap.set(
      `${edge.parent_id}->${edge.child_id}`,
      EDGE_LABELS[edge.relationship_type] || edge.relationship_type
    );
  }

  // DFS to produce ordered list
  const result: Array<{ node: LineageNode; edgeLabel?: string }> = [];
  const visited = new Set<string>();

  function dfs(id: string, parentId?: string) {
    if (visited.has(id)) return;
    visited.add(id);
    const node = nodeMap.get(id);
    if (!node) return;

    const edgeLabel = parentId ? edgeLabelMap.get(`${parentId}->${id}`) : undefined;
    result.push({ node, edgeLabel });

    const children = childrenOf.get(id) || [];
    // Sort children by created_at
    children.sort((a, b) => {
      const na = nodeMap.get(a);
      const nb = nodeMap.get(b);
      if (!na || !nb) return 0;
      return na.created_at.localeCompare(nb.created_at);
    });
    for (const childId of children) {
      dfs(childId, id);
    }
  }

  // Start DFS from roots, sorted by date
  roots.sort((a, b) => a.created_at.localeCompare(b.created_at));
  for (const root of roots) {
    dfs(root.id);
  }

  // Add any conflict-linked nodes not yet visited
  for (const node of nodes) {
    if (!visited.has(node.id)) {
      const conflictEdge = edges.find(
        e => (e.parent_id === node.id || e.child_id === node.id) && e.relationship_type === 'conflicts_with'
      );
      result.push({
        node,
        edgeLabel: conflictEdge ? 'conflicts with' : undefined,
      });
    }
  }

  return result;
}

export default function InsightLineageDrawer({ insightId, insightTitle, onClose }: InsightLineageDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const backButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<Element | null>(null);

  const { data, isLoading } = useInsightLineage(insightId);

  useEffect(() => {
    if (insightId) {
      triggerRef.current = document.activeElement;
    }
  }, [insightId]);

  useEffect(() => {
    if (insightId && backButtonRef.current) {
      backButtonRef.current.focus();
    }
  }, [insightId]);

  const handleClose = useCallback(() => {
    onClose();
    requestAnimationFrame(() => {
      if (triggerRef.current instanceof HTMLElement) {
        triggerRef.current.focus();
      }
    });
  }, [onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      handleClose();
      return;
    }
    if (e.key === 'Tab' && drawerRef.current) {
      const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, [handleClose]);

  const orderedChain = useMemo(() => {
    if (!data) return [];
    return buildOrderedChain(data.nodes, data.edges, data.focusId);
  }, [data]);

  const influenceByInsight = useMemo(() => {
    if (!data) return new Map<string, LineageInfluence[]>();
    const map = new Map<string, LineageInfluence[]>();
    for (const inf of data.influences) {
      const list = map.get(inf.insight_id) || [];
      list.push(inf);
      map.set(inf.insight_id, list);
    }
    return map;
  }, [data]);

  return (
    <AnimatePresence>
      {insightId && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transition.normal}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            onClick={handleClose}
          />

          <motion.div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Insight lineage explorer"
            onKeyDown={handleKeyDown}
            variants={fullDrawer}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={fullDrawerTransition}
            className="fixed top-0 right-0 h-full w-full max-w-lg z-50 bg-zinc-900 border-l border-zinc-800 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-4 border-b border-zinc-800/50">
              <button
                ref={backButtonRef}
                onClick={handleClose}
                aria-label="Go back"
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors focus-visible:ring-2 focus-visible:ring-purple-500/50 outline-none"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-purple-400 flex-shrink-0" />
                  <h3 className="text-sm font-medium text-zinc-200 truncate">
                    Insight Lineage
                  </h3>
                </div>
                <p className="text-xs text-zinc-500 truncate mt-0.5" title={insightTitle}>
                  {insightTitle || insightId}
                </p>
              </div>
              <button
                onClick={handleClose}
                aria-label="Close drawer"
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors focus-visible:ring-2 focus-visible:ring-purple-500/50 outline-none"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {isLoading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-zinc-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Loading lineage...</span>
                </div>
              ) : !data || data.nodes.length === 0 ? (
                <div className="text-center py-12">
                  <GitBranch className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                  <p className="text-sm text-zinc-500">No lineage data available</p>
                  <p className="text-xs text-zinc-600 mt-1">This insight has no evolution chain or evidence links</p>
                </div>
              ) : (
                <div className="space-y-0">
                  {/* Summary stats */}
                  <div className="flex items-center gap-3 mb-4 pb-3 border-b border-zinc-800/30">
                    <div className="text-center">
                      <div className="text-lg font-mono text-zinc-200">{data.nodes.length}</div>
                      <div className="text-2xs text-zinc-500">Insights</div>
                    </div>
                    <div className="w-px h-8 bg-zinc-800" />
                    <div className="text-center">
                      <div className="text-lg font-mono text-zinc-200">{data.edges.length}</div>
                      <div className="text-2xs text-zinc-500">Connections</div>
                    </div>
                    <div className="w-px h-8 bg-zinc-800" />
                    <div className="text-center">
                      <div className="text-lg font-mono text-zinc-200">
                        {data.nodes.reduce((sum, n) => sum + n.evidence.length, 0)}
                      </div>
                      <div className="text-2xs text-zinc-500">Evidence</div>
                    </div>
                    <div className="w-px h-8 bg-zinc-800" />
                    <div className="text-center">
                      <div className="text-lg font-mono text-zinc-200">{data.influences.length}</div>
                      <div className="text-2xs text-zinc-500">Influences</div>
                    </div>
                  </div>

                  {/* DAG as vertical chain */}
                  <div className="relative">
                    {/* Vertical connector line */}
                    {orderedChain.length > 1 && (
                      <div className="absolute left-5 top-6 bottom-6 w-px bg-zinc-800/60" />
                    )}

                    <div className="space-y-1">
                      {orderedChain.map(({ node, edgeLabel }, idx) => (
                        <motion.div
                          key={node.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.15, delay: idx * 0.03 }}
                        >
                          <LineageNodeCard
                            node={node}
                            isFocus={node.id === data.focusId}
                            influences={influenceByInsight.get(node.id) || []}
                            edgeLabel={edgeLabel}
                          />
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
