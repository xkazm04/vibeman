/**
 * Decision Topology Map
 *
 * Interactive node-graph visualization of the decision landscape.
 * Renders question trees as connected nodes where:
 * - Branches show answered paths with depth-based coloring
 * - Gap scores color-code ambiguity hotspots (green → amber → red)
 * - Directions appear as forking paths from their source questions
 * - Accepted directions glow with status indicators
 * - Strategic briefs become hoverable region overlays
 *
 * Built on @xyflow/react for pan, zoom, and interactive graph navigation.
 */

'use client';

import React, { useMemo, useCallback, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeTypes,
  type NodeProps,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HelpCircle, Compass, Check, Clock, Sparkles, Target,
  FileText, AlertTriangle, X,
} from 'lucide-react';
import { DbQuestion, DbDirection } from '@/app/db';
import type { QuestionTreeNode } from '@/lib/questions/questionTreeService';
import EmptyState from '@/components/ui/EmptyState';

// ─── Types ───────────────────────────────────────────────────────────────────

interface DecisionTopologyMapProps {
  trees: QuestionTreeNode[];
  directions: DbDirection[];
  onAnswerQuestion: (question: DbQuestion) => void;
  onAcceptDirection: (directionId: string) => void;
  onRejectDirection: (directionId: string) => void;
}

type QuestionNodeData = {
  label: string;
  question: QuestionTreeNode;
  depth: number;
  isAnswered: boolean;
  gapScore: number | null;
  hasBrief: boolean;
  childCount: number;
};

type DirectionNodeData = {
  label: string;
  direction: DbDirection;
  isPaired: boolean;
  pairLabel: string | null;
};

type BriefNodeData = {
  label: string;
  brief: string;
  questionText: string;
};

type TopologyNode = Node<QuestionNodeData, 'question'>
  | Node<DirectionNodeData, 'direction'>
  | Node<BriefNodeData, 'brief'>;

// ─── Layout Constants ────────────────────────────────────────────────────────

const NODE_WIDTH = 260;
const NODE_HEIGHT_Q = 80;
const NODE_HEIGHT_D = 70;
const H_SPACING = 320;
const V_SPACING = 120;

// ─── Color Helpers ───────────────────────────────────────────────────────────

function getGapColor(score: number | null): string {
  if (score == null || score === 0) return '#6b7280'; // gray-500
  if (score < 0.3) return '#22c55e'; // green-500
  if (score < 0.5) return '#eab308'; // yellow-500
  if (score < 0.7) return '#f59e0b'; // amber-500
  return '#ef4444'; // red-500
}

function getGapGlow(score: number | null): string {
  if (score == null || score < 0.3) return 'none';
  if (score < 0.5) return '0 0 8px rgba(234,179,8,0.3)';
  if (score < 0.7) return '0 0 12px rgba(245,158,11,0.4)';
  return '0 0 16px rgba(239,68,68,0.5)';
}

function getDepthHue(depth: number): number {
  return Math.max(180, 270 - depth * 30);
}

function getStatusColor(status: DbDirection['status']): string {
  switch (status) {
    case 'accepted': return '#10b981'; // emerald-500
    case 'rejected': return '#ef4444'; // red-500
    case 'processing': return '#3b82f6'; // blue-500
    default: return '#6b7280'; // gray-500
  }
}

function getStatusGlow(status: DbDirection['status']): string {
  switch (status) {
    case 'accepted': return '0 0 16px rgba(16,185,129,0.4)';
    case 'rejected': return '0 0 8px rgba(239,68,68,0.2)';
    default: return 'none';
  }
}

// ─── Custom Nodes ────────────────────────────────────────────────────────────

