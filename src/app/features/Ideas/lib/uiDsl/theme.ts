/**
 * Default Theme Configuration
 * Single source of truth for visual styling
 */

import { ThemeConfig } from './types';

export const defaultTheme: ThemeConfig = {
  name: 'default',

  variants: {
    // Status-based variants
    pending: {
      bg: 'bg-gray-700/20',
      border: 'border-gray-600/40',
      shadow: 'shadow-gray-500/5',
      text: 'text-gray-200',
      hover: {
        bg: 'hover:bg-gray-800/60',
        border: 'hover:border-gray-600/60',
      },
    },

    accepted: {
      bg: 'bg-green-500/10',
      border: 'border-green-500/30',
      shadow: 'shadow-green-500/10',
      text: 'text-green-300',
      hover: {
        bg: 'hover:bg-green-900/30',
        border: 'hover:border-green-600/50',
      },
    },

    rejected: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      shadow: 'shadow-red-500/10',
      text: 'text-red-300',
      hover: {
        bg: 'hover:bg-red-900/30',
        border: 'hover:border-red-600/50',
      },
    },

    implemented: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      shadow: 'shadow-amber-500/10',
      text: 'text-amber-300',
      hover: {
        bg: 'hover:bg-amber-900/30',
        border: 'hover:border-amber-600/50',
      },
    },

    processing: {
      bg: 'bg-yellow-900/30',
      border: 'border-yellow-500/70',
      shadow: 'shadow-lg shadow-yellow-500/50',
      text: 'text-yellow-200',
      hover: {
        bg: 'hover:bg-yellow-900/40',
      },
    },

    // Card-specific variants
    stickyNote: {
      bg: 'bg-gray-800/60',
      border: 'border-gray-700/40',
      shadow: 'shadow-xl',
      hover: {
        shadow: 'hover:shadow-2xl',
      },
    },
  },

  badges: {
    effort: {
      1: {
        label: 'Low',
        color: 'text-green-400',
        description: 'Quick fix, 1-2 hours',
      },
      2: {
        label: 'Med',
        color: 'text-yellow-400',
        description: 'Moderate change, 1-2 days',
      },
      3: {
        label: 'High',
        color: 'text-red-400',
        description: 'Major change, 1+ weeks',
      },
    },

    impact: {
      1: {
        label: 'Low',
        color: 'text-gray-400',
        description: 'Nice to have',
      },
      2: {
        label: 'Med',
        color: 'text-blue-400',
        description: 'Noticeable improvement',
      },
      3: {
        label: 'High',
        color: 'text-purple-400',
        description: 'Game changer',
      },
    },

    status: {
      pending: { label: 'Pending', color: 'text-gray-400' },
      accepted: { label: 'Accepted', color: 'text-green-400' },
      rejected: { label: 'Rejected', color: 'text-red-400' },
      implemented: { label: 'Implemented', color: 'text-amber-400' },
    },
  },

  spacing: {
    card: 'p-4',
    badge: 'px-2 py-0.5',
    gap: 'gap-2',
  },

  animations: {
    cardEntrance: {
      initial: { opacity: 0, y: 20, rotateZ: -2 },
      animate: { opacity: 1, y: 0, rotateZ: 0 },
      transition: {
        duration: 0.4,
        type: 'spring',
        stiffness: 200,
      },
    },

    cardHover: {
      whileHover: { rotateZ: 1, y: -4, scale: 1.02 },
      transition: {
        duration: 0.3,
      },
    },

    badgeEntrance: {
      initial: { scale: 0, rotate: -180 },
      animate: { scale: 1, rotate: 0 },
      transition: { duration: 0.5 },
    },
  },
};

/**
 * Helper to get variant styling
 */
export function getVariant(theme: ThemeConfig, variantName: string) {
  return theme.variants[variantName] || theme.variants.pending;
}

/**
 * Helper to get badge configuration
 */
export function getBadgeConfig(
  theme: ThemeConfig,
  type: 'effort' | 'impact' | 'status',
  value: number | string
) {
  return theme.badges[type][value as keyof typeof theme.badges[typeof type]];
}

/**
 * Helper to build Tailwind class string from variant
 */
export function buildVariantClasses(variant: ThemeConfig['variants'][string]): string {
  const classes = [variant.bg, variant.border, variant.shadow];

  if (variant.text) {
    classes.push(variant.text);
  }

  if (variant.hover?.bg) {
    classes.push(variant.hover.bg);
  }

  if (variant.hover?.border) {
    classes.push(variant.hover.border);
  }

  if (variant.hover?.shadow) {
    classes.push(variant.hover.shadow);
  }

  return classes.filter(Boolean).join(' ');
}
