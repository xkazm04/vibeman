/**
 * ConnectionLine Component
 * SVG bezier curve connection between modules with animation
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface ConnectionLineProps {
  fromPos: { x: number; y: number };
  toPos: { x: number; y: number };
  isHighlighted: boolean;
  uniqueId: string;
}

export default function ConnectionLine({
  fromPos,
  toPos,
  isHighlighted,
  uniqueId,
}: ConnectionLineProps) {
  // Calculate control points for smooth curved bezier path
  const midY = (fromPos.y + toPos.y) / 2;
  const pathD = `M ${fromPos.x} ${fromPos.y} C ${fromPos.x} ${midY}, ${toPos.x} ${midY}, ${toPos.x} ${toPos.y}`;

  return (
    <g>
      <defs>
        <linearGradient id={`gradient-${uniqueId}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(6, 182, 212, 0.3)" />
          <stop offset="50%" stopColor="rgba(139, 92, 246, 0.5)" />
          <stop offset="100%" stopColor="rgba(6, 182, 212, 0.3)" />
        </linearGradient>
      </defs>

      {/* Base connection line - thin and elegant */}
      <motion.path
        d={pathD}
        stroke={isHighlighted ? 'rgba(139, 92, 246, 0.7)' : `url(#gradient-${uniqueId})`}
        strokeWidth={isHighlighted ? 1.5 : 1}
        fill="none"
        strokeDasharray={isHighlighted ? 'none' : '4 4'}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{
          pathLength: 1,
          opacity: isHighlighted ? 0.9 : 0.6,
        }}
        transition={{ duration: 1.2, ease: 'easeInOut' }}
      />

      {/* Animated pulse on highlighted connections */}
      {isHighlighted && (
        <motion.circle
          r="3"
          fill="rgba(6, 182, 212, 0.8)"
          filter="url(#glow)"
          initial={{ opacity: 0 }}
          animate={{
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'linear',
          }}
        >
          <animateMotion dur="2s" repeatCount="indefinite" path={pathD} />
        </motion.circle>
      )}
    </g>
  );
}
