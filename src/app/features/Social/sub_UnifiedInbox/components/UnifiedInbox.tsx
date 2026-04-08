'use client';

import React, { useState } from 'react';
import {
  Inbox,
  Users,
  Search,
  Filter,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import type { FeedbackItem } from '../../lib/types/feedbackTypes';
import { useUnifiedInbox } from '../hooks/useUnifiedInbox';
import { SimpleSpinner } from '@/components/ui/Spinner';
import { ConversationThread } from './ConversationThread';
import { CustomerProfile } from './CustomerProfile';
import { InboxStatCard } from './InboxStatCard';
import { InboxConversationsList } from './InboxConversationsList';
import { InboxCustomersList } from './InboxCustomersList';
import { InboxFilterPanel } from './InboxFilterPanel';

interface UnifiedInboxProps {
  projectId: string;
  feedbackItems?: FeedbackItem[];
}

export function UnifiedInbox({ projectId, feedbackItems = [] }: UnifiedInboxProps) {
  const [showFilters, setShowFilters] = useState(false);

  const inbox = useUnifiedInbox({ projectId, feedbackItems });

  // Render conversation detail view
  if (inbox.panelState === 'detail' && inbox.selectedConversation) {
    return (
      <ConversationThread
        thread={inbox.selectedConversation.thread}
        customer={inbox.selectedConversation.customer}
        onBack={inbox.clearSelection}
        onViewCustomer={() => {
          if (inbox.selectedConversation?.customer) {
            inbox.selectCustomer(inbox.selectedConversation.customer);
          }
        }}
        onResolve={() => inbox.resolveConversation(inbox.selectedConversation!.thread.id)}
        onReopen={() => inbox.reopenConversation(inbox.selectedConversation!.thread.id)}
      />
    );
  }

  // Render customer profile view
  if (inbox.panelState === 'customer-profile' && inbox.selectedCustomer) {
    return (
      <CustomerProfile
        customer={inbox.selectedCustomer}
        threads={inbox.customerThreads}
        history={inbox.customerHistory}
        onAddNote={(note) => inbox.addCustomerNote(inbox.selectedCustomer!.id, note)}
        onAddTag={(tag) => inbox.addCustomerTag(inbox.selectedCustomer!.id, tag)}
        onRemoveTag={(tag) => inbox.removeCustomerTag(inbox.selectedCustomer!.id, tag)}
        onSelectThread={inbox.selectConversation}
        onBack={inbox.clearSelection}
      />
    );
  }

  // Main inbox list view
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-700/40">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Inbox className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-gray-200">Unified Inbox</h2>
          </div>

          {/* View mode toggle */}
          <div className="flex items-center gap-1 p-1 bg-gray-800/60 rounded-lg">
            <button
              onClick={() => inbox.setViewMode('conversations')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                inbox.viewMode === 'conversations'
                  ? 'bg-cyan-500 text-white'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              Conversations
            </button>
            <button
              onClick={() => inbox.setViewMode('customers')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                inbox.viewMode === 'customers'
                  ? 'bg-cyan-500 text-white'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Users className="w-4 h-4" />
              Customers
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4" aria-live="polite">
          <InboxStatCard
            icon={MessageSquare}
            label="Total"
            value={inbox.stats.totalConversations}
            color="text-gray-300"
          />
          <InboxStatCard
            icon={AlertCircle}
            label="Open"
            value={inbox.stats.openConversations}
            color="text-yellow-400"
          />
          <InboxStatCard
            icon={CheckCircle}
            label="Resolved"
            value={inbox.stats.resolvedConversations}
            color="text-green-400"
          />
          <InboxStatCard
            icon={TrendingUp}
            label="High Value"
            value={inbox.stats.highValueCustomers}
            color="text-purple-400"
          />
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={inbox.filters.search}
              onChange={(e) => inbox.setFilter('search', e.target.value)}
              placeholder={`Search ${inbox.viewMode}...`}
              className="w-full pl-10 pr-4 py-2 bg-gray-800/60 border border-gray-700/40 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            aria-expanded={showFilters}
            aria-label="Toggle filters"
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              showFilters || inbox.filters.channels.length > 0 || inbox.filters.status.length > 0
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'bg-gray-800/60 text-gray-400 hover:text-gray-200 border border-gray-700/40'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {(inbox.filters.channels.length + inbox.filters.status.length) > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-cyan-500 text-white text-xs">
                {inbox.filters.channels.length + inbox.filters.status.length}
              </span>
            )}
          </button>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <InboxFilterPanel
            filters={inbox.filters}
            viewMode={inbox.viewMode}
            onToggleChannel={inbox.toggleChannelFilter}
            onToggleStatus={inbox.toggleStatusFilter}
            onTogglePriority={inbox.togglePriorityFilter}
            onClearFilters={inbox.clearFilters}
          />
        )}
      </div>

      {/* List content */}
      <div className="flex-1 overflow-y-auto">
        {inbox.isLoading ? (
          <div className="flex items-center justify-center h-full">
            <SimpleSpinner size="lg" color="cyan" />
          </div>
        ) : inbox.viewMode === 'conversations' ? (
          <InboxConversationsList
            conversations={inbox.filteredConversations}
            customers={inbox.customers}
            onSelect={inbox.selectConversation}
          />
        ) : (
          <InboxCustomersList
            customers={inbox.filteredCustomers}
            onSelect={inbox.selectCustomer}
          />
        )}
      </div>
    </div>
  );
}
