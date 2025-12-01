'use client';

import { useActiveProjectStore } from '@/stores/activeProjectStore';
import ConciergeWidget from './ConciergeWidget';

/**
 * Wrapper component that provides project context to ConciergeWidget.
 * This is used in the root layout to make the Concierge available globally.
 */
export default function ConciergeWidgetWrapper() {
  const { activeProject } = useActiveProjectStore();

  // Don't render if no project is selected
  if (!activeProject) {
    return null;
  }

  return (
    <ConciergeWidget
      projectId={activeProject.id}
      projectPath={activeProject.path}
      projectType={(activeProject.type as 'nextjs' | 'fastapi' | 'other') || 'other'}
      requesterName="Developer"
      requesterEmail=""
    />
  );
}
