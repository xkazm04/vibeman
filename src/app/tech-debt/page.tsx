'use client';

import React from 'react';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { TechDebtDashboard } from '@/app/features/TechDebt';

export default function TechDebtPage() {
  const { activeProject } = useActiveProjectStore();

  if (!activeProject) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">No Active Project</h2>
          <p className="text-gray-400">Select a project to view technical debt</p>
        </div>
      </div>
    );
  }

  return <TechDebtDashboard projectId={activeProject.id} projectPath={activeProject.path} />;
}
