'use client';

import {
  Plus,
  ArrowRight,
  AlertTriangle,
  User,
  Bot,
  MessageSquare,
  Ticket,
  CheckCircle,
  RotateCcw,
  type LucideIcon,
} from 'lucide-react';
import type { ActivityEvent, ActivityType } from '../../lib/types/activityTypes';
import { ACTOR_COLORS } from '../../lib/types/activityTypes';

const TYPE_ICONS: Record<ActivityType, LucideIcon> = {
  created: Plus,
  status_changed: ArrowRight,
  priority_changed: AlertTriangle,
  assigned: User,
  analyzed: Bot,
  comment_added: MessageSquare,
  ticket_linked: Ticket,
  resolved: CheckCircle,
  reopened: RotateCcw,
};

interface ActivityItemProps {
  event: ActivityEvent;
  showFeedbackId?: boolean;
  onJumpToItem?: (feedbackId: string) => void;
}

function formatRelativeTime(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getEventDescription(event: ActivityEvent): string {
  switch (event.type) {
    case 'created':
      return 'Item created';
    case 'status_changed':
      const { from, to } = event.metadata as { from: string; to: string };
      return `Status: ${from} → ${to}`;
    case 'priority_changed':
      return `Priority changed`;
    case 'assigned':
      return 'Assigned to pipeline';
    case 'analyzed':
      const conf = event.metadata.confidence as number;
      return `AI analyzed (${Math.round(conf * 100)}% confidence)`;
    case 'ticket_linked':
      return `Linked to ${event.metadata.ticketId}`;
    case 'resolved':
      return 'Marked as resolved';
    case 'reopened':
      return 'Reopened';
    default:
      return event.type;
  }
}

export function ActivityItem({ event, showFeedbackId, onJumpToItem }: ActivityItemProps) {
  const Icon = TYPE_ICONS[event.type];

  return (
    <div className="flex items-start gap-3 py-2 group">
      {/* Icon */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-800/60
        flex items-center justify-center border border-gray-700/40">
        <Icon className="w-4 h-4 text-gray-400" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-200">
            {getEventDescription(event)}
          </span>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium text-white ${ACTOR_COLORS[event.actor]}`}>
            {event.actor.toUpperCase()}
          </span>
        </div>

        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-500">
            {formatRelativeTime(event.timestamp)}
          </span>

          {showFeedbackId && onJumpToItem && (
            <button
              onClick={() => onJumpToItem(event.feedbackId)}
              className="text-xs text-cyan-400 hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
            >
              View item
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ActivityItem;
