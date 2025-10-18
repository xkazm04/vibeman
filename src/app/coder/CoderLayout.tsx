'use client';
import { motion } from 'framer-motion';

import GoalsLayout from './Goals/GoalsLayout';
import HorizontalContextBar from './Context/HorizontalContextBar';
import { useStore } from '../../stores/nodeStore';
import { useActiveProjectStore } from '../../stores/activeProjectStore';
import Backlog from '../features/Backlog/Backlog';
import ClaudeSection from '../Claude/ClaudeSection';

export default function CoderLayout() {
  const { getSelectedFilePaths } = useStore();
  const { fileStructure, activeProject } = useActiveProjectStore();

  // Get selected file paths and count using the proper method
  const selectedFilePaths = getSelectedFilePaths(fileStructure, activeProject?.id || null);
  const selectedFilesCount = selectedFilePaths.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-[95vw] mx-auto h-full">
        {/* Goals Layout - Thin bar at the top */}
        <GoalsLayout />

        {/* Claude Code Section - Below Goals */}
        <div className="mb-8">
          <ClaudeSection />
        </div>

        {/* Horizontal Context Bar - Flexible Height */}
        <div className="mb-8">
          <HorizontalContextBar
            selectedFilesCount={selectedFilesCount}
            selectedFilePaths={selectedFilePaths}
          />
        </div>

        {/* Backlog Section - Adaptive Height */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex-1"
          style={{ minHeight: 'calc(100vh - 400px)' }}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="w-full h-full"
          >
            <Backlog />
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}