/**
 * Shared channel theme map for the Social feature.
 *
 * Single source of truth for per-channel visual tokens: icon, label,
 * and badge colors (bg, text, border). All downstream constants are
 * derived from this map so adding a channel or tweaking a color is a
 * one-line change.
 */

import {
  Mail,
  MessageCircle,
  Star,
  Smartphone,
} from 'lucide-react';
import { Twitter, Facebook, Instagram } from '@/components/icons/brand-icons';
import type { KanbanChannel } from './types/feedbackTypes';

/** Visual tokens for a single channel. */
export interface ChannelTheme {
  icon: React.ElementType;
  label: string;
  badge: {
    bg: string;
    text: string;
    border: string;
  };
}

/**
 * Unified channel theme map — the single source of truth.
 *
 * Badge colors target WCAG AA contrast on dark backgrounds.
 * X channel uses sky-400 instead of gray-200 to meet contrast requirements.
 */
export const CHANNEL_THEME: Record<KanbanChannel, ChannelTheme> = {
  email: {
    icon: Mail,
    label: 'Email',
    badge: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  },
  x: {
    icon: Twitter,
    label: 'X',
    badge: { bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/30' },
  },
  facebook: {
    icon: Facebook,
    label: 'Facebook',
    badge: { bg: 'bg-blue-600/10', text: 'text-blue-500', border: 'border-blue-600/30' },
  },
  instagram: {
    icon: Instagram,
    label: 'Instagram',
    badge: { bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/30' },
  },
  support_chat: {
    icon: MessageCircle,
    label: 'Chat',
    badge: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30' },
  },
  trustpilot: {
    icon: Star,
    label: 'Trustpilot',
    badge: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  },
  app_store: {
    icon: Smartphone,
    label: 'App Store',
    badge: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
  },
};

// ---------------------------------------------------------------------------
// Derived convenience maps (backward-compatible with existing consumers)
// ---------------------------------------------------------------------------

function deriveRecord<T>(fn: (t: ChannelTheme) => T): Record<KanbanChannel, T> {
  const result = {} as Record<KanbanChannel, T>;
  for (const [ch, theme] of Object.entries(CHANNEL_THEME)) {
    result[ch as KanbanChannel] = fn(theme);
  }
  return result;
}

/** Icon component mapped to each channel type. */
export const CHANNEL_ICONS: Record<KanbanChannel, React.ElementType> =
  deriveRecord(t => t.icon);

/** Human-readable labels for each channel. */
export const CHANNEL_LABELS: Record<KanbanChannel, string> =
  deriveRecord(t => t.label);

/** Badge-style classes (bg + text + border) for each channel. */
export const CHANNEL_BADGE_COLORS: Record<KanbanChannel, string> =
  deriveRecord(t => `${t.badge.bg} ${t.badge.text} ${t.badge.border}`);

/** Text-only color for each channel (used in CustomerProfile icons). */
export const CHANNEL_TEXT_COLORS: Record<KanbanChannel, string> =
  deriveRecord(t => t.badge.text);
