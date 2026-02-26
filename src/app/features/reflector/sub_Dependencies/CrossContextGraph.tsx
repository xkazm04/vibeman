/**
 * Cross-Context Dependency Graph
 *
 * Force-directed SVG graph visualizing relationships between contexts.
 * Click a node to run "what-if" cascade impact analysis showing
 * downstream ripple effects across the project.
 */

'use client';

import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Network,
  AlertTriangle,
  Shield,
  ShieldAlert,
  FileCode,
  Database,
  Globe,
  GitBranch,
  Layers,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type {
  ContextGraphNode,
  ContextGraphEdge,
  ContextGraph,
  CascadeAnalysis,
  CascadeImpact,
  EdgeType,
} from '@/lib/ideas/crossContextGraph';

// ─── Constants ───

const EDGE_TYPE_COLORS: Record<EdgeType, string> = {
  cross_ref: '#f59e0b',
  shared_files: '#3b82f6',
  shared_api: '#10b981',
  shared_tables: '#a855f7',
  group_relationship: '#6b7280',
};

const EDGE_TYPE_LABELS: Record<EdgeType, string> = {
  cross_ref: 'Cross-Ref',
  shared_files: 'Shared Files',
  shared_api: 'Shared API',
  shared_tables: 'Shared DB',
  group_relationship: 'Group',
};

const CATEGORY_ICONS: Record<string, typeof FileCode> = {
  ui: Layers,
  lib: FileCode,
  api: Globe,
  data: Database,
};

const RISK_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  low: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  medium: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  high: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
};

// ─── Force Layout Types ───

interface LayoutNode {
  id: string;
  data: ContextGraphNode;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
}

// ─── SVG Styles ───

const SVG_STYLES = `
  @keyframes ccg-pulse-ring {
    0%, 100% { stroke-opacity: 0.2; }
    50% { stroke-opacity: 0.55; }
  }
  @keyframes ccg-dash-flow {
    to { stroke-dashoffset: -20; }
  }
  @keyframes ccg-cascade-pulse {
    0%, 100% { r: 0; opacity: 0.6; }
    100% { r: 40; opacity: 0; }
  }
  .ccg-selected-ring {
    animation: ccg-pulse-ring 2s ease-in-out infinite;
  }
  .ccg-edge-flow {
    animation: ccg-dash-flow 1.6s linear infinite;
  }
`;

// ─── Force Layout ───

function runForceLayout(
  nodes: LayoutNode[],
  edges: ContextGraphEdge[],
  width: number,
  height: number,
): void {
  const cx = width / 2;
  const cy = height / 2;
  const n = nodes.length;
  if (n === 0) return;

  // Golden-angle spiral initialization
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const initRadius = Math.min(width, height) * 0.3;
  nodes.forEach((node, i) => {
    const angle = i * goldenAngle;
    const r = initRadius * Math.sqrt((i + 1) / n);
    node.x = cx + r * Math.cos(angle);
    node.y = cy + r * Math.sin(angle);
    node.vx = 0;
    node.vy = 0;
  });

  // Build index for fast lookup
  const nodeIndex = new Map(nodes.map((n, i) => [n.id, i]));

  const iterations = 150;
  let temperature = 0.15;
  const cooling = 0.97;

  for (let iter = 0; iter < iterations; iter++) {
    for (const node of nodes) { node.vx = 0; node.vy = 0; }

    // Coulomb repulsion
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = nodes[j].x - nodes[i].x;
        const dy = nodes[j].y - nodes[i].y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq) || 1;
        const minDist = nodes[i].radius + nodes[j].radius + 60;
        const repulsion = (minDist * minDist) / distSq;
        const fx = (dx / dist) * repulsion;
        const fy = (dy / dist) * repulsion;
        nodes[i].vx -= fx;
        nodes[i].vy -= fy;
        nodes[j].vx += fx;
        nodes[j].vy += fy;
      }
    }

    // Hooke spring along edges
    for (const edge of edges) {
      const si = nodeIndex.get(edge.source);
      const ti = nodeIndex.get(edge.target);
      if (si === undefined || ti === undefined) continue;
      const s = nodes[si];
      const t = nodes[ti];
      const dx = t.x - s.x;
      const dy = t.y - s.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const idealDist = 130 - edge.weight * 50;
      const springForce = (dist - idealDist) * 0.04 * (0.5 + edge.weight);
      const fx = (dx / dist) * springForce;
      const fy = (dy / dist) * springForce;
      s.vx += fx;
      s.vy += fy;
      t.vx -= fx;
      t.vy -= fy;
    }

    // Center gravity
    for (const node of nodes) {
      node.vx += (cx - node.x) * 0.006;
      node.vy += (cy - node.y) * 0.006;
    }

    // Apply capped forces
    for (const node of nodes) {
      const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy) || 1;
      const capped = Math.min(speed, 18);
      node.x += (node.vx / speed) * capped * temperature;
      node.y += (node.vy / speed) * capped * temperature;
    }

    temperature *= cooling;
  }

  // Clamp to bounds
  const pad = 50;
  for (const node of nodes) {
    node.x = Math.max(node.radius + pad, Math.min(width - node.radius - pad, node.x));
    node.y = Math.max(node.radius + pad, Math.min(height - node.radius - pad, node.y));
  }
}

