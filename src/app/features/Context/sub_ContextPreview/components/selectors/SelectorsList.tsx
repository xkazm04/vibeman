'use client';

import React from 'react';
import { TestSelector } from '../../lib/types';
import SelectorItem from './SelectorItem';

interface SelectorsListProps {
  selectors: TestSelector[];
  activeStepId?: string | null;
  copiedId: string | null;
  deletingId: string | null;
  onSelectorClick?: (testId: string) => void;
  onCopy: (testId: string, selectorId: string) => void;
  onDelete: (selectorId: string, e: React.MouseEvent) => void;
}

export default function SelectorsList({
  selectors,
  activeStepId,
  copiedId,
  deletingId,
  onSelectorClick,
  onCopy,
  onDelete,
}: SelectorsListProps) {
  if (selectors.length === 0) {
    return (
      <div className="text-xs text-gray-500 text-center py-4 font-mono" data-testid="no-selectors">
        No test selectors found. Click &quot;Scan&quot; to discover them.
      </div>
    );
  }

  return (
    <div className="space-y-1 max-h-[600px] overflow-y-auto">
      {selectors.map((selector, index) => (
        <SelectorItem
          key={selector.id}
          selector={selector}
          index={index}
          activeStepId={activeStepId}
          copiedId={copiedId}
          deletingId={deletingId}
          onSelectorClick={onSelectorClick}
          onCopy={onCopy}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