function QuestionNode({ data }: NodeProps<Node<QuestionNodeData>>) {
  const { question, depth, isAnswered, gapScore, hasBrief, childCount } = data;
  const hue = getDepthHue(depth);
  const borderColor = `hsla(${hue}, 70%, 60%, 0.5)`;
  const bgColor = `hsla(${hue}, 70%, 60%, 0.08)`;

  return (
    <div
      className="rounded-xl border px-3 py-2.5 backdrop-blur-sm cursor-pointer"
      style={{
        borderColor: gapScore && gapScore >= 0.3 ? getGapColor(gapScore) : borderColor,
        backgroundColor: bgColor,
        boxShadow: getGapGlow(gapScore),
        width: NODE_WIDTH,
        minHeight: NODE_HEIGHT_Q,
      }}
    >
      <Handle type="target" position={Position.Top} className="!bg-gray-500 !w-2 !h-2 !border-0" />

      {/* Header row */}
      <div className="flex items-start gap-1.5">
        <HelpCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: `hsl(${hue}, 70%, 70%)` }} />
        <span className="text-2xs font-mono flex-shrink-0 mt-0.5" style={{ color: `hsl(${hue}, 70%, 70%)`, opacity: 0.6 }}>
          L{depth}
        </span>
        <p className="text-xs text-gray-200 leading-snug line-clamp-2 flex-1">
          {question.question}
        </p>
      </div>

      {/* Status badges */}
      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
        {isAnswered ? (
          <span className="text-2xs text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded flex items-center gap-0.5">
            <Check className="w-2.5 h-2.5" /> Answered
          </span>
        ) : (
          <span className="text-2xs text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded flex items-center gap-0.5">
            <Clock className="w-2.5 h-2.5" /> Pending
          </span>
        )}
        {gapScore != null && gapScore > 0 && (
          <span className={`text-2xs px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
            gapScore >= 0.7 ? 'text-red-400 bg-red-500/10'
            : gapScore >= 0.4 ? 'text-amber-400 bg-amber-500/10'
            : 'text-gray-400 bg-gray-500/10'
          }`}>
            <Sparkles className="w-2.5 h-2.5" />
            {Math.round(gapScore * 100)}%
          </span>
        )}
        {question.auto_deepened === 1 && (
          <span className="text-2xs text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded flex items-center gap-0.5">
            <Target className="w-2.5 h-2.5" />
          </span>
        )}
        {hasBrief && (
          <span className="text-2xs text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded flex items-center gap-0.5">
            <FileText className="w-2.5 h-2.5" />
          </span>
        )}
        {childCount > 0 && (
          <span className="text-2xs text-gray-500 ml-auto">
            {childCount} child{childCount !== 1 ? 'ren' : ''}
          </span>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-gray-500 !w-2 !h-2 !border-0" />
    </div>
  );
}

function DirectionNode({ data }: NodeProps<Node<DirectionNodeData>>) {
  const { direction, isPaired, pairLabel } = data;
  const statusColor = getStatusColor(direction.status);

  return (
    <div
      className="rounded-lg border px-3 py-2 backdrop-blur-sm"
      style={{
        borderColor: statusColor,
        backgroundColor: `${statusColor}10`,
        boxShadow: getStatusGlow(direction.status),
        width: NODE_WIDTH,
        minHeight: NODE_HEIGHT_D,
      }}
    >
      <Handle type="target" position={Position.Top} className="!bg-gray-500 !w-2 !h-2 !border-0" />

      <div className="flex items-start gap-1.5">
        <Compass className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: statusColor }} />
        {isPaired && pairLabel && (
          <span className="text-2xs font-bold flex-shrink-0 mt-0.5 px-1 rounded" style={{ color: statusColor, backgroundColor: `${statusColor}20` }}>
            {pairLabel}
          </span>
        )}
        <p className="text-xs text-gray-300 leading-snug line-clamp-2 flex-1">
          {direction.summary}
        </p>
      </div>

      <div className="flex items-center gap-1.5 mt-1.5">
        <span className="text-2xs px-1.5 py-0.5 rounded capitalize" style={{ color: statusColor, backgroundColor: `${statusColor}15` }}>
          {direction.status}
        </span>
        {direction.effort != null && direction.impact != null && (
          <span className="text-2xs text-gray-500">
            E:{direction.effort} I:{direction.impact}
          </span>
        )}
        {isPaired && direction.pair_id && (
          <span className="text-2xs text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">
            Pair
          </span>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-gray-500 !w-2 !h-2 !border-0" />
    </div>
  );
}

