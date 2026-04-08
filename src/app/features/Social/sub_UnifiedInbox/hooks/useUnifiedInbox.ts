'use client';

import type { FeedbackItem, KanbanChannel, KanbanPriority } from '../../lib/types/feedbackTypes';
import type { UnifiedCustomer, ConversationThread, InteractionHistoryEntry } from '@/lib/social';
import type {
  InboxViewMode,
  InboxPanelState,
  UnifiedInboxFilters,
  InboxStats,
  SelectedConversation,
} from '../lib/types';
import { useInboxData } from './useInboxData';
import { useInboxFilters } from './useInboxFilters';
import { useInboxView } from './useInboxView';
import { useInboxActions } from './useInboxActions';

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
  // Data aggregation and processing
  const data = useInboxData({ feedbackItems });

  // Filtering
  const filtering = useInboxFilters({
    conversations: data.conversations,
    customers: data.customers,
  });

  // View and selection state
  const view = useInboxView({
    customers: data.customers,
    conversations: data.conversations,
    feedbackItems,
    customerAggregator: data.customerAggregator,
  });

  // Actions (resolve, assign, customer notes/tags)
  const actions = useInboxActions({
    customerAggregator: data.customerAggregator,
    setCustomers: data.setCustomers,
    setConversations: data.setConversations,
  });

  return {
    // View state
    viewMode: view.viewMode,
    setViewMode: view.setViewMode,
    panelState: view.panelState,
    setPanelState: view.setPanelState,

    // Data
    conversations: data.conversations,
    customers: data.customers,
    stats: data.stats,

    // Selection
    selectedConversation: view.selectedConversation,
    selectedCustomer: view.selectedCustomer,
    selectConversation: view.selectConversation,
    selectCustomer: view.selectCustomer,
    clearSelection: view.clearSelection,

    // Customer details
    customerHistory: view.customerHistory,
    customerThreads: view.customerThreads,

    // Filters
    filters: filtering.filters,
    setFilter: filtering.setFilter,
    toggleChannelFilter: filtering.toggleChannelFilter,
    toggleStatusFilter: filtering.toggleStatusFilter,
    togglePriorityFilter: filtering.togglePriorityFilter,
    clearFilters: filtering.clearFilters,
    filteredConversations: filtering.filteredConversations,
    filteredCustomers: filtering.filteredCustomers,

    // Actions
    addCustomerNote: actions.addCustomerNote,
    addCustomerTag: actions.addCustomerTag,
    removeCustomerTag: actions.removeCustomerTag,
    resolveConversation: actions.resolveConversation,
    reopenConversation: actions.reopenConversation,

    // Loading states
    isLoading: data.isLoading,
    error: data.error,
  };
}
