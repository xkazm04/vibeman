'use client';

import { ReactElement } from 'react';
import type { RefactorOpportunity } from '@/stores/refactorStore';
import { BadgeCheck } from 'lucide-react';

interface Props {
  opportunity: RefactorOpportunity;
}

export default function CompactSuggestionRow({ opportunity }: Props): ReactElement {
  const fileCount = opportunity.files.length;
  return (
    <div className="flex items-center gap-3 px-3 py-2 border-b border-white/10 bg-black/20 hover:bg-black/30">
      <BadgeCheck className="w-5 h-5 text-cyan-400" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-white text-sm truncate" title={opportunity.title}>{opportunity.title}</span>
          <span className="text-xs px-2 py-0.5 rounded bg-white/5 text-gray-300">{opportunity.category}</span>
        </div>
        <div className="text-xs text-gray-500 truncate">{fileCount} file(s)</div>
      </div>
      {opportunity.autoFixAvailable && <span className="text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded">auto‑fix</span>}
    </div>
  );
}

