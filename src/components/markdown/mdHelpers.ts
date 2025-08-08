import { motion, Variants } from 'framer-motion';
import { ReactNode } from 'react';
import { 
  Code, 
  Copy, 
  Check, 
  ExternalLink, 
  Quote, 
  List, 
  Hash,
  Bold,
  Italic,
  Link as LinkIcon,
  Image as ImageIcon,
  AlertCircle,
  Info,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

// Animation variants for premium micro-interactions
export const fadeInUp: Variants = {
  initial: { 
    opacity: 0, 
    y: 20,
    filter: 'blur(4px)'
  },
  animate: { 
    opacity: 1, 
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94]
    }
  },
  exit: { 
    opacity: 0, 
    y: -10,
    filter: 'blur(2px)',
    transition: { duration: 0.2 }
  }
};

export const staggerContainer: Variants = {
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
};

export const scaleOnHover: Variants = {
  initial: { scale: 1 },
  hover: { 
    scale: 1.02,
    transition: { 
      duration: 0.2,
      ease: 'easeOut'
    }
  },
  tap: { 
    scale: 0.98,
    transition: { duration: 0.1 }
  }
};

// Premium color schemes for different markdown elements
export const markdownTheme = {
  colors: {
    primary: {
      50: '#f0f9ff',
      100: '#e0f2fe',
      500: '#06b6d4',
      600: '#0891b2',
      700: '#0e7490',
      900: '#164e63'
    },
    accent: {
      50: '#fdf4ff',
      100: '#fae8ff',
      500: '#a855f7',
      600: '#9333ea',
      700: '#7c3aed',
      900: '#581c87'
    },
    success: {
      50: '#f0fdf4',
      100: '#dcfce7',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
      900: '#14532d'
    },
    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
      900: '#78350f'
    },
    error: {
      50: '#fef2f2',
      100: '#fee2e2',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
      900: '#7f1d1d'
    },
    neutral: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#e5e5e5',
      300: '#d4d4d4',
      400: '#a3a3a3',
      500: '#737373',
      600: '#525252',
      700: '#404040',
      800: '#262626',
      900: '#171717',
      950: '#0a0a0a'
    }
  },
  gradients: {
    primary: 'bg-gradient-to-br from-cyan-400 via-cyan-500 to-cyan-600',
    accent: 'bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600',
    success: 'bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600',
    warning: 'bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600',
    error: 'bg-gradient-to-br from-red-400 via-red-500 to-red-600',
    glass: 'bg-gradient-to-br from-white/10 via-white/5 to-transparent'
  },
  shadows: {
    soft: 'shadow-lg shadow-black/5',
    medium: 'shadow-xl shadow-black/10',
    strong: 'shadow-2xl shadow-black/20',
    glow: 'shadow-2xl shadow-cyan-500/20',
    glowPurple: 'shadow-2xl shadow-purple-500/20'
  }
} as const;

// Typography scale with premium font stacks
export const typography = {
  fontFamilies: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    mono: ['JetBrains Mono', 'Fira Code', 'Monaco', 'Consolas', 'monospace'],
    serif: ['Crimson Text', 'Georgia', 'serif']
  },
  scales: {
    xs: 'text-xs leading-4',
    sm: 'text-sm leading-5',
    base: 'text-base leading-6',
    lg: 'text-lg leading-7',
    xl: 'text-xl leading-8',
    '2xl': 'text-2xl leading-9',
    '3xl': 'text-3xl leading-10',
    '4xl': 'text-4xl leading-none',
    '5xl': 'text-5xl leading-none'
  }
} as const;

// Markdown element type definitions
export interface MarkdownElement {
  type: 'heading' | 'paragraph' | 'code' | 'blockquote' | 'list' | 'link' | 'image' | 'table';
  level?: number;
  content: string;
  language?: string;
  href?: string;
  alt?: string;
  children?: MarkdownElement[];
}

// Premium callout/alert types
export type CalloutType = 'info' | 'success' | 'warning' | 'error' | 'note';

export interface CalloutConfig {
  icon: ReactNode;
  bgColor: string;
  borderColor: string;
  textColor: string;
  iconColor: string;
  gradient: string;
}

