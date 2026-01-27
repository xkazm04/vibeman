'use client';

import React from 'react';
import type { WorkspaceProjectNode, CrossProjectRelationship } from '../sub_WorkspaceArchitecture/lib/types';
import { INTEGRATION_COLORS, INTEGRATION_STYLES } from '../sub_WorkspaceArchitecture/lib/types';

interface MatrixConnectionLineProps {
  connection: CrossProjectRelationship;
  nodes: WorkspaceProjectNode[];
  isHighlighted: boolean;
  isDimmed: boolean;
}

export default function MatrixConnectionLine({
  connection,
  nodes,
  isHighlighted,
  isDimmed,
}: MatrixConnectionLineProps) {
  const source = nodes.find((n) => n.id === connection.sourceProjectId);
  const target = nodes.find((n) => n.id === connection.targetProjectId);
  if (!source || !target) return null;

  const sx = source.x + source.width / 2;
  const sy = source.y + source.height;
  const tx = target.x + target.width / 2;
  const ty = target.y;
  const midY = (sy + ty) / 2;

  const color = INTEGRATION_COLORS[connection.integrationType];
  const style = INTEGRATION_STYLES[connection.integrationType];

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
