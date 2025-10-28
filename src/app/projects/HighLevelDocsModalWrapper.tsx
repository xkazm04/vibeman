import React from 'react';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { DefaultProviderStorage } from '@/lib/llm';
import { HighLevelDocsModal } from './ProjectAI/sub_ScanHigh';

interface HighLevelDocsModalWrapperProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Simplified wrapper for the redesigned High-Level Documentation modal.
 * This replaces AIProjectReviewModal with a focused, single-purpose component
 * that only handles high-level vision documentation (context/high.md).
 */
export default function HighLevelDocsModalWrapper({
  isOpen,
  onClose
}: HighLevelDocsModalWrapperProps) {
  const { activeProject } = useActiveProjectStore();
  const provider = DefaultProviderStorage.getDefaultProvider();

  if (!activeProject) {
    return null;
  }

  return (
    <HighLevelDocsModal
      isOpen={isOpen}
      onClose={onClose}
      projectId={activeProject.id}
      projectName={activeProject.name}
      projectPath={activeProject.path}
      provider={provider}
    />
  );
}
