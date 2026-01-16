'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import type { FeedbackItem, KanbanChannel, KanbanPriority } from '../../lib/types/feedbackTypes';
import type { UnifiedCustomer, ConversationThread, InteractionHistoryEntry } from '@/lib/social';
import {
  ConversationThreader,
  CustomerAggregator,
} from '@/lib/social';
import type {
  InboxViewMode,
  InboxPanelState,
  UnifiedInboxFilters,
  InboxStats,
  SelectedConversation,
} from '../lib/types';
import { DEFAULT_INBOX_FILTERS } from '../lib/types';

interface UseUnifiedInboxProps {
  projectId: string;
  feedbackItems?: FeedbackItem[];
}

interface UseUnifiedInboxReturn {
  // View state
  viewMode: InboxViewMode;
  setViewMode: (mode: InboxViewMode) => void;
  panelState: InboxPanelState;
  setPanelState: (state: InboxPanelState) => void;

  // Data
  conversations: ConversationThread[];
  customers: UnifiedCustomer[];
  stats: InboxStats;

  // Selection
  selectedConversation: SelectedConversation | null;
  selectedCustomer: UnifiedCustomer | null;
  selectConversation: (thread: ConversationThread) => void;
  selectCustomer: (customer: UnifiedCustomer) => void;
  clearSelection: () => void;

  // Customer details
  customerHistory: InteractionHistoryEntry[];
  customerThreads: ConversationThread[];

  // Filters
  filters: UnifiedInboxFilters;
  setFilter: <K extends keyof UnifiedInboxFilters>(key: K, value: UnifiedInboxFilters[K]) => void;
  toggleChannelFilter: (channel: KanbanChannel) => void;
  toggleStatusFilter: (status: 'open' | 'resolved' | 'pending') => void;
  togglePriorityFilter: (priority: KanbanPriority) => void;
  clearFilters: () => void;
  filteredConversations: ConversationThread[];
  filteredCustomers: UnifiedCustomer[];

  // Actions
  addCustomerNote: (customerId: string, note: string) => Promise<void>;
  addCustomerTag: (customerId: string, tag: string) => Promise<void>;
  removeCustomerTag: (customerId: string, tag: string) => Promise<void>;
  resolveConversation: (threadId: string) => Promise<void>;
  reopenConversation: (threadId: string) => Promise<void>;

  // Loading states
  isLoading: boolean;
  error: string | null;
}

export function useUnifiedInbox({
  projectId,
  feedbackItems = [],
}: UseUnifiedInboxProps): UseUnifiedInboxReturn {
  // View state
  const [viewMode, setViewMode] = useState<InboxViewMode>('conversations');
  const [panelState, setPanelState] = useState<InboxPanelState>('list');

  // Data state
  const [customers, setCustomers] = useState<UnifiedCustomer[]>([]);
  const [conversations, setConversations] = useState<ConversationThread[]>([]);

  // Selection state
  const [selectedConversation, setSelectedConversation] = useState<SelectedConversation | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<UnifiedCustomer | null>(null);

  // Filter state
  const [filters, setFilters] = useState<UnifiedInboxFilters>(DEFAULT_INBOX_FILTERS);

  // Loading state
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

  // Customer history for selected customer
  const customerHistory = useMemo(() => {
    if (!selectedCustomer) return [];
    return customerAggregator.buildInteractionHistory(selectedCustomer, feedbackItems);
  }, [selectedCustomer, feedbackItems, customerAggregator]);

  // Customer threads
  const customerThreads = useMemo(() => {
    if (!selectedCustomer) return [];
    return conversations.filter(t => t.customerId === selectedCustomer.id);
  }, [selectedCustomer, conversations]);

  // Selection handlers
  const selectConversation = useCallback((thread: ConversationThread) => {
    const customer = customers.find(c => c.id === thread.customerId) || null;
    setSelectedConversation({ thread, customer });
    setSelectedCustomer(null);
    setPanelState('detail');
  }, [customers]);

  const selectCustomer = useCallback((customer: UnifiedCustomer) => {
    setSelectedCustomer(customer);
    setSelectedConversation(null);
    setPanelState('customer-profile');
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedConversation(null);
    setSelectedCustomer(null);
    setPanelState('list');
  }, []);

  // Filter handlers
  const setFilter = useCallback(<K extends keyof UnifiedInboxFilters>(
    key: K,
    value: UnifiedInboxFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const toggleChannelFilter = useCallback((channel: KanbanChannel) => {
    setFilters(prev => ({
      ...prev,
      channels: prev.channels.includes(channel)
        ? prev.channels.filter(c => c !== channel)
        : [...prev.channels, channel],
    }));
  }, []);

  const toggleStatusFilter = useCallback((status: 'open' | 'resolved' | 'pending') => {
    setFilters(prev => ({
      ...prev,
      status: prev.status.includes(status)
        ? prev.status.filter(s => s !== status)
        : [...prev.status, status],
    }));
  }, []);

  const togglePriorityFilter = useCallback((priority: KanbanPriority) => {
    setFilters(prev => ({
      ...prev,
      priority: prev.priority.includes(priority)
        ? prev.priority.filter(p => p !== priority)
        : [...prev.priority, priority],
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_INBOX_FILTERS);
  }, []);

  // Actions
  const addCustomerNote = useCallback(async (customerId: string, note: string) => {
    const success = customerAggregator.addNote(customerId, note);
    if (success) {
      setCustomers([...customerAggregator.getCustomers()]);
    }
  }, [customerAggregator]);

  const addCustomerTag = useCallback(async (customerId: string, tag: string) => {
    const success = customerAggregator.addTag(customerId, tag);
    if (success) {
      setCustomers([...customerAggregator.getCustomers()]);
    }
  }, [customerAggregator]);

  const removeCustomerTag = useCallback(async (customerId: string, tag: string) => {
    const success = customerAggregator.removeTag(customerId, tag);
    if (success) {
      setCustomers([...customerAggregator.getCustomers()]);
    }
  }, [customerAggregator]);

  const resolveConversation = useCallback(async (threadId: string) => {
    setConversations(prev => prev.map(thread =>
      thread.id === threadId
        ? { ...thread, status: 'resolved' as const, resolvedAt: new Date().toISOString() }
        : thread
    ));
  }, []);

  const reopenConversation = useCallback(async (threadId: string) => {
    setConversations(prev => prev.map(thread =>
      thread.id === threadId
        ? { ...thread, status: 'open' as const, resolvedAt: null }
        : thread
    ));
  }, []);

  return {
    // View state
    viewMode,
    setViewMode,
    panelState,
    setPanelState,

    // Data
    conversations,
    customers,
    stats,

    // Selection
    selectedConversation,
    selectedCustomer,
    selectConversation,
    selectCustomer,
    clearSelection,

    // Customer details
    customerHistory,
    customerThreads,

    // Filters
    filters,
    setFilter,
    toggleChannelFilter,
    toggleStatusFilter,
    togglePriorityFilter,
    clearFilters,
    filteredConversations,
    filteredCustomers,

    // Actions
    addCustomerNote,
    addCustomerTag,
    removeCustomerTag,
    resolveConversation,
    reopenConversation,

    // Loading states
    isLoading,
    error,
  };
}
