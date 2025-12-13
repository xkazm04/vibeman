'use client';

import React from 'react';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import ArchitectureEvolution from '@/app/features/ArchitectureEvolution/ArchitectureEvolution';
import { Layers, AlertTriangle } from 'lucide-react';

export default function ArchitecturePage() {
  const { activeProject } = useActiveProjectStore();

  // No project selected
  if (!activeProject) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-950">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500/50 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">No Project Selected</h2>
          <p className="text-gray-400 max-w-md">
            Please select a project from the sidebar to view its architecture graph.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full" data-testid="architecture-page">
      <ArchitectureEvolution projectId={activeProject.id} />
    </div>
  );
}
