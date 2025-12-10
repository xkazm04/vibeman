'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, Brain, Loader2 } from 'lucide-react';

interface AIProcessingButtonProps {
  isProcessing: boolean;
  pendingCount: number;
  onProcess: () => void;
  disabled?: boolean;
}

export default function AIProcessingButton({
  isProcessing,
  pendingCount,
  onProcess,
  disabled = false,
}: AIProcessingButtonProps) {
  const canProcess = pendingCount > 0 && !isProcessing && !disabled;

  return (
    <div className="flex flex-col items-center gap-4 py-6">
      {/* Neural network animation background */}
      <div className="relative">
        {/* Orbiting particles */}
        <AnimatePresence>
          {isProcessing && (
            <>
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 rounded-full bg-purple-400"
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{
                    opacity: [0, 1, 0],
                    scale: [0, 1, 0],
                    x: [0, Math.cos((i * Math.PI * 2) / 6) * 50],
                    y: [0, Math.sin((i * Math.PI * 2) / 6) * 50],
                  }}
                  exit={{ opacity: 0, scale: 0 }}
                  transition={{
                    duration: 1.5,
                    delay: i * 0.1,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  style={{
                    left: '50%',
                    top: '50%',
                    marginLeft: -4,
                    marginTop: -4,
                  }}
                />
              ))}
            </>
          )}
        </AnimatePresence>

        {/* Main button */}
        <motion.button
          onClick={onProcess}
          disabled={!canProcess}
          className={`
            relative z-10 flex items-center gap-3 px-8 py-4
            rounded-2xl font-medium text-lg
            transition-all duration-300
            ${canProcess
              ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/40 hover:scale-105'
              : 'bg-gray-800/50 text-gray-500 cursor-not-allowed'
            }
          `}
          whileHover={canProcess ? { scale: 1.05 } : {}}
          whileTap={canProcess ? { scale: 0.95 } : {}}
        >
          {/* Icon */}
          <AnimatePresence mode="wait">
            {isProcessing ? (
              <motion.div
                key="processing"
                initial={{ opacity: 0, rotate: -180 }}
                animate={{ opacity: 1, rotate: 0 }}
                exit={{ opacity: 0, rotate: 180 }}
              >
                <Brain className="w-6 h-6 animate-pulse" />
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
              >
                <Sparkles className="w-6 h-6" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Text */}
          <span>
            {isProcessing ? 'Processing...' : 'AI Process'}
          </span>

          {/* Arrow */}
          <AnimatePresence>
            {!isProcessing && canProcess && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
              >
                <ArrowRight className="w-5 h-5" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Loading spinner overlay */}
          <AnimatePresence>
            {isProcessing && (
              <motion.div
                className="absolute inset-0 flex items-center justify-center rounded-2xl bg-purple-600/20 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Loader2 className="w-8 h-8 animate-spin text-white" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Glow effect */}
          {canProcess && (
            <motion.div
              className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-600/50 to-blue-600/50 blur-xl -z-10"
              animate={{
                opacity: [0.5, 0.8, 0.5],
                scale: [1, 1.05, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          )}
        </motion.button>
      </div>

      {/* Status text */}
      <motion.p
        className="text-sm text-gray-400 text-center"
        animate={{ opacity: isProcessing ? 0.5 : 1 }}
      >
        {isProcessing ? (
          <span className="flex items-center gap-2">
            <motion.span
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              Analyzing feedback with AI
            </motion.span>
          </span>
        ) : pendingCount > 0 ? (
          `${pendingCount} items ready for processing`
        ) : (
          'No items to process'
        )}
      </motion.p>

      {/* Processing indicator lines */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div
            className="flex items-center gap-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="w-1 bg-purple-400 rounded-full"
                animate={{
                  height: [8, 24, 8],
                }}
                transition={{
                  duration: 0.5,
                  delay: i * 0.1,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
