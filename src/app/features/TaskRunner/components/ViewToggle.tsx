/**
 * ViewToggle
 *
 * Switches between project-grid view and kanban board view.
 */

'use client';

import React from 'react';
import { LayoutGrid, Columns3 } from 'lucide-react';

export type TaskRunnerView = 'grid' | 'kanban';

interface ViewToggleProps {
  view: TaskRunnerView;
  onViewChange: (view: TaskRunnerView) => void;
}

export const ViewToggle = React.memo(function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  return (
    <div className="flex items-center gap-0.5 bg-gray-800/50 rounded-md p-0.5 border border-gray-700/50">
      <button
        onClick={() => onViewChange('grid')}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all duration-200 ${
          view === 'grid'
            ? 'bg-gray-700/60 text-gray-200 shadow-sm'
            : 'text-gray-500 hover:text-gray-300'
        }`}
        title="Project grid view"
        data-testid="view-toggle-grid"
      >
        <LayoutGrid className="w-3.5 h-3.5" />
        <span>Grid</span>
      </button>
      <button
        onClick={() => onViewChange('kanban')}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all duration-200 ${
          view === 'kanban'
            ? 'bg-gray-700/60 text-gray-200 shadow-sm'
            : 'text-gray-500 hover:text-gray-300'
        }`}
        title="Kanban board view"
        data-testid="view-toggle-kanban"
      >
        <Columns3 className="w-3.5 h-3.5" />
        <span>Kanban</span>
      </button>
    </div>
  );
});