export const calloutConfigs: Record<CalloutType, CalloutConfig> = {
  info: {
    icon: <Info className="w-4 h-4" />,
    bgColor: 'bg-blue-50/80 dark:bg-blue-950/30',
    borderColor: 'border-blue-200/60 dark:border-blue-800/40',
    textColor: 'text-blue-900 dark:text-blue-100',
    iconColor: 'text-blue-600 dark:text-blue-400',
    gradient: 'bg-gradient-to-r from-blue-500/10 to-cyan-500/10'
  },
  success: {
    icon: <CheckCircle className="w-4 h-4" />,
    bgColor: 'bg-emerald-50/80 dark:bg-emerald-950/30',
    borderColor: 'border-emerald-200/60 dark:border-emerald-800/40',
    textColor: 'text-emerald-900 dark:text-emerald-100',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    gradient: 'bg-gradient-to-r from-emerald-500/10 to-green-500/10'
  },
  warning: {
    icon: <AlertTriangle className="w-4 h-4" />,
    bgColor: 'bg-amber-50/80 dark:bg-amber-950/30',
    borderColor: 'border-amber-200/60 dark:border-amber-800/40',
    textColor: 'text-amber-900 dark:text-amber-100',
    iconColor: 'text-amber-600 dark:text-amber-400',
    gradient: 'bg-gradient-to-r from-amber-500/10 to-orange-500/10'
  },
  error: {
    icon: <AlertCircle className="w-4 h-4" />,
    bgColor: 'bg-red-50/80 dark:bg-red-950/30',
    borderColor: 'border-red-200/60 dark:border-red-800/40',
    textColor: 'text-red-900 dark:text-red-100',
    iconColor: 'text-red-600 dark:text-red-400',
    gradient: 'bg-gradient-to-r from-red-500/10 to-pink-500/10'
  },
  note: {
    icon: <Quote className="w-4 h-4" />,
    bgColor: 'bg-slate-50/80 dark:bg-slate-950/30',
    borderColor: 'border-slate-200/60 dark:border-slate-800/40',
    textColor: 'text-slate-900 dark:text-slate-100',
    iconColor: 'text-slate-600 dark:text-slate-400',
    gradient: 'bg-gradient-to-r from-slate-500/10 to-gray-500/10'
  }
};

