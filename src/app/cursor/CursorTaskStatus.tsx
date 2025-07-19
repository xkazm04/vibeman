import { ClaudeTask } from '@/types/development';
import React, { useState, useEffect } from 'react';


interface TaskStatusProps {
  projectPaths: string[];
}

export const CursorTaskStatus: React.FC<TaskStatusProps> = ({ projectPaths }) => {
  const [tasks, setTasks] = useState<ClaudeTask[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTaskStatuses = async () => {
    setLoading(true);
    try {
      const allTasks: ClaudeTask[] = [];
      
      for (const projectPath of projectPaths) {
        const response = await fetch(`/api/requirements/status?projectPath=${encodeURIComponent(projectPath)}`);
        const result = await response.json();
        
        if (result.success) {
          allTasks.push(...result.completedTasks);
        }
      }
      
      setTasks(allTasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (error) {
      console.error('Error fetching task statuses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectPaths.length > 0) {
      fetchTaskStatuses();
      const interval = setInterval(fetchTaskStatuses, 15000); // Check every 15 seconds
      return () => clearInterval(interval);
    }
  }, [projectPaths]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'queued': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Claude Task Status</h2>
        <button
          onClick={fetchTaskStatuses}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {loading ? 'Loading task statuses...' : 'No completed tasks found'}
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map((task, index) => (
            <div key={`${task.requirementId}-${index}`} className="border rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold">Requirement: {task.requirementId}</h3>
                  <p className="text-sm text-gray-600">{task.projectPath}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(task.status)}`}>
                  {task.status.toUpperCase()}
                </span>
              </div>
              
              <div className="text-sm text-gray-700">
                <p><span className="font-medium">Created:</span> {new Date(task.createdAt).toLocaleString()}</p>
                {task.status === 'completed' && (
                  <p><span className="font-medium">Output Path:</span> {task.outputPath}</p>
                )}
              </div>
              
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-800">
                  View Prompt
                </summary>
                <pre className="mt-2 p-3 bg-gray-50 rounded text-xs overflow-x-auto">
                  {task.prompt}
                </pre>
              </details>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};