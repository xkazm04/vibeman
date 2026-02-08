/**
 * Topology Globe
 * CSS/SVG animated globe visualization showing device nodes with
 * real-time data flow particles between connected nodes.
 * Purely CSS-driven — no WebGL dependency.
 */

'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';

interface GlobeNode {
  id: string;
  label: string;
  isLocal?: boolean;
  status: 'online' | 'busy' | 'offline';
  sessions: number;
  maxSessions: number;
}

interface GlobeEdge {
  sourceId: string;
  targetId: string;
  isActive: boolean;
  latencyMs: number;
}

interface TopologyGlobeProps {
  nodes: GlobeNode[];
  edges: GlobeEdge[];
  className?: string;
}

const NODE_COLORS = {
  online: { fill: '#22c55e', glow: 'rgba(34,197,94,0.4)' },
  busy: { fill: '#f59e0b', glow: 'rgba(245,158,11,0.4)' },
  offline: { fill: '#6b7280', glow: 'rgba(107,114,128,0.2)' },
};

// Place nodes in a circle on a virtual globe projection
function getNodePosition(index: number, total: number, isLocal: boolean): { cx: number; cy: number } {
  if (isLocal) return { cx: 200, cy: 200 }; // Center for local/hub
  const angle = ((index / Math.max(total - 1, 1)) * Math.PI * 2) - Math.PI / 2;
  const radius = 130;
  return {
    cx: 200 + Math.cos(angle) * radius,
    cy: 200 + Math.sin(angle) * radius,
  };
}

export default function TopologyGlobe({ nodes, edges, className = '' }: TopologyGlobeProps) {
  const remoteNodes = nodes.filter(n => !n.isLocal);
  const localNode = nodes.find(n => n.isLocal);

  const positions = useMemo(() => {
    const pos: Record<string, { cx: number; cy: number }> = {};
    if (localNode) {
      pos[localNode.id] = getNodePosition(0, 1, true);
    }
    remoteNodes.forEach((n, i) => {
      pos[n.id] = getNodePosition(i, remoteNodes.length, false);
    });
    return pos;
  }, [nodes.length, localNode?.id]);

  return (
    <div className={`relative ${className}`}>
      {/* Globe background */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-[320px] h-[320px] rounded-full border border-cyan-500/10 bg-gradient-to-br from-gray-900/80 to-gray-950/90 shadow-inner" />
        {/* Meridian lines */}
        <svg className="absolute w-[320px] h-[320px]" viewBox="0 0 320 320" fill="none">
          <ellipse cx="160" cy="160" rx="140" ry="60" stroke="rgba(6,182,212,0.06)" strokeWidth="0.5" />
          <ellipse cx="160" cy="160" rx="100" ry="130" stroke="rgba(6,182,212,0.06)" strokeWidth="0.5" />
          <ellipse cx="160" cy="160" rx="50" ry="140" stroke="rgba(6,182,212,0.04)" strokeWidth="0.5" />
          <circle cx="160" cy="160" r="140" stroke="rgba(6,182,212,0.08)" strokeWidth="0.5" />
          <circle cx="160" cy="160" r="100" stroke="rgba(6,182,212,0.05)" strokeWidth="0.5" strokeDasharray="4 4" />
        </svg>
      </div>

      {/* Topology SVG */}
      <svg className="relative w-full" viewBox="0 0 400 400" fill="none" style={{ aspectRatio: '1' }}>
        <defs>
          {/* Glow filter */}
          <filter id="mc-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Particle gradient */}
          <linearGradient id="particle-grad" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="rgba(6,182,212,0)" />
            <stop offset="50%" stopColor="rgba(6,182,212,0.8)" />
            <stop offset="100%" stopColor="rgba(6,182,212,0)" />
          </linearGradient>
        </defs>

        {/* Edges */}
        {edges.map((edge, i) => {
          const s = positions[edge.sourceId];
          const t = positions[edge.targetId];
          if (!s || !t) return null;

          return (
            <g key={`edge-${i}`}>
              <line
                x1={s.cx} y1={s.cy} x2={t.cx} y2={t.cy}
                stroke={edge.isActive ? 'rgba(6,182,212,0.25)' : 'rgba(107,114,128,0.15)'}
                strokeWidth={edge.isActive ? 1.5 : 0.75}
                strokeDasharray={edge.isActive ? undefined : '3 3'}
              />
              {/* Data flow particle */}
              {edge.isActive && (
                <circle r="2.5" fill="rgba(6,182,212,0.9)" filter="url(#mc-glow)">
                  <animateMotion
                    dur={`${1.5 + edge.latencyMs / 200}s`}
                    repeatCount="indefinite"
                    path={`M${s.cx},${s.cy} L${t.cx},${t.cy}`}
                  />
                </circle>
              )}
            </g>
          );
        })}

        {/* Nodes */}
        {nodes.map((node) => {
          const pos = positions[node.id];
          if (!pos) return null;
          const color = NODE_COLORS[node.status];
          const radius = node.isLocal ? 18 : 12;

          return (
            <g key={node.id}>
              {/* Glow ring */}
              <circle
                cx={pos.cx} cy={pos.cy} r={radius + 6}
                fill="none" stroke={color.glow} strokeWidth="1"
              >
                {node.status === 'busy' && (
                  <animate attributeName="r" values={`${radius + 4};${radius + 10};${radius + 4}`} dur="2s" repeatCount="indefinite" />
                )}
              </circle>
              {/* Node body */}
              <circle
                cx={pos.cx} cy={pos.cy} r={radius}
                fill={`${color.fill}20`}
                stroke={color.fill}
                strokeWidth="1.5"
              />
              {/* Session indicator dots */}
              {Array.from({ length: Math.min(node.sessions, 4) }).map((_, si) => {
                const dotAngle = (si / 4) * Math.PI * 2 - Math.PI / 2;
                const dotR = radius - 5;
                return (
                  <circle
                    key={si}
                    cx={pos.cx + Math.cos(dotAngle) * dotR}
                    cy={pos.cy + Math.sin(dotAngle) * dotR}
                    r="2"
                    fill={color.fill}
                  >
                    <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite" begin={`${si * 0.3}s`} />
                  </circle>
                );
              })}
              {/* Label */}
              <text
                x={pos.cx}
                y={pos.cy + radius + 14}
                textAnchor="middle"
                className="fill-gray-400 text-[9px] font-mono"
              >
                {node.label}
              </text>
              {/* Session count */}
              <text
                x={pos.cx}
                y={pos.cy + 3}
                textAnchor="middle"
                className="fill-white text-[10px] font-mono font-medium"
              >
                {node.sessions}/{node.maxSessions}
              </text>
            </g>
          );
        })}

        {/* Scanning ring animation around the globe */}
        <circle cx="200" cy="200" r="170" fill="none" stroke="rgba(6,182,212,0.1)" strokeWidth="0.5">
          <animate attributeName="r" values="160;180;160" dur="4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.3;0.1;0.3" dur="4s" repeatCount="indefinite" />
        </circle>
      </svg>
    </div>
  );
}
