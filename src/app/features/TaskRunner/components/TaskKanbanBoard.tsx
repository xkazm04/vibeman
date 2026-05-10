/**
 * TaskKanbanBoard
 *
 * Kanban board view for TaskRunner. Groups all requirements by status
 * into 4 columns (Backlog, In Progress, Done, Failed) with drag-and-drop
 * to transition tasks between columns.
 */

'use client';

import React, { useMemo, useCallback } from 'react';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import { useShallow } from 'zustand/react/shallow';
import { useDragDropContext } from '@/hooks/dnd';
import KanbanColumn from './KanbanColumn';
import KanbanTaskCard from './KanbanTaskCard';
import { useTaskRunnerStore } from '../store/taskRunnerStore';
import {
  KANBAN_COLUMNS,
  statusToKanbanColumn,
  type ProjectRequirement,
  type KanbanColumnId,
} from '../lib/types';
import { isTransitionAllowed, executeTransition } from '../lib/kanbanTransitions';

interface TaskKanbanBoardProps {
  requirements: ProjectRequirement[];
  selectedRequirements: Set<string>;
  getRequirementId: (req: ProjectRequirement) => string;
  onToggleSelect: (reqId: string) => void;
  onDelete: (reqId: string) => void;
  onReset?: (reqId: string) => void;
}

export default function TaskKanbanBoard({
  requirements,
  selectedRequirements,
  getRequirementId,
  onToggleSelect,
  onDelete,
  onReset,
}: TaskKanbanBoardProps) {
  // Subscribe to task statuses for real-time updates
  const tasks = useTaskRunnerStore(useShallow((s) => s.tasks));
  const updateTaskStatus = useTaskRunnerStore((s) => s.updateTaskStatus);

  // Merge live status into requirements
  const requirementsWithStatus = useMemo((): ProjectRequirement[] => {
    return requirements.map((req) => {
      const reqId = getRequirementId(req);
      const task = tasks[reqId];
      return task ? { ...req, status: task.status } : req;
    });
  }, [requirements, tasks, getRequirementId]);

  // Group into kanban columns
  const columns = useMemo(() => {
    const grouped: Record<KanbanColumnId, ProjectRequirement[]> = {
      'backlog': [],
      'in-progress': [],
      'done': [],
      'failed': [],
    };
    for (const req of requirementsWithStatus) {
      const col = statusToKanbanColumn(req.status.type);
      grouped[col].push(req);
    }
    return grouped;
  }, [requirementsWithStatus]);

  // Build a lookup for quick requirement access during DnD
  const reqById = useMemo(() => {
    const map = new Map<string, ProjectRequirement>();
    for (const req of requirementsWithStatus) {
      map.set(getRequirementId(req), req);
    }
    return map;
  }, [requirementsWithStatus, getRequirementId]);

  // DnD handlers
  const handleDrop = useCallback((activeId: string, overId: string | null) => {
    if (!overId) return;

    // Extract target column ID from droppable ID
    const targetColumn = overId.replace('kanban-col-', '') as KanbanColumnId;
    if (!KANBAN_COLUMNS.some(c => c.id === targetColumn)) return;

    const req = reqById.get(activeId);
    if (!req) return;

    const sourceColumn = statusToKanbanColumn(req.status.type);
    if (sourceColumn === targetColumn) return;

    if (!isTransitionAllowed(sourceColumn, targetColumn, req.status.type)) return;

    executeTransition(activeId, targetColumn, {
      resetTask: (reqId) => onReset?.(reqId),
      updateStatus: (reqId, status) => updateTaskStatus(reqId, status),
    });
  }, [reqById, onReset, updateTaskStatus]);

  const validateDrop = useCallback((activeId: string, overId: string) => {
    const targetColumn = overId.replace('kanban-col-', '') as KanbanColumnId;
    const req = reqById.get(activeId);
    if (!req) return false;
    const sourceColumn = statusToKanbanColumn(req.status.type);
    return isTransitionAllowed(sourceColumn, targetColumn, req.status.type);
  }, [reqById]);

  const {
    sensors,
    activeId,
    isDragActive,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragCancel,
    dropAnimation,
  } = useDragDropContext({
    onDrop: handleDrop,
    validateDrop,
    sensorOptions: { delay: 200, tolerance: 5 },
  });

  const activeReq = activeId ? reqById.get(activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragCancel={handleDragCancel}
    >
      <div
        className="flex gap-4 overflow-x-auto pb-4"
        data-testid="task-kanban-board"
      >
        {KANBAN_COLUMNS.map((config) => (
          <KanbanColumn
            key={config.id}
            config={config}
            requirements={columns[config.id]}
            selectedRequirements={selectedRequirements}
            isDragActive={isDragActive}
            getRequirementId={getRequirementId}
            onToggleSelect={onToggleSelect}
            onDelete={onDelete}
            onReset={onReset}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={dropAnimation}>
        {activeReq && (
          <div className="opacity-90 shadow-xl shadow-black/30 rounded-lg">
            <KanbanTaskCard
              requirement={activeReq}
              requirementId={activeId!}
              isSelected={selectedRequirements.has(activeId!)}
              onToggleSelect={() => {}}
              onDelete={() => {}}
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
