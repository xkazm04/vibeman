'use client';

import { motion } from 'framer-motion';
import { Github, Settings } from 'lucide-react';
import { useGitConfig } from './useGitConfig';
import { useGlobalModal } from '@/hooks/useGlobalModal';
import GitConfigModalContent from './GitConfigModalContent';

export default function GitControl() {
  const { gitEnabled, setGitEnabled } = useGitConfig();
  const { showModal, hideModal } = useGlobalModal();

  const handleOpenConfig = () => {
    showModal(
      {
        title: 'Git Configuration',
        icon: Github,
        iconColor: 'text-purple-400',
        iconBgColor: 'bg-purple-500/20',
        maxWidth: 'max-w-2xl',
        maxHeight: 'max-h-[80vh]'
      },
      <GitConfigModalContent onClose={hideModal} />
    );
  };

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg">
      {/* Enable Checkbox */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={gitEnabled}
          onChange={(e) => setGitEnabled(e.target.checked)}
          className="rounded border-gray-600 text-purple-500 focus:ring-purple-500/50"
        />
        <span className="text-sm text-gray-300 font-medium">Git Mode</span>
      </label>

      {/* Config Button */}
      <button
        onClick={handleOpenConfig}
        className="p-1.5 rounded-lg hover:bg-gray-700/50 transition-colors text-gray-400 hover:text-purple-400"
        title="Configure git commands"
      >
        <Github className="w-4 h-4" />
      </button>

      <button
        onClick={handleOpenConfig}
        className="p-1.5 rounded-lg hover:bg-gray-700/50 transition-colors text-gray-400 hover:text-gray-300"
        title="Edit configuration"
      >
        <Settings className="w-3.5 h-3.5" />
      </button>

      {/* Status Indicator */}
      {gitEnabled && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-1.5 ml-1"
        >
          <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse" />
          <span className="text-sm text-purple-400">Active</span>
        </motion.div>
      )}
    </div>
  );
}
