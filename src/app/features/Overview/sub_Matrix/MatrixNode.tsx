'use client';

import React from 'react';
import type { WorkspaceProjectNode } from '../sub_WorkspaceArchitecture/lib/types';
import { TIER_CONFIG } from '../sub_WorkspaceArchitecture/lib/types';
import type { ZoomDetailFlags } from './lib/semanticZoom';

interface MatrixNodeProps {
  node: WorkspaceProjectNode;
  isHighlighted: boolean;
  /** Detail flags from semantic zoom level (optional for backwards compatibility) */
  detailFlags?: ZoomDetailFlags;
}

/**
 * MatrixNode with semantic zoom support
 * Renders different levels of detail based on zoom level:
 * - Medium zoom: name + framework
 * - High zoom: name + framework + git branch + file counts
 */
export default function MatrixNode({ node, isHighlighted, detailFlags }: MatrixNodeProps) {
  const tierConfig = TIER_CONFIG[node.tier];

  // Default to high detail for backwards compatibility
  const flags = detailFlags ?? {
    showNodeName: true,
    showFramework: true,
    showGitBranch: true,
    showCounts: true,
    showHealth: true,
    maxNameLength: 24,
  };

  // Truncate name based on zoom level
  const maxLen = flags.maxNameLength || 16;
  const displayName = node.name.length > maxLen ? node.name.slice(0, maxLen - 1) + '…' : node.name;

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

      {/* Node name - always shown when node is visible */}
      {flags.showNodeName && (
        <text x={10} y={20} fill="#ffffff" fontSize={11} fontWeight={600}>
          {displayName}
        </text>
      )}

      {/* Framework label - medium+ zoom */}
      {flags.showFramework && node.framework && (
        <text x={10} y={34} fill="#6b7280" fontSize={9}>
          {node.framework}
        </text>
      )}

      {/* Git branch indicator - high zoom only */}
      {flags.showGitBranch && node.branch && (
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

      {/* File/context counts - high zoom only */}
      {flags.showCounts && (node.contextCount > 0 || node.contextGroupCount > 0) && (
        <g transform={`translate(10, ${flags.showGitBranch && node.branch ? 60 : 44})`}>
          <text x={0} y={5.5} fill="#4b5563" fontSize={8}>
            {node.contextGroupCount > 0 && `${node.contextGroupCount} groups`}
            {node.contextGroupCount > 0 && node.contextCount > 0 && ' · '}
            {node.contextCount > 0 && `${node.contextCount} contexts`}
          </text>
        </g>
      )}

      {/* Connection count badge - high zoom only */}
      {flags.showCounts && node.connectionCount > 0 && (
        <g transform={`translate(${node.width - 24}, 8)`}>
          <rect
            width={18}
            height={14}
            rx={3}
            fill={tierConfig.color}
            opacity={0.2}
          />
          <text
            x={9}
            y={10}
            fill={tierConfig.color}
            fontSize={8}
            fontWeight={600}
            textAnchor="middle"
          >
            {node.connectionCount}
          </text>
        </g>
      )}
    </g>
  );
}
