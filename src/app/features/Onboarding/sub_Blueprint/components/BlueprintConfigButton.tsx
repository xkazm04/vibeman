'use client';

import { useState } from 'react';
import { Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import StateMachineEditor from './StateMachineEditor';
import { useStateMachineStore } from '@/stores/stateMachineStore';
import { useActiveProjectStore } from '@/stores/activeProjectStore';

export default function BlueprintConfigButton() {
  const { activeProject } = useActiveProjectStore();
  const { openEditor } = useStateMachineStore();
  const [showEditor, setShowEditor] = useState(false);

  const handleOpenEditor = () => {
    const projectType = activeProject?.type || 'nextjs';
    openEditor(projectType);
    setShowEditor(true);
  };

  const handleCloseEditor = () => {
    setShowEditor(false);
  };

  return (
    <>
      {/* Floating Config Button */}
      <motion.button
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
        onClick={handleOpenEditor}
        className="fixed top-6 right-6 z-40 p-3 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 border border-cyan-500/30 rounded-xl shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all duration-300 group"
        data-testid="open-blueprint-config-btn"
        title="Configure Onboarding Flow"
      >
        <Settings className="w-5 h-5 text-cyan-400 group-hover:rotate-90 transition-transform duration-500" />
      </motion.button>

      {/* Editor Modal */}
      {showEditor && activeProject && (
        <StateMachineEditor
          projectType={activeProject.type || 'nextjs'}
          onClose={handleCloseEditor}
        />
      )}
    </>
  );
}
