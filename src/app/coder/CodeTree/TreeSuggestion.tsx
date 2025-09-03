import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, File, Folder, ChevronRight, X } from 'lucide-react';
import { TreeNode as TreeNodeType } from '../../../types';
import { getFileTypeColor } from '@/helpers/typeStyles';

interface SuggestionResult {
  node: TreeNodeType;
  path: string;
  matchType: 'name' | 'description';
}

interface TreeSuggestionProps {
  fileStructure: TreeNodeType | null;
  onNodeSelect: (nodeId: string) => void;
  onClearSearch: () => void;
}

export default function TreeSuggestion({ 
  fileStructure, 
  onNodeSelect, 
  onClearSearch 
}: TreeSuggestionProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setIsSearching(false);
    }, 300);

    if (searchTerm) {
      setIsSearching(true);
    }

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Show/hide suggestions based on search term
  useEffect(() => {
    setShowSuggestions(debouncedSearchTerm.length > 0);
  }, [debouncedSearchTerm]);

  // Generate suggestions
  const suggestions = useMemo(() => {
    if (!fileStructure || !debouncedSearchTerm) return [];

    const results: SuggestionResult[] = [];
    const searchLower = debouncedSearchTerm.toLowerCase();

    const searchNode = (node: TreeNodeType, currentPath: string = '') => {
      const nodePath = currentPath ? `${currentPath}/${node.name}` : node.name;
      
      // Check name match
      if (node.name.toLowerCase().includes(searchLower)) {
        results.push({
          node,
          path: nodePath,
          matchType: 'name'
        });
      }
      // Check description match
      else if (node.description.toLowerCase().includes(searchLower)) {
        results.push({
          node,
          path: nodePath,
          matchType: 'description'
        });
      }

      // Search children
      if (node.children) {
        node.children.forEach(child => searchNode(child, nodePath));
      }
    };

    // Start search from root, but don't include root in results
    if (fileStructure.children) {
      fileStructure.children.forEach(child => searchNode(child));
    }

    // Sort by relevance: exact matches first, then by path length
    return results
      .sort((a, b) => {
        const aExact = a.node.name.toLowerCase() === searchLower;
        const bExact = b.node.name.toLowerCase() === searchLower;
        
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        
        return a.path.length - b.path.length;
      })
      .slice(0, 5); // Limit to 5 results
  }, [fileStructure, debouncedSearchTerm]);

  const handleSuggestionClick = (suggestion: SuggestionResult) => {
    onNodeSelect(suggestion.node.id);
    setSearchTerm('');
    setShowSuggestions(false);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setShowSuggestions(false);
    onClearSearch();
  };

  const highlightMatch = (text: string, searchTerm: string) => {
    if (!searchTerm) return text;
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
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
    <div className="relative mb-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search files and folders..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-10 py-3 bg-gray-800/50 border border-gray-700/50 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
        />
        
        {/* Loading indicator */}
        {isSearching && (
          <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-gray-400 border-t-cyan-400 rounded-full animate-spin"></div>
          </div>
        )}
        
        {/* Clear button */}
        {searchTerm && (
          <button
            onClick={handleClearSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      <AnimatePresence>
        {showSuggestions && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute top-full left-0 right-0 z-50 mt-2 bg-gray-800/95 backdrop-blur-sm border border-gray-700/50 rounded-lg shadow-xl overflow-hidden"
          >
            <div className="p-2">
              <div className="text-xs text-gray-400 px-2 py-1 mb-1">
                {suggestions.length} suggestion{suggestions.length === 1 ? '' : 's'}
              </div>
              
              {suggestions.map((suggestion, index) => (
                <motion.button
                  key={suggestion.node.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleSuggestionClick(suggestion)}
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
                        {highlightMatch(suggestion.node.name, debouncedSearchTerm)}
                      </span>
                      {suggestion.matchType === 'description' && (
                        <span className="text-xs text-gray-500 bg-gray-700/50 px-1.5 py-0.5 rounded">
                          desc
                        </span>
                      )}
                    </div>
                    
                    <div className="text-xs text-gray-400 truncate mt-0.5">
                      {suggestion.path}
                    </div>
                    
                    {suggestion.matchType === 'description' && (
                      <div className="text-xs text-gray-500 truncate mt-1">
                        {highlightMatch(suggestion.node.description, debouncedSearchTerm)}
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
              No results found for "{debouncedSearchTerm}"
            </div>
            <button
              onClick={handleClearSearch}
              className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors mt-2"
            >
              Clear search
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}