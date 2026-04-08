'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Loader2 } from 'lucide-react';
import { stagger, transition } from '@/lib/motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import type { ScanEventType } from '@/lib/scan/types';

// ── Types ────────────────────────────────────────────────────────────────────

export type TimelineNodeStatus = 'pending' | 'active' | 'completed' | 'failed';

export interface TimelineNode {
  id: string;
  label: string;
  status: TimelineNodeStatus;
  message?: string;
  startedAt?: number;
  completedAt?: number;
}

export interface ScanProgressTimelineProps {
  nodes: TimelineNode[];
  className?: string;
}

// ── Default scan sub-steps derived from ScanEventType ────────────────────────

const SCAN_STEP_LABELS: Record<ScanEventType, string> = {
  scan_started: 'Scan initialized',
  files_gathered: 'Files gathered',
  analysis_started: 'Analysis started',
  analysis_progress: 'Analyzing codebase',
  analysis_completed: 'Analysis complete',
  scan_completed: 'Scan finished',
  scan_failed: 'Scan failed',
};

/**
 * Build a default set of timeline nodes from ScanEventType progression.
 * Consumers can call this to get the initial node list, then update
 * individual nodes as events arrive.
 */
export function buildDefaultNodes(): TimelineNode[] {
  const steps: ScanEventType[] = [
    'scan_started',
    'files_gathered',
    'analysis_started',
    'analysis_progress',
    'analysis_completed',
    'scan_completed',
  ];

  return steps.map((step) => ({
    id: step,
    label: SCAN_STEP_LABELS[step],
    status: 'pending' as TimelineNodeStatus,
  }));
}

/**
 * Helper to advance timeline nodes based on a ScanEventType.
 * Marks the matching node as 'completed' (or 'failed' for scan_failed),
 * marks the next pending node as 'active', and stamps timestamps.
 */
export function advanceTimeline(
  nodes: TimelineNode[],
  eventType: ScanEventType,
  message?: string,
): TimelineNode[] {
  const now = Date.now();
  const updated = nodes.map((node) => ({ ...node }));

  const idx = updated.findIndex((n) => n.id === eventType);
  if (idx === -1) {
    // scan_failed: mark current active node as failed
    if (eventType === 'scan_failed') {
      const activeIdx = updated.findIndex((n) => n.status === 'active');
      if (activeIdx !== -1) {
        updated[activeIdx] = {
          ...updated[activeIdx],
          status: 'failed',
          message: message || 'Failed',
          completedAt: now,
        };
      }
    }
    return updated;
  }

  // Mark all nodes up to and including this one as completed
  for (let i = 0; i <= idx; i++) {
    if (updated[i].status === 'pending' || updated[i].status === 'active') {
      updated[i] = {
        ...updated[i],
        status: 'completed',
        completedAt: now,
        startedAt: updated[i].startedAt || now,
      };
    }
  }

  // Override the target node with the event message
  updated[idx] = {
    ...updated[idx],
    message: message || updated[idx].message,
  };

  // Mark the next pending node as active
  const nextPending = updated.findIndex((n, i) => i > idx && n.status === 'pending');
  if (nextPending !== -1) {
    updated[nextPending] = {
      ...updated[nextPending],
      status: 'active',
      startedAt: now,
    };
  }

  return updated;
}

// ── Elapsed time formatting ──────────────────────────────────────────────────

function formatElapsed(startedAt?: number, completedAt?: number): string | null {
  if (!startedAt) return null;
  const end = completedAt || Date.now();
  const ms = end - startedAt;
  if (ms < 1000) return `${ms}ms`;
  const secs = (ms / 1000).toFixed(1);
  return `${secs}s`;
}

// ── Status icon ──────────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: TimelineNodeStatus }) {
  switch (status) {
    case 'completed':
      return (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-400/60 flex items-center justify-center"
        >
          <Check className="w-3.5 h-3.5 text-cyan-300" />
        </motion.div>
      );
    case 'failed':
      return (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="w-6 h-6 rounded-full bg-red-500/20 border border-red-400/60 flex items-center justify-center"
        >
          <X className="w-3.5 h-3.5 text-red-300" />
        </motion.div>
      );
    case 'active':
      return (
        <div className="w-6 h-6 rounded-full bg-cyan-500/10 border border-cyan-400/40 flex items-center justify-center ring-2 ring-cyan-400/60">
          <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
        </div>
      );
    default:
      return (
        <div className="w-6 h-6 rounded-full bg-gray-700/40 border border-gray-600/40 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-gray-500/60" />
        </div>
      );
  }
}

// ── Timeline node row ────────────────────────────────────────────────────────

const nodeVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: { opacity: 1, x: 0 },
};

function TimelineRow({ node, isLast }: { node: TimelineNode; isLast: boolean }) {
  const elapsed = formatElapsed(node.startedAt, node.completedAt);
  const isActive = node.status === 'active';
  const isDone = node.status === 'completed';
  const isFailed = node.status === 'failed';

  return (
    <motion.div
      layout
      layoutId={`scan-timeline-${node.id}`}
      variants={nodeVariants}
      className="relative flex items-start gap-3"
    >
      {/* Vertical connector line */}
      {!isLast && (
        <div className="absolute left-[11px] top-7 bottom-0 w-px">
          <div
            className={`h-full w-full transition-colors duration-300 ${
              isDone || isFailed
                ? isDone
                  ? 'bg-cyan-500/40'
                  : 'bg-red-500/40'
                : 'bg-gray-600/30'
            }`}
          />
        </div>
      )}

      {/* Status icon */}
      <div className="flex-shrink-0 z-10">
        <StatusIcon status={node.status} />
      </div>

      {/* Content */}
      <div className={`flex-1 min-w-0 pb-4 ${isLast ? 'pb-0' : ''}`}>
        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-medium transition-colors duration-200 ${
              isActive
                ? 'text-cyan-300'
                : isDone
                  ? 'text-gray-200'
                  : isFailed
                    ? 'text-red-300'
                    : 'text-gray-500'
            }`}
          >
            {node.label}
          </span>

          {elapsed && (
            <span className="text-xs font-mono text-gray-500 tabular-nums">
              {elapsed}
            </span>
          )}
        </div>

        {node.message && (
          <p
            className={`text-xs mt-0.5 ${
              isFailed ? 'text-red-400/80' : 'text-gray-400/80'
            }`}
          >
            {node.message}
          </p>
        )}
      </div>
    </motion.div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function ScanProgressTimeline({
  nodes,
  className = '',
}: ScanProgressTimelineProps) {
  const prefersReduced = useReducedMotion();

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: prefersReduced ? 0 : stagger.row,
      },
    },
  };

  return (
    <motion.div
      className={`w-full ${className}`}
      initial={prefersReduced ? false : 'hidden'}
      animate="visible"
      variants={containerVariants}
    >
      <AnimatePresence mode="popLayout">
        {nodes.map((node, i) => (
          <TimelineRow
            key={node.id}
            node={node}
            isLast={i === nodes.length - 1}
          />
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
