'use client';

import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { Grid3X3 } from 'lucide-react';
import type { WorkspaceProjectNode, CrossProjectRelationship, TierConfig } from '../sub_WorkspaceArchitecture/lib/types';
import MatrixConnectionLine from './MatrixConnectionLine';
import MatrixNode from './MatrixNode';
import MatrixZoomControls from './MatrixZoomControls';

interface MatrixDiagramViewProps {
  nodes: WorkspaceProjectNode[];
  connections: CrossProjectRelationship[];
  tierConfigs: TierConfig[];
  width: number;
  height: number;
  selectedCell: { sourceId: string; targetId: string } | null;
  hoveredCell: { sourceId: string; targetId: string } | null;
  showMatrixButton: boolean;
  onShowMatrix: () => void;
}

export default function MatrixDiagramView({
  nodes,
  connections,
  tierConfigs,
  width,
  height,
  selectedCell,
  hoveredCell,
  showMatrixButton,
  onShowMatrix,
}: MatrixDiagramViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [transform, setTransform] = useState(d3.zoomIdentity);

  // Zoom setup
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 2])
      .on('zoom', (e) => setTransform(e.transform));
    d3.select(svg).call(zoom);
    return () => {
      d3.select(svg).on('.zoom', null);
    };
  }, []);

  // Active cell from selection or hover (selection takes precedence)
  const activeCell = selectedCell || hoveredCell;
  const hasActiveSelection = !!activeCell;

  /**
   * Unified highlight checker for nodes and connections
   * @param id - The ID to check (node ID or connection source/target pair)
   * @param role - 'node' checks if ID matches source or target, 'connection' checks exact match
   * @param targetId - For connections, the target ID to match
   */
  const isHighlighted = (id: string, role: 'node' | 'connection', targetId?: string): boolean => {
    if (!activeCell) return false;

    if (role === 'node') {
      return activeCell.sourceId === id || activeCell.targetId === id;
    }

    // role === 'connection'
    return activeCell.sourceId === id && activeCell.targetId === targetId;
  };

  return (
    <div className="flex-1 relative z-10">
      {showMatrixButton && (
        <button
          onClick={onShowMatrix}
          className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-2 bg-zinc-900/90 hover:bg-cyan-900/50 rounded-lg border border-cyan-500/30 text-sm text-zinc-300 transition-all duration-200 shadow-lg hover:shadow-cyan-500/20 hover:border-cyan-400/50 backdrop-blur-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 group"
        >
          <Grid3X3 className="w-4 h-4 group-hover:text-cyan-400 transition-colors duration-200" />
          <span className="group-hover:text-white transition-colors duration-200">Show Matrix</span>
        </button>
      )}

      <svg
        ref={svgRef}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
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
          {tierConfigs.map((config) => (
            <g key={config.id}>
              <rect
                x={0}
                y={config.y}
                width={width / transform.k}
                height={config.height}
                fill={config.bgColor}
              />
              <text
                x={16}
                y={config.y + 14}
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
          {connections.map((conn) => (
            <MatrixConnectionLine
              key={conn.id}
              connection={conn}
              nodes={nodes}
              isHighlighted={isHighlighted(conn.sourceProjectId, 'connection', conn.targetProjectId)}
              isDimmed={hasActiveSelection}
            />
          ))}

          {/* Nodes */}
          {nodes.map((node) => (
            <MatrixNode
              key={node.id}
              node={node}
              isHighlighted={isHighlighted(node.id, 'node')}
            />
          ))}
        </g>
      </svg>

      <MatrixZoomControls svgRef={svgRef} />
    </div>
  );
}
