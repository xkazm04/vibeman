'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnnetteTheme } from './AnnettePanel';

interface NeonStatusDisplayProps {
  message: string;
  theme: AnnetteTheme;
  isSpeaking: boolean;
}

const THEME_NEON_COLORS = {
  phantom: {
    textColor: 'text-purple-300',
    glowColor: 'rgba(168, 85, 247, 0.8)', // purple-400
    shadowColor: '#a855f7',
  },
  midnight: {
    textColor: 'text-cyan-300',
    glowColor: 'rgba(34, 211, 238, 0.8)', // cyan-400
    shadowColor: '#22d3ee',
  },
  shadow: {
    textColor: 'text-red-300',
    glowColor: 'rgba(248, 113, 113, 0.8)', // red-400
    shadowColor: '#f87171',
  },
};

export default function NeonStatusDisplay({
  message,
  theme,
  isSpeaking,
}: NeonStatusDisplayProps) {
  const colors = THEME_NEON_COLORS[theme];

  return (
    <div className="relative h-8 flex items-center overflow-hidden">
      {/* Background glow bars */}
      <div className="absolute inset-0 flex items-center gap-2 opacity-10">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className={`h-1 w-8 rounded-full bg-gradient-to-r ${
              theme === 'phantom'
                ? 'from-purple-500 to-fuchsia-500'
                : theme === 'midnight'
                ? 'from-cyan-500 to-blue-500'
                : 'from-red-500 to-pink-500'
            }`}
            animate={{
              opacity: isSpeaking ? [0.3, 0.8, 0.3] : 0.3,
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: i * 0.1,
            }}
          />
        ))}
      </div>

      {/* Message Text with Neon Effect */}
      <AnimatePresence mode="wait">
        {message && (
          <motion.div
            key={message}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="relative z-10"
          >
            {/* Glow layers for neon effect */}
            <div className="relative">
              {/* Outer glow */}
              <span
                className={`absolute inset-0 blur-md ${colors.textColor} opacity-60`}
                style={{
                  textShadow: `0 0 20px ${colors.glowColor}, 0 0 40px ${colors.glowColor}`,
                }}
              >
                {message}
              </span>

              {/* Middle glow */}
              <span
                className={`absolute inset-0 blur-sm ${colors.textColor} opacity-80`}
                style={{
                  textShadow: `0 0 10px ${colors.glowColor}`,
                }}
              >
                {message}
              </span>

              {/* Main text */}
              <motion.span
                className={`relative font-mono text-sm font-semibold tracking-wider ${colors.textColor}`}
                style={{
                  textShadow: `0 0 8px ${colors.shadowColor}, 0 0 16px ${colors.glowColor}`,
                }}
                animate={{
                  textShadow: isSpeaking
                    ? [
                        `0 0 8px ${colors.shadowColor}, 0 0 16px ${colors.glowColor}`,
                        `0 0 12px ${colors.shadowColor}, 0 0 24px ${colors.glowColor}`,
                        `0 0 8px ${colors.shadowColor}, 0 0 16px ${colors.glowColor}`,
                      ]
                    : `0 0 8px ${colors.shadowColor}, 0 0 16px ${colors.glowColor}`,
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                {message}
              </motion.span>
            </div>

            {/* Flickering effect when speaking */}
            {isSpeaking && (
              <motion.div
                className="absolute inset-0"
                animate={{
                  opacity: [0, 0.1, 0, 0.15, 0],
                }}
                transition={{
                  duration: 0.3,
                  repeat: Infinity,
                  repeatDelay: 2,
                }}
              >
                <span className={`font-mono text-sm font-semibold tracking-wider ${colors.textColor}`}>
                  {message}
                </span>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Animated scan line */}
      {isSpeaking && (
        <motion.div
          className={`absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-transparent via-${
            theme === 'phantom' ? 'purple' : theme === 'midnight' ? 'cyan' : 'red'
          }-400 to-transparent`}
          animate={{
            left: ['0%', '100%'],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      )}
    </div>
  );
}
