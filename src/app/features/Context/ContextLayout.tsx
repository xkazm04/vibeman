import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, Plus, Layers } from 'lucide-react';
import { Caveat } from 'next/font/google';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  DragStartEvent,
  DragEndEvent,
  defaultDropAnimationSideEffects,
  DropAnimation
} from '@dnd-kit/core';
import { useContextStore } from '../../../stores/contextStore';
import { useActiveProjectStore } from '../../../stores/activeProjectStore';
import { useGlobalModal } from '../../../hooks/useGlobalModal';
import ContextEditModal from './sub_ContextGen/ContextEditModal';
import ContextSection from './sub_ContextGroups/ContextSection';
import CG_modal from './sub_ContextGroups/ContextGroupManagement/CG_modal';
import HorizontalContextBarHeader from './sub_ContextGroups/HorizontalContextBarHeader';
import { GroupDetailView, useContextDetail } from './sub_ContextDetail';
import ContextTargetPopup from './sub_ContextTargetPopup/ContextTargetPopup';
import { Context as StoreContext } from '@/stores/context/contextStoreTypes';
import ContextJailCard from '@/components/ContextComponents/ContextJailCard';

const caveat = Caveat({
  weight: ['400', '700'],
  subsets: ['latin'],
  display: 'swap',
});

interface HorizontalContextBarProps {
  selectedFilesCount: number;
}

const HorizontalContextBar = React.memo(({ selectedFilesCount }: HorizontalContextBarProps) => {
  const { contexts, groups, loading, loadProjectData, updateContext, moveContext } = useContextStore();
  const { activeProject } = useActiveProjectStore();
  const { showFullScreenModal } = useGlobalModal();
  const { isDetailOpen, selectedGroupId, closeGroupDetail, openGroupDetail } = useContextDetail();
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const lastProjectIdRef = useRef<string | null>(null);

  // DnD State
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  // Context Target Popup State
  const [targetQueue, setTargetQueue] = useState<StoreContext[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const hasCheckedTargets = useRef(false);

  useEffect(() => {
    if (!loading && contexts.length > 0 && !hasCheckedTargets.current) {
      const missingTargets = contexts.filter(ctx => !ctx.target || !ctx.target_fulfillment);
      if (missingTargets.length > 0) {
        setTargetQueue(missingTargets);
      }
      hasCheckedTargets.current = true;
    }
  }, [contexts, loading]);

  const handleSaveTarget = useCallback(async (id: string, target: string, fulfillment: string) => {
    await updateContext(id, { target, target_fulfillment: fulfillment });
    if (currentIndex < targetQueue.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setTargetQueue([]);
    }
  }, [currentIndex, targetQueue.length, updateContext]);

  const handleSkipTarget = useCallback(() => {
    if (currentIndex < targetQueue.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setTargetQueue([]);
    }
  }, [currentIndex, targetQueue.length]);

  const handleClosePopup = useCallback(() => {
    setTargetQueue([]);
    setCurrentIndex(0);
  }, []);

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

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 500, // 500ms hold to drag
        tolerance: 5, // 5px tolerance
      },
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setIsDragActive(true);
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveId(null);
    setIsDragActive(false);

    if (over && active.id !== over.id) {
      // Check if dropped on a group
      const contextId = active.id as string;
      const groupId = over.id as string;

      // Handle "Unsorted" group (synthetic-to-group)
      const targetGroupId = groupId === 'synthetic-to-group' ? null : groupId;

      try {
        await moveContext(contextId, targetGroupId);
      } catch (error) {
        console.error('Failed to move context:', error);
      }
    }
  }, [moveContext]);

  const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: '0.5',
        },
      },
    }),
  };

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
        {/* Target Popup - Positioned absolutely in upper center */}
        <AnimatePresence>
          {targetQueue.length > 0 && targetQueue[currentIndex] && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-[600px] px-4">
              <ContextTargetPopup
                context={targetQueue[currentIndex]}
                onSave={handleSaveTarget}
                onSkip={handleSkipTarget}
                onClose={handleClosePopup}
                queueLength={targetQueue.length}
                currentIndex={currentIndex}
              />
            </div>
          )}
        </AnimatePresence>

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
                    <motion.div
                      className="flex flex-col items-center justify-center py-32"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      <div className="relative mb-8 group cursor-pointer" onClick={() => setShowGroupModal(true)}>
                        <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full group-hover:bg-cyan-500/30 transition-colors duration-500" />
                        <div className="relative w-24 h-24 bg-black/50 border border-cyan-500/30 rounded-2xl flex items-center justify-center backdrop-blur-sm group-hover:scale-105 transition-transform duration-300">
                          <Plus className="w-10 h-10 text-cyan-400" />
                        </div>
                      </div>
                      <h3 className={`${caveat.className} text-3xl font-bold text-cyan-300 mb-2 tracking-wide`} style={{ textShadow: '0 0 15px rgba(34, 211, 238, 0.3)' }}>
                        Initialize Context Layer
                      </h3>
                      <p className="text-cyan-400/60 mb-8 text-center max-w-md font-mono text-sm">
                        Create your first context group to begin organizing your neural architecture.
                      </p>
                    </motion.div>
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