'use client';

import {
  X,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Mail,
  Facebook,
  MessageCircle,
  Star,
  Smartphone,
  Instagram,
  type LucideIcon,
} from 'lucide-react';

// Custom X (formerly Twitter) icon component
const XIcon = (({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
)) as unknown as LucideIcon;

import type { FeedbackItem, KanbanChannel } from '../../lib/types/feedbackTypes';
import type { SplitViewWidth } from './splitViewTypes';

const ChannelIcon: Record<KanbanChannel, LucideIcon> = {
  email: Mail,
  x: XIcon,
  facebook: Facebook,
  support_chat: MessageCircle,
  trustpilot: Star,
  app_store: Smartphone,
  instagram: Instagram,
};

interface SplitViewHeaderProps {
  item: FeedbackItem;
  currentIndex: number;
  totalItems: number;
  width: SplitViewWidth;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onWidthChange: (width: SplitViewWidth) => void;
  canPrev: boolean;
  canNext: boolean;
}

export function SplitViewHeader({
  item,
  currentIndex,
  totalItems,
  width,
  onClose,
  onPrev,
  onNext,
  onWidthChange,
  canPrev,
  canNext,
}: SplitViewHeaderProps) {
  const Icon = ChannelIcon[item.channel];

  const cycleWidth = () => {
    const widths: SplitViewWidth[] = ['narrow', 'medium', 'wide'];
    const currentIdx = widths.indexOf(width);
    const nextIdx = (currentIdx + 1) % widths.length;
    onWidthChange(widths[nextIdx]);
  };

  return (
    <div className="flex items-center justify-between p-3 border-b border-gray-700/50
      bg-gray-800/60">
      {/* Left: Channel info */}
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-md bg-gray-900/60">
          <Icon className="w-4 h-4 text-gray-400" />
        </div>
        <div>
          <div className="text-sm font-medium text-gray-200 capitalize">
            {item.channel.replace('_', ' ')}
          </div>
          <div className="text-xs text-gray-500">
            {item.author.name}
          </div>
        </div>
      </div>

      {/* Center: Navigation */}
      <div className="flex items-center gap-1">
        <button
          onClick={onPrev}
          disabled={!canPrev}
          className="p-1.5 rounded hover:bg-gray-700/60 disabled:opacity-30
            disabled:cursor-not-allowed transition-colors"
          title="Previous"
        >
          <ChevronLeft className="w-4 h-4 text-gray-400" />
        </button>
        <span className="text-xs text-gray-500 min-w-[50px] text-center">
          {currentIndex + 1} / {totalItems}
        </span>
        <button
          onClick={onNext}
          disabled={!canNext}
          className="p-1.5 rounded hover:bg-gray-700/60 disabled:opacity-30
            disabled:cursor-not-allowed transition-colors"
          title="Next"
        >
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        <button
          onClick={cycleWidth}
          className="p-1.5 rounded hover:bg-gray-700/60 transition-colors"
          title={`Width: ${width}`}
        >
          <Columns3 className="w-4 h-4 text-gray-400" />
        </button>
        <button
          onClick={onClose}
          className="p-1.5 rounded hover:bg-gray-700/60 transition-colors"
          title="Close (Esc)"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>
    </div>
  );
}

export default SplitViewHeader;
