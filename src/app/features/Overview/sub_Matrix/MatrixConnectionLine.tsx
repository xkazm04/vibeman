'use client';

import React from 'react';
import type { WorkspaceProjectNode, CrossProjectRelationship } from '../sub_WorkspaceArchitecture/lib/types';
import type { GraphEdge } from '../sub_WorkspaceArchitecture/lib/Graph';
import { INTEGRATION_COLORS, INTEGRATION_STYLES } from './constants';

/**
 * Props for MatrixConnectionLine.
 * Supports both legacy mode (connection + nodes lookup) and optimized mode (resolved edge).
 */
interface MatrixConnectionLineProps {
  /** Resolved edge with direct node references (O(1) access - preferred) */
  edge?: GraphEdge;
  /** Legacy: Raw connection data (requires O(n) node lookup) */
  connection?: CrossProjectRelationship;
  /** Legacy: Node array for lookup (only needed if using connection prop) */
  nodes?: WorkspaceProjectNode[];
  isHighlighted: boolean;
  isDimmed: boolean;
}

/**
 * Renders a bezier curve connection between two nodes in the diagram.
 *
 * Optimized to use GraphEdge with direct node references when available,
 * eliminating O(n) node lookups per render.
 */
export default function MatrixConnectionLine({
  edge,
  connection,
  nodes,
  isHighlighted,
  isDimmed,
}: MatrixConnectionLineProps) {
  // Prefer resolved edge with direct node references (O(1) access)
  let source: WorkspaceProjectNode | undefined;
  let target: WorkspaceProjectNode | undefined;
  let integrationType: CrossProjectRelationship['integrationType'];

  if (edge) {
    // Optimized path: direct node references
    source = edge.sourceNode;
    target = edge.targetNode;
    integrationType = edge.integrationType;
  } else if (connection && nodes) {
    // Legacy path: O(n) lookup
    source = nodes.find((n) => n.id === connection.sourceProjectId);
    target = nodes.find((n) => n.id === connection.targetProjectId);
    integrationType = connection.integrationType;
  }

  if (!source || !target) return null;

  const sx = source.x + source.width / 2;
  const sy = source.y + source.height;
  const tx = target.x + target.width / 2;
  const ty = target.y;
  const midY = (sy + ty) / 2;

  const color = INTEGRATION_COLORS[integrationType];
  const style = INTEGRATION_STYLES[integrationType];

  // On highlight: full opacity, brighter color. On dim: very faint. Default: subtle.
  const opacity = isHighlighted ? 1 : isDimmed ? 0.08 : 0.35;
  const strokeColor = isHighlighted ? color : color;

  return (
    <g>
      <path
        d={`M ${sx} ${sy} C ${sx} ${midY}, ${tx} ${midY}, ${tx} ${ty}`}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.5}
        strokeDasharray={style.dashed ? '6 4' : undefined}
        opacity={opacity}
      />
      <polygon
        points={`${tx},${ty} ${tx - 4},${ty - 8} ${tx + 4},${ty - 8}`}
        fill={strokeColor}
        opacity={opacity}
      />
    </g>
  );
}
