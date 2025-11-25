'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Layers, Zap } from 'lucide-react';
import { BatchId } from '@/app/features/TaskRunner/store/taskRunnerStore';

interface BatchSelectionModalProps {
  isOpen: boolean;
  onSelect: (batchId: BatchId) => void;
  onCancel: () => void;
  title?: string;
  description?: string;
}

const BATCH_OPTIONS: { id: BatchId; label: string; color: string }[] = [
  { id: 'batch1', label: 'Batch 1', color: 'cyan' },
  { id: 'batch2', label: 'Batch 2', color: 'purple' },
  { id: 'batch3', label: 'Batch 3', color: 'emerald' },
  { id: 'batch4', label: 'Batch 4', color: 'amber' },
];

const COLOR_CLASSES = {
  cyan: {
    border: 'border-cyan-500/40',
    hoverBorder: 'hover:border-cyan-400/80',
    bg: 'bg-cyan-500/10',
    hoverBg: 'hover:bg-cyan-500/20',
    text: 'text-cyan-400',
    glow: 'shadow-cyan-500/20',
  },
  purple: {
    border: 'border-purple-500/40',
    hoverBorder: 'hover:border-purple-400/80',
    bg: 'bg-purple-500/10',
    hoverBg: 'hover:bg-purple-500/20',
    text: 'text-purple-400',
    glow: 'shadow-purple-500/20',
  },
  emerald: {
    border: 'border-emerald-500/40',
    hoverBorder: 'hover:border-emerald-400/80',
    bg: 'bg-emerald-500/10',
    hoverBg: 'hover:bg-emerald-500/20',
    text: 'text-emerald-400',
    glow: 'shadow-emerald-500/20',
  },
  amber: {
    border: 'border-amber-500/40',
    hoverBorder: 'hover:border-amber-400/80',
    bg: 'bg-amber-500/10',
    hoverBg: 'hover:bg-amber-500/20',
    text: 'text-amber-400',
    glow: 'shadow-amber-500/20',
  },
};

export default function BatchSelectionModal({
  isOpen,
  onSelect,
  onCancel,
  title = 'Select Batch',
  description = 'Choose which batch to execute tasks in',
}: BatchSelectionModalProps) {
  const handleSelect = (batchId: BatchId) => {
    onSelect(batchId);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            onClick={onCancel}
          />

          {/* Modal Container */}
          <div className="fixed inset-0 flex items-center justify-center z-[101] pointer-events-none">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{
                type: 'spring',
                damping: 25,
                stiffness: 300,
              }}
              className="w-full max-w-md mx-4 pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="relative px-6 py-5 border-b border-white/10">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
                        <Layers className="w-5 h-5 text-cyan-400" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-white">{title}</h2>
                        <p className="text-sm text-gray-400 mt-0.5">{description}</p>
                      </div>
                    </div>
                    <motion.button
                      onClick={onCancel}
                      whileHover={{ scale: 1.1, rotate: 90 }}
                      whileTap={{ scale: 0.9 }}
                      className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-400 hover:text-gray-300" />
                    </motion.button>
                  </div>
                </div>

                {/* Batch Selection Grid */}
                <div className="p-6">
                  <div className="grid grid-cols-2 gap-3">
                    {BATCH_OPTIONS.map((batch, index) => {
                      const colorClasses = COLOR_CLASSES[batch.color as keyof typeof COLOR_CLASSES];
                      return (
                        <motion.button
                          key={batch.id}
                          onClick={() => handleSelect(batch.id)}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          whileHover={{ scale: 1.02, y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          className={`
                            relative p-6 rounded-xl border-2 transition-all duration-200
                            ${colorClasses.border} ${colorClasses.hoverBorder}
                            ${colorClasses.bg} ${colorClasses.hoverBg}
                            shadow-lg hover:shadow-xl ${colorClasses.glow}
                          `}
                          data-testid={`batch-select-${batch.id}`}
                        >
                          {/* Batch Number */}
                          <div className="flex flex-col items-center gap-3">
                            <div className={`
                              w-12 h-12 rounded-full border-2 flex items-center justify-center
                              ${colorClasses.border} ${colorClasses.bg}
                            `}>
                              <Zap className={`w-6 h-6 ${colorClasses.text}`} />
                            </div>
                            <div className="text-center">
                              <div className={`text-lg font-bold ${colorClasses.text}`}>
                                {batch.label}
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                Execute here
                              </div>
                            </div>
                          </div>

                          {/* Hover glow effect */}
                          <div className={`
                            absolute inset-0 rounded-xl opacity-0 hover:opacity-100 transition-opacity duration-200
                            bg-gradient-to-br from-white/5 to-transparent
                          `} />
                        </motion.button>
                      );
                    })}
                  </div>

                  {/* Info Text */}
                  <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <p className="text-sm text-blue-300/80">
                      <strong className="text-blue-400">Tip:</strong> Tasks will be added to the selected batch and executed in parallel with other batches.
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-800/50 border-t border-white/5 flex justify-end">
                  <button
                    onClick={onCancel}
                    className="px-4 py-2 text-sm text-gray-400 hover:text-gray-300 hover:bg-white/5 rounded-lg transition-colors"
                    data-testid="batch-select-cancel"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
