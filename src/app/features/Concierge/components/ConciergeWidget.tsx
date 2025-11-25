'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Maximize2 } from 'lucide-react';
import ConciergeInterface from './ConciergeInterface';

interface ConciergeWidgetProps {
  projectId: string;
  projectPath: string;
  projectType?: 'nextjs' | 'fastapi' | 'other';
  requesterName: string;
  requesterEmail?: string;
}

export default function ConciergeWidget(props: ConciergeWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full shadow-lg flex items-center justify-center z-50"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title="AI Code Concierge"
            data-testid="concierge-floating-btn"
          >
            <Sparkles className="w-6 h-6 text-white" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Widget Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={`fixed ${
              isFullscreen
                ? 'inset-0'
                : 'bottom-6 right-6 w-[500px] h-[600px]'
            } bg-gray-900/95 backdrop-blur-xl border border-gray-700/40 rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden`}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            data-testid="concierge-widget-panel"
          >
            {/* Widget Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/40 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-cyan-500/10">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <span className="font-semibold text-white">AI Code Concierge</span>
              </div>
              <div className="flex items-center space-x-2">
                <motion.button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="p-1.5 hover:bg-gray-700/40 rounded-lg transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  title={isFullscreen ? 'Minimize' : 'Maximize'}
                  data-testid="concierge-maximize-btn"
                >
                  <Maximize2 className="w-4 h-4 text-gray-400" />
                </motion.button>
                <motion.button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-gray-700/40 rounded-lg transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  title="Close"
                  data-testid="concierge-close-btn"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </motion.button>
              </div>
            </div>

            {/* Widget Content */}
            <div className="flex-1 overflow-hidden">
              <ConciergeInterface {...props} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
