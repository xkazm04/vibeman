// Activity Types
import type { KanbanStatus } from './feedbackTypes';

export type ActivityType =
  | 'created'
  | 'status_changed'
  | 'priority_changed'
  | 'assigned'
  | 'analyzed'
  | 'comment_added'
  | 'ticket_linked'
  | 'resolved'
  | 'reopened';

export type Actor = 'system' | 'user' | 'ai';

export interface ActivityEvent {
  id: string;
  feedbackId: string;
  type: ActivityType;
  timestamp: string;
  actor: Actor;
  metadata: Record<string, unknown>;
}

export interface StatusChangeMetadata {
  from: KanbanStatus;
  to: KanbanStatus;
}

export interface TicketLinkMetadata {
  ticketId: string;
  ticketUrl?: string;
}

export interface ActivityFilter {
  types: ActivityType[];
  feedbackIds: string[];
  actors: Actor[];
}

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  created: 'Created',
  status_changed: 'Status Changed',
  priority_changed: 'Priority Changed',
  assigned: 'Assigned',
  analyzed: 'Analyzed',
  comment_added: 'Comment Added',
  ticket_linked: 'Ticket Linked',
  resolved: 'Resolved',
  reopened: 'Reopened',
};

export const ACTOR_LABELS: Record<Actor, string> = {
  system: 'System',
  user: 'User',
  ai: 'AI',
};

export const ACTOR_COLORS: Record<Actor, string> = {
  system: 'bg-gray-500',
  user: 'bg-blue-500',
  ai: 'bg-purple-500',
};
