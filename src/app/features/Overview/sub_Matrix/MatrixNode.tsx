'use client';

import React from 'react';
import type { WorkspaceProjectNode } from '../sub_WorkspaceArchitecture/lib/types';
import { TIER_CONFIG } from '../sub_WorkspaceArchitecture/lib/types';

interface MatrixNodeProps {
  node: WorkspaceProjectNode;
  isHighlighted: boolean;
}

export default function MatrixNode({ node, isHighlighted }: MatrixNodeProps) {
  const tierConfig = TIER_CONFIG[node.tier];
  const displayName = node.name.length > 16 ? node.name.slice(0, 15) + '…' : node.name;

  // Branch display (full name)
  const branchName = node.branch || '';
  const branchColor = node.branchDirty ? '#f59e0b' : '#6b7280'; // amber if dirty, gray otherwise

  return (
    <g transform={`translate(${node.x}, ${node.y})`}>
      {isHighlighted && (
        <rect
          x={-2}
          y={-2}
          width={node.width + 4}
          height={node.height + 4}
          rx={8}
          fill="none"
          stroke={tierConfig.color}
          strokeWidth={2}
          opacity={0.6}
        />
      )}
      <rect
        width={node.width}
        height={node.height}
        rx={6}
        fill="#141418"
        stroke="#2a2a35"
      />
      <rect width={node.width} height={2} fill={tierConfig.color} />
      <text x={10} y={20} fill="#ffffff" fontSize={11} fontWeight={600}>
        {displayName}
      </text>
      <text x={10} y={34} fill="#6b7280" fontSize={9}>
        {node.framework}
      </text>
      {/* Git branch indicator (like IDE status bar) */}
      {node.branch && (
        <g transform={`translate(10, 44)`}>
          {/* Git branch icon (simplified) */}
          <path
            d="M2 1.5a.5.5 0 1 0 0 1 .5.5 0 0 0 0-1zM2 4.5a.5.5 0 1 0 0 1 .5.5 0 0 0 0-1zM5 4.5a.5.5 0 1 0 0 1 .5.5 0 0 0 0-1zM2.5 2v2M2.5 5h2"
            stroke={branchColor}
            strokeWidth={0.8}
            fill="none"
            strokeLinecap="round"
          />
          <text x={9} y={5.5} fill={branchColor} fontSize={8} fontFamily="monospace">
            {branchName}
          </text>
          {node.branchDirty && (
            <text x={9 + branchName.length * 4.5} y={5.5} fill="#f59e0b" fontSize={8}>
              *
            </text>
          )}
        </g>
      )}
    </g>
  );
}
