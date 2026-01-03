/**
 * StandupHeader Component
 * Header section for the standup panel
 */

'use client';

import { Target } from 'lucide-react';

interface StandupHeaderProps {
  projectName: string;
}

export function StandupHeader({ projectName }: StandupHeaderProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="p-2 bg-purple-500/20 rounded-lg">
        <Target className="w-5 h-5 text-purple-400" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-gray-200">Standup Automation</h3>
        <p className="text-xs text-gray-500">{projectName}</p>
      </div>
    </div>
  );
}

export default StandupHeader;
