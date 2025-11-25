'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, FileSearch } from 'lucide-react';
import StatusChip from '@/components/DecisionPanel/StatusChip';

interface ScanQueueControlProps {
  projectId: string;
  projectPath: string;
}

export function ScanQueueControl({ projectId, projectPath }: ScanQueueControlProps) {
  const [workerRunning, setWorkerRunning] = useState(false);
  const [fileWatchEnabled, setFileWatchEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatus();
  }, [projectId]);

  const fetchStatus = async () => {
    try {
      // Get worker status
      const workerRes = await fetch('/api/scan-queue/worker');
      const workerData = await workerRes.json();
      setWorkerRunning(workerData.status?.isRunning || false);

      // Get file watch config
      const watchRes = await fetch(`/api/file-watch?projectId=${projectId}`);
      const watchData = await watchRes.json();
      setFileWatchEnabled(watchData.config?.enabled === 1);
    } catch (error) {
      // Failed to fetch status - silently handle
    } finally {
      setLoading(false);
    }
  };

  const toggleWorker = async () => {
    try {
      const action = workerRunning ? 'stop' : 'start';
      const response = await fetch('/api/scan-queue/worker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      if (response.ok) {
        setWorkerRunning(!workerRunning);
      }
    } catch (error) {
      // Failed to toggle worker - silently handle
    }
  };

  const toggleFileWatch = async () => {
    try {
      const response = await fetch('/api/file-watch', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, projectPath })
      });

      if (response.ok) {
        setFileWatchEnabled(!fileWatchEnabled);
      }
    } catch (error) {
      // Failed to toggle file watch - silently handle
    }
  };

  if (loading) {
    return null;
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-900/50 border border-gray-700/50 rounded-lg">
      {/* Worker Control */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggleWorker}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${workerRunning
          ? 'bg-green-500/10 border-green-500/50 text-green-400 hover:bg-green-500/20'
          : 'bg-gray-700/30 border-gray-600/50 text-gray-400 hover:bg-gray-700/50'
          }`}
      >
        {workerRunning ? (
          <>
            <Pause className="w-4 h-4" />
            <span className="text-sm font-medium">Stop Queue</span>
          </>
        ) : (
          <>
            <Play className="w-4 h-4" />
            <span className="text-sm font-medium">Start Queue</span>
          </>
        )}
      </motion.button>

      {/* File Watch Toggle */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggleFileWatch}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${fileWatchEnabled
          ? 'bg-blue-500/10 border-blue-500/50 text-blue-400 hover:bg-blue-500/20'
          : 'bg-gray-700/30 border-gray-600/50 text-gray-400 hover:bg-gray-700/50'
          }`}
      >
        <FileSearch className="w-4 h-4" />
        <span className="text-sm font-medium">
          {fileWatchEnabled ? 'File Watch On' : 'File Watch Off'}
        </span>
      </motion.button>

      {/* Status Indicator - Using StatusChip */}
      <div className="ml-auto">
        <StatusChip
          status={workerRunning ? 'active' : 'idle'}
          label={workerRunning ? 'Queue Active' : 'Queue Idle'}
          theme="default"
          animated={true}
          size="sm"
          data-testid="scan-queue-status"
        />
      </div>
    </div>
  );
}
