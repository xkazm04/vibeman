/**
 * Global keyboard shortcuts hook
 * Provides global keybindings for quick actions across the application
 */

import { useEffect } from 'react';
import { useOnboardingStore, type AppModule } from '@/stores/onboardingStore';
import { useServerProjectStore } from '@/stores/serverProjectStore';
import { useProjectConfigStore } from '@/stores/projectConfigStore';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  description: string;
  action: () => void;
}

export function useGlobalKeyboardShortcuts() {
  const {
    openBlueprint,
    closeBlueprint,
    isBlueprintOpen,
    toggleControlPanel,
    setActiveModule,
    activeModule
  } = useOnboardingStore();

  const {
    startServer,
    stopServer,
    processes,
    fetchStatuses
  } = useServerProjectStore();

  const { getActiveProject } = useProjectConfigStore();

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

      // Ctrl+I: Toggle Annette (Blueprint)
      if (e.ctrlKey && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        if (isBlueprintOpen) {
          closeBlueprint();
        } else {
          openBlueprint();
        }
        return;
      }

      // Ctrl+K: Toggle Control Panel
      if (e.ctrlKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggleControlPanel();
        return;
      }

      // Ctrl+S: Toggle Server (start/stop active project server)
      if (e.ctrlKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleToggleServer();
        return;
      }

      // Ctrl+R: Refresh server statuses
      if (e.ctrlKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        fetchStatuses();
        return;
      }

      // Ctrl+1-5: Quick navigation to modules
      if (e.ctrlKey && e.key >= '1' && e.key <= '5') {
        e.preventDefault();
        const modules: AppModule[] = ['coder', 'ideas', 'tinder', 'tasker', 'reflector'];
        const index = parseInt(e.key) - 1;
        if (index < modules.length) {
          setActiveModule(modules[index]);
        }
        return;
      }

      // Alt+Left/Right: Navigate between modules
      if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        const modules: AppModule[] = ['coder', 'ideas', 'tinder', 'tasker', 'reflector'];
        const currentIndex = modules.indexOf(activeModule);
        let newIndex = currentIndex;

        if (e.key === 'ArrowLeft') {
          newIndex = currentIndex > 0 ? currentIndex - 1 : modules.length - 1;
        } else {
          newIndex = currentIndex < modules.length - 1 ? currentIndex + 1 : 0;
        }

        setActiveModule(modules[newIndex]);
        return;
      }
    };

    const handleToggleServer = async () => {
      try {
        const activeProject = getActiveProject();
        if (!activeProject) {
          console.warn('[Keyboard Shortcuts] No active project found');
          return;
        }

        const processInfo = processes[activeProject.id];

        if (processInfo && processInfo.status === 'running') {
          // Stop the server
          await stopServer(activeProject.id);
          console.log('[Keyboard Shortcuts] Server stopped for:', activeProject.name);
        } else {
          // Start the server
          await startServer(activeProject.id);
          console.log('[Keyboard Shortcuts] Server started for:', activeProject.name);
        }
      } catch (error) {
        console.error('[Keyboard Shortcuts] Failed to toggle server:', error);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    openBlueprint,
    closeBlueprint,
    isBlueprintOpen,
    toggleControlPanel,
    setActiveModule,
    activeModule,
    startServer,
    stopServer,
    processes,
    fetchStatuses,
    getActiveProject
  ]);
}

/**
 * Get list of all available keyboard shortcuts
 */
export function getKeyboardShortcuts(): KeyboardShortcut[] {
  return [
    {
      key: 'I',
      ctrlKey: true,
      description: 'Toggle Annette AI Assistant',
      action: () => {},
    },
    {
      key: 'K',
      ctrlKey: true,
      description: 'Toggle Control Panel',
      action: () => {},
    },
    {
      key: 'S',
      ctrlKey: true,
      description: 'Toggle Server (Start/Stop)',
      action: () => {},
    },
    {
      key: 'R',
      ctrlKey: true,
      description: 'Refresh Server Status',
      action: () => {},
    },
    {
      key: '1-5',
      ctrlKey: true,
      description: 'Quick Navigate to Module',
      action: () => {},
    },
    {
      key: '←/→',
      altKey: true,
      description: 'Navigate Between Modules',
      action: () => {},
    },
    {
      key: '/',
      ctrlKey: true,
      description: 'Show Keyboard Shortcuts Help',
      action: () => {},
    },
  ];
}

/**
 * Format keyboard shortcut for display
 */
export function formatShortcut(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];

  if (shortcut.ctrlKey) parts.push('Ctrl');
  if (shortcut.altKey) parts.push('Alt');
  if (shortcut.shiftKey) parts.push('Shift');
  parts.push(shortcut.key);

  return parts.join('+');
}
