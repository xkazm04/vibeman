'use client';

/**
 * Matrix + Diagram Hybrid Architecture Visualization
 * - Split view: Matrix on left, Diagram on right
 * - Matrix shows all connections at a glance with colored dots
 * - Click matrix cell to highlight path in diagram
 * - Filter by integration type
 * - Integrated analysis trigger panel
 */

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'framer-motion';
import { ZoomIn, ZoomOut, Maximize2, Grid3X3, X, Loader2, FolderOpen, AlertCircle, RefreshCw, Network } from 'lucide-react';
import type { WorkspaceProjectNode, CrossProjectRelationship, TierConfig, ProjectTier, IntegrationType } from '../lib/types';
import { TIER_CONFIG, INTEGRATION_COLORS, INTEGRATION_STYLES } from '../lib/types';
import { buildAdjacencyMatrix } from '../lib/mockData';
import { useArchitectureData } from '../lib/useArchitectureData';
import BatchProjectOnboarding from '../components/BatchProjectOnboarding';
import { useWorkspaceStore } from '@/stores/workspaceStore';

const TIER_ORDER: ProjectTier[] = ['frontend', 'backend', 'external', 'shared'];

interface MatrixDiagramCanvasProps {
  workspaceId: string | null;
  onProjectSelect?: (projectId: string) => void;
  onAnalysisPrompt?: (prompt: string, analysisId: string) => void;
  onBatchOnboarding?: (prompt: string, onboardingId: string) => void;
}

