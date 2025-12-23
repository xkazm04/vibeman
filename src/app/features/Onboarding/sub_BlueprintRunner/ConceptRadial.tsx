/**
 * Concept 3: Radial/Orbital Flow with Decision Gate
 *
 * Design Philosophy:
 * - Technical orbital schematic with nodes arranged in expanded ring
 * - Central control hub showing cycle status and decision prompts
 * - Decision node positioned at 12 o'clock with special styling
 * - Feedback loop visualization when cycling
 * - Compact, data-dense layout with blueprint aesthetic
 */

'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { BlueprintNode, NodeStatus } from './types';
import { NODE_TYPE_COLORS } from './dummyData';

interface ConceptRadialProps {
  nodes: BlueprintNode[];
  currentNodeId: string | null;
  cycleCount: number;
  waitingForDecision: boolean;
  onConfirm?: () => void;
  onDecline?: () => void;
}

// Get Lucide icon by name
function getIcon(name: string): React.ElementType {
  const IconComponent = (LucideIcons as unknown as Record<string, React.ElementType>)[name];
  return IconComponent || LucideIcons.Circle;
}

// Calculate position on a circle
function getRadialPosition(index: number, total: number, radius: number, offset: number = -90) {
  const angle = (360 / total) * index + offset;
  const radian = (angle * Math.PI) / 180;
  return {
    x: Math.cos(radian) * radius,
    y: Math.sin(radian) * radius,
    angle,
  };
}

