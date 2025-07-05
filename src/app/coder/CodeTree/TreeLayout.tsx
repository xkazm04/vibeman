import React, { useState, useMemo, useEffect } from 'react';
import { Search, FolderTree, X, Zap, RefreshCw, AlertCircle, ChevronDown } from 'lucide-react';
import { TreeNode as TreeNodeType } from '../../../types';
import { useStore } from '../../../stores/nodeStore';
import { useActiveProjectStore } from '../../../stores/activeProjectStore';
import { useProjectConfigStore } from '../../../stores/projectConfigStore';
import { GlowCard } from '@/components/GlowCard';
import TreeNode from './TreeNode';
import TreeSearch from './TreeSearch';

export default function TreeLayout() {
  const { selectedNodes, highlightedNodes, toggleNode, clearHighlights } = useStore();
  const { 
    activeProject, 
    fileStructure, 
    isLoading, 
    error, 
    refreshFileStructure, 
    clearError,
    initializeWithFirstProject,
    loadProjectFileStructure
  } = useActiveProjectStore();
  const { getAllProjects } = useProjectConfigStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'files' | 'folders'>('all');
  const [showProjectSelector, setShowProjectSelector] = useState(false);

  // Initialize with first project on mount
  useEffect(() => {
    initializeWithFirstProject();
  }, [initializeWithFirstProject]);

  // Close project selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showProjectSelector && !(event.target as Element).closest('.project-selector')) {
        setShowProjectSelector(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showProjectSelector]);

  const filteredStructure = useMemo(() => {
    if (!fileStructure) return null;
    if (!searchTerm && filterType === 'all') return fileStructure;
    
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

    return filterNode(fileStructure);
  }, [fileStructure, searchTerm, filterType]);

  const totalNodes = useMemo(() => {
    if (!fileStructure) return 0;
    const countNodes = (node: TreeNodeType): number => {
      let count = 1;
      if (node.children) {
        count += node.children.reduce((sum, child) => sum + countNodes(child), 0);
      }
      return count;
    };
    return countNodes(fileStructure) - 1; // Exclude root
  }, [fileStructure]);

  const clearSearch = () => {
    setSearchTerm('');
    setFilterType('all');
  };

  const handleFilterTypeChange = (newFilterType: string) => {
    setFilterType(newFilterType as 'all' | 'files' | 'folders');
  };

  return (
    <GlowCard className="p-6 h-full min-w-[550px] max-h-[60vh] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-cyan-500/10 rounded-lg">
            <FolderTree className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-xl font-semibold text-white font-mono">Code Structure</h2>
            {activeProject && (
              <div className="relative project-selector">
                <button
                  onClick={() => setShowProjectSelector(!showProjectSelector)}
                  className="flex items-center space-x-1 text-sm text-gray-400 font-mono hover:text-gray-300 transition-colors"
                >
                  <span>{activeProject.name}</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
                {showProjectSelector && (
                  <div className="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10 min-w-[200px]">
                    {getAllProjects().map((project, index) => (
                      <button
                        key={project.id || `project-${index}`}
                        onClick={() => {
                          loadProjectFileStructure(project.id);
                          setShowProjectSelector(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-700 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                          activeProject.id === project.id ? 'bg-gray-700 text-cyan-400' : 'text-gray-300'
                        }`}
                      >
                        <div className="font-mono">{project.name}</div>
                        <div className="text-xs text-gray-500 truncate">{project.path}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-3 text-sm text-gray-400">
          {isLoading && (
            <div className="flex items-center space-x-1">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>Loading...</span>
            </div>
          )}
          {error && (
            <div className="flex items-center space-x-1 text-red-400">
              <AlertCircle className="w-3 h-3" />
              <span>Error</span>
            </div>
          )}
          {!isLoading && !error && (
            <>
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
            </>
          )}
          <button
            onClick={refreshFileStructure}
            disabled={isLoading}
            className="p-1 hover:bg-gray-700/50 rounded-sm transition-colors disabled:opacity-50"
            title="Refresh file structure"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Search and Filter Bar */}
      {activeProject && fileStructure && !isLoading && (
        <div className="mb-6">
          <TreeSearch
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            filterType={filterType}
            setFilterType={handleFilterTypeChange}
            clearSearch={clearSearch}
          />
        </div>
      )}

      {/* Tree View */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        <div className="min-h-0 pr-2">
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-800/50 rounded-full flex items-center justify-center">
                <RefreshCw className="w-8 h-8 animate-spin opacity-50" />
              </div>
              <p className="text-sm mb-2">Loading project structure...</p>
              <p className="text-xs text-gray-600">This may take a moment</p>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-400">
              <div className="w-16 h-16 mx-auto mb-4 bg-red-500/10 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 opacity-50" />
              </div>
              <p className="text-sm mb-2">Failed to load project structure</p>
              <p className="text-xs text-gray-600 mb-4">{error}</p>
              <div className="flex justify-center space-x-2">
                <button
                  onClick={clearError}
                  className="text-sm text-gray-400 hover:text-gray-300 transition-colors px-4 py-2 bg-gray-700/50 rounded-lg hover:bg-gray-700/70"
                >
                  Dismiss
                </button>
                <button
                  onClick={refreshFileStructure}
                  className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors px-4 py-2 bg-cyan-500/10 rounded-lg hover:bg-cyan-500/20"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : !activeProject ? (
            <div className="text-center py-12 text-gray-500">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-800/50 rounded-full flex items-center justify-center">
                <FolderTree className="w-8 h-8 opacity-50" />
              </div>
              <p className="text-sm mb-2">No active project</p>
              <p className="text-xs text-gray-600">Select a project to view its structure</p>
            </div>
          ) : filteredStructure ? (
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