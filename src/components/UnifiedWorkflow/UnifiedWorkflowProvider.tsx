'use client';

import { useEffect } from 'react';
import CommandPalette from '../CommandPalette';
import { useNavigationShortcuts } from '@/hooks/useUnifiedNavigation';
import { useWorkflowStore } from '@/stores/workflowStore';
import { useOnboardingStore } from '@/stores/onboardingStore';

interface UnifiedWorkflowProviderProps {
  children: React.ReactNode;
}

/**
 * UnifiedWorkflowProvider wraps the app to provide:
 * - Command palette (Ctrl+K)
 * - Global keyboard shortcuts for navigation
 * - Workflow tracking and context awareness
 */
export default function UnifiedWorkflowProvider({ children }: UnifiedWorkflowProviderProps) {
  // Set up navigation keyboard shortcuts
  useNavigationShortcuts();

  const { activeModule } = useOnboardingStore();
  const { pushStep, generateSuggestions } = useWorkflowStore();

  // Track module changes in workflow history
  useEffect(() => {
    const { getModuleLabel } = require('@/stores/workflowStore');
    pushStep({
      module: activeModule,
      label: getModuleLabel(activeModule),
    });
    generateSuggestions(activeModule);
  }, [activeModule, pushStep, generateSuggestions]);

  return (
    <>
      {children}
      <CommandPalette />
    </>
  );
}
