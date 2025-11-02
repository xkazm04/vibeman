'use client';

import React, { useState } from 'react';
import ContextPreviewHeader from './components/ContextPreviewHeader';
import ContextPreviewActions from './components/ContextPreviewActions';
import ImagePathInput from './ImagePathInput';
import PreviewDisplay from './components/PreviewDisplay';
import TestScenarioWrapper from './components/TestScenarioWrapper';

interface ContextPreviewManagerProps {
  contextId: string;
  currentPreview: string | null;
  currentTestScenario: string | null;
  contextName: string;
  groupColor: string;
  onPreviewUpdated: (newPreview: string | null, testScenario: string | null) => void;
}

export default function ContextPreviewManager({
  contextId,
  currentPreview,
  currentTestScenario,
  contextName,
  groupColor,
  onPreviewUpdated,
}: ContextPreviewManagerProps) {
  const [previewPath, setPreviewPath] = useState(currentPreview || '');
  const [testScenario, setTestScenario] = useState(currentTestScenario || '');
  const [isSaving, setIsSaving] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handlePreviewUpdate = (newPreviewPath: string) => {
    // Update local state to trigger re-render
    setPreviewPath(newPreviewPath);
    // Also notify parent component
    onPreviewUpdated(newPreviewPath, testScenario);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      onPreviewUpdated(
        previewPath.trim() || null,
        testScenario.trim() || null
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = (preview: string | null, testScenario: string | null) => {
    setPreviewPath('');
    setTestScenario('');
    onPreviewUpdated(preview, testScenario);
  };

  const hasChanges =
    previewPath !== (currentPreview || '') ||
    testScenario !== (currentTestScenario || '');

  return (
    <div className="p-4 rounded-xl bg-gradient-to-r from-gray-800/40 to-gray-700/40 backdrop-blur-sm border border-gray-600/30 space-y-3">
      <ContextPreviewHeader
        contextId={contextId}
        groupColor={groupColor}
        currentPreview={currentPreview}
        isSaving={isSaving}
        onPreviewUpdated={handleRemove}
      />

      <div className="space-y-3">
        <ImagePathInput
          value={previewPath}
          onChange={setPreviewPath}
          onImageError={() => setImageError(false)}
        />

        <PreviewDisplay
          previewPath={previewPath}
          contextName={contextName}
          imageError={imageError}
          onError={() => setImageError(true)}
        />

        {/* Testing Section - Scenario Editor and Selectors Panel */}
        <TestScenarioWrapper
          contextId={contextId}
          contextName={contextName}
          groupColor={groupColor}
          testScenario={testScenario}
          onTestScenarioChange={setTestScenario}
          onPreviewUpdate={handlePreviewUpdate}
        />

        {/* Action Buttons */}
        <ContextPreviewActions
          contextId={contextId}
          currentPreview={currentPreview}
          currentTestScenario={currentTestScenario}
          previewPath={previewPath}
          testScenario={testScenario}
          isSaving={isSaving}
          hasChanges={hasChanges}
          onSave={handleSave}
          onError={() => {}}
        />
      </div>
    </div>
  );
}
