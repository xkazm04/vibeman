'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Server } from 'lucide-react';
import ProjectServerButton from './ProjectServerButton';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import type { ProcessInfo } from '@/types';

export default function ProjectServersGrid() {
  const { projects, initializeProjects, initialized } = useProjectConfigStore();
  const [statuses, setStatuses] = useState<Record<string, ProcessInfo>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Initialize projects on mount
  useEffect(() => {
    if (!initialized) {
      initializeProjects();
    }
  }, [initialized, initializeProjects]);

  // Fetch server statuses
  const fetchStatuses = useCallback(async () => {
    try {
      const response = await fetch('/api/server/status');
      if (response.ok) {
        const data = await response.json();
        setStatuses(data.statuses || {});
      }
    } catch (error) {
      console.error('Failed to fetch server statuses:', error);
    }
  }, []);

  // Poll for status updates
  useEffect(() => {
    fetchStatuses();
    const interval = setInterval(fetchStatuses, 5000);
    return () => clearInterval(interval);
  }, [fetchStatuses]);

  // Handle server toggle
  const handleToggle = async (projectId: string, isRunning: boolean) => {
    const endpoint = isRunning ? '/api/server/stop' : '/api/server/start';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Server toggle failed:', error);
      }

      // Refresh statuses after toggle
      await fetchStatuses();
    } catch (error) {
      console.error('Failed to toggle server:', error);
    }
  };

  // Manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchStatuses();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-gray-500">
        <Server className="w-8 h-8 mb-2 opacity-50" />
        <p className="text-sm">No projects configured</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
          <Server className="w-4 h-4" />
          Project Servers
        </h3>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors"
          title="Refresh status"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Projects Grid */}
      <motion.div
        className="flex flex-wrap gap-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {projects.map((project) => (
          <ProjectServerButton
            key={project.id}
            project={project}
            status={statuses[project.id] || null}
            onToggle={handleToggle}
          />
        ))}
      </motion.div>

      {/* Running count */}
      <div className="text-xs text-gray-500 px-1">
        {Object.values(statuses).filter(s => s.status === 'running').length} of {projects.length} servers running
      </div>
    </div>
  );
}
