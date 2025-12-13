'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ROISimulatorLayout } from '@/app/features/ROISimulator';
import { RefreshCcw } from 'lucide-react';

export default function ROISimulatorPage() {
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get('projectId');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load projects to allow selection
    const loadProjects = async () => {
      try {
        const response = await fetch('/api/projects');
        if (response.ok) {
          const data = await response.json();
          setProjects(data.projects || []);

          // Set project ID from URL param or first project
          if (projectIdParam) {
            setProjectId(projectIdParam);
          } else if (data.projects?.length > 0) {
            setProjectId(data.projects[0].id);
          }
        }
      } catch (error) {
        console.error('Failed to load projects:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProjects();
  }, [projectIdParam]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 flex items-center justify-center">
        <RefreshCcw className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (!projectId) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Select a Project</h1>
          <p className="text-gray-400 mb-6">Choose a project to view ROI simulations.</p>
          {projects.length === 0 ? (
            <p className="text-gray-500">No projects found. Create a project first.</p>
          ) : (
            <div className="space-y-2">
              {projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => setProjectId(project.id)}
                  className="block w-full px-6 py-3 bg-gray-800 hover:bg-gray-700
                           text-white rounded-lg transition-colors"
                  data-testid={`select-project-${project.id}`}
                >
                  {project.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Project Selector */}
      {projects.length > 1 && (
        <div className="fixed top-4 right-4 z-50">
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg
                     text-white text-sm focus:outline-none focus:border-cyan-500"
            data-testid="project-selector"
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <ROISimulatorLayout projectId={projectId} />
    </div>
  );
}
