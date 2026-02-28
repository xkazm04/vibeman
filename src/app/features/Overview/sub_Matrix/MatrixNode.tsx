'use client';

import React, { useState } from 'react';
import type { WorkspaceProjectNode } from '../sub_WorkspaceArchitecture/lib/types';
import { TIER_CONFIG } from '../sub_WorkspaceArchitecture/lib/types';
import type { ZoomDetailFlags } from './lib/semanticZoom';
import type { ImpactLevel } from '../sub_WorkspaceArchitecture/lib/blastRadiusEngine';
import { BLAST_RADIUS_COLORS } from '../sub_WorkspaceArchitecture/lib/blastRadiusEngine';
import { archTheme } from './lib/archTheme';

interface MatrixNodeProps {
  node: WorkspaceProjectNode;
  isHighlighted: boolean;
  /** Detail flags from semantic zoom level (optional for backwards compatibility) */
  detailFlags?: ZoomDetailFlags;
  /** Blast radius impact level — when set, overrides highlight ring with impact coloring */
  impactLevel?: ImpactLevel | null;
  /** Click handler for impact mode activation */
  onClick?: (nodeId: string) => void;
}

/**
 * MatrixNode with semantic zoom support
 * Renders different levels of detail based on zoom level:
 * - Medium zoom: name + framework
 * - High zoom: name + framework + git branch + file counts
 */
export default function MatrixNode({ node, isHighlighted, detailFlags, impactLevel, onClick }: MatrixNodeProps) {
  const [hovered, setHovered] = useState(false);
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
  const branchColor = node.branchDirty ? archTheme.indicator.dirty : archTheme.text.dim;

  // Determine ring color: blast radius impact takes precedence over tier highlight
  const impactColor = impactLevel ? BLAST_RADIUS_COLORS[impactLevel] : null;
  const showRing = isHighlighted || !!impactColor;
  const ringColor = impactColor || tierConfig.color;
  const ringOpacity = impactLevel === 'origin' ? 0.9 : impactColor ? 0.7 : 0.6;
  const ringWidth = impactLevel === 'origin' ? 2.5 : 2;

  // Tooltip dimensions
  const tooltipW = 220;
  const tooltipH = 90;
  const pointerSize = 4;

  return (
    <g
      transform={`translate(${node.x}, ${node.y})`}
      onClick={onClick ? () => onClick(node.id) : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={onClick ? { cursor: 'pointer' } : undefined}
    >
      {showRing && (
        <rect
          x={-2}
          y={-2}
          width={node.width + 4}
          height={node.height + 4}
          rx={8}
          fill="none"
          stroke={ringColor}
          strokeWidth={ringWidth}
          opacity={ringOpacity}
        />
      )}
      {/* Impact glow for origin node */}
      {impactLevel === 'origin' && (
        <rect
          x={-4}
          y={-4}
          width={node.width + 8}
          height={node.height + 8}
          rx={10}
          fill="none"
          stroke={BLAST_RADIUS_COLORS.origin}
          strokeWidth={1}
          opacity={0.3}
        />
      )}
      <rect
        width={node.width}
        height={node.height}
        rx={6}
        fill={archTheme.surface.card}
        stroke={impactColor || archTheme.border.card}
        strokeWidth={impactColor ? 1.5 : 1}
        strokeOpacity={impactColor ? 0.4 : 1}
      />
      <rect width={node.width} height={2} fill={impactColor || tierConfig.color} />

      {/* Node name - always shown when node is visible */}
      {flags.showNodeName && (
        <text x={10} y={20} fill={archTheme.text.primary} fontSize={11} fontWeight={600}>
          {displayName}
        </text>
      )}

      {/* Framework label - medium+ zoom */}
      {flags.showFramework && node.framework && (
        <text x={10} y={34} fill={archTheme.text.dim} fontSize={9}>
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
            <text x={9 + branchName.length * 4.5} y={5.5} fill={archTheme.indicator.dirty} fontSize={8}>
              *
            </text>
          )}
        </g>
      )}

      {/* File/context counts - high zoom only */}
      {flags.showCounts && (node.contextCount > 0 || node.contextGroupCount > 0) && (
        <g transform={`translate(10, ${flags.showGitBranch && node.branch ? 60 : 44})`}>
          <text x={0} y={5.5} fill={archTheme.text.faint} fontSize={8}>
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

      {/* Hover tooltip with full metadata */}
      {hovered && (
        <g transform={`translate(${(node.width - tooltipW) / 2}, ${-(tooltipH + pointerSize + 8)})`}>
          {/* Pointer triangle */}
          <polygon
            points={`${tooltipW / 2 - pointerSize},${tooltipH} ${tooltipW / 2 + pointerSize},${tooltipH} ${tooltipW / 2},${tooltipH + pointerSize}`}
            fill="#0a0a0f"
          />
          <foreignObject width={tooltipW} height={tooltipH} style={{ overflow: 'visible' }}>
            <div
              style={{
                background: 'rgba(10,10,15,0.95)',
                backdropFilter: 'blur(8px)',
                borderRadius: 6,
                borderLeft: `3px solid ${tierConfig.color}`,
                padding: '8px 10px',
                fontFamily: 'system-ui, sans-serif',
                lineHeight: 1.4,
                pointerEvents: 'none',
              }}
            >
              {/* Full name */}
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 4, wordBreak: 'break-word' }}>
                {node.name}
              </div>
              {/* Framework + version */}
              {node.framework && (
                <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>
                  <span style={{
                    display: 'inline-block',
                    background: 'rgba(255,255,255,0.08)',
                    borderRadius: 3,
                    padding: '1px 5px',
                    fontSize: 10,
                    color: '#d1d5db',
                  }}>
                    {node.framework}
                  </span>
                </div>
              )}
              {/* Git branch */}
              {node.branch && (
                <div style={{ fontSize: 11, color: node.branchDirty ? '#f59e0b' : '#6b7280', marginBottom: 2 }}>
                  <svg width="10" height="10" viewBox="0 0 7 7" style={{ verticalAlign: 'middle', marginRight: 3 }}>
                    <path d="M2 1.5a.5.5 0 1 0 0 1 .5.5 0 0 0 0-1zM2 4.5a.5.5 0 1 0 0 1 .5.5 0 0 0 0-1zM5 4.5a.5.5 0 1 0 0 1 .5.5 0 0 0 0-1zM2.5 2v2M2.5 5h2"
                      stroke="currentColor" strokeWidth="0.8" fill="none" strokeLinecap="round" />
                  </svg>
                  {node.branch}{node.branchDirty ? ' *' : ''}
                </div>
              )}
              {/* Counts row */}
              <div style={{ fontSize: 10, color: '#6b7280', display: 'flex', gap: 8, marginTop: 2, flexWrap: 'wrap' }}>
                {(node.contextGroupCount > 0 || node.contextCount > 0) && (
                  <span>{node.contextGroupCount} groups · {node.contextCount} contexts</span>
                )}
                {node.connectionCount > 0 && (
                  <span>{node.connectionCount} connections</span>
                )}
              </div>
            </div>
          </foreignObject>
        </g>
      )}
    </g>
  );
}
