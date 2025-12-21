// Drag State Types
import type { FeedbackItem, KanbanStatus } from '../lib/types/feedbackTypes';

export interface DragState {
  draggingItem: FeedbackItem | null;
  dragOverColumn: KanbanStatus | null;
}

export interface DropCheckResult {
  allowed: boolean;
  reason?: string;
}

export interface DragStateContextValue extends DragState {
  setDraggingItem: (item: FeedbackItem | null) => void;
  setDragOverColumn: (column: KanbanStatus | null) => void;
  handleCardDragStart: (e: React.DragEvent, item: FeedbackItem) => void;
  handleCardDragEnd: () => void;
  handleDragOver: (columnId: KanbanStatus) => (e: React.DragEvent) => void;
  handleDragLeave: () => void;
  isDragging: boolean;
}
