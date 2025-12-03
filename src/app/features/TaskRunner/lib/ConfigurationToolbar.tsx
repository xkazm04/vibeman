'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Scroll, Github, Camera } from 'lucide-react';
import { useGlobalModal } from '@/hooks/useGlobalModal';
import { useGitConfig } from '../sub_Git/useGitConfig';
import { useScreenshotConfig } from '../sub_Screenshot/useScreenshotConfig';
import ExecutionPromptEditor from './ExecutionPromptEditor';
import GitConfigModalContent from '../sub_Git/GitConfigModalContent';

const STORAGE_KEY_LOG_STREAMING = 'taskRunner_logStreaming';

interface IconButtonProps {
  onClick: () => void;
  icon: React.ElementType;
  title: string;
  isActive?: boolean;
  activeColor?: string;
  inactiveColor?: string;
  testId?: string;
}

const IconButton: React.FC<IconButtonProps> = ({
  onClick,
  icon: Icon,
  title,
  isActive = true,
  activeColor = 'text-blue-400 hover:text-blue-300',
  inactiveColor = 'text-gray-500 hover:text-gray-400',
  testId
}) => (
  <motion.button
    whileHover={{ scale: 1.1 }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    className={`p-2 rounded-lg hover:bg-gray-700/50 transition-all ${isActive ? activeColor : inactiveColor}`}
    title={title}
    data-testid={testId}
  >
    <Icon className="w-4 h-4" />
  </motion.button>
);

export default function ConfigurationToolbar() {
  const { showModal, hideModal } = useGlobalModal();
  const { gitEnabled, setGitEnabled } = useGitConfig();
  const { screenshotEnabled, setScreenshotEnabled } = useScreenshotConfig();

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

  const handleToggleScreenshot = () => {
    setScreenshotEnabled(prev => !prev);
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
      <IconButton
        onClick={handleOpenDocsEditor}
        icon={FileText}
        title="Edit execution prompt"
      />

      {/* Scroll Icon - Log Streaming */}
      <IconButton
        onClick={handleToggleLogStreaming}
        icon={Scroll}
        title={logStreamingEnabled ? 'Log streaming enabled' : 'Log streaming disabled'}
        isActive={logStreamingEnabled}
        activeColor="text-purple-400 hover:text-purple-300"
      />

      {/* Camera Icon - Screenshot */}
      <IconButton
        onClick={handleToggleScreenshot}
        icon={Camera}
        title={screenshotEnabled ? 'Screenshot after completion enabled' : 'Screenshot after completion disabled'}
        isActive={screenshotEnabled}
        activeColor="text-cyan-400 hover:text-cyan-300"
      />

      {/* Github Icon */}
      <IconButton
        onClick={handleOpenGitConfig}
        icon={Github}
        title={gitEnabled ? 'Git operations enabled' : 'Git operations disabled'}
        isActive={gitEnabled}
        activeColor="text-yellow-500 hover:text-yellow-400"
        testId="taskrunner-git-config-btn"
      />
    </div>
  );
}
