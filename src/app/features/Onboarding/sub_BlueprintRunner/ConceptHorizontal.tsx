/**
 * Concept 1: Infinite Scrolling Timeline
 *
 * Design Philosophy:
 * - Horizontal timeline that scrolls continuously from right to left
 * - Nodes appear on the right and move across as they execute
 * - Completed nodes fade out as they exit the left side
 * - Blueprint grid background with time markers
 * - Infinite cycling - pipeline repeats forever until stopped
 */

'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { TimelineNodeInstance, BlueprintNodeType } from './types';
import { NODE_TYPE_COLORS } from './dummyData';

interface ConceptHorizontalProps {
  instances: TimelineNodeInstance[];
  currentInstanceId: string | null;
  cycleCount: number;
  isRunning: boolean;
}

// Get Lucide icon by name
function getIcon(name: string): React.ElementType {
  const IconComponent = (LucideIcons as unknown as Record<string, React.ElementType>)[name];
  return IconComponent || LucideIcons.Circle;
}

// Timeline node instance component
function TimelineNode({
  instance,
  isActive,
}: {
  instance: TimelineNodeInstance;
  isActive: boolean;
}) {
  const Icon = getIcon(instance.icon);
  const colors = NODE_TYPE_COLORS[instance.type];
  const isRunning = instance.status === 'running';
  const isCompleted = instance.status === 'completed';

  return (
    <motion.div
      className="absolute top-1/2 -translate-y-1/2"
      style={{ left: `${instance.position}%` }}
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{
        opacity: instance.position < 5 ? instance.position / 5 : 1,
        scale: isActive ? 1.1 : 1,
        y: 0,
      }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.3 }}
    >
      {/* Glow effect */}
      {isRunning && (
        <motion.div
          className="absolute inset-0 rounded"
          style={{
            background: `radial-gradient(ellipse at center, ${colors.glow} 0%, transparent 70%)`,
            filter: 'blur(8px)',
          }}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}

      {/* Main node card */}
      <div
        className="relative w-24 h-28 border bg-gray-950 flex flex-col items-center justify-center overflow-hidden"
        style={{
          borderColor: isRunning ? colors.primary : isCompleted ? colors.primary : '#374151',
          boxShadow: isRunning
            ? `0 0 20px ${colors.glow}, inset 0 0 10px ${colors.primary}15`
            : isCompleted
            ? `0 0 10px ${colors.glow}`
            : 'none',
        }}
      >
        {/* Corner markers */}
        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l" style={{ borderColor: colors.primary }} />
        <div className="absolute top-0 right-0 w-2 h-2 border-t border-r" style={{ borderColor: colors.primary }} />
        <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l" style={{ borderColor: colors.primary }} />
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r" style={{ borderColor: colors.primary }} />

        {/* Progress fill */}
        {isRunning && (
          <motion.div
            className="absolute bottom-0 left-0 right-0"
            style={{ backgroundColor: `${colors.primary}25` }}
            animate={{ height: `${instance.progress}%` }}
            transition={{ duration: 0.1 }}
          />
        )}

        {/* Cycle badge */}
        <div
          className="absolute top-1 right-1 text-[7px] font-mono px-1 rounded"
          style={{ backgroundColor: `${colors.primary}30`, color: colors.primary }}
        >
          C{instance.cycleNumber + 1}
        </div>

        {/* Icon */}
        <motion.div
          className="w-8 h-8 border flex items-center justify-center mb-1"
          style={{
            borderColor: colors.primary,
            backgroundColor: `${colors.primary}15`,
          }}
          animate={isRunning ? { rotate: 360 } : {}}
          transition={{ duration: 2, repeat: isRunning ? Infinity : 0, ease: 'linear' }}
        >
          <Icon className="w-4 h-4" style={{ color: colors.primary }} />
        </motion.div>

        {/* Name */}
        <span className="text-[9px] font-mono text-gray-300 text-center leading-tight px-1">
          {instance.name}
        </span>

        {/* Status */}
        <div className="mt-1 h-3 flex items-center">
          {isRunning && (
            <div className="flex items-center gap-1">
              <div className="flex gap-0.5">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-0.5 h-2 rounded-sm"
                    style={{ backgroundColor: colors.primary }}
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 0.4, repeat: Infinity, delay: i * 0.1 }}
                  />
                ))}
              </div>
              <span className="text-[8px] font-mono" style={{ color: colors.primary }}>
                {Math.round(instance.progress)}%
              </span>
            </div>
          )}
          {isCompleted && (
            <span className="text-[8px] font-mono" style={{ color: colors.primary }}>OK</span>
          )}
        </div>
      </div>

      {/* Connection line to previous */}
      <div
        className="absolute right-full top-1/2 -translate-y-1/2 w-8 h-0.5"
        style={{ backgroundColor: isCompleted ? colors.primary : '#374151' }}
      />
    </motion.div>
  );
}

