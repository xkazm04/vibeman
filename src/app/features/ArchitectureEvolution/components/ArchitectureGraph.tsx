'use client';

import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Circle,
  GitBranch,
  Layers,
  AlertTriangle,
  Database,
  Folder,
  Code,
  Server,
  Globe,
  Settings,
  Zap,
} from 'lucide-react';
import { DbArchitectureNode, DbArchitectureEdge } from '@/app/db/models/architecture-graph.types';

interface ArchitectureGraphProps {
  nodes: DbArchitectureNode[];
  edges: DbArchitectureEdge[];
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  onNodeSelect: (nodeId: string | null) => void;
  onNodeHover: (nodeId: string | null) => void;
  settings: {
    showLabels: boolean;
    showEdgeLabels: boolean;
    highlightCircular: boolean;
    groupByLayer: boolean;
  };
}

// Layer configuration
const LAYER_CONFIG = {
  pages: { label: 'Pages', color: '#f472b6', bgColor: 'bg-pink-500/10', rowY: 10 },
  client: { label: 'Client', color: '#06b6d4', bgColor: 'bg-cyan-500/10', rowY: 35 },
  server: { label: 'Server', color: '#f59e0b', bgColor: 'bg-amber-500/10', rowY: 60 },
  external: { label: 'External', color: '#8b5cf6', bgColor: 'bg-purple-500/10', rowY: 85 },
  unknown: { label: 'Other', color: '#6b7280', bgColor: 'bg-gray-500/10', rowY: 85 },
};

// Node type icons
const getNodeIcon = (nodeType: string) => {
  switch (nodeType) {
    case 'component':
      return Box;
    case 'api_route':
      return Server;
    case 'utility':
      return Code;
    case 'store':
      return Database;
    case 'hook':
      return Zap;
    case 'service':
      return Globe;
    case 'repository':
      return Database;
    case 'config':
      return Settings;
    default:
      return Folder;
  }
};

interface PositionedNode extends DbArchitectureNode {
  x: number;
  y: number;
}

