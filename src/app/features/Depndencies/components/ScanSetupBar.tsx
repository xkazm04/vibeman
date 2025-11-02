'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Play, Network, Check, AlertCircle } from 'lucide-react';
import { GradientButton } from '@/components/ui';
import { Project } from '../lib/types';
import { useScanContext } from '../lib/ScanContext';

interface ScanSetupBarProps {
  projects: Project[];
}

export default function ScanSetupBar({ projects }: ScanSetupBarProps) {
  const {
    selectedProjects,
    toggleProject,
    selectAllProjects,
    clearSelection,
    runScan,
    scanning,
    scanStatus,
    scanProgress,
    scanError
  } = useScanContext();

  const allSelected = projects.length > 0 && selectedProjects.length === projects.length;

  const handleRunScan = async () => {
    await runScan();
  };

  return (
    <div className="w-full border-b border-gray-700/40 bg-gray-900/20">
      <div className="max-w-full px-6 py-4 space-y-3">
        {/* Main Row with Projects */}
        <div className="flex items-start gap-4">
          {/* Label */}
          <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide shrink-0 mt-1.5">
            Projects:
          </span>

          {/* Project Pills - Wrapping Container */}
          <div className="flex-1 flex flex-wrap items-center gap-2">
            {/* Select All / Clear Button */}
            <motion.button
              onClick={allSelected ? clearSelection : () => selectAllProjects(projects)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
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
                  onClick={() => toggleProject(project.id)}
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
                  <span className="text-sm opacity-60">({project.type})</span>
                </motion.button>
              );
            })}
          </div>

          {/* Run Scan Button */}
          <GradientButton
            onClick={handleRunScan}
            disabled={scanning || selectedProjects.length === 0}
            loading={scanning}
            colorScheme="yellow"
            icon={scanning ? Network : Play}
            iconPosition="left"
            size="md"
            className="shrink-0"
          >
            {scanning ? 'Scanning...' : `Run Scan (${selectedProjects.length})`}
          </GradientButton>
        </div>

        {/* Progress Bar */}
        {scanProgress && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-2"
          >
            {/* Progress message */}
            {scanProgress.message && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Network className="w-4 h-4 animate-spin text-yellow-400" />
                <span>{scanProgress.message}</span>
              </div>
            )}

            {/* Progress bar */}
            <div className="w-full bg-gray-800/60 rounded-full h-2 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{
                  width: `${(scanProgress.current / scanProgress.total) * 100}%`
                }}
                transition={{ duration: 0.3 }}
                className={`h-full rounded-full ${
                  scanStatus === 'completed'
                    ? 'bg-green-500'
                    : scanStatus === 'error'
                    ? 'bg-red-500'
                    : 'bg-yellow-500'
                }`}
              />
            </div>

            {/* Progress text */}
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>
                {scanProgress.current} / {scanProgress.total} projects
              </span>
              <span>
                {Math.round((scanProgress.current / scanProgress.total) * 100)}%
              </span>
            </div>
          </motion.div>
        )}

        {/* Error Display */}
        {scanError && scanStatus === 'error' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-300"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{scanError}</span>
          </motion.div>
        )}

        {/* Success Display */}
        {scanStatus === 'completed' && !scanError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-lg text-sm text-green-300"
          >
            <Check className="w-4 h-4 shrink-0" />
            <span>Scan completed successfully!</span>
          </motion.div>
        )}
      </div>
    </div>
  );
}
