import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, Plus } from 'lucide-react';
import { useContextStore } from '../../../stores/contextStore';
import { useActiveProjectStore } from '../../../stores/activeProjectStore';
import { useGlobalModal } from '../../../hooks/useGlobalModal';
import ContextEditModal from './sub_ContextGen/ContextEditModal';
import ContextSection from './sub_ContextGroups/ContextSection';
import CG_modal from './sub_ContextGroups/ContextGroupManagement/CG_modal';
import HorizontalContextBarHeader from './sub_ContextGroups/HorizontalContextBarHeader';
import { GroupDetailView, useContextDetail } from './sub_ContextDetail';

interface HorizontalContextBarProps {
  selectedFilesCount: number;
}

const HorizontalContextBar = React.memo(({ selectedFilesCount }: HorizontalContextBarProps) => {
  const { contexts, groups, loading, loadProjectData } = useContextStore();
  const { activeProject } = useActiveProjectStore();
  const { showFullScreenModal } = useGlobalModal();
  const { isDetailOpen, selectedGroupId, closeGroupDetail, openGroupDetail } = useContextDetail();
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const lastProjectIdRef = useRef<string | null>(null);

  // Memoized calculations for performance
  const ungroupedContexts = useMemo(() => 
    contexts.filter(ctx => !ctx.groupId), 
    [contexts]
  );

  const syntheticToGroup = useMemo(() => ({
    id: 'synthetic-to-group',
    projectId: activeProject?.id || '',
    name: 'To group',
    color: '#6B7280', // Gray color
    position: -1, // Always first
    createdAt: new Date(),
    updatedAt: new Date()
  }), [activeProject?.id]);

  const allGroups = useMemo(() => 
    ungroupedContexts.length > 0 ? [syntheticToGroup, ...groups] : groups,
    [ungroupedContexts.length, syntheticToGroup, groups]
  );

  // Memoized callbacks for performance
  const handleSaveClick = useCallback(() => {
    if (selectedFilesCount > 0 && groups.length > 0) {
      showFullScreenModal(
        'Create New Context',
        <ContextEditModal
          availableGroups={groups}
        />,
        {
          icon: Save,
          iconBgColor: "from-cyan-500/20 to-blue-500/20",
          iconColor: "text-cyan-400",
          maxWidth: "max-w-[95vw]",
        }
      );
    } else {
      setShowGroupModal(true);
    }
  }, [selectedFilesCount, groups.length, showFullScreenModal, groups]);

  const handleAddContextClick = useCallback(() => {
    showFullScreenModal(
      'Create New Context',
      <ContextEditModal
        availableGroups={groups}
      />,
      {
        icon: Plus,
        iconBgColor: "from-green-500/20 to-emerald-500/20",
        iconColor: "text-green-400",
        maxWidth: "max-w-[95vw]",
      }
    );
  }, [showFullScreenModal, groups]);

  const handleToggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  // Load project data when active project changes
  useEffect(() => {
    if (activeProject?.id && activeProject.id !== lastProjectIdRef.current) {
      lastProjectIdRef.current = activeProject.id;
      loadProjectData(activeProject.id);
    }
  }, [activeProject?.id, loadProjectData]);

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
        <HorizontalContextBarHeader
          selectedFilesCount={selectedFilesCount}
          groups={groups}
          ungroupedContextsCount={ungroupedContexts.length}
          contextsCount={contexts.length}
          loading={loading}
          isExpanded={isExpanded}
          onSaveClick={handleSaveClick}
          onAddContextClick={handleAddContextClick}
          onToggleExpanded={handleToggleExpanded}
        />

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
      <CG_modal
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
});

HorizontalContextBar.displayName = 'HorizontalContextBar';

export default HorizontalContextBar;