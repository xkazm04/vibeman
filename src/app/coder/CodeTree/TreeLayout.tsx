import React, { useState, useEffect } from 'react';
import { useStore } from '../../../stores/nodeStore';
import { useActiveProjectStore } from '../../../stores/activeProjectStore';
import { useProjectConfigStore } from '../../../stores/projectConfigStore';
import { GlowCard } from '@/components/GlowCard';
import TreeHeader from './TreeHeader';
import TreeView from './TreeView';
import TreeFooter from './TreeFooter';
import TreeSuggestion from './TreeSuggestion';
import { initializeProjectsSequence } from './lib/projectApi';
import { countTreeNodes } from './lib/treeUtils';
import { useClickOutside } from './lib/hooks';

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

  const [showProjectSelector, setShowProjectSelector] = useState(false);

  // Initialize projects and then active project
  useEffect(() => {
    initializeProjectsSequence(initializeProjects, getAllProjects, initializeWithFirstProject);
  }, [initializeProjects, initializeWithFirstProject, getAllProjects]);

  // Close project selector when clicking outside
  useClickOutside(
    showProjectSelector,
    '.project-selector',
    () => setShowProjectSelector(false)
  );

  const totalNodes = countTreeNodes(fileStructure);

  const handleClearSearch = () => {
    // Clear any highlights or search-related state if needed
    clearHighlights();
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

      {/* Suggestion Search */}
      {activeProject && fileStructure && !isLoading && (
        <div className="mb-6">
          <TreeSuggestion
            fileStructure={fileStructure}
            onNodeSelect={toggleNode}
            onClearSearch={handleClearSearch}
          />
        </div>
      )}

      <TreeView
        activeProject={activeProject}
        filteredStructure={fileStructure}
        isLoading={isLoading}
        error={error}
        onToggleNode={toggleNode}
        onRefresh={refreshFileStructure}
        onClearError={clearError}
        onClearSearch={handleClearSearch}
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