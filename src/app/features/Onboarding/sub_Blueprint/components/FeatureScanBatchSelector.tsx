'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, X } from 'lucide-react';
import BatchSelectionModal from './BatchSelectionModal';
import { BatchId } from '@/app/features/TaskRunner/store/taskRunnerStore';

interface FeatureScanBatchSelectorProps {
  description: string;
  onStart: (batchId: BatchId) => Promise<void>;
  onCancel: () => void;
}

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
    <div className="space-y-6">
      {/* Description */}
      <div className="prose prose-invert max-w-none">
        <div className="text-sm text-gray-300 whitespace-pre-line">
          {description}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-700">
        <motion.button
          onClick={handleCancel}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          disabled={isExecuting}
          className="px-4 py-2 text-sm text-gray-400 hover:text-gray-300 hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="feature-scan-cancel-btn"
        >
          <X className="w-4 h-4 inline-block mr-2" />
          Cancel
        </motion.button>

        <motion.button
          onClick={handleStartClick}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          disabled={isExecuting}
          className="px-5 py-2 text-sm bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          data-testid="feature-scan-start-btn"
        >
          <Play className="w-4 h-4" />
          {isExecuting ? 'Starting...' : 'Select Batch & Start'}
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
