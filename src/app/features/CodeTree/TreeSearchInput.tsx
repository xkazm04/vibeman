import React from 'react';
import { Search, X } from 'lucide-react';

interface TreeSearchInputProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onClear: () => void;
  isSearching: boolean;
}

export default function TreeSearchInput({
  searchTerm,
  onSearchChange,
  onClear,
  isSearching
}: TreeSearchInputProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input
        data-testid="tree-search-input"
        type="text"
        placeholder="Search files and folders..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-full pl-10 pr-10 py-3 bg-gray-800/50 border border-gray-700/50 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
      />
      
      {/* Loading indicator */}
      {isSearching && (
        <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-gray-400 border-t-cyan-400 rounded-full animate-spin" />
        </div>
      )}
      
      {/* Clear button */}
      {searchTerm && (
        <button
          data-testid="tree-search-clear-button"
          onClick={onClear}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
          aria-label="Clear search"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
