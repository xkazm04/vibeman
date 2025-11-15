'use client';

import React, { useState } from 'react';
import ScreenshotTestEditor from './ScreenshotTestEditor';
import TestCaseStepsEditor from './TestCaseStepsEditor';

interface TestingTabProps {
  contextId: string;
  contextName: string;
  groupColor: string;
  testScenario: string | null;
  onTestScenarioChange: (value: string | null) => void;
  onPreviewUpdate?: (previewPath: string) => void;
}

export default function TestingTab({
  contextId,
  contextName,
  groupColor,
  testScenario,
  onTestScenarioChange,
  onPreviewUpdate,
}: TestingTabProps) {
  return (
    <div className="space-y-6">
      {/* Screenshot Test Section */}
      <div>
        <h3 className="text-sm font-mono text-gray-400 uppercase tracking-wider mb-3">
          Screenshot Test
        </h3>
        <ScreenshotTestEditor
          contextId={contextId}
          contextName={contextName}
          groupColor={groupColor}
          testScenario={testScenario}
          onTestScenarioChange={onTestScenarioChange}
          onPreviewUpdate={onPreviewUpdate}
        />
      </div>

      {/* Test Case Steps Section */}
      <div>
        <h3 className="text-sm font-mono text-gray-400 uppercase tracking-wider mb-3">
          Test Case Steps
        </h3>
        <TestCaseStepsEditor
          contextId={contextId}
          groupColor={groupColor}
        />
      </div>
    </div>
  );
}
