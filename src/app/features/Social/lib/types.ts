export type FeedbackChannel = 'all' | 'facebook' | 'twitter' | 'email';

export type EvaluationCategory = 'bug' | 'proposal' | 'feedback';

export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type TicketStatus = 'created' | 'in_progress' | 'resolved' | 'closed';

export type ReplyStatus = 'draft' | 'sending' | 'sent' | 'failed';

// Raw feedback from social sources (unprocessed)
export interface RawFeedback {
  id: string;
  channel: Exclude<FeedbackChannel, 'all'>;
  author: string;
  authorHandle?: string;
  authorAvatar?: string;
  content: string;
  timestamp: Date;
  url?: string;
  // Original post if this is a reply/reaction
  originalPost?: {
    author: string;
    content: string;
    url?: string;
  };
}

// Evaluated/processed feedback
export interface EvaluatedFeedback {
  id: string;
  originalFeedbackId: string;
  channel: Exclude<FeedbackChannel, 'all'>;
  author: string;
  authorHandle?: string;
  authorAvatar?: string;
  content: string;
  timestamp: Date;
  url?: string;
  originalPost?: {
    author: string;
    content: string;
    url?: string;
  };
  // AI evaluation results
  category: EvaluationCategory;
  summary: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  suggestedAction: string;
  evaluatedAt: Date;
  // Action tracking
  ticket?: JiraTicket;
  reply?: FeedbackReply;
}

export interface JiraTicket {
  id: string;
  key: string; // e.g., "VIB-123"
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: TicketStatus;
  createdAt: Date;
  url?: string;
}

export interface FeedbackReply {
  id: string;
  content: string;
  status: ReplyStatus;
  sentAt?: Date;
  platform: Exclude<FeedbackChannel, 'all'>;
}

export interface ProcessingStats {
  totalProcessed: number;
  bugs: number;
  proposals: number;
  feedback: number;
  ticketsCreated: number;
  ticketsResolved: number;
  repliesSent: number;
  repliesPending: number;
}

export interface ChannelStats {
  channel: FeedbackChannel;
  count: number;
}

export interface ProjectServerStatus {
  projectId: string;
  isRunning: boolean;
  port: number;
}