function BriefNode({ data }: NodeProps<Node<BriefNodeData>>) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 backdrop-blur-sm cursor-pointer"
      style={{ width: NODE_WIDTH, minHeight: 50 }}
      onClick={() => setExpanded(!expanded)}
    >
      <Handle type="target" position={Position.Top} className="!bg-amber-500 !w-2 !h-2 !border-0" />

      <div className="flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
        <span className="text-xs font-medium text-amber-300">Strategic Brief</span>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-1.5 overflow-hidden"
          >
            <p className="text-2xs text-gray-400 leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto">
              {data.brief}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const nodeTypes: NodeTypes = {
  question: QuestionNode,
  direction: DirectionNode,
  brief: BriefNode,
};

// ─── Graph Builder ───────────────────────────────────────────────────────────

interface LayoutResult {
  nodes: TopologyNode[];
  edges: Edge[];
}

function buildTopologyGraph(
  trees: QuestionTreeNode[],
  directions: DbDirection[],
): LayoutResult {
  const nodes: TopologyNode[] = [];
  const edges: Edge[] = [];

  // Index directions by context_map_id for linking
  const directionsByContext = new Map<string, DbDirection[]>();
  for (const d of directions) {
    const key = d.context_map_id;
    if (!directionsByContext.has(key)) directionsByContext.set(key, []);
    directionsByContext.get(key)!.push(d);
  }

  // Track which directions are attached to specific questions
  const attachedDirectionIds = new Set<string>();

  // Track positions for each tree to avoid overlap
  let treeOffsetX = 0;

  for (const root of trees) {
    const treeResult = layoutTree(root, treeOffsetX, 0, directionsByContext, attachedDirectionIds);
    nodes.push(...treeResult.nodes);
    edges.push(...treeResult.edges);
    treeOffsetX = treeResult.maxX + H_SPACING;
  }

  // Add unattached directions (those not linked to a specific question tree)
  const unattached = directions.filter(d => !attachedDirectionIds.has(d.id));
  if (unattached.length > 0) {
    // Group unattached by pair_id
    const pairGroups = new Map<string, DbDirection[]>();
    const singles: DbDirection[] = [];

    for (const d of unattached) {
      if (d.pair_id) {
        if (!pairGroups.has(d.pair_id)) pairGroups.set(d.pair_id, []);
        pairGroups.get(d.pair_id)!.push(d);
      } else {
        singles.push(d);
      }
    }

    let dirX = treeOffsetX;
    const dirY = 0;

    // Place single directions
    for (const d of singles) {
      nodes.push({
        id: `dir-${d.id}`,
        type: 'direction',
        position: { x: dirX, y: dirY },
        data: {
          label: d.summary,
          direction: d,
          isPaired: false,
          pairLabel: null,
        },
      } as TopologyNode);
      dirX += H_SPACING;
    }

    // Place paired directions side by side
    for (const [, pair] of pairGroups) {
      const sortedPair = pair.sort((a, b) => (a.pair_label ?? '').localeCompare(b.pair_label ?? ''));
      for (let i = 0; i < sortedPair.length; i++) {
        const d = sortedPair[i];
        nodes.push({
          id: `dir-${d.id}`,
          type: 'direction',
          position: { x: dirX + i * (NODE_WIDTH + 40), y: dirY },
          data: {
            label: d.summary,
            direction: d,
            isPaired: true,
            pairLabel: d.pair_label,
          },
        } as TopologyNode);
      }

      // Link paired directions
      if (sortedPair.length === 2) {
        edges.push({
          id: `pair-${sortedPair[0].id}-${sortedPair[1].id}`,
          source: `dir-${sortedPair[0].id}`,
          target: `dir-${sortedPair[1].id}`,
          type: 'default',
          style: { stroke: '#a855f7', strokeWidth: 1.5, strokeDasharray: '6 3' },
          animated: true,
          label: 'A / B',
          labelStyle: { fill: '#a855f7', fontSize: 10 },
        });
      }

      dirX += H_SPACING * 2;
    }
  }

  return { nodes, edges };
}

interface TreeLayoutResult {
  nodes: TopologyNode[];
  edges: Edge[];
  maxX: number;
}

