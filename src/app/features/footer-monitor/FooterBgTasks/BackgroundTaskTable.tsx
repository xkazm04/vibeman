import { BackgroundTask } from '@/types/backgroundTasks';
import BackgroundTaskRow from './BackgroundTaskRow';
import { AnimatePresence } from 'framer-motion';

interface BackgroundTaskTableProps {
  filter: string;
  filteredTasks: BackgroundTask[];
  isLoading?: boolean;
  onCancel: (taskId: string) => void;
  onRetry: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onContextMenu: (event: React.MouseEvent, task: BackgroundTask) => void;
}

const BackgroundTaskTable = ({
  filter,
  filteredTasks,
  isLoading,
  onCancel,
  onRetry,
  onDelete,
  onContextMenu
}: BackgroundTaskTableProps) => {
  const getTableHeight = () => {
    return 'h-full';
  };

  return (
    <div className="flex-1 overflow-hidden border border-gray-700/30 rounded-lg bg-gray-900/20 relative">
      {/* Test button for context menu */}
      <button
        onClick={(e) => {
          if (filteredTasks.length > 0) {
            handleContextMenu(e as any, filteredTasks[0]);
          }
        }}
        className="absolute top-2 right-2 z-10 px-2 py-1 bg-blue-500 text-white text-sm rounded"
      >
        Test Menu
      </button>

      <div className={`${getTableHeight()} overflow-auto custom-scrollbar`}>
        {filteredTasks.length > 0 ? (
          <table className="w-full">
            <thead className="sticky top-0 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700/50">
              <tr>
                <th className="px-3 py-2 text-center text-gray-300 font-medium text-sm uppercase tracking-wider w-12">Type</th>
                <th className="px-3 py-2 text-left text-gray-300 font-medium text-sm uppercase tracking-wider">Project</th>
                <th className="px-3 py-2 text-left text-gray-300 font-medium text-sm uppercase tracking-wider">Status</th>
                <th className="px-3 py-2 text-left text-gray-300 font-medium text-sm uppercase tracking-wider">Created</th>
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
                    onDelete={onDelete}
                    onContextMenu={onContextMenu}
                  />
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        ) : (
          <div className="flex items-center justify-center h-full">
            {isLoading ? (
              <div className="text-center text-gray-400">
                <div className="text-sm animate-pulse">Loading tasks...</div>
              </div>
            ) : (
              <div className="text-center text-gray-400">
                <div className="text-sm">No {filter !== 'all' ? filter : ''} background tasks to display</div>
              </div>
            )}
          </div>
        )}
      </div>


    </div>
  );
};

export default BackgroundTaskTable;