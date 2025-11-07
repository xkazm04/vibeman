import React from 'react';
import { FolderTree, RefreshCw, AlertCircle, ChevronDown } from 'lucide-react';
import { Project } from '../../../types';

interface TreeHeaderProps {
  activeProject: Project | null;
  totalNodes: number;
  selectedNodesCount: number;
  highlightedNodesCount: number;
  isLoading: boolean;
  error: string | null;
  showProjectSelector: boolean;
  allProjects: Project[];
  onProjectSelectorToggle: () => void;
  onProjectSelect: (projectId: string) => void;
  onRefresh: () => void;
}

interface ProjectSelectorProps {
  activeProject: Project;
  allProjects: Project[];
  showProjectSelector: boolean;
  onProjectSelectorToggle: () => void;
  onProjectSelect: (projectId: string) => void;
}

function ProjectSelector({
  activeProject,
  allProjects,
  showProjectSelector,
  onProjectSelectorToggle,
  onProjectSelect
}: ProjectSelectorProps) {
  return (
    <div className="relative project-selector">
      <button
        data-testid="tree-project-selector-toggle"
        onClick={onProjectSelectorToggle}
        className="flex items-center space-x-1 text-sm text-gray-400 font-mono hover:text-gray-300 transition-colors"
      >
        <span>{activeProject.name}</span>
        <ChevronDown className="w-3 h-3" />
      </button>
      {showProjectSelector && (
        <div data-testid="tree-project-selector-dropdown" className="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10 min-w-[200px]">
          {allProjects.map((project, index) => (
            <button
              key={project.id || `project-${index}`}
              data-testid={`tree-project-option-${project.id}`}
              onClick={() => onProjectSelect(project.id)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-700 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                activeProject.id === project.id ? 'bg-gray-700 text-cyan-400' : 'text-gray-300'
              }`}
            >
              <div className="font-mono">{project.name}</div>
              <div className="text-sm text-gray-500 truncate">{project.path}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface StatsDisplayProps {
  totalNodes: number;
  selectedNodesCount: number;
  highlightedNodesCount: number;
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
}

function StatsDisplay({
  totalNodes,
  selectedNodesCount,
  highlightedNodesCount,
  isLoading,
  error,
  onRefresh
}: StatsDisplayProps) {
  return (
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
            <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
            <span>{selectedNodesCount} selected</span>
          </div>
          {highlightedNodesCount > 0 && (
            <div className="flex items-center space-x-1">
              <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></span>
              <span>{highlightedNodesCount} highlighted</span>
            </div>
          )}
        </>
      )}
      <button
        data-testid="tree-refresh-button"
        onClick={onRefresh}
        disabled={isLoading}
        className="p-1 hover:bg-gray-700/50 rounded-sm transition-colors disabled:opacity-50"
        title="Refresh file structure"
      >
        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );
}

export default function TreeHeader({
  activeProject,
  totalNodes,
  selectedNodesCount,
  highlightedNodesCount,
  isLoading,
  error,
  showProjectSelector,
  allProjects,
  onProjectSelectorToggle,
  onProjectSelect,
  onRefresh
}: TreeHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-cyan-500/10 rounded-lg">
          <FolderTree className="w-5 h-5 text-cyan-400" />
        </div>
        <div className="flex flex-col">
          <h2 className="text-xl font-semibold text-white font-mono">Code Structure</h2>
          {activeProject && (
            <ProjectSelector
              activeProject={activeProject}
              allProjects={allProjects}
              showProjectSelector={showProjectSelector}
              onProjectSelectorToggle={onProjectSelectorToggle}
              onProjectSelect={onProjectSelect}
            />
          )}
        </div>
      </div>
      <StatsDisplay
        totalNodes={totalNodes}
        selectedNodesCount={selectedNodesCount}
        highlightedNodesCount={highlightedNodesCount}
        isLoading={isLoading}
        error={error}
        onRefresh={onRefresh}
      />
    </div>
  );
} 