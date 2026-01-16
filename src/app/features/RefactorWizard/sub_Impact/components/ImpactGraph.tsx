'use client';

import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ZoomIn, ZoomOut, Maximize2, Move, MousePointer, RefreshCw } from 'lucide-react';
import type { ImpactGraph as ImpactGraphType, ImpactNode, ImpactEdge } from '@/lib/impact';
import type { GraphViewport, GraphInteractionMode } from '../lib/types';
import { IMPACT_COLORS, STATUS_COLORS } from '../lib/types';

interface ImpactGraphProps {
  graph: ImpactGraphType;
  selectedNode: ImpactNode | null;
  onSelectNode: (node: ImpactNode | null) => void;
  viewport: GraphViewport;
  onViewportChange: (viewport: GraphViewport) => void;
  width?: number;
  height?: number;
}

interface NodePosition {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export function ImpactGraph({
  graph,
  selectedNode,
  onSelectNode,
  viewport,
  onViewportChange,
  width = 800,
  height = 600,
}: ImpactGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [interactionMode, setInteractionMode] = useState<GraphInteractionMode>('select');
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState<ImpactNode | null>(null);

  // Node positions with simulation
  const [nodePositions, setNodePositions] = useState<Map<string, NodePosition>>(new Map());

  // Initialize positions using force-directed layout simulation
  useEffect(() => {
    if (graph.nodes.length === 0) return;

    const positions = new Map<string, NodePosition>();
    const centerX = width / 2;
    const centerY = height / 2;

    // Initialize positions in a circle, grouped by level
    const nodesByLevel = new Map<number, ImpactNode[]>();
    graph.nodes.forEach(node => {
      const level = node.depth === Infinity ? 10 : node.depth;
      if (!nodesByLevel.has(level)) {
        nodesByLevel.set(level, []);
      }
      nodesByLevel.get(level)!.push(node);
    });

    let currentRadius = 0;
    const levelRadius = 120;

    for (const [level, nodes] of Array.from(nodesByLevel.entries()).sort((a, b) => a[0] - b[0])) {
      const angleStep = (2 * Math.PI) / Math.max(nodes.length, 1);
      nodes.forEach((node, i) => {
        const angle = i * angleStep + (level * 0.3); // Offset each level slightly
        const radius = level === 0 ? 0 : currentRadius + levelRadius;
        positions.set(node.id, {
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle),
          vx: 0,
          vy: 0,
        });
      });
      if (nodes.length > 0) {
        currentRadius += levelRadius;
      }
    }

    // Run simple force simulation
    const iterations = 50;
    for (let iter = 0; iter < iterations; iter++) {
      // Repulsive force between all nodes
      for (const node1 of graph.nodes) {
        const pos1 = positions.get(node1.id)!;
        for (const node2 of graph.nodes) {
          if (node1.id === node2.id) continue;
          const pos2 = positions.get(node2.id)!;

          const dx = pos1.x - pos2.x;
          const dy = pos1.y - pos2.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = 5000 / (dist * dist);

          pos1.vx += (dx / dist) * force * 0.1;
          pos1.vy += (dy / dist) * force * 0.1;
        }
      }

      // Attractive force along edges
      for (const edge of graph.edges) {
        const pos1 = positions.get(edge.source);
        const pos2 = positions.get(edge.target);
        if (!pos1 || !pos2) continue;

        const dx = pos2.x - pos1.x;
        const dy = pos2.y - pos1.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (dist - 100) * 0.01;

        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        pos1.vx += fx;
        pos1.vy += fy;
        pos2.vx -= fx;
        pos2.vy -= fy;
      }

      // Apply velocity and damping
      for (const node of graph.nodes) {
        const pos = positions.get(node.id)!;
        pos.x += pos.vx;
        pos.y += pos.vy;
        pos.vx *= 0.9;
        pos.vy *= 0.9;

        // Keep within bounds
        pos.x = Math.max(50, Math.min(width - 50, pos.x));
        pos.y = Math.max(50, Math.min(height - 50, pos.y));
      }
    }

    setNodePositions(positions);
  }, [graph.nodes, graph.edges, width, height]);

