'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Save, Loader2 } from 'lucide-react';
import ContextPreviewHeader from './ContextPreviewHeader';
import ImagePathInput from './ImagePathInput';
import PreviewDisplay from './PreviewDisplay';
import TestScenarioEditor from './TestScenarioEditor';
import TestSelectorsPanel from './TestSelectorsPanel';

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
  const [error, setError] = useState('');
  const [imageError, setImageError] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    setError('');

    try {
      const response = await fetch('/api/contexts/preview', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contextId,
          preview: previewPath.trim() || null,
          testScenario: testScenario.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update preview');
      }

      onPreviewUpdated(
        previewPath.trim() || null,
        testScenario.trim() || null
      );
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update preview');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async () => {
    setPreviewPath('');
    setTestScenario('');
    setIsSaving(true);
    setError('');

    try {
      const response = await fetch('/api/contexts/preview', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contextId,
          preview: null,
          testScenario: null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove preview');
      }

      onPreviewUpdated(null, null);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove preview');
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges =
    previewPath !== (currentPreview || '') ||
    testScenario !== (currentTestScenario || '');

  return (
    <div className="p-4 rounded-xl bg-gradient-to-r from-gray-800/40 to-gray-700/40 backdrop-blur-sm border border-gray-600/30 space-y-3">
      <ContextPreviewHeader
        groupColor={groupColor}
        currentPreview={currentPreview}
        isSaving={isSaving}
        onRemove={handleRemove}
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
        <div className="grid grid-cols-2 gap-3">
          <TestScenarioEditor
            value={testScenario}
            onChange={setTestScenario}
            groupColor={groupColor}
            contextId={contextId}
          />
          <TestSelectorsPanel
            contextId={contextId}
            groupColor={groupColor}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex-1">
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-red-400 font-mono"
              >
                {error}
              </motion.p>
            )}
          </div>
          <motion.button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 rounded-lg hover:from-cyan-500/30 hover:to-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium border border-cyan-500/30"
            whileHover={{ scale: hasChanges && !isSaving ? 1.05 : 1 }}
            whileTap={{ scale: hasChanges && !isSaving ? 0.95 : 1 }}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </>
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
