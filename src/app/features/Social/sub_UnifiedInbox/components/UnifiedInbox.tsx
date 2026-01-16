'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Inbox,
  Users,
  Search,
  Filter,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  X,
  ChevronDown,
  Mail,
  Twitter,
  Facebook,
  Instagram,
  MessageCircle,
  Star,
  Smartphone,
  TrendingUp,
  Award,
} from 'lucide-react';
import type { FeedbackItem, KanbanChannel, KanbanPriority } from '../../lib/types/feedbackTypes';
import type { ConversationThread as ConversationThreadType, UnifiedCustomer } from '@/lib/social';
import { useUnifiedInbox } from '../hooks/useUnifiedInbox';
import { ConversationThread } from './ConversationThread';
import { CustomerProfile } from './CustomerProfile';
import {
  getCustomerValueTier,
  VALUE_TIER_COLORS,
  VALUE_TIER_LABELS,
} from '../lib/types';

interface UnifiedInboxProps {
  projectId: string;
  feedbackItems?: FeedbackItem[];
}

const CHANNEL_ICONS: Record<KanbanChannel, React.ElementType> = {
  email: Mail,
  x: Twitter,
  facebook: Facebook,
  instagram: Instagram,
  support_chat: MessageCircle,
  trustpilot: Star,
  app_store: Smartphone,
};

