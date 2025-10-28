'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Play, Network, Check } from 'lucide-react';
import { Project } from '../lib/types';

interface ScanSetupBarProps {
  projects: Project[];
  selectedProjects: string[];
  onToggleProject: (projectId: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onRunScan: () => void;
  scanning: boolean;
}

export default function ScanSetupBar({
  projects,
  selectedProjects,
  onToggleProject,
  onSelectAll,
  onClearSelection,
  onRunScan,
  scanning
}: ScanSetupBarProps) {
  const allSelected = projects.length > 0 && selectedProjects.length === projects.length;

  return (
    <div className="w-full border-b border-gray-700/40 bg-gray-900/20">
      <div className="max-w-full px-6 py-4">
        {/* Main Row with Projects */}
        <div className="flex items-start gap-4">
          {/* Label */}
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide shrink-0 mt-1.5">
            Projects:
          </span>

          {/* Project Pills - Wrapping Container */}
          <div className="flex-1 flex flex-wrap items-center gap-2">
            {/* Select All / Clear Button */}
            <motion.button
              onClick={allSelected ? onClearSelection : onSelectAll}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                allSelected
                  ? 'bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30'
                  : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 hover:bg-yellow-500/30'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {allSelected ? '✕ Clear All' : '✓ Select All'}
            </motion.button>

            {/* Project Pills */}
            {projects.map((project) => {
              const isSelected = selectedProjects.includes(project.id);
              return (
                <motion.button
                  key={project.id}
                  onClick={() => onToggleProject(project.id)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                    isSelected
                      ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'
                      : 'bg-gray-800/40 text-gray-400 border border-gray-700/40 hover:bg-gray-800/60 hover:text-gray-300'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isSelected && <Check className="w-3.5 h-3.5" />}
                  {project.name}
                  <span className="text-xs opacity-60">({project.type})</span>
                </motion.button>
              );
            })}
          </div>

          {/* Run Scan Button */}
          <motion.button
            onClick={onRunScan}
            disabled={scanning || selectedProjects.length === 0}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all shrink-0 flex items-center gap-2 ${
              scanning || selectedProjects.length === 0
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-gray-900 shadow-lg shadow-yellow-500/20'
            }`}
            whileHover={scanning || selectedProjects.length === 0 ? {} : { scale: 1.05 }}
            whileTap={scanning || selectedProjects.length === 0 ? {} : { scale: 0.95 }}
          >
            {scanning ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Network className="w-4 h-4" />
                </motion.div>
                Scanning...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Run Scan ({selectedProjects.length})
              </>
            )}
          </motion.button>
        </div>
      </div>

    </div>
  );
}
