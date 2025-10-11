import React, { useState, useEffect, useMemo } from 'react';
import { TreeNode as TreeNodeType } from '../../../types';
import TreeSearchInput from './TreeSearchInput';
import TreeSuggestionsDropdown from './TreeSuggestionsDropdown';
import { searchTreeNodes, sortSearchResults } from './lib/treeUtils';

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

  // Generate suggestions using utility functions
  const suggestions = useMemo(() => {
    if (!fileStructure || !debouncedSearchTerm) return [];

    const results = searchTreeNodes(fileStructure, debouncedSearchTerm);
    return sortSearchResults(results, debouncedSearchTerm, 5);
  }, [fileStructure, debouncedSearchTerm]);

  const handleSuggestionClick = (suggestion: SuggestionResult) => {
    onNodeSelect(suggestion.node.id);
    handleClearSearch();
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setShowSuggestions(false);
    onClearSearch();
  };

  return (
    <div className="relative">
      <TreeSearchInput
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onClear={handleClearSearch}
        isSearching={isSearching}
      />

      <TreeSuggestionsDropdown
        suggestions={suggestions}
        searchTerm={debouncedSearchTerm}
        isSearching={isSearching}
        showSuggestions={showSuggestions}
        onSuggestionClick={handleSuggestionClick}
        onClear={handleClearSearch}
      />
    </div>
  );
}