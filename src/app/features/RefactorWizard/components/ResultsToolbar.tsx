'use client';

import { ReactElement } from 'react';
import { Search } from 'lucide-react';

interface Props {
  onSearchChange: (value: string) => void;
}

export default function ResultsToolbar({ onSearchChange }: Props): ReactElement {
  return (
    <div className="flex items-center gap-3 p-3 bg-black/30 border border-white/10 rounded-xl mb-4">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Search className="w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search selected suggestions"
          className="bg-transparent text-sm text-white placeholder-gray-500 flex-1 outline-none"
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
    </div>
  );
}

