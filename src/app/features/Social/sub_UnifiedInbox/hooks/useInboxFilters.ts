'use client';

import { useState, useCallback, useMemo } from 'react';
import type { KanbanChannel, KanbanPriority } from '../../lib/types/feedbackTypes';
import type { UnifiedCustomer, ConversationThread } from '@/lib/social';
import type { UnifiedInboxFilters } from '../lib/types';
import { DEFAULT_INBOX_FILTERS } from '../lib/types';

interface UseInboxFiltersProps {
  conversations: ConversationThread[];
  customers: UnifiedCustomer[];
}

interface UseInboxFiltersReturn {
  filters: UnifiedInboxFilters;
  setFilter: <K extends keyof UnifiedInboxFilters>(key: K, value: UnifiedInboxFilters[K]) => void;
  toggleChannelFilter: (channel: KanbanChannel) => void;
  toggleStatusFilter: (status: 'open' | 'resolved' | 'pending') => void;
  togglePriorityFilter: (priority: KanbanPriority) => void;
  clearFilters: () => void;
  filteredConversations: ConversationThread[];
  filteredCustomers: UnifiedCustomer[];
}

/**
 * Generic toggle factory - replaces 3 near-identical toggle callbacks.
 * Returns a new array with the item toggled in/out.
 */
function toggleArrayItem<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item];
}

export function useInboxFilters({
  conversations,
  customers,
}: UseInboxFiltersProps): UseInboxFiltersReturn {
  const [filters, setFilters] = useState<UnifiedInboxFilters>(DEFAULT_INBOX_FILTERS);

  const setFilter = useCallback(<K extends keyof UnifiedInboxFilters>(
    key: K,
    value: UnifiedInboxFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const toggleChannelFilter = useCallback((channel: KanbanChannel) => {
    setFilters(prev => ({
      ...prev,
      channels: toggleArrayItem(prev.channels, channel),
    }));
  }, []);

  const toggleStatusFilter = useCallback((status: 'open' | 'resolved' | 'pending') => {
    setFilters(prev => ({
      ...prev,
      status: toggleArrayItem(prev.status, status),
    }));
  }, []);

  const togglePriorityFilter = useCallback((priority: KanbanPriority) => {
    setFilters(prev => ({
      ...prev,
      priority: toggleArrayItem(prev.priority, priority),
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_INBOX_FILTERS);
  }, []);

  // Filtered conversations
  const filteredConversations = useMemo(() => {
    return conversations.filter(thread => {
      // Channel filter
      if (filters.channels.length > 0) {
        if (!thread.channels.some(c => filters.channels.includes(c))) {
          return false;
        }
      }

      // Status filter
      if (filters.status.length > 0 && !filters.status.includes(thread.status)) {
        return false;
      }

      // Priority filter
      if (filters.priority.length > 0 && !filters.priority.includes(thread.priority)) {
        return false;
      }

      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSubject = thread.subject?.toLowerCase().includes(searchLower);
        const matchesContent = thread.messages.some(m =>
          m.content.toLowerCase().includes(searchLower)
        );
        if (!matchesSubject && !matchesContent) {
          return false;
        }
      }

      return true;
    });
  }, [conversations, filters]);

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    return customers.filter(customer => {
      // Channel filter
      if (filters.channels.length > 0) {
        if (!customer.channels.some(c => filters.channels.includes(c.channel))) {
          return false;
        }
      }

      // Value score filter
      if (filters.minValueScore !== null && customer.valueScore < filters.minValueScore) {
        return false;
      }

      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesName = customer.displayName.toLowerCase().includes(searchLower);
        const matchesEmail = customer.primaryEmail?.toLowerCase().includes(searchLower);
        const matchesHandle = customer.primaryHandle?.toLowerCase().includes(searchLower);
        if (!matchesName && !matchesEmail && !matchesHandle) {
          return false;
        }
      }

      return true;
    });
  }, [customers, filters]);

  return {
    filters,
    setFilter,
    toggleChannelFilter,
    toggleStatusFilter,
    togglePriorityFilter,
    clearFilters,
    filteredConversations,
    filteredCustomers,
  };
}
