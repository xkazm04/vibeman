'use client';

import React, { useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { GraphEdge } from '../sub_WorkspaceArchitecture/lib/Graph';
import { INTEGRATION_COLORS, INTEGRATION_STYLES } from './constants';
import { archTheme } from './lib/archTheme';

interface MatrixConnectionLineProps {
  edge: GraphEdge;
  isHighlighted: boolean;
  isDimmed: boolean;
}

/**
 * Renders a bezier curve connection between two nodes in the diagram.
 * Hover interaction shows a floating detail card with integration info.
 */
export default function MatrixConnectionLine({
  edge,
  isHighlighted,
  isDimmed,
}: MatrixConnectionLineProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseEnter = useCallback(() => setIsHovered(true), []);
  const handleMouseLeave = useCallback(() => setIsHovered(false), []);

  const { sourceNode: source, targetNode: target } = edge;

  const integrationType = edge.integrationType;
  const sx = source.x + source.width / 2;
  const sy = source.y + source.height;
  const tx = target.x + target.width / 2;
  const ty = target.y;
  const midY = (sy + ty) / 2;

  const color = INTEGRATION_COLORS[integrationType];
  const style = INTEGRATION_STYLES[integrationType];

  // On highlight or hover: full opacity. On dim: very faint. Default: subtle.
  const active = isHighlighted || isHovered;
  const opacity = active ? 1 : isDimmed ? 0.08 : 0.35;
  const pathD = `M ${sx} ${sy} C ${sx} ${midY}, ${tx} ${midY}, ${tx} ${ty}`;

  // Tooltip position: midpoint of the bezier curve
  const tooltipX = (sx + tx) / 2;
  const tooltipY = midY;
  const cardW = 200;
  const cardH = 96;

  return (
    <g>
      {/* Invisible wide hit area for easier hover targeting */}
      <path
        d={pathD}
        fill="none"
        stroke="transparent"
        strokeWidth={8}
        style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />

      {/* Visible connection line */}
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={active ? 2 : 1.5}
        strokeDasharray={style.dashed ? '6 4' : undefined}
        opacity={opacity}
        style={{ pointerEvents: 'none', transition: 'stroke-width 0.1s, opacity 0.1s' }}
      />

      {/* Arrowhead */}
      <polygon
        points={`${tx},${ty} ${tx - 4},${ty - 8} ${tx + 4},${ty - 8}`}
        fill={color}
        opacity={opacity}
        style={{ pointerEvents: 'none' }}
      />

      {/* Hover detail card via foreignObject */}
      <AnimatePresence>
        {isHovered && (
          <foreignObject
            x={tooltipX - cardW / 2}
            y={tooltipY - cardH - 8}
            width={cardW}
            height={cardH}
            style={{ overflow: 'visible', pointerEvents: 'none' }}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              style={{
                background: 'rgba(15, 15, 20, 0.95)',
                border: `1px solid ${color}40`,
                borderRadius: 8,
                padding: '8px 10px',
                backdropFilter: 'blur(8px)',
                width: cardW,
                boxShadow: `0 4px 20px rgba(0,0,0,0.5), 0 0 8px ${color}20`,
              }}
            >
              {/* Integration type badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '1px 6px',
                  borderRadius: 4,
                  fontSize: 10,
                  fontWeight: 600,
                  color,
                  background: `${color}18`,
                  border: `1px solid ${color}30`,
                  letterSpacing: '0.02em',
                }}>
                  {style.icon} {style.label}
                </span>
                {edge.protocol && (
                  <span style={{ fontSize: 9, color: archTheme.text.muted, fontFamily: 'monospace' }}>
                    {edge.protocol}
                  </span>
                )}
              </div>

              {/* Source → Target */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11,
                color: archTheme.text.secondary,
                marginBottom: edge.dataFlow ? 4 : 0,
              }}>
                <span style={{ fontWeight: 500 }}>{source.name}</span>
                <span style={{ color: archTheme.text.dim, fontSize: 10 }}>→</span>
                <span style={{ fontWeight: 500 }}>{target.name}</span>
              </div>

              {/* Data flow description */}
              {edge.dataFlow && (
                <div style={{
                  fontSize: 10,
                  color: archTheme.text.muted,
                  lineHeight: 1.3,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {edge.dataFlow}
                </div>
              )}

              {/* Business label */}
              {edge.label && (
                <div style={{
                  fontSize: 10,
                  color: archTheme.text.dim,
                  marginTop: 2,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontStyle: 'italic',
                }}>
                  {edge.label}
                </div>
              )}
            </motion.div>
          </foreignObject>
        )}
      </AnimatePresence>
    </g>
  );
}