export default function MatrixDiagramCanvas({ workspaceId, onProjectSelect, onAnalysisPrompt, onBatchOnboarding }: MatrixDiagramCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [transform, setTransform] = useState(d3.zoomIdentity);
  const [selectedCell, setSelectedCell] = useState<{ sourceId: string; targetId: string } | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{ sourceId: string; targetId: string } | null>(null);
  const [filterTypes, setFilterTypes] = useState<Set<IntegrationType>>(new Set());
  const [showMatrix, setShowMatrix] = useState(true);

  // Get workspace info for batch onboarding
  const { workspaces } = useWorkspaceStore();
  const activeWorkspace = workspaceId && workspaceId !== 'default'
    ? workspaces.find(ws => ws.id === workspaceId)
    : null;

  // Use real data from the hook
  const { data, loading, error, analysisStatus, triggerAnalysis, refresh } = useArchitectureData(workspaceId);

  // Sort nodes by tier for consistent ordering
  const sortedNodes = useMemo(() => {
    if (!data.projects.length) return [];
    return [...data.projects].sort((a, b) => {
      const tierOrder = { frontend: 0, backend: 1, external: 2, shared: 3 };
      return tierOrder[a.tier] - tierOrder[b.tier];
    });
  }, [data.projects]);

  // Build adjacency matrix
  const matrix = useMemo(() => {
    if (!sortedNodes.length) return new Map();
    return buildAdjacencyMatrix(sortedNodes, data.relationships);
  }, [sortedNodes, data.relationships]);

  // Filter connections by type
  const filteredConnections = useMemo(() => {
    if (filterTypes.size === 0) return data.relationships;
    return data.relationships.filter(c => filterTypes.has(c.integrationType));
  }, [data.relationships, filterTypes]);

  // Position nodes for diagram
  const { nodes, tierConfigs } = useMemo(() => {
    if (!data.projects.length) return { nodes: [], tierConfigs: [] };
    const projects = [...data.projects];
    const configs: TierConfig[] = [];
    const nodeWidth = 160;
    const nodeHeight = 60;
    const tierPadding = 70;
    const nodePadding = 24;
    const topMargin = 40;
    const leftMargin = 100;

    const byTier = new Map<ProjectTier, WorkspaceProjectNode[]>();
    for (const p of projects) {
      const list = byTier.get(p.tier) || [];
      list.push(p);
      byTier.set(p.tier, list);
    }

    let currentY = topMargin;
    for (const tierId of TIER_ORDER) {
      const tierNodes = byTier.get(tierId) || [];
      if (tierNodes.length === 0) continue;

      const tierHeight = 100;
      configs.push({ ...TIER_CONFIG[tierId], y: currentY, height: tierHeight });

      const diagramWidth = dimensions.width * (showMatrix ? 0.5 : 1) - leftMargin;
      const totalWidth = tierNodes.length * nodeWidth + (tierNodes.length - 1) * nodePadding;
      const startX = leftMargin + Math.max(0, (diagramWidth - totalWidth) / 2);

      tierNodes.forEach((node, idx) => {
        node.width = nodeWidth;
        node.height = nodeHeight;
        node.x = startX + idx * (nodeWidth + nodePadding);
        node.y = currentY + (tierHeight - nodeHeight) / 2;
      });

      currentY += tierHeight + tierPadding;
    }

    return { nodes: projects, tierConfigs: configs };
  }, [data.projects, dimensions.width, showMatrix]);

  // Check if connection should be highlighted
  const isConnectionHighlighted = useCallback((conn: CrossProjectRelationship) => {
    const active = selectedCell || hoveredCell;
    if (!active) return false;
    return conn.sourceProjectId === active.sourceId && conn.targetProjectId === active.targetId;
  }, [selectedCell, hoveredCell]);

  // Handle batch onboarding - must be before conditional returns
  const handleBatchOnboarding = useCallback((prompt: string, folders: Array<{ name: string; path: string; selected: boolean }>) => {
    if (!activeWorkspace || !onBatchOnboarding) return;
    const onboardingId = `onboard-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    onBatchOnboarding(prompt, onboardingId);
  }, [activeWorkspace, onBatchOnboarding]);

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setDimensions({ width, height });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Zoom setup
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 2])
      .on('zoom', e => setTransform(e.transform));
    d3.select(svg).call(zoom);
    return () => { d3.select(svg).on('.zoom', null); };
  }, []);

  const toggleFilter = (type: IntegrationType) => {
    setFilterTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  // Render connection line
  const renderConnection = (conn: CrossProjectRelationship) => {
    const source = nodes.find(n => n.id === conn.sourceProjectId);
    const target = nodes.find(n => n.id === conn.targetProjectId);
    if (!source || !target) return null;

    const sx = source.x + source.width / 2;
    const sy = source.y + source.height;
    const tx = target.x + target.width / 2;
    const ty = target.y;
    const midY = (sy + ty) / 2;

    const color = INTEGRATION_COLORS[conn.integrationType];
    const style = INTEGRATION_STYLES[conn.integrationType];
    const isHighlighted = isConnectionHighlighted(conn);
    const opacity = isHighlighted ? 1 : (selectedCell || hoveredCell) ? 0.1 : 0.4;

    return (
      <g key={conn.id}>
        {isHighlighted && (
          <path
            d={`M ${sx} ${sy} C ${sx} ${midY}, ${tx} ${midY}, ${tx} ${ty}`}
            fill="none"
            stroke={color}
            strokeWidth={8}
            opacity={0.3}
          />
        )}
        <path
          d={`M ${sx} ${sy} C ${sx} ${midY}, ${tx} ${midY}, ${tx} ${ty}`}
          fill="none"
          stroke={color}
          strokeWidth={isHighlighted ? 2.5 : 1.5}
          strokeDasharray={style.dashed ? '6 4' : undefined}
          opacity={opacity}
        />
        <polygon
          points={`${tx},${ty} ${tx - 5},${ty - 10} ${tx + 5},${ty - 10}`}
          fill={color}
          opacity={opacity}
        />
        {isHighlighted && (
          <g transform={`translate(${(sx + tx) / 2}, ${midY})`}>
            <rect x={-45} y={-10} width={90} height={20} rx={4} fill="#1a1a20" stroke={color} strokeWidth={1} />
            <text textAnchor="middle" dominantBaseline="middle" fill="#e5e7eb" fontSize={10}>
              {conn.label}
            </text>
          </g>
        )}
      </g>
    );
  };

  // Render node
  const renderNode = (node: WorkspaceProjectNode) => {
    const tierConfig = TIER_CONFIG[node.tier];
    const isHighlighted = (selectedCell?.sourceId === node.id || selectedCell?.targetId === node.id) ||
                         (hoveredCell?.sourceId === node.id || hoveredCell?.targetId === node.id);

    return (
      <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
        {isHighlighted && (
          <rect x={-2} y={-2} width={node.width + 4} height={node.height + 4} rx={8} fill="none" stroke={tierConfig.color} strokeWidth={2} opacity={0.6} />
        )}
        <rect width={node.width} height={node.height} rx={6} fill="#141418" stroke="#2a2a35" />
        <rect width={node.width} height={2} fill={tierConfig.color} />
        <text x={10} y={22} fill="#ffffff" fontSize={11} fontWeight={600}>
          {node.name.length > 16 ? node.name.slice(0, 15) + '…' : node.name}
        </text>
        <text x={10} y={38} fill="#6b7280" fontSize={9}>{node.framework}</text>
      </g>
    );
  };

  // Matrix cell size - reduced padding for better fit
  const cellSize = 26;
  const labelOffset = 80; // Reduced from 120
  const matrixWidth = sortedNodes.length * cellSize + labelOffset;

  // Get unique integration types from actual relationships (dynamic filter)
  const availableIntegrationTypes = useMemo(() => {
    const types = new Set<IntegrationType>();
    data.relationships.forEach(r => types.add(r.integrationType));
    return Array.from(types);
  }, [data.relationships]);

  // Loading state
  if (loading) {
    return (
      <div ref={containerRef} className="relative w-full h-full bg-[#0a0a0c] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          <span className="text-sm text-zinc-500">Loading architecture data...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div ref={containerRef} className="relative w-full h-full bg-[#0a0a0c] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 max-w-md text-center px-6">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-zinc-300 mb-2">Failed to Load Architecture</h3>
            <p className="text-sm text-zinc-500 mb-4">{error}</p>
            <button
              onClick={() => refresh()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Empty state - no projects
  if (data.projects.length === 0) {
    // If workspace has base_path, show batch onboarding option
    if (activeWorkspace?.base_path && onBatchOnboarding) {
      return (
        <div ref={containerRef} className="relative w-full h-full bg-[#0a0a0c] flex items-center justify-center">
          <div className="flex flex-col items-center gap-6 px-6">
            <div className="text-center mb-2">
              <h3 className="text-lg font-medium text-zinc-300 mb-2">
                Batch Add Projects to {activeWorkspace.name}
              </h3>
              <p className="text-sm text-zinc-500">
                Select folders to add as projects using Claude Code
              </p>
            </div>
            <BatchProjectOnboarding
              workspaceId={activeWorkspace.id}
              workspaceName={activeWorkspace.name}
              basePath={activeWorkspace.base_path}
              onStartOnboarding={handleBatchOnboarding}
              onRefresh={refresh}
            />
          </div>
        </div>
      );
    }

    // Default empty state
    return (
      <div ref={containerRef} className="relative w-full h-full bg-[#0a0a0c] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 max-w-md text-center px-6">
          <div className="w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center">
            <Network className="w-8 h-8 text-zinc-500" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-zinc-300 mb-2">No Projects in Workspace</h3>
            <p className="text-sm text-zinc-500 mb-4">
              Add projects to this workspace to visualize their architecture and discover cross-project connections.
            </p>
          </div>
          {/* Ghosted example preview */}
          <div className="w-full max-w-xs opacity-30 pointer-events-none">
            <div className="flex items-center justify-center gap-8 mb-6">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-lg bg-cyan-500/20 border border-cyan-500/30" />
                <span className="text-xs text-zinc-600 mt-1">Frontend</span>
              </div>
              <div className="w-8 h-0.5 bg-zinc-700" />
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-lg bg-violet-500/20 border border-violet-500/30" />
                <span className="text-xs text-zinc-600 mt-1">Backend</span>
              </div>
            </div>
            <p className="text-xs text-zinc-600 text-center">
              Architecture visualization will appear here
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden flex">
      {/* Background styling */}
      <div className="absolute inset-0 bg-[#08080a]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.02)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      <div className="absolute top-0 left-0 w-1/3 h-1/2 bg-cyan-500/5 blur-[100px] pointer-events-none" />

      {/* Matrix Panel (collapsible) - 50% width */}
      <AnimatePresence>
        {showMatrix && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: '50%', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="h-full border-r border-cyan-500/20 bg-[#0a0a0c]/80 backdrop-blur-sm overflow-auto flex-shrink-0 relative z-10"
          >
            <div className="p-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                  <Grid3X3 className="w-4 h-4 text-cyan-400" />
                  Connection Matrix
                </h3>
                <button onClick={() => setShowMatrix(false)} className="p-1.5 hover:bg-zinc-800/80 rounded-lg transition-colors">
                  <X className="w-4 h-4 text-zinc-500" />
                </button>
              </div>

              {/* Filter chips - only show if there are integration types */}
              {availableIntegrationTypes.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3 p-2 bg-zinc-900/50 rounded-lg border border-zinc-800/50">
                  {availableIntegrationTypes.map((type) => {
                    const style = INTEGRATION_STYLES[type];
                    const isActive = filterTypes.has(type);
                    return (
                      <button
                        key={type}
                        onClick={() => toggleFilter(type)}
                        className={`px-2 py-1 text-[10px] rounded-md border transition-all ${
                          isActive
                            ? 'border-transparent'
                            : 'border-zinc-700/50 text-zinc-500 hover:border-zinc-600 hover:text-zinc-400'
                        }`}
                        style={isActive ? {
                          backgroundColor: `${INTEGRATION_COLORS[type]}20`,
                          color: INTEGRATION_COLORS[type],
                          borderColor: `${INTEGRATION_COLORS[type]}50`,
                        } : {}}
                      >
                        {style.shortLabel}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Matrix */}
              <div className="overflow-auto bg-zinc-900/30 rounded-lg border border-zinc-800/50 p-2">
                <svg width={matrixWidth} height={sortedNodes.length * cellSize + 60}>
                  {/* Column headers (rotated) - moved up 10px */}
                  {sortedNodes.map((node, i) => (
                    <g key={`col-${node.id}`} transform={`translate(${labelOffset + i * cellSize + cellSize / 2}, 50)`}>
                      <text
                        transform="rotate(-45)"
                        textAnchor="end"
                        fill={TIER_CONFIG[node.tier].color}
                        fontSize={9}
                        fontWeight={500}
                      >
                        {node.name.slice(0, 10)}
                      </text>
                    </g>
                  ))}

                  {/* Row headers and cells */}
                  {sortedNodes.map((source, row) => (
                    <g key={`row-${source.id}`} transform={`translate(0, ${60 + row * cellSize})`}>
                      {/* Row header */}
                      <text
                        x={labelOffset - 6}
                        y={cellSize / 2 + 3}
                        textAnchor="end"
                        fill={TIER_CONFIG[source.tier].color}
                        fontSize={9}
                        fontWeight={500}
                      >
                        {source.name.slice(0, 10)}
                      </text>

                      {/* Cells */}
                      {sortedNodes.map((target, col) => {
                        if (source.id === target.id) {
                          return (
                            <rect
                              key={`cell-${source.id}-${target.id}`}
                              x={labelOffset + col * cellSize}
                              y={0}
                              width={cellSize - 2}
                              height={cellSize - 2}
                              fill="#1a1a1a"
                              rx={3}
                            />
                          );
                        }

                        const connections = matrix.get(`${source.id}-${target.id}`) || [];
                        const filtered = filterTypes.size === 0
                          ? connections
                          : connections.filter(c => filterTypes.has(c.integrationType));
                        const hasConnection = filtered.length > 0;
                        const isActive = (selectedCell?.sourceId === source.id && selectedCell?.targetId === target.id) ||
                                        (hoveredCell?.sourceId === source.id && hoveredCell?.targetId === target.id);

                        return (
                          <g
                            key={`cell-${source.id}-${target.id}`}
                            onMouseEnter={() => setHoveredCell({ sourceId: source.id, targetId: target.id })}
                            onMouseLeave={() => setHoveredCell(null)}
                            onClick={() => setSelectedCell(
                              selectedCell?.sourceId === source.id && selectedCell?.targetId === target.id
                                ? null
                                : { sourceId: source.id, targetId: target.id }
                            )}
                            style={{ cursor: hasConnection ? 'pointer' : 'default' }}
                          >
                            <rect
                              x={labelOffset + col * cellSize}
                              y={0}
                              width={cellSize - 2}
                              height={cellSize - 2}
                              fill={isActive ? '#1e293b' : '#141418'}
                              stroke={isActive ? '#3b82f6' : 'transparent'}
                              strokeWidth={isActive ? 1.5 : 0}
                              rx={3}
                            />
                            {hasConnection && (
                              <>
                                {/* Color dots for each integration type */}
                                {[...new Set(filtered.map(c => c.integrationType))].slice(0, 3).map((type, i) => (
                                  <circle
                                    key={type}
                                    cx={labelOffset + col * cellSize + cellSize / 2 - 5 + i * 5}
                                    cy={cellSize / 2}
                                    r={3.5}
                                    fill={INTEGRATION_COLORS[type]}
                                    opacity={isActive ? 1 : 0.7}
                                  />
                                ))}
                              </>
                            )}
                          </g>
                        );
                      })}
                    </g>
                  ))}
                </svg>
              </div>

              {/* Selected cell info */}
              {selectedCell && (
                <div className="mt-3 p-3 bg-cyan-500/5 rounded-lg border border-cyan-500/20">
                  <div className="text-xs text-cyan-300 mb-2 font-medium">
                    {sortedNodes.find(n => n.id === selectedCell.sourceId)?.name}
                    <span className="text-cyan-500 mx-2">→</span>
                    {sortedNodes.find(n => n.id === selectedCell.targetId)?.name}
                  </div>
                  <div className="space-y-1.5">
                    {(matrix.get(`${selectedCell.sourceId}-${selectedCell.targetId}`) || []).map(conn => (
                      <div key={conn.id} className="flex items-center gap-2 text-xs bg-zinc-900/50 px-2 py-1.5 rounded">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: INTEGRATION_COLORS[conn.integrationType] }}
                        />
                        <span className="text-zinc-200 flex-1">{conn.label}</span>
                        <span className="text-zinc-500 text-[10px]">{INTEGRATION_STYLES[conn.integrationType].shortLabel}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Diagram Panel */}
      <div className="flex-1 relative z-10">
        {!showMatrix && (
          <button
            onClick={() => setShowMatrix(true)}
            className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-2 bg-zinc-900/90 hover:bg-cyan-900/50 rounded-lg border border-cyan-500/30 text-sm text-zinc-300 transition-colors shadow-lg"
          >
            <Grid3X3 className="w-4 h-4" />
            Show Matrix
          </button>
        )}

        <svg
          ref={svgRef}
          width={dimensions.width - (showMatrix ? dimensions.width * 0.5 : 0)}
          height={dimensions.height}
          viewBox={`0 0 ${dimensions.width - (showMatrix ? dimensions.width * 0.5 : 0)} ${dimensions.height}`}
          className="block"
          style={{ width: '100%', height: '100%' }}
        >
          <defs>
            <pattern id="matrix-grid" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="12" cy="12" r="0.5" fill="#1a1a20" />
            </pattern>
          </defs>

          <rect width="100%" height="100%" fill="#0a0a0c" />
          <rect width="100%" height="100%" fill="url(#matrix-grid)" />

          <g transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}>
            {/* Tier backgrounds */}
            {tierConfigs.map(config => (
              <g key={config.id}>
                <rect
                  x={0} y={config.y}
                  width={(dimensions.width - (showMatrix ? dimensions.width * 0.5 : 0)) / transform.k}
                  height={config.height}
                  fill={config.bgColor}
                />
                <text
                  x={16} y={config.y + 14}
                  fill={config.color}
                  fontSize={10}
                  fontWeight={600}
                  opacity={0.6}
                  style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}
                >
                  {config.label}
                </text>
              </g>
            ))}

            {/* Connections */}
            {filteredConnections.map(renderConnection)}

            {/* Nodes */}
            {nodes.map(renderNode)}
          </g>
        </svg>

        {/* Controls */}
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          <button onClick={() => d3.select(svgRef.current!).transition().duration(300).call(d3.zoom<SVGSVGElement, unknown>().scaleBy as any, 1.3)} className="p-2 bg-zinc-900/90 hover:bg-zinc-800 rounded-lg border border-zinc-700/50">
            <ZoomIn className="w-4 h-4 text-zinc-400" />
          </button>
          <button onClick={() => d3.select(svgRef.current!).transition().duration(300).call(d3.zoom<SVGSVGElement, unknown>().scaleBy as any, 0.7)} className="p-2 bg-zinc-900/90 hover:bg-zinc-800 rounded-lg border border-zinc-700/50">
            <ZoomOut className="w-4 h-4 text-zinc-400" />
          </button>
          <button onClick={() => d3.select(svgRef.current!).transition().duration(500).call(d3.zoom<SVGSVGElement, unknown>().transform as any, d3.zoomIdentity)} className="p-2 bg-zinc-900/90 hover:bg-zinc-800 rounded-lg border border-zinc-700/50">
            <Maximize2 className="w-4 h-4 text-zinc-400" />
          </button>
        </div>
      </div>
    </div>
  );
}
