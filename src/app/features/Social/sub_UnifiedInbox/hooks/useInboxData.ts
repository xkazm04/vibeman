'use client';

import { useState, useMemo, useEffect } from 'react';
import type { FeedbackItem } from '../../lib/types/feedbackTypes';
import type { UnifiedCustomer, ConversationThread } from '@/lib/social';
import {
  ConversationThreader,
  CustomerAggregator,
} from '@/lib/social';
import type { InboxStats } from '../lib/types';

interface UseInboxDataProps {
  feedbackItems: FeedbackItem[];
}

interface UseInboxDataReturn {
  conversations: ConversationThread[];
  customers: UnifiedCustomer[];
  setCustomers: React.Dispatch<React.SetStateAction<UnifiedCustomer[]>>;
  setConversations: React.Dispatch<React.SetStateAction<ConversationThread[]>>;
  stats: InboxStats;
  customerAggregator: CustomerAggregator;
  isLoading: boolean;
  error: string | null;
}

export function useInboxData({
  feedbackItems,
}: UseInboxDataProps): UseInboxDataReturn {
  const [customers, setCustomers] = useState<UnifiedCustomer[]>([]);
  const [conversations, setConversations] = useState<ConversationThread[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Aggregator and threader instances
  const customerAggregator = useMemo(() => new CustomerAggregator(), []);
  const conversationThreader = useMemo(() => new ConversationThreader(), []);

  // Process feedback items into customers and conversations
  useEffect(() => {
    if (feedbackItems.length === 0) {
      setCustomers([]);
      setConversations([]);
      return;
    }

    setIsLoading(true);
    try {
      // Aggregate customers
      const aggregatedCustomers = customerAggregator.aggregateFromFeedback(feedbackItems);
      setCustomers(aggregatedCustomers);

      // Create customer map for threading
      const customerMap = new Map<string, UnifiedCustomer>();
      aggregatedCustomers.forEach(c => customerMap.set(c.id, c));

      // Thread conversations
      const threads = conversationThreader.threadFeedbackItems(
        feedbackItems,
        [],
        customerMap
      );
      setConversations(threads);

      setError(null);
    } catch (err) {
      console.error('Error processing feedback items:', err);
      setError('Failed to process feedback items');
    } finally {
      setIsLoading(false);
    }
  }, [feedbackItems, customerAggregator, conversationThreader]);

  // Calculate stats
  const stats: InboxStats = useMemo(() => {
    const openCount = conversations.filter(c => c.status === 'open').length;
    const resolvedCount = conversations.filter(c => c.status === 'resolved').length;
    const pendingCount = conversations.filter(c => c.status === 'pending').length;
    const highValueCount = customers.filter(c => c.valueScore >= 60).length;

    return {
      totalConversations: conversations.length,
      openConversations: openCount,
      resolvedConversations: resolvedCount,
      pendingConversations: pendingCount,
      totalCustomers: customers.length,
      highValueCustomers: highValueCount,
    };
  }, [conversations, customers]);

  return {
    conversations,
    customers,
    setCustomers,
    setConversations,
    stats,
    customerAggregator,
    isLoading,
    error,
  };
}
