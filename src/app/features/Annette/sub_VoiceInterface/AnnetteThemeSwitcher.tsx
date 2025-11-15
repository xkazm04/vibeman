'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Moon, Eclipse, Zap } from 'lucide-react';
import { useThemeStore, AppTheme, THEME_CONFIGS } from '@/stores/themeStore';

export type AnnetteTheme = AppTheme; // Re-export for backward compatibility

const THEME_ICONS = {
  phantom: Eclipse,
  midnight: Moon,
  shadow: Zap,
};

/**
 * Theme switcher for Annette voice interface
 * Displays three theme options in a vertical column layout
 * Now uses global theme store with localStorage persistence
 */
export default function AnnetteThemeSwitcher() {
  const { theme, setTheme } = useThemeStore();

  return (
    <div className="flex flex-col gap-1.5">
      {(Object.keys(THEME_CONFIGS) as AppTheme[]).map((themeKey) => {
        const config = THEME_CONFIGS[themeKey];
        const Icon = THEME_ICONS[themeKey];
        const isActive = theme === themeKey;

        return (
          <motion.button
            key={themeKey}
            onClick={() => setTheme(themeKey)}
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
