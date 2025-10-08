import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, Plus, ChevronUp, Grid3X3 } from 'lucide-react';
import { useContextStore } from '../../../stores/contextStore';
import { useActiveProjectStore } from '../../../stores/activeProjectStore';
import { useGlobalModal } from '../../../hooks/useGlobalModal';
import EnhancedContextEditModal from './ContextMenu/EnhancedContextEditModal';
import ContextSection from './ContextGroups/ContextSection';
import GroupManagementModal from './ContextGroups/GroupManagementModal';
import { GroupDetailView, useContextDetail } from './ContextDetail';

interface HorizontalContextBarProps {
  selectedFilesCount: number;
  selectedFilePaths: string[];
}

export default function HorizontalContextBar({ selectedFilesCount, selectedFilePaths }: HorizontalContextBarProps) {
  const { contexts, groups, loading, loadProjectData } = useContextStore();
  const { activeProject } = useActiveProjectStore();
  const { showFullScreenModal } = useGlobalModal();
  const { isDetailOpen, selectedGroupId, closeGroupDetail, openGroupDetail } = useContextDetail();
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const lastProjectIdRef = useRef<string | null>(null);

  // Create synthetic "To group" for ungrouped contexts
  const ungroupedContexts = contexts.filter(ctx => !ctx.groupId);
  const syntheticToGroup = {
    id: 'synthetic-to-group',
    projectId: activeProject?.id || '',
    name: 'To group',
    color: '#6B7280', // Gray color
    position: -1, // Always first
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // Combine synthetic group with real groups, but only show synthetic if there are ungrouped contexts
  const allGroups = ungroupedContexts.length > 0 ? [syntheticToGroup, ...groups] : groups;

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
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative mb-6 bg-gradient-to-br from-gray-900/95 via-slate-900/20 to-blue-900/30 border border-gray-700/40 rounded-3xl overflow-hidden backdrop-blur-xl shadow-2xl"
      >
        {/* Neural Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-slate-500/5 to-blue-500/5 rounded-3xl" />
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent rounded-3xl" />
        
        {/* Animated Grid Pattern */}
        <motion.div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `
              linear-gradient(rgba(99, 102, 241, 0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(99, 102, 241, 0.3) 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px'
          }}
          animate={{
            backgroundPosition: ['0px 0px', '20px 20px'],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        {/* Neural Header Bar */}
        <div className="relative flex items-center justify-between px-8 py-6 bg-gradient-to-r from-gray-800/30 via-slate-900/20 to-gray-800/30 border-b border-gray-700/30 backdrop-blur-sm">
          <div className="flex items-center space-x-6">
            {/* Smart Save Button - Enhanced with better visuals */}
            <motion.button
              onClick={() => {
                if (selectedFilesCount > 0 && groups.length > 0) {
                  showFullScreenModal(
                    'Create New Context',
                    <EnhancedContextEditModal
                      availableGroups={groups}
                      selectedFilePaths={selectedFilePaths}
                    />,
                    {
                      icon: Save,
                      iconBgColor: "from-cyan-500/20 to-blue-500/20",
                      iconColor: "text-cyan-400",
                      maxWidth: "max-w-7xl",
                      maxHeight: "max-h-[90vh]"
                    }
                  );
                } else {
                  setShowGroupModal(true);
                }
              }}
              className={`relative group p-4 rounded-2xl transition-all duration-300 backdrop-blur-sm ${selectedFilesCount > 0 && groups.length > 0
                ? 'bg-gradient-to-r from-cyan-500/30 to-blue-500/30 text-cyan-300 shadow-lg shadow-cyan-500/20 hover:from-cyan-500/40 hover:to-blue-500/40 hover:shadow-cyan-500/30 border border-cyan-500/30'
                : 'bg-gradient-to-r from-blue-500/20 to-blue-500/20 text-blue-400 hover:from-blue-500/30 hover:to-blue-500/30 border border-blue-500/30'
                }`}
              title={selectedFilesCount > 0 && groups.length > 0 ? `Save ${selectedFilesCount} selected files` : 'Manage groups'}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {selectedFilesCount > 0 && groups.length > 0 ? (
                <Save className="w-6 h-6" />
              ) : (
                <Grid3X3 className="w-6 h-6" />
              )}

              {/* Neural Glow Effect */}
              <motion.div
                className="absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  background: selectedFilesCount > 0 && groups.length > 0
                    ? 'linear-gradient(45deg, #06b6d4, transparent, #06b6d4)'
                    : 'linear-gradient(45deg, #8b5cf6, transparent, #8b5cf6)',
                  filter: 'blur(8px)',
                }}
              />
              
              {/* Floating Particles Effect */}
              {Array.from({ length: 3 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 bg-cyan-400/40 rounded-full"
                  style={{
                    left: `${20 + i * 20}%`,
                    top: `${30 + i * 15}%`,
                  }}
                  animate={{
                    y: [0, -10, 0],
                    opacity: [0, 1, 0],
                    scale: [0, 1, 0],
                  }}
                  transition={{
                    duration: 2 + Math.random() * 2,
                    repeat: Infinity,
                    delay: i * 0.5,
                  }}
                />
              ))}
            </motion.button>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-4">
                <div>
                  <motion.h3 
                    className="text-2xl font-bold bg-gradient-to-r from-cyan-400 via-slate-400 to-blue-400 bg-clip-text text-transparent font-mono mb-1"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2, duration: 0.6 }}
                  >
                    CONTEXT NEURAL NETWORK
                  </motion.h3>
                  <motion.div 
                    className="flex items-center space-x-4 text-sm text-gray-400 font-mono"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.6 }}
                  >
                    <div className="flex items-center space-x-2">
                      <motion.div 
                        className="w-2 h-2 bg-blue-400 rounded-full"
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                      <span>{allGroups.length} neural clusters</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <motion.div 
                        className="w-2 h-2 bg-cyan-400 rounded-full"
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                      />
                      <span>{contexts.length} context nodes</span>
                    </div>
                    {ungroupedContexts.length > 0 && (
                      <div className="flex items-center space-x-2">
                        <motion.div 
                          className="w-2 h-2 bg-yellow-400 rounded-full"
                          animate={{ 
                            scale: [1, 1.5, 1],
                            opacity: [0.6, 1, 0.6] 
                          }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        />
                        <span className="text-yellow-400">{ungroupedContexts.length} unlinked</span>
                      </div>
                    )}
                  </motion.div>
                </div>

                {/* Add Context Button */}
                {groups.length > 0 && (
                  <motion.button
                    onClick={() => {
                      showFullScreenModal(
                        'Create New Context',
                        <EnhancedContextEditModal
                          availableGroups={groups}
                          selectedFilePaths={[]}
                        />,
                        {
                          icon: Plus,
                          iconBgColor: "from-green-500/20 to-emerald-500/20",
                          iconColor: "text-green-400",
                          maxWidth: "max-w-7xl",
                          maxHeight: "max-h-[90vh]"
                        }
                      );
                    }}
                    className="p-3 bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 rounded-xl hover:from-green-500/30 hover:to-emerald-500/30 transition-all border border-green-500/30"
                    title="Create new context"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Plus className="w-5 h-5" />
                  </motion.button>
                )}
              </div>

              {loading && (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm text-blue-400 font-mono">Syncing...</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Status indicator for selected files */}
            {selectedFilesCount > 0 && (
              <motion.div
                className="flex items-center space-x-3 px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-xl border border-cyan-500/30"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                <motion.div
                  className="w-3 h-3 bg-cyan-400 rounded-full"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
                <span className="text-sm font-bold text-cyan-400 font-mono">
                  {selectedFilesCount} files ready
                </span>
              </motion.div>
            )}

            <motion.button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-3 hover:bg-gray-700/50 rounded-xl transition-all duration-300"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <motion.div
                animate={{ rotate: isExpanded ? 0 : 180 }}
                transition={{ duration: 0.3 }}
              >
                <ChevronUp className="w-5 h-5 text-gray-400" />
              </motion.div>
            </motion.button>
          </div>
        </div>

        {/* Context Groups Grid */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="relative overflow-hidden"
            >
              {allGroups.length === 0 ? (
                <motion.div
                  className="flex items-center justify-center py-20"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="text-center">
                    <div className="relative mb-6">
                      <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-500/20 to-blue-500/20 rounded-3xl flex items-center justify-center backdrop-blur-sm">
                        <Plus className="w-10 h-10 text-blue-400" />
                      </div>
                      <motion.div
                        className="absolute -inset-2 bg-gradient-to-r from-blue-500/30 to-blue-500/30 rounded-3xl blur-xl opacity-50"
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    </div>
                    <p className="text-xl font-bold text-gray-300 font-mono mb-2">No context groups yet</p>
                    <p className="text-gray-500 mb-6">Create your first group to start organizing your workflow</p>
                    <motion.button
                      onClick={() => setShowGroupModal(true)}
                      className="px-6 py-3 bg-gradient-to-r from-blue-500/20 to-blue-500/20 text-blue-400 rounded-xl hover:from-blue-500/30 hover:to-blue-500/30 transition-all font-mono border border-blue-500/30"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Create First Group
                    </motion.button>
                  </div>
                </motion.div>
              ) : (
                <div className="p-8">
                  {/* Flexible Grid Layout */}
                  <div className="grid gap-6" style={{
                    gridTemplateColumns: `repeat(auto-fit, minmax(${Math.max(400, Math.min(600, Math.floor((window.innerWidth - 200) / Math.max(allGroups.length + (groups.length < 20 ? 1 : 0), 2))))}px, 1fr))`
                  }}>
                    {/* Render all groups (including synthetic "To group") */}
                    {allGroups.map((group, index) => {
                      const isSyntheticGroup = group.id === 'synthetic-to-group';
                      const groupContexts = isSyntheticGroup ?
                        ungroupedContexts :
                        contexts.filter(ctx => ctx.groupId === group.id);

                      return (
                        <motion.div
                          key={group.id}
                          initial={{ opacity: 0, scale: 0.9, y: 20 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          transition={{
                            duration: 0.3,
                            delay: index * 0.1,
                            type: "spring",
                            stiffness: 300,
                            damping: 30
                          }}
                          className="min-h-[300px]"
                        >
                          <ContextSection
                            group={group}
                            contexts={groupContexts}
                            projectId={activeProject.id}
                            className={`h-full ${isSyntheticGroup
                              ? 'opacity-80'
                              : ''
                              }`}
                            isEmpty={false}
                            availableGroups={groups} // Pass only real groups for moving contexts
                            selectedFilePaths={selectedFilePaths}
                            openGroupDetail={openGroupDetail}
                          />
                        </motion.div>
                      );
                    })}

                    {/* Add new group slot (only show if less than 20 real groups) */}
                    {groups.length < 20 && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{
                          duration: 0.3,
                          delay: allGroups.length * 0.1,
                          type: "spring",
                          stiffness: 300,
                          damping: 30
                        }}
                        className="min-h-[300px]"
                      >
                        <ContextSection
                          group={undefined}
                          contexts={[]}
                          projectId={activeProject.id}
                          className="h-full"
                          isEmpty={true}
                          onCreateGroup={() => setShowGroupModal(true)}
                          availableGroups={groups}
                          selectedFilePaths={selectedFilePaths}
                          openGroupDetail={openGroupDetail}
                        />
                      </motion.div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>



      <GroupManagementModal
        isOpen={showGroupModal}
        onClose={() => setShowGroupModal(false)}
        projectId={activeProject.id}
        groups={groups}
      />

      {/* Group Detail View */}
      <AnimatePresence>
        {isDetailOpen && selectedGroupId && (
          <GroupDetailView
            groupId={selectedGroupId}
            onClose={closeGroupDetail}
          />
        )}
      </AnimatePresence>
    </>
  );
}