// Column configuration for Kanban board
import type { KanbanStatus, KanbanColumnConfig } from '../types/feedbackTypes';

export const KANBAN_COLUMNS: KanbanColumnConfig[] = [
  {
    id: 'new',
    title: 'New',
    subtitle: 'Incoming feedback',
    iconName: 'inbox',
    acceptsFrom: [],
    maxItems: null,
  },
  {
    id: 'analyzed',
    title: 'Analyzed',
    subtitle: 'Triaged & categorized',
    iconName: 'search',
    acceptsFrom: ['new'],
    maxItems: null,
  },
  {
    id: 'manual',
    title: 'Manual',
    subtitle: 'Human dev pipeline',
    iconName: 'user',
    acceptsFrom: ['analyzed'],
    maxItems: 10,
  },
  {
    id: 'automatic',
    title: 'Automatic',
    subtitle: 'AI agent pipeline',
    iconName: 'bot',
    acceptsFrom: ['analyzed'],
    maxItems: 5,
  },
  {
    id: 'done',
    title: 'Done',
    subtitle: 'Resolved',
    iconName: 'check-circle',
    acceptsFrom: ['manual', 'automatic'],
    maxItems: null,
  },
];

// Get column config by status
export function getColumnConfig(status: KanbanStatus): KanbanColumnConfig | undefined {
  return KANBAN_COLUMNS.find(col => col.id === status);
}

// Check if a drop is valid
export function isValidDrop(fromStatus: KanbanStatus, toStatus: KanbanStatus): boolean {
  const toColumn = getColumnConfig(toStatus);
  if (!toColumn) return false;
  return toColumn.acceptsFrom.includes(fromStatus);
}
