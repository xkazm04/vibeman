'use client';

import { useState } from 'react';
import ContextPreviewHeader from './components/ContextPreviewHeader';
import ContextPreviewActions from './components/ContextPreviewActions';
import ImagePathInput from './ImagePathInput';
import PreviewDisplay from './components/PreviewDisplay';

interface ContextPreviewManagerProps {
  contextId: string;
  currentPreview: string | null;
  currentTestScenario: string | null;
  currentTarget?: string | null;
  currentTargetFulfillment?: string | null;
  contextName: string;
  groupColor: string;
  onPreviewUpdated: (newPreview: string | null, testScenario: string | null, target?: string | null, targetFulfillment?: string | null) => void;
}

export default function ContextPreviewManager({
  contextId,
  currentPreview,
  currentTestScenario,
  currentTarget,
  currentTargetFulfillment,
  contextName,
  groupColor,
  onPreviewUpdated,
}: ContextPreviewManagerProps) {
  const [previewPath, setPreviewPath] = useState(currentPreview || '');
  const [testScenario, setTestScenario] = useState(currentTestScenario || '');
  const [target, setTarget] = useState(currentTarget || '');
  const [targetFulfillment, setTargetFulfillment] = useState(currentTargetFulfillment || '');
  const [isSaving, setIsSaving] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      onPreviewUpdated(
        previewPath.trim() || null,
        testScenario.trim() || null,
        target.trim() || null,
        targetFulfillment.trim() || null
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
    testScenario !== (currentTestScenario || '') ||
    target !== (currentTarget || '') ||
    targetFulfillment !== (currentTargetFulfillment || '');

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

        {/* Target Section */}
        <div className="space-y-2">
          <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider">
            Target / Goal
          </label>
          <textarea
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="Describe the target functionality or goal of this context..."
            className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded-lg text-sm text-gray-300 font-mono placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all resize-y min-h-[60px]"
            data-testid="context-target-input"
          />
        </div>

        {/* Target Fulfillment Section */}
        <div className="space-y-2">
          <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider">
            Target Fulfillment / Progress
          </label>
          <textarea
            value={targetFulfillment}
            onChange={(e) => setTargetFulfillment(e.target.value)}
            placeholder="Describe the current progress toward the target..."
            className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded-lg text-sm text-gray-300 font-mono placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all resize-y min-h-[60px]"
            data-testid="context-target-fulfillment-input"
          />
        </div>

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