// Orbital node component
function OrbitalNode({
  node,
  index,
  total,
  isActive,
  radius,
}: {
  node: BlueprintNode;
  index: number;
  total: number;
  isActive: boolean;
  radius: number;
}) {
  const Icon = getIcon(node.icon);
  const colors = NODE_TYPE_COLORS[node.type] || NODE_TYPE_COLORS.analyzer;
  const isRunning = node.status === 'running';
  const isCompleted = node.status === 'completed';
  const isPending = node.status === 'pending';
  const isFailed = node.status === 'failed';
  const isWaiting = node.status === 'waiting';

  const position = getRadialPosition(index, total, radius);
  const activeRadius = radius * 0.9;
  const activePosition = getRadialPosition(index, total, activeRadius);

  const currentX = isActive ? activePosition.x : position.x;
  const currentY = isActive ? activePosition.y : position.y;

  const nodeSize = 55;

  return (
    <motion.div
      className="absolute"
      style={{ left: '50%', top: '50%' }}
      animate={{
        x: currentX - nodeSize / 2,
        y: currentY - nodeSize / 2,
      }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
    >
      {/* Static glow - removed infinite animation for performance */}
      {(isRunning || isWaiting) && (
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle, ${colors.glow} 0%, transparent 70%)`,
            filter: 'blur(5px)',
            opacity: 0.4,
          }}
        />
      )}

      {/* Main node */}
      <motion.div
        className="relative border bg-gray-950 flex flex-col items-center justify-center overflow-hidden"
        style={{
          width: nodeSize,
          height: nodeSize,
          borderColor: isPending ? '#374151' : colors.primary,
          boxShadow: (isRunning || isWaiting)
            ? `0 0 15px ${colors.glow}`
            : isCompleted
            ? `0 0 8px ${colors.glow}`
            : 'none',
        }}
        animate={{ scale: isActive ? 1.1 : 1 }}
      >
        {/* Corner markers */}
        <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l" style={{ borderColor: colors.primary }} />
        <div className="absolute top-0 right-0 w-1.5 h-1.5 border-t border-r" style={{ borderColor: colors.primary }} />
        <div className="absolute bottom-0 left-0 w-1.5 h-1.5 border-b border-l" style={{ borderColor: colors.primary }} />
        <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r" style={{ borderColor: colors.primary }} />

        {/* Progress ring */}
        {isRunning && (
          <svg className="absolute inset-0 w-full h-full -rotate-90">
            <circle
              cx={nodeSize / 2}
              cy={nodeSize / 2}
              r={(nodeSize / 2) - 3}
              fill="none"
              stroke={colors.primary}
              strokeWidth="2"
              strokeDasharray={`${(node.progress / 100) * (Math.PI * (nodeSize - 6))} ${Math.PI * (nodeSize - 6)}`}
              strokeLinecap="round"
              className="opacity-50"
            />
          </svg>
        )}

        {/* Icon - using CSS animations instead of Framer Motion for performance */}
        <div className={isRunning ? 'animate-spin' : ''} style={{ animationDuration: isRunning ? '2s' : undefined }}>
          <Icon className={`w-4 h-4 ${isWaiting ? 'animate-pulse' : ''}`} style={{ color: isPending ? '#6b7280' : colors.primary }} />
        </div>

        {/* Status */}
        <div className="mt-0.5 h-3 flex items-center">
          {isRunning && <span className="text-[7px] font-mono" style={{ color: colors.primary }}>{Math.round(node.progress)}%</span>}
          {isWaiting && <span className="text-[7px] font-mono" style={{ color: colors.primary }}>WAIT</span>}
          {isCompleted && <span className="text-[7px] font-mono" style={{ color: colors.primary }}>OK</span>}
          {isFailed && <span className="text-[7px] font-mono text-red-500">ERR</span>}
          {isPending && <span className="text-[7px] font-mono text-gray-600">--</span>}
        </div>
      </motion.div>

      {/* Label */}
      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap">
        <span className={`text-[8px] font-mono ${isPending ? 'text-gray-600' : 'text-gray-400'}`}>
          {node.name}
        </span>
      </div>
    </motion.div>
  );
}

// Decision node in center-top position
function DecisionNodeOrbital({
  node,
  radius,
  onConfirm,
  onDecline,
}: {
  node: BlueprintNode;
  radius: number;
  onConfirm?: () => void;
  onDecline?: () => void;
}) {
  const colors = NODE_TYPE_COLORS.decision;
  const isWaiting = node.status === 'waiting';
  const isCompleted = node.status === 'completed';
  const isPending = node.status === 'pending';

  // Position at top of orbit
  const y = -radius - 20;

  return (
    <motion.div
      className="absolute"
      style={{ left: '50%', top: '50%' }}
      animate={{ x: -40, y: y - 40 }}
    >
      {/* Static glow - removed infinite animation for performance */}
      {isWaiting && (
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle, ${colors.glow} 0%, transparent 70%)`,
            filter: 'blur(8px)',
            opacity: 0.5,
          }}
        />
      )}

      {/* Diamond gate */}
      <div
        className="relative w-16 h-16 rotate-45 border-2 bg-gray-950 flex items-center justify-center"
        style={{
          borderColor: isPending ? '#374151' : colors.primary,
          boxShadow: isWaiting ? `0 0 20px ${colors.glow}` : isCompleted ? `0 0 10px ${colors.glow}` : 'none',
        }}
      >
        <div className="-rotate-45 flex flex-col items-center">
          <LucideIcons.HelpCircle className="w-4 h-4" style={{ color: isPending ? '#6b7280' : colors.primary }} />
          <span className="text-[7px] font-mono mt-0.5" style={{ color: colors.primary }}>
            {isWaiting ? 'DECIDE' : isCompleted ? 'OK' : 'GATE'}
          </span>
        </div>
      </div>

      {/* Decision buttons */}
      {isWaiting && (
        <motion.div
          className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex gap-2"
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <button
            onClick={onConfirm}
            className="px-2 py-0.5 text-[7px] font-mono bg-emerald-500/20 border border-emerald-500 text-emerald-400 rounded hover:bg-emerald-500/30"
          >
            YES
          </button>
          <button
            onClick={onDecline}
            className="px-2 py-0.5 text-[7px] font-mono bg-red-500/20 border border-red-500 text-red-400 rounded hover:bg-red-500/30"
          >
            NO
          </button>
        </motion.div>
      )}

      {/* Label */}
      <div className="absolute -top-5 left-1/2 -translate-x-1/2">
        <span className="text-[7px] font-mono text-gray-600">DECISION</span>
      </div>
    </motion.div>
  );
}

