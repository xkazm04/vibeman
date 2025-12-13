'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Map } from 'lucide-react';
import StrategicRoadmap from '@/app/features/StrategicRoadmap/StrategicRoadmap';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import type { Project } from '@/types';

export default function StrategicRoadmapPage() {
  const { activeProject, setActiveProject } = useActiveProjectStore();
  const projectsList = useProjectConfigStore(state => state.projects);
  const [showProjectSelector, setShowProjectSelector] = useState(!activeProject);

  // Show project selector if no active project
  useEffect(() => {
    if (!activeProject && projectsList.length > 0) {
      setShowProjectSelector(true);
    }
  }, [activeProject, projectsList]);

  // If no project selected and projects exist, show selector
  if (!activeProject) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-8 max-w-md w-full"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-lg">
              <Map className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Strategic Roadmap</h2>
              <p className="text-sm text-gray-400">Select a project to view the roadmap</p>
            </div>
          </div>

          {projectsList.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 mb-4">No projects found</p>
              <p className="text-sm text-gray-500">
                Create a project first to use the Strategic Roadmap
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {projectsList.map((project) => (
                <button
                  key={project.id}
                  onClick={() => {
                    setActiveProject(project);
                    setShowProjectSelector(false);
                  }}
                  className="w-full p-3 text-left bg-gray-700/30 hover:bg-gray-700/50
                    border border-gray-600/30 hover:border-cyan-500/30
                    rounded-lg transition-all group"
                  data-testid={`project-select-${project.id}`}
                >
                  <div className="font-medium text-gray-200 group-hover:text-white">
                    {project.name}
                  </div>
                  <div className="text-xs text-gray-500 truncate">{project.path}</div>
                </button>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <StrategicRoadmap projectId={activeProject.id} />
    </div>
  );
}
