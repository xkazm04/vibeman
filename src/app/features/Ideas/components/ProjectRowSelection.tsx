'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface ProjectRowSelectionProps {
  projects: Array<{ id: string; name: string }>;
  selectedProjectId: string;
  onSelectProject: (projectId: string) => void;
}

export default function ProjectRowSelection({
  projects,
  selectedProjectId,
  onSelectProject,
}: ProjectRowSelectionProps) {
  return (
    <div className="flex items-center space-x-3 overflow-x-auto">
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide shrink-0">
        Projects:
      </span>
      <motion.button
        data-testid="project-filter-all-button"
        onClick={() => onSelectProject('all')}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
          selectedProjectId === 'all'
            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
            : 'bg-gray-800/40 text-gray-400 border border-gray-700/40 hover:bg-gray-800/60 hover:text-gray-300'
        }`}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        All Projects
      </motion.button>
      {projects.map((project) => (
        <motion.button
          key={project.id}
          data-testid={`project-filter-${project.id}`}
          onClick={() => onSelectProject(project.id)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
            selectedProjectId === project.id
              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
              : 'bg-gray-800/40 text-gray-400 border border-gray-700/40 hover:bg-gray-800/60 hover:text-gray-300'
          }`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {project.name}
        </motion.button>
      ))}
    </div>
  );
}
