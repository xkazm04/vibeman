import React, { useState, useEffect } from 'react';

interface ProjectStatus {
  path: string;
  name: string;
  lastCommit: string;
  branch: string;
  hasChanges: boolean;
  lastModified: Date;
}

interface ProjectMonitorProps {
  projects: string[];
}

export const CursorProjectMonitor: React.FC<ProjectMonitorProps> = ({ projects }) => {
  const [statuses, setStatuses] = useState<ProjectStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchProjectStatuses = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/projects/monitor?${projects.map(p => `projects=${encodeURIComponent(p)}`).join('&')}`);
      const result = await response.json();
      
      if (result.success) {
        setStatuses(result.projects);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Error fetching project statuses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projects.length > 0) {
      fetchProjectStatuses();
      const interval = setInterval(fetchProjectStatuses, 30000); // Update every 30 seconds
      return () => clearInterval(interval);
    }
  }, [projects]);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Project Monitor</h2>
        <div className="flex items-center space-x-4">
          {lastUpdate && (
            <span className="text-sm text-gray-500">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchProjectStatuses}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {statuses.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {loading ? 'Loading project statuses...' : 'No projects configured for monitoring'}
        </div>
      ) : (
        <div className="grid gap-4">
          {statuses.map((status) => (
            <div
              key={status.path}
              className={`border rounded-lg p-4 ${
                status.hasChanges ? 'border-yellow-300 bg-yellow-50' : 'border-green-300 bg-green-50'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg">{status.name}</h3>
                  <p className="text-sm text-gray-600">{status.path}</p>
                </div>
                <div className="text-right">
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                    status.hasChanges 
                      ? 'bg-yellow-200 text-yellow-800' 
                      : 'bg-green-200 text-green-800'
                  }`}>
                    {status.hasChanges ? 'Has Changes' : 'Clean'}
                  </span>
                </div>
              </div>
              
              <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Branch:</span> {status.branch}
                </div>
                <div>
                  <span className="font-medium">Last Modified:</span>{' '}
                  {new Date(status.lastModified).toLocaleDateString()}
                </div>
                <div className="col-span-2">
                  <span className="font-medium">Last Commit:</span> {status.lastCommit}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
