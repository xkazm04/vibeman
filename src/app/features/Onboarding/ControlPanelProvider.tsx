'use client';

import { createContext, useContext, ReactNode, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ControlPanelButton from './components/ControlPanelButton';
import ControlPanel from './components/ControlPanel';
import BlueprintModal from './components/BlueprintModal';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useOnboardingAutoComplete } from './lib/useOnboardingConditions';
import { TOTAL_TASKS } from './sub_GettingStarted/lib/config';
import FrozenComponent from '@/components/FrozenComponent';

interface ControlPanelContextType {
  openBlueprint: () => void;
  closeBlueprint: () => void;
  isBlueprintOpen: boolean;
}

const ControlPanelContext = createContext<ControlPanelContextType>({
  openBlueprint: () => {},
  closeBlueprint: () => {},
  isBlueprintOpen: false,
});

export const useControlPanel = () => useContext(ControlPanelContext);

export default function ControlPanelProvider({ children }: { children: ReactNode }) {
  const {
    activeProjectId,
    getCompletedStepsForProject,
    isControlPanelOpen,
    isBlueprintOpen,
    toggleControlPanel,
    openBlueprint,
    closeBlueprint
  } = useOnboardingStore();

  useOnboardingAutoComplete();

  // Get completed tasks count for the active project
  const completedTasks = activeProjectId
    ? getCompletedStepsForProject(activeProjectId).length
    : 0;

  // Global keyboard shortcut: Ctrl+B to toggle Blueprint
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input, textarea, or contenteditable element
      const target = e.target as HTMLElement;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target.isContentEditable
      ) {
        return;
      }

      // Ctrl+B to toggle Blueprint
      if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        if (isBlueprintOpen) {
          closeBlueprint();
        } else {
          openBlueprint();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isBlueprintOpen, openBlueprint, closeBlueprint]);

  return (
    <ControlPanelContext.Provider value={{ openBlueprint, closeBlueprint, isBlueprintOpen }}>
      {/* Freeze main content when Blueprint is open for better performance */}
      <FrozenComponent shouldFreeze={isBlueprintOpen}>
        {children}
      </FrozenComponent>

      {/* Blueprint Button - Always visible in top left */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="fixed top-5 left-6 z-50"
      >
        <ControlPanelButton
          onClick={toggleControlPanel}
          tasksCompleted={completedTasks}
          totalTasks={TOTAL_TASKS}
          isOpen={isControlPanelOpen}
        />
      </motion.div>

      {/* Control Panel Drawer */}
      <ControlPanel
        isOpen={isControlPanelOpen}
        onClose={closeBlueprint}
        onOpenBlueprint={openBlueprint}
      />

      {/* Blueprint Modal */}
      <BlueprintModal
        isOpen={isBlueprintOpen}
        onClose={closeBlueprint}
      />
    </ControlPanelContext.Provider>
  );
}