function layoutTree(
  node: QuestionTreeNode,
  x: number,
  y: number,
  directionsByContext: Map<string, DbDirection[]>,
  attachedDirectionIds: Set<string>,
): TreeLayoutResult {
  const nodes: TopologyNode[] = [];
  const edges: Edge[] = [];
  const isAnswered = node.status === 'answered' && !!node.answer;
  const depth = node.tree_depth ?? 0;

  // Add the question node
  const qNodeId = `q-${node.id}`;
  nodes.push({
    id: qNodeId,
    type: 'question',
    position: { x, y },
    data: {
      label: node.question,
      question: node,
      depth,
      isAnswered,
      gapScore: node.gap_score,
      hasBrief: !!node.strategic_brief,
      childCount: node.children.length,
    },
  } as TopologyNode);

  let currentMaxX = x + NODE_WIDTH;
  let nextY = y + V_SPACING;

  // Add strategic brief as a side node
  if (node.strategic_brief) {
    const briefId = `brief-${node.id}`;
    nodes.push({
      id: briefId,
      type: 'brief',
      position: { x: x + NODE_WIDTH + 60, y: y + 10 },
      data: {
        label: 'Strategic Brief',
        brief: node.strategic_brief,
        questionText: node.question,
      },
    } as TopologyNode);
    edges.push({
      id: `e-brief-${node.id}`,
      source: qNodeId,
      target: briefId,
      type: 'default',
      style: { stroke: '#f59e0b', strokeWidth: 1, strokeDasharray: '4 4' },
    });
    currentMaxX = Math.max(currentMaxX, x + NODE_WIDTH + 60 + NODE_WIDTH);
  }

  // Add directions for this context (leaf questions get directions)
  if (isAnswered && node.children.length === 0) {
    const contextDirections = directionsByContext.get(node.context_map_id) ?? [];
    // Only attach directions that haven't been attached yet
    const availableDirections = contextDirections.filter(d => !attachedDirectionIds.has(d.id));

    if (availableDirections.length > 0) {
      // Take up to 3 directions for this leaf
      const toAttach = availableDirections.slice(0, 3);
      const dirStartX = x - ((toAttach.length - 1) * (NODE_WIDTH + 30)) / 2;

      for (let i = 0; i < toAttach.length; i++) {
        const d = toAttach[i];
        attachedDirectionIds.add(d.id);
        const dirId = `dir-${d.id}`;
        const dirX = dirStartX + i * (NODE_WIDTH + 30);

        nodes.push({
          id: dirId,
          type: 'direction',
          position: { x: dirX, y: nextY },
          data: {
            label: d.summary,
            direction: d,
            isPaired: !!d.pair_id,
            pairLabel: d.pair_label,
          },
        } as TopologyNode);

        edges.push({
          id: `e-dir-${node.id}-${d.id}`,
          source: qNodeId,
          target: dirId,
          type: 'default',
          animated: d.status === 'accepted',
          style: {
            stroke: getStatusColor(d.status),
            strokeWidth: d.status === 'accepted' ? 2 : 1.5,
          },
        });

        currentMaxX = Math.max(currentMaxX, dirX + NODE_WIDTH);
      }

      // Link paired directions within this group
      const pairedHere = toAttach.filter(d => d.pair_id);
      const pairMap = new Map<string, DbDirection[]>();
      for (const d of pairedHere) {
        if (d.pair_id) {
          if (!pairMap.has(d.pair_id)) pairMap.set(d.pair_id, []);
          pairMap.get(d.pair_id)!.push(d);
        }
      }
      for (const [, pair] of pairMap) {
        if (pair.length === 2) {
          edges.push({
            id: `pair-${pair[0].id}-${pair[1].id}`,
            source: `dir-${pair[0].id}`,
            target: `dir-${pair[1].id}`,
            type: 'default',
            style: { stroke: '#a855f7', strokeWidth: 1, strokeDasharray: '6 3' },
          });
        }
      }

      nextY += V_SPACING;
    }
  }

  // Layout children
  if (node.children.length > 0) {
    let childX = x;
    for (const child of node.children) {
      const childResult = layoutTree(child, childX, nextY, directionsByContext, attachedDirectionIds);
      nodes.push(...childResult.nodes);
      edges.push(...childResult.edges);

      // Edge from parent to child
      edges.push({
        id: `e-${node.id}-${child.id}`,
        source: qNodeId,
        target: `q-${child.id}`,
        type: 'default',
        animated: child.auto_deepened === 1,
        style: {
          stroke: `hsl(${getDepthHue(depth)}, 60%, 50%)`,
          strokeWidth: 1.5,
        },
      });

      childX = childResult.maxX + H_SPACING * 0.5;
      currentMaxX = Math.max(currentMaxX, childResult.maxX);
    }
  }

  return { nodes, edges, maxX: currentMaxX };
}

