'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react';
import type { InsightWithMeta } from '@/app/db/models/brain.types';

// ── Types ───────────────────────────────────────────────────────────────────

interface CausalInsightGraphProps {
  insights: InsightWithMeta[];
  onViewLineage?: (insight: InsightWithMeta) => void;
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  insight: InsightWithMeta;
  reflectionCycle: number; // index of reflection cycle for time-scrubber
}

interface GraphEdge extends d3.SimulationLinkDatum<GraphNode> {
  id: string;
  type: 'evolves' | 'conflict' | 'evidence';
  label: string;
  sourceInsight: InsightWithMeta;
  targetInsight: InsightWithMeta;
}

interface EdgeDetail {
  edge: GraphEdge;
  position: { x: number; y: number };
}

// ── Colors ──────────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  preference_learned: '#22d3ee', // cyan
  pattern_detected: '#a855f7',  // purple
  warning: '#f59e0b',           // amber
  recommendation: '#10b981',    // green
  best_practice: '#34d399',     // emerald
};

const EDGE_COLORS: Record<string, string> = {
  evolves: '#a855f7',   // purple
  conflict: '#ef4444',  // red
  evidence: '#3b82f6',  // blue
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function buildGraph(insights: InsightWithMeta[]): { nodes: GraphNode[]; edges: GraphEdge[] } {
  // Map reflectionIds to cycle indices (ordered by time)
  const reflectionIds = [...new Set(insights.map(i => i.reflection_id))];
  const reflectionIndex = new Map(reflectionIds.map((id, idx) => [id, idx]));

  const titleToInsight = new Map<string, InsightWithMeta>();
  for (const i of insights) {
    titleToInsight.set(i.title, i);
  }

  const nodes: GraphNode[] = insights.map(i => ({
    id: i.id,
    insight: i,
    reflectionCycle: reflectionIndex.get(i.reflection_id) ?? 0,
  }));

  const edges: GraphEdge[] = [];
  const edgeSet = new Set<string>();

  for (const insight of insights) {
    // Evolves-from edges
    if (insight.evolves) {
      const parent = titleToInsight.get(insight.evolves);
      if (parent) {
        const eid = `evolves:${parent.id}->${insight.id}`;
        if (!edgeSet.has(eid)) {
          edgeSet.add(eid);
          edges.push({
            id: eid,
            source: parent.id,
            target: insight.id,
            type: 'evolves',
            label: 'evolved from',
            sourceInsight: parent,
            targetInsight: insight,
          });
        }
      }
    }

    // Conflict edges
    if (insight.conflict_with) {
      const other = titleToInsight.get(insight.conflict_with);
      if (other) {
        const ids = [insight.id, other.id].sort();
        const eid = `conflict:${ids[0]}<->${ids[1]}`;
        if (!edgeSet.has(eid)) {
          edgeSet.add(eid);
          edges.push({
            id: eid,
            source: insight.id,
            target: other.id,
            type: 'conflict',
            label: `conflict (${insight.conflict_type ?? 'unknown'})`,
            sourceInsight: insight,
            targetInsight: other,
          });
        }
      }
    }

    // Evidence-shared edges (insights sharing evidence refs)
    if (insight.evidence.length > 0) {
      for (const otherInsight of insights) {
        if (otherInsight.id === insight.id) continue;
        const shared = insight.evidence.filter(e =>
          otherInsight.evidence.some(oe => oe.id === e.id && oe.type === e.type)
        );
        if (shared.length > 0) {
          const ids = [insight.id, otherInsight.id].sort();
          const eid = `evidence:${ids[0]}<->${ids[1]}`;
          if (!edgeSet.has(eid)) {
            edgeSet.add(eid);
            edges.push({
              id: eid,
              source: insight.id,
              target: otherInsight.id,
              type: 'evidence',
              label: `${shared.length} shared evidence`,
              sourceInsight: insight,
              targetInsight: otherInsight,
            });
          }
        }
      }
    }
  }

  return { nodes, edges };
}

function getNodeRadius(insight: InsightWithMeta): number {
  return Math.max(6, Math.min(16, 6 + insight.confidence / 15));
}

// ── Component ───────────────────────────────────────────────────────────────

export default function CausalInsightGraph({ insights, onViewLineage }: CausalInsightGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphEdge> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const [selectedEdge, setSelectedEdge] = useState<EdgeDetail | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Time-scrubber state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentCycle, setCurrentCycle] = useState<number>(-1); // -1 = show all
  const playTimerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const { nodes, edges } = useMemo(() => buildGraph(insights), [insights]);

  const reflectionCycles = useMemo(() => {
    const cycles = [...new Set(nodes.map(n => n.reflectionCycle))].sort((a, b) => a - b);
    return cycles;
  }, [nodes]);

  const maxCycle = reflectionCycles.length > 0 ? reflectionCycles[reflectionCycles.length - 1] : 0;

  // Filtered nodes/edges based on time-scrubber
  const visibleNodes = useMemo(() => {
    if (currentCycle === -1) return nodes;
    return nodes.filter(n => n.reflectionCycle <= currentCycle);
  }, [nodes, currentCycle]);

  const visibleNodeIds = useMemo(() => new Set(visibleNodes.map(n => n.id)), [visibleNodes]);

  const visibleEdges = useMemo(() => {
    return edges.filter(e => {
      const srcId = typeof e.source === 'string' ? e.source : (e.source as GraphNode).id;
      const tgtId = typeof e.target === 'string' ? e.target : (e.target as GraphNode).id;
      return visibleNodeIds.has(srcId) && visibleNodeIds.has(tgtId);
    });
  }, [edges, visibleNodeIds]);

  // Container resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 100 && height > 100) {
        setDimensions({ width, height });
      }
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  // Playback timer
  useEffect(() => {
    if (isPlaying) {
      playTimerRef.current = setInterval(() => {
        setCurrentCycle(prev => {
          const next = prev + 1;
          if (next > maxCycle) {
            setIsPlaying(false);
            return maxCycle;
          }
          return next;
        });
      }, 1200);
    }
    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [isPlaying, maxCycle]);

  // D3 force simulation
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || visibleNodes.length === 0) return;

    const { width, height } = dimensions;

    // Clear previous
    d3.select(svg).selectAll('*').remove();

    const svgSel = d3.select(svg);
    const g = svgSel.append('g');

    // Zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svgSel.call(zoom);
    zoomRef.current = zoom;

    // Arrow markers
    const defs = svgSel.append('defs');
    for (const [type, color] of Object.entries(EDGE_COLORS)) {
      defs.append('marker')
        .attr('id', `arrow-${type}`)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 20)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', color)
        .attr('opacity', 0.6);
    }

    // Use copies so D3 mutation doesn't break React state
    const simNodes: GraphNode[] = visibleNodes.map(n => ({ ...n }));
    const simEdges: GraphEdge[] = visibleEdges.map(e => ({
      ...e,
      source: typeof e.source === 'string' ? e.source : (e.source as GraphNode).id,
      target: typeof e.target === 'string' ? e.target : (e.target as GraphNode).id,
    }));

    // Force simulation
    const simulation = d3.forceSimulation<GraphNode>(simNodes)
      .force('link', d3.forceLink<GraphNode, GraphEdge>(simEdges).id(d => d.id).distance(100).strength(0.4))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide<GraphNode>().radius(d => getNodeRadius(d.insight) + 8));

    simulationRef.current = simulation;

    // Edges
    const link = g.append('g')
      .selectAll('line')
      .data(simEdges)
      .join('line')
      .attr('stroke', d => EDGE_COLORS[d.type] || '#555')
      .attr('stroke-width', d => d.type === 'conflict' ? 2 : 1.5)
      .attr('stroke-opacity', 0.5)
      .attr('stroke-dasharray', d => d.type === 'conflict' ? '4,3' : d.type === 'evidence' ? '2,2' : 'none')
      .attr('marker-end', d => d.type === 'evolves' ? `url(#arrow-${d.type})` : null)
      .style('cursor', 'pointer')
      .on('click', function (_event, d) {
        const srcNode = d.source as GraphNode;
        const tgtNode = d.target as GraphNode;
        const midX = ((srcNode.x ?? 0) + (tgtNode.x ?? 0)) / 2;
        const midY = ((srcNode.y ?? 0) + (tgtNode.y ?? 0)) / 2;
        setSelectedEdge({
          edge: d,
          position: { x: midX, y: midY },
        });
      })
      .on('mouseenter', function () {
        d3.select(this).attr('stroke-opacity', 0.9).attr('stroke-width', 3);
      })
      .on('mouseleave', function (_, d) {
        d3.select(this).attr('stroke-opacity', 0.5).attr('stroke-width', d.type === 'conflict' ? 2 : 1.5);
      });

    // Nodes
    const node = g.append('g')
      .selectAll<SVGCircleElement, GraphNode>('circle')
      .data(simNodes)
      .join('circle')
      .attr('r', d => getNodeRadius(d.insight))
      .attr('fill', d => TYPE_COLORS[d.insight.type] || '#888')
      .attr('fill-opacity', d => d.insight.auto_pruned ? 0.3 : 0.8)
      .attr('stroke', d => d.insight.conflict_with && !d.insight.conflict_resolved ? '#ef4444' : 'rgba(255,255,255,0.15)')
      .attr('stroke-width', d => d.insight.conflict_with && !d.insight.conflict_resolved ? 2 : 1)
      .style('cursor', 'pointer')
      .on('mouseenter', function (_, d) {
        setHoveredNode(d.id);
        d3.select(this).attr('fill-opacity', 1).attr('stroke-width', 2.5);
      })
      .on('mouseleave', function (_, d) {
        setHoveredNode(null);
        d3.select(this)
          .attr('fill-opacity', d.insight.auto_pruned ? 0.3 : 0.8)
          .attr('stroke-width', d.insight.conflict_with && !d.insight.conflict_resolved ? 2 : 1);
      })
      .on('click', (_, d) => {
        if (onViewLineage) onViewLineage(d.insight);
      });

    // Labels
    const label = g.append('g')
      .selectAll<SVGTextElement, GraphNode>('text')
      .data(simNodes)
      .join('text')
      .text(d => d.insight.title.length > 24 ? d.insight.title.slice(0, 22) + '...' : d.insight.title)
      .attr('font-size', '10px')
      .attr('fill', '#a1a1aa')
      .attr('text-anchor', 'middle')
      .attr('dy', d => getNodeRadius(d.insight) + 14)
      .style('pointer-events', 'none')
      .style('font-family', 'monospace');

    // Drag behavior
    const drag = d3.drag<SVGCircleElement, GraphNode>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    node.call(drag);

    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as GraphNode).x ?? 0)
        .attr('y1', d => (d.source as GraphNode).y ?? 0)
        .attr('x2', d => (d.target as GraphNode).x ?? 0)
        .attr('y2', d => (d.target as GraphNode).y ?? 0);

      node
        .attr('cx', d => d.x ?? 0)
        .attr('cy', d => d.y ?? 0);

      label
        .attr('x', d => d.x ?? 0)
        .attr('y', d => d.y ?? 0);
    });

    return () => {
      simulation.stop();
    };
  }, [visibleNodes, visibleEdges, dimensions, onViewLineage]);

  // Zoom controls
  const handleZoom = useCallback((factor: number) => {
    const svg = svgRef.current;
    if (!svg || !zoomRef.current) return;
    const sel = d3.select(svg);
    sel.transition().duration(300).call(
      zoomRef.current.scaleBy, factor
    );
  }, []);

  const handleFitView = useCallback(() => {
    const svg = svgRef.current;
    if (!svg || !zoomRef.current) return;
    const sel = d3.select(svg);
    sel.transition().duration(500).call(
      zoomRef.current.transform,
      d3.zoomIdentity.translate(dimensions.width / 2, dimensions.height / 2).scale(0.8).translate(-dimensions.width / 2, -dimensions.height / 2)
    );
  }, [dimensions]);

  // Time controls
  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      if (currentCycle >= maxCycle) setCurrentCycle(-1);
      setCurrentCycle(prev => (prev === -1 ? 0 : prev));
      setIsPlaying(true);
    }
  }, [isPlaying, currentCycle, maxCycle]);

  const handleStepBack = useCallback(() => {
    setIsPlaying(false);
    setCurrentCycle(prev => Math.max(-1, prev - 1));
  }, []);

  const handleStepForward = useCallback(() => {
    setIsPlaying(false);
    setCurrentCycle(prev => Math.min(maxCycle, prev + 1));
  }, [maxCycle]);

  // Hovered node tooltip data
  const hoveredInsight = useMemo(() => {
    if (!hoveredNode) return null;
    return insights.find(i => i.id === hoveredNode) ?? null;
  }, [hoveredNode, insights]);

  if (insights.length === 0) return null;

  return (
    <div className="relative w-full" style={{ minHeight: 420 }}>
      {/* Graph container */}
      <div
        ref={containerRef}
        className="w-full rounded-lg border border-zinc-800/40 bg-zinc-950/60 overflow-hidden"
        style={{ height: 420 }}
      >
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          className="w-full h-full"
        />
      </div>

      {/* Legend */}
      <div className="absolute top-3 left-3 flex flex-col gap-1.5 text-2xs font-mono">
        <div className="flex items-center gap-3 px-2.5 py-1.5 rounded-md bg-zinc-900/90 border border-zinc-800/50 backdrop-blur-sm">
          <span className="text-zinc-500">Nodes:</span>
          {Object.entries(TYPE_COLORS).map(([type, color]) => (
            <span key={type} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ background: color }} />
              <span className="text-zinc-400">{type.replace(/_/g, ' ').replace('learned', '').replace('detected', '').trim()}</span>
            </span>
          ))}
        </div>
        <div className="flex items-center gap-3 px-2.5 py-1.5 rounded-md bg-zinc-900/90 border border-zinc-800/50 backdrop-blur-sm">
          <span className="text-zinc-500">Edges:</span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-0 border-t-2" style={{ borderColor: EDGE_COLORS.evolves }} />
            <span className="text-zinc-400">evolves</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-0 border-t-2 border-dashed" style={{ borderColor: EDGE_COLORS.conflict }} />
            <span className="text-zinc-400">conflict</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-0 border-t border-dotted" style={{ borderColor: EDGE_COLORS.evidence }} />
            <span className="text-zinc-400">shared evidence</span>
          </span>
        </div>
      </div>

      {/* Zoom controls */}
      <div className="absolute top-3 right-3 flex flex-col gap-1">
        <button
          onClick={() => handleZoom(1.3)}
          className="p-1.5 rounded-md bg-zinc-900/90 border border-zinc-800/50 text-zinc-400 hover:text-zinc-200 transition-colors backdrop-blur-sm"
          aria-label="Zoom in"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => handleZoom(0.7)}
          className="p-1.5 rounded-md bg-zinc-900/90 border border-zinc-800/50 text-zinc-400 hover:text-zinc-200 transition-colors backdrop-blur-sm"
          aria-label="Zoom out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleFitView}
          className="p-1.5 rounded-md bg-zinc-900/90 border border-zinc-800/50 text-zinc-400 hover:text-zinc-200 transition-colors backdrop-blur-sm"
          aria-label="Fit to view"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Time-scrubber */}
      {reflectionCycles.length > 1 && (
        <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900/95 border border-zinc-800/50 backdrop-blur-sm">
          <button
            onClick={handleStepBack}
            disabled={currentCycle <= -1}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 disabled:opacity-30 transition-colors"
            aria-label="Step back"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handlePlayPause}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 transition-colors"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={handleStepForward}
            disabled={currentCycle >= maxCycle}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 disabled:opacity-30 transition-colors"
            aria-label="Step forward"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          <div className="flex-1 mx-2">
            <input
              type="range"
              min={-1}
              max={maxCycle}
              value={currentCycle}
              onChange={e => {
                setIsPlaying(false);
                setCurrentCycle(Number(e.target.value));
              }}
              className="w-full h-1 rounded-full appearance-none bg-zinc-700 cursor-pointer accent-purple-500"
              aria-label="Reflection cycle timeline"
            />
          </div>

          <span className="text-2xs font-mono text-zinc-400 whitespace-nowrap min-w-[80px] text-right">
            {currentCycle === -1
              ? `All (${reflectionCycles.length} cycles)`
              : `Cycle ${currentCycle + 1} / ${reflectionCycles.length}`}
          </span>

          <span className="text-2xs font-mono text-zinc-500 whitespace-nowrap">
            {visibleNodes.length} / {nodes.length} insights
          </span>
        </div>
      )}

      {/* Node hover tooltip */}
      <AnimatePresence>
        {hoveredInsight && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="absolute top-14 right-14 z-10 max-w-xs rounded-lg border border-zinc-700/60 bg-zinc-900/95 backdrop-blur-sm p-3 shadow-xl pointer-events-none"
          >
            <div className="flex items-center gap-2 mb-1">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: TYPE_COLORS[hoveredInsight.type] || '#888' }}
              />
              <span className="text-xs text-zinc-200 font-medium truncate">
                {hoveredInsight.title}
              </span>
            </div>
            <p className="text-2xs text-zinc-400 line-clamp-2 mb-1.5">
              {hoveredInsight.description}
            </p>
            <div className="flex items-center gap-3 text-2xs text-zinc-500">
              <span>Confidence: <span className="text-zinc-300">{hoveredInsight.confidence}%</span></span>
              <span>Evidence: <span className="text-zinc-300">{hoveredInsight.evidence.length}</span></span>
              {hoveredInsight.evolves && (
                <span className="text-purple-400/70">Evolved</span>
              )}
              {hoveredInsight.auto_pruned && (
                <span className="text-amber-400/70">Pruned</span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edge detail popover */}
      <AnimatePresence>
        {selectedEdge && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-80 rounded-lg border border-zinc-700/60 bg-zinc-900/98 backdrop-blur-sm shadow-2xl"
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800/50">
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: EDGE_COLORS[selectedEdge.edge.type] }}
                />
                <span className="text-xs font-mono text-zinc-200 capitalize">
                  {selectedEdge.edge.label}
                </span>
              </div>
              <button
                onClick={() => setSelectedEdge(null)}
                className="p-1 rounded text-zinc-500 hover:text-zinc-200 transition-colors"
                aria-label="Close edge details"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="p-3 space-y-2.5">
              {/* Source insight */}
              <EdgeInsightCard
                label={selectedEdge.edge.type === 'evolves' ? 'Parent' : 'Insight A'}
                insight={selectedEdge.edge.sourceInsight}
              />
              {/* Arrow */}
              <div className="flex items-center justify-center">
                <span
                  className="text-xs font-mono px-2 py-0.5 rounded-full"
                  style={{
                    color: EDGE_COLORS[selectedEdge.edge.type],
                    background: `${EDGE_COLORS[selectedEdge.edge.type]}15`,
                    border: `1px solid ${EDGE_COLORS[selectedEdge.edge.type]}30`,
                  }}
                >
                  {selectedEdge.edge.type === 'evolves' ? 'evolved into' : selectedEdge.edge.type === 'conflict' ? 'conflicts with' : 'shares evidence'}
                </span>
              </div>
              {/* Target insight */}
              <EdgeInsightCard
                label={selectedEdge.edge.type === 'evolves' ? 'Child' : 'Insight B'}
                insight={selectedEdge.edge.targetInsight}
              />
              {/* Shared evidence details */}
              {selectedEdge.edge.type === 'evidence' && (
                <SharedEvidenceList
                  a={selectedEdge.edge.sourceInsight}
                  b={selectedEdge.edge.targetInsight}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function EdgeInsightCard({ label, insight }: { label: string; insight: InsightWithMeta }) {
  return (
    <div className="rounded-md border border-zinc-800/60 bg-zinc-800/20 px-2.5 py-2">
      <div className="text-2xs text-zinc-600 font-mono uppercase mb-1">{label}</div>
      <div className="flex items-center gap-1.5">
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: TYPE_COLORS[insight.type] || '#888' }}
        />
        <span className="text-xs text-zinc-200 truncate">{insight.title}</span>
      </div>
      <div className="flex items-center gap-2 mt-1 text-2xs text-zinc-500">
        <span>{insight.type.replace(/_/g, ' ')}</span>
        <span>·</span>
        <span>{insight.confidence}% confidence</span>
        <span>·</span>
        <span>{insight.evidence.length} evidence</span>
      </div>
    </div>
  );
}

function SharedEvidenceList({ a, b }: { a: InsightWithMeta; b: InsightWithMeta }) {
  const shared = a.evidence.filter(e =>
    b.evidence.some(oe => oe.id === e.id && oe.type === e.type)
  );

  if (shared.length === 0) return null;

  return (
    <div className="border-t border-zinc-800/40 pt-2">
      <div className="text-2xs text-zinc-500 font-mono mb-1">
        SHARED EVIDENCE ({shared.length})
      </div>
      <div className="space-y-0.5">
        {shared.map(ref => (
          <div
            key={ref.id}
            className="flex items-center gap-1.5 text-2xs px-2 py-1 rounded bg-zinc-800/30"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${
              ref.type === 'direction' ? 'bg-blue-400' :
              ref.type === 'signal' ? 'bg-amber-400' : 'bg-purple-400'
            }`} />
            <span className="text-zinc-400 uppercase">{ref.type}</span>
            <span className="text-zinc-500 font-mono">{ref.id.slice(0, 12)}...</span>
          </div>
        ))}
      </div>
    </div>
  );
}
