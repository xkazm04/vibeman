'use client';

/**
 * Architecture Playground — Interactive Design Surface
 *
 * Transforms the architecture diagram from read-only into an editable
 * design surface where developers can:
 * - Add new service nodes (drag from palette)
 * - Draw connections between nodes
 * - Set integration types and protocols
 * - Get instant validation feedback
 * - Generate implementation plans from the design
 */

import React, { useRef, useEffect, useState, useCallback, useMemo, useReducer } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Plus, Trash2, Link2, AlertTriangle, CheckCircle2,
  XCircle, Info, Play, X, Server, Globe, Database,
  Share2, ChevronDown, Pencil,
} from 'lucide-react';
import type { ProjectTier, IntegrationType, CrossProjectRelationship, WorkspaceProjectNode } from '../lib/types';
import { TIER_CONFIG } from '../lib/types';
import { INTEGRATION_COLORS, INTEGRATION_STYLES } from '../../sub_Matrix/constants';
import { archTheme } from '../../sub_Matrix/lib/archTheme';
import { MATRIX_CONSTANTS } from '../lib/matrixLayoutUtils';
import { validateDesign, type ValidationIssue, type PlaygroundNode, type PlaygroundEdge } from '../lib/playgroundValidation';

// ─── Types ───────────────────────────────────────────────────────────────

interface DesignNode extends PlaygroundNode {
  x: number;
  y: number;
  width: number;
  height: number;
  framework?: string;
  description?: string;
}

interface DesignEdge extends PlaygroundEdge {
  protocol?: string;
  dataFlow?: string;
}

type PlaygroundMode = 'select' | 'connect' | 'add';

interface PlaygroundState {
  nodes: DesignNode[];
  edges: DesignEdge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  mode: PlaygroundMode;
  connectSource: string | null;
  dragNodeId: string | null;
  dragOffset: { x: number; y: number };
}

type PlaygroundAction =
  | { type: 'ADD_NODE'; node: DesignNode }
  | { type: 'REMOVE_NODE'; nodeId: string }
  | { type: 'MOVE_NODE'; nodeId: string; x: number; y: number }
  | { type: 'UPDATE_NODE'; nodeId: string; updates: Partial<Pick<DesignNode, 'name' | 'tier' | 'framework' | 'description'>> }
  | { type: 'ADD_EDGE'; edge: DesignEdge }
  | { type: 'REMOVE_EDGE'; edgeId: string }
  | { type: 'UPDATE_EDGE'; edgeId: string; updates: Partial<Pick<DesignEdge, 'integrationType' | 'label' | 'protocol' | 'dataFlow'>> }
  | { type: 'SELECT_NODE'; nodeId: string | null }
  | { type: 'SELECT_EDGE'; edgeId: string | null }
  | { type: 'SET_MODE'; mode: PlaygroundMode }
  | { type: 'START_CONNECT'; sourceId: string }
  | { type: 'COMPLETE_CONNECT'; targetId: string }
  | { type: 'CANCEL_CONNECT' }
  | { type: 'START_DRAG'; nodeId: string; offsetX: number; offsetY: number }
  | { type: 'END_DRAG' }
  | { type: 'LOAD_EXISTING'; nodes: DesignNode[]; edges: DesignEdge[] }
  | { type: 'CLEAR' };

let nextId = 1;
function genId(prefix: string) {
  return `${prefix}-${Date.now()}-${nextId++}`;
}

