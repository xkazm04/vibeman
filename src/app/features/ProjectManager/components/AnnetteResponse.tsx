'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { AnnetteState } from '../types';

interface AnnetteResponseProps {
  annetteState: AnnetteState;
  onDismiss: () => void;
}

const AnnetteResponse = React.memo(({ annetteState, onDismiss }: AnnetteResponseProps) => {
  return (
    <AnimatePresence>
      {annetteState.lastResponse && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="border-t border-gray-700/30 p-4 bg-gradient-to-r from-gray-800/30 via-slate-900/20 to-gray-800/30 backdrop-blur-sm"
        >
          <div className="flex items-start space-x-2">
            <Sparkles className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-300 leading-relaxed font-mono">
                {annetteState.lastResponse}
              </p>
              <button
                onClick={onDismiss}
                className="text-sm text-cyan-400 hover:text-cyan-300 mt-2 font-mono transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

AnnetteResponse.displayName = 'AnnetteResponse';

export default AnnetteResponse;