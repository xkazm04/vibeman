'use client';

import React from 'react';
import type { TierAggregate } from './lib/semanticZoom';
import { archTheme } from './lib/archTheme';

interface MatrixTierAggregateProps {
  aggregate: TierAggregate;
  tierY: number;
  tierHeight: number;
  canvasWidth: number;
}

/**
 * MatrixTierAggregate - Low zoom level tier representation
 * Shows aggregated counts instead of individual nodes for performance
 */
export default function MatrixTierAggregate({
  aggregate,
  tierY,
  tierHeight,
  canvasWidth,
}: MatrixTierAggregateProps) {
  const centerX = canvasWidth / 2;
  const centerY = tierY + tierHeight / 2;

  // Badge dimensions
  const badgeWidth = 180;
  const badgeHeight = 60;

  return (
    <g transform={`translate(${centerX - badgeWidth / 2}, ${centerY - badgeHeight / 2})`}>
      {/* Badge background */}
      <rect
        width={badgeWidth}
        height={badgeHeight}
        rx={8}
        fill={archTheme.surface.muted}
        stroke={aggregate.tierColor}
        strokeWidth={2}
        opacity={0.9}
      />

      {/* Tier color accent bar */}
      <rect
        width={badgeWidth}
        height={3}
        fill={aggregate.tierColor}
        rx={1}
      />

      {/* Tier label */}
      <text
        x={badgeWidth / 2}
        y={22}
        fill={archTheme.text.primary}
        fontSize={12}
        fontWeight={600}
        textAnchor="middle"
      >
        {aggregate.tierLabel}
      </text>

      {/* Node count */}
      <text
        x={badgeWidth / 2}
        y={40}
        fill={aggregate.tierColor}
        fontSize={14}
        fontWeight={700}
        textAnchor="middle"
      >
        {aggregate.nodeCount} {aggregate.nodeCount === 1 ? 'project' : 'projects'}
      </text>

      {/* Connection counts (if any) */}
      {aggregate.totalConnections > 0 && (
        <text
          x={badgeWidth / 2}
          y={54}
          fill={archTheme.text.dim}
          fontSize={9}
          textAnchor="middle"
        >
          {aggregate.incomingConnections}↓ · {aggregate.outgoingConnections}↑ connections
        </text>
      )}
    </g>
  );
}
