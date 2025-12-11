'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { RawFeedback, EvaluatedFeedback } from '../lib/types';

interface AITypographyButtonProps {
  rawFeedback: RawFeedback[];
  onProcess: (
    rawFeedback: RawFeedback[],
    setEvaluatedFeedback: React.Dispatch<React.SetStateAction<EvaluatedFeedback[]>>,
    setRawFeedback: React.Dispatch<React.SetStateAction<RawFeedback[]>>
  ) => Promise<void>;
  setEvaluatedFeedback: React.Dispatch<React.SetStateAction<EvaluatedFeedback[]>>;
  setRawFeedback: React.Dispatch<React.SetStateAction<RawFeedback[]>>;
}

export default function AITypographyButton({
  rawFeedback,
  onProcess,
  setEvaluatedFeedback,
  setRawFeedback,
}: AITypographyButtonProps) {
  const [isProcessing, setIsProcessing] = React.useState(false);

  const handleClick = async () => {
    if (rawFeedback.length === 0 || isProcessing) return;

    setIsProcessing(true);
    await onProcess(rawFeedback, setEvaluatedFeedback, setRawFeedback);
    setIsProcessing(false);
  };

  const canProcess = rawFeedback.length > 0 && !isProcessing;

  return (
    <div className="flex items-center justify-center py-8">
      <div className="relative">
        {/* Glow effect */}
        <AnimatePresence>
          {canProcess && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute inset-0 blur-2xl"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600/30 via-blue-600/30 to-cyan-600/30 rounded-full" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main button */}
        <motion.button
          onClick={handleClick}
          disabled={!canProcess}
          className={`
            relative group cursor-pointer
            ${canProcess ? '' : 'cursor-not-allowed opacity-40'}
          `}
          whileHover={canProcess ? { scale: 1.05 } : {}}
          whileTap={canProcess ? { scale: 0.95 } : {}}
        >
          {/* Typography "AI" */}
          <div className="relative">
            <motion.div
              className="text-[120px] font-black leading-none tracking-tighter"
              style={{
                fontFamily: '"SF Pro Display", -apple-system, BlinkMacSystemFont, sans-serif',
                WebkitTextFillColor: 'transparent',
                WebkitTextStroke: '2px rgba(168, 85, 247, 0.4)',
                textShadow: canProcess
                  ? '0 0 40px rgba(168, 85, 247, 0.4), 0 0 80px rgba(59, 130, 246, 0.2)'
                  : 'none',
              }}
              animate={
                isProcessing
                  ? {
                      WebkitTextStroke: [
                        '2px rgba(168, 85, 247, 0.6)',
                        '2px rgba(59, 130, 246, 0.6)',
                        '2px rgba(168, 85, 247, 0.6)',
                      ],
                    }
                  : canProcess
                  ? {
                      textShadow: [
                        '0 0 40px rgba(168, 85, 247, 0.4), 0 0 80px rgba(59, 130, 246, 0.2)',
                        '0 0 60px rgba(168, 85, 247, 0.6), 0 0 100px rgba(59, 130, 246, 0.3)',
                        '0 0 40px rgba(168, 85, 247, 0.4), 0 0 80px rgba(59, 130, 246, 0.2)',
                      ],
                    }
                  : {}
              }
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              AI
            </motion.div>

            {/* Gradient fill on hover */}
            {canProcess && (
              <motion.div
                className="absolute inset-0 text-[120px] font-black leading-none tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  fontFamily: '"SF Pro Display", -apple-system, BlinkMacSystemFont, sans-serif',
                  background: 'linear-gradient(135deg, #a855f7 0%, #3b82f6 50%, #06b6d4 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundSize: '200% 200%',
                }}
                animate={{
                  backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              >
                AI
              </motion.div>
            )}

            {/* Processing overlay */}
            <AnimatePresence>
              {isProcessing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 text-[120px] font-black leading-none tracking-tighter"
                  style={{
                    fontFamily: '"SF Pro Display", -apple-system, BlinkMacSystemFont, sans-serif',
                    background: 'linear-gradient(90deg, #a855f7 0%, #3b82f6 50%, #a855f7 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundSize: '200% 100%',
                  }}
                  animate={{
                    backgroundPosition: ['0% 0%', '100% 0%', '0% 0%'],
                  }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                >
                  AI
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Scan lines effect when processing */}
          <AnimatePresence>
            {isProcessing && (
              <>
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-purple-400/30 to-transparent"
                    initial={{ top: '0%', opacity: 0 }}
                    animate={{
                      top: ['0%', '100%'],
                      opacity: [0, 0.8, 0],
                    }}
                    transition={{
                      duration: 2,
                      delay: i * 0.25,
                      repeat: Infinity,
                      ease: 'linear',
                    }}
                  />
                ))}
              </>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Status text */}
        <motion.div
          className="mt-6 text-center"
          animate={{ opacity: isProcessing ? 0.7 : 1 }}
        >
          <div className="text-sm font-medium text-gray-300">
            {isProcessing ? (
              <span className="flex items-center justify-center gap-2">
                <motion.span
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  Processing {rawFeedback.length} items
                </motion.span>
              </span>
            ) : rawFeedback.length > 0 ? (
              <span className="text-purple-300">
                Click to process {rawFeedback.length} {rawFeedback.length === 1 ? 'item' : 'items'}
              </span>
            ) : (
              <span className="text-gray-500">No items to process</span>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
