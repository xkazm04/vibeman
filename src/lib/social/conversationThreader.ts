/**
 * Conversation Threader
 * Links messages across channels into unified conversation threads
 */

import type { FeedbackItem, KanbanChannel } from '@/app/features/Social/lib/types/feedbackTypes';
import type { ConversationThread, ThreadMessage, UnifiedCustomer } from './types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Threading strategies for linking messages
 */
export type ThreadingStrategy = 'email_thread' | 'time_window' | 'customer_session' | 'topic_similarity';

/**
 * Configuration for conversation threading
 */
export interface ThreadingConfig {
  timeWindowMinutes: number; // Max time between messages to be in same thread
  enableCrossChannel: boolean; // Thread across different channels
  strategies: ThreadingStrategy[];
}

const DEFAULT_CONFIG: ThreadingConfig = {
  timeWindowMinutes: 60, // 1 hour window
  enableCrossChannel: true,
  strategies: ['email_thread', 'time_window', 'customer_session'],
};

/**
 * ConversationThreader class
 * Manages linking and threading of messages across channels
 */
export class ConversationThreader {
  private config: ThreadingConfig;

  constructor(config: Partial<ThreadingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Thread a collection of feedback items into conversation threads
   */
  threadFeedbackItems(
    items: FeedbackItem[],
    existingThreads: ConversationThread[] = [],
    customers: Map<string, UnifiedCustomer> = new Map()
  ): ConversationThread[] {
    const threads: Map<string, ConversationThread> = new Map();

    // Index existing threads
    existingThreads.forEach(thread => {
      threads.set(thread.id, thread);
    });

    // Sort items by timestamp
    const sortedItems = [...items].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Process each item
    for (const item of sortedItems) {
      const matchedThread = this.findMatchingThread(item, Array.from(threads.values()), customers);

      if (matchedThread) {
        // Add message to existing thread
        this.addMessageToThread(matchedThread, item);
        threads.set(matchedThread.id, matchedThread);
      } else {
        // Create new thread
        const customerId = this.findCustomerId(item, customers);
        const newThread = this.createThread(item, customerId);
        threads.set(newThread.id, newThread);
      }
    }

    return Array.from(threads.values());
  }

  /**
   * Find a matching thread for a feedback item
   */
  private findMatchingThread(
    item: FeedbackItem,
    threads: ConversationThread[],
    customers: Map<string, UnifiedCustomer>
  ): ConversationThread | null {
    const customerId = this.findCustomerId(item, customers);

    // Filter threads by customer
    const customerThreads = threads.filter(t => t.customerId === customerId);

    if (customerThreads.length === 0) {
      return null;
    }

    for (const strategy of this.config.strategies) {
      const match = this.applyStrategy(strategy, item, customerThreads);
      if (match) {
        return match;
      }
    }

    return null;
  }

  /**
   * Apply a specific threading strategy
   */
  private applyStrategy(
    strategy: ThreadingStrategy,
    item: FeedbackItem,
    threads: ConversationThread[]
  ): ConversationThread | null {
    switch (strategy) {
      case 'email_thread':
        return this.matchByEmailThread(item, threads);
      case 'time_window':
        return this.matchByTimeWindow(item, threads);
      case 'customer_session':
        return this.matchByCustomerSession(item, threads);
      case 'topic_similarity':
        return this.matchByTopicSimilarity(item, threads);
      default:
        return null;
    }
  }

  /**
   * Match by email thread (Re: subject line, references)
   */
  private matchByEmailThread(item: FeedbackItem, threads: ConversationThread[]): ConversationThread | null {
    if (item.channel !== 'email') {
      return null;
    }

    const subject = item.content.subject?.toLowerCase() || '';

    // Check for Re: or Fwd: patterns
    const isReply = /^(re|fwd|fw):\s*/i.test(subject);
    if (!isReply) {
      return null;
    }

    const cleanSubject = subject.replace(/^(re|fwd|fw):\s*/gi, '').trim();

    // Find thread with matching subject
    return threads.find(thread => {
      const threadSubject = thread.subject?.toLowerCase() || '';
      const cleanThreadSubject = threadSubject.replace(/^(re|fwd|fw):\s*/gi, '').trim();
      return cleanSubject === cleanThreadSubject;
    }) || null;
  }

  /**
   * Match by time window (messages within X minutes)
   */
  private matchByTimeWindow(item: FeedbackItem, threads: ConversationThread[]): ConversationThread | null {
    const itemTime = new Date(item.timestamp).getTime();
    const windowMs = this.config.timeWindowMinutes * 60 * 1000;

    // Find open threads within time window
    const candidates = threads
      .filter(thread => {
        if (thread.status === 'resolved') {
          return false;
        }

        // Check channel compatibility
        if (!this.config.enableCrossChannel && !thread.channels.includes(item.channel)) {
          return false;
        }

        const lastActivity = new Date(thread.lastActivityAt).getTime();
        return Math.abs(itemTime - lastActivity) <= windowMs;
      })
      .sort((a, b) =>
        new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime()
      );

    return candidates[0] || null;
  }

  /**
   * Match by customer session (same customer, recent activity)
   */
  private matchByCustomerSession(item: FeedbackItem, threads: ConversationThread[]): ConversationThread | null {
    // Find most recent open thread for this customer
    const openThreads = threads
      .filter(t => t.status !== 'resolved')
      .sort((a, b) =>
        new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime()
      );

    return openThreads[0] || null;
  }

  /**
   * Match by topic similarity (basic keyword matching)
   */
  private matchByTopicSimilarity(item: FeedbackItem, threads: ConversationThread[]): ConversationThread | null {
    const itemContent = item.content.body.toLowerCase();
    const itemWords = new Set(itemContent.split(/\s+/).filter(w => w.length > 3));

    let bestMatch: ConversationThread | null = null;
    let bestScore = 0;
    const similarityThreshold = 0.3;

    for (const thread of threads) {
      if (thread.status === 'resolved') {
        continue;
      }

      // Calculate word overlap with thread messages
      const threadContent = thread.messages
        .map(m => m.content.toLowerCase())
        .join(' ');
      const threadWords = new Set(threadContent.split(/\s+/).filter(w => w.length > 3));

      // Jaccard similarity
      const intersection = new Set([...itemWords].filter(w => threadWords.has(w)));
      const union = new Set([...itemWords, ...threadWords]);
      const similarity = intersection.size / union.size;

      if (similarity > similarityThreshold && similarity > bestScore) {
        bestScore = similarity;
        bestMatch = thread;
      }
    }

    return bestMatch;
  }

  /**
   * Find customer ID from item author info
   */
  private findCustomerId(item: FeedbackItem, customers: Map<string, UnifiedCustomer>): string {
    const email = item.author.email?.toLowerCase();
    const handle = item.author.handle?.toLowerCase();

    for (const [id, customer] of customers) {
      if (email && customer.primaryEmail?.toLowerCase() === email) {
        return id;
      }
      if (handle && customer.primaryHandle?.toLowerCase() === handle) {
        return id;
      }
      // Check channel identities
      for (const identity of customer.channels) {
        if (email && identity.email?.toLowerCase() === email) {
          return id;
        }
        if (handle && identity.handle?.toLowerCase() === handle) {
          return id;
        }
      }
    }

    // Generate a temporary customer ID if not found
    return `temp-${email || handle || item.author.name}`;
  }

  /**
   * Create a new conversation thread from a feedback item
   */
  private createThread(item: FeedbackItem, customerId: string): ConversationThread {
    const message = this.feedbackToMessage(item);

    return {
      id: uuidv4(),
      customerId,
      subject: item.content.subject || this.extractSubject(item.content.body),
      messages: [message],
      channels: [item.channel],
      status: item.status === 'done' ? 'resolved' : 'open',
      priority: item.priority,
      lastActivityAt: item.timestamp,
      createdAt: item.timestamp,
      resolvedAt: item.resolvedAt || null,
      assignedTo: null,
      tags: item.tags,
    };
  }

  /**
   * Add a message to an existing thread
   */
  private addMessageToThread(thread: ConversationThread, item: FeedbackItem): void {
    const message = this.feedbackToMessage(item);
    thread.messages.push(message);

    // Update thread metadata
    if (!thread.channels.includes(item.channel)) {
      thread.channels.push(item.channel);
    }

    if (new Date(item.timestamp) > new Date(thread.lastActivityAt)) {
      thread.lastActivityAt = item.timestamp;
    }

    // Update priority if higher
    const priorityOrder = ['low', 'medium', 'high', 'critical'];
    if (priorityOrder.indexOf(item.priority) > priorityOrder.indexOf(thread.priority)) {
      thread.priority = item.priority;
    }

    // Merge tags
    for (const tag of item.tags) {
      if (!thread.tags.includes(tag)) {
        thread.tags.push(tag);
      }
    }
  }

  /**
   * Convert FeedbackItem to ThreadMessage
   */
  private feedbackToMessage(item: FeedbackItem): ThreadMessage {
    return {
      id: uuidv4(),
      feedbackItemId: item.id,
      channel: item.channel,
      role: 'customer',
      content: item.content.body,
      timestamp: item.timestamp,
      sentiment: item.analysis?.sentiment,
      metadata: {
        subject: item.content.subject,
        engagement: item.engagement,
        author: item.author,
      },
    };
  }

  /**
   * Extract a subject from message body (first line or truncated)
   */
  private extractSubject(body: string): string {
    const firstLine = body.split('\n')[0].trim();
    if (firstLine.length <= 80) {
      return firstLine;
    }
    return firstLine.substring(0, 77) + '...';
  }

  /**
   * Merge two threads into one
   */
  mergeThreads(thread1: ConversationThread, thread2: ConversationThread): ConversationThread {
    // Keep the older thread as the base
    const [base, merging] = new Date(thread1.createdAt) < new Date(thread2.createdAt)
      ? [thread1, thread2]
      : [thread2, thread1];

    return {
      ...base,
      messages: [...base.messages, ...merging.messages].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      ),
      channels: [...new Set([...base.channels, ...merging.channels])],
      lastActivityAt: new Date(base.lastActivityAt) > new Date(merging.lastActivityAt)
        ? base.lastActivityAt
        : merging.lastActivityAt,
      tags: [...new Set([...base.tags, ...merging.tags])],
    };
  }

  /**
   * Split a thread at a specific message
   */
  splitThread(thread: ConversationThread, splitAtMessageId: string): [ConversationThread, ConversationThread] | null {
    const splitIndex = thread.messages.findIndex(m => m.id === splitAtMessageId);
    if (splitIndex <= 0) {
      return null;
    }

    const beforeMessages = thread.messages.slice(0, splitIndex);
    const afterMessages = thread.messages.slice(splitIndex);

    const thread1: ConversationThread = {
      ...thread,
      messages: beforeMessages,
      lastActivityAt: beforeMessages[beforeMessages.length - 1].timestamp,
    };

    const thread2: ConversationThread = {
      ...thread,
      id: uuidv4(),
      messages: afterMessages,
      createdAt: afterMessages[0].timestamp,
      lastActivityAt: afterMessages[afterMessages.length - 1].timestamp,
    };

    return [thread1, thread2];
  }
}

// Export singleton instance with default config
export const conversationThreader = new ConversationThreader();
