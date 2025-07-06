import React from 'react';
import { Zap } from 'lucide-react';

interface TreeFooterProps {
  selectedNodesCount: number;
  highlightedNodesCount: number;
  onClearSelection: () => void;
  onClearHighlights: () => void;
}

export default function TreeFooter({
  selectedNodesCount,
  highlightedNodesCount,
  onClearSelection,
  onClearHighlights
}: TreeFooterProps) {
  return (
    <div className="mt-6 pt-4 border-t border-gray-700/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {selectedNodesCount > 0 && (
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>{selectedNodesCount} item{selectedNodesCount > 1 ? 's' : ''} selected</span>
            </div>
          )}
          
          {highlightedNodesCount > 0 && (
            <div className="flex items-center space-x-2 text-sm text-orange-400">
              <Zap className="w-3 h-3" />
              <span>{highlightedNodesCount} highlighted by AI</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {selectedNodesCount > 0 && (
            <button
              onClick={onClearSelection}
              className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors px-3 py-1 bg-cyan-500/10 rounded-md hover:bg-cyan-500/20"
            >
              Clear selection
            </button>
          )}
          
          {highlightedNodesCount > 0 && (
            <button
              onClick={onClearHighlights}
              className="text-sm text-orange-400 hover:text-orange-300 transition-colors px-3 py-1 bg-orange-500/10 rounded-md hover:bg-orange-500/20"
            >
              Clear highlights
            </button>
          )}
        </div>
      </div>
    </div>
  );
} 