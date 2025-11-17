'use client';

import React, { useState } from 'react';
import FileSelectionGrid, { FileSelectionItem } from './FileSelectionGrid';

export interface UnusedFile {
  filePath: string;
  relativePath: string;
  exports: string[];
  reason: string;
}

export interface UnusedFileDecisionProps {
  unusedFiles: UnusedFile[];
  onSelectionChange?: (selections: Record<string, string>) => void;
}

/**
 * Simplified file selection component
 * Actions are now handled at title level via DecisionData
 */
export default function UnusedFileDecision({
  unusedFiles,
  onSelectionChange,
}: UnusedFileDecisionProps) {
  // Convert unusedFiles to FileSelectionItems
  const fileItems: FileSelectionItem[] = unusedFiles.map((file, index) => ({
    id: `file-${index}`,
    filePath: file.filePath,
    relativePath: file.relativePath,
    exports: file.exports,
    reason: file.reason,
  }));

  return (
    <div className="space-y-3" data-testid="unused-file-decision">
      {/* File Selection Grid */}
      <FileSelectionGrid
        files={fileItems}
        onSelectionChange={onSelectionChange}
        testId="unused-files-selection-grid"
      />
    </div>
  );
}
