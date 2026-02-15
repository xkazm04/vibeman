'use client';

import { useState, useMemo, useCallback, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeTypes,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  X,
  Play,
  CheckCircle2,
  Wrench,
  GitBranch,
  Zap,
  ShieldAlert,
  Plug,
  Mail,
  Calendar,
  HardDrive,
  MessageSquare,
  Github,
  Globe,
  Workflow,
} from 'lucide-react';
import type { UseCaseFlow, FlowNode, FlowEdge } from '@/lib/personas/testing/flowTypes';

// ============================================================================
// Constants
// ============================================================================

const CONNECTOR_META: Record<string, { label: string; color: string; Icon: React.ComponentType<{ className?: string }> }> = {
  gmail: { label: 'Gmail', color: '#EA4335', Icon: Mail },
  google_calendar: { label: 'Google Calendar', color: '#4285F4', Icon: Calendar },
  google_drive: { label: 'Google Drive', color: '#0F9D58', Icon: HardDrive },
  slack: { label: 'Slack', color: '#4A154B', Icon: MessageSquare },
  github: { label: 'GitHub', color: '#24292e', Icon: Github },
  http: { label: 'HTTP / REST', color: '#3B82F6', Icon: Globe },
};

// ============================================================================
// Layout Algorithm
// ============================================================================

function layoutFlowNodes(nodes: FlowNode[], edges: FlowEdge[]): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const adjacency = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  // Build adjacency list
  for (const node of nodes) {
    adjacency.set(node.id, []);
    inDegree.set(node.id, 0);
  }
  for (const edge of edges) {
    adjacency.get(edge.source)?.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  }

  // BFS-based layering (topological levels)
  const levels: string[][] = [];
  const visited = new Set<string>();

  // Start from nodes with 0 in-degree (or 'start' type)
  let queue = nodes
    .filter(n => n.type === 'start' || (inDegree.get(n.id) || 0) === 0)
    .map(n => n.id);

  if (queue.length === 0) queue = [nodes[0]?.id].filter(Boolean);

  while (queue.length > 0) {
    const level: string[] = [];
    const nextQueue: string[] = [];

    for (const nodeId of queue) {
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);
      level.push(nodeId);

      for (const target of (adjacency.get(nodeId) || [])) {
        if (!visited.has(target)) {
          nextQueue.push(target);
        }
      }
    }

    if (level.length > 0) levels.push(level);
    queue = nextQueue;
  }

  // Add any unvisited nodes to the last level
  for (const node of nodes) {
    if (!visited.has(node.id)) {
      if (levels.length === 0) levels.push([]);
      levels[levels.length - 1].push(node.id);
    }
  }

  // Assign positions
  const VERTICAL_GAP = 120;
  const HORIZONTAL_GAP = 250;

  for (let levelIdx = 0; levelIdx < levels.length; levelIdx++) {
    const level = levels[levelIdx];
    const totalWidth = (level.length - 1) * HORIZONTAL_GAP;
    const startX = -totalWidth / 2;

    for (let nodeIdx = 0; nodeIdx < level.length; nodeIdx++) {
      positions.set(level[nodeIdx], {
        x: startX + nodeIdx * HORIZONTAL_GAP,
        y: levelIdx * VERTICAL_GAP,
      });
    }
  }

  return positions;
}

// ============================================================================
// Custom Node Components
// ============================================================================

interface NodeData {
  label: string;
  detail?: string;
  connector?: string;
}

const StartNode = memo(({ data }: { data: NodeData }) => {
  return (
    <div className="rounded-full px-5 py-3 bg-emerald-500/10 border border-emerald-500/30 min-w-[120px] text-center shadow-[0_0_12px_rgba(16,185,129,0.15)] transition-all hover:shadow-[0_0_20px_rgba(16,185,129,0.25)]">
      <Handle type="target" position={Position.Top} className="!bg-emerald-500 !border-0 !w-3 !h-3" />
      <div className="flex items-center justify-center gap-2">
        <Play className="w-4 h-4 text-emerald-400" />
        <span className="text-sm font-medium text-emerald-300">{data.label}</span>
      </div>
      {data.detail && <div className="text-[10px] text-emerald-400/50 mt-1">{data.detail}</div>}
      <Handle type="source" position={Position.Bottom} className="!bg-emerald-500 !border-0 !w-3 !h-3" />
    </div>
  );
});
StartNode.displayName = 'StartNode';