function reducer(state: PlaygroundState, action: PlaygroundAction): PlaygroundState {
  switch (action.type) {
    case 'ADD_NODE':
      return { ...state, nodes: [...state.nodes, action.node], selectedNodeId: action.node.id, selectedEdgeId: null };
    case 'REMOVE_NODE':
      return {
        ...state,
        nodes: state.nodes.filter(n => n.id !== action.nodeId),
        edges: state.edges.filter(e => e.sourceId !== action.nodeId && e.targetId !== action.nodeId),
        selectedNodeId: state.selectedNodeId === action.nodeId ? null : state.selectedNodeId,
      };
    case 'MOVE_NODE':
      return { ...state, nodes: state.nodes.map(n => n.id === action.nodeId ? { ...n, x: action.x, y: action.y } : n) };
    case 'UPDATE_NODE':
      return { ...state, nodes: state.nodes.map(n => n.id === action.nodeId ? { ...n, ...action.updates } : n) };
    case 'ADD_EDGE':
      return { ...state, edges: [...state.edges, action.edge], selectedEdgeId: action.edge.id, selectedNodeId: null, connectSource: null, mode: 'select' };
    case 'REMOVE_EDGE':
      return { ...state, edges: state.edges.filter(e => e.id !== action.edgeId), selectedEdgeId: state.selectedEdgeId === action.edgeId ? null : state.selectedEdgeId };
    case 'UPDATE_EDGE':
      return { ...state, edges: state.edges.map(e => e.id === action.edgeId ? { ...e, ...action.updates } : e) };
    case 'SELECT_NODE':
      return { ...state, selectedNodeId: action.nodeId, selectedEdgeId: null };
    case 'SELECT_EDGE':
      return { ...state, selectedEdgeId: action.edgeId, selectedNodeId: null };
    case 'SET_MODE':
      return { ...state, mode: action.mode, connectSource: null };
    case 'START_CONNECT':
      return { ...state, connectSource: action.sourceId, mode: 'connect' };
    case 'COMPLETE_CONNECT': {
      if (!state.connectSource || state.connectSource === action.targetId) {
        return { ...state, connectSource: null, mode: 'select' };
      }
      const exists = state.edges.some(
        e => e.sourceId === state.connectSource && e.targetId === action.targetId
      );
      if (exists) return { ...state, connectSource: null, mode: 'select' };
      const edge: DesignEdge = {
        id: genId('edge'),
        sourceId: state.connectSource,
        targetId: action.targetId,
        integrationType: 'rest',
        label: 'New Connection',
      };
      return { ...state, edges: [...state.edges, edge], connectSource: null, mode: 'select', selectedEdgeId: edge.id, selectedNodeId: null };
    }
    case 'CANCEL_CONNECT':
      return { ...state, connectSource: null, mode: 'select' };
    case 'START_DRAG':
      return { ...state, dragNodeId: action.nodeId, dragOffset: { x: action.offsetX, y: action.offsetY } };
    case 'END_DRAG':
      return { ...state, dragNodeId: null };
    case 'LOAD_EXISTING':
      return { ...state, nodes: action.nodes, edges: action.edges };
    case 'CLEAR':
      return { ...initialState };
    default:
      return state;
  }
}

const initialState: PlaygroundState = {
  nodes: [],
  edges: [],
  selectedNodeId: null,
  selectedEdgeId: null,
  mode: 'select',
  connectSource: null,
  dragNodeId: null,
  dragOffset: { x: 0, y: 0 },
};

// ─── Tier palette items ──────────────────────────────────────────────────

const TIER_PALETTE: Array<{ tier: ProjectTier; label: string; icon: typeof Server }> = [
  { tier: 'frontend', label: 'Frontend', icon: Globe },
  { tier: 'backend', label: 'Backend', icon: Server },
  { tier: 'external', label: 'External', icon: Database },
  { tier: 'shared', label: 'Shared', icon: Share2 },
];

// ─── Sub-components ──────────────────────────────────────────────────────

