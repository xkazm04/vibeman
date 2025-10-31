'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AnnetteTheme } from './AnnettePanel';

interface VoiceVisualizerProps {
  isActive: boolean;
  theme: AnnetteTheme;
}

const THEME_WAVE_COLORS = {
  phantom: {
    bar: 'bg-gradient-to-t from-purple-600 via-purple-400 to-fuchsia-400',
    glow: 'shadow-purple-500/50',
  },
  midnight: {
    bar: 'bg-gradient-to-t from-blue-600 via-cyan-400 to-cyan-300',
    glow: 'shadow-cyan-500/50',
  },
  shadow: {
    bar: 'bg-gradient-to-t from-red-600 via-rose-400 to-pink-400',
    glow: 'shadow-red-500/50',
  },
};

export default function VoiceVisualizer({ isActive, theme }: VoiceVisualizerProps) {
  const colors = THEME_WAVE_COLORS[theme];
  const barCount = 7;

  // Generate random heights for bars (1-100%)
  const getRandomHeight = () => Math.floor(Math.random() * 70) + 30;

  return (
    <div className="flex items-end justify-center gap-0.5 h-8 w-10">
      {[...Array(barCount)].map((_, i) => {
        // Stagger the animation delays
        const delay = i * 0.08;

        return (
          <motion.div
            key={i}
            className={`w-1 rounded-full ${colors.bar} ${isActive ? colors.glow + ' shadow-md' : ''}`}
            initial={{ scaleY: 0.2 }}
            animate={{
              scaleY: isActive
                ? [
                    0.2,
                    Math.random() * 0.5 + 0.5,
                    Math.random() * 0.8 + 0.2,
                    Math.random() * 0.6 + 0.4,
                    0.2,
                  ]
                : 0.2,
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: 'easeInOut',
              delay,
              repeatType: 'reverse',
            }}
            style={{
              originY: 1,
              height: '100%',
            }}
          />
        );
      })}
    </div>
  );
}