// ─── Detail Panel ────────────────────────────────────────────────────────────

interface DetailPanelProps {
  selectedNode: TopologyNode | null;
  onClose: () => void;
  onAnswerQuestion: (question: DbQuestion) => void;
  onAcceptDirection: (id: string) => void;
  onRejectDirection: (id: string) => void;
}

function DetailPanel({ selectedNode, onClose, onAnswerQuestion, onAcceptDirection, onRejectDirection }: DetailPanelProps) {
  if (!selectedNode) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="absolute top-4 right-4 w-80 max-h-[calc(100%-2rem)] overflow-y-auto rounded-xl border border-gray-700/60 bg-gray-900/95 backdrop-blur-md shadow-2xl z-10"
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white">
            {selectedNode.type === 'question' ? 'Question Details'
              : selectedNode.type === 'direction' ? 'Direction Details'
              : 'Strategic Brief'}
          </h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-700/50 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        {selectedNode.type === 'question' && (
          <QuestionDetail
            data={selectedNode.data as QuestionNodeData}
            onAnswer={onAnswerQuestion}
          />
        )}
        {selectedNode.type === 'direction' && (
          <DirectionDetail
            data={selectedNode.data as DirectionNodeData}
            onAccept={onAcceptDirection}
            onReject={onRejectDirection}
          />
        )}
        {selectedNode.type === 'brief' && (
          <BriefDetail data={selectedNode.data as BriefNodeData} />
        )}
      </div>
    </motion.div>
  );
}

function QuestionDetail({ data, onAnswer }: { data: QuestionNodeData; onAnswer: (q: DbQuestion) => void }) {
  const { question, isAnswered, gapScore } = data;

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-200 leading-relaxed">{question.question}</p>

      {isAnswered && question.answer && (
        <div className="pl-3 border-l-2 border-emerald-500/30">
          <p className="text-xs text-gray-400 leading-relaxed">{question.answer}</p>
        </div>
      )}

      {gapScore != null && gapScore > 0 && (
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5" style={{ color: getGapColor(gapScore) }} />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-2xs text-gray-400">Ambiguity Score</span>
              <span className="text-2xs font-mono" style={{ color: getGapColor(gapScore) }}>
                {Math.round(gapScore * 100)}%
              </span>
            </div>
            <div className="mt-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${gapScore * 100}%`,
                  backgroundColor: getGapColor(gapScore),
                }}
              />
            </div>
          </div>
        </div>
      )}

      {question.gap_analysis && (() => {
        try {
          const gaps = JSON.parse(question.gap_analysis) as { type: string; phrase: string }[];
          if (gaps.length === 0) return null;
          return (
            <div className="space-y-1">
              <span className="text-2xs text-gray-500">Detected gaps:</span>
              {gaps.map((gap, i) => (
                <div key={i} className="text-2xs text-cyan-400/70 bg-cyan-500/8 px-2 py-1 rounded" title={`"${gap.phrase}"`}>
                  {gap.type.replace(/_/g, ' ')}
                </div>
              ))}
            </div>
          );
        } catch { return null; }
      })()}

      <div className="text-2xs text-gray-500">
        Context: {question.context_map_title}
      </div>

      {!isAnswered && (
        <button
          onClick={() => onAnswer(question)}
          className="w-full px-3 py-1.5 text-xs rounded-lg bg-purple-600/80 hover:bg-purple-500 text-white transition-colors"
        >
          Answer Question
        </button>
      )}
    </div>
  );
}

