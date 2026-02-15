'use client';

import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Link2,
  Unlink2,
  ChevronDown,
  ChevronUp,
  Zap,
  Target,
} from 'lucide-react';
import type { ExecutiveAIInsight } from '@/app/db/models/reflector.types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TYPE_COLORS: Record<string, string> = {
  pattern: '#3b82f6',
  anomaly: '#f59e0b',
  opportunity: '#10b981',
  warning: '#ef4444',
  recommendation: '#a855f7',
};

const TYPE_LABELS: Record<string, string> = {
  pattern: 'Pattern',
  anomaly: 'Anomaly',
  opportunity: 'Opportunity',
  warning: 'Warning',
  recommendation: 'Recommendation',
};

const TYPE_ICONS: Record<string, string> = {
  pattern: 'P',
  anomaly: 'A',
  opportunity: 'O',
  warning: 'W',
  recommendation: 'R',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GraphNode {
  id: number;
  insight: ExecutiveAIInsight;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
}

interface GraphEdge {
  source: number;
  target: number;
  weight: number;
  reinforcing: boolean;
}

interface EvidenceSubNode {
  id: string;
  index: number;
  text: string;
  x: number;
  y: number;
}

interface InsightNetworkGraphProps {
  insights: ExecutiveAIInsight[];
  onSelectInsight?: (insight: ExecutiveAIInsight | null) => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Evidence overlap (Jaccard similarity)
// ---------------------------------------------------------------------------

function calculateOverlap(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a.map((s) => s.toLowerCase().trim()));
  const setB = new Set(b.map((s) => s.toLowerCase().trim()));
  let shared = 0;
  for (const item of setA) {
    if (setB.has(item)) shared++;
  }
  const union = new Set([...setA, ...setB]).size;
  return union > 0 ? shared / union : 0;
}

// ---------------------------------------------------------------------------
// Force-directed layout (Verlet integration, 150 iterations)
// ---------------------------------------------------------------------------

function runForceLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  width: number,
  height: number,
): void {
  const cx = width / 2;
  const cy = height / 2;
  const n = nodes.length;
  if (n === 0) return;

  // Golden-angle spiral initialization for better spread
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const initRadius = Math.min(width, height) * 0.28;
  nodes.forEach((node, i) => {
    const angle = i * goldenAngle;
    const r = initRadius * Math.sqrt((i + 1) / n);
    node.x = cx + r * Math.cos(angle);
    node.y = cy + r * Math.sin(angle);
    node.vx = 0;
    node.vy = 0;
  });

  const iterations = 150;
  let temperature = 0.15;
  const cooling = 0.97;

  for (let iter = 0; iter < iterations; iter++) {
    // Reset velocities each iteration
    for (const node of nodes) {
      node.vx = 0;
      node.vy = 0;
    }

    // Coulomb repulsion between all pairs
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = nodes[j].x - nodes[i].x;
        const dy = nodes[j].y - nodes[i].y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq) || 1;
        const minDist = nodes[i].radius + nodes[j].radius + 50;
        const repulsion = (minDist * minDist) / distSq;
        const fx = (dx / dist) * repulsion;
        const fy = (dy / dist) * repulsion;
        nodes[i].vx -= fx;
        nodes[i].vy -= fy;
        nodes[j].vx += fx;
        nodes[j].vy += fy;
      }
    }

    // Hooke spring attraction along edges
    for (const edge of edges) {
      const s = nodes[edge.source];
      const t = nodes[edge.target];
      const dx = t.x - s.x;
      const dy = t.y - s.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const idealDist = 110 - edge.weight * 35;
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

    // Apply forces capped by temperature
    for (const node of nodes) {
      const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy) || 1;
      const capped = Math.min(speed, 18);
      node.x += (node.vx / speed) * capped * temperature;
      node.y += (node.vy / speed) * capped * temperature;
    }

    temperature *= cooling;
  }

  // Clamp to bounds
  const pad = 45;
  for (const node of nodes) {
    node.x = Math.max(node.radius + pad, Math.min(width - node.radius - pad, node.x));
    node.y = Math.max(node.radius + pad, Math.min(height - node.radius - pad, node.y));
  }
}

// ---------------------------------------------------------------------------
// Evidence sub-node layout
// ---------------------------------------------------------------------------