  // Draw the graph on canvas
  const drawGraph = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Apply viewport transformation
    ctx.save();
    ctx.translate(viewport.x, viewport.y);
    ctx.scale(viewport.scale, viewport.scale);

    // Draw edges
    for (const edge of graph.edges) {
      const sourcePos = nodePositions.get(edge.source);
      const targetPos = nodePositions.get(edge.target);
      if (!sourcePos || !targetPos) continue;

      ctx.beginPath();
      ctx.moveTo(sourcePos.x, sourcePos.y);
      ctx.lineTo(targetPos.x, targetPos.y);
      ctx.strokeStyle = edge.isAffected ? '#f59e0b' : '#374151';
      ctx.lineWidth = edge.isAffected ? 2 : 1;
      ctx.globalAlpha = edge.isAffected ? 0.8 : 0.3;
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Draw arrow
      if (edge.isAffected) {
        const angle = Math.atan2(targetPos.y - sourcePos.y, targetPos.x - sourcePos.x);
        const arrowSize = 8;
        const arrowX = targetPos.x - 20 * Math.cos(angle);
        const arrowY = targetPos.y - 20 * Math.sin(angle);

        ctx.beginPath();
        ctx.moveTo(arrowX, arrowY);
        ctx.lineTo(
          arrowX - arrowSize * Math.cos(angle - Math.PI / 6),
          arrowY - arrowSize * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
          arrowX - arrowSize * Math.cos(angle + Math.PI / 6),
          arrowY - arrowSize * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fillStyle = '#f59e0b';
        ctx.fill();
      }
    }

    // Draw nodes
    for (const node of graph.nodes) {
      const pos = nodePositions.get(node.id);
      if (!pos) continue;

      const isSelected = selectedNode?.id === node.id;
      const isHovered = hoveredNode?.id === node.id;
      const colors = IMPACT_COLORS[node.level];
      const radius = node.isSource ? 20 : 15;

      // Node circle
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, 2 * Math.PI);

      // Fill
      ctx.fillStyle = colors.fill;
      ctx.globalAlpha = node.status === 'excluded' ? 0.3 : 1;
      ctx.fill();
      ctx.globalAlpha = 1;

      // Stroke
      ctx.strokeStyle = isSelected ? '#06b6d4' : isHovered ? '#ffffff' : colors.stroke;
      ctx.lineWidth = isSelected ? 3 : isHovered ? 2 : 1;
      ctx.stroke();

      // Selection ring
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius + 5, 0, 2 * Math.PI);
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Label (file name)
      const labelY = pos.y + radius + 15;
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = isSelected || isHovered ? '#ffffff' : '#9ca3af';
      ctx.fillText(node.fileName, pos.x, labelY);
    }

    ctx.restore();
  }, [graph, nodePositions, viewport, selectedNode, hoveredNode, width, height]);

  // Redraw when state changes
  useEffect(() => {
    drawGraph();
  }, [drawGraph]);

  // Handle mouse events
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (interactionMode === 'pan') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - viewport.x, y: e.clientY - viewport.y });
    }
  }, [interactionMode, viewport]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - viewport.x) / viewport.scale;
    const mouseY = (e.clientY - rect.top - viewport.y) / viewport.scale;

    if (isDragging && interactionMode === 'pan') {
      onViewportChange({
        ...viewport,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
      return;
    }

    // Check for node hover
    let foundNode: ImpactNode | null = null;
    for (const node of graph.nodes) {
      const pos = nodePositions.get(node.id);
      if (!pos) continue;

      const dist = Math.sqrt(
        Math.pow(mouseX - pos.x, 2) + Math.pow(mouseY - pos.y, 2)
      );
      const radius = node.isSource ? 20 : 15;
      if (dist <= radius) {
        foundNode = node;
        break;
      }
    }
    setHoveredNode(foundNode);
  }, [graph.nodes, nodePositions, viewport, isDragging, interactionMode, dragStart, onViewportChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (interactionMode !== 'select') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - viewport.x) / viewport.scale;
    const mouseY = (e.clientY - rect.top - viewport.y) / viewport.scale;

    // Find clicked node
    for (const node of graph.nodes) {
      const pos = nodePositions.get(node.id);
      if (!pos) continue;

      const dist = Math.sqrt(
        Math.pow(mouseX - pos.x, 2) + Math.pow(mouseY - pos.y, 2)
      );
      const radius = node.isSource ? 20 : 15;
      if (dist <= radius) {
        onSelectNode(node);
        return;
      }
    }

    // Clicked on empty space
    onSelectNode(null);
  }, [graph.nodes, nodePositions, viewport, interactionMode, onSelectNode]);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.2, Math.min(3, viewport.scale * delta));

    // Zoom towards mouse position
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    onViewportChange({
      x: mouseX - (mouseX - viewport.x) * (newScale / viewport.scale),
      y: mouseY - (mouseY - viewport.y) * (newScale / viewport.scale),
      scale: newScale,
    });
  }, [viewport, onViewportChange]);

  // Zoom controls
  const zoomIn = () => onViewportChange({ ...viewport, scale: Math.min(3, viewport.scale * 1.2) });
  const zoomOut = () => onViewportChange({ ...viewport, scale: Math.max(0.2, viewport.scale / 1.2) });
  const resetView = () => onViewportChange({ x: 0, y: 0, scale: 1 });

  return (
    <div className="relative rounded-lg border border-white/10 overflow-hidden bg-gray-900/50">
      {/* Toolbar */}
      <div className="absolute top-2 left-2 z-10 flex items-center gap-1 p-1 bg-gray-800/90 rounded-lg border border-gray-700/50">
        <button
          onClick={() => setInteractionMode('select')}
          className={`p-2 rounded ${interactionMode === 'select' ? 'bg-cyan-500 text-white' : 'text-gray-400 hover:text-white'}`}
          title="Select mode"
        >
          <MousePointer className="w-4 h-4" />
        </button>
        <button
          onClick={() => setInteractionMode('pan')}
          className={`p-2 rounded ${interactionMode === 'pan' ? 'bg-cyan-500 text-white' : 'text-gray-400 hover:text-white'}`}
          title="Pan mode"
        >
          <Move className="w-4 h-4" />
        </button>
        <div className="w-px h-6 bg-gray-700 mx-1" />
        <button onClick={zoomIn} className="p-2 text-gray-400 hover:text-white" title="Zoom in">
          <ZoomIn className="w-4 h-4" />
        </button>
        <button onClick={zoomOut} className="p-2 text-gray-400 hover:text-white" title="Zoom out">
          <ZoomOut className="w-4 h-4" />
        </button>
        <button onClick={resetView} className="p-2 text-gray-400 hover:text-white" title="Reset view">
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Legend */}
      <div className="absolute top-2 right-2 z-10 p-2 bg-gray-800/90 rounded-lg border border-gray-700/50">
        <div className="space-y-1 text-xs">
          {Object.entries(IMPACT_COLORS).map(([level, colors]) => (
            <div key={level} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: colors.fill }}
              />
              <span className="text-gray-400 capitalize">{colors.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className={`${interactionMode === 'pan' ? 'cursor-grab' : 'cursor-pointer'} ${isDragging ? 'cursor-grabbing' : ''}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
        onWheel={handleWheel}
      />

      {/* Node count */}
      <div className="absolute bottom-2 left-2 text-xs text-gray-500">
        {graph.nodes.length} nodes • {graph.edges.length} edges
      </div>

      {/* Hover tooltip */}
      {hoveredNode && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-2 right-2 p-2 bg-gray-800/95 rounded-lg border border-gray-700/50 text-xs max-w-xs"
        >
          <p className="font-medium text-white truncate">{hoveredNode.fileName}</p>
          <p className="text-gray-400 truncate">{hoveredNode.directory}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`px-1.5 py-0.5 rounded text-[10px] capitalize ${
              hoveredNode.level === 'direct' ? 'bg-red-500/20 text-red-400' :
              hoveredNode.level === 'indirect' ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-gray-500/20 text-gray-400'
            }`}>
              {hoveredNode.level}
            </span>
            {hoveredNode.changeCount > 0 && (
              <span className="text-gray-500">{hoveredNode.changeCount} changes</span>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
