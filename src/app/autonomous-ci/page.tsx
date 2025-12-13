'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Cpu, FolderOpen, GitBranch } from 'lucide-react';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import AutonomousCIDashboard from '@/app/features/AutonomousCI/components/AutonomousCIDashboard';
import { UniversalSelect } from '@/components/ui/UniversalSelect';

export default function AutonomousCIPage() {
  const { activeProject, setActiveProject } = useActiveProjectStore();
  const { projects, initializeProjects } = useProjectConfigStore();

  // Load projects on mount
  useEffect(() => {
    initializeProjects();
  }, [initializeProjects]);

  // Project options for selector
  const projectOptions = projects.map((p) => ({
    value: p.id,
    label: p.name,
  }));

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900/30 to-amber-900/20 text-white"
      data-testid="autonomous-ci-page"
    >
      {/* Ambient background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto p-6">
        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-2xl border border-amber-500/30">
              <Cpu className="w-8 h-8 text-amber-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                Autonomous CI
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                AI-driven continuous integration with predictive testing and self-healing
              </p>
            </div>
          </div>

          {/* Project selector */}
          <div className="flex items-center gap-3">
            <FolderOpen className="w-5 h-5 text-gray-400" />
            <div className="w-64">
              <UniversalSelect
                value={activeProject?.id || ''}
                onChange={(value) => {
                  const project = projects.find((p) => p.id === value);
                  if (project) {
                    setActiveProject(project);
                  }
                }}
                options={projectOptions}
                placeholder="Select a project..."
                variant="default"
                data-testid="ci-project-selector"
              />
            </div>
          </div>
        </motion.div>

        {/* Main content */}
        {activeProject ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <AutonomousCIDashboard
              projectId={activeProject.id}
              projectName={activeProject.name}
            />
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-24"
            data-testid="ci-no-project-selected"
          >
            <div className="p-6 bg-white/5 rounded-full mb-6">
              <GitBranch className="w-16 h-16 text-gray-500" />
            </div>
            <h2 className="text-xl font-semibold text-gray-300 mb-2">
              Select a Project
            </h2>
            <p className="text-gray-500 text-center max-w-md">
              Choose a project from the dropdown above to access autonomous CI
              features including predictive testing, flaky test detection, and
              pipeline optimization.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