// Time marker on the timeline
function TimeMarker({ position, time }: { position: number; time: string }) {
  return (
    <div
      className="absolute top-0 bottom-0 flex flex-col items-center"
      style={{ left: `${position}%` }}
    >
      <div className="w-px h-2 bg-gray-700" />
      <span className="text-[7px] font-mono text-gray-600 mt-0.5">{time}</span>
      <div className="flex-1 w-px bg-gray-800/30" style={{ backgroundImage: 'repeating-linear-gradient(to bottom, transparent, transparent 4px, rgba(75, 85, 99, 0.3) 4px, rgba(75, 85, 99, 0.3) 8px)' }} />
    </div>
  );
}

export default function ConceptHorizontal({
  instances,
  currentInstanceId,
  cycleCount,
  isRunning,
}: ConceptHorizontalProps) {
  return (
    <div className="w-full h-full flex flex-col">
      {/* Title with technical styling */}
      <div className="text-center mb-2">
        <h3 className="text-sm font-mono font-semibold text-cyan-400/90 tracking-wider">
          CONCEPT_01 // INFINITE_TIMELINE
        </h3>
        <p className="text-[10px] font-mono text-gray-600 mt-1">
          CONTINUOUS PIPELINE FLOW | CYCLE: {cycleCount + 1}
        </p>
      </div>

      {/* Timeline visualization */}
      <div className="flex-1 relative overflow-hidden">
        {/* Blueprint grid background */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(rgba(6, 182, 212, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(6, 182, 212, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '30px 30px',
          }}
        />

        {/* Technical markers */}
        <div className="absolute top-2 left-4 text-[8px] font-mono text-gray-700">
          TIMELINE_VIEW
        </div>
        <div className="absolute top-2 right-4 text-[8px] font-mono text-gray-700 flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`} />
          {isRunning ? 'ACTIVE' : 'IDLE'}
        </div>

        {/* Time markers */}
        <div className="absolute inset-0 pointer-events-none">
          {[20, 40, 60, 80].map((pos) => (
            <TimeMarker key={pos} position={pos} time={`T+${100 - pos}`} />
          ))}
        </div>

        {/* Main timeline track */}
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-40">
          {/* Central timeline axis */}
          <div className="absolute left-0 right-0 top-1/2 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-cyan-500/50" />

          {/* Direction indicators */}
          <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[8px] font-mono text-gray-600">
            <LucideIcons.ArrowLeft className="w-3 h-3" />
            FLOW
          </div>

          {/* NOW marker */}
          <div className="absolute right-8 top-1/2 -translate-y-1/2 flex flex-col items-center">
            <div className="text-[7px] font-mono text-cyan-400 mb-1">NOW</div>
            <div className="w-px h-8 bg-cyan-400/50" />
            <motion.div
              className="w-2 h-2 rounded-full bg-cyan-400"
              animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
            <div className="w-px h-8 bg-cyan-400/50" />
          </div>

          {/* Node instances */}
          <AnimatePresence mode="popLayout">
            {instances.map((instance) => (
              <TimelineNode
                key={instance.instanceId}
                instance={instance}
                isActive={instance.instanceId === currentInstanceId}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* Entry/Exit fade gradients */}
        <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-gray-950 to-transparent pointer-events-none z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-gray-950 to-transparent pointer-events-none z-10" />
      </div>

      {/* Stats bar */}
      <div className="flex justify-center gap-8 mt-2 border-t border-gray-800/50 pt-2">
        <div className="flex items-center gap-2">
          <LucideIcons.Repeat className="w-3 h-3 text-cyan-400" />
          <span className="text-[9px] font-mono text-gray-500">CYCLES: {cycleCount + 1}</span>
        </div>
        <div className="flex items-center gap-2">
          <LucideIcons.Layers className="w-3 h-3 text-violet-400" />
          <span className="text-[9px] font-mono text-gray-500">ACTIVE: {instances.filter(i => i.status === 'running').length}</span>
        </div>
        <div className="flex items-center gap-2">
          <LucideIcons.CheckCircle className="w-3 h-3 text-emerald-400" />
          <span className="text-[9px] font-mono text-gray-500">DONE: {instances.filter(i => i.status === 'completed').length}</span>
        </div>
      </div>
    </div>
  );
}
