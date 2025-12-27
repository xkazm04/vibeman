'use client';

import React, { useState } from 'react';
import { Play, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import BatchSelectionModal from './BatchSelectionModal';
import { BatchId } from '@/app/features/TaskRunner/store/taskRunnerStore';

interface FeatureScanBatchSelectorProps {
  description: string;
  onStart: (batchId: BatchId) => Promise<void>;
  onCancel: () => void;
}

/**
 * FeatureScanBatchSelector with integrated footer buttons.
 * Renders description content and action buttons in a layout
 * that works with UniversalModal's content area.
 *
 * The buttons are rendered at the bottom with proper styling
 * to appear as a footer section within the content.
 */
export default function FeatureScanBatchSelector({
  description,
  onStart,
  onCancel,
}: FeatureScanBatchSelectorProps) {
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  const handleStartClick = () => {
    setShowBatchModal(true);
  };

  const handleBatchSelect = async (batchId: BatchId) => {
    setShowBatchModal(false);
    setIsExecuting(true);

    try {
      await onStart(batchId);
    } catch (error) {
      console.error('[FeatureScanBatchSelector] Execution failed:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleCancel = () => {
    setShowBatchModal(false);
    onCancel();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Description - scrollable area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="prose prose-invert max-w-none">
          <div className="text-sm text-gray-300 whitespace-pre-line">
            {description}
          </div>
        </div>
      </div>

      {/* Footer Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-4 mt-4 border-t border-slate-700/30">
        <motion.button
          onClick={handleCancel}
          disabled={isExecuting}
          whileHover={{ scale: isExecuting ? 1 : 1.02 }}
          whileTap={{ scale: isExecuting ? 1 : 0.98 }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all duration-200 bg-slate-700/60 hover:bg-slate-600/80 border-slate-600/50 hover:border-slate-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl font-medium text-sm"
          data-testid="feature-scan-cancel-btn"
        >
          <X className="w-4 h-4 text-slate-300" />
          <span className="text-slate-300 hover:text-white">Cancel</span>
        </motion.button>

        <motion.button
          onClick={handleStartClick}
          disabled={isExecuting}
          whileHover={{ scale: isExecuting ? 1 : 1.02 }}
          whileTap={{ scale: isExecuting ? 1 : 0.98 }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all duration-200 bg-gradient-to-r from-green-600/80 to-emerald-500/80 hover:from-green-500 hover:to-emerald-400 border-green-500/60 hover:border-green-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl font-medium text-sm"
          data-testid="feature-scan-start-btn"
        >
          {isExecuting ? (
            <Loader2 className="w-4 h-4 text-white animate-spin" />
          ) : (
            <Play className="w-4 h-4 text-white" />
          )}
          <span className="text-white">Select Batch & Start</span>
        </motion.button>
      </div>

      {/* Batch Selection Modal */}
      <BatchSelectionModal
        isOpen={showBatchModal}
        onSelect={handleBatchSelect}
        onCancel={() => setShowBatchModal(false)}
        title="Select Batch for Feature Scans"
        description="Choose which batch to run the feature scans in"
      />
    </div>
  );
}