function layoutEvidenceNodes(
  parent: GraphNode,
  width: number,
  height: number,
): EvidenceSubNode[] {
  const evidence = parent.insight.evidence;
  if (evidence.length === 0) return [];

  const baseRadius = Math.min(width, height) * 0.2;
  const count = evidence.length;
  const angleStep = (2 * Math.PI) / count;
  const startAngle = -Math.PI / 2;

  return evidence.map((text, i) => {
    const angle = startAngle + i * angleStep;
    // Stagger radii slightly for visual interest
    const r = baseRadius + (i % 2 === 0 ? 0 : 18);
    const rawX = parent.x + r * Math.cos(angle);
    const rawY = parent.y + r * Math.sin(angle);
    // Clamp within canvas bounds
    const margin = 50;
    const x = Math.max(margin, Math.min(width - margin, rawX));
    const y = Math.max(margin, Math.min(height - margin, rawY));
    return {
      id: `ev-${i}`,
      index: i,
      text,
      x,
      y,
    };
  });
}

// ---------------------------------------------------------------------------
// Inline CSS keyframe styles (injected once via <style> in SVG defs)
// ---------------------------------------------------------------------------

const SVG_STYLES = `
  @keyframes ing-pulse-ring {
    0%, 100% { stroke-opacity: 0.15; }
    50% { stroke-opacity: 0.45; }
  }
  @keyframes ing-dash-flow {
    to { stroke-dashoffset: -20; }
  }
  .ing-actionable-ring {
    animation: ing-pulse-ring 2.4s ease-in-out infinite;
  }
  .ing-edge-flow {
    animation: ing-dash-flow 1.6s linear infinite;
  }
`;

