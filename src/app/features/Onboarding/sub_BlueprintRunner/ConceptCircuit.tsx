/**
 * Concept 2: Circuit Board Flow with Decision Node
 *
 * Design Philosophy:
 * - Technical PCB/circuit board aesthetic with trace lines
 * - Nodes as IC chips with pin connectors
 * - Decision node as special gate component for cycle confirmation
 * - Feedback loop trace from decision back to first node
 * - Compact, information-dense layout with cycling support
 */

'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { BlueprintNode, BlueprintEdge, NodeStatus } from './types';
import { NODE_TYPE_COLORS } from './dummyData';

interface ConceptCircuitProps {
  nodes: BlueprintNode[];
  edges: BlueprintEdge[];
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

// IC Chip node component
function ChipNode({
  node,
  index,
  isActive,
}: {
  node: BlueprintNode;
  index: number;
  isActive: boolean;
}) {
  const Icon = getIcon(node.icon);
  const colors = NODE_TYPE_COLORS[node.type] || NODE_TYPE_COLORS.analyzer;
  const isRunning = node.status === 'running';
  const isCompleted = node.status === 'completed';
  const isPending = node.status === 'pending';
  const isFailed = node.status === 'failed';
  const isWaiting = node.status === 'waiting';

  const chipWidth = 110;
  const chipHeight = 70;

  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: index * 0.08 }}
    >
      {/* Signal glow when active */}
      <AnimatePresence>
        {(isRunning || isWaiting) && (
          <motion.div
            className="absolute inset-0 rounded"
            style={{
              background: `radial-gradient(ellipse at center, ${colors.glow} 0%, transparent 70%)`,
              filter: 'blur(6px)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
        )}
      </AnimatePresence>

      {/* Main chip body */}
      <div
        className="relative border-2 bg-gray-950"
        style={{
          width: chipWidth,
          height: chipHeight,
          borderColor: isPending ? '#374151' : isWaiting ? colors.primary : isRunning ? colors.primary : isCompleted ? colors.primary : '#ef4444',
          boxShadow: isRunning || isWaiting
            ? `0 0 15px ${colors.glow}, inset 0 0 8px ${colors.primary}10`
            : isCompleted
            ? `0 0 8px ${colors.glow}`
            : 'none',
        }}
      >
        {/* Corner notch */}
        <div
          className="absolute top-0 left-0 w-2 h-2 border-b border-r"
          style={{ borderColor: isPending ? '#4b5563' : colors.primary }}
        />

        {/* Pin connectors - left */}
        <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 flex flex-col gap-1">
          {[0, 1].map((i) => (
            <div key={`left-${i}`} className="flex items-center">
              <div className="w-1.5 h-0.5" style={{ backgroundColor: isPending ? '#4b5563' : colors.primary }} />
              <div className="w-1 h-1 rounded-full" style={{ backgroundColor: isPending ? '#374151' : isRunning ? colors.primary : '#1f2937' }} />
            </div>
          ))}
        </div>

        {/* Pin connectors - right */}
        <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 flex flex-col gap-1">
          {[0, 1].map((i) => (
            <div key={`right-${i}`} className="flex items-center">
              <div className="w-1 h-1 rounded-full" style={{ backgroundColor: isPending ? '#374151' : isCompleted ? colors.primary : '#1f2937' }} />
              <div className="w-1.5 h-0.5" style={{ backgroundColor: isPending ? '#4b5563' : colors.primary }} />
            </div>
          ))}
        </div>

        {/* Chip content */}
        <div className="h-full flex flex-col items-center justify-center p-1.5">
          {/* Type designation */}
          <div
            className="text-[7px] font-mono uppercase tracking-wider mb-0.5"
            style={{ color: isPending ? '#6b7280' : colors.primary }}
          >
            {node.type.substring(0, 4).toUpperCase()}-{String(index + 1).padStart(2, '0')}
          </div>

          {/* Icon */}
          <motion.div
            animate={isRunning ? { rotate: 360 } : isWaiting ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: isWaiting ? 0.8 : 2, repeat: (isRunning || isWaiting) ? Infinity : 0, ease: isWaiting ? 'easeInOut' : 'linear' }}
          >
            <Icon
              className="w-4 h-4"
              style={{ color: isPending ? '#6b7280' : colors.primary }}
            />
          </motion.div>

          {/* Name */}
          <div
            className="text-[8px] font-mono mt-0.5 text-center truncate w-full"
            style={{ color: isPending ? '#9ca3af' : '#e5e7eb' }}
          >
            {node.name}
          </div>

          {/* Status indicator */}
          <div className="flex items-center gap-1 mt-0.5 h-3">
            {isRunning && (
              <motion.div className="flex gap-0.5">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-0.5 h-1.5 rounded-sm"
                    style={{ backgroundColor: colors.primary }}
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 0.3, repeat: Infinity, delay: i * 0.1 }}
                  />
                ))}
              </motion.div>
            )}
            {isWaiting && (
              <span className="text-[7px] font-mono" style={{ color: colors.primary }}>WAIT</span>
            )}
            {isCompleted && (
              <span className="text-[7px] font-mono" style={{ color: colors.primary }}>OK</span>
            )}
            {isFailed && (
              <span className="text-[7px] font-mono text-red-500">ERR</span>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {isRunning && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-800">
            <motion.div
              className="h-full"
              style={{ backgroundColor: colors.primary }}
              animate={{ width: `${node.progress}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>
        )}
      </div>

      {/* Component label */}
      <div className="mt-0.5 text-center">
        <span className="text-[7px] font-mono text-gray-600">U{index + 1}</span>
      </div>
    </motion.div>
  );
}

// Decision node - special gate component
function DecisionNode({
  node,
  isActive,
  onConfirm,
  onDecline,
}: {
  node: BlueprintNode;
  isActive: boolean;
  onConfirm?: () => void;
  onDecline?: () => void;
}) {
  const colors = NODE_TYPE_COLORS.decision;
  const isWaiting = node.status === 'waiting';
  const isCompleted = node.status === 'completed';
  const isPending = node.status === 'pending';

  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Glow when waiting */}
      {isWaiting && (
        <motion.div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at center, ${colors.glow} 0%, transparent 70%)`,
            filter: 'blur(8px)',
          }}
          animate={{ opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}

      {/* Diamond shape gate */}
      <div
        className="relative w-20 h-20 rotate-45 border-2 bg-gray-950 flex items-center justify-center"
        style={{
          borderColor: isPending ? '#374151' : colors.primary,
          boxShadow: isWaiting ? `0 0 20px ${colors.glow}` : isCompleted ? `0 0 10px ${colors.glow}` : 'none',
        }}
      >
        <div className="-rotate-45 flex flex-col items-center">
          <LucideIcons.HelpCircle
            className="w-5 h-5"
            style={{ color: isPending ? '#6b7280' : colors.primary }}
          />
          <span
            className="text-[8px] font-mono mt-1"
            style={{ color: isPending ? '#6b7280' : colors.primary }}
          >
            {isWaiting ? 'DECIDE' : isCompleted ? 'OK' : 'GATE'}
          </span>
        </div>
      </div>

      {/* Decision buttons when waiting */}
      {isWaiting && (
        <motion.div
          className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex gap-2"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <button
            onClick={onConfirm}
            className="px-2 py-1 text-[8px] font-mono bg-emerald-500/20 border border-emerald-500 text-emerald-400 rounded hover:bg-emerald-500/30 transition-colors"
          >
            YES
          </button>
          <button
            onClick={onDecline}
            className="px-2 py-1 text-[8px] font-mono bg-red-500/20 border border-red-500 text-red-400 rounded hover:bg-red-500/30 transition-colors"
          >
            NO
          </button>
        </motion.div>
      )}

      {/* Component label */}
      <div className="mt-1 text-center">
        <span className="text-[7px] font-mono text-gray-600">GATE</span>
      </div>
    </motion.div>
  );
}

// PCB trace connection
function TraceConnection({
  sourceNode,
  targetNode,
  index,
  isFeedback = false,
}: {
  sourceNode: BlueprintNode;
  targetNode: BlueprintNode;
  index: number;
  isFeedback?: boolean;
}) {
  const isActive = sourceNode.status === 'running';
  const isCompleted = sourceNode.status === 'completed';
  const colors = NODE_TYPE_COLORS[sourceNode.type] || NODE_TYPE_COLORS.analyzer;
  const targetColors = NODE_TYPE_COLORS[targetNode.type] || NODE_TYPE_COLORS.analyzer;

  const traceWidth = isFeedback ? 40 : 50;

  return (
    <div className="relative flex items-center" style={{ width: traceWidth }}>
      <svg width={traceWidth} height="30" className="overflow-visible">
        <path
          d={`M 0 15 L ${traceWidth} 15`}
          stroke={isCompleted ? colors.primary : '#374151'}
          strokeWidth="2"
          fill="none"
        />
        <circle cx="0" cy="15" r="2" fill={isCompleted || isActive ? colors.primary : '#374151'} />
        <circle cx={traceWidth} cy="15" r="2" fill={isCompleted ? targetColors.primary : '#374151'} />

        {isActive && (
          <motion.circle
            r="3"
            fill={colors.primary}
            style={{ filter: `drop-shadow(0 0 3px ${colors.glow})` }}
            initial={{ cx: 0, cy: 15 }}
            animate={{ cx: traceWidth, cy: 15 }}
            transition={{ duration: 0.5, repeat: Infinity, ease: 'linear' }}
          />
        )}
      </svg>
    </div>
  );
}

export default function ConceptCircuit({
  nodes,
  edges,
  currentNodeId,
  cycleCount,
  waitingForDecision,
  onConfirm,
  onDecline,
}: ConceptCircuitProps) {
  const processingNodes = nodes.filter(n => n.type !== 'decision');
  const decisionNode = nodes.find(n => n.type === 'decision');

  const edgeMap = useMemo(() => {
    const map = new Map<string, string>();
    edges.forEach(e => map.set(e.source, e.target));
    return map;
  }, [edges]);

  return (
    <div className="w-full h-full flex flex-col">
      {/* Title */}
      <div className="text-center mb-2">
        <h3 className="text-sm font-mono font-semibold text-cyan-400/90 tracking-wider">
          CONCEPT_02 // CIRCUIT_LOOP
        </h3>
        <p className="text-[10px] font-mono text-gray-600 mt-1">
          PCB LAYOUT WITH DECISION GATE | CYCLE: {cycleCount + 1}
        </p>
      </div>

      {/* Circuit visualization */}
      <div className="flex-1 flex items-center justify-center relative">
        {/* Grid background */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(rgba(6, 182, 212, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(6, 182, 212, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '15px 15px',
          }}
        />

        {/* Technical markers */}
        <div className="absolute top-2 left-4 text-[7px] font-mono text-gray-700">CYCLE_MODE</div>
        <div className="absolute top-2 right-4 text-[7px] font-mono text-gray-700">REV: B{cycleCount + 1}</div>

        {/* Main circuit layout */}
        <div className="relative z-10">
          {/* Top row: Processing nodes */}
          <div className="flex items-center gap-0">
            {processingNodes.map((node, index) => {
              const nextNodeId = edgeMap.get(node.id);
              const nextNode = processingNodes.find(n => n.id === nextNodeId);
              const isLastProcessing = index === processingNodes.length - 1;

              return (
                <React.Fragment key={node.id}>
                  <ChipNode
                    node={node}
                    index={index}
                    isActive={node.id === currentNodeId}
                  />
                  {nextNode && (
                    <TraceConnection
                      sourceNode={node}
                      targetNode={nextNode}
                      index={index}
                    />
                  )}
                  {isLastProcessing && decisionNode && (
                    <TraceConnection
                      sourceNode={node}
                      targetNode={decisionNode}
                      index={index}
                    />
                  )}
                </React.Fragment>
              );
            })}

            {/* Decision node */}
            {decisionNode && (
              <DecisionNode
                node={decisionNode}
                isActive={decisionNode.id === currentNodeId}
                onConfirm={onConfirm}
                onDecline={onDecline}
              />
            )}
          </div>

          {/* Feedback loop indicator */}
          {decisionNode && (
            <div className="absolute -bottom-8 left-0 right-0 flex items-center justify-center">
              <svg width="100%" height="30" className="overflow-visible">
                <path
                  d={`M 55 0 L 55 15 L ${55 + (processingNodes.length * 160) + 50} 15 L ${55 + (processingNodes.length * 160) + 50} 0`}
                  stroke={cycleCount > 0 ? '#ec4899' : '#374151'}
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                  fill="none"
                />
                <polygon
                  points="52,0 58,0 55,5"
                  fill={cycleCount > 0 ? '#ec4899' : '#374151'}
                />
                <text x="50%" y="25" textAnchor="middle" className="text-[7px] font-mono" fill="#6b7280">
                  FEEDBACK LOOP
                </text>
              </svg>
            </div>
          )}
        </div>

        {/* Power rails */}
        <div className="absolute top-6 left-6 right-6 flex justify-between">
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500/50" />
            <span className="text-[7px] font-mono text-red-500/50">VCC</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[7px] font-mono text-gray-600">GND</span>
            <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-4 mt-6 border-t border-gray-800/50 pt-2">
        {Object.entries(NODE_TYPE_COLORS).slice(0, 5).map(([type, colors]) => (
          <div key={type} className="flex items-center gap-1">
            <div
              className="w-2 h-1.5 border"
              style={{ borderColor: colors.primary, backgroundColor: `${colors.primary}20` }}
            />
            <span className="text-[7px] font-mono text-gray-500 uppercase">{type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
