'use client';

import React, { useCallback } from 'react';
import type { UnifiedCustomer, ConversationThread } from '@/lib/social';
import type { CustomerAggregator } from '@/lib/social';

interface UseInboxActionsProps {
  customerAggregator: CustomerAggregator;
  setCustomers: React.Dispatch<React.SetStateAction<UnifiedCustomer[]>>;
  setConversations: React.Dispatch<React.SetStateAction<ConversationThread[]>>;
}

interface UseInboxActionsReturn {
  addCustomerNote: (customerId: string, note: string) => Promise<void>;
  addCustomerTag: (customerId: string, tag: string) => Promise<void>;
  removeCustomerTag: (customerId: string, tag: string) => Promise<void>;
  resolveConversation: (threadId: string) => Promise<void>;
  reopenConversation: (threadId: string) => Promise<void>;
}

export function useInboxActions({
  customerAggregator,
  setCustomers,
  setConversations,
}: UseInboxActionsProps): UseInboxActionsReturn {
  const addCustomerNote = useCallback(async (customerId: string, note: string) => {
    const success = customerAggregator.addNote(customerId, note);
    if (success) {
      setCustomers(() => [...customerAggregator.getCustomers()]);
    }
  }, [customerAggregator, setCustomers]);

  const addCustomerTag = useCallback(async (customerId: string, tag: string) => {
    const success = customerAggregator.addTag(customerId, tag);
    if (success) {
      setCustomers(() => [...customerAggregator.getCustomers()]);
    }
  }, [customerAggregator, setCustomers]);

  const removeCustomerTag = useCallback(async (customerId: string, tag: string) => {
    const success = customerAggregator.removeTag(customerId, tag);
    if (success) {
      setCustomers(() => [...customerAggregator.getCustomers()]);
    }
  }, [customerAggregator, setCustomers]);

  const resolveConversation = useCallback(async (threadId: string) => {
    setConversations(prev => prev.map(thread =>
      thread.id === threadId
        ? { ...thread, status: 'resolved' as const, resolvedAt: new Date().toISOString() }
        : thread
    ));
  }, [setConversations]);

  const reopenConversation = useCallback(async (threadId: string) => {
    setConversations(prev => prev.map(thread =>
      thread.id === threadId
        ? { ...thread, status: 'open' as const, resolvedAt: null }
        : thread
    ));
  }, [setConversations]);

  return {
    addCustomerNote,
    addCustomerTag,
    removeCustomerTag,
    resolveConversation,
    reopenConversation,
  };
}
