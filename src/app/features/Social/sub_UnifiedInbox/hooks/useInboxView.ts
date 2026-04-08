'use client';

import { useState, useCallback, useMemo } from 'react';
import type { FeedbackItem } from '../../lib/types/feedbackTypes';
import type { UnifiedCustomer, ConversationThread, InteractionHistoryEntry } from '@/lib/social';
import type { CustomerAggregator } from '@/lib/social';
import type {
  InboxViewMode,
  InboxPanelState,
  SelectedConversation,
} from '../lib/types';

interface UseInboxViewProps {
  customers: UnifiedCustomer[];
  conversations: ConversationThread[];
  feedbackItems: FeedbackItem[];
  customerAggregator: CustomerAggregator;
}

interface UseInboxViewReturn {
  viewMode: InboxViewMode;
  setViewMode: (mode: InboxViewMode) => void;
  panelState: InboxPanelState;
  setPanelState: (state: InboxPanelState) => void;
  selectedConversation: SelectedConversation | null;
  selectedCustomer: UnifiedCustomer | null;
  selectConversation: (thread: ConversationThread) => void;
  selectCustomer: (customer: UnifiedCustomer) => void;
  clearSelection: () => void;
  customerHistory: InteractionHistoryEntry[];
  customerThreads: ConversationThread[];
}

export function useInboxView({
  customers,
  conversations,
  feedbackItems,
  customerAggregator,
}: UseInboxViewProps): UseInboxViewReturn {
  const [viewMode, setViewMode] = useState<InboxViewMode>('conversations');
  const [panelState, setPanelState] = useState<InboxPanelState>('list');
  const [selectedConversation, setSelectedConversation] = useState<SelectedConversation | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<UnifiedCustomer | null>(null);

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

  return {
    viewMode,
    setViewMode,
    panelState,
    setPanelState,
    selectedConversation,
    selectedCustomer,
    selectConversation,
    selectCustomer,
    clearSelection,
    customerHistory,
    customerThreads,
  };
}
