'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Upload, X } from 'lucide-react';

interface ContextPreviewHeaderProps {
  groupColor: string;
  currentPreview: string | null;
  isSaving: boolean;
  onRemove: () => void;
}

export default function ContextPreviewHeader({
  groupColor,
  currentPreview,
  isSaving,
  onRemove,
}: ContextPreviewHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <Upload className="w-5 h-5" style={{ color: groupColor }} />
        <h5 className="text-lg font-semibold text-gray-300 font-mono">
          Manage Preview & Testing
        </h5>
      </div>
      {currentPreview && (
        <motion.button
          onClick={onRemove}
          disabled={isSaving}
          className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-red-500/30"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <X className="w-3 h-3 inline-block mr-1" />
          Remove
        </motion.button>
      )}
    </div>
  );
}
