'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, X, Loader2 } from 'lucide-react';
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
    <div className="relative">
      {/* Top-right Action Buttons - positioned to align with modal header */}
      <div className="absolute -top-14 right-0 flex items-center gap-2 z-10">
        <motion.button
          onClick={handleCancel}
          title="Cancel"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          disabled={isExecuting}
          className="p-2.5 rounded-xl border transition-all duration-200 bg-slate-700/60 hover:bg-slate-600/80 border-slate-600/50 hover:border-slate-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          data-testid="feature-scan-cancel-btn"
          aria-label="Cancel"
        >
          <X className="w-5 h-5 text-slate-300 hover:text-white" />
        </motion.button>

        <motion.button
          onClick={handleStartClick}
          title={isExecuting ? 'Starting...' : 'Select Batch & Start'}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          disabled={isExecuting}
          className="p-2.5 rounded-xl border transition-all duration-200 bg-gradient-to-r from-green-600/80 to-emerald-500/80 hover:from-green-500 hover:to-emerald-400 border-green-500/60 hover:border-green-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          data-testid="feature-scan-start-btn"
          aria-label={isExecuting ? 'Starting...' : 'Select Batch & Start'}
        >
          {isExecuting ? (
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          ) : (
            <Play className="w-5 h-5 text-white" />
          )}
        </motion.button>
      </div>

      {/* Description */}
      <div className="prose prose-invert max-w-none">
        <div className="text-sm text-gray-300 whitespace-pre-line">
          {description}
        </div>
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
