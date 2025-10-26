'use client';
import React from 'react';
import { AlertCircle } from 'lucide-react';
import { GlowCard } from '@/components/GlowCard';
import FileTreeSelector from '../ContextMenu/FileTreeSelector';
import SelectedFilesList from '../ContextMenu/SelectedFilesList';
import { TreeNode } from '@/types';

interface ContextGenFilesProps {
  fileStructure: TreeNode | null;
  fileStructureLoading: boolean;
  selectedPaths: string[];
  searchQuery: string;
  onPathToggle: (path: string) => void;
  onRemoveFile: (path: string) => void;
  onClearAll: () => void;
  onSearchChange: (query: string) => void;
  onRefresh: () => void;
  projectName?: string;
  projectPath?: string;
}

export default function ContextGenFiles({
  fileStructure,
  fileStructureLoading,
  selectedPaths,
  searchQuery,
  onPathToggle,
  onRemoveFile,
  onClearAll,
  onSearchChange,
  onRefresh,
  projectName,
  projectPath,
}: ContextGenFilesProps) {
  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-300">
        Files ({selectedPaths.length})
      </label>

      <div className="grid grid-cols-2 gap-6">
        {/* Left Side - File Tree */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-400">Project Files</h4>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500">Select files to include</span>
              <button
                onClick={onRefresh}
                disabled={fileStructureLoading}
                className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors disabled:opacity-50"
              >
                {fileStructureLoading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>
          <GlowCard className="p-0 h-full">
            {fileStructureLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-sm text-gray-400">Loading project files...</p>
                  {projectName && (
                    <p className="text-xs text-gray-500 mt-1">Project: {projectName}</p>
                  )}
                </div>
              </div>
            ) : !fileStructure ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <AlertCircle className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-400 mb-2">No project files loaded</p>
                  <button
                    onClick={onRefresh}
                    className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    Load Project Files
                  </button>
                </div>
              </div>
            ) : (
              <FileTreeSelector
                fileStructure={fileStructure}
                selectedPaths={selectedPaths}
                onPathToggle={onPathToggle}
                searchQuery={searchQuery}
                onSearchChange={onSearchChange}
                projectPath={projectPath}
              />
            )}
          </GlowCard>
        </div>

        {/* Right Side - Selected Files List */}
        <SelectedFilesList
          selectedPaths={selectedPaths}
          onRemoveFile={onRemoveFile}
          onClearAll={onClearAll}
        />
      </div>
    </div>
  );
}
