'use client';

import { ReactElement } from 'react';
import type { RefactorOpportunity } from '@/stores/refactorStore';
import { CheckSquare } from 'lucide-react';

interface Props {
  opportunity: RefactorOpportunity;
  isSelected: boolean;
  onToggle: () => void;
}

export default function CompactOpportunityRow({ opportunity, isSelected, onToggle }: Props): ReactElement {
  const fileCount = opportunity.files.length;
  return (
    <div className="flex items-center gap-3 px-3 py-2 border-b border-white/10 bg-black/20 hover:bg-black/30">
      <button
        aria-label="toggle"
        onClick={onToggle}
        className={`flex items-center justify-center w-6 h-6 rounded ${isSelected ? 'bg-cyan-500/30 text-cyan-300' : 'bg-white/5 text-gray-400'} hover:text-white`}
      >
        <CheckSquare className="w-4 h-4" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-white text-sm truncate" title={opportunity.title}>{opportunity.title}</span>
          <span className={`text-xs px-2 py-0.5 rounded ${badgeClass(opportunity.severity)}`}>{opportunity.severity}</span>
          <span className="text-xs px-2 py-0.5 rounded bg-white/5 text-gray-300">{opportunity.category}</span>
        </div>
        <div className="text-xs text-gray-500 truncate">{fileCount} file(s)</div>
      </div>
      {opportunity.autoFixAvailable && <span className="text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded">auto‑fix</span>}
    </div>
  );
}

function badgeClass(severity: RefactorOpportunity['severity']): string {
  switch (severity) {
    case 'critical':
      return 'bg-red-500/20 text-red-300';
    case 'high':
      return 'bg-orange-500/20 text-orange-300';
    case 'medium':
      return 'bg-yellow-500/20 text-yellow-300';
    default:
      return 'bg-blue-500/20 text-blue-300';
  }
}

