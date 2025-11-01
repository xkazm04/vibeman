/**
 * Declarative UI DSL Types
 * JSON-based component description language for Ideas feature
 */

import { ComponentType, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

/**
 * Animation configuration
 */
export interface AnimationConfig {
  initial?: Record<string, any>;
  animate?: Record<string, any>;
  transition?: Record<string, any>;
  whileHover?: Record<string, any>;
  whileTap?: Record<string, any>;
}

/**
 * Badge configuration
 */
export interface BadgeDescriptor {
  type: 'effort' | 'impact' | 'category' | 'status' | 'custom';
  value?: string | number;
  label?: string;
  icon?: LucideIcon;
  emoji?: string;
  className?: string;
  style?: 'default' | 'outline' | 'pill' | 'minimal';
}

/**
 * Layout regions for component
 */
export type LayoutRegion =
  | 'topLeft'
  | 'topRight'
  | 'bottomLeft'
  | 'bottomRight'
  | 'center'
  | 'header'
  | 'footer'
  | 'content';

/**
 * Content descriptor for a region
 */
export interface ContentDescriptor {
  type: 'text' | 'badge' | 'badges' | 'icon' | 'emoji' | 'date' | 'custom' | 'container';
  value?: any;
  badges?: BadgeDescriptor[];
  className?: string;
  format?: string | ((value: any) => string);
  animation?: AnimationConfig;
  children?: ContentDescriptor[];
}

/**
 * Theme variant for status-based styling
 */
export interface ThemeVariant {
  bg: string;
  border: string;
  shadow: string;
  text?: string;
  hover?: {
    bg?: string;
    border?: string;
    shadow?: string;
  };
}

/**
 * Component descriptor (the main DSL structure)
 */
export interface ComponentDescriptor {
  type: 'card' | 'list-item' | 'panel';
  variant?: string;
  layout: Partial<Record<LayoutRegion, ContentDescriptor>>;
  animation?: AnimationConfig;
  className?: string;
  interactive?: {
    onClick?: boolean;
    onHover?: boolean;
    contextMenu?: boolean;
  };
  decorations?: {
    cornerFold?: boolean;
    hoverGradient?: boolean;
    statusIndicator?: boolean;
  };
}

/**
 * Theme configuration
 */
export interface ThemeConfig {
  name: string;
  variants: Record<string, ThemeVariant>;
  badges: {
    effort: Record<number, { label: string; color: string; description: string }>;
    impact: Record<number, { label: string; color: string; description: string }>;
    status: Record<string, { label: string; color: string }>;
  };
  spacing: {
    card: string;
    badge: string;
    gap: string;
  };
  animations: {
    cardEntrance: AnimationConfig;
    cardHover: AnimationConfig;
    badgeEntrance: AnimationConfig;
  };
}

/**
 * Render context with data and handlers
 */
export interface RenderContext {
  data: any;
  theme: ThemeConfig;
  handlers?: {
    onClick?: () => void;
    onDelete?: (id: string) => void;
    onEdit?: (id: string) => void;
  };
  processingState?: {
    isProcessing?: boolean;
    processingId?: string;
  };
}
