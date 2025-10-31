'use client';

import { createContext, useContext, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ControlPanelButton from './components/ControlPanelButton';
import ControlPanel from './components/ControlPanel';
import BlueprintModal from './components/BlueprintModal';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useOnboardingAutoComplete } from './lib/useOnboardingConditions';

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
    completedSteps,
    isControlPanelOpen,
    isBlueprintOpen,
    toggleControlPanel,
    openBlueprint,
    closeBlueprint
  } = useOnboardingStore();

  useOnboardingAutoComplete();

  const completedTasks = completedSteps.length;
  const totalTasks = 5;

  return (
    <ControlPanelContext.Provider value={{ openBlueprint, closeBlueprint, isBlueprintOpen }}>
      {children}

      {/* Blueprint Button - Always visible in top left */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="fixed top-20 left-6 z-50"
      >
        <ControlPanelButton
          onClick={toggleControlPanel}
          tasksCompleted={completedTasks}
          totalTasks={totalTasks}
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