// ─── Helpers ───

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 3) + '...' : text;
}

function nodeRadius(node: ContextGraphNode): number {
  return 14 + Math.min(node.fileCount, 30) * 0.5 + Math.min(node.ideaCount, 10) * 1.2;
}

// ─── Component ───

interface CrossContextGraphProps {
  graph: ContextGraph;
  cascade: CascadeAnalysis | null;
  onSelectContext: (contextId: string | null) => void;
  selectedContextId: string | null;
  className?: string;
}

export default function CrossContextGraph({
  graph,
  cascade,
  onSelectContext,
  selectedContextId,
  className = '',
}: CrossContextGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [showCascadePanel, setShowCascadePanel] = useState(true);

  // Resize observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setDimensions({ width, height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Auto-open cascade panel when cascade data arrives
  useEffect(() => {
    if (cascade) setShowCascadePanel(true);
  }, [cascade]);

  // Build layout nodes
  const { layoutNodes, layoutEdges } = useMemo(() => {
    const ln: LayoutNode[] = graph.nodes.map(node => ({
      id: node.id,
      data: node,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      radius: nodeRadius(node),
      color: node.groupColor || '#6b7280',
    }));

    if (ln.length > 0) {
      runForceLayout(ln, graph.edges, dimensions.width, dimensions.height);
    }

    return { layoutNodes: ln, layoutEdges: graph.edges };
  }, [graph, dimensions]);

  const nodeMap = useMemo(() => new Map(layoutNodes.map(n => [n.id, n])), [layoutNodes]);

  // Cascade impact set for visual highlighting
  const cascadeImpactMap = useMemo(() => {
    if (!cascade) return new Map<string, CascadeImpact>();
    const map = new Map<string, CascadeImpact>();
    for (const imp of [...cascade.directImpacts, ...cascade.transitiveImpacts]) {
      map.set(imp.contextId, imp);
    }
    return map;
  }, [cascade]);

  const handleNodeClick = useCallback((nodeId: string) => {
    onSelectContext(selectedContextId === nodeId ? null : nodeId);
  }, [selectedContextId, onSelectContext]);

  // Escape to deselect
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onSelectContext(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onSelectContext]);

  // Empty state
  if (graph.nodes.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center h-full text-center py-16 ${className}`}>
        <Network className="w-12 h-12 text-gray-700 mb-4" />
        <p className="text-sm text-gray-400">No contexts found for this project</p>
        <p className="text-xs text-gray-600 mt-1">Create contexts via the context mapping system to see the dependency graph</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative w-full h-full min-h-[400px] bg-gray-900 rounded-lg overflow-hidden ${className}`}>
      {/* SVG Graph */}
      <svg
        width={dimensions.width}
        height={dimensions.height}
        className="select-none absolute inset-0"
        style={{ display: 'block' }}
      >
        <defs>
          <style>{SVG_STYLES}</style>
          <radialGradient id="ccg-bg-glow" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="rgba(234,179,8,0.04)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
          {/* Glow filter */}
          <filter id="ccg-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Cascade impact glow */}
          <filter id="ccg-cascade-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feFlood floodColor="#f59e0b" floodOpacity="0.4" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background */}
        <rect width={dimensions.width} height={dimensions.height} fill="#111118" />
        <rect width={dimensions.width} height={dimensions.height} fill="url(#ccg-bg-glow)" />

        {/* Edges */}
        {layoutEdges.map((edge, i) => {
          const s = nodeMap.get(edge.source);
          const t = nodeMap.get(edge.target);
          if (!s || !t) return null;

          const isHovered = hoveredNode === edge.source || hoveredNode === edge.target;
          const isSelected = selectedContextId === edge.source || selectedContextId === edge.target;
          const isCascadeEdge = cascade && (
            (edge.source === cascade.sourceContextId && cascadeImpactMap.has(edge.target)) ||
            (edge.target === cascade.sourceContextId && cascadeImpactMap.has(edge.source))
          );

          const primaryType = edge.types[0] || 'group_relationship';
          const baseColor = EDGE_TYPE_COLORS[primaryType];
          const opacity = isCascadeEdge ? 0.7 : isHovered || isSelected ? 0.5 : 0.2;
          const strokeWidth = isCascadeEdge ? 2 + edge.weight * 2 : isHovered || isSelected ? 1.5 + edge.weight * 2 : 0.6 + edge.weight * 1.2;

          return (
            <line
              key={`edge-${i}`}
              x1={s.x}
              y1={s.y}
              x2={t.x}
              y2={t.y}
              stroke={baseColor}
              strokeWidth={strokeWidth}
              strokeOpacity={opacity}
              strokeDasharray={isCascadeEdge ? 'none' : '6 4'}
              className={isCascadeEdge ? '' : 'ccg-edge-flow'}
              style={{ animationDuration: `${1.2 + (1 - edge.weight) * 1.5}s` }}
            />
          );
        })}

        {/* Nodes */}
        {layoutNodes.map((node) => {
          const isHovered = hoveredNode === node.id;
          const isSelected = selectedContextId === node.id;
          const isCascadeSource = cascade?.sourceContextId === node.id;
          const cascadeImpact = cascadeImpactMap.get(node.id);
          const isActive = isHovered || isSelected || isCascadeSource;
          const scale = isActive ? 1.1 : 1;
          const r = node.radius * scale;

          // Cascade impact opacity
          const nodeOpacity = cascade
            ? (isCascadeSource ? 1 : cascadeImpact ? 0.5 + cascadeImpact.impactScore * 0.5 : 0.15)
            : 1;

          const CategoryIcon = CATEGORY_ICONS[node.data.category || ''];

          return (
            <g
              key={node.id}
              style={{
                cursor: 'pointer',
                opacity: nodeOpacity,
                transition: 'opacity 0.4s ease',
              }}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
              onClick={() => handleNodeClick(node.id)}
            >
              {/* Selected / cascade source pulsing ring */}
              {(isSelected || isCascadeSource) && (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={r + 12}
                  fill="none"
                  stroke={isCascadeSource ? '#f59e0b' : node.color}
                  strokeWidth={1.5}
                  className="ccg-selected-ring"
                />
              )}

              {/* Cascade impact ring (size = impact score) */}
              {cascadeImpact && !isCascadeSource && (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={r + 8 + cascadeImpact.impactScore * 6}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth={1}
                  strokeOpacity={0.4 + cascadeImpact.impactScore * 0.3}
                  strokeDasharray="3 2"
                />
              )}

              {/* Outer glow */}
              <circle
                cx={node.x}
                cy={node.y}
                r={r + 6}
                fill={node.color}
                opacity={isActive ? 0.15 : 0.05}
              />

              {/* Main circle */}
              <circle
                cx={node.x}
                cy={node.y}
                r={r}
                fill={`${node.color}18`}
                stroke={node.color}
                strokeWidth={isActive || isCascadeSource ? 2.5 : 1.2}
                filter={isActive ? 'url(#ccg-glow)' : undefined}
              />

              {/* Category icon letter */}
              <text
                x={node.x}
                y={node.y + 1}
                textAnchor="middle"
                dominantBaseline="central"
                fill={node.color}
                fontSize={r * 0.6}
                fontWeight="700"
                fontFamily="system-ui, -apple-system, sans-serif"
                className="pointer-events-none"
                opacity={0.85}
              >
                {(node.data.category || 'ctx')[0].toUpperCase()}
              </text>

              {/* Ideas count badge */}
              {node.data.ideaCount > 0 && (
                <>
                  <circle
                    cx={node.x + r * 0.72}
                    cy={node.y - r * 0.72}
                    r={6}
                    fill="#111118"
                    stroke={node.color}
                    strokeWidth={0.8}
                  />
                  <text
                    x={node.x + r * 0.72}
                    y={node.y - r * 0.72 + 1}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={node.color}
                    fontSize="7"
                    fontWeight="700"
                    fontFamily="system-ui, sans-serif"
                    className="pointer-events-none"
                  >
                    {node.data.ideaCount}
                  </text>
                </>
              )}

              {/* Label */}
              {(isActive || layoutNodes.length <= 8) && (
                <text
                  x={node.x}
                  y={node.y + r + 14}
                  textAnchor="middle"
                  fill="white"
                  fontSize="10"
                  fontFamily="system-ui, -apple-system, sans-serif"
                  fontWeight="500"
                  opacity={isActive ? 1 : 0.5}
                  className="pointer-events-none"
                >
                  {truncate(node.data.name, 28)}
                </text>
              )}

              {/* Cascade impact score label */}
              {cascadeImpact && !isCascadeSource && (
                <text
                  x={node.x}
                  y={node.y + r + 24}
                  textAnchor="middle"
                  fill="#f59e0b"
                  fontSize="9"
                  fontWeight="600"
                  fontFamily="system-ui, sans-serif"
                  className="pointer-events-none"
                >
                  Impact: {Math.round(cascadeImpact.impactScore * 100)}%
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Legend (top-left) */}
      <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-x-3 gap-y-1 pointer-events-none z-10">
        {Object.entries(EDGE_TYPE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1 text-[10px] text-gray-400">
            <div
              className="w-2.5 h-2.5 rounded-full border"
              style={{ backgroundColor: `${color}30`, borderColor: color }}
            />
            <span>{EDGE_TYPE_LABELS[type as EdgeType]}</span>
          </div>
        ))}
      </div>

      {/* Stats badge (top-right) */}
      <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-3 bg-gray-800/80 backdrop-blur-sm rounded-md px-2.5 py-1.5 border border-gray-700/50 text-[10px]">
        <div className="flex items-center gap-1 text-yellow-400">
          <Network size={10} />
          <span>{graph.stats.totalNodes} contexts</span>
        </div>
        <div className="w-px h-3 bg-gray-600" />
        <div className="text-gray-400">
          {graph.stats.totalEdges} edges
        </div>
        <div className="w-px h-3 bg-gray-600" />
        <div className="text-gray-400">
          {graph.stats.isolatedCount} isolated
        </div>
      </div>

      {/* Click hint */}
      <AnimatePresence>
        {!selectedContextId && !cascade && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-10 text-[10px] text-gray-500 bg-gray-800/60 backdrop-blur-sm rounded px-2 py-1 border border-gray-700/30"
          >
            Click a context node to analyze cascade impact
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cascade Analysis Panel */}
      <AnimatePresence>
        {cascade && showCascadePanel && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="absolute bottom-0 left-0 right-0 z-20 bg-gray-900/[.97] backdrop-blur-xl border-t border-gray-700/60 overflow-y-auto"
            style={{ maxHeight: '45%' }}
          >
            <CascadePanel
              cascade={cascade}
              onClose={() => { setShowCascadePanel(false); onSelectContext(null); }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hover tooltip */}
      <AnimatePresence>
        {hoveredNode && !selectedContextId && (() => {
          const node = nodeMap.get(hoveredNode);
          if (!node) return null;
          return (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="absolute z-30 bg-gray-900/95 backdrop-blur-xl border border-gray-700/60 rounded-lg p-2.5 pointer-events-none"
              style={{
                left: Math.min(node.x + node.radius + 10, dimensions.width - 200),
                top: Math.max(node.y - 30, 10),
              }}
            >
              <p className="text-xs font-semibold text-white">{node.data.name}</p>
              <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400">
                {node.data.groupName && <span className="px-1 py-0.5 rounded text-[9px]" style={{ backgroundColor: `${node.color}20`, color: node.color }}>{node.data.groupName}</span>}
                {node.data.category && <span>{node.data.category}</span>}
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-500">
                <span>{node.data.fileCount} files</span>
                <span>{node.data.ideaCount} ideas</span>
                <span>{node.data.apiRouteCount} APIs</span>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}

// ─── Cascade Panel Sub-Component ───

function CascadePanel({
  cascade,
  onClose,
}: {
  cascade: CascadeAnalysis;
  onClose: () => void;
}) {
  const [expandedImpacts, setExpandedImpacts] = useState<Set<string>>(new Set());
  const riskConfig = RISK_COLORS[cascade.overallRisk];

  const toggleExpand = (id: string) => {
    setExpandedImpacts(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const RiskIcon = cascade.overallRisk === 'high' ? ShieldAlert : cascade.overallRisk === 'medium' ? AlertTriangle : Shield;

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${riskConfig.bg} border ${riskConfig.border}`}>
            <RiskIcon className={`w-4 h-4 ${riskConfig.text}`} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">
              Cascade Impact: {cascade.sourceContextName}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">{cascade.summary}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-gray-800 text-gray-500 hover:text-gray-300 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        <div className="bg-gray-800/50 rounded-md px-2.5 py-1.5 border border-gray-700/30">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Direct</p>
          <p className="text-sm font-semibold text-yellow-400">{cascade.directImpacts.length}</p>
        </div>
        <div className="bg-gray-800/50 rounded-md px-2.5 py-1.5 border border-gray-700/30">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Transitive</p>
          <p className="text-sm font-semibold text-amber-400">{cascade.transitiveImpacts.length}</p>
        </div>
        <div className="bg-gray-800/50 rounded-md px-2.5 py-1.5 border border-gray-700/30">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Max Depth</p>
          <p className="text-sm font-semibold text-gray-300">{cascade.maxDepth}</p>
        </div>
        <div className={`rounded-md px-2.5 py-1.5 border ${riskConfig.border} ${riskConfig.bg}`}>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Risk</p>
          <p className={`text-sm font-semibold capitalize ${riskConfig.text}`}>{cascade.overallRisk}</p>
        </div>
      </div>

      {/* Impact list */}
      {cascade.directImpacts.length + cascade.transitiveImpacts.length > 0 && (
        <div className="space-y-1">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">
            Affected Contexts ({cascade.totalAffectedContexts})
          </span>
          <div className="mt-1.5 space-y-1">
            {[...cascade.directImpacts, ...cascade.transitiveImpacts].map((impact) => {
              const isExpanded = expandedImpacts.has(impact.contextId);
              const barWidth = Math.round(impact.impactScore * 100);
              return (
                <div key={impact.contextId}>
                  <button
                    onClick={() => impact.risks.length > 0 && toggleExpand(impact.contextId)}
                    className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md bg-gray-800/40 border border-gray-700/30 hover:border-gray-600/50 transition-colors text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-200 font-medium truncate">{impact.contextName}</span>
                        <span className="text-[10px] text-gray-600">depth {impact.depth}</span>
                        <span className="text-[10px] text-gray-600">{impact.relationship}</span>
                      </div>
                      {/* Impact bar */}
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${barWidth}%`,
                              backgroundColor: barWidth > 60 ? '#ef4444' : barWidth > 30 ? '#f59e0b' : '#10b981',
                            }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-400 w-8 text-right">{barWidth}%</span>
                      </div>
                    </div>
                    {impact.risks.length > 0 && (
                      isExpanded
                        ? <ChevronUp className="w-3 h-3 text-gray-600 flex-shrink-0" />
                        : <ChevronDown className="w-3 h-3 text-gray-600 flex-shrink-0" />
                    )}
                  </button>
                  <AnimatePresence>
                    {isExpanded && impact.risks.length > 0 && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden ml-4"
                      >
                        <div className="py-1 space-y-0.5">
                          {impact.risks.map((risk, ri) => (
                            <p key={ri} className="text-[10px] text-amber-400/70 flex items-center gap-1">
                              <AlertTriangle className="w-2.5 h-2.5 flex-shrink-0" />
                              {risk}
                            </p>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p className="text-[9px] text-gray-600 mt-3 text-right">
        press Esc to dismiss
      </p>
    </div>
  );
}
