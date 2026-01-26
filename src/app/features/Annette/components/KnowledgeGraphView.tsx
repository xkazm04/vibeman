'use client';

/**
 * Knowledge Graph View Component
 * Visualizes Annette's knowledge graph using D3 force-directed layout
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { KnowledgeNodeType } from '@/app/db/models/annette.types';

interface KnowledgeNode {
  id: string;
  projectId: string;
  nodeType: KnowledgeNodeType;
  name: string;
  description: string | null;
  properties: Record<string, unknown> | null;
  mentionCount: number;
  importanceScore: number;
  lastMentionedAt: string;
  createdAt: string;
}

interface KnowledgeEdge {
  id: string;
  projectId: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationshipType: string;
  weight: number;
  properties: Record<string, unknown> | null;
  evidenceCount: number;
  lastObservedAt: string;
}

interface KnowledgeGraphViewProps {
  projectId: string;
  onNodeSelect?: (node: KnowledgeNode) => void;
  className?: string;
}

const NODE_TYPE_COLORS: Record<KnowledgeNodeType, string> = {
  entity: '#3B82F6',
  concept: '#8B5CF6',
  file: '#10B981',
  function: '#F59E0B',
  component: '#EC4899',
  api: '#06B6D4',
  decision: '#EF4444',
  person: '#6366F1',
  technology: '#14B8A6',
};

const NODE_TYPE_LABELS: Record<KnowledgeNodeType, string> = {
  entity: 'Entity',
  concept: 'Concept',
  file: 'File',
  function: 'Function',
  component: 'Component',
  api: 'API',
  decision: 'Decision',
  person: 'Person',
  technology: 'Technology',
};

interface GraphData {
  nodes: Array<KnowledgeNode & { x?: number; y?: number; vx?: number; vy?: number }>;
  edges: KnowledgeEdge[];
}

export function KnowledgeGraphView({ projectId, onNodeSelect, className }: KnowledgeGraphViewProps) {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<KnowledgeNodeType | 'all'>('all');
  const [stats, setStats] = useState<{
    totalNodes: number;
    totalEdges: number;
    nodesByType: Record<KnowledgeNodeType, number>;
  } | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });

  const fetchGraph = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ projectId });
      if (filterType !== 'all') params.set('type', filterType);

      const response = await fetch(`/api/annette/knowledge?${params}`);
      if (!response.ok) throw new Error('Failed to fetch knowledge graph');

      const data = await response.json();

      // Initialize positions for new nodes
      const nodes = (data.nodes || []).map((node: KnowledgeNode, i: number) => ({
        ...node,
        x: dimensions.width / 2 + Math.cos((i * 2 * Math.PI) / data.nodes.length) * 200,
        y: dimensions.height / 2 + Math.sin((i * 2 * Math.PI) / data.nodes.length) * 200,
        vx: 0,
        vy: 0,
      }));

      setGraphData({ nodes, edges: data.edges || [] });
      setStats(data.stats || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [projectId, filterType, dimensions]);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width || 800, height: rect.height || 600 });
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Simple force simulation
  useEffect(() => {
    if (graphData.nodes.length === 0) return;

    let animationFrame: number;
    const simulate = () => {
      setGraphData(prev => {
        const nodes = [...prev.nodes];
        const edges = prev.edges;

        // Apply forces
        for (let i = 0; i < nodes.length; i++) {
          const node = nodes[i];

          // Center force
          node.vx = (node.vx || 0) * 0.9 + (dimensions.width / 2 - (node.x || 0)) * 0.001;
          node.vy = (node.vy || 0) * 0.9 + (dimensions.height / 2 - (node.y || 0)) * 0.001;

          // Repulsion between nodes
          for (let j = i + 1; j < nodes.length; j++) {
            const other = nodes[j];
            const dx = (node.x || 0) - (other.x || 0);
            const dy = (node.y || 0) - (other.y || 0);
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = 500 / (dist * dist);
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            node.vx = (node.vx || 0) + fx;
            node.vy = (node.vy || 0) + fy;
            other.vx = (other.vx || 0) - fx;
            other.vy = (other.vy || 0) - fy;
          }
        }

        // Edge attraction
        for (const edge of edges) {
          const source = nodes.find(n => n.id === edge.sourceNodeId);
          const target = nodes.find(n => n.id === edge.targetNodeId);
          if (source && target) {
            const dx = (target.x || 0) - (source.x || 0);
            const dy = (target.y || 0) - (source.y || 0);
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = (dist - 100) * 0.01 * edge.weight;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            source.vx = (source.vx || 0) + fx;
            source.vy = (source.vy || 0) + fy;
            target.vx = (target.vx || 0) - fx;
            target.vy = (target.vy || 0) - fy;
          }
        }

        // Update positions
        for (const node of nodes) {
          node.x = (node.x || 0) + (node.vx || 0);
          node.y = (node.y || 0) + (node.vy || 0);

          // Boundary constraints
          const padding = 50;
          node.x = Math.max(padding, Math.min(dimensions.width - padding, node.x || 0));
          node.y = Math.max(padding, Math.min(dimensions.height - padding, node.y || 0));
        }

        return { nodes, edges };
      });

      animationFrame = requestAnimationFrame(simulate);
    };

    animationFrame = requestAnimationFrame(simulate);
    return () => cancelAnimationFrame(animationFrame);
  }, [graphData.nodes.length, graphData.edges.length, dimensions]);

  const handleNodeClick = (node: KnowledgeNode) => {
    setSelectedNode(node);
    onNodeSelect?.(node);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setTransform(prev => ({
      ...prev,
      scale: Math.max(0.5, Math.min(2, prev.scale * delta)),
    }));
  };

  const getNodeRadius = (node: KnowledgeNode) => {
    return 8 + node.importanceScore * 12 + Math.log(node.mentionCount + 1) * 3;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div>
          <h2 className="text-lg font-semibold text-white">Knowledge Graph</h2>
          {stats && (
            <p className="text-sm text-white/60">
              {stats.totalNodes} nodes | {stats.totalEdges} edges
            </p>
          )}
        </div>
        <button
          onClick={fetchGraph}
          className="px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="p-4 border-b border-white/10">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterType('all')}
            className={cn(
              'px-3 py-1 text-xs rounded-full border transition-colors',
              filterType === 'all'
                ? 'bg-white/20 border-white/30 text-white'
                : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
            )}
          >
            All
          </button>
          {(Object.keys(NODE_TYPE_LABELS) as KnowledgeNodeType[]).map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={cn(
                'px-3 py-1 text-xs rounded-full border transition-colors',
                filterType === type
                  ? 'bg-white/20 border-white/30 text-white'
                  : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
              )}
              style={{
                borderColor: filterType === type ? NODE_TYPE_COLORS[type] : undefined,
                color: filterType === type ? NODE_TYPE_COLORS[type] : undefined,
              }}
            >
              {NODE_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      {/* Graph Area */}
      <div className="flex-1 overflow-hidden flex">
        <div className="flex-1 relative bg-black/20">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin w-8 h-8 border-2 border-white/20 border-t-white rounded-full" />
            </div>
          ) : error ? (
            <div className="absolute inset-0 flex items-center justify-center text-red-400">
              {error}
            </div>
          ) : graphData.nodes.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-white/40">
              No knowledge nodes found
            </div>
          ) : (
            <svg
              ref={svgRef}
              className="w-full h-full"
              onWheel={handleWheel}
            >
              <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
                {/* Edges */}
                {graphData.edges.map(edge => {
                  const source = graphData.nodes.find(n => n.id === edge.sourceNodeId);
                  const target = graphData.nodes.find(n => n.id === edge.targetNodeId);
                  if (!source || !target) return null;

                  const isHighlighted =
                    hoveredNode === source.id || hoveredNode === target.id;

                  return (
                    <g key={edge.id}>
                      <line
                        x1={source.x || 0}
                        y1={source.y || 0}
                        x2={target.x || 0}
                        y2={target.y || 0}
                        stroke={isHighlighted ? '#ffffff' : '#ffffff30'}
                        strokeWidth={isHighlighted ? 2 : 1}
                        strokeOpacity={isHighlighted ? 0.8 : 0.3}
                      />
                      {/* Edge label */}
                      {isHighlighted && (
                        <text
                          x={((source.x || 0) + (target.x || 0)) / 2}
                          y={((source.y || 0) + (target.y || 0)) / 2 - 5}
                          fill="#ffffff80"
                          fontSize={10}
                          textAnchor="middle"
                        >
                          {edge.relationshipType}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Nodes */}
                {graphData.nodes.map(node => {
                  const radius = getNodeRadius(node);
                  const isHovered = hoveredNode === node.id;
                  const isSelected = selectedNode?.id === node.id;

                  return (
                    <g
                      key={node.id}
                      transform={`translate(${node.x || 0}, ${node.y || 0})`}
                      onClick={() => handleNodeClick(node)}
                      onMouseEnter={() => setHoveredNode(node.id)}
                      onMouseLeave={() => setHoveredNode(null)}
                      style={{ cursor: 'pointer' }}
                    >
                      <circle
                        r={radius}
                        fill={NODE_TYPE_COLORS[node.nodeType]}
                        fillOpacity={isHovered || isSelected ? 1 : 0.7}
                        stroke={isSelected ? '#ffffff' : 'transparent'}
                        strokeWidth={2}
                      />
                      <text
                        y={radius + 12}
                        fill="#ffffff"
                        fontSize={11}
                        textAnchor="middle"
                        opacity={isHovered || isSelected ? 1 : 0.6}
                      >
                        {node.name.slice(0, 15)}
                        {node.name.length > 15 ? '...' : ''}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>
          )}

          {/* Legend */}
          <div className="absolute bottom-4 left-4 p-3 bg-black/60 backdrop-blur-sm rounded-lg">
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(NODE_TYPE_COLORS) as KnowledgeNodeType[]).map(type => (
                <div key={type} className="flex items-center gap-1.5">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: NODE_TYPE_COLORS[type] }}
                  />
                  <span className="text-xs text-white/60">{NODE_TYPE_LABELS[type]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Detail Panel */}
        <AnimatePresence>
          {selectedNode && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-l border-white/10 overflow-hidden bg-black/40"
            >
              <div className="w-[280px] p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div
                    className="px-2 py-0.5 text-xs rounded"
                    style={{
                      backgroundColor: NODE_TYPE_COLORS[selectedNode.nodeType] + '30',
                      color: NODE_TYPE_COLORS[selectedNode.nodeType],
                    }}
                  >
                    {NODE_TYPE_LABELS[selectedNode.nodeType]}
                  </div>
                  <button
                    onClick={() => setSelectedNode(null)}
                    className="text-white/40 hover:text-white"
                  >
                    &times;
                  </button>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-white">{selectedNode.name}</h3>
                  {selectedNode.description && (
                    <p className="mt-1 text-sm text-white/60">{selectedNode.description}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <h4 className="text-xs font-medium text-white/40 uppercase mb-1">Importance</h4>
                    <p className="text-sm text-white/80">
                      {(selectedNode.importanceScore * 100).toFixed(0)}%
                    </p>
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-white/40 uppercase mb-1">Mentions</h4>
                    <p className="text-sm text-white/80">{selectedNode.mentionCount}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-white/40 uppercase mb-1">Last Seen</h4>
                    <p className="text-sm text-white/80">{formatDate(selectedNode.lastMentionedAt)}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-white/40 uppercase mb-1">Created</h4>
                    <p className="text-sm text-white/80">{formatDate(selectedNode.createdAt)}</p>
                  </div>
                </div>

                {/* Related Edges */}
                <div>
                  <h4 className="text-xs font-medium text-white/40 uppercase mb-2">Relationships</h4>
                  <div className="space-y-1">
                    {graphData.edges
                      .filter(e => e.sourceNodeId === selectedNode.id || e.targetNodeId === selectedNode.id)
                      .slice(0, 5)
                      .map(edge => {
                        const otherNode = graphData.nodes.find(
                          n => n.id === (edge.sourceNodeId === selectedNode.id ? edge.targetNodeId : edge.sourceNodeId)
                        );
                        const isSource = edge.sourceNodeId === selectedNode.id;
                        return (
                          <div key={edge.id} className="text-xs text-white/60">
                            {isSource ? '→' : '←'} {edge.relationshipType} → {otherNode?.name || '?'}
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
