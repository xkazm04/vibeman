'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, X } from 'lucide-react';
import { StepperGroupToggle } from './Stepper';
import { TechniqueGroup } from '../lib/stepperConfig';

export interface StepperConfigPanelProps {
  groups: TechniqueGroup[];
  onToggle: (groupId: string, enabled: boolean) => void;
}

/**
 * Floating configuration panel for stepper technique groups
 */
export default function StepperConfigPanel({ groups, onToggle }: StepperConfigPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Toggle button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed top-6 right-6 z-50 p-3 bg-gray-900/90 backdrop-blur-xl border-2 border-cyan-500/50 rounded-xl shadow-lg shadow-cyan-500/20 hover:border-cyan-400/70 transition-all"
        data-testid="stepper-config-toggle-btn"
      >
        <Settings className="w-5 h-5 text-cyan-400" />
      </motion.button>

      {/* Config Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
              data-testid="stepper-config-backdrop"
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed top-0 right-0 h-full w-full max-w-md bg-gray-950/95 backdrop-blur-xl border-l-2 border-cyan-500/30 shadow-2xl z-[70] overflow-y-auto"
              data-testid="stepper-config-panel"
            >
              {/* Header */}
              <div className="sticky top-0 bg-gray-950/95 backdrop-blur-xl border-b border-cyan-500/20 p-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-cyan-300">Scan Configuration</h2>
                  <p className="text-sm text-gray-400 mt-1">
                    Enable or disable technique groups
                  </p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-gray-800/50 rounded-lg transition-colors"
                  data-testid="stepper-config-close-btn"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                <StepperGroupToggle groups={groups} onToggle={onToggle} />

                {/* Help text */}
                <div className="mt-6 p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                  <p className="text-xs text-cyan-300/80">
                    <strong>Tip:</strong> Disable groups you don't need to focus on specific techniques.
                    Changes apply immediately to the blueprint layout.
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
