/**
 * FlowArrow Component
 * SVG directional arrow with configurable thickness, color, and direction.
 * Uses quadratic Bezier curves to avoid overlapping node boundaries.
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface FlowArrowProps {
  fromPos: { x: number; y: number };
  toPos: { x: number; y: number };
  totalCount: number;
  successRate: number;
  isHighlighted: boolean;
  uniqueId: string;
  onClick: () => void;
}

function getArrowColor(successRate: number): string {
  if (successRate > 0.8) return '#22c55e'; // green-500
  if (successRate >= 0.5) return '#eab308'; // yellow-500
  return '#ef4444'; // red-500
}

function getArrowThickness(totalCount: number): number {
  return Math.min(2 + totalCount * 1.5, 12);
}

export default function FlowArrow({
  fromPos,
  toPos,
  totalCount,
  successRate,
  isHighlighted,
  uniqueId,
  onClick,
}: FlowArrowProps) {
  const color = getArrowColor(successRate);
  const thickness = getArrowThickness(totalCount);

  // Calculate control point for quadratic Bezier curve
  // Offset perpendicular to the line to create a slight arc
  const midX = (fromPos.x + toPos.x) / 2;
  const midY = (fromPos.y + toPos.y) / 2;
  const dx = toPos.x - fromPos.x;
  const dy = toPos.y - fromPos.y;
  const len = Math.sqrt(dx * dx + dy * dy);

  // Perpendicular offset (arc curvature)
  const offsetAmount = Math.min(len * 0.15, 40);
  const nx = len > 0 ? -dy / len : 0;
  const ny = len > 0 ? dx / len : 0;
  const cpX = midX + nx * offsetAmount;
  const cpY = midY + ny * offsetAmount;

  // Shorten the arrow to not overlap node boundaries (node is ~48px wide, ~40px tall)
  const nodeRadius = 48;
  const startDist = len > 0 ? nodeRadius / len : 0;
  const endDist = len > 0 ? 1 - nodeRadius / len : 1;

  // Parametric point on the quadratic bezier
  const bezierPoint = (t: number) => ({
    x: (1 - t) * (1 - t) * fromPos.x + 2 * (1 - t) * t * cpX + t * t * toPos.x,
    y: (1 - t) * (1 - t) * fromPos.y + 2 * (1 - t) * t * cpY + t * t * toPos.y,
  });

  const start = bezierPoint(Math.max(startDist, 0.05));
  const end = bezierPoint(Math.min(endDist, 0.95));
  const controlAdj = bezierPoint(0.5);

  const pathD = `M ${start.x} ${start.y} Q ${controlAdj.x} ${controlAdj.y}, ${end.x} ${end.y}`;

  // Calculate arrowhead direction from the curve near the endpoint
  const nearEnd = bezierPoint(Math.min(endDist - 0.05, 0.9));
  const arrowAngle = Math.atan2(end.y - nearEnd.y, end.x - nearEnd.x);
  const arrowSize = Math.max(thickness * 1.5, 6);

  const arrowP1 = {
    x: end.x - arrowSize * Math.cos(arrowAngle - Math.PI / 6),
    y: end.y - arrowSize * Math.sin(arrowAngle - Math.PI / 6),
  };
  const arrowP2 = {
    x: end.x - arrowSize * Math.cos(arrowAngle + Math.PI / 6),
    y: end.y - arrowSize * Math.sin(arrowAngle + Math.PI / 6),
  };

  // Clickable hit area (wider invisible path)
  const hitPathD = pathD;

  return (
    <g className="cursor-pointer" onClick={onClick}>
      {/* Invisible hit area for easier clicking */}
      <path
        d={hitPathD}
        stroke="transparent"
        strokeWidth={Math.max(thickness + 12, 16)}
        fill="none"
        style={{ pointerEvents: 'stroke' }}
      />

      {/* Main arrow path */}
      <motion.path
        d={pathD}
        stroke={color}
        strokeWidth={isHighlighted ? thickness + 1 : thickness}
        fill="none"
        strokeLinecap="round"
        opacity={isHighlighted ? 0.95 : 0.6}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: isHighlighted ? 0.95 : 0.6 }}
        transition={{ duration: 0.8, ease: 'easeInOut' }}
      />

      {/* Glow effect when highlighted */}
      {isHighlighted && (
        <motion.path
          d={pathD}
          stroke={color}
          strokeWidth={thickness + 4}
          fill="none"
          strokeLinecap="round"
          opacity={0.2}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.2 }}
        />
      )}

      {/* Arrowhead */}
      <motion.polygon
        points={`${end.x},${end.y} ${arrowP1.x},${arrowP1.y} ${arrowP2.x},${arrowP2.y}`}
        fill={color}
        opacity={isHighlighted ? 0.95 : 0.6}
        initial={{ opacity: 0 }}
        animate={{ opacity: isHighlighted ? 0.95 : 0.6 }}
        transition={{ delay: 0.5, duration: 0.3 }}
      />

      {/* Count label on the midpoint */}
      {isHighlighted && (
        <g>
          <rect
            x={controlAdj.x - 14}
            y={controlAdj.y - 10}
            width={28}
            height={20}
            rx={4}
            fill="rgba(0,0,0,0.8)"
            stroke={color}
            strokeWidth={1}
          />
          <text
            x={controlAdj.x}
            y={controlAdj.y + 4}
            textAnchor="middle"
            fill="white"
            fontSize={10}
            fontWeight="bold"
            fontFamily="monospace"
          >
            {totalCount}
          </text>
        </g>
      )}

      {/* Animated flow pulse along path when highlighted */}
      {isHighlighted && (
        <motion.circle
          r={3}
          fill={color}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          <animateMotion dur="2s" repeatCount="indefinite" path={pathD} />
        </motion.circle>
      )}
    </g>
  );
}