const EndNode = memo(({ data }: { data: NodeData }) => {
  return (
    <div className="rounded-full px-5 py-3 bg-blue-500/10 border border-blue-500/30 min-w-[120px] text-center shadow-[0_0_12px_rgba(59,130,246,0.15)] transition-all hover:shadow-[0_0_20px_rgba(59,130,246,0.25)]">
      <Handle type="target" position={Position.Top} className="!bg-blue-500 !border-0 !w-3 !h-3" />
      <div className="flex items-center justify-center gap-2">
        <CheckCircle2 className="w-4 h-4 text-blue-400" />
        <span className="text-sm font-medium text-blue-300">{data.label}</span>
      </div>
      {data.detail && <div className="text-[10px] text-blue-400/50 mt-1">{data.detail}</div>}
      <Handle type="source" position={Position.Bottom} className="!bg-blue-500 !border-0 !w-3 !h-3" />
    </div>
  );
});
EndNode.displayName = 'EndNode';

const ActionNode = memo(({ data }: { data: NodeData }) => {
  return (
    <div className="rounded-xl px-4 py-3 bg-secondary/60 border border-primary/20 min-w-[160px] max-w-[220px] text-center transition-all hover:shadow-[0_0_16px_rgba(100,116,139,0.15)] hover:scale-105">
      <Handle type="target" position={Position.Top} className="!bg-slate-400 !border-0 !w-3 !h-3" />
      <div className="flex items-center justify-center gap-2 mb-1">
        <Wrench className="w-4 h-4 text-slate-400" />
        <span className="text-sm font-medium text-foreground/90">{data.label}</span>
      </div>
      {data.detail && <div className="text-[10px] text-muted-foreground/40 mt-1">{data.detail}</div>}
      <Handle type="source" position={Position.Bottom} className="!bg-slate-400 !border-0 !w-3 !h-3" />
    </div>
  );
});
ActionNode.displayName = 'ActionNode';

const DecisionNode = memo(({ data }: { data: NodeData }) => {
  return (
    <div className="rounded-xl px-4 py-2 bg-amber-500/10 border-2 border-amber-500/30 min-w-[140px] max-w-[200px] text-center shadow-[0_0_12px_rgba(245,158,11,0.15)] transition-all hover:shadow-[0_0_20px_rgba(245,158,11,0.25)] hover:scale-105">
      <Handle type="target" position={Position.Top} className="!bg-amber-500 !border-0 !w-3 !h-3" />
      <div className="flex items-center justify-center gap-2 mb-1">
        <GitBranch className="w-4 h-4 text-amber-400" />
        <span className="text-sm font-medium text-amber-300">{data.label}</span>
      </div>
      {data.detail && <div className="text-[10px] text-amber-400/50 mt-1">{data.detail}</div>}
      <Handle type="source" position={Position.Bottom} className="!bg-amber-500 !border-0 !w-3 !h-3" />
    </div>
  );
});
DecisionNode.displayName = 'DecisionNode';

const ConnectorNode = memo(({ data }: { data: NodeData }) => {
  const meta = data.connector ? CONNECTOR_META[data.connector] : null;
  const Icon = meta?.Icon || Plug;
  const color = meta?.color || '#6B7280';

  return (
    <div
      className="px-4 py-3 rounded-xl border-2 bg-secondary/60 min-w-[160px] max-w-[220px] text-center transition-all hover:scale-105"
      style={{ borderColor: `${color}50`, boxShadow: `0 0 16px ${color}22` }}
    >
      <Handle type="target" position={Position.Top} className="!bg-transparent !border-0 !w-3 !h-3" style={{ background: color }} />
      <div className="flex items-center justify-center gap-2 mb-1">
        <Icon className="w-4 h-4" style={{ color }} />
        <span className="text-sm font-medium text-foreground/90">{data.label}</span>
      </div>
      {meta && (
        <div className="text-[10px] font-mono uppercase tracking-wider" style={{ color: `${color}99` }}>
          {meta.label}
        </div>
      )}
      {data.detail && <div className="text-[10px] text-muted-foreground/40 mt-1">{data.detail}</div>}
      <Handle type="source" position={Position.Bottom} className="!bg-transparent !border-0 !w-3 !h-3" style={{ background: color }} />
    </div>
  );
});
ConnectorNode.displayName = 'ConnectorNode';