function PlaygroundNodeCard({
  node, isSelected, isConnectSource, mode,
  onMouseDown, onClick,
}: {
  node: DesignNode;
  isSelected: boolean;
  isConnectSource: boolean;
  mode: PlaygroundMode;
  onMouseDown: (e: React.MouseEvent) => void;
  onClick: () => void;
}) {
  const tierColor = TIER_CONFIG[node.tier].color;
  return (
    <g
      transform={`translate(${node.x}, ${node.y})`}
      onMouseDown={onMouseDown}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      style={{ cursor: mode === 'connect' ? 'crosshair' : 'grab' }}
    >
      {/* Card body */}
      <rect
        width={node.width}
        height={node.height}
        rx={6}
        fill={archTheme.surface.card}
        stroke={isSelected ? archTheme.indicator.activeBorder : isConnectSource ? '#22d3ee' : archTheme.border.card}
        strokeWidth={isSelected || isConnectSource ? 2 : 1}
      />
      {/* Tier strip */}
      <rect width={node.width} height={4} rx={6} fill={tierColor} />
      <rect x={0} y={2} width={node.width} height={2} fill={tierColor} />
      {/* Name */}
      <text x={node.width / 2} y={24} textAnchor="middle" fill={archTheme.text.primary} fontSize={11} fontWeight={600}>
        {node.name.length > 18 ? node.name.slice(0, 16) + '..' : node.name}
      </text>
      {/* Tier label */}
      <text x={node.width / 2} y={38} textAnchor="middle" fill={archTheme.text.dim} fontSize={9}>
        {TIER_CONFIG[node.tier].label.split(' ')[0]}
      </text>
      {/* Framework */}
      {node.framework && (
        <text x={node.width / 2} y={50} textAnchor="middle" fill={archTheme.text.faint} fontSize={8}>
          {node.framework}
        </text>
      )}
      {/* Connect hint in connect mode */}
      {mode === 'connect' && !isConnectSource && (
        <circle cx={node.width / 2} cy={node.height + 4} r={4} fill="#22d3ee" opacity={0.5} />
      )}
    </g>
  );
}

function PlaygroundEdgeLine({
  edge, sourceNode, targetNode, isSelected,
  onClick,
}: {
  edge: DesignEdge;
  sourceNode: DesignNode;
  targetNode: DesignNode;
  isSelected: boolean;
  onClick: () => void;
}) {
  const sx = sourceNode.x + sourceNode.width / 2;
  const sy = sourceNode.y + sourceNode.height;
  const tx = targetNode.x + targetNode.width / 2;
  const ty = targetNode.y;

  const midY = (sy + ty) / 2;
  const d = `M ${sx} ${sy} C ${sx} ${midY}, ${tx} ${midY}, ${tx} ${ty}`;
  const color = INTEGRATION_COLORS[edge.integrationType];
  const style = INTEGRATION_STYLES[edge.integrationType];

  return (
    <g onClick={(e) => { e.stopPropagation(); onClick(); }} style={{ cursor: 'pointer' }}>
      {/* Hit area */}
      <path d={d} fill="none" stroke="transparent" strokeWidth={12} />
      {/* Visible line */}
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={isSelected ? 2.5 : 1.5}
        strokeDasharray={style.dashed ? '6 3' : undefined}
        opacity={isSelected ? 1 : 0.6}
      />
      {/* Arrow */}
      <circle cx={tx} cy={ty} r={3} fill={color} opacity={isSelected ? 1 : 0.6} />
      {/* Label */}
      <text
        x={(sx + tx) / 2}
        y={midY - 6}
        textAnchor="middle"
        fill={archTheme.text.muted}
        fontSize={8}
        opacity={isSelected ? 1 : 0.5}
      >
        {edge.label.length > 20 ? edge.label.slice(0, 18) + '..' : edge.label}
      </text>
    </g>
  );
}

// ─── Validation Panel ────────────────────────────────────────────────────

