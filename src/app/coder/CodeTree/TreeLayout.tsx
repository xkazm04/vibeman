import React, { useState, useMemo } from 'react';
import { Search, FolderTree, X, Zap } from 'lucide-react';
import { TreeNode as TreeNodeType } from '../../../types';
import { useStore } from '../../../stores/nodeStore';
import { GlowCard } from '@/components/GlowCard';
import TreeNode from './TreeNode';
import { mockFileStructure } from '../../../constants/mockStructure';
import TreeSearch from './TreeSearch';

export default function TreeLayout() {
  const { selectedNodes, highlightedNodes, toggleNode, clearHighlights } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'files' | 'folders'>('all');

  const filteredStructure = useMemo(() => {
    if (!searchTerm && filterType === 'all') return mockFileStructure;
    
    const filterNode = (node: TreeNodeType): TreeNodeType | null => {
      const matchesSearch = !searchTerm || 
        node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesFilter = filterType === 'all' || 
        (filterType === 'files' && node.type === 'file') ||
        (filterType === 'folders' && node.type === 'folder');
      
      if (node.children) {
        const filteredChildren = node.children.map(filterNode).filter((child): child is TreeNodeType => child !== null);
        if ((matchesSearch && matchesFilter) || filteredChildren.length > 0) {
          return { ...node, children: filteredChildren };
        }
      }
      
      return (matchesSearch && matchesFilter) ? node : null;
    };

    return filterNode(mockFileStructure);
  }, [searchTerm, filterType]);

  const totalNodes = useMemo(() => {
    const countNodes = (node: TreeNodeType): number => {
      let count = 1;
      if (node.children) {
        count += node.children.reduce((sum, child) => sum + countNodes(child), 0);
      }
      return count;
    };
    return countNodes(mockFileStructure) - 1; // Exclude root
  }, []);

  const clearSearch = () => {
    setSearchTerm('');
    setFilterType('all');
  };

  const handleFilterTypeChange = (newFilterType: string) => {
    setFilterType(newFilterType as 'all' | 'files' | 'folders');
  };

  return (
    <GlowCard className="p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-cyan-500/10 rounded-lg">
            <FolderTree className="w-5 h-5 text-cyan-400" />
          </div>
          <h2 className="text-xl font-semibold text-white font-mono">Code Structure</h2>
        </div>
        <div className="flex items-center space-x-3 text-sm text-gray-400">
          <div className="flex items-center space-x-1">
            <span className="w-2 h-2 bg-cyan-400 rounded-full"></span>
            <span>{totalNodes} items</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
            <span>{selectedNodes.size} selected</span>
          </div>
          {highlightedNodes.size > 0 && (
            <div className="flex items-center space-x-1">
              <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></span>
              <span>{highlightedNodes.size} highlighted</span>
            </div>
          )}
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="mb-6">
        <TreeSearch
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filterType={filterType}
          setFilterType={handleFilterTypeChange}
          clearSearch={clearSearch}
        />
      </div>

      {/* Tree View */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        <div className="min-h-0 pr-2">
          {filteredStructure ? (
            <TreeNode
              node={filteredStructure}
              onToggle={toggleNode}
            />
          ) : (
            <div className="text-center py-12 text-gray-500">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-800/50 rounded-full flex items-center justify-center">
                <Search className="w-8 h-8 opacity-50" />
              </div>
              <p className="text-sm mb-2">No results found</p>
              <p className="text-xs text-gray-600 mb-4">Try adjusting your search or filter</p>
              <button
                onClick={clearSearch}
                className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors px-4 py-2 bg-cyan-500/10 rounded-lg hover:bg-cyan-500/20"
              >
                Clear search
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 pt-4 border-t border-gray-700/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {selectedNodes.size > 0 && (
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>{selectedNodes.size} item{selectedNodes.size > 1 ? 's' : ''} selected</span>
              </div>
            )}
            
            {highlightedNodes.size > 0 && (
              <div className="flex items-center space-x-2 text-sm text-orange-400">
                <Zap className="w-3 h-3" />
                <span>{highlightedNodes.size} highlighted by AI</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {selectedNodes.size > 0 && (
              <button
                onClick={() => {
                  selectedNodes.forEach(nodeId => toggleNode(nodeId));
                }}
                className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors px-3 py-1 bg-cyan-500/10 rounded-md hover:bg-cyan-500/20"
              >
                Clear selection
              </button>
            )}
            
            {highlightedNodes.size > 0 && (
              <button
                onClick={clearHighlights}
                className="text-sm text-orange-400 hover:text-orange-300 transition-colors px-3 py-1 bg-orange-500/10 rounded-md hover:bg-orange-500/20"
              >
                Clear highlights
              </button>
            )}
          </div>
        </div>
      </div>
    </GlowCard>
  );
}; 