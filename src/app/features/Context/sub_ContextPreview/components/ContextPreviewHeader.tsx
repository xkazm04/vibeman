'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Upload, X } from 'lucide-react';

interface ContextPreviewHeaderProps {
  contextId: string;
  groupColor: string;
  currentPreview: string | null;
  isSaving: boolean;
  onPreviewUpdated: (preview: string | null, testScenario: string | null) => void;
}

export default function ContextPreviewHeader({
  contextId,
  groupColor,
  currentPreview,
  isSaving,
  onPreviewUpdated,
}: ContextPreviewHeaderProps) {
  const [removing, setRemoving] = React.useState(false);

  const handleRemove = async () => {
    setRemoving(true);

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
    } catch {
      // Silently handle error
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <Upload className="w-5 h-5" style={{ color: groupColor }} />
        <h5 className="text-lg font-semibold text-gray-300 font-mono">
          Preview
        </h5>
      </div>
      {currentPreview && (
        <motion.button
          onClick={handleRemove}
          disabled={isSaving || removing}
          className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-red-500/30"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          data-testid="context-preview-remove-btn"
        >
          <X className="w-3 h-3 inline-block mr-1" />
          Remove
        </motion.button>
      )}
    </div>
  );
}