const EventNode = memo(({ data }: { data: NodeData }) => {
  return (
    <div className="rounded-xl px-4 py-3 bg-violet-500/10 border border-violet-500/30 min-w-[160px] max-w-[220px] text-center shadow-[0_0_12px_rgba(139,92,246,0.15)] transition-all hover:shadow-[0_0_20px_rgba(139,92,246,0.25)] hover:scale-105">
      <Handle type="target" position={Position.Top} className="!bg-violet-500 !border-0 !w-3 !h-3" />
      <div className="flex items-center justify-center gap-2 mb-1">
        <Zap className="w-4 h-4 text-violet-400" />
        <span className="text-sm font-medium text-violet-300">{data.label}</span>
      </div>
      {data.detail && <div className="text-[10px] text-violet-400/50 mt-1">{data.detail}</div>}
      <Handle type="source" position={Position.Bottom} className="!bg-violet-500 !border-0 !w-3 !h-3" />
    </div>
  );
});
EventNode.displayName = 'EventNode';

const ErrorNode = memo(({ data }: { data: NodeData }) => {
  return (
    <div className="rounded-xl px-4 py-3 bg-red-500/10 border border-dashed border-red-500/30 min-w-[160px] max-w-[220px] text-center shadow-[0_0_12px_rgba(239,68,68,0.15)] transition-all hover:shadow-[0_0_20px_rgba(239,68,68,0.25)] hover:scale-105">
      <Handle type="target" position={Position.Top} className="!bg-red-500 !border-0 !w-3 !h-3" />
      <div className="flex items-center justify-center gap-2 mb-1">
        <ShieldAlert className="w-4 h-4 text-red-400" />
        <span className="text-sm font-medium text-red-300">{data.label}</span>
      </div>
      {data.detail && <div className="text-[10px] text-red-400/50 mt-1">{data.detail}</div>}
      <Handle type="source" position={Position.Bottom} className="!bg-red-500 !border-0 !w-3 !h-3" />
    </div>
  );
});
ErrorNode.displayName = 'ErrorNode';

// ============================================================================
// Flow-to-ReactFlow Converter
// ============================================================================

function flowToReactFlow(flow: UseCaseFlow): { nodes: Node[]; edges: Edge[] } {
  const positions = layoutFlowNodes(flow.nodes, flow.edges);

  const rfNodes: Node[] = flow.nodes.map((node) => {
    const pos = positions.get(node.id) || { x: 0, y: 0 };
    return {
      id: node.id,
      type: node.type,
      position: pos,
      data: {
        label: node.label,
        detail: node.detail,
        connector: node.connector,
      },
    };
  });

  const edgeColorMap: Record<string, string> = {
    default: '#3b82f6',
    yes: '#22c55e',
    no: '#ef4444',
    error: '#ef4444',
  };

  const rfEdges: Edge[] = flow.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: 'smoothstep',
    label: edge.label,
    animated: edge.variant === 'error',
    style: {
      stroke: edgeColorMap[edge.variant || 'default'] || '#3b82f6',
      strokeWidth: 2,
      strokeDasharray: edge.variant === 'error' ? '5 5' : undefined,
    },
    labelStyle: {
      fill: '#9ca3af',
      fontSize: 11,
      fontWeight: 500,
    },
    labelBgStyle: {
      fill: '#1a1a2e',
      fillOpacity: 0.8,
    },
    labelBgPadding: [4, 8] as [number, number],
    labelBgBorderRadius: 4,
  }));

  return { nodes: rfNodes, edges: rfEdges };
}

// ============================================================================
// Main Component
// ============================================================================

interface ActivityDiagramModalProps {
  isOpen: boolean;
  onClose: () => void;
  templateName: string;
  flows: UseCaseFlow[];
}

