import React, { useState, useMemo, useEffect } from 'react';
import { TreeNode as TreeNodeType } from '../../../types';
import { useStore } from '../../../stores/nodeStore';
import { useActiveProjectStore } from '../../../stores/activeProjectStore';
import { useProjectConfigStore } from '../../../stores/projectConfigStore';
import { GlowCard } from '@/components/GlowCard';
import TreeHeader from './TreeHeader';
import TreeView from './TreeView';
import TreeFooter from './TreeFooter';
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
  const { getAllProjects, initializeProjects } = useProjectConfigStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'files' | 'folders'>('all');
  const [showProjectSelector, setShowProjectSelector] = useState(false);

  // Initialize projects and then active project
  useEffect(() => {
    const initializeSequence = async () => {
      await initializeProjects();
      
      // Test: Force call the structure API with a known project
      const projects = getAllProjects();
      console.log('Available projects:', projects);
      
      if (projects.length > 0) {
        console.log('Forcing structure API call for project:', projects[0]);
        try {
          const response = await fetch('/api/project/structure', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ projectPath: projects[0].path }),
          });
          console.log('Structure API response:', response.status);
          const data = await response.json();
          console.log('Structure data:', data);
        } catch (error) {
          console.error('Structure API error:', error);
        }
      }
      
      initializeWithFirstProject();
    };
    
    initializeSequence();
  }, [initializeProjects, initializeWithFirstProject, getAllProjects]);

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

  const handleProjectSelectorToggle = () => {
    setShowProjectSelector(!showProjectSelector);
  };

  const handleProjectSelect = (projectId: string) => {
    loadProjectFileStructure(projectId);
    setShowProjectSelector(false);
  };

  const handleClearSelection = () => {
    selectedNodes.forEach(nodeId => toggleNode(nodeId));
  };

  return (
    <GlowCard className="p-6 h-full min-w-[550px] max-h-[60vh] flex flex-col">
      <TreeHeader
        activeProject={activeProject}
        totalNodes={totalNodes}
        selectedNodesCount={selectedNodes.size}
        highlightedNodesCount={highlightedNodes.size}
        isLoading={isLoading}
        error={error}
        showProjectSelector={showProjectSelector}
        allProjects={getAllProjects()}
        onProjectSelectorToggle={handleProjectSelectorToggle}
        onProjectSelect={handleProjectSelect}
        onRefresh={refreshFileStructure}
      />

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

      <TreeView
        activeProject={activeProject}
        filteredStructure={filteredStructure}
        isLoading={isLoading}
        error={error}
        onToggleNode={toggleNode}
        onRefresh={refreshFileStructure}
        onClearError={clearError}
        onClearSearch={clearSearch}
      />

      <TreeFooter
        selectedNodesCount={selectedNodes.size}
        highlightedNodesCount={highlightedNodes.size}
        onClearSelection={handleClearSelection}
        onClearHighlights={clearHighlights}
      />
    </GlowCard>
  );
}; 