// Utility functions for markdown processing
export const markdownUtils = {
  /**
   * Extract heading level from markdown heading syntax
   */
  getHeadingLevel: (text: string): number => {
    const match = text.match(/^(#{1,6})\s/);
    return match ? match[1].length : 1;
  },

  /**
   * Generate anchor ID from heading text
   */
  generateAnchorId: (text: string): string => {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .trim();
  },

  /**
   * Extract language from code block
   */
  extractCodeLanguage: (text: string): string => {
    const match = text.match(/^```(\w+)/);
    return match ? match[1] : 'text';
  },

  /**
   * Parse callout syntax (e.g., :::info, :::warning)
   */
  parseCallout: (text: string): { type: CalloutType; content: string } | null => {
    const match = text.match(/^:::(info|success|warning|error|note)\s*([\s\S]*?):::$/m);
    if (match) {
      return {
        type: match[1] as CalloutType,
        content: match[2].trim()
      };
    }
    return null;
  },

  /**
   * Sanitize HTML content for safe rendering
   */
  sanitizeHtml: (html: string): string => {
    // Basic HTML sanitization - in production, use a proper library like DOMPurify
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '');
  },

  /**
   * Format file size for display
   */
  formatFileSize: (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  },

  /**
   * Truncate text with ellipsis
   */
  truncateText: (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  },

  /**
   * Check if URL is external
   */
  isExternalUrl: (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname !== window.location.hostname;
    } catch {
      return false;
    }
  },

  /**
   * Get file extension from filename
   */
  getFileExtension: (filename: string): string => {
    return filename.split('.').pop()?.toLowerCase() || '';
  },

  /**
   * Generate reading time estimate
   */
  estimateReadingTime: (text: string): number => {
    const wordsPerMinute = 200;
    const wordCount = text.trim().split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
  }
};

// Premium CSS classes for different markdown elements
export const markdownStyles = {
  container: `
    prose prose-slate dark:prose-invert max-w-none
    prose-headings:scroll-mt-20 prose-headings:font-semibold
    prose-h1:text-3xl prose-h1:mb-8 prose-h1:mt-0
    prose-h2:text-2xl prose-h2:mb-6 prose-h2:mt-8
    prose-h3:text-xl prose-h3:mb-4 prose-h3:mt-6
    prose-p:text-slate-700 dark:prose-p:text-slate-300
    prose-p:leading-relaxed prose-p:mb-4
    prose-a:text-cyan-600 dark:prose-a:text-cyan-400
    prose-a:no-underline prose-a:font-medium
    hover:prose-a:text-cyan-700 dark:hover:prose-a:text-cyan-300
    prose-strong:text-slate-900 dark:prose-strong:text-slate-100
    prose-strong:font-semibold
    prose-code:text-pink-600 dark:prose-code:text-pink-400
    prose-code:bg-slate-100 dark:prose-code:bg-slate-800
    prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md
    prose-code:text-sm prose-code:font-medium
    prose-pre:bg-slate-900 dark:prose-pre:bg-slate-950
    prose-pre:border prose-pre:border-slate-200 dark:prose-pre:border-slate-800
    prose-blockquote:border-l-4 prose-blockquote:border-slate-300
    dark:prose-blockquote:border-slate-600
    prose-blockquote:bg-slate-50 dark:prose-blockquote:bg-slate-900/50
    prose-blockquote:py-2 prose-blockquote:px-4
    prose-blockquote:not-italic prose-blockquote:font-normal
    prose-ul:list-disc prose-ol:list-decimal
    prose-li:text-slate-700 dark:prose-li:text-slate-300
    prose-table:border-collapse prose-table:w-full
    prose-th:border prose-th:border-slate-300 dark:prose-th:border-slate-600
    prose-th:bg-slate-50 dark:prose-th:bg-slate-800
    prose-th:px-4 prose-th:py-2 prose-th:text-left prose-th:font-semibold
    prose-td:border prose-td:border-slate-300 dark:prose-td:border-slate-600
    prose-td:px-4 prose-td:py-2
  `,
  
  heading: {
    base: 'group relative scroll-mt-20 font-semibold tracking-tight',
    h1: 'text-3xl mb-8 mt-0 text-slate-900 dark:text-slate-100',
    h2: 'text-2xl mb-6 mt-8 text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2',
    h3: 'text-xl mb-4 mt-6 text-slate-900 dark:text-slate-100',
    h4: 'text-lg mb-3 mt-5 text-slate-900 dark:text-slate-100',
    h5: 'text-base mb-2 mt-4 text-slate-900 dark:text-slate-100',
    h6: 'text-sm mb-2 mt-3 text-slate-900 dark:text-slate-100 uppercase tracking-wider'
  },

  codeBlock: `
    relative bg-slate-900 dark:bg-slate-950 
    border border-slate-200 dark:border-slate-800 
    rounded-xl overflow-hidden
    shadow-lg shadow-black/5
  `,

  inlineCode: `
    text-pink-600 dark:text-pink-400
    bg-slate-100 dark:bg-slate-800
    px-1.5 py-0.5 rounded-md
    text-sm font-medium
    border border-slate-200 dark:border-slate-700
  `,

  blockquote: `
    border-l-4 border-slate-300 dark:border-slate-600
    bg-slate-50 dark:bg-slate-900/50
    py-4 px-6 my-6 rounded-r-lg
    backdrop-blur-sm
    shadow-sm shadow-black/5
  `,

  table: `
    w-full border-collapse rounded-lg overflow-hidden
    shadow-sm shadow-black/5
    border border-slate-200 dark:border-slate-800
  `,

  link: `
    text-cyan-600 dark:text-cyan-400
    hover:text-cyan-700 dark:hover:text-cyan-300
    font-medium no-underline
    transition-colors duration-200
    relative
    after:absolute after:bottom-0 after:left-0
    after:w-0 after:h-0.5 after:bg-current
    after:transition-all after:duration-300
    hover:after:w-full
  `
};

// Accessibility helpers
export const a11yHelpers = {
  /**
   * Generate ARIA label for heading with level
   */
  getHeadingAriaLabel: (text: string, level: number): string => {
    return `Heading level ${level}: ${text}`;
  },

  /**
   * Generate ARIA label for code block
   */
  getCodeBlockAriaLabel: (language: string, lineCount: number): string => {
    return `Code block in ${language}, ${lineCount} lines`;
  },

  /**
   * Generate ARIA label for table
   */
  getTableAriaLabel: (rows: number, cols: number): string => {
    return `Table with ${rows} rows and ${cols} columns`;
  },

  /**
   * Generate ARIA label for external link
   */
  getExternalLinkAriaLabel: (text: string): string => {
    return `${text} (opens in new tab)`;
  }
};

// Performance optimization helpers
export const performanceHelpers = {
  /**
   * Debounce function for search/filter operations
   */
  debounce: <T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): ((...args: Parameters<T>) => void) => {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  },

  /**
   * Throttle function for scroll events
   */
  throttle: <T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): ((...args: Parameters<T>) => void) => {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  },

  /**
   * Lazy load images with intersection observer
   */
  createImageObserver: (callback: (entry: IntersectionObserverEntry) => void) => {
    return new IntersectionObserver(
      (entries) => {
        entries.forEach(callback);
      },
      {
        rootMargin: '50px 0px',
        threshold: 0.1
      }
    );
  }
};

export default {
  fadeInUp,
  staggerContainer,
  scaleOnHover,
  markdownTheme,
  typography,
  calloutConfigs,
  markdownUtils,
  markdownStyles,
  a11yHelpers,
  performanceHelpers
};