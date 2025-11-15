'use client';

import { useState } from 'react';
import TestScenarioEditor from '@/app/features/Context/sub_ContextPreview/components/TestScenarioEditor';
import TestSelectorsPanel from '@/app/features/Context/sub_ContextPreview/components/TestSelectorsPanel';

interface ScreenshotTestEditorProps {
  contextId: string;
  contextName: string;
  groupColor: string;
  testScenario: string | null;
  onTestScenarioChange: (value: string | null) => void;
  onPreviewUpdate?: (previewPath: string) => void;
}

export default function ScreenshotTestEditor({
  contextId,
  contextName,
  groupColor,
  testScenario,
  onTestScenarioChange,
  onPreviewUpdate,
}: ScreenshotTestEditorProps) {
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