function ValidationPanel({ issues }: { issues: ValidationIssue[] }) {
  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');
  const infos = issues.filter(i => i.severity === 'info');

  if (issues.length === 0) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] text-emerald-400">
        <CheckCircle2 className="w-3 h-3" />
        Design valid
      </div>
    );
  }

  return (
    <div className="space-y-1 max-h-48 overflow-y-auto">
      {errors.map(i => (
        <div key={i.id} className="flex items-start gap-1.5 px-2 py-1 text-[10px] text-red-400 bg-red-500/5 rounded">
          <XCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
          <div><span className="font-medium">{i.title}:</span> {i.description}</div>
        </div>
      ))}
      {warnings.map(i => (
        <div key={i.id} className="flex items-start gap-1.5 px-2 py-1 text-[10px] text-amber-400 bg-amber-500/5 rounded">
          <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
          <div><span className="font-medium">{i.title}:</span> {i.description}</div>
        </div>
      ))}
      {infos.map(i => (
        <div key={i.id} className="flex items-start gap-1.5 px-2 py-1 text-[10px] text-zinc-400 bg-zinc-800/30 rounded">
          <Info className="w-3 h-3 flex-shrink-0 mt-0.5" />
          <div>{i.description}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Properties Panel ────────────────────────────────────────────────────

function NodePropertiesPanel({
  node, dispatch,
}: {
  node: DesignNode;
  dispatch: React.Dispatch<PlaygroundAction>;
}) {
  return (
    <div className="space-y-2">
      <div className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide">Node Properties</div>
      <div>
        <label className="text-[10px] text-zinc-500">Name</label>
        <input
          type="text"
          value={node.name}
          onChange={e => dispatch({ type: 'UPDATE_NODE', nodeId: node.id, updates: { name: e.target.value } })}
          className="w-full px-2 py-1 text-xs bg-zinc-800/50 border border-zinc-700/50 rounded focus:outline-none focus:border-cyan-500/50 text-zinc-200"
        />
      </div>
      <div>
        <label className="text-[10px] text-zinc-500">Tier</label>
        <select
          value={node.tier}
          onChange={e => dispatch({ type: 'UPDATE_NODE', nodeId: node.id, updates: { tier: e.target.value as ProjectTier } })}
          className="w-full px-2 py-1 text-xs bg-zinc-800/50 border border-zinc-700/50 rounded focus:outline-none focus:border-cyan-500/50 text-zinc-200"
        >
          {TIER_PALETTE.map(t => (
            <option key={t.tier} value={t.tier}>{t.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-[10px] text-zinc-500">Framework</label>
        <input
          type="text"
          value={node.framework || ''}
          onChange={e => dispatch({ type: 'UPDATE_NODE', nodeId: node.id, updates: { framework: e.target.value || undefined } })}
          placeholder="e.g., Next.js, Express"
          className="w-full px-2 py-1 text-xs bg-zinc-800/50 border border-zinc-700/50 rounded focus:outline-none focus:border-cyan-500/50 text-zinc-200 placeholder:text-zinc-600"
        />
      </div>
      <button
        onClick={() => dispatch({ type: 'REMOVE_NODE', nodeId: node.id })}
        className="flex items-center gap-1 px-2 py-1 text-[10px] text-red-400 hover:bg-red-500/10 rounded transition-colors"
      >
        <Trash2 className="w-3 h-3" /> Remove Node
      </button>
    </div>
  );
}

function EdgePropertiesPanel({
  edge, nodes, dispatch,
}: {
  edge: DesignEdge;
  nodes: DesignNode[];
  dispatch: React.Dispatch<PlaygroundAction>;
}) {
  const source = nodes.find(n => n.id === edge.sourceId);
  const target = nodes.find(n => n.id === edge.targetId);

  return (
    <div className="space-y-2">
      <div className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide">Connection Properties</div>
      <div className="text-[10px] text-zinc-400">
        {source?.name || '?'} → {target?.name || '?'}
      </div>
      <div>
        <label className="text-[10px] text-zinc-500">Type</label>
        <select
          value={edge.integrationType}
          onChange={e => dispatch({ type: 'UPDATE_EDGE', edgeId: edge.id, updates: { integrationType: e.target.value as IntegrationType } })}
          className="w-full px-2 py-1 text-xs bg-zinc-800/50 border border-zinc-700/50 rounded focus:outline-none focus:border-cyan-500/50 text-zinc-200"
        >
          {(Object.keys(INTEGRATION_STYLES) as IntegrationType[]).map(t => (
            <option key={t} value={t}>{INTEGRATION_STYLES[t].label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-[10px] text-zinc-500">Label</label>
        <input
          type="text"
          value={edge.label}
          onChange={e => dispatch({ type: 'UPDATE_EDGE', edgeId: edge.id, updates: { label: e.target.value } })}
          className="w-full px-2 py-1 text-xs bg-zinc-800/50 border border-zinc-700/50 rounded focus:outline-none focus:border-cyan-500/50 text-zinc-200"
        />
      </div>
      <div>
        <label className="text-[10px] text-zinc-500">Protocol</label>
        <input
          type="text"
          value={edge.protocol || ''}
          onChange={e => dispatch({ type: 'UPDATE_EDGE', edgeId: edge.id, updates: { protocol: e.target.value || undefined } })}
          placeholder="e.g., POST /api/users"
          className="w-full px-2 py-1 text-xs bg-zinc-800/50 border border-zinc-700/50 rounded focus:outline-none focus:border-cyan-500/50 text-zinc-200 placeholder:text-zinc-600"
        />
      </div>
      <div>
        <label className="text-[10px] text-zinc-500">Data Flow</label>
        <input
          type="text"
          value={edge.dataFlow || ''}
          onChange={e => dispatch({ type: 'UPDATE_EDGE', edgeId: edge.id, updates: { dataFlow: e.target.value || undefined } })}
          placeholder="e.g., JWT tokens"
          className="w-full px-2 py-1 text-xs bg-zinc-800/50 border border-zinc-700/50 rounded focus:outline-none focus:border-cyan-500/50 text-zinc-200 placeholder:text-zinc-600"
        />
      </div>
      <button
        onClick={() => dispatch({ type: 'REMOVE_EDGE', edgeId: edge.id })}
        className="flex items-center gap-1 px-2 py-1 text-[10px] text-red-400 hover:bg-red-500/10 rounded transition-colors"
      >
        <Trash2 className="w-3 h-3" /> Remove Connection
      </button>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────

interface ArchitecturePlaygroundProps {
  existingNodes?: WorkspaceProjectNode[];
  existingEdges?: CrossProjectRelationship[];
  workspaceId: string | null;
  projects: Array<{ id: string; name: string; path: string }>;
  onGeneratePlan?: (designNodes: DesignNode[], designEdges: DesignEdge[]) => void;
  onClose: () => void;
}

export default function ArchitecturePlayground({
  existingNodes,
  existingEdges,
  workspaceId,
  projects,
  onGeneratePlan,
  onClose,
}: ArchitecturePlaygroundProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [state, dispatch] = useReducer(reducer, initialState);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Observe container size
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setDimensions({ width, height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Load existing architecture nodes into playground
  useEffect(() => {
    if (existingNodes && existingNodes.length > 0) {
      const { nodeWidth, nodeHeight } = MATRIX_CONSTANTS;
      const designNodes: DesignNode[] = existingNodes.map(n => ({
        id: n.id,
        name: n.name,
        tier: n.tier,
        x: n.x || 100,
        y: n.y || 100,
        width: nodeWidth,
        height: nodeHeight,
        framework: n.framework,
      }));
      const designEdges: DesignEdge[] = (existingEdges || []).map(e => ({
        id: e.id,
        sourceId: e.sourceProjectId,
        targetId: e.targetProjectId,
        integrationType: e.integrationType,
        label: e.label,
        protocol: e.protocol,
        dataFlow: e.dataFlow,
      }));
      dispatch({ type: 'LOAD_EXISTING', nodes: designNodes, edges: designEdges });
    }
  }, [existingNodes, existingEdges]);

  // Validation
  const validationIssues = useMemo(
    () => validateDesign(state.nodes, state.edges),
    [state.nodes, state.edges]
  );

  const errorCount = validationIssues.filter(i => i.severity === 'error').length;
  const warningCount = validationIssues.filter(i => i.severity === 'warning').length;

  // Node helpers
  const nodeMap = useMemo(() => new Map(state.nodes.map(n => [n.id, n])), [state.nodes]);
  const selectedNode = state.selectedNodeId ? nodeMap.get(state.selectedNodeId) || null : null;
  const selectedEdge = state.selectedEdgeId ? state.edges.find(e => e.id === state.selectedEdgeId) || null : null;

  // ─── Handlers ──────────────────────────────────────────────────────────

  const handleAddNode = useCallback((tier: ProjectTier) => {
    const { nodeWidth, nodeHeight } = MATRIX_CONSTANTS;
    const node: DesignNode = {
      id: genId('node'),
      name: `New ${TIER_CONFIG[tier].label.split(' ')[0]}`,
      tier,
      x: dimensions.width / 2 - nodeWidth / 2 + (Math.random() - 0.5) * 80,
      y: dimensions.height / 2 - nodeHeight / 2 + (Math.random() - 0.5) * 80,
      width: nodeWidth,
      height: nodeHeight,
    };
    dispatch({ type: 'ADD_NODE', node });
  }, [dimensions]);

  const handleSvgMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (e.target === svgRef.current) {
      dispatch({ type: 'SELECT_NODE', nodeId: null });
      dispatch({ type: 'SELECT_EDGE', edgeId: null });
      if (state.mode === 'connect') {
        dispatch({ type: 'CANCEL_CONNECT' });
      }
    }
  }, [state.mode]);

  const handleNodeMouseDown = useCallback((nodeId: string, e: React.MouseEvent) => {
    if (state.mode === 'connect') return; // connect handled by click
    e.stopPropagation();
    const svg = svgRef.current;
    if (!svg) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgPt = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    const node = nodeMap.get(nodeId);
    if (!node) return;
    dispatch({ type: 'START_DRAG', nodeId, offsetX: svgPt.x - node.x, offsetY: svgPt.y - node.y });
    dispatch({ type: 'SELECT_NODE', nodeId });
  }, [state.mode, nodeMap]);

  const handleNodeClick = useCallback((nodeId: string) => {
    if (state.mode === 'connect') {
      if (state.connectSource) {
        dispatch({ type: 'COMPLETE_CONNECT', targetId: nodeId });
      } else {
        dispatch({ type: 'START_CONNECT', sourceId: nodeId });
      }
    } else {
      dispatch({ type: 'SELECT_NODE', nodeId });
    }
  }, [state.mode, state.connectSource]);

  const handleSvgMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgPt = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    setMousePos({ x: svgPt.x, y: svgPt.y });

    if (state.dragNodeId) {
      dispatch({
        type: 'MOVE_NODE',
        nodeId: state.dragNodeId,
        x: svgPt.x - state.dragOffset.x,
        y: svgPt.y - state.dragOffset.y,
      });
    }
  }, [state.dragNodeId, state.dragOffset]);

  const handleSvgMouseUp = useCallback(() => {
    if (state.dragNodeId) {
      dispatch({ type: 'END_DRAG' });
    }
  }, [state.dragNodeId]);

  const handleGeneratePlan = useCallback(() => {
    if (onGeneratePlan) {
      onGeneratePlan(state.nodes, state.edges);
    }
  }, [onGeneratePlan, state.nodes, state.edges]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (state.mode === 'connect') dispatch({ type: 'CANCEL_CONNECT' });
        else {
          dispatch({ type: 'SELECT_NODE', nodeId: null });
          dispatch({ type: 'SELECT_EDGE', edgeId: null });
        }
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (state.selectedNodeId && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement)) {
          dispatch({ type: 'REMOVE_NODE', nodeId: state.selectedNodeId });
        }
        if (state.selectedEdgeId && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement)) {
          dispatch({ type: 'REMOVE_EDGE', edgeId: state.selectedEdgeId });
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.selectedNodeId, state.selectedEdgeId, state.mode]);

  // Tier swimlane guides
  const tierGuides = useMemo(() => {
    const guides: Array<{ tier: ProjectTier; y: number; height: number }> = [];
    const tierHeight = dimensions.height / 4;
    (['frontend', 'backend', 'external', 'shared'] as ProjectTier[]).forEach((tier, i) => {
      guides.push({ tier, y: i * tierHeight, height: tierHeight });
    });
    return guides;
  }, [dimensions.height]);

  // Connect mode preview line
  const connectPreview = useMemo(() => {
    if (!state.connectSource) return null;
    const source = nodeMap.get(state.connectSource);
    if (!source) return null;
    return {
      x1: source.x + source.width / 2,
      y1: source.y + source.height,
      x2: mousePos.x,
      y2: mousePos.y,
    };
  }, [state.connectSource, nodeMap, mousePos]);

  return (
    <div className="flex flex-col h-full bg-[#08080a]">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-cyan-500/10 bg-zinc-900/60 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Pencil className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-medium text-zinc-200">Architecture Playground</span>
          <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">
            DESIGN
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Validation badge */}
          {errorCount > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-full">
              <XCircle className="w-3 h-3" /> {errorCount} error{errorCount > 1 ? 's' : ''}
            </span>
          )}
          {warningCount > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full">
              <AlertTriangle className="w-3 h-3" /> {warningCount}
            </span>
          )}
          {errorCount === 0 && warningCount === 0 && state.nodes.length > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              <CheckCircle2 className="w-3 h-3" /> Valid
            </span>
          )}
          <button
            onClick={handleGeneratePlan}
            disabled={state.nodes.length === 0 || errorCount > 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30 hover:bg-emerald-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <Play className="w-3.5 h-3.5" />
            Generate Plan
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/80 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>
        {/* Left sidebar: Node palette + mode tools */}
        <div className="w-48 flex-shrink-0 border-r border-zinc-800/50 bg-zinc-900/40 flex flex-col overflow-y-auto">
          {/* Mode selector */}
          <div className="px-3 py-2 border-b border-zinc-800/30">
            <div className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide mb-1.5">Mode</div>
            <div className="flex gap-1">
              {([
                { mode: 'select' as PlaygroundMode, label: 'Select', icon: null },
                { mode: 'connect' as PlaygroundMode, label: 'Connect', icon: Link2 },
              ]).map(m => (
                <button
                  key={m.mode}
                  onClick={() => dispatch({ type: 'SET_MODE', mode: m.mode })}
                  className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-medium rounded-md border transition-all ${
                    state.mode === m.mode
                      ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
                      : 'text-zinc-500 border-transparent hover:bg-zinc-800/50 hover:text-zinc-300'
                  }`}
                >
                  {m.icon && <m.icon className="w-3 h-3" />}
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Add nodes */}
          <div className="px-3 py-2 border-b border-zinc-800/30">
            <div className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide mb-1.5">Add Service</div>
            <div className="space-y-1">
              {TIER_PALETTE.map(item => {
                const Icon = item.icon;
                const color = TIER_CONFIG[item.tier].color;
                return (
                  <button
                    key={item.tier}
                    onClick={() => handleAddNode(item.tier)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-md border border-transparent hover:border-zinc-700/50 hover:bg-zinc-800/50 text-zinc-300 transition-all"
                  >
                    <div className="w-5 h-5 rounded flex items-center justify-center" style={{ backgroundColor: `${color}15`, border: `1px solid ${color}30` }}>
                      <Icon className="w-3 h-3" style={{ color }} />
                    </div>
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Properties panel */}
          <div className="px-3 py-2 flex-1">
            {selectedNode && (
              <NodePropertiesPanel node={selectedNode} dispatch={dispatch} />
            )}
            {selectedEdge && (
              <EdgePropertiesPanel edge={selectedEdge} nodes={state.nodes} dispatch={dispatch} />
            )}
            {!selectedNode && !selectedEdge && (
              <div className="text-[10px] text-zinc-600 mt-2">
                Click a node or connection to edit its properties.
                <br /><br />
                <span className="text-zinc-500">Shortcuts:</span>
                <br />Delete — Remove selected
                <br />Esc — Deselect / cancel
              </div>
            )}
          </div>

          {/* Validation */}
          <div className="px-3 py-2 border-t border-zinc-800/30">
            <div className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide mb-1">Validation</div>
            <ValidationPanel issues={validationIssues} />
          </div>
        </div>

        {/* SVG canvas */}
        <div ref={containerRef} className="flex-1 overflow-hidden relative">
          <svg
            ref={svgRef}
            width={dimensions.width}
            height={dimensions.height}
            onMouseDown={handleSvgMouseDown}
            onMouseMove={handleSvgMouseMove}
            onMouseUp={handleSvgMouseUp}
            style={{ cursor: state.mode === 'connect' ? 'crosshair' : state.dragNodeId ? 'grabbing' : 'default' }}
          >
            {/* Background */}
            <rect width={dimensions.width} height={dimensions.height} fill={archTheme.surface.deepBg} />

            {/* Grid */}
            <pattern id="pg-grid" width={40} height={40} patternUnits="userSpaceOnUse">
              <rect width={40} height={40} fill="none" stroke="rgba(6,182,212,0.04)" strokeWidth={0.5} />
            </pattern>
            <rect width={dimensions.width} height={dimensions.height} fill="url(#pg-grid)" />

            {/* Tier swimlane guides */}
            {tierGuides.map(g => (
              <g key={g.tier}>
                <rect
                  x={0} y={g.y} width={dimensions.width} height={g.height}
                  fill={TIER_CONFIG[g.tier].bgColor}
                  stroke={`${TIER_CONFIG[g.tier].color}10`}
                  strokeWidth={0.5}
                />
                <text
                  x={12} y={g.y + 16}
                  fill={TIER_CONFIG[g.tier].color}
                  fontSize={10}
                  opacity={0.3}
                  fontWeight={600}
                >
                  {TIER_CONFIG[g.tier].label}
                </text>
              </g>
            ))}

            {/* Edges */}
            {state.edges.map(edge => {
              const source = nodeMap.get(edge.sourceId);
              const target = nodeMap.get(edge.targetId);
              if (!source || !target) return null;
              return (
                <PlaygroundEdgeLine
                  key={edge.id}
                  edge={edge}
                  sourceNode={source}
                  targetNode={target}
                  isSelected={state.selectedEdgeId === edge.id}
                  onClick={() => dispatch({ type: 'SELECT_EDGE', edgeId: edge.id })}
                />
              );
            })}

            {/* Connect preview line */}
            {connectPreview && (
              <line
                x1={connectPreview.x1}
                y1={connectPreview.y1}
                x2={connectPreview.x2}
                y2={connectPreview.y2}
                stroke="#22d3ee"
                strokeWidth={1.5}
                strokeDasharray="6 3"
                opacity={0.6}
              />
            )}

            {/* Nodes */}
            {state.nodes.map(node => (
              <PlaygroundNodeCard
                key={node.id}
                node={node}
                isSelected={state.selectedNodeId === node.id}
                isConnectSource={state.connectSource === node.id}
                mode={state.mode}
                onMouseDown={e => handleNodeMouseDown(node.id, e)}
                onClick={() => handleNodeClick(node.id)}
              />
            ))}

            {/* Empty state */}
            {state.nodes.length === 0 && (
              <g>
                <text
                  x={dimensions.width / 2}
                  y={dimensions.height / 2 - 10}
                  textAnchor="middle"
                  fill={archTheme.text.dim}
                  fontSize={13}
                >
                  Add services from the palette to start designing
                </text>
                <text
                  x={dimensions.width / 2}
                  y={dimensions.height / 2 + 12}
                  textAnchor="middle"
                  fill={archTheme.text.faint}
                  fontSize={11}
                >
                  Drag nodes to position, use Connect mode to draw edges
                </text>
              </g>
            )}
          </svg>

          {/* Connect mode banner */}
          <AnimatePresence>
            {state.mode === 'connect' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-900/60 border border-cyan-500/30 text-xs text-cyan-300 backdrop-blur-sm"
              >
                <Link2 className="w-3.5 h-3.5" />
                {state.connectSource ? 'Click target node to complete connection' : 'Click source node to start connection'}
                <button
                  onClick={() => dispatch({ type: 'CANCEL_CONNECT' })}
                  className="ml-1 p-0.5 hover:bg-cyan-500/20 rounded transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
