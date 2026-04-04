/**
 * Shared channel icon/color/label constants for the Social feature.
 *
 * Consolidated from UnifiedInbox, ConversationThread, CustomerProfile,
 * and HistoryTimeline to prevent 4-way duplication.
 */

import {
  Mail,
  MessageCircle,
  Star,
  Smartphone,
} from 'lucide-react';
import { Twitter, Facebook, Instagram } from '@/components/icons/brand-icons';
import type { KanbanChannel } from './types/feedbackTypes';

/**
 * Icon component mapped to each channel type.
 */
export const CHANNEL_ICONS: Record<KanbanChannel, React.ElementType> = {
  email: Mail,
  x: Twitter,
  facebook: Facebook,
  instagram: Instagram,
  support_chat: MessageCircle,
  trustpilot: Star,
  app_store: Smartphone,
};

/**
 * Human-readable labels for each channel.
 */
export const CHANNEL_LABELS: Record<KanbanChannel, string> = {
  email: 'Email',
  x: 'X',
  facebook: 'Facebook',
  instagram: 'Instagram',
  support_chat: 'Chat',
  trustpilot: 'Trustpilot',
  app_store: 'App Store',
};

/**
 * Badge-style colors (bg + text + border) for each channel.
 * Used in ConversationThread and similar badge contexts.
 */
export const CHANNEL_BADGE_COLORS: Record<KanbanChannel, string> = {
  email: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  x: 'bg-gray-700/50 text-gray-200 border-gray-600',
  facebook: 'bg-blue-600/10 text-blue-500 border-blue-600/30',
  instagram: 'bg-pink-500/10 text-pink-400 border-pink-500/30',
  support_chat: 'bg-green-500/10 text-green-400 border-green-500/30',
  trustpilot: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  app_store: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
};

/**
 * Text-only colors for each channel (used in CustomerProfile icons).
 */
export const CHANNEL_TEXT_COLORS: Record<KanbanChannel, string> = {
  email: 'text-blue-400',
  x: 'text-gray-200',
  facebook: 'text-blue-500',
  instagram: 'text-pink-400',
  support_chat: 'text-green-400',
  trustpilot: 'text-emerald-400',
  app_store: 'text-purple-400',
};
