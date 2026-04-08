import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, MessageCircle } from 'lucide-react';
import type { ConversationThread as ConversationThreadType, UnifiedCustomer } from '@/lib/social';
import { formatRelativeTime } from '@/lib/formatDate';
import {
  getCustomerValueTier,
  VALUE_TIER_COLORS,
} from '../lib/types';
import { CHANNEL_ICONS } from '../../lib/channelConstants';
import { AvatarBadge } from '../../components/atoms/AvatarBadge';
import { EmptyState } from '../../components/atoms/EmptyState';

interface InboxConversationsListProps {
  conversations: ConversationThreadType[];
  customers: UnifiedCustomer[];
  onSelect: (thread: ConversationThreadType) => void;
}

export function InboxConversationsList({ conversations, customers, onSelect }: InboxConversationsListProps) {
  if (conversations.length === 0) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="No conversations found"
        description="Conversations will appear here when feedback is received across channels."
        className="h-full p-8"
      />
    );
  }

  const customerMap = new Map(customers.map(c => [c.id, c]));

  return (
    <div className="divide-y divide-gray-800/50">
      {conversations.map((thread) => {
        const customer = customerMap.get(thread.customerId);
        const latestMessage = thread.messages.length > 0 ? thread.messages[thread.messages.length - 1] : null;
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
              <AvatarBadge name={customer?.displayName || '?'} />

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-medium text-gray-200 truncate">
                      {customer?.displayName || 'Unknown Customer'}
                    </span>
                    {valueTier && (
                      <span className={`px-1.5 py-0.5 rounded text-2xs font-medium border ${VALUE_TIER_COLORS[valueTier]}`}>
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
                  <span className={`text-2xs px-1.5 py-0.5 rounded-full ${
                    thread.status === 'open' ? 'bg-yellow-500/10 text-yellow-400' :
                    thread.status === 'resolved' ? 'bg-green-500/10 text-green-400' :
                    'bg-gray-500/10 text-gray-400'
                  }`}>
                    {thread.status}
                  </span>

                  {/* Priority */}
                  {thread.priority !== 'low' && (
                    <span className={`text-2xs px-1.5 py-0.5 rounded-full ${
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
                      const Icon = CHANNEL_ICONS[channel] || MessageCircle;
                      return <Icon key={channel} className="w-3 h-3 text-gray-500" />;
                    })}
                    {thread.channels.length > 3 && (
                      <span className="text-2xs text-gray-500">+{thread.channels.length - 3}</span>
                    )}
                  </div>

                  {/* Message count */}
                  <span className="text-2xs text-gray-500">
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
