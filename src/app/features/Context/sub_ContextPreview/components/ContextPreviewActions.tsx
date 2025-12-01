'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Save, Loader2 } from 'lucide-react';

interface ContextPreviewActionsProps {
  contextId: string;
  currentPreview: string | null;
  currentTestScenario: string | null;
  previewPath: string;
  testScenario: string;
  isSaving: boolean;
  hasChanges: boolean;
  onSave: () => Promise<void>;
  onError: (error: string) => void;
}

export default function ContextPreviewActions({
  contextId,
  currentPreview,
  currentTestScenario,
  previewPath,
  testScenario,
  isSaving,
  hasChanges,
  onSave,
  onError,
}: ContextPreviewActionsProps) {
  const [error, setError] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  const handleSave = async () => {
    setSaving(true);
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

      await onSave();
      setError('');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update preview';
      setError(errorMsg);
      onError(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  return (
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
        disabled={!hasChanges || saving || isSaving}
        className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 rounded-lg hover:from-cyan-500/30 hover:to-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium border border-cyan-500/30"
        whileHover={{ scale: hasChanges && !saving && !isSaving ? 1.05 : 1 }}
        whileTap={{ scale: hasChanges && !saving && !isSaving ? 0.95 : 1 }}
        data-testid="context-preview-save-btn"
      >
        {saving || isSaving ? (
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
  );
}
