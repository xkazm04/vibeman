import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, FolderTree, Plus, ChevronDown, ChevronUp, Grid3X3 } from 'lucide-react';
import { useContextStore } from '../../../stores/contextStore';
import { useActiveProjectStore } from '../../../stores/activeProjectStore';
import ContextSaveModal from './ContextMenu/ContextSaveModal';
import ContextSection from './ContextGroups/ContextSection';
import GroupManagementModal from './ContextGroups/GroupManagementModal';

interface HorizontalContextBarProps {
  selectedFilesCount: number;
  selectedFilePaths: string[];
}

export default function HorizontalContextBar({ selectedFilesCount, selectedFilePaths }: HorizontalContextBarProps) {
  const { contexts, groups, loading, loadProjectData } = useContextStore();
  const { activeProject } = useActiveProjectStore();
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const lastProjectIdRef = useRef<string | null>(null);

  // Load project data when active project changes
  useEffect(() => {
    if (activeProject?.id && activeProject.id !== lastProjectIdRef.current) {
      lastProjectIdRef.current = activeProject.id;
      loadProjectData(activeProject.id);
    }
  }, [activeProject?.id]); // Remove loadProjectData from dependencies

  // Don't render if no active project
  if (!activeProject) {
    return null;
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-4 bg-gradient-to-r from-gray-800/50 to-gray-700/50 border border-gray-600/30 rounded-lg overflow-hidden"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800/30 border-b border-gray-600/20">
          <div className="flex items-center space-x-3">
            {/* Smart Save Button - glows when files are selected */}
            <button
              onClick={selectedFilesCount > 0 && groups.length > 0 ? () => setShowSaveModal(true) : () => setShowGroupModal(true)}
              className={`p-2 rounded-full transition-all duration-300 ${selectedFilesCount > 0 && groups.length > 0
                ? 'bg-cyan-500/30 text-cyan-300 shadow-lg shadow-cyan-500/20 hover:bg-cyan-500/40 hover:shadow-cyan-500/30'
                : 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
                }`}
              title={selectedFilesCount > 0 && groups.length > 0 ? `Save ${selectedFilesCount} selected files` : 'Manage groups'}
            >
              {selectedFilesCount > 0 && groups.length > 0 ? (
                <Save className="w-5 h-5" />
              ) : (
                <Grid3X3 className="w-5 h-5" />
              )}
            </button>

            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-semibold text-white font-mono">Context Groups</h3>
              <div className="flex items-center space-x-1">
                <span className="text-xs text-gray-400">
                  {groups.length} groups • {contexts.length} contexts
                </span>
                {loading && (
                  <div className="w-3 h-3 border border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                )}
              </div>
            </div>
          </div>

          {/* Status indicator for selected files */}
          {selectedFilesCount > 0 && (
            <div className="flex items-center space-x-2 text-xs text-cyan-400">
              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
              <span>{selectedFilesCount} files ready</span>
            </div>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-gray-700/50 rounded-sm transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>
        </div>

        {/* Context Groups Grid */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              {groups.length === 0 ? (
                <div className="h-20 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-8 h-8 mx-auto mb-2 bg-gray-700/30 rounded-full flex items-center justify-center">
                      <Plus className="w-4 h-4 text-gray-500" />
                    </div>
                    <p className="text-xs text-gray-500 mb-2">No context groups yet</p>
                    <button
                      onClick={() => setShowGroupModal(true)}
                      className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      Create your first group
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1 p-2 min-h-[80px] bg-gray-600/10">
                  {/* Render existing groups */}
                  {groups.map((group) => {
                    const groupContexts = contexts.filter(ctx => ctx.groupId === group.id);

                    return (
                      <div key={group.id} className="flex-1 min-w-[200px] max-w-[300px]">
                        <ContextSection
                          group={group}
                          contexts={groupContexts}
                          projectId={activeProject.id}
                          className="bg-gray-800/20 hover:bg-gray-800/30 transition-colors border border-gray-600/20 rounded-md h-full"
                          isEmpty={false}
                          availableGroups={groups}
                          selectedFilePaths={selectedFilePaths}
                        />
                      </div>
                    );
                  })}

                  {/* Add new group slot (only show if less than 9 groups) */}
                  {groups.length < 9 && (
                    <div className="flex-1 min-w-[200px] max-w-[300px]">
                      <ContextSection
                        group={undefined}
                        contexts={[]}
                        projectId={activeProject.id}
                        className="bg-gray-800/10 hover:bg-gray-800/20 transition-colors border border-gray-600/10 border-dashed rounded-md h-full"
                        isEmpty={true}
                        onCreateGroup={() => setShowGroupModal(true)}
                        availableGroups={groups}
                        selectedFilePaths={selectedFilePaths}
                      />
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <ContextSaveModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        selectedFilePaths={selectedFilePaths}
        projectId={activeProject.id}
        availableGroups={groups}
      />

      <GroupManagementModal
        isOpen={showGroupModal}
        onClose={() => setShowGroupModal(false)}
        projectId={activeProject.id}
        groups={groups}
      />
    </>
  );
}