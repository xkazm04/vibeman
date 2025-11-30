'use client';

import React from 'react';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import { Project } from '@/types';

interface RunnerRightPanelProps {
  onAnnetteInteraction?: (project: Project) => void;
}

/**
 * RunnerRightPanel - Project selector panel for Annette
 * Allows users to select a project for AI interaction
 */
export default function RunnerRightPanel({ onAnnetteInteraction }: RunnerRightPanelProps) {
  const { projects } = useProjectConfigStore();

  const handleProjectSelect = (project: Project) => {
    if (onAnnetteInteraction) {
      onAnnetteInteraction(project);
    }
  };

  return (
    <div className="h-full bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/30 rounded-2xl p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white mb-2">Project Selection</h2>
        <p className="text-sm text-slate-400">Choose a project to interact with</p>
      </div>

      <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-400px)] custom-scrollbar">
        {projects.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <p>No projects available</p>
            <p className="text-xs mt-2">Add projects in the main dashboard</p>
          </div>
        ) : (
          projects.map((project) => (
            <button
              key={project.id}
              onClick={() => handleProjectSelect(project)}
              className="w-full p-4 bg-slate-800/30 hover:bg-slate-700/40 border border-slate-700/50 hover:border-blue-500/50 rounded-xl transition-all duration-200 text-left group"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-white font-medium group-hover:text-blue-400 transition-colors">
                    {project.name}
                  </h3>
                  {project.type && (
                    <p className="text-xs text-slate-400 mt-1">
                      {project.type}
                    </p>
                  )}
                </div>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
