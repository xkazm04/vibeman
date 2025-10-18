'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileCode, AlertCircle } from 'lucide-react';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import ClaudeRequirementInput from './ClaudeRequirementInput';
import ClaudeRequirementsList from './ClaudeRequirementsList';

export default function ClaudeSection() {
  const { activeProject } = useActiveProjectStore();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleRequirementCreated = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  if (!activeProject) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg"
      >
        <div className="flex items-center gap-2 text-amber-400">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm">No active project selected</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-4"
    >
      {/* Input Row */}
      <ClaudeRequirementInput
        projectPath={activeProject.path}
        onRequirementCreated={handleRequirementCreated}
      />

      {/* Requirements List */}
      <div className="bg-gray-800/30 rounded-lg border border-gray-700/50 p-4">
        <ClaudeRequirementsList
          projectPath={activeProject.path}
          refreshTrigger={refreshTrigger}
        />
      </div>
    </motion.div>
  );
}
