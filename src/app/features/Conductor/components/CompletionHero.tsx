'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { PipelineMetrics } from '../lib/types';

// Stage pulse colors: cyan → amber → purple → orange → pink
const STAGE_COLORS = ['#22d3ee', '#f59e0b', '#a855f7', '#f97316', '#ec4899'];
const LIME = '#d0e41d';

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem > 0 ? `${m}m ${rem}s` : `${m}m`;
}

function formatCost(cost: number): string {
  if (cost <= 0) return '$0.00';
  return `$${cost.toFixed(2)}`;
}

// Flat geometric conductor baton SVG with conducting → triumphant transition
function ConductorBaton() {
  return (
    <motion.svg
      viewBox="0 0 80 80"
      fill="none"
      className="w-16 h-16"
      aria-hidden="true"
    >
      {/* Circular backdrop ring */}
      <motion.circle
        cx="40" cy="40" r="36"
        stroke={LIME}
        strokeWidth="1.5"
        fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 0.6 }}
        transition={{ duration: 1, ease: 'easeOut' }}
      />

      {/* Inner glow ring */}
      <motion.circle
        cx="40" cy="40" r="28"
        fill="none"
        stroke="rgba(208, 228, 29, 0.15)"
        strokeWidth="8"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 80, damping: 12, delay: 0.2 }}
      />

      {/* Baton handle (conducting position → raised triumphant) */}
      <motion.line
        x1="40" y1="55"
        x2="40" y2="30"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        initial={{ x2: 52, y2: 50, rotate: 45 }}
        animate={{ x2: 40, y2: 18, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 100, damping: 14, delay: 0.15 }}
        style={{ transformOrigin: '40px 55px' }}
      />

      {/* Baton tip (diamond shape) */}
      <motion.polygon
        points="40,14 43,18 40,22 37,18"
        fill={LIME}
        initial={{ y: 30, opacity: 0, scale: 0.5 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 120, damping: 10, delay: 0.3 }}
      />

      {/* Triumph sparks radiating from baton tip */}
      {[
        { x1: 40, y1: 10, x2: 40, y2: 4, delay: 0.5 },
        { x1: 34, y1: 12, x2: 28, y2: 8, delay: 0.55 },
        { x1: 46, y1: 12, x2: 52, y2: 8, delay: 0.6 },
        { x1: 32, y1: 16, x2: 24, y2: 14, delay: 0.65 },
        { x1: 48, y1: 16, x2: 56, y2: 14, delay: 0.7 },
      ].map((spark, i) => (
        <motion.line
          key={i}
          x1={spark.x1} y1={spark.y1}
          x2={spark.x2} y2={spark.y2}
          stroke={LIME}
          strokeWidth="1.5"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: [0, 1, 0.6] }}
          transition={{ duration: 0.4, delay: spark.delay, ease: 'easeOut' }}
        />
      ))}

      {/* Conductor figure (simplified geometric) */}
      <motion.circle
        cx="40" cy="42"
        r="4"
        fill="rgba(255,255,255,0.8)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      />
      <motion.path
        d="M34 58 L40 50 L46 58"
        stroke="rgba(255,255,255,0.6)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      />
    </motion.svg>
  );
}

// Circuit glow line that represents all connectors lighting up
function CircuitGlow({ stageCount }: { stageCount: number }) {
  return (
    <motion.div
      className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[3px] pointer-events-none hidden sm:block"
      initial={{ opacity: 0, scaleX: 0 }}
      animate={{ opacity: 1, scaleX: 1 }}
      transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
      style={{ transformOrigin: 'left center' }}
    >
      <div
        className="w-full h-full rounded-full"
        style={{
          background: `linear-gradient(90deg, ${STAGE_COLORS.slice(0, stageCount).join(', ')})`,
          boxShadow: `0 0 12px 2px rgba(208, 228, 29, 0.4), 0 0 24px 4px rgba(34, 211, 238, 0.2)`,
        }}
      />
    </motion.div>
  );
}

// Stage pulse dots that light up in sequence
function StagePulseSequence({ stageCount }: { stageCount: number }) {
  const colors = STAGE_COLORS.slice(0, stageCount);
  return (
    <div className="flex items-center gap-3 mt-3">
      {colors.map((color, i) => (
        <motion.div
          key={i}
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: color }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{
            scale: [0, 1.6, 1],
            opacity: [0, 1, 0.7],
          }}
          transition={{
            duration: 0.4,
            delay: 0.5 + i * 0.12,
            type: 'spring',
            stiffness: 200,
            damping: 12,
          }}
        />
      ))}
    </div>
  );
}

// Summary stats row
function SummaryStats({ metrics }: { metrics: PipelineMetrics }) {
  const stats = [
    { label: 'Tasks', value: `${metrics.tasksCompleted}` },
    { label: 'Time', value: formatDuration(metrics.totalDurationMs) },
    { label: 'Cost', value: formatCost(metrics.estimatedCost) },
  ];

  return (
    <motion.div
      className="flex items-center gap-4 mt-4"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.0, duration: 0.4, ease: 'easeOut' }}
    >
      {stats.map((stat, i) => (
        <div key={i} className="flex flex-col items-center">
          <span className="text-sm font-semibold text-white font-mono">
            {stat.value}
          </span>
          <span className="text-micro text-gray-400 uppercase tracking-wider">
            {stat.label}
          </span>
        </div>
      ))}
    </motion.div>
  );
}

interface CompletionHeroProps {
  show: boolean;
  metrics: PipelineMetrics | null;
  stageCount: number;
  reduced?: boolean;
}

export default function CompletionHero({ show, metrics, stageCount, reduced }: CompletionHeroProps) {
  if (reduced) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          aria-hidden="true"
        >
          {/* Dark glass-morphism backdrop */}
          <motion.div
            className="absolute inset-0 rounded-xl"
            style={{
              background: 'rgba(10, 10, 30, 0.75)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(208, 228, 29, 0.15)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          />

          {/* Circuit glow across connectors */}
          <CircuitGlow stageCount={stageCount} />

          {/* Central content */}
          <motion.div
            className="relative z-10 flex flex-col items-center"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 100, damping: 15 }}
          >
            {/* Conductor baton animation */}
            <ConductorBaton />

            {/* Title */}
            <motion.span
              className="text-xs font-semibold tracking-widest uppercase mt-2"
              style={{ color: LIME }}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.3 }}
            >
              Pipeline Complete
            </motion.span>

            {/* Stage color pulse sequence */}
            <StagePulseSequence stageCount={stageCount} />

            {/* Summary stats */}
            {metrics && (
              <SummaryStats metrics={metrics} />
            )}
          </motion.div>

          {/* Lime accent sparks at edges */}
          {[
            { left: '10%', top: '30%', delay: 0.7 },
            { right: '12%', top: '25%', delay: 0.85 },
            { left: '20%', bottom: '35%', delay: 0.95 },
            { right: '18%', bottom: '30%', delay: 1.05 },
          ].map((pos, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full"
              style={{
                ...pos,
                backgroundColor: LIME,
                boxShadow: `0 0 6px ${LIME}, 0 0 12px rgba(208, 228, 29, 0.3)`,
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.5, 0], opacity: [0, 1, 0] }}
              transition={{ duration: 0.6, delay: pos.delay, ease: 'easeOut' }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
