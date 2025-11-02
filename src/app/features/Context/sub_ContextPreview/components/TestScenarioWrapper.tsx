'use client';

import React, { useState } from 'react';
import TestScenarioEditor from './TestScenarioEditor';
import TestSelectorsPanel from './TestSelectorsPanel';

interface TestScenarioWrapperProps {
  contextId: string;
  contextName: string;
  groupColor: string;
  testScenario: string | null;
  onTestScenarioChange: (value: string | null) => void;
  onPreviewUpdate?: (previewPath: string) => void;
}

export default function TestScenarioWrapper({
  contextId,
  contextName,
  groupColor,
  testScenario,
  onTestScenarioChange,
  onPreviewUpdate,
}: TestScenarioWrapperProps) {
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);

  const handleSelectorClick = (testId: string) => {
    setSelectedTestId(testId);
  };

  const handleStepFocus = (stepId: string | null) => {
    setActiveStepId(stepId);
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      <TestScenarioEditor
        value={testScenario || ''}
        onChange={onTestScenarioChange}
        groupColor={groupColor}
        contextId={contextId}
        onStepFocus={handleStepFocus}
        selectedTestId={selectedTestId}
        onTestIdConsumed={() => setSelectedTestId(null)}
        onPreviewUpdate={onPreviewUpdate}
      />
      <TestSelectorsPanel
        contextId={contextId}
        groupColor={groupColor}
        activeStepId={activeStepId}
        onSelectorClick={handleSelectorClick}
      />
    </div>
  );
}
