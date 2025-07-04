'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Project } from '@/types';
import { StatusLever } from './StatusLever';
import { useServerProjectStore } from '@/stores/serverProjectStore';

interface ProjectCardProps {
  project: Project;
  index: number;
  disabled?: boolean;
}

export default function RunnerSwitch({ project, index, disabled }: ProjectCardProps) {
  const {
    getProcess,
    startServer,
    stopServer
  } = useServerProjectStore();

  const status = getProcess(project.id);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    const isRunning = status?.status === 'running';
    setLoading(true);

    try {
      if (isRunning) {
        await stopServer(project.id);
      } else {
        await startServer(project.id);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : `Failed to ${isRunning ? 'stop' : 'start'} project`);
    } finally {
      setLoading(false);
    }
  };

  const isRunning = status?.status === 'running';
  const hasError = status?.status === 'error';
  const uptime = isRunning && status?.startTime
    ? Math.floor((Date.now() - new Date(status.startTime).getTime()) / 1000)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      {/* Main Card Content */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2 text-xs text-gray-400">
            <StatusLever
              isRunning={isRunning}
              isLoading={loading}
              onToggle={handleToggle}
              disabled={hasError || disabled}
            />
            <div className="flex flex-col items-start space-x-2 text-xs text-gray-400">
              <div className="flex flex-row items-center space-x-2">
              <div>:{project.port}</div>
                {isRunning && (
                  <div>
                    <span>•</span>
                    <span>{uptime}s</span>
                  </div>
                )}
              </div>
              <div className="flex-shrink-0 w-16 bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg border border-gray-700 overflow-hidden relative"> </div>
              <div> {project.name}</div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}