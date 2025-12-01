'use client';

import { ReactElement } from 'react';
import { Search, X } from 'lucide-react';

interface Props {
  selectedCount: number;
  filteredCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onSearchChange: (value: string) => void;
}

export default function ReviewToolbar({ selectedCount, filteredCount, onSelectAll, onClearSelection, onSearchChange }: Props): ReactElement {
  return (
    <div className="flex items-center gap-3 p-3 bg-black/30 border border-white/10 rounded-xl mb-4">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Search className="w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search title, category, file"
          className="bg-transparent text-sm text-white placeholder-gray-500 flex-1 outline-none"
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <div className="text-xs text-gray-400">{filteredCount} shown</div>
      <button className="px-2 py-1 text-xs bg-white/10 rounded hover:bg-white/20" onClick={onSelectAll}>Select all</button>
      <button className="px-2 py-1 text-xs bg-white/10 rounded hover:bg-white/20 flex items-center gap-1" onClick={onClearSelection}>
        <X className="w-3 h-3" />Clear ({selectedCount})
      </button>
    </div>
  );
}

