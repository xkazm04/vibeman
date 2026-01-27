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

  const isConnectionHighlighted = (conn: CrossProjectRelationship) => {
    const active = selectedCell || hoveredCell;
    if (!active) return false;
    return conn.sourceProjectId === active.sourceId && conn.targetProjectId === active.targetId;
  };

  const isNodeHighlighted = (nodeId: string) => {
    return (
      selectedCell?.sourceId === nodeId ||
      selectedCell?.targetId === nodeId ||
      hoveredCell?.sourceId === nodeId ||
      hoveredCell?.targetId === nodeId
    );
  };

  const hasActiveSelection = !!(selectedCell || hoveredCell);

  return (
    <div className="flex-1 relative z-10">
      {showMatrixButton && (
        <button
          onClick={onShowMatrix}
          className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-2 bg-zinc-900/90 hover:bg-cyan-900/50 rounded-lg border border-cyan-500/30 text-sm text-zinc-300 transition-colors shadow-lg"
        >
          <Grid3X3 className="w-4 h-4" />
          Show Matrix
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
              isHighlighted={isConnectionHighlighted(conn)}
              isDimmed={hasActiveSelection}
            />
          ))}

          {/* Nodes */}
          {nodes.map((node) => (
            <MatrixNode
              key={node.id}
              node={node}
              isHighlighted={isNodeHighlighted(node.id)}
            />
          ))}
        </g>
      </svg>

      <MatrixZoomControls svgRef={svgRef} />
    </div>
  );
}
