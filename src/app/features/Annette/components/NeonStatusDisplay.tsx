'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnnetteTheme } from './AnnettePanel';

export type BotMoodState = 'idle' | 'listening' | 'speaking' | 'error';

interface NeonStatusDisplayProps {
  message: string;
  theme: AnnetteTheme;
  isSpeaking: boolean;
  isListening?: boolean;
  isError?: boolean;
  volume?: number; // 0-1 scale for audio volume
}

// Mood-based color configurations
const MOOD_COLORS = {
  idle: {
    primary: 'rgba(34, 197, 94, 0.8)', // green-500
    secondary: 'rgba(74, 222, 128, 0.6)', // green-400
    textColor: 'text-green-300',
    shadowColor: '#22c55e',
    glowIntensity: 0.5,
  },
  listening: {
    primary: 'rgba(59, 130, 246, 0.8)', // blue-500
    secondary: 'rgba(96, 165, 250, 0.6)', // blue-400
    textColor: 'text-blue-300',
    shadowColor: '#3b82f6',
    glowIntensity: 0.7,
  },
  speaking: {
    primary: 'rgba(249, 115, 22, 0.8)', // orange-500
    secondary: 'rgba(251, 146, 60, 0.6)', // orange-400
    textColor: 'text-orange-300',
    shadowColor: '#f97316',
    glowIntensity: 0.9,
  },
  error: {
    primary: 'rgba(239, 68, 68, 0.8)', // red-500
    secondary: 'rgba(248, 113, 113, 0.6)', // red-400
    textColor: 'text-red-300',
    shadowColor: '#ef4444',
    glowIntensity: 1.0,
  },
};

// Theme overlay colors (subtle tints)
const THEME_TINTS = {
  phantom: {
    overlay: 'rgba(168, 85, 247, 0.15)', // purple tint
    accentColor: '#a855f7',
  },
  midnight: {
    overlay: 'rgba(34, 211, 238, 0.15)', // cyan tint
    accentColor: '#22d3ee',
  },
  shadow: {
    overlay: 'rgba(248, 113, 113, 0.15)', // red tint
    accentColor: '#f87171',
  },
};