export default function ArchitectureGraph({
  nodes,
  edges,
  selectedNodeId,
  hoveredNodeId,
  onNodeSelect,
  onNodeHover,
  settings,
}: ArchitectureGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [nodePositions, setNodePositions] = useState<Map<string, { x: number; y: number }>>(new Map());
  const [updateTrigger, setUpdateTrigger] = useState(0);

  // Calculate positioned nodes
  const positionedNodes = useMemo(() => {
    if (!settings.groupByLayer) {
      // Force-directed layout simulation (simplified)
      return nodes.map((node, index) => ({
        ...node,
        x: 10 + (index % 8) * 12,
        y: 10 + Math.floor(index / 8) * 15,
      }));
    }

    // Group by layer
    const layerGroups: Record<string, DbArchitectureNode[]> = {
      pages: [],
      client: [],
      server: [],
      external: [],
      unknown: [],
    };

    nodes.forEach((node) => {
      const layer = node.layer || 'unknown';
      if (layerGroups[layer]) {
        layerGroups[layer].push(node);
      } else {
        layerGroups.unknown.push(node);
      }
    });

    const positioned: PositionedNode[] = [];

    Object.entries(layerGroups).forEach(([layer, layerNodes]) => {
      const config = LAYER_CONFIG[layer as keyof typeof LAYER_CONFIG];
      const count = layerNodes.length;

      layerNodes.forEach((node, index) => {
        const spacing = Math.min(12, 90 / Math.max(count, 1));
        const startX = 5 + (90 - count * spacing) / 2;

        positioned.push({
          ...node,
          x: startX + index * spacing,
          y: config.rowY,
        });
      });
    });

    return positioned;
  }, [nodes, settings.groupByLayer]);

  // Handle node ref registration
  const handleNodeRef = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) {
      nodeRefs.current.set(id, el);
    } else {
      nodeRefs.current.delete(id);
    }
  }, []);

  // Update node positions from DOM
  const updateNodePositions = useCallback(() => {
    if (!containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const newPositions = new Map<string, { x: number; y: number }>();

    nodeRefs.current.forEach((el, id) => {
      const rect = el.getBoundingClientRect();
      newPositions.set(id, {
        x: rect.left - containerRect.left + rect.width / 2,
        y: rect.top - containerRect.top + rect.height / 2,
      });
    });

    setNodePositions(newPositions);
  }, []);

  // Update positions on mount and resize
  useEffect(() => {
    const timer = setTimeout(updateNodePositions, 100);
    window.addEventListener('resize', updateNodePositions);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateNodePositions);
    };
  }, [updateNodePositions, updateTrigger]);

  // Trigger position update when nodes change
  useEffect(() => {
    const timer = setTimeout(() => setUpdateTrigger((n) => n + 1), 200);
    return () => clearTimeout(timer);
  }, [nodes]);

  // Generate connections
  const connections = useMemo(() => {
    const conns: {
      fromPos: { x: number; y: number };
      toPos: { x: number; y: number };
      edge: DbArchitectureEdge;
    }[] = [];

    edges.forEach((edge) => {
      const fromPos = nodePositions.get(edge.source_node_id);
      const toPos = nodePositions.get(edge.target_node_id);

      if (fromPos && toPos) {
        conns.push({ fromPos, toPos, edge });
      }
    });

    return conns;
  }, [edges, nodePositions]);

  // Highlighted connections (for hovered/selected node)
  const highlightedEdges = useMemo(() => {
    const activeId = hoveredNodeId || selectedNodeId;
    if (!activeId) return new Set<string>();

    const related = new Set<string>();
    edges.forEach((edge) => {
      if (edge.source_node_id === activeId || edge.target_node_id === activeId) {
        related.add(edge.id);
      }
    });

    return related;
  }, [edges, hoveredNodeId, selectedNodeId]);

  // Empty state
  if (nodes.length === 0) {
    return (
      <div className="relative w-full h-full min-h-[500px] flex items-center justify-center bg-gray-950 rounded-xl">
        <div className="text-center">
          <Layers className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg mb-2">No architecture data</p>
          <p className="text-gray-500 text-sm">
            Run an analysis to build the architecture graph
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      ref={containerRef}
      className="relative w-full h-full min-h-[500px] overflow-hidden rounded-xl"
      style={{
        background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(2, 6, 23, 0.98) 100%)',
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      data-testid="architecture-graph-container"
    >
      {/* Grid background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Layer labels */}
      {settings.groupByLayer && (
        <div className="absolute left-0 top-0 bottom-0 w-20 flex flex-col justify-around pointer-events-none">
          {(Object.keys(LAYER_CONFIG) as Array<keyof typeof LAYER_CONFIG>)
            .filter((layer) => layer !== 'unknown')
            .map((layer) => {
              const config = LAYER_CONFIG[layer];
              return (
                <motion.div
                  key={layer}
                  className="flex items-center gap-2 px-3"
                  style={{ top: `${config.rowY}%` }}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: config.color }}
                  />
                  <span className="text-xs font-medium" style={{ color: config.color }}>
                    {config.label}
                  </span>
                </motion.div>
              );
            })}
        </div>
      )}

      {/* SVG for connections */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
        <defs>
          <filter id="glow-arch" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="edge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id="circular-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.8" />
          </linearGradient>
        </defs>

        {connections.map(({ fromPos, toPos, edge }) => {
          const isHighlighted = highlightedEdges.has(edge.id);
          const isCircular = edge.is_circular === 1 && settings.highlightCircular;

          // Calculate control points for bezier curve
          const midX = (fromPos.x + toPos.x) / 2;
          const midY = (fromPos.y + toPos.y) / 2;
          const dx = toPos.x - fromPos.x;
          const dy = toPos.y - fromPos.y;
          const curvature = 0.2;

          const cx1 = fromPos.x + dx * 0.25;
          const cy1 = fromPos.y + dy * 0.25 - Math.abs(dx) * curvature;
          const cx2 = fromPos.x + dx * 0.75;
          const cy2 = fromPos.y + dy * 0.75 - Math.abs(dx) * curvature;

          const pathD = `M ${fromPos.x} ${fromPos.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${toPos.x} ${toPos.y}`;

          return (
            <g key={edge.id}>
              <motion.path
                d={pathD}
                fill="none"
                stroke={isCircular ? 'url(#circular-gradient)' : isHighlighted ? '#06b6d4' : 'url(#edge-gradient)'}
                strokeWidth={isHighlighted ? 2.5 : isCircular ? 2 : 1.5}
                strokeOpacity={isHighlighted ? 1 : 0.4}
                strokeDasharray={isCircular ? '5,5' : 'none'}
                filter={isHighlighted ? 'url(#glow-arch)' : 'none'}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              />
              {/* Arrow */}
              <circle
                cx={toPos.x}
                cy={toPos.y}
                r={isHighlighted ? 4 : 3}
                fill={isCircular ? '#ef4444' : isHighlighted ? '#06b6d4' : '#8b5cf6'}
                opacity={isHighlighted ? 1 : 0.6}
              />
            </g>
          );
        })}
      </svg>

      {/* Node elements */}
      <div className="absolute inset-0 pl-20 pr-4 pt-4 pb-4" style={{ zIndex: 2 }}>
        {positionedNodes.map((node, index) => {
          const Icon = getNodeIcon(node.node_type);
          const isSelected = node.id === selectedNodeId;
          const isHovered = node.id === hoveredNodeId;
          const isHighlighted = isSelected || isHovered;
          const layerConfig = LAYER_CONFIG[(node.layer as keyof typeof LAYER_CONFIG) || 'unknown'];

          return (
            <motion.div
              key={node.id}
              ref={(el) => handleNodeRef(node.id, el)}
              className={`absolute cursor-pointer transition-all duration-200 ${
                isHighlighted ? 'z-20' : 'z-10'
              }`}
              style={{
                left: `${node.x}%`,
                top: `${node.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.02, type: 'spring', stiffness: 300, damping: 25 }}
              whileHover={{ scale: 1.1 }}
              onClick={() => onNodeSelect(isSelected ? null : node.id)}
              onMouseEnter={() => onNodeHover(node.id)}
              onMouseLeave={() => onNodeHover(null)}
              data-testid={`arch-node-${node.id}`}
            >
              {/* Node circle */}
              <div
                className={`relative p-2 rounded-lg border-2 transition-all duration-200 ${
                  isHighlighted
                    ? 'bg-gray-800/90 shadow-lg'
                    : 'bg-gray-900/80 hover:bg-gray-800/90'
                }`}
                style={{
                  borderColor: isHighlighted ? layerConfig.color : `${layerConfig.color}40`,
                  boxShadow: isHighlighted ? `0 0 20px ${layerConfig.color}30` : 'none',
                }}
              >
                <Icon
                  className="w-5 h-5"
                  style={{ color: layerConfig.color }}
                />

                {/* Coupling indicator */}
                {node.coupling_score > 70 && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-2 h-2 text-gray-900" />
                  </div>
                )}
              </div>

              {/* Label */}
              {(settings.showLabels || isHighlighted) && (
                <motion.div
                  className="absolute left-1/2 -translate-x-1/2 mt-1 whitespace-nowrap"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded ${
                      isHighlighted ? 'bg-gray-800 text-white' : 'text-gray-400'
                    }`}
                  >
                    {node.name}
                  </span>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-gray-900/90 backdrop-blur-sm rounded-lg p-3 border border-gray-700/50">
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-gradient-to-r from-cyan-500 to-purple-500" />
            <span className="text-gray-400">Dependency</span>
          </div>
          {settings.highlightCircular && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-gradient-to-r from-red-500 to-amber-500" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 2px, currentColor 2px, currentColor 4px)' }} />
              <span className="text-gray-400">Circular</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3 text-amber-500" />
            <span className="text-gray-400">High Coupling</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
