// Kanban Board Types
import type { LucideIcon } from 'lucide-react';
import type { DevTeam, CustomerResponseData } from './aiTypes';

export type KanbanChannel =
  | 'email'
  | 'x'
  | 'facebook'
  | 'support_chat'
  | 'trustpilot'
  | 'app_store'
  | 'instagram';

export type KanbanStatus = 'new' | 'analyzed' | 'manual' | 'automatic' | 'done';

export type KanbanPriority = 'low' | 'medium' | 'high' | 'critical';

export type Sentiment =
  | 'angry'
  | 'frustrated'
  | 'disappointed'
  | 'neutral'
  | 'constructive'
  | 'helpful'
  | 'mocking';

export interface FeedbackAuthor {
  name: string;
  handle?: string;
  email?: string;
  followers?: number;
  verified?: boolean;
  locale?: string;
  device?: string;
}

export interface FeedbackContent {
  subject?: string;
  body: string;
  excerpt?: string;
  translation?: string;
}

export interface FeedbackEngagement {
  likes?: number;
  retweets?: number;
  replies?: number;
  reactions?: Record<string, number>;
  views?: number;
}

export interface ConversationMessage {
  role: 'customer' | 'agent';
  message: string;
}

export interface FeedbackAnalysis {
  bugId: string;
  bugTag: string;
  sentiment: Sentiment;
  suggestedPipeline: 'manual' | 'automatic';
  confidence: number;
  assignedTeam?: DevTeam;
  reasoning?: string;
}

export interface FeedbackItem {
  id: string;
  channel: KanbanChannel;
  timestamp: string;
  status: KanbanStatus;
  priority: KanbanPriority;
  author: FeedbackAuthor;
  content: FeedbackContent;
  engagement?: FeedbackEngagement;
  conversation?: ConversationMessage[];
  rating?: number;
  analysis?: FeedbackAnalysis;
  customerResponse?: CustomerResponseData;
  tags: string[];
  linkedTickets?: string[];
  resolvedAt?: string;
  resolvedBy?: 'human' | 'ai';
  contextType?: string;
  appVersion?: string;
  platform?: 'ios' | 'android';
  githubIssueUrl?: string;
}

export interface KanbanColumnConfig {
  id: KanbanStatus;
  title: string;
  subtitle: string;
  iconName: 'inbox' | 'search' | 'user' | 'bot' | 'check-circle';
  acceptsFrom: KanbanStatus[];
  maxItems: number | null;
}

// KANBAN_COLUMNS is exported from config/columnConfig.ts

export const CHANNEL_ICON_NAMES: Record<KanbanChannel, string> = {
  email: 'mail',
  x: 'x',
  facebook: 'facebook',
  support_chat: 'message-circle',
  trustpilot: 'star',
  app_store: 'smartphone',
  instagram: 'instagram',
};

export const PRIORITY_COLORS: Record<KanbanPriority, string> = {
  low: 'text-gray-400',
  medium: 'text-blue-400',
  high: 'text-yellow-400',
  critical: 'text-red-400',
};

export const PRIORITY_DOT_COLORS: Record<KanbanPriority, string> = {
  low: 'bg-green-500',
  medium: 'bg-blue-500',
  high: 'bg-yellow-500',
  critical: 'bg-red-500',
};
