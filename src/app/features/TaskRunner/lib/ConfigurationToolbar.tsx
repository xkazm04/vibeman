'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Scroll, Github } from 'lucide-react';
import { useGlobalModal } from '@/hooks/useGlobalModal';
import { useGitConfig } from '../sub_Git/useGitConfig';
import ExecutionPromptEditor from './ExecutionPromptEditor';
import GitConfigModalContent from '../sub_Git/GitConfigModalContent';

const STORAGE_KEY_LOG_STREAMING = 'taskRunner_logStreaming';

export default function ConfigurationToolbar() {
  const { showModal, hideModal } = useGlobalModal();
  const { gitEnabled, setGitEnabled } = useGitConfig();

  // Log streaming toggle (default: true)
  const [logStreamingEnabled, setLogStreamingEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY_LOG_STREAMING);
      return stored === null ? true : stored === 'true';
    }
    return true;
  });

  // Persist log streaming state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_LOG_STREAMING, logStreamingEnabled.toString());
    }
  }, [logStreamingEnabled]);

  const handleOpenDocsEditor = () => {
    showModal(
      {
        title: 'Execution Prompt Configuration',
        icon: FileText,
        iconColor: 'text-blue-400',
        iconBgColor: 'bg-blue-500/20',
        maxWidth: 'max-w-7xl',
        maxHeight: 'max-h-[90vh]'
      },
      <ExecutionPromptEditor onClose={hideModal} />
    );
  };

  const handleToggleLogStreaming = () => {
    setLogStreamingEnabled(prev => !prev);
  };

  const handleOpenGitConfig = () => {
    showModal(
      {
        title: 'Git Configuration',
        icon: Github,
        iconColor: 'text-purple-400',
        iconBgColor: 'bg-purple-500/20',
        maxWidth: 'max-w-6xl',
        maxHeight: 'max-h-[80vh]'
      },
      <div className="space-y-4">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center gap-3 p-4 bg-gray-800/50 border border-gray-700/50 rounded-lg">
          <label className="flex items-center gap-3 cursor-pointer flex-1">
            <input
              type="checkbox"
              checked={gitEnabled}
              onChange={(e) => setGitEnabled(e.target.checked)}
              className="w-4 h-4 rounded border-gray-600 text-purple-500 focus:ring-purple-500/50"
            />
            <span className="text-sm font-medium text-gray-300">
              Enable Git operations after task completion
            </span>
          </label>
        </div>

        {/* Git Config Content */}
        <GitConfigModalContent onClose={hideModal} />
      </div>
    );
  };

  return (
    <div className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-800/30 border border-gray-700/30 rounded-lg">
      {/* Docs Icon */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleOpenDocsEditor}
        className="p-2 rounded-lg hover:bg-gray-700/50 transition-all text-blue-400 hover:text-blue-300"
        title="Edit execution prompt"
      >
        <FileText className="w-4 h-4" />
      </motion.button>

      {/* Scroll Icon - Log Streaming */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleToggleLogStreaming}
        className={`p-2 rounded-lg hover:bg-gray-700/50 transition-all ${
          logStreamingEnabled
            ? 'text-purple-400 hover:text-purple-300'
            : 'text-gray-500 hover:text-gray-400'
        }`}
        title={logStreamingEnabled ? 'Log streaming enabled' : 'Log streaming disabled'}
      >
        <Scroll className="w-4 h-4" />
      </motion.button>

      {/* Github Icon */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleOpenGitConfig}
        className={`p-2 rounded-lg hover:bg-gray-700/50 transition-all ${
          gitEnabled
            ? 'text-yellow-500 hover:text-yellow-400'
            : 'text-gray-500 hover:text-gray-400'
        }`}
        title={gitEnabled ? 'Git operations enabled' : 'Git operations disabled'}
      >
        <Github className="w-4 h-4" />
      </motion.button>
    </div>
  );
}
