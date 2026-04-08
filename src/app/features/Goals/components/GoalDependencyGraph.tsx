'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Link2, Plus, Trash2, X, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import type { Goal } from '@/types';
import { getStatusConfig } from '../sub_GoalModal/lib/goalConstants';
import { duration } from '@/lib/motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';

// ── Types ──────────────────────────────────────────────────────────────────

interface GoalDependencyGraphProps {
  goals: Goal[];
  projectId: string;
  onGoalClick?: (goal: Goal) => void;
}

interface DependencyEdge {
  id: string;
  parent_goal_id: string;
  child_goal_id: string;
  relationship_type: 'blocks' | 'depends_on' | 'related';
  parent_title: string;
  parent_status: string;
  child_title: string;
  child_status: string;
}

interface BlockedGoal {
  blocked_goal_id: string;
  blocked_goal_title: string;
  blocker_goal_id: string;
  blocker_goal_title: string;
  blocker_goal_status: string;
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  goal: Goal;
}

interface GraphEdge extends d3.SimulationLinkDatum<GraphNode> {
  id: string;
  type: 'blocks' | 'depends_on' | 'related';
}

// ── Colors ─────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  done: '#22c55e',
  in_progress: '#eab308',
  open: '#3b82f6',
  rejected: '#ef4444',
  undecided: '#6b7280',
};

const EDGE_COLORS: Record<string, string> = {
  blocks: '#ef4444',
  depends_on: '#f59e0b',
  related: '#6b7280',
};

// ── Component ──────────────────────────────────────────────────────────────

