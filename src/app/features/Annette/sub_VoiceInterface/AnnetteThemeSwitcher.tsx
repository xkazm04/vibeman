'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Moon, Eclipse, Zap } from 'lucide-react';

export type AnnetteTheme = 'phantom' | 'midnight' | 'shadow';

// Theme configurations
export const THEME_CONFIGS = {
  phantom: {
    name: 'Phantom Frequency',
    icon: Eclipse,
    colors: {
      primary: 'from-purple-500 via-violet-500 to-fuchsia-500',
      glow: 'shadow-purple-500/50',
      text: 'text-purple-300',
      border: 'border-purple-500/30',
      bg: 'bg-purple-500/10',
    },
  },
  midnight: {
    name: 'Midnight Pulse',
    icon: Moon,
    colors: {
      primary: 'from-blue-600 via-cyan-500 to-blue-400',
      glow: 'shadow-cyan-500/50',
      text: 'text-cyan-300',
      border: 'border-cyan-500/30',
      bg: 'bg-cyan-500/10',
    },
  },
  shadow: {
    name: 'Shadow Nexus',
    icon: Zap,
    colors: {
      primary: 'from-red-600 via-rose-500 to-pink-500',
      glow: 'shadow-red-500/50',
      text: 'text-red-300',
      border: 'border-red-500/30',
      bg: 'bg-red-500/10',
    },
  },
};

interface AnnetteThemeSwitcherProps {
  theme: AnnetteTheme;
  onThemeChange: (theme: AnnetteTheme) => void;
}

/**
 * Theme switcher for Annette voice interface
 * Displays three theme options in a vertical column layout
 */
export default function AnnetteThemeSwitcher({ theme, onThemeChange }: AnnetteThemeSwitcherProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {(Object.keys(THEME_CONFIGS) as AnnetteTheme[]).map((themeKey) => {
        const config = THEME_CONFIGS[themeKey];
        const Icon = config.icon;
        const isActive = theme === themeKey;

        return (
          <motion.button
            key={themeKey}
            onClick={() => onThemeChange(themeKey)}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.95 }}
            className={`relative p-1.5 rounded-lg transition-all duration-300 ${
              isActive
                ? `${config.colors.bg} border ${config.colors.border}`
                : 'bg-gray-800/40 border border-gray-700/30 hover:bg-gray-700/50'
            }`}
            title={config.name}
            data-testid={`annette-theme-${themeKey}`}
          >
            <Icon
              className={`w-3.5 h-3.5 transition-colors ${
                isActive ? config.colors.text : 'text-gray-500'
              }`}
            />

            {/* Active indicator glow */}
            {isActive && (
              <motion.div
                className={`absolute inset-0 rounded-lg blur-sm ${config.colors.glow} -z-10`}
                animate={{
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
