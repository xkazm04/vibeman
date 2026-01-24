'use client';

import { createContext, useContext, ReactNode, useEffect } from 'react';
import ControlPanel from './components/ControlPanel';
import BlueprintModal from './components/BlueprintModal';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useOnboardingAutoComplete } from './lib/useOnboardingConditions';
import FrozenComponent from '@/components/FrozenComponent';
import ShortcutsBar from '@/components/Navigation/ShortcutsBar';

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
    isControlPanelOpen,
    isBlueprintOpen,
    toggleControlPanel,
    openBlueprint,
    closeBlueprint
  } = useOnboardingStore();

  useOnboardingAutoComplete();

  // Global keyboard shortcut: Ctrl+B to toggle Blueprint
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        toggleControlPanel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleControlPanel]);

  return (
    <ControlPanelContext.Provider value={{ openBlueprint, closeBlueprint, isBlueprintOpen }}>
      <FrozenComponent shouldFreeze={isBlueprintOpen}>
        {children}
      </FrozenComponent>

      {/* Unified Shortcuts Bar */}
      <ShortcutsBar />

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
