'use client';

import React from 'react';
import { useClientProjectStore } from '@/stores/clientProjectStore';
import MiniScanPanel from './components/MiniScanPanel';
import MiniTriagePanel from './components/MiniTriagePanel';
import MiniTaskPanel from './components/MiniTaskPanel';

export default function MiniLayout() {
  const { activeProject } = useClientProjectStore();

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-7xl mx-auto px-4 py-3">
      {/* Project indicator */}
      <div className="flex items-center gap-3 mb-3">
        <h2 className="text-sm font-semibold text-white">
          {activeProject ? activeProject.name : 'No project selected'}
        </h2>
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-xs text-white uppercase tracking-wider">
          Scan &middot; Triage &middot; Execute
        </span>
      </div>

      {/* 3-Panel Grid */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3 min-h-0">
        <MiniScanPanel />
        <MiniTriagePanel />
        <MiniTaskPanel />
      </div>

      {/* Keyboard hint */}
      <div className="mt-2 text-center text-xs text-white">
        Triage: &larr; reject &middot; &darr; skip &middot; &rarr; accept
      </div>
    </div>
  );
}
