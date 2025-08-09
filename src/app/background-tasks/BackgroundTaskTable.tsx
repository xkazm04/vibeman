import { useState } from 'react';
import BackgroundTaskRow from './BackgroundTaskRow';
import { AnimatePresence } from 'framer-motion';
import { BackgroundTask } from '../../types/backgroundTasks';

interface BackgroundTaskTableProps {
  viewState: 'normal' | 'maximized' | 'minimized';
  filter: string;
  filteredTasks: BackgroundTask[];
  isLoading?: boolean;
  onCancel: (taskId: string) => void;
  onRetry: (taskId: string) => void;
}

const BackgroundTaskTable = ({
  viewState, 
  filter, 
  filteredTasks, 
  isLoading, 
  onCancel, 
  onRetry
}: BackgroundTaskTableProps) => {
  const getTableHeight = () => {
    switch (viewState) {
      case 'maximized': return 'max-h-[65vh]';
      case 'normal': 
      default: return 'max-h-96';
    }
  };
  
  return (
    <div className="flex-1 overflow-hidden border border-gray-700/30 rounded-lg bg-gray-900/20">
      <div className={`${getTableHeight()} overflow-auto custom-scrollbar`}>
        <table className="w-full">
          <thead className="sticky top-0 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700/50">
            <tr>
              <th className="px-3 py-2 text-left text-gray-300 font-medium text-xs uppercase tracking-wider">Task</th>
              <th className="px-3 py-2 text-left text-gray-300 font-medium text-xs uppercase tracking-wider">Project</th>
              <th className="px-3 py-2 text-left text-gray-300 font-medium text-xs uppercase tracking-wider">Status</th>
              <th className="px-3 py-2 text-left text-gray-300 font-medium text-xs uppercase tracking-wider">Created</th>
              <th className="px-3 py-2 text-left text-gray-300 font-medium text-xs uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {filteredTasks.map((task, index) => (
                <BackgroundTaskRow 
                  key={task.id} 
                  task={task} 
                  index={index}
                  onCancel={onCancel}
                  onRetry={onRetry}
                />
              ))}
            </AnimatePresence>
          </tbody>
        </table>
        {filteredTasks.length === 0 && !isLoading && (
          <div className="text-center py-12 text-gray-400">
            <div className="text-sm">No {filter !== 'all' ? filter : ''} background tasks to display</div>
          </div>
        )}
        {isLoading && filteredTasks.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <div className="text-sm animate-pulse">Loading tasks...</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BackgroundTaskTable;