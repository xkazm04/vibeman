'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Folder } from 'lucide-react';

interface ProjectFilterProps {
  projects: Array<{ id: string; name: string }>;
  selectedProjectIds: string[];
  onChange: (projectIds: string[]) => void;
}

export default function ProjectFilter({ projects, selectedProjectIds, onChange }: ProjectFilterProps) {
  const toggleProject = (projectId: string) => {
    if (selectedProjectIds.includes(projectId)) {
      onChange(selectedProjectIds.filter((id) => id !== projectId));
    } else {
      onChange([...selectedProjectIds, projectId]);
    }
  };

  const toggleAll = () => {
    if (selectedProjectIds.length === projects.length) {
      onChange([]);
    } else {
      onChange(projects.map((p) => p.id));
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Projects
        </label>
        <button
          onClick={toggleAll}
          className="text-xs text-yellow-400 hover:text-yellow-300 transition-colors"
        >
          {selectedProjectIds.length === projects.length ? 'Clear All' : 'Select All'}
        </button>
      </div>
      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {projects.map((project) => {
          const isSelected = selectedProjectIds.includes(project.id);
          return (
            <motion.button
              key={project.id}
              onClick={() => toggleProject(project.id)}
              className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-all ${
                isSelected
                  ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'
                  : 'bg-gray-800/40 text-gray-400 border border-gray-700/40 hover:bg-gray-800/60'
              }`}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <Folder className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{project.name}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