const CHANNEL_LABELS: Record<KanbanChannel, string> = {
  email: 'Email',
  x: 'X',
  facebook: 'Facebook',
  instagram: 'Instagram',
  support_chat: 'Chat',
  trustpilot: 'Trustpilot',
  app_store: 'App Store',
};

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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <StatCard
            icon={MessageSquare}
            label="Total"
            value={inbox.stats.totalConversations}
            color="text-gray-400"
          />
          <StatCard
            icon={AlertCircle}
            label="Open"
            value={inbox.stats.openConversations}
            color="text-yellow-400"
          />
          <StatCard
            icon={CheckCircle}
            label="Resolved"
            value={inbox.stats.resolvedConversations}
            color="text-green-400"
          />
          <StatCard
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
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 p-3 rounded-lg bg-gray-800/40 border border-gray-700/40"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-400">Filters</span>
              {(inbox.filters.channels.length > 0 || inbox.filters.status.length > 0) && (
                <button
                  onClick={inbox.clearFilters}
                  className="text-xs text-cyan-400 hover:text-cyan-300"
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Channel filters */}
            <div className="mb-3">
              <span className="text-xs text-gray-500 mb-2 block">Channels</span>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(CHANNEL_ICONS) as KanbanChannel[]).map(channel => {
                  const Icon = CHANNEL_ICONS[channel];
                  const isActive = inbox.filters.channels.includes(channel);
                  return (
                    <button
                      key={channel}
                      onClick={() => inbox.toggleChannelFilter(channel)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                          : 'bg-gray-700/50 text-gray-400 hover:text-gray-200 border border-gray-600/50'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {CHANNEL_LABELS[channel]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Status filters (only for conversations) */}
            {inbox.viewMode === 'conversations' && (
              <div className="mb-3">
                <span className="text-xs text-gray-500 mb-2 block">Status</span>
                <div className="flex flex-wrap gap-2">
                  {(['open', 'pending', 'resolved'] as const).map(status => {
                    const isActive = inbox.filters.status.includes(status);
                    return (
                      <button
                        key={status}
                        onClick={() => inbox.toggleStatusFilter(status)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-colors ${
                          isActive
                            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                            : 'bg-gray-700/50 text-gray-400 hover:text-gray-200 border border-gray-600/50'
                        }`}
                      >
                        {status}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Priority filters (only for conversations) */}
            {inbox.viewMode === 'conversations' && (
              <div>
                <span className="text-xs text-gray-500 mb-2 block">Priority</span>
                <div className="flex flex-wrap gap-2">
                  {(['low', 'medium', 'high', 'critical'] as KanbanPriority[]).map(priority => {
                    const isActive = inbox.filters.priority.includes(priority);
                    return (
                      <button
                        key={priority}
                        onClick={() => inbox.togglePriorityFilter(priority)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-colors ${
                          isActive
                            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                            : 'bg-gray-700/50 text-gray-400 hover:text-gray-200 border border-gray-600/50'
                        }`}
                      >
                        {priority}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* List content */}
      <div className="flex-1 overflow-y-auto">
        {inbox.isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
          </div>
        ) : inbox.viewMode === 'conversations' ? (
          <ConversationsList
            conversations={inbox.filteredConversations}
            customers={inbox.customers}
            onSelect={inbox.selectConversation}
          />
        ) : (
          <CustomersList
            customers={inbox.filteredCustomers}
            onSelect={inbox.selectCustomer}
          />
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/40 border border-gray-700/40">
      <Icon className={`w-5 h-5 ${color}`} />
      <div>
        <span className="text-lg font-semibold text-gray-200">{value}</span>
        <span className="text-xs text-gray-500 ml-1">{label}</span>
      </div>
    </div>
  );
}

interface ConversationsListProps {
  conversations: ConversationThreadType[];
  customers: UnifiedCustomer[];
  onSelect: (thread: ConversationThreadType) => void;
}

function ConversationsList({ conversations, customers, onSelect }: ConversationsListProps) {
  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <MessageSquare className="w-16 h-16 text-gray-700 mb-4" />
        <h3 className="text-lg font-medium text-gray-300 mb-2">No conversations found</h3>
        <p className="text-sm text-gray-500 max-w-md">
          Conversations will appear here when feedback is received across channels.
        </p>
      </div>
    );
  }

  const customerMap = new Map(customers.map(c => [c.id, c]));

  return (
    <div className="divide-y divide-gray-800/50">
      {conversations.map((thread) => {
        const customer = customerMap.get(thread.customerId);
        const latestMessage = thread.messages[thread.messages.length - 1];
        const valueTier = customer ? getCustomerValueTier(customer.valueScore) : null;

        return (
          <motion.button
            key={thread.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => onSelect(thread)}
            className="w-full p-4 text-left hover:bg-gray-800/40 transition-colors"
          >
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-white">
                  {customer?.displayName.charAt(0).toUpperCase() || '?'}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-medium text-gray-200 truncate">
                      {customer?.displayName || 'Unknown Customer'}
                    </span>
                    {valueTier && (
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${VALUE_TIER_COLORS[valueTier]}`}>
                        {valueTier.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 flex-shrink-0">
                    {formatRelativeTime(thread.lastActivityAt)}
                  </span>
                </div>

                <p className="text-sm text-gray-400 mb-2 line-clamp-1">
                  {thread.subject || latestMessage?.content || 'No content'}
                </p>

                <div className="flex items-center gap-2">
                  {/* Status */}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    thread.status === 'open' ? 'bg-yellow-500/10 text-yellow-400' :
                    thread.status === 'resolved' ? 'bg-green-500/10 text-green-400' :
                    'bg-gray-500/10 text-gray-400'
                  }`}>
                    {thread.status}
                  </span>

                  {/* Priority */}
                  {thread.priority !== 'low' && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      thread.priority === 'critical' ? 'bg-red-500/10 text-red-400' :
                      thread.priority === 'high' ? 'bg-yellow-500/10 text-yellow-400' :
                      'bg-blue-500/10 text-blue-400'
                    }`}>
                      {thread.priority}
                    </span>
                  )}

                  {/* Channels */}
                  <div className="flex items-center gap-1">
                    {thread.channels.slice(0, 3).map(channel => {
                      const Icon = CHANNEL_ICONS[channel];
                      return <Icon key={channel} className="w-3 h-3 text-gray-500" />;
                    })}
                    {thread.channels.length > 3 && (
                      <span className="text-[10px] text-gray-500">+{thread.channels.length - 3}</span>
                    )}
                  </div>

                  {/* Message count */}
                  <span className="text-[10px] text-gray-500">
                    {thread.messages.length} msg
                  </span>
                </div>
              </div>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}

interface CustomersListProps {
  customers: UnifiedCustomer[];
  onSelect: (customer: UnifiedCustomer) => void;
}

function CustomersList({ customers, onSelect }: CustomersListProps) {
  // Sort by value score descending
  const sortedCustomers = [...customers].sort((a, b) => b.valueScore - a.valueScore);

  if (customers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <Users className="w-16 h-16 text-gray-700 mb-4" />
        <h3 className="text-lg font-medium text-gray-300 mb-2">No customers found</h3>
        <p className="text-sm text-gray-500 max-w-md">
          Customer profiles will be created automatically as feedback is received.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-800/50">
      {sortedCustomers.map((customer) => {
        const valueTier = getCustomerValueTier(customer.valueScore);

        return (
          <motion.button
            key={customer.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => onSelect(customer)}
            className="w-full p-4 text-left hover:bg-gray-800/40 transition-colors"
          >
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-white">
                  {customer.displayName.charAt(0).toUpperCase()}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-medium text-gray-200 truncate">
                      {customer.displayName}
                    </span>
                    {customer.isVerified && (
                      <CheckCircle className="w-3.5 h-3.5 text-cyan-400" />
                    )}
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${VALUE_TIER_COLORS[valueTier]}`}>
                      {VALUE_TIER_LABELS[valueTier]}
                    </span>
                  </div>
                  <span className="text-lg font-semibold text-gray-300">
                    {customer.valueScore}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                  {customer.primaryEmail && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {customer.primaryEmail}
                    </span>
                  )}
                  {customer.primaryHandle && (
                    <span className="flex items-center gap-1">
                      @{customer.primaryHandle}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>{customer.totalInteractions} interactions</span>
                  <span>•</span>
                  <span>{customer.channels.length} channels</span>
                  <span>•</span>
                  <span>Last active {formatRelativeTime(customer.lastInteractionAt)}</span>
                </div>

                {/* Channel icons */}
                <div className="flex items-center gap-1 mt-2">
                  {customer.channels.map((identity, idx) => {
                    const Icon = CHANNEL_ICONS[identity.channel];
                    return <Icon key={idx} className="w-3.5 h-3.5 text-gray-500" />;
                  })}
                </div>
              </div>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}

function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
