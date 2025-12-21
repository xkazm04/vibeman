import {
  Mail,
  Facebook,
  MessageCircle,
  Star,
  Smartphone,
  Instagram,
  type LucideIcon,
} from 'lucide-react';
import type { KanbanChannel } from '../lib/types/feedbackTypes';

// Custom X (formerly Twitter) icon component
export const XIcon = (({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
)) as unknown as LucideIcon;

// Channel icon mapping
export const ChannelIconMap: Record<KanbanChannel, LucideIcon> = {
  email: Mail,
  x: XIcon,
  facebook: Facebook,
  support_chat: MessageCircle,
  trustpilot: Star,
  app_store: Smartphone,
  instagram: Instagram,
};

// Channel color mapping for active state
export const ChannelColorMap: Record<KanbanChannel, string> = {
  email: 'text-blue-500',
  x: 'text-gray-100',
  facebook: 'text-[#1877f2]',
  support_chat: 'text-green-500',
  trustpilot: 'text-[#00b67a]',
  app_store: 'text-purple-500',
  instagram: 'text-pink-500',
};
