import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { File, Folder, ChevronRight } from 'lucide-react';
import { TreeNode } from '../../../types';
import { getFileTypeColor } from '@/helpers/typeStyles';

interface SuggestionResult {
  node: TreeNode;
  path: string;
  matchType: 'name' | 'description';
}

interface TreeSuggestionsDropdownProps {
  suggestions: SuggestionResult[];
  searchTerm: string;
  isSearching: boolean;
  showSuggestions: boolean;
  onSuggestionClick: (suggestion: SuggestionResult) => void;
  onClear: () => void;
}

// Animation configurations
const dropdownAnimation = {
  initial: { opacity: 0, y: -10, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -10, scale: 0.95 },
  transition: { duration: 0.15, ease: "easeOut" }
};

const itemAnimation = (index: number) => ({
  initial: { opacity: 0, x: -10 },
  animate: { opacity: 1, x: 0 },
  transition: { delay: index * 0.05 }
});

export default function TreeSuggestionsDropdown({
  suggestions,
  searchTerm,
  isSearching,
  showSuggestions,
  onSuggestionClick,
  onClear
}: TreeSuggestionsDropdownProps) {
  const highlightMatch = (text: string, term: string) => {
    if (!term) return text;

    const regex = new RegExp(`(${term})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <span key={index} className="bg-yellow-400/30 text-yellow-200 font-medium">
          {part}
        </span>
      ) : part
    );
  };

  return (
    <>
      {/* Suggestions Dropdown */}
      <AnimatePresence>
        {showSuggestions && suggestions.length > 0 && (
          <motion.div
            data-testid="tree-suggestions-dropdown"
            {...dropdownAnimation}
            className="absolute top-full left-0 right-0 z-50 mt-2 bg-gray-800/95 backdrop-blur-sm border border-gray-700/50 rounded-lg shadow-xl overflow-hidden"
          >
            <div className="p-2">
              <div className="text-sm text-gray-400 px-2 py-1 mb-1">
                {suggestions.length} suggestion{suggestions.length === 1 ? '' : 's'}
              </div>
              
              {suggestions.map((suggestion, index) => (
                <motion.button
                  key={suggestion.node.id}
                  data-testid={`tree-suggestion-item-${index}`}
                  {...itemAnimation(index)}
                  onClick={() => onSuggestionClick(suggestion)}
                  className="w-full flex items-center space-x-3 px-2 py-2 rounded-md hover:bg-gray-700/50 transition-colors text-left group"
                >
                  {/* Icon */}
                  {suggestion.node.type === 'folder' ? (
                    <Folder className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                  ) : (
                    <File className={`w-4 h-4 flex-shrink-0 ${getFileTypeColor(suggestion.node.name)}`} />
                  )}
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-sm text-white truncate">
                        {highlightMatch(suggestion.node.name, searchTerm)}
                      </span>
                      {suggestion.matchType === 'description' && (
                        <span className="text-sm text-gray-500 bg-gray-700/50 px-1.5 py-0.5 rounded">
                          desc
                        </span>
                      )}
                    </div>
                    
                    <div className="text-sm text-gray-400 truncate mt-0.5">
                      {suggestion.path}
                    </div>
                    
                    {suggestion.matchType === 'description' && (
                      <div className="text-sm text-gray-500 truncate mt-1">
                        {highlightMatch(suggestion.node.description, searchTerm)}
                      </div>
                    )}
                  </div>
                  
                  {/* Arrow */}
                  <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-gray-400 transition-colors flex-shrink-0" />
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* No results message */}
      <AnimatePresence>
        {showSuggestions && suggestions.length === 0 && !isSearching && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 z-50 mt-2 bg-gray-800/95 backdrop-blur-sm border border-gray-700/50 rounded-lg shadow-xl p-4 text-center"
          >
            <div className="text-sm text-gray-400">
              No results found for &quot;{searchTerm}&quot;
            </div>
            <button
              data-testid="tree-no-results-clear-button"
              onClick={onClear}
              className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors mt-2"
            >
              Clear search
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