function DirectionDetail({
  data,
  onAccept,
  onReject,
}: {
  data: DirectionNodeData;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const { direction, isPaired, pairLabel } = data;

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-200 leading-relaxed">{direction.summary}</p>

      {isPaired && (
        <div className="text-2xs text-purple-400 bg-purple-500/10 px-2 py-1 rounded">
          Paired Direction {pairLabel} {direction.problem_statement && `- ${direction.problem_statement}`}
        </div>
      )}

      {direction.effort != null && direction.impact != null && (
        <div className="flex gap-3">
          <div className="text-center">
            <div className="text-lg font-bold text-orange-400">{direction.effort}</div>
            <div className="text-2xs text-gray-500">Effort</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-cyan-400">{direction.impact}</div>
            <div className="text-2xs text-gray-500">Impact</div>
          </div>
        </div>
      )}

      <div className="text-2xs text-gray-500">
        Status: <span className="capitalize" style={{ color: getStatusColor(direction.status) }}>{direction.status}</span>
      </div>

      {direction.status === 'pending' && (
        <div className="flex gap-2">
          <button
            onClick={() => onAccept(direction.id)}
            className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-emerald-600/80 hover:bg-emerald-500 text-white transition-colors"
          >
            Accept
          </button>
          <button
            onClick={() => onReject(direction.id)}
            className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-red-600/30 hover:bg-red-600/50 text-red-400 transition-colors"
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
}

function BriefDetail({ data }: { data: BriefNodeData }) {
  return (
    <div className="space-y-3">
      <p className="text-2xs text-gray-500">For question:</p>
      <p className="text-xs text-gray-300 italic">{data.questionText}</p>
      <div className="border-t border-gray-700/40 pt-2">
        <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">{data.brief}</p>
      </div>
    </div>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function TopologyLegend() {
  return (
    <div className="absolute bottom-4 left-4 z-10 bg-gray-900/90 backdrop-blur-sm rounded-lg border border-gray-700/40 px-3 py-2">
      <div className="text-2xs font-medium text-gray-400 mb-1.5">Legend</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="text-2xs text-gray-400">Answered</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span className="text-2xs text-gray-400">Pending</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full border-2 border-red-500" />
          <span className="text-2xs text-gray-400">High ambiguity</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full border-2 border-emerald-500" style={{ boxShadow: '0 0 6px rgba(16,185,129,0.5)' }} />
          <span className="text-2xs text-gray-400">Accepted dir.</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded border-2 border-amber-500/50" />
          <span className="text-2xs text-gray-400">Strategic brief</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-0 border-t border-dashed border-purple-500" />
          <span className="text-2xs text-gray-400">A/B pair</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function DecisionTopologyMap({
  trees,
  directions,
  onAnswerQuestion,
  onAcceptDirection,
  onRejectDirection,
}: DecisionTopologyMapProps) {
  const { initialNodes, initialEdges } = useMemo(() => {
    const { nodes, edges } = buildTopologyGraph(trees, directions);
    return { initialNodes: nodes, initialEdges: edges };
  }, [trees, directions]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<TopologyNode | null>(null);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node as TopologyNode);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  if (trees.length === 0 && directions.length === 0) {
    return (
      <EmptyState
        icon={HelpCircle}
        title="No decision data yet"
        description='Generate questions and directions to see your decision topology'
        variant="compact"
      />
    );
  }

  return (
    <div className="relative w-full rounded-xl border border-gray-700/40 bg-gray-950/80 overflow-hidden" style={{ height: 600 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{
          type: 'default',
          style: { strokeWidth: 1.5 },
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#374151" />
        <Controls
          className="!bg-gray-800/80 !border-gray-700/40 !rounded-lg [&>button]:!bg-gray-800/80 [&>button]:!border-gray-700/40 [&>button]:!text-gray-400 [&>button:hover]:!bg-gray-700/60"
          showInteractive={false}
        />
        <MiniMap
          className="!bg-gray-900/90 !border-gray-700/40 !rounded-lg"
          nodeColor={(node) => {
            if (node.type === 'question') {
              const d = node.data as QuestionNodeData;
              return d.isAnswered ? '#10b981' : '#f59e0b';
            }
            if (node.type === 'direction') {
              const d = node.data as DirectionNodeData;
              return getStatusColor(d.direction.status);
            }
            return '#f59e0b';
          }}
          maskColor="rgba(0,0,0,0.7)"
        />
      </ReactFlow>

      <TopologyLegend />

      <AnimatePresence>
        {selectedNode && (
          <DetailPanel
            selectedNode={selectedNode}
            onClose={() => setSelectedNode(null)}
            onAnswerQuestion={onAnswerQuestion}
            onAcceptDirection={onAcceptDirection}
            onRejectDirection={onRejectDirection}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