// Central hub
function CentralHub({
  nodes,
  currentNodeId,
  cycleCount,
  waitingForDecision,
}: {
  nodes: BlueprintNode[];
  currentNodeId: string | null;
  cycleCount: number;
  waitingForDecision: boolean;
}) {
  const processingNodes = nodes.filter(n => n.type !== 'decision');
  const completedCount = processingNodes.filter(n => n.status === 'completed').length;
  const totalCount = processingNodes.length;
  const overallProgress = (completedCount / totalCount) * 100;
  const currentNode = nodes.find(n => n.id === currentNodeId);

  return (
    <motion.div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
      <div className="w-24 h-24 border border-gray-700/50 bg-gray-950 flex items-center justify-center relative">
        {/* Corner markers */}
        <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-cyan-500/50" />
        <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-cyan-500/50" />
        <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-cyan-500/50" />
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-cyan-500/50" />

        {/* Progress bar */}
        <div className="absolute bottom-1 left-1 right-1 h-1 bg-gray-800">
          <motion.div
            className="h-full bg-cyan-400"
            animate={{ width: `${overallProgress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Content - using CSS animations instead of Framer Motion */}
        <div className="flex flex-col items-center">
          {waitingForDecision ? (
            <>
              <LucideIcons.HelpCircle className="w-5 h-5 text-pink-400 animate-pulse" />
              <span className="text-[8px] font-mono text-pink-400 mt-1">AWAITING</span>
            </>
          ) : currentNode && currentNode.type !== 'decision' ? (
            <>
              <LucideIcons.Loader2 className="w-5 h-5 text-cyan-400 animate-spin" style={{ animationDuration: '2s' }} />
              <span className="text-[8px] font-mono text-gray-400 mt-1 truncate max-w-[70px]">{currentNode.name}</span>
              <span className="text-xs font-mono font-bold text-cyan-400">{Math.round(currentNode.progress)}%</span>
            </>
          ) : (
            <>
              <LucideIcons.Target className="w-5 h-5 text-gray-500" />
              <span className="text-[8px] font-mono text-gray-500 mt-1">CYCLE {cycleCount + 1}</span>
              <span className="text-xs font-mono font-bold text-gray-400">{completedCount}/{totalCount}</span>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Connection arc - optimized to only animate when truly active
function ConnectionArc({
  fromIndex,
  toIndex,
  total,
  radius,
  isActive,
  isCompleted,
  colors,
}: {
  fromIndex: number;
  toIndex: number;
  total: number;
  radius: number;
  isActive: boolean;
  isCompleted: boolean;
  colors: { primary: string; glow: string };
}) {
  const from = getRadialPosition(fromIndex, total, radius);
  const to = getRadialPosition(toIndex, total, radius);
  const centerX = radius + 60;
  const centerY = radius + 60;

  const fromX = centerX + from.x;
  const fromY = centerY + from.y;
  const toX = centerX + to.x;
  const toY = centerY + to.y;

  const midAngle = (from.angle + to.angle) / 2;
  const arcRadius = radius * 0.55;
  const midRadian = (midAngle * Math.PI) / 180;
  const controlX = centerX + Math.cos(midRadian) * arcRadius;
  const controlY = centerY + Math.sin(midRadian) * arcRadius;

  const pathD = `M ${fromX} ${fromY} Q ${controlX} ${controlY} ${toX} ${toY}`;

  return (
    <g>
      <path
        d={pathD}
        fill="none"
        stroke={isCompleted ? colors.primary : 'rgba(75, 85, 99, 0.3)'}
        strokeWidth={isActive ? 2 : 1}
        strokeDasharray={isCompleted ? undefined : '4 4'}
      />
      {/* Only render animated circle when actively running - removed drop-shadow filter for performance */}
      {isActive && (
        <circle r="3" fill={colors.primary}>
          <animateMotion dur="1.2s" repeatCount="indefinite" path={pathD} />
        </circle>
      )}
    </g>
  );
}

export default function ConceptRadial({
  nodes,
  currentNodeId,
  cycleCount,
  waitingForDecision,
  onConfirm,
  onDecline,
}: ConceptRadialProps) {
  const radius = 180;
  const processingNodes = nodes.filter(n => n.type !== 'decision');
  const decisionNode = nodes.find(n => n.type === 'decision');

  return (
    <div className="w-full h-full flex flex-col">
      {/* Title */}
      <div className="text-center mb-1">
        <h3 className="text-sm font-mono font-semibold text-cyan-400/90 tracking-wider">
          CONCEPT_03 // ORBITAL_LOOP
        </h3>
        <p className="text-[10px] font-mono text-gray-600 mt-0.5">
          RADIAL TOPOLOGY WITH DECISION GATE | CYCLE: {cycleCount + 1}
        </p>
      </div>

      {/* Radial visualization */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden">
        {/* Grid background */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(rgba(6, 182, 212, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(6, 182, 212, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px',
          }}
        />

        <div
          className="relative"
          style={{ width: (radius + 60) * 2, height: (radius + 60) * 2 + 40 }}
        >
          {/* Orbital rings */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ top: 20 }}>
            <circle cx="50%" cy={radius + 60} r={radius} fill="none" stroke="rgba(6, 182, 212, 0.15)" strokeWidth="1" strokeDasharray="6 4" />
            <circle cx="50%" cy={radius + 60} r={radius * 0.5} fill="none" stroke="rgba(75, 85, 99, 0.1)" strokeWidth="1" />

            {/* Connection arcs */}
            {processingNodes.map((node, index) => {
              if (index === processingNodes.length - 1) return null;
              const colors = NODE_TYPE_COLORS[node.type] || NODE_TYPE_COLORS.analyzer;
              return (
                <ConnectionArc
                  key={`arc-${index}`}
                  fromIndex={index}
                  toIndex={index + 1}
                  total={processingNodes.length}
                  radius={radius}
                  isActive={node.status === 'running'}
                  isCompleted={node.status === 'completed'}
                  colors={colors}
                />
              );
            })}

            {/* Feedback loop from last node to decision */}
            {cycleCount > 0 && (
              <motion.path
                d={`M ${radius + 60} ${60 + radius * 0.3} L ${radius + 60} 20`}
                stroke="#ec4899"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                fill="none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
              />
            )}
          </svg>

          {/* Center adjusted for decision node at top */}
          <div style={{ position: 'relative', top: 20 }}>
            {/* Central hub */}
            <CentralHub
              nodes={nodes}
              currentNodeId={currentNodeId}
              cycleCount={cycleCount}
              waitingForDecision={waitingForDecision}
            />

            {/* Processing nodes */}
            {processingNodes.map((node, index) => (
              <OrbitalNode
                key={node.id}
                node={node}
                index={index}
                total={processingNodes.length}
                isActive={node.id === currentNodeId}
                radius={radius}
              />
            ))}

            {/* Decision node at top */}
            {decisionNode && (
              <DecisionNodeOrbital
                node={decisionNode}
                radius={radius}
                onConfirm={onConfirm}
                onDecline={onDecline}
              />
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-4 mt-1 border-t border-gray-800/50 pt-1">
        {Object.entries(NODE_TYPE_COLORS).slice(0, 5).map(([type, colors]) => (
          <div key={type} className="flex items-center gap-1">
            <div className="w-2 h-1.5 border" style={{ borderColor: colors.primary, backgroundColor: `${colors.primary}20` }} />
            <span className="text-[7px] font-mono text-gray-500 uppercase">{type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
