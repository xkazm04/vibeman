/**
 * Example: Creating Custom Themes
 *
 * This file demonstrates how to create custom themes for the UI DSL.
 * Copy and modify these examples to create your own themes.
 */

import { ThemeConfig, defaultTheme } from '../theme';

/**
 * Dark Mode Theme
 * High contrast dark theme with vibrant accent colors
 */
export const darkTheme: ThemeConfig = {
  ...defaultTheme,
  name: 'dark',

  variants: {
    pending: {
      bg: 'bg-black/60',
      border: 'border-gray-900/80',
      shadow: 'shadow-black/30',
      text: 'text-gray-100',
      hover: {
        bg: 'hover:bg-gray-950/80',
        border: 'hover:border-gray-800/80',
      },
    },

    accepted: {
      bg: 'bg-green-900/30',
      border: 'border-green-500/50',
      shadow: 'shadow-green-500/20',
      text: 'text-green-200',
      hover: {
        bg: 'hover:bg-green-900/50',
        border: 'hover:border-green-400/60',
      },
    },

    rejected: {
      bg: 'bg-red-900/30',
      border: 'border-red-500/50',
      shadow: 'shadow-red-500/20',
      text: 'text-red-200',
      hover: {
        bg: 'hover:bg-red-900/50',
        border: 'hover:border-red-400/60',
      },
    },

    implemented: {
      bg: 'bg-blue-900/30',
      border: 'border-blue-500/50',
      shadow: 'shadow-blue-500/20',
      text: 'text-blue-200',
      hover: {
        bg: 'hover:bg-blue-900/50',
        border: 'hover:border-blue-400/60',
      },
    },

    processing: {
      bg: 'bg-purple-900/40',
      border: 'border-purple-500/70',
      shadow: 'shadow-lg shadow-purple-500/60',
      text: 'text-purple-100',
      hover: {
        bg: 'hover:bg-purple-900/60',
      },
    },

    stickyNote: {
      bg: 'bg-gray-950/80',
      border: 'border-gray-800/60',
      shadow: 'shadow-2xl',
      hover: {
        shadow: 'hover:shadow-blue-500/20',
      },
    },
  },

  // Inherit badges and spacing from default theme
  badges: defaultTheme.badges,
  spacing: defaultTheme.spacing,
  animations: defaultTheme.animations,
};

/**
 * Light Mode Theme
 * Clean, minimal light theme
 */
export const lightTheme: ThemeConfig = {
  ...defaultTheme,
  name: 'light',

  variants: {
    pending: {
      bg: 'bg-white/80',
      border: 'border-gray-300',
      shadow: 'shadow-gray-200/50',
      text: 'text-gray-800',
      hover: {
        bg: 'hover:bg-gray-50',
        border: 'hover:border-gray-400',
      },
    },

    accepted: {
      bg: 'bg-green-50',
      border: 'border-green-300',
      shadow: 'shadow-green-200/30',
      text: 'text-green-800',
      hover: {
        bg: 'hover:bg-green-100',
        border: 'hover:border-green-400',
      },
    },

    rejected: {
      bg: 'bg-red-50',
      border: 'border-red-300',
      shadow: 'shadow-red-200/30',
      text: 'text-red-800',
      hover: {
        bg: 'hover:bg-red-100',
        border: 'hover:border-red-400',
      },
    },

    implemented: {
      bg: 'bg-blue-50',
      border: 'border-blue-300',
      shadow: 'shadow-blue-200/30',
      text: 'text-blue-800',
      hover: {
        bg: 'hover:bg-blue-100',
        border: 'hover:border-blue-400',
      },
    },

    processing: {
      bg: 'bg-amber-50',
      border: 'border-amber-400',
      shadow: 'shadow-lg shadow-amber-300/50',
      text: 'text-amber-900',
      hover: {
        bg: 'hover:bg-amber-100',
      },
    },

    stickyNote: {
      bg: 'bg-white',
      border: 'border-gray-200',
      shadow: 'shadow-lg',
      hover: {
        shadow: 'hover:shadow-xl',
      },
    },
  },

  badges: defaultTheme.badges,
  spacing: defaultTheme.spacing,
  animations: defaultTheme.animations,
};

/**
 * Neon Theme
 * Vibrant, high-energy theme with glowing effects
 */