export default function ActivityDiagramModal({ isOpen, onClose, templateName, flows }: ActivityDiagramModalProps) {
  const [activeFlowIndex, setActiveFlowIndex] = useState(0);
  const [animationKey, setAnimationKey] = useState(0);

  const activeFlow = flows[activeFlowIndex] || null;

  const { nodes, edges } = useMemo(() => {
    if (!activeFlow) return { nodes: [], edges: [] };
    return flowToReactFlow(activeFlow);
  }, [activeFlow]);

  const nodeTypes: NodeTypes = useMemo(() => ({
    start: StartNode,
    end: EndNode,
    action: ActionNode,
    decision: DecisionNode,
    connector: ConnectorNode,
    event: EventNode,
    error: ErrorNode,
  }), []);

  // Reset animation on flow change
  useEffect(() => {
    setAnimationKey(prev => prev + 1);
  }, [activeFlowIndex]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center"
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

        {/* Modal */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative w-[90vw] h-[85vh] max-w-7xl bg-background/95 border border-primary/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-primary/10 bg-secondary/30">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                <Workflow className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground/90">{templateName}</h2>
                <p className="text-xs text-muted-foreground/50">{flows.length} use case flow{flows.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg bg-secondary/50 hover:bg-secondary flex items-center justify-center transition-colors">
              <X className="w-4 h-4 text-muted-foreground/60" />
            </button>
          </div>

          {/* Use Case Tabs */}
          {flows.length > 1 && (
            <div className="flex items-center gap-2 px-6 py-3 border-b border-primary/10 bg-secondary/20 overflow-x-auto">
              {flows.map((flow, index) => (
                <button
                  key={flow.id}
                  onClick={() => setActiveFlowIndex(index)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                    index === activeFlowIndex
                      ? 'bg-violet-500/15 border border-violet-500/30 text-violet-300 shadow-[0_0_12px_rgba(139,92,246,0.1)]'
                      : 'bg-secondary/40 border border-transparent text-muted-foreground/60 hover:bg-secondary/60 hover:text-muted-foreground/80'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${index === activeFlowIndex ? 'bg-violet-400' : 'bg-muted-foreground/30'}`} />
                  {flow.name}
                </button>
              ))}
            </div>
          )}

          {/* Diagram Canvas */}
          <div className="flex-1 relative" key={animationKey}>
            {activeFlow ? (
              <ReactFlowProvider>
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  nodeTypes={nodeTypes}
                  fitView
                  fitViewOptions={{ padding: 0.3 }}
                  minZoom={0.3}
                  maxZoom={2}
                  defaultEdgeOptions={{
                    type: 'smoothstep',
                    style: { strokeWidth: 2 },
                  }}
                  proOptions={{ hideAttribution: true }}
                >
                  <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="rgba(59,130,246,0.08)" />
                  <MiniMap
                    style={{
                      backgroundColor: 'rgba(0,0,0,0.3)',
                      borderRadius: 12,
                      border: '1px solid rgba(59,130,246,0.15)',
                    }}
                    maskColor="rgba(0,0,0,0.5)"
                    nodeColor={(node) => {
                      const colorMap: Record<string, string> = {
                        start: '#10b981',
                        end: '#3b82f6',
                        action: '#64748b',
                        decision: '#f59e0b',
                        connector: '#8b5cf6',
                        event: '#8b5cf6',
                        error: '#ef4444',
                      };
                      return colorMap[node.type || ''] || '#64748b';
                    }}
                  />
                  <Controls
                    style={{
                      borderRadius: 12,
                      border: '1px solid rgba(59,130,246,0.15)',
                      backgroundColor: 'rgba(0,0,0,0.4)',
                    }}
                  />
                </ReactFlow>
              </ReactFlowProvider>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground/40">
                No flow data available
              </div>
            )}
          </div>

          {/* Footer -- Flow Description */}
          {activeFlow && (
            <div className="px-6 py-3 border-t border-primary/10 bg-secondary/20">
              <p className="text-sm text-muted-foreground/70">{activeFlow.description}</p>
              <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground/40">
                <span>{activeFlow.nodes.length} nodes</span>
                <span>{activeFlow.edges.length} edges</span>
                <span>{activeFlow.nodes.filter(n => n.type === 'connector').length} connector(s)</span>
                <span>{activeFlow.nodes.filter(n => n.type === 'decision').length} decision(s)</span>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