// ---------------------------------------------------------------------------
// Truncation helper
// ---------------------------------------------------------------------------

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 3) + '...' : text;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function InsightNetworkGraph({
  insights,
  onSelectInsight,
  className = '',
}: InsightNetworkGraphProps) {
  const [hoveredNode, setHoveredNode] = useState<number | null>(null);
  const [selectedNode, setSelectedNode] = useState<number | null>(null);
  const [drillDownNode, setDrillDownNode] = useState<number | null>(null);
  const [expandedEvidence, setExpandedEvidence] = useState<Set<number>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });

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

  // Build graph data
  const { nodes, edges } = useMemo(() => {
    const graphNodes: GraphNode[] = insights.map((insight, i) => ({
      id: i,
      insight,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      radius: 16 + (insight.confidence / 100) * 18,
      color: TYPE_COLORS[insight.type] || '#6b7280',
    }));

    const graphEdges: GraphEdge[] = [];
    for (let i = 0; i < insights.length; i++) {
      for (let j = i + 1; j < insights.length; j++) {
        const overlap = calculateOverlap(insights[i].evidence, insights[j].evidence);
        if (overlap > 0.05) {
          graphEdges.push({
            source: i,
            target: j,
            weight: overlap,
            reinforcing: insights[i].type === insights[j].type,
          });
        }
      }
    }

    if (graphNodes.length > 0) {
      runForceLayout(graphNodes, graphEdges, dimensions.width, dimensions.height);
    }

    return { nodes: graphNodes, edges: graphEdges };
  }, [insights, dimensions]);

  // Connection summary
  const { reinforcingCount, conflictingCount } = useMemo(() => {
    let r = 0;
    let c = 0;
    for (const edge of edges) {
      if (edge.reinforcing) r++;
      else c++;
    }
    return { reinforcingCount: r, conflictingCount: c };
  }, [edges]);

  // Evidence sub-nodes for drill-down
  const evidenceNodes = useMemo(() => {
    if (drillDownNode === null || !nodes[drillDownNode]) return [];
    return layoutEvidenceNodes(nodes[drillDownNode], dimensions.width, dimensions.height);
  }, [drillDownNode, nodes, dimensions]);

  const isDrillDown = drillDownNode !== null;
  const drillNode = isDrillDown ? nodes[drillDownNode] : null;

  // -- Handlers --

  const handleNodeClick = useCallback(
    (idx: number) => {
      if (isDrillDown) return;
      const next = selectedNode === idx ? null : idx;
      setSelectedNode(next);
      onSelectInsight?.(next !== null ? nodes[next].insight : null);
    },
    [selectedNode, nodes, onSelectInsight, isDrillDown],
  );

  const handleDrillDown = useCallback(
    (idx: number) => {
      if (isDrillDown) return;
      setDrillDownNode(idx);
      setSelectedNode(null);
      setExpandedEvidence(new Set());
      onSelectInsight?.(nodes[idx].insight);
    },
    [nodes, onSelectInsight, isDrillDown],
  );

  const handleExitDrillDown = useCallback(() => {
    setDrillDownNode(null);
    setExpandedEvidence(new Set());
    setSelectedNode(null);
    onSelectInsight?.(null);
  }, [onSelectInsight]);

  const toggleEvidenceExpand = useCallback((evidenceIdx: number) => {
    setExpandedEvidence((prev) => {
      const next = new Set(prev);
      if (next.has(evidenceIdx)) next.delete(evidenceIdx);
      else next.add(evidenceIdx);
      return next;
    });
  }, []);

  // Escape key to exit drill-down
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && drillDownNode !== null) {
        handleExitDrillDown();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drillDownNode, handleExitDrillDown]);

  // Empty state
  if (insights.length === 0) {
    return (
      <div
        className={`flex items-center justify-center h-full text-gray-500 text-sm ${className}`}
      >
        Run an AI analysis to see insight relationships
      </div>
    );
  }

  const svgHeight = dimensions.height;

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full min-h-[300px] bg-gray-900 rounded-lg overflow-hidden ${className}`}
    >
      {/* ================================================================ */}
      {/* SVG Graph                                                        */}
      {/* ================================================================ */}
      <svg
        width={dimensions.width}
        height={svgHeight}
        className="select-none absolute inset-0"
        style={{ display: 'block' }}
      >
        <defs>
          {/* Inject CSS animations */}
          <style>{SVG_STYLES}</style>

          {/* Background radial glow */}
          <radialGradient id="ing-bg-glow" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="rgba(6,182,212,0.06)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>

          {/* Per-type glow filters */}
          {Object.entries(TYPE_COLORS).map(([type, color]) => (
            <filter
              key={type}
              id={`ing-glow-${type}`}
              x="-80%"
              y="-80%"
              width="260%"
              height="260%"
            >
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feFlood floodColor={color} floodOpacity="0.5" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          ))}

          {/* Evidence node soft glow */}
          <filter
            id="ing-ev-glow"
            x="-100%"
            y="-100%"
            width="300%"
            height="300%"
          >
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background */}
        <rect
          width={dimensions.width}
          height={svgHeight}
          fill="#111118"
        />
        <rect
          width={dimensions.width}
          height={svgHeight}
          fill="url(#ing-bg-glow)"
        />

        {/* ============================================================= */}
        {/* NORMAL MODE: Edges                                             */}
        {/* ============================================================= */}
        {!isDrillDown &&
          edges.map((edge, i) => {
            const s = nodes[edge.source];
            const t = nodes[edge.target];
            const isHighlighted =
              hoveredNode === edge.source ||
              hoveredNode === edge.target ||
              selectedNode === edge.source ||
              selectedNode === edge.target;

            const baseColor = edge.reinforcing
              ? 'rgba(34,197,94,0.3)'
              : 'rgba(251,146,60,0.3)';
            const activeColor = edge.reinforcing
              ? 'rgba(34,197,94,0.65)'
              : 'rgba(251,146,60,0.65)';

            return (
              <line
                key={`edge-${i}`}
                x1={s.x}
                y1={s.y}
                x2={t.x}
                y2={t.y}
                stroke={isHighlighted ? activeColor : baseColor}
                strokeWidth={
                  isHighlighted
                    ? 1.5 + edge.weight * 2.5
                    : 0.6 + edge.weight * 1.4
                }
                strokeDasharray="6 4"
                className="ing-edge-flow"
                style={{
                  animationDuration: `${1.2 + (1 - edge.weight) * 1.5}s`,
                }}
              />
            );
          })}

        {/* ============================================================= */}
        {/* DRILL-DOWN MODE: Lines from parent to evidence sub-nodes       */}
        {/* ============================================================= */}
        {isDrillDown &&
          drillNode &&
          evidenceNodes.map((ev, i) => (
            <motion.line
              key={`drill-line-${i}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              transition={{ duration: 0.4, delay: 0.1 + i * 0.05 }}
              x1={drillNode.x}
              y1={drillNode.y}
              x2={ev.x}
              y2={ev.y}
              stroke={drillNode.color}
              strokeWidth={1.2}
              strokeDasharray="4 3"
              className="ing-edge-flow"
              style={{ animationDuration: '2s' }}
            />
          ))}

        {/* ============================================================= */}
        {/* Nodes (all modes -- faded when not drill target)               */}
        {/* ============================================================= */}
        {nodes.map((node) => {
          const isHovered = hoveredNode === node.id;
          const isSelected = selectedNode === node.id;
          const isActive = isHovered || isSelected;
          const isDrillTarget = drillDownNode === node.id;
          const scale = isActive && !isDrillDown ? 1.12 : 1;
          const r = node.radius * scale;

          // In drill-down only the drilled node stays visible
          const groupOpacity = isDrillDown
            ? isDrillTarget
              ? 1
              : 0.1
            : 1;

          return (
            <g
              key={node.id}
              style={{
                cursor: isDrillDown ? 'default' : 'pointer',
                opacity: groupOpacity,
                transition: 'opacity 0.4s ease',
              }}
              onMouseEnter={() => !isDrillDown && setHoveredNode(node.id)}
              onMouseLeave={() => !isDrillDown && setHoveredNode(null)}
              onClick={() => handleNodeClick(node.id)}
              onDoubleClick={() => handleDrillDown(node.id)}
            >
              {/* Actionable pulsing outer ring */}
              {node.insight.actionable && !isDrillDown && (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={r + 11}
                  fill="none"
                  stroke={node.color}
                  strokeWidth={1.5}
                  className="ing-actionable-ring"
                />
              )}

              {/* Outer glow */}
              <circle
                cx={node.x}
                cy={node.y}
                r={r + 7}
                fill={node.color}
                opacity={isActive ? 0.18 : 0.06}
              />

              {/* Main circle */}
              <circle
                cx={node.x}
                cy={node.y}
                r={r}
                fill={`${node.color}18`}
                stroke={node.color}
                strokeWidth={isActive || isDrillTarget ? 2.5 : 1.2}
                filter={
                  isActive || isDrillTarget
                    ? `url(#ing-glow-${node.insight.type})`
                    : undefined
                }
              />

              {/* Confidence arc */}
              <circle
                cx={node.x}
                cy={node.y}
                r={r}
                fill="none"
                stroke={node.color}
                strokeWidth={2.5}
                strokeDasharray={`${(node.insight.confidence / 100) * 2 * Math.PI * r} ${2 * Math.PI * r}`}
                strokeLinecap="round"
                opacity={0.55}
                transform={`rotate(-90 ${node.x} ${node.y})`}
              />

              {/* Type icon letter inside node */}
              <text
                x={node.x}
                y={node.y + 1}
                textAnchor="middle"
                dominantBaseline="central"
                fill={node.color}
                fontSize={r * 0.72}
                fontWeight="700"
                fontFamily="system-ui, -apple-system, sans-serif"
                className="pointer-events-none"
                opacity={0.9}
              >
                {TYPE_ICONS[node.insight.type] || '?'}
              </text>

              {/* Actionable dot */}
              {node.insight.actionable && (
                <circle
                  cx={node.x + r * 0.7}
                  cy={node.y - r * 0.7}
                  r={4}
                  fill="#10b981"
                  stroke="#064e3b"
                  strokeWidth={0.8}
                />
              )}

              {/* Label (visible on hover / select / few nodes / drill target) */}
              {(isActive || isDrillTarget || nodes.length <= 5) && (
                <text
                  x={node.x}
                  y={node.y + r + 16}
                  textAnchor="middle"
                  fill="white"
                  fontSize="10"
                  fontFamily="system-ui, -apple-system, sans-serif"
                  fontWeight="500"
                  opacity={isActive || isDrillTarget ? 1 : 0.5}
                  className="pointer-events-none"
                >
                  {truncate(node.insight.title, 34)}
                </text>
              )}
            </g>
          );
        })}

        {/* ============================================================= */}
        {/* DRILL-DOWN: Evidence sub-nodes                                 */}
        {/* ============================================================= */}
        {isDrillDown &&
          drillNode &&
          evidenceNodes.map((ev, i) => {
            const subR = 8;
            return (
              <motion.g
                key={ev.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  type: 'spring',
                  stiffness: 260,
                  damping: 20,
                  delay: 0.2 + i * 0.06,
                }}
                style={{ cursor: 'pointer' }}
                onClick={() => toggleEvidenceExpand(i)}
              >
                {/* Outer glow */}
                <circle
                  cx={ev.x}
                  cy={ev.y}
                  r={subR + 4}
                  fill={drillNode.color}
                  opacity={0.12}
                />
                {/* Body */}
                <circle
                  cx={ev.x}
                  cy={ev.y}
                  r={subR}
                  fill={`${drillNode.color}20`}
                  stroke={drillNode.color}
                  strokeWidth={1.2}
                  filter="url(#ing-ev-glow)"
                />
                {/* Index */}
                <text
                  x={ev.x}
                  y={ev.y + 1}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={drillNode.color}
                  fontSize="8"
                  fontWeight="700"
                  fontFamily="system-ui, sans-serif"
                  className="pointer-events-none"
                >
                  {i + 1}
                </text>
                {/* Truncated evidence text */}
                <text
                  x={ev.x}
                  y={ev.y + subR + 13}
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.6)"
                  fontSize="9"
                  fontFamily="system-ui, sans-serif"
                  className="pointer-events-none"
                >
                  {truncate(ev.text, 42)}
                </text>
              </motion.g>
            );
          })}
      </svg>

      {/* ================================================================ */}
      {/* HTML Overlays                                                     */}
      {/* ================================================================ */}

      {/* Top-left: Legend */}
      <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-x-3 gap-y-1 pointer-events-none z-10">
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <div
            key={type}
            className="flex items-center gap-1 text-[10px] text-gray-400"
          >
            <div
              className="w-2.5 h-2.5 rounded-full border"
              style={{
                backgroundColor: `${color}30`,
                borderColor: color,
              }}
            />
            <span>{TYPE_LABELS[type]}</span>
          </div>
        ))}
      </div>

      {/* Top-right: Connection summary badge */}
      {edges.length > 0 && !isDrillDown && (
        <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-2 bg-gray-800/80 backdrop-blur-sm rounded-md px-2.5 py-1.5 border border-gray-700/50 text-[10px]">
          <div className="flex items-center gap-1 text-green-400">
            <Link2 size={10} />
            <span>{reinforcingCount} reinforcing</span>
          </div>
          <div className="w-px h-3 bg-gray-600" />
          <div className="flex items-center gap-1 text-orange-400">
            <Unlink2 size={10} />
            <span>{conflictingCount} conflicting</span>
          </div>
        </div>
      )}

      {/* Drill-down Back button */}
      <AnimatePresence>
        {isDrillDown && (
          <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            onClick={handleExitDrillDown}
            className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5 bg-gray-800/90 hover:bg-gray-700/90 backdrop-blur-sm text-gray-300 hover:text-white text-xs px-3 py-1.5 rounded-md border border-gray-600/50 transition-colors cursor-pointer"
          >
            <ArrowLeft size={12} />
            Back to graph
          </motion.button>
        )}
      </AnimatePresence>

      {/* Double-click hint */}
      <AnimatePresence>
        {selectedNode !== null && !isDrillDown && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-10 right-2.5 z-10 text-[10px] text-gray-500 bg-gray-800/60 backdrop-blur-sm rounded px-2 py-1 border border-gray-700/30"
          >
            Double-click node to drill down
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================================================================ */}
      {/* NORMAL MODE: Selected insight quick info                          */}
      {/* ================================================================ */}
      <AnimatePresence>
        {selectedNode !== null && !isDrillDown && nodes[selectedNode] && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="absolute bottom-2 left-2 right-2 z-20 bg-gray-900/95 backdrop-blur-xl border border-gray-700/60 rounded-lg p-3 max-w-lg"
          >
            <div className="flex items-start gap-2.5">
              <div
                className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 border"
                style={{
                  backgroundColor: `${nodes[selectedNode].color}40`,
                  borderColor: nodes[selectedNode].color,
                }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white leading-snug">
                  {nodes[selectedNode].insight.title}
                </p>
                <p className="text-[10px] text-gray-400 mt-1 line-clamp-2">
                  {nodes[selectedNode].insight.description}
                </p>
                <div className="flex items-center gap-3 mt-2 text-[10px]">
                  <span className="text-gray-500">
                    Confidence:{' '}
                    <span className="text-gray-300">
                      {nodes[selectedNode].insight.confidence}%
                    </span>
                  </span>
                  <span className="text-gray-500">
                    Evidence:{' '}
                    <span className="text-gray-300">
                      {nodes[selectedNode].insight.evidence.length} points
                    </span>
                  </span>
                  {nodes[selectedNode].insight.actionable && (
                    <span className="flex items-center gap-0.5 text-emerald-400">
                      <Zap size={9} /> Actionable
                    </span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================================================================ */}
      {/* DRILL-DOWN MODE: Evidence detail panel                           */}
      {/* ================================================================ */}
      <AnimatePresence>
        {isDrillDown && drillNode && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
            className="absolute bottom-0 left-0 right-0 z-20 bg-gray-900/[.97] backdrop-blur-xl border-t border-gray-700/60 overflow-y-auto"
            style={{ maxHeight: `${Math.min(45, 60)}%` }}
          >
            <div className="p-4">
              {/* Header */}
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border"
                  style={{
                    backgroundColor: `${drillNode.color}18`,
                    borderColor: `${drillNode.color}50`,
                  }}
                >
                  <span
                    className="text-sm font-bold"
                    style={{ color: drillNode.color }}
                  >
                    {TYPE_ICONS[drillNode.insight.type]}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-white">
                      {drillNode.insight.title}
                    </h3>
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full border flex-shrink-0"
                      style={{
                        color: drillNode.color,
                        borderColor: `${drillNode.color}40`,
                        backgroundColor: `${drillNode.color}10`,
                      }}
                    >
                      {TYPE_LABELS[drillNode.insight.type]}
                    </span>
                    {drillNode.insight.actionable && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 flex-shrink-0 flex items-center gap-0.5">
                        <Zap size={8} /> Actionable
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                    {drillNode.insight.description}
                  </p>
                </div>
              </div>

              {/* Confidence meter */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">
                    Confidence
                  </span>
                  <span
                    className="text-xs font-semibold"
                    style={{ color: drillNode.color }}
                  >
                    {drillNode.insight.confidence}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: drillNode.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${drillNode.insight.confidence}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
                  />
                </div>
              </div>

              {/* Evidence cards */}
              {drillNode.insight.evidence.length > 0 && (
                <div className="mb-3">
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">
                    Evidence ({drillNode.insight.evidence.length})
                  </span>
                  <div className="mt-1.5 space-y-1.5">
                    {drillNode.insight.evidence.map((ev, i) => {
                      const isExpanded = expandedEvidence.has(i);
                      const isLong = ev.length > 80;
                      return (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.15 + i * 0.05 }}
                          className={`bg-gray-800/60 border border-gray-700/40 rounded-md px-3 py-2 transition-colors ${
                            isLong
                              ? 'cursor-pointer hover:border-gray-600/60'
                              : ''
                          }`}
                          onClick={() => isLong && toggleEvidenceExpand(i)}
                        >
                          <div className="flex items-start gap-2">
                            <span
                              className="text-[10px] font-mono font-bold mt-0.5 flex-shrink-0"
                              style={{ color: drillNode.color }}
                            >
                              {String(i + 1).padStart(2, '0')}
                            </span>
                            <p
                              className={`text-xs text-gray-300 leading-relaxed flex-1 ${
                                !isExpanded && isLong ? 'line-clamp-1' : ''
                              }`}
                            >
                              {ev}
                            </p>
                            {isLong && (
                              <span className="flex-shrink-0 text-gray-500 mt-0.5">
                                {isExpanded ? (
                                  <ChevronUp size={12} />
                                ) : (
                                  <ChevronDown size={12} />
                                )}
                              </span>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Suggested action */}
              {drillNode.insight.suggestedAction && (
                <div className="bg-gray-800/40 border border-gray-700/30 rounded-md px-3 py-2.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Target size={10} className="text-gray-400" />
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">
                      Suggested Action
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    {drillNode.insight.suggestedAction}
                  </p>
                </div>
              )}

              {/* Dismiss hint */}
              <p className="text-[9px] text-gray-600 mt-3 text-right">
                press Esc or click &quot;Back to graph&quot; to return
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
