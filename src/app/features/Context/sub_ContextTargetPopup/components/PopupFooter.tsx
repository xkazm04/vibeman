/**
 * Popup Footer Component
 *
 * Contains skip and save action buttons
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Save, ArrowRight } from 'lucide-react';

interface PopupFooterProps {
  target: string;
  isSaving: boolean;
  onSkip: () => void;
  onSave: () => void;
}

export default function PopupFooter({ target, isSaving, onSkip, onSave }: PopupFooterProps) {
  const canSave = target.trim().length > 0 && !isSaving;

  return (
    <div className="relative p-4 bg-black/20 border-t border-white/5 flex items-center justify-between">
      <button
        onClick={onSkip}
        className="text-xs font-medium text-gray-500 hover:text-gray-300 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
      >
        Skip for now
      </button>

      <motion.button
        whileHover={{ scale: canSave ? 1.02 : 1 }}
        whileTap={{ scale: canSave ? 0.98 : 1 }}
        onClick={onSave}
        disabled={!canSave}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm shadow-lg transition-all ${
          !canSave
            ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
            : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-cyan-500/25 hover:shadow-cyan-500/40'
        }`}
        data-testid="save-context-target-btn"
      >
        {isSaving ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Saving...</span>
          </>
        ) : (
          <>
            <Save className="w-4 h-4" />
            <span>Save & Next</span>
            <ArrowRight className="w-4 h-4 opacity-70" />
          </>
        )}
      </motion.button>
    </div>
  );
}
