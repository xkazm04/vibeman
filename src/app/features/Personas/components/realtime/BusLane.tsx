'use client';

import { memo } from 'react';

interface Props {
  x: number;
  y: number;
  width: number;
  height: number;
  isActive: boolean;
}

function BusLaneComponent({ x, y, width, height, isActive }: Props) {
  return (
    <g>
      {/* Glow layer */}
      <rect
        x={x}
        y={y - height * 2}
        width={width}
        height={height * 5}
        fill="url(#busGradient)"
        opacity={isActive ? 0.4 : 0.15}
        className="transition-opacity duration-1000"
        filter="url(#glow)"
      />

      {/* Main bus line */}
      <rect
        x={x}
        y={y - height / 2}
        width={width}
        height={height}
        fill="url(#busGradient)"
        rx={height / 2}
        className="transition-opacity duration-500"
      />

      {/* Animated pulse overlay when active */}
      {isActive && (
        <rect
          x={x}
          y={y - height}
          width={width}
          height={height * 3}
          fill="url(#busGradient)"
          opacity={0.2}
          rx={height}
        >
          <animate
            attributeName="opacity"
            values="0.1;0.3;0.1"
            dur="2s"
            repeatCount="indefinite"
          />
        </rect>
      )}

      {/* Label */}
      <text
        x={x + width / 2}
        y={y + height / 2 + 14}
        textAnchor="middle"
        className="fill-muted-foreground/20"
        fontSize={9}
        fontFamily="monospace"
        letterSpacing={2}
      >
        EVENT BUS
      </text>
    </g>
  );
}

const BusLane = memo(BusLaneComponent);
export default BusLane;
