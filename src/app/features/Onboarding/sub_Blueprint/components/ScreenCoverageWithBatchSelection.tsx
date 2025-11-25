'use client';

import React, { useState } from 'react';
import ContextSelectionList from './ContextSelectionList';
import BatchSelectionModal from './BatchSelectionModal';
import { BatchId } from '@/app/features/TaskRunner/store/taskRunnerStore';

interface ScreenCoverageWithBatchSelectionProps {
  contexts: Array<{
    id: string;
    name: string;
    description: string | null;
    filePaths: string[];
    groupName?: string;
  }>;
  onExecute: (selectedContextIds: string[], batchId: BatchId) => Promise<void>;
  onCancel: () => void;
}

export default function ScreenCoverageWithBatchSelection({
  contexts,
  onExecute,
  onCancel,
}: ScreenCoverageWithBatchSelectionProps) {
  const [selectedContextIds, setSelectedContextIds] = useState<string[]>(
    contexts.map((c) => c.id) // Default: all selected
  );
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  const handleGenerateClick = async () => {
    if (selectedContextIds.length === 0) {
      // ContextSelectionList's onAccept will handle the toast
      return;
    }
    // Show batch selection modal
    setShowBatchModal(true);
  };

  const handleBatchSelect = async (batchId: BatchId) => {
    setShowBatchModal(false);
    setIsExecuting(true);

    try {
      await onExecute(selectedContextIds, batchId);
    } catch (error) {
      console.error('[ScreenCoverageWithBatchSelection] Execution failed:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <>
      <ContextSelectionList
        contexts={contexts}
        onSelectionChange={setSelectedContextIds}
        onAccept={handleGenerateClick}
        onCancel={onCancel}
      />

      <BatchSelectionModal
        isOpen={showBatchModal}
        onSelect={handleBatchSelect}
        onCancel={() => setShowBatchModal(false)}
        title="Select Batch for Screen Coverage"
        description="Choose which batch to run the screen coverage tasks in"
      />
    </>
  );
}
