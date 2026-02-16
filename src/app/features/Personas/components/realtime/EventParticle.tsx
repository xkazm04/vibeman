'use client';

import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { RealtimeEvent } from '@/app/features/Personas/hooks/useRealtimeEvents';

interface Props {
  event: RealtimeEvent;
  sourcePos: { x: number; y: number };
  busY: number;
  targetPos: { x: number; y: number } | null;
  color: string;
  onClick: () => void;
}

const PARTICLE_R = 5;
const TRAIL_COUNT = 2;

function EventParticleComponent({ event, sourcePos, busY, targetPos, color, onClick }: Props) {
  // Compute position based on animation phase
  const position = useMemo(() => {
    switch (event._phase) {
      case 'entering':
        return { cx: sourcePos.x, cy: busY };
      case 'on-bus':
        return { cx: targetPos?.x ?? sourcePos.x, cy: busY };
      case 'delivering':
        return { cx: targetPos?.x ?? sourcePos.x, cy: targetPos?.y ?? busY };
      case 'done':
      default:
        return { cx: targetPos?.x ?? sourcePos.x, cy: targetPos?.y ?? busY };
    }
  }, [event._phase, sourcePos, busY, targetPos]);

  const isFailed = event.status === 'failed';
  const isCompleted = event.status === 'completed';
  const particleColor = isFailed ? '#ef4444' : color;

  // Burst effect on completion/failure
  const showBurst = event._phase === 'delivering' && (isCompleted || isFailed);

  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }}>
      {/* Trail particles */}
      {TRAIL_COUNT > 0 && event._phase !== 'done' && (
        <>
          {Array.from({ length: TRAIL_COUNT }).map((_, i) => (
            <motion.circle
              key={`trail-${i}`}
              animate={{
                cx: position.cx,
                cy: position.cy,
              }}
              transition={{
                duration: 0.8,
                delay: (i + 1) * 0.08,
                ease: 'easeOut',
              }}
              r={PARTICLE_R - (i + 1)}
              fill={particleColor}
              opacity={0.15 - i * 0.05}
            />
          ))}
        </>
      )}

      {/* Main particle */}
      <motion.circle
        animate={{
          cx: position.cx,
          cy: position.cy,
          opacity: event._phase === 'done' ? 0 : 1,
          scale: event._phase === 'done' ? 0 : 1,
        }}
        transition={{
          cx: { duration: 0.8, ease: 'easeInOut' },
          cy: { duration: 0.8, ease: 'easeInOut' },
          opacity: { duration: 0.3 },
          scale: { duration: 0.3 },
        }}
        r={PARTICLE_R}
        fill={particleColor}
        filter="url(#particleGlow)"
      />

      {/* Inner dot */}
      <motion.circle
        animate={{
          cx: position.cx,
          cy: position.cy,
          opacity: event._phase === 'done' ? 0 : 0.8,
        }}
        transition={{
          cx: { duration: 0.8, ease: 'easeInOut' },
          cy: { duration: 0.8, ease: 'easeInOut' },
          opacity: { duration: 0.3 },
        }}
        r={PARTICLE_R * 0.4}
        fill="white"
        opacity={0.8}
      />

      {/* Burst ring on deliver */}
      {showBurst && (
        <motion.circle
          initial={{ r: PARTICLE_R, opacity: 0.6 }}
          animate={{ r: PARTICLE_R * 4, opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          cx={position.cx}
          cy={position.cy}
          fill="none"
          stroke={particleColor}
          strokeWidth={1.5}
        />
      )}
    </g>
  );
}

const EventParticle = memo(EventParticleComponent);
export default EventParticle;