export default function NeonStatusDisplay({
  message,
  theme,
  isSpeaking,
  isListening = false,
  isError = false,
  volume = 0.5,
}: NeonStatusDisplayProps) {
  // Determine current mood state
  const moodState: BotMoodState = useMemo(() => {
    if (isError) return 'error';
    if (isSpeaking) return 'speaking';
    if (isListening) return 'listening';
    return 'idle';
  }, [isError, isSpeaking, isListening]);

  const moodColors = MOOD_COLORS[moodState];
  const themeTint = THEME_TINTS[theme];

  // Calculate dynamic glow intensity based on volume (when speaking)
  const dynamicGlowIntensity = useMemo(() => {
    if (moodState === 'speaking' && volume > 0) {
      // Volume ranges from 0-1, scale glow intensity from 0.6 to 1.2
      return 0.6 + (volume * 0.6);
    }
    return moodColors.glowIntensity;
  }, [moodState, volume, moodColors.glowIntensity]);

  // Animation speed varies by state
  const animationSpeed = useMemo(() => {
    switch (moodState) {
      case 'error': return 0.3; // Fast flashing
      case 'speaking': return 0.5 + (volume * 0.5); // Volume-dependent
      case 'listening': return 1.0; // Medium pulse
      case 'idle': return 2.0; // Slow, steady
      default: return 1.5;
    }
  }, [moodState, volume]);

  return (
    <div className="relative h-8 flex items-center overflow-hidden">
      {/* Background animated glow bars with mood-based colors */}
      <div className="absolute inset-0 flex items-center gap-2 opacity-20">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="h-1 w-8 rounded-full"
            style={{
              background: `linear-gradient(to right, ${moodColors.primary}, ${moodColors.secondary})`,
            }}
            animate={{
              opacity: moodState === 'idle'
                ? 0.3
                : [0.3, dynamicGlowIntensity, 0.3],
              scaleY: moodState === 'speaking'
                ? [1, 1.2 + (volume * 0.8), 1]
                : 1,
            }}
            transition={{
              duration: animationSpeed,
              repeat: Infinity,
              delay: i * 0.05,
              ease: moodState === 'error' ? 'linear' : 'easeInOut',
            }}
          />
        ))}
      </div>

      {/* Theme overlay gradient */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at center, ${themeTint.overlay}, transparent 70%)`,
        }}
        animate={{
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Message Text with Dynamic Neon Effect */}
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
              {/* Outer glow - animated based on mood */}
              <motion.span
                className={`absolute inset-0 blur-md ${moodColors.textColor} opacity-60`}
                style={{
                  textShadow: `0 0 ${20 * dynamicGlowIntensity}px ${moodColors.primary}, 0 0 ${40 * dynamicGlowIntensity}px ${moodColors.secondary}`,
                }}
                animate={{
                  opacity: moodState === 'error' ? [0.4, 0.8, 0.4] : 0.6,
                }}
                transition={{
                  duration: animationSpeed,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                {message}
              </motion.span>

              {/* Middle glow */}
              <motion.span
                className={`absolute inset-0 blur-sm ${moodColors.textColor} opacity-80`}
                style={{
                  textShadow: `0 0 ${10 * dynamicGlowIntensity}px ${moodColors.primary}`,
                }}
                animate={{
                  opacity: [0.7, 0.9, 0.7],
                }}
                transition={{
                  duration: animationSpeed * 1.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                {message}
              </motion.span>

              {/* Main text with dynamic shadow */}
              <motion.span
                className={`relative font-mono text-sm font-semibold tracking-wider ${moodColors.textColor}`}
                animate={{
                  textShadow: [
                    `0 0 ${8 * dynamicGlowIntensity}px ${moodColors.shadowColor}, 0 0 ${16 * dynamicGlowIntensity}px ${moodColors.primary}`,
                    `0 0 ${12 * dynamicGlowIntensity}px ${moodColors.shadowColor}, 0 0 ${24 * dynamicGlowIntensity}px ${moodColors.primary}`,
                    `0 0 ${8 * dynamicGlowIntensity}px ${moodColors.shadowColor}, 0 0 ${16 * dynamicGlowIntensity}px ${moodColors.primary}`,
                  ],
                }}
                transition={{
                  duration: animationSpeed,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                {message}
              </motion.span>
            </div>

            {/* Flickering effect when in error state */}
            {moodState === 'error' && (
              <motion.div
                className="absolute inset-0"
                animate={{
                  opacity: [0, 0.3, 0, 0.4, 0, 0.2, 0],
                }}
                transition={{
                  duration: 0.5,
                  repeat: Infinity,
                  times: [0, 0.1, 0.2, 0.3, 0.4, 0.6, 1],
                }}
              >
                <span className={`font-mono text-sm font-semibold tracking-wider ${moodColors.textColor}`}>
                  {message}
                </span>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Animated scan line - varies by mood state */}
      {(moodState === 'speaking' || moodState === 'listening') && (
        <motion.div
          className="absolute left-0 top-0 bottom-0 w-0.5 opacity-60"
          style={{
            background: `linear-gradient(to bottom, transparent, ${moodColors.primary}, transparent)`,
          }}
          animate={{
            left: ['0%', '100%'],
            opacity: [0.4, 0.8, 0.4],
          }}
          transition={{
            duration: moodState === 'speaking' ? 1.5 : 2.5,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      )}

      {/* Pulsing edge indicators for error state */}
      {moodState === 'error' && (
        <>
          <motion.div
            className="absolute left-0 top-0 bottom-0 w-1 rounded-r-full"
            style={{ backgroundColor: moodColors.primary }}
            animate={{
              opacity: [0.8, 0.3, 0.8],
              scaleY: [1, 0.6, 1],
            }}
            transition={{
              duration: 0.4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          <motion.div
            className="absolute right-0 top-0 bottom-0 w-1 rounded-l-full"
            style={{ backgroundColor: moodColors.primary }}
            animate={{
              opacity: [0.3, 0.8, 0.3],
              scaleY: [0.6, 1, 0.6],
            }}
            transition={{
              duration: 0.4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </>
      )}

      {/* Ambient particle effects when speaking (intensity based on volume) */}
      {moodState === 'speaking' && volume > 0.3 && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(Math.floor(volume * 5))].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full"
              style={{
                backgroundColor: moodColors.secondary,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                opacity: [0, 0.6, 0],
                scale: [0, 1.5, 0],
              }}
              transition={{
                duration: 0.8 + Math.random() * 0.4,
                repeat: Infinity,
                delay: Math.random() * 0.5,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
