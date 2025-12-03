/**
 * SimulationSystemMap Component
 * Enhanced SystemMap with drag-and-drop simulation capabilities
 * This wraps the existing SystemMap with simulation mode features
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Move, Target } from 'lucide-react';
import type { Context, ContextGroup } from '@/stores/contextStore';
import type { ContextGroupRelationship } from '@/lib/queries/contextQueries';
import type { ImpactAnalysisResult, SimulationState } from '../sub_DocsAnalysis/lib/impactSimulator/types';
import { analyzeContextMoveImpact, quickAnalyzeMove } from '../sub_DocsAnalysis/lib/impactSimulator/staticAnalyzer';
import ImpactQuickPreview from './ImpactQuickPreview';
import ImpactAnalysisPanel from './ImpactAnalysisPanel';

interface SimulationSystemMapProps {
  groups: ContextGroup[];
  contexts: Context[];
  relationships: ContextGroupRelationship[];
  isSimulationEnabled: boolean;
  onModuleSelect: (moduleId: string) => void;
  onModuleHover?: (moduleId: string | null) => void;
  onMoveContext?: (contextId: string, newGroupId: string) => Promise<void>;
}

// Draggable Context Chip
function DraggableContextChip({
  context,
  onDragStart,
  onDragEnd,
  isDragging,
}: {
  context: Context;
  onDragStart: (context: Context) => void;
  onDragEnd: () => void;
  isDragging: boolean;
}) {
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('contextId', context.id);
    e.dataTransfer.effectAllowed = 'move';
    onDragStart(context);
  };

  const handleDragEnd = () => {
    onDragEnd();
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`flex items-center gap-1.5 px-2 py-1 rounded-lg cursor-move transition-all hover:scale-[1.02] ${
        isDragging
          ? 'opacity-50 bg-violet-500/30 border-violet-500/50'
          : 'bg-gray-800/60 border-gray-700/40 hover:bg-gray-800/80 hover:border-gray-600/50'
      } border`}
      data-testid={`draggable-context-${context.id}`}
    >
      <Move className="w-3 h-3 text-gray-500" />
      <span className="text-xs text-gray-300 truncate max-w-[100px]">{context.name}</span>
      <span className="text-[9px] text-gray-500">
        ({context.filePaths?.length || 0} files)
      </span>
    </div>
  );
}

// Drop Zone for Groups
function GroupDropZone({
  group,
  isDropTarget,
  isValidDrop,
  onDrop,
  onDragOver,
  onDragLeave,
  contextCount,
}: {
  group: ContextGroup;
  isDropTarget: boolean;
  isValidDrop: boolean;
  onDrop: (groupId: string) => void;
  onDragOver: (e: React.DragEvent, groupId: string) => void;
  onDragLeave: () => void;
  contextCount: number;
}) {
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onDrop(group.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    onDragOver(e, group.id);
  };

  return (
    <motion.div
      className={`relative p-3 rounded-xl border-2 border-dashed transition-all ${
        isDropTarget
          ? isValidDrop
            ? 'border-violet-500/60 bg-violet-500/10'
            : 'border-red-500/60 bg-red-500/10'
          : 'border-gray-700/40 hover:border-gray-600/50'
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={onDragLeave}
      animate={{
        scale: isDropTarget ? 1.02 : 1,
      }}
      data-testid={`group-drop-zone-${group.id}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: group.color }}
        />
        <span className="text-sm font-medium text-white">{group.name}</span>
        <span className="text-xs text-gray-500">({contextCount})</span>
      </div>

      {isDropTarget && (
        <motion.div
          className="absolute inset-0 rounded-xl flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
              isValidDrop ? 'bg-violet-500/20 text-violet-300' : 'bg-red-500/20 text-red-300'
            }`}
          >
            <Target className="w-4 h-4" />
            <span className="text-xs font-medium">
              {isValidDrop ? 'Drop to simulate' : 'Already in this group'}
            </span>
          </div>
        </motion.div>
      )}

      {group.type && (
        <span
          className="absolute top-2 right-2 px-1.5 py-0.5 text-[9px] uppercase font-medium rounded"
          style={{
            backgroundColor: `${group.color}20`,
            color: group.color,
          }}
        >
          {group.type}
        </span>
      )}
    </motion.div>
  );
}

export default function SimulationSystemMap({
  groups,
  contexts,
  relationships,
  isSimulationEnabled,
  onModuleSelect,
  onModuleHover,
  onMoveContext,
}: SimulationSystemMapProps) {
  // Simulation state
  const [simulationState, setSimulationState] = useState<SimulationState>({
    isEnabled: isSimulationEnabled,
    isAnalyzing: false,
    proposedMove: null,
    analysisResult: null,
    error: null,
  });

  // Drag state
  const [draggingContext, setDraggingContext] = useState<Context | null>(null);
  const [dropTargetGroupId, setDropTargetGroupId] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);

  // Panel state
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Get context count per group
  const contextCountByGroup = useMemo(() => {
    const counts: Record<string, number> = {};
    groups.forEach(g => {
      counts[g.id] = contexts.filter(c => c.groupId === g.id).length;
    });
    return counts;
  }, [groups, contexts]);

  // Quick analysis result
  const quickAnalysis = useMemo(() => {
    if (!draggingContext || !dropTargetGroupId) return null;
    const targetGroup = groups.find(g => g.id === dropTargetGroupId);
    if (!targetGroup) return null;
    return quickAnalyzeMove(draggingContext, targetGroup);
  }, [draggingContext, dropTargetGroupId, groups]);

  // Get source group for dragging context
  const sourceGroup = useMemo(() => {
    if (!draggingContext) return null;
    return groups.find(g => g.id === draggingContext.groupId) || null;
  }, [draggingContext, groups]);

  // Handle drag start
  const handleDragStart = useCallback((context: Context) => {
    setDraggingContext(context);
  }, []);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setDraggingContext(null);
    setDropTargetGroupId(null);
    setMousePosition(null);
  }, []);

  // Handle drag over group
  const handleDragOver = useCallback((e: React.DragEvent, groupId: string) => {
    setDropTargetGroupId(groupId);
    setMousePosition({ x: e.clientX, y: e.clientY });
  }, []);

  // Handle drag leave
  const handleDragLeave = useCallback(() => {
    setDropTargetGroupId(null);
    setMousePosition(null);
  }, []);

  // Handle drop - perform full analysis
  const handleDrop = useCallback(
    async (targetGroupId: string) => {
      if (!draggingContext) return;

      const targetGroup = groups.find(g => g.id === targetGroupId);
      if (!targetGroup) return;

      // Don't analyze if dropping in same group
      if (draggingContext.groupId === targetGroupId) {
        handleDragEnd();
        return;
      }

      // Set analyzing state
      setSimulationState(prev => ({ ...prev, isAnalyzing: true }));

      // Perform full analysis
      const analysisResult = analyzeContextMoveImpact(
        draggingContext,
        sourceGroup,
        targetGroup,
        contexts,
        groups
      );

      // Update state with results
      setSimulationState(prev => ({
        ...prev,
        isAnalyzing: false,
        proposedMove: analysisResult.proposedMove,
        analysisResult,
      }));

      // Open the panel
      setIsPanelOpen(true);

      // Clear drag state
      handleDragEnd();
    },
    [draggingContext, groups, sourceGroup, contexts, handleDragEnd]
  );

  // Handle confirm move from panel
  const handleConfirmMove = useCallback(async () => {
    if (!simulationState.proposedMove || !onMoveContext) return;

    try {
      await onMoveContext(
        simulationState.proposedMove.contextId,
        simulationState.proposedMove.targetGroupId
      );
      setIsPanelOpen(false);
      setSimulationState(prev => ({
        ...prev,
        proposedMove: null,
        analysisResult: null,
      }));
    } catch (error) {
      console.error('Failed to move context:', error);
    }
  }, [simulationState.proposedMove, onMoveContext]);

  // Check if drop is valid
  const isValidDrop = useCallback(
    (groupId: string) => {
      if (!draggingContext) return false;
      return draggingContext.groupId !== groupId;
    },
    [draggingContext]
  );

  if (!isSimulationEnabled) {
    return null; // Return null when simulation is disabled, parent will show regular SystemMap
  }

  return (
    <div className="relative h-full" data-testid="simulation-system-map">
      {/* Main Grid of Groups */}
      <div className="p-4 h-full overflow-auto">
        <div className="mb-4">
          <h3 className="text-sm font-medium text-violet-400 mb-1">Simulation Mode</h3>
          <p className="text-xs text-gray-500">
            Drag contexts between groups to analyze the impact of architectural changes
          </p>
        </div>

        {/* Groups Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {groups.map(group => (
            <GroupDropZone
              key={group.id}
              group={group}
              isDropTarget={dropTargetGroupId === group.id}
              isValidDrop={isValidDrop(group.id)}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              contextCount={contextCountByGroup[group.id] || 0}
            />
          ))}
        </div>

        {/* Contexts List */}
        <div className="space-y-3">
          {groups.map(group => {
            const groupContexts = contexts.filter(c => c.groupId === group.id);
            if (groupContexts.length === 0) return null;

            return (
              <div key={group.id} className="p-3 rounded-xl bg-gray-800/30 border border-gray-700/30">
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: group.color }}
                  />
                  <span className="text-xs font-medium text-gray-300">{group.name}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {groupContexts.map(context => (
                    <DraggableContextChip
                      key={context.id}
                      context={context}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      isDragging={draggingContext?.id === context.id}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Preview during drag */}
      <AnimatePresence>
        {draggingContext && dropTargetGroupId && quickAnalysis && mousePosition && (
          <ImpactQuickPreview
            contextName={draggingContext.name}
            sourceGroupName={sourceGroup?.name || 'Ungrouped'}
            targetGroupName={groups.find(g => g.id === dropTargetGroupId)?.name || ''}
            severity={quickAnalysis.severity}
            fileCount={quickAnalysis.fileCount}
            hasLayerChange={quickAnalysis.hasLayerChange}
            position={mousePosition}
          />
        )}
      </AnimatePresence>

      {/* Analysis Panel */}
      {simulationState.analysisResult && (
        <ImpactAnalysisPanel
          result={simulationState.analysisResult}
          isOpen={isPanelOpen}
          onClose={() => setIsPanelOpen(false)}
          onConfirmMove={onMoveContext ? handleConfirmMove : undefined}
        />
      )}

      {/* Analyzing indicator */}
      {simulationState.isAnalyzing && (
        <motion.div
          className="absolute inset-0 bg-gray-900/50 flex items-center justify-center z-30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-800/90 border border-violet-500/30">
            <motion.div
              className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
            <span className="text-sm text-violet-300">Analyzing impact...</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
