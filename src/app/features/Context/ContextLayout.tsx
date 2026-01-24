import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, Plus, FolderPlus } from 'lucide-react';
import { Caveat } from 'next/font/google';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import { useContextStore } from '../../../stores/contextStore';
import { useActiveProjectStore } from '../../../stores/activeProjectStore';
import { useGlobalModal } from '../../../hooks/useGlobalModal';
import ContextEditModal from './sub_ContextGen/ContextEditModal';
import ContextSection from './sub_ContextGroups/ContextSection';
import CG_modal from './sub_ContextGroups/ContextGroupManagement/CG_modal';
import HorizontalContextBarHeader from './sub_ContextGroups/HorizontalContextBarHeader';
import { GroupDetailView, useContextDetail } from './sub_ContextDetail';
import ContextJailCard from '@/components/ContextComponents/ContextJailCard';
import { useDragDropContext, useDropZoneValidator, DEFAULT_TARGET_TRANSFORMS } from '@/hooks/dnd';
import EmptyStateIllustration from '@/components/ui/EmptyStateIllustration';

const caveat = Caveat({
  weight: ['400', '700'],
  subsets: ['latin'],
  display: 'swap',
});

interface HorizontalContextBarProps {
  selectedFilesCount: number;
}

const HorizontalContextBar = React.memo(({ selectedFilesCount }: HorizontalContextBarProps) => {
  const { contexts, groups, loading, loadProjectData, updateContext, moveContext, deleteAllContexts } = useContextStore();
  const { activeProject } = useActiveProjectStore();
  const { showFullScreenModal } = useGlobalModal();
  const { isDetailOpen, selectedGroupId, closeGroupDetail, openGroupDetail } = useContextDetail();
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const lastProjectIdRef = useRef<string | null>(null);

  // Drop zone validator with target transforms for synthetic group
  const { transformTarget } = useDropZoneValidator({
    targetTransforms: DEFAULT_TARGET_TRANSFORMS.UNGROUPED,
  });

  // DnD Context hook - replaces manual sensor setup and state management
  const {
    sensors,
    activeId,
    isDragActive,
    handleDragStart,
    handleDragEnd,
    dropAnimation,
  } = useDragDropContext({
    onDrop: async (contextId, groupId) => {
      if (!groupId) return;
      // Transform synthetic-to-group to null for ungrouped
      const targetGroupId = transformTarget(groupId);
      try {
        await moveContext(contextId, targetGroupId);
      } catch (error) {
        console.error('Failed to move context:', error);
      }
    },
    sensorOptions: {
      delay: 300,
      tolerance: 5,
    },
  });


  // Memoized calculations for performance
  const ungroupedContexts = useMemo(() =>
    contexts.filter(ctx => !ctx.groupId),
    [contexts]
  );

  const syntheticToGroup = useMemo(() => ({
    id: 'synthetic-to-group',
    projectId: activeProject?.id || '',
    name: 'Unsorted',
    color: '#71717a', // Zinc-500
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
        iconBgColor: "from-cyan-500/20 to-blue-500/20",
        iconColor: "text-cyan-400",
        maxWidth: "max-w-[95vw]",
      }
    );
  }, [showFullScreenModal, groups]);

  const handleToggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  const handleDeleteAllClick = useCallback(async () => {
    if (!activeProject?.id) return;
    await deleteAllContexts(activeProject.id);
  }, [activeProject?.id, deleteAllContexts]);

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

  const activeContext = activeId ? contexts.find(c => c.id === activeId) : null;

  return (
    <div className="relative">
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative mb-8"
        >
          {/* Glass Container */}
          <div className="relative bg-gray-900/60 backdrop-blur-xl border border-cyan-500/20 rounded-3xl overflow-hidden shadow-[0_0_40px_rgba(6,182,212,0.1)]">
            {/* Ambient Background Glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-blue-500/5 to-cyan-500/5 opacity-50" />

            {/* Animated Grid Pattern */}
            <div className="absolute inset-0 opacity-[0.05]"
              style={{
                backgroundImage: 'linear-gradient(#22d3ee 1px, transparent 1px), linear-gradient(90deg, #22d3ee 1px, transparent 1px)',
                backgroundSize: '40px 40px'
              }}
            />

            {/* Header Bar */}
            <div className="relative z-10 border-b border-cyan-500/10 bg-cyan-950/20 backdrop-blur-md">
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
                onDeleteAllClick={handleDeleteAllClick}
              />
            </div>

            {/* Context Groups Grid */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  className="relative"
                >
                  {allGroups.length === 0 ? (
                    <EmptyStateIllustration
                      type="contexts"
                      headline="Initialize your context network"
                      description="Contexts help you organize your codebase into logical groups. Define business domains, features, or modules to make AI analysis more targeted and effective."
                      action={{
                        label: 'Create First Group',
                        onClick: () => setShowGroupModal(true),
                        icon: FolderPlus,
                      }}
                      height="py-32"
                      testId="context-empty"
                    />
                  ) : (
                    <div className="p-8">
                      {/* Flexible Grid Layout */}
                      <div className="grid gap-6" style={{
                        gridTemplateColumns: `repeat(auto-fit, minmax(400px, 1fr))`
                      }}>
                        {/* Render all groups */}
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
                                duration: 0.4,
                                delay: index * 0.05,
                                type: "spring",
                                stiffness: 100,
                                damping: 15
                              }}
                              className="h-full"
                            >
                              <ContextSection
                                group={group}
                                contexts={groupContexts}
                                projectId={activeProject.id}
                                className={`h-full ${isSyntheticGroup ? 'opacity-90' : ''}`}
                                isEmpty={false}
                                availableGroups={groups}
                                openGroupDetail={openGroupDetail}
                                isDragActive={isDragActive}
                              />
                            </motion.div>
                          );
                        })}

                        {/* Add new group slot */}
                        {groups.length < 20 && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            className="min-h-[300px] border-2 border-dashed border-cyan-500/20 rounded-2xl flex flex-col items-center justify-center gap-4 hover:border-cyan-500/40 hover:bg-cyan-500/5 transition-all cursor-pointer group"
                            onClick={() => setShowGroupModal(true)}
                          >
                            <div className="w-12 h-12 rounded-full bg-cyan-500/10 flex items-center justify-center group-hover:scale-110 transition-transform border border-cyan-500/20">
                              <Plus className="w-6 h-6 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
                            </div>
                            <span className={`${caveat.className} text-xl font-bold text-cyan-400/60 group-hover:text-cyan-300 transition-colors`}>New Group</span>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Drag Overlay */}
        <DragOverlay dropAnimation={dropAnimation}>
          {activeContext ? (
            <div className="w-[300px] opacity-90 rotate-3 scale-105 cursor-grabbing">
              <ContextJailCard
                context={activeContext}
                group={groups.find(g => g.id === activeContext.groupId)}
                index={0}
                fontSize="text-lg"
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

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
    </div>
  );
});

HorizontalContextBar.displayName = 'HorizontalContextBar';

export default HorizontalContextBar;