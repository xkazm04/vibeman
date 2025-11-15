/**
 * Theme Store
 *
 * Global theme management for Annette and Blueprint modules.
 * Persists theme selection to localStorage for continuity across sessions.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AppTheme = 'phantom' | 'midnight' | 'shadow';

/**
 * Theme color configuration
 */
export interface ThemeColors {
  // Primary gradient (for backgrounds, glows)
  primary: string;
  primaryFrom: string;
  primaryVia: string;
  primaryTo: string;

  // Base color (hex for dynamic styles)
  baseColor: string;

  // Text colors
  text: string;
  textLight: string;
  textDark: string;

  // Border colors
  border: string;
  borderLight: string;
  borderHover: string;

  // Background colors
  bg: string;
  bgLight: string;
  bgHover: string;

  // Shadow/glow colors
  glow: string;
  shadow: string;

  // Accent colors (for badges, indicators)
  accent: string;
  accentLight: string;
  accentDark: string;
}

/**
 * Theme configuration with metadata
 */
export interface ThemeConfig {
  name: string;
  icon: string; // Icon name for UI
  colors: ThemeColors;
}

/**
 * Available theme configurations
 */
export const THEME_CONFIGS: Record<AppTheme, ThemeConfig> = {
  phantom: {
    name: 'Phantom Frequency',
    icon: 'Eclipse',
    colors: {
      primary: 'from-purple-500 via-violet-500 to-fuchsia-500',
      primaryFrom: 'from-purple-500',
      primaryVia: 'via-violet-500',
      primaryTo: 'to-fuchsia-500',
      baseColor: '#a855f7', // purple-500
      text: 'text-purple-300',
      textLight: 'text-purple-200',
      textDark: 'text-purple-400',
      border: 'border-purple-500/30',
      borderLight: 'border-purple-500/20',
      borderHover: 'border-purple-500/50',
      bg: 'bg-purple-500/10',
      bgLight: 'bg-purple-500/5',
      bgHover: 'bg-purple-500/20',
      glow: 'shadow-purple-500/50',
      shadow: 'shadow-lg shadow-purple-500/20',
      accent: 'bg-purple-400',
      accentLight: 'bg-purple-300',
      accentDark: 'bg-purple-500',
    },
  },
  midnight: {
    name: 'Midnight Pulse',
    icon: 'Moon',
    colors: {
      primary: 'from-blue-600 via-cyan-500 to-blue-400',
      primaryFrom: 'from-blue-600',
      primaryVia: 'via-cyan-500',
      primaryTo: 'to-blue-400',
      baseColor: '#06b6d4', // cyan-500
      text: 'text-cyan-300',
      textLight: 'text-cyan-200',
      textDark: 'text-cyan-400',
      border: 'border-cyan-500/30',
      borderLight: 'border-cyan-500/20',
      borderHover: 'border-cyan-500/50',
      bg: 'bg-cyan-500/10',
      bgLight: 'bg-cyan-500/5',
      bgHover: 'bg-cyan-500/20',
      glow: 'shadow-cyan-500/50',
      shadow: 'shadow-lg shadow-cyan-500/20',
      accent: 'bg-cyan-400',
      accentLight: 'bg-cyan-300',
      accentDark: 'bg-cyan-500',
    },
  },
  shadow: {
    name: 'Shadow Nexus',
    icon: 'Zap',
    colors: {
      primary: 'from-red-600 via-rose-500 to-pink-500',
      primaryFrom: 'from-red-600',
      primaryVia: 'via-rose-500',
      primaryTo: 'to-pink-500',
      baseColor: '#f43f5e', // rose-500
      text: 'text-red-300',
      textLight: 'text-red-200',
      textDark: 'text-red-400',
      border: 'border-red-500/30',
      borderLight: 'border-red-500/20',
      borderHover: 'border-red-500/50',
      bg: 'bg-red-500/10',
      bgLight: 'bg-red-500/5',
      bgHover: 'bg-red-500/20',
      glow: 'shadow-red-500/50',
      shadow: 'shadow-lg shadow-red-500/20',
      accent: 'bg-red-400',
      accentLight: 'bg-red-300',
      accentDark: 'bg-red-500',
    },
  },
};

interface ThemeStore {
  theme: AppTheme;

  // Actions
  setTheme: (theme: AppTheme) => void;
  getThemeConfig: () => ThemeConfig;
  getThemeColors: () => ThemeColors;
}

/**
 * Global theme store with localStorage persistence
 */
export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: 'midnight', // Default theme

      setTheme: (theme: AppTheme) => {
        set({ theme });
      },

      getThemeConfig: () => {
        return THEME_CONFIGS[get().theme];
      },

      getThemeColors: () => {
        return THEME_CONFIGS[get().theme].colors;
      },
    }),
    {
      name: 'app-theme-storage',
    }
  )
);
