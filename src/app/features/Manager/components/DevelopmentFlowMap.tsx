/**
 * DevelopmentFlowMap Component
 * Enhanced version of ManagerSystemMap with directional arrow overlays
 * showing cross-context implementation flows, success rates, and bottlenecks.
 */

'use client';

import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info } from 'lucide-react';

import SystemMap from '@/app/features/Docs/sub_DocsAnalysis/components/SystemMap';
import type { ContextGroup } from '@/stores/contextStore';
import type { ContextGroupRelationship } from '@/lib/queries/contextQueries';

import { useFlowAnalysis, type FlowPair } from './useFlowAnalysis';
import FlowArrow from './FlowArrow';
import BottleneckBadge from './BottleneckBadge';
import CrossContextDetail from './CrossContextDetail';
import type { EnrichedLogWithGroup } from './ManagerSystemMap';

interface DevelopmentFlowMapProps {
  logs: EnrichedLogWithGroup[];
  contextGroups: ContextGroup[];
  relationships: ContextGroupRelationship[];
  selectedGroupId: string | null;
  onGroupClick: (groupId: string) => void;
  projectId: string | null | undefined;
}

// Minimum threshold to show an arrow (avoid clutter)
const MIN_ARROW_THRESHOLD = 1;

export default function DevelopmentFlowMap({
  logs,
  contextGroups,
  relationships,
  selectedGroupId,
  onGroupClick,
  projectId,
}: DevelopmentFlowMapProps) {
  const { data: flowData, loading: flowLoading } = useFlowAnalysis(projectId);
  const [hoveredArrow, setHoveredArrow] = useState<string | null>(null);
  const [selectedPair, setSelectedPair] = useState<FlowPair | null>(null);
  const [showLegend, setShowLegend] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodePositions, setNodePositions] = useState<Map<string, { x: number; y: number }>>(
    new Map()
  );

  // Calculate changes per context group for the base SystemMap
  const changeCountByGroup = useMemo(() => {
    const counts: Record<string, number> = {};
    contextGroups.forEach(group => {
      counts[group.id] = 0;
    });
    logs.forEach(log => {
      if (log.context_group_id) {
        counts[log.context_group_id] = (counts[log.context_group_id] || 0) + 1;
      }
    });
    return counts;
  }, [logs, contextGroups]);

  // Observe node DOM positions from the SystemMap's rendered nodes
  const updateNodePositions = useCallback(() => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const newPositions = new Map<string, { x: number; y: number }>();

    // Find all SystemMap module nodes by data-testid
    const nodes = containerRef.current.querySelectorAll('[data-testid^="system-map-node-"]');
    nodes.forEach((el) => {
      const testId = el.getAttribute('data-testid');
      if (!testId) return;
      const moduleId = testId.replace('system-map-node-', '');
      const rect = el.getBoundingClientRect();
      newPositions.set(moduleId, {
        x: rect.left - containerRect.left + rect.width / 2,
        y: rect.top - containerRect.top + rect.height / 2,
      });
    });

    setNodePositions(newPositions);
  }, []);

  // Update positions after mount and on resize
  useEffect(() => {
    const timer = setTimeout(updateNodePositions, 400);
    window.addEventListener('resize', updateNodePositions);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateNodePositions);
    };
  }, [updateNodePositions, contextGroups, flowData]);

  // Re-observe when SystemMap finishes rendering
  useEffect(() => {
    const timer = setTimeout(updateNodePositions, 800);
    return () => clearTimeout(timer);
  }, [logs, updateNodePositions]);

  // Filter pairs above threshold
  const visiblePairs = useMemo(() => {
    if (!flowData) return [];
    return flowData.pairs.filter(p => p.total_count >= MIN_ARROW_THRESHOLD);
  }, [flowData]);

  // Bottleneck groups
  const bottleneckMap = useMemo(() => {
    if (!flowData) return new Map<string, number>();
    const map = new Map<string, number>();
    flowData.bottlenecks.forEach(b => {
      map.set(b.group_id, b.cross_context_fail_count);
    });
    return map;
  }, [flowData]);

  // Handle empty state
  if (contextGroups.length === 0) {
    return (
      <div
        className="h-full flex items-center justify-center bg-gray-900/50 rounded-xl border border-gray-800"
        data-testid="flow-map-empty"
      >
        <div className="text-center p-6">
          <p className="text-gray-400 text-sm">No context groups available</p>
          <p className="text-gray-500 text-xs mt-1">
            Create context groups to see the development flow map
          </p>
        </div>
      </div>
    );
  }

  const hasFlowData = visiblePairs.length > 0;

  return (
    <div className="h-full relative" data-testid="development-flow-map" ref={containerRef}>
      {/* Base SystemMap */}
      <SystemMap
        groups={contextGroups}
        relationships={relationships}
        moduleCountData={changeCountByGroup}
        selectedModuleId={selectedGroupId}
        onModuleSelect={onGroupClick}
      />

      {/* Flow Arrow SVG Overlay */}
      {hasFlowData && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ zIndex: 3 }}
        >
          {visiblePairs.map((pair) => {
            const fromPos = nodePositions.get(pair.source_group_id);
            const toPos = nodePositions.get(pair.target_group_id);
            if (!fromPos || !toPos) return null;

            const pairKey = `${pair.source_group_id}::${pair.target_group_id}`;
            return (
              <FlowArrow
                key={pairKey}
                fromPos={fromPos}
                toPos={toPos}
                totalCount={pair.total_count}
                successRate={pair.success_rate}
                isHighlighted={hoveredArrow === pairKey}
                uniqueId={pairKey}
                onClick={() => {
                  setHoveredArrow(pairKey);
                  setSelectedPair(pair);
                }}
              />
            );
          })}
        </svg>
      )}

      {/* Arrow hover detection overlay */}
      {hasFlowData && (
        <svg
          className="absolute inset-0 w-full h-full"
          style={{ zIndex: 4, pointerEvents: 'none' }}
        >
          {visiblePairs.map((pair) => {
            const fromPos = nodePositions.get(pair.source_group_id);
            const toPos = nodePositions.get(pair.target_group_id);
            if (!fromPos || !toPos) return null;

            const pairKey = `${pair.source_group_id}::${pair.target_group_id}`;
            const midX = (fromPos.x + toPos.x) / 2;
            const midY = (fromPos.y + toPos.y) / 2;

            return (
              <g
                key={`hover-${pairKey}`}
                style={{ pointerEvents: 'all', cursor: 'pointer' }}
                onMouseEnter={() => setHoveredArrow(pairKey)}
                onMouseLeave={() => setHoveredArrow(null)}
                onClick={() => setSelectedPair(pair)}
              >
                <circle cx={midX} cy={midY} r={20} fill="transparent" />
              </g>
            );
          })}
        </svg>
      )}

      {/* Bottleneck Badges overlay on nodes */}
      {bottleneckMap.size > 0 && (
        <div className="absolute inset-0" style={{ zIndex: 5, pointerEvents: 'none' }}>
          {contextGroups.map((group) => {
            const failCount = bottleneckMap.get(group.id);
            if (!failCount) return null;

            const pos = nodePositions.get(group.id);
            if (!pos) return null;

            return (
              <div
                key={`bottleneck-${group.id}`}
                className="absolute"
                style={{
                  left: pos.x + 30,
                  top: pos.y + 20,
                  transform: 'translate(-50%, -50%)',
                  pointerEvents: 'all',
                }}
              >
                <BottleneckBadge
                  failCount={failCount}
                  onClick={() => {
                    // Find a pair involving this group with failures
                    const failPair = visiblePairs.find(
                      p =>
                        (p.source_group_id === group.id || p.target_group_id === group.id) &&
                        p.fail_count > 0
                    );
                    if (failPair) {
                      setSelectedPair(failPair);
                    }
                  }}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <AnimatePresence>
        {showLegend && hasFlowData && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-3 left-3 z-10 p-3 rounded-lg bg-gray-900/95 border border-gray-700 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider">
                Flow Legend
              </span>
              <button
                onClick={() => setShowLegend(false)}
                className="text-gray-500 hover:text-gray-300 text-xs ml-4"
              >
                Hide
              </button>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 bg-green-500 rounded" />
                <span className="text-[10px] text-gray-400">{'>'}80% success</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 bg-yellow-500 rounded" />
                <span className="text-[10px] text-gray-400">50-80% success</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 bg-red-500 rounded" />
                <span className="text-[10px] text-gray-400">{'<'}50% success</span>
              </div>
              <div className="flex items-center gap-2 pt-1 border-t border-gray-800">
                <div className="w-6 h-1.5 bg-gray-500 rounded" />
                <span className="text-[10px] text-gray-400">Thicker = more frequent</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Re-show legend button */}
      {!showLegend && hasFlowData && (
        <button
          onClick={() => setShowLegend(true)}
          className="absolute bottom-3 left-3 z-10 p-2 rounded-lg bg-gray-900/80 border border-gray-700 hover:bg-gray-800 transition-colors"
          title="Show legend"
        >
          <Info className="w-3.5 h-3.5 text-gray-400" />
        </button>
      )}

      {/* Empty flow state */}
      {!flowLoading && !hasFlowData && contextGroups.length > 0 && (
        <div className="absolute bottom-3 left-3 z-10 p-3 rounded-lg bg-gray-900/90 border border-gray-700/50 max-w-[240px]">
          <p className="text-[10px] text-gray-500 leading-relaxed">
            No cross-context flows detected yet. Flows appear when implementations span multiple context groups.
          </p>
        </div>
      )}

      {/* Flow loading indicator */}
      {flowLoading && (
        <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2 p-2 rounded-lg bg-gray-900/80 border border-gray-700">
          <div className="w-3 h-3 border border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-[10px] text-gray-400">Loading flows...</span>
        </div>
      )}

      {/* Stats badge */}
      {hasFlowData && flowData && (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-3 px-3 py-1.5 rounded-lg bg-gray-900/90 border border-gray-700/50">
          <div className="text-center">
            <div className="text-xs font-bold text-cyan-400 font-mono">{visiblePairs.length}</div>
            <div className="text-[8px] text-gray-500 uppercase">Flows</div>
          </div>
          <div className="w-px h-6 bg-gray-700" />
          <div className="text-center">
            <div className="text-xs font-bold text-purple-400 font-mono">
              {flowData.cross_context_count}
            </div>
            <div className="text-[8px] text-gray-500 uppercase">Cross-Ctx</div>
          </div>
          {bottleneckMap.size > 0 && (
            <>
              <div className="w-px h-6 bg-gray-700" />
              <div className="text-center">
                <div className="text-xs font-bold text-red-400 font-mono">
                  {bottleneckMap.size}
                </div>
                <div className="text-[8px] text-gray-500 uppercase">Bottlenecks</div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Cross-context detail panel */}
      <AnimatePresence>
        {selectedPair && (
          <CrossContextDetail
            sourceGroup={contextGroups.find(g => g.id === selectedPair.source_group_id)}
            targetGroup={contextGroups.find(g => g.id === selectedPair.target_group_id)}
            logIds={selectedPair.log_ids}
            successRate={selectedPair.success_rate}
            totalCount={selectedPair.total_count}
            onClose={() => {
              setSelectedPair(null);
              setHoveredArrow(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