export const neonTheme: ThemeConfig = {
  ...defaultTheme,
  name: 'neon',

  variants: {
    pending: {
      bg: 'bg-black/80',
      border: 'border-cyan-500/50',
      shadow: 'shadow-cyan-500/30',
      text: 'text-cyan-300',
      hover: {
        bg: 'hover:bg-black/90',
        border: 'hover:border-cyan-400/70',
        shadow: 'hover:shadow-cyan-400/50',
      },
    },

    accepted: {
      bg: 'bg-black/80',
      border: 'border-green-400/60',
      shadow: 'shadow-green-400/40',
      text: 'text-green-300',
      hover: {
        bg: 'hover:bg-black/90',
        border: 'hover:border-green-300/80',
        shadow: 'hover:shadow-green-300/60',
      },
    },

    rejected: {
      bg: 'bg-black/80',
      border: 'border-red-500/60',
      shadow: 'shadow-red-500/40',
      text: 'text-red-300',
      hover: {
        bg: 'hover:bg-black/90',
        border: 'hover:border-red-400/80',
        shadow: 'hover:shadow-red-400/60',
      },
    },

    implemented: {
      bg: 'bg-black/80',
      border: 'border-purple-500/60',
      shadow: 'shadow-purple-500/40',
      text: 'text-purple-300',
      hover: {
        bg: 'hover:bg-black/90',
        border: 'hover:border-purple-400/80',
        shadow: 'hover:shadow-purple-400/60',
      },
    },

    processing: {
      bg: 'bg-black/80',
      border: 'border-pink-500/70',
      shadow: 'shadow-lg shadow-pink-500/60',
      text: 'text-pink-300',
      hover: {
        bg: 'hover:bg-black/90',
        shadow: 'hover:shadow-xl hover:shadow-pink-400/80',
      },
    },

    stickyNote: {
      bg: 'bg-gray-950/90',
      border: 'border-cyan-500/40',
      shadow: 'shadow-xl shadow-cyan-500/30',
      hover: {
        shadow: 'hover:shadow-2xl hover:shadow-cyan-400/50',
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
        color: 'text-yellow-300',
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
        color: 'text-cyan-400',
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

    status: defaultTheme.badges.status,
  },

  spacing: defaultTheme.spacing,
  animations: defaultTheme.animations,
};

/**
 * Glassmorphism Theme
 * Modern glass-like effects with blur
 */
export const glassTheme: ThemeConfig = {
  ...defaultTheme,
  name: 'glass',

  variants: {
    pending: {
      bg: 'bg-white/5 backdrop-blur-md',
      border: 'border-white/10',
      shadow: 'shadow-black/20',
      text: 'text-gray-200',
      hover: {
        bg: 'hover:bg-white/10',
        border: 'hover:border-white/20',
      },
    },

    accepted: {
      bg: 'bg-green-500/10 backdrop-blur-md',
      border: 'border-green-400/20',
      shadow: 'shadow-green-500/20',
      text: 'text-green-300',
      hover: {
        bg: 'hover:bg-green-500/20',
        border: 'hover:border-green-400/30',
      },
    },

    rejected: {
      bg: 'bg-red-500/10 backdrop-blur-md',
      border: 'border-red-400/20',
      shadow: 'shadow-red-500/20',
      text: 'text-red-300',
      hover: {
        bg: 'hover:bg-red-500/20',
        border: 'hover:border-red-400/30',
      },
    },

    implemented: {
      bg: 'bg-blue-500/10 backdrop-blur-md',
      border: 'border-blue-400/20',
      shadow: 'shadow-blue-500/20',
      text: 'text-blue-300',
      hover: {
        bg: 'hover:bg-blue-500/20',
        border: 'hover:border-blue-400/30',
      },
    },

    processing: {
      bg: 'bg-yellow-500/15 backdrop-blur-md',
      border: 'border-yellow-400/30',
      shadow: 'shadow-lg shadow-yellow-500/30',
      text: 'text-yellow-200',
      hover: {
        bg: 'hover:bg-yellow-500/25',
      },
    },

    stickyNote: {
      bg: 'bg-white/5 backdrop-blur-lg',
      border: 'border-white/10',
      shadow: 'shadow-xl',
      hover: {
        shadow: 'hover:shadow-2xl',
        bg: 'hover:bg-white/10',
      },
    },
  },

  badges: defaultTheme.badges,
  spacing: defaultTheme.spacing,
  animations: defaultTheme.animations,
};

/**
 * How to use custom themes:
 *
 * 1. Import the theme:
 *    import { darkTheme } from '../lib/uiDsl/examples/customTheme.example';
 *
 * 2. Use in RenderComponent:
 *    <RenderComponent
 *      descriptor={stickyNoteDescriptor}
 *      context={{
 *        data: idea,
 *        theme: darkTheme,  // <- Use custom theme
 *        handlers: { onClick },
 *      }}
 *    />
 *
 * 3. Or create a theme switcher:
 *    const themes = { default: defaultTheme, dark: darkTheme, light: lightTheme };
 *    const [currentTheme, setCurrentTheme] = useState('default');
 *
 *    <RenderComponent
 *      descriptor={stickyNoteDescriptor}
 *      context={{ data: idea, theme: themes[currentTheme], handlers }}
 *    />
 */
