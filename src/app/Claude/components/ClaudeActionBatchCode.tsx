'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Play } from 'lucide-react';
import { Requirement } from '../lib/requirementApi';

interface ClaudeActionBatchCodeProps {
  requirements: Requirement[];
  disabled?: boolean;
  onBatchStart: (requirementNames: string[]) => void;
}

export default function ClaudeActionBatchCode({
  requirements,
  disabled = false,
  onBatchStart,
}: ClaudeActionBatchCodeProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleBatchCode = () => {
    console.log('[BatchCode] 🎯 Button clicked');

    // Get all requirements that are not running and not completed
    const eligibleReqs = requirements.filter(
      (r) => r.status !== 'running' && r.status !== 'completed'
    );

    if (eligibleReqs.length === 0) {
      console.warn('[BatchCode] ⚠️ No eligible requirements to run');
      return;
    }

    console.log(`[BatchCode] 📋 Queueing ${eligibleReqs.length} requirements`);

    // Queue all eligible requirements
    const requirementNames = eligibleReqs.map((r) => r.name);
    onBatchStart(requirementNames);

    // Show processing state briefly
    setIsProcessing(true);
    setTimeout(() => setIsProcessing(false), 1000);
  };

  // Count eligible requirements
  const eligibleCount = requirements.filter(
    (r) => r.status !== 'running' && r.status !== 'completed'
  ).length;

  // Check if any are running
  const hasRunning = requirements.some((r) => r.status === 'running');

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleBatchCode}
      disabled={isProcessing || disabled || eligibleCount === 0}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
        isProcessing || disabled || eligibleCount === 0
          ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
          : 'bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white shadow-lg'
      }`}
      title={
        eligibleCount === 0
          ? 'No requirements to run'
          : `Run all ${eligibleCount} requirement${eligibleCount > 1 ? 's' : ''} in sequence`
      }
    >
      {isProcessing ? (
        <>
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Queuing...</span>
        </>
      ) : (
        <>
          <Play className="w-3 h-3" />
          <span>Batch Code</span>
          {eligibleCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-teal-500/20 rounded text-[10px]">
              {eligibleCount}
            </span>
          )}
        </>
      )}
    </motion.button>
  );
}