export default function GoalDependencyGraph({ goals, projectId, onGoalClick }: GoalDependencyGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphEdge> | null>(null);

  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });
  const [dependencies, setDependencies] = useState<DependencyEdge[]>([]);
  const [blockedGoals, setBlockedGoals] = useState<BlockedGoal[]>([]);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [showAddDep, setShowAddDep] = useState(false);
  const [addDepFrom, setAddDepFrom] = useState('');
  const [addDepTo, setAddDepTo] = useState('');
  const [loading, setLoading] = useState(true);

  const prefersReduced = useReducedMotion();

  // Fetch dependencies
  const fetchDeps = useCallback(async () => {
    try {
      const res = await fetch(`/api/goals/dependencies?projectId=${encodeURIComponent(projectId)}`);
      if (res.ok) {
        const data = await res.json();
        setDependencies(data.dependencies || []);
        setBlockedGoals(data.blockedGoals || []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetchDeps(); }, [fetchDeps]);

  // Build graph data
  const { nodes, edges } = useMemo(() => {
    const nodeMap = new Map<string, GraphNode>();
    for (const goal of goals) {
      nodeMap.set(goal.id, { id: goal.id, goal });
    }

    const edgeList: GraphEdge[] = [];
    const edgeSet = new Set<string>();
    for (const dep of dependencies) {
      const eid = `${dep.parent_goal_id}->${dep.child_goal_id}`;
      if (!edgeSet.has(eid) && nodeMap.has(dep.parent_goal_id) && nodeMap.has(dep.child_goal_id)) {
        edgeSet.add(eid);
        edgeList.push({
          id: dep.id,
          source: dep.parent_goal_id,
          target: dep.child_goal_id,
          type: dep.relationship_type,
        });
      }
    }

    return { nodes: Array.from(nodeMap.values()), edges: edgeList };
  }, [goals, dependencies]);

  const blockedIds = useMemo(() => new Set(blockedGoals.map(b => b.blocked_goal_id)), [blockedGoals]);

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) setDimensions({ width, height });
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // D3 simulation + rendering
  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = dimensions;

    // Defs for arrow markers
    const defs = svg.append('defs');
    for (const [type, color] of Object.entries(EDGE_COLORS)) {
      defs.append('marker')
        .attr('id', `arrow-${type}`)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 28)
        .attr('refY', 0)
        .attr('markerWidth', 8)
        .attr('markerHeight', 8)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', color);
    }

    const g = svg.append('g');

    // Zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => g.attr('transform', event.transform));
    svg.call(zoom);

    // Links
    const link = g.append('g')
      .selectAll('line')
      .data(edges)
      .join('line')
      .attr('stroke', d => EDGE_COLORS[d.type] || '#666')
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.6)
      .attr('marker-end', d => `url(#arrow-${d.type})`);

    // Edge labels
    const edgeLabel = g.append('g')
      .selectAll('text')
      .data(edges)
      .join('text')
      .attr('text-anchor', 'middle')
      .attr('fill', d => EDGE_COLORS[d.type] || '#666')
      .attr('font-size', '9px')
      .attr('font-family', 'monospace')
      .attr('opacity', 0.7)
      .text(d => d.type === 'blocks' ? 'blocks' : d.type === 'depends_on' ? 'depends' : 'related');

    // Nodes
    const node = g.append('g')
      .selectAll<SVGGElement, GraphNode>('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'pointer')
      .call(d3.drag<SVGGElement, GraphNode>()
        .on('start', (event, d) => {
          if (!event.active) simulationRef.current?.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulationRef.current?.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
      );

    // Node circles
    node.append('circle')
      .attr('r', 20)
      .attr('fill', d => {
        const color = STATUS_COLORS[d.goal.status] || '#6b7280';
        return color + '33'; // alpha
      })
      .attr('stroke', d => STATUS_COLORS[d.goal.status] || '#6b7280')
      .attr('stroke-width', d => blockedIds.has(d.id) ? 3 : 2);

    // Blocked indicator ring
    node.filter(d => blockedIds.has(d.id))
      .append('circle')
      .attr('r', 24)
      .attr('fill', 'none')
      .attr('stroke', '#ef4444')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '4,3')
      .attr('opacity', 0.8);

    // Status icon (first letter)
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('fill', d => STATUS_COLORS[d.goal.status] || '#6b7280')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .attr('font-family', 'monospace')
      .text(d => d.goal.title.charAt(0).toUpperCase());

    // Node label (title)
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '36px')
      .attr('fill', '#94a3b8')
      .attr('font-size', '10px')
      .attr('font-family', 'sans-serif')
      .text(d => d.goal.title.length > 20 ? d.goal.title.slice(0, 18) + '...' : d.goal.title);

    // Hover effects
    node
      .on('mouseenter', (_, d) => setHoveredNode(d.id))
      .on('mouseleave', () => setHoveredNode(null))
      .on('click', (_, d) => {
        setSelectedNode(prev => prev === d.id ? null : d.id);
        onGoalClick?.(d.goal);
      });

    // Simulation
    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force('link', d3.forceLink<GraphNode, GraphEdge>(edges).id(d => d.id).distance(140))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(50))
      .on('tick', () => {
        link
          .attr('x1', d => (d.source as GraphNode).x!)
          .attr('y1', d => (d.source as GraphNode).y!)
          .attr('x2', d => (d.target as GraphNode).x!)
          .attr('y2', d => (d.target as GraphNode).y!);

        edgeLabel
          .attr('x', d => ((d.source as GraphNode).x! + (d.target as GraphNode).x!) / 2)
          .attr('y', d => ((d.source as GraphNode).y! + (d.target as GraphNode).y!) / 2 - 6);

        node.attr('transform', d => `translate(${d.x},${d.y})`);
      });

    simulationRef.current = simulation;

    return () => { simulation.stop(); };
  }, [nodes, edges, dimensions, blockedIds, onGoalClick]);

  // Add dependency handler
  const handleAddDependency = async () => {
    if (!addDepFrom || !addDepTo || addDepFrom === addDepTo) return;
    try {
      const res = await fetch('/api/goals/dependencies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentGoalId: addDepFrom, childGoalId: addDepTo, relationshipType: 'blocks' }),
      });
      if (res.ok) {
        setShowAddDep(false);
        setAddDepFrom('');
        setAddDepTo('');
        fetchDeps();
      }
    } catch {
      // silently fail
    }
  };

  const handleDeleteDependency = async (depId: string) => {
    try {
      const res = await fetch(`/api/goals/dependencies?id=${encodeURIComponent(depId)}`, { method: 'DELETE' });
      if (res.ok) fetchDeps();
    } catch {
      // silently fail
    }
  };

  // Zoom controls
  const handleZoom = useCallback((factor: number) => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().duration(300).call(
      d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.3, 3]).on('zoom', () => {}).scaleBy as any,
      factor
    );
  }, []);

  const handleFit = useCallback(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().duration(500).call(
      d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.3, 3]).transform as any,
      d3.zoomIdentity.translate(dimensions.width / 2, dimensions.height / 2).scale(0.8).translate(-dimensions.width / 2, -dimensions.height / 2)
    );
  }, [dimensions]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground/50 text-sm">
        Loading dependency graph...
      </div>
    );
  }

  if (goals.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground/50 text-sm">
        No goals to display
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-primary/60" />
          <span className="text-xs font-mono text-muted-foreground">
            {dependencies.length} dep{dependencies.length !== 1 ? 's' : ''}
          </span>
          {blockedGoals.length > 0 && (
            <span className="flex items-center gap-1 text-xs font-mono text-red-400">
              <AlertTriangle className="w-3 h-3" />
              {blockedGoals.length} blocked
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setShowAddDep(true)} className="p-1.5 hover:bg-white/10 rounded text-white/60 hover:text-white transition-colors" title="Add dependency">
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => handleZoom(1.3)} className="p-1.5 hover:bg-white/10 rounded text-white/60 hover:text-white transition-colors" title="Zoom in">
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => handleZoom(0.7)} className="p-1.5 hover:bg-white/10 rounded text-white/60 hover:text-white transition-colors" title="Zoom out">
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button onClick={handleFit} className="p-1.5 hover:bg-white/10 rounded text-white/60 hover:text-white transition-colors" title="Fit view">
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Blocked goals warning banner */}
      <AnimatePresence>
        {blockedGoals.length > 0 && (
          <motion.div
            initial={prefersReduced ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-3 py-2 bg-red-500/10 border-b border-red-500/20 overflow-hidden"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="text-xs text-red-300/80">
                {[...new Set(blockedGoals.map(b => b.blocked_goal_title))].map(title => (
                  <span key={title} className="inline-block mr-2">
                    <span className="font-medium">{title}</span> is blocked
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Graph canvas */}
      <div ref={containerRef} className="flex-1 relative min-h-0">
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          className="w-full h-full"
        />

        {/* Legend */}
        <div className="absolute bottom-2 left-2 flex gap-3 text-2xs text-muted-foreground/50 font-mono">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" /> blocks
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full border border-red-500 border-dashed" /> blocked
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" /> done
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-500" /> in progress
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500" /> open
          </span>
        </div>

        {/* Hover tooltip */}
        <AnimatePresence>
          {hoveredNode && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: duration.snappy }}
              className="absolute top-2 right-2 px-3 py-2 rounded-lg bg-background/90 border border-white/10 backdrop-blur-sm text-xs max-w-[200px]"
            >
              {(() => {
                const goal = goals.find(g => g.id === hoveredNode);
                if (!goal) return null;
                const cfg = getStatusConfig(goal.status);
                const goalDeps = dependencies.filter(d => d.parent_goal_id === hoveredNode || d.child_goal_id === hoveredNode);
                return (
                  <div>
                    <p className="font-medium text-foreground truncate">{goal.title}</p>
                    <p className={`text-2xs ${cfg.color} mt-0.5`}>{cfg.text}</p>
                    {goal.progress != null && goal.progress > 0 && (
                      <p className="text-2xs text-blue-400/70 mt-0.5">{goal.progress}% complete</p>
                    )}
                    {goalDeps.length > 0 && (
                      <div className="mt-1.5 pt-1.5 border-t border-white/5 space-y-0.5">
                        {goalDeps.map(d => (
                          <div key={d.id} className="flex items-center gap-1">
                            <span className="text-2xs text-muted-foreground/60">
                              {d.parent_goal_id === hoveredNode ? 'blocks' : 'blocked by'}
                            </span>
                            <span className="text-2xs text-foreground/70 truncate">
                              {d.parent_goal_id === hoveredNode ? d.child_title : d.parent_title}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dependency list for selected node */}
        <AnimatePresence>
          {selectedNode && (
            <motion.div
              initial={prefersReduced ? false : { opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="absolute top-2 left-2 w-56 rounded-lg bg-background/95 border border-white/10 backdrop-blur-sm shadow-xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
                <span className="text-xs font-medium text-foreground truncate">
                  {goals.find(g => g.id === selectedNode)?.title}
                </span>
                <button onClick={() => setSelectedNode(null)} className="p-0.5 hover:bg-white/10 rounded text-muted-foreground">
                  <X className="w-3 h-3" />
                </button>
              </div>
              <div className="p-2 space-y-1 max-h-[200px] overflow-y-auto custom-scrollbar">
                {dependencies.filter(d => d.parent_goal_id === selectedNode || d.child_goal_id === selectedNode).map(dep => (
                  <div key={dep.id} className="flex items-center justify-between gap-1 px-2 py-1 rounded bg-white/5 group">
                    <div className="flex-1 min-w-0">
                      <p className="text-2xs text-muted-foreground/60">
                        {dep.parent_goal_id === selectedNode ? 'blocks' : 'blocked by'}
                      </p>
                      <p className="text-xs text-foreground/80 truncate">
                        {dep.parent_goal_id === selectedNode ? dep.child_title : dep.parent_title}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteDependency(dep.id)}
                      className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 rounded text-red-400 transition-opacity"
                      title="Remove dependency"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {dependencies.filter(d => d.parent_goal_id === selectedNode || d.child_goal_id === selectedNode).length === 0 && (
                  <p className="text-2xs text-muted-foreground/40 text-center py-2">No dependencies</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add dependency modal */}
      <AnimatePresence>
        {showAddDep && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          >
            <motion.div
              initial={prefersReduced ? false : { scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-background/95 border border-white/10 rounded-xl p-4 w-80 shadow-2xl"
            >
              <h3 className="text-sm font-medium text-foreground mb-3">Add Dependency</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-2xs text-muted-foreground mb-1 block">Blocker (parent)</label>
                  <select
                    value={addDepFrom}
                    onChange={e => setAddDepFrom(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-foreground"
                  >
                    <option value="">Select goal...</option>
                    {goals.map(g => (
                      <option key={g.id} value={g.id}>{g.title}</option>
                    ))}
                  </select>
                </div>
                <div className="text-center text-xs text-red-400 font-mono">blocks</div>
                <div>
                  <label className="text-2xs text-muted-foreground mb-1 block">Blocked (child)</label>
                  <select
                    value={addDepTo}
                    onChange={e => setAddDepTo(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-foreground"
                  >
                    <option value="">Select goal...</option>
                    {goals.filter(g => g.id !== addDepFrom).map(g => (
                      <option key={g.id} value={g.id}>{g.title}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => { setShowAddDep(false); setAddDepFrom(''); setAddDepTo(''); }}
                  className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddDependency}
                  disabled={!addDepFrom || !addDepTo}
                  className="px-3 py-1.5 text-xs bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-colors disabled:opacity-40"
                >
                  Add
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